"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useParallax } from "@/hooks/useParallax";
import { useLoaded } from "@/hooks/useLoaded";

import ShowcaseFrame from "./ShowcaseFrame";
import BrowserContent from "./BrowserContent";
import Reflection from "./Reflection";
import TransitionOverlay from "./TransitionOverlay";

import { projects } from "@/lib/projects";
import styles from "./Showcase.module.css";

// ─── Transition effects — cycles through 5 distinct looks ──────────────────
//
//  0  Electric discharge  — erratic X/Y jitter + RGB arc filter → white surge
//  1  Portal iris         — dark clip-path circle closes / opens
//  2  VHS scanline wipe   — horizontal scanline curtain drops then lifts
//  3  Neon flicker        — cyan/magenta strobe collapses to black
//  4  Shockwave burst     — radial ring explodes outward from centre
//
type OverlayApi = { play: (variant: number, cb: () => void) => void };

export default function Showcase({ onIndexChange }: { onIndexChange?: (i: number) => void }) {
  const loaded = useLoaded();

  const wrapperRef    = useRef<HTMLDivElement>(null);
  const frameRef      = useRef<HTMLDivElement>(null);
  const reflectionRef = useRef<HTMLDivElement>(null);
  const overlayApi    = useRef<OverlayApi>(null);

  const transitionVariant = useRef(0);

  // Horizontal parallax only — no vertical drift on top of the float
  useParallax(wrapperRef, 15, 0);

  const [index, setIndex] = useState(0);

  const advance = (cb: () => void) => {
    setIndex((prev) => {
      const next = (prev + 1) % projects.length;
      onIndexChange?.(next);
      return next;
    });
    cb();
  };

  useEffect(() => {
    const wrapper    = wrapperRef.current;
    const frame      = frameRef.current;
    const reflection = reflectionRef.current;
    if (!wrapper || !frame || !reflection) return;

    // ── 3-D tilt on mouse move ─────────────────────────────────────────────
    const onMove = (e: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top)  / rect.height;
      gsap.to(frame, {
        rotateX: (0.5 - y) * 18,
        rotateY: (x - 0.5) * 18,
        duration: 0.8,
        ease: "power3.out",
        transformPerspective: 1800,
        transformOrigin: "center center",
      });
      gsap.to(reflection, {
        x: (x - 0.5) * 80,
        y: (y - 0.5) * 60,
        duration: 1,
        ease: "power3.out",
      });
    };

    const onLeave = () => {
      gsap.to(frame, { rotateX: 0, rotateY: 0, duration: 1, ease: "power3.out" });
      gsap.to(reflection, { x: 0, y: 0, duration: 1, ease: "power3.out" });
    };

    wrapper.addEventListener("mousemove", onMove);
    wrapper.addEventListener("mouseleave", onLeave);

    // ── Auto-cycle ─────────────────────────────────────────────────────────
    const interval = setInterval(() => {
      const variant = transitionVariant.current;
      transitionVariant.current = (variant + 1) % 5;

      const overlay = overlayApi.current;
      if (!overlay) return;

      switch (variant) {

        // ─ 0: Electric discharge ─────────────────────────────────────────
        // Frame jitters erratically in X+Y with RGB arc filter while the
        // overlay pulses electric colour arcs, then both hit a white surge
        // at the same moment — frame swap is hidden inside the white flash.
        case 0: {
          const jitter = gsap.timeline();
          const steps: [number, number, string][] = [
            [-9, -5, "brightness(2.6) saturate(0) contrast(4)"],
            [13,  7, "hue-rotate(90deg)  saturate(8) brightness(2)"],
            [-16, 3, "brightness(3.2) saturate(0) contrast(5)"],
            [10, -9, "hue-rotate(200deg) saturate(8) brightness(1.8)"],
            [-7,  6, "brightness(2.8) saturate(0) contrast(4.5)"],
            [15, -4, "hue-rotate(300deg) saturate(8) brightness(2.2)"],
            [-11, 8, "brightness(4)   saturate(0) contrast(6)"],
            [5,  -7, "hue-rotate(160deg) saturate(8) brightness(2)"],
            [0,   0, "brightness(10)  saturate(0)"],
          ];
          steps.forEach(([x, y, filter]) => {
            jitter.to(frame, { x, y, filter, duration: 0.038, ease: "none" });
          });
          // peak white-out — holds briefly so overlay can sync
          jitter.to(frame, { x: 0, y: 0, opacity: 0, filter: "none", duration: 0.07, ease: "power2.in" });

          overlay.play(0, () => {
            advance(() => {
              gsap.set(frame, { x: 0, y: 0, filter: "none" });
              gsap.fromTo(frame,
                { opacity: 0, filter: "brightness(3) saturate(0)" },
                { opacity: 1, filter: "none", duration: 0.55, ease: "power2.out" }
              );
            });
          });
          break;
        }

        // ─ 1: Portal iris ─────────────────────────────────────────────────
        // Frame gently compresses/desaturates as the dark iris closes over it.
        // After the swap, iris opens and frame springs back.
        case 1: {
          gsap.to(frame, {
            scale: 0.96,
            filter: "saturate(0.3) brightness(0.6)",
            duration: 0.48,
            ease: "power2.inOut",
          });

          overlay.play(1, () => {
            advance(() => {
              gsap.set(frame, { scale: 1, filter: "none", opacity: 1 });
              gsap.fromTo(frame,
                { scale: 0.96 },
                { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.7)" }
              );
            });
          });
          break;
        }

        // ─ 2: VHS scanline wipe ───────────────────────────────────────────
        // Frame slides slightly in the direction the curtain drops, snaps
        // back cleanly as the curtain lifts away.
        case 2: {
          gsap.to(frame, { y: 6, opacity: 0.6, duration: 0.36, ease: "power2.in" });

          overlay.play(2, () => {
            advance(() => {
              gsap.set(frame, { y: -8, opacity: 0 });
              gsap.to(frame, { y: 0, opacity: 1, duration: 0.42, ease: "power3.out" });
            });
          });
          break;
        }

        // ─ 3: Neon flicker ────────────────────────────────────────────────
        // Frame flickers in sync with the overlay strobe, then cuts to black.
        // New content flickers on.
        case 3: {
          const flicker = gsap.timeline();
          [0.4, 1, 0.15, 0.85, 0.05, 0.7, 0.02, 0].forEach((op) => {
            flicker.to(frame, { opacity: op, duration: 0.028, ease: "none" });
          });

          overlay.play(3, () => {
            advance(() => {
              gsap.set(frame, { opacity: 0 });
              const revive = gsap.timeline();
              [0, 0.6, 0.1, 0.9, 0.25, 1].forEach((op) => {
                revive.to(frame, { opacity: op, duration: 0.032, ease: "none" });
              });
            });
          });
          break;
        }

        // ─ 4: Shockwave burst ─────────────────────────────────────────────
        // Frame pulses outward (scale) as if physically struck by the wave,
        // snaps back as the ring passes through.
        case 4: {
          gsap.timeline()
            .to(frame, { scale: 1.025, duration: 0.14, ease: "power2.out" })
            .to(frame, { scale: 1.0,   duration: 0.18, ease: "power3.in"  });

          overlay.play(4, () => {
            advance(() => {
              gsap.fromTo(frame,
                { opacity: 0, scale: 0.97 },
                { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }
              );
            });
          });
          break;
        }
      }
    }, 6000);

    return () => {
      wrapper.removeEventListener("mousemove", onMove);
      wrapper.removeEventListener("mouseleave", onLeave);
      clearInterval(interval);
    };
  }, []);

  const project = projects[index];

  return (
    <motion.div
      ref={wrapperRef}
      className={`${styles.showcase} cursor-target`}
      style={{ "--accent": project.accent, "--glow": project.glow } as React.CSSProperties}
      initial={{ opacity: 0, y: 50, scale: 0.93 }}
      animate={loaded ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.93 }}
      transition={{ duration: 1.1, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <ShowcaseFrame
        ref={frameRef}
        url={project.url}
        overlay={<TransitionOverlay ref={overlayApi} />}
      >
        <BrowserContent image={project.image} title={project.title} />
      </ShowcaseFrame>

      <Reflection ref={reflectionRef} />
    </motion.div>
  );
}
