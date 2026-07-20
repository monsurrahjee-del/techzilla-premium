"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useRef } from "react";
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
}

export default function Sticker({
  src, size, top, left, delay, rotate, depth, floatDur, floatAmp, front = false,
}: StickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useParallax(ref, depth);

  const zIndex = front ? 18 : 12;

  return (
    <motion.div
      ref={ref}
      className={styles.sticker}
      style={{ top, left, width: size, height: size, zIndex }}
      initial={{ opacity: 0, scale: 0.5, y: 28, rotate: rotate - 18 }}
      animate={{ opacity: 1, scale: 1,   y: 0,  rotate }}
      transition={{
        opacity: { duration: 0.55, delay,       ease: [0.22, 1, 0.36, 1] },
        scale:   { duration: 0.60, delay,       ease: [0.34, 1.56, 0.64, 1] },
        y:       { duration: 0.65, delay,       ease: [0.22, 1, 0.36, 1] },
        rotate:  { duration: 0.75, delay,       ease: [0.22, 1, 0.36, 1] },
      }}
    >
      {/* inner div: continuous wind float, starts after entry */}
      <motion.div
        style={{ width: "100%", height: "100%" }}
        animate={{
          y:      [0, -floatAmp, floatAmp * 0.35, -floatAmp * 0.55, 0],
          rotate: [rotate, rotate + 5, rotate - 4, rotate + 3, rotate],
        }}
        transition={{
          duration: floatDur,
          delay:    delay + 0.8,
          repeat:   Infinity,
          ease:     "easeInOut",
          times:    [0, 0.28, 0.55, 0.78, 1],
        }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={`${size}px`}
          className={styles.image}
          style={{
            filter: `drop-shadow(0 ${12 + depth * 0.3}px ${28 + depth}px rgba(0,0,0,0.35))`,
          }}
        />
      </motion.div>
    </motion.div>
  );
}
