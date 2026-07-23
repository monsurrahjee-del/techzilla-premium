"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollBar.module.css";

/** Returns the page's custom scroll container if any (Lenis wrapper). */
const getScroller = () =>
  (document.getElementById("main-scroller") as HTMLElement | null) ?? null;

/**
 * Virtual-scroll budget for the sections that live beyond the document scroll.
 * We treat each as a fraction of clientHeight so the thumb allocation scales
 * correctly across different viewport sizes.
 *
 * Chess  → 1.2 × clientHeight   (~20 % of the bar on a typical layout)
 * Craft  → 0.5 × clientHeight   (~8 % of the bar)
 *
 * Adjust these constants if the relative weight of each section needs tuning.
 */
const CHESS_VH_SCALE = 1.2;
const CRAFT_VH_SCALE = 0.5;

/** Total virtual height used for thumb-fraction arithmetic. */
const totalVirtH = (docMax: number, clientH: number) =>
  docMax + clientH * CHESS_VH_SCALE + clientH * CRAFT_VH_SCALE;

/** Fraction of the track where chess begins (= end of document scroll). */
const chessStartFrac = (docMax: number, clientH: number) => {
  const tv = totalVirtH(docMax, clientH);
  return tv > 0 ? docMax / tv : 1;
};

/** Fraction of the track that the chess section occupies. */
const chessFrac = (clientH: number, docMax: number) => {
  const tv = totalVirtH(docMax, clientH);
  return tv > 0 ? (clientH * CHESS_VH_SCALE) / tv : 0;
};

export default function ScrollBar() {
  const trackRef   = useRef<HTMLDivElement>(null);
  const thumbRef   = useRef<HTMLDivElement>(null);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging   = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);

  // ── Chess / craft state ─────────────────────────────────────────────────
  const chessActive      = useRef(false);
  const craftActive      = useRef(false);
  /** Chess internal progress 0-1, updated from chess-reveal-progress events. */
  const chessRawProgress = useRef(0);

  // ── Portfolio gate / scroll-freeze state ────────────────────────────────
  const scrollFrozen    = useRef(false);
  const scrollGateReady = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    // ── Visibility helpers ────────────────────────────────────────────────
    const show = () => {
      track.style.opacity = "1";
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    const scheduleHide = () => {
      if (dragging.current) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        if (!dragging.current) track.style.opacity = "0";
      }, 1800);
    };

    // ── Scroll geometry helpers ───────────────────────────────────────────
    const getScrollInfo = () => {
      const el = getScroller();
      if (el) {
        return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
      }
      return {
        scrollTop:    window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: window.innerHeight,
      };
    };

    const getThumbMetrics = () => {
      const { scrollHeight, clientHeight } = getScrollInfo();
      return {
        trackH: track.clientHeight,
        // Thumb height is proportional to the doc-only range so it stays a
        // reasonable size (we don't let the total-virtual range shrink it).
        thumbH: Math.max(12, Math.min(40, (clientHeight / scrollHeight) * track.clientHeight)),
      };
    };

    // ── Thumb position ────────────────────────────────────────────────────
    /**
     * Map the current state (doc scroll / chess progress / craft) to a 0-1
     * fraction for the thumb position.
     *
     * overrideFraction: pass a ready-made fraction (e.g. during drag feedback)
     *   to skip all state-based calculations.
     */
    const updateThumb = (overrideFraction?: number) => {
      const { scrollTop, scrollHeight, clientHeight } = getScrollInfo();
      const docMax = scrollHeight - clientHeight;

      let progress: number;

      if (overrideFraction !== undefined) {
        progress = overrideFraction;
      } else if (craftActive.current) {
        // Craft is the last section — thumb sits at 100 %.
        progress = 1;
      } else if (chessActive.current) {
        // Chess occupies the slice immediately after the doc scroll.
        const csf = chessStartFrac(docMax, clientHeight);
        const cf  = chessFrac(clientHeight, docMax);
        progress  = csf + chessRawProgress.current * cf;
      } else {
        // Normal document scroll: map scrollTop into the doc portion of the bar.
        const tv = totalVirtH(docMax, clientHeight);
        progress = tv > 0 ? scrollTop / tv : 0;
      }

      const { trackH, thumbH } = getThumbMetrics();
      thumb.style.height    = `${thumbH}px`;
      thumb.style.transform =
        `translateY(${Math.max(0, Math.min(trackH - thumbH, progress * (trackH - thumbH)))}px)`;
    };

    // ── Compute track fraction from pointer Y ─────────────────────────────
    const fractionFromClientY = (clientY: number) => {
      const { trackH, thumbH } = getThumbMetrics();
      const trackRect = track.getBoundingClientRect();
      const posY      = clientY - trackRect.top - thumbH / 2;
      return Math.max(0, Math.min(1, posY / (trackH - thumbH)));
    };

    // ── Scrollbar seek during chess reveal ────────────────────────────────
    /**
     * rawTrackFraction: the 0-1 position along the track from the user's pointer.
     *
     * • Dragging into the chess zone (≥ chessStartFrac) → seek chess forward.
     * • Dragging below the chess zone (< chessStartFrac) → dismiss chess.
     */
    const seekReveal = (rawTrackFraction: number) => {
      const { scrollHeight, clientHeight } = getScrollInfo();
      const docMax = scrollHeight - clientHeight;
      const csf    = chessStartFrac(docMax, clientHeight);
      const cf     = chessFrac(clientHeight, docMax);

      if (rawTrackFraction < csf) {
        // User dragged backward past where chess started → dismiss.
        chessRawProgress.current = 0;
        updateThumb(rawTrackFraction);
        window.dispatchEvent(
          new CustomEvent("chess-reveal-seek", { detail: { progress: 0 } }),
        );
      } else {
        // Map the raw fraction into chess-internal 0-1 progress.
        const chessProgress = cf > 0
          ? Math.max(0, Math.min(1, (rawTrackFraction - csf) / cf))
          : 1;
        chessRawProgress.current = chessProgress;
        updateThumb();
        window.dispatchEvent(
          new CustomEvent("chess-reveal-seek", { detail: { progress: chessProgress } }),
        );
      }

      show();
      scheduleHide();
    };

    // ── Chess reveal mode event ───────────────────────────────────────────
    const onRevealMode = (e: Event) => {
      const active = Boolean((e as CustomEvent<{ active?: boolean }>).detail?.active);
      chessActive.current = active;

      if (active) {
        // If craft was showing and chess re-activates (user scrolled back from
        // craft), keep chessRawProgress at 1 — it will be updated immediately
        // by the chess-reveal-progress event that follows.
        craftActive.current = false;
      } else {
        chessRawProgress.current = 0;
      }

      updateThumb();
      if (active) show();
    };

    // ── Chess progress event (from ChessReveal RAF loop) ──────────────────
    const onRevealProgress = (e: Event) => {
      if (!chessActive.current) return;
      const chessProgress = (e as CustomEvent<{ progress?: number }>).detail?.progress;
      if (typeof chessProgress !== "number") return;
      chessRawProgress.current = Math.max(0, Math.min(1, chessProgress));
      updateThumb();
      show();
      scheduleHide();
    };

    // ── Craft section events ──────────────────────────────────────────────
    const onCraftActivate = () => {
      craftActive.current     = true;
      chessActive.current     = false; // chess stays rendered but bar shows craft
      chessRawProgress.current = 1;
      updateThumb();
      show();
      scheduleHide();
    };
    const onCraftDismiss = () => {
      // Chess re-activates (chess-reveal-mode fires right after this) —
      // just reset craft flag; chess events will take over.
      craftActive.current = false;
      updateThumb();
    };

    // ── Freeze / gate events from page.tsx ────────────────────────────────
    const onScrollFrozen    = () => { scrollFrozen.current    = true;  scrollGateReady.current = false; };
    const onScrollGateReady = () => { scrollGateReady.current = true; };
    const onScrollReleased  = () => { scrollFrozen.current    = false; scrollGateReady.current = false; };

    // ── Normal scroll tracking ────────────────────────────────────────────
    const onScroll = () => {
      if (dragging.current) return;
      updateThumb();
      show();
      scheduleHide();
    };

    // ── Hover zone: right 72 px of viewport ──────────────────────────────
    const onWindowMouseMove = (e: MouseEvent) => {
      if (e.clientX >= window.innerWidth - 72) {
        show();
        scheduleHide();
      }
    };

    // ── Thumb: mousedown ──────────────────────────────────────────────────
    const onThumbDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current        = true;
      dragStartY.current      = e.clientY;
      dragStartScroll.current = getScrollInfo().scrollTop;
      show();
      document.body.style.userSelect = "none";
    };

    // ── Global: mousemove while dragging ─────────────────────────────────
    const onDocMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;

      // Chess reveal mode: seek via chess events.
      if (chessActive.current) {
        seekReveal(fractionFromClientY(e.clientY));
        return;
      }

      // Frozen (portfolio gate): dispatch navigate intent.
      if (scrollFrozen.current) {
        const targetFraction = fractionFromClientY(e.clientY);
        const { scrollHeight, clientHeight } = getScrollInfo();
        const docMax     = scrollHeight - clientHeight;
        const frozenFrac = docMax > 0 ? getScrollInfo().scrollTop / docMax : 1;

        const goingBack    = targetFraction < frozenFrac - 0.01;
        const goingForward = targetFraction > frozenFrac + 0.01 && scrollGateReady.current;

        if (goingBack || goingForward) {
          updateThumb(targetFraction);
          window.dispatchEvent(
            new CustomEvent("tz-scrollbar-navigate", { detail: { fraction: targetFraction } }),
          );
        }
        return;
      }

      // Normal scroll.
      const { scrollHeight, clientHeight } = getScrollInfo();
      const docMax          = scrollHeight - clientHeight;
      const { trackH, thumbH } = getThumbMetrics();
      const dy              = e.clientY - dragStartY.current;
      // During drag, map thumb movement to the *document* scroll range
      // (same feel as before — the virtual extension doesn't change drag speed).
      const scrollDelta = (dy / (trackH - thumbH)) * docMax;
      const newScroll   = Math.max(0, Math.min(docMax, dragStartScroll.current + scrollDelta));

      const scroller = getScroller();
      if (scroller) {
        scroller.scrollTop = newScroll;
      } else {
        window.scrollTo({ top: newScroll, behavior: "instant" });
      }
      updateThumb();
    };

    // ── Global: mouseup ───────────────────────────────────────────────────
    const onDocMouseUp = () => {
      if (!dragging.current) return;
      dragging.current               = false;
      document.body.style.userSelect = "";
      scheduleHide();
    };

    // ── Track: click to jump ──────────────────────────────────────────────
    const onTrackClick = (e: MouseEvent) => {
      if (e.target === thumb) return;

      if (chessActive.current) {
        seekReveal(fractionFromClientY(e.clientY));
        return;
      }

      if (scrollFrozen.current) {
        const targetFraction = fractionFromClientY(e.clientY);
        window.dispatchEvent(
          new CustomEvent("tz-scrollbar-navigate", { detail: { fraction: targetFraction } }),
        );
        return;
      }

      const { scrollHeight, clientHeight } = getScrollInfo();
      const docMax   = scrollHeight - clientHeight;
      const progress = fractionFromClientY(e.clientY);
      // Map click fraction → document scroll position (only the doc range is clickable here).
      const newScroll = progress * docMax;

      const scroller = getScroller();
      if (scroller) {
        scroller.scrollTop = newScroll;
      } else {
        window.scrollTo({ top: newScroll, behavior: "smooth" });
      }
    };

    const onTrackEnter = () => show();
    const onTrackLeave = () => { if (!dragging.current) scheduleHide(); };

    // ── Attach ────────────────────────────────────────────────────────────
    const scroller     = getScroller();
    const scrollTarget = scroller ?? window;
    scrollTarget.addEventListener("scroll",              onScroll,          { passive: true });
    window.addEventListener("chess-reveal-mode",         onRevealMode);
    window.addEventListener("chess-reveal-progress",     onRevealProgress);
    window.addEventListener("craft-section-activate",    onCraftActivate);
    window.addEventListener("craft-section-dismiss",     onCraftDismiss);
    window.addEventListener("tz-scroll-frozen",          onScrollFrozen);
    window.addEventListener("tz-scroll-gate-ready",      onScrollGateReady);
    window.addEventListener("tz-scroll-released",        onScrollReleased);
    window.addEventListener("mousemove",                 onWindowMouseMove, { passive: true });
    document.addEventListener("mousemove",               onDocMouseMove,    { passive: true });
    document.addEventListener("mouseup",                 onDocMouseUp);
    thumb.addEventListener("mousedown",                  onThumbDown);
    track.addEventListener("mouseenter",                 onTrackEnter);
    track.addEventListener("mouseleave",                 onTrackLeave);
    track.addEventListener("click",                      onTrackClick);

    updateThumb();

    return () => {
      scrollTarget.removeEventListener("scroll",            onScroll);
      window.removeEventListener("chess-reveal-mode",       onRevealMode);
      window.removeEventListener("chess-reveal-progress",   onRevealProgress);
      window.removeEventListener("craft-section-activate",  onCraftActivate);
      window.removeEventListener("craft-section-dismiss",   onCraftDismiss);
      window.removeEventListener("tz-scroll-frozen",        onScrollFrozen);
      window.removeEventListener("tz-scroll-gate-ready",    onScrollGateReady);
      window.removeEventListener("tz-scroll-released",      onScrollReleased);
      window.removeEventListener("mousemove",               onWindowMouseMove);
      document.removeEventListener("mousemove",             onDocMouseMove);
      document.removeEventListener("mouseup",               onDocMouseUp);
      thumb.removeEventListener("mousedown",                onThumbDown);
      track.removeEventListener("mouseenter",               onTrackEnter);
      track.removeEventListener("mouseleave",               onTrackLeave);
      track.removeEventListener("click",                    onTrackClick);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div ref={trackRef} className={styles.track} aria-hidden="true">
      <div ref={thumbRef} className={styles.thumb} />
    </div>
  );
}
