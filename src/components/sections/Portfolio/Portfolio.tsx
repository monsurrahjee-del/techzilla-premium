"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import styles from "./Portfolio.module.css";
import { projects } from "@/lib/projects";
import type { Theme, CarColors } from "./ProjectWorld";
import { STATIONS } from "./ProjectWorld";

const RCCG_IDX   = STATIONS.length - 1; // last station — locked until Zennyola visited
const UNLOCK_IDX = STATIONS.length - 2; // Zennyola

const ProjectWorld = dynamic(() => import("./ProjectWorld"), { ssr: false });

// ── Module-level flag: survives SPA navigation re-mounts ────────────────────
let _portfolioMoved = false;

// ── Car colour palettes ──────────────────────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────────
type AutoPhase  = "idle" | "driving" | "arrived";
type ExploreMode = "preloading" | "modal" | "auto" | "manual";

interface PortfolioProps {
  active?: boolean;
}

export default function Portfolio({ active = false }: PortfolioProps) {
  const [nearIdx,      setNearIdx]      = useState<number | null>(null);
  const [mounted,      setMounted]      = useState(false);
  const [hintHidden,   setHintHidden]   = useState(_portfolioMoved);
  const [colorsHidden, setColorsHidden] = useState(false);
  const [theme,        setTheme]        = useState<Theme>("dark");
  const [dpadState,    setDpadState]    = useState({ up: false, down: false, left: false, right: false });

  // ── Mode state ────────────────────────────────────────────────────────────
  const [mode,       setMode]       = useState<ExploreMode>("preloading");
  const [preloadPct, setPreloadPct] = useState(0);

  // ── Autopilot ─────────────────────────────────────────────────────────────
  const [autoTargetIdx,   setAutoTargetIdx]   = useState(0);
  const [autopilotTarget, setAutopilotTarget] = useState<number | null>(null);
  const [autoPhase,       setAutoPhase]       = useState<AutoPhase>("idle");

  // Car colours
  const [bodyIdx,  setBodyIdx]  = useState(3);
  const [rimIdx,   setRimIdx]   = useState(5);
  const [glassIdx, setGlassIdx] = useState(0);

  // ── Tour ID — increments each time "Start Tour" is pressed ──────────────
  const [tourId, setTourId] = useState(0);

  // ── Rewind ID — increments each time "Prev" is pressed so the scene can
  //    rewind waypointIdx to just before the target station ─────────────────
  const [rewindId, setRewindId] = useState(0);

  // ── RCCG unlock — becomes true once car visits Zennyola (station UNLOCK_IDX) ─
  const [rccgUnlocked, setRccgUnlocked] = useState(false);

  const carColors: CarColors = {
    body:         BODY_COLORS[bodyIdx].hex,
    rim:          RIM_COLORS[rimIdx].hex,
    glass:        GLASS_COLORS[glassIdx].hex,
    glassOpacity: GLASS_COLORS[glassIdx].opacity,
  };

  const nearIdxRef = useRef<number | null>(null);
  const movedRef   = useRef(_portfolioMoved);

  // ── Mount world as soon as section becomes active ─────────────────────────
  useEffect(() => {
    if (active && !mounted) setMounted(true);
  }, [active, mounted]);

  // ── Preloader animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    if (mode !== "preloading") return;
    let start: number | null = null;
    const DURATION = 2200;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const pct = Math.min(100, ((ts - start) / DURATION) * 100);
      setPreloadPct(pct);
      if (pct < 100) { raf = requestAnimationFrame(tick); }
      else            { setMode("modal"); }
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, mode]);

  // ── Mode selection ────────────────────────────────────────────────────────
  const selectAuto = () => {
    setMode("auto");
    setAutoPhase("idle");
    setAutoTargetIdx(0);
    setAutopilotTarget(null);
    setHintHidden(true);
    setColorsHidden(true);
  };

  const selectManual = () => {
    setMode("manual");
    setColorsHidden(false);
    if (_portfolioMoved) setHintHidden(true);
  };

  const switchToManual = () => {
    setMode("manual");
    setAutopilotTarget(null);
    setAutoPhase("idle");
    setColorsHidden(false);
  };

  // ── Autopilot nav ─────────────────────────────────────────────────────────
  const driveToStation = useCallback((idx: number) => {
    const target = ((idx) + STATIONS.length) % STATIONS.length;
    setAutoTargetIdx(target);
    setAutopilotTarget(target);
    setAutoPhase("driving");
  }, []);

  const handleStartTour = () => {
    setRccgUnlocked(false); // re-lock RCCG at every tour start
    setTourId(id => id + 1);
    driveToStation(0);
  };

  const handleNext = () => {
    const next = (autoTargetIdx + 1) % STATIONS.length;
    // RCCG is the last station and is locked until Zennyola has been visited.
    if (next === RCCG_IDX && !rccgUnlocked) return;
    // When wrapping from last station back to first, reset the car to the
    // path start so it drives cleanly to station 0 instead of following the
    // tail of the recorded path and confusingly passing near Party Place first.
    if (next === 0 && autoTargetIdx === STATIONS.length - 1) {
      setRccgUnlocked(false); // re-lock RCCG when tour loops back to beginning
      setTourId(id => id + 1);
      driveToStation(0);
    } else {
      driveToStation(next);
    }
  };

  const handlePrev = () => {
    const prev = (autoTargetIdx - 1 + STATIONS.length) % STATIONS.length;
    setRewindId(id => id + 1);   // signal Scene to rewind waypointIdx before driving
    driveToStation(prev);
  };

  const handleAutoArrived = useCallback(() => {
    setAutoPhase("arrived");
    // Auto mode: unlock RCCG only once the car actually stops at Zennyola
    if (autoTargetIdx === UNLOCK_IDX) setRccgUnlocked(true);
  }, [autoTargetIdx]);

  // ── Hint: hide after first move (manual only) ─────────────────────────────
  useEffect(() => {
    if (mode !== "manual") return;
    const onKey = (e: KeyboardEvent) => {
      if (!movedRef.current && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","s","a","d"].includes(e.key)) {
        movedRef.current = true;
        _portfolioMoved  = true;
        setTimeout(() => setHintHidden(true),   1800);
        setTimeout(() => setColorsHidden(true),  400);
      }
    };
    window.addEventListener("keydown", onKey, { passive: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  const handleAtBoundary = useCallback((at: boolean) => {
    if (mode !== "manual") return;
    if (at && !movedRef.current) setColorsHidden(false);
  }, [mode]);

  const handleNear = useCallback((idx: number | null) => {
    nearIdxRef.current = idx;
    setNearIdx(idx);
    // Manual mode only: unlock RCCG when car reaches Zennyola.
    // Auto mode uses handleAutoArrived so it only fires after the car fully stops.
    if (mode === 'manual' && idx === UNLOCK_IDX) setRccgUnlocked(true);
  }, [mode]);

  // ── D-pad (manual only) ───────────────────────────────────────────────────
  const fireCarKey = (key: string, pressed: boolean) => {
    if (mode !== "manual") return;
    window.dispatchEvent(new CustomEvent("car-key", { detail: { key, pressed } }));
    if (pressed && !movedRef.current) {
      movedRef.current = true;
      _portfolioMoved  = true;
      setTimeout(() => setHintHidden(true),   1800);
      setTimeout(() => setColorsHidden(true),  400);
    }
  };
  const dpadPress   = (key: string) => { setDpadState(s => ({ ...s, [key]: true  })); fireCarKey(key, true); };
  const dpadRelease = (key: string) => { setDpadState(s => ({ ...s, [key]: false })); fireCarKey(key, false); };
  const makeDpad    = (key: string) => ({
    onPointerDown:  (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); dpadPress(key); },
    onPointerUp:    () => dpadRelease(key),
    onPointerLeave: () => dpadRelease(key),
  });

  const isDark          = theme === "dark";
  const currentProject  = nearIdx !== null ? projects[nearIdx] : null;
  const isManual        = mode === "manual";
  const tourStarted     = autoPhase !== "idle";

  return (
    <section className={`${styles.section} ${isDark ? styles.dark : styles.light}`}>

      {/* Three.js canvas */}
      {/* Render ProjectWorld only while Portfolio is active. Once mounted is true
          the preloader/mode state in Portfolio survives, but the R3F scene itself
          (and its 60fps RAF render loop) is torn down the moment Portfolio leaves
          view and restarted when it re-enters. This stops the Three.js GPU work
          from accumulating and slowing cursor movement on every other section. */}
      <div className={styles.canvasWrap}>
        {mounted && active && (
          <ProjectWorld
            onNearProject={handleNear}
            onAtBoundary={handleAtBoundary}
            onAutoArrived={handleAutoArrived}
            theme={theme}
            carColors={carColors}
            autopilotTarget={autopilotTarget}
            autopilotTourId={tourId}
            autopilotRewindId={rewindId}
            isManual={isManual}
            rccgUnlocked={rccgUnlocked}
          />
        )}
      </div>

      {/* ── Preloader overlay ── */}
      {mode === "preloading" && (
        <div className={styles.preloader}>
          <div className={styles.preloaderInner}>
            <div className={styles.preloaderTitle}>Loading World…</div>
            <div className={styles.preloaderBarWrap}>
              <div className={styles.preloaderBar} style={{ width: `${preloadPct}%` }} />
            </div>
            <div className={styles.preloaderPct}>{Math.round(preloadPct)}%</div>
          </div>
        </div>
      )}

      {/* ── Mode selection modal ── */}
      {mode === "modal" && (
        <div className={styles.modalBackdrop}>
          <div className={`${styles.modal} ${isDark ? styles.modalDark : styles.modalLight}`}>
            <h3 className={styles.modalTitle}>How do you want to explore?</h3>
            <p className={styles.modalSub}>Choose how to navigate through our projects</p>
            <div className={styles.modalOptions}>
              <button className={`${styles.modeBtn} ${styles.modeBtnAuto}`} onClick={selectAuto}>
                <span className={styles.modeBtnIcon}>🤖</span>
                <span className={styles.modeBtnLabel}>Automatic</span>
                <span className={styles.modeBtnDesc}>
                  The car drives itself to each project. Just click <em>Start Tour</em> and use the arrows.
                </span>
              </button>
              <button className={`${styles.modeBtn} ${styles.modeBtnManual}`} onClick={selectManual}>
                <span className={styles.modeBtnIcon}>🕹️</span>
                <span className={styles.modeBtnLabel}>Manual</span>
                <span className={styles.modeBtnDesc}>
                  You drive the car yourself using arrow keys or the on-screen D-pad.
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.sectionLabel}>Memory Lane</span>
        <h2 className={`${styles.sectionTitle} ${isDark ? styles.titleDark : styles.titleLight}`}>
          Our Work
        </h2>
      </div>

      {/* ── Light / Dark toggle ── */}
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

      {/* ── Car colour picker — manual mode only ── */}
      {isManual && (
        <div className={`${styles.colorPanel} ${isDark ? styles.colorPanelDark : styles.colorPanelLight} ${colorsHidden ? styles.hidden : ""}`}>
          <div className={styles.colorRow}>
            <span className={`${styles.colorLabel} ${isDark ? styles.colorLabelDark : styles.colorLabelLight}`}>Body</span>
            <div className={styles.swatches}>
              {BODY_COLORS.map((c, i) => (
                <button key={i} title={c.label}
                  className={`${styles.swatch} ${bodyIdx === i ? styles.swatchActive : ""}`}
                  style={{ background: c.hex }} onClick={() => setBodyIdx(i)}
                  aria-label={`Body colour: ${c.label}`} />
              ))}
            </div>
          </div>
          <div className={styles.colorRow}>
            <span className={`${styles.colorLabel} ${isDark ? styles.colorLabelDark : styles.colorLabelLight}`}>Rims</span>
            <div className={styles.swatches}>
              {RIM_COLORS.map((c, i) => (
                <button key={i} title={c.label}
                  className={`${styles.swatch} ${rimIdx === i ? styles.swatchActive : ""}`}
                  style={{ background: c.hex }} onClick={() => setRimIdx(i)}
                  aria-label={`Rim colour: ${c.label}`} />
              ))}
            </div>
          </div>
          <div className={styles.colorRow}>
            <span className={`${styles.colorLabel} ${isDark ? styles.colorLabelDark : styles.colorLabelLight}`}>Glass</span>
            <div className={styles.swatches}>
              {GLASS_COLORS.map((c, i) => (
                <button key={i} title={c.label}
                  className={`${styles.swatch} ${glassIdx === i ? styles.swatchActive : ""}`}
                  style={{ background: c.hex, opacity: 0.7 + c.opacity }}
                  onClick={() => setGlassIdx(i)} aria-label={`Glass colour: ${c.label}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Project info card ── */}
      <div className={`${styles.projectCard} ${currentProject ? styles.visible : ""} ${isDark ? styles.cardDark : styles.cardLight}`}>
        {currentProject && (
          <>
            <div className={styles.previewWrap} style={{ borderColor: currentProject.accent + "55" }}>
              <img
                key={currentProject.url}
                src={currentProject.image}
                alt={`${currentProject.title} preview`}
                className={styles.previewImg}
              />
              <div className={styles.previewOverlay}
                style={{ background: `linear-gradient(to bottom, transparent 60%, ${isDark ? "#08080f" : "#f4f6ff"} 100%)` }} />
              <a href={`https://${currentProject.url}`} target="_blank" rel="noopener noreferrer"
                className={styles.previewLiveChip}
                style={{ background: currentProject.accent + "22", color: currentProject.accent, border: `1px solid ${currentProject.accent}55` }}>
                <span className={styles.liveDot} style={{ background: currentProject.accent }} />
                Live
              </a>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardAccentBar} style={{ background: currentProject.accent }} />
              <p className={`${styles.cardCategory} ${isDark ? styles.catDark : styles.catLight}`}>{currentProject.category}</p>
              <h3 className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : styles.cardTitleLight}`}>{currentProject.title}</h3>
              <div className={styles.techRow}>
                {currentProject.tech.map(tech => (
                  <span key={tech} className={`${styles.techPill} ${isDark ? styles.pillDark : styles.pillLight}`}>{tech}</span>
                ))}
              </div>
              <div className={`${styles.cardDivider} ${isDark ? styles.divDark : styles.divLight}`} />
              <a href={`https://${currentProject.url}`} target="_blank" rel="noopener noreferrer"
                className={styles.cardLink}
                style={{ background: currentProject.accent + "22", color: currentProject.accent, border: `1px solid ${currentProject.accent}44` }}>
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
        {projects.map((p, i) => {
          if (i === RCCG_IDX && !rccgUnlocked) return null;
          return (
            <div key={i}
              className={`${styles.dot} ${nearIdx === i ? styles.activeDot : ""}`}
              style={nearIdx === i ? { background: p.accent } : undefined} />
          );
        })}
      </div>

      {/* ── Keyboard hint (manual only) ── */}
      {isManual && (
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
      )}

      {/* ── Mobile D-pad (manual only) ── */}
      {isManual && (
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
      )}

      {/* ── Auto mode: navigation buttons (bottom right) ── */}
      {mode === "auto" && (
        <div className={styles.navButtons}>
          {!tourStarted ? (
            <button
              className={`${styles.startTourBtn} ${isDark ? styles.startTourDark : styles.startTourLight}`}
              onClick={handleStartTour}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Start Tour
            </button>
          ) : (
            <div className={`${styles.arrowPair} ${isDark ? styles.arrowPairDark : styles.arrowPairLight}`}>
              <button
                className={styles.arrowBtn}
                onClick={handlePrev}
                disabled={autoPhase === "driving"}
                aria-label="Previous project"
                title="Previous project"
              >
                ←
              </button>
              <div className={styles.arrowDivider} />
              <button
                className={styles.arrowBtn}
                onClick={handleNext}
                disabled={autoPhase === "driving"}
                aria-label="Next project"
                title="Next project"
              >
                {autoPhase === "driving" ? (
                  <span className={styles.drivingDot} />
                ) : "→"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Mode toggle pill ── */}
      {mode === "auto" && (
        <button
          className={`${styles.modeToggle} ${isDark ? styles.modeToggleDark : styles.modeToggleLight}`}
          onClick={switchToManual}
          title="Switch to manual control"
        >
          🕹️ Manual
        </button>
      )}
      {mode === "manual" && (
        <button
          className={`${styles.modeToggle} ${isDark ? styles.modeToggleDark : styles.modeToggleLight}`}
          onClick={selectAuto}
          title="Switch to automatic mode"
        >
          🤖 Auto
        </button>
      )}
    </section>
  );
}
