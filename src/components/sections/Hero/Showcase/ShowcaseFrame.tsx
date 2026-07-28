"use client";

import { forwardRef } from "react";
import styles from "./Showcase.module.css";

interface ShowcaseFrameProps {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  url: string;
  /** Per-project glass tint colour applied to the chrome */
  glassTint?: string;
}

/**
 * Premium browser chrome — feels like a thick physical object, not a flat card.
 *
 * Material layer stack (back → front):
 *   1. Dark glass body (rgba + backdrop-filter)
 *   2. Physical glass tint — per-project subtle colouring
 *   3. Thickness edge — inset box-shadow simulating lit/shadowed physical depth
 *   4. Rim light — cursor-reactive radial highlight (--lx / --ly CSS vars)
 *   5. Ambient refraction hint — prismatic micro-streak along top edge
 *   6. Browser chrome header (traffic lights, address bar, live indicator)
 *   7. Thin frame divider
 *   8. Screen viewport (project content)
 *   9. Diagonal screen-space reflection sweep
 *  10. Internal bloom (accented by --glow CSS var from parent)
 *  11. Transition overlay
 */
const ShowcaseFrame = forwardRef<HTMLDivElement, ShowcaseFrameProps>(
  ({ children, overlay, url, glassTint }, ref) => {
    return (
      <div
        ref={ref}
        className={styles.frame}
        style={glassTint ? ({ "--glass-tint": glassTint } as React.CSSProperties) : undefined}
      >
        {/* ── Physical thickness edge ─────────────────────────────────────── */}
        <div className={styles.frameEdge} aria-hidden="true" />

        {/* ── Ambient refraction streak (top edge iridescent highlight) ─── */}
        <div className={styles.frameRefraction} aria-hidden="true" />

        {/* ── Cursor-reactive rim light ──────────────────────────────────── */}
        <div className={styles.rimLight} aria-hidden="true" />

        {/* ── Per-project glass tint ─────────────────────────────────────── */}
        <div className={styles.glassTintLayer} aria-hidden="true" />

        {/* ── Browser chrome header ─────────────────────────────────────── */}
        <div className={styles.frameHeader}>
          <div className={styles.trafficLights} aria-hidden="true">
            <span className={`${styles.light} ${styles.lightRed}`}    />
            <span className={`${styles.light} ${styles.lightYellow}`} />
            <span className={`${styles.light} ${styles.lightGreen}`}  />
          </div>

          <div className={styles.addressBar}>
            <svg className={styles.lockIcon} viewBox="0 0 12 14" fill="none" aria-hidden="true">
              <rect x="2" y="6" width="8" height="7" rx="1.5" fill="currentColor" opacity="0.65"/>
              <path d="M4 6V4.5a2 2 0 0 1 4 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.65"/>
            </svg>
            <a
              href={`https://${url}`}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.frameUrl}
            >
              {url}
            </a>
          </div>

          <div className={styles.frameRight}>
            <span className={styles.liveDot} />
            <span className={styles.liveLabel}>live</span>
          </div>
        </div>

        {/* ── Thin separator ────────────────────────────────────────────── */}
        <div className={styles.frameDivider} />

        {/* ── Screen viewport ───────────────────────────────────────────── */}
        <div className={styles.frameViewport}>
          {children}
          {/* Diagonal glass reflection sweep */}
          <div className={styles.screenReflection} aria-hidden="true" />
          {/* Corner depth vignette — deepens the sense of depth inside the glass */}
          <div className={styles.screenVignette} aria-hidden="true" />
        </div>

        {overlay}

        {/* ── Internal bloom — accented by --glow from parent ───────────── */}
        <div className={styles.browserGlow} />
      </div>
    );
  }
);

ShowcaseFrame.displayName = "ShowcaseFrame";

export default ShowcaseFrame;
