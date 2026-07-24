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

        // Reduce WebGL pixel ratio so the GPU renders a smaller texture —
        // this is the same fix applied to SplashCursor (DYE_RESOLUTION 1440→512)
        // and ProjectWorld (dpr [0.4, 0.8]): lower resolution = less compositor
        // pressure = cursor events processed on time = 1:1 mouse response.
        if (app.renderer) {
          app.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 1.0));
        }

        // Throttle the CDN library's internal animation loop to ~30 fps.
        // The original loop runs at full 60 fps and, combined with the 3× clock
        // speed below, was consuming 16 ms of every frame — starving pointer events.
        // We replace setAnimationLoop with a 30-fps-gated version so the main
        // thread has a guaranteed ~33 ms window for input handling.
        if (app.renderer && app.renderer.setAnimationLoop) {
          const _origSetLoop = app.renderer.setAnimationLoop.bind(app.renderer);
          app.renderer.setAnimationLoop = function(cb) {
            if (!cb) { _origSetLoop(null); return; }
            let _lastT = 0;
            _origSetLoop(function(t, frame) {
              if (t - _lastT < 33) return; // ~30 fps gate
              _lastT = t;
              cb(t, frame);
            });
          };
          // Re-trigger so the library picks up the wrapped loop
          // (the library called setAnimationLoop during init — we patch after,
          //  so we need to restart with the current callback if possible).
          // If app.renderer.animation exists (Three.js r152+) we can restart.
          if (app.renderer.animation && app.renderer.animation.isAnimating) {
            app.renderer.setAnimationLoop(
              app.renderer.animation.context || null
            );
          }
        }

        // Slow the clock multiplier: was 3× (every frame advanced 50 ms of sim
        // time), now 1× — normal wall-clock speed. The animation still moves
        // but with 3× less simulation work per rendered frame.
        if (app.clock) {
          const startReal = performance.now();
          const SPEED = 1.0;
          app.clock.getElapsedTime = () =>
            ((performance.now() - startReal) / 1000) * SPEED;
          app.clock.getDelta = () => (1 / 60) * SPEED;
        }

        window.__liquidApp = app;
      }
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
      style={{ fontFamily: '"Montserrat", serif', zIndex: 1 }}
    >
      <canvas ref={canvasRef} id="liquid-canvas" className="absolute inset-0 w-full h-full" />
    </div>
  )
}

declare global {
  interface Window {
    __liquidApp?: any
  }
}
