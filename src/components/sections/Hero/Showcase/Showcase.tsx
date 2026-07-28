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
type OverlayApi = { play: (variant: number, cb: () => void) => void };

export default function Showcase({ onIndexChange }: { onIndexChange?: (i: number) => void }) {
  const loaded = useLoaded();

  const wrapperRef    = useRef<HTMLDivElement>(null);
  const frameRef      = useRef<HTMLDivElement>(null);
  const reflectionRef = useRef<HTMLDivElement>(null);
  const overlayApi    = useRef<OverlayApi>(null);

  const transitionVariant = useRef(0);

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

    // ── 3D tilt + cursor rim lighting ─────────────────────────────────────
    const onMove = (e: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top)  / rect.height;

      // 3D perspective tilt
      gsap.to(frame, {
        rotateX: (0.5 - y) * 18,
        rotateY: (x - 0.5) * 18,
        duration: 0.8,
        ease: "power3.out",
        transformPerspective: 1800,
        transformOrigin: "center center",
      });

      // Reflection parallax
      gsap.to(reflection, {
        x: (x - 0.5) * 80,
        y: (y - 0.5) * 60,
        duration: 1,
        ease: "power3.out",
      });

      // ── Rim lighting: CSS custom properties drive the rimLight div ──────
      // --lx / --ly are normalised -1 to +1 from cursor position in frame.
      // When cursor is right of centre, --lx = +1 → right edge brightens.
      const lx = ((x - 0.5) * 2).toFixed(3);
      const ly = ((y - 0.5) * 2).toFixed(3);
      frame.style.setProperty("--lx", lx);
      frame.style.setProperty("--ly", ly);
    };

    const onLeave = () => {
      gsap.to(frame, { rotateX: 0, rotateY: 0, duration: 1.2, ease: "power3.out" });
      gsap.to(reflection, { x: 0, y: 0, duration: 1.2, ease: "power3.out" });
      // Smoothly return rim light to centre
      gsap.to(frame, {
        "--lx": "0",
        "--ly": "0",
        duration: 1.2,
        ease: "power3.out",
      } as gsap.TweenVars);
    };

    wrapper.addEventListener("mousemove",  onMove);
    wrapper.addEventListener("mouseleave", onLeave);

    // ── Auto-cycle through projects with cinematic transitions ─────────────
    const interval = setInterval(() => {
      const variant = transitionVariant.current;
      transitionVariant.current = (variant + 1) % 5;

      const overlay = overlayApi.current;
      if (!overlay) return;

      switch (variant) {

        // 0: Electric discharge
        case 0: {
          const jitter = gsap.timeline();
          const steps: [number, number, string][] = [
            [-9, -5, "brightness(2.6) saturate(0) contrast(4)"],
            [13,  7, "hue-rotate(90deg)  saturate(8) brightness(2)"],
            [-16, 3, "brightness(3.2) saturate(0) contrast(5)"],
            [11, -8, "hue-rotate(180deg) saturate(6) brightness(2.4)"],
            [-7,  5, "brightness(4) saturate(0) contrast(6)"],
          ];
          steps.forEach(([x, y, filter], i) => {
            jitter.to(frame, { x, y, filter, duration: 0.06, ease: "none" }, i * 0.06);
          });
          jitter.to(frame, { x: 0, y: 0, filter: "none", duration: 0.12 });

          overlay.play(0, () => {
            advance(() => {
              gsap.fromTo(frame,
                { opacity: 0, scale: 0.96, filter: "brightness(2) saturate(0)" },
                { opacity: 1, scale: 1, filter: "brightness(1) saturate(1)", duration: 0.55, ease: "power3.out" }
              );
            });
          });
          break;
        }

        // 1: Portal iris
        case 1: {
          gsap.timeline()
            .to(frame, { scale: 0.96, duration: 0.35, ease: "power2.inOut" })
            .to(frame, { scale: 1.0,  duration: 0.45, ease: "back.out(1.4)" });

          overlay.play(1, () => {
            advance(() => {
              gsap.fromTo(frame,
                { opacity: 0, scale: 1.04 },
                { opacity: 1, scale: 1, duration: 0.55, ease: "power3.out" }
              );
            });
          });
          break;
        }

        // 2: VHS scanline wipe
        case 2: {
          gsap.timeline()
            .to(frame, { y: -4, duration: 0.22, ease: "power2.out" })
            .to(frame, { y:  0, duration: 0.28, ease: "power3.in" });

          overlay.play(2, () => {
            advance(() => {
              gsap.fromTo(frame,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
              );
            });
          });
          break;
        }

        // 3: Neon flicker
        case 3: {
          const flicker = gsap.timeline();
          [0, 0.06, 0.12, 0.18, 0.26].forEach((t, i) => {
            flicker.to(frame,
              { opacity: i % 2 === 0 ? 0.15 : 1, duration: 0.04, ease: "none" },
              t
            );
          });
          flicker.to(frame, { opacity: 1, duration: 0.08 });

          overlay.play(3, () => {
            advance(() => {
              gsap.fromTo(frame,
                { opacity: 0, filter: "saturate(3) brightness(2)" },
                { opacity: 1, filter: "saturate(1) brightness(1)", duration: 0.55, ease: "power3.out" }
              );
            });
          });
          break;
        }

        // 4: Shockwave burst
        case 4: {
          gsap.timeline()
            .to(frame, { scale: 1.028, duration: 0.14, ease: "power2.out" })
            .to(frame, { scale: 1.0,   duration: 0.20, ease: "power3.in"  });

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
      wrapper.removeEventListener("mousemove",  onMove);
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
