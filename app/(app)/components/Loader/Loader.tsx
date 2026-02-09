// wb-app/app/components/Loader/Loader.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Loader.module.css";

type LoaderProps = {
  open: boolean;
  text?: string;
  /** если true, можно закрыть по клику на фон */
  closeOnBackdrop?: boolean;
  onClose?: () => void;
};

export default function Loader({
  open,
  text = "Секундочку, считаю...",
  closeOnBackdrop = false,
  onClose,
}: LoaderProps) {
  const mountRef = useRef<HTMLElement | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);

  // создаем контейнер один раз (под портал)
  if (!elRef.current && typeof document !== "undefined") {
    elRef.current = document.createElement("div");
  }

  // гарантируем mount point
  useEffect(() => {
    if (typeof document === "undefined") return;

    let mount = document.getElementById("wb-portal-root") as HTMLElement | null;
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "wb-portal-root";
      document.body.appendChild(mount);
    }
    mountRef.current = mount;

    const el = elRef.current!;
    mount.appendChild(el);

    return () => {
      try {
        mount.removeChild(el);
      } catch {}
    };
  }, []);

  // esc для закрытия (если разрешено)
  useEffect(() => {
    if (!open) return;
    if (!onClose) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const node = useMemo(() => {
    if (!open) return null;

    const onBackdrop = () => {
      if (!closeOnBackdrop) return;
      onClose?.();
    };

    return (
      <div
        className={styles.loadingOverlay}
        role="status"
        aria-live="polite"
        onMouseDown={onBackdrop}
      >
        <div
          className={styles.loadingCard}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>{text}</div>
        </div>
      </div>
    );
  }, [open, text, closeOnBackdrop, onClose]);

  const mount = mountRef.current;
  const el = elRef.current;

  if (!mount || !el) return null;
  return createPortal(node, el);
}