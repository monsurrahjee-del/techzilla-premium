"use client";
import { useState, useEffect } from "react";

/**
 * Returns true when the primary pointer is coarse (touch / mobile device).
 * Uses matchMedia("(pointer: coarse)") — more reliable than viewport width
 * for detecting touch-primary devices (tablets in landscape, etc.).
 * Returns false during SSR and on first render to avoid hydration mismatch.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}
