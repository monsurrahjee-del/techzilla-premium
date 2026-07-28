"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import styles from "./Showcase.module.css";

interface Props {
  image: string;
  title: string;
  /** Per-project scroll speed multiplier */
  scrollMult?: number;
  /** Per-project top-pause duration in seconds */
  pauseTop?: number;
}

/**
 * Browser content with cinematic, per-project personality:
 *  • Each project has a unique scroll speed (scrollMult)
 *  • Unique reading pause at the top (pauseTop)
 *  • Eases in (slow start), linear body, eases out naturally
 *  • Subtle zoom-in while scrolling down, zoom-out while scrolling up
 *  • Soft brightness shift simulating a camera panning across a lit surface
 */
export default function BrowserContent({ image, title, scrollMult = 1, pauseTop = 1.4 }: Props) {
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
      if (tlRef.current) { tlRef.current.kill(); tlRef.current = null; }

      const viewportH = viewport.clientHeight;
      const imageH    = img.clientHeight;
      const distance  = imageH - viewportH;

      gsap.set(wrapper, { y: 0, scale: 1, filter: "brightness(1)" });

      if (distance <= 0) {
        tlRef.current = gsap.timeline({ repeat: -1, yoyo: true })
          .to(wrapper, {
            y: -12 * scrollMult,
            scale: 1.02,
            duration: 3.2 / scrollMult,
            ease: "sine.inOut",
          });
        return;
      }

      const bodyDuration = Math.max(3.5, (distance / 60)) / scrollMult;

      tlRef.current = gsap.timeline({ repeat: -1 })
        .to({}, { duration: pauseTop })

        .to(wrapper, {
          y:          -distance * 0.12,
          scale:      1.014,
          filter:     "brightness(1.04)",
          duration:   2.0 / scrollMult,
          ease:       "power2.in",
        })

        .to(wrapper, {
          y:          -distance * 0.88,
          scale:      1.024,
          filter:     "brightness(1.08)",
          duration:   bodyDuration,
          ease:       "none",
        })

        .to(wrapper, {
          y:          -distance,
          scale:      1.016,
          filter:     "brightness(1.04)",
          duration:   2.2 / scrollMult,
          ease:       "power3.out",
        })

        .to({}, { duration: 1.6 })

        .to(wrapper, {
          y:      0,
          scale:  1,
          filter: "brightness(1)",
          duration: 1.8,
          ease:   "power2.inOut",
        })

        .to({}, { duration: 0.6 });
    };

    if (img.complete && img.naturalHeight > 0) {
      buildTimeline();
    } else {
      img.onload = buildTimeline;
    }

    return () => { tlRef.current?.kill(); };
  }, [image, scrollMult, pauseTop]);

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
