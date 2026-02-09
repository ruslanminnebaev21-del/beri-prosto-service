import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export type AdminSession = {
  uid: number;
  phone: string;
  is_admin: true;
};

export async function requireAdmin(): Promise<AdminSession> {
    
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) throw new Error("UNAUTHORIZED");

  const payload = verifySession(token);
  if (!payload) throw new Error("UNAUTHORIZED");

  if (payload.is_admin !== true) throw new Error("FORBIDDEN");

  return payload as AdminSession;
}