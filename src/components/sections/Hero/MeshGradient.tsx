"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

/**
 * Atmospheric background:
 *   - Animated mesh gradient blobs (CSS, GPU-composited)
 *   - Particle canvas with subtle floating node-network dots
 *   - Mouse-reactive radial spotlight that shifts the environment
 */
export default function MeshGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    let animId = 0;

    // Mouse position (normalised 0-1)
    let mx = 0.5, my = 0.5;
    let lmx = 0.5, lmy = 0.5;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX / window.innerWidth;
      my = e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    // Particle definition
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      opacity: number;
      phase: number;
      speed: number;
    }

    let particles: Particle[] = [];

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;

      // Re-seed particles — ~1 per 14000px²
      const count = Math.min(Math.floor((W * H) / 14000), 90);
      particles = Array.from({ length: count }, () => ({
        x:       Math.random() * W,
        y:       Math.random() * H,
        vx:      (Math.random() - 0.5) * 0.3,
        vy:      (Math.random() - 0.5) * 0.3,
        r:       1 + Math.random() * 2,
        opacity: 0.08 + Math.random() * 0.22,
        phase:   Math.random() * Math.PI * 2,
        speed:   0.4 + Math.random() * 0.6,
      }));
    };

    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(document.documentElement);
    resize();

    const draw = (t: number) => {
      animId = requestAnimationFrame(draw);

      ctx.clearRect(0, 0, W, H);

      // Lerp mouse for smooth light follow
      lmx += (mx - lmx) * 0.04;
      lmy += (my - lmy) * 0.04;

      // ── Volumetric spotlight ────────────────────────────────────────
      const grd = ctx.createRadialGradient(
        lmx * W, lmy * H, 0,
        lmx * W, lmy * H, Math.max(W, H) * 0.55
      );
      grd.addColorStop(0.00, "rgba(62,100,255,0.10)");
      grd.addColorStop(0.30, "rgba(44, 75,200,0.05)");
      grd.addColorStop(1.00, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // ── Light rays — 3 radial beams from spotlight centre ──────────
      for (let i = 0; i < 3; i++) {
        const angle = (t * 0.00008 + (i * Math.PI * 2) / 3);
        const x0 = lmx * W;
        const y0 = lmy * H;
        const len = Math.max(W, H) * 1.2;
        const x1 = x0 + Math.cos(angle) * len;
        const y1 = y0 + Math.sin(angle) * len;
        const ray = ctx.createLinearGradient(x0, y0, x1, y1);
        ray.addColorStop(0,   "rgba(100,160,255,0.04)");
        ray.addColorStop(0.6, "rgba(80, 130,255,0.015)");
        ray.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        // Wide cone: two offset points at the far end
        const spread = 0.22;
        const cx1 = x0 + Math.cos(angle - spread) * len;
        const cy1 = y0 + Math.sin(angle - spread) * len;
        const cx2 = x0 + Math.cos(angle + spread) * len;
        const cy2 = y0 + Math.sin(angle + spread) * len;
        ctx.lineTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.closePath();
        ctx.fillStyle = ray;
        ctx.fill();
      }

      // ── Floating particles ──────────────────────────────────────────
      for (const p of particles) {
        // Gentle drift
        p.x += p.vx * p.speed;
        p.y += p.vy * p.speed;
        p.phase += 0.008 * p.speed;

        // Wrap edges
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        // Distance from mouse — particles near cursor glow brighter
        const dx = (lmx * W) - p.x;
        const dy = (lmy * H) - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const proximity = Math.max(0, 1 - dist / 320);
        const op = p.opacity + proximity * 0.35 + Math.sin(p.phase) * 0.04;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + proximity * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140,190,255,${Math.min(op, 0.75)})`;
        ctx.fill();

        // Draw faint connection lines between nearby particles
        for (const q of particles) {
          if (q === p) continue;
          const ex = q.x - p.x;
          const ey = q.y - p.y;
          const ed = Math.sqrt(ex * ex + ey * ey);
          if (ed < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(120,170,255,${0.06 * (1 - ed / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      resizeObs.disconnect();
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <>
      {/* CSS animated gradient blobs */}
      <div className={styles.mesh}>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      {/* Particle / light-ray canvas */}
      <canvas
        ref={canvasRef}
        className={styles.atmosphereCanvas}
        aria-hidden="true"
      />
    </>
  );
}
