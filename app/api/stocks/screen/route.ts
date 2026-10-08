import { NextResponse } from "next/server";
import { getStockData } from "../../../../lib/stock-data";
import { STOCKS } from "../../../../lib/stock-types";
import { analyzeHorizon, type Horizon } from "../../../../lib/stock-strategies";
import {
  stockAccess,
  personalResponse,
  personalPreflight,
} from "../../../../lib/personal-connection";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Result = {
  stock: (typeof STOCKS)[number];
  signal: ReturnType<typeof analyzeHorizon>;
  source: string;
  price: number;
};
type ScanResult = { at: number; rows: Result[]; failed: string[] };
const saved = new Map<Horizon, ScanResult>();
const flights = new Map<Horizon, Promise<ScanResult>>();
async function scan(horizon: Horizon) {
  const rows: Result[] = [],
    failed: string[] = [];
  let i = 0;
  // Small, explicit universe; bounded concurrency and per-symbol cache.
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (i < STOCKS.length) {
        const stock = STOCKS[i++];
        try {
          const data = await getStockData(
            stock.code,
            stock.market,
            horizon === "day" ? "1m" : "1d",
            horizon !== "day",
          );
          rows.push({
            stock,
            signal: analyzeHorizon(
              data.candles,
              data.flows,
              horizon,
              Date.now(),
            ),
            source: data.source,
            price: data.candles.at(-1)!.close,
          });
        } catch {
          failed.push(stock.code);
        }
      }
    }),
  );
  rows.sort(
    (a, b) =>
      Number(b.signal.eligible) - Number(a.signal.eligible) ||
      (b.signal.score ?? -1) - (a.signal.score ?? -1),
  );
  return { at: Date.now(), rows, failed };
}
async function readScreen(request: Request) {
  const value = new URL(request.url).searchParams.get("horizon") ?? "swing";
  if (!["day", "swing", "position"].includes(value))
    return NextResponse.json(
      { error: "올바른 매매 기간을 선택해 주세요." },
      { status: 400 },
    );
  const horizon = value as Horizon,
    cacheSeconds = horizon === "day" ? 60 : 300;
  let result = saved.get(horizon);
  if (!result || Date.now() - result.at > cacheSeconds * 1000) {
    if (!flights.has(horizon))
      flights.set(
        horizon,
        scan(horizon)
          .then((r) => {
            saved.set(horizon, r);
            return r;
          })
          .finally(() => flights.delete(horizon)),
      );
    result = await flights.get(horizon)!;
  }
  return NextResponse.json(
    {
      ...result,
      horizon,
      cacheSeconds,
      universe: STOCKS.length,
      method: horizon,
      asOf: new Date(result.at).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function GET(request: Request) {
  return (
    stockAccess(request) ?? personalResponse(request, await readScreen(request))
  );
}
export function OPTIONS(request: Request) {
  return personalPreflight(request);
}
