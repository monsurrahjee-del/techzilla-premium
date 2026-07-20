"use client";

import { motion } from "framer-motion";
import styles from "./Loader.module.css";

const text = "TECHZILLA INC.";

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045,
    },
  },
};

const letter = {
  hidden: {
    opacity: 0,
    y: 80,
    rotateX: -90,
    filter: "blur(12px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1]as const,
    },
  },
};

export default function AnimatedLogo() {
  return (
    <motion.h1
      className={styles.logo}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          variants={letter}
          className={styles.letter}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.h1>
  );
}