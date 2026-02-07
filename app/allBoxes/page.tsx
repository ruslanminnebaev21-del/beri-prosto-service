// app/allBoxes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../page.module.css";

type Machine = {
  id: string;
  online: boolean;
  totalCells: number;
  vacant: number;
  occupied: number;
  other: number;
  openNow: number;
  backlightOn: number;
};

export default function AllBoxesPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch("/api/esi/allBoxes", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const json = await r.json().catch(() => null);
        if (!alive) return;

        if (!r.ok || !json?.ok) {
          setErr(json?.error || `HTTP ${r.status}`);
          setMachines([]);
          return;
        }

        setMachines(Array.isArray(json.machines) ? json.machines : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ? String(e.message) : "Ошибка запроса");
        setMachines([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const countLabel = useMemo(() => {
    const n = machines.length;
    const last = n % 10;
    const last2 = n % 100;
    const word =
      last2 >= 11 && last2 <= 14
        ? "постаматов"
        : last === 1
          ? "постамат"
          : last >= 2 && last <= 4
            ? "постамата"
            : "постаматов";
    return `${n} ${word}`;
  }, [machines.length]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Постаматы</h1>
        <div className={styles.sub}>{loading ? "Загружаю…" : countLabel}</div>
      </header>

      {err && (
        <div className={styles.error}>
          <div className={styles.errorTitle}>Не получилось получить список</div>
          <div className={styles.errorText}>{err}</div>
        </div>
      )}

      {!err && !loading && machines.length === 0 && (
        <div className={styles.empty}>Пока пусто.</div>
      )}

      <section className={styles.grid}>
        {machines.map((m) => (
          <article key={m.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.cardTitle}>{m.id}</div>
              <div className={m.online ? styles.badgeOk : styles.badgeOff}>
                {m.online ? "online" : "offline"}
              </div>
            </div>

            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Всего ячеек</div>
                <div className={styles.kpiValue}>{m.totalCells}</div>
              </div>

              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Свободно</div>
                <div className={styles.kpiValue}>{m.vacant}</div>
              </div>

              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Занято</div>
                <div className={styles.kpiValue}>{m.occupied}</div>
              </div>

              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Открыто сейчас</div>
                <div className={styles.kpiValue}>{m.openNow}</div>
              </div>
            </div>

            {(m.other > 0 || m.backlightOn > 0) && (
              <div className={styles.meta}>
                {m.other > 0 ? (
                  <span className={styles.metaChip}>прочее: {m.other}</span>
                ) : null}
                {m.backlightOn > 0 ? (
                  <span className={styles.metaChip}>подсветка: {m.backlightOn}</span>
                ) : null}
              </div>
            )}
          </article>
        ))}
      </section>

      {loading && (
        <div className={styles.loadingLine}>
          <div className={styles.loadingDot} />
          <div className={styles.loadingDot} />
          <div className={styles.loadingDot} />
        </div>
      )}
    </main>
  );
}