"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

export default function HeroLight() {
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = lightRef.current;

    if (!light) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let x = mouseX;
    let y = mouseY;

    const move = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const animate = () => {
      x += (mouseX - x) * 0.08;
      y += (mouseY - y) * 0.08;

      light.style.transform = `translate3d(${x}px,${y}px,0)`;

      requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener("mousemove", move);

    return () => {
      window.removeEventListener("mousemove", move);
    };
  }, []);

  return <div ref={lightRef} className={styles.heroLight} />;
}