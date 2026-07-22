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

  const frozenScrollRef          = useRef(0);
  const vaporActiveRef           = useRef(false);
  // Services-at-100% hold: lock scroll for 2 s before the user can proceed
  // to Our Work. Fires both after vapor completes (first visit) and when the
  // user scrolls back to 100% on repeat visits (session already done).
  const servicesHoldRef          = useRef(false);
  const servicesHoldTriggeredRef = useRef(false); // one-shot per scroll-in
  const [servicesHolding, setServicesHolding] = useState(false);

  // Session key persists across reloads within the same browser tab.
  // Once vapor has played once, it never plays again for the rest of the session.
  const VAPOR_SESSION_KEY = "tz_vapor_done";

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

    // If the vapor has already played this browser session, pre-mark as triggered
    // so it never fires again regardless of scroll direction (handles the
    // "scroll back from Our Work" and "reload at Our Work" cases).
    const sessionAlreadyDone =
      typeof sessionStorage !== "undefined" && !!sessionStorage.getItem(VAPOR_SESSION_KEY);
    let vaporTriggered = sessionAlreadyDone;
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
      // Fires at 94% through the services section (raw 0.433→0.75).
      // 0.433 + 0.94*(0.75−0.433) ≈ 0.731
      const VAPOR_RAW = 0.433 + 0.94 * (0.75 - 0.433); // ≈ 0.731

      // Reset the one-shot flag ONLY when clearly scrolling forward into services
      // from the about direction — never when scrolling back from the portfolio
      // section (raw >= 0.70 means user came from Our Work, keep it triggered).
      // Also never reset when the session already has the completion flag.
      if (raw < VAPOR_RAW - 0.02 && raw < 0.70 && !sessionAlreadyDone) {
        vaporTriggered = false;
      }

      // ── Services-at-100% hold (repeat visits) ──────────────────────────────
      // On first visit the vapor lock already parks the page at raw=0.75;
      // the 2-second hold fires inside handleVaporComplete instead.
      // On repeat visits (sessionAlreadyDone) vapor never runs, so we add the
      // hold here when the user first scrolls into the services→portfolio seam.
      const SERVICES_BOUNDARY = 0.75;
      if (raw < SERVICES_BOUNDARY - 0.03) {
        // Reset one-shot so the hold fires again if the user scrolls back up
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
        // Freeze at the 100 % boundary of the services scroll range (raw = 0.75)
        // rather than at the trigger point (94 %). This locks the page at the
        // clean services→portfolio boundary while the vapor animation plays.
        const currentMax = document.documentElement.scrollHeight - window.innerHeight;
        frozenScrollRef.current = Math.round(currentMax * 0.75);
        vaporActiveRef.current  = true;
        window.dispatchEvent(new CustomEvent("services-section-active", { detail: { active: false } }));
        // Do NOT wrap in startTransition — vapor must appear immediately (urgent update).
        // startTransition marks it as deferrable, which lets React skip the render while
        // the user is scrolling and produces a blank overlay until React is idle.
        setVaporRevealed(true);
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
    // isInitialEval stays true during this call so vapor never shows on reload.
    // Pre-mark triggered if already at/past threshold so a stray post-load
    // scroll event (browser scroll-restore jitter) cannot fire the overlay.
    const initMax = document.documentElement.scrollHeight - window.innerHeight;
    const initRaw = initMax > 0 ? window.scrollY / initMax : 0;
    const VAPOR_RAW_INIT = 0.433 + 0.94 * (0.75 - 0.433);
    // Pre-mark triggered if at/past threshold OR session already completed
    if (initRaw >= VAPOR_RAW_INIT || sessionAlreadyDone) vaporTriggered = true;
    driveFrame(initRaw);
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

  // On mount: if vapor already played this session, mark it done immediately so
  // the Services section is shown without waiting for the animation (handles
  // reload-at-Our-Work and navigate-back-from-Our-Work cases).
  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(VAPOR_SESSION_KEY)) {
      setVaporDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Vapor cycle complete */
  const handleVaporComplete = () => {
    // Persist completion so the animation never re-fires for the rest of the session
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(VAPOR_SESSION_KEY, "1");
    }
    vaporActiveRef.current = false;
    setVaporDone(true);
    window.dispatchEvent(new CustomEvent("services-section-active", { detail: { active: true } }));
    setVaporFading(true);
    setTimeout(() => {
      setVaporRevealed(false);
      setVaporFading(false);
    }, 650);

    // Hold the page at services 100% for 2 seconds so the user can see the
    // section before it snaps to Our Work. frozenScrollRef is already set to
    // the raw=0.75 position by the vapor trigger — reuse it here.
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

      {vaporRevealed && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            // Explicit dimensions are belt-and-suspenders for browsers that
            // occasionally mis-resolve inset:0 height inside filter contexts.
            width: "100vw",
            height: "100vh",
            zIndex: 200,
            // No flex layout here — VaporizeTextCycle already centres the text
            // via alignment="center". flex + align-items:center collapses the
            // child's height:100% to ~20 px (canvas minHeight), making the
            // canvas too small and rendering the text invisible.
            pointerEvents: "none",
            opacity: vaporFading ? 0 : 1,
            transition: "opacity 0.6s ease",
            // Single modest drop-shadow — safe now that VaporizeTextCycle uses
            // main-thread canvas rendering (CSS filters are incompatible with
            // OffscreenCanvas compositing; the OffscreenCanvas path is disabled).
            filter: "drop-shadow(0 0 24px rgba(255,255,255,0.9))",
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
