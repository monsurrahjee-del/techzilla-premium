"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import Hero      from "@/components/sections/Hero";
import About     from "@/components/sections/About/About";
import Services  from "@/components/sections/Services/Services";
import Portfolio from "@/components/sections/Portfolio/Portfolio";
import VaporizeTextCycle, { Tag } from "@/components/ui/VaporizeTextCycle";
import styles    from "./page.module.css";

export default function Home() {
  const heroRef      = useRef<HTMLDivElement>(null);
  const aboutRef     = useRef<HTMLDivElement>(null);
  const servicesRef  = useRef<HTMLDivElement>(null);
  const portfolioRef = useRef<HTMLDivElement>(null);

  const aboutActiveRef      = useRef(false);
  const heroActiveRef       = useRef(true);
  const servicesPrimaryRef  = useRef(false);
  const portfolioActiveRef  = useRef(false);
  const [aboutActive,      setAboutActive]      = useState(false);
  const [portfolioActive,  setPortfolioActive]  = useState(false);
  const [vaporRevealed,    setVaporRevealed]    = useState(false);
  const [vaporFading,      setVaporFading]      = useState(false);
  const [vaporDone,        setVaporDone]        = useState(false);

  const frozenScrollRef = useRef(0);
  const vaporActiveRef  = useRef(false);

  /* Font size for the vapor overlay */
  const [vaporFontSize, setVaporFontSize] = useState("240px");
  useEffect(() => {
    const calc = () => {
      const byWidth  = Math.floor((window.innerWidth  * 0.8) / (8 * 0.52));
      const byHeight = Math.floor(window.innerHeight  * 0.38);
      setVaporFontSize(`${Math.min(byWidth, byHeight, 380)}px`);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  /* Scroll-driven state logic
     Visual transforms are handled by CSS scroll-driven animations on
     Chrome/Edge/Firefox (scroll(root block) — compositor-threaded, true 1:1).
     JS here only manages state flags: WebGL activation, vapor trigger, etc.
     Safari fallback: the JS assignments below also set the transforms.

     Scrollable range: 300vh (400vh total − 100vh viewport).
       0%   → 33.33%  =   0 → 100vh  (about slides in from right, hero fades)
      33.33% → 66.66%  = 100 → 200vh  (services scales in)
      66.66% → 100%    = 200 → 300vh  (portfolio slides in from left)           */
  useEffect(() => {
    const hero      = heroRef.current;
    const about     = aboutRef.current;
    const services  = servicesRef.current;
    const portfolio = portfolioRef.current;
    if (!hero || !about || !services || !portfolio) return;

    let vaporTriggered = false;
    let isInitialEval  = true; // skip vapor trigger on browser scroll-restore at mount

    const supportsScrollDriven =
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline", "scroll()");

    const driveFrame = (raw: number) => {
      /* ── Safari fallback: JS transforms ──────────────────────────────────── */
      if (!supportsScrollDriven) {
        const p1 = Math.min(1, Math.max(0, raw / (1 / 3)));
        const p2 = Math.min(1, Math.max(0, (raw - 1 / 3) / (1 / 3)));
        const p3 = Math.min(1, Math.max(0, (raw - 2 / 3) / (1 / 3)));
        about.style.transform     = `translateX(${((1 - p1) * 100).toFixed(3)}%)`;
        hero.style.opacity        = (1 - p1 * 0.78).toFixed(4);
        services.style.transform  = `scale(${(0.06 + p2 * 0.94).toFixed(4)})`;
        services.style.opacity    = p2.toFixed(4);
        services.style.filter     = `blur(${((1 - p2) * 18).toFixed(2)}px)`;
        portfolio.style.transform = `translateX(${((1 - p3) * -100).toFixed(3)}%)`;
      }

      /* ── Hero / SplashCursor ──────────────────────────────────────────────── */
      // Hero was active at raw < 0.35 in old 200vh range → 0.35*200/300 = 0.233
      const heroNowActive = raw < 0.233;
      if (heroNowActive !== heroActiveRef.current) {
        heroActiveRef.current = heroNowActive;
        window.dispatchEvent(
          new CustomEvent("hero-section-active", { detail: { heroActive: heroNowActive } })
        );
      }

      /* ── LiquidEther (About WebGL) ───────────────────────────────────────── */
      // Was 0.35–0.65 in 200vh → 0.233–0.433 in 300vh
      const aboutNowActive = raw >= 0.233 && raw < 0.433;
      if (aboutNowActive !== aboutActiveRef.current) {
        aboutActiveRef.current = aboutNowActive;
        startTransition(() => setAboutActive(aboutNowActive));
      }

      /* ── ServiceThreeHeading (Three.js) ─────────────────────────────────── */
      // Was >= 0.65 in 200vh → 0.433 in 300vh; and stop at portfolio entry
      const servicesNowPrimary = raw >= 0.433 && raw < 0.75;
      if (servicesNowPrimary !== servicesPrimaryRef.current) {
        servicesPrimaryRef.current = servicesNowPrimary;
        window.dispatchEvent(
          new CustomEvent("services-section-active", { detail: { active: servicesNowPrimary } })
        );
      }

      /* ── Portfolio Three.js ──────────────────────────────────────────────── */
      const portfolioNowActive = raw >= 0.80;
      if (portfolioNowActive !== portfolioActiveRef.current) {
        portfolioActiveRef.current = portfolioNowActive;
        startTransition(() => setPortfolioActive(portfolioNowActive));
      }

      /* ── Vapor trigger ───────────────────────────────────────────────────── */
      // Skip on the initial load evaluation so that a page reload from the bottom
      // of the page (e.g. from the work section) does not re-play the vapor.
      // Always mark triggered when raw>=0.99 — even on initial load — so
      // scrolling back from Our Work then forward again never re-fires the overlay.
      if (raw >= 0.99) {
        vaporTriggered = true;
        if (!isInitialEval) {
          frozenScrollRef.current = window.scrollY;
          vaporActiveRef.current  = true;
          window.dispatchEvent(new CustomEvent("services-section-active", { detail: { active: false } }));
          startTransition(() => setVaporRevealed(true));
        }
      }
    };

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (!max) return;

      // Block backward scroll while vapour is animating
      if (vaporActiveRef.current && window.scrollY < frozenScrollRef.current - 1) {
        window.scrollTo(0, frozenScrollRef.current);
        return;
      }

      driveFrame(window.scrollY / max);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // Evaluate on load (e.g. browser scroll restore after refresh).
    // isInitialEval stays true during this call so vapor is not re-triggered.
    const initMax = document.documentElement.scrollHeight - window.innerHeight;
    driveFrame(initMax > 0 ? window.scrollY / initMax : 0);
    isInitialEval = false; // allow vapor to trigger on subsequent user scrolls

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Block ALL wheel/touch scroll during vapour (both directions) */
  useEffect(() => {
    if (!vaporRevealed || vaporDone) return;

    const blockUpWheel = (e: WheelEvent) => {
      // Block every scroll direction — vapor must play to completion
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
    };
    const blockUpTouch = (e: TouchEvent) => {
      const dy = (e.touches[0]?.clientY ?? 0) - touchStartY;
      if (dy > 0) {
        e.preventDefault();
        window.scrollTo(0, frozenScrollRef.current);
      }
    };

    window.addEventListener("wheel",      blockUpWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  blockUpTouch, { passive: false });

    return () => {
      window.removeEventListener("wheel",      blockUpWheel, { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  blockUpTouch);
    };
  }, [vaporRevealed, vaporDone]);

  /* Vapor cycle complete */
  const handleVaporComplete = () => {
    vaporActiveRef.current = false;
    setVaporDone(true);
    window.dispatchEvent(new CustomEvent("services-section-active", { detail: { active: true } }));
    setVaporFading(true);
    setTimeout(() => {
      setVaporRevealed(false);
      setVaporFading(false);
    }, 650);
  };

  return (
    <main className={styles.main}>
      <div className={styles.stickyPane}>
        <div ref={heroRef} className={styles.heroLayer}>
          <Hero />
        </div>
        <div ref={aboutRef} className={styles.aboutLayer}>
          <About active={aboutActive} />
        </div>
        <div ref={servicesRef} className={styles.servicesLayer}>
          <Services active={vaporDone} />
        </div>
        <div ref={portfolioRef} className={styles.portfolioLayer}>
          <Portfolio active={portfolioActive} />
        </div>
      </div>

      {vaporRevealed && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            opacity: vaporFading ? 0 : 1,
            transition: "opacity 0.6s ease",
            filter: "brightness(2.6) drop-shadow(0 0 12px rgba(255,255,255,1)) drop-shadow(0 0 50px rgba(255,255,255,0.85)) drop-shadow(0 0 100px rgba(255,255,255,0.6))",
          }}
        >
          <VaporizeTextCycle
            texts={["The", "Services", "We", "Provide"]}
            font={{
              fontFamily: "Geist, system-ui, sans-serif",
              fontSize: vaporFontSize,
              fontWeight: 900,
            }}
            color="rgb(255, 255, 255)"
            spread={4}
            density={2}
            animation={{ vaporizeDuration: 1.0, fadeInDuration: 0.5, waitDuration: 0.3 }}
            direction="left-to-right"
            alignment="center"
            tag={Tag.H1}
            forceActive={true}
            onComplete={handleVaporComplete}
          />
        </div>
      )}
    </main>
  );
}
