"use client";

import { RefObject, useEffect } from "react";
import { gsap } from "@/lib/gsap";

export function useParallax(
  ref: RefObject<HTMLElement | null>,
  strength = 20,
  yStrength?: number,
) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 992) return;

    const element = ref.current;
    if (!element) return;

    const ys = yStrength ?? strength;

    // Direct 1:1 positioning — duration 0, no easing.
    // The element moves exactly with the pointer without any animation lag.
    const xTo = gsap.quickTo(element, "x", { duration: 0, ease: "none" });
    const yTo = gsap.quickTo(element, "y", { duration: 0, ease: "none" });

    const handleMove = (e: MouseEvent) => {
      xTo((e.clientX / window.innerWidth  - 0.5) * strength);
      yTo((e.clientY / window.innerHeight - 0.5) * ys);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [ref, strength, yStrength]);
}
