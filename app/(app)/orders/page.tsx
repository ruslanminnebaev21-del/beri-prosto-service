// app/orders/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../../page.module.css";
import { useGlobalLoader } from "../../components/GlobalLoaderProvider";

type User = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

type Product = {
  id: number;
  name: string | null;
  model_name: string | null;
};
type Box = {
  id: number;
  name: string | null;
};

type Order = {
  id: string;
  user_id: number;
  product_id: number;
  receiving_code: string | null;
  return_code: string | null;
  cell_id: string | null;
  total_price: number | null;
  days: number | null;
  status: "paid" | "pending_review" | "received" | "returned" | string;
  refund_date: string | null;
  paid_at: string | null;

  user: User;
  product: Product;
  box?: Box | null;
};

type OrdersResp =
  | { ok: true; rows: Order[] }
  | { ok: false; error: string };

function statusLabel(status: string) {
  if (status === "paid") return "Оплачено";
  if (status === "pending_review") return "На проверке";
  if (status === "received") return "Получено";
  if (status === "returned") return "Возвращено";
  return status;
}

function rentalsCountLabel(n: number) {
  const last = n % 10;
  const last2 = n % 100;
  const word =
    last2 >= 11 && last2 <= 14
      ? "аренд"
      : last === 1
        ? "аренда"
        : last >= 2 && last <= 4
          ? "аренды"
          : "аренд";
  return `${n} ${word}`;
}

function rub(v: unknown) {
  const n = Number(v);
  return (Number.isFinite(n) ? n : 0).toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });
}

function dmy(iso: string | null | undefined) {
  const d = parseIsoDate(iso);
  if (!d) return iso ? String(iso) : "—";

  return d.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseIsoDate(iso: string | null | undefined) {
  if (!iso) return null;
  const s = String(iso).trim();
  if (!s) return null;
  let normalized = s.includes(" ") ? s.replace(" ", "T") : s;
  const hasShortTz = /[+-]\d{2}$/.test(normalized);
  if (hasShortTz) normalized = `${normalized}:00`;
  const hasTz = /([zZ]|[+-]\d{2}(?::?\d{2})?)$/.test(normalized);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}T00:00:00`;
  }
  if (!hasTz) normalized = `${normalized}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

const moscowDateKeyFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function moscowDateKey(d: Date) {
  const parts = moscowDateKeyFmt.formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? NaN);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? NaN);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? NaN);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return Number.POSITIVE_INFINITY;
  }
  return year * 10000 + month * 100 + day;
}

function refundBorderState(iso: string | null | undefined) {
  const d = parseIsoDate(iso);
  if (!d) return null;

  const endDateKey = moscowDateKey(d);
  const todayKey = moscowDateKey(new Date());

  if (endDateKey < todayKey) return "expired";
  if (endDateKey === todayKey) return "today";
  return null;
}

function refundDateMs(iso: string | null | undefined) {
  const d = parseIsoDate(iso);
  return d ? d.getTime() : Number.POSITIVE_INFINITY;
}

function userName(u: User) {
  const a = String(u.first_name || "").trim();
  const b = String(u.last_name || "").trim();
  const n = [a, b].filter(Boolean).join(" ");
  return n || `user #${u.id}`;
}

function formatRuPhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  let d = digits;
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) {
    d = d.slice(1);
  }
  if (d.length !== 10) return String(value);
  return `+7(${d.slice(0, 3)})${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}

export default function OrdersPage() {
  const gl = useGlobalLoader();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Order[]>([]);

  const load = useCallback(async () => {
    return gl.track(async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch("/api/orders", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const json = (await r.json().catch(() => null)) as OrdersResp | null;

        if (!r.ok || !json) {
          setErr(`HTTP ${r.status}`);
          setRows([]);
          return;
        }

        if (!json.ok) {
          setErr(json.error);
          setRows([]);
          return;
        }

        setRows(Array.isArray(json.rows) ? json.rows : []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : null;
        setErr(msg ? String(msg) : "Ошибка запроса");
        setRows([]);
      } finally {
        setLoading(false);
      }
    });
  }, [gl]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedRows = useMemo(() => {
    const rank = (s: string) => (s === "paid" ? 0 : s === "received" ? 1 : 2);
    return [...rows].sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return refundDateMs(a.refund_date) - refundDateMs(b.refund_date);
    });
  }, [rows]);

  const activeOrders = useMemo(
    () => sortedRows.filter((o) => o.status !== "returned"),
    [sortedRows],
  );
  const completedOrders = useMemo(() => {
    return sortedRows
      .filter((o) => o.status === "returned")
      .sort((a, b) => refundDateMs(b.refund_date) - refundDateMs(a.refund_date));
  }, [sortedRows]);

  const copyOrderId = useCallback(async (id: string) => {
    const value = String(id || "").trim();
    if (!value) return;

    try {
      if (navigator?.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
      }
    } catch {
      // fallback below
    }

    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // noop
    }
  }, []);

  const renderOrders = (orders: Order[], highlightDeadlines = false) => (
    <div className={styles.grid}>
      {orders.map((o) => {
        const borderState = highlightDeadlines ? refundBorderState(o.refund_date) : null;
        const cardClass = [
          styles.cardOrders,
          borderState === "today" ? styles.cardOrdersDueToday : "",
          borderState === "expired" ? styles.cardOrdersExpired : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <article key={o.id} className={cardClass}>
            {/* header */}
            <div className={styles.orderHead}>
              <div className={styles.orderHeadLeft}>
                <div className={styles.orderTitle}>{o.product?.name || "—"}</div>
                <span className={styles.orderCell}>
                  {o.product?.model_name ? `${o.product.model_name}` : ""}
                </span>
              </div>

              <div className={styles.orderHeadRight}>
                <div className={styles.orderPrice}>{rub(o.total_price)}</div>
              </div>
            </div>

            {/* rent params */}
            <div className={styles.orderGrid}>
              <div className={styles.orderKpi}>
                <div className={styles.orderKpiLabel}>Дней</div>
                <div className={styles.orderKpiValue}>{o.days ?? "—"}</div>
              </div>

              <div className={styles.orderKpi}>
                <div className={styles.orderKpiLabel}>Начало</div>
                <div className={styles.orderKpiValue}>{dmy(o.paid_at)}</div>
              </div>

              <div className={styles.orderKpi}>
                <div className={styles.orderKpiLabel}>Конец</div>
                <div className={styles.orderKpiValue}>{dmy(o.refund_date)}</div>
              </div>
            </div>

            {/* codes */}
            <div className={styles.orderCodes}>
              <div className={styles.orderCodeRow}>
                <div className={styles.orderCodeLabel}>Код получения</div>
                <div className={styles.orderCodeValue}>{o.receiving_code ?? "—"}</div>
              </div>

              <div className={styles.orderCodeRow}>
                <div className={styles.orderCodeLabel}>Код возврата</div>
                <div className={styles.orderCodeValue}>{o.return_code ?? "—"}</div>
              </div>
            </div>

            {/* user */}
            <div className={styles.orderUser}>
              <div className={styles.orderUserName}>{userName(o.user)}</div>

              <div className={styles.orderUserContacts}>
                {o.user?.phone ? (
                  <a className={styles.orderLink} href={`tel:${formatRuPhone(o.user.phone)}`}>
                    {formatRuPhone(o.user.phone)}
                  </a>
                ) : (
                  <span className={styles.orderMuted}>телефон: —</span>
                )}

                {o.user?.email ? (
                  <span className={styles.orderMuted}>{o.user.email}</span>
                ) : (
                  <span className={styles.orderMuted}>email: —</span>
                )}
              </div>
            </div>

            {/* footer */}
            <div className={styles.orderFooter}>
              <div className={styles.orderFooterText}>
                <span className={styles.orderFooterText}>
                  {o.box?.name ? `${o.box.name} · ` : ""}
                  ячейка {o.cell_id ?? "—"}
                </span>
                <button
                  type="button"
                  className={styles.orderIdCopy}
                  onClick={() => void copyOrderId(o.id)}
                  title="Скопировать ID"
                  aria-label={`Скопировать ID ${o.id}`}
                >
                  ID: {o.id}
                </button>
              </div>
              <span className={styles.orderStatus}>{statusLabel(o.status)}</span>
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <>
      {err && (
        <section className={styles.content}>
          <div className={styles.error}>
            <div className={styles.errorTitle}>Не получилось получить заказы</div>
            <div className={styles.errorText}>{err}</div>
          </div>
        </section>
      )}

      {!err && (
        <>
          <section className={styles.content}>
            <div className={styles.titleOrders}>
              <span>Текущие аренды</span>
              <span>{loading ? "Загружаю…" : rentalsCountLabel(activeOrders.length)}</span>
            </div>

            {!loading && activeOrders.length === 0 && (
              <div className={styles.empty}>Нет текущих аренд.</div>
            )}
            {activeOrders.length > 0 && renderOrders(activeOrders, true)}
          </section>

          <section className={styles.content}>
            <div className={styles.titleOrders}>
              <span>Завершенные</span>
              <span>{loading ? "Загружаю…" : rentalsCountLabel(completedOrders.length)}</span>
            </div>

            {!loading && completedOrders.length === 0 && (
              <div className={styles.empty}>Нет завершенных аренд.</div>
            )}
            {completedOrders.length > 0 && renderOrders(completedOrders)}
          </section>
        </>
      )}
    </>
  );
}
