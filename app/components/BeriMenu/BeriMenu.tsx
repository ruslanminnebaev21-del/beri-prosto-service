// app/components/BeriMenu/BeriMenu.tsx
"use client";

import styles from "./BeriMenu.module.css";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function BeriMenu() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logoMark} aria-hidden />
        <div className={styles.brandText}>
          <div className={styles.brandName}>Бери Просто</div>
          <div className={styles.brandSub}>сервис</div>
        </div>
      </div>

      <nav className={styles.nav}>
        <Link href="/boxes" title="Постаматы">
          <button
            type="button"
            className={`${styles.navItem} ${pathname.startsWith("/boxes") ? styles.navItemActive : ""}`}
          >
            <IconGrid />
          </button>
        </Link>

        <Link href="/orders" title="Заказы">
          <button
            type="button"
            className={`${styles.navItem} ${pathname.startsWith("/orders") ? styles.navItemActive : ""}`}
          >
            <IconChart />
          </button>
        </Link>
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
