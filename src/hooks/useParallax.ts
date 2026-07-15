"use client";

import { RefObject, useEffect } from "react";
import { gsap } from "@/lib/gsap";

export function useParallax(
  ref: RefObject<HTMLElement | null>,
  strength = 20
) {
  useEffect(() => {
    // Only run in the browser
    if (typeof window === "undefined") return;

    // Disable on tablets/phones
    if (window.innerWidth < 992) return;

    const element = ref.current;

    if (!element) return;

    const xTo = gsap.quickTo(element, "x", {
      duration: 0.6,
      ease: "power3.out",
    });

    const yTo = gsap.quickTo(element, "y", {
      duration: 0.6,
      ease: "power3.out",
    });

    const handleMove = (e: MouseEvent) => {
      const x =
        (e.clientX / window.innerWidth - 0.5) * strength;

      const y =
        (e.clientY / window.innerHeight - 0.5) * strength;

      xTo(x);
      yTo(y);
    };

    window.addEventListener("mousemove", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
    };
  }, [ref, strength]);
}