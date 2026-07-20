/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * vaporize.worker.ts
 * Runs entirely in a Web Worker. Manages the particle animation on an OffscreenCanvas.
 * Uses setTimeout for animation timing (requestAnimationFrame is not available in workers).
 *
 * Main → Worker messages:
 *   { type: 'init',  canvas: OffscreenCanvas, config: WorkerConfig }
 *   { type: 'stop' }
 *
 * Worker → Main messages:
 *   { type: 'text_changed',   index: number }
 *   { type: 'cycle_complete' }
 */

type AnimState = "static" | "vaporizing" | "fadingIn" | "waiting";

interface WorkerConfig {
  texts: string[];
  font: { fontFamily?: string; fontSize?: string; fontWeight?: number };
  color: string;
  spread: number;
  density: number;
  direction: "left-to-right" | "right-to-left";
  alignment: "left" | "center" | "right";
  durations: { VAPORIZE: number; FADE_IN: number; WAIT: number };
  dpr: number;
}

interface Particle {
  x: number; y: number;
  originalX: number; originalY: number;
  r: number; g: number; b: number;
  opacity: number; originalAlpha: number;
  velocityX: number; velocityY: number;
  angle: number; speed: number;
  shouldFadeQuickly?: boolean;
}

interface TextBoundaries { left: number; right: number; width: number }

// ── helpers ───────────────────────────────────────────────────────────────────

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

function transformValue(input: number, inR: number[], outR: number[], clamp = false): number {
  const progress = (input - inR[0]) / (inR[1] - inR[0]);
  let result = outR[0] + progress * (outR[1] - outR[0]);
  if (clamp) {
    if (outR[1] > outR[0]) result = Math.min(Math.max(result, outR[0]), outR[1]);
    else result = Math.min(Math.max(result, outR[1]), outR[0]);
  }
  return result;
}

function parseColor(color: string): string {
  const rgba = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (rgba) return `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${rgba[4]})`;
  const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},1)`;
  return "rgba(0,0,0,1)";
}

function parseFontSize(raw: string, dpr: number): number {
  let sz: number;
  if (raw.endsWith("vw")) sz = Math.round(parseFloat(raw) * 10);
  else if (raw.endsWith("rem")) sz = Math.round(parseFloat(raw) * 16);
  else sz = parseInt(raw) || 50;
  return sz;
}

function createParticles(
  ctx: OffscreenCanvasRenderingContext2D,
  canvas: OffscreenCanvas,
  text: string, textX: number, textY: number,
  fontStr: string, color: string,
  alignment: "left" | "center" | "right",
  dpr: number,
  transformedDensity: number,
): { particles: Particle[]; textBoundaries: TextBoundaries } {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = fontStr;
  ctx.textAlign = alignment;
  ctx.textBaseline = "middle";
  (ctx as any).imageSmoothingQuality = "high";
  (ctx as any).imageSmoothingEnabled = true;
  if ("fontKerning"   in ctx) (ctx as any).fontKerning   = "normal";
  if ("textRendering" in ctx) (ctx as any).textRendering = "geometricPrecision";

  const metrics  = ctx.measureText(text);
  const textWidth = metrics.width;
  let textLeft: number;
  if (alignment === "center")     textLeft = textX - textWidth / 2;
  else if (alignment === "left")  textLeft = textX;
  else                             textLeft = textX - textWidth;
  const textBoundaries: TextBoundaries = { left: textLeft, right: textLeft + textWidth, width: textWidth };

  ctx.fillText(text, textX, textY);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data    = imgData.data;
  const curDPR  = canvas.width / (canvas.width / dpr); // = dpr, but computed from canvas dims
  // Stride of 2 keeps particle count manageable without hurting visual quality
  // (particles are 1.5×1.5px squares, so skipping every other pixel is invisible)
  const sr = Math.max(2, Math.round(dpr));

  const particles: Particle[] = [];
  for (let y = 0; y < canvas.height; y += sr) {
    for (let x = 0; x < canvas.width; x += sr) {
      const idx = (y * canvas.width + x) * 4;
      const a   = data[idx + 3];
      if (a > 0) {
        const oa = Math.min(1, (a / 255) * 3.0);
        particles.push({
          x, y,
          originalX: x, originalY: y,
          r: data[idx], g: data[idx + 1], b: data[idx + 2],
          opacity: oa, originalAlpha: oa,
          velocityX: 0, velocityY: 0,
          angle: 0, speed: 0,
        });
      }
    }
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return { particles, textBoundaries };
}

function updateParticles(
  particles: Particle[], vX: number, dt: number,
  MULT_SPREAD: number, VAPORIZE: number,
  direction: string, density: number,
): boolean {
  let allVaporized = true;
  for (const p of particles) {
    const hit = direction === "left-to-right" ? p.originalX <= vX : p.originalX >= vX;
    if (hit) {
      if (p.speed === 0) {
        p.angle      = Math.random() * Math.PI * 2;
        p.speed      = (Math.random() * 1 + 0.5) * MULT_SPREAD;
        p.velocityX  = Math.cos(p.angle) * p.speed;
        p.velocityY  = Math.sin(p.angle) * p.speed;
        p.shouldFadeQuickly = Math.random() > density;
      }
      if (p.shouldFadeQuickly) {
        p.opacity = Math.max(0, p.opacity - dt * 2);
      } else {
        const dx   = p.originalX - p.x, dy = p.originalY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const damp = Math.max(0.95, 1 - dist / (100 * MULT_SPREAD));
        const rnd  = MULT_SPREAD * 3;
        p.velocityX = (p.velocityX + (Math.random() - 0.5) * rnd + dx * 0.002) * damp;
        p.velocityY = (p.velocityY + (Math.random() - 0.5) * rnd + dy * 0.002) * damp;
        const maxV = MULT_SPREAD * 2;
        const cur  = Math.sqrt(p.velocityX ** 2 + p.velocityY ** 2);
        if (cur > maxV) { p.velocityX *= maxV / cur; p.velocityY *= maxV / cur; }
        p.x += p.velocityX * dt * 20;
        p.y += p.velocityY * dt * 10;
        const fr = Math.max(0.5, 0.5 * (2000 / VAPORIZE) * (MULT_SPREAD / 9));
        p.opacity = Math.max(0, p.opacity - dt * fr);
      }
      if (p.opacity > 0.01) allVaporized = false;
    } else {
      allVaporized = false;
    }
  }
  return allVaporized;
}

function renderParticles(
  ctx: OffscreenCanvasRenderingContext2D,
  particles: Particle[], dpr: number,
): void {
  ctx.save();
  ctx.scale(dpr, dpr);
  for (const p of particles) {
    if (p.opacity > 0) {
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
      ctx.fillRect(p.x / dpr, p.y / dpr, 1.5, 1.5);
    }
  }
  ctx.restore();
}

function resetParticles(particles: Particle[]): void {
  for (const p of particles) {
    p.x = p.originalX; p.y = p.originalY;
    p.opacity = p.originalAlpha;
    p.speed = 0; p.velocityX = 0; p.velocityY = 0;
  }
}

// ── Worker state ──────────────────────────────────────────────────────────────

let canvas_: OffscreenCanvas | null = null;
let ctx_: OffscreenCanvasRenderingContext2D | null = null;
let cfg_: WorkerConfig | null = null;

let particles_: Particle[]     = [];
let textBoundaries_: TextBoundaries | null = null;

let animState_: AnimState  = "static";
let currentIdx_           = 0;
let vaporizeProgress_     = 0; // 0→100
let fadeOpacity_          = 0;
let done_                 = false;

let loopId_: ReturnType<typeof setTimeout> | null = null;
let lastTime_             = 0;
const FRAME_MS            = 1000 / 30; // 30 fps cap — decorative, doesn't need 60

// ── font ──────────────────────────────────────────────────────────────────────

function buildFontStr(cfg: WorkerConfig): string {
  const raw = cfg.font.fontSize || "50px";
  const sz  = parseFontSize(raw, cfg.dpr);
  return `${cfg.font.fontWeight ?? 400} ${sz * cfg.dpr}px ${cfg.font.fontFamily ?? "sans-serif"}`;
}

function computeParams(cfg: WorkerConfig) {
  const raw = cfg.font.fontSize || "50px";
  const sz  = parseFontSize(raw, cfg.dpr);
  const sp  = calculateVaporizeSpread(sz);
  const transformedDensity = transformValue(cfg.density, [0, 10], [0.3, 1], true);
  return {
    sz,
    VAPORIZE_SPREAD: sp,
    MULT_SPREAD: sp * cfg.spread,
    fontStr: `${cfg.font.fontWeight ?? 400} ${sz * cfg.dpr}px ${cfg.font.fontFamily ?? "sans-serif"}`,
    transformedDensity,
  };
}

// ── draw current text ─────────────────────────────────────────────────────────

function drawText(idx: number): void {
  if (!canvas_ || !ctx_ || !cfg_) return;
  const params = computeParams(cfg_);
  const color  = parseColor(cfg_.color);
  const tX     = cfg_.alignment === "center" ? canvas_.width / 2
               : cfg_.alignment === "left"   ? 0
               : canvas_.width;
  const tY     = canvas_.height / 2;
  const text   = cfg_.texts[idx] || cfg_.texts[0];
  const { particles, textBoundaries } = createParticles(
    ctx_, canvas_, text, tX, tY,
    params.fontStr, color,
    cfg_.alignment, cfg_.dpr, params.transformedDensity,
  );
  particles_     = particles;
  textBoundaries_= textBoundaries;
}

// ── animation loop ────────────────────────────────────────────────────────────

function schedule(): void {
  loopId_ = setTimeout(tick, FRAME_MS);
}

function tick(): void {
  loopId_ = null;
  if (!canvas_ || !ctx_ || !cfg_) return;

  const now     = Date.now();
  const elapsed = now - lastTime_;
  lastTime_     = now;
  const dt      = Math.min(elapsed / 1000, 0.1); // clamp to avoid huge jumps

  const params  = computeParams(cfg_);

  ctx_.clearRect(0, 0, canvas_.width, canvas_.height);

  switch (animState_) {
    case "static": {
      renderParticles(ctx_, particles_, cfg_.dpr);
      break;
    }
    case "vaporizing": {
      if (!textBoundaries_) break;
      vaporizeProgress_ += dt * 100 / (cfg_.durations.VAPORIZE / 1000);
      const prog = Math.min(100, vaporizeProgress_);
      const vX   = cfg_.direction === "left-to-right"
        ? textBoundaries_.left + textBoundaries_.width * prog / 100
        : textBoundaries_.right - textBoundaries_.width * prog / 100;
      const allDone = updateParticles(
        particles_, vX, dt, params.MULT_SPREAD,
        cfg_.durations.VAPORIZE, cfg_.direction, params.transformedDensity,
      );
      renderParticles(ctx_, particles_, cfg_.dpr);
      if (vaporizeProgress_ >= 100 && allDone) {
        const nextIdx = (currentIdx_ + 1) % cfg_.texts.length;
        if (nextIdx === 0 && !done_) {
          done_ = true;
          // Fire cycle_complete after fade finishes
          setTimeout(() => {
            self.postMessage({ type: "cycle_complete" });
          }, cfg_.durations.FADE_IN);
        } else if (!done_) {
          currentIdx_ = nextIdx;
          self.postMessage({ type: "text_changed", index: nextIdx });
          // Re-draw particles for new text
          drawText(nextIdx);
        }
        animState_   = "fadingIn";
        fadeOpacity_ = 0;
      }
      break;
    }
    case "fadingIn": {
      if (done_) {
        // Fade out remaining scattered particles
        let anyVisible = false;
        ctx_.save();
        ctx_.scale(cfg_.dpr, cfg_.dpr);
        for (const p of particles_) {
          p.opacity = Math.max(0, p.opacity - dt * 3);
          if (p.opacity > 0) {
            anyVisible = true;
            ctx_.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
            ctx_.fillRect(p.x / cfg_.dpr, p.y / cfg_.dpr, 1.5, 1.5);
          }
        }
        ctx_.restore();
        if (!anyVisible) return; // stop loop when canvas is clear
        break;
      }
      fadeOpacity_ += dt * 1000 / cfg_.durations.FADE_IN;
      ctx_.save();
      ctx_.scale(cfg_.dpr, cfg_.dpr);
      for (const p of particles_) {
        p.x = p.originalX;
        p.y = p.originalY;
        const op = Math.min(fadeOpacity_, 1) * p.originalAlpha;
        ctx_.fillStyle = `rgba(${p.r},${p.g},${p.b},${op})`;
        ctx_.fillRect(p.x / cfg_.dpr, p.y / cfg_.dpr, 1.5, 1.5);
      }
      ctx_.restore();
      if (fadeOpacity_ >= 1) {
        animState_ = "waiting";
        setTimeout(() => {
          animState_       = "vaporizing";
          vaporizeProgress_ = 0;
          resetParticles(particles_);
          schedule();
        }, cfg_.durations.WAIT);
        return; // don't schedule tick — waiting timer will do it
      }
      break;
    }
    case "waiting": {
      renderParticles(ctx_, particles_, cfg_.dpr);
      break;
    }
  }

  schedule();
}

// ── load fonts in worker context ──────────────────────────────────────────────

async function loadFonts(cfg: WorkerConfig): Promise<void> {
  try {
    const raw = cfg.font.fontSize || "50px";
    const sz  = parseFontSize(raw, cfg.dpr);
    const fs  = `${cfg.font.fontWeight ?? 400} ${sz * cfg.dpr}px ${cfg.font.fontFamily ?? "sans-serif"}`;
    // Workers have self.fonts (FontFaceSet) if the runtime supports it
    if (typeof (self as any).fonts?.load === "function") {
      await (self as any).fonts.load(fs);
    }
  } catch {
    // Font load failure is non-fatal — system fallback will be used
  }
}

// ── message handler ───────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "init") {
    canvas_ = msg.canvas as OffscreenCanvas;
    cfg_    = msg.config as WorkerConfig;
    ctx_    = canvas_.getContext("2d") as OffscreenCanvasRenderingContext2D;

    await loadFonts(cfg_);

    // Draw first text and start
    drawText(0);
    currentIdx_  = 0;
    animState_   = "fadingIn";
    fadeOpacity_ = 0;
    done_        = false;
    lastTime_    = Date.now();
    schedule();
    return;
  }

  if (msg.type === "stop") {
    if (loopId_ !== null) { clearTimeout(loopId_); loopId_ = null; }
    canvas_ = null; ctx_ = null; cfg_ = null;
    return;
  }
};
