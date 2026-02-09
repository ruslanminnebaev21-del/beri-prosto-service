// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { signSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const phone = String(body?.phone ?? "").trim();

    if (!phone) {
      return NextResponse.json({ ok: false, error: "phone is required" }, { status: 400 });
    }

    const pool = getPool();

    const { rows } = await pool.query(
      `
      select id, phone, is_admin
      from public.users
      where phone = $1
      limit 1
      `,
      [phone]
    );

    const u = rows?.[0];
    if (!u) {
      return NextResponse.json({ ok: false, error: "user not found" }, { status: 401 });
    }

    if (!u.is_admin) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const token = signSession({
      uid: Number(u.id),
      phone: String(u.phone),
      is_admin: true,
    });

    const res = NextResponse.json({ ok: true }, { status: 200 });

    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 дней
    });

    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "login error" },
      { status: 500 }
    );
  }
}