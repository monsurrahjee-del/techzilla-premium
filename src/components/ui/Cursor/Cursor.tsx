"use client";

import { useEffect, useRef } from "react";
import styles from "./Cursor.module.css";
import { gsap } from "@/lib/gsap";

export default function Cursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;

    if (!cursor) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let currentX = mouseX;
    let currentY = mouseY;

    const move = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const update = () => {
      currentX += (mouseX - currentX) * 0.18;
      currentY += (mouseY - currentY) * 0.18;

      gsap.set(cursor, {
        x: currentX,
        y: currentY,
      });
    };

    window.addEventListener("mousemove", move);

    gsap.ticker.add(update);

    return () => {
      window.removeEventListener("mousemove", move);
      gsap.ticker.remove(update);
    };
  }, []);

  return <div ref={cursorRef} className={styles.cursor} />;
}