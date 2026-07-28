"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

/**
 * Techzilla's signature visual identity: "Engineering Core"
 *
 * A living procedural node network that communicates software architecture,
 * data intelligence, and engineering precision — not generic futurism.
 *
 * Canvas layers (back → front):
 *   1. Atmospheric depth gradient
 *   2. Three slow rotating light rays from cursor origin
 *   3. Edge connections — thin lines between nearby nodes, fade with distance
 *   4. Data pulses — bright dots racing along edges, spawning recursively
 *   5. Nodes — breathing circles with cluster-based color identity
 *   6. Cursor spotlight — volumetric radial glow that follows mouse
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

    // ── Cluster color palette ──────────────────────────────────────────────
    const CLUSTERS = [
      { r: 60,  g: 110, b: 255 },  // Core: electric blue
      { r: 140, g: 80,  b: 255 },  // Intelligence: violet
      { r: 40,  g: 200, b: 180 },  // Infrastructure: teal
      { r: 80,  g: 170, b: 255 },  // Interface: sky blue
    ];

    // ── Types ──────────────────────────────────────────────────────────────
    interface Node {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      brightness: number;
      phase: number;
      cluster: number;
      rippleAge: number;  // -1 = none, 0-1 = ring expanding
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

    // ── Build node network ─────────────────────────────────────────────────
    const buildNetwork = () => {
      const count = Math.min(Math.floor((W * H) / 10500), 68);
      nodes = Array.from({ length: count }, () => {
        const x = (0.04 + Math.random() * 0.92) * W;
        const y = (0.06 + Math.random() * 0.88) * H;
        return {
          x, y,
          vx: (Math.random() - 0.5) * 0.11,
          vy: (Math.random() - 0.5) * 0.11,
          r:  1.4 + Math.random() * 2.8,
          brightness: 0,
          phase: Math.random() * Math.PI * 2,
          cluster: Math.floor(Math.random() * 4),
          rippleAge: -1,
        };
      });

      // Connect each node to its nearest 4-6 neighbours
      edges = [];
      const maxEdgeDist = Math.max(W, H) * 0.155;
      for (let i = 0; i < nodes.length; i++) {
        let connections = 0;
        // Sort by distance to find nearest
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
          // Avoid duplicate edges
          if (!edges.some(e => (e.a === j && e.b === i) || (e.a === i && e.b === j))) {
            edges.push({ a: i, b: j });
            connections++;
          }
        }
      }

      // Seed pulses
      pulses = [];
      for (let i = 0; i < 15; i++) spawnPulse();
    };

    const spawnPulse = () => {
      if (edges.length === 0) return;
      if (pulses.length >= 22) return;
      const ei = Math.floor(Math.random() * edges.length);
      pulses.push({
        edge: ei,
        t: Math.random(),
        speed: 0.0018 + Math.random() * 0.0038,
        dir:  Math.random() > 0.5 ? 1 : -1,
      });
    };

    // ── Resize ─────────────────────────────────────────────────────────────
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

    // ── Draw loop ──────────────────────────────────────────────────────────
    const MAX_EDGE_DIST = () => Math.max(W, H) * 0.16;

    const draw = (t: number) => {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      lmx += (mx - lmx) * 0.042;
      lmy += (my - lmy) * 0.042;
      const lcx = lmx * W;
      const lcy = lmy * H;

      // 1. Light rays ────────────────────────────────────────────────────────
      for (let i = 0; i < 3; i++) {
        const angle = t * 0.000062 + (i * Math.PI * 2) / 3;
        const len   = Math.max(W, H) * 1.35;
        const spread = 0.20;
        const x1 = lcx + Math.cos(angle) * len;
        const y1 = lcy + Math.sin(angle) * len;
        const cx1 = lcx + Math.cos(angle - spread) * len;
        const cy1 = lcy + Math.sin(angle - spread) * len;
        const cx2 = lcx + Math.cos(angle + spread) * len;
        const cy2 = lcy + Math.sin(angle + spread) * len;
        const ray = ctx.createLinearGradient(lcx, lcy, x1, y1);
        ray.addColorStop(0,   "rgba(70,130,255,0.038)");
        ray.addColorStop(0.5, "rgba(50,100,255,0.014)");
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
        n.phase += 0.010;

        const dx   = n.x - lcx;
        const dy   = n.y - lcy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(W, H) * 0.28;
        const target = Math.max(0, 1 - dist / influence);
        n.brightness += (target - n.brightness) * 0.055;

        // Ripple: trigger when cursor is very close
        if (dist < 90 && n.rippleAge < 0) {
          n.rippleAge = 0;
        }
        if (n.rippleAge >= 0) {
          n.rippleAge += 0.022;
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
        const alpha = (0.028 + brightness * 0.22) * fade;
        const c     = CLUSTERS[a.cluster];

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha.toFixed(3)})`;
        ctx.lineWidth   = 0.5 + brightness * 0.9;
        ctx.stroke();
      }

      // 4. Draw nodes ────────────────────────────────────────────────────────
      for (const n of nodes) {
        const breathe = 0.88 + Math.sin(n.phase) * 0.12;
        const r = n.r * breathe * (1 + n.brightness * 2.2);
        const c = CLUSTERS[n.cluster];
        const alpha = 0.10 + n.brightness * 0.82;

        // Outer glow (only when lit)
        if (n.brightness > 0.03) {
          const glowR = r * 9;
          const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
          glow.addColorStop(0,   `rgba(${c.r},${c.g},${c.b},${(n.brightness * 0.14).toFixed(3)})`);
          glow.addColorStop(0.4, `rgba(${c.r},${c.g},${c.b},${(n.brightness * 0.04).toFixed(3)})`);
          glow.addColorStop(1,   "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        // Node dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(r, 0.8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha.toFixed(3)})`;
        ctx.fill();

        // Ripple ring
        if (n.rippleAge >= 0) {
          const rr = r + n.rippleAge * 28;
          const ra = (1 - n.rippleAge) * 0.35;
          ctx.beginPath();
          ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${ra.toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // 5. Draw data pulses ──────────────────────────────────────────────────
      pulses = pulses.filter(p => {
        p.t += p.speed * p.dir;
        if (p.t > 1 || p.t < 0) {
          // Pulse reached end — maybe chain to another edge
          if (pulses.length < 20 && Math.random() > 0.35) spawnPulse();
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

        // Pulse trail glow
        const pg = ctx.createRadialGradient(x, y, 0, x, y, pr * 5);
        pg.addColorStop(0,   `rgba(${c.r},${c.g},${c.b},0.55)`);
        pg.addColorStop(0.4, `rgba(${c.r},${c.g},${c.b},0.12)`);
        pg.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, pr * 5, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();

        // Pulse core
        ctx.beginPath();
        ctx.arc(x, y, pr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.9)`;
        ctx.fill();

        // Bright centre
        ctx.beginPath();
        ctx.arc(x, y, pr * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fill();

        return true;
      });

      // Keep pulse population healthy
      while (pulses.length < 14) spawnPulse();

      // 6. Cursor spotlight ──────────────────────────────────────────────────
      const spot = ctx.createRadialGradient(lcx, lcy, 0, lcx, lcy, Math.max(W, H) * 0.42);
      spot.addColorStop(0,    "rgba(55,95,255,0.085)");
      spot.addColorStop(0.3,  "rgba(40,72,220,0.038)");
      spot.addColorStop(0.65, "rgba(20,40,180,0.012)");
      spot.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, H);
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
