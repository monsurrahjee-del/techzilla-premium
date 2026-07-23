"use client";

import {
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "@/lib/gsap";
import styles from "./Craft.module.css";
import ContactModal from "./ContactModal";
import GiftFlow from "./GiftFlow";

export interface CraftSectionHandle {
  activate: () => void;
  deactivate: () => void;
}

/* ── Stickers (reuse hero sticker images) ──────────────────────────────── */
const STICKERS = [
  { src: "/sticker_img/s_01.png", top: "12%",  left: "4%",   rotate: -12, float: 18 },
  { src: "/sticker_img/s_02.png", top: "8%",   right: "8%",  rotate: 8,   float: 22 },
  { src: "/sticker_img/s_03.png", top: "55%",  left: "2%",   rotate: -5,  float: 16 },
  { src: "/sticker_img/s_04.png", bottom: "22%", right: "5%", rotate: 15, float: 26 },
  { src: "/sticker_img/s_05.png", bottom: "8%", left: "20%", rotate: -18, float: 20 },
  { src: "/sticker_img/s_06.png", top: "35%",  right: "3%",  rotate: 6,   float: 24 },
  { src: "/sticker_img/s_07.png", bottom: "32%", left: "6%", rotate: -8,  float: 18 },
  { src: "/sticker_img/s_08.png", top: "70%",  right: "7%",  rotate: 10,  float: 21 },
  { src: "/sticker_img/s_09.png", top: "18%",  left: "18%",  rotate: -15, float: 20 },
  { src: "/sticker_img/s_10.png", top: "22%",  right: "18%", rotate: 14,  float: 24 },
  { src: "/sticker_img/s_11.png", bottom: "15%", right: "22%", rotate: -4, float: 18 },
  { src: "/sticker_img/s_12.png", bottom: "5%", right: "38%", rotate: 7,  float: 22 },
];

function StickerLayer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const items = containerRef.current?.querySelectorAll(".craftSticker");
    if (!items) return;
    items.forEach((item, i) => {
      gsap.fromTo(
        item,
        { opacity: 0, scale: 0.6, y: 60 },
        { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: "power4.out", delay: i * 0.07 }
      );
      gsap.to(item, {
        y: `+=${STICKERS[i]?.float ?? 18}`,
        duration: 3 + i * 0.35,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
  }, []);

  return (
    <div ref={containerRef} className={styles.stickerLayer}>
      {STICKERS.map((s, i) => (
        <Image
          key={i}
          src={s.src}
          alt=""
          width={80}
          height={80}
          className={`craftSticker ${styles.sticker}`}
          style={{
            top: s.top,
            left: ("left" in s) ? s.left : undefined,
            right: ("right" in s) ? s.right : undefined,
            bottom: ("bottom" in s) ? s.bottom : undefined,
            transform: `rotate(${s.rotate}deg)`,
          }}
          draggable={false}
        />
      ))}
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */
const CraftSection = forwardRef<CraftSectionHandle>((_, ref) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const activeRef = useRef(false);

  const slideIn = () => {
    const w = wrapRef.current;
    if (!w) return;
    w.style.transition = "transform 0.70s cubic-bezier(0.22,1,0.36,1)";
    w.style.transform = "translateY(0%)";
    w.style.pointerEvents = "all";
  };

  const slideOut = () => {
    const w = wrapRef.current;
    if (!w) return;
    w.style.transition = "transform 0.55s cubic-bezier(0.32,0,0.12,1)";
    w.style.transform = "translateY(100%)";
    w.style.pointerEvents = "none";
  };

  useImperativeHandle(ref, () => ({
    activate() {
      if (activeRef.current) return;
      activeRef.current = true;
      setActive(true);
      slideIn();
    },
    deactivate() {
      activeRef.current = false;
      setActive(false);
      slideOut();
    },
  }));

  /* Listen for custom event from ChessReveal */
  useEffect(() => {
    const onActivate = () => {
      if (activeRef.current) return;
      activeRef.current = true;
      setActive(true);
      slideIn();
    };
    window.addEventListener("craft-section-activate", onActivate);
    return () => window.removeEventListener("craft-section-activate", onActivate);
  }, []);

  /* Scroll-up to dismiss (pass control back to chess reveal) */
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!activeRef.current) return;
      if (showContact || showGift) return; // don't dismiss while modal open
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta < -40) {
        // Scrolling UP — slide this section back down
        e.preventDefault();
        e.stopImmediatePropagation();
        activeRef.current = false;
        setActive(false);
        slideOut();
        // Notify chess reveal to resume
        window.dispatchEvent(new CustomEvent("craft-section-dismiss"));
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, [showContact, showGift]);

  return (
    <>
      <div
        ref={wrapRef}
        className={styles.wrap}
        style={{ transform: "translateY(100%)", pointerEvents: "none", transition: "none" }}
        aria-hidden={!active}
      >
        {/* ── Background ── */}
        <div className={styles.bg} />
        <div className={styles.grid} />

        {/* Corner brackets */}
        <div className={styles.crosshairTL} />
        <div className={styles.crosshairTR} />
        <div className={styles.crosshairBL} />
        <div className={styles.crosshairBR} />

        {/* ── Background "CRAFT / TASTE" script text ── */}
        <div className={styles.scriptLayer}>
          <div className={styles.scriptStage}>
            <span className={styles.scriptWord}>CRAFT</span>
            <span className={`${styles.scriptWord} ${styles.scriptWord2}`}>TASTE</span>
          </div>
        </div>

        {/* ── Stickers ── */}
        <AnimatePresence>
          {active && <StickerLayer key="stickers" />}
        </AnimatePresence>

        {/* ── "LET'S CREATE SOMETHING EXTRAORDINARY" headline ── */}
        <div className={styles.headlineWrap}>
          <div className={styles.headline}>
            <span>LET&apos;S</span>
            <span>CREATE</span>
            <span>SOMETHING</span>
            <span>EXTRAORDINARY</span>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className={styles.nav}>
          <div className={styles.navLogo}>TECHZILLA</div>
          <div className={styles.navCenter}>
            <a href="#work">Work</a>
            <a href="#contact">Contact</a>
          </div>
          <div className={styles.navRight}>
            <button className={styles.navToggle}>
              THEME<span>[D]</span>
            </button>
            <button className={styles.navToggle}>
              SOUND<span>[·]</span>
            </button>
            <button
              className={styles.contactBtn}
              onClick={() => setShowContact(true)}
            >
              Contact Us
            </button>
          </div>
        </nav>

        {/* ── Bottom Bar ── */}
        <div className={styles.bottomBar}>
          {/* Left */}
          <div className={styles.bottomLeft}>
            <a href="mailto:hello@techzilla.dev">hello@techzilla.dev</a>
            <span>TECHZILLA &copy; 2026</span>
          </div>

          {/* Center — Gift button */}
          <div className={styles.bottomCenter}>
            <button
              className={styles.giftBtn}
              onClick={() => setShowGift(true)}
            >
              GIFT
            </button>
          </div>

          {/* Right — Socials */}
          <div className={styles.bottomRight}>
            <div className={styles.socials}>
              <a href="https://twitter.com/techzilla" target="_blank" rel="noopener noreferrer">TWITTER/X</a>
              <a href="https://figma.com/@techzilla" target="_blank" rel="noopener noreferrer">FIGMA</a>
              <a href="https://github.com/techzilla" target="_blank" rel="noopener noreferrer">GITHUB</a>
            </div>
            <div className={styles.socialsRow2}>
              <a href="https://tiktok.com/@techzilla" target="_blank" rel="noopener noreferrer">TIKTOK</a>
              <a href="https://facebook.com/techzilla" target="_blank" rel="noopener noreferrer">FACEBOOK</a>
            </div>
            <div className={styles.globeIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals (rendered outside the transform wrapper) ── */}
      <AnimatePresence>
        {showContact && <ContactModal key="contact-modal" onClose={() => setShowContact(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showGift && <GiftFlow key="gift-modal" onClose={() => setShowGift(false)} />}
      </AnimatePresence>
    </>
  );
});

CraftSection.displayName = "CraftSection";
export default CraftSection;
