"use client";

import { useEffect, useRef } from "react";
import styles from "./PremiumCursor.module.css";

/**
 * Premium cursor with:
 * - Tiny dot that follows pointer exactly (no lag)
 * - Ring that lerps behind with inertia
 * - Velocity-based stretch + rotation (squash & stretch in direction of motion)
 * - Speed-reactive glow intensity
 * - Fading particle trail
 * - Interactive grow/shrink states
 */
export default function PremiumCursor() {
  const dotRef    = useRef<HTMLDivElement>(null);
  const ringRef   = useRef<HTMLDivElement>(null);
  const trailRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot   = dotRef.current;
    const ring  = ringRef.current;
    const trail = trailRef.current;
    if (!dot || !ring || !trail) return;

    // Skip on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const RING_SIZE    = 36;
    const DOT_SIZE     = 6;
    const LERP         = 0.14;
    const TRAIL_COUNT  = 8;

    // Current lerped position of ring
    let rx = window.innerWidth  / 2;
    let ry = window.innerHeight / 2;
    // Actual mouse position
    let mx = rx, my = ry;
    // Prev ring pos (for velocity)
    let prx = rx, pry = ry;
    // Velocity (smoothed)
    let vx = 0, vy = 0;

    // Trail particles — kept as plain objects to avoid state
    const particles: Array<{ el: HTMLSpanElement; x: number; y: number; life: number }> = [];
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const el = document.createElement("span");
      el.className = styles.trailDot;
      trail.appendChild(el);
      particles.push({ el, x: rx, y: ry, life: 0 });
    }

    let raf = 0;
    let frameCount = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      frameCount++;

      // Lerp ring toward mouse
      prx = rx;
      pry = ry;
      rx += (mx - rx) * LERP;
      ry += (my - ry) * LERP;

      // Smoothed velocity (ring delta, not raw mouse)
      const dvx = rx - prx;
      const dvy = ry - pry;
      vx += (dvx - vx) * 0.3;
      vy += (dvy - vy) * 0.3;

      const speed  = Math.sqrt(vx * vx + vy * vy);
      const angle  = Math.atan2(vy, vx) * (180 / Math.PI);
      const stretch = Math.min(speed * 0.8, 1.8);   // scaleX factor bonus
      const squash  = 1 / (1 + stretch * 0.35);      // scaleY compensates

      // Position ring (centre-offset)
      ring.style.transform =
        `translate3d(${rx - RING_SIZE / 2}px,${ry - RING_SIZE / 2}px,0)` +
        ` rotate(${angle}deg)` +
        ` scaleX(${1 + stretch})` +
        ` scaleY(${squash})`;

      // Dynamic glow based on speed
      const glow = Math.min(speed * 3, 40);
      ring.style.boxShadow =
        `0 0 ${8 + glow}px rgba(100,160,255,${0.25 + speed * 0.06}),` +
        `0 0 ${20 + glow * 2}px rgba(60,120,255,${0.08 + speed * 0.02}),` +
        `inset 0 0 ${6 + glow * 0.4}px rgba(140,190,255,${0.04 + speed * 0.01})`;

      // Position dot (exact, no offset correction needed)
      dot.style.transform = `translate3d(${mx - DOT_SIZE / 2}px,${my - DOT_SIZE / 2}px,0)`;

      // Trail: every 2nd frame, shift particles forward
      if (frameCount % 2 === 0) {
        for (let i = particles.length - 1; i > 0; i--) {
          particles[i].x    = particles[i - 1].x;
          particles[i].y    = particles[i - 1].y;
          particles[i].life = particles[i - 1].life;
        }
        particles[0].x    = rx;
        particles[0].y    = ry;
        particles[0].life = Math.min(speed * 0.6, 1);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const sz = Math.max(2, (1 - i / particles.length) * 5);
        const op = Math.max(0, p.life * (1 - i / particles.length) * 0.55);
        p.el.style.transform = `translate3d(${p.x - sz / 2}px,${p.y - sz / 2}px,0)`;
        p.el.style.width     = `${sz}px`;
        p.el.style.height    = `${sz}px`;
        p.el.style.opacity   = String(op);
      }
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const onDown = () => {
      ring.classList.add(styles.clicked);
      dot.classList.add(styles.dotClicked);
    };
    const onUp = () => {
      ring.classList.remove(styles.clicked);
      dot.classList.remove(styles.dotClicked);
    };

    const onOver = (e: MouseEvent) => {
      if ((e.target as Element).closest("a, button, [role='button'], [data-hover], .cursor-target")) {
        ring.classList.add(styles.hovered);
      }
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element).closest("a, button, [role='button'], [data-hover], .cursor-target")) {
        ring.classList.remove(styles.hovered);
      }
    };

    window.addEventListener("mousemove",   onMove,  { passive: true });
    window.addEventListener("mousedown",   onDown);
    window.addEventListener("mouseup",     onUp);
    document.addEventListener("mouseover", onOver,  true);
    document.addEventListener("mouseout",  onOut,   true);

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",   onMove);
      window.removeEventListener("mousedown",   onDown);
      window.removeEventListener("mouseup",     onUp);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout",  onOut,  true);
      // clean up trail children
      while (trail.firstChild) trail.removeChild(trail.firstChild);
    };
  }, []);

  return (
    <>
      {/* Exact-position dot */}
      <div ref={dotRef} className={styles.dot} />
      {/* Inertia ring with stretch */}
      <div ref={ringRef} className={styles.ring} />
      {/* Trail container */}
      <div ref={trailRef} className={styles.trail} />
    </>
  );
}
