import { ImageResponse } from "next/og";

export const alt = "Techzilla Inc — Where Design & Engineering Intersects";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#030508",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Blue radial glow — left */}
        <div
          style={{
            position: "absolute",
            left: -80,
            top: "50%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(77,124,254,0.30) 0%, transparent 70%)",
            transform: "translateY(-50%)",
            display: "flex",
          }}
        />
        {/* Purple radial glow — right */}
        <div
          style={{
            position: "absolute",
            right: -80,
            top: "50%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)",
            transform: "translateY(-50%)",
            display: "flex",
          }}
        />
        {/* Top line accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background:
              "linear-gradient(90deg, transparent 0%, #4D7CFE 30%, #A855F7 70%, transparent 100%)",
            display: "flex",
          }}
        />
        {/* Bottom line accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background:
              "linear-gradient(90deg, transparent 0%, #4D7CFE 30%, #A855F7 70%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
            zIndex: 1,
            padding: "0 100px",
            textAlign: "center",
          }}
        >
          {/* Studio label */}
          <div
            style={{
              color: "#4D7CFE",
              fontSize: 18,
              letterSpacing: 7,
              fontWeight: 600,
              fontFamily: "sans-serif",
              marginBottom: 24,
              textTransform: "uppercase",
            }}
          >
            Independent Design-Engineering Studio
          </div>

          {/* Main title */}
          <div
            style={{
              color: "#ffffff",
              fontSize: 100,
              fontWeight: 900,
              lineHeight: 0.95,
              fontFamily: "sans-serif",
              letterSpacing: -3,
              marginBottom: 28,
              textShadow: "0 0 60px rgba(77,124,254,0.5)",
            }}
          >
            TECHZILLA INC
          </div>

          {/* Divider */}
          <div
            style={{
              width: 120,
              height: 2,
              background: "linear-gradient(90deg, #4D7CFE, #A855F7)",
              borderRadius: 2,
              marginBottom: 28,
              display: "flex",
            }}
          />

          {/* Tagline */}
          <div
            style={{
              color: "#c4b5fd",
              fontSize: 32,
              fontWeight: 300,
              fontFamily: "sans-serif",
              letterSpacing: 0.5,
              marginBottom: 36,
            }}
          >
            Where Design &amp; Engineering Intersects
          </div>

          {/* URL */}
          <div
            style={{
              color: "#4D7CFE",
              fontSize: 20,
              fontFamily: "sans-serif",
              letterSpacing: 4,
              opacity: 0.9,
            }}
          >
            techzilla.studio
          </div>
        </div>

        {/* Corner brackets decoration */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 40,
            width: 40,
            height: 40,
            borderTop: "2px solid rgba(77,124,254,0.6)",
            borderLeft: "2px solid rgba(77,124,254,0.6)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 40,
            width: 40,
            height: 40,
            borderTop: "2px solid rgba(77,124,254,0.6)",
            borderRight: "2px solid rgba(77,124,254,0.6)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 40,
            width: 40,
            height: 40,
            borderBottom: "2px solid rgba(168,85,247,0.6)",
            borderLeft: "2px solid rgba(168,85,247,0.6)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 40,
            width: 40,
            height: 40,
            borderBottom: "2px solid rgba(168,85,247,0.6)",
            borderRight: "2px solid rgba(168,85,247,0.6)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
