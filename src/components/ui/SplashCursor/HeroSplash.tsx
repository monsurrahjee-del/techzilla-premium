"use client";

/**
 * HeroSplash — ties SplashCursor visibility + pause state to scroll position
 * AND to the hero's active theme.
 *
 * page.tsx dispatches "hero-section-active" on every section-change edge.
 * Hero.tsx dispatches "hero-theme-change" on every theme toggle.
 *
 * Rules:
 *   heroActive=false           → hide + pause (hero scrolled away)
 *   heroActive=true, theme=dark  → hide + pause (ThemeABuild runs a concurrent
 *                                  WebGL loop that saturates the GPU compositor
 *                                  and makes the cursor feel heavy)
 *   heroActive=true, theme=light → show + run (BuildFluid3D is throttled + low
 *                                  DPR, so coexistence is fine)
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
  const [isMobile, setIsMobile] = useState(false);
  // Pause only when the hero scrolls out of view — active in both themes.
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // WebGL fluid sim is far too heavy on mobile — skip entirely on touch devices.
    if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 767) {
      setIsMobile(true);
      return;
    }

    const onHeroSection = (e: Event) => {
      const { heroActive } = (e as CustomEvent<{ heroActive: boolean }>).detail;
      setHidden(!heroActive);
      setPaused(!heroActive);
    };

    window.addEventListener("hero-section-active", onHeroSection);
    return () => window.removeEventListener("hero-section-active", onHeroSection);
  }, []);

  // Skip WebGL fluid sim on mobile — saves major GPU/CPU
  if (isMobile) return null;

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
