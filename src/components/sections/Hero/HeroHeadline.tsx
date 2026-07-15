"use client";

import { motion } from "framer-motion";
import styles from "./Hero.module.css";

export default function HeroHeadline() {
  return (
    <div className={styles.headline}>
      <motion.h1
        className={styles.title}
        initial="hidden"
        animate="visible"
      >
        <motion.span
          className={styles.small}
          variants={{
            hidden: { opacity: 0, y: 60 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: .8 }
            }
          }}
        >
          WE BUILD
        </motion.span>

        <motion.span
          className={styles.big}
          variants={{
            hidden: { opacity: 0, y: 90 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 1,
                delay: .2
              }
            }
          }}
        >
          DIGITAL
        </motion.span>

        <motion.span
          className={styles.right}
          variants={{
            hidden: { opacity: 0, x: -60 },
            visible: {
              opacity: 1,
              x: 0,
              transition: {
                duration: .9,
                delay: .4
              }
            }
          }}
        >
          FUTURE
        </motion.span>
      </motion.h1>
    </div>
  );
}