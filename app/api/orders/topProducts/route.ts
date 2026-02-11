// app/api/orders/topProducts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getOrdersTopProducts } from "@/lib/services/ordersService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNum(v: string | null) {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);

    const result = await getOrdersTopProducts({
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      boxIds: searchParams.get("boxIds") ?? undefined,
      limit: toNum(searchParams.get("limit")),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { ok: false, error: msg || "internal error" },
      { status }
    );
  }
}
