"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./RichTypewriter.module.css";

export type RichSegment =
  | { type: "plain"; text: string }
  | { type: "highlight"; text: string }
  | { type: "link"; text: string; href: string };

interface RichTypewriterProps {
  segments: RichSegment[];
  typingSpeed?: number;
  /** When true, starts typing; when false, resets */
  running: boolean;
  onComplete?: () => void;
  cursorCharacter?: string;
}

/** Renders the progressively revealed rich text */
function RichContent({
  segments,
  charCount,
}: {
  segments: RichSegment[];
  charCount: number;
}) {
  let remaining = charCount;
  return (
    <>
      {segments.map((seg, i) => {
        if (remaining <= 0) return null;
        const visible = Math.min(remaining, seg.text.length);
        remaining -= visible;
        const text = seg.text.slice(0, visible);
        if (!text) return null;

        if (seg.type === "plain") {
          // Split on \n and insert <br /> so explicit line breaks render correctly
          const parts = text.split("\n");
          if (parts.length === 1) return <span key={i}>{text}</span>;
          return (
            <span key={i}>
              {parts.map((part, j) => (
                <span key={j}>
                  {part}
                  {j < parts.length - 1 && <br />}
                </span>
              ))}
            </span>
          );
        }
        if (seg.type === "highlight") {
          return (
            <span key={i} className={styles.highlight}>
              {text}
            </span>
          );
        }
        // link — cursor-target triggers the TargetCursor capture ring on hover
        return (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.entityLink} cursor-target`}
          >
            {text}
          </a>
        );
      })}
    </>
  );
}

export default function RichTypewriter({
  segments,
  typingSpeed = 28,
  running,
  onComplete,
  cursorCharacter = "|",
}: RichTypewriterProps) {
  const totalChars = segments.reduce((n, s) => n + s.text.length, 0);

  const [charCount, setCharCount] = useState(0);
  const [done, setDone] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Typing tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || done) return;

    const tick = () => {
      setCharCount((prev) => {
        const next = prev + 1;
        if (next >= totalChars) {
          setDone(true);
          onComplete?.();
          return totalChars;
        }
        // Variable speed: slightly randomise ±30% for natural feel
        const jitter = typingSpeed * (0.7 + Math.random() * 0.6);
        timeoutRef.current = setTimeout(tick, jitter);
        return next;
      });
    };

    const jitter = typingSpeed * (0.7 + Math.random() * 0.6);
    timeoutRef.current = setTimeout(tick, jitter);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, done]);

  // ── Reset when running goes false ─────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCharCount(0);
      setDone(false);
    }
  }, [running]);

  return (
    <>
      <RichContent segments={segments} charCount={charCount} />
      {running && !done && (
        <span className={styles.cursor} aria-hidden="true">
          {cursorCharacter}
        </span>
      )}
    </>
  );
}
