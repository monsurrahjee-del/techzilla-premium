"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./SectionNav.module.css";
import HeroClock from "@/components/sections/Hero/HeroClock";

interface SectionNavProps {
  /** Nav items to show in the center (e.g. ["About", "Service", "Work", "Contact"]) */
  navItems: string[];
  /** Override the top position of the hamburger toggle (px). Useful when another
   *  button already sits at the default top-right position. Default: 18 */
  topOffset?: number;
}

/**
 * Navigates to the given section, dispatching a "section-nav-navigate" custom
 * event first so that ChessReveal and CraftSection can dismiss themselves.
 */
function navigateTo(item: string) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const lc = item.toLowerCase();

  // Signal ChessReveal / CraftSection to dismiss so navigation is not blocked
  window.dispatchEvent(
    new CustomEvent("section-nav-navigate", { detail: { target: lc } }),
  );

  const doScroll = () => {
    if (lc === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (lc === "about") {
      window.scrollTo({ top: max * 0.25, behavior: "smooth" });
    } else if (lc === "service" || lc === "services") {
      window.scrollTo({ top: max * 0.55, behavior: "smooth" });
    } else if (lc === "work") {
      window.scrollTo({ top: max * 0.97, behavior: "smooth" });
    } else if (lc === "contact") {
      window.dispatchEvent(new CustomEvent("craft-section-activate"));
    }
  };

  // Small delay — gives ChessReveal / Craft time to release event capture
  setTimeout(doScroll, 150);
}

export default function SectionNav({ navItems, topOffset = 18 }: SectionNavProps) {
  const [open, setOpen]   = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sound, setSound] = useState(false);

  const close = () => setOpen(false);

  const handleNavClick = (item: string) => {
    close();
    navigateTo(item);
  };

  return (
    <>
      {/* ── Hamburger / X toggle ── */}
      <button
        type="button"
        className={styles.toggle}
        style={{ "--section-nav-toggle-top": `${topOffset}px` } as React.CSSProperties}
        onClick={() => setOpen((o) => !o)}
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
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1,  y: 0 }}
              exit={{   opacity: 0,  y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={styles.navLeft}>
                <span className={styles.navLogo}>TECHZILLA</span>
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
