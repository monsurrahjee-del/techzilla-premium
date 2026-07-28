"use client";

import { motion, type Variants, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import styles from "./Hero.module.css";
import { useLoaded } from "@/hooks/useLoaded";

// Per-line 3D coin-flip entrance — each line flips up from below
// with increasing delay, spring overshoot on the last line.
const lineReveal: Variants = {
  hidden: {
    rotateX: -90,
    opacity: 0,
    y: 22,
    filter: "blur(5px)",
  },
  visible: (i: number) => ({
    rotateX: 0,
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: i === 3 ? 0.80 : 0.74,
      delay:    0.10 + i * 0.28,
      ease:     i === 3
        ? [0.34, 1.45, 0.64, 1]   // spring overshoot on BUSINESSES.
        : [0.22, 1,    0.36, 1],
    },
  }),
};

const LINES = [
  { text: "WE BUILD",    accent: false, breathes: false },
  { text: "SOFTWARE",    accent: true,  breathes: false },
  { text: "THAT MOVES",  accent: false, breathes: true  },
  { text: "BUSINESSES.", accent: false, breathes: false },
];

export default function HeroHeadline() {
  const loaded = useLoaded();
  const headlineRef = useRef<HTMLHeadingElement>(null);

  // Cursor-following light: update CSS var --shadow-x/--shadow-y on headline
  // so the text shadow reacts to mouse position, giving the illusion of
  // a real light source casting depth into the letterforms.
  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      // Normalised -1 to +1 relative to headline centre
      const nx   = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width  * 0.6)));
      const ny   = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height * 2.0)));
      el.style.setProperty("--sx", nx.toFixed(3));
      el.style.setProperty("--sy", ny.toFixed(3));
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className={styles.headlineBacker}>
      <motion.h1
        ref={headlineRef}
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
                line.accent   ? styles.headlineAccent  : "",
                line.breathes ? styles.headlineScales  : "",
                "cursor-target",
              ].filter(Boolean).join(" ")}
              custom={i}
              variants={lineReveal}
              whileHover={{
                // Each line kicks back on hover — direction alternates per line
                x:     i % 2 === 0 ?  7 : -7,
                skewX: i % 2 === 0 ?  1.2 : -1.2,
                transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
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
