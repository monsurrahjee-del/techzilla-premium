"use client";

import styles from "./Loader.module.css";

interface ProgressProps {
  progress: number;
}

export default function Progress({ progress }: ProgressProps) {
  return (
    <div className={styles.progressWrapper}>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <span className={styles.progressText}>
        {progress}%
      </span>
    </div>
  );
}