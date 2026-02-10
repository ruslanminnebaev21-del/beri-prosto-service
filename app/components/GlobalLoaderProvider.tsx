// app/components/GlobalLoaderProvider.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Loader from "../(app)/components/Loader/Loader";

type GlobalLoaderApi = {
  track<T>(fn: () => Promise<T>): Promise<T>;
  start(): void;
  stop(): void;
};

const Ctx = createContext<GlobalLoaderApi | null>(null);

export function useGlobalLoader() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGlobalLoader must be used within <GlobalLoaderProvider />");
  return v;
}

export default function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const counter = useRef(0);
  const [open, setOpen] = useState(false);
  const lastTouchEndRef = useRef(0);

  useEffect(() => {
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEndRef.current <= 350) {
        e.preventDefault();
      }
      lastTouchEndRef.current = now;
    };

    const onGesture = (e: Event) => {
      e.preventDefault();
    };

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("touchend", onTouchEnd, { passive: false });
    document.addEventListener("gesturestart", onGesture, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gesturechange", onGesture, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gestureend", onGesture, { passive: false } as AddEventListenerOptions);
    document.addEventListener("dblclick", onDblClick);

    return () => {
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("gesturestart", onGesture as EventListener);
      document.removeEventListener("gesturechange", onGesture as EventListener);
      document.removeEventListener("gestureend", onGesture as EventListener);
      document.removeEventListener("dblclick", onDblClick);
    };
  }, []);

  const start = useCallback(() => {
    counter.current += 1;
    setOpen(true);
  }, []);

  const stop = useCallback(() => {
    counter.current = Math.max(0, counter.current - 1);
    if (counter.current === 0) setOpen(false);
  }, []);

  const track = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      start();
      try {
        return await fn();
      } finally {
        stop();
      }
    },
    [start, stop]
  );

  const value = useMemo<GlobalLoaderApi>(() => ({ track, start, stop }), [track, start, stop]);

  return (
    <Ctx.Provider value={value}>
      <div className={open ? "beri-blurRoot" : undefined}>{children}</div>
      <Loader open={open} />
    </Ctx.Provider>
  );
}
