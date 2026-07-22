"use client";

/**
 * ServicesIntro — DotGrid background + VaporizeTextCycle word reveal.
 *
 * Phase sequence (driven by page.tsx):
 *   visible=true, vapourActive=false  → dark DotGrid overlay fades in
 *   visible=true, vapourActive=true   → glowing VaporizeTextCycle text plays
 *   visible=false                     → overlay fades out
 */

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
import DotGrid            from "@/components/ui/DotGrid";
import VaporizeTextCycle, { Tag } from "@/components/ui/VaporizeTextCycle";
import styles             from "./ServicesIntro.module.css";

/* ── imperative handle (kept for API compat with page.tsx ref) ─────────────── */

export interface ServicesIntroHandle {
  /** No-op — star mask removed; kept so page.tsx ref calls are harmless. */
  setStarProgress: (p: number) => void;
}

/* ── component ─────────────────────────────────────────────────────────────── */

interface Props {
  visible: boolean;      // true while overlay should be on screen
  vapourActive: boolean; // true when text should play
  onVapourComplete: () => void;
}

const ServicesIntro = forwardRef<ServicesIntroHandle, Props>(
  ({ visible, vapourActive, onVapourComplete }, ref) => {
    const [mounted, setMounted] = useState(false);
    const [fading,  setFading]  = useState(false);

    /* Dynamic font size — responsive to viewport, capped at 380 px. */
    const [fontSize, setFontSize] = useState("240px");
    useEffect(() => {
      const calc = () => {
        const byWidth  = Math.floor((window.innerWidth  * 0.8) / (8 * 0.52));
        const byHeight = Math.floor(window.innerHeight  * 0.38);
        setFontSize(`${Math.min(byWidth, byHeight, 380)}px`);
      };
      calc();
      window.addEventListener("resize", calc);
      return () => window.removeEventListener("resize", calc);
    }, []);

    /* mount / unmount with fade */
    useEffect(() => {
      if (visible) {
        setMounted(true);
        const raf = requestAnimationFrame(() => setFading(false));
        return () => cancelAnimationFrame(raf);
      } else {
        setFading(true);
        const t = setTimeout(() => setMounted(false), 800);
        return () => clearTimeout(t);
      }
    }, [visible]);

    /* no-op handle — page.tsx may call setStarProgress; just ignore it */
    useImperativeHandle(ref, () => ({
      setStarProgress: () => { /* star mask removed */ },
    }));

    if (!mounted) return null;

    return (
      <div
        className={[
          styles.overlay,
          !fading ? styles.show : styles.fade,
        ].join(" ")}
        aria-hidden="true"
      >
        {/* ── DotGrid background fills the full overlay ── */}
        <div className={styles.bg}>
          <DotGrid
            dotSize={4}
            gap={22}
            baseColor="#07112e"
            activeColor="#5227FF"
            proximity={130}
            speedTrigger={100}
            shockRadius={260}
            shockStrength={5}
            resistance={750}
            returnDuration={1.5}
          />
        </div>

        {/* ── VaporizeTextCycle — canvas-based glowing word-by-word reveal ──
            Wrapper uses position:absolute + inset:0 (NOT flex) so the inner
            div's height:100% resolves to the full overlay height.
            flex + align-items:center collapses that to ~20 px (canvas
            minHeight), making the canvas too small to render anything.
            Glow filter matches the reference from commit c2645b9. ── */}
        {vapourActive && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              pointerEvents: "none",
              filter:
                "brightness(2.6) " +
                "drop-shadow(0 0 12px rgba(255,255,255,1)) " +
                "drop-shadow(0 0 50px rgba(255,255,255,0.85)) " +
                "drop-shadow(0 0 100px rgba(255,255,255,0.6))",
            }}
          >
            <VaporizeTextCycle
              texts={["The", "Services", "We", "Provide"]}
              font={{
                fontFamily: "Geist, system-ui, sans-serif",
                fontSize,
                fontWeight: 900,
              }}
              color="rgb(255, 255, 255)"
              spread={4}
              density={2}
              animation={{ vaporizeDuration: 1.0, fadeInDuration: 0.5, waitDuration: 0.3 }}
              direction="left-to-right"
              alignment="center"
              tag={Tag.H1}
              forceActive={true}
              onComplete={onVapourComplete}
            />
          </div>
        )}
      </div>
    );
  }
);

ServicesIntro.displayName = "ServicesIntro";
export default ServicesIntro;
