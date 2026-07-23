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

      // --- transparent background: show hero bg through the canvas ---
      if (app.renderer) {
        app.renderer.setClearColor(0x000000, 0);
        app.renderer.setClearAlpha(0);
      }
      if (app.scene) {
        app.scene.background = null;
      }

      // --- material tweaks ---
      app.liquidPlane.material.metalness = 0.85;
      app.liquidPlane.material.roughness = 0.15;
      app.liquidPlane.uniforms.displacementScale.value = 3;
      app.setRain(false);

      // --- make animation extremely slow (3% of real speed) ---
      if (app.clock) {
        const startReal = performance.now();
        const SPEED = 0.03; // 3 % — change this to taste
        app.clock.getElapsedTime = () =>
          ((performance.now() - startReal) / 1000) * SPEED;
        app.clock.getDelta = () => (1 / 60) * SPEED;
      }

      window.__liquidApp = app;
    `
    document.body.appendChild(script)

    return () => {
      if (window.__liquidApp && window.__liquidApp.dispose) {
        window.__liquidApp.dispose()
      }
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
        style={{ background: "transparent" }}
      />
    </div>
  )
}

declare global {
  interface Window {
    __liquidApp?: any
  }
}
