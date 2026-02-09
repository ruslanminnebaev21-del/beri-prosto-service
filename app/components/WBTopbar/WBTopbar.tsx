// wb-app/app/components/WBTopbar/WBTopbar.tsx
"use client";

import styles from "./WBTopbar.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Portal from "../Portal/Portal";

/* ===== helpers ===== */

function monthRu(d = new Date()) {
  const m = d.toLocaleString("ru-RU", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  const wd = d.toLocaleString("ru-RU", { weekday: "short" });
  return `${day} ${m}, ${wd}`;
}

function pageTitleByPath(pathname: string) {
  if (pathname.startsWith("/finance/reports")) return "Финансовые отчёты";
  if (pathname.startsWith("/sales")) return "Анализ продаж";
  if (pathname.startsWith("/profile")) return "Профиль";
  if (pathname.startsWith("/unit")) return "Юнит-экономика";
  return "WB Finance";
}

type ApiCabinet = {
  id: number;
  cabinetName: string;
  status: "active" | "inactive" | string;
  isPrimary: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProfileResp = {
  hasCabinet?: boolean;
  cabinetName?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ===== component ===== */

export default function WBTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const pageTitle = pageTitleByPath(pathname);

  const [cabinetName, setCabinetName] = useState<string>("WB аккаунт");

  // popover
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // list
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApiCabinet[]>([]);
  const hasItems = useMemo(() => items.length > 0, [items]);

  // 1) текущее имя кабинета (как было)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/profile", { method: "GET" });
        const json = (await res.json().catch(() => null)) as ProfileResp | null;
        if (!alive) return;

        if (res.ok && json?.hasCabinet && json?.cabinetName) {
          setCabinetName(String(json.cabinetName));
        } else {
          setCabinetName("WB аккаунт");
        }
      } catch {
        // молча
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // 2) закрытие по клику снаружи + Esc
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 3) позиционирование поповера (портал → fixed)
  useEffect(() => {
    if (!open) return;

    const place = () => {
      const el = btnRef.current;
      if (!el) return;

      const r = el.getBoundingClientRect();

      const W = 320; // ширина поповера (потом подстроим стилями)
      const GAP = 10;
      const PAD = 12;

      const left = clamp(r.right - W, PAD, window.innerWidth - PAD - W);
      const top = r.bottom + GAP;

      setPos({ top, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // 4) загрузка списка кабинетов при открытии
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/profile/cabinets", { cache: "no-store" });
        const j = await r.json().catch(() => null);

        if (!r.ok || !j?.ok) {
          setItems([]);
          return;
        }

        const list: ApiCabinet[] = Array.isArray(j.items) ? j.items : [];
        setItems(
          list.map((x: any) => ({
            id: Number(x.id),
            cabinetName: String(x.cabinetName || "Wildberries кабинет"),
            status: String(x.status || "inactive"),
            isPrimary: Boolean(x.isPrimary),
            createdAt: x.createdAt ?? null,
            updatedAt: x.updatedAt ?? null,
          }))
        );
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <div className={styles.pageTitle}>{pageTitle}</div>
      </div>

      <div className={styles.topbarCenter}>
        {/* Кликабельный блок */}
        <div
          ref={btnRef}
          className={styles.profileMini}
          role="button"
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setOpen((v) => !v);
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Кабинеты"
        >
          <div className={styles.profileText}>
            <div className={styles.profileName}>{cabinetName}</div>
            <div className={styles.profileSub}>{monthRu()}</div>
          </div>

          
        </div>

        {open && pos ? (
          <Portal>
            <div
              ref={popRef}
              className={styles.cabinetPopover}
              role="dialog"
              aria-label="Кабинеты"
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 1000 }}
            >
              {/*<div className={styles.cabinetHead}>
                <div className={styles.cabinetTitle}>Кабинеты</div>
                <button
                  type="button"
                  className={styles.cabinetClose}
                  onClick={() => setOpen(false)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>*/}

              {loading ? (
                <div className={styles.cabinetEmpty}>Загружаю…</div>
              ) : !hasItems ? (
                <div className={styles.cabinetEmpty}>Кабинетов нет</div>
              ) : (
                <div className={styles.cabinetList}>
                  {items.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.cabinetItem}
                      onClick={async () => {
                        try {
                          // ставим primary
                          const r = await fetch("/api/profile/cabinets", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ cabinetId: c.id }),
                          });
                          const j = await r.json().catch(() => null);
                          if (!r.ok || !j?.ok) throw new Error(j?.error || "API error");

                          // локально обновим список, чтобы сразу было видно "основной"
                          setItems((prev) => prev.map((x) => ({ ...x, isPrimary: x.id === c.id })));

                          // и имя в топбаре
                          setCabinetName(c.cabinetName);

                          // ВОТ ГЛАВНОЕ: обновляем URL -> страница увидит новый cabinetId
                          const params = new URLSearchParams(sp.toString());
                          params.set("cabinetId", String(c.id));

                          router.replace(`${pathname}?${params.toString()}`);
                          router.refresh();

                          setOpen(false);
                        } catch (e) {
                          setOpen(false);
                        }
                      }}
                      title={c.cabinetName}
                    >
                      <div className={styles.cabinetItemLeft}>
                        <div className={styles.cabinetItemName}>{c.cabinetName}</div>
                        <div className={styles.cabinetItemMeta}>
                          {c.status === "active" ? "активен" : "не активен"}
                          {c.isPrimary ? " • основной" : ""}
                        </div>
                      </div>

                      <span
                        className={`${styles.cabinetPill} ${
                          c.status === "active" ? styles.cabinetPillOn : styles.cabinetPillOff
                        }`}
                      >
                        {c.status === "active" ? "ON" : "OFF"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Portal>
        ) : null}
      </div>
    </header>
  );
}