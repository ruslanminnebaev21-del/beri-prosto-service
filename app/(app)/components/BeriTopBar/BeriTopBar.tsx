// app/(app)/components/BeriTopBar/BeriTopBar.tsx
"use client";

import styles from "./BeriTopBar.module.css";
import { usePathname } from "next/navigation";

function pageTitleByPath(pathname: string) {
  if (pathname.startsWith("/boxes")) return "Постаматы";
  if (pathname.startsWith("/orders")) return "Аренды";
  if (pathname.startsWith("/unit")) return "Финансы";
  return "Beri Prosto Service";
}

export default function BeriTopBar() {
  const pathname = usePathname();
  const pageTitle = pageTitleByPath(pathname);

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <div className={styles.pageTitle}>{pageTitle}</div>
      </div>
    </header>
  );
}
