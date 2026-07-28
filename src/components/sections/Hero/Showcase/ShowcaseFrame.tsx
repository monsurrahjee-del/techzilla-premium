"use client";

import { forwardRef } from "react";
import styles from "./Showcase.module.css";

interface ShowcaseFrameProps {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  url: string;
}

/**
 * Premium browser chrome — feels like a physical object, not a screenshot in a div.
 *
 * Material layers (back to front):
 *   1. Dark glass body (rgba + backdrop-filter)
 *   2. Edge highlight gradient via ::before (simulates lit edge of thick glass)
 *   3. Inner screen reflection via ::after (soft diagonal specular sweep)
 *   4. Content viewport
 *   5. Transition overlay
 *   6. Under-glow bloom
 */
const ShowcaseFrame = forwardRef<HTMLDivElement, ShowcaseFrameProps>(
  ({ children, overlay, url }, ref) => {
    return (
      <div ref={ref} className={styles.frame}>

        {/* ── Thickness edge — two-tone left+top vs right+bottom ─────── */}
        <div className={styles.frameEdge} aria-hidden="true" />

        {/* ── Browser chrome header ──────────────────────────────────── */}
        <div className={styles.frameHeader}>
          {/* Traffic lights */}
          <div className={styles.trafficLights} aria-hidden="true">
            <span className={`${styles.light} ${styles.lightRed}`}    />
            <span className={`${styles.light} ${styles.lightYellow}`} />
            <span className={`${styles.light} ${styles.lightGreen}`}  />
          </div>

          {/* Address bar */}
          <div className={styles.addressBar}>
            {/* Lock icon */}
            <svg className={styles.lockIcon} viewBox="0 0 12 14" fill="none" aria-hidden="true">
              <rect x="2" y="6" width="8" height="7" rx="1.5" fill="currentColor" opacity="0.7"/>
              <path d="M4 6V4.5a2 2 0 0 1 4 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
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

          {/* Right cluster */}
          <div className={styles.frameRight}>
            <span className={styles.liveDot} />
            <span className={styles.liveLabel}>live</span>
          </div>
        </div>

        {/* ── Thin separator line ────────────────────────────────────── */}
        <div className={styles.frameDivider} />

        {/* ── Screen viewport ────────────────────────────────────────── */}
        <div className={styles.frameViewport}>
          {children}
          {/* Screen-space glass reflection sweep */}
          <div className={styles.screenReflection} aria-hidden="true" />
        </div>

        {overlay}

        {/* ── Under-glow bloom ──────────────────────────────────────── */}
        <div className={styles.browserGlow} />
      </div>
    );
  }
);

ShowcaseFrame.displayName = "ShowcaseFrame";

export default ShowcaseFrame;
