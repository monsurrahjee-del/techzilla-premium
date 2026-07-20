"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./About.module.css";
import LiquidEther from "./LiquidEther";
import FaultyTerminal from "./FaultyTerminal";
import DecryptedText from "@/components/ui/DecryptedText";
import RichTypewriter, { RichSegment } from "@/components/ui/RichTypewriter";

// ── Clock that updates DOM directly — no React re-render per tick ─────────────
function useClock(spanRef: React.RefObject<HTMLSpanElement | null>) {
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
    const tick = () => {
      if (spanRef.current) spanRef.current.textContent = fmt();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── Rich text segments for the sub paragraph ──────────────────────────────────
// "\n" in a plain segment becomes <br /> — three deliberate lines (PC):
//  1 — We're building Techzilla Premium™, and have previously helped,
//  2 — built amazing projects including Party Place & Rentals, YCTMFB,
//  3 — OGUNCCIMA, YCT, RCCG, Maser Global Travels, and MaleteHostels.
const SUB_SEGMENTS: RichSegment[] = [
  { type: "plain",     text: "We\u2019re building " },
  { type: "highlight", text: "Techzilla Premium\u2122" },
  { type: "plain",     text: ", and have previously helped,\n" },
  { type: "plain",     text: "built amazing projects including " },
  { type: "link",      text: "Party Place \u0026 Rentals", href: "https://partyplaceandrentals.com/" },
  { type: "plain",     text: ", " },
  { type: "link",      text: "YCTMFB",               href: "https://pay.yctmicrofinancebank.com/" },
  { type: "plain",     text: ",\n" },
  { type: "highlight", text: "OGUNCCIMA" },
  { type: "plain",     text: ", " },
  { type: "link",      text: "YCT",                  href: "https://yctmicrofinancebank.com/" },
  { type: "plain",     text: ", " },
  { type: "link",      text: "RCCG",                 href: "https://rccglivingwordforney.org/" },
  { type: "plain",     text: ", " },
  { type: "link",      text: "Maser Global Travels", href: "https://maser-global-travels.vercel.app/" },
  { type: "plain",     text: ", and " },
  { type: "link",      text: "MaleteHostels",        href: "https://malete-hostels.vercel.app/" },
  { type: "plain",     text: "." },
];

const HEADLINE =
  "We craft interfaces where engineering meets obsession, building the next generation of digital products.";

interface AboutProps {
  /** Controlled from page.tsx — start WebGL only once About starts entering */
  active?: boolean;
}

export default function About({ active = false }: AboutProps) {
  // ── Coord display — update DOM directly, never trigger a React re-render ───
  const coordSpanRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const span = coordSpanRef.current;
    if (!span) return;
    const fn = (e: MouseEvent) => {
      span.textContent =
        `${String(e.clientX).padStart(4, "0")}\u00a0X\u00a0${String(e.clientY).padStart(4, "0")}\u00a0Y`;
    };
    window.addEventListener("mousemove", fn, { passive: true });
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  // ── Clock — also DOM-direct ───────────────────────────────────────────────
  const clockSpanRef = useRef<HTMLSpanElement>(null);
  useClock(clockSpanRef);

  // ── Animation state ────────────────────────────────────────────────────────
  // animKey forces a full remount of both text components on each re-entry,
  // giving a clean reset without managing internal state externally.
  const [animKey,        setAnimKey]        = useState(0);
  const [headlineActive, setHeadlineActive] = useState(false);
  const [subActive,      setSubActive]      = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Section slid into view — start fresh animation sequence
          setAnimKey((k) => k + 1);
          setHeadlineActive(true);
          setSubActive(false);
        } else {
          // Section left viewport — reset so next entry replays from scratch
          setHeadlineActive(false);
          setSubActive(false);
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const paused = !active;

  return (
    <section id="about" ref={sectionRef} className={styles.section}>

      {/* ── WebGL backgrounds ── */}
      <div className={styles.bgLayer}>
        <LiquidEther
          paused={paused}
          colors={["#1a0a4f", "#5227FF", "#B497CF", "#FF9FFC"]}
          mouseForce={60}
          cursorSize={60}
          isViscous
          viscous={6}
          iterationsViscous={8}
          iterationsPoisson={8}
          resolution={0.35}
          autoDemo
          autoSpeed={0.35}
          autoIntensity={2.0}
          takeoverDuration={0}
          autoResumeDelay={2000}
          autoRampDuration={0.8}
        />
      </div>
      <div className={styles.terminalLayer}>
        <FaultyTerminal
          pause={false}
          scale={1.4}
          gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={0.4}
          scanlineIntensity={0.4}
          glitchAmount={1}
          flickerAmount={0.8}
          noiseAmp={0.9}
          curvature={0.08}
          tint="#B497CF"
          mouseReact
          mouseStrength={0.4}
          mouseLerp={1}
          pageLoadAnimation={false}
          brightness={0.55}
        />
      </div>

      {/* Crosshair markers */}
      <div className={styles.cross} aria-hidden="true"
        style={{ left: "calc(36px + 275px - 8px)", top: "0" }} />
      <div className={styles.cross} aria-hidden="true"
        style={{ left: "calc(36px + 275px - 8px)", bottom: "44px" }} />

      <div className={styles.body}>
        <div className={styles.strip}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/techzilla-logo.png"
            alt="Techzilla"
            className={styles.stripBadge}
          />
          <span className={styles.stripLabel}>Studio</span>
        </div>

        <div className={styles.leftCol}>
          <div className={styles.photo}>
            <div className={styles.photoInner} />
            <span className={`${styles.photoScript} cursor-target`} aria-hidden="true">Techzilla</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/techzilla-logo.png"
              alt=""
              aria-hidden="true"
              className={styles.photoLogo}
            />
          </div>
          <div className={styles.photoBtm}>
            GMT+1&nbsp;NG&nbsp;<span ref={clockSpanRef} suppressHydrationWarning />
          </div>
        </div>

        <div className={styles.rightCol}>
          {/* ── Headline: DecryptedText sequential reveal ── */}
          <h2 className={styles.headline}>
            <DecryptedText
              key={`h-${animKey}`}
              text={HEADLINE}
              running={headlineActive}
              onComplete={() => setSubActive(true)}
              className={styles.revealedChar}
              encryptedClassName={styles.encryptedChar}
              speed={22}
              revealDirection="start"
            />
          </h2>

          {/* ── Sub paragraph: rich typewriter ── */}
          <p className={styles.sub}>
            <RichTypewriter
              key={`s-${animKey}`}
              segments={SUB_SEGMENTS}
              running={subActive}
              typingSpeed={25}
              cursorCharacter="|"
            />
          </p>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <span suppressHydrationWarning>Design&nbsp;Engineering&nbsp;Studio</span>
        <span ref={coordSpanRef} className={styles.btmCoords} suppressHydrationWarning aria-hidden="true">
          0000&nbsp;X&nbsp;0000&nbsp;Y
        </span>
        <div className={styles.btmGlobe} aria-hidden="true" />
      </div>
    </section>
  );
}
