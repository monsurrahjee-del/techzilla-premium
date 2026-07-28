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
  const heroRef         = useRef<HTMLElement>(null);
  const contentRef      = useRef<HTMLDivElement>(null);
  const headingRef      = useRef<HTMLDivElement>(null);
  const showcaseWrapRef = useRef<HTMLDivElement>(null);
  const stickerLayerRef = useRef<HTMLDivElement>(null);

  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [sound, setSound] = useState(false);

  useClickSound(sound);
  useParallax(headingRef, 5);

  // Broadcast theme changes so HeroSplash can pause its WebGL fluid sim
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("hero-theme-change", { detail: { theme } })
    );
  }, [theme]);

  // ── Parallax content drift on scroll ──────────────────────────────────────
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

  // ── Scroll storytelling: browser + stickers animate out as hero exits ──────
  useEffect(() => {
    const wrap    = showcaseWrapRef.current;
    const hero    = heroRef.current;
    const stickers = stickerLayerRef.current;
    if (!wrap || !hero) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: "55% top",
        end: "bottom top",
        scrub: 1.8,
      },
    });

    // Browser rises, shrinks, tilts and fades → blends into next section
    tl.to(wrap, {
      y:       -80,
      scale:   0.88,
      rotateX:  6,
      opacity:  0,
      ease:    "power2.inOut",
    }, 0);

    // Stickers scatter/fade on exit
    if (stickers) {
      tl.to(stickers, {
        scale:   1.10,
        opacity: 0,
        ease:    "power3.in",
      }, 0);
    }

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

      {/* ── sticker decorative layer (ref for scroll exit animation) ── */}
      <div ref={stickerLayerRef} className={styles.stickerLayer}>
        <StickerCloud />
      </div>
      <HeroScript theme={theme} />

      {/* ── main two-column content ── */}
      <div ref={contentRef} className={styles.heroContent}>

        {/* LEFT — tagline + headline + CTA */}
        <div ref={headingRef} className={styles.heroLeft}>
          <p className={styles.heroTagline}>
            Code with craft.<br />Ship with intention.
          </p>
          <HeroHeadline />
          <div className={styles.desktopOnly}>
            <HeroButtons />
          </div>
        </div>

        {/* RIGHT — showcase → bio → buttons */}
        <div className={styles.heroRight}>
          <HeroIntro />
          <div ref={showcaseWrapRef} className={`${styles.showcaseWrap} ${styles.showcaseExit}`}>
            <Showcase onIndexChange={setShowcaseIndex} />
          </div>
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
