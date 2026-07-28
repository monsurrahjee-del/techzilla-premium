"use client";

import { useEffect, useRef } from "react";
import styles from "./PremiumCursor.module.css";

/**
 * Premium cursor — complete interaction system:
 *
 *  • Tiny dot that follows pointer exactly (no lag)
 *  • Ring that lerps behind with inertia + velocity-based stretch/rotation
 *  • Speed-reactive glow intensity
 *  • Fading particle trail
 *  • Click ripple — expanding ring that fades out
 *  • Magnetic snap toward interactive elements
 *  • Shape changes based on speed
 *  • Soft ripple on click
 *  • Pushes nearby floating objects (emits cursor-pos event)
 */
export default function PremiumCursor() {
  const dotRef    = useRef<HTMLDivElement>(null);
  const ringRef   = useRef<HTMLDivElement>(null);
  const trailRef  = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot     = dotRef.current;
    const ring    = ringRef.current;
    const trail   = trailRef.current;
    const ripples = ripplesRef.current;
    if (!dot || !ring || !trail || !ripples) return;

    if (window.matchMedia("(pointer: coarse)").matches) return;

    const RING_SIZE   = 36;
    const DOT_SIZE    = 6;
    const LERP        = 0.14;
    const TRAIL_COUNT = 10;

    let rx = window.innerWidth  / 2;
    let ry = window.innerHeight / 2;
    let mx = rx, my = ry;
    let prx = rx, pry = ry;
    let vx = 0, vy = 0;

    // Magnetic target
    let magX = 0, magY = 0, magActive = false;

    const particles: Array<{ el: HTMLSpanElement; x: number; y: number; life: number }> = [];
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const el = document.createElement("span");
      el.className = styles.trailDot;
      trail.appendChild(el);
      particles.push({ el, x: rx, y: ry, life: 0 });
    }

    let raf = 0;
    let frameCount = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frameCount++;

      prx = rx; pry = ry;

      // Pull toward magnetic target when active
      const targetX = magActive ? mx + magX : mx;
      const targetY = magActive ? my + magY : my;

      rx += (targetX - rx) * LERP;
      ry += (targetY - ry) * LERP;

      const dvx = rx - prx;
      const dvy = ry - pry;
      vx += (dvx - vx) * 0.3;
      vy += (dvy - vy) * 0.3;

      const speed  = Math.sqrt(vx * vx + vy * vy);
      const angle  = Math.atan2(vy, vx) * (180 / Math.PI);
      const stretch = Math.min(speed * 0.75, 1.7);
      const squash  = 1 / (1 + stretch * 0.32);

      ring.style.transform =
        `translate3d(${rx - RING_SIZE / 2}px,${ry - RING_SIZE / 2}px,0)` +
        ` rotate(${angle}deg)` +
        ` scaleX(${1 + stretch})` +
        ` scaleY(${squash})`;

      // Speed-reactive glow — more vivid at higher speeds
      const glow = Math.min(speed * 3.2, 44);
      const glowAlpha = Math.min(0.25 + speed * 0.06, 0.65);
      ring.style.boxShadow =
        `0 0 ${8 + glow}px rgba(100,160,255,${glowAlpha.toFixed(2)}),` +
        `0 0 ${20 + glow * 2}px rgba(60,120,255,${Math.min(0.08 + speed * 0.025, 0.3).toFixed(2)}),` +
        `inset 0 0 ${6 + glow * 0.4}px rgba(140,190,255,${Math.min(0.04 + speed * 0.012, 0.18).toFixed(2)})`;

      dot.style.transform = `translate3d(${mx - DOT_SIZE / 2}px,${my - DOT_SIZE / 2}px,0)`;

      // Trail: every 2nd frame
      if (frameCount % 2 === 0) {
        for (let i = particles.length - 1; i > 0; i--) {
          particles[i].x    = particles[i - 1].x;
          particles[i].y    = particles[i - 1].y;
          particles[i].life = particles[i - 1].life;
        }
        particles[0].x    = rx;
        particles[0].y    = ry;
        particles[0].life = Math.min(speed * 0.65, 1);
      }

      for (let i = 0; i < particles.length; i++) {
        const p  = particles[i];
        const sz = Math.max(1.5, (1 - i / particles.length) * 5.5);
        const op = Math.max(0, p.life * (1 - i / particles.length) * 0.60);
        p.el.style.transform = `translate3d(${p.x - sz / 2}px,${p.y - sz / 2}px,0)`;
        p.el.style.width     = `${sz}px`;
        p.el.style.height    = `${sz}px`;
        p.el.style.opacity   = String(op);
      }

      // Emit cursor position for environment effects (~30fps)
      if (frameCount % 2 === 0) {
        window.dispatchEvent(new CustomEvent("cursor-pos", {
          detail: { x: mx, y: my, vx, vy, speed },
        }));
      }

      // Clean up finished ripples
      Array.from(ripples.children).forEach((el) => {
        const age = parseFloat((el as HTMLElement).dataset.age ?? "0") + 1;
        (el as HTMLElement).dataset.age = String(age);
        if (age > 45) ripples.removeChild(el);
      });
    };

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };

    // Click ripple — spawn an expanding ring at click position
    const spawnRipple = (x: number, y: number) => {
      const el = document.createElement("div");
      el.className = styles.ripple;
      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;
      el.dataset.age = "0";
      ripples.appendChild(el);
    };

    const onDown = (e: MouseEvent) => {
      ring.classList.add(styles.clicked);
      dot.classList.add(styles.dotClicked);
      spawnRipple(e.clientX, e.clientY);
    };
    const onUp = () => {
      ring.classList.remove(styles.clicked);
      dot.classList.remove(styles.dotClicked);
    };

    // Magnetic effect: detect interactive elements and pull cursor gently
    const MAGNETIC_RADIUS = 80;
    const onOver = (e: MouseEvent) => {
      const target = (e.target as Element).closest("a, button, [role='button'], [data-hover], .cursor-target");
      if (target) {
        ring.classList.add(styles.hovered);
        const rect = target.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        const dx   = cx - mx;
        const dy   = cy - my;
        const dist = Math.hypot(dx, dy);
        if (dist < MAGNETIC_RADIUS) {
          // Attract ring toward element center
          const strength = (1 - dist / MAGNETIC_RADIUS) * 0.35;
          magX = dx * strength;
          magY = dy * strength;
          magActive = true;
        }
      }
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element).closest("a, button, [role='button'], [data-hover], .cursor-target")) {
        ring.classList.remove(styles.hovered);
        magX = 0; magY = 0; magActive = false;
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
      while (trail.firstChild) trail.removeChild(trail.firstChild);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}    className={styles.dot}    />
      <div ref={ringRef}   className={styles.ring}   />
      <div ref={trailRef}  className={styles.trail}  />
      <div ref={ripplesRef} className={styles.rippleContainer} />
    </>
  );
}
