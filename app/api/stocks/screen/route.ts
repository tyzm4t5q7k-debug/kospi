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
          const data = await getStockData(stock.code, stock.market, "1d", true);
          rows.push({
            stock,
            signal: evaluateSignal(
              data.candles,
              koreanDate(Date.now()),
              data.flows,
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
      method: "일봉 스윙 · 3전략 조건 · 5거래일 수급 · 위험 필터",
      asOf: new Date(saved.at).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
