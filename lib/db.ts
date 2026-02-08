// lib/db.ts
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function buildPool() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error("DB env vars are not fully set");
  }

  return new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: decodeURIComponent(DB_PASSWORD),
    ssl: { rejectUnauthorized: false },
  });
}

export function getPool(): Pool {
  if (global.__pgPool) return global.__pgPool;

  const pool = buildPool();

  // можно кэшировать всегда, ок и в prod
  global.__pgPool = pool;

  return pool;
}