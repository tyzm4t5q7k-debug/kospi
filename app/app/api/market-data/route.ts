import { NextResponse } from "next/server";
import { getMarketData } from "../../../lib/market";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMarketData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch market data",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
