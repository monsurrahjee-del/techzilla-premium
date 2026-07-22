"use client";

/**
 * ServicesIntro — scroll-driven star/sunburst mask reveal.
 *
 * Phase sequence (driven by page.tsx):
 *   visible=true, vapourActive=false  → blue overlay with expanding star hole
 *   visible=true, vapourActive=true   → star at max, vapour text plays over DotGrid
 *   visible=false                     → overlay fades out
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import DotGrid            from "@/components/ui/DotGrid";
import VaporizeTextCycle, { Tag } from "@/components/ui/VaporizeTextCycle";
import styles             from "./ServicesIntro.module.css";

/* ── star geometry ─────────────────────────────────────────────────────────── */

const SPIKES      = 24;
const INNER_RATIO = 0.26; // lower = sharper spikes (matches reference images)

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < SPIKES; i++) {
    const a1 = (i / SPIKES)         * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 0.5) / SPIKES) * Math.PI * 2 - Math.PI / 2;
    pts.push(
      `${(cx + outer * Math.cos(a1)).toFixed(2)},${(cy + outer * Math.sin(a1)).toFixed(2)}`,
      `${(cx + inner * Math.cos(a2)).toFixed(2)},${(cy + inner * Math.sin(a2)).toFixed(2)}`,
    );
  }
  return pts.join(" ");
}

function maxRadius(vw: number, vh: number) {
  // Slightly beyond the corner diagonal so blue fully disappears
  return Math.sqrt((vw / 2) ** 2 + (vh / 2) ** 2) * 1.12;
}

/* ── imperative handle exposed to page.tsx ─────────────────────────────────── */

export interface ServicesIntroHandle {
  /** Advance star from 0 (tiny) to 1 (fully open) */
  setStarProgress: (p: number) => void;
}

/* ── component ─────────────────────────────────────────────────────────────── */

interface Props {
  visible: boolean;      // true during star_reveal OR vapour_active
  vapourActive: boolean; // true only during vapour_active
  onVapourComplete: () => void;
}

const ServicesIntro = forwardRef<ServicesIntroHandle, Props>(
  ({ visible, vapourActive, onVapourComplete }, ref) => {
    const polyRef   = useRef<SVGPolygonElement>(null);
    const [mounted, setMounted] = useState(false);
    const [fading,  setFading]  = useState(false);

    /* Dynamic font size — responsive to viewport, capped at 380 px.
       Mirrors the calculation that was previously in page.tsx. */
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
        // next frame: trigger show class so CSS transition fires
        const raf = requestAnimationFrame(() => setFading(false));
        return () => cancelAnimationFrame(raf);
      } else {
        setFading(true);
        const t = setTimeout(() => setMounted(false), 800);
        return () => clearTimeout(t);
      }
    }, [visible]);

    /* set tiny star on first paint */
    const initStar = () => {
      if (typeof window === "undefined" || !polyRef.current) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      polyRef.current.setAttribute("points", starPoints(vw / 2, vh / 2, 40, 11));
    };

    /* expose imperative handle */
    useImperativeHandle(ref, () => ({
      setStarProgress: (p: number) => {
        if (!polyRef.current || typeof window === "undefined") return;
        const vw = window.innerWidth, vh = window.innerHeight;
        const cx = vw / 2, cy = vh / 2;
        const outer = 40 + (maxRadius(vw, vh) - 40) * Math.min(1, p);
        const inner = outer * INNER_RATIO;
        polyRef.current.setAttribute("points", starPoints(cx, cy, outer, inner));
      },
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
        {/* ── animated DotGrid background ── */}
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
            Uses position:absolute + inset:0 on the wrapper (NOT flex) so the
            inner div's height:100% resolves to the full overlay height.
            flex + align-items:center would collapse that height to ~20 px
            (canvas minHeight), making the canvas too small to render text.
            The glow filter matches the reference at commit c2645b9. ── */}
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

        {/* ── SVG blue overlay with sunburst hole ─────────────────────────────
            At progress=1 the star covers the entire viewport, so the blue
            rect is fully masked out — visually indistinguishable from hidden.
            Fade rect opacity to 0 when vapourActive so there's no hard edge
            remaining during the text phase.
        ── */}
        <svg
          className={styles.svg}
          xmlns="http://www.w3.org/2000/svg"
          ref={(el) => { if (el) initStar(); }}
        >
          <defs>
            <mask id="star-hole-mask">
              {/* white = blue visible; black = hole (transparent) */}
              <rect width="100%" height="100%" fill="white" />
              <polygon ref={polyRef} fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="#1778a2"
            mask="url(#star-hole-mask)"
            style={{
              opacity: vapourActive ? 0 : 1,
              transition: "opacity 0.4s ease",
            }}
          />
        </svg>
      </div>
    );
  }
);

ServicesIntro.displayName = "ServicesIntro";
export default ServicesIntro;
