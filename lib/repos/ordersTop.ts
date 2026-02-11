// beri-prosto-service/lib/repos/ordersTop.ts
import { getPool } from "@/lib/db";

export type OrdersTopProductRow = {
  product_name: string | null;
  orders_count: number;
  total_sum: number;
};

export type GetTopProductsParams = {
  dateFrom?: string;
  dateTo?: string;
  boxIds?: number[];
  limit?: number;
};

export async function getTopProductsByOrders(
  params: GetTopProductsParams
): Promise<OrdersTopProductRow[]> {
  const boxIds = (params.boxIds || []).map(Number).filter(Number.isFinite);
  const limit = Number.isFinite(params.limit) ? Math.max(1, Math.min(50, Number(params.limit))) : 5;

  const values: any[] = [];
  const where: string[] = [
    "o.status <> 'canceled'",
    "o.total_price is not null",
    "o.paid_at is not null",
  ];

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

  values.push(limit);

  const sql = `
    select
      p.name as product_name,
      count(o.id) as orders_count,
      sum(o.total_price) as total_sum
    from orders o
    join products p on p.id = o.product_id
    left join cells c on c.id = o.cell_id
    left join boxes b on b.id = c.box_id
    where ${where.join(" and ")}
    group by p.name
    order by total_sum desc nulls last
    limit $${values.length}
  `;

  const pool = getPool();
  const { rows } = await pool.query(sql, values);

  return rows.map((r: any) => ({
    product_name: r.product_name ?? null,
    orders_count: r.orders_count == null ? 0 : Number(r.orders_count),
    total_sum: r.total_sum == null ? 0 : Number(r.total_sum),
  }));
}
