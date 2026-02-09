// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function verify(token: string) {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) throw new Error("APP_JWT_SECRET is not set");

  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload as any;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // лог — ТОЛЬКО здесь
  console.log("MIDDLEWARE HIT", pathname);

  // If already authorized, don't allow opening /login.
  if (pathname === "/login") {
    const token = req.cookies.get("session")?.value;
    if (token) {
      try {
        const payload = await verify(token);
        if (payload?.is_admin === true) {
          const url = req.nextUrl.clone();
          url.pathname = "/orders";
          url.search = "";
          return NextResponse.redirect(url);
        }
      } catch {
        // invalid session -> allow to open login
      }
    }
    return NextResponse.next();
  }

  // публичные маршруты
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const payload = await verify(token);

    if (payload?.is_admin !== true) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
