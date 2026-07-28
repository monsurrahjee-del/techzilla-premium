"use client";

import { motion, type Variants } from "framer-motion";
import { useRef, useEffect } from "react";
import styles from "./Hero.module.css";
import { useLoaded } from "@/hooks/useLoaded";

// Per-line 3D coin-flip entrance with spring overshoot on last line
const lineReveal: Variants = {
  hidden: {
    rotateX: -90,
    opacity: 0,
    y: 24,
    filter: "blur(6px)",
  },
  visible: (i: number) => ({
    rotateX: 0,
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: i === 3 ? 0.82 : 0.76,
      delay: 0.08 + i * 0.26,
      ease: i === 3
        ? [0.34, 1.52, 0.64, 1]   // spring overshoot on BUSINESSES.
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
  const loaded      = useLoaded();
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);

  // Cursor-following light: update --sx/--sy so text shadows react to mouse
  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const nx   = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width  * 0.6)));
      const ny   = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height * 2.0)));
      el.style.setProperty("--sx", nx.toFixed(3));
      el.style.setProperty("--sy", ny.toFixed(3));
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div ref={wrapperRef} className={styles.headlineBacker}>
      {/* Micro-breathing wrapper — headline gently pulses as if alive */}
      <motion.div
        animate={{ scale: [1, 1.004, 1, 0.998, 1] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
      >
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
                  // Each line kicks back in alternating direction — organic, not robotic
                  x:     i % 2 === 0 ?  8 : -8,
                  skewX: i % 2 === 0 ?  1.4 : -1.4,
                  transition: {
                    duration: 0.20,
                    ease: [0.22, 1, 0.36, 1],
                  },
                }}
              >
                {line.text}
              </motion.span>
            </span>
          ))}
        </motion.h1>
      </motion.div>
    </div>
  );
}
