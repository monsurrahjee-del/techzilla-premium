"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import styles from "./Portfolio.module.css";
import { projects } from "@/lib/projects";
import type { BillboardPos, Theme, CarColors } from "./ProjectWorld";

const ProjectWorld = dynamic(() => import("./ProjectWorld"), { ssr: false });

// ── Module-level flag: survives SPA navigation re-mounts ────────────────────
// Once the user has driven the car, never show the controls hint again.
let _portfolioMoved = false;

// ── CSS Perspective helper ───────────────────────────────────────────────────
// Maps a W×H rectangle (at left:0 top:0 with transform-origin:0 0) to 4
// arbitrary screen-space points [TL, TR, BR, BL] via a CSS matrix3d
// computed from the 3×3 projective homography.
const BB_W = 350; // natural display width in px
const BB_H = 200; // natural display height in px (5.6:3.2 ≈ 1.75 ratio)

function perspectiveCSS(
  W: number, H: number,
  pts: [[number,number],[number,number],[number,number],[number,number]]
): string {
  const [x1,y1] = pts[0]; // TL ← (0,0)
  const [x2,y2] = pts[1]; // TR ← (W,0)
  const [x3,y3] = pts[2]; // BR ← (W,H)
  const [x4,y4] = pts[3]; // BL ← (0,H)

  // 8×8 linear system for the 3×3 projective matrix [h1…h8, h9=1]
  const A: number[][] = [
    [0, 0, 1, 0, 0, 0,      0,      0],
    [0, 0, 0, 0, 0, 1,      0,      0],
    [W, 0, 1, 0, 0, 0, -x2*W,      0],
    [0, 0, 0, W, 0, 1, -y2*W,      0],
    [W, H, 1, 0, 0, 0, -x3*W, -x3*H],
    [0, 0, 0, W, H, 1, -y3*W, -y3*H],
    [0, H, 1, 0, 0, 0,      0, -x4*H],
    [0, 0, 0, 0, H, 1,      0, -y4*H],
  ];
  const b = [x1, y1, x2, y2, x3, y3, x4, y4];

  // Gaussian elimination with partial pivoting
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-10) return ""; // degenerate quad
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row][col] / pivot;
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k];
    }
  }
  const h = M.map((row, i) => row[n] / row[i]);
  const [h1,h2,h3,h4,h5,h6,h7,h8] = h;

  // CSS matrix3d in column-major order (W3C spec):
  // col0=(h1,h4,0,h7), col1=(h2,h5,0,h8), col2=(0,0,1,0), col3=(h3,h6,0,1)
  return `matrix3d(${h1},${h4},0,${h7},${h2},${h5},0,${h8},0,0,1,0,${h3},${h6},0,1)`;
}

// ── Car colour palettes — mirrors JS-3D-Car's materialsLib ──────────────────
const BODY_COLORS = [
  { label: "Orange",   hex: "#ff4400" },
  { label: "Blue",     hex: "#001166" },
  { label: "Red",      hex: "#990000" },
  { label: "Black",    hex: "#111111" },
  { label: "White",    hex: "#e8eaf2" },
  { label: "Metallic", hex: "#667788" },
];

const RIM_COLORS = [
  { label: "Orange",   hex: "#ff4400" },
  { label: "Blue",     hex: "#001166" },
  { label: "Red",      hex: "#990000" },
  { label: "Black",    hex: "#111111" },
  { label: "White",    hex: "#e8eaf2" },
  { label: "Metallic", hex: "#888899" },
];

const GLASS_COLORS = [
  { label: "Clear",  hex: "#aaccff", opacity: 0.20 },
  { label: "Smoked", hex: "#222222", opacity: 0.28 },
  { label: "Blue",   hex: "#001133", opacity: 0.22 },
];

interface PortfolioProps {
  active?: boolean;
}

export default function Portfolio({ active = false }: PortfolioProps) {
  const [nearIdx,    setNearIdx]    = useState<number | null>(null);
  const [mounted,    setMounted]    = useState(false);
  // Start hidden if user has already driven before (survives SPA re-mounts)
  const [hintHidden,   setHintHidden]   = useState(_portfolioMoved);
  const [colorsHidden, setColorsHidden] = useState(false);
  const [theme,      setTheme]      = useState<Theme>("dark");
  const [dpadState,  setDpadState]  = useState({ up: false, down: false, left: false, right: false });

  // Car colours — default: black body, metallic rims, clear glass (like the repo defaults)
  const [bodyIdx,  setBodyIdx]  = useState(3); // black
  const [rimIdx,   setRimIdx]   = useState(5); // metallic
  const [glassIdx, setGlassIdx] = useState(0); // clear

  const carColors: CarColors = {
    body:         BODY_COLORS[bodyIdx].hex,
    rim:          RIM_COLORS[rimIdx].hex,
    glass:        GLASS_COLORS[glassIdx].hex,
    glassOpacity: GLASS_COLORS[glassIdx].opacity,
  };

  // Billboard overlay — updated via DOM refs to avoid re-renders
  const overlayRef      = useRef<HTMLDivElement>(null);
  const iframeRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const iframeElRefs    = useRef<(HTMLIFrameElement | null)[]>([]);  // actual <iframe> nodes
  const iframeLoaded    = useRef<Set<number>>(new Set()); // lazy: only load src on first approach
  const nearIdxRef      = useRef<number | null>(null);   // mirror of nearIdx without stale closure
  // Initialise from the module-level flag so hint stays gone after SPA re-mounts
  const movedRef        = useRef(_portfolioMoved);

  // Mount Three.js world when section becomes active
  useEffect(() => {
    if (active && !mounted) setMounted(true);
  }, [active, mounted]);

  // Hint: hide after first key press / touch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!movedRef.current && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","s","a","d"].includes(e.key)) {
        movedRef.current = true;
        _portfolioMoved  = true; // persist across SPA re-mounts
        setTimeout(() => setHintHidden(true), 1800);
        // Hide colour panel quickly — 400 ms feels responsive without being jarring
        setTimeout(() => setColorsHidden(true), 400);
      }
    };
    window.addEventListener("keydown", onKey, { passive: true });
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Colour panel: only re-show at boundary if user has NEVER moved yet.
  // Once they've driven away the colour picker stays hidden permanently.
  const handleAtBoundary = useCallback((at: boolean) => {
    if (at && !movedRef.current) setColorsHidden(false);
  }, []);

  // Billboard projection — apply CSS matrix3d perspective so the iframe
  // appears physically INSIDE the 3-D billboard screen rather than a flat sticker.
  const handleBillboardPos = useCallback((positions: BillboardPos[]) => {
    positions.forEach((pos, i) => {
      const el = iframeRefs.current[i];
      if (!el) return;
      if (pos.visible && pos.corners) {
        const xfm = perspectiveCSS(BB_W, BB_H, pos.corners);
        if (!xfm) { el.style.display = "none"; return; }
        el.style.display         = "block";
        el.style.left            = "0";
        el.style.top             = "0";
        el.style.width           = `${BB_W}px`;
        el.style.height          = `${BB_H}px`;
        el.style.transformOrigin = "0 0";
        el.style.transform       = xfm;
      } else {
        el.style.display = "none";
      }
    });
  }, []);

  const handleNear = useCallback((idx: number | null) => {
    nearIdxRef.current = idx;
    setNearIdx(idx);
    // Lazy-load the iframe src the very first time the car approaches a billboard.
    // All 6 iframes loading simultaneously is the single biggest perf cost.
    if (idx !== null && !iframeLoaded.current.has(idx)) {
      iframeLoaded.current.add(idx);
      const ifrEl = iframeElRefs.current[idx];
      if (ifrEl && !ifrEl.src) ifrEl.src = `https://${projects[idx].url}`;
    }
  }, []);

  // D-pad
  const fireCarKey = (key: string, pressed: boolean) => {
    window.dispatchEvent(new CustomEvent("car-key", { detail: { key, pressed } }));
    if (pressed && !movedRef.current) {
      movedRef.current = true;
      _portfolioMoved  = true;
      setTimeout(() => setHintHidden(true), 1800);
      setTimeout(() => setColorsHidden(true), 400);
    }
  };
  const dpadPress   = (key: string) => { setDpadState(s => ({ ...s, [key]: true }));  fireCarKey(key, true); };
  const dpadRelease = (key: string) => { setDpadState(s => ({ ...s, [key]: false })); fireCarKey(key, false); };
  const makeDpad    = (key: string) => ({
    onPointerDown:  (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); dpadPress(key); },
    onPointerUp:    () => dpadRelease(key),
    onPointerLeave: () => dpadRelease(key),
  });

  const isDark = theme === "dark";
  const currentProject = nearIdx !== null ? projects[nearIdx] : null;

  return (
    <section className={`${styles.section} ${isDark ? styles.dark : styles.light}`}>
      {/* Three.js canvas */}
      <div className={styles.canvasWrap}>
        {mounted && (
          <ProjectWorld
            onNearProject={handleNear}
            onBillboardPos={handleBillboardPos}
            onAtBoundary={handleAtBoundary}
            theme={theme}
            carColors={carColors}
          />
        )}
      </div>

      {/* ── Billboard iframe overlays (projected onto 3D billboards) ── */}
      <div ref={overlayRef} className={styles.billboardOverlay} aria-hidden="true">
        {projects.map((p, i) => (
          <div
            key={i}
            ref={el => { iframeRefs.current[i] = el; }}
            className={styles.billboardFrame}
            style={{ display: "none" }}
          >
            {/* src is set lazily via iframeElRefs when the car first approaches */}
            <iframe
              ref={el => { iframeElRefs.current[i] = el; }}
              title={p.title}
              className={styles.billboardIframe}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.sectionLabel}>Memory Lane</span>
        <h2 className={`${styles.sectionTitle} ${isDark ? styles.titleDark : styles.titleLight}`}>
          Our Work
        </h2>
      </div>

      {/* ── Light / Dark toggle (icon-only) ── */}
      <button
        className={`${styles.themeToggle} ${isDark ? styles.toggleDark : styles.toggleLight}`}
        onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
        aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
        title={isDark ? "Day mode" : "Night mode"}
      >
        {isDark ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1"  x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1"  y1="12" x2="3"  y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      {/* ── Car colour picker — mirrors JS-3D-Car's material selector ── */}
      <div className={`${styles.colorPanel} ${isDark ? styles.colorPanelDark : styles.colorPanelLight} ${colorsHidden ? styles.hidden : ""}`}>
        {/* Body */}
        <div className={styles.colorRow}>
          <span className={`${styles.colorLabel} ${isDark ? styles.colorLabelDark : styles.colorLabelLight}`}>Body</span>
          <div className={styles.swatches}>
            {BODY_COLORS.map((c, i) => (
              <button
                key={i}
                title={c.label}
                className={`${styles.swatch} ${bodyIdx === i ? styles.swatchActive : ""}`}
                style={{ background: c.hex }}
                onClick={() => setBodyIdx(i)}
                aria-label={`Body colour: ${c.label}`}
              />
            ))}
          </div>
        </div>

        {/* Rim */}
        <div className={styles.colorRow}>
          <span className={`${styles.colorLabel} ${isDark ? styles.colorLabelDark : styles.colorLabelLight}`}>Rims</span>
          <div className={styles.swatches}>
            {RIM_COLORS.map((c, i) => (
              <button
                key={i}
                title={c.label}
                className={`${styles.swatch} ${rimIdx === i ? styles.swatchActive : ""}`}
                style={{ background: c.hex }}
                onClick={() => setRimIdx(i)}
                aria-label={`Rim colour: ${c.label}`}
              />
            ))}
          </div>
        </div>

        {/* Glass */}
        <div className={styles.colorRow}>
          <span className={`${styles.colorLabel} ${isDark ? styles.colorLabelDark : styles.colorLabelLight}`}>Glass</span>
          <div className={styles.swatches}>
            {GLASS_COLORS.map((c, i) => (
              <button
                key={i}
                title={c.label}
                className={`${styles.swatch} ${glassIdx === i ? styles.swatchActive : ""}`}
                style={{ background: c.hex, opacity: 0.7 + c.opacity }}
                onClick={() => setGlassIdx(i)}
                aria-label={`Glass colour: ${c.label}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Project info card ── */}
      <div className={`${styles.projectCard} ${currentProject ? styles.visible : ""} ${isDark ? styles.cardDark : styles.cardLight}`}>
        {currentProject && (
          <>
            {/* Live website preview */}
            <div className={styles.previewWrap} style={{ borderColor: currentProject.accent + "55" }}>
              <iframe
                key={currentProject.url}
                src={`https://${currentProject.url}`}
                title={`${currentProject.title} preview`}
                className={styles.previewIframe}
                sandbox="allow-scripts allow-same-origin allow-forms"
                loading="lazy"
              />
              <div className={styles.previewOverlay} style={{ background: `linear-gradient(to bottom, transparent 60%, ${isDark ? "#08080f" : "#f4f6ff"} 100%)` }} />
              <a
                href={`https://${currentProject.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.previewLiveChip}
                style={{ background: currentProject.accent + "22", color: currentProject.accent, border: `1px solid ${currentProject.accent}55` }}
              >
                <span className={styles.liveDot} style={{ background: currentProject.accent }} />
                Live
              </a>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.cardAccentBar} style={{ background: currentProject.accent }} />
              <p className={`${styles.cardCategory} ${isDark ? styles.catDark : styles.catLight}`}>{currentProject.category}</p>
              <h3 className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : styles.cardTitleLight}`}>{currentProject.title}</h3>
              <div className={styles.techRow}>
                {currentProject.tech.map((tech) => (
                  <span key={tech} className={`${styles.techPill} ${isDark ? styles.pillDark : styles.pillLight}`}>{tech}</span>
                ))}
              </div>
              <div className={`${styles.cardDivider} ${isDark ? styles.divDark : styles.divLight}`} />
              <a
                href={`https://${currentProject.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cardLink}
                style={{ background: currentProject.accent + "22", color: currentProject.accent, border: `1px solid ${currentProject.accent}44` }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Visit {currentProject.url}
              </a>
            </div>
          </>
        )}
      </div>

      {/* ── Progress dots ── */}
      <div className={styles.progressBar}>
        {projects.map((p, i) => (
          <div
            key={i}
            className={`${styles.dot} ${nearIdx === i ? styles.activeDot : ""}`}
            style={nearIdx === i ? { background: p.accent } : undefined}
          />
        ))}
      </div>

      {/* ── Keyboard hint ── */}
      <div className={`${styles.controlsHint} ${hintHidden ? styles.hidden : ""}`}>
        <div className={styles.keyGroup}>
          <div className={styles.keyRow}><div className={styles.key}>↑</div></div>
          <div className={styles.keyRow}>
            <div className={styles.key}>←</div>
            <div className={styles.key}>↓</div>
            <div className={styles.key}>→</div>
          </div>
        </div>
        <span className={styles.hintText}>Drive to explore</span>
      </div>

      {/* ── Mobile D-pad ── */}
      <div className={styles.dpad}>
        <div className={styles.dpadRow}>
          <button className={`${styles.dpadBtn} ${dpadState.up    ? styles.pressed : ""}`} {...makeDpad("up")}    aria-label="Forward">▲</button>
        </div>
        <div className={styles.dpadRow}>
          <button className={`${styles.dpadBtn} ${dpadState.left  ? styles.pressed : ""}`} {...makeDpad("left")}  aria-label="Left">◀</button>
          <button className={`${styles.dpadBtn} ${dpadState.down  ? styles.pressed : ""}`} {...makeDpad("down")}  aria-label="Reverse">▼</button>
          <button className={`${styles.dpadBtn} ${dpadState.right ? styles.pressed : ""}`} {...makeDpad("right")} aria-label="Right">▶</button>
        </div>
      </div>
    </section>
  );
}
