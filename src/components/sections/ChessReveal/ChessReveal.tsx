"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import styles from "./ChessReveal.module.css";

export interface ChessRevealHandle {
  activate: () => void;
  deactivate: () => void;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function invlerp(a: number, b: number, v: number) {
  return clamp((v - a) / (b - a), 0, 1);
}
function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
function easeOut(t: number) {
  return 1 - (1 - t) * (1 - t);
}

/* ─── Draw a chess piece image onto canvas ───────────────────────────────── */
function drawPieceImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  size: number,       // desired height in px
  alpha: number,
  removeBlackBg: boolean
) {
  if (alpha <= 0 || size <= 0 || !img.complete || img.naturalWidth === 0) return;

  const aspect = img.naturalWidth / img.naturalHeight;
  const h = size;
  const w = h * aspect;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (removeBlackBg) {
    // "screen" blend: black (0,0,0) + anything = anything → black bg disappears
    ctx.globalCompositeOperation = "screen";
  }

  ctx.drawImage(img, cx - w * 0.5, cy - h * 0.5, w, h);
  ctx.restore();
}

/* ─── Dark grid background ───────────────────────────────────────────────── */
function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.30;
  ctx.strokeStyle = "#1a2a40";
  ctx.lineWidth = 0.5;
  const cell = Math.min(w, h) / 12;
  for (let x = 0; x <= w; x += cell) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += cell) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.globalAlpha = alpha * 0.42;
  ctx.strokeStyle = "#2a4060";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += cell) {
    for (let y = 0; y <= h; y += cell) {
      const s = 4;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    }
  }
  ctx.restore();
}

/* ─── Hyperspeed warp lines ──────────────────────────────────────────────── */
const LINE_SEEDS = Array.from({ length: 240 }, (_, i) => ({
  angle:    (i / 240) * Math.PI * 2 + (i % 7) * 0.013,
  speed:    0.22 + (i % 5) * 0.14,
  width:    0.7  + (i % 4) * 0.55,
  phase:    (i * 0.618033) % 1,
  colorIdx: i % 5,
}));
const LINE_COLORS = ["#00e5ff", "#1a80e5", "#9f55ff", "#ff44cc", "#00ffaa"];

function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  progress: number, time: number
) {
  if (progress <= 0) return;
  const maxDist = Math.hypot(w, h) * 0.62;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const seed of LINE_SEEDS) {
    const t         = (seed.phase + time * seed.speed * 0.08) % 1;
    const startDist = t * maxDist * progress;
    const endDist   = Math.min(startDist + maxDist * (0.09 + seed.speed * 0.11) * progress, maxDist * 1.05);
    if (endDist <= startDist) continue;
    const cos = Math.cos(seed.angle), sin = Math.sin(seed.angle);
    const a   = clamp(progress, 0, 1) * (0.28 + 0.50 * ease(t));
    ctx.beginPath();
    ctx.moveTo(cx + cos * startDist, cy + sin * startDist);
    ctx.lineTo(cx + cos * endDist,   cy + sin * endDist);
    ctx.strokeStyle = LINE_COLORS[seed.colorIdx];
    ctx.globalAlpha = a;
    ctx.lineWidth   = seed.width * (0.5 + progress * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/* ─── Glowing orbit rings ────────────────────────────────────────────────── */
function drawRings(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  progress: number, time: number
) {
  if (progress <= 0) return;
  ctx.save();
  const base = Math.min(ctx.canvas.width, ctx.canvas.height) * 0.5;
  const rings = [
    { rx: 0.38, ry: 0.10, spd:  0.18, color: "#d4ff00", lw: 2.2 },
    { rx: 0.55, ry: 0.14, spd: -0.13, color: "#00eaff", lw: 1.5 },
    { rx: 0.68, ry: 0.18, spd:  0.09, color: "#8040ff", lw: 1.8 },
    { rx: 0.82, ry: 0.22, spd: -0.07, color: "#ff44aa", lw: 1.2 },
  ];
  rings.forEach((r, i) => {
    const rot = time * r.spd + i * 0.6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, base * r.rx * progress, base * r.ry * progress, 0, 0, Math.PI * 2);
    ctx.strokeStyle = r.color;
    ctx.lineWidth   = r.lw;
    ctx.globalAlpha = 0.65 * progress;
    ctx.shadowColor = r.color;
    ctx.shadowBlur  = 10;
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

/* ─── Blue radial fill ───────────────────────────────────────────────────── */
function drawBlueFill(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  progress: number
) {
  if (progress <= 0) return;
  const maxR = Math.hypot(w, h);
  const r    = maxR * easeOut(progress);
  const g    = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0,   `rgba(20,120,255,${(progress * 0.95).toFixed(3)})`);
  g.addColorStop(0.5, `rgba(10,70,200,${(progress * 0.90).toFixed(3)})`);
  g.addColorStop(1,   `rgba(0,30,120,${(progress * 0.85).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* ─── Manifesto phrases ──────────────────────────────────────────────────── */
const PHRASES = [
  "Building tomorrow's\ndigital products.",
  "Independent by\ndesign & engineering.",
  "Clarity first.\nDelight second.",
  "Ship in small loops.\nAim for long arcs.",
];
const PHRASE_POS = [
  { ax: 0.72, ay: 0.30, align: "left"  as CanvasTextAlign },
  { ax: 0.70, ay: 0.60, align: "left"  as CanvasTextAlign },
  { ax: 0.08, ay: 0.38, align: "left"  as CanvasTextAlign },
  { ax: 0.08, ay: 0.65, align: "left"  as CanvasTextAlign },
];

function drawPhrases(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) {
  if (progress <= 0) return;
  const fs = Math.round(clamp(w * 0.020, 13, 24));
  ctx.save();
  ctx.font = `400 ${fs}px 'Inter','Helvetica Neue',sans-serif`;
  PHRASES.forEach((phrase, i) => {
    const delay = i * 0.12;
    const a     = ease(clamp((progress - delay) / 0.4, 0, 1));
    if (a <= 0) return;
    const p = PHRASE_POS[i];
    ctx.textAlign = p.align;
    phrase.split("\n").forEach((line, li) => {
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle   = "#ffffff";
      ctx.fillText(line, w * p.ax, h * p.ay + li * fs * 1.38);
    });
  });
  ctx.restore();
}

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  text: string,
  progress: number,
  yFrac = 0.50
) {
  if (progress <= 0) return;
  const fs = Math.round(clamp(w * 0.068, 34, 104));
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.font         = `900 ${fs}px 'Inter','Helvetica Neue',Arial,sans-serif`;
  ctx.globalAlpha  = ease(progress);
  const lines  = text.split("\n");
  const lineH  = fs * 1.10;
  const startY = h * yFrac - (lines.length * lineH) * 0.5 + lineH * 0.5;
  lines.forEach((line, li) => {
    ctx.shadowColor = "rgba(0,60,180,0.55)";
    ctx.shadowBlur  = 28;
    ctx.fillStyle   = "#ffffff";
    ctx.fillText(line, w * 0.5, startY + li * lineH);
    ctx.shadowBlur  = 0;
  });
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────────────────────── */
const ChessReveal = forwardRef<ChessRevealHandle>((_, ref) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const pawnImgRef = useRef<HTMLImageElement | null>(null);
  const queenImgRef = useRef<HTMLImageElement | null>(null);
  const stateRef   = useRef({
    active:        false,
    virtualScroll: 0,
    time:          0,
    rafId:         0,
    lastTs:        0,
  });

  const TOTAL_VIRTUAL = 5000;

  /* Slide wrap up/down ─────────────────────────────────────────────────── */
  const slideIn = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.style.transition    = "transform 0.65s cubic-bezier(0.32,0,0.12,1)";
    wrap.style.transform     = "translateY(0%)";
    wrap.style.pointerEvents = "all";
  };
  const slideOut = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.style.transition    = "transform 0.55s cubic-bezier(0.32,0,0.12,1)";
    wrap.style.transform     = "translateY(100%)";
    wrap.style.pointerEvents = "none";
  };

  useImperativeHandle(ref, () => ({
    activate() {
      const s = stateRef.current;
      if (s.active) return;
      s.active        = true;
      s.virtualScroll = 0;
      slideIn();
    },
    deactivate() {
      stateRef.current.active = false;
      slideOut();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    /* Pre-load chess piece images ──────────────────────────────────────── */
    const pawnImg  = new Image();
    const queenImg = new Image();
    pawnImg.src    = "/chess/pawn.png";   // silver pawn, black bg → screen blend
    queenImg.src   = "/chess/queen.png";  // gold queen, black bg → screen blend
    pawnImgRef.current  = pawnImg;
    queenImgRef.current = queenImg;

    /* Resize ──────────────────────────────────────────────────────────── */
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = window.innerWidth, H = window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + "px";
      canvas.style.height = H + "px";
      const c = canvas.getContext("2d");
      if (c) { c.setTransform(1, 0, 0, 1, 0, 0); c.scale(dpr, dpr); }
    };
    resize();
    window.addEventListener("resize", resize);

    /* Scroll accumulation ─────────────────────────────────────────────── */
    const onWheel = (e: WheelEvent) => {
      if (!s.active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      s.virtualScroll = clamp(s.virtualScroll + delta, 0, TOTAL_VIRTUAL);

      // Scroll up at start → dismiss (slide back down)
      if (s.virtualScroll <= 0 && delta < 0) {
        s.active = false;
        slideOut();
        window.dispatchEvent(new CustomEvent("chess-reveal-dismissed"));
      }

      // Reach the end → auto-dismiss
      if (s.virtualScroll >= TOTAL_VIRTUAL) {
        setTimeout(() => {
          s.active = false;
          slideOut();
          window.dispatchEvent(new CustomEvent("chess-reveal-complete"));
        }, 600);
      }
    };

    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (!s.active) return;
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!s.active) return;
      e.preventDefault();
      const dy = touchY - (e.touches[0]?.clientY ?? 0);
      touchY   = e.touches[0]?.clientY ?? 0;
      s.virtualScroll = clamp(s.virtualScroll + dy * 3, 0, TOTAL_VIRTUAL);
    };

    window.addEventListener("wheel",      onWheel,      { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: false, capture: true });

    /* Render loop ─────────────────────────────────────────────────────── */
    const tick = (ts: number) => {
      s.rafId = requestAnimationFrame(tick);
      if (!s.active && s.virtualScroll <= 0) { s.lastTs = ts; return; }

      const dt = Math.min((ts - (s.lastTs || ts)) / 1000, 0.05);
      s.lastTs  = ts;
      s.time   += dt;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = window.innerWidth, H = window.innerHeight;
      const cx = W * 0.5, cy = H * 0.5;

      ctx.clearRect(0, 0, W, H);

      const p = s.virtualScroll / TOTAL_VIRTUAL; // 0 → 1

      // ── Phase breakpoints ────────────────────────────────────────────
      // 0.00–0.08  dark intro, piece appears
      // 0.08–0.48  piece grows, warp lines build
      // 0.48–0.64  pawn → queen morph, blue fills
      // 0.64–0.78  full blue, headline
      // 0.78–0.90  rings + manifesto phrases
      // 0.90–1.00  final "Your satisfaction always"

      const introP    = ease(invlerp(0.00, 0.08, p));
      const growP     = ease(invlerp(0.08, 0.48, p));
      const morphP    = ease(invlerp(0.48, 0.64, p));   // 0=pawn, 1=queen
      const blueP     = ease(invlerp(0.52, 0.74, p));
      const linesP    = ease(invlerp(0.44, 0.82, p));
      const headlineP = ease(invlerp(0.62, 0.76, p));
      const ringsP    = ease(invlerp(0.74, 0.88, p));
      const phrasesP  = ease(invlerp(0.76, 1.00, p));
      const finalP    = ease(invlerp(0.88, 0.98, p));

      // Background
      ctx.fillStyle = "#05080f";
      ctx.fillRect(0, 0, W, H);

      // Grid (fades out as blue fills)
      drawGrid(ctx, W, H, introP * (1 - blueP * 0.92));

      // Warp speed lines
      drawSpeedLines(ctx, cx, cy, W, H, linesP, s.time);

      // Blue fill
      drawBlueFill(ctx, cx, cy, W, H, blueP);

      // Orbit rings (above blue)
      drawRings(ctx, cx, cy, ringsP, s.time);

      // ── Chess pieces (image-based) ─────────────────────────────────
      // Size: starts ~5% of screen, grows to ~55% height
      const maxH   = H * 0.55;
      const minH   = maxH * 0.050;
      const sizeT  = ease(clamp(growP + morphP * 0.28, 0, 1));
      const pieceH = minH + (maxH - minH) * sizeT;

      const pawn  = pawnImgRef.current;
      const queen = queenImgRef.current;

      // Pawn fades out as morphP → 1
      // pawn.png has a black bg → use screen blend to remove it
      if (morphP < 1 && pawn) {
        drawPieceImage(ctx, pawn, cx, cy, pieceH, introP * (1 - morphP), true);
      }

      // Queen fades in as morphP → 1
      // queen.png has black background → use "screen" to remove it
      if (morphP > 0 && queen) {
        const queenAlpha = introP * Math.min(1, morphP * 1.6);
        drawPieceImage(ctx, queen, cx, cy, pieceH, queenAlpha, true);
      }

      // Main headline
      if (headlineP > 0) drawHeadline(ctx, W, H, "TURN YOUR\nDREAMS TO\nREALITY", headlineP, 0.50);

      // Manifesto phrases
      if (phrasesP > 0) drawPhrases(ctx, W, H, phrasesP);

      // Final screen
      if (finalP > 0) {
        ctx.save();
        ctx.globalAlpha = finalP * 0.75;
        ctx.fillStyle   = "#05080f";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        drawRings(ctx, cx, cy, 1, s.time);
        drawSpeedLines(ctx, cx, cy, W, H, 0.30, s.time * 0.6);
        drawHeadline(ctx, W, H, "YOUR SATISFACTION\nALWAYS", finalP, 0.44);

        // Small queen below text
        if (queen) drawPieceImage(ctx, queen, cx, cy + H * 0.27, H * 0.18, finalP * 0.60, true);
      }
    };

    s.rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(s.rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("wheel",      onWheel,      { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove,  { capture: true } as EventListenerOptions);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      style={{ transform: "translateY(100%)", pointerEvents: "none", transition: "none" }}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
});

ChessReveal.displayName = "ChessReveal";
export default ChessReveal;
