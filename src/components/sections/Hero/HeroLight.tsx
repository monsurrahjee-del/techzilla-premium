"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

export default function HeroLight() {
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;

    // Centre default on mount
    light.style.transform = `translate3d(${window.innerWidth / 2}px,${window.innerHeight / 2}px,0)`;

    // Touch devices have no cursor — keep the light centred, skip the listener.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // Direct 1:1 positioning — no lerp, no RAF loop.
    const move = (e: MouseEvent) => {
      light.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
    };

    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return <div ref={lightRef} className={styles.heroLight} />;
}
