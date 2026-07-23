"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollBar.module.css";

/** Returns the page's custom scroll container (the Lenis wrapper div). */
const getScroller = () =>
  (document.getElementById("main-scroller") as HTMLElement | null) ?? null;

export default function ScrollBar() {
  const trackRef   = useRef<HTMLDivElement>(null);
  const thumbRef   = useRef<HTMLDivElement>(null);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging   = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);
  const revealActive = useRef(false);
  const revealProgress = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    // ── helpers ──────────────────────────────────────────────────────────────
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
        thumbH: Math.max(40, (clientHeight / scrollHeight) * track.clientHeight),
      };
    };

    const updateThumb = () => {
      const { scrollTop, scrollHeight, clientHeight } = getScrollInfo();
      const docHeight = scrollHeight - clientHeight;
      // Keep the exact same thumb geometry across the whole website. The
      // New page only swaps the progress source because its content uses
      // virtual scroll; it does not create a differently sized scrollbar.
      const progress = revealActive.current
        ? revealProgress.current
        : docHeight > 0
          ? scrollTop / docHeight
          : 0;
      const { trackH, thumbH } = getThumbMetrics();
      thumb.style.height    = `${thumbH}px`;
      thumb.style.transform = `translateY(${progress * (trackH - thumbH)}px)`;
    };

    const seekReveal = (progress: number) => {
      revealProgress.current = Math.max(0, Math.min(1, progress));
      window.dispatchEvent(new CustomEvent("chess-reveal-seek", {
        detail: { progress: revealProgress.current },
      }));
      updateThumb();
      show();
      scheduleHide();
    };

    const onRevealMode = (e: Event) => {
      revealActive.current = Boolean(
        (e as CustomEvent<{ active?: boolean }>).detail?.active,
      );
      revealProgress.current = revealActive.current ? 0 : 0;
      updateThumb();
      if (revealActive.current) show();
    };

    const onRevealProgress = (e: Event) => {
      if (!revealActive.current) return;
      const progress = (e as CustomEvent<{ progress?: number }>).detail?.progress;
      if (typeof progress !== "number") return;
      revealProgress.current = Math.max(0, Math.min(1, progress));
      updateThumb();
      show();
      scheduleHide();
    };

    // ── scroll tracking ───────────────────────────────────────────────────────
    const onScroll = () => {
      if (dragging.current) return;
      updateThumb();
      show();
      scheduleHide();
    };

    // ── hover zone (right 72px) ───────────────────────────────────────────────
    const onWindowMouseMove = (e: MouseEvent) => {
      if (e.clientX >= window.innerWidth - 72) {
        show();
        scheduleHide();
      }
    };

    // ── drag: thumb mousedown ─────────────────────────────────────────────────
    const onThumbDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current        = true;
      dragStartY.current      = e.clientY;
      dragStartScroll.current = getScrollInfo().scrollTop;
      show();
      document.body.style.userSelect = "none";
    };

    // ── drag: global mousemove ────────────────────────────────────────────────
    const onDocMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      if (revealActive.current) {
        const { trackH, thumbH } = getThumbMetrics();
        const progress = (e.clientY - track.getBoundingClientRect().top - thumbH / 2) /
          (trackH - thumbH);
        seekReveal(progress);
        return;
      }
      const { scrollHeight, clientHeight } = getScrollInfo();
      const docHeight = scrollHeight - clientHeight;
      const { trackH, thumbH } = getThumbMetrics();
      const dy        = e.clientY - dragStartY.current;
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

    // ── drag: global mouseup ──────────────────────────────────────────────────
    const onDocMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.userSelect = "";
      scheduleHide();
    };

    // ── click on track (not thumb) to jump ───────────────────────────────────
    const onTrackClick = (e: MouseEvent) => {
      if (e.target === thumb) return;
      if (revealActive.current) {
        const trackRect = track.getBoundingClientRect();
        const { trackH, thumbH } = getThumbMetrics();
        seekReveal((e.clientY - trackRect.top - thumbH / 2) / (trackH - thumbH));
        return;
      }
      const { scrollHeight, clientHeight } = getScrollInfo();
      const docHeight  = scrollHeight - clientHeight;
      const trackRect  = track.getBoundingClientRect();
      const clickY     = e.clientY - trackRect.top;
      const { trackH, thumbH } = getThumbMetrics();
      const progress   = Math.max(0, Math.min(1, (clickY - thumbH / 2) / (trackH - thumbH)));
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

    // ── attach ────────────────────────────────────────────────────────────────
    // Listen on the custom scroller AND window for coverage
    const scroller = getScroller();
    const scrollTarget = scroller ?? window;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("chess-reveal-mode", onRevealMode);
    window.addEventListener("chess-reveal-progress", onRevealProgress);

    window.addEventListener("mousemove", onWindowMouseMove, { passive: true });
    document.addEventListener("mousemove", onDocMouseMove,  { passive: true });
    document.addEventListener("mouseup",   onDocMouseUp);
    thumb.addEventListener("mousedown",    onThumbDown);
    track.addEventListener("mouseenter",   onTrackEnter);
    track.addEventListener("mouseleave",   onTrackLeave);
    track.addEventListener("click",        onTrackClick);

    updateThumb();

    return () => {
      scrollTarget.removeEventListener("scroll", onScroll);
      window.removeEventListener("chess-reveal-mode", onRevealMode);
      window.removeEventListener("chess-reveal-progress", onRevealProgress);
      window.removeEventListener("mousemove", onWindowMouseMove);
      document.removeEventListener("mousemove", onDocMouseMove);
      document.removeEventListener("mouseup",   onDocMouseUp);
      thumb.removeEventListener("mousedown",    onThumbDown);
      track.removeEventListener("mouseenter",   onTrackEnter);
      track.removeEventListener("mouseleave",   onTrackLeave);
      track.removeEventListener("click",        onTrackClick);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div ref={trackRef} className={styles.track} aria-hidden="true">
      <div ref={thumbRef} className={styles.thumb} />
    </div>
  );
}
