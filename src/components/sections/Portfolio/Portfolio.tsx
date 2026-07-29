"use client";

import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import dynamic from "next/dynamic";
import styles from "./Portfolio.module.css";
import { projects } from "@/lib/projects";
import type { Theme, CarColors } from "./ProjectWorld";
import { STATIONS } from "./ProjectWorld";
import SectionNav from "@/components/ui/SectionNav";

const RCCG_IDX   = STATIONS.length - 1; // last station — locked until Zennyola visited
const UNLOCK_IDX = STATIONS.length - 2; // Zennyola

const ProjectWorld = dynamic(() => import("./ProjectWorld"), { ssr: false });

// ── Module-level flag: survives SPA navigation re-mounts ────────────────────
let _portfolioMoved = false;

// ── Module-level session persistence — survives navigating away and back ─────
type ExploreMode = "preloading" | "modal" | "auto" | "manual";
type AutoPhase   = "idle" | "driving" | "arrived";

let _savedMode:           ExploreMode | null = null;
let _savedAutoTargetIdx:  number             = 0;
let _savedAutoPhase:      AutoPhase          = "idle";
let _savedRccgUnlocked:   boolean            = false;
let _savedColorsHidden:   boolean            = false;

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

interface PortfolioProps {
  active?: boolean;
}

export default function Portfolio({ active = false }: PortfolioProps) {
  const [nearIdx,      setNearIdx]      = useState<number | null>(null);
  const [mounted,      setMounted]      = useState(false);
  const [hintHidden,   setHintHidden]   = useState(_portfolioMoved);
  const [colorsHidden, setColorsHidden] = useState(_savedColorsHidden);
  const [theme,        setTheme]        = useState<Theme>("dark");
  const [dpadState,    setDpadState]    = useState({ up: false, down: false, left: false, right: false });

  // ── Mode state ────────────────────────────────────────────────────────────
  const [mode,       setMode]       = useState<ExploreMode>("preloading");
  const [preloadPct, setPreloadPct] = useState(0);

  // ── Autopilot ─────────────────────────────────────────────────────────────
  const [autoTargetIdx,   setAutoTargetIdx]   = useState(_savedAutoTargetIdx);
  const [autopilotTarget, setAutopilotTarget] = useState<number | null>(null);
  const [autoPhase,       setAutoPhase]       = useState<AutoPhase>(_savedAutoPhase === "driving" ? "arrived" : _savedAutoPhase);
  const [autopilotPaused, setAutopilotPaused] = useState(false);

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
  const [rccgUnlocked, setRccgUnlocked] = useState(_savedRccgUnlocked);

  const carColors: CarColors = {
    body:         BODY_COLORS[bodyIdx].hex,
    rim:          RIM_COLORS[rimIdx].hex,
    glass:        GLASS_COLORS[glassIdx].hex,
    glassOpacity: GLASS_COLORS[glassIdx].opacity,
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 767);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  const nearIdxRef = useRef<number | null>(null);
  const movedRef   = useRef(_portfolioMoved);
  const sectionRef = useRef<HTMLElement>(null);

  // ── Pre-mount WebGL world when section approaches viewport ────────────────
  // Fires ~300px before the section slides into view so Three.js initialises
  // in the background, eliminating the scroll-in freeze.
  useEffect(() => {
    if (mounted) return;
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  // Fallback: also mount when active fires (covers edge cases)
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
      else {
        // If we have a saved mode from a previous visit, restore it directly
        // instead of showing the mode-selection modal again.
        if (_savedMode !== null && _savedMode !== "modal" && _savedMode !== "preloading") {
          setMode(_savedMode);
          // For auto: restore to arrived state (car already at last position)
          if (_savedMode === "auto") {
            setAutoPhase(_savedAutoPhase === "driving" ? "arrived" : _savedAutoPhase);
            setAutoTargetIdx(_savedAutoTargetIdx);
            setRccgUnlocked(_savedRccgUnlocked);
            setColorsHidden(_savedColorsHidden);
          }
          if (_savedMode === "manual") {
            setColorsHidden(_savedColorsHidden);
            if (_portfolioMoved) setHintHidden(true);
          }
        } else {
          setMode("modal");
        }
      }
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, mode]);

  // ── Persist mode/phase to module-level vars whenever they change ──────────
  useEffect(() => {
    if (mode === "preloading" || mode === "modal") return;
    _savedMode          = mode;
    _savedAutoTargetIdx = autoTargetIdx;
    _savedAutoPhase     = autoPhase;
    _savedRccgUnlocked  = rccgUnlocked;
    _savedColorsHidden  = colorsHidden;
  }, [mode, autoTargetIdx, autoPhase, rccgUnlocked, colorsHidden]);

  // ── Mode selection ────────────────────────────────────────────────────────
  const selectAuto = () => {
    setMode("auto");
    setAutoPhase("idle");
    setAutoTargetIdx(0);
    setAutopilotTarget(null);
    setAutopilotPaused(false);
    setHintHidden(true);
    setColorsHidden(false); // keep colour panel visible until Start Tour is clicked
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
    setAutopilotPaused(false);
    setColorsHidden(false);
  };

  // ── Autopilot nav ─────────────────────────────────────────────────────────
  const driveToStation = useCallback((idx: number) => {
    const target = ((idx) + STATIONS.length) % STATIONS.length;
    setAutoTargetIdx(target);
    setAutopilotTarget(target);
    setAutoPhase("driving");
    setAutopilotPaused(false);
  }, []);

  const handleStartTour = () => {
    setRccgUnlocked(false); // re-lock RCCG at every tour start
    setColorsHidden(true);  // hide colour panel once the tour begins
    setAutopilotPaused(false);
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

  // ── Brake / resume (auto mode only) ───────────────────────────────────────
  const handleBrake = () => {
    setAutopilotPaused(true);
    setAutoPhase("arrived"); // treat current position as a stop
  };

  const handleResume = () => {
    // Resume driving toward the current target
    setAutopilotPaused(false);
    setAutopilotTarget(autoTargetIdx);
    setAutoPhase("driving");
  };

  const handleAutoArrived = useCallback(() => {
    // Atomically set both autoPhase and nearIdx in the same transition so the
    // project card appears instantly (no stale-state race between the two).
    startTransition(() => {
      setAutoPhase("arrived");
      setNearIdx(autoTargetIdx);   // force-show the arrived station's card
      if (autoTargetIdx === UNLOCK_IDX) setRccgUnlocked(true);
    });
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

  const autoPhaseRef = useRef(autoPhase);
  useEffect(() => { autoPhaseRef.current = autoPhase; }, [autoPhase]);

  const handleNear = useCallback((idx: number | null) => {
    nearIdxRef.current = idx;
    // During auto-driving, suppress React state updates entirely.
    // Passing near a station mid-drive must NOT show its project card, and the
    // resulting re-render (which mounts a heavy card with image + CSS transition)
    // drops a Three.js frame causing the visible pause/stutter.
    // The project card is instead shown atomically in handleAutoArrived.
    if (mode === "auto" && autoPhaseRef.current === "driving") return;
    // Defer the project-card re-render so it doesn't jank the Three.js frame
    startTransition(() => {
      setNearIdx(idx);
      if (mode === 'manual' && idx === UNLOCK_IDX) setRccgUnlocked(true);
    });
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

  const isDark      = theme === "dark";
  const isManual    = mode === "manual";

  // In auto mode: only show the project card after the car has actually arrived
  // at the target station — never while passing near one mid-drive.
  const currentProject = (() => {
    if (nearIdx === null) return null;
    if (mode === "auto" && (autoPhase !== "arrived" || nearIdx !== autoTargetIdx)) return null;
    return projects[nearIdx];
  })();
  const tourStarted     = autoPhase !== "idle";

  // Whether the color panel should be visible
  const showColorPanel  = (isManual || (mode === "auto" && !tourStarted)) && !colorsHidden;

  // Brake button: visible in auto when tour started and car is driving (colors hidden)
  const showBrake  = mode === "auto" && tourStarted && autoPhase === "driving"  && !autopilotPaused;
  const showResume = mode === "auto" && tourStarted && autopilotPaused;

  // ── Mobile view: clean card carousel — no WebGL, no car, zero lag ──────────
  if (isMobile) {
    return (
      <section ref={sectionRef} className={`${styles.section} ${isDark ? styles.dark : styles.light}`}>
        <SectionNav navItems={["About", "Service", "Contact"]} topOffset={74} proximityReveal />

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.sectionLabel}>Memory Lane</span>
          <h2 className={`${styles.sectionTitle} ${isDark ? styles.titleDark : styles.titleLight}`}>
            Our Work
          </h2>
        </div>

        {/* Light / Dark toggle */}
        <button
          className={`${styles.themeToggle} ${isDark ? styles.toggleDark : styles.toggleLight}`}
          onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
          aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
          title={isDark ? "Day mode" : "Night mode"}
        >
          {isDark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Horizontal card carousel — swipe left/right through projects */}
        <div className={styles.mobileCarousel}>
          {projects.map((project, i) => (
            <div
              key={i}
              className={`${styles.mobileCard} ${isDark ? styles.mobileCardDark : styles.mobileCardLight}`}
            >
              {/* Project image */}
              <div className={styles.mobileCardImgWrap}>
                <img
                  src={project.image}
                  alt={`${project.title} preview`}
                  className={styles.mobileCardImg}
                />
                <div
                  className={styles.mobileCardImgFade}
                  style={{ background: `linear-gradient(to bottom, transparent 50%, ${isDark ? "#08080f" : "#f0f4ff"} 100%)` }}
                />
                <a
                  href={`https://${project.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mobileCardLiveBadge}
                  style={{ background: project.accent + "22", color: project.accent, border: `1px solid ${project.accent}55` }}
                >
                  <span className={styles.liveDot} style={{ background: project.accent }} />
                  Live
                </a>
              </div>

              {/* Card body */}
              <div className={styles.mobileCardBody}>
                <div className={styles.cardAccentBar} style={{ background: project.accent }} />
                <p className={`${styles.cardCategory} ${isDark ? styles.catDark : styles.catLight}`}>
                  {project.category}
                </p>
                <h3 className={`${styles.mobileCardTitle} ${isDark ? styles.cardTitleDark : styles.cardTitleLight}`}>
                  {project.title}
                </h3>
                <div className={styles.techRow}>
                  {project.tech.map(tech => (
                    <span key={tech} className={`${styles.techPill} ${isDark ? styles.pillDark : styles.pillLight}`}>
                      {tech}
                    </span>
                  ))}
                </div>
                <a
                  href={`https://${project.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cardLink}
                  style={{ background: project.accent + "22", color: project.accent, border: `1px solid ${project.accent}44` }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Visit {project.url}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Swipe hint */}
        <p className={`${styles.mobileSwipeHint} ${isDark ? styles.swipeHintDark : styles.swipeHintLight}`}>
          ← swipe to browse →
        </p>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={`${styles.section} ${isDark ? styles.dark : styles.light}`}>
      {/* topOffset pushes hamburger below the day/night toggle (top:22px + ~42px height) */}
      <SectionNav navItems={["About", "Service", "Contact"]} topOffset={74} proximityReveal />

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
            autopilotPaused={autopilotPaused}
            isManual={isManual}
            rccgUnlocked={rccgUnlocked}
            renderPaused={mode === "modal" || mode === "preloading"}
            isMobile={isMobile}
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
            <h3 className={styles.modalTitle}>
              {isMobile ? "Explore Our Projects" : "How do you want to explore?"}
            </h3>
            <p className={styles.modalSub}>
              {isMobile
                ? "The car drives itself to each project. Tap Start Tour, then use the arrows to move between projects."
                : "Choose how to navigate through our projects"}
            </p>
            <div className={styles.modalOptions}>
              <button
                className={`${styles.modeBtn} ${styles.modeBtnAuto}`}
                onClick={selectAuto}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.setProperty("--glow-op", "1")}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.setProperty("--glow-op", "0.0001")}
              >
                <span className={styles.modeBtnIcon}>🤖</span>
                <span className={styles.modeBtnLabel}>Automatic</span>
                <span className={styles.modeBtnDesc}>
                  {isMobile
                    ? "Tap here to begin the experience"
                    : <>The car drives itself to each project. Just click <em>Start Tour</em> and use the arrows.</>}
                </span>
              </button>
              {!isMobile && (
                <button
                  className={`${styles.modeBtn} ${styles.modeBtnManual}`}
                  onClick={selectManual}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.setProperty("--glow-op", "1")}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.setProperty("--glow-op", "0.0001")}
                >
                  <span className={styles.modeBtnIcon}>🕹️</span>
                  <span className={styles.modeBtnLabel}>Manual</span>
                  <span className={styles.modeBtnDesc}>
                    You drive the car yourself using arrow keys or the on-screen D-pad.
                  </span>
                </button>
              )}
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

      {/* ── Car colour picker — manual mode, OR auto mode before tour starts ── */}
      {showColorPanel && (
        <div className={`${styles.colorPanel} ${isDark ? styles.colorPanelDark : styles.colorPanelLight}`}>
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
                disabled={autoPhase === "driving" && !autopilotPaused}
                aria-label="Previous project"
                title="Previous project"
              >
                ←
              </button>
              <div className={styles.arrowDivider} />
              <button
                className={styles.arrowBtn}
                onClick={handleNext}
                disabled={autoPhase === "driving" && !autopilotPaused}
                aria-label="Next project"
                title="Next project"
              >
                {autoPhase === "driving" && !autopilotPaused ? (
                  <span className={styles.drivingDot} />
                ) : "→"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Brake button — auto mode, tour started, car is moving ── */}
      {showBrake && (
        <button
          className={`${styles.brakeBtn} ${isDark ? styles.brakeBtnDark : styles.brakeBtnLight}`}
          onClick={handleBrake}
          aria-label="Brake — stop the car"
          title="Brake"
        >
          {/* Brake disc icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2"  x2="12" y2="8" />
            <line x1="12" y1="16" x2="12" y2="22" />
            <line x1="2"  y1="12" x2="8"  y2="12" />
            <line x1="16" y1="12" x2="22" y2="12" />
          </svg>
          Brake
        </button>
      )}

      {/* ── Resume button — auto mode, paused ── */}
      {showResume && (
        <button
          className={`${styles.brakeBtn} ${styles.resumeBtn} ${isDark ? styles.brakeBtnDark : styles.brakeBtnLight}`}
          onClick={handleResume}
          aria-label="Resume driving"
          title="Resume"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          Resume
        </button>
      )}

      {/* ── Mode toggle pill ── */}
      {mode === "auto" && !isMobile && (
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
