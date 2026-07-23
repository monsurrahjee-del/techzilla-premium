"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollBar.module.css";

/** Returns the page's custom scroll container if any (Lenis wrapper). */
const getScroller = () =>
  (document.getElementById("main-scroller") as HTMLElement | null) ?? null;

export default function ScrollBar() {
  const trackRef   = useRef<HTMLDivElement>(null);
  const thumbRef   = useRef<HTMLDivElement>(null);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging   = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);

  // ── Chess reveal state ──────────────────────────────────────────────────
  const revealActive       = useRef(false);
  const revealProgress     = useRef(0);
  const chessStartProgress = useRef(1); // scroll fraction when chess begins

  // ── Portfolio gate / scroll-freeze state ────────────────────────────────
  // True while page.tsx has the scroll position locked.
  const scrollFrozen  = useRef(false);
  // True once the 2-second gate timer fires (page is ready to release).
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
        scrollTop: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: window.innerHeight,
      };
    };

    const getThumbMetrics = () => {
      const { scrollHeight, clientHeight } = getScrollInfo();
      return {
        trackH: track.clientHeight,
        thumbH: Math.max(12, Math.min(40, (clientHeight / scrollHeight) * track.clientHeight)),
      };
    };

    // ── Thumb position ────────────────────────────────────────────────────
    const updateThumb = (overrideFraction?: number) => {
      const { scrollTop, scrollHeight, clientHeight } = getScrollInfo();
      const docHeight = scrollHeight - clientHeight;

      let progress: number;
      if (overrideFraction !== undefined) {
        progress = overrideFraction;
      } else if (revealActive.current) {
        progress = revealProgress.current;
      } else {
        progress = docHeight > 0 ? scrollTop / docHeight : 0;
      }

      const { trackH, thumbH } = getThumbMetrics();
      thumb.style.height    = `${thumbH}px`;
      thumb.style.transform = `translateY(${Math.max(0, Math.min(trackH - thumbH, progress * (trackH - thumbH)))}px)`;
    };

    // ── Compute the track fraction for an absolute mouse Y position ───────
    const fractionFromClientY = (clientY: number) => {
      const { trackH, thumbH } = getThumbMetrics();
      const trackRect = track.getBoundingClientRect();
      const posY = clientY - trackRect.top - thumbH / 2;
      return Math.max(0, Math.min(1, posY / (trackH - thumbH)));
    };

    // ── Chess reveal helpers ──────────────────────────────────────────────

    /**
     * Called from scrollbar drag/click while chess reveal is active.
     * rawProgress: 0-1 track fraction from the user's pointer.
     *   - If above chessStartProgress → maps into chess space, seeks forward.
     *   - If below chessStartProgress → seeks chess to 0 (dismisses it).
     */
    const seekReveal = (rawProgress: number) => {
      const start = chessStartProgress.current;

      if (rawProgress < start) {
        // User dragging backward past where chess started → dismiss chess.
        // Show the thumb moving back so the user gets visual feedback.
        revealProgress.current = rawProgress;
        updateThumb();
        window.dispatchEvent(
          new CustomEvent("chess-reveal-seek", { detail: { progress: 0 } }),
        );
      } else {
        // Map rawProgress (start..1) → chessProgress (0..1).
        const remaining    = 1 - start;
        const chessProgress = remaining > 0
          ? Math.max(0, Math.min(1, (rawProgress - start) / remaining))
          : 1;
        revealProgress.current = Math.min(1, rawProgress);
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
      revealActive.current = active;

      if (active) {
        // Capture the scroll fraction exactly so thumb never resets.
        const { scrollTop, scrollHeight, clientHeight } = getScrollInfo();
        const docHeight = scrollHeight - clientHeight;
        chessStartProgress.current = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 1;
        revealProgress.current     = chessStartProgress.current;
      } else {
        // Chess deactivated — return to normal scroll tracking.
        chessStartProgress.current = 1;
        revealProgress.current     = 0;
      }
      updateThumb();
      if (active) show();
    };

    // ── Chess progress event (from ChessReveal RAF) ───────────────────────
    const onRevealProgress = (e: Event) => {
      if (!revealActive.current) return;
      const chessProgress = (e as CustomEvent<{ progress?: number }>).detail?.progress;
      if (typeof chessProgress !== "number") return;

      const start   = chessStartProgress.current;
      const clamped = Math.max(0, Math.min(1, chessProgress));
      revealProgress.current = start + (1 - start) * clamped;
      updateThumb();
      show();
      scheduleHide();
    };

    // ── Freeze / gate events from page.tsx ────────────────────────────────
    const onScrollFrozen = () => {
      scrollFrozen.current    = true;
      scrollGateReady.current = false;
    };
    const onScrollGateReady = () => {
      scrollGateReady.current = true;
    };
    const onScrollReleased = () => {
      scrollFrozen.current    = false;
      scrollGateReady.current = false;
    };

    // ── Normal scroll tracking ────────────────────────────────────────────
    const onScroll = () => {
      if (dragging.current) return;
      updateThumb();
      show();
      scheduleHide();
    };

    // ── Hover zone: right 72px of viewport ───────────────────────────────
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

      // ── Chess reveal mode: seek via chess events ──────────────────────
      if (revealActive.current) {
        seekReveal(fractionFromClientY(e.clientY));
        return;
      }

      // ── Frozen (portfolio gate): dispatch navigate intent ─────────────
      if (scrollFrozen.current) {
        const targetFraction = fractionFromClientY(e.clientY);
        const { scrollHeight, clientHeight } = getScrollInfo();
        const docHeight  = scrollHeight - clientHeight;
        const frozenFrac = docHeight > 0 ? getScrollInfo().scrollTop / docHeight : 1;

        // Always allow backward; allow forward only once gate is ready.
        const goingBack    = targetFraction < frozenFrac - 0.01;
        const goingForward = targetFraction > frozenFrac + 0.01 && scrollGateReady.current;

        if (goingBack || goingForward) {
          updateThumb(targetFraction); // move thumb visually
          window.dispatchEvent(
            new CustomEvent("tz-scrollbar-navigate", { detail: { fraction: targetFraction } }),
          );
        }
        return;
      }

      // ── Normal scroll ─────────────────────────────────────────────────
      const { scrollHeight, clientHeight } = getScrollInfo();
      const docHeight   = scrollHeight - clientHeight;
      const { trackH, thumbH } = getThumbMetrics();
      const dy          = e.clientY - dragStartY.current;
      const scrollDelta = (dy / (trackH - thumbH)) * docHeight;
      const newScroll   = Math.max(0, Math.min(docHeight, dragStartScroll.current + scrollDelta));

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

      if (revealActive.current) {
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
      const docHeight  = scrollHeight - clientHeight;
      const progress   = fractionFromClientY(e.clientY);
      const newScroll  = progress * docHeight;

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
    scrollTarget.addEventListener("scroll",              onScroll,           { passive: true });
    window.addEventListener("chess-reveal-mode",         onRevealMode);
    window.addEventListener("chess-reveal-progress",     onRevealProgress);
    window.addEventListener("tz-scroll-frozen",          onScrollFrozen);
    window.addEventListener("tz-scroll-gate-ready",      onScrollGateReady);
    window.addEventListener("tz-scroll-released",        onScrollReleased);
    window.addEventListener("mousemove",                 onWindowMouseMove,  { passive: true });
    document.addEventListener("mousemove",               onDocMouseMove,     { passive: true });
    document.addEventListener("mouseup",                 onDocMouseUp);
    thumb.addEventListener("mousedown",                  onThumbDown);
    track.addEventListener("mouseenter",                 onTrackEnter);
    track.addEventListener("mouseleave",                 onTrackLeave);
    track.addEventListener("click",                      onTrackClick);

    updateThumb();

    return () => {
      scrollTarget.removeEventListener("scroll", onScroll);
      window.removeEventListener("chess-reveal-mode",     onRevealMode);
      window.removeEventListener("chess-reveal-progress", onRevealProgress);
      window.removeEventListener("tz-scroll-frozen",      onScrollFrozen);
      window.removeEventListener("tz-scroll-gate-ready",  onScrollGateReady);
      window.removeEventListener("tz-scroll-released",    onScrollReleased);
      window.removeEventListener("mousemove",             onWindowMouseMove);
      document.removeEventListener("mousemove",           onDocMouseMove);
      document.removeEventListener("mouseup",             onDocMouseUp);
      thumb.removeEventListener("mousedown",              onThumbDown);
      track.removeEventListener("mouseenter",             onTrackEnter);
      track.removeEventListener("mouseleave",             onTrackLeave);
      track.removeEventListener("click",                  onTrackClick);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div ref={trackRef} className={styles.track} aria-hidden="true">
      <div ref={thumbRef} className={styles.thumb} />
    </div>
  );
}
