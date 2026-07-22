"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import Hero          from "@/components/sections/Hero";
import About         from "@/components/sections/About/About";
import Services      from "@/components/sections/Services/Services";
import Portfolio     from "@/components/sections/Portfolio/Portfolio";
import ServicesIntro from "@/components/sections/ServicesIntro/ServicesIntro";
import type { ServicesIntroHandle } from "@/components/sections/ServicesIntro/ServicesIntro";
import ChessReveal   from "@/components/sections/ChessReveal/ChessReveal";
import type { ChessRevealHandle } from "@/components/sections/ChessReveal/ChessReveal";
import styles        from "./page.module.css";

export default function Home() {
  const heroRef      = useRef<HTMLDivElement>(null);
  const aboutRef     = useRef<HTMLDivElement>(null);
  const servicesRef  = useRef<HTMLDivElement>(null);
  const portfolioRef = useRef<HTMLDivElement>(null);
  const introRef     = useRef<ServicesIntroHandle>(null);
  const chessRef     = useRef<ChessRevealHandle>(null);

  const aboutActiveRef      = useRef(false);
  const heroActiveRef       = useRef(true);
  const servicesPrimaryRef  = useRef(false);
  const portfolioActiveRef  = useRef(false);
  const [aboutActive,     setAboutActive]     = useState(false);
  const [portfolioActive, setPortfolioActive] = useState(false);
  const [vaporRevealed,   setVaporRevealed]   = useState(false);
  const [vaporFading,     setVaporFading]     = useState(false);
  const [vaporDone,       setVaporDone]       = useState(false);
  const [vapourActive,    setVapourActive]    = useState(false);

  const frozenScrollRef          = useRef(0);
  const vaporActiveRef           = useRef(false);

  // Services 2-s hold
  const servicesHoldRef          = useRef(false);
  const servicesHoldTriggeredRef = useRef(false);
  const [servicesHolding, setServicesHolding] = useState(false);

  // Portfolio 2-s hold (before chess reveal)
  const portfolioHoldRef          = useRef(false);
  const portfolioHoldTriggeredRef = useRef(false);
  const [portfolioHolding, setPortfolioHolding] = useState(false);

  // Chess reveal
  const chessActiveRef = useRef(false);

  const VAPOR_SESSION_KEY = "tz_vapor_done";

  /* ── Scroll-driven state logic ─────────────────────────────────────────── */
  useEffect(() => {
    const hero      = heroRef.current;
    const about     = aboutRef.current;
    const services  = servicesRef.current;
    const portfolio = portfolioRef.current;
    if (!hero || !about || !services || !portfolio) return;

    const sessionAlreadyDone =
      typeof sessionStorage !== "undefined" && !!sessionStorage.getItem(VAPOR_SESSION_KEY);
    let vaporTriggered = sessionAlreadyDone;
    let isInitialEval  = true;

    const supportsScrollDriven =
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline", "scroll()");

    const VAPOR_RAW         = 1 / 3 + 0.90 * (2 / 3 - 1 / 3);
    const SERVICES_BOUNDARY = 2 / 3;
    const PORTFOLIO_FULL    = 0.97; // portfolio fully slid into view

    const driveFrame = (raw: number) => {
      /* ── Safari fallback ─────────────────────────────────────────────── */
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

      /* ── Hero ─────────────────────────────────────────────────────────── */
      const heroNowActive = raw < 0.233;
      if (heroNowActive !== heroActiveRef.current) {
        heroActiveRef.current = heroNowActive;
        window.dispatchEvent(
          new CustomEvent("hero-section-active", { detail: { heroActive: heroNowActive } })
        );
      }

      /* ── About ────────────────────────────────────────────────────────── */
      const aboutNowActive = raw >= 0.233 && raw < 0.433;
      if (aboutNowActive !== aboutActiveRef.current) {
        aboutActiveRef.current = aboutNowActive;
        startTransition(() => setAboutActive(aboutNowActive));
      }

      /* ── Services ─────────────────────────────────────────────────────── */
      const servicesNowPrimary = raw >= 0.433 && raw < SERVICES_BOUNDARY;
      if (servicesNowPrimary !== servicesPrimaryRef.current) {
        servicesPrimaryRef.current = servicesNowPrimary;
        window.dispatchEvent(
          new CustomEvent("services-section-active", { detail: { active: servicesNowPrimary } })
        );
      }

      /* ── Portfolio Three.js ───────────────────────────────────────────── */
      const portfolioNowActive = raw >= 0.80;
      if (portfolioNowActive !== portfolioActiveRef.current) {
        portfolioActiveRef.current = portfolioNowActive;
        startTransition(() => setPortfolioActive(portfolioNowActive));
      }

      /* ── Vapor trigger reset ──────────────────────────────────────────── */
      if (
        raw < VAPOR_RAW - 0.02 &&
        raw < 0.62 &&
        !sessionAlreadyDone &&
        !sessionStorage.getItem(VAPOR_SESSION_KEY)
      ) {
        vaporTriggered = false;
      }

      /* ── Services-at-100% hold (repeat visits after vapor) ───────────── */
      if (raw < SERVICES_BOUNDARY - 0.03) {
        servicesHoldTriggeredRef.current = false;
      }
      if (
        raw >= SERVICES_BOUNDARY &&
        sessionAlreadyDone &&
        !servicesHoldTriggeredRef.current &&
        !isInitialEval
      ) {
        servicesHoldTriggeredRef.current = true;
        servicesHoldRef.current          = true;
        const sMax = document.documentElement.scrollHeight - window.innerHeight;
        frozenScrollRef.current = Math.round(sMax * SERVICES_BOUNDARY);
        setServicesHolding(true);
        setTimeout(() => {
          servicesHoldRef.current = false;
          setServicesHolding(false);
        }, 2000);
      }

      /* ── Vapor reveal ─────────────────────────────────────────────────── */
      if (raw >= VAPOR_RAW && !vaporTriggered && !isInitialEval && !vaporActiveRef.current) {
        vaporTriggered = true;
        const currentMax = document.documentElement.scrollHeight - window.innerHeight;
        frozenScrollRef.current = Math.round(currentMax * SERVICES_BOUNDARY);
        vaporActiveRef.current  = true;
        window.dispatchEvent(new CustomEvent("services-section-active", { detail: { active: false } }));
        setVaporRevealed(true);
        setTimeout(() => setVapourActive(true), 120);
      }

      /* ── Portfolio-at-100% hold → then chess reveal ───────────────────── */
      // Reset one-shot when user scrolls back from portfolio
      if (raw < PORTFOLIO_FULL - 0.06) {
        portfolioHoldTriggeredRef.current = false;
      }
      if (
        raw >= PORTFOLIO_FULL &&
        !portfolioHoldTriggeredRef.current &&
        !isInitialEval &&
        !vaporActiveRef.current &&
        !chessActiveRef.current
      ) {
        portfolioHoldTriggeredRef.current = true;
        portfolioHoldRef.current          = true;
        const pMax = document.documentElement.scrollHeight - window.innerHeight;
        frozenScrollRef.current = Math.round(pMax); // hold at very bottom
        setPortfolioHolding(true);

        // After 2 s hold, slide in the chess section
        setTimeout(() => {
          portfolioHoldRef.current = false;
          setPortfolioHolding(false);
          chessActiveRef.current = true;
          chessRef.current?.activate();
        }, 2000);
      }
    };

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (!max) return;

      if (
        vaporActiveRef.current    ||
        servicesHoldRef.current   ||
        portfolioHoldRef.current  ||
        chessActiveRef.current
      ) {
        window.scrollTo(0, frozenScrollRef.current);
        return;
      }

      driveFrame(window.scrollY / max);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    /* Chess events ──────────────────────────────────────────────────────── */
    const onChessDismissed = () => {
      chessActiveRef.current            = false;
      portfolioHoldTriggeredRef.current = false; // allow re-trigger on scroll forward
    };
    const onChessComplete = () => {
      chessActiveRef.current = false;
    };
    window.addEventListener("chess-reveal-dismissed", onChessDismissed);
    window.addEventListener("chess-reveal-complete",  onChessComplete);

    /* Initial evaluation ────────────────────────────────────────────────── */
    const initMax = document.documentElement.scrollHeight - window.innerHeight;
    const initRaw = initMax > 0 ? window.scrollY / initMax : 0;
    if (initRaw >= VAPOR_RAW || sessionAlreadyDone) {
      vaporTriggered = true;
      startTransition(() => setVaporDone(true));
    }
    driveFrame(initRaw);
    isInitialEval = false;

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("chess-reveal-dismissed", onChessDismissed);
      window.removeEventListener("chess-reveal-complete",  onChessComplete);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Block wheel/touch during vapour ───────────────────────────────────── */
  useEffect(() => {
    if (!vaporRevealed || vaporDone) return;
    const blockWheel = (e: WheelEvent) => { e.preventDefault(); e.stopImmediatePropagation(); };
    let ty = 0;
    const onTS = (e: TouchEvent) => { ty = e.touches[0]?.clientY ?? 0; };
    const blockTouch = (e: TouchEvent) => {
      if ((e.touches[0]?.clientY ?? 0) - ty > 0) {
        e.preventDefault();
        window.scrollTo(0, frozenScrollRef.current);
      }
    };
    window.addEventListener("wheel",      blockWheel,  { passive: false, capture: true });
    window.addEventListener("touchstart", onTS,        { passive: true });
    window.addEventListener("touchmove",  blockTouch,  { passive: false });
    return () => {
      window.removeEventListener("wheel",      blockWheel,  { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchmove",  blockTouch);
    };
  }, [vaporRevealed, vaporDone]);

  /* ── Block wheel/touch during services 2-s hold ────────────────────────── */
  useEffect(() => {
    if (!servicesHolding) return;
    const blockWheel = (e: WheelEvent) => { e.preventDefault(); e.stopImmediatePropagation(); };
    let ty = 0;
    const onTS = (e: TouchEvent) => { ty = e.touches[0]?.clientY ?? 0; };
    const blockTouch = (e: TouchEvent) => {
      if ((e.touches[0]?.clientY ?? 0) - ty > 0) {
        e.preventDefault();
        window.scrollTo(0, frozenScrollRef.current);
      }
    };
    window.addEventListener("wheel",      blockWheel,  { passive: false, capture: true });
    window.addEventListener("touchstart", onTS,        { passive: true });
    window.addEventListener("touchmove",  blockTouch,  { passive: false });
    return () => {
      window.removeEventListener("wheel",      blockWheel,  { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchmove",  blockTouch);
    };
  }, [servicesHolding]);

  /* ── Block wheel/touch during portfolio 2-s hold ───────────────────────── */
  useEffect(() => {
    if (!portfolioHolding) return;
    const blockWheel = (e: WheelEvent) => { e.preventDefault(); e.stopImmediatePropagation(); };
    let ty = 0;
    const onTS = (e: TouchEvent) => { ty = e.touches[0]?.clientY ?? 0; };
    const blockTouch = (e: TouchEvent) => {
      e.preventDefault();
      window.scrollTo(0, frozenScrollRef.current);
    };
    window.addEventListener("wheel",      blockWheel,  { passive: false, capture: true });
    window.addEventListener("touchstart", onTS,        { passive: true });
    window.addEventListener("touchmove",  blockTouch,  { passive: false });
    return () => {
      window.removeEventListener("wheel",      blockWheel,  { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchmove",  blockTouch);
    };
  }, [portfolioHolding]);

  /* ── On mount: sync vapor session state ────────────────────────────────── */
  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(VAPOR_SESSION_KEY)) {
      setVaporDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Vapor complete ─────────────────────────────────────────────────────── */
  const handleVaporComplete = () => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(VAPOR_SESSION_KEY, "1");
    }
    vaporActiveRef.current = false;
    setVapourActive(false);
    setVaporDone(true);
    window.dispatchEvent(new CustomEvent("services-section-active", { detail: { active: true } }));
    setVaporFading(true);
    setTimeout(() => {
      setVaporRevealed(false);
      setVaporFading(false);
    }, 650);
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

      {/* ServicesIntro overlay */}
      <ServicesIntro
        ref={introRef}
        visible={vaporRevealed}
        vapourActive={vapourActive}
        onVapourComplete={handleVaporComplete}
      />

      {/* Chess Reveal — slides up from below after Our Work holds for 2s */}
      <ChessReveal ref={chessRef} />
    </main>
  );
}
