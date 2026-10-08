import { NextRequest, NextResponse } from "next/server";
import { getQuote, tossConfigured } from "../../../../lib/stock-data";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get("code") ?? "").toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code))
    return NextResponse.json({ error: "종목코드 오류" }, { status: 400 });
  if (!tossConfigured())
    return NextResponse.json({ error: "토스 API 미연결" }, { status: 503 });
  try {
    return NextResponse.json(
      { quote: await getQuote(code), source: "Toss" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "현재가 갱신 실패" }, { status: 502 });
  }
}
