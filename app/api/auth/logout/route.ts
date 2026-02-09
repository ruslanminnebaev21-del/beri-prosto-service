// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set("session", "", { path: "/", maxAge: 0 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}