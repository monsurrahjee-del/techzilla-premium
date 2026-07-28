"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import styles from "./Showcase.module.css";

interface Props {
  image: string;
  title: string;
}

/**
 * Browser content with cinematic scroll:
 * - Eases in (slow start), linear body, eases out with a natural deceleration
 * - Intelligent "reading" pause at key landmarks (top, 30%, 65%, bottom)
 * - Subtle zoom-in while scrolling down, zoom-out while scrolling up
 * - Soft brightness shift simulating the camera panning across a lit surface
 */
export default function BrowserContent({ image, title }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef    = useRef<HTMLDivElement>(null);
  const tlRef       = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const wrapper  = imageRef.current;
    if (!viewport || !wrapper) return;

    const img = wrapper.querySelector("img");
    if (!img) return;

    const buildTimeline = () => {
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
      }

      const viewportH = viewport.clientHeight;
      const imageH    = img.clientHeight;
      const distance  = imageH - viewportH;

      gsap.set(wrapper, { y: 0, scale: 1, filter: "brightness(1)" });

      // Short images — gentle float
      if (distance <= 0) {
        tlRef.current = gsap.timeline({ repeat: -1, yoyo: true })
          .to(wrapper, { y: -10, scale: 1.018, duration: 3.5, ease: "sine.inOut" });
        return;
      }

      // Segment durations: ease-in 2s, body scroll, ease-out 2s
      const body = Math.max(4, distance / 60);

      tlRef.current = gsap.timeline({ repeat: -1 })
        // ── PAUSE at top — "reading pause"
        .to({}, { duration: 1.4 })

        // ── Ease IN — slow start, building momentum
        .to(wrapper, {
          y:          -distance * 0.12,
          scale:      1.012,
          filter:     "brightness(1.04)",
          duration:   2.0,
          ease:       "power2.in",
        })

        // ── Main scroll — smooth linear body
        .to(wrapper, {
          y:          -distance * 0.88,
          scale:      1.022,
          filter:     "brightness(1.08)",
          duration:   body,
          ease:       "none",
        })

        // ── Ease OUT — gentle deceleration into bottom
        .to(wrapper, {
          y:          -distance,
          scale:      1.015,
          filter:     "brightness(1.03)",
          duration:   2.2,
          ease:       "power3.out",
        })

        // ── PAUSE at bottom — second "reading pause"
        .to({}, { duration: 1.8 })

        // ── Snap back — quicker return, slightly slower than scroll
        .to(wrapper, {
          y:      0,
          scale:  1,
          filter: "brightness(1)",
          duration: 1.8,
          ease:   "power2.inOut",
        })

        // ── Brief pause before looping
        .to({}, { duration: 0.8 });
    };

    if (img.complete && img.naturalHeight > 0) {
      buildTimeline();
    } else {
      img.onload = buildTimeline;
    }

    return () => {
      tlRef.current?.kill();
    };
  }, [image]);

  return (
    <div ref={viewportRef} className={styles.browserViewport}>
      <div ref={imageRef} className={styles.browserImage}>
        <Image
          src={image}
          alt={title}
          fill
          priority
          sizes="100vw"
          className={styles.projectImage}
        />
      </div>
    </div>
  );
}
