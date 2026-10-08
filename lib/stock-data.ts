import {
  cleanCandles,
  findStock,
  koreanDate,
  numeric,
  type Candle,
  type Flow,
  type Interval,
  type StockData,
} from "./stock-types";

const TOSS = "https://openapi.tossinvest.com";
type Token = { value: string; expires: number };
let token: Token | undefined;
let tokenFlight: Promise<string> | undefined;
const cache = new Map<string, { expires: number; value: unknown }>();
const flights = new Map<string, Promise<unknown>>();
export const tossConfigured = () =>
  Boolean(
    process.env.TOSS_ACCESS_TOKEN ||
      (process.env.TOSS_CLIENT_ID && process.env.TOSS_CLIENT_SECRET),
  );

async function cached<T>(
  key: string,
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  if (flights.has(key)) return flights.get(key) as Promise<T>;
  const pending = load()
    .then((value) => {
      if (cache.size >= 150) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + ttl, value });
      return value;
    })
    .finally(() => flights.delete(key));
  flights.set(key, pending);
  return pending;
}
async function accessToken(): Promise<string> {
  if (process.env.TOSS_ACCESS_TOKEN) return process.env.TOSS_ACCESS_TOKEN;
  if (token && token.expires > Date.now() + 60000) return token.value;
  if (tokenFlight) return tokenFlight;
  tokenFlight = (async () => {
    if (!tossConfigured()) throw new Error("토스 API 미연결");
    const response = await fetch(`${TOSS}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.TOSS_CLIENT_ID!,
        client_secret: process.env.TOSS_CLIENT_SECRET!,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      throw new Error(
        response.status === 403
          ? "토스 API 허용 IP 확인 필요"
          : "토스 API 인증 실패",
      );
    const json = await response.json();
    if (typeof json.access_token !== "string")
      throw new Error("토스 API 인증 응답 오류");
    token = {
      value: json.access_token,
      expires: Date.now() + Number(json.expires_in) * 1000,
    };
    return token.value;
  })().finally(() => {
    tokenFlight = undefined;
  });
  return tokenFlight;
}
// Fixed origins and read-only paths only. Credentials and upstream bodies never leave the server.
export async function tossRead(
  path: string,
  params: Record<string, string> = {},
  retry = true,
) {
  if (
    !/^\/api\/v1\/(prices|candles|stocks(?:\/[A-Z0-9]{6}\/(investor-trading|short-selling|credit-trades|securities-lending))?)$/.test(
      path,
    )
  )
    throw new Error("허용되지 않은 조회");
  const usedToken = await accessToken();
  const response = await fetch(
    `${TOSS}${path}?${new URLSearchParams(params)}`,
    {
      headers: { Authorization: `Bearer ${usedToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (response.status === 401 && retry && !process.env.TOSS_ACCESS_TOKEN) {
    if (token?.value === usedToken) token = undefined;
    return tossRead(path, params, false);
  }
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "토스 API 허용 IP 확인 필요"
        : response.status === 429
          ? "시세 요청 한도 초과 — 잠시 후 다시 조회해 주세요"
          : "토스 시세 조회 실패",
    );
  }
  const json = await response.json();
  if (json.error || json.result === undefined)
    throw new Error("토스 시세 응답 오류");
  return json.result;
}
export async function getQuote(code: string): Promise<StockData["quote"]> {
  return cached(`quote:${code}`, 12000, async () => {
    const rows = await tossRead("/api/v1/prices", { symbols: code });
    const row = rows.find((r: any) => r.symbol === code);
    const price = numeric(row?.lastPrice);
    if (price === null || price <= 0 || row.currency !== "KRW") return null;
    return {
      price,
      at:
        typeof row.timestamp === "string" &&
        Number.isFinite(Date.parse(row.timestamp))
          ? row.timestamp
          : null,
    };
  });
}
export function parseTossCandles(rows: any[]): Candle[] {
  return cleanCandles(
    rows
      .filter((row) => row.currency === "KRW")
      .map((row) => {
        const time = Date.parse(row.timestamp);
        return {
          time,
          date: Number.isFinite(time) ? koreanDate(time) : "",
          open: numeric(row.openPrice) ?? NaN,
          high: numeric(row.highPrice) ?? NaN,
          low: numeric(row.lowPrice) ?? NaN,
          close: numeric(row.closePrice) ?? NaN,
          volume: numeric(row.volume) ?? NaN,
        };
      }),
  );
}
async function tossCandles(code: string, interval: Interval) {
  return cached(
    `toss-bars:${code}:${interval}`,
    interval === "1d" ? 60000 : 15000,
    async () => {
      const bars: Candle[] = [];
      let before: string | undefined;
      for (let page = 0; page < 3; page++) {
        const result = await tossRead("/api/v1/candles", {
          symbol: code,
          interval,
          count: "200",
          adjusted: "true",
          ...(before ? { before } : {}),
        });
        bars.push(...parseTossCandles(result.candles ?? []));
        if (!result.nextBefore || result.nextBefore === before) break;
        before = result.nextBefore;
      }
      const cleaned = cleanCandles(bars);
      if (!cleaned.length) throw new Error("조회할 캔들 데이터가 없습니다");
      return cleaned;
    },
  );
}
export function parseYahoo(result: any): Candle[] {
  const q = result?.indicators?.quote?.[0];
  if (!q) return [];
  return cleanCandles(
    (result.timestamp ?? []).map((t: number, i: number) => ({
      time: t * 1000,
      date: koreanDate(t * 1000),
      open: q.open?.[i],
      high: q.high?.[i],
      low: q.low?.[i],
      close: q.close?.[i],
      volume: q.volume?.[i],
    })),
  );
}
async function yahooData(code: string, market: string, interval: Interval) {
  return cached(`yahoo:${code}:${market}:${interval}`, 60000, async () => {
    const symbol = `${code}.${market === "KOSDAQ" ? "KQ" : "KS"}`;
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${interval === "1d" ? "2y" : "5d"}&interval=${interval}&includePrePost=false`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok)
      throw new Error(
        "시세 제공처 응답이 없습니다. 잠시 후 다시 시도해 주세요.",
      );
    const json = await response.json(),
      result = json?.chart?.result?.[0];
    const candles = parseYahoo(result);
    if (!candles.length || result.meta?.currency !== "KRW")
      throw new Error("종목코드와 시장 구분을 확인해 주세요.");
    const price = numeric(result.meta?.regularMarketPrice),
      t = numeric(result.meta?.regularMarketTime);
    return {
      candles,
      quote:
        price !== null
          ? { price, at: t ? new Date(t * 1000).toISOString() : null }
          : null,
    };
  });
}
export function mergeFlows(groups: { type: string; records: any[] }[]): Flow[] {
  const rows = new Map<string, Flow>();
  for (const group of groups)
    for (const r of group.records) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
      const row = rows.get(r.date) ?? {
        date: r.date,
        updatedAt: "",
        individual: null,
        institution: null,
        foreigner: null,
        foreignHolding: null,
        foreignRate: null,
        short: null,
        credit: null,
        lending: null,
      };
      if (typeof r.updatedAt === "string" && r.updatedAt > row.updatedAt)
        row.updatedAt = r.updatedAt;
      if (group.type === "investor-trading") {
        row.individual = numeric(r.individual?.netBuyVolume);
        row.institution = numeric(r.institution?.netBuyVolume);
        row.foreigner = numeric(r.foreigner?.netBuyVolume);
        row.foreignHolding = numeric(r.foreignerHolding?.holdingQuantity);
        const rate = numeric(r.foreignerHolding?.holdingRate);
        row.foreignRate = rate === null ? null : rate * 100;
      } else if (group.type === "short-selling")
        row.short = numeric(r.shortSellingVolume);
      else if (group.type === "credit-trades")
        row.credit = numeric(r.marginLoan?.balanceQuantity);
      else if (group.type === "securities-lending")
        row.lending = numeric(r.balanceQuantity);
      rows.set(r.date, row);
    }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}
async function getFlows(code: string) {
  return cached(`flows:${code}`, 300000, async () => {
    const types = [
      "investor-trading",
      "short-selling",
      "credit-trades",
      "securities-lending",
    ];
    const responses = await Promise.allSettled(
      types.map((type) =>
        tossRead(`/api/v1/stocks/${code}/${type}`, { count: "100" }),
      ),
    );
    const groups = responses.flatMap((r, i) =>
      r.status === "fulfilled"
        ? [{ type: types[i], records: r.value.records ?? [] }]
        : [],
    );
    const names = ["투자자별 수급", "공매도", "신용잔고", "대차잔고"];
    return {
      flows: mergeFlows(groups),
      notices: responses.flatMap((r, i) =>
        r.status === "rejected" ? [`${names[i]} 조회 실패`] : [],
      ),
    };
  });
}
export async function getStockData(
  code: string,
  market: string,
  interval: Interval,
  includeFlows = true,
): Promise<StockData> {
  const stock = findStock(code, market),
    notices: string[] = [];
  if (tossConfigured()) {
    try {
      const [candles, quote, flows] = await Promise.all([
        tossCandles(code, interval),
        getQuote(code).catch(() => {
          notices.push("현재가 조회 실패 — 차트 종가와 구분해 주세요");
          return null;
        }),
        includeFlows
          ? getFlows(code)
          : Promise.resolve({ flows: [], notices: [] }),
      ]);
      return {
        stock,
        candles,
        quote,
        interval,
        flows: flows.flows,
        notices: [...notices, ...flows.notices],
        source: "Toss",
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      notices.push(
        `${error instanceof Error ? error.message : "토스 연결 실패"}. Yahoo 대체 시세를 표시합니다.`,
      );
    }
  } else notices.push("토스 API 미연결 — 지연 가능한 Yahoo 시세");
  const { candles, quote } = await yahooData(code, stock.market, interval);
  return {
    stock,
    candles,
    quote,
    interval,
    flows: [],
    notices,
    source: "Yahoo",
    fetchedAt: new Date().toISOString(),
  };
}
