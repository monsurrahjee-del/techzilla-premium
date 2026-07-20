"use client";

import { motion, type Variants } from "framer-motion";
import styles from "./Hero.module.css";
import { useLoaded } from "@/hooks/useLoaded";

const lineReveal: Variants = {
  hidden: { rotateX: -90, opacity: 0 },
  visible: (i: number) => ({
    rotateX: 0,
    opacity: 1,
    transition: {
      duration: 0.68,
      delay: 0.12 + i * 0.38,
      ease: [0.22, 0.9, 0.36, 1],
    },
  }),
};

const LINES = [
  { text: "WE BUILD",     accent: false, scales: false },
  { text: "SOFTWARE",     accent: true,  scales: false },
  { text: "THAT SCALES.", accent: false, scales: true  },
];

export default function HeroHeadline() {
  const loaded = useLoaded();

  return (
    <div className={styles.headlineBacker}>
      <motion.h1
        className={styles.heroHeadline}
        initial="hidden"
        animate={loaded ? "visible" : "hidden"}
        aria-label="WE BUILD SOFTWARE THAT SCALES."
      >
        {LINES.map((line, i) => (
          <span key={line.text} className={styles.headlineLineMask}>
            <motion.span
              className={`${styles.headlineLine} ${line.accent ? styles.headlineAccent : ""} ${line.scales ? styles.headlineScales : ""} cursor-target`}
              custom={i}
              variants={lineReveal}
            >
              {line.text}
            </motion.span>
          </span>
        ))}
      </motion.h1>
    </div>
  );
}
