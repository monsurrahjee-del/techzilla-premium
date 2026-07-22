"use client";

import React, {
  useRef, useEffect, useState,
  createElement, useMemo, memo,
} from "react";

export enum Tag {
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  P = "p",
}

type VaporizeTextCycleProps = {
  texts: string[];
  font?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: number;
  };
  color?: string;
  spread?: number;
  density?: number;
  animation?: {
    vaporizeDuration?: number;
    fadeInDuration?: number;
    waitDuration?: number;
  };
  direction?: "left-to-right" | "right-to-left";
  alignment?: "left" | "center" | "right";
  tag?: Tag;
  /** Called once after ALL texts have been shown & vaporised (one full cycle). */
  onComplete?: () => void;
  /** Skip the IntersectionObserver check — always treat the component as in-view. */
  forceActive?: boolean;
};

export default function VaporizeTextCycle({
  texts = ["Next.js", "React"],
  font = { fontFamily: "sans-serif", fontSize: "50px", fontWeight: 400 },
  color = "rgb(255, 255, 255)",
  spread = 5,
  density = 5,
  animation = { vaporizeDuration: 2, fadeInDuration: 1, waitDuration: 0.5 },
  direction = "left-to-right",
  alignment = "center",
  tag = Tag.P,
  onComplete,
  forceActive = false,
}: VaporizeTextCycleProps) {
  const canvasRef      = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef     = useRef<HTMLDivElement | null>(null);
  const onCompleteRef  = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const _isInView  = useIsInView(wrapperRef as React.RefObject<HTMLElement>);
  const isInView   = _isInView || forceActive;

  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 });

  // Cap DPR at 2 to keep particle counts manageable
  const globalDpr = useMemo(() => {
    if (typeof window !== "undefined") return Math.min(window.devicePixelRatio || 1, 2);
    return 1;
  }, []);

  const durations = useMemo(() => ({
    VAPORIZE: (animation.vaporizeDuration ?? 2) * 1000,
    FADE_IN:  (animation.fadeInDuration  ?? 1) * 1000,
    WAIT:     (animation.waitDuration    ?? 0.5) * 1000,
  }), [animation.vaporizeDuration, animation.fadeInDuration, animation.waitDuration]);

  // ── Start / stop worker when visibility changes ───────────────────────────
  useEffect(() => {
    if (!isInView || !wrapperSize.width || !wrapperSize.height) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size the canvas to match wrapper
    canvas.style.width  = `${wrapperSize.width}px`;
    canvas.style.height = `${wrapperSize.height}px`;
    canvas.width  = Math.floor(wrapperSize.width  * globalDpr);
    canvas.height = Math.floor(wrapperSize.height * globalDpr);

    // OffscreenCanvas + worker path intentionally disabled.
    //
    // Root cause: when a CSS `filter` (even `drop-shadow`) is applied to an
    // ancestor element, the browser rasterises the subtree into an offscreen
    // intermediate buffer before compositing.  OffscreenCanvas content is
    // composited at the GPU layer, AFTER that intermediate buffer is captured,
    // so the worker's pixels never make it into the filter output — the canvas
    // appears completely blank to the user even though the worker is drawing
    // correctly.  The animation also only plays once per session and lasts ~5 s,
    // so there is no meaningful performance gain from the worker path anyway.
    //
    // The main-thread fallback below is throttled to 30 fps and is fully
    // adequate.  Do not re-enable the OffscreenCanvas path without first moving
    // the canvas element outside any ancestor that applies a CSS filter.

    // ── Main-thread rendering (reliable across all browsers) ─────────────────
    // Throttled to 30 fps so it doesn't dominate input event processing.
    const MIN_FRAME_MS = 1000 / 30;
    let rafId: number;
    let lastTime = performance.now();
    let done = false;
    let currentIdx = 0;
    let animState: "static" | "vaporizing" | "fadingIn" | "waiting" = "fadingIn";
    let vaporizeProgress = 0;
    let fadeOpacity = 0;
    let particles: FallbackParticle[] = [];
    let textBoundaries: { left: number; right: number; width: number } | null = null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const transformedDensity = transformValue(density, [0, 10], [0.3, 1], true);
    const rawFz = font.fontSize || "50px";
    let sz: number;
    if (rawFz.endsWith("vw")) sz = Math.round(parseFloat(rawFz) * 10);
    else if (rawFz.endsWith("rem")) sz = Math.round(parseFloat(rawFz) * 16);
    else sz = parseInt(rawFz) || 50;
    const sp       = calculateVaporizeSpread(sz);
    const MULT     = sp * spread;
    const fontStr  = `${font.fontWeight ?? 400} ${sz * globalDpr}px ${font.fontFamily ?? "sans-serif"}`;
    const colorStr = parseColor(color);

    function drawFallbackText(idx: number) {
      if (!ctx) return;
      const tX = alignment === "center" ? canvas!.width / 2
               : alignment === "left"   ? 0
               : canvas!.width;
      const tY = canvas!.height / 2;
      const text = texts[idx] || texts[0];
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.fillStyle = colorStr;
      ctx.font = fontStr;
      ctx.textAlign = alignment;
      ctx.textBaseline = "middle";
      const metrics = ctx.measureText(text);
      const tw = metrics.width;
      let tl = alignment === "center" ? tX - tw / 2 : alignment === "left" ? tX : tX - tw;
      textBoundaries = { left: tl, right: tl + tw, width: tw };
      ctx.fillText(text, tX, tY);
      const imgData = ctx.getImageData(0, 0, canvas!.width, canvas!.height);
      const data = imgData.data;
      const sr = Math.max(2, Math.round(globalDpr));
      particles = [];
      for (let y = 0; y < canvas!.height; y += sr) {
        for (let x = 0; x < canvas!.width; x += sr) {
          const i = (y * canvas!.width + x) * 4;
          const a = data[i + 3];
          if (a > 0) {
            const oa = Math.min(1, (a / 255) * 3);
            particles.push({ x, y, ox: x, oy: y, r: data[i], g: data[i+1], b: data[i+2], opacity: oa, oa, vx: 0, vy: 0, angle: 0, speed: 0 });
          }
        }
      }
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
    }

    drawFallbackText(0);

    const animate = (now: number) => {
      const elapsed = now - lastTime;
      if (elapsed < MIN_FRAME_MS) { rafId = requestAnimationFrame(animate); return; }
      const dt = elapsed / 1000;
      lastTime = now;
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      if (animState === "static" || animState === "waiting") {
        renderFallback(ctx, particles, globalDpr);
      } else if (animState === "fadingIn") {
        if (done) {
          ctx.save(); ctx.scale(globalDpr, globalDpr);
          let any = false;
          for (const p of particles) {
            p.opacity = Math.max(0, p.opacity - dt * 3);
            if (p.opacity > 0) { any = true; ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`; ctx.fillRect(p.x / globalDpr, p.y / globalDpr, 1.5, 1.5); }
          }
          ctx.restore();
          if (!any) return; // stop
        } else {
          fadeOpacity += dt * 1000 / durations.FADE_IN;
          ctx.save(); ctx.scale(globalDpr, globalDpr);
          for (const p of particles) {
            p.x = p.ox; p.y = p.oy;
            const op = Math.min(fadeOpacity, 1) * p.oa;
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${op})`;
            ctx.fillRect(p.x / globalDpr, p.y / globalDpr, 1.5, 1.5);
          }
          ctx.restore();
          if (fadeOpacity >= 1) {
            animState = "waiting";
            setTimeout(() => { animState = "vaporizing"; vaporizeProgress = 0; resetFallback(particles); }, durations.WAIT);
          }
        }
      } else if (animState === "vaporizing") {
        if (!textBoundaries) { rafId = requestAnimationFrame(animate); return; }
        vaporizeProgress += dt * 100 / (durations.VAPORIZE / 1000);
        const prog = Math.min(100, vaporizeProgress);
        const vX = direction === "left-to-right"
          ? textBoundaries.left + textBoundaries.width * prog / 100
          : textBoundaries.right - textBoundaries.width * prog / 100;
        const allDone = updateFallback(particles, vX, dt, MULT, durations.VAPORIZE, direction, transformedDensity);
        renderFallback(ctx, particles, globalDpr);
        if (vaporizeProgress >= 100 && allDone) {
          const nextIdx = (currentIdx + 1) % texts.length;
          if (nextIdx === 0 && !done) {
            done = true;
            setTimeout(() => onCompleteRef.current?.(), durations.FADE_IN);
          } else if (!done) {
            currentIdx = nextIdx;
            drawFallbackText(nextIdx);
          }
          animState = "fadingIn"; fadeOpacity = 0;
        }
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, wrapperSize.width, wrapperSize.height]);

  // Resize observer
  useEffect(() => {
    const container = wrapperRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setWrapperSize({ width, height });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapperRef.current]);

  // Initial size
  useEffect(() => {
    if (wrapperRef.current) {
      const r = wrapperRef.current.getBoundingClientRect();
      setWrapperSize({ width: r.width, height: r.height });
    }
  }, []);

  const wrapperStyle = useMemo(() => ({ width: "100%", height: "100%", pointerEvents: "none" as const }), []);
  const canvasStyle  = useMemo(() => ({ minWidth: "30px", minHeight: "20px", pointerEvents: "none" as const }), []);

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      <canvas ref={canvasRef} style={canvasStyle} />
      <SeoEl tag={tag} texts={texts} />
    </div>
  );
}

// ── SEO ───────────────────────────────────────────────────────────────────────
const SeoEl = memo(({ tag = Tag.P, texts }: { tag: Tag; texts: string[] }) => {
  const style = useMemo(() => ({
    position: "absolute" as const, width: "0", height: "0",
    overflow: "hidden", userSelect: "none" as const, pointerEvents: "none" as const,
  }), []);
  const safeTag = Object.values(Tag).includes(tag) ? tag : "p";
  return createElement(safeTag, { style }, texts?.join(" ") ?? "");
});
SeoEl.displayName = "SeoEl";

// ── Fallback particle type (main-thread path) ─────────────────────────────────
interface FallbackParticle {
  x: number; y: number; ox: number; oy: number;
  r: number; g: number; b: number;
  opacity: number; oa: number;
  vx: number; vy: number; angle: number; speed: number;
  shouldFadeQuickly?: boolean;
}

function renderFallback(ctx: CanvasRenderingContext2D, particles: FallbackParticle[], dpr: number) {
  ctx.save(); ctx.scale(dpr, dpr);
  for (const p of particles) {
    if (p.opacity > 0) {
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
      ctx.fillRect(p.x / dpr, p.y / dpr, 1.5, 1.5);
    }
  }
  ctx.restore();
}

function resetFallback(particles: FallbackParticle[]) {
  for (const p of particles) { p.x = p.ox; p.y = p.oy; p.opacity = p.oa; p.speed = 0; p.vx = 0; p.vy = 0; }
}

function updateFallback(particles: FallbackParticle[], vX: number, dt: number, MULT: number, VAPORIZE: number, direction: string, density: number): boolean {
  let allDone = true;
  for (const p of particles) {
    const hit = direction === "left-to-right" ? p.ox <= vX : p.ox >= vX;
    if (hit) {
      if (p.speed === 0) {
        p.angle = Math.random() * Math.PI * 2; p.speed = (Math.random() * 1 + 0.5) * MULT;
        p.vx = Math.cos(p.angle) * p.speed; p.vy = Math.sin(p.angle) * p.speed;
        p.shouldFadeQuickly = Math.random() > density;
      }
      if (p.shouldFadeQuickly) {
        p.opacity = Math.max(0, p.opacity - dt * 2);
      } else {
        const dx = p.ox - p.x, dy = p.oy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const damp = Math.max(0.95, 1 - dist / (100 * MULT));
        const rnd  = MULT * 3;
        p.vx = (p.vx + (Math.random() - 0.5) * rnd + dx * 0.002) * damp;
        p.vy = (p.vy + (Math.random() - 0.5) * rnd + dy * 0.002) * damp;
        const maxV = MULT * 2;
        const cur  = Math.sqrt(p.vx ** 2 + p.vy ** 2);
        if (cur > maxV) { p.vx *= maxV / cur; p.vy *= maxV / cur; }
        p.x += p.vx * dt * 20; p.y += p.vy * dt * 10;
        const fr = Math.max(0.5, 0.5 * (2000 / VAPORIZE) * (MULT / 9));
        p.opacity = Math.max(0, p.opacity - dt * fr);
      }
      if (p.opacity > 0.01) allDone = false;
    } else allDone = false;
  }
  return allDone;
}

// ── shared helpers ─────────────────────────────────────────────────────────────
function calculateVaporizeSpread(sz: number): number {
  const pts = [
    { size: 20,  spread: 0.2 },
    { size: 50,  spread: 0.5 },
    { size: 100, spread: 1.5 },
    { size: 200, spread: 3.5 },
    { size: 400, spread: 7.0 },
  ];
  if (sz <= pts[0].size) return pts[0].spread;
  if (sz >= pts[pts.length - 1].size) return pts[pts.length - 1].spread;
  let i = 0;
  while (i < pts.length - 1 && pts[i + 1].size < sz) i++;
  return pts[i].spread + (sz - pts[i].size) *
    (pts[i + 1].spread - pts[i].spread) / (pts[i + 1].size - pts[i].size);
}

function parseColor(color: string): string {
  const rgba = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (rgba) return `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${rgba[4]})`;
  const rgb  = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgb)  return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},1)`;
  return "rgba(0,0,0,1)";
}

function transformValue(input: number, inR: number[], outR: number[], clamp = false): number {
  const progress = (input - inR[0]) / (inR[1] - inR[0]);
  let result = outR[0] + progress * (outR[1] - outR[0]);
  if (clamp) {
    if (outR[1] > outR[0]) result = Math.min(Math.max(result, outR[0]), outR[1]);
    else result = Math.min(Math.max(result, outR[1]), outR[0]);
  }
  return result;
}

function useIsInView(ref: React.RefObject<HTMLElement>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0, rootMargin: "50px" });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}
