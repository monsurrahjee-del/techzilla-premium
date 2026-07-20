"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SiteNav.module.css";

export default function SiteNav() {
  const navRef  = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<"A" | "B">("B");
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const nav     = navRef.current;
    const section = document.getElementById("about");
    if (!nav || !section) return;

    // IntersectionObserver — show when about section enters viewport,
    // hide the INSTANT it leaves (threshold:0 = any pixel out = hide).
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          nav.style.transform  = "translateY(0)";
          nav.style.opacity    = "1";
          nav.style.pointerEvents = "auto";
        } else {
          nav.style.transform  = "translateY(-100%)";
          nav.style.opacity    = "0";
          nav.style.pointerEvents = "none";
        }
      },
      { threshold: 0 }   // fires on any intersection change
    );

    io.observe(section);
    return () => io.disconnect();
  }, []);

  return (
    <nav ref={navRef} className={styles.nav} aria-label="Site navigation">
      <span className={styles.logo}>TECHZILLA</span>

      <div className={styles.links}>
        <a href="#about"    className="cursor-target">Work</a>
        <a href="#projects" className="cursor-target">Contact</a>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.toggle} cursor-target`}
          onClick={() => setTheme(t => t === "A" ? "B" : "A")}
        >
          THEME<span>[{theme}]</span>
        </button>
        <button
          type="button"
          className={`${styles.toggle} cursor-target`}
          onClick={() => setSound(s => !s)}
        >
          SOUND<span>[{sound ? "•" : "-"}]</span>
        </button>
      </div>
    </nav>
  );
}
