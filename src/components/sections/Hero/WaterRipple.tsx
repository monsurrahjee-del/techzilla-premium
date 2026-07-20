"use client";

/**
 * Spotlight — smooth radial-gradient that follows the cursor.
 * Higher SMOOTH value = more responsive. 0.28 reaches ~98% of target in
 * ~12 frames (0.2 s at 60 fps) so the follow feels near-instant.
 */

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

const SMOOTH = 0.28;
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export default function WaterRipple() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cx = window.innerWidth  * 0.50;
    let cy = window.innerHeight * 0.42;
    let tx = cx, ty = cy;
    let raf = 0;
    let heroActive = true; // tracks whether Hero is the current section

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };

    const tick = () => {
      // Stop the RAF entirely when Hero is no longer visible — no GPU/CPU
      // waste tracking a cursor for a 22%-opacity background element.
      if (!heroActive) { raf = 0; return; }

      cx = lerp(cx, tx, SMOOTH);
      cy = lerp(cy, ty, SMOOTH);

      const rect = el.getBoundingClientRect();
      const x = Math.round(cx - rect.left);
      const y = Math.round(cy - rect.top);

      el.style.background =
        `radial-gradient(800px circle at ${x}px ${y}px,` +
        `rgba(72,110,255,0.14) 0%,` +
        `rgba(50,82,220,0.06) 42%,` +
        `transparent 70%)`;

      raf = requestAnimationFrame(tick);
    };

    const onHeroActive = (e: Event) => {
      heroActive = (e as CustomEvent<{ heroActive: boolean }>).detail.heroActive;
      // Restart the stopped RAF when Hero becomes active again.
      if (heroActive && !raf) raf = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("mousemove",        onMove,       { passive: true });
    window.addEventListener("hero-section-active", onHeroActive);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",           onMove);
      window.removeEventListener("hero-section-active", onHeroActive);
    };
  }, []);

  return <div ref={ref} className={styles.spotlight} aria-hidden="true" />;
}
