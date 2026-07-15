"use client";

import { forwardRef } from "react";
import styles from "./Showcase.module.css";

interface ShowcaseFrameProps {
  children: React.ReactNode;
  url: string;
}

const ShowcaseFrame = forwardRef<HTMLDivElement, ShowcaseFrameProps>(
  ({ children, url }, ref) => {
    return (
      <div ref={ref} className={styles.frame}>
        <div className={styles.frameHeader}>
          <div className={styles.frameLeft}>
            <span className={styles.liveDot}></span>

            <div>
              <p className={styles.frameLabel}>
                LIVE PROJECT
              </p>

              <p className={styles.frameUrl}>
                {url}
              </p>
            </div>
          </div>

          <div className={styles.frameRight}>
            TECHZILLA
          </div>
        </div>

        <div className={styles.frameDivider} />

        <div className={styles.frameViewport}>
          {children}
        </div>

        <div className={styles.browserGlow} />
      </div>
    );
  }
);

ShowcaseFrame.displayName = "ShowcaseFrame";

export default ShowcaseFrame;