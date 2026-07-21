"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./VapourWords.module.css";

const WORDS = ["The", "services", "We", "Provide"];
const WORD_MS = 2600; // ms each word holds

// Module-level flag — survives component unmounts and section re-activations.
// Once the animation has played once per page-load we never replay it.
let _vapourPlayed = false;

interface Props {
  active: boolean;
  onComplete?: () => void;
}

export default function VapourWords({ active, onComplete }: Props) {
  const [wordIndex, setWordIndex] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef   = useRef(false);
  const cbRef     = useRef(onComplete);
  cbRef.current   = onComplete;

  useEffect(() => {
    if (!active) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      setWordIndex(0);
      doneRef.current = false;
      return;
    }

    // If this animation already ran during this page-load, skip straight to
    // the completion callback so the parent transitions immediately.
    if (_vapourPlayed) {
      cbRef.current?.();
      return;
    }

    doneRef.current = false;
    setWordIndex(0);

    const advance = (idx: number) => {
      timerRef.current = setTimeout(() => {
        if (idx < WORDS.length - 1) {
          setWordIndex(idx + 1);
          advance(idx + 1);
        } else if (!doneRef.current) {
          doneRef.current = true;
          _vapourPlayed = true; // remember for all future re-activations
          // small extra pause so the last word fully vaporises before transition
          timerRef.current = setTimeout(() => cbRef.current?.(), 900);
        }
      }, WORD_MS);
    };
    advance(0);

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className={styles.wrap}>
      {/* key re-mounts the element so the CSS animation restarts for each word */}
      <span key={wordIndex} className={styles.word}>
        {WORDS[wordIndex]}
      </span>
    </div>
  );
}
