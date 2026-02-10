// app/(app)/layout.tsx
import BeriMenu from "./components/BeriMenu/BeriMenu";
import styles from "../page.module.css";
import BeriTopBar from "./components/BeriTopBar/BeriTopBar";
import { Suspense } from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.appShell}>
      <BeriMenu />
      <main className={styles.page}>
        <Suspense fallback={null}>
                <BeriTopBar />
        </Suspense> 
        {children}
      </main>
    </div>
  );
}