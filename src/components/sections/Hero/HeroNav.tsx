"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Hero.module.css";
import HeroClock from "./HeroClock";
import { useLoaded } from "@/hooks/useLoaded";

const DEFAULT_NAV_ITEMS = ["Home", "Work", "Contact"] as const;

interface HeroNavProps {
  theme: "dark" | "light";
  sound: boolean;
  onThemeToggle: () => void;
  onSoundToggle: () => void;
  navItems?: string[];
  craftMode?: boolean; // hides THEME/SOUND, centers nav items
}

export default function HeroNav({
  theme,
  sound,
  onThemeToggle,
  onSoundToggle,
  navItems = [...DEFAULT_NAV_ITEMS],
  craftMode = false,
}: HeroNavProps) {
  const loaded = useLoaded();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string>("Home");

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <motion.nav
        className={styles.nav}
        initial={{ opacity: 0, y: -44 }}
        animate={loaded ? { opacity: 1, y: 0 } : { opacity: 0, y: -44 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.navLeft}>
          <span className={`${styles.navLogo} cursor-target`}>TECHZILLA</span>
        </div>

        <div
          className={styles.navCenter}
          style={craftMode ? { position: "absolute", left: "50%", transform: "translateX(-50%)" } : undefined}
        >
          {navItems.filter(i => i !== "Home").map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="cursor-target"
              onClick={(e) => {
                e.preventDefault();
                if (item === "Work") {
                  const max = document.documentElement.scrollHeight - window.innerHeight;
                  window.scrollTo({ top: max * 0.85, behavior: "smooth" });
                } else if (item === "Contact") {
                  window.dispatchEvent(new CustomEvent("craft-section-activate"));
                }
              }}
            >
              {item}
            </a>
          ))}
        </div>

        <div className={styles.navRight}>
          {!craftMode && (
            <>
              <button
                type="button"
                className={`${styles.navToggle} cursor-target`}
                onClick={onThemeToggle}
                aria-label="Toggle theme"
              >
                THEME<span>[{theme === "dark" ? "A" : "B"}]</span>
              </button>
              <button
                type="button"
                className={`${styles.navToggle} cursor-target`}
                onClick={onSoundToggle}
                aria-label="Toggle sound"
              >
                SOUND<span>[{sound ? "•" : "|"}]</span>
              </button>
            </>
          )}
          <HeroClock />
        </div>

        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <span />
          <span />
        </button>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className={styles.mobileMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.mobileMenuNav}>
              <span className={styles.navLogo}>TECHZILLA</span>
              <button
                type="button"
                className={styles.menuClose}
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className={styles.mobileMenuBody}>
              <nav className={styles.mobileMenuLinks}>
                {navItems.map((item, i) => (
                  <motion.div
                    key={item}
                    className={styles.mobileMenuLinkRow}
                    onPointerEnter={() => setActiveItem(item)}
                    initial={{ x: -28, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      delay: 0.06 + i * 0.07,
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <span
                      className={`${styles.mobileMenuBadge} ${activeItem === item ? styles.mobileMenuBadgeVisible : ""}`}
                    >
                      T.
                    </span>
                    <a
                      href={item === "Home" ? "#" : `#${item.toLowerCase()}`}
                      className={styles.mobileMenuLink}
                      onClick={(e) => {
                        setMenuOpen(false);
                        if (item === "Work") {
                          e.preventDefault();
                          const max = document.documentElement.scrollHeight - window.innerHeight;
                          window.scrollTo({ top: max * 0.85, behavior: "smooth" });
                        } else if (item === "Contact") {
                          e.preventDefault();
                          window.dispatchEvent(new CustomEvent("craft-section-activate"));
                        }
                      }}
                    >
                      {item.toUpperCase()}
                    </a>
                  </motion.div>
                ))}
              </nav>
            </div>

            <div className={styles.mobileMenuBottom}>
              <HeroClock />
              <button type="button" className={styles.navToggle} onClick={onThemeToggle}>
                THEME<span>[{theme === "dark" ? "A" : "B"}]</span>
              </button>
              <button type="button" className={styles.navToggle} onClick={onSoundToggle}>
                SOUND<span>[{sound ? "•" : "·"}]</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
