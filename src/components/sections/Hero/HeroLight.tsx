"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

/**
 * Unified lighting system — one virtual light source that broadcasts its
 * position so stickers, cursor, and background all belong to the same
 * illuminated environment.
 *
 * Layers:
 *  • Large soft ambient halo (follows cursor instantly)
 *  • Tight specular point (lerps slightly behind for cinematic depth)
 *
 * Emits:  hero-light-pos  { x: 0‥1, y: 0‥1 }  (normalised viewport coords)
 * so every other component can react to the same virtual light.
 */
export default function HeroLight() {
  const ambientRef = useRef<HTMLDivElement>(null);
  const specRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ambient = ambientRef.current;
    const spec    = specRef.current;
    if (!ambient || !spec) return;

    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    ambient.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;
    spec.style.transform    = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;

    if (window.matchMedia("(pointer: coarse)").matches) {
      // Mobile: emit a static centred light position once
      window.dispatchEvent(new CustomEvent("hero-light-pos", { detail: { x: 0.5, y: 0.5 } }));
      return;
    }

    let sx = cx, sy = cy;
    let lax = cx, lay = cy;
    let raf = 0;
    let lastEmitTime = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);

      ambient.style.transform = `translate3d(${lax}px,${lay}px,0) translate(-50%,-50%)`;
      spec.style.transform    = `translate3d(${sx}px,${sy}px,0) translate(-50%,-50%)`;

      // Broadcast light position at ~30 fps (enough for shadow updates)
      if (now - lastEmitTime > 33) {
        lastEmitTime = now;
        window.dispatchEvent(new CustomEvent("hero-light-pos", {
          detail: {
            x: lax / window.innerWidth,
            y: lay / window.innerHeight,
          },
        }));
      }
    };

    const onMove = (e: MouseEvent) => {
      lax = e.clientX;
      lay = e.clientY;
      sx += (e.clientX - sx) * 0.18;
      sy += (e.clientY - sy) * 0.18;
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <>
      <div ref={ambientRef} className={styles.heroLight} />
      <div ref={specRef}    className={styles.heroLightSpec} />
    </>
  );
}
