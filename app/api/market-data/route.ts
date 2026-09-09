import { NextResponse } from "next/server";
import { getMarketData } from "../../../lib/market";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const data = await getMarketData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        error: "시장 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요."
      },
      { status: 503 }
    );
  }
}

