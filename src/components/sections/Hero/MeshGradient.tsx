"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

/**
 * Techzilla's signature visual identity: "Engineering Core"
 *
 * A living procedural node network communicating software architecture,
 * data intelligence, and engineering precision.
 *
 * Canvas layers (back → front):
 *   1. Three slow rotating light rays from cursor origin
 *   2. Edge connections — thin lines between nearby nodes, fade with distance
 *   3. Data pulses — bright dots racing along edges, spawning recursively
 *   4. Nodes — breathing circles with cluster-based color identity
 *   5. Cursor spotlight — volumetric radial glow follows mouse
 *   6. Depth fog — bottom-of-canvas atmosphere
 *
 * Four node clusters (each with its own color identity):
 *   • Core (electric blue)   — primary app logic
 *   • Intelligence (violet)  — AI/ML layer
 *   • Infrastructure (teal)  — cloud/infra
 *   • Interface (sky blue)   — frontend/API
 */
export default function MeshGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, animId = 0;
    let mx = 0.5, my = 0.5;
    let lmx = 0.5, lmy = 0.5;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX / window.innerWidth;
      my = e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    // Mobile: reduce node count for 60fps
    const isMobile = window.matchMedia("(pointer: coarse)").matches;

    // ── Cluster color palette ──────────────────────────────────────────────
    const CLUSTERS = [
      { r: 60,  g: 110, b: 255 },  // Core: electric blue
      { r: 140, g: 80,  b: 255 },  // Intelligence: violet
      { r: 40,  g: 200, b: 180 },  // Infrastructure: teal
      { r: 80,  g: 170, b: 255 },  // Interface: sky blue
    ];

    interface Node {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      brightness: number;
      phase: number;
      cluster: number;
      rippleAge: number;
    }
    interface Edge { a: number; b: number; }
    interface Pulse {
      edge: number;
      t: number;
      speed: number;
      dir: 1 | -1;
    }

    let nodes: Node[] = [];
    let edges: Edge[] = [];
    let pulses: Pulse[] = [];

    const buildNetwork = () => {
      const density = isMobile ? 18000 : 10500;
      const maxNodes = isMobile ? 36 : 68;
      const count = Math.min(Math.floor((W * H) / density), maxNodes);
      nodes = Array.from({ length: count }, () => {
        const x = (0.04 + Math.random() * 0.92) * W;
        const y = (0.06 + Math.random() * 0.88) * H;
        return {
          x, y,
          vx: (Math.random() - 0.5) * 0.10,
          vy: (Math.random() - 0.5) * 0.10,
          r:  1.4 + Math.random() * 2.8,
          brightness: 0,
          phase: Math.random() * Math.PI * 2,
          cluster: Math.floor(Math.random() * 4),
          rippleAge: -1,
        };
      });

      edges = [];
      const maxEdgeDist = Math.max(W, H) * 0.155;
      for (let i = 0; i < nodes.length; i++) {
        let connections = 0;
        const dists = [];
        for (let j = 0; j < nodes.length; j++) {
          if (j === i) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          dists.push({ j, d: Math.sqrt(dx * dx + dy * dy) });
        }
        dists.sort((a, b) => a.d - b.d);
        for (const { j, d } of dists) {
          if (connections >= 5) break;
          if (d > maxEdgeDist) break;
          if (!edges.some(e => (e.a === j && e.b === i) || (e.a === i && e.b === j))) {
            edges.push({ a: i, b: j });
            connections++;
          }
        }
      }

      pulses = [];
      const initialPulses = isMobile ? 8 : 15;
      for (let i = 0; i < initialPulses; i++) spawnPulse();
    };

    const maxPulseCount = isMobile ? 12 : 22;
    const minPulseCount = isMobile ? 6  : 14;

    const spawnPulse = () => {
      if (edges.length === 0) return;
      if (pulses.length >= maxPulseCount) return;
      const ei = Math.floor(Math.random() * edges.length);
      pulses.push({
        edge: ei,
        t: Math.random(),
        speed: 0.0018 + Math.random() * 0.0038,
        dir: Math.random() > 0.5 ? 1 : -1,
      });
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
      buildNetwork();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(document.documentElement);
    resize();

    const MAX_EDGE_DIST = () => Math.max(W, H) * 0.16;

    const draw = (t: number) => {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      // Smooth cursor tracking
      lmx += (mx - lmx) * 0.042;
      lmy += (my - lmy) * 0.042;
      const lcx = lmx * W;
      const lcy = lmy * H;

      // 1. Light rays ────────────────────────────────────────────────────────
      for (let i = 0; i < 3; i++) {
        const angle  = t * 0.000055 + (i * Math.PI * 2) / 3;
        const len    = Math.max(W, H) * 1.4;
        const spread = 0.22;
        const x1     = lcx + Math.cos(angle) * len;
        const y1     = lcy + Math.sin(angle) * len;
        const cx1    = lcx + Math.cos(angle - spread) * len;
        const cy1    = lcy + Math.sin(angle - spread) * len;
        const cx2    = lcx + Math.cos(angle + spread) * len;
        const cy2    = lcy + Math.sin(angle + spread) * len;
        const ray = ctx.createLinearGradient(lcx, lcy, x1, y1);
        ray.addColorStop(0,   "rgba(70,130,255,0.042)");
        ray.addColorStop(0.5, "rgba(50,100,255,0.016)");
        ray.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.moveTo(lcx, lcy);
        ctx.lineTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.closePath();
        ctx.fillStyle = ray;
        ctx.fill();
      }

      const maxEdgeDist = MAX_EDGE_DIST();

      // 2. Update nodes + compute brightness ─────────────────────────────────
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0.02 * W || n.x > 0.98 * W) n.vx *= -0.9;
        if (n.y < 0.02 * H || n.y > 0.98 * H) n.vy *= -0.9;
        n.phase += 0.009;

        const dx   = n.x - lcx;
        const dy   = n.y - lcy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(W, H) * 0.30;
        const target = Math.max(0, 1 - dist / influence);
        n.brightness += (target - n.brightness) * 0.052;

        if (dist < 90 && n.rippleAge < 0) n.rippleAge = 0;
        if (n.rippleAge >= 0) {
          n.rippleAge += 0.020;
          if (n.rippleAge > 1) n.rippleAge = -1;
        }
      }

      // 3. Draw edges ────────────────────────────────────────────────────────
      for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        if (!a || !b) continue;
        const dx   = a.x - b.x;
        const dy   = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxEdgeDist) continue;

        const brightness = (a.brightness + b.brightness) * 0.5;
        const fade  = 1 - dist / maxEdgeDist;
        const alpha = (0.030 + brightness * 0.24) * fade;
        const c     = CLUSTERS[a.cluster];

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha.toFixed(3)})`;
        ctx.lineWidth   = 0.5 + brightness * 1.0;
        ctx.stroke();
      }

      // 4. Draw nodes ────────────────────────────────────────────────────────
      for (const n of nodes) {
        const breathe = 0.88 + Math.sin(n.phase) * 0.12;
        const r = n.r * breathe * (1 + n.brightness * 2.4);
        const c = CLUSTERS[n.cluster];
        const alpha = 0.10 + n.brightness * 0.85;

        if (n.brightness > 0.03) {
          const glowR = r * 10;
          const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
          glow.addColorStop(0,   `rgba(${c.r},${c.g},${c.b},${(n.brightness * 0.15).toFixed(3)})`);
          glow.addColorStop(0.4, `rgba(${c.r},${c.g},${c.b},${(n.brightness * 0.045).toFixed(3)})`);
          glow.addColorStop(1,   "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(r, 0.8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha.toFixed(3)})`;
        ctx.fill();

        if (n.rippleAge >= 0) {
          const rr = r + n.rippleAge * 30;
          const ra = (1 - n.rippleAge) * 0.38;
          ctx.beginPath();
          ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${ra.toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // 5. Data pulses ───────────────────────────────────────────────────────
      pulses = pulses.filter(p => {
        p.t += p.speed * p.dir;
        if (p.t > 1 || p.t < 0) {
          if (pulses.length < maxPulseCount && Math.random() > 0.35) spawnPulse();
          return false;
        }
        const e = edges[p.edge];
        if (!e) return false;
        const a = nodes[e.a], b = nodes[e.b];
        if (!a || !b) return false;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const c = CLUSTERS[a.cluster];
        const pr = 2.8;

        const pg = ctx.createRadialGradient(x, y, 0, x, y, pr * 5);
        pg.addColorStop(0,   `rgba(${c.r},${c.g},${c.b},0.58)`);
        pg.addColorStop(0.4, `rgba(${c.r},${c.g},${c.b},0.14)`);
        pg.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, pr * 5, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, pr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.92)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, pr * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.78)";
        ctx.fill();

        return true;
      });

      while (pulses.length < minPulseCount) spawnPulse();

      // 6. Cursor spotlight ──────────────────────────────────────────────────
      const spotR = Math.max(W, H) * 0.44;
      const spot = ctx.createRadialGradient(lcx, lcy, 0, lcx, lcy, spotR);
      spot.addColorStop(0,    "rgba(55,95,255,0.092)");
      spot.addColorStop(0.3,  "rgba(40,72,220,0.040)");
      spot.addColorStop(0.65, "rgba(20,40,180,0.014)");
      spot.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, H);

      // 7. Depth fog — atmospheric gradient at bottom of canvas ───────────
      const fogH = H * 0.28;
      const fog = ctx.createLinearGradient(0, H - fogH, 0, H);
      fog.addColorStop(0, "rgba(4,10,58,0)");
      fog.addColorStop(1, "rgba(4,10,58,0.22)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, H - fogH, W, fogH);

      // Subtle top fog (light from top)
      const topFog = ctx.createLinearGradient(0, 0, 0, H * 0.15);
      topFog.addColorStop(0, "rgba(20,40,140,0.08)");
      topFog.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topFog;
      ctx.fillRect(0, 0, W, H * 0.15);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div className={styles.mesh} aria-hidden="true">
      {/* CSS animated gradient blobs — GPU composited */}
      <span /><span /><span /><span /><span />
      {/* Engineering Core canvas */}
      <canvas ref={canvasRef} className={styles.atmosphereCanvas} />
    </div>
  );
}
