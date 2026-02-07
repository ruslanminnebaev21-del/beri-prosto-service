// app/api/esi/allBoxes/route.ts
import { NextResponse } from "next/server";
import { esi } from "@/lib/esiClient";

export const dynamic = "force-dynamic";

type Cell = {
  state?: string;
  open?: boolean;
  backlight_enabled?: boolean;
  height?: number;
  // pin намеренно игнорируем
};

type MachineRaw = {
  online?: boolean;
  cells?: Record<string, Cell>;
};

type MachineUi = {
  id: string;
  online: boolean;
  totalCells: number;
  vacant: number;
  occupied: number;
  other: number;
  openNow: number;
  backlightOn: number;
};

function toUi(id: string, m: MachineRaw): MachineUi {
  const cells = m?.cells || {};
  const list = Object.values(cells);

  let vacant = 0;
  let occupied = 0;
  let other = 0;
  let openNow = 0;
  let backlightOn = 0;

  for (const c of list) {
    const st = (c?.state || "").toLowerCase();
    if (st === "vacant") vacant++;
    else if (st === "occupied") occupied++;
    else other++;

    if (c?.open) openNow++;
    if (c?.backlight_enabled) backlightOn++;
  }

  return {
    id,
    online: !!m?.online,
    totalCells: list.length,
    vacant,
    occupied,
    other,
    openNow,
    backlightOn,
  };
}

export async function GET() {
  try {
    if (!process.env.ESI_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "ESI_TOKEN is not set" },
        { status: 500 }
      );
    }

    const raw = await esi.get("/machines");

    // raw ожидаем как объект { [machineId]: { online, cells } }
    const entries =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? Object.entries(raw as Record<string, MachineRaw>)
        : [];

    const machines = entries.map(([id, m]) => toUi(id, m));

    // можно сортировать как угодно, пусть будет по id
    machines.sort((a, b) => a.id.localeCompare(b.id));

    const res = NextResponse.json({ ok: true, machines }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Unknown error";
    const res = NextResponse.json({ ok: false, error: msg }, { status: 502 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}