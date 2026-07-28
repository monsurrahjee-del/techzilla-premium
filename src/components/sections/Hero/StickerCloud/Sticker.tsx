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
  front?: boolean;
  /** Attraction pull strength when cursor is in mid-range (0–1) */
  pull?: number;
  /** Max px displacement */
  maxPull?: number;
  /** Spring stiffness */
  stiffness?: number;
  /** Spring damping */
  damping?: number;
}

/**
 * Each sticker behaves like a physical floating object:
 *
 *  • cursor < DEFLECT_RADIUS px  → exponential push-away  (avoidance zone)
 *  • cursor < ATTRACT_RADIUS px  → spring attraction      (magnetic zone)
 *  • cursor > ATTRACT_RADIUS px  → spring to origin        (resting)
 *
 * The three zones create a "magnetic/repulsive" personality per sticker
 * that makes interactions feel alive and physical rather than scripted.
 */
const DEFLECT_RADIUS = 92;   // px — push-away zone
const ATTRACT_RADIUS = 520;  // px — pull-in zone

export default function Sticker({
  src, size, top, left, delay, rotate, depth, floatDur, floatAmp,
  front = false,
  pull = 0.3,
  maxPull = 42,
  stiffness = 120,
  damping = 18,
}: StickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useParallax(containerRef, depth);

  const zIndex = front ? 18 : 12;

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness, damping, restDelta: 0.5 });
  const springY = useSpring(cursorY, { stiffness, damping, restDelta: 0.5 });

  // Shadow deepens with depth (closer to viewer = harder shadow)
  const dropShadow = `drop-shadow(0 ${10 + depth * 0.22}px ${24 + depth * 0.72}px rgba(0,0,0,${0.30 + depth * 0.003}))`;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = e.clientX - cx;
      const dy   = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      let targetX = 0;
      let targetY = 0;

      if (dist < DEFLECT_RADIUS && dist > 0.5) {
        // Avoidance zone: exponential push-away — sticker flees the cursor
        const pushStrength = Math.pow(1 - dist / DEFLECT_RADIUS, 2.2) * maxPull * 2.2;
        const nx = dx / dist;
        const ny = dy / dist;
        targetX  = -nx * pushStrength;
        targetY  = -ny * pushStrength;
      } else if (dist < ATTRACT_RADIUS) {
        // Magnetic zone: smooth attraction with distance falloff
        const influence = Math.max(0, (1 - dist / ATTRACT_RADIUS));
        // Ease-in the attraction so it doesn't snap immediately
        const eased = influence * influence;
        targetX = Math.sign(dx) * Math.min(Math.abs(dx * pull * eased), maxPull);
        targetY = Math.sign(dy) * Math.min(Math.abs(dy * pull * eased), maxPull);
      }
      // else: resting — targetX/targetY stay 0, spring settles naturally

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
      initial={{ opacity: 0, scale: 0.35, rotate: rotate - 28, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1,   rotate,               filter: "blur(0px)" }}
      transition={{
        opacity: { duration: 0.65, delay,       ease: [0.22, 1, 0.36, 1] },
        scale:   { duration: 0.80, delay,       ease: [0.34, 1.60, 0.64, 1] },
        rotate:  { duration: 0.85, delay,       ease: [0.22, 1, 0.36, 1] },
        filter:  { duration: 0.60, delay,       ease: "easeOut" },
      }}
    >
      {/* Idle float: each sticker has a completely unique 6-keyframe path */}
      <motion.div
        style={{ width: "100%", height: "100%", willChange: "transform" }}
        animate={{
          y:      [0, -floatAmp, floatAmp * 0.42, -floatAmp * 0.64, floatAmp * 0.18, 0],
          rotate: [rotate, rotate + 7, rotate - 5, rotate + 4, rotate - 2, rotate],
          scale:  [1, 1.028, 0.972, 1.014, 0.988, 1],
        }}
        transition={{
          duration: floatDur,
          delay:    delay + 0.95,
          repeat:   Infinity,
          ease:     "easeInOut",
          times:    [0, 0.20, 0.42, 0.62, 0.82, 1],
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
