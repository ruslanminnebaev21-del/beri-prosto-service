// app/api/boxesName/route.ts
import { NextResponse } from "next/server";
import { esi } from "@/lib/esiClient";
import { getBoxesMetaMap } from "@/lib/repos/boxes";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

type Cell = {
  state?: string;
  open?: boolean;
  backlight_enabled?: boolean;
};

type MachineRaw = {
  online?: boolean;
  cells?: Record<string, Cell>;
};

type BoxUi = {
  id: string; // PST_0702
  box_id: number | null;
  title: string; // name из БД (или id)
  address: string | null;
  online: boolean;
  totalCells: number;
  vacant: number;
  occupied: number;
  other: number;
  openNow: number;
  backlightOn: number;
};

function toStats(id: string, m: MachineRaw) {
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
    await requireAdmin();
    if (!process.env.ESI_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "ESI_TOKEN is not set" },
        { status: 500 }
      );
    }

    // 1) забираем мапу из БД: PST_xxxx -> { name, full_address }
    const metaMap = await getBoxesMetaMap();

    // 2) забираем машины из ESI
    const raw = await esi.get("/machines");

    const entries =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? Object.entries(raw as Record<string, MachineRaw>)
        : [];

    // 3) склеиваем
    const boxes: BoxUi[] = entries.map(([id, m]) => {
      const stats = toStats(id, m);
      const meta = metaMap[id];

      return {
        ...stats,
        box_id: meta?.id ?? null,
        title: meta?.name || id,
        address: meta?.full_address ?? null,
      };
    });

    boxes.sort((a, b) => a.id.localeCompare(b.id));

    const res = NextResponse.json({ ok: true, boxes }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    console.error("boxesName error:", e);
    const msg = e?.message ?? String(e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 502;
    const res = NextResponse.json(
      { ok: false, error: msg },
      { status }
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
