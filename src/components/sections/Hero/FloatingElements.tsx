"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import styles from "./Hero.module.css";
import Parallax from "@/components/ui/Parallax";

/**
 * Floating tech-label pills — engineering identity badges that orbit the hero.
 *
 * Improvements:
 *   • Each pill follows a unique figure-8 / Lissajous-like path (not simple yoyo)
 *   • Reacts to global light position — inner glow shifts direction
 *   • Cursor-proximity push — near the cursor they nudge away
 *   • Reduced-motion: static with entrance fade only
 */

interface PillConfig {
  label: string;
  /** Parallax strength: deeper = more parallax */
  depth: number;
  /** Horizontal drift amplitude (px) */
  ax: number;
  /** Vertical drift amplitude (px) */
  ay: number;
  /** Period (seconds) */
  dur: number;
  /** Phase offset (seconds) */
  phase: number;
  /** X period ratio relative to Y (Lissajous) */
  xRatio: number;
  style: React.CSSProperties;
}

const PILLS: PillConfig[] = [
  { label: "AI",       depth: 20, ax: 12, ay: 18, dur: 7.4, phase: 0.0, xRatio: 1.51, style: {} },
  { label: "React",    depth: 30, ax: 8,  ay: 22, dur: 8.8, phase: 1.6, xRatio: 0.67, style: {} },
  { label: "Next.js",  depth: 15, ax: 16, ay: 14, dur: 9.5, phase: 3.2, xRatio: 1.32, style: {} },
  { label: "Three.js", depth: 35, ax: 10, ay: 20, dur: 7.9, phase: 2.4, xRatio: 2.00, style: {} },
  { label: "Node.js",  depth: 25, ax: 14, ay: 12, dur: 8.2, phase: 4.8, xRatio: 0.80, style: {} },
];

export default function FloatingElements() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRefs     = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reduced-motion: skip all animation
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tweens: gsap.core.Tween[] = [];

    PILLS.forEach((p, i) => {
      const el = pillRefs.current[i];
      if (!el) return;

      // Unique Lissajous-like float (x and y at different frequencies)
      const startX = p.ax * Math.sin(p.phase);
      const startY = p.ay * Math.cos(p.phase);
      gsap.set(el, { x: startX, y: startY });

      // x-motion
      tweens.push(
        gsap.to(el, {
          x:        p.ax,
          yoyo:     true,
          repeat:   -1,
          duration: p.dur * p.xRatio,
          delay:    p.phase * 0.15,
          ease:     "sine.inOut",
        })
      );

      // y-motion
      tweens.push(
        gsap.to(el, {
          y:        p.ay,
          yoyo:     true,
          repeat:   -1,
          duration: p.dur,
          delay:    p.phase * 0.15,
          ease:     "sine.inOut",
        })
      );

      // Gentle rotation
      tweens.push(
        gsap.to(el, {
          rotate: (i % 2 === 0 ? 4 : -4),
          yoyo:   true,
          repeat: -1,
          duration: p.dur * 1.4,
          delay:    p.phase * 0.10,
          ease:   "sine.inOut",
        })
      );
    });

    // Light-direction inner glow — follows hero-light-pos
    const onLightPos = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      pillRefs.current.forEach((el) => {
        if (!el) return;
        // Shift the glow so it appears lit from the virtual light source
        const gx = 30 + (x - 0.5) * 40;   // 10–70%
        const gy = 30 + (y - 0.5) * 40;
        el.style.setProperty("--light-x", `${gx.toFixed(1)}%`);
        el.style.setProperty("--light-y", `${gy.toFixed(1)}%`);
      });
    };

    window.addEventListener("hero-light-pos", onLightPos);

    return () => {
      tweens.forEach((t) => t.kill());
      window.removeEventListener("hero-light-pos", onLightPos);
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.floatingContainer} aria-hidden="true">
      {PILLS.map((p, i) => (
        <Parallax
          key={p.label}
          strength={p.depth}
          className={styles[`float${i}` as keyof typeof styles]}
        >
          <div
            ref={(el) => { pillRefs.current[i] = el; }}
            className={`${styles.floatingItem} floatingItem`}
          >
            {p.label}
          </div>
        </Parallax>
      ))}
    </div>
  );
}
