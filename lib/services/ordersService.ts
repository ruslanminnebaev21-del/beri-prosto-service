// lib/ services/ordersService.ts
import { listOrders, type OrderWithUserAndProduct } from "@/lib/repos/orders";

export type ListOrdersParams = {
  limit?: number;
  offset?: number;
};

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const x = Math.floor(n);
  return Math.min(max, Math.max(min, x));
}

export async function getOrdersPaidOrReceived(params: ListOrdersParams = {}) {
  const limit = clampInt(params.limit, 50, 1, 200);
  const offset = clampInt(params.offset, 0, 0, 1_000_000);

  const statuses = ["paid", "received"];

  const rows: OrderWithUserAndProduct[] = await listOrders({
    statuses,
    limit,
    offset,
  });

  return {
    ok: true as const,
    meta: { limit, offset, count: rows.length, statuses },
    rows,
  };
}