"use client";

import { useEffect, useRef } from "react";
import styles from "./VapourWords.module.css";

const DEFAULT_WORDS = ["The", "Services", "We", "Provide"];
const WORD_MS = 2600; // ms each word holds

interface Props {
  /** Words to cycle through. Defaults to the services intro sequence. */
  words?: string[];
  active: boolean;
  onComplete?: () => void;
}

export default function VapourWords({
  words = DEFAULT_WORDS,
  active,
  onComplete,
}: Props) {
  const wordIndexRef = useRef(0);
  const spanRef      = useRef<HTMLSpanElement>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef      = useRef(false);
  const cbRef        = useRef(onComplete);
  cbRef.current      = onComplete;

  useEffect(() => {
    if (!active) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      wordIndexRef.current = 0;
      doneRef.current      = false;
      if (spanRef.current) spanRef.current.textContent = words[0] ?? "";
      return;
    }

    doneRef.current      = false;
    wordIndexRef.current = 0;

    // Show the first word immediately
    if (spanRef.current) {
      spanRef.current.textContent = words[0] ?? "";
      // Force re-trigger CSS animation by toggling the class
      spanRef.current.classList.remove(styles.word);
      void spanRef.current.offsetWidth; // reflow
      spanRef.current.classList.add(styles.word);
    }

    const advance = (idx: number) => {
      timerRef.current = setTimeout(() => {
        const nextIdx = idx + 1;
        if (nextIdx < words.length) {
          wordIndexRef.current = nextIdx;
          if (spanRef.current) {
            spanRef.current.textContent = words[nextIdx] ?? "";
            // Re-trigger animation
            spanRef.current.classList.remove(styles.word);
            void spanRef.current.offsetWidth;
            spanRef.current.classList.add(styles.word);
          }
          advance(nextIdx);
        } else if (!doneRef.current) {
          doneRef.current = true;
          // Small extra pause so the last word fully vaporises before transition
          timerRef.current = setTimeout(() => cbRef.current?.(), 900);
        }
      }, WORD_MS);
    };
    advance(0);

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div className={styles.wrap}>
      <span ref={spanRef} className={styles.word}>
        {words[0]}
      </span>
    </div>
  );
}
