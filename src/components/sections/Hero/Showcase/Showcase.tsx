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

    // Per-project tilt range — pulled from project data
    const getProject = () => projects[index];

    const onMove = (e: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top)  / rect.height;
      const proj = getProject();
      const tiltMax = proj.tiltMax ?? 18;

      // 3D perspective tilt — intensity varies per project
      gsap.to(frame, {
        rotateX: (0.5 - y) * tiltMax,
        rotateY: (x - 0.5) * tiltMax,
        duration: 0.75,
        ease: "power3.out",
        transformPerspective: 1800,
        transformOrigin: "center center",
      });

      // Reflection parallax
      gsap.to(reflection, {
        x: (x - 0.5) * 88,
        y: (y - 0.5) * 66,
        duration: 1,
        ease: "power3.out",
      });

      // Rim lighting: CSS custom properties
      const lx = ((x - 0.5) * 2).toFixed(3);
      const ly = ((y - 0.5) * 2).toFixed(3);
      frame.style.setProperty("--lx", lx);
      frame.style.setProperty("--ly", ly);
    };

    const onLeave = () => {
      gsap.to(frame, {
        rotateX: 0, rotateY: 0,
        duration: 1.4, ease: "power3.out",
      });
      gsap.to(reflection, { x: 0, y: 0, duration: 1.4, ease: "power3.out" });
      gsap.to(frame, {
        "--lx": "0", "--ly": "0",
        duration: 1.4, ease: "power3.out",
      } as gsap.TweenVars);
    };

    wrapper.addEventListener("mousemove",  onMove);
    wrapper.addEventListener("mouseleave", onLeave);

    const interval = setInterval(() => {
      const variant = transitionVariant.current;
      transitionVariant.current = (variant + 1) % 5;
      const overlay = overlayApi.current;
      if (!overlay) return;

      const nextProject = projects[(index + 1) % projects.length];
      const enterEase   = nextProject.enterEase ?? "power3.out";

      switch (variant) {
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
                { opacity: 1, scale: 1, filter: "brightness(1) saturate(1)", duration: 0.55, ease: enterEase }
              );
            });
          });
          break;
        }
        case 1: {
          gsap.timeline()
            .to(frame, { scale: 0.96, duration: 0.35, ease: "power2.inOut" })
            .to(frame, { scale: 1.0,  duration: 0.45, ease: "back.out(1.4)" });
          overlay.play(1, () => {
            advance(() => {
              gsap.fromTo(frame,
                { opacity: 0, scale: 1.04 },
                { opacity: 1, scale: 1, duration: 0.55, ease: enterEase }
              );
            });
          });
          break;
        }
        case 2: {
          gsap.timeline()
            .to(frame, { y: -4, duration: 0.22, ease: "power2.out" })
            .to(frame, { y:  0, duration: 0.28, ease: "power3.in" });
          overlay.play(2, () => {
            advance(() => {
              gsap.fromTo(frame,
                { opacity: 0, y: 14 },
                { opacity: 1, y: 0, duration: 0.5, ease: enterEase }
              );
            });
          });
          break;
        }
        case 3: {
          const flicker = gsap.timeline();
          [0, 0.06, 0.12, 0.18, 0.26].forEach((t, i) => {
            flicker.to(frame,
              { opacity: i % 2 === 0 ? 0.15 : 1, duration: 0.04, ease: "none" }, t
            );
          });
          flicker.to(frame, { opacity: 1, duration: 0.08 });
          overlay.play(3, () => {
            advance(() => {
              gsap.fromTo(frame,
                { opacity: 0, filter: "saturate(3) brightness(2)" },
                { opacity: 1, filter: "saturate(1) brightness(1)", duration: 0.55, ease: enterEase }
              );
            });
          });
          break;
        }
        case 4: {
          gsap.timeline()
            .to(frame, { scale: 1.028, duration: 0.14, ease: "power2.out" })
            .to(frame, { scale: 1.0,   duration: 0.20, ease: "power3.in"  });
          overlay.play(4, () => {
            advance(() => {
              gsap.fromTo(frame,
                { opacity: 0, scale: 0.97, rotateY: 4 },
                { opacity: 1, scale: 1,    rotateY: 0, duration: 0.55, ease: enterEase }
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
  }, [index]);

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
        glassTint={project.glassTint}
        overlay={<TransitionOverlay ref={overlayApi} />}
      >
        <BrowserContent
          image={project.image}
          title={project.title}
          scrollMult={project.scrollMult}
          pauseTop={project.pauseTop}
        />
      </ShowcaseFrame>

      <Reflection ref={reflectionRef} />
    </motion.div>
  );
}
