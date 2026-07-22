"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import Hero          from "@/components/sections/Hero";
import About         from "@/components/sections/About/About";
import Services      from "@/components/sections/Services/Services";
import Portfolio     from "@/components/sections/Portfolio/Portfolio";
import ServicesIntro from "@/components/sections/ServicesIntro/ServicesIntro";
import type { ServicesIntroHandle } from "@/components/sections/ServicesIntro/ServicesIntro";
import styles        from "./page.module.css";

// Module-level flag — resets on every page reload, persists for the lifetime
// of this JS module (i.e. until the user reloads or navigates away).
// This is the sole gate: vapor plays once per page load, never twice.
let vaporPlayedThisLoad = false;

export default function Home() {
  const heroRef      = useRef<HTMLDivElement>(null);
  const aboutRef     = useRef<HTMLDivElement>(null);
  const servicesRef  = useRef<HTMLDivElement>(null);
  const portfolioRef = useRef<HTMLDivElement>(null);
  const introRef     = useRef<ServicesIntroHandle>(null);

  const aboutActiveRef      = useRef(false);
  const heroActiveRef       = useRef(true);
  const servicesPrimaryRef  = useRef(false);
  const portfolioActiveRef  = useRef(false);
  const [aboutActive,      setAboutActive]      = useState(false);
  const [portfolioActive,  setPortfolioActive]  = useState(false);
  const [vaporRevealed,    setVaporRevealed]    = useState(false);
  const [vaporFading,      setVaporFading]      = useState(false);
  const [vaporDone,        setVaporDone]        = useState(false);
  const [vapourActive,     setVapourActive]     = useState(false);

  const frozenScrollRef          = useRef(0);
  const vaporActiveRef           = useRef(false);
  // Services-at-100% hold: lock scroll for 2 s before the user can proceed
  // to Our Work. Fires both after vapor completes (first visit) and when the
  // user scrolls back to 100% on repeat visits (session already done).
  const servicesHoldRef          = useRef(false);
  const servicesHoldTriggeredRef = useRef(false); // one-shot per scroll-in
  const [servicesHolding, setServicesHolding] = useState(false);


  /* Scroll-driven state logic
     Visual transforms are handled by CSS scroll-driven animations on
     Chrome/Edge/Firefox (scroll(root block) — compositor-threaded, true 1:1).
     JS here only manages state flags: WebGL activation, vapor trigger, etc.
     Safari fallback: the JS assignments below also set the transforms.

     Scrollable range: 300vh (400vh total − 100vh viewport).
       0%   → 33.33%  =   0 → 100vh  (about slides in from right, hero fades)
      33.33% → 66.66%  = 100 → 200vh  (services scales in)
      66.66% → 100%    = 200 → 300vh  (portfolio slides in from left)

     SERVICES_BOUNDARY = 2/3 (≈ 0.6667): the exact point where services
     reaches 100% and portfolio has NOT yet started sliding in.           */
  useEffect(() => {
    const hero      = heroRef.current;
    const about     = aboutRef.current;
    const services  = servicesRef.current;
    const portfolio = portfolioRef.current;
    if (!hero || !about || !services || !portfolio) return;

    // If vapor has already played this page load, pre-mark as triggered so it
    // never fires again for the rest of this load (handles "scroll back from
    // Our Work" without re-triggering).
    let vaporTriggered = vaporPlayedThisLoad;
    let isInitialEval  = true; // skip vapor trigger on browser scroll-restore at mount

    const supportsScrollDriven =
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline", "scroll()");

    // Services is fully visible at raw = 2/3 (CSS range 33.33% → 66.66%).
    // Trigger vapor at 90% through the services animation — well within the
    // services section and clearly before the portfolio boundary.
    // 1/3 + 0.90*(2/3 − 1/3) = 1/3 + 0.30 = 0.633
    const VAPOR_RAW = 1 / 3 + 0.90 * (2 / 3 - 1 / 3); // ≈ 0.633

    // Services is fully visible (portfolio not yet started) at exactly 2/3.
    const SERVICES_BOUNDARY = 2 / 3; // ≈ 0.6667

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
      const heroNowActive = raw < 0.233;
      if (heroNowActive !== heroActiveRef.current) {
        heroActiveRef.current = heroNowActive;
        window.dispatchEvent(
          new CustomEvent("hero-section-active", { detail: { heroActive: heroNowActive } })
        );
      }

      /* ── LiquidEther (About WebGL) ───────────────────────────────────────── */
      const aboutNowActive = raw >= 0.233 && raw < 0.433;
      if (aboutNowActive !== aboutActiveRef.current) {
        aboutActiveRef.current = aboutNowActive;
        startTransition(() => setAboutActive(aboutNowActive));
      }

      /* ── ServiceThreeHeading (Three.js) ─────────────────────────────────── */
      // Active from when services starts animating in until the services/portfolio
      // boundary (2/3). Stop exactly at SERVICES_BOUNDARY so Three.js isn't
      // running while portfolio is already visible.
      const servicesNowPrimary = raw >= 0.433 && raw < SERVICES_BOUNDARY;
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
      // Reset the one-shot flag only when scrolling back above the threshold AND
      // vapor has not yet played this page load. Once vaporPlayedThisLoad is true
      // (set inside handleVaporComplete) this block never fires, so scrolling back
      // to Hero or About can never re-arm the trigger for this load.
      if (raw < VAPOR_RAW - 0.02 && raw < 0.62 && !vaporPlayedThisLoad) {
        vaporTriggered = false;
      }

      // ── Services-at-100% hold (after vapor has played this load) ───────────
      // On first entry the vapor lock parks the page at SERVICES_BOUNDARY and
      // the 2-s hold fires inside handleVaporComplete.
      // On subsequent scroll-ins (vapor already done this load) we add the hold
      // here so the user still gets the 2-s pause before portfolio appears.
      if (raw < SERVICES_BOUNDARY - 0.03) {
        // Reset one-shot so the hold fires again if the user scrolls back up
        servicesHoldTriggeredRef.current = false;
      }
      if (
        raw >= SERVICES_BOUNDARY &&
        vaporPlayedThisLoad &&
        !servicesHoldTriggeredRef.current &&
        !isInitialEval
      ) {
        servicesHoldTriggeredRef.current = true;
        servicesHoldRef.current          = true;
        const sMax = document.documentElement.scrollHeight - window.innerHeight;
        frozenScrollRef.current          = Math.round(sMax * SERVICES_BOUNDARY);
        setServicesHolding(true);
        setTimeout(() => {
          servicesHoldRef.current = false;
          setServicesHolding(false);
        }, 2000);
      }

      if (raw >= VAPOR_RAW && !vaporTriggered && !isInitialEval && !vaporActiveRef.current) {
        vaporTriggered = true;
        // Freeze at the exact services/portfolio boundary (raw = 2/3) so the
        // page is locked with services at 100% and portfolio not yet visible.
        const currentMax = document.documentElement.scrollHeight - window.innerHeight;
        frozenScrollRef.current = Math.round(currentMax * SERVICES_BOUNDARY);
        vaporActiveRef.current  = true;
        window.dispatchEvent(new CustomEvent("services-section-active", { detail: { active: false } }));
        // Do NOT wrap in startTransition — vapor must appear immediately (urgent update).
        setVaporRevealed(true);
        // Small delay then activate vapour words
        setTimeout(() => setVapourActive(true), 120);
      }
    };

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (!max) return;

      // Lock scroll while vapour is animating OR during the 2-s services hold
      if (vaporActiveRef.current || servicesHoldRef.current) {
        window.scrollTo(0, frozenScrollRef.current);
        return;
      }

      driveFrame(window.scrollY / max);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // Evaluate on load (e.g. browser scroll restore after refresh).
    const initMax = document.documentElement.scrollHeight - window.innerHeight;
    const initRaw = initMax > 0 ? window.scrollY / initMax : 0;
    // Pre-mark triggered if browser restores scroll to at/past the threshold on
    // load — so vapor doesn't fire immediately on a reload-at-Our-Work.
    // Also mark vaporDone so Services content is active without waiting.
    if (initRaw >= VAPOR_RAW) {
      vaporTriggered = true;
      startTransition(() => setVaporDone(true));
    }
    driveFrame(initRaw);
    isInitialEval = false;

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Block ALL wheel/touch scroll during vapour (both directions) */
  useEffect(() => {
    if (!vaporRevealed || vaporDone) return;

    const blockUpWheel = (e: WheelEvent) => {
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

  /* Block ALL wheel/touch scroll during the 2-s services hold */
  useEffect(() => {
    if (!servicesHolding) return;

    const blockWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0]?.clientY ?? 0; };
    const blockTouch = (e: TouchEvent) => {
      const dy = (e.touches[0]?.clientY ?? 0) - touchStartY;
      if (dy > 0) {
        e.preventDefault();
        window.scrollTo(0, frozenScrollRef.current);
      }
    };

    window.addEventListener("wheel",      blockWheel,   { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  blockTouch,   { passive: false });

    return () => {
      window.removeEventListener("wheel",      blockWheel,   { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  blockTouch);
    };
  }, [servicesHolding]);

  /* Vapor cycle complete */
  const handleVaporComplete = () => {
    // Mark as played for the rest of this page load (module-level — resets on reload).
    vaporPlayedThisLoad = true;
    vaporActiveRef.current = false;
    setVapourActive(false);
    setVaporDone(true);
    window.dispatchEvent(new CustomEvent("services-section-active", { detail: { active: true } }));
    setVaporFading(true);
    setTimeout(() => {
      setVaporRevealed(false);
      setVaporFading(false);
    }, 650);

    // Hold the page at services 100% for 2 seconds so the user can see the
    // section before it snaps to Our Work. frozenScrollRef is already set to
    // the SERVICES_BOUNDARY position by the vapor trigger — reuse it here.
    servicesHoldTriggeredRef.current = true;
    servicesHoldRef.current          = true;
    setServicesHolding(true);
    setTimeout(() => {
      servicesHoldRef.current = false;
      setServicesHolding(false);
    }, 2000);
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

      {/* ServicesIntro overlay: DotGrid background + VapourWords text.
          Shown on first visit to the services section each browser tab session.
          `visible` keeps the overlay mounted (with fade-out transition) while
          `vapourActive` tells VapourWords to start cycling through the words. */}
      <ServicesIntro
        ref={introRef}
        visible={vaporRevealed}
        vapourActive={vapourActive}
        onVapourComplete={handleVaporComplete}
      />
    </main>
  );
}
