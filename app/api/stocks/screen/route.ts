import { NextResponse } from "next/server";
import { getStockData } from "../../../../lib/stock-data";
import { STOCKS, koreanDate } from "../../../../lib/stock-types";
import { evaluateSignal } from "../../../../lib/stock-indicators";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Result = {
  stock: (typeof STOCKS)[number];
  signal: ReturnType<typeof evaluateSignal>;
  source: string;
  price: number;
};
let saved: { at: number; rows: Result[]; failed: string[] } | undefined;
let flight: Promise<NonNullable<typeof saved>> | undefined;
async function scan() {
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
            "1d",
            false,
          );
          rows.push({
            stock,
            signal: evaluateSignal(data.candles, koreanDate(Date.now())),
            source: data.source,
            price: data.candles.at(-1)!.close,
          });
        } catch {
          failed.push(stock.code);
        }
      }
    }),
  );
  rows.sort((a, b) => (b.signal.score ?? -1) - (a.signal.score ?? -1));
  return { at: Date.now(), rows, failed };
}
export async function GET() {
  if (!saved || Date.now() - saved.at > 300000) {
    flight ??= scan()
      .then((r) => (saved = r))
      .finally(() => (flight = undefined));
    saved = await flight;
  }
  return NextResponse.json(
    {
      ...saved,
      universe: STOCKS.length,
      method: "완료된 일봉 · 조건 충족 점수",
      asOf: new Date(saved.at).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
