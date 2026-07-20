"use client";

/**
 * ServiceHeading — plain CSS heading, replaces the previous Three.js canvas.
 *
 * The Three.js approach had two unfixable problems in this scroll-animation
 * layout:
 *   1. frameloop="never"→"always" transitions left the canvas blank because
 *      R3F can't reliably restart its render loop from "never".
 *   2. frameloop="always" caused R3F to call getBoundingClientRect() while
 *      the parent section was CSS-scaled near-zero (during the About scroll
 *      phase), permanently shrinking the canvas so text appeared tiny on
 *      navigate-back.
 *
 * A CSS heading has neither problem: it renders identically every time,
 * requires no WebGL context, and its size is immune to CSS transforms on
 * ancestor elements.
 *
 * Target size: noticeably larger than the "What We Do" micro-label (0.65 rem)
 * but compact — roughly 2× its size so it reads as a clear section heading
 * without dominating the layout.
 */

interface Props {
  accentColor?: string;
  /** Container height in px — kept for API compatibility with Services.tsx */
  height?: number;
}

export default function ServiceThreeHeading({
  accentColor = "#5227FF",
  height = 90,
}: Props) {
  return (
    <div
      style={{
        width: "100%",
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <h2
        style={{
          /* ~2× the "What We Do" label (0.65 rem), a little bigger on wide screens */
          fontSize: "clamp(1.15rem, 2.1vw, 1.55rem)",
          color: "#f0f0f8",
          fontFamily: "var(--font-display, sans-serif)",
          fontWeight: 800,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          margin: 0,
          /* Subtle accent glow tracks the active service card colour */
          textShadow: `0 0 22px ${accentColor}55, 0 1px 6px rgba(0,0,0,0.45)`,
          transition: "text-shadow 0.4s ease",
        }}
      >
        Our Services
      </h2>
    </div>
  );
}
