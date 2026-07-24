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

      // ── Speed up animation and mouse tracking ──────────────────────────────
      // getDelta drives the liquid surface lerp toward the cursor each frame —
      // a larger value = faster response. getElapsedTime drives wave animation.
      // Keep them on COMPLETELY SEPARATE time trackers so whichever the library
      // calls first in a frame doesn't starve the other of elapsed time.
      if (app.clock) {
        const SPEED = 2.0;

        // getElapsedTime: wall-clock seconds * SPEED, no shared state
        const startReal = performance.now();
        app.clock.getElapsedTime = () =>
          ((performance.now() - startReal) / 1000) * SPEED;

        // getDelta: real frame delta with its own tracker, capped at 50 ms
        let lastDelta = performance.now();
        app.clock.getDelta = () => {
          const now = performance.now();
          const dt  = Math.min((now - lastDelta) / 1000, 0.05);
          lastDelta = now;
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
      />
    </div>
  )
}

declare global {
  interface Window {
    __liquidApp?: any
  }
}
