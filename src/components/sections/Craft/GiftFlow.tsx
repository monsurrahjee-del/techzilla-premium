"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import styles from "./Craft.module.css";

const CHARACTERS = [
  { name: "Developer",     file: "/characters/developer.png",    label: "Software Dev" },
  { name: "Doctor",        file: "/characters/doctor.png",       label: "Healthcare" },
  { name: "Designer",      file: "/characters/designer.png",     label: "UI/UX Design" },
  { name: "Chef",          file: "/characters/chef.png",         label: "Food & Beverage" },
  { name: "Teacher",       file: "/characters/teacher.png",      label: "Education" },
  { name: "Musician",      file: "/characters/musician.png",     label: "Music & Arts" },
  { name: "Astronaut",     file: "/characters/astronaut.png",    label: "Exploration" },
  { name: "Scientist",     file: "/characters/scientist.png",    label: "Research" },
  { name: "Entrepreneur",  file: "/characters/entrepreneur.png", label: "Business" },
  { name: "Artist",        file: "/characters/artist.png",       label: "Creative Arts" },
];

function generateDiscountCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `TZ-${seg(4)}-${seg(4)}`;
}

interface GiftCardDisplayProps {
  businessName: string;
  discountCode: string;
  charIndex: number;
  onCharChange: (i: number) => void;
  onClose: () => void;
}

function GiftCardDisplay({ businessName, discountCode, charIndex, onCharChange, onClose }: GiftCardDisplayProps) {
  const [clicked, setClicked] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const char = CHARACTERS[charIndex];

  const handleCardClick = () => setClicked((p) => !p);

  const handlePrev = () => onCharChange((charIndex - 1 + CHARACTERS.length) % CHARACTERS.length);
  const handleNext = () => onCharChange((charIndex + 1) % CHARACTERS.length);

  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  // Download the card as PNG using canvas API
  const handleDownload = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;

    // Build a simple canvas representation of the card data
    const canvas = document.createElement("canvas");
    const W = 320, H = Math.round(W * 16 / 9);
    canvas.width = W * 2; canvas.height = H * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = "#000";
    ctx.roundRect(0, 0, W, H, 18);
    ctx.fill();

    // Dot pattern
    ctx.fillStyle = clicked ? "rgba(241,43,48,0.4)" : "rgba(54,98,244,0.4)";
    for (let x = 4; x < W; x += 8) {
      for (let y = 4; y < H; y += 8) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Brand text
    ctx.fillStyle = clicked ? "#f12b30" : "#3662f4";
    ctx.font = "bold 8px monospace";
    ctx.fillText("TECHZILLA INC.", 16, 24);

    // Company
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "6px monospace";
    ctx.fillText(businessName.toUpperCase().slice(0, 20), 16, 34);

    // Discount
    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("5% OFF", W / 2, H / 2 + 20);

    // Code
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "7px monospace";
    ctx.fillText(discountCode, W / 2, H / 2 + 40);

    ctx.textAlign = "left";

    const link = document.createElement("a");
    link.download = `techzilla-gift-${businessName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    setDownloadMsg("Card downloaded!");
    setTimeout(() => setDownloadMsg(null), 2500);
  }, [businessName, discountCode, clicked]);

  return (
    <div className={styles.giftCardWrap}>
      <div className={styles.giftCardHeader}>
        <h3>Your Exclusive Gift Card 🎁</h3>
        <p>Click the card to change colour · Use the arrows to switch character</p>
      </div>

      {/* Arrows + Card */}
      <div className={styles.arrowsRow}>
        <button className={styles.arrowBtn} onClick={handlePrev} aria-label="Previous character">
          &#8592;
        </button>

        {/* The card itself */}
        <div ref={cardRef} className={`${styles.card} ${clicked ? styles.clicked : ""}`} onClick={handleCardClick}>
          <div className={styles.cardInner}>
            {/* Reveal canvas dots background */}
            <div className={styles.cardReveal}>
              <DotsBackground clicked={clicked} />
              <div className={styles.cardRevealGradient} />
            </div>

            {/* Top-left label */}
            <div className={styles.cardTopLabel}>
              <div className={styles.cardBrand}>TECHZILLA INC.</div>
              <div className={styles.cardCompany}>{businessName}</div>
            </div>

            {/* Bottom-right label (mirrored) */}
            <div className={styles.cardBottomLabel}>
              <div className={styles.cardBrand}>TECHZILLA INC.</div>
              <div className={styles.cardCompany}>{businessName}</div>
            </div>

            {/* Center: character + discount */}
            <div className={styles.cardCenter}>
              <div className={styles.cardCharacter}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={charIndex}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ width: "100%", height: "100%", position: "relative" }}
                  >
                    <Image
                      src={char.file}
                      alt={char.name}
                      fill
                      style={{ objectFit: "contain" }}
                      sizes="200px"
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className={styles.cardDiscountBadge}>
                <div className={styles.cardDiscountPct}>5% OFF</div>
                <div className={styles.cardDiscountLabel}>Your next project</div>
              </div>
              <div className={styles.cardCode}>{discountCode}</div>
            </div>
          </div>
        </div>

        <button className={styles.arrowBtn} onClick={handleNext} aria-label="Next character">
          &#8594;
        </button>
      </div>

      <div className={styles.characterHint}>{char.name} · {char.label}</div>

      {/* Download button */}
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

      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.3)",
          fontSize: "0.65rem",
          letterSpacing: "0.08em",
          cursor: "pointer",
          padding: "4px",
          fontFamily: "inherit",
          textTransform: "uppercase",
        }}
      >
        Close
      </button>
    </div>
  );
}

/* Simple CSS-based animated dots background (no Three.js dependency) */
function DotsBackground({ clicked }: { clicked: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `radial-gradient(circle, ${clicked ? "rgba(241,43,48,0.6)" : "rgba(54,98,244,0.6)"} 1px, transparent 1px)`,
        backgroundSize: "8px 8px",
        opacity: 0.45,
        transition: "background-image 2s ease-in-out 0.7s",
        animation: "craftDotsPulse 3s ease-in-out infinite",
      }}
    />
  );
}

interface GiftFlowProps {
  onClose: () => void;
}

export default function GiftFlow({ onClose }: GiftFlowProps) {
  const [step, setStep] = useState<"input" | "card">("input");
  const [businessName, setBusinessName] = useState("");
  const [discountCode] = useState(generateDiscountCode);
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
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className={styles.giftModal}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>

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
                <div className={styles.giftIcon}>🎁</div>
                <div className={styles.giftTitle}>Claim Your Free Gift</div>
                <div className={styles.giftSubtitle}>
                  You&apos;ve unlocked a <span className={styles.giftHighlight}>5% discount</span> on your next project with Techzilla.
                  Enter your business name to generate your personalised gift card.
                </div>

                <form onSubmit={handleUnlock} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
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

                <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em", margin: 0 }}>
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
