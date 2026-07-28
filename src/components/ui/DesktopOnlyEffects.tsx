"use client";

/**
 * DesktopOnlyEffects — renders cursor, WebGL fluid-sim, and custom scrollbar
 * only on pointer-fine (desktop / mouse) devices.
 *
 * These effects are either meaningless (custom cursor) or too GPU-heavy
 * (SplashCursor WebGL fluid sim) on mobile/touch hardware. Gating them here
 * keeps layout.tsx a server component while avoiding any mobile overhead.
 */

import { useIsMobile } from "@/hooks/useIsMobile";
import HeroSplash  from "@/components/ui/SplashCursor/HeroSplash";
import TargetCursor from "@/components/ui/TargetCursor";
import ScrollBar   from "@/components/ui/ScrollBar/ScrollBar";

export default function DesktopOnlyEffects() {
  const isMobile = useIsMobile();
  if (isMobile) return null;
  return (
    <>
      <HeroSplash />
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
        cursorColor="#ffffff"
        cursorColorOnTarget="#B497CF"
      />
      <ScrollBar />
    </>
  );
}
