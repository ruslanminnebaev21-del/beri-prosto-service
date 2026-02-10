// app/components/Loader/Loader.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
  text = "Секундочку, получаю данные...",
  closeOnBackdrop = false,
  onClose,
}: LoaderProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  // гарантируем mount point
  useEffect(() => {
    if (typeof document === "undefined") return;

    let root = document.getElementById("beri-portal-root") as HTMLElement | null;
    if (!root) {
      root = document.createElement("div");
      root.id = "beri-portal-root";
      document.body.appendChild(root);
    }

    const portalEl = document.createElement("div");
    root.appendChild(portalEl);
    setMount(root);
    setEl(portalEl);

    return () => {
      try {
        root.removeChild(portalEl);
      } catch {}
      setEl(null);
      setMount(null);
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

  if (!mount || !el) return null;
  return createPortal(node, el);
}
