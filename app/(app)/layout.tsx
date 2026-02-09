// app/(app)/layout.tsx
import BeriMenu from "./components/BeriMenu/BeriMenu";
import styles from "../page.module.css";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.appShell}>
      <BeriMenu />
      <main className={styles.page}>{children}</main>
    </div>
  );
}