"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { CircularRevealHeading } from "@/components/ui/CircularRevealHeading";
import styles from "./ChessReveal.module.css";

export interface ChessRevealHandle {
  activate: () => void;
  deactivate: () => void;
  scrollBy: (delta: number) => void;
}

/* ─── Math helpers ──────────────────────────────────────────────────────── */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const invlerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a), 0, 1);
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ─── Warp line seeds ───────────────────────────────────────────────────── */
const WARP_COUNT = 280;
type WarpSeed = { angle: number; speed: number; phase: number; width: number; colorIdx: number };
const WARP_SEEDS: WarpSeed[] = Array.from({ length: WARP_COUNT }, (_, i) => ({
  angle:    (i / WARP_COUNT) * Math.PI * 2 + (i % 11) * 0.017,
  speed:    0.18 + (i % 7) * 0.085,
  phase:    (i * 0.6180339887) % 1,
  width:    1.0  + (i % 5) * 0.5,
  colorIdx: i % 6,
}));
const WARP_COLORS = [
  [0, 229, 255], [26, 128, 229], [159, 85, 255],
  [255, 68, 204], [0, 200, 170], [180, 200, 255],
];

function drawWarpLines(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  W: number, H: number,
  progress: number,
  time: number,
) {
  if (progress <= 0) return;
  const maxDist = Math.hypot(W, H) * 0.62;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const seed of WARP_SEEDS) {
    const t = (seed.phase + time * seed.speed * 0.055) % 1;
    const bandLen  = maxDist * (0.06 + seed.speed * 0.09) * progress;
    const startFrac = t * progress;
    const startDist = startFrac * maxDist;
    const endDist   = Math.min(startDist + bandLen, maxDist * 1.02);
    if (endDist <= startDist) continue;
    const [r, g, b] = WARP_COLORS[seed.colorIdx];
    const baseAlpha = progress * (0.25 + 0.55 * easeInOut(t));
    const cos  = Math.cos(seed.angle);
    const sin  = Math.sin(seed.angle);
    const pCos = Math.cos(seed.angle + Math.PI / 2);
    const pSin = Math.sin(seed.angle + Math.PI / 2);
    const wStart = (startDist / maxDist) * seed.width * (1.5 + progress * 2.5);
    const wEnd   = (endDist   / maxDist) * seed.width * (1.5 + progress * 2.5);
    const x0 = cx + cos * startDist + pCos * wStart;
    const y0 = cy + sin * startDist + pSin * wStart;
    const x1 = cx + cos * endDist   + pCos * wEnd;
    const y1 = cy + sin * endDist   + pSin * wEnd;
    const x2 = cx + cos * endDist   - pCos * wEnd;
    const y2 = cy + sin * endDist   - pSin * wEnd;
    const x3 = cx + cos * startDist - pCos * wStart;
    const y3 = cy + sin * startDist - pSin * wStart;
    const grad = ctx.createLinearGradient(
      cx + cos * startDist, cy + sin * startDist,
      cx + cos * endDist,   cy + sin * endDist,
    );
    grad.addColorStop(0,    `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.25, `rgba(${r},${g},${b},${(baseAlpha * 0.5).toFixed(3)})`);
    grad.addColorStop(1,    `rgba(${r},${g},${b},${baseAlpha.toFixed(3)})`);
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  const cell = Math.min(W, H) / 14;
  ctx.strokeStyle = "rgba(40,70,110,1)";
  ctx.lineWidth   = 0.4;
  ctx.globalAlpha = alpha * 0.35;
  for (let x = 0; x <= W; x += cell) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += cell) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(80,140,180,1)";
  ctx.lineWidth   = 1;
  ctx.globalAlpha = alpha * 0.55;
  const arm = 5;
  for (let xi = 0; xi * cell <= W + cell; xi++) {
    for (let yi = 0; yi * cell <= H + cell; yi++) {
      const px = xi * cell, py = yi * cell;
      ctx.beginPath(); ctx.moveTo(px - arm, py); ctx.lineTo(px + arm, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py - arm); ctx.lineTo(px, py + arm); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCornerBrackets(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(0,229,255,0.9)";
  ctx.lineWidth   = 1.5;
  ctx.lineCap     = "square";
  const mx = W * 0.06, my = H * 0.08;
  const rx = mx, ry = my, rw = W - mx * 2, rh = H - my * 2;
  const arm = Math.min(W, H) * 0.04;
  const corners = [
    { x: rx,      y: ry,      dx:  1, dy:  1 },
    { x: rx + rw, y: ry,      dx: -1, dy:  1 },
    { x: rx + rw, y: ry + rh, dx: -1, dy: -1 },
    { x: rx,      y: ry + rh, dx:  1, dy: -1 },
  ];
  for (const c of corners) {
    ctx.beginPath();
    ctx.moveTo(c.x + c.dx * arm, c.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(c.x, c.y + c.dy * arm);
    ctx.stroke();
  }
  ctx.lineWidth   = 1;
  ctx.strokeStyle = "rgba(0,229,255,0.35)";
  const carm = 12;
  ctx.beginPath(); ctx.moveTo(W / 2 - carm, H / 2); ctx.lineTo(W / 2 + carm, H / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2, H / 2 - carm); ctx.lineTo(W / 2, H / 2 + carm); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,229,255,0.5)"; ctx.fill();
  ctx.restore();
}

function drawStatusBar(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number, time: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.75;
  const fs = Math.round(clamp(W * 0.011, 10, 13));
  ctx.font      = `400 ${fs}px 'Courier New','Courier',monospace`;
  ctx.fillStyle = "rgba(0,229,255,0.85)";
  ctx.textBaseline = "middle";
  const py = H * 0.935;
  const coordX = (W * 0.5 + Math.sin(time * 0.3) * 40).toFixed(0).padStart(4, "0");
  const coordY = (H * 0.5 + Math.cos(time * 0.22) * 30).toFixed(0).padStart(4, "0");
  ctx.textAlign = "left";
  ctx.fillText(`TECHZILLA.STUDIO`, W * 0.065, py);
  ctx.fillText(`${coordX} X  ${coordY} Y`, W * 0.38, py);
  ctx.textAlign = "right";
  ctx.fillText(`SYS·ONLINE`, W * 0.935, py);
  ctx.strokeStyle = "rgba(0,229,255,0.18)";
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.moveTo(W * 0.065, H * 0.92);
  ctx.lineTo(W * 0.935, H * 0.92);
  ctx.stroke();
  ctx.restore();
}

function drawRings(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  W: number, _H: number,
  progress: number,
  time: number,
) {
  if (progress <= 0) return;
  ctx.save();
  const base = W * 0.32;
  const rings = [
    { rx: 1.05, ry: 0.22, spd:  0.20, color: [212, 255, 0],  lw: 1.8 },
    { rx: 0.80, ry: 0.16, spd: -0.14, color: [0, 234, 255],  lw: 1.4 },
    { rx: 0.60, ry: 0.12, spd:  0.10, color: [128, 64, 255], lw: 1.2 },
    { rx: 1.28, ry: 0.28, spd: -0.08, color: [255, 68, 170], lw: 1.0 },
  ];
  rings.forEach((r, i) => {
    const rot = time * r.spd + i * 0.72;
    const [red, grn, blu] = r.color;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, base * r.rx * progress, base * r.ry * progress, 0, 0, Math.PI * 2);
    ctx.strokeStyle  = `rgba(${red},${grn},${blu},${(0.7 * progress).toFixed(2)})`;
    ctx.lineWidth    = r.lw;
    ctx.globalAlpha  = progress;
    ctx.shadowColor  = `rgb(${red},${grn},${blu})`;
    ctx.shadowBlur   = 12;
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

function drawBlueFill(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  W: number, H: number,
  progress: number,
) {
  if (progress <= 0) return;
  const maxR = Math.hypot(W, H);
  const r    = maxR * easeOut3(progress);
  const g    = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0,    `rgba(20,120,255,${(progress * 0.92).toFixed(3)})`);
  g.addColorStop(0.45, `rgba(10,70,200,${(progress * 0.88).toFixed(3)})`);
  g.addColorStop(1,    `rgba(0,25,110,${(progress * 0.80).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPiece(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number, cy: number,
  size: number, alpha: number,
  rotation = 0,
) {
  if (alpha <= 0 || size <= 0 || !img.complete || img.naturalWidth === 0) return;
  const aspect = img.naturalWidth / img.naturalHeight;
  const h = size, w = h * aspect;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "screen";
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.drawImage(img, -w * 0.5, -h * 0.5, w, h);
  ctx.restore();
}

/* ─── Manifesto phrases — still drawn on canvas during Phase B ──────────── */
const PHRASES = [
  "Building tomorrow's\ndigital products.",
  "Independent by\ndesign & engineering.",
  "Clarity first.\nDelight second.",
  "Ship in small loops.\nAim for long arcs.",
];
const PHRASE_POS = [
  { ax: 0.72, ay: 0.30 },
  { ax: 0.70, ay: 0.60 },
  { ax: 0.065, ay: 0.36 },
  { ax: 0.065, ay: 0.62 },
];
function drawPhrases(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  progress: number,
) {
  if (progress <= 0) return;
  const fs = Math.round(clamp(W * 0.018, 12, 22));
  ctx.save();
  ctx.font = `300 ${fs}px 'Inter','Helvetica Neue',sans-serif`;
  PHRASES.forEach((phrase, i) => {
    const a = easeInOut(clamp((progress - i * 0.12) / 0.4, 0, 1));
    if (a <= 0) return;
    const { ax, ay } = PHRASE_POS[i];
    ctx.globalAlpha = a * 0.80;
    ctx.fillStyle   = "#ffffff";
    ctx.textAlign   = "left";
    phrase.split("\n").forEach((line, li) => {
      ctx.fillText(line, W * ax, H * ay + li * fs * 1.4);
    });
  });
  ctx.restore();
}

/* ─── Main headline ─────────────────────────────────────────────────────── */
function drawHeadline(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  text: string,
  progress: number,
  yFrac = 0.50,
) {
  if (progress <= 0) return;
  const fs    = Math.round(clamp(W * 0.066, 32, 102));
  const lineH = fs * 1.08;
  const lines = text.split("\n");
  const startY = H * yFrac - (lines.length * lineH) / 2 + lineH * 0.5;
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.font         = `900 ${fs}px 'Inter','Helvetica Neue',Arial,sans-serif`;
  ctx.globalAlpha  = easeInOut(progress);
  lines.forEach((line, li) => {
    ctx.shadowColor = "rgba(0,80,220,0.65)";
    ctx.shadowBlur  = 36;
    ctx.fillStyle   = "#ffffff";
    ctx.fillText(line, W * 0.5, startY + li * lineH);
  });
  ctx.restore();
}

/* ─── Circular items — center text TECHZILLA, Design item = design image ── */
const CIRCULAR_ITEMS = [
  {
    text: "STRATEGY",
    image: "https://kxptt4m9j4.ufs.sh/f/9YHhEDeslzkceCYjHtyWSduj04chzxgP3pt1Dvo8KfCsHnwk",
  },
  {
    text: "DESIGN",
    image: "/design-icon.png",
  },
  {
    text: "GROWTH",
    image: "https://kxptt4m9j4.ufs.sh/f/9YHhEDeslzkcz9VsoNLlt5AKuj9HqWQm3NeDUywcLSxB6Yo1",
  },
  {
    text: "INNOVATION",
    image: "https://kxptt4m9j4.ufs.sh/f/9YHhEDeslzkcypc1wWQBS4VNPtfqkpIhO7M6XUva5TzWomdZ",
  },
];

const CIRCULAR_CENTER = (
  <span
    style={{
      fontFamily: "var(--font-display, sans-serif)",
      fontWeight: 900,
      fontSize: "clamp(0.9rem, 2vw, 1.2rem)",
      letterSpacing: "-0.02em",
      color: "#222",
    }}
  >
    TECHZILLA
  </span>
);

/* ─── Phase boundaries (strict handoffs) ───────────────────────────────────
 * A is finished when B begins, and B is finished when C begins. The content
 * still enters and exits with its own within-phase easing, but never overlaps.
 */
const PH_A_START = 0.62, PH_A_END = 0.76;
const PH_B_START = 0.76, PH_B_END = 0.87;
const PH_C_START = 0.87, PH_C_END = 1.00;

/* ─── Component ─────────────────────────────────────────────────────────── */
const ChessReveal = forwardRef<ChessRevealHandle>((_, ref) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const circularRef = useRef<HTMLDivElement>(null);
  const pawnRef     = useRef<HTMLImageElement | null>(null);
  const queenRef    = useRef<HTMLImageElement | null>(null);
  const stateRef    = useRef({
    active:        false,
    virtualScroll: 0,
    time:          0,
    lastTs:        0,
    rafId:         0,
  });
  const TOTAL = 5200;

  const setVirtualScroll = (next: number) => {
    const s = stateRef.current;
    s.virtualScroll = clamp(next, 0, TOTAL);
    window.dispatchEvent(
      new CustomEvent("chess-reveal-progress", {
        detail: { progress: s.virtualScroll / TOTAL },
      }),
    );
  };

  const applyVirtualDelta = (delta: number) => {
    const s = stateRef.current;
    const previous = s.virtualScroll;
    setVirtualScroll(previous + delta);
    if (s.virtualScroll <= 0 && delta < 0) {
      s.active = false;
      slideOut();
      window.dispatchEvent(new CustomEvent("chess-reveal-mode", { detail: { active: false } }));
      window.dispatchEvent(new CustomEvent("chess-reveal-dismissed"));
    }
  };

  const seekVirtualScroll = (progress: number) => {
    const s = stateRef.current;
    if (!s.active) return;
    const next = clamp(progress, 0, 1) * TOTAL;
    if (next <= 0) {
      s.virtualScroll = 0;
      s.active = false;
      slideOut();
      window.dispatchEvent(new CustomEvent("chess-reveal-mode", { detail: { active: false } }));
      window.dispatchEvent(new CustomEvent("chess-reveal-dismissed"));
      return;
    }
    setVirtualScroll(next);
  };

  const slideIn = () => {
    const w = wrapRef.current; if (!w) return;
    w.style.transition    = "transform 0.70s cubic-bezier(0.22,1,0.36,1)";
    w.style.transform     = "translateY(0%)";
    w.style.pointerEvents = "all";
  };
  const slideOut = (fast = false) => {
    const w = wrapRef.current; if (!w) return;
    w.style.transition    = `transform ${fast ? 0.40 : 0.55}s cubic-bezier(0.32,0,0.12,1)`;
    w.style.transform     = "translateY(100%)";
    w.style.pointerEvents = "none";
  };

  useImperativeHandle(ref, () => ({
    activate() {
      const s = stateRef.current;
      if (s.active) return;
      s.active        = true;
      s.virtualScroll = 0;
      window.dispatchEvent(new CustomEvent("chess-reveal-mode", { detail: { active: true } }));
      window.dispatchEvent(new CustomEvent("chess-reveal-progress", { detail: { progress: 0 } }));
      slideIn();
    },
    deactivate() {
      stateRef.current.active = false;
      slideOut(true);
      window.dispatchEvent(new CustomEvent("chess-reveal-mode", { detail: { active: false } }));
    },
    scrollBy(delta: number) {
      const s = stateRef.current;
      if (!s.active) return;
      applyVirtualDelta(delta);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    const pawn  = new Image(); pawn.src  = "/chess/pawn.png";
    const queen = new Image(); queen.src = "/chess/queen.png";
    pawnRef.current  = pawn;
    queenRef.current = queen;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = window.innerWidth, H = window.innerHeight;
      canvas.width  = W * dpr; canvas.height = H * dpr;
      canvas.style.width  = `${W}px`; canvas.style.height = `${H}px`;
      const c = canvas.getContext("2d");
      if (c) { c.setTransform(1, 0, 0, 1, 0, 0); c.scale(dpr, dpr); }
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Wheel: captures scroll input while chess panel is active ─────────────
    const onWheel = (e: WheelEvent) => {
      if (!s.active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      applyVirtualDelta(delta);
      // At the end — stay there; never auto-dismiss.
    };

    // ── Touch ─────────────────────────────────────────────────────────────────
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { if (s.active) touchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove  = (e: TouchEvent) => {
      if (!s.active) return;
      e.preventDefault();
      const dy = touchY - (e.touches[0]?.clientY ?? 0);
      touchY   = e.touches[0]?.clientY ?? 0;
      applyVirtualDelta(dy * 3);
    };

    // ── Keyboard: arrow keys, Page Up/Down, Space, Home/End ──────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (!s.active) return;
      let delta = 0;
      switch (e.key) {
        case "ArrowDown":  delta =  80;   break;
        case "ArrowUp":    delta = -80;   break;
        case "PageDown":   delta =  600;  break;
        case "PageUp":     delta = -600;  break;
        case " ":          delta = e.shiftKey ? -600 : 600; break;
        case "End":        setVirtualScroll(TOTAL); return;
        case "Home":       applyVirtualDelta(-TOTAL); return;
        default: return;
      }
      e.preventDefault();
      applyVirtualDelta(delta);
    };

    // ── Scrollbar seek (drag/click on the custom scrollbar) ──────────────────
    const onRevealSeek = (e: Event) => {
      const progress = (e as CustomEvent<{ progress?: number }>).detail?.progress;
      if (typeof progress === "number") seekVirtualScroll(progress);
    };

    window.addEventListener("wheel",            onWheel,       { passive: false, capture: true });
    window.addEventListener("touchstart",       onTouchStart,  { passive: true  });
    window.addEventListener("touchmove",        onTouchMove,   { passive: false, capture: true });
    window.addEventListener("keydown",          onKeyDown,     { capture: true  });
    window.addEventListener("chess-reveal-seek", onRevealSeek);

    const tick = (ts: number) => {
      s.rafId = requestAnimationFrame(tick);
      if (!s.active && s.virtualScroll <= 0) { s.lastTs = ts; return; }

      const dt  = Math.min((ts - (s.lastTs || ts)) / 1000, 0.05);
      s.lastTs  = ts;
      s.time   += dt;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = window.innerWidth, H = window.innerHeight;
      const cx = W / 2, cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      const p = s.virtualScroll / TOTAL;

      /* ── Background / shared elements (always present) ────────── */
      const introP = easeInOut(invlerp(0.00, 0.07, p));
      const growP  = easeInOut(invlerp(0.07, 0.46, p));
      const morphP = easeInOut(invlerp(0.40, 0.56, p));
      const blueP  = easeInOut(invlerp(0.50, 0.72, p));
      const linesP = easeInOut(invlerp(0.40, 0.80, p));
      const pawnSpin = easeOut3(growP) * Math.PI * 6;

      /* ── Strict handoff progress ───────────────────────────────── */
      const inPhaseA = p >= PH_A_START && p < PH_A_END;
      const inPhaseB = p >= PH_B_START && p < PH_B_END;
      const inPhaseC = p >= PH_C_START;
      const pA = inPhaseA ? invlerp(PH_A_START, PH_A_END, p) : 0;
      const pB = inPhaseB ? invlerp(PH_B_START, PH_B_END, p) : 0;
      const pC = inPhaseC ? invlerp(PH_C_START, PH_C_END, p) : 0;

      /* ── 1. Background ────────────────────────────────────────── */
      ctx.fillStyle = "#030508";
      ctx.fillRect(0, 0, W, H);

      /* ── 2. Crosshair grid ────────────────────────────────────── */
      drawGrid(ctx, W, H, introP * (1 - blueP * 0.95));

      /* ── 3. Warp lines (background; reduced during Phase B) ───── */
      const warpIntensity = inPhaseB ? linesP * 0.30 : linesP;
      drawWarpLines(ctx, cx, cy, W, H, warpIntensity, s.time);

      /* ── 4. Blue fill ─────────────────────────────────────────── */
      drawBlueFill(ctx, cx, cy, W, H, blueP);

      /* ── 5. HUD brackets ──────────────────────────────────────── */
      drawCornerBrackets(ctx, W, H, introP * (1 - blueP * 0.5));

      /* ── 7. Chess piece (hidden during Phase C) ────────────────── */
      const maxH   = H * 0.52;
      const minH   = maxH * 0.04;
      const sizeT  = easeOut3(clamp(growP + morphP * 0.30, 0, 1));
      const pieceH = lerp(minH, maxH, sizeT);
      const pieceCY = cy - H * 0.03;
      if (!inPhaseC) {
        if (morphP < 1 && pawnRef.current) {
          drawPiece(ctx, pawnRef.current, cx, pieceCY, pieceH, introP * (1 - morphP), pawnSpin);
        }
        if (morphP > 0 && queenRef.current) {
          drawPiece(ctx, queenRef.current, cx, pieceCY, pieceH, introP * clamp(morphP * 1.6, 0, 1));
        }
      }

      // PHASE A — "TURN YOUR DREAMS TO REALITY"
      if (inPhaseA) {
        drawHeadline(ctx, W, H, "TURN YOUR\nDREAMS TO\nREALITY", easeInOut(pA), 0.50);
      }

      // PHASE B — Manifesto phrases
      if (inPhaseB) {
        drawPhrases(ctx, W, H, pB);
      }

      // PHASE C — Final screen
      if (inPhaseC) {
        ctx.save();
        ctx.globalAlpha = easeInOut(pC) * 0.88;
        ctx.fillStyle   = "#030508";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        // Warp lines on top of dark fill
        drawWarpLines(ctx, cx, cy, W, H, 0.28, s.time * 0.6);
        // Final text — 3 lines
        drawHeadline(ctx, W, H, "YOUR\nSATISFACTION\nALWAYS", easeInOut(pC), 0.44);
        if (queenRef.current) {
          drawPiece(ctx, queenRef.current, cx, cy + H * 0.27, H * 0.18, easeInOut(pC) * 0.60);
        }
        drawCornerBrackets(ctx, W, H, easeInOut(pC) * 0.70);
      }

      /* ── Circular overlay — visible only during Phase B ────────── */
      if (circularRef.current) {
        circularRef.current.style.opacity       = inPhaseB ? "1" : "0";
        circularRef.current.style.pointerEvents = inPhaseB ? "auto" : "none";
      }

      /* ── Status bar ───────────────────────────────────────────── */
      drawStatusBar(ctx, W, H, introP, s.time);
    };

    s.rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(s.rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("wheel",             onWheel,      { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart",        onTouchStart);
      window.removeEventListener("touchmove",         onTouchMove,  { capture: true } as EventListenerOptions);
      window.removeEventListener("keydown",           onKeyDown,    { capture: true } as EventListenerOptions);
      window.removeEventListener("chess-reveal-seek", onRevealSeek);
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

      {/* Circular component — opacity follows the Phase B crossfade */}
      <div
        ref={circularRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0,
          pointerEvents: "none",
          zIndex: 10,
          /* The RAF loop writes the continuous opacity value directly. */
        }}
      >
        <CircularRevealHeading
          items={CIRCULAR_ITEMS}
          centerText={CIRCULAR_CENTER}
          size="md"
        />
      </div>
    </div>
  );
});

ChessReveal.displayName = "ChessReveal";
export default ChessReveal;
