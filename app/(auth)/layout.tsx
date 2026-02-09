// app/auth/layout.tsx
import type { ReactNode } from "react";
import styles from "../page.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.authShell}>
      <main className={styles.authPage}>{children}</main>
    </div>
  );
}