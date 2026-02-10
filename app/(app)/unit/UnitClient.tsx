// app/(app)/unit/UnitClient.tsx
"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "../../page.module.css";

type BoxUi = {
  id: string;
  title: string;
  address: string | null;
};

type BoxesResp = { ok: true; boxes: BoxUi[] } | { ok: false; error: string };

type OrdersFinanceRow = {
  box_id: number | null;
  box_name: string | null;
  orders_count: number;
  total_sum: number;
};

type OrdersFinanceSeriesRow = {
  period_start: string;
  total_sum: number;
};

type OrdersFinanceResp =
  | { ok: true; meta: any; rows: OrdersFinanceRow[] }
  | { ok: false; error: string };

type OrdersFinanceSeriesResp =
  | { ok: true; meta: any; rows: OrdersFinanceSeriesRow[] }
  | { ok: false; error: string };

type FilterItem = {
  id: string;
  label: string;
  sub?: string;
};

function dmy(ymd: string | null | undefined) {
  if (!ymd) return "—";
  const [y, m, d] = String(ymd).split("-");
  if (!y || !m || !d) return String(ymd);
  return `${d}.${m}.${y}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoFromDate(date: Date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function dateFromIso(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

function mondayIndex(jsDay: number) {
  // JS: 0=Sun..6=Sat => 0=Mon..6=Sun
  return (jsDay + 6) % 7;
}

function monthTitle(year: number, month0: number) {
  const names = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];
  return `${names[month0] ?? ""} ${year}`;
}

function buildMonthGrid(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const startOffset = mondayIndex(first.getDay());

  const cells: Array<{ day: number; iso: string } | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, iso: isoFromDate(new Date(year, month0, day)) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: Array<Array<{ day: number; iso: string } | null>> = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const moneyFmt = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function money(v: number) {
  return moneyFmt.format(Number.isFinite(v) ? v : 0);
}

export default function UnitClient() {
  const [fromIso, setFromIso] = useState<string | null>(() => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    return isoFromDate(from);
  });
  const [toIso, setToIso] = useState<string | null>(() => {
    const today = new Date();
    return isoFromDate(today);
  });

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

  const [dateOpen, setDateOpen] = useState<"from" | "to" | null>(null);
  const fromBtnRef = useRef<HTMLButtonElement | null>(null);
  const toBtnRef = useRef<HTMLButtonElement | null>(null);
  const datePopoverRef = useRef<HTMLDivElement | null>(null);
  const [datePos, setDatePos] = useState<{ top: number; left: number } | null>(null);
  const [cursor, setCursor] = useState<{ y: number; m0: number }>(() => {
    const now = new Date();
    return { y: now.getFullYear(), m0: now.getMonth() };
  });

  const [boxes, setBoxes] = useState<FilterItem[]>([]);
  const [boxesLoading, setBoxesLoading] = useState(false);

  const [appliedBoxes, setAppliedBoxes] = useState<string[]>([]);
  const [draftBoxes, setDraftBoxes] = useState<string[]>([]);
  const [financeRows, setFinanceRows] = useState<OrdersFinanceRow[]>([]);
  const [seriesRows, setSeriesRows] = useState<OrdersFinanceSeriesRow[]>([]);
  const [seriesGroupBy, setSeriesGroupBy] = useState<"day" | "week">("day");

  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null);

  const computePopoverPos = useCallback((btn: HTMLElement | null, width: number) => {
    const card = cardRef.current;
    if (!btn || !card) return null;

    const b = btn.getBoundingClientRect();
    const c = card.getBoundingClientRect();

    const W = width;
    const PAD = 8;
    const desiredLeft = b.left - c.left;
    const left = Math.max(PAD, Math.min(desiredLeft, c.width - PAD - W));
    const top = b.bottom - c.top + 10;

    return { top, left };
  }, []);

  useEffect(() => {
    if (fromIso && toIso && toIso < fromIso) setToIso(fromIso);
  }, [fromIso, toIso]);

  const hasFilter = appliedBoxes.length > 0;

  const activeList = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return boxes;

    return boxes.filter((x) => {
      const label = String(x.label || "").toLowerCase();
      const sub = String(x.sub || "").toLowerCase();
      const id = String(x.id || "").toLowerCase();
      return label.includes(q) || sub.includes(q) || id.includes(q);
    });
  }, [filterSearch, boxes]);

  function toggleBox(id: string) {
    setDraftBoxes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const fetchBoxes = useCallback(async () => {
    if (boxesLoading) return;

    try {
      setBoxesLoading(true);
      setErr(null);

      const r = await fetch("/api/boxesName", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await r.json().catch(() => null)) as BoxesResp | null;

      if (!r.ok || !json) {
        setBoxes([]);
        setErr(`HTTP ${r.status}`);
        return;
      }

      if (!json.ok) {
        setBoxes([]);
        setErr(json.error);
        return;
      }

      const list = Array.isArray(json.boxes) ? json.boxes : [];
      const items: FilterItem[] = list.map((b) => ({
        id: String(b.id),
        label: String(b.title || b.id),
        sub: b.address ? String(b.address) : undefined,
      }));

      items.sort((a, b) => a.label.localeCompare(b.label, "ru"));
      setBoxes(items);
    } catch (e: unknown) {
      setBoxes([]);
      const msg = e instanceof Error ? e.message : null;
      setErr(msg ? String(msg) : "Ошибка запроса");
    } finally {
      setBoxesLoading(false);
    }
  }, [boxesLoading]);

  const loadRange = useCallback(async (from: string, to: string, boxIds: string[]) => {
    try {
      setLoading(true);
      setErr(null);
      const fromDate = dateFromIso(from);
      const toDate = dateFromIso(to);
      const rangeDays = fromDate && toDate ? diffDays(fromDate, toDate) : 0;
      const groupBy: "day" | "week" = rangeDays > 31 ? "week" : "day";
      setSeriesGroupBy(groupBy);

      const qs = new URLSearchParams();
      qs.set("dateFrom", from);
      qs.set("dateTo", to);
      if (boxIds.length) qs.set("boxIds", boxIds.join(","));

      const [rFinance, rSeries] = await Promise.all([
        fetch(`/api/orders/finance?${qs.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }),
        fetch(`/api/orders/finance/series?${qs.toString()}&groupBy=${groupBy}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }),
      ]);

      const jsonFinance = (await rFinance.json().catch(() => null)) as OrdersFinanceResp | null;

      if (!rFinance.ok || !jsonFinance) {
        setFinanceRows([]);
        setErr(`HTTP ${rFinance.status}`);
        return;
      }

      if (!jsonFinance.ok) {
        setFinanceRows([]);
        setErr(jsonFinance.error);
        return;
      }

      setFinanceRows(Array.isArray(jsonFinance.rows) ? jsonFinance.rows : []);

      const jsonSeries = (await rSeries.json().catch(() => null)) as OrdersFinanceSeriesResp | null;
      if (!rSeries.ok || !jsonSeries || !jsonSeries.ok) {
        setSeriesRows([]);
        return;
      }

      setSeriesRows(Array.isArray(jsonSeries.rows) ? jsonSeries.rows : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fromIso || !toIso) return;
    void loadRange(fromIso, toIso, appliedBoxes);
  }, [fromIso, toIso, appliedBoxes, loadRange]);

  function applyFilters() {
    const next = draftBoxes;
    setAppliedBoxes(next);
    setFilterOpen(false);
    setPopPos(null);
    if (fromIso && toIso) void loadRange(fromIso, toIso, next);
  }

  function resetFilters() {
    setDraftBoxes([]);
    setAppliedBoxes([]);
    setFinanceRows([]);
    setSeriesRows([]);
    setFilterSearch("");
    setFilterOpen(false);
    setPopPos(null);
  }

  // popover close on outside click + Esc
  useEffect(() => {
    if (!filterOpen) return;

    const onDown = (e: MouseEvent) => {
      const p = popoverRef.current;
      const b = filterBtnRef.current;
      const t = e.target as Node | null;

      if (!t) return;
      if (p && p.contains(t)) return;
      if (b && b.contains(t)) return;

      setFilterOpen(false);
      setPopPos(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFilterOpen(false);
        setPopPos(null);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  // Popover positioning (and no "jump" on first open)
  useLayoutEffect(() => {
    if (!filterOpen) return;

    const place = () => {
      const next = computePopoverPos(filterBtnRef.current, 520);
      if (next) setPopPos(next);
    };

    const controlsEl = controlsRef.current;
    const onControlsScroll: EventListener = () => place();

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    controlsEl?.addEventListener("scroll", onControlsScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      controlsEl?.removeEventListener("scroll", onControlsScroll);
    };
  }, [filterOpen, computePopoverPos]);

  // date popover close on outside click + Esc
  useEffect(() => {
    if (!dateOpen) return;

    const onDown = (e: MouseEvent) => {
      const p = datePopoverRef.current;
      const a = fromBtnRef.current;
      const b = toBtnRef.current;
      const t = e.target as Node | null;
      if (!t) return;

      if (p && p.contains(t)) return;
      if (a && a.contains(t)) return;
      if (b && b.contains(t)) return;

      setDateOpen(null);
      setDatePos(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDateOpen(null);
        setDatePos(null);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [dateOpen]);

  useLayoutEffect(() => {
    if (!dateOpen) return;

    const place = () => {
      const btn = dateOpen === "from" ? fromBtnRef.current : toBtnRef.current;
      const next = computePopoverPos(btn, 316);
      if (next) setDatePos(next);
    };

    const controlsEl = controlsRef.current;
    const onControlsScroll: EventListener = () => place();

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    controlsEl?.addEventListener("scroll", onControlsScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      controlsEl?.removeEventListener("scroll", onControlsScroll);
    };
  }, [dateOpen, computePopoverPos]);

  const calendarRows = useMemo(() => buildMonthGrid(cursor.y, cursor.m0), [cursor]);
  const selectedIso = dateOpen === "from" ? fromIso : dateOpen === "to" ? toIso : null;
  const minIso = dateOpen === "to" ? fromIso : null;
  const maxIso = dateOpen === "to" ? isoFromDate(new Date()) : null;
  const financeTotals = useMemo(() => {
    let orders = 0;
    let sum = 0;
    for (const row of financeRows) {
      orders += Number(row.orders_count || 0);
      sum += Number(row.total_sum || 0);
    }
    return { orders, sum };
  }, [financeRows]);
  const avgCheck = financeTotals.orders > 0 ? financeTotals.sum / financeTotals.orders : 0;
  const trendSeries = useMemo(() => {
    const fromDate = fromIso ? dateFromIso(fromIso) : null;
    const toDate = toIso ? dateFromIso(toIso) : null;
    if (!fromDate || !toDate) return [];

    const map = new Map<string, number>();
    for (const r of seriesRows) {
      map.set(String(r.period_start), Number(r.total_sum || 0));
    }

    const out: Array<{ label: string; range: string; value: number }> = [];

    if (seriesGroupBy === "day") {
      for (let d = new Date(fromDate); d <= toDate; d = addDays(d, 1)) {
        const iso = isoFromDate(d);
        const label = dmy(iso);
        out.push({ label, range: label, value: map.get(iso) ?? 0 });
      }
    } else {
      const start = new Date(fromDate);
      const startOffset = mondayIndex(start.getDay());
      const weekStart = addDays(start, -startOffset);
      for (let d = new Date(weekStart); d <= toDate; d = addDays(d, 7)) {
        const isoStart = isoFromDate(d);
        const isoEnd = isoFromDate(addDays(d, 6));
        const range = `${dmy(isoStart)}–${dmy(isoEnd)}`;
        const label = dmy(isoStart);
        out.push({ label, range, value: map.get(isoStart) ?? 0 });
      }
    }

    return out;
  }, [fromIso, toIso, seriesRows, seriesGroupBy]);

  return (
    <div className={styles.unitScope}>
      <section className={styles.gridUnit}>
        <div ref={cardRef} className={`${styles.cardWide} ${styles.cardNoClip}`}>
          <div className={styles.cardHeadRow}>
            <div>
              <div className={styles.cardTitle}>Параметры</div>
              <div className={styles.cardSubtitle}>Выбери диапазон и нажми Показать</div>
            </div>

            <div className={styles.statusPill}>
              {loading
                ? "Загрузка"
                : hasFilter
                ? `Постаматов: ${appliedBoxes.length}`
                : "Постаматов: все"}
            </div>
          </div>

          <div ref={controlsRef} className={styles.controlsRow}>
            <label className={styles.selectWrap}>
              <button
                ref={fromBtnRef}
                type="button"
                className={styles.selectUnit}
                disabled={loading}
                onClick={() => {
                  setFilterOpen(false);
                  setPopPos(null);

                  setDateOpen((v) => {
                    const next = v === "from" ? null : "from";
                    if (next) {
                      const base = fromIso ? dateFromIso(fromIso) : new Date();
                      if (base) setCursor({ y: base.getFullYear(), m0: base.getMonth() });
                      const pos = computePopoverPos(fromBtnRef.current, 316);
                      if (pos) setDatePos(pos);
                    } else {
                      setDatePos(null);
                    }
                    return next;
                  });
                }}
              >
                {fromIso ? dmy(fromIso) : "Дата от"}
              </button>
            </label>

            <label className={styles.selectWrap}>
              <span className={styles.selectHint}>–</span>
              <button
                ref={toBtnRef}
                type="button"
                className={styles.selectUnit}
                disabled={loading}
                onClick={() => {
                  setFilterOpen(false);
                  setPopPos(null);

                  setDateOpen((v) => {
                    const next = v === "to" ? null : "to";
                    if (next) {
                      const base = toIso ? dateFromIso(toIso) : fromIso ? dateFromIso(fromIso) : new Date();
                      if (base) setCursor({ y: base.getFullYear(), m0: base.getMonth() });
                      const pos = computePopoverPos(toBtnRef.current, 316);
                      if (pos) setDatePos(pos);
                    } else {
                      setDatePos(null);
                    }
                    return next;
                  });
                }}
              >
                {toIso ? dmy(toIso) : "Дата до"}
              </button>
            </label>

            <button
              type="button"
              className={styles.btnUnit}
              onClick={() => {
                if (fromIso && toIso) void loadRange(fromIso, toIso, appliedBoxes);
              }}
              disabled={!fromIso || !toIso || loading}
              title={!fromIso || !toIso ? "Выбери даты" : undefined}
            >
              Показать
            </button>

            <div className={styles.filterAnchor}>
              <button
                ref={filterBtnRef}
                className={styles.navItem}
                type="button"
                title="Фильтры"
                disabled={boxesLoading}
                onClick={() => {
                  setDateOpen(null);
                  setDatePos(null);
                  setFilterOpen((v) => {
                    const next = !v;
                    if (next) {
                      const pos = computePopoverPos(filterBtnRef.current, 520);
                      if (pos) setPopPos(pos);
                      setDraftBoxes(appliedBoxes);
                      void fetchBoxes();
                    } else {
                      setPopPos(null);
                    }
                    return next;
                  });
                }}
              >
                <IconFilters />
              </button>

              {appliedBoxes.length > 0 ? <div className={styles.filterBadge}>{appliedBoxes.length}</div> : null}
            </div>
          </div>

          {dateOpen ? (
            <div
              ref={datePopoverRef}
              className={styles.datePopover}
              style={
                datePos ? { top: datePos.top, left: datePos.left } : { visibility: "hidden", pointerEvents: "none" }
              }
            >
              <div className={styles.dateHead}>
                <button
                  type="button"
                  className={styles.dateNav}
                  onClick={() => {
                    setCursor((c) => {
                      const prev = new Date(c.y, c.m0 - 1, 1);
                      return { y: prev.getFullYear(), m0: prev.getMonth() };
                    });
                  }}
                  aria-label="Предыдущий месяц"
                >
                  ‹
                </button>
                <div className={styles.dateTitle}>{monthTitle(cursor.y, cursor.m0)}</div>
                <button
                  type="button"
                  className={styles.dateNav}
                  onClick={() => {
                    setCursor((c) => {
                      const next = new Date(c.y, c.m0 + 1, 1);
                      return { y: next.getFullYear(), m0: next.getMonth() };
                    });
                  }}
                  aria-label="Следующий месяц"
                >
                  ›
                </button>
              </div>

              <div className={styles.dateWeek}>
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((x) => (
                  <div key={x} className={styles.dateWeekDay}>
                    {x}
                  </div>
                ))}
              </div>

              <div className={styles.dateGrid}>
                {calendarRows.map((row, i) => (
                  <div key={i} className={styles.dateRow}>
                    {row.map((cell, j) => {
                      if (!cell) return <div key={j} className={styles.dateCell} />;

                      const iso = cell.iso;
                      const disabled = Boolean((minIso && iso < minIso) || (maxIso && iso > maxIso));
                      const isSelected = Boolean(selectedIso && iso === selectedIso);
                      const inRange = Boolean(fromIso && toIso) && iso >= fromIso! && iso <= toIso!;

                      return (
                        <button
                          key={j}
                          type="button"
                          className={[
                            styles.dateDay,
                            disabled ? styles.dateDayDisabled : "",
                            inRange ? styles.dateDayInRange : "",
                            isSelected ? styles.dateDaySelected : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          disabled={disabled}
                          onClick={() => {
                            if (dateOpen === "from") {
                              setFromIso(iso);
                              if (toIso && toIso < iso) setToIso(iso);
                              setDateOpen(null);
                              setDatePos(null);
                              return;
                            }

                            if (dateOpen === "to") {
                              if (fromIso && iso < fromIso) return;
                              setToIso(iso);
                              setDateOpen(null);
                              setDatePos(null);
                            }
                          }}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {filterOpen ? (
            <div
              ref={popoverRef}
              className={styles.filterPopover}
              style={
                popPos
                  ? { top: popPos.top, left: popPos.left }
                  : { visibility: "hidden", pointerEvents: "none" }
              }
            >
              <div className={styles.filterBody}>
                <div className={styles.filterLeft}>
                  <div className={`${styles.filterLeftItem} ${styles.filterLeftItemActive}`}>Постаматы</div>
                </div>

                <div className={styles.filterRight}>
                  <div className={styles.filterSearchRow}>
                    <input
                      className={styles.filterSearch}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      placeholder="Поиск по адресу или id"
                    />
                  </div>

                  <div className={styles.filterList}>
                    {boxesLoading ? <div className={styles.filterEmpty}>Загружаю…</div> : null}

                    {!boxesLoading &&
                      activeList.map((x) => {
                        const checked = draftBoxes.includes(x.id);
                        return (
                          <label key={x.id} className={styles.filterRow}>
                            <input type="checkbox" checked={checked} onChange={() => toggleBox(x.id)} />
                            <span className={styles.filterRowText}>
                              <span className={styles.filterRowMain}>
                                {x.label}
                              </span>
                              {x.sub ? <span className={styles.filterRowSub}>{x.id} · {x.sub}</span> : null}
                            </span>
                          </label>
                        );
                      })}

                    {!boxesLoading && activeList.length === 0 ? (
                      <div className={styles.filterEmpty}>Ничего не найдено</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={styles.filterActions}>
                <button type="button" className={`${styles.btnFilter}`} onClick={applyFilters}>
                  Применить
                </button>

                <button type="button" className={styles.filterReset} onClick={resetFilters}>
                  Сбросить
                </button>
              </div>
            </div>
          ) : null}

          {err ? (
            <div className={styles.error}>
              <div className={styles.errorText}>{err}</div>
            </div>
          ) : null}
        </div>
        {/* Card: Summary */}
        <div className={styles.card}>
          <div className={styles.cardHeadRow}>
            <div>
              <div className={styles.cardTitle}>Сводка аренд</div>
              <div className={styles.cardSubtitle}>
                {fromIso && toIso ? `${dmy(fromIso)}–${dmy(toIso)}` : "—"}
              </div>
            </div>

            {/* <div className={styles.bigMetric}>
              <div className={styles.bigMetricLabel}>К выводу</div>
              <div className={styles.bigMetricValue}></div>
            </div> */}
          </div>

          <div className={styles.metricsGrid}>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Аренд</div>
              <div className={styles.metricValue}>
                {financeTotals.orders}
              </div>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Сумма</div>
              <div className={styles.metricValue}>{money(financeTotals.sum)}</div>
            </div>

            <div className={`${styles.metricItem} ${styles.metricItemStrong}`}>
              <div className={styles.metricLabel}>Средний чек</div>
              <div className={styles.metricValue}>{money(avgCheck)}</div>
            </div>
                      
            
          </div>
        </div>
        {/* Card: Top */}
        <div className={styles.card}>
          <div className={styles.cardHeadRow}>
            <div>
              <div className={styles.cardTitle}>Топ товаров</div>
              <div className={styles.cardSubtitle}>
                {fromIso && toIso ? `${dmy(fromIso)}–${dmy(toIso)}` : "—"}
              </div>
            </div>
          </div>

          <div className={styles.metricsGrid}>
            
                      
            
          </div>
        </div>
        {/* Card: Trend */}
        <div className={`${styles.card} ${styles.cardMid}`}>
          <div className={styles.cardHeadRow}>
            <div>
              <div className={styles.cardTitle}>Динамика аренды</div>
              <div className={styles.cardSubtitle}>
                {seriesGroupBy === "week" ? "Сумма аренд по неделям" : "Сумма аренд по дням"}
              </div>
            </div>
          </div>

        <div className={styles.sparkWrap}>
          <div className={styles.sparkScroll}>
            <Bars series={trendSeries} minColWidth={10} />
            {trendSeries.length === 0 && !loading ? (
              <div style={{ fontSize: 12, color: "rgba(15, 23, 42, 0.6)", paddingTop: 6 }}>Нет данных</div>
            ) : null}
          </div>
        </div>          

          <div className={styles.sparkLegend}>
            <div className={styles.legendRow}>
              <span className={styles.legendText}>
                {fromIso && toIso ? `Период: ${dmy(fromIso)}–${dmy(toIso)}` : "Период: —"}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Table */}
        <div className={`${styles.cardWide}`}>
          <div className={styles.tableHeadRow}>
            <div>
              <div className={styles.cardTitle}>Детализация по боксам</div>
              <div className={styles.cardSubtitle}>
                {fromIso && toIso ? `${dmy(fromIso)}–${dmy(toIso)}` : "—"}
              </div>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Имя бокса</th>
                  <th className={`${styles.th} ${styles.right}`}>Количество аренд</th>
                  <th className={`${styles.th} ${styles.right}`}>Сумма</th>
                  <th className={`${styles.th} ${styles.right}`}>Средний чек</th>
                </tr>
              </thead>
              <tbody>
                {financeRows.map((r, i) => {
                  const avg = r.orders_count > 0 ? r.total_sum / r.orders_count : 0;
                  return (
                    <tr key={r.box_id ?? `box-${i}`} className={styles.tr}>
                      <td className={styles.td}>{r.box_name ?? "Без бокса"}</td>
                      <td className={`${styles.td} ${styles.right}`}>{r.orders_count}</td>
                      <td className={`${styles.td} ${styles.right}`}>{money(r.total_sum)}</td>
                      <td className={`${styles.td} ${styles.right}`}>{money(avg)}</td>
                    </tr>
                  );
                })}

                {financeRows.length === 0 && !loading && (
                  <tr className={styles.tr}>
                    <td className={styles.td} colSpan={4}>
                      Нет данных в выбранном диапазоне
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function IconFilters() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7" cy="5" r="2" fill="currentColor" />
      <circle cx="13" cy="10" r="2" fill="currentColor" />
      <circle cx="9" cy="15" r="2" fill="currentColor" />
    </svg>
  );
}

function Bars({
  series,
  minColWidth = 10,
}: {
  series: { label: string; range: string; value: number }[];
  minColWidth?: number;
}) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(false);
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, [series]);

  const data = useMemo(() => {
    const arr = (series || []).map((x) => ({
      label: x.label,
      range: x.range,
      value: Number.isFinite(x.value) ? x.value : 0,
    }));

    const max = Math.max(1, ...arr.map((x) => Math.abs(x.value)));
    return { arr, max };
  }, [series]);

  const minWidthPx = Math.max(1, data.arr.length) * minColWidth + Math.max(0, data.arr.length - 1) * 10;

  return (
    <div className={styles.barWrap} style={{ width: "100%", minWidth: `${minWidthPx}px` }}>
      {data.arr.map((x, i) => {
        const h = Math.max(2, Math.round((Math.abs(x.value) / data.max) * 100));
        return (
          <div key={`${x.range}_${i}`} className={styles.barCol} style={{ minWidth: minColWidth }}>
            <div
              className={styles.barTrack}
              onMouseEnter={(e) => {
                const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                setHover({
                  x: r.left + r.width / 2,
                  y: r.top,
                  text: `${x.range}\n${money(x.value)}`,
                });
              }}
              onMouseMove={(e) => {
                const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                setHover((prev) =>
                  prev
                    ? { ...prev, x: r.left + r.width / 2, y: r.top }
                    : { x: r.left + r.width / 2, y: r.top, text: `${x.range}\n${money(x.value)}` }
                );
              }}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={styles.barFill}
                style={{ height: `${animate ? h : 0}%`, transitionDelay: `${i * 40}ms` }}
              />
            </div>
            {/* <div className={styles.barLabel}>{x.label}</div> */}
          </div>
        );
      })}
      {hover && (
        <div className={styles.barTip} style={{ left: hover.x, top: hover.y }}>
          {hover.text.split("\n").map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
