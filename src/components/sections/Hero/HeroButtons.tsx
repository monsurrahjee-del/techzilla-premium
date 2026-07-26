"use client";

import { motion } from "framer-motion";
import Magnetic from "@/components/ui/Magnetic";
import styles from "./Hero.module.css";
import { useLoaded } from "@/hooks/useLoaded";

export default function HeroButtons() {
  const loaded = useLoaded();

  return (
    <motion.div
      className={styles.buttons}
      initial={{ opacity: 0, y: 28 }}
      animate={loaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.8, delay: 0.78, ease: [0.22, 1, 0.36, 1] }}
    >
      <Magnetic>
        <a
          href="#contact"
          className={`${styles.primary} cursor-target`}
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("craft-section-activate"));
          }}
        >
          Start A Project
          <span>&#8599;</span>
        </a>
      </Magnetic>

      <Magnetic>
        <a
          href="#work"
          className={`${styles.secondary} cursor-target`}
          onClick={(e) => {
            e.preventDefault();
            const max = document.documentElement.scrollHeight - window.innerHeight;
            window.dispatchEvent(new CustomEvent("section-nav-navigate"));
            window.scrollTo({ top: max });
          }}
        >
          View Our Work
        </a>
      </Magnetic>
    </motion.div>
  );
}
