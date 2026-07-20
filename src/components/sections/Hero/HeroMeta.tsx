"use client";

import { motion, AnimatePresence } from "framer-motion";
import { projects } from "@/lib/projects";
import styles from "./Hero.module.css";

interface Props {
  projectIndex?: number;
}

export default function HeroMeta({ projectIndex = 0 }: Props) {
  const project = projects[projectIndex] ?? projects[0];

  return (
    <div className={styles.metaBar}>
      {/* Left — live project indicator synced with showcase */}
      <div className={styles.metaLeft}>
        <AnimatePresence mode="wait">
          <motion.span
            key={`chip-${projectIndex}`}
            className={styles.techChip}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {project.tech[0]}
          </motion.span>
        </AnimatePresence>

        <span className={styles.metaSep}>·</span>
        <span className={styles.metaLive}>Live Project</span>
        <span className={styles.metaSep}>·</span>

        <AnimatePresence mode="wait">
          <motion.a
            key={`url-${projectIndex}`}
            href={`https://${project.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.metaUrl}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            {project.url}
          </motion.a>
        </AnimatePresence>
      </div>

      {/* Right — brand */}
      <span className={styles.metaBrand}>Techzilla</span>
    </div>
  );
}
