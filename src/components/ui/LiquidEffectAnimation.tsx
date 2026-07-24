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
      // High-DPR screens (2×, 3×) multiply fill-rate cost — this is the
      // single biggest GPU win without any visual quality loss at canvas size.
      if (app.renderer) {
        app.renderer.setPixelRatio(1);
        app.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight, false);
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
