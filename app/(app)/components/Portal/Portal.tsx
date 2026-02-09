// wb-app/app/components/Portal/Portal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const el = document.getElementById("portal-root");
  if (!el) return null;

  return createPortal(children, el);
}