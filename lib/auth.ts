// lib/auth.ts
import jwt from "jsonwebtoken";

export type SessionPayload = {
  uid: number;
  phone: string;
  is_admin: true;
};

export function signSession(p: SessionPayload) {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) throw new Error("APP_JWT_SECRET is not set");
  return jwt.sign(p, secret, { expiresIn: "30d" });
}

export function verifySession(token: string): SessionPayload | null {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) throw new Error("APP_JWT_SECRET is not set");
  try {
    return jwt.verify(token, secret) as SessionPayload;
  } catch {
    return null;
  }
}