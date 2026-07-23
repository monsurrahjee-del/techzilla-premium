"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { AnimatePresence } from "framer-motion";
import styles from "./Craft.module.css";
/* ── Hero sub-components used in Craft ──────────────────────────────────── */
import StickerCloud     from "../Hero/StickerCloud";
import FloatingElements from "../Hero/FloatingElements";
import HeroNav          from "../Hero/HeroNav";

import ContactModal from "./ContactModal";
import GiftFlow     from "./GiftFlow";
import { LiquidEffectAnimation } from "@/components/ui/LiquidEffectAnimation";

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

  /* Nav state — same as Hero */
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [sound, setSound] = useState(false);

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

  /* Scroll-up dismisses back to ChessReveal */
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!activeRef.current) return;
      if (showContact || showGift) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta < -40) {
        e.preventDefault();
        e.stopImmediatePropagation();
        activeRef.current = false;
        setActive(false);
        slideOut();
        window.dispatchEvent(new CustomEvent("craft-section-dismiss"));
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, [showContact, showGift]);

  return (
    <>
      <div
        ref={wrapRef}
        className={styles.wrap}
        style={{ transform: "translateY(100%)", pointerEvents: "none", transition: "none" }}
        aria-hidden={!active}
      >
        {/* ── Liquid background — sole background layer ── */}
        <LiquidEffectAnimation />

        {/* ── Top Nav wrapped for dark-on-liquid colour override ── */}
        <div className={styles.craftNavWrap}>
          <HeroNav
            theme={theme}
            sound={sound}
            onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            onSoundToggle={() => setSound((s) => !s)}
            navItems={["Home", "Work", "About"]}
            craftMode={true}
          />
        </div>

        {/* ── Hero sticker cloud ── */}
        <StickerCloud />

        {/* ── Hero floating tech-pill elements ── */}
        <FloatingElements />

        {/* ── Centre: static "Craft With Taste" title + contact popover button ── */}
        <div className={styles.craftCenter}>
          {/* Contact Us button above the title — styled like "Start Tour" in Portfolio */}
          <button
            className={styles.contactPopoverBtn}
            onClick={() => setShowContact(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Contact Us
          </button>

          {/* Static "Craft With Taste" title — no mouse tracking */}
          <h1 className={styles.craftTitle}>Craft With Taste</h1>
        </div>

        {/* ── Bottom Bar ── */}
        <div className={styles.bottomBar}>
          {/* Left */}
          <div className={styles.bottomLeft}>
            <a href="mailto:hello@techzilla.dev">hello@techzilla.dev</a>
            <span>TECHZILLA &copy; 2026</span>
          </div>

          {/* Center — Gift button */}
          <div className={styles.bottomCenter}>
            <button
              className={styles.giftBtn}
              onClick={() => setShowGift(true)}
            >
              GIFT
            </button>
          </div>

          {/* Right — Socials */}
          <div className={styles.bottomRight}>
            <div className={styles.socials}>
              <a href="https://twitter.com/techzilla"  target="_blank" rel="noopener noreferrer">TWITTER/X</a>
              <a href="https://figma.com/@techzilla"   target="_blank" rel="noopener noreferrer">FIGMA</a>
              <a href="https://github.com/techzilla"   target="_blank" rel="noopener noreferrer">GITHUB</a>
            </div>
            <div className={styles.socialsRow2}>
              <a href="https://tiktok.com/@techzilla"    target="_blank" rel="noopener noreferrer">TIKTOK</a>
              <a href="https://facebook.com/techzilla"   target="_blank" rel="noopener noreferrer">FACEBOOK</a>
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
