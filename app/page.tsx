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
import CraftSection  from "@/components/sections/Craft/Craft";
import type { CraftSectionHandle } from "@/components/sections/Craft/Craft";
import styles        from "./page.module.css";

export default function Home() {
  const heroRef      = useRef<HTMLDivElement>(null);
  const aboutRef     = useRef<HTMLDivElement>(null);
  const servicesRef  = useRef<HTMLDivElement>(null);
  const portfolioRef = useRef<HTMLDivElement>(null);
  const introRef     = useRef<ServicesIntroHandle>(null);
  const chessRef     = useRef<ChessRevealHandle>(null);
  const craftRef     = useRef<CraftSectionHandle>(null);

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
  const portfolioGateReadyRef     = useRef(false);
  const portfolioGateTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portfolioHolding, setPortfolioHolding] = useState(false);

  // Chess reveal
  const chessActiveRef = useRef(false);

  // Chess active — while Chess is visible, pause Portfolio Three.js
  const [chessUiActive, setChessUiActive] = useState(false);

  // Craft active — while Craft is visible, pause Portfolio Three.js and Chess canvas
  const [craftActive, setCraftActive] = useState(false);

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

    // Detect touch once per effect lifetime — avoids repeated matchMedia calls
    // on every scroll frame, which would add measurable overhead on mobile.
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

    const VAPOR_RAW         = 1 / 3 + 0.90 * (2 / 3 - 1 / 3);
    const SERVICES_BOUNDARY = 2 / 3;
    const PORTFOLIO_FULL    = 0.999; // portfolio fully slid into view (p3≈1 at raw≈1)

    const beginPortfolioGate = () => {
      portfolioHoldTriggeredRef.current = true;
      portfolioHoldRef.current          = true;
      portfolioGateReadyRef.current     = false;
      const pMax = document.documentElement.scrollHeight - window.innerHeight;
      frozenScrollRef.current = Math.round(pMax);
      // Immediately snap scroll to pMax so CSS scroll-driven animations
      // reach 100% in the same frame the gate activates, and fix the JS
      // fallback (which relies on driveFrame calls that are now blocked).
      window.scrollTo(0, Math.round(pMax));
      if (!supportsScrollDriven && portfolio) {
        portfolio.style.transform = "translateX(0%)";
      }
      // Tell the custom scrollbar to stop fighting the frozen position.
      window.dispatchEvent(new CustomEvent("tz-scroll-frozen"));
      setPortfolioHolding(true);

      if (portfolioGateTimerRef.current) {
        clearTimeout(portfolioGateTimerRef.current);
      }
      // The gate opens after two seconds, but it never advances on its own.
      // On touch devices the 2-s hold feels like a bug, not a feature.
      // 0 ms on mobile: gate is ready on the next event-loop tick so the user's
      // very first upward swipe (even within the same gesture) releases it.
      // Any remaining accidental-trigger protection comes from the >10 px minimum
      // delta check in blockTouch / blockWheel.
      const gateDelay = window.matchMedia("(pointer: coarse)").matches ? 0 : 2000;
      portfolioGateTimerRef.current = setTimeout(() => {
        portfolioGateReadyRef.current = true;
        portfolioGateTimerRef.current = null;
        // Tell the scrollbar the gate is open so it can navigate again.
        window.dispatchEvent(new CustomEvent("tz-scroll-gate-ready"));
      }, gateDelay);
    };

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
        // Blur filter triggers a full GPU repaint on every scroll frame on
        // mobile — skip it entirely on touch devices (saves ~8 ms/frame).
        if (!isTouchDevice) services.style.filter = `blur(${((1 - p2) * 18).toFixed(2)}px)`;
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
        window.dispatchEvent(
          new CustomEvent("portfolio-section-active", { detail: { active: portfolioNowActive } })
        );
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

      /* ── Services-at-100% hold (fires on every visit, not just repeat) ──── */
      if (raw < SERVICES_BOUNDARY - 0.03) {
        servicesHoldTriggeredRef.current = false;
      }
      if (
        raw >= SERVICES_BOUNDARY &&
        !servicesHoldTriggeredRef.current &&
        !isInitialEval
      ) {
        servicesHoldTriggeredRef.current = true;
        servicesHoldRef.current          = true;
        const sMax = document.documentElement.scrollHeight - window.innerHeight;
        frozenScrollRef.current = Math.round(sMax * SERVICES_BOUNDARY);
        setServicesHolding(true);
        // Same 2 s hold on mobile and desktop. The hold is visible and
        // intentional — it gives the user time to read the services section
        // before the portfolio slides in.  scroll is frozen via scrollTo in
        // onScroll (see below) which works cleanly in the middle of the doc.
        const holdMs = 2000;
        setTimeout(() => {
          servicesHoldRef.current = false;
          setServicesHolding(false);
        }, holdMs);
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
        beginPortfolioGate();
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
        // On mobile during vapour/portfolioHold/chess, the capture-phase
        // blockTouch handlers call e.preventDefault(), so scroll cannot drift —
        // no scrollTo needed (it would fight iOS physics and jitter).
        // EXCEPTION: servicesHold on mobile has no blockTouch (removed to keep
        // the touch gesture alive across the services→portfolio transition).
        // For that case we DO need scrollTo to actually hold position. At 2/3
        // of the document (not at the elastic bounce zone at top/bottom), iOS
        // honors scrollTo without jitter because there is no rubber-band physics
        // in the middle of the scroll range.
        if (!isTouchDevice || servicesHoldRef.current) {
          window.scrollTo(0, frozenScrollRef.current);
        }
        return;
      }

      driveFrame(window.scrollY / max);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    /* Chess events ──────────────────────────────────────────────────────── */
    const onChessDismissed = (e: Event) => {
      chessActiveRef.current = false;
      const source = (e as CustomEvent<{ source?: string }>).detail?.source;
      if (source === "scrollbar" || source === "nav") {
        // Explicit navigation (scrollbar drag back, or section-nav click):
        // release the freeze immediately without re-arming the portfolio gate.
        portfolioHoldRef.current = false;
        setPortfolioHolding(false);
        window.dispatchEvent(new CustomEvent("tz-scroll-released"));
      } else if (window.matchMedia("(pointer: coarse)").matches) {
        // On mobile: dismissed by swipe — release immediately and jump back to
        // 90 % of the document so the user can scroll freely in both directions.
        // Re-arming the gate here traps the user in a chess→gate→chess loop
        // where every attempt to scroll back requires an extra swipe to escape.
        // The gate will naturally re-arm the next time the user scrolls to the bottom.
        portfolioHoldRef.current = false;
        setPortfolioHolding(false);
        const docMax = document.documentElement.scrollHeight - window.innerHeight;
        if (docMax > 0) window.scrollTo(0, Math.round(docMax * 0.90));
        window.dispatchEvent(new CustomEvent("tz-scroll-released"));
      } else {
        // Desktop: dismissed via wheel/touch — show the deliberate 2-s gate so
        // the user can't accidentally re-trigger chess the moment they release.
        beginPortfolioGate();
      }
    };
    const onChessComplete = () => {
      chessActiveRef.current = false;
    };
    window.addEventListener("chess-reveal-dismissed", onChessDismissed);
    window.addEventListener("chess-reveal-complete",  onChessComplete);

    /* Craft section-nav exit: release portfolio hold so the nav doScroll works ── */
    const onCraftNavExit = () => {
      if (!portfolioHoldRef.current) return;
      portfolioHoldRef.current = false;
      setPortfolioHolding(false);
      window.dispatchEvent(new CustomEvent("tz-scroll-released"));
    };
    window.addEventListener("craft-section-nav-exit", onCraftNavExit);

    /* Chess active — pause Portfolio Three.js while Chess is showing */
    const onChessMode = (e: Event) => {
      setChessUiActive((e as CustomEvent<{ active: boolean }>).detail.active);
    };
    window.addEventListener("chess-reveal-mode", onChessMode);

    /* Craft active — pause Portfolio Three.js + Chess canvas while Craft is showing */
    const onCraftActivate = () => setCraftActive(true);
    const onCraftDismissOrExit = () => setCraftActive(false);
    window.addEventListener("craft-section-activate", onCraftActivate);
    window.addEventListener("craft-section-dismiss",  onCraftDismissOrExit);
    window.addEventListener("craft-section-nav-exit", onCraftDismissOrExit);

    /* Section-nav navigation: suppress services & portfolio gates during nav-scroll ─ */
    const onNavNavigate = () => {
      // Suppress services hold so scroll passes through the 2/3 boundary freely.
      // The hold resets naturally when raw drops below SERVICES_BOUNDARY - 0.03.
      servicesHoldTriggeredRef.current = true;
      // Suppress portfolio gate so navigating directly to Work doesn't re-arm the
      // chess-reveal hold. Resets naturally when raw drops below PORTFOLIO_FULL - 0.06.
      portfolioHoldTriggeredRef.current = true;
    };
    window.addEventListener("section-nav-navigate", onNavNavigate);

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
      if (portfolioGateTimerRef.current) {
        clearTimeout(portfolioGateTimerRef.current);
        portfolioGateTimerRef.current = null;
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("chess-reveal-dismissed", onChessDismissed);
      window.removeEventListener("chess-reveal-complete",  onChessComplete);
      window.removeEventListener("chess-reveal-mode",      onChessMode);
      window.removeEventListener("craft-section-nav-exit", onCraftNavExit);
      window.removeEventListener("craft-section-activate", onCraftActivate);
      window.removeEventListener("craft-section-dismiss",  onCraftDismissOrExit);
      window.removeEventListener("craft-section-nav-exit", onCraftDismissOrExit);
      window.removeEventListener("section-nav-navigate",   onNavNavigate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Block wheel/touch during vapour ───────────────────────────────────── */
  useEffect(() => {
    if (!vaporRevealed || vaporDone) return;
    const blockWheel = (e: WheelEvent) => { e.preventDefault(); e.stopImmediatePropagation(); };
    // Block ALL touch scroll directions — the animation plays on its own timer.
    // Blocking only one direction and calling scrollTo on the other causes iOS
    // inertia to fight window.scrollTo, producing visible jitter.
    const blockTouch = (e: TouchEvent) => { e.preventDefault(); };
    window.addEventListener("wheel",      blockWheel,  { passive: false, capture: true });
    window.addEventListener("touchmove",  blockTouch,  { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel",      blockWheel,  { capture: true } as EventListenerOptions);
      window.removeEventListener("touchmove",  blockTouch,  { capture: true } as EventListenerOptions);
    };
  }, [vaporRevealed, vaporDone]);

  /* ── Block wheel/touch during services 2-s hold ────────────────────────── */
  useEffect(() => {
    if (!servicesHolding) return;
    const blockWheel = (e: WheelEvent) => { e.preventDefault(); e.stopImmediatePropagation(); };
    // On touch devices, do NOT call e.preventDefault() on touchmove.
    // iOS marks an entire gesture as "JS-controlled" the moment any touchmove in
    // that gesture has e.preventDefault() called.  Even after the listener is
    // removed the current gesture is permanently dead for native scroll — the user
    // must lift and re-touch before the page will scroll again.  For a 300 ms hold
    // that is a visible, confusing freeze that persists through the full services →
    // portfolio transition.  The visual hold is driven by CSS scroll-driven
    // animation and needs no JS touch-blocking to stay in place.
    if (window.matchMedia("(pointer: coarse)").matches) {
      // Mobile: block wheel only (a trackpad connected to a phone is edge-case,
      // but harmless to guard against).
      window.addEventListener("wheel", blockWheel, { passive: false, capture: true });
      return () => {
        window.removeEventListener("wheel", blockWheel, { capture: true } as EventListenerOptions);
      };
    }
    // Desktop: block both wheel and touch (trackpad-heavy users need the full hold).
    const blockTouch = (e: TouchEvent) => { e.preventDefault(); };
    window.addEventListener("wheel",      blockWheel,  { passive: false, capture: true });
    window.addEventListener("touchmove",  blockTouch,  { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel",      blockWheel,  { capture: true } as EventListenerOptions);
      window.removeEventListener("touchmove",  blockTouch,  { capture: true } as EventListenerOptions);
    };
  }, [servicesHolding]);

  /* ── Block wheel/touch during portfolio 2-s hold ───────────────────────── */
  useEffect(() => {
    if (!portfolioHolding) return;
    let gateReleased = false;

    const releaseFromGate = (delta: number) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      gateReleased = true;
      portfolioHoldRef.current = false;
      // Let the custom scrollbar accept drag input again.
      window.dispatchEvent(new CustomEvent("tz-scroll-released"));
      setPortfolioHolding(false);

      if (delta > 0) {
        // Downward input moves into the chess page. Activate it before releasing
        // the hold so the page scroll handler cannot run in the gap.
        chessActiveRef.current = true;
        chessRef.current?.activate();
        chessRef.current?.scrollBy(delta);
        return;
      }

      // Upward input — scroll back after releasing the gate.
      // On mobile, jump all the way to 90 % of the document max.  This gives
      // three things at once:
      //   1. Clear visual feedback (portfolio snaps back to ~70 % slide-in).
      //   2. The gate one-shot (portfolioHoldTriggeredRef) resets because
      //      raw (0.90) < PORTFOLIO_FULL − 0.06 (0.939), so the next scroll
      //      to the bottom will fire the gate correctly instead of being silently
      //      swallowed because the one-shot was still armed.
      //   3. Enough distance from the boundary that iOS inertia can't fling the
      //      user straight back to 100 % in the same gesture.
      // On desktop, honor the actual swipe delta as before.
      if (window.matchMedia("(pointer: coarse)").matches) {
        window.scrollTo(0, Math.round(max * 0.90));
      } else {
        window.scrollTo(0, Math.max(0, Math.min(max, frozenScrollRef.current + delta)));
      }
      // Keep the gate marked as handled until the scroll position is clearly
      // away from Our Work. Resetting this here lets the scroll event caused
      // by this same gesture immediately re-arm the gate at the threshold,
      // which traps the user when trying to continue toward Services.
    };
    const blockWheel = (e: WheelEvent) => {
      // React state cleanup happens after this event turn. Once released,
      // immediately let subsequent wheel input reach the document instead of
      // trapping it in the still-mounted capture listener.
      if (gateReleased) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (portfolioGateReadyRef.current) {
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        // Require a minimum delta (> 10px) before releasing the gate.
        // This filters out residual trackpad inertia from the scroll that
        // originally triggered the gate — tiny trailing events shouldn't
        // jump the user straight into chess reveal.
        if (delta && Math.abs(delta) > 10) releaseFromGate(delta);
      }
    };
    let ty = 0;
    let tx = 0;
    // startY: Y position at gesture start (touchstart). Used to measure the
    // net vertical displacement across the ENTIRE gesture, so we can detect
    // vertical intent even if the gesture began as a horizontal carousel swipe.
    let startY = 0;
    let touchIsHorizontal = false;
    let touchDirLocked    = false;
    // Set to true by touchend so blockTouch stops calling preventDefault after
    // the user lifts their finger (allows the NEXT gesture to scroll freely).
    let currentTouchEnded = false;
    const onTS = (e: TouchEvent) => {
      ty    = e.touches[0]?.clientY ?? 0;
      tx    = e.touches[0]?.clientX ?? 0;
      startY = ty;
      touchIsHorizontal  = false;
      touchDirLocked     = false;
      currentTouchEnded  = false;
    };
    const onTE = (e: TouchEvent) => {
      currentTouchEnded = true;
      // Touchend fallback: if the complete gesture had enough net vertical
      // movement, release the gate even if touchmove never went fully vertical.
      // This catches the common pattern of swiping the project carousel then
      // lifting the finger at a different vertical position.
      if (gateReleased || !portfolioGateReadyRef.current) return;
      const endY = e.changedTouches?.[0]?.clientY ?? startY;
      const netV = startY - endY; // positive = finger moved up = scroll forward
      // On mobile lower the threshold (35 → 12 px) so a gentle upward drag
      // reliably releases the gate — a fast flick already worked, slow drags didn't.
      const releaseThreshold = window.matchMedia("(pointer: coarse)").matches ? 12 : 35;
      if (Math.abs(netV) > releaseThreshold) releaseFromGate(netV * 3);
    };
    const blockTouch = (e: TouchEvent) => {
      if (gateReleased) {
        // Gate was released by a previous touchmove in this same gesture.
        // We MUST keep calling e.preventDefault() for the remaining events
        // in this touch — if we don't, iOS re-activates its native scroll
        // handling and the built-up momentum flings the page all the way back
        // through Services and About.  Stop only once the finger is lifted.
        if (!currentTouchEnded) e.preventDefault();
        return;
      }
      const currentY = e.touches[0]?.clientY ?? ty;
      const currentX = e.touches[0]?.clientX ?? tx;

      const stepX = Math.abs(currentX - tx);
      const stepY = Math.abs(currentY - ty);

      // Lock direction on first significant movement.
      if (!touchDirLocked) {
        if (stepX > 6 || stepY > 6) {
          touchIsHorizontal = stepX > stepY;
          touchDirLocked    = true;
        }
      }

      // Horizontal swipe (browsing the project carousel) — pass through freely,
      // BUT also check whether the finger has moved far enough vertically from
      // where the gesture STARTED. This covers the very common mobile pattern:
      //   1. Finger down on a card → carousel swipe begins (direction → horizontal)
      //   2. Without lifting, user pushes finger upward/downward to leave section
      // The net displacement from startY is the reliable signal here — it is
      // unaffected by how much horizontal travel happened in between.
      if (touchIsHorizontal) {
        if (portfolioGateReadyRef.current) {
          const netV = startY - currentY; // positive = upward = forward nav
          // On mobile lower the threshold (40 → 18 px) so browsing the carousel
          // then pushing upward in the same gesture reliably releases the gate.
          const hThreshold = window.matchMedia("(pointer: coarse)").matches ? 18 : 40;
          if (Math.abs(netV) > hThreshold) {
            releaseFromGate(netV * 3);
            return;
          }
        }
        tx = currentX;
        ty = currentY;
        return;
      }

      // Vertical swipe — block native scroll and measure intent.
      e.preventDefault(); // don't fight iOS inertia with scrollTo
      const delta = (ty - currentY) * 3;
      ty = currentY;
      tx = currentX;
      if (portfolioGateReadyRef.current && delta) releaseFromGate(delta);
      // No else-scrollTo: e.preventDefault() already freezes the page cleanly.
    };
    /**
     * Scrollbar sent a navigate intent while frozen.
     * fraction < current → release gate and scroll back.
     * fraction > current → release gate and open chess (if gate timer has fired).
     *
     * The fraction is expressed in the scrollbar's virtual model:
     *   totalVirtH = docMax + clientH × CHESS_VH + clientH × CRAFT_VH
     * These constants must match ScrollBar.tsx exactly.
     */
    const SB_CHESS_VH = 1.2;
    const SB_CRAFT_VH = 0.5;
    const onScrollbarNavigate = (e: Event) => {
      if (gateReleased) return;
      const fraction = (e as CustomEvent<{ fraction?: number }>).detail?.fraction;
      if (typeof fraction !== "number") return;
      const max       = document.documentElement.scrollHeight - window.innerHeight;
      const clientH   = window.innerHeight;
      // Total virtual height — same formula as ScrollBar.tsx so fractions match.
      const tv        = max + clientH * SB_CHESS_VH + clientH * SB_CRAFT_VH;
      // Where "Our Work frozen" sits in the virtual model (~0.64 on a 400vh page).
      const frozenFrac = tv > 0 ? frozenScrollRef.current / tv : 1;

      if (fraction < frozenFrac - 0.01) {
        // Backward — release immediately (no gate timer required for going back).
        releaseFromGate(-1);
        // Convert virtual fraction back to real document pixels (clamped to max).
        if (max > 0) window.scrollTo(0, Math.max(0, Math.min(max, fraction * tv)));
      } else if (fraction > frozenFrac + 0.01) {
        // Forward beyond Our Work — scrollbar drags are always intentional,
        // so bypass the 2-s gate timer and open chess immediately.
        releaseFromGate(1);
      }
    };

    window.addEventListener("wheel",               blockWheel,          { passive: false, capture: true });
    window.addEventListener("touchstart",          onTS,                { passive: true,  capture: true });
    window.addEventListener("touchend",            onTE,                { passive: true,  capture: true });
    window.addEventListener("touchcancel",         onTE,                { passive: true,  capture: true });
    window.addEventListener("touchmove",           blockTouch,          { passive: false, capture: true });
    window.addEventListener("tz-scrollbar-navigate", onScrollbarNavigate);
    return () => {
      window.removeEventListener("wheel",               blockWheel,          { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart",          onTS,                { capture: true } as EventListenerOptions);
      window.removeEventListener("touchend",            onTE,                { capture: true } as EventListenerOptions);
      window.removeEventListener("touchcancel",         onTE,                { capture: true } as EventListenerOptions);
      window.removeEventListener("touchmove",           blockTouch,          { capture: true } as EventListenerOptions);
      window.removeEventListener("tz-scrollbar-navigate", onScrollbarNavigate);
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
    // On mobile the vapour animation never plays, so there is no visual reason
    // to hold here. Skip the 2-s freeze entirely on touch devices.
    if (!window.matchMedia("(pointer: coarse)").matches) {
      servicesHoldRef.current = true;
      setServicesHolding(true);
      setTimeout(() => {
        servicesHoldRef.current = false;
        setServicesHolding(false);
      }, 2000);
    }
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
          <Portfolio active={portfolioActive && !chessUiActive && !craftActive} />
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

      {/* Craft Section — slides up from below when Chess Reveal completes */}
      <CraftSection ref={craftRef} />
    </main>
  );
}
