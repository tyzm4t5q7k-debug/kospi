import { NextRequest, NextResponse } from "next/server";
import { getStockData } from "../../../lib/stock-data";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams,
    code = (p.get("code") ?? "005930").toUpperCase(),
    interval = p.get("interval") ?? "1d",
    market = p.get("market") ?? "KOSPI";
  if (
    !/^[A-Z0-9]{6}$/.test(code) ||
    !["1d", "1m"].includes(interval) ||
    !["KOSPI", "KOSDAQ"].includes(market)
  )
    return NextResponse.json(
      { error: "올바른 국내 종목코드·주기를 입력해 주세요." },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      await getStockData(code, market, interval as "1d" | "1m"),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "시세를 불러오지 못했습니다. 종목코드·연결 상태를 확인하고 다시 시도해 주세요.",
      },
      { status: 502 },
    );
  }
}
