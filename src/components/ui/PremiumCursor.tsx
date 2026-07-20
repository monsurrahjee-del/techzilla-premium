"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PremiumCursor.module.css";

export default function PremiumCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;

    const SIZE = 34; // half = 17

    const onDown = () => setClicked(true);
    const onUp = () => setClicked(false);

    const onOver = (e: MouseEvent) => {
      const el = e.target as Element;
      if (el.closest("a, button, [role='button'], [data-hover]")) {
        setHovered(true);
      }
    };
    const onOut = (e: MouseEvent) => {
      const el = e.target as Element;
      if (el.closest("a, button, [role='button'], [data-hover]")) {
        setHovered(false);
      }
    };

    // Update ring position directly in the mousemove handler — no lerp, no RAF loop.
    // The ring lands exactly where the physical pointer is on every event.
    const onMove = (e: MouseEvent) => {
      ring.style.transform = `translate3d(${e.clientX - SIZE / 2}px, ${e.clientY - SIZE / 2}px, 0)`;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
    };
  }, []);

  return (
    <div
      ref={ringRef}
      className={[
        styles.ring,
        hovered ? styles.hovered : "",
        clicked ? styles.clicked : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
