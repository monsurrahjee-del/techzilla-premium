"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Craft.module.css";
import PlayingCard from "./PlayingCard";

// Joker is always index 0 (the default starting card).
// The 10 selectable characters follow at index 1-10.
const CHARACTERS = [
  { name: "Joker",        file: "/characters/joker.png",        label: "Techzilla Joker" },
  { name: "Developer",    file: "/characters/developer.png",    label: "Software Dev" },
  { name: "Doctor",       file: "/characters/doctor.png",       label: "Healthcare" },
  { name: "Designer",     file: "/characters/designer.png",     label: "UI/UX Design" },
  { name: "Chef",         file: "/characters/chef.png",         label: "Food & Beverage" },
  { name: "Teacher",      file: "/characters/teacher.png",      label: "Education" },
  { name: "Musician",     file: "/characters/musician.png",     label: "Music & Arts" },
  { name: "Astronaut",    file: "/characters/astronaut.png",    label: "Exploration" },
  { name: "Scientist",    file: "/characters/scientist.png",    label: "Research" },
  { name: "Entrepreneur", file: "/characters/entrepreneur.png", label: "Business" },
  { name: "Artist",       file: "/characters/artist.png",       label: "Creative Arts" },
];

function generateDiscountCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `TZ-${seg(4)}-${seg(4)}`;
}

interface GiftCardDisplayProps {
  businessName: string;
  discountCode: string;
  charIndex: number;
  onCharChange: (i: number) => void;
  onClose: () => void;
}

function GiftCardDisplay({
  businessName,
  discountCode,
  charIndex,
  onCharChange,
  onClose,
}: GiftCardDisplayProps) {
  const [clicked, setClicked] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const char = CHARACTERS[charIndex];

  const handleCardClick = () => setClicked((p) => !p);
  const handlePrev = () =>
    onCharChange((charIndex - 1 + CHARACTERS.length) % CHARACTERS.length);
  const handleNext = () =>
    onCharChange((charIndex + 1) % CHARACTERS.length);

  // Download: renders everything (including the character image) onto a 2× canvas
  const handleDownload = useCallback(() => {
    const W = 400;
    const H = Math.round(W * (16 / 9));
    const color = clicked ? "#f12b30" : "#3662f4";

    const drawCard = (charImg: HTMLImageElement | null) => {
      const canvas = document.createElement("canvas");
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(2, 2);

      // Black card background
      ctx.fillStyle = "#000";
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(0, 0, W, H, 22);
      } else {
        ctx.rect(0, 0, W, H);
      }
      ctx.fill();

      // ── Dot-matrix shining effect (mimics the CanvasRevealEffect) ──
      const dotColor = clicked ? [241, 43, 48] : [54, 98, 244];
      const dotSize = 3;
      const gridSize = 6;
      const seed = (x: number, y: number) => {
        const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
      };
      const opacityLevels = [0.05, 0.08, 0.12, 0.18, 0.25, 0.35, 0.55, 0.7, 0.85, 1.0];
      const cx = W / 2, cy = H / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      for (let gy = 0; gy * gridSize < H; gy++) {
        for (let gx = 0; gx * gridSize < W; gx++) {
          const px = gx * gridSize + (gridSize - dotSize) / 2;
          const py = gy * gridSize + (gridSize - dotSize) / 2;
          const r = seed(gx, gy);
          const distFactor = 1 - Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) / maxDist;
          const opIdx = Math.floor(r * 10);
          const baseOp = opacityLevels[opIdx] ?? 0.1;
          const alpha = baseOp * (0.4 + distFactor * 0.6);
          ctx.fillStyle = `rgba(${dotColor[0]},${dotColor[1]},${dotColor[2]},${alpha.toFixed(3)})`;
          ctx.fillRect(px, py, dotSize, dotSize);
        }
      }

      // Radial vignette over the dots (dark toward edges)
      const vignette = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy * 0.7, Math.max(W, H) * 0.8);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.75)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // Character image centered (drawn first so text overlays it)
      if (charImg) {
        const imgSize = W * 0.62;
        const imgX = (W - imgSize) / 2;
        const imgY = (H - imgSize) / 2;
        ctx.drawImage(charImg, imgX, imgY, imgSize, imgSize);
      }

      // T / Z corner inscriptions — top-left
      ctx.fillStyle = color;
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "left";
      ctx.fillText("T", 20, 42);
      ctx.fillText("Z", 20, 66);

      // Mirrored at bottom-right
      ctx.save();
      ctx.translate(W - 20, H - 26);
      ctx.scale(-1, -1);
      ctx.fillText("T", 0, 24);
      ctx.fillText("Z", 0, 48);
      ctx.restore();

      // --- Overlay text (centred) ---
      ctx.textAlign = "center";

      // TECHZILLA INC.
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "bold 12px monospace";
      ctx.fillText("TECHZILLA INC.", W / 2, H / 2 - 60);

      // Business name
      ctx.fillStyle = "rgba(255,255,255,0.50)";
      ctx.font = "10px monospace";
      ctx.fillText(businessName.toUpperCase().slice(0, 22), W / 2, H / 2 - 42);

      // 5% OFF
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("5% OFF", W / 2, H / 2 + 20);

      // Discount code
      ctx.fillStyle = "rgba(255,255,255,0.42)";
      ctx.font = "10px monospace";
      ctx.fillText(discountCode, W / 2, H / 2 + 48);

      ctx.textAlign = "left";

      const link = document.createElement("a");
      link.download = `techzilla-gift-${businessName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      setDownloadMsg("Card downloaded!");
      setTimeout(() => setDownloadMsg(null), 2500);
    };

    // Load the character image first, then draw
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => drawCard(img);
    img.onerror = () => drawCard(null); // graceful fallback if image missing
    img.src = char.file;
  }, [businessName, discountCode, clicked, char]);

  return (
    <div className={styles.giftCardWrap}>
      <div className={styles.giftCardHeader}>
        <h3>Your Exclusive Gift Card 🎁</h3>
        <p>Click the card to change colour · Use arrows to switch character</p>
      </div>

      {/* Arrows + Card */}
      <div className={styles.arrowsRow}>
        <button className={styles.arrowBtn} onClick={handlePrev} aria-label="Previous character">
          &#8592;
        </button>

        <div style={{ position: "relative", maxWidth: 240, width: "100%" }}>
          <PlayingCard
            componentId={`gift-card-${charIndex}`}
            textArray={["T", "Z"]}
            imageSrc={char.file}
            imageAlt={char.name}
            componentWidth="240px"
            aspectRatio="9/16"
            imageHeightPercentage={55}
            verticalPadding="16px"
            horizontalPadding="14px"
            onCardClicked={handleCardClick}
            revealCanvas={true}
            revealCanvasColors={
              clicked
                ? [[241, 43, 48], [255, 100, 80]]
                : [[54, 98, 244], [80, 140, 255]]
            }
            inscriptionColor={clicked ? "#f12b30" : "#3662f4"}
            inscriptionColorHovered={clicked ? "#ff4444" : "#5580ff"}
            minWidth={180}
            maxWidth={280}
            minTextSize={18}
            maxTextSize={28}
            manualLetterSpacing={4}
          />

          {/* Info overlay centred on the card */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -40%)",
              zIndex: 10,
              textAlign: "center",
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <div style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.52rem",
              letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.65)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}>
              TECHZILLA INC.
            </div>
            <div style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.45rem",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
            }}>
              {businessName.slice(0, 18)}
            </div>
            <div style={{
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontSize: "1.3rem",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginTop: 4,
            }}>
              5% OFF
            </div>
            <div style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.42rem",
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.38)",
              textTransform: "uppercase",
            }}>
              {discountCode}
            </div>
          </div>
        </div>

        <button className={styles.arrowBtn} onClick={handleNext} aria-label="Next character">
          &#8594;
        </button>
      </div>

      <div className={styles.characterHint}>{char.name} · {char.label}</div>

      {/* Download */}
      <div className={styles.downloadRow}>
        <button className={styles.downloadBtn} onClick={handleDownload}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Card
        </button>
      </div>

      {downloadMsg && (
        <p style={{ fontSize: "0.65rem", color: "rgba(80,200,120,0.8)", letterSpacing: "0.08em", textAlign: "center" }}>
          {downloadMsg}
        </p>
      )}

    </div>
  );
}

/* ── GiftFlow shell (business-name input → card reveal) ─── */

interface GiftFlowProps {
  onClose: () => void;
}

export default function GiftFlow({ onClose }: GiftFlowProps) {
  const [step, setStep] = useState<"input" | "card">("input");
  const [businessName, setBusinessName] = useState("");
  const [discountCode] = useState(generateDiscountCode);
  // Always start at index 0 — the Joker card
  const [charIndex, setCharIndex] = useState(0);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName.trim().length < 2) return;
    setStep("card");
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          className={styles.giftModal}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">
            ✕
          </button>

          <AnimatePresence mode="wait">
            {step === "input" && (
              <motion.div
                key="input"
                className={styles.giftStep1}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* ── Gift icon + heading ── */}
                <div className={styles.giftIcon}>🎁</div>
                <div className={styles.giftTitle}>Claim Your Free Gift</div>
                <div className={styles.giftSubtitle}>
                  You&apos;ve unlocked a{" "}
                  <span className={styles.giftHighlight}>5% discount</span> on your
                  next project with Techzilla. Enter your business name to generate
                  your personalised gift card.
                </div>

                {/* ── Form — input + black pill button ── */}
                <form className={styles.giftForm} onSubmit={handleUnlock}>
                  <input
                    className={styles.giftInput}
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your business name"
                    required
                    minLength={2}
                    maxLength={32}
                    autoFocus
                  />
                  <button type="submit" className={styles.giftUnlockBtn}>
                    Generate My Gift Card
                  </button>
                </form>

                <p className={styles.giftDisclaimer}>
                  No credit card required. Gift applies to your first project quote.
                </p>
              </motion.div>
            )}

            {step === "card" && (
              <motion.div
                key="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                style={{ width: "100%" }}
              >
                <GiftCardDisplay
                  businessName={businessName}
                  discountCode={discountCode}
                  charIndex={charIndex}
                  onCharChange={setCharIndex}
                  onClose={onClose}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
