"use client";

import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";
import { useLoaded } from "@/hooks/useLoaded";

const BuildFluid3D = dynamic(() => import("./BuildFluid3D"), {
  ssr: false,
  loading: () => null,
});

// Module-level mouse — never torn down, always current.
const _m = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      _m.x = e.clientX / window.innerWidth  - 0.5;
      _m.y = e.clientY / window.innerHeight - 0.5;
    },
    { passive: true }
  );
}

// ── Theme A content extracted into its own component ─────────────────────────
// Critical: HeroScript is always mounted; if the rAF loop lives in
// HeroScript's useEffect it runs once on first load when theme B is active,
// finds null refs, and never starts. ThemeABuild only mounts when theme===dark,
// so its useEffect always fires with valid refs — on every mount/remount.
function ThemeABuild() {
  const stageRef = useRef<HTMLDivElement>(null);
  const wordRef  = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const word  = wordRef.current;
    if (!stage || !word) return;

    let lx = 0, ly = 0;
    const LERP = 0.055;
    let raf: number;

    const tick = () => {
      lx += (_m.x - lx) * LERP;
      ly += (_m.y - ly) * LERP;

      stage.style.transform =
        `translate3d(${_m.x * 96}px,${_m.y * 60}px,0)` +
        ` rotateX(${-ly * 18}deg)` +
        ` rotateY(${lx * 28}deg)`;

      const gx = (lx + 0.5) * 100;
      const gy = (ly + 0.5) * 100;
      word.style.setProperty("--gloss-x",    `${gx}%`);
      word.style.setProperty("--gloss-y",    `${gy}%`);
      word.style.setProperty("--irid-angle", `${90 + lx * 90}deg`);
      word.style.setProperty("--spec-x",     `${28 + gx * 0.44}%`);
      word.style.setProperty("--spec-y",     `${18 + gy * 0.44}%`);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={stageRef}
      style={{ willChange: "transform", transformStyle: "preserve-3d" }}
    >
      <motion.span
        ref={wordRef}
        className={styles.scriptWord}
        animate={{ rotate: [-2.5, 1.5, -2.5] }}
        transition={{ rotate: { duration: 11, repeat: Infinity, ease: "easeInOut" } }}
      >
        build
        <span aria-hidden="true" className={styles.scriptIridescent} />
        <span aria-hidden="true" className={styles.scriptGloss}>build</span>
        <span aria-hidden="true" className={styles.scriptSpec}>build</span>
      </motion.span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface HeroScriptProps {
  theme: "dark" | "light";
}

export default function HeroScript({ theme }: HeroScriptProps) {
  const loaded = useLoaded();

  return (
    <div className={styles.scriptLayer} aria-hidden="true">
      <AnimatePresence mode="wait">

        {theme === "dark" && (
          <motion.div
            key="themeA"
            className={styles.scriptStage}
            initial={{ opacity: 0, scale: 0.78 }}
            animate={loaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.78 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <ThemeABuild />
          </motion.div>
        )}

        {theme === "light" && (
          <motion.div
            key="themeB"
            className={styles.scriptStage3d}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={loaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.88 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <BuildFluid3D />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
