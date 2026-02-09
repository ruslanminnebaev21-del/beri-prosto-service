// app/components/CostEditor/CostEditor.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./CostEditor.module.css";

type FilterItem = { id: string; label: string; sub?: string };

export type CostHistoryRow = {
  valid_from: string; // UI: DD.MM.YYYY
  cost: number;
};

type CostEditorProps = {
  cabinetId: number;
  selectedArticles: FilterItem[];

  loadCostHistory?: (args: { cabinetId: number; nmId: number }) => Promise<CostHistoryRow[]>;
  saveCostHistory?: (args: { cabinetId: number; nmId: number; rows: { valid_from: string; cost: number }[] }) => Promise<void>;

  initialNmId?: number | null;
  onChanged?: () => void;
};

type ProductMini = {
  nm_id: number;
  title?: string | null;
  vendor_code?: string | null;
  photo_url?: string | null;
};

function parseNmId(articleId: string): number | null {
  if (!articleId?.startsWith("art:")) return null;
  const parts = String(articleId).split(":");
  const nm = Number(parts[3]);
  return Number.isFinite(nm) && nm > 0 ? nm : null;
}

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isDMY(s: string) {
  return /^\d{2}\.\d{2}\.\d{4}$/.test(s);
}

function ymdToDmy(v: string) {
  const s = String(v || "").trim();
  if (!s) return "";

  // если прилетело ISO, берем первые 10 символов: YYYY-MM-DD
  const ymd = s.length >= 10 ? s.slice(0, 10) : s;

  if (!isYMD(ymd)) return s;
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

function dmyToYmd(dmy: string) {
  if (!isDMY(dmy)) return null;
  const [d, m, y] = dmy.split(".");
  return `${y}-${m}-${d}`;
}

function isValidDmyStrict(dmy: string) {
  if (!isDMY(dmy)) return false;

  const [ddS, mmS, yyS] = dmy.split(".");
  const dd = Number(ddS);
  const mm = Number(mmS);
  const yy = Number(yyS);

  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yy)) return false;
  if (yy < 1900 || yy > 2100) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;

  const dt = new Date(yy, mm - 1, dd);
  return dt.getFullYear() === yy && dt.getMonth() === mm - 1 && dt.getDate() === dd;
}

function formatDmyInput(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 8); // DDMMYYYY
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yy = digits.slice(4, 8);

  let out = dd;
  if (mm) out += "." + mm;
  if (yy) out += "." + yy;
  return out;
}

function toNum(v: any) {
  // оставим запятую для RU ввода
  const s = String(v ?? "").replace(",", ".");
  const x = Number(s);
  return Number.isFinite(x) ? x : 0;
}
function rub(v: any) {
  const n = Number(v);
  return (Number.isFinite(n) ? n : 0).toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  });
}

function sortRows(rows: CostHistoryRow[]) {
  // сортируем по DMY через YMD, чтобы корректно по датам
  return [...rows].sort((a, b) => {
    const ay = dmyToYmd(String(a.valid_from || "").trim()) || "";
    const by = dmyToYmd(String(b.valid_from || "").trim()) || "";
    return ay.localeCompare(by);
  });
}

async function fetchProductMini(cabinetId: number, nmId: number): Promise<ProductMini | null> {
  if (!cabinetId || !nmId) return null;

  const tryUrls = [
    `/api/products?cabinetId=${encodeURIComponent(String(cabinetId))}&nmIds=${encodeURIComponent(String(nmId))}`,
    `/api/products?cabinetId=${encodeURIComponent(String(cabinetId))}`,
  ];

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) continue;

      const rows = Array.isArray(json?.rows)
        ? json.rows
        : Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : [];

      const mapped: ProductMini[] = (rows || [])
        .map((x: any) => {
          const nm = Number(x?.nm_id ?? x?.nmId ?? x?.nmID ?? x?.nm);
          if (!Number.isFinite(nm) || nm <= 0) return null;

          const title = x?.title ?? x?.name ?? x?.product_name ?? x?.nm_name ?? null;
          const vendorCode = x?.vendor_code ?? x?.vendorCode ?? x?.article ?? null;
          const photoUrl = x?.photo_url ?? x?.photoUrl ?? x?.img ?? x?.image ?? x?.image_url ?? null;

          return { nm_id: nm, title, vendor_code: vendorCode, photo_url: photoUrl };
        })
        .filter(Boolean) as ProductMini[];

      const found = mapped.find((p) => p.nm_id === nmId);
      if (found) return found;
    } catch {}
  }

  return null;
}

export default function CostEditor({
  cabinetId,
  selectedArticles,
  loadCostHistory,
  saveCostHistory,
  initialNmId = null,
  onChanged,
}: CostEditorProps) {
  const options = useMemo(() => {
    return (selectedArticles || [])
      .map((a) => {
        const nmId = parseNmId(a.id);
        if (!nmId) return null;
        return { nmId, id: a.id, label: a.label };
      })
      .filter(Boolean) as Array<{ nmId: number; id: string; label: string }>;
  }, [selectedArticles]);

  const [activeNmId, setActiveNmId] = useState<number | null>(initialNmId ?? options[0]?.nmId ?? null);

  const [product, setProduct] = useState<ProductMini | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  const [rows, setRows] = useState<CostHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [firstReportDateFrom, setFirstReportDateFrom] = useState<string | null>(null);
  const [loadingFirstReport, setLoadingFirstReport] = useState(false);
  const [firstReportErr, setFirstReportErr] = useState<string | null>(null);

  // новая схема: одна строка ввода
  const [formDate, setFormDate] = useState<string>("");
  const [formCost, setFormCost] = useState<string>("");
  const [formTouched, setFormTouched] = useState(false);

  // дефолтные функции API (если пропсы не передали)
  const apiLoad = useCallback(async ({ cabinetId, nmId }: { cabinetId: number; nmId: number }) => {
    const res = await fetch(
      `/api/products/cost?cabinetId=${encodeURIComponent(String(cabinetId))}&nmId=${encodeURIComponent(String(nmId))}`,
      { cache: "no-store" }
    );
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "API error");

    const list = Array.isArray(json?.rows) ? json.rows : [];
    return list.map((r: any) => ({
      valid_from: String(r?.valid_from || ""), // ожидаем YYYY-MM-DD
      cost: toNum(r?.cost),
    })) as { valid_from: string; cost: number }[];
  }, []);

  const apiSave = useCallback(
    async ({ cabinetId, nmId, rows }: { cabinetId: number; nmId: number; rows: { valid_from: string; cost: number }[] }) => {
      const res = await fetch(`/api/products/cost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cabinetId, nmId, rows }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "API error");
      return json;
    },
    []
  );
  const loadFirstReport = useCallback(async (cabId: number, nmId: number) => {
    setFirstReportErr(null);
    setLoadingFirstReport(true);
    try {
      const url =
        `/api/products/first-report?cabinetId=${encodeURIComponent(String(cabId))}&nmId=${encodeURIComponent(String(nmId))}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok) throw new Error(json?.error || "API error");

      const ymd = json?.dateFrom ? String(json.dateFrom) : null;
      setFirstReportDateFrom(ymd ? ymdToDmy(ymd) : null);
    } catch (e: any) {
      setFirstReportDateFrom(null);
      setFirstReportErr(String(e?.message || e));
    } finally {
      setLoadingFirstReport(false);
    }
  }, []);  

  const loadFn = loadCostHistory ?? apiLoad;
  const saveFn = saveCostHistory ?? apiSave;

  // если initialNmId меняется, подхватываем
  useEffect(() => {
    if (initialNmId && initialNmId !== activeNmId) setActiveNmId(initialNmId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNmId]);

  // если список выбранных артикулов изменился и активный уже не существует
  useEffect(() => {
    if (!options.length) {
      setActiveNmId(null);
      setRows([]);
      setErr(null);
      setProduct(null);
      setFormDate("");
      setFormCost("");
      setFormTouched(false);
      return;
    }

    if (activeNmId && options.some((o) => o.nmId === activeNmId)) return;

    setActiveNmId(options[0].nmId);
  }, [options, activeNmId]);

  // карточка товара
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!activeNmId) {
        setProduct(null);
        return;
      }

      try {
        setLoadingProduct(true);
        const p = await fetchProductMini(cabinetId, activeNmId);
        if (!alive) return;
        setProduct(p);
      } finally {
        if (!alive) return;
        setLoadingProduct(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [cabinetId, activeNmId]);

  // история себестоимости
  const reloadHistory = useCallback(async () => {
    if (!activeNmId) return;

    setErr(null);
    setLoading(true);
    try {
      const data = await loadFn({ cabinetId, nmId: activeNmId });

      setRows(
        sortRows(
          (Array.isArray(data) ? data : []).map((r: any) => ({
            valid_from: ymdToDmy(String(r.valid_from || "")),
            cost: toNum(r.cost),
          }))
        )
      );
    } catch (e: any) {
      setErr(String(e?.message || e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeNmId, cabinetId, loadFn]);

  useEffect(() => {
    reloadHistory();
    if (activeNmId) loadFirstReport(cabinetId, activeNmId);
    // при смене товара чистим форму (и фокус/валидацию)
    setFormDate("");
    setFormCost("");
    setFormTouched(false);
  }, [reloadHistory, loadFirstReport, cabinetId, activeNmId]);

  const activeLabel = useMemo(() => {
    if (!activeNmId) return "";
    const opt = options.find((o) => o.nmId === activeNmId);
    return opt?.label || `Арт WB ${activeNmId}`;
  }, [options, activeNmId]);

  const title = (product?.title || activeLabel || "").toString();
  const vendorCode = product?.vendor_code ? String(product.vendor_code) : null;
  const photoUrl = product?.photo_url ? String(product.photo_url) : null;

  // валидация формы добавления
  const formValidation = useMemo(() => {
    if (!activeNmId) return { ok: false, msg: "Нет товара" };

    const dmy = String(formDate || "").trim();
    if (!dmy) return { ok: false, msg: "Заполни дату" };
    if (!isValidDmyStrict(dmy)) return { ok: false, msg: "Дата должна быть ДД.ММ.ГГГГ и существовать" };

    const cost = toNum(formCost);
    // разрешим пустую стоимость как 0? лучше требовать
    if (String(formCost ?? "").trim() === "") return { ok: false, msg: "Заполни себестоимость" };
    if (!Number.isFinite(cost) || cost < 0) return { ok: false, msg: "Себестоимость должна быть числом >= 0" };

    return { ok: true, msg: "" };
  }, [activeNmId, formDate, formCost]);

  const formDateError = useMemo(() => {
    if (!formTouched) return false;
    const dmy = String(formDate || "").trim();
    if (!dmy) return true;
    return !isValidDmyStrict(dmy);
  }, [formDate, formTouched]);

  const formCostError = useMemo(() => {
    if (!formTouched) return false;
    const t = String(formCost ?? "").trim();
    if (!t) return true;
    const cost = toNum(formCost);
    return !Number.isFinite(cost) || cost < 0;
  }, [formCost, formTouched]);

  async function onAdd() {
    if (!activeNmId) return;

    setFormTouched(true);

    if (!formValidation.ok) {
      setErr(formValidation.msg);
      return;
    }

    try {
      setErr(null);
      setSaving(true);

      const dmy = String(formDate || "").trim();
      const ymd = dmyToYmd(dmy);
      const cost = toNum(formCost);

      if (!ymd || !isYMD(ymd)) throw new Error("Дата должна быть ДД.ММ.ГГГГ");

      // локально обновим историю (upsert по дате)
      setRows((prev) => {
        const next = [...prev];
        const idx = next.findIndex((x) => String(x.valid_from).trim() === dmy);
        if (idx >= 0) next[idx] = { ...next[idx], cost };
        else next.push({ valid_from: dmy, cost });
        return sortRows(next);
      });

      // отправляем одной записью (а не всем списком)
      await saveFn({ cabinetId, nmId: activeNmId, rows: [{ valid_from: ymd, cost }] });
      onChanged?.();
      // перезагрузим из API, чтобы совпасть с БД
      await reloadHistory();

      // очистим форму
      setFormDate("");
      setFormCost("");
      setFormTouched(false);
    } catch (e: any) {
      setErr(String(e?.message || e));
      // если ошибка — тоже лучше перезагрузить (чтобы UI не врал)
      await reloadHistory().catch(() => {});
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(validFromDmy: string) {
    if (!activeNmId) return;

    const ymd = dmyToYmd(validFromDmy);
    if (!ymd) return;

    try {
      setSaving(true);
      setErr(null);

      await fetch("/api/products/cost", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabinetId,
          nmId: activeNmId,
          valid_from: ymd,
        }),
      });

      onChanged?.();
      await reloadHistory();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {!options.length ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Сначала выбери артикулы в фильтрах</div>
          <div className={styles.emptySub}>Тут появится редактор себестоимости.</div>
        </div>
      ) : (
        <>
          <div className={styles.headerTop}>
            <div className={styles.headerTitle}>Себестоимость</div>
            <div className={styles.headerSub}>Себестоимость действует с установленной даты до новой себестоимости</div>
          </div>

          <div className={styles.productRow}>
            <div className={styles.productImgWrap} aria-hidden>
              {photoUrl ? <img className={styles.productImg} src={photoUrl} alt="" /> : <div className={styles.productImgPh} />}
              {loadingProduct && <div className={styles.productImgLoading} />}
            </div>

            <div className={styles.productText}>
              <div className={styles.productName}>{title}</div>
              <div className={styles.productCodes}>
                {vendorCode ? `Арт: ${vendorCode}` : "Арт: —"}
                {" · "}
                {activeNmId ? `Арт WB ${activeNmId}` : ""}
              </div>
            </div>
          </div>

          {err && <div className={styles.err}>{err}</div>}

          {/* ===== New input row (single) ===== */}
          <div className={styles.table}>
            <div className={`${styles.tr} ${styles.trHead}`}>
              <div className={styles.th}>Дата</div>
              <div className={styles.th}>Себестоимость</div>
              <div className={styles.th} />
            </div>

            <div className={styles.tr}>
              <div className={styles.td}>
                <input
                  className={[styles.input, formDateError ? styles.inputError : ""].filter(Boolean).join(" ")}
                  value={formDate}
                  placeholder="ДД.ММ.ГГГГ"
                  inputMode="numeric"
                  onChange={(e) => {
                    setFormTouched(true);
                    setFormDate(formatDmyInput(e.target.value));
                  }}
                  disabled={saving}
                />
              </div>

              <div className={styles.td}>
                <input
                  className={[styles.input, formCostError ? styles.inputError : ""].filter(Boolean).join(" ")}
                  value={formCost}
                  placeholder="0"
                  inputMode="decimal"
                  onChange={(e) => {
                    setFormTouched(true);
                    setFormCost(e.target.value);
                  }}
                  disabled={saving}
                />
              </div>

              <div className={`${styles.td} ${styles.tdRight}`}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={onAdd}
                  disabled={saving || !activeNmId}
                  title={!formValidation.ok ? formValidation.msg : undefined}
                >
                  {saving ? "Добавляю…" : "Добавить"}
                </button>
              </div>
            </div>
          </div>

          {/* ===== History list (hint) ===== */}
          <div className={styles.historyCost}>
            <span className={styles.historyTitle}>
              История изменения себестоимости
            </span>
            <div className={styles.hint}>
              {loading ? (
                "Загружаю историю…"
              ) : rows.length ? (
                <>
                  {" "}
                  {rows
                    .slice()
                    .sort((a, b) => {
                      const ay = dmyToYmd(String(a.valid_from).trim()) || "";
                      const by = dmyToYmd(String(b.valid_from).trim()) || "";
                      return by.localeCompare(ay);
                    })
                    .map((r) => (
                      <div key={r.valid_from} className={styles.hintRow}>
                        <span>
                          {r.valid_from} · {rub(r.cost)}
                        </span>

                        <button
                          type="button"
                          className={styles.hintDelete}
                          title="Удалить себестоимость"
                          onClick={() => onDelete(r.valid_from)}
                          disabled={saving}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </>
              ) : (
                "Истории пока нет"
              )}
            </div>
            
          </div>
          <div className={styles.historyCost}>
            <span className={styles.historyTitle}>
              Первый отчет с продажей
            </span>
            <div className={styles.hint}>
              {loadingFirstReport ? (
                "Ищу первый отчет…"
              ) : firstReportErr ? (
                `Ошибка: ${firstReportErr}`
              ) : firstReportDateFrom ? (
                firstReportDateFrom
              ) : (
                "Не найдено"
              )}
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}