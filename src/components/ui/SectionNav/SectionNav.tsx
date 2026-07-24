"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./SectionNav.module.css";
import HeroClock from "@/components/sections/Hero/HeroClock";

interface SectionNavProps {
  /** Nav items to show in the centre (e.g. ["About", "Service", "Work", "Contact"]) */
  navItems: string[];
  /** Override the top position of the hamburger toggle (px). Default: 18 */
  topOffset?: number;
  /**
   * "light" — for sections with a light background (e.g. Craft/Contact):
   *   toggle icon and nav text render in dark/black.
   * "dark" (default) — white text, for dark-background sections.
   */
  variant?: "dark" | "light";
  /**
   * When true, the hamburger is invisible by default and only fades in
   * when the cursor enters an 80px radius around it.
   * Default: false (always visible).
   */
  proximityReveal?: boolean;
  /**
   * Called whenever the nav opens or closes.
   * Receives `true` when opening, `false` when closing.
   */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Dismiss chess / craft, then scroll to the target section.
 * Uses a dedicated "craft-section-nav-exit" event so ChessReveal's
 * onCraftDismiss does NOT re-activate chess after nav navigation.
 */
function navigateTo(item: string) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const lc  = item.toLowerCase();

  window.dispatchEvent(
    new CustomEvent("section-nav-navigate", { detail: { target: lc } }),
  );
  window.dispatchEvent(
    new CustomEvent("craft-section-nav-exit", { detail: { target: lc } }),
  );

  const doScroll = () => {
    if (lc === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (lc === "about") {
      // About is fully in view at raw = 1/3 of total scroll
      window.scrollTo({ top: max * (1 / 3), behavior: "smooth" });
    } else if (lc === "service" || lc === "services") {
      // Services is fully in view at raw = 2/3 of total scroll
      window.scrollTo({ top: max * (2 / 3), behavior: "smooth" });
    } else if (lc === "work") {
      // Portfolio is at ~99% at 0.997 — just under the portfolio-gate threshold (0.999)
      // Use instant scroll to avoid triggering the intermediate services hold
      window.scrollTo({ top: Math.round(max * 0.997) });
    } else if (lc === "contact") {
      window.dispatchEvent(new CustomEvent("craft-section-activate"));
    }
  };

  setTimeout(doScroll, 400);
}

const PROXIMITY_PX = 80;

export default function SectionNav({
  navItems,
  topOffset       = 18,
  variant         = "dark",
  proximityReveal = false,
  onOpenChange,
}: SectionNavProps) {
  const [open,  setOpen]  = useState(false);
  const [near,  setNear]  = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sound, setSound] = useState(false);

  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  // Proximity detection — only active when proximityReveal is true
  const onPointerMove = useCallback((e: PointerEvent) => {
    const btn = toggleRef.current;
    if (!btn) return;
    const r  = btn.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    setNear(Math.sqrt(dx * dx + dy * dy) < PROXIMITY_PX);
  }, []);

  useEffect(() => {
    if (!proximityReveal) return;
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [proximityReveal, onPointerMove]);

  // When proximityReveal is off the button is always visible;
  // when it's on, visibility is driven by nearness or open state.
  const isVisible = !proximityReveal || near || open;

  const handleNavClick = (item: string) => { close(); navigateTo(item); };
  const handleLogoClick = () => { close(); navigateTo("home"); };

  const v = variant;

  return (
    <>
      {/* ── Hamburger / X toggle ── */}
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        data-variant={v}
        data-visible={isVisible ? "true" : "false"}
        style={{ "--section-nav-toggle-top": `${topOffset}px` } as React.CSSProperties}
        onClick={() => {
          const next = !open;
          setOpen(next);
          onOpenChange?.(next);
        }}
        aria-label={open ? "Close navigation" : "Open navigation"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg
              key="x"
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0,   opacity: 1 }}
              exit={{   rotate:  45, opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <line x1="2"  y1="2"  x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="2"  x2="2"  y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </motion.svg>
          ) : (
            <motion.svg
              key="menu"
              width="16" height="12" viewBox="0 0 16 12" fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{   opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <line x1="0" y1="1"  x2="16" y2="1"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="6"  x2="16" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* ── Nav bar ── */}
            <motion.nav
              className={styles.navBar}
              data-variant={v}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1,  y: 0   }}
              exit={{   opacity: 0,  y: -10  }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={styles.navLeft}>
                <button
                  type="button"
                  className={styles.navLogo}
                  onClick={handleLogoClick}
                  aria-label="Go to home"
                >
                  TECHZILLA
                </button>
              </div>

              <div className={styles.navCenter}>
                {navItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={styles.navLink}
                    onClick={() => handleNavClick(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className={styles.navRight}>
                <button
                  type="button"
                  className={styles.navToggle}
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  aria-label="Toggle theme"
                >
                  THEME<span>[{theme === "dark" ? "A" : "B"}]</span>
                </button>
                <button
                  type="button"
                  className={styles.navToggle}
                  onClick={() => setSound((s) => !s)}
                  aria-label="Toggle sound"
                >
                  SOUND<span>[{sound ? "•" : "|"}]</span>
                </button>
                <HeroClock />
              </div>
            </motion.nav>

            {/* ── Backdrop — click to close ── */}
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{   opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
