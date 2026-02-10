// app/api/orders/finance/series/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getOrdersFinanceSeries } from "@/lib/services/ordersService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);

    const result = await getOrdersFinanceSeries({
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      boxIds: searchParams.get("boxIds") ?? undefined,
      statuses: searchParams.get("statuses") ?? undefined,
      groupBy: searchParams.get("groupBy") ?? undefined,
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
