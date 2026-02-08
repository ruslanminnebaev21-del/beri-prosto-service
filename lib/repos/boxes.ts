// lib/repos/boxes.ts
import { getPool } from "@/lib/db";


export type BoxRow = {
  id: number;
  name: string | null;
  internal_number: string | null;
  city_id: number | null;
  full_address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export async function getBoxes(): Promise<BoxRow[]> {
  const q = `
    select
      id,
      name,
      internal_number,
      city_id,
      full_address,
      latitude,
      longitude
    from public.boxes
    order by id asc
  `;
  const pool = getPool();
  const r = await pool.query(q);
  return r.rows as BoxRow[];
}
export type BoxMeta = { name: string | null; full_address: string | null };

export async function getBoxesMetaMap(): Promise<Record<string, BoxMeta>> {
  const q = `
    select internal_number, name, full_address
    from public.boxes
    where internal_number is not null
  `;
  const pool = getPool();
  const r = await pool.query(q);

  const map: Record<string, BoxMeta> = {};
  for (const row of r.rows as Array<{
    internal_number: string;
    name: string | null;
    full_address: string | null;
  }>) {
    map[row.internal_number] = { name: row.name, full_address: row.full_address };
  }
  return map;
}