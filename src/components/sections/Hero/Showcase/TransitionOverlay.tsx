"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap } from "@/lib/gsap";
import styles from "./Showcase.module.css";

type OverlayApi = { play: (variant: number, cb: () => void) => void };

const TransitionOverlay = forwardRef<OverlayApi>((_, ref) => {
  const elRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    play(variant: number, onMidpoint: () => void) {
      const el = elRef.current;
      if (!el) { onMidpoint(); return; }

      // Kill any previous animation on this element
      gsap.killTweensOf(el);

      switch (variant) {

        // ─── 0  ELECTRIC DISCHARGE ────────────────────────────────────────────
        // Rapid arc flicker: electric blue → purple → cyan → white surge.
        // Coordinates with the frame jitter happening in Showcase.tsx.
        case 0: {
          gsap.set(el, {
            opacity: 0,
            backgroundColor: "rgba(40,180,255,0.9)",
            filter: "blur(0px)",
            borderRadius: "32px",
            clipPath: "none",
            x: 0, y: 0, scale: 1,
          });
          gsap.timeline()
            // arc pulse 1 — electric blue
            .to(el, { opacity: 0.55, duration: 0.032, ease: "none" })
            .to(el, { opacity: 0.04, duration: 0.022, ease: "none" })
            // arc pulse 2 — electric purple
            .to(el, { opacity: 0.72, backgroundColor: "rgba(180,50,255,0.92)", duration: 0.032, ease: "none" })
            .to(el, { opacity: 0.06, duration: 0.022, ease: "none" })
            // arc pulse 3 — electric cyan
            .to(el, { opacity: 0.65, backgroundColor: "rgba(20,230,255,0.95)", duration: 0.038, ease: "none" })
            .to(el, { opacity: 0.08, duration: 0.022, ease: "none" })
            // arc pulse 4 — purple surge
            .to(el, { opacity: 0.85, backgroundColor: "rgba(160,40,255,0.96)", duration: 0.04, ease: "none" })
            .to(el, { opacity: 0.1, duration: 0.025, ease: "none" })
            // PEAK — white discharge burst (frame swap happens here)
            .to(el, {
              opacity: 1,
              backgroundColor: "rgba(255,255,255,0.97)",
              filter: "blur(6px)",
              duration: 0.085,
              ease: "power2.in",
            })
            .call(onMidpoint)
            // dissipate
            .to(el, { opacity: 0, filter: "blur(0px)", duration: 0.38, ease: "power3.out" });
          break;
        }

        // ─── 1  PORTAL IRIS ───────────────────────────────────────────────────
        // Dark iris closes from edges inward (clip-path circle shrinks to 0),
        // content swaps, then iris opens revealing new content.
        case 1: {
          gsap.set(el, {
            opacity: 1,
            backgroundColor: "rgba(4,6,30,0.98)",
            clipPath: "circle(150% at 50% 50%)",
            filter: "none",
            borderRadius: "0px",
            x: 0, y: 0, scale: 1,
          });
          gsap.timeline()
            .to(el, {
              clipPath: "circle(0% at 50% 50%)",
              duration: 0.52,
              ease: "power3.inOut",
            })
            .call(onMidpoint)
            .to(el, {
              clipPath: "circle(150% at 50% 50%)",
              duration: 0.52,
              ease: "power3.inOut",
            })
            .to(el, { opacity: 0, duration: 0.001 })
            .set(el, { borderRadius: "32px", clipPath: "none" });
          break;
        }

        // ─── 2  VHS SCANLINE WIPE ─────────────────────────────────────────────
        // A horizontal scanline curtain drops from the top edge,
        // fully covers the frame (swap), then pulls away downward.
        case 2: {
          gsap.set(el, {
            opacity: 1,
            background: [
              "repeating-linear-gradient(",
              "  180deg,",
              "  rgba(8,12,48,0.97) 0px,",
              "  rgba(8,12,48,0.97) 3px,",
              "  rgba(20,30,80,0.92) 3px,",
              "  rgba(20,30,80,0.92) 6px",
              ")",
            ].join(""),
            y: "-102%",
            borderRadius: "0px",
            clipPath: "none",
            filter: "none",
            x: 0, scale: 1,
          });
          gsap.timeline()
            .to(el, { y: "0%", duration: 0.38, ease: "power3.in" })
            .call(onMidpoint)
            .to(el, { y: "102%", duration: 0.42, ease: "power3.in",
              onComplete: () => gsap.set(el, { y: "0%", borderRadius: "32px", opacity: 0 }),
            });
          break;
        }

        // ─── 3  NEON FLICKER ──────────────────────────────────────────────────
        // Rapid cyan/magenta strobe like a dying neon tube, collapses to black,
        // swaps, new content flickers on from the dark.
        case 3: {
          gsap.set(el, {
            opacity: 0,
            backgroundColor: "rgba(0,240,200,0.88)",
            filter: "none",
            borderRadius: "32px",
            clipPath: "none",
            x: 0, y: 0, scale: 1,
          });
          gsap.timeline()
            .to(el, { opacity: 0.65, duration: 0.028, ease: "none" })
            .to(el, { opacity: 0.02, duration: 0.022, ease: "none" })
            .to(el, { opacity: 0.5,  backgroundColor: "rgba(220,50,255,0.88)", duration: 0.03, ease: "none" })
            .to(el, { opacity: 0.02, duration: 0.022, ease: "none" })
            .to(el, { opacity: 0.75, backgroundColor: "rgba(0,230,190,0.9)",   duration: 0.035, ease: "none" })
            .to(el, { opacity: 0.02, duration: 0.022, ease: "none" })
            .to(el, { opacity: 0.55, backgroundColor: "rgba(200,40,255,0.9)",  duration: 0.028, ease: "none" })
            .to(el, { opacity: 0.02, duration: 0.025, ease: "none" })
            // tube dies — blackout
            .to(el, { opacity: 1, backgroundColor: "rgba(2,3,14,0.99)", duration: 0.07, ease: "power2.in" })
            .call(onMidpoint)
            // fade out
            .to(el, { opacity: 0, duration: 0.42, ease: "power2.out" });
          break;
        }

        // ─── 4  SHOCKWAVE RADIAL BURST ────────────────────────────────────────
        // A radial ring (bright centre → transparent rim) explodes outward
        // from the middle of the frame, the swap happens at peak expansion.
        case 4: {
          gsap.set(el, {
            opacity: 0,
            background: "radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(80,200,255,0.55) 38%, transparent 68%)",
            scale: 0.05,
            borderRadius: "50%",
            clipPath: "none",
            filter: "none",
            x: 0, y: 0,
          });
          gsap.timeline()
            .to(el, { opacity: 1, scale: 0.35, duration: 0.08, ease: "power4.out" })
            .to(el, { scale: 1.1, opacity: 0.82, duration: 0.28, ease: "power2.out" })
            .call(onMidpoint)
            .to(el, { scale: 2.2, opacity: 0, duration: 0.32, ease: "power1.out",
              onComplete: () => gsap.set(el, { scale: 1, borderRadius: "32px", opacity: 0 }),
            });
          break;
        }

        default:
          onMidpoint();
      }
    },
  }));

  return <div ref={elRef} className={styles.transitionOverlay} />;
});

TransitionOverlay.displayName = "TransitionOverlay";
export default TransitionOverlay;
