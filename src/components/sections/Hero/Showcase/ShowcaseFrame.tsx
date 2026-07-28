"use client";

import { forwardRef } from "react";
import styles from "./Showcase.module.css";

interface ShowcaseFrameProps {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  url: string;
}

/**
 * Premium browser chrome — feels like a thick physical object, not a flat card.
 *
 * Material layer stack (back → front):
 *   1. Dark glass body (rgba + backdrop-filter)
 *   2. Thickness edge — inset box-shadow simulating lit/shadowed physical depth
 *   3. Rim light — cursor-reactive radial highlight, updates via --lx/--ly CSS vars
 *   4. Diagonal screen reflection sweep
 *   5. Browser chrome header (traffic lights, address bar, live indicator)
 *   6. Thin frame divider
 *   7. Screen viewport (project content)
 *   8. Transition overlay (TransitionOverlay component)
 *   9. Under-glow bloom (accented by --glow CSS var from parent)
 */
const ShowcaseFrame = forwardRef<HTMLDivElement, ShowcaseFrameProps>(
  ({ children, overlay, url }, ref) => {
    return (
      <div ref={ref} className={styles.frame}>

        {/* ── Physical thickness edge ──────────────────────────────────── */}
        <div className={styles.frameEdge} aria-hidden="true" />

        {/* ── Cursor-reactive rim light ─────────────────────────────────
            Driven by --lx / --ly CSS custom properties set in Showcase.tsx.
            Creates the illusion that a real light source tracks the cursor. */}
        <div className={styles.rimLight} aria-hidden="true" />

        {/* ── Browser chrome header ──────────────────────────────────── */}
        <div className={styles.frameHeader}>
          {/* macOS-style traffic lights */}
          <div className={styles.trafficLights} aria-hidden="true">
            <span className={`${styles.light} ${styles.lightRed}`}    />
            <span className={`${styles.light} ${styles.lightYellow}`} />
            <span className={`${styles.light} ${styles.lightGreen}`}  />
          </div>

          {/* Address bar pill */}
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

          {/* Right: live indicator */}
          <div className={styles.frameRight}>
            <span className={styles.liveDot} />
            <span className={styles.liveLabel}>live</span>
          </div>
        </div>

        {/* ── Thin separator ────────────────────────────────────────────── */}
        <div className={styles.frameDivider} />

        {/* ── Screen viewport ────────────────────────────────────────────── */}
        <div className={styles.frameViewport}>
          {children}
          {/* Diagonal glass reflection sweep */}
          <div className={styles.screenReflection} aria-hidden="true" />
        </div>

        {overlay}

        {/* ── Internal bloom — accented by --glow from parent ──────────── */}
        <div className={styles.browserGlow} />
      </div>
    );
  }
);

ShowcaseFrame.displayName = "ShowcaseFrame";

export default ShowcaseFrame;
