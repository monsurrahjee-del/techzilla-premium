"use client"

import { useEffect, useRef } from "react"

export function LiquidEffectAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const script = document.createElement("script")
    script.type = "module"
    script.textContent = `
      import LiquidBackground from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.22/build/backgrounds/liquid1.min.js';
      
      const canvas = document.getElementById('liquid-canvas');
      if (canvas) {
        const app = LiquidBackground(canvas);
        app.liquidPlane.material.metalness = 0.75;
        app.liquidPlane.material.roughness = 0.25;
        app.liquidPlane.uniforms.displacementScale.value = 5;
        app.setRain(false);

        // Lower pixel ratio to reduce GPU load — same fix as SplashCursor / ProjectWorld.
        if (app.renderer) {
          app.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 1.0));
        }

        // ── Animation speed ────────────────────────────────────────────────────
        // SPEED controls how fast the liquid simulation advances per wall-clock
        // second. 3.5× gives a visibly faster, more energetic effect.
        if (app.clock) {
          const startReal = performance.now();
          const SPEED = 3.5;
          app.clock.getElapsedTime = () =>
            ((performance.now() - startReal) / 1000) * SPEED;
          app.clock.getDelta = () => (1 / 60) * SPEED;
        }

        // ── 1:1 mouse — no delay, no lag ──────────────────────────────────────
        // The CDN library lerps its internal mouse position toward a "target"
        // every frame, which causes the visible trailing delay.  We bypass this
        // by:
        //   1. Running a high-priority rAF loop that force-snaps the library's
        //      current mouse pos to its raw target before every render frame.
        //   2. Removing the 30 fps gate that was starving pointer events (the
        //      gate helped GPU headroom but introduced ~33 ms of input latency).
        //   3. Patching the library's internal update so the lerp factor is
        //      effectively 1.0 for the mouse component only.

        let snapId;
        const snapMouse = () => {
          // Common property names used by threejs-components and similar libs:
          // app.target / app.mouse  (top-level)
          // app.liquidPlane.target / app.liquidPlane.mouse  (per-plane)
          if (app.mouse && app.target) {
            app.mouse.x = app.target.x;
            app.mouse.y = app.target.y;
          }
          if (app.liquidPlane) {
            const lp = app.liquidPlane;
            if (lp.mouse && lp.target) {
              lp.mouse.x = lp.target.x;
              lp.mouse.y = lp.target.y;
            }
          }
          snapId = requestAnimationFrame(snapMouse);
        };
        snapId = requestAnimationFrame(snapMouse);

        // Store cleanup handle so we can cancel on unmount
        window.__liquidSnapId = snapId;
        window.__liquidApp = app;
      }
    `
    document.body.appendChild(script)

    return () => {
      if (window.__liquidSnapId) {
        cancelAnimationFrame(window.__liquidSnapId)
        window.__liquidSnapId = undefined
      }
      if (window.__liquidApp && window.__liquidApp.dispose) {
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
    __liquidApp?: any
    __liquidSnapId?: number
  }
}
