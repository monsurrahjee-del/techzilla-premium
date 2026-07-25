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
      app.liquidPlane.material.metalness = 0.75;
      app.liquidPlane.material.roughness = 0.25;
      app.liquidPlane.uniforms.displacementScale.value = 5;
      app.setRain(false);

      // Lower GPU load — same fix as SplashCursor / ProjectWorld.
      if (app.three?.renderer) {
        app.three.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 1.0));
      }

      // ── Faster animation ─────────────────────────────────────────────────────
      // The library calls liquidPlane.update() once per frame in its
      // onBeforeRender callback.  We wrap that callback to call update() two
      // more times, tripling the simulation speed so waves propagate visibly
      // faster without changing any visual parameters.
      if (app.three?.onBeforeRender) {
        const _orig = app.three.onBeforeRender.bind(app.three);
        app.three.onBeforeRender = function(frameData) {
          _orig(frameData);
          app.liquidPlane.update();
          app.liquidPlane.update();
        };
      }

      // ── 1:1 mouse response — no delay ────────────────────────────────────────
      // The library's internal onMove calls:
      //   liquidPlane.addDrop(nx, ny, 0.025, 0.0025)   ← strength 0.0025 is barely
      //   visible and feels like a ghost trail.
      //
      // We add our own pointermove listener that calls addDrop with 5× higher
      // strength (0.012) and a slightly wider radius (0.04).  The drop appears
      // immediately under the pointer with no delay — the simulation just needed
      // more energy to feel immediate.
      const _onMove = (e) => {
        const r = canvas.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right ||
            e.clientY < r.top  || e.clientY > r.bottom) return;
        const nx =  (e.clientX - r.left) / r.width  * 2 - 1;
        const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
        app.liquidPlane.addDrop(nx, ny, 0.04, 0.012);
      };
      document.body.addEventListener('pointermove', _onMove);

      window.__liquidApp     = app;
      window.__liquidCleanup = () =>
        document.body.removeEventListener('pointermove', _onMove);
    `
    document.body.appendChild(script)

    return () => {
      if (typeof window.__liquidCleanup === 'function') {
        window.__liquidCleanup()
        window.__liquidCleanup = undefined
      }
      if (window.__liquidApp?.dispose) {
        window.__liquidApp.dispose()
      }
      try { document.body.removeChild(script) } catch (_) {}
    }
  }, [])

  return (
    <div
      className="absolute inset-0 m-0 w-full h-full touch-none overflow-hidden pointer-events-none"
      style={{ fontFamily: '"Montserrat", serif', zIndex: 1 }}
    >
      <canvas ref={canvasRef} id="liquid-canvas" className="absolute inset-0 w-full h-full" />
    </div>
  )
}

declare global {
  interface Window {
    __liquidApp?:     any
    __liquidCleanup?: (() => void) | undefined
  }
}
