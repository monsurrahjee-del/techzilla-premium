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

      // ── Performance: render at 1× regardless of device DPR ────────────────
      if (app.renderer) {
        app.renderer.setPixelRatio(1);
        app.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight, false);
      }

      // ── Speed up animation + mouse tracking ───────────────────────────────
      // The library uses clock.getDelta() to lerp the liquid surface toward
      // the cursor position each frame. A larger delta = faster lerp = snappier
      // mouse response AND faster wave animation. SPEED of 2.0 gives a natural
      // feel without over-shooting. Real-delta (not fixed 1/60) keeps it smooth
      // at any frame rate.
      if (app.clock) {
        const SPEED = 2.0;
        let lastRealTime = performance.now();
        let elapsed = 0;

        app.clock.getDelta = () => {
          const now = performance.now();
          const dt  = Math.min((now - lastRealTime) / 1000, 0.05); // cap at 50ms
          lastRealTime = now;
          return dt * SPEED;
        };

        app.clock.getElapsedTime = () => {
          const now = performance.now();
          elapsed += Math.min((now - lastRealTime) / 1000, 0.05) * SPEED;
          lastRealTime = now;
          return elapsed;
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
      />
    </div>
  )
}

declare global {
  interface Window {
    __liquidApp?: any
  }
}
