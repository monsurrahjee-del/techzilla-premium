"use client";

import { useEffect, useRef } from "react";

import styles from "./Hero.module.css";

import HeroBackground from "./HeroBackground";
import HeroContent from "./HeroContent";
import HeroHeadline from "./HeroHeadline";
import HeroButtons from "./HeroButtons";
import FloatingElements from "./FloatingElements";
import Showcase from "./Showcase";
import StickerCloud from "./StickerCloud";
import HeroLight from "./HeroLight";
import MeshGradient from "./MeshGradient";
import { gsap } from "@/lib/gsap";

import Parallax from "@/components/ui/Parallax";
import { useParallax } from "@/hooks/useParallax";

export default function Hero() {
  const headingRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
const contentRef = useRef<HTMLDivElement>(null);
const showcaseRef = useRef<HTMLDivElement>(null);

  useParallax(headingRef, 8);
  useEffect(() => {
  if (
    !heroRef.current ||
    !contentRef.current ||
    !showcaseRef.current
  ) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: heroRef.current,
      start: "top top",
      end: "+=120%",
      scrub: 1.2,
      pin: false,
    },
  });

  tl.to(contentRef.current, {
    scale: 0.9,
    y: -80,
    opacity: 0.7,
    ease: "none",
  });

  tl.to(
    showcaseRef.current,
    {
      y: -140,
      scale: 0.92,
      rotateX: 6,
      ease: "none",
    },
    0
  );

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}, []);

  return (
    <section
  ref={heroRef}
  className={styles.hero}
>
        <MeshGradient />
      <HeroBackground />
      <HeroLight />

      
      <StickerCloud />

  
      <FloatingElements />

      <Parallax strength={5}>
        <div ref={contentRef}>
        <HeroContent>
          <div ref={headingRef}>
            <p className={styles.tag}>
              TECHZILLA INC.
            </p>

            <HeroHeadline />
          </div>
<div ref={showcaseRef}>
          <Showcase />
          </div>

          <HeroButtons />
        </HeroContent>
        </div>
      </Parallax>
    </section>
  );
}