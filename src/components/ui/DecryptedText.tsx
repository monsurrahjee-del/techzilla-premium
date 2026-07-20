"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  characters?: string;
  /** Applied to each revealed character */
  className?: string;
  /** Applied to each not-yet-revealed (scrambled) character */
  encryptedClassName?: string;
  parentClassName?: string;
  revealDirection?: "start" | "end" | "center";
  /** When true the animation runs; when false it resets */
  running: boolean;
  onComplete?: () => void;
}

const DEFAULT_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+<>/\\";

export default function DecryptedText({
  text,
  speed = 28,
  characters = DEFAULT_CHARS,
  className = "",
  encryptedClassName = "",
  parentClassName = "",
  revealDirection = "start",
  running,
  onComplete,
}: DecryptedTextProps) {
  const charsArr = characters.split("");

  const randomChar = useCallback(
    () => charsArr[Math.floor(Math.random() * charsArr.length)],
    [charsArr]
  );

  const makeScrambled = useCallback(
    (revealed: Set<number>) =>
      text
        .split("")
        .map((c, i) => {
          if (c === " ") return " ";
          if (revealed.has(i)) return text[i];
          return randomChar();
        })
        .join(""),
    [text, randomChar]
  );

  const [displayText, setDisplayText] = useState(() => makeScrambled(new Set()));
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getNextIndex = useCallback(
    (rev: Set<number>): number => {
      const len = text.length;
      if (revealDirection === "end") return len - 1 - rev.size;
      if (revealDirection === "center") {
        const mid = Math.floor(len / 2);
        const off = Math.floor(rev.size / 2);
        const idx = rev.size % 2 === 0 ? mid + off : mid - off - 1;
        if (idx >= 0 && idx < len && !rev.has(idx)) return idx;
        for (let i = 0; i < len; i++) if (!rev.has(i)) return i;
        return 0;
      }
      // "start" — left-to-right
      return rev.size;
    },
    [text, revealDirection]
  );

  // ── Start / tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || done) return;

    intervalRef.current = setInterval(() => {
      setRevealed((prev) => {
        if (prev.size >= text.length) {
          clearInterval(intervalRef.current!);
          setDone(true);
          setDisplayText(text);
          onComplete?.();
          return prev;
        }
        const next = getNextIndex(prev);
        const newSet = new Set(prev);
        newSet.add(next);
        setDisplayText(makeScrambled(newSet));
        return newSet;
      });
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, done]);

  // ── Reset when running goes false ─────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const empty = new Set<number>();
      setRevealed(empty);
      setDone(false);
      setDisplayText(makeScrambled(empty));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return (
    <span className={parentClassName}>
      {/* screen-reader text */}
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
        }}
      >
        {text}
      </span>
      <span aria-hidden="true">
        {displayText.split("").map((char, i) => {
          const isRevealed = revealed.has(i) || done;
          return (
            <span key={i} className={isRevealed ? className : encryptedClassName}>
              {char}
            </span>
          );
        })}
      </span>
    </span>
  );
}
