// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOrdersPaidOrReceived } from "@/lib/services/ordersService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNum(v: string | null) {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const result = await getOrdersPaidOrReceived({
      limit: toNum(searchParams.get("limit")),
      offset: toNum(searchParams.get("offset")),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "internal error" },
      { status: 500 }
    );
  }
}