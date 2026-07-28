"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";
import styles from "./StickerCloud.module.css";
import { useParallax } from "@/hooks/useParallax";

interface StickerProps {
  src: string;
  size: number;
  top: string;
  left: string;
  delay: number;
  rotate: number;
  depth: number;
  floatDur: number;
  floatAmp: number;
  /** true → z-index 18 (in front of script word); false → z-index 12 (behind) */
  front?: boolean;
  /** How strongly cursor attracts this sticker (0 = none, 1 = strong) */
  pull?: number;
  /** Max px displacement toward cursor */
  maxPull?: number;
  /** Spring stiffness (higher = snappier) */
  stiffness?: number;
  /** Spring damping */
  damping?: number;
}

export default function Sticker({
  src, size, top, left, delay, rotate, depth, floatDur, floatAmp,
  front = false,
  pull = 0.3,
  maxPull = 40,
  stiffness = 120,
  damping = 18,
}: StickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useParallax(containerRef, depth);

  const zIndex = front ? 18 : 12;

  // Spring-based cursor attraction
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness, damping, restDelta: 0.5 });
  const springY = useSpring(cursorY, { stiffness, damping, restDelta: 0.5 });

  const dropShadow = `drop-shadow(0 ${12 + depth * 0.25}px ${28 + depth * 0.8}px rgba(0,0,0,0.38))`;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = e.clientX - cx;
      const dy   = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Attraction falls off with distance — full pull within ~200px, fades to 0 at 600px
      const influence = Math.max(0, 1 - dist / 600);
      const targetX   = Math.min(Math.max(dx * pull * influence, -maxPull), maxPull);
      const targetY   = Math.min(Math.max(dy * pull * influence, -maxPull), maxPull);

      cursorX.set(targetX);
      cursorY.set(targetY);
    };

    const onLeave = () => {
      cursorX.set(0);
      cursorY.set(0);
    };

    window.addEventListener("mousemove",  onMove,  { passive: true });
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [cursorX, cursorY, pull, maxPull]);

  return (
    <motion.div
      ref={containerRef}
      className={styles.sticker}
      style={{ top, left, width: size, height: size, zIndex, x: springX, y: springY }}
      initial={{ opacity: 0, scale: 0.4, rotate: rotate - 22 }}
      animate={{ opacity: 1, scale: 1,   rotate }}
      transition={{
        opacity: { duration: 0.60, delay,       ease: [0.22, 1, 0.36, 1] },
        scale:   { duration: 0.70, delay,       ease: [0.34, 1.56, 0.64, 1] },
        rotate:  { duration: 0.80, delay,       ease: [0.22, 1, 0.36, 1] },
      }}
    >
      {/* Inner div: continuous idle float with unique path */}
      <motion.div
        style={{ width: "100%", height: "100%", willChange: "transform" }}
        animate={{
          y:      [0, -floatAmp, floatAmp * 0.45, -floatAmp * 0.6, floatAmp * 0.2, 0],
          rotate: [rotate, rotate + 6, rotate - 5, rotate + 4, rotate - 2, rotate],
          scale:  [1, 1.025, 0.978, 1.01, 0.99, 1],
        }}
        transition={{
          duration: floatDur,
          delay:    delay + 0.9,
          repeat:   Infinity,
          ease:     "easeInOut",
          times:    [0, 0.22, 0.44, 0.62, 0.82, 1],
        }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={`${size}px`}
          className={styles.image}
          style={{ filter: dropShadow }}
        />
      </motion.div>
    </motion.div>
  );
}
