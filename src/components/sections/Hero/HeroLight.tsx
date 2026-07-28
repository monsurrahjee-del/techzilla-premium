"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

/**
 * Unified lighting system — one radial light blob that follows the cursor.
 *
 * The light is split into two layers that move at slightly different speeds,
 * creating depth: a large soft ambient halo + a tighter specular point.
 *
 * Both layers use direct style mutation (no lerp) for zero lag, which is
 * intentional — the light should feel like it's emanating from the cursor,
 * not chasing it.
 */
export default function HeroLight() {
  const ambientRef  = useRef<HTMLDivElement>(null);
  const specRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ambient  = ambientRef.current;
    const spec     = specRef.current;
    if (!ambient || !spec) return;

    // Centred default on mount
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    ambient.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;
    spec.style.transform    = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;

    // Touch devices — keep centred, no listener needed
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // Lerped position for the specular layer (lagging slightly = more cinematic)
    let sx = cx, sy = cy;
    let lax = cx, lay = cy;
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      // Spec: tight follow
      ambient.style.transform  = `translate3d(${lax}px,${lay}px,0) translate(-50%,-50%)`;
      spec.style.transform     = `translate3d(${sx}px,${sy}px,0) translate(-50%,-50%)`;
    };

    const onMove = (e: MouseEvent) => {
      // Ambient — instant (no lerp)
      lax = e.clientX;
      lay = e.clientY;
      // Spec — lerp toward mouse every frame
      sx += (e.clientX - sx) * 0.22;
      sy += (e.clientY - sy) * 0.22;
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
      {/* Large soft ambient halo */}
      <div ref={ambientRef} className={styles.heroLight} />
      {/* Tight specular point */}
      <div ref={specRef}    className={styles.heroLightSpec} />
    </>
  );
}
