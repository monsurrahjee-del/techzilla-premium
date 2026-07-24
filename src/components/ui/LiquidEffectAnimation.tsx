"use client"

import { useEffect, useRef } from "react"

export function LiquidEffectAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const script = document.createElement("script")
    script.type = "module"
    script.textContent = `
      import LiquidBackground from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.22/build/backgrounds/liquid1.min.js';

      const canvas = document.getElementById('liquid-canvas');
      if (!canvas) return;

      const app = LiquidBackground(canvas);

      // ── Material tweaks ────────────────────────────────────────────────────
      app.liquidPlane.material.metalness = 0.75;
      app.liquidPlane.material.roughness = 0.25;
      app.liquidPlane.uniforms.displacementScale.value = 5;
      app.setRain(false);

      // ── Performance: render at 1× pixel ratio regardless of device DPR ────
      // High-DPR screens (2×, 3×) quadruple/nonuple the fill-rate cost.
      // Rendering at 1× and letting CSS scale is the single biggest GPU win.
      if (app.renderer) {
        app.renderer.setPixelRatio(1);
        app.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight, false);
      }

      // ── Speed up animation 3× with a real-delta clock override ────────────
      // Using a fixed delta (1/60 * SPEED) causes stutter on slow frames
      // because physics advances faster than actual elapsed time.
      // Real delta keeps the animation smooth at any frame rate.
      if (app.clock) {
        const SPEED = 3.0;
        let lastRealTime = performance.now();

        app.clock.getElapsedTime = (() => {
          let elapsed = 0;
          let last = performance.now();
          return () => {
            const now = performance.now();
            elapsed += ((now - last) / 1000) * SPEED;
            last = now;
            return elapsed;
          };
        })();

        app.clock.getDelta = () => {
          const now = performance.now();
          const dt  = Math.min((now - lastRealTime) / 1000, 0.05); // cap at 50ms
          lastRealTime = now;
          return dt * SPEED;
        };
      }

      window.__liquidApp = app;
    `
    document.body.appendChild(script)

    return () => {
      if (window.__liquidApp && window.__liquidApp.dispose) {
        window.__liquidApp.dispose()
      }
      window.__liquidApp = undefined
      try { document.body.removeChild(script) } catch (_) {}
    }
  }, [])

  return (
    <div
      className="absolute inset-0 m-0 w-full h-full touch-none overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <canvas
        ref={canvasRef}
        id="liquid-canvas"
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: "auto" }}
      />
    </div>
  )
}

declare global {
  interface Window {
    __liquidApp?: any
  }
}
