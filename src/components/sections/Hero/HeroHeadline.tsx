"use client";

import { motion, type Variants, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import styles from "./Hero.module.css";
import { useLoaded } from "@/hooks/useLoaded";

// Per-line 3D coin-flip entrance — each line flips up from below the fold
// with increasing delay, spring overshoot on the last line for personality.
const lineReveal: Variants = {
  hidden: {
    rotateX: -96,
    opacity: 0,
    y: 18,
    filter: "blur(4px)",
  },
  visible: (i: number) => ({
    rotateX: 0,
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration:  i === 3 ? 0.78 : 0.72,
      delay:     0.08 + i * 0.30,
      ease:      i === 3
        ? [0.34, 1.40, 0.64, 1]   // spring overshoot on last line
        : [0.22, 1,    0.36, 1],
    },
  }),
};

// Subtle breathing micro-animation that runs after entrance
const breathe: Variants = {
  rest: { scaleX: 1, scaleY: 1 },
  pulse: {
    scaleX: [1, 1.012, 1],
    scaleY: [1, 0.994, 1],
    transition: {
      duration: 3.2,
      repeat:   Infinity,
      ease:     "easeInOut",
    },
  },
};

const LINES = [
  { text: "WE BUILD",    accent: false, breathes: false },
  { text: "SOFTWARE",    accent: true,  breathes: false },
  { text: "THAT MOVES",  accent: false, breathes: true  },
  { text: "BUSINESSES.", accent: false, breathes: false },
];

export default function HeroHeadline() {
  const loaded = useLoaded();

  return (
    <div className={styles.headlineBacker}>
      <motion.h1
        className={styles.heroHeadline}
        initial="hidden"
        animate={loaded ? "visible" : "hidden"}
        aria-label="WE BUILD SOFTWARE THAT MOVES BUSINESSES."
      >
        {LINES.map((line, i) => (
          <span key={line.text} className={styles.headlineLineMask}>
            <motion.span
              className={[
                styles.headlineLine,
                line.accent   ? styles.headlineAccent : "",
                line.breathes ? styles.headlineScales : "",
                "cursor-target",
              ].filter(Boolean).join(" ")}
              custom={i}
              variants={lineReveal}
              whileHover={{
                // Each line "kicks back" slightly on hover for tactility
                x:         i % 2 === 0 ?  6 : -6,
                skewX:     i % 2 === 0 ?  1 : -1,
                transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
              }}
            >
              {line.text}
            </motion.span>
          </span>
        ))}
      </motion.h1>
    </div>
  );
}
