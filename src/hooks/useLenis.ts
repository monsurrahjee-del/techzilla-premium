"use client";

import { useEffect } from "react";

// Smooth scrolling removed — native scroll gives immediate 1:1 response,
// which is required for GSAP ScrollTrigger scrub to feel instant.
export function useLenis() {
  useEffect(() => {
    // No-op: using native scroll so ScrollTrigger scrub is lag-free.
  }, []);
}
