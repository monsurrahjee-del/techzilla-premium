"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import Parallax from "@/components/ui/Parallax";
import styles from "./Hero.module.css";

export default function HeroBackground() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    // quickTo updates the running tween in-place — no new tween per mousemove.
    // Preserves the same easing / duration as before.
    const xTo = gsap.quickTo(glow, "x", { duration: 0.1, ease: "power3.out" });
    const yTo = gsap.quickTo(glow, "y", { duration: 0.1, ease: "power3.out" });

    let heroActive = true;
    const onHeroActive = (e: Event) => {
      heroActive = (e as CustomEvent<{ heroActive: boolean }>).detail.heroActive;
    };

    const handleMove = (e: MouseEvent) => {
      if (!heroActive) return;
      const mx = e.clientX / window.innerWidth  - 0.5;
      const my = e.clientY / window.innerHeight - 0.5;
      xTo((mx - window.innerWidth  / 2) * 0.15);
      yTo((my - window.innerHeight / 2) * 0.15);
    };

    window.addEventListener("mousemove",           handleMove, { passive: true });
    window.addEventListener("hero-section-active", onHeroActive);
    return () => {
      window.removeEventListener("mousemove",           handleMove);
      window.removeEventListener("hero-section-active", onHeroActive);
    };
  }, []);

  return (
    <div className={styles.background}>
      <Parallax strength={10}>
        <div ref={glowRef} className={styles.glow} />
      </Parallax>

      <div className={styles.grid} />
      <div className={styles.spotlight} />
    </div>
  );
}
