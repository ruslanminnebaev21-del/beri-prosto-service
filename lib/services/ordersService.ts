// lib/ services/ordersService.ts
import { listOrders, type OrderWithUserAndProduct } from "@/lib/repos/orders";
import {
  getOrdersMoneyByBoxes,
  getOrdersMoneySeries,
  type GetOrdersMoneyByBoxesParams,
  type GetOrdersMoneySeriesParams,
} from "@/lib/repos/ordersFinance";
import { getTopProductsByOrders, type GetTopProductsParams } from "@/lib/repos/ordersTop";

export type ListOrdersParams = {
  limit?: number;
  offset?: number;
};

export type GetOrdersFinanceByBoxesParams = {
  dateFrom?: string;
  dateTo?: string;
  boxIds?: string;
  statuses?: string;
};

export type GetOrdersFinanceSeriesParams = {
  dateFrom?: string;
  dateTo?: string;
  boxIds?: string;
  statuses?: string;
  groupBy?: string;
};

export type GetOrdersTopProductsParams = {
  dateFrom?: string;
  dateTo?: string;
  boxIds?: string;
  limit?: number;
};

function clampInt(v: unknown, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const x = Math.floor(n);
  return Math.min(max, Math.max(min, x));
}

function parseCsvNumbers(v?: string): number[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Number.isFinite);
}

function parseCsvStrings(v?: string): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getOrdersPaidReceivedOrPendingReview(params: ListOrdersParams = {}) {
  const limit = clampInt(params.limit, 50, 1, 200);
  const offset = clampInt(params.offset, 0, 0, 1_000_000);

  const statuses = ["paid", "pending_review", "received"];

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

export async function getOrdersFinanceByBoxes(params: GetOrdersFinanceByBoxesParams = {}) {
  const boxIds = parseCsvNumbers(params.boxIds);
  const statuses = parseCsvStrings(params.statuses).filter((s) => s !== "canceled");

  const repoParams: GetOrdersMoneyByBoxesParams = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    boxIds: boxIds.length ? boxIds : undefined,
    statuses: statuses.length ? statuses : undefined,
  };

  const rows = await getOrdersMoneyByBoxes(repoParams);

  return {
    ok: true as const,
    meta: {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      boxIds: boxIds.length ? boxIds : null,
      statuses: repoParams.statuses || ["!canceled"],
    },
    rows,
  };
}

export async function getOrdersFinanceSeries(params: GetOrdersFinanceSeriesParams = {}) {
  const boxIds = parseCsvNumbers(params.boxIds);
  const statuses = parseCsvStrings(params.statuses).filter((s) => s !== "canceled");
  const groupBy = params.groupBy === "week" ? "week" : "day";

  const repoParams: GetOrdersMoneySeriesParams = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    boxIds: boxIds.length ? boxIds : undefined,
    statuses: statuses.length ? statuses : undefined,
    groupBy,
  };

  const rows = await getOrdersMoneySeries(repoParams);

  return {
    ok: true as const,
    meta: {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      boxIds: boxIds.length ? boxIds : null,
      statuses: repoParams.statuses || ["!canceled"],
      groupBy,
    },
    rows,
  };
}

export async function getOrdersTopProducts(params: GetOrdersTopProductsParams = {}) {
  const boxIds = parseCsvNumbers(params.boxIds);

  const repoParams: GetTopProductsParams = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    boxIds: boxIds.length ? boxIds : undefined,
    limit: params.limit,
  };

  const rows = await getTopProductsByOrders(repoParams);

  return {
    ok: true as const,
    meta: {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      boxIds: boxIds.length ? boxIds : null,
      limit: repoParams.limit ?? 5,
    },
    rows,
  };
}
