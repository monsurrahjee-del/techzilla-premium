"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export type CardStackItem = {
  id: string | number;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tag?: string;
  accentColor?: string;
  renderContent?: () => React.ReactNode;
};

export type CardStackProps<T extends CardStackItem> = {
  items: T[];
  initialIndex?: number;
  maxVisible?: number;
  cardWidth?: number;
  cardHeight?: number;
  overlap?: number;
  spreadDeg?: number;
  minStageHeight?: number;
  perspectivePx?: number;
  depthPx?: number;
  tiltXDeg?: number;
  activeLiftPx?: number;
  activeScale?: number;
  inactiveScale?: number;
  inactiveOpacity?: number;
  springStiffness?: number;
  springDamping?: number;
  loop?: boolean;
  autoAdvance?: boolean;
  intervalMs?: number;
  pauseOnHover?: boolean;
  showDots?: boolean;
  className?: string;
  onChangeIndex?: (index: number, item: T) => void;
  renderCard?: (item: T, state: { active: boolean }) => React.ReactNode;
  activeIndex?: number;
};

function wrapIndex(n: number, len: number) {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

function signedOffset(i: number, active: number, len: number, loop: boolean) {
  const raw = i - active;
  if (!loop || len <= 1) return raw;
  const alt = raw > 0 ? raw - len : raw + len;
  return Math.abs(alt) < Math.abs(raw) ? alt : raw;
}

export function CardStack<T extends CardStackItem>({
  items,
  initialIndex = 0,
  maxVisible = 7,
  cardWidth = 520,
  cardHeight = 340,
  overlap = 0.48,
  spreadDeg = 48,
  minStageHeight = 420,
  perspectivePx = 1100,
  depthPx = 140,
  tiltXDeg = 12,
  activeLiftPx = 22,
  activeScale = 1.03,
  inactiveScale = 0.94,
  inactiveOpacity = 1,
  springStiffness = 280,
  springDamping = 28,
  loop = true,
  autoAdvance = false,
  intervalMs = 2800,
  pauseOnHover = true,
  showDots = true,
  className,
  onChangeIndex,
  renderCard,
  activeIndex: controlledActive,
}: CardStackProps<T>) {
  const reduceMotion = useReducedMotion();
  const len = items.length;

  const [internalActive, setInternalActive] = React.useState(() =>
    wrapIndex(initialIndex, len),
  );

  // Support controlled activeIndex from parent (DockTabs navigation)
  const active = controlledActive !== undefined ? wrapIndex(controlledActive, len) : internalActive;
  const setActive = (idx: number) => {
    setInternalActive(idx);
    onChangeIndex?.(idx, items[idx]!);
  };

  const [hovering, setHovering] = React.useState(false);

  React.useEffect(() => {
    setInternalActive((a) => wrapIndex(a, len));
  }, [len]);

  React.useEffect(() => {
    if (!len) return;
    onChangeIndex?.(active, items[active]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const maxOffset = Math.max(0, Math.floor(maxVisible / 2));
  const cardSpacing = Math.max(10, Math.round(cardWidth * (1 - overlap)));
  const stepDeg = maxOffset > 0 ? spreadDeg / maxOffset : 0;

  const canGoPrev = loop || active > 0;
  const canGoNext = loop || active < len - 1;

  const prev = React.useCallback(() => {
    if (!len || !canGoPrev) return;
    setActive(wrapIndex(active - 1, len));
  }, [canGoPrev, len, active]);

  const next = React.useCallback(() => {
    if (!len || !canGoNext) return;
    setActive(wrapIndex(active + 1, len));
  }, [canGoNext, len, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  React.useEffect(() => {
    if (!autoAdvance || reduceMotion || !len) return;
    if (pauseOnHover && hovering) return;
    const id = window.setInterval(() => {
      if (loop || active < len - 1) next();
    }, Math.max(700, intervalMs));
    return () => window.clearInterval(id);
  }, [autoAdvance, intervalMs, hovering, pauseOnHover, reduceMotion, len, loop, active, next]);

  if (!len) return null;

  return (
    <div
      className={cn("w-full", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Stage */}
      <div
        className="relative w-full"
        style={{ height: Math.max(minStageHeight, cardHeight + 100) }}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-48 w-[70%] rounded-full blur-3xl"
          style={{ background: "rgba(82, 39, 255, 0.12)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-40 w-[76%] rounded-full blur-3xl"
          style={{ background: "rgba(0,0,0,0.4)" }}
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 flex items-end justify-center"
          style={{ perspective: `${perspectivePx}px` }}
        >
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const off = signedOffset(i, active, len, loop);
              const abs = Math.abs(off);
              const visible = abs <= maxOffset;
              if (!visible) return null;

              const rotateZ = off * stepDeg;
              const x = off * cardSpacing;
              const y = abs * 10;
              const z = -abs * depthPx;
              const isActive = off === 0;
              const scale = isActive ? activeScale : inactiveScale;
              const lift = isActive ? -activeLiftPx : 0;
              const rotateX = isActive ? 0 : tiltXDeg;
              const zIndex = 100 - abs;

              const dragProps = isActive
                ? {
                    drag: "x" as const,
                    dragConstraints: { left: 0, right: 0 },
                    dragElastic: 0.18,
                    onDragEnd: (
                      _e: unknown,
                      info: { offset: { x: number }; velocity: { x: number } },
                    ) => {
                      if (reduceMotion) return;
                      const travel = info.offset.x;
                      const v = info.velocity.x;
                      const threshold = Math.min(160, cardWidth * 0.22);
                      if (travel > threshold || v > 650) prev();
                      else if (travel < -threshold || v < -650) next();
                    },
                  }
                : {};

              return (
                <motion.div
                  key={item.id}
                  className={cn(
                    "absolute bottom-0 rounded-2xl overflow-hidden shadow-2xl",
                    "will-change-transform select-none",
                    isActive ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                  )}
                  style={{
                    width: cardWidth,
                    height: cardHeight,
                    zIndex,
                    transformStyle: "preserve-3d",
                    border: isActive
                      ? `2px solid ${item.accentColor ?? "#5227FF"}55`
                      : "2px solid rgba(255,255,255,0.08)",
                  }}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: y + 40, x, rotateZ, rotateX, scale }
                  }
                  animate={{ opacity: isActive ? 1 : inactiveOpacity, x, y: y + lift, rotateZ, rotateX, scale }}
                  transition={{ type: "spring", stiffness: springStiffness, damping: springDamping }}
                  onClick={() => setActive(i)}
                  {...dragProps}
                >
                  <div
                    className="h-full w-full"
                    style={{
                      transform: `translateZ(${z}px)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {renderCard ? (
                      renderCard(item, { active: isActive })
                    ) : (
                      <DefaultServiceCard item={item} active={isActive} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Dots */}
      {showDots && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {items.map((it, idx) => {
            const on = idx === active;
            return (
              <button
                key={it.id}
                onClick={() => setActive(idx)}
                className="transition-all"
                style={{
                  width: on ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: on
                    ? (it.accentColor ?? "#5227FF")
                    : "rgba(255,255,255,0.2)",
                  border: "none",
                  cursor: "pointer",
                }}
                aria-label={`Go to ${it.title}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DefaultServiceCard({ item, active }: { item: CardStackItem; active: boolean }) {
  const accent = item.accentColor ?? "#5227FF";
  return (
    <div
      className="relative h-full w-full flex flex-col"
      style={{
        background: `linear-gradient(135deg, #0d0a1a 0%, #120e24 60%, #0a0812 100%)`,
      }}
    >
      {/* Animated glow bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${accent}22 0%, transparent 70%)`,
          opacity: active ? 1 : 0.4,
          transition: "opacity 0.4s ease",
        }}
      />

      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${accent}18 1px, transparent 1px), linear-gradient(90deg, ${accent}18 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Tag */}
      {item.tag && (
        <div className="absolute top-5 right-5">
          <span
            className="text-xs font-mono px-2 py-1 rounded-full"
            style={{
              background: `${accent}22`,
              color: accent,
              border: `1px solid ${accent}44`,
            }}
          >
            {item.tag}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-center px-8 py-8">
        {/* Icon */}
        {item.icon && (
          <div
            className="mb-5 w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              background: `${accent}22`,
              border: `1px solid ${accent}44`,
              color: accent,
            }}
          >
            <div style={{ width: 28, height: 28 }}>{item.icon}</div>
          </div>
        )}

        {/* 3D-style title */}
        <h3
          className="font-black mb-3 leading-tight tracking-tight"
          style={{
            fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
            color: "#fff",
            textShadow: active
              ? `0 0 40px ${accent}88, 0 2px 0 ${accent}44`
              : "none",
          }}
        >
          {item.title}
        </h3>

        {item.description && (
          <p
            className="leading-relaxed"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.9rem",
              maxWidth: 380,
            }}
          >
            {item.description}
          </p>
        )}

        {item.renderContent && (
          <div className="mt-4">{item.renderContent()}</div>
        )}
      </div>

      {/* Bottom glow line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
          opacity: active ? 1 : 0.3,
        }}
      />
    </div>
  );
}
