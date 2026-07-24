"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CardStack, CardStackItem } from "@/components/ui/CardStack";
import { ServiceDock } from "@/components/ui/dock-tabs";
import ServiceThreeHeading from "./ServiceThreeHeading";
import CursorGrid from "@/components/ui/CursorGrid";
import ClickSpark from "@/components/ui/ClickSpark";
import styles from "./Services.module.css";
import SectionNav from "@/components/ui/SectionNav";

/* ─── SVG Icons ─────────────────────────────────────────────── */
const IconCode = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
);
const IconSmartphone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
    <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);
const IconPalette = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
    <circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);
const IconCloud = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);
const IconCpu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
    <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

/* ─── Service Data ───────────────────────────────────────────── */
type ServiceItem = CardStackItem & {
  bullets: string[];
  bgGradient: string;
  glowColor: string;
};

const SERVICES: ServiceItem[] = [
  {
    id: "web",
    title: "Web Development",
    description: "Blazing-fast, pixel-perfect web apps built with modern React, Next.js, and edge-deployed infrastructure that scales to millions.",
    icon: <IconCode />,
    accentColor: "#5227FF",
    tag: "Full-Stack",
    bullets: ["React / Next.js", "Edge & Serverless", "API Design", "SEO Optimised"],
    bgGradient: "linear-gradient(160deg, #05010f 0%, #0f042e 35%, #1a0055 65%, #05010f 100%)",
    glowColor: "rgba(82,39,255,0.35)",
  },
  {
    id: "mobile",
    title: "Mobile Applications",
    description: "Cross-platform iOS & Android apps with native performance, offline-first architecture, and buttery-smooth 60 fps UIs.",
    icon: <IconSmartphone />,
    accentColor: "#00c4ff",
    tag: "iOS & Android",
    bullets: ["React Native / Expo", "Native Modules", "Push Notifications", "App Store Ready"],
    bgGradient: "linear-gradient(160deg, #00080f 0%, #001e38 35%, #003a60 65%, #00080f 100%)",
    glowColor: "rgba(0,196,255,0.3)",
  },
  {
    id: "design",
    title: "UI / UX Design",
    description: "Research-driven interfaces that convert. We prototype, test, and ship experiences people remember — not just use.",
    icon: <IconPalette />,
    accentColor: "#ff6b9d",
    tag: "Design System",
    bullets: ["Figma Prototyping", "User Research", "Design Systems", "Motion Design"],
    bgGradient: "linear-gradient(160deg, #100008 0%, #300018 35%, #580030 65%, #100008 100%)",
    glowColor: "rgba(255,107,157,0.3)",
  },
  {
    id: "cloud",
    title: "Cloud Solutions",
    description: "Architect and migrate your infrastructure to AWS, GCP, or Azure. We handle devops, CI/CD pipelines, and 99.99% uptime.",
    icon: <IconCloud />,
    accentColor: "#00e5a0",
    tag: "Infrastructure",
    bullets: ["AWS / GCP / Azure", "Kubernetes", "CI/CD Pipelines", "Cost Optimisation"],
    bgGradient: "linear-gradient(160deg, #000c08 0%, #001f15 35%, #003828 65%, #000c08 100%)",
    glowColor: "rgba(0,229,160,0.3)",
  },
  {
    id: "ai",
    title: "AI & Machine Learning",
    description: "Custom LLM integrations, intelligent automation, and predictive models that turn your data into your competitive edge.",
    icon: <IconCpu />,
    accentColor: "#f59e0b",
    tag: "AI-Powered",
    bullets: ["LLM Integration", "Custom Model Training", "RAG Pipelines", "AI Agents"],
    bgGradient: "linear-gradient(160deg, #0a0600 0%, #261600 35%, #3d2200 65%, #0a0600 100%)",
    glowColor: "rgba(245,158,11,0.3)",
  },
  {
    id: "security",
    title: "Cybersecurity",
    description: "Penetration testing, threat modelling, and zero-trust architecture. We secure your stack before attackers find the gaps.",
    icon: <IconShield />,
    accentColor: "#ef4444",
    tag: "Security",
    bullets: ["Pen Testing", "Zero-Trust Architecture", "Compliance (SOC2)", "Incident Response"],
    bgGradient: "linear-gradient(160deg, #0a0000 0%, #250005 35%, #400010 65%, #0a0000 100%)",
    glowColor: "rgba(239,68,68,0.3)",
  },
];

const DOCK_ITEMS = SERVICES.map((s) => ({
  id: s.id as string,
  name: s.title,
  icon: s.icon!,
  accentColor: s.accentColor!,
}));

/* ─── Card renderer — cinematic photo-style ─────────────────── */
function ServiceCard({ item, active, isMobile = false }: { item: ServiceItem; active: boolean; isMobile?: boolean }) {
  const accent = item.accentColor ?? "#5227FF";
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: item.bgGradient }}>
      {/* Atmospheric glow spot */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          background: `radial-gradient(ellipse at 30% 60%, ${item.glowColor} 0%, transparent 65%)`,
          opacity: active ? 1 : 0.5,
          transition: "opacity 0.5s ease",
        }}
      />

      {/* Subtle noise grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "url('/noise.png')", backgroundSize: "200px" }}
      />

      {/* Top-right tag */}
      {item.tag && (
        <div className={`absolute z-10 ${isMobile ? "top-2 right-2" : "top-4 right-4"}`}>
          <span
            style={{
              fontSize: isMobile ? "0.55rem" : "0.65rem",
              fontFamily: "var(--font-display, sans-serif)",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
              padding: isMobile ? "2px 7px" : "3px 10px",
              borderRadius: "999px",
              background: `${accent}22`,
              color: accent,
              border: `1px solid ${accent}50`,
            }}
          >
            {item.tag}
          </span>
        </div>
      )}

      {/* Bottom gradient scrim */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, transparent 100%)",
        }}
      />

      {/* Content — anchored to bottom like photo card */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 ${isMobile ? "p-3" : "p-6"}`}>
        {/* Icon + title row */}
        <div className={`flex items-center ${isMobile ? "gap-2 mb-1" : "gap-3 mb-2"}`}>
          <motion.div
            style={{
              width: isMobile ? 26 : 36,
              height: isMobile ? 26 : 36,
              borderRadius: isMobile ? 7 : 10,
              background: `${accent}1a`,
              border: `1.5px solid ${accent}55`,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            animate={{ boxShadow: active ? `0 0 18px ${accent}55` : "none" }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ width: isMobile ? 13 : 18, height: isMobile ? 13 : 18 }}>{item.icon}</div>
          </motion.div>

          <h3
            style={{
              fontSize: isMobile ? "0.9rem" : "clamp(1.1rem, 1.8vw, 1.5rem)",
              color: "#fff",
              fontFamily: "var(--font-display, sans-serif)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              textShadow: active ? `0 0 24px ${accent}88` : "none",
              transition: "text-shadow 0.4s ease",
              margin: 0,
            }}
          >
            {item.title}
          </h3>
        </div>

        {/* Description */}
        <p
          style={{
            color: "rgba(255,255,255,0.62)",
            fontSize: isMobile ? "0.68rem" : "0.8rem",
            lineHeight: 1.5,
            margin: isMobile ? "0 0 7px 0" : "0 0 12px 0",
            fontFamily: "var(--font-geist-sans, sans-serif)",
            fontWeight: 400,
          }}
        >
          {item.description}
        </p>

        {/* Bullet pills */}
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: isMobile ? 4 : 6 }}>
          {item.bullets.map((b) => (
            <span
              key={b}
              style={{
                fontSize: isMobile ? "0.58rem" : "0.68rem",
                fontFamily: "var(--font-display, sans-serif)",
                fontWeight: 600,
                letterSpacing: "0.05em",
                padding: isMobile ? "1px 7px" : "2px 10px",
                borderRadius: "999px",
                background: `${accent}18`,
                color: `${accent}cc`,
                border: `1px solid ${accent}35`,
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Active bottom glow line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: active ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />
    </div>
  );
}


/* ─── Main Services Section ──────────────────────────────────── */
export default function Services({ active = false }: { active?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const currentAccent = SERVICES[activeIndex]?.accentColor ?? "#5227FF";

  // Always land on Web Development (index 0) when the section becomes active
  // after the vapor animation, regardless of which card was last viewed.
  useEffect(() => {
    if (active) setActiveIndex(0);
  }, [active]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const content = (
    <motion.div
      className="relative z-10 flex flex-col items-center justify-center h-full px-4"
      style={{ paddingTop: isMobile ? "12px" : "clamp(28px, 5vh, 56px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {/* Micro label — hidden while the section nav overlay is open */}
      <p
        style={{
          fontFamily: "var(--font-display, sans-serif)",
          fontSize: isMobile ? "0.58rem" : "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.24em",
          textTransform: "uppercase" as const,
          color: currentAccent,
          marginBottom: isMobile ? "0.2rem" : "0.4rem",
          transition: "opacity 0.2s ease, color 0.4s ease",
          opacity: navOpen ? 0 : 1,
          pointerEvents: navOpen ? "none" : "auto",
        }}
      >
        What We Do
      </p>

      {/* 3D heading */}
      <ServiceThreeHeading accentColor={currentAccent} height={isMobile ? 44 : 90} />

      {/* Dock */}
      <motion.div
        className={isMobile ? "mb-3 mt-1" : "mb-6 mt-3"}
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: active ? 1 : 0, y: active ? 0 : -14 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <ServiceDock items={DOCK_ITEMS} activeIndex={activeIndex} onSelect={setActiveIndex} />
      </motion.div>

      {/* Counter — Bricolage Grotesque, not mono */}
      <AnimatePresence mode="wait">
        <motion.p
          key={activeIndex}
          style={{
            fontFamily: "var(--font-display, sans-serif)",
            fontSize: isMobile ? "0.68rem" : "clamp(0.75rem, 1vw, 0.9rem)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: currentAccent,
            marginBottom: isMobile ? "0.5rem" : "1rem",
            transition: "color 0.35s ease",
          }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <span style={{ opacity: 0.5, fontWeight: 600 }}>
            {String(activeIndex + 1).padStart(2, "0")}
          </span>
          <span style={{ opacity: 0.28, margin: "0 5px" }}>/</span>
          <span style={{ opacity: 0.5, fontWeight: 600 }}>
            {String(SERVICES.length).padStart(2, "0")}
          </span>
          <span style={{ opacity: 0.22, margin: "0 7px", fontWeight: 400 }}>—</span>
          <span style={{ fontWeight: 800 }}>{SERVICES[activeIndex]?.title}</span>
        </motion.p>
      </AnimatePresence>

      {/* Card Stack */}
      <div className="w-full max-w-5xl">
        <CardStack
          items={SERVICES}
          activeIndex={activeIndex}
          onChangeIndex={(idx) => setActiveIndex(idx)}
          cardWidth={isMobile ? 290 : 490}
          cardHeight={isMobile ? 185 : 300}
          overlap={isMobile ? 0.42 : 0.52}
          spreadDeg={isMobile ? 24 : 42}
          minStageHeight={isMobile ? 290 : 420}
          loop
          showDots
          autoAdvance
          intervalMs={3000}
          pauseOnHover
          inactiveOpacity={0.35}
          renderCard={(item, { active: cardActive }) => (
            <ServiceCard item={item as ServiceItem} active={cardActive} isMobile={isMobile} />
          )}
        />
      </div>
    </motion.div>
  );

  return (
    // sectionRef is passed to CursorGrid as eventRef so it receives pointer
    // events even though the canvas sits behind the content layer.
    <section ref={sectionRef} className={styles.section} id="services">
      <SectionNav navItems={["About", "Work", "Contact"]} onOpenChange={setNavOpen} />

      {/* CursorGrid fills entire section — always rendered, colour tracks
          active card. eventRef = sectionRef so events bubble from any child. */}
      <div className="absolute inset-0 z-0">
        <CursorGrid
          eventRef={sectionRef}
          color={currentAccent}
          cellSize={65}
          radius={150}
          falloff="smooth"
          holdTime={300}
          fadeDuration={700}
          lineWidth={1.1}
          maxOpacity={active ? 0.75 : 0.25}
          fillOpacity={0.04}
          gridOpacity={0.035}
          clickPulse={active}
          pulseSpeed={500}
        />
      </div>

      {/* Content + ClickSpark overlay */}
      <div className="absolute inset-0 z-10">
        {active ? (
          <ClickSpark
            sparkColor={currentAccent}
            sparkCount={10}
            sparkSize={9}
            sparkRadius={22}
            duration={480}
          >
            {content}
          </ClickSpark>
        ) : (
          content
        )}
      </div>
    </section>
  );
}
