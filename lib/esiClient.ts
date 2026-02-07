// beri-prosto-service/lib/esiClient.ts
const ESI_BASE_URL = process.env.ESI_BASE_URL || "https://api.esi.bz";
const ESI_TOKEN = process.env.ESI_TOKEN!;

type Json = any;

async function request(path: string, init: RequestInit = {}) {
  const url = `${ESI_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${ESI_TOKEN}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    throw new Error(`ESI ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data as Json;
}

export const esi = {
  get: (path: string) => request(path, { method: "GET" }),
  post: (path: string, body?: any) =>
    request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};