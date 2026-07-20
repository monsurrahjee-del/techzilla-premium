"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import styles from "./Hero.module.css";

export default function HeroContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // quickTo updates the running tween in-place — no new tween per mousemove.
    // Preserves the same easing / duration / formula as the previous code.
    const xTo       = gsap.quickTo(ref.current, "x",       { duration: 0.1, ease: "power3.out" });
    const yTo       = gsap.quickTo(ref.current, "y",       { duration: 0.1, ease: "power3.out" });
    const rotateYTo = gsap.quickTo(ref.current, "rotateY", { duration: 0.1, ease: "power3.out" });

    let heroActive = true;
    const onHeroActive = (e: Event) => {
      heroActive = (e as CustomEvent<{ heroActive: boolean }>).detail.heroActive;
    };

    const handleMove = (e: MouseEvent) => {
      // Skip entirely when Hero is behind another section — avoids redundant
      // GSAP work on a 22%-opacity element the user can barely see.
      if (!heroActive) return;
      const mx = e.clientX / window.innerWidth  - 0.5;
      const my = e.clientY / window.innerHeight - 0.5;
      xTo      ((mx - window.innerWidth  / 2) * 0.02);
      yTo      ((my - window.innerHeight / 2) * 0.02);
      rotateYTo((mx - window.innerWidth  / 2) * 0.005);
    };

    window.addEventListener("mousemove",          handleMove,    { passive: true });
    window.addEventListener("hero-section-active", onHeroActive);
    return () => {
      window.removeEventListener("mousemove",           handleMove);
      window.removeEventListener("hero-section-active", onHeroActive);
    };
  }, []);

  return (
    <div ref={ref} className={styles.content}>
      {children}
    </div>
  );
}
