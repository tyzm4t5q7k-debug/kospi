import { NextRequest, NextResponse } from "next/server";
import { getQuote, tossConfigured } from "../../../../lib/stock-data";
import {
  stockAccess,
  personalResponse,
  personalPreflight,
} from "../../../../lib/personal-connection";
export const dynamic = "force-dynamic";
async function readQuote(request: NextRequest) {
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
export async function GET(request: NextRequest) {
  return (
    stockAccess(request) ?? personalResponse(request, await readQuote(request))
  );
}
export function OPTIONS(request: Request) {
  return personalPreflight(request);
}
