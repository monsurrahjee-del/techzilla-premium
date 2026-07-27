"use client";

import { motion } from "framer-motion";
import styles from "./Hero.module.css";
import { useLoaded } from "@/hooks/useLoaded";

export default function HeroIntro() {
  const loaded = useLoaded();

  return (
    <div className={styles.introBlock}>
      {/* Desktop — full text */}
      <motion.p
        className={`${styles.introBio} ${styles.bioDesktop}`}
        initial={{ opacity: 0, y: 22 }}
        animate={loaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
        transition={{ duration: 0.85, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        We&apos;re Techzilla — an independent software engineering studio
        building scalable systems, polished interfaces, and AI-powered tools
        for ambitious teams. We move fast, write clean code, and ship things
        that last.
      </motion.p>

      {/* Mobile — shorter text with backdrop for readability */}
      <motion.p
        className={`${styles.introBio} ${styles.bioMobile}`}
        initial={{ opacity: 0, y: 22 }}
        animate={loaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
        transition={{ duration: 0.85, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        We&apos;re Techzilla — a software studio building scalable systems,
        polished interfaces, and AI-powered tools. Fast code. Lasting products.
      </motion.p>
    </div>
  );
}
