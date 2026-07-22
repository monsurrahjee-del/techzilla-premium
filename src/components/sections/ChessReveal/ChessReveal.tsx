"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import styles from "./ChessReveal.module.css";

export interface ChessRevealHandle {
  activate: () => void;
  deactivate: () => void;
}

/* ─── Math helpers ──────────────────────────────────────────────────── */
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function invlerp(a: number, b: number, v: number) {
  return clamp((v - a) / (b - a), 0, 1);
}
function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/* ─── Draw dark grid background ─────────────────────────────────────── */
function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.35;
  ctx.strokeStyle = "#1a3a5c";
  ctx.lineWidth = 0.5;
  const cell = Math.min(w, h) / 10;
  for (let x = 0; x <= w; x += cell) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += cell) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  // Cross-hair dots
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = "#3a6090";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += cell) {
    for (let y = 0; y <= h; y += cell) {
      const s = 5;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    }
  }
  ctx.restore();
}

/* ─── Draw chess pawn ───────────────────────────────────────────────── */
function drawPawn(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number) {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  const g = ctx.createLinearGradient(-size * 0.3, -size * 0.55, size * 0.2, size * 0.55);
  g.addColorStop(0, "#7ddcff");
  g.addColorStop(0.25, "#2299ee");
  g.addColorStop(0.6, "#0055cc");
  g.addColorStop(1, "#002a66");
  ctx.fillStyle = g;

  const bw = size * 0.52, by = size * 0.38, bh = size * 0.11;
  // Base
  ctx.beginPath();
  ctx.moveTo(-bw, by + bh);
  ctx.bezierCurveTo(-bw, by, -bw * 0.85, by - bh * 0.5, -bw * 0.7, by - bh * 0.5);
  ctx.lineTo(bw * 0.7, by - bh * 0.5);
  ctx.bezierCurveTo(bw * 0.85, by - bh * 0.5, bw, by, bw, by + bh);
  ctx.closePath();
  ctx.fill();

  // Waist/stem
  const sw = size * 0.1, shTop = by - bh * 0.5 - size * 0.21;
  ctx.beginPath();
  ctx.rect(-sw, shTop, sw * 2, size * 0.21);
  ctx.fill();

  // Shoulder
  ctx.beginPath();
  ctx.ellipse(0, shTop, size * 0.25, size * 0.07, 0, Math.PI, 0);
  ctx.fill();

  // Head ball
  const hr = size * 0.19, hy = shTop - hr;
  ctx.beginPath(); ctx.arc(0, hy, hr, 0, Math.PI * 2); ctx.fill();

  // Glossy highlight
  const hl = ctx.createRadialGradient(-hr * 0.35, hy - hr * 0.35, 0, -hr * 0.1, hy - hr * 0.1, hr * 0.7);
  hl.addColorStop(0, "rgba(255,255,255,0.72)");
  hl.addColorStop(0.5, "rgba(255,255,255,0.18)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.beginPath(); ctx.arc(0, hy, hr, 0, Math.PI * 2); ctx.fill();

  // Rim light (bottom right)
  const rim = ctx.createRadialGradient(bw * 0.4, by, 0, 0, by, bw);
  rim.addColorStop(0, "rgba(130,200,255,0.4)");
  rim.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rim;
  ctx.beginPath(); ctx.ellipse(0, by, bw, bh * 2, 0, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

/* ─── Draw chess queen ──────────────────────────────────────────────── */
function drawQueen(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number) {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  const g = ctx.createLinearGradient(-size * 0.3, -size * 0.65, size * 0.2, size * 0.55);
  g.addColorStop(0, "#a0eaff");
  g.addColorStop(0.2, "#3ab8ff");
  g.addColorStop(0.55, "#0066dd");
  g.addColorStop(1, "#001f5e");
  ctx.fillStyle = g;

  const bw = size * 0.52, by = size * 0.44, bh = size * 0.1;
  // Base
  ctx.beginPath();
  ctx.moveTo(-bw, by + bh);
  ctx.bezierCurveTo(-bw, by, -bw * 0.85, by - bh * 0.5, -bw * 0.7, by - bh * 0.5);
  ctx.lineTo(bw * 0.7, by - bh * 0.5);
  ctx.bezierCurveTo(bw * 0.85, by - bh * 0.5, bw, by, bw, by + bh);
  ctx.closePath();
  ctx.fill();

  // Body / skirt
  const skirtTop = by - bh * 0.5 - size * 0.38;
  ctx.beginPath();
  ctx.moveTo(-bw * 0.7, by - bh * 0.5);
  ctx.lineTo(-bw * 0.42, skirtTop);
  ctx.lineTo(bw * 0.42, skirtTop);
  ctx.lineTo(bw * 0.7, by - bh * 0.5);
  ctx.closePath();
  ctx.fill();

  // Crown base bar
  ctx.beginPath();
  ctx.rect(-bw * 0.44, skirtTop - size * 0.06, bw * 0.88, size * 0.06);
  ctx.fill();

  // Crown spires
  const crownBase = skirtTop - size * 0.06;
  const spires: Array<[number, number]> = [
    [-bw * 0.4, crownBase - size * 0.24],
    [-bw * 0.2, crownBase - size * 0.34],
    [0, crownBase - size * 0.42],
    [bw * 0.2, crownBase - size * 0.34],
    [bw * 0.4, crownBase - size * 0.24],
  ];
  spires.forEach(([sx, sy], i) => {
    ctx.beginPath();
    ctx.moveTo(sx - size * 0.05, crownBase);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + size * 0.05, crownBase);
    ctx.closePath();
    ctx.fill();
    // Ball on tip
    ctx.beginPath();
    ctx.arc(sx, sy, size * (i === 2 ? 0.055 : 0.04), 0, Math.PI * 2);
    ctx.fill();
  });

  // Glossy highlight
  const hl = ctx.createRadialGradient(-size * 0.12, crownBase - size * 0.35, 0, 0, crownBase - size * 0.15, size * 0.5);
  hl.addColorStop(0, "rgba(255,255,255,0.75)");
  hl.addColorStop(0.4, "rgba(255,255,255,0.15)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.beginPath(); ctx.arc(0, crownBase - size * 0.2, size * 0.5, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

/* ─── Speed-lines (warp / hyperspeed radiating from centre) ─────────── */
const LINE_SEEDS = Array.from({ length: 220 }, (_, i) => ({
  angle: (i / 220) * Math.PI * 2 + (i % 7) * 0.013,
  speed: 0.25 + (i % 5) * 0.15,
  width: 0.8 + (i % 4) * 0.6,
  phase: (i * 0.618033) % 1,
  colorIdx: i % 5,
}));

const LINE_COLORS = ["#00e5ff", "#1a80e5", "#9f55ff", "#ff44cc", "#00ffaa"];

function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  progress: number,
  time: number
) {
  if (progress <= 0) return;
  const maxDist = Math.hypot(w, h) * 0.6;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const seed of LINE_SEEDS) {
    const t = (seed.phase + time * seed.speed * 0.08) % 1;
    const startDist = t * maxDist * progress;
    const endDist = Math.min(startDist + maxDist * (0.1 + seed.speed * 0.12) * progress, maxDist * 1.05);
    if (endDist <= startDist) continue;
    const cos = Math.cos(seed.angle), sin = Math.sin(seed.angle);
    const alpha = clamp(progress, 0, 1) * (0.35 + 0.55 * ease(t));
    ctx.beginPath();
    ctx.moveTo(cx + cos * startDist, cy + sin * startDist);
    ctx.lineTo(cx + cos * endDist, cy + sin * endDist);
    ctx.strokeStyle = LINE_COLORS[seed.colorIdx];
    ctx.globalAlpha = alpha;
    ctx.lineWidth = seed.width * (0.5 + progress * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/* ─── Glowing rings (spiral / orbit style) ─────────────────────────── */
function drawRings(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  progress: number,
  time: number
) {
  if (progress <= 0) return;
  ctx.save();
  const rings = [
    { rx: 0.38, ry: 0.10, speed: 0.18, color: "#d4ff00", lw: 2.2 },
    { rx: 0.55, ry: 0.14, speed: -0.13, color: "#00eaff", lw: 1.5 },
    { rx: 0.68, ry: 0.18, speed: 0.09, color: "#8040ff", lw: 1.8 },
    { rx: 0.82, ry: 0.22, speed: -0.07, color: "#ff44aa", lw: 1.2 },
  ];
  const base = Math.min(ctx.canvas.width, ctx.canvas.height) * 0.5;
  rings.forEach((r, i) => {
    const rot = time * r.speed + i * 0.6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, base * r.rx * progress, base * r.ry * progress, 0, 0, Math.PI * 2);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.lw;
    ctx.globalAlpha = 0.65 * progress;
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

/* ─── Blue fill (expands from centre with chess-piece silhouette clip) ── */
function drawBlueFill(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  progress: number
) {
  if (progress <= 0) return;
  const maxR = Math.hypot(w, h);
  const r = maxR * ease(progress);
  const g = ctx.createRadialGradient(cx - w * 0.05, cy - h * 0.05, 0, cx, cy, r);
  g.addColorStop(0, `rgba(20,120,255,${progress * 0.95})`);
  g.addColorStop(0.5, `rgba(10,70,200,${progress * 0.9})`);
  g.addColorStop(1, `rgba(0,30,120,${progress * 0.85})`);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* ─── Text phrases ──────────────────────────────────────────────────── */
const PHRASES = [
  "Building tomorrow's\ndigital products.",
  "Independent by\ndesign & engineering.",
  "Clarity first.\nDelight second.",
  "Ship in small loops.\nAim for long arcs.",
];

const PHRASE_POSITIONS = [
  { ax: 0.72, ay: 0.30, align: "left"  as CanvasTextAlign },
  { ax: 0.70, ay: 0.60, align: "left"  as CanvasTextAlign },
  { ax: 0.10, ay: 0.38, align: "left"  as CanvasTextAlign },
  { ax: 0.10, ay: 0.65, align: "left"  as CanvasTextAlign },
];

function drawPhrases(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  progress: number
) {
  if (progress <= 0) return;
  const fontSize = Math.round(clamp(w * 0.022, 14, 26));
  ctx.save();
  ctx.font = `${fontSize}px 'Inter', 'Helvetica Neue', sans-serif`;
  PHRASES.forEach((phrase, i) => {
    const delay = i * 0.12;
    const alpha = ease(clamp((progress - delay) / 0.4, 0, 1));
    if (alpha <= 0) return;
    const pos = PHRASE_POSITIONS[i];
    const x = w * pos.ax;
    const y = h * pos.ay;
    ctx.textAlign = pos.align;
    const lines = phrase.split("\n");
    lines.forEach((line, li) => {
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(line, x, y + li * (fontSize * 1.35));
    });
  });
  ctx.restore();
}

function drawMainHeadline(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  text: string,
  progress: number,
  yFrac = 0.52
) {
  if (progress <= 0) return;
  const fontSize = Math.round(clamp(w * 0.072, 36, 110));
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${fontSize}px 'Inter', 'Helvetica Neue', Arial, sans-serif`;
  ctx.globalAlpha = ease(progress);

  const lines = text.split("\n");
  const lineH = fontSize * 1.08;
  const totalH = lines.length * lineH;
  const startY = h * yFrac - totalH * 0.5 + lineH * 0.5;

  lines.forEach((line, li) => {
    const y = startY + li * lineH;
    // Shadow / glow
    ctx.shadowColor = "rgba(0,60,180,0.6)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(line, w * 0.5, y);
    ctx.shadowBlur = 0;
  });
  ctx.restore();
}

/* ─── Main component ────────────────────────────────────────────────── */
const ChessReveal = forwardRef<ChessRevealHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const stateRef  = useRef({
    active: false,
    virtualScroll: 0,         // 0 → TOTAL_VIRTUAL
    time: 0,
    rafId: 0,
    lastTs: 0,
    blockingScroll: false,
  });

  const TOTAL_VIRTUAL = 5000; // total accumulated wheel delta
  const DEACTIVATE_THRESHOLD = 0.97; // hide pawn/reveal text, but let user scroll to end

  /* Public handles ─────────────────────────────────────────────────── */
  useImperativeHandle(ref, () => ({
    activate() {
      const s = stateRef.current;
      if (s.active) return;
      s.active = true;
      s.virtualScroll = 0;
      s.blockingScroll = true;
      if (wrapRef.current) {
        wrapRef.current.style.opacity = "1";
        wrapRef.current.style.pointerEvents = "all";
      }
    },
    deactivate() {
      const s = stateRef.current;
      s.active = false;
      s.blockingScroll = false;
      if (wrapRef.current) {
        wrapRef.current.style.opacity = "0";
        wrapRef.current.style.pointerEvents = "none";
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const s = stateRef.current;

    /* Resize ───────────────────────────────────────────────────────── */
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = window.innerWidth  + "px";
      canvas.style.height = window.innerHeight + "px";
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    /* Scroll accumulation ──────────────────────────────────────────── */
    const onWheel = (e: WheelEvent) => {
      if (!s.active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      s.virtualScroll = clamp(s.virtualScroll + delta, 0, TOTAL_VIRTUAL);

      // If user scrolls up at progress=0, deactivate (go back to portfolio)
      if (s.virtualScroll <= 0 && delta < 0) {
        s.active = false;
        s.blockingScroll = false;
        wrap.style.opacity = "0";
        wrap.style.pointerEvents = "none";
        // Dispatch event so page.tsx knows to restore portfolio scroll
        window.dispatchEvent(new CustomEvent("chess-reveal-dismissed"));
      }

      // When complete: dismiss and resume normal page scroll
      if (s.virtualScroll >= TOTAL_VIRTUAL) {
        setTimeout(() => {
          s.active = false;
          s.blockingScroll = false;
          wrap.style.opacity = "0";
          wrap.style.pointerEvents = "none";
          window.dispatchEvent(new CustomEvent("chess-reveal-complete"));
        }, 600);
      }
    };

    /* Touch tracking ───────────────────────────────────────────────── */
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

    /* Render loop ──────────────────────────────────────────────────── */
    const tick = (ts: number) => {
      s.rafId = requestAnimationFrame(tick);
      if (!s.active && s.virtualScroll <= 0) { s.lastTs = ts; return; }

      const dt = Math.min((ts - s.lastTs) / 1000, 0.05);
      s.lastTs = ts;
      s.time  += dt;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = window.innerWidth, H = window.innerHeight;
      const cx = W * 0.5, cy = H * 0.5;

      ctx.clearRect(0, 0, W, H);

      const p = s.virtualScroll / TOTAL_VIRTUAL; // 0 → 1 overall progress

      // ── Phases ──────────────────────────────────────────────────
      // 0.00 – 0.10  : dark intro, pawn appears
      // 0.10 – 0.48  : pawn grows, rays begin
      // 0.48 – 0.62  : pawn → queen morph, blue expands
      // 0.62 – 0.78  : full blue, speed lines at max, headline
      // 0.78 – 0.90  : spiral rings + phrase labels
      // 0.90 – 1.00  : "Your satisfaction always"

      const introP   = ease(invlerp(0.00, 0.08, p));
      const growP    = ease(invlerp(0.10, 0.48, p));
      const morphP   = ease(invlerp(0.48, 0.62, p)); // 0→1 pawn→queen
      const blueP    = ease(invlerp(0.50, 0.72, p));
      const linesP   = ease(invlerp(0.45, 0.80, p));
      const headlineP= ease(invlerp(0.60, 0.72, p));
      const ringsP   = ease(invlerp(0.72, 0.85, p));
      const phrasesP = ease(invlerp(0.74, 1.00, p));
      const finalP   = ease(invlerp(0.87, 0.97, p));

      // Background
      ctx.fillStyle = "#05080f";
      ctx.fillRect(0, 0, W, H);

      // Grid (fades out as blue fills in)
      drawGrid(ctx, W, H, introP * (1 - blueP * 0.9));

      // Speed lines
      drawSpeedLines(ctx, cx, cy, W, H, linesP, s.time);

      // Blue fill (clips chess shape then expands)
      drawBlueFill(ctx, cx, cy, W, H, blueP);

      // Rings (above blue)
      drawRings(ctx, cx, cy, ringsP, s.time);

      // Chess piece size: starts tiny, grows to fill ~70% of screen
      const maxSize = Math.min(W, H) * 0.38;
      const minSize = maxSize * 0.055;
      const pieceSize = minSize + (maxSize - minSize) * ease(clamp(growP + morphP * 0.3, 0, 1));
      const pieceAlpha = introP;

      if (morphP < 1) {
        // Pawn (fades out as morphP → 1)
        drawPawn(ctx, cx, cy, pieceSize, pieceAlpha * (1 - morphP));
      }
      if (morphP > 0) {
        // Queen (fades in as morphP → 1)
        drawQueen(ctx, cx, cy, pieceSize, pieceAlpha * Math.min(1, morphP * 1.5));
      }

      // Main headline: "TURN YOUR\nDREAMS TO\nREALITY"
      if (headlineP > 0) {
        drawMainHeadline(ctx, W, H, "TURN YOUR\nDREAMS TO\nREALITY", headlineP, 0.50);
      }

      // Phrase labels scattered around spirals
      if (phrasesP > 0) drawPhrases(ctx, W, H, phrasesP);

      // Final: "YOUR SATISFACTION\nALWAYS"
      if (finalP > 0) {
        // Dim previous headline
        ctx.save();
        ctx.globalAlpha = finalP * 0.7;
        ctx.fillStyle   = "#05080f";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // Re-draw rings at full for the last screen
        drawRings(ctx, cx, cy, 1, s.time);
        drawSpeedLines(ctx, cx, cy, W, H, 0.35, s.time * 0.6);

        drawMainHeadline(ctx, W, H, "YOUR SATISFACTION\nALWAYS", finalP, 0.46);

        // Small queen in final frame
        drawQueen(ctx, cx, cy + H * 0.27, maxSize * 0.25, finalP * 0.6);
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
    <div ref={wrapRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
});

ChessReveal.displayName = "ChessReveal";
export default ChessReveal;
