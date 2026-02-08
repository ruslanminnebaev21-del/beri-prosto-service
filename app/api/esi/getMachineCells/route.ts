// app/api/esi/getMachineCells/route.ts
import { NextResponse } from "next/server";
import { esi } from "@/lib/esiClient";

export const dynamic = "force-dynamic";

type CellRaw = {
  pin?: string;
};

type MachineRaw = {
  cells?: Record<string, CellRaw>;
};

type CellUi = {
  num: string; // "1" | "S"
  pin: string; // "1234" (без #)
};

function sortCellNum(a: string, b: string) {
  const an = Number(a);
  const bn = Number(b);
  const aIsNum = Number.isFinite(an) && String(an) === a;
  const bIsNum = Number.isFinite(bn) && String(bn) === b;

  if (aIsNum && bIsNum) return an - bn;
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  return a.localeCompare(b);
}

export async function GET(req: Request) {
  try {
    if (!process.env.ESI_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "ESI_TOKEN is not set" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const machineId = (url.searchParams.get("machineId") || "").trim();
    if (!machineId) {
      return NextResponse.json(
        { ok: false, error: "machineId is required" },
        { status: 400 }
      );
    }

    // Берём ровно нужную инфу: cells + pin.
    // Самый надёжный вариант — взять /machines и достать нужный machineId.
    const raw = await esi.get("/machines");

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json(
        { ok: false, error: "Unexpected ESI response" },
        { status: 502 }
      );
    }

    const machine = (raw as Record<string, MachineRaw>)[machineId];
    if (!machine) {
      return NextResponse.json(
        { ok: false, error: `Machine not found: ${machineId}` },
        { status: 404 }
      );
    }

    const cellsObj = machine.cells || {};
    const cells: CellUi[] = Object.entries(cellsObj)
      .map(([num, c]) => ({
        num,
        pin: c?.pin ? String(c.pin) : "",
      }))
      .sort((a, b) => sortCellNum(a.num, b.num));

    const res = NextResponse.json({ ok: true, cells }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    console.error("getMachineCells error:", e);
    const res = NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 502 }
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}