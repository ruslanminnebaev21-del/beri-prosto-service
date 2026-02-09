// wb-app/app/components/SidePanel/SidePanel.tsx

"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./SidePanel.module.css";

type SidePanelProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  width?: number; // px
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
};

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export default function SidePanel({
  open,
  title,
  subtitle,
  width = 420,
  onClose,
  children,
  footer,
  closeOnBackdrop = true,
}: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useBodyScrollLock(open);

  // esc close
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // focus first focusable
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;

      const focusable = root.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus?.();
    }, 30);

    return () => window.clearTimeout(t);
  }, [open]);

  const content = useMemo(() => {
    if (!open) return null;

    return (
      <div className={styles.root} aria-hidden={!open}>
        <div
          className={styles.backdrop}
          onMouseDown={() => {
            if (closeOnBackdrop) onClose();
          }}
        />

        <div
          ref={panelRef}
          className={styles.panel}
          style={{ width }}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            // чтобы клик внутри не закрывал
            e.stopPropagation();
          }}
        >
          <div className={styles.header}>
            <div className={styles.headText}>
              {title && <div className={styles.title}>{title}</div>}
              {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            </div>

            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M5 5l10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className={styles.body}>{children}</div>

          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </div>
    );
  }, [open, closeOnBackdrop, onClose, title, subtitle, children, footer, width]);

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}