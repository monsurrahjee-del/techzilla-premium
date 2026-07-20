"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Hero.module.css";

import HeroNav      from "./HeroNav";
import HeroIntro    from "./HeroIntro";
import HeroHeadline from "./HeroHeadline";
import HeroButtons  from "./HeroButtons";
import HeroMeta     from "./HeroMeta";
import HeroScript   from "./HeroScript";
import StickerCloud from "./StickerCloud";
import Showcase     from "./Showcase";
import FloatingElements from "./FloatingElements";
import MeshGradient from "./MeshGradient";
import HeroLight    from "./HeroLight";
import WaterRipple  from "./WaterRipple";

import { gsap }        from "@/lib/gsap";
import { useParallax } from "@/hooks/useParallax";
import { useClickSound } from "@/hooks/useClickSound";

export default function Hero() {
  const heroRef     = useRef<HTMLElement>(null);
  const contentRef  = useRef<HTMLDivElement>(null);
  const headingRef  = useRef<HTMLDivElement>(null);

  const [showcaseIndex, setShowcaseIndex] = useState(0);

  // ── Theme A (dark) = CSS "build" text | Theme B (light) = 3-D glass canvas
  const [theme, setTheme] = useState<"dark" | "light">("light");
  // ── Sound toggle — click anywhere plays a short UI tone when on
  const [sound, setSound] = useState(false);

  useClickSound(sound);
  useParallax(headingRef, 5);

  useEffect(() => {
    if (!heroRef.current || !contentRef.current) return;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "+=100%",
        scrub: 1.4,
      },
    });
    tl.to(contentRef.current, { y: -50, ease: "none" });
    return () => { tl.scrollTrigger?.kill(); tl.kill(); };
  }, []);

  return (
    <section ref={heroRef} className={styles.hero}>
      {/* ── backgrounds ── */}
      <MeshGradient />
      <div className={styles.grid} />
      <HeroLight />
      <WaterRipple />

      {/* ── top nav ── */}
      <HeroNav
        theme={theme}
        sound={sound}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onSoundToggle={() => setSound((s) => !s)}
      />

      {/* ── decorative layers ── */}
      <StickerCloud />
      <HeroScript theme={theme} />

      {/* ── main two-column content ── */}
      <div ref={contentRef} className={styles.heroContent}>

        {/* LEFT — tagline + headline + CTA (CTA hidden on mobile via desktopOnly) */}
        <div ref={headingRef} className={styles.heroLeft}>
          <p className={styles.heroTagline}>
            Code with craft.<br />Ship with intention.
          </p>
          <HeroHeadline />
          {/* Desktop buttons — hidden on mobile */}
          <div className={styles.desktopOnly}>
            <HeroButtons />
          </div>
        </div>

        {/* RIGHT — showcase → bio → buttons (mobile order via CSS order property) */}
        <div className={styles.heroRight}>
          <HeroIntro />
          <div className={styles.showcaseWrap}>
            <Showcase onIndexChange={setShowcaseIndex} />
          </div>
          {/* Mobile-only buttons — appear after bio on mobile */}
          <div className={styles.mobileOnly}>
            <HeroButtons />
          </div>
        </div>

      </div>

      <FloatingElements />
      <HeroMeta projectIndex={showcaseIndex} />
    </section>
  );
}
