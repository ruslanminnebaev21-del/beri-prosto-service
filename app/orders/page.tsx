// app/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../page.module.css";

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
  status: "paid" | "received" | string;
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
  if (status === "received") return "Получено";
  return status;
}

function rub(v: any) {
  const n = Number(v);
  return (Number.isFinite(n) ? n : 0).toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });
}

function dmy(iso: string | null | undefined) {
  if (!iso) return "—";

  const s = String(iso).trim();
  if (!s) return "—";

  // есть ли явная таймзона в конце (Z или +03:00 / +0300)
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);

  // приводим "YYYY-MM-DD HH:mm:ss(.sss)" -> "YYYY-MM-DDTHH:mm:ss(.sss)"
  let normalized = s.includes(" ") ? s.replace(" ", "T") : s;

  // если это просто дата "YYYY-MM-DD" — добавим полночь
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}T00:00:00`;
  }

  // если таймзоны нет — считаем что это UTC и добавляем Z
  if (!hasTz) normalized = `${normalized}Z`;

  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return String(iso);

  return d.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function refundDateMs(iso: string | null | undefined) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const s = String(iso).trim();
  if (!s) return Number.POSITIVE_INFINITY;
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  let normalized = s.includes(" ") ? s.replace(" ", "T") : s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}T00:00:00`;
  }
  if (!hasTz) normalized = `${normalized}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? Number.POSITIVE_INFINITY : d.getTime();
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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Order[]>([]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const r = await fetch("/api/orders", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await r.json().catch(() => null)) as OrdersResp | null;

      if (!r.ok || !json || !("ok" in json) || !json.ok) {
        setErr((json as any)?.error || `HTTP ${r.status}`);
        setRows([]);
        return;
      }

      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Ошибка запроса");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const countLabel = useMemo(() => {
    const n = rows.length;
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
  }, [rows.length]);

  const sortedRows = useMemo(() => {
    const rank = (s: string) => (s === "paid" ? 0 : s === "received" ? 1 : 2);
    return [...rows].sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return refundDateMs(a.refund_date) - refundDateMs(b.refund_date);
    });
  }, [rows]);

  return (
    <>
      {/* <header className={styles.header} /> */}

      <section className={styles.content}>
        {/* <h1 className={styles.title}>Аренды</h1> */}
        <div className={styles.titleOrders}>
          <span>Текущие аренды</span>
          <span>{loading ? "Загружаю…" : countLabel}</span>
        </div>

        {err && (
          <div className={styles.error}>
            <div className={styles.errorTitle}>Не получилось получить заказы</div>
            <div className={styles.errorText}>{err}</div>
          </div>
        )}

        {!err && !loading && rows.length === 0 && (
          <div className={styles.empty}>Пока заказов нет.</div>
        )}

        <div className={styles.grid}>
          {sortedRows.map((o) => (
            <article key={o.id} className={styles.cardOrders}>
              {/* header */}
              <div className={styles.orderHead}>
                <div className={styles.orderHeadLeft}>
                  <div className={styles.orderTitle}>{o.product?.name || "—"}</div>
                  <span className={styles.orderCell}>
                    {o.product?.model_name ? `${o.product.model_name} · ` : ""}
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
                  <span className={styles.orderFooterText}>ID: {o.id}</span>
                </div>
                <span className={styles.orderStatus}>{statusLabel(o.status)}</span>
              </div>
            </article>
          ))}
        </div>

        <button type="button" className={styles.btn} onClick={load} disabled={loading}>
          Обновить
        </button>
      </section>

      {loading && (
        <div className={styles.loadingLine}>
          <div className={styles.loadingDot} />
          <div className={styles.loadingDot} />
          <div className={styles.loadingDot} />
        </div>
      )}
    </>
  );
}
