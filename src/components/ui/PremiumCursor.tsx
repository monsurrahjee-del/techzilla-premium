"use client";

import { useEffect, useRef } from "react";
import styles from "./PremiumCursor.module.css";

export default function PremiumCursor() {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;

    const SIZE = 34; // half = 17

    // Direct DOM class manipulation — zero React re-renders.
    // setState + re-render on every mouseover/mouseout/mousedown/mouseup was
    // causing batched React renders that delayed CSS :hover style recalculation
    // (and the modal button glow) by one or more frames.
    const onDown  = () => ring.classList.add(styles.clicked);
    const onUp    = () => ring.classList.remove(styles.clicked);

    const onOver  = (e: MouseEvent) => {
      if ((e.target as Element).closest("a, button, [role='button'], [data-hover]")) {
        ring.classList.add(styles.hovered);
      }
    };
    const onOut   = (e: MouseEvent) => {
      if ((e.target as Element).closest("a, button, [role='button'], [data-hover]")) {
        ring.classList.remove(styles.hovered);
      }
    };

    // Update ring position directly in the mousemove handler — no lerp, no RAF loop.
    // The ring lands exactly where the physical pointer is on every event.
    const onMove  = (e: MouseEvent) => {
      ring.style.transform = `translate3d(${e.clientX - SIZE / 2}px, ${e.clientY - SIZE / 2}px, 0)`;
    };

    window.addEventListener("mousemove",  onMove,  { passive: true });
    window.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",    onUp);
    document.addEventListener("mouseover",  onOver, true);
    document.addEventListener("mouseout",   onOut,  true);

    return () => {
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",    onUp);
      document.removeEventListener("mouseover",  onOver, true);
      document.removeEventListener("mouseout",   onOut,  true);
    };
  }, []);

  return <div ref={ringRef} className={styles.ring} />;
}
