"use client";

import { useEffect } from "react";

interface SectionRedirectProps {
  section: string;
}

export default function SectionRedirect({ section }: SectionRedirectProps) {
  useEffect(() => {
    // Redirect to the main page with the section hash
    window.location.replace(`/#${section}`);
  }, [section]);

  // Render a minimal branded loader while redirecting
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#030508",
        color: "#ffffff",
        fontFamily: "sans-serif",
        gap: "16px",
      }}
    >
      <div
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          background: "linear-gradient(90deg, #4D7CFE, #A855F7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        TECHZILLA INC
      </div>
      <div style={{ color: "#6b7280", fontSize: "0.9rem", letterSpacing: "0.1em" }}>
        Redirecting…
      </div>
    </div>
  );
}
