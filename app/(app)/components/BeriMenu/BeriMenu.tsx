// app/components/BeriMenu/BeriMenu.tsx
"use client";

import styles from "./BeriMenu.module.css";
import { usePathname, useRouter } from "next/navigation";

export default function BeriMenu() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className={styles.sidebar}>
      <button type="button" className={styles.brand} onClick={() => router.push("/")}>
        <div className={styles.logoMark} aria-hidden />
        <div className={styles.brandText}>
          <div className={styles.brandName}>Beri</div>
          <div className={styles.brandSub}>service</div>
        </div>
      </button>

      <nav className={styles.nav}>
        <button
          type="button"
          title="Постаматы"
          onClick={() => router.push("/boxes")}
          className={`${styles.navItem} ${pathname.startsWith("/boxes") ? styles.navItemActive : ""}`}
        >
          <IconGrid />
        </button>

        <button
          type="button"
          title="Заказы"
          onClick={() => router.push("/orders")}
          className={`${styles.navItem} ${pathname.startsWith("/orders") ? styles.navItemActive : ""}`}
        >
          <IconOrders />
        </button>
        <button
          type="button"
          title="Финансы"
          onClick={() => router.push("/unit")}
          className={`${styles.navItem} ${pathname.startsWith("/unit") ? styles.navItemActive : ""}`}
        >
          <IconChart />
        </button>
      </nav>
    </aside>
  );
}

/* ===== tiny icons ===== */

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm8 0h6v6h-6v-6Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 15V9m4 6V5m4 10v-7m4 7v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconOrders() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="4" cy="6" r="1.2" fill="currentColor" />
      <circle cx="4" cy="10" r="1.2" fill="currentColor" />
      <circle cx="4" cy="14" r="1.2" fill="currentColor" />

      <path
        d="M7 6h10
          M7 10h10
          M7 14h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
