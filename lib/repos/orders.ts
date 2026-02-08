// beri-prosto-service/lib/repos/orders.ts
import { getPool } from "@/lib/db";

export type OrderWithUserAndProduct = {
  id: string; // UUID
  user_id: number;
  receiving_code: string | null;
  return_code: string | null;
  product_id: number;
  cell_id: number | null;
  total_price: number | null;
  days: number | null;
  status: string;
  refund_date: string | null;
  paid_at: string | null;

  user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  };

  product: {
    id: number;
    name: string | null;
  };

  box: {
    id: number | null;
    name: string | null;
  };
};

export type ListOrdersParamsRepo = {
  statuses: string[]; // ["paid","received"]
  limit?: number;
  offset?: number;
};

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const x = Math.floor(n);
  return Math.min(max, Math.max(min, x));
}

export async function listOrders(params: ListOrdersParamsRepo): Promise<OrderWithUserAndProduct[]> {
  const statuses = (params.statuses || []).map(String).filter(Boolean);
  const limit = clampInt(params.limit, 50, 1, 200);
  const offset = clampInt(params.offset, 0, 0, 1_000_000);

  if (!statuses.length) return [];

  const sql = `
    select
      o.id as o_id,
      o.user_id,
      o.receiving_code,
      o.return_code,
      o.product_id,
      o.cell_id,
      o.total_price,
      o.days,
      o.status,
      o.refund_date,
      o.paid_at,

      u.id as u_id,
      u.first_name as u_first_name,
      u.last_name as u_last_name,
      u.email as u_email,
      u.phone as u_phone,

      p.id as p_id,
      p.name as p_name,

      b.id as b_id,
      b.name as b_name
    from orders o
    join users u on u.id = o.user_id
    join products p on p.id = o.product_id
    left join cells c on c.id = o.cell_id
    left join boxes b on b.id = c.box_id
    where o.status = any($1::v1orderstatusenum[])
    order by o.paid_at desc nulls last, o.id desc
    limit $2 offset $3
  `;

  const pool = getPool();
  const { rows } = await pool.query(sql, [statuses, limit, offset]);

  return rows.map((r: any) => ({
    id: String(r.o_id),
    user_id: Number(r.user_id),
    receiving_code: r.receiving_code ?? null,
    return_code: r.return_code ?? null,
    product_id: Number(r.product_id),
    cell_id: r.cell_id == null ? null : Number(r.cell_id),
    total_price: r.total_price == null ? null : Number(r.total_price),
    days: r.days == null ? null : Number(r.days),
    status: String(r.status),
    refund_date: r.refund_date ?? null,
    paid_at: r.paid_at ?? null,

    user: {
      id: Number(r.u_id),
      first_name: r.u_first_name ?? null,
      last_name: r.u_last_name ?? null,
      email: r.u_email ?? null,
      phone: r.u_phone ?? null,
    },

    product: {
      id: Number(r.p_id),
      name: r.p_name ?? null,
    },

    box: {
      id: r.b_id == null ? null : Number(r.b_id),
      name: r.b_name ?? null,
    },
  }));
}