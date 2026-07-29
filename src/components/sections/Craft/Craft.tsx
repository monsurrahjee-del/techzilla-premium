"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
// Note: useState kept for showContact / showGift modals
import { AnimatePresence } from "framer-motion";
import styles from "./Craft.module.css";

import ContactModal from "./ContactModal";
import GiftFlow     from "./GiftFlow";
import { LiquidEffectAnimation } from "@/components/ui/LiquidEffectAnimation";
import SectionNav from "@/components/ui/SectionNav";

export interface CraftSectionHandle {
  activate:   () => void;
  deactivate: () => void;
}

/* ── Component ───────────────────────────────────────────────────────────── */
const CraftSection = forwardRef<CraftSectionHandle>((_, ref) => {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [active,      setActive]      = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showGift,    setShowGift]    = useState(false);
  const activeRef = useRef(false);


  const slideIn = () => {
    const w = wrapRef.current;
    if (!w) return;
    w.style.transition   = "transform 0.70s cubic-bezier(0.22,1,0.36,1)";
    w.style.transform    = "translateY(0%)";
    w.style.pointerEvents = "all";
  };

  const slideOut = () => {
    const w = wrapRef.current;
    if (!w) return;
    w.style.transition   = "transform 0.55s cubic-bezier(0.32,0,0.12,1)";
    w.style.transform    = "translateY(100%)";
    w.style.pointerEvents = "none";
  };

  useImperativeHandle(ref, () => ({
    activate() {
      if (activeRef.current) return;
      activeRef.current = true;
      setActive(true);
      slideIn();
    },
    deactivate() {
      activeRef.current = false;
      setActive(false);
      slideOut();
    },
  }));

  /* Listen for custom event from ChessReveal */
  useEffect(() => {
    const onActivate = () => {
      if (activeRef.current) return;
      activeRef.current = true;
      setActive(true);
      slideIn();
    };
    window.addEventListener("craft-section-activate", onActivate);
    return () => window.removeEventListener("craft-section-activate", onActivate);
  }, []);

  /* Listen for external dismiss (e.g. scrollbar dragging backward from Craft) */
  useEffect(() => {
    const onExternalDismiss = () => {
      if (!activeRef.current) return; // already dismissed (e.g. from onWheel)
      activeRef.current = false;
      setActive(false);
      slideOut();
      // craft-section-dismiss was already dispatched by the caller — don't re-fire
    };
    window.addEventListener("craft-section-dismiss", onExternalDismiss);
    return () => window.removeEventListener("craft-section-dismiss", onExternalDismiss);
  }, []);

  /**
   * Section-nav navigation: Craft slides out WITHOUT firing "craft-section-dismiss".
   * "craft-section-dismiss" would cause ChessReveal's onCraftDismiss to re-activate
   * chess (s.active = true) and block the subsequent window.scrollTo call.
   * SectionNav dispatches the dedicated "craft-section-nav-exit" event instead.
   */
  useEffect(() => {
    const onNavExit = (e: Event) => {
      const target = (e as CustomEvent<{ target?: string }>).detail?.target;
      if (!activeRef.current) return;
      if (target === "contact") return; // re-opening contact — don't dismiss
      activeRef.current = false;
      setActive(false);
      slideOut();
      // Do NOT dispatch craft-section-dismiss — that would re-activate ChessReveal.
    };
    window.addEventListener("craft-section-nav-exit", onNavExit);
    return () => window.removeEventListener("craft-section-nav-exit", onNavExit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Scroll-up / swipe-up dismisses back to ChessReveal */
  useEffect(() => {
    const dismiss = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      activeRef.current = false;
      setActive(false);
      slideOut();
      window.dispatchEvent(new CustomEvent("craft-section-dismiss"));
    };

    const onWheel = (e: WheelEvent) => {
      if (!activeRef.current) return;
      if (showContact || showGift) return;
      // Normalise across deltaMode (0=px, 1=lines, 2=pages)
      const multiplier = e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? 400 : 1;
      const deltaY = e.deltaY * multiplier;
      const deltaX = e.deltaX * multiplier;
      const delta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
      if (delta < 0) dismiss(e);
    };

    // Mobile: swipe DOWN (finger moving toward bottom) = go back to previous section.
    // We track both the cumulative direction and per-move velocity so even a slow
    // deliberate drag reliably triggers dismiss, while accidental tiny movements don't.
    let touchStartY  = 0;
    let lastTouchY   = 0;
    let dismissed    = false;
    let touchActive  = false;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY  = e.touches[0]?.clientY ?? 0;
      lastTouchY   = touchStartY;
      dismissed    = false;
      touchActive  = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current) return;
      if (showContact || showGift) return;
      // Claim the gesture immediately so iOS cannot lock it to native page scroll
      // before we measure the direction. Without this, the first touchmove that
      // doesn't call preventDefault can cause Safari to decide this is a page
      // scroll and swallow the remaining events before the threshold is reached.
      e.preventDefault();
      if (dismissed) return;

      const currentY = e.touches[0]?.clientY ?? lastTouchY;
      // Net displacement from gesture start (positive = finger moved down = going back)
      const netDy    = currentY - touchStartY;
      // Per-frame velocity (positive = finger moving down this frame)
      const frameDy  = currentY - lastTouchY;
      lastTouchY     = currentY;

      // Trigger dismiss when:
      //   a) net downward drag exceeds 8 px (deliberate swipe), OR
      //   b) net downward drag exceeds 4 px AND the most recent frame is also
      //      moving down (velocity confirmation — catches fast flick gestures
      //      where the finger barely travels before lifting).
      if (netDy > 8 || (netDy > 4 && frameDy > 0)) {
        dismissed = true;
        dismiss(e);
      }
    };

    const onTouchEnd = () => {
      // If the finger lifts without triggering dismiss, reset state cleanly.
      touchActive = false;
    };

    // Suppress unused-variable warning — touchActive is used as a guard in future
    void touchActive;

    window.addEventListener("wheel",      onWheel,      { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true,  capture: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: false, capture: true });
    window.addEventListener("touchend",   onTouchEnd,   { passive: true });
    window.addEventListener("touchcancel",onTouchEnd,   { passive: true });
    return () => {
      window.removeEventListener("wheel",       onWheel,      { capture: true } as EventListenerOptions);
      window.removeEventListener("touchstart",  onTouchStart, { capture: true } as EventListenerOptions);
      window.removeEventListener("touchmove",   onTouchMove,  { capture: true } as EventListenerOptions);
      window.removeEventListener("touchend",    onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [showContact, showGift]);

  return (
    <>
      <div
        ref={wrapRef}
        className={styles.wrap}
        style={{ transform: "translateY(100%)", pointerEvents: "none", transition: "none" }}
        aria-hidden={!active}
      >
        {/* ── Section-level hamburger nav — light variant for Craft's background ── */}
        <SectionNav navItems={["About", "Service", "Work"]} variant="light" />

        {/* ── Liquid background — sole background layer ── */}
        <LiquidEffectAnimation />

        {/* ── Centre: static "Craft With Taste" title + contact popover button ── */}
        <div className={styles.craftCenter}>
          {/* Contact Us button above the title — styled like "Start Tour" in Portfolio */}
          <button
            className={`${styles.contactPopoverBtn} cursor-target`}
            onClick={() => setShowContact(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Contact Us
          </button>

          {/* Static "Craft With Taste" title — no mouse tracking */}
          <h1 className={`${styles.craftTitle} cursor-target`}>Craft With Taste</h1>
        </div>

        {/* ── Bottom Bar ── */}
        <div className={styles.bottomBar}>
          {/* Left */}
          <div className={styles.bottomLeft}>
            <a href="mailto:Techzilla.web@gmail.com" className="cursor-target">hello@techzilla.dev</a>
            <span>TECHZILLA &copy; 2026</span>
          </div>

          {/* Center — Gift button */}
          <div className={styles.bottomCenter}>
            <button
              className={`${styles.giftBtn} cursor-target`}
              onClick={() => setShowGift(true)}
              aria-label="Open gift"
            >
              <span className={styles.giftLabel}>GIFT</span>
              <svg
                className={styles.giftIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" />
                <path d="M2 7h20v5H2z" />
                <path d="M12 7v14" />
                <path d="M12 7H7.5a2.5 2.5 0 1 1 2.5-2.5C10 6 12 7 12 7Z" />
                <path d="M12 7h4.5A2.5 2.5 0 1 0 14 4.5C14 6 12 7 12 7Z" />
              </svg>
            </button>
          </div>

          {/* Right — Socials */}
          <div className={styles.bottomRight}>
            <div className={styles.socials}>
              <a href="https://twitter.com/techzilla"  target="_blank" rel="noopener noreferrer" className="cursor-target">TWITTER/X</a>
              <a href="https://figma.com/@techzilla"   target="_blank" rel="noopener noreferrer" className="cursor-target">FIGMA</a>
              <a href="https://github.com/techzilla"   target="_blank" rel="noopener noreferrer" className="cursor-target">GITHUB</a>
            </div>
            <div className={styles.socialsRow2}>
              <a href="https://tiktok.com/@techzilla"    target="_blank" rel="noopener noreferrer" className="cursor-target">TIKTOK</a>
              <a href="https://facebook.com/techzilla"   target="_blank" rel="noopener noreferrer" className="cursor-target">FACEBOOK</a>
            </div>
            <div className={styles.globeIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showContact && <ContactModal key="contact-modal" onClose={() => setShowContact(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showGift && <GiftFlow key="gift-modal" onClose={() => setShowGift(false)} />}
      </AnimatePresence>
    </>
  );
});

CraftSection.displayName = "CraftSection";
export default CraftSection;
