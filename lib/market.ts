import { alignSeries, equalWeightBasket, positive, returnCorrelation, type Point } from "./analytics";

const sectors = {
  semiconductor: {
    label: "반도체",
    koreaName: "삼성전자 · SK하이닉스",
    usName: "NVIDIA · AMD · Broadcom",
    korea: ["005930.KS", "000660.KS"],
    us: ["NVDA", "AMD", "AVGO"]
  },
  battery: {
    label: "2차전지",
    koreaName: "LG에너지솔루션 · 삼성SDI · 에코프로비엠",
    usName: "Tesla · Albemarle",
    korea: ["373220.KS", "006400.KS", "247540.KQ"],
    us: ["TSLA", "ALB"]
  },
  auto: {
    label: "자동차",
    koreaName: "현대차 · 기아",
    usName: "Tesla · GM · Ford",
    korea: ["005380.KS", "000270.KS"],
    us: ["TSLA", "GM", "F"]
  },
  defense: {
    label: "방산",
    koreaName: "한화에어로스페이스 · 현대로템 · LIG넥스원",
    usName: "Lockheed Martin · RTX · Northrop Grumman",
    korea: ["012450.KS", "064350.KS", "079550.KS"],
    us: ["LMT", "RTX", "NOC"]
  },
  ai: {
    label: "AI",
    koreaName: "NAVER · 카카오",
    usName: "Microsoft · Meta · Palantir",
    korea: ["035420.KS", "035720.KS"],
    us: ["MSFT", "META", "PLTR"]
  },
  shipbuilding: {
    label: "조선",
    koreaName: "HD현대중공업 · 삼성중공업 · 한화오션",
    usName: "Huntington Ingalls · General Dynamics",
    korea: ["329180.KS", "010140.KS", "042660.KS"],
    us: ["HII", "GD"]
  },
  power: {
    label: "전력기기",
    koreaName: "HD현대일렉트릭 · LS ELECTRIC · 효성중공업",
    usName: "GE Vernova · Eaton · Quanta Services",
    korea: ["267260.KS", "010120.KS", "298040.KS"],
    us: ["GEV", "ETN", "PWR"]
  },
  bio: {
    label: "바이오",
    koreaName: "삼성바이오로직스 · 셀트리온 · 유한양행",
    usName: "Eli Lilly · Pfizer · Moderna",
    korea: ["207940.KS", "068270.KS", "000100.KS"],
    us: ["LLY", "PFE", "MRNA"]
  },
  finance: {
    label: "금융",
    koreaName: "KB금융 · 신한지주 · 하나금융지주",
    usName: "JPMorgan · Bank of America · Wells Fargo",
    korea: ["105560.KS", "055550.KS", "086790.KS"],
    us: ["JPM", "BAC", "WFC"]
  },
  nuclear: {
    label: "원전",
    koreaName: "두산에너빌리티 · 한전기술 · 우리기술",
    usName: "Cameco · Constellation Energy · BWX Technologies",
    korea: ["034020.KS", "052690.KS", "032820.KQ"],
    us: ["CCJ", "CEG", "BWXT"]
  },
  robot: {
    label: "로봇",
    koreaName: "두산로보틱스 · 레인보우로보틱스 · 로보티즈",
    usName: "Intuitive Surgical · Rockwell Automation · Teradyne",
    korea: ["454910.KS", "277810.KQ", "108490.KQ"],
    us: ["ISRG", "ROK", "TER"]
  }
};

const stockPairs = {
  samsungNvidia: {
    label: "삼성전자 vs NVIDIA",
    koreaName: "삼성전자",
    usName: "NVIDIA",
    korea: "005930.KS",
    us: "NVDA"
  },
  hynixNvidia: {
    label: "SK하이닉스 vs NVIDIA",
    koreaName: "SK하이닉스",
    usName: "NVIDIA",
    korea: "000660.KS",
    us: "NVDA"
  },
  hyundaiTesla: {
    label: "현대차 vs Tesla",
    koreaName: "현대차",
    usName: "Tesla",
    korea: "005380.KS",
    us: "TSLA"
  },
  hanwhaLockheed: {
    label: "한화에어로스페이스 vs Lockheed Martin",
    koreaName: "한화에어로스페이스",
    usName: "Lockheed Martin",
    korea: "012450.KS",
    us: "LMT"
  },
  kbJpm: {
    label: "KB금융 vs JPMorgan",
    koreaName: "KB금융",
    usName: "JPMorgan",
    korea: "105560.KS",
    us: "JPM"
  },
  naverMicrosoft: {
    label: "NAVER vs Microsoft",
    koreaName: "NAVER",
    usName: "Microsoft",
    korea: "035420.KS",
    us: "MSFT"
  }
};

const macroIndicators = {
  usdkrw: {
    label: "원/달러 환율",
    name: "USD/KRW",
    ticker: "KRW=X",
    unit: "원/USD",
    description: "원화 대비 달러 가치 흐름을 보여주는 환율 지표입니다."
  },
  us10y: {
    label: "미국 10년물 국채금리",
    name: "U.S. 10Y Treasury Yield",
    ticker: "^TNX",
    unit: "%",
    description: "미국 장기금리 흐름을 보여주는 대표 금리 지표입니다."
  },
  dxy: {
    label: "달러인덱스",
    name: "Dollar Index",
    ticker: "DX-Y.NYB",
    unit: "pt",
    description: "달러의 전반적인 강세·약세 흐름을 보여주는 지표입니다."
  }
};

type QuoteSeries = { data: Point[]; basis: "adjusted" | "close" };

async function fetchYahooChart(symbol: string): Promise<QuoteSeries> {
  const period1 = Math.floor(Date.parse("2024-01-01T00:00:00Z") / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history&includeAdjustedClose=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) throw new Error(`Market source unavailable: ${symbol}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result || json.chart.error) throw new Error(`Missing series: ${symbol}`);
  const timezone = result.meta?.exchangeTimezoneName || "UTC";
  const localDate = (timestamp: number) => new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(timestamp));
  const today = localDate(Date.now());
  const timestamps: number[] = result.timestamp || [];
  const close: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
  const adjusted: (number | null)[] = result.indicators?.adjclose?.[0]?.adjclose || [];
  // Do not mix adjusted and unadjusted prices inside a time series.
  const useAdjusted = adjusted.filter(positive).length >= 2;
  const prices = useAdjusted ? adjusted : close;
  const unique = new Map<string, number>();
  timestamps.forEach((timestamp, index) => {
    const month = localDate(timestamp * 1000);
    const value = prices[index];
    // Conservatively exclude the current exchange-local day (possibly still trading).
    if (month < today && positive(value)) unique.set(month, value);
  });
  const data = [...unique].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, value }));
  if (data.length < 2) throw new Error(`Insufficient completed observations: ${symbol}`);
  return { data, basis: useAdjusted ? "adjusted" : "close" };
}

async function collectMarketData() {
  const symbols = [...new Set([
    "^KS11", "^IXIC",
    ...Object.values(sectors).flatMap((s) => [...s.korea, ...s.us]),
    ...Object.values(stockPairs).flatMap((s) => [s.korea, s.us]),
    ...Object.values(macroIndicators).map((s) => s.ticker)
  ])];
  const results = new Map<string, QuoteSeries>();
  const failedSymbols: string[] = [];
  let next = 0;
  // Fetch a ticker once per refresh; keep concurrency below the provider's burst limit.
  await Promise.all(Array.from({ length: Math.min(8, symbols.length) }, async () => {
    while (next < symbols.length) {
      const symbol = symbols[next++];
      try { results.set(symbol, await fetchYahooChart(symbol)); }
      catch { failedSymbols.push(symbol); }
    }
  }));
  const series = (symbol: string) => results.get(symbol)?.data || [];
  const indexData = alignSeries(series("^KS11"), series("^IXIC"), "kospi", "nasdaq");
  if (indexData.length < 3) throw new Error("주요 지수의 공통 거래일 데이터를 확보하지 못했습니다.");
  const sectorData = Object.fromEntries(Object.entries(sectors).map(([key, sector]) => {
    const missingSymbols = [...sector.korea, ...sector.us].filter((symbol) => !results.has(symbol));
    const korea = equalWeightBasket(sector.korea.map(series));
    const us = equalWeightBasket(sector.us.map(series));
    const data = alignSeries(korea, us, "korea", "us");
    return [key, { key, label: sector.label, koreaName: sector.koreaName, usName: sector.usName,
      compositionNote: key === "ai" ? "2026-09-09 구성 변경: 상장폐지 관련 공시와 데이터 수집 불가로 더존비즈온(012510)을 제외하고 NAVER·카카오로 구성했습니다. 과거 구간도 현재 두 종목 기준으로 다시 계산하므로 이전 3종목 버전과 수익률이 다릅니다." : null,
      compositionSource: key === "ai" ? "https://kind.krx.co.kr/external/2026/05/28/000523/20260528001262/68629.htm" : null,
      data, missingSymbols, correlation: returnCorrelation(data, "korea", "us") }];
  }));
  const stockPairData = Object.fromEntries(Object.entries(stockPairs).map(([key, pair]) => {
    const data = alignSeries(series(pair.korea), series(pair.us), "korea", "us");
    return [key, { key, label: pair.label, koreaName: pair.koreaName, usName: pair.usName,
      data, correlation: returnCorrelation(data, "korea", "us") }];
  }));
  const macroIndicatorData = Object.fromEntries(Object.entries(macroIndicators).map(([key, indicator]) =>
    [key, { key, ...indicator, data: series(indicator.ticker) }]
  ));
  return {
    updatedAt: new Date().toISOString(),
    source: "Yahoo Finance Chart API · 완료된 일별 관측치",
    dataDate: indexData[indexData.length - 1].month,
    failedSymbols: failedSymbols.sort(),
    closeOnlySymbols: [...results].filter(([, result]) => result.basis === "close").map(([symbol]) => symbol),
    stale: false,
    indexData, indexCorrelation: returnCorrelation(indexData, "kospi", "nasdaq"),
    sectors: sectorData, stockPairs: stockPairData, macroIndicators: macroIndicatorData
  };
}

type MarketPayload = Awaited<ReturnType<typeof collectMarketData>>;
let cached: { savedAt: number; data: MarketPayload } | undefined;
let inFlight: Promise<MarketPayload> | undefined;

export async function getMarketData(): Promise<MarketPayload> {
  if (cached && Date.now() - cached.savedAt < 5 * 60 * 1000) return cached.data;
  if (inFlight) return inFlight;
  inFlight = collectMarketData().then((data) => {
    cached = { savedAt: Date.now(), data };
    return data;
  }).catch((error: unknown) => {
    if (cached && Date.now() - cached.savedAt < 24 * 60 * 60 * 1000) return { ...cached.data, stale: true };
    throw error;
  }).finally(() => { inFlight = undefined; });
  return inFlight;
}
