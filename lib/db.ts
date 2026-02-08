// lib/db.ts
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function buildPool() {
  const {
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
  } = process.env;

  if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error("DB env vars are not fully set");
  }

  return new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: decodeURIComponent(DB_PASSWORD),
    ssl: { rejectUnauthorized: false }, // = sslmode=prefer
  });
}

const pool = global.__pgPool ?? buildPool();

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool;
}

export { pool };