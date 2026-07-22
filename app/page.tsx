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
  const [aboutActive,      setAboutActive]      = useState(false);
  const [portfolioActive,  setPortfolioActive]  = useState(false);
  const [vaporRevealed,    setVaporRevealed]    = useState(false);
  const [vaporFading,      setVaporFading]      = useState(false);
  const [vaporDone,        setVaporDone]        = useState(false);
  const [vapourActive,     setVapourActive]     = useState(false);

  const frozenScrollRef          = useRef(0);
  const vaporActiveRef           = useRef(false);
  const servicesHoldRef          = useRef(false);
  const servicesHoldTriggeredRef = useRef(false);
  const [servicesHolding, setServicesHolding] = useState(false);

  // Chess reveal state
  const chessActiveRef         = useRef(false);
  const chessTriggeredRef      = useRef(false); // one-shot per session

  // Session key persists across reloads within the same browser tab.
  const VAPOR_SESSION_KEY = "tz_vapor_done";

  /* Scroll-driven state logic */
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

    const VAPOR_RAW = 1 / 3 + 0.90 * (2 / 3 - 1 / 3);
    const SERVICES_BOUNDARY = 2 / 3;

    // Chess reveal triggers near the very end of the portfolio scroll range
    const CHESS_RAW = 0.97;

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
      if (
        raw < VAPOR_RAW - 0.02 &&
        raw < 0.62 &&
        !sessionAlreadyDone &&
        !sessionStorage.getItem(VAPOR_SESSION_KEY)
      ) {
        vaporTriggered = false;
      }

      /* ── Services-at-100% hold (repeat visits) ──────────────────────────── */
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
        frozenScrollRef.current          = Math.round(sMax * SERVICES_BOUNDARY);
        setServicesHolding(true);
        setTimeout(() => {
          servicesHoldRef.current = false;
          setServicesHolding(false);
        }, 2000);
      }

      if (raw >= VAPOR_RAW && !vaporTriggered && !isInitialEval && !vaporActiveRef.current) {
        vaporTriggered = true;
        const currentMax = document.documentElement.scrollHeight - window.innerHeight;
        frozenScrollRef.current = Math.round(currentMax * SERVICES_BOUNDARY);
        vaporActiveRef.current  = true;
        window.dispatchEvent(new CustomEvent("services-section-active", { detail: { active: false } }));
        setVaporRevealed(true);
        setTimeout(() => setVapourActive(true), 120);
      }

      /* ── Chess Reveal trigger ────────────────────────────────────────────── */
      // Allow re-trigger if user dismissed (scrolled back) and re-scrolls forward
      if (raw < CHESS_RAW - 0.05) {
        chessTriggeredRef.current = false;
      }
      if (
        raw >= CHESS_RAW &&
        !chessTriggeredRef.current &&
        !isInitialEval &&
        !vaporActiveRef.current &&
        !chessActiveRef.current
      ) {
        chessTriggeredRef.current = true;
        chessActiveRef.current    = true;
        // Freeze scroll at max (portfolio fully visible)
        const cMax = document.documentElement.scrollHeight - window.innerHeight;
        frozenScrollRef.current = Math.round(cMax * 1.0);
        chessRef.current?.activate();
      }
    };

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (!max) return;

      if (vaporActiveRef.current || servicesHoldRef.current || chessActiveRef.current) {
        window.scrollTo(0, frozenScrollRef.current);
        return;
      }

      driveFrame(window.scrollY / max);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // Chess reveal dismissed → user can scroll back
    const onChessDismissed = () => {
      chessActiveRef.current    = false;
      chessTriggeredRef.current = false;
    };
    const onChessComplete = () => {
      chessActiveRef.current = false;
    };
    window.addEventListener("chess-reveal-dismissed", onChessDismissed);
    window.addEventListener("chess-reveal-complete",  onChessComplete);

    // Evaluate on load
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
  }, []);

  /* Block ALL wheel/touch scroll during vapour */
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

  // On mount: if vapor already played this session, mark done
  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(VAPOR_SESSION_KEY)) {
      setVaporDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Vapor cycle complete */
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

      {/* Chess Reveal — fixed overlay that appears after Our Work */}
      <ChessReveal ref={chessRef} />
    </main>
  );
}
