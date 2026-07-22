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

/* ─── Shared metallic style helper ──────────────────────────────────────── */
function makeMetallicGradient(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number
): CanvasGradient {
  // Left-center to right-bottom linear gradient — gives the "shiny left" look
  const g = ctx.createLinearGradient(cx - w * 0.55, cy - h * 0.5, cx + w * 0.55, cy + h * 0.5);
  g.addColorStop(0.00, "#3d2255");   // lit upper-left edge
  g.addColorStop(0.18, "#1e0e30");   // dark shadow
  g.addColorStop(0.42, "#2a1245");   // mid purple-black
  g.addColorStop(0.60, "#160824");   // deep shadow
  g.addColorStop(0.78, "#0e061a");   // very dark
  g.addColorStop(1.00, "#08040f");   // near-black base
  return g;
}

/* ─────────────────────────────────────────────────────────────────────────
   PAWN
   Reference: round ball head, short neck, wide collar disk, tapered stem,
   wide flared base with concave scallop.
   All measurements in `size` units where size = total height.
   ───────────────────────────────────────────────────────────────────────── */
function drawPawn(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number, alpha: number
) {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  // Proportions (all relative to size = total height)
  const headR     = size * 0.200;   // head ball radius
  const headY     = -size * 0.370;  // centre of head ball
  const neckW     = size * 0.095;   // half-width of neck cylinder
  const collarY   = -size * 0.140;  // y of collar disk centre
  const collarRx  = size * 0.190;   // collar half-width
  const collarRy  = size * 0.052;   // collar half-height
  const stemW     = size * 0.075;   // half-width below collar
  const stemBot   = size * 0.230;   // y of bottom of stem (above base)
  const baseW     = size * 0.370;   // half-width of base top
  const baseBot   = size * 0.480;   // y of very bottom
  const baseCurveD = size * 0.090;  // how much the base top curves inward

  const grad = makeMetallicGradient(ctx, 0, 0, size * 0.7, size);

  /* — Base (wide flared, concave top edge) ————————————————————————— */
  ctx.beginPath();
  ctx.moveTo(-baseW, baseBot);
  ctx.lineTo( baseW, baseBot);
  // right outer curve up
  ctx.bezierCurveTo( baseW, baseBot - size * 0.06, baseW * 0.75, stemBot + baseCurveD, stemW, stemBot);
  // left side mirror
  ctx.bezierCurveTo(-baseW * 0.75, stemBot + baseCurveD, -baseW, baseBot - size * 0.06, -baseW, baseBot);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Base rim at top (thin ring highlight) ————————————————————————— */
  ctx.beginPath();
  ctx.ellipse(0, stemBot, baseW * 0.72, size * 0.030, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Stem (narrow rectangle from base to collar) ————————————————— */
  ctx.beginPath();
  ctx.rect(-stemW, collarY + collarRy, stemW * 2, stemBot - (collarY + collarRy));
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Collar disk ─────────────────────────────────────────────────── */
  ctx.beginPath();
  ctx.ellipse(0, collarY, collarRx, collarRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Neck (rectangle from collar to head bottom) ─────────────────── */
  ctx.beginPath();
  ctx.rect(-neckW, headY, neckW * 2, collarY - headY);
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Head ball ───────────────────────────────────────────────────── */
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  /* ─── Highlights & shading ──────────────────────────────────────── */

  // Broad left-side body light (vertical strip)
  const bodyLight = ctx.createLinearGradient(-size * 0.25, 0, size * 0.05, 0);
  bodyLight.addColorStop(0,   "rgba(255,255,255,0.00)");
  bodyLight.addColorStop(0.3, "rgba(255,255,255,0.06)");
  bodyLight.addColorStop(0.6, "rgba(255,255,255,0.00)");
  ctx.fillStyle = bodyLight;
  ctx.fillRect(-size * 0.4, headY - headR, size * 0.8, size);

  // Specular blob on head (upper-left)
  const spec = ctx.createRadialGradient(
    -headR * 0.38, headY - headR * 0.38, 0,
    -headR * 0.10, headY - headR * 0.10, headR * 0.72
  );
  spec.addColorStop(0,   "rgba(255,255,255,0.82)");
  spec.addColorStop(0.35,"rgba(255,255,255,0.30)");
  spec.addColorStop(0.70,"rgba(255,255,255,0.06)");
  spec.addColorStop(1,   "rgba(255,255,255,0.00)");
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = spec;
  ctx.fill();

  // Smaller specular dot on collar
  const cs = ctx.createRadialGradient(
    -collarRx * 0.45, collarY - collarRy * 0.5, 0,
    -collarRx * 0.20, collarY, collarRx * 0.55
  );
  cs.addColorStop(0,   "rgba(255,255,255,0.55)");
  cs.addColorStop(0.6, "rgba(255,255,255,0.08)");
  cs.addColorStop(1,   "rgba(255,255,255,0.00)");
  ctx.beginPath();
  ctx.ellipse(0, collarY, collarRx, collarRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = cs;
  ctx.fill();

  // Right-edge rim light (thin bright stripe — characteristic of the reference)
  const rim = ctx.createLinearGradient(size * 0.28, 0, size * 0.42, 0);
  rim.addColorStop(0,   "rgba(200,170,255,0.00)");
  rim.addColorStop(0.5, "rgba(200,170,255,0.28)");
  rim.addColorStop(1,   "rgba(200,170,255,0.00)");
  ctx.fillStyle = rim;
  ctx.fillRect(size * 0.28, headY - headR, size * 0.14, size);

  ctx.restore();
}

/* ─────────────────────────────────────────────────────────────────────────
   QUEEN
   Reference: orb at top, crown of pointed spires with ball tips, tall
   cylindrical body with 2–3 decorative ring bands, wide flared base.
   ───────────────────────────────────────────────────────────────────────── */
function drawQueen(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number, alpha: number
) {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  // Proportions
  const headR     = size * 0.135;   // top orb radius
  const headY     = -size * 0.490;  // centre of top orb
  const crownBot  = headY + headR + size * 0.008; // where crown prongs start
  const crownH    = size * 0.135;   // height of crown section
  const crownW    = size * 0.260;   // half-width of crown at widest
  const bodyTopY  = crownBot + crownH;
  const bodyBotW  = size * 0.110;   // half-width of body at bottom
  const bodyTopW  = size * 0.130;   // half-width of body at top (slightly wider)
  const ring1Y    = bodyTopY + (size * 0.460 - bodyTopY) * 0.30; // 1st band
  const ring2Y    = bodyTopY + (size * 0.460 - bodyTopY) * 0.62; // 2nd band
  const baseTopY  = size * 0.460;
  const baseW     = size * 0.380;
  const baseBot   = size * 0.500;

  const grad = makeMetallicGradient(ctx, 0, 0, size * 0.7, size);

  /* — Base ─────────────────────────────────────────────────────────── */
  ctx.beginPath();
  ctx.moveTo(-baseW, baseBot);
  ctx.lineTo( baseW, baseBot);
  ctx.bezierCurveTo( baseW, baseBot - size * 0.055, bodyBotW * 1.4, baseTopY + size * 0.040, bodyBotW, baseTopY);
  ctx.bezierCurveTo(-bodyBotW * 1.4, baseTopY + size * 0.040, -baseW, baseBot - size * 0.055, -baseW, baseBot);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Base top ring ────────────────────────────────────────────────── */
  ctx.beginPath();
  ctx.ellipse(0, baseTopY, baseW * 0.66, size * 0.028, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Body column ─────────────────────────────────────────────────── */
  ctx.beginPath();
  ctx.moveTo(-bodyTopW, bodyTopY);
  ctx.lineTo(-bodyBotW, baseTopY);
  ctx.lineTo( bodyBotW, baseTopY);
  ctx.lineTo( bodyTopW, bodyTopY);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Ring band 1 ──────────────────────────────────────────────────── */
  const bandHalf1 = size * 0.026;
  ctx.beginPath();
  ctx.rect(-bodyTopW * 1.25, ring1Y - bandHalf1, bodyTopW * 2.5, bandHalf1 * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, ring1Y - bandHalf1, bodyTopW * 1.25, size * 0.020, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, ring1Y + bandHalf1, bodyTopW * 1.25, size * 0.020, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Ring band 2 ──────────────────────────────────────────────────── */
  const bandHalf2 = size * 0.022;
  ctx.beginPath();
  ctx.rect(-bodyTopW * 1.18, ring2Y - bandHalf2, bodyTopW * 2.36, bandHalf2 * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, ring2Y - bandHalf2, bodyTopW * 1.18, size * 0.018, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, ring2Y + bandHalf2, bodyTopW * 1.18, size * 0.018, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Crown ring (base of prongs) ─────────────────────────────────── */
  const crownRingH = size * 0.038;
  ctx.beginPath();
  ctx.rect(-crownW, crownBot, crownW * 2, crownRingH);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, crownBot, crownW, size * 0.022, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, crownBot + crownRingH, crownW, size * 0.022, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  /* — Crown spires with ball tips ─────────────────────────────────── */
  // 5 spires: outer 2 short, inner 2 medium, centre 1 tallest
  const spireXs   = [-crownW * 0.88, -crownW * 0.50, 0, crownW * 0.50, crownW * 0.88];
  const spireHts  = [crownH * 0.50,  crownH * 0.72, crownH * 1.00, crownH * 0.72, crownH * 0.50];
  const spireBallR = [size * 0.025, size * 0.028, size * 0.034, size * 0.028, size * 0.025];

  spireXs.forEach((sx, i) => {
    const tipY = crownBot - spireHts[i];
    const br   = spireBallR[i];
    const sw   = size * 0.032; // half-width of spire at base
    // Spire triangle
    ctx.beginPath();
    ctx.moveTo(sx - sw, crownBot + crownRingH);
    ctx.lineTo(sx + sw, crownBot + crownRingH);
    ctx.lineTo(sx,      tipY + br * 0.5);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // Ball on tip
    ctx.beginPath();
    ctx.arc(sx, tipY, br, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  });

  /* — Top orb ─────────────────────────────────────────────────────── */
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  /* ─── Highlights ─────────────────────────────────────────────────── */

  // Broad left-side body light
  const bodyLight = ctx.createLinearGradient(-size * 0.28, 0, size * 0.05, 0);
  bodyLight.addColorStop(0,   "rgba(255,255,255,0.00)");
  bodyLight.addColorStop(0.35,"rgba(255,255,255,0.07)");
  bodyLight.addColorStop(0.65,"rgba(255,255,255,0.00)");
  ctx.fillStyle = bodyLight;
  ctx.fillRect(-size * 0.4, headY - headR, size * 0.8, size);

  // Specular on top orb
  const spec = ctx.createRadialGradient(
    -headR * 0.38, headY - headR * 0.38, 0,
    -headR * 0.10, headY - headR * 0.10, headR * 0.72
  );
  spec.addColorStop(0,   "rgba(255,255,255,0.85)");
  spec.addColorStop(0.35,"rgba(255,255,255,0.28)");
  spec.addColorStop(0.7, "rgba(255,255,255,0.05)");
  spec.addColorStop(1,   "rgba(255,255,255,0.00)");
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = spec;
  ctx.fill();

  // Specular on each crown spire ball tip
  spireXs.forEach((sx, i) => {
    const tipY = crownBot - spireHts[i];
    const br   = spireBallR[i];
    const s2 = ctx.createRadialGradient(
      sx - br * 0.35, tipY - br * 0.35, 0,
      sx, tipY, br * 0.8
    );
    s2.addColorStop(0,   "rgba(255,255,255,0.70)");
    s2.addColorStop(0.5, "rgba(255,255,255,0.10)");
    s2.addColorStop(1,   "rgba(255,255,255,0.00)");
    ctx.beginPath();
    ctx.arc(sx, tipY, br, 0, Math.PI * 2);
    ctx.fillStyle = s2;
    ctx.fill();
  });

  // Right-edge rim light
  const rim = ctx.createLinearGradient(size * 0.24, 0, size * 0.40, 0);
  rim.addColorStop(0,   "rgba(200,170,255,0.00)");
  rim.addColorStop(0.5, "rgba(200,170,255,0.30)");
  rim.addColorStop(1,   "rgba(200,170,255,0.00)");
  ctx.fillStyle = rim;
  ctx.fillRect(size * 0.24, headY - headR, size * 0.16, size);

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
  // Crosshair marks at intersections
  ctx.globalAlpha = alpha * 0.45;
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
    const t          = (seed.phase + time * seed.speed * 0.08) % 1;
    const startDist  = t * maxDist * progress;
    const endDist    = Math.min(startDist + maxDist * (0.09 + seed.speed * 0.11) * progress, maxDist * 1.05);
    if (endDist <= startDist) continue;
    const cos = Math.cos(seed.angle), sin = Math.sin(seed.angle);
    const a   = clamp(progress, 0, 1) * (0.30 + 0.50 * ease(t));
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
    ctx.strokeStyle    = r.color;
    ctx.lineWidth      = r.lw;
    ctx.globalAlpha    = 0.65 * progress;
    ctx.shadowColor    = r.color;
    ctx.shadowBlur     = 10;
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
    const lines = phrase.split("\n");
    ctx.textAlign = p.align;
    lines.forEach((line, li) => {
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
  const a  = ease(progress);
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.font         = `900 ${fs}px 'Inter','Helvetica Neue',Arial,sans-serif`;
  ctx.globalAlpha  = a;
  const lines  = text.split("\n");
  const lineH  = fs * 1.10;
  const totalH = lines.length * lineH;
  const startY = h * yFrac - totalH * 0.5 + lineH * 0.5;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const stateRef  = useRef({
    active:        false,
    virtualScroll: 0,
    time:          0,
    rafId:         0,
    lastTs:        0,
  });

  const TOTAL_VIRTUAL = 5000;

  useImperativeHandle(ref, () => ({
    activate() {
      const s = stateRef.current;
      if (s.active) return;
      s.active        = true;
      s.virtualScroll = 0;
      const wrap = wrapRef.current;
      if (wrap) {
        wrap.classList.remove("dismiss");
        wrap.classList.add("active");
        // Use module-css class names (they get hashed)
        wrap.style.transform    = "translateY(0%)";
        wrap.style.pointerEvents = "all";
      }
    },
    deactivate() {
      const s = stateRef.current;
      s.active = false;
      const wrap = wrapRef.current;
      if (wrap) {
        wrap.style.transform     = "translateY(100%)";
        wrap.style.pointerEvents = "none";
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const s = stateRef.current;

    /* Resize ─────────────────────────────────────────────────────────── */
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W   = window.innerWidth;
      const H   = window.innerHeight;
      canvas.width         = W * dpr;
      canvas.height        = H * dpr;
      canvas.style.width   = W + "px";
      canvas.style.height  = H + "px";
      const c = canvas.getContext("2d");
      if (c) { c.setTransform(1,0,0,1,0,0); c.scale(dpr, dpr); }
    };
    resize();
    window.addEventListener("resize", resize);

    /* Scroll accumulation ───────────────────────────────────────────── */
    const onWheel = (e: WheelEvent) => {
      if (!s.active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      s.virtualScroll = clamp(s.virtualScroll + delta, 0, TOTAL_VIRTUAL);

      if (s.virtualScroll <= 0 && delta < 0) {
        // Scroll up at start → dismiss (slide back down)
        s.active = false;
        wrap.style.transition    = "transform 0.5s cubic-bezier(0.32,0,0.12,1)";
        wrap.style.transform     = "translateY(100%)";
        wrap.style.pointerEvents = "none";
        window.dispatchEvent(new CustomEvent("chess-reveal-dismissed"));
      }

      if (s.virtualScroll >= TOTAL_VIRTUAL) {
        setTimeout(() => {
          s.active = false;
          wrap.style.transition    = "transform 0.5s cubic-bezier(0.32,0,0.12,1)";
          wrap.style.transform     = "translateY(100%)";
          wrap.style.pointerEvents = "none";
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

    /* Render loop ───────────────────────────────────────────────────── */
    const tick = (ts: number) => {
      s.rafId = requestAnimationFrame(tick);
      // Keep rendering for a bit after deactivation so slide-out is smooth
      if (!s.active && s.virtualScroll <= 0) { s.lastTs = ts; return; }

      const dt = Math.min((ts - (s.lastTs || ts)) / 1000, 0.05);
      s.lastTs  = ts;
      s.time   += dt;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = window.innerWidth, H = window.innerHeight;
      const cx = W * 0.5, cy = H * 0.5;

      ctx.clearRect(0, 0, W, H);

      const p = s.virtualScroll / TOTAL_VIRTUAL;

      // ── Phase breakpoints ──────────────────────────────────────────
      // 0.00–0.08  intro: grid + pawn appears
      // 0.08–0.48  pawn grows, warp lines build
      // 0.48–0.64  pawn→queen morph, blue fills
      // 0.64–0.78  full blue, headline reveals
      // 0.78–0.90  spiral rings + manifesto phrases
      // 0.90–1.00  final screen: "Your satisfaction always"

      const introP    = ease(invlerp(0.00, 0.08, p));
      const growP     = ease(invlerp(0.08, 0.48, p));
      const morphP    = ease(invlerp(0.48, 0.64, p));
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

      // Chess piece
      const maxSize = Math.min(W, H) * 0.40;
      const minSize = maxSize * 0.048;
      const sizeT   = ease(clamp(growP + morphP * 0.28, 0, 1));
      const pSize   = minSize + (maxSize - minSize) * sizeT;
      const pAlpha  = introP;

      if (morphP < 1) {
        drawPawn(ctx, cx, cy, pSize, pAlpha * (1 - morphP));
      }
      if (morphP > 0) {
        drawQueen(ctx, cx, cy, pSize, pAlpha * Math.min(1, morphP * 1.6));
      }

      // Main headline
      if (headlineP > 0) {
        drawHeadline(ctx, W, H, "TURN YOUR\nDREAMS TO\nREALITY", headlineP, 0.50);
      }

      // Manifesto phrases
      if (phrasesP > 0) drawPhrases(ctx, W, H, phrasesP);

      // Final screen
      if (finalP > 0) {
        // Dim previous headline
        ctx.save();
        ctx.globalAlpha = finalP * 0.75;
        ctx.fillStyle   = "#05080f";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        drawRings(ctx, cx, cy, 1, s.time);
        drawSpeedLines(ctx, cx, cy, W, H, 0.30, s.time * 0.6);
        drawHeadline(ctx, W, H, "YOUR SATISFACTION\nALWAYS", finalP, 0.44);

        // Small queen below the text
        drawQueen(ctx, cx, cy + H * 0.28, maxSize * 0.22, finalP * 0.55);
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
      style={{ transform: "translateY(100%)", pointerEvents: "none" }}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
});

ChessReveal.displayName = "ChessReveal";
export default ChessReveal;
