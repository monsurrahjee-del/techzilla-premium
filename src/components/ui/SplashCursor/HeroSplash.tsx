"use client";

/**
 * HeroSplash — ties SplashCursor visibility + pause state to scroll position.
 *
 * page.tsx dispatches a "hero-section-active" CustomEvent from driveFrame()
 * on every section-change edge:
 *   { detail: { heroActive: true  } }  → Hero is primary  → show + run sim
 *   { detail: { heroActive: false } }  → About/Services   → hide + pause sim
 *
 * Key design decisions:
 * - opacity / hidden is controlled via SplashCursor's OWN position:fixed div,
 *   not a wrapper element (zero-size wrappers don't reliably propagate opacity
 *   to position:fixed children in all browsers).
 * - render() keeps firing even when paused so the WebGL compositing layer is
 *   never discarded by the browser (blank-canvas-on-resume bug).
 */

import { useEffect, useState } from "react";
import SplashCursor from "./index";

export default function HeroSplash() {
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onHeroSection = (e: Event) => {
      const { heroActive } = (e as CustomEvent<{ heroActive: boolean }>).detail;
      setHidden(!heroActive);
      setPaused(!heroActive);
    };

    window.addEventListener("hero-section-active", onHeroSection);
    return () => window.removeEventListener("hero-section-active", onHeroSection);
  }, []);

  return (
    <SplashCursor
      hidden={hidden}
      paused={paused}
      DENSITY_DISSIPATION={3.5}
      VELOCITY_DISSIPATION={2}
      PRESSURE={0.1}
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
