// beri-prosto-service/lib/repos/ordersFinance.ts
import { getPool } from "@/lib/db";

export type OrdersFinanceByBoxRow = {
  box_id: number | null;
  box_name: string | null;
  orders_count: number;
  total_sum: number;
};

export type OrdersFinanceSeriesRow = {
  period_start: string;
  total_sum: number;
};

export type GetOrdersMoneyByBoxesParams = {
  dateFrom?: string;
  dateTo?: string;
  boxIds?: number[];
  statuses?: string[];
};

export type GetOrdersMoneySeriesParams = {
  dateFrom?: string;
  dateTo?: string;
  boxIds?: number[];
  statuses?: string[];
  groupBy?: "day" | "week";
};

export async function getOrdersMoneyByBoxes(
  params: GetOrdersMoneyByBoxesParams
): Promise<OrdersFinanceByBoxRow[]> {
  const statuses = (params.statuses || []).map(String).filter(Boolean);
  const filteredStatuses = statuses.filter((s) => s !== "canceled");

  const boxIds = (params.boxIds || []).map(Number).filter(Number.isFinite);

  const values: any[] = [];
  const where: string[] = ["o.status <> 'canceled'", "o.total_price is not null"];
  if (filteredStatuses.length) {
    values.push(filteredStatuses);
    where.push(`o.status = any($${values.length}::v1orderstatusenum[])`);
  } else if (statuses.length) {
    return [];
  }

  if (params.dateFrom) {
    values.push(params.dateFrom);
    where.push(`o.paid_at >= ($${values.length})::timestamptz`);
  }

  if (params.dateTo) {
    values.push(params.dateTo);
    where.push(`o.paid_at < (($${values.length})::date + interval '1 day')`);
  }

  if (boxIds.length) {
    values.push(boxIds);
    where.push(`b.id = any($${values.length}::int[])`);
  }

  const sql = `
    select
      b.id as box_id,
      b.name as box_name,
      count(o.id) as orders_count,
      sum(o.total_price) as total_sum
    from orders o
    left join cells c on c.id = o.cell_id
    left join boxes b on b.id = c.box_id
    where ${where.join(" and ")}
    group by b.id, b.name
    order by total_sum desc nulls last
  `;

  const pool = getPool();
  const { rows } = await pool.query(sql, values);

  return rows.map((r: any) => ({
    box_id: r.box_id == null ? null : Number(r.box_id),
    box_name: r.box_name ?? null,
    orders_count: r.orders_count == null ? 0 : Number(r.orders_count),
    total_sum: r.total_sum == null ? 0 : Number(r.total_sum),
  }));
}

export async function getOrdersMoneySeries(
  params: GetOrdersMoneySeriesParams
): Promise<OrdersFinanceSeriesRow[]> {
  const groupBy = params.groupBy === "week" ? "week" : "day";

  const statuses = (params.statuses || []).map(String).filter(Boolean);
  const filteredStatuses = statuses.filter((s) => s !== "canceled");

  const boxIds = (params.boxIds || []).map(Number).filter(Number.isFinite);

  const values: any[] = [];
  const where: string[] = [
    "o.status <> 'canceled'",
    "o.total_price is not null",
    "o.paid_at is not null",
  ];

  if (filteredStatuses.length) {
    values.push(filteredStatuses);
    where.push(`o.status = any($${values.length}::v1orderstatusenum[])`);
  } else if (statuses.length) {
    return [];
  }

  if (params.dateFrom) {
    values.push(params.dateFrom);
    where.push(`o.paid_at >= ($${values.length})::timestamptz`);
  }

  if (params.dateTo) {
    values.push(params.dateTo);
    where.push(`o.paid_at < (($${values.length})::date + interval '1 day')`);
  }

  if (boxIds.length) {
    values.push(boxIds);
    where.push(`b.id = any($${values.length}::int[])`);
  }

  const sql = `
    select
      to_char(date_trunc('${groupBy}', o.paid_at)::date, 'YYYY-MM-DD') as period_start,
      sum(o.total_price) as total_sum
    from orders o
    left join cells c on c.id = o.cell_id
    left join boxes b on b.id = c.box_id
    where ${where.join(" and ")}
    group by 1
    order by 1 asc
  `;

  const pool = getPool();
  const { rows } = await pool.query(sql, values);

  return rows.map((r: any) => ({
    period_start: String(r.period_start),
    total_sum: r.total_sum == null ? 0 : Number(r.total_sum),
  }));
}
