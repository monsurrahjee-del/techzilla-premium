"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import styles from "./StickerCloud.module.css";
import { useParallax } from "@/hooks/useParallax";
import { useRef } from "react";

interface StickerProps {
  src: string;
  size: number;
  top: string;
  left: string;
  delay: number;
  rotate: number;
  depth: number;
}

export default function Sticker({
  src,
  size,
  top,
  left,
  delay,
  rotate,
  depth,
}: StickerProps) {
    
    const stickerRef = useRef<HTMLDivElement>(null);

useParallax(stickerRef, depth);
    
  return (
    <motion.div
    ref={stickerRef}
      className={styles.sticker}
      initial={{
        opacity: 0,
        scale: 0.8,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -18, 0],
        rotate: [rotate, rotate + 6, rotate],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        top,
        left,
        width: size,
        height: size,
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={`${size}px`}
        className={styles.image}
      />
    </motion.div>
  );
}