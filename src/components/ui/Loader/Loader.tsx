"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./Loader.module.css";
import Progress from "./Progress";
import Noise from "./Noise";
import { createParallax } from "@/motion";
import Wipe from "./Wipe";
import { buildLoaderAnimation } from "@/motion";
import Blur from "./Blur";
import AnimatedLogo from "./AnimatedLogo";

export default function Loader() {
  const [progress, setProgress] = useState(0);
  const logoRef = useRef<HTMLHeadingElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const noiseRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 7;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => {
          // Fire hero-ready signal so all hero components start their entrances
          // while the loader is still doing its curtain-rise exit.
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("techzillaReady"));
          }
          setLoading(false);
        }, 800);
      }
      setProgress(Math.floor(current));
    }, 40);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!logoRef.current || !progressRef.current || !noiseRef.current) return;
    const cleanup = createParallax({
      logo: logoRef.current,
      progress: progressRef.current,
      noise: noiseRef.current,
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (!logoRef.current || !progressRef.current || !overlayRef.current || !wipeRef.current) return;
    const tl = buildLoaderAnimation({
      logo: logoRef.current,
      progress: progressRef.current,
      overlay: overlayRef.current,
      wipe: wipeRef.current,
    });
    tl.play();
    return () => { tl.kill(); };
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          ref={overlayRef}
          className={styles.loader}
          initial={{ opacity: 1, y: 0 }}
          exit={{
            y: "-100%",
            transition: {
              duration: 0.72,
              ease: [0.87, 0, 0.13, 1],
            },
          }}
        >
          <Wipe ref={wipeRef} />
          <Blur />
          <Noise ref={noiseRef} />
          <AnimatedLogo />
          <div ref={progressRef}>
            <Progress progress={progress} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
