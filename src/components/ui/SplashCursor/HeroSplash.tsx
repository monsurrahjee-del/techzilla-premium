"use client";

/**
 * HeroSplash — ties SplashCursor visibility + pause state to scroll position
 * AND to the hero's active theme.
 *
 * page.tsx dispatches "hero-section-active" on every section-change edge.
 * Hero.tsx dispatches "hero-theme-change" on every theme toggle.
 *
 * Rules:
 *   heroActive=false          → hide + pause (hero scrolled away)
 *   heroActive=true, theme=light → hide + pause (BuildFluid3D is running;
 *                                  two concurrent WebGL loops saturate the GPU
 *                                  and make the cursor feel heavy)
 *   heroActive=true, theme=dark  → show + run (only the fluid sim runs)
 *
 * Key design decisions:
 * - opacity / hidden is controlled via SplashCursor's OWN position:fixed div,
 *   not a wrapper element (zero-size wrappers don't reliably propagate opacity
 *   to position:fixed children in all browsers).
 * - render() keeps firing even when paused so the WebGL compositing layer is
 *   never discarded by the browser (blank-canvas-on-resume bug).
 */

import { useEffect, useRef, useState } from "react";
import SplashCursor from "./index";

export default function HeroSplash() {
  // Default: hero starts active, theme starts "light" → begin paused so the
  // fluid sim doesn't compete with BuildFluid3D on the very first frame.
  const [hidden, setHidden] = useState(true);
  const [paused, setPaused] = useState(true);

  const heroActiveRef  = useRef(true);
  const themeIsLightRef = useRef(true); // Hero default theme is "light"

  useEffect(() => {
    const update = () => {
      const shouldPause = !heroActiveRef.current || themeIsLightRef.current;
      setHidden(shouldPause);
      setPaused(shouldPause);
    };

    const onHeroSection = (e: Event) => {
      heroActiveRef.current = (e as CustomEvent<{ heroActive: boolean }>).detail.heroActive;
      update();
    };
    const onThemeChange = (e: Event) => {
      themeIsLightRef.current =
        (e as CustomEvent<{ theme: string }>).detail.theme === "light";
      update();
    };

    window.addEventListener("hero-section-active", onHeroSection);
    window.addEventListener("hero-theme-change",   onThemeChange);
    return () => {
      window.removeEventListener("hero-section-active", onHeroSection);
      window.removeEventListener("hero-theme-change",   onThemeChange);
    };
  }, []);

  return (
    <SplashCursor
      hidden={hidden}
      paused={paused}
      // Reduced from default 1440 → 512 to avoid GPU contention that makes
      // the custom cursor feel laggy (compositor thread shares the GPU with
      // the WebGL fluid sim — a 1440-resolution dye texture was eating all
      // the compositor budget on every frame).
      DYE_RESOLUTION={512}
      SIM_RESOLUTION={64}
      DENSITY_DISSIPATION={3.5}
      VELOCITY_DISSIPATION={2}
      PRESSURE={0.1}
      PRESSURE_ITERATIONS={10}
      CURL={3}
      SPLAT_RADIUS={0.2}
      SPLAT_FORCE={6000}
      COLOR_UPDATE_SPEED={10}
      SHADING
      RAINBOW_MODE={false}
      COLOR="#A855F7"
    />
  );
}
