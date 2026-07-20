"use client";

import { forwardRef } from "react";
import styles from "./Showcase.module.css";

interface ShowcaseFrameProps {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  url: string;
}

const ShowcaseFrame = forwardRef<HTMLDivElement, ShowcaseFrameProps>(
  ({ children, overlay, url }, ref) => {
    return (
      <div ref={ref} className={styles.frame}>
        {/* ── Browser chrome header ── */}
        <div className={styles.frameHeader}>
          <div className={styles.frameLeft}>
            <span className={styles.liveDot} />
            <a
              href={`https://${url}`}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.frameUrl}
            >
              {url}
            </a>
          </div>
        </div>

        <div className={styles.frameDivider} />

        <div className={styles.frameViewport}>
          {children}
        </div>

        {overlay}
        <div className={styles.browserGlow} />
      </div>
    );
  }
);

ShowcaseFrame.displayName = "ShowcaseFrame";

export default ShowcaseFrame;
