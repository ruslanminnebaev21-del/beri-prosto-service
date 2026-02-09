// app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../page.module.css";

function parseRuPhoneDigits(value: string) {
  const raw = String(value || "");
  let digits = raw.replace(/\D/g, "");

  if (raw.trim().startsWith("+") && digits.startsWith("7")) digits = digits.slice(1);
  if (digits.startsWith("8")) digits = digits.slice(1);
  if (digits.length === 11 && digits.startsWith("7")) digits = digits.slice(1);

  return digits.slice(0, 10);
}

function maskRuPhone(digits: string, opts?: { forcePrefix?: boolean }) {
  const d = String(digits || "").replace(/\D/g, "").slice(0, 10);
  if (!d) return opts?.forcePrefix ? "+7(" : "";
  if (d.length <= 3) return `+7(${d}`;

  let out = `+7(${d.slice(0, 3)})`;
  out += d.slice(3, 6);
  if (d.length <= 6) return out;

  out += `-${d.slice(6, 8)}`;
  if (d.length <= 8) return out;

  out += `-${d.slice(8, 10)}`;
  return out;
}

export default function LoginPage() {
  const router = useRouter();
  const [phoneDigits, setPhoneDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function prettyError(code: unknown) {
    const e = String(code ?? "").trim();
    if (!e) return "Ошибка авторизации";
    if (e === "user not found") return "Пользователь с таким номером телефона не найден";
    if (e === "forbidden") return "У вас недостаточно прав";
    if (e === "phone is required") return "Введите номер телефона";
    return e;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const phone = `7${phoneDigits}`; // в БД phone хранится как 79998887766

      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ phone }),
      });

      const json = await r.json().catch(() => null);

      if (!r.ok || !json?.ok) {
        setErr(prettyError(json?.error || `HTTP ${r.status}`));
        return;
      }

      router.replace("/orders");
    } catch (e: any) {
      setErr(prettyError(e?.message ? String(e.message) : "Ошибка запроса"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.authCard}>
      <h1 className={styles.authTitle}>Вход</h1>

      {err && (
        <div className={styles.error}>
          <div className={styles.errorText}>{err}</div>
        </div>
      )}

      <form className={styles.authForm} onSubmit={onSubmit}>
        <label className={styles.authLabel} htmlFor="phone">
          Номер телефона
        </label>

        <input
          id="phone"
          className={styles.authInput}
          value={maskRuPhone(phoneDigits, { forcePrefix: true })}
          onChange={(e) => setPhoneDigits(parseRuPhoneDigits(e.target.value))}
          placeholder="+7(999)123-45-67"
          autoComplete="tel"
          inputMode="tel"
        />

        <button type="submit" className={styles.btn} disabled={loading || phoneDigits.length !== 10}>
          {loading ? "Проверяю…" : "Войти"}
        </button>
      </form>
    </section>
  );
}
