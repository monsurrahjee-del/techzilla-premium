"use client";

import { forwardRef } from "react";
import styles from "./Loader.module.css";

const Noise = forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <>
      <svg
        className={styles.svgNoise}
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="noiseFilter">

          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="4"
            stitchTiles="stitch"
          />

          <feColorMatrix
            type="saturate"
            values="0"
          />

        </filter>
      </svg>

      <div
        ref={ref}
        className={styles.noise}
      />
    </>
  );
});

Noise.displayName = "Noise";

export default Noise;