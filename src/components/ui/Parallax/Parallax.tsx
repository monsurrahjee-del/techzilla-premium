"use client";

import { useEffect, useRef, ReactNode } from "react";
import { gsap } from "@/lib/gsap";

interface Props {
  children: ReactNode;
  strength?: number;
  className?: string;
}

export default function Parallax({ children, strength = 20, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // quickTo creates a reusable setter that updates the running tween in-place
    // instead of spawning a new tween on every mousemove (which piles up).
    const xTo = gsap.quickTo(ref.current, "x", { duration: 0.1, ease: "power3.out" });
    const yTo = gsap.quickTo(ref.current, "y", { duration: 0.1, ease: "power3.out" });

    const handleMove = (e: MouseEvent) => {
      xTo((e.clientX / window.innerWidth  - 0.5) * strength);
      yTo((e.clientY / window.innerHeight - 0.5) * strength);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [strength]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
