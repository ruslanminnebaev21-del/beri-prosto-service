// app/boxes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../../page.module.css";

type Machine = {
  id: string; // PST_0702
  online: boolean;
  totalCells: number;
  vacant: number;
  occupied: number;
  other: number;
  openNow: number;
  backlightOn: number;
  title: string; // имя из БД
};

type CellUi = {
  num: string; // "1" | "S" и т.п.
  pin: string; // "1234#" (или просто "1234")
};

export default function AllBoxesPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectOpen, setSelectOpen] = useState(false);

  // cells block
  const [selectedId, setSelectedId] = useState<string>("");
  const [cellsLoading, setCellsLoading] = useState(false);
  const [cellsErr, setCellsErr] = useState<string | null>(null);
  const [cells, setCells] = useState<CellUi[]>([]);

  const fetchMachines = async (alive?: { current: boolean }) => {
    try {
      setLoading(true);
      setErr(null);

      const r = await fetch("/api/boxesName", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = await r.json().catch(() => null);
      if (alive && !alive.current) return;

      if (!r.ok || !json?.ok) {
        setErr(json?.error || `HTTP ${r.status}`);
        setMachines([]);
        return;
      }

      const list = Array.isArray(json.boxes) ? (json.boxes as Machine[]) : [];
      setMachines(list);

      // если ничего не выбрано, но список пришел — выберем первый
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (e: any) {
      if (alive && !alive.current) return;
      setErr(e?.message ? String(e.message) : "Ошибка запроса");
      setMachines([]);
    } finally {
      if (alive && !alive.current) return;
      setLoading(false);
    }
  };

  // ВАЖНО: этот эндпоинт должен существовать.
  // Ожидаемый формат ответа:
  // { ok: true, cells: Array<{ num: string, pin: string }> }
  //
  // Пример: GET /api/esi/getMachineCells?machineId=PST_0702
  const fetchCells = async (machineId: string, alive?: { current: boolean }) => {
    if (!machineId) {
      setCells([]);
      return;
    }

    try {
      setCellsLoading(true);
      setCellsErr(null);

      const r = await fetch(`/api/esi/getMachineCells?machineId=${encodeURIComponent(machineId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = await r.json().catch(() => null);
      if (alive && !alive.current) return;

      if (!r.ok || !json?.ok) {
        setCellsErr(json?.error || `HTTP ${r.status}`);
        setCells([]);
        return;
      }

      const list = Array.isArray(json.cells) ? (json.cells as CellUi[]) : [];
      setCells(list);
    } catch (e: any) {
      if (alive && !alive.current) return;
      setCellsErr(e?.message ? String(e.message) : "Ошибка запроса");
      setCells([]);
    } finally {
      if (alive && !alive.current) return;
      setCellsLoading(false);
    }
  };

  useEffect(() => {
    const alive = { current: true };
    fetchMachines(alive);
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const alive = { current: true };
    fetchCells(selectedId, alive);
    return () => {
      alive.current = false;
    };
  }, [selectedId]);

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
    <>
      <header className={styles.header} />

      {/* ===== Постаматы ===== */}
      <section className={styles.content}>
        <h1 className={styles.title}>Постаматы</h1>
        {/* <div className={styles.sub}>{loading ? "Загружаю…" : countLabel}</div> */}

        {err && (
          <div className={styles.error}>
            <div className={styles.errorTitle}>Не получилось получить список</div>
            <div className={styles.errorText}>{err}</div>
          </div>
        )}

        {!err && !loading && machines.length === 0 && (
          <div className={styles.empty}>Пока пусто.</div>
        )}

        <div className={styles.grid}>
          {machines.map((m) => (
            <article key={m.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>
                  <div className={styles.cardName}>{m.title}</div>
                  <div className={styles.cardSub}>{m.id}</div>
                </div>

                <div className={m.online ? styles.badgeOk : styles.badgeOff}>
                  {m.online ? "online" : "offline"}
                </div>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className={styles.btn}
          onClick={() => fetchMachines()}
          disabled={loading}
        >
          Обновить
        </button>
      </section>

      {/* ===== Ячейки ===== */}
      <section className={styles.content}>
        <h1 className={styles.title}>Ячейки</h1>

        {/* Ошибка именно по ячейкам (отдельно от списка постаматов) */}
        {cellsErr && (
          <div className={styles.error}>
            <div className={styles.errorTitle}>Не получилось получить ячейки</div>
            <div className={styles.errorText}>{cellsErr}</div>
          </div>
        )}

        <div
          className={styles.selectWrap}
          tabIndex={-1}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setSelectOpen(false);
            }
          }}
        >
          <button
            type="button"
            className={styles.select}
            onClick={() => setSelectOpen((v) => !v)}
            disabled={loading || machines.length === 0}
            aria-haspopup="listbox"
            aria-expanded={selectOpen}
          >
            {selectedId
              ? machines.find((m) => m.id === selectedId)?.title
              : "Выбрать постамат"}
            {selectedId ? (
              <span className={styles.selectSub}>
                {machines.find((m) => m.id === selectedId)?.id}
              </span>
            ) : null}
          </button>

          {selectOpen && machines.length > 0 && (
            <div className={styles.selectList} role="listbox">
              {machines.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={styles.selectOption}
                  role="option"
                  aria-selected={m.id === selectedId}
                  onClick={() => {
                    setSelectedId(m.id);
                    setSelectOpen(false);
                  }}
                >
                  <span className={styles.selectOptionTitle}>{m.title}</span>
                  <span className={styles.selectOptionSub}>{m.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className={styles.btn} disabled>
          Открыть все ячейки
        </button>

        <div className={styles.cellsList}>
          {cellsLoading ? (
            <div className={styles.empty}>Загружаю ячейки…</div>
          ) : selectedId && cells.length === 0 ? (
            <div className={styles.empty}>Ячеек не найдено.</div>
          ) : (
            cells.map((c) => (
              <div key={c.num} className={styles.cellRow}>
                <div className={styles.cellLeft}>
                  <div className={styles.cellNo}>№{c.num}</div>
                  <div className={styles.cellPin}>{c.pin ? `${c.pin}#` : "—"}</div>
                </div>

                <div className={styles.cellBtns}>
                  <button type="button" className={`${styles.btn} ${styles.btnService}`} disabled>
                    open
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnService}`} disabled>
                    on
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnService}`} disabled>
                    off
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {(loading || cellsLoading) && (
        <div className={styles.loadingLine}>
          <div className={styles.loadingDot} />
          <div className={styles.loadingDot} />
          <div className={styles.loadingDot} />
        </div>
      )}
    </>
  );
}
