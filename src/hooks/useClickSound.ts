"use client";

import { useEffect, useRef } from "react";

/**
 * When `enabled` is true, plays a short synthetic "click" tone on every
 * window click — uses the Web Audio API so no audio files are needed.
 */
export function useClickSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function play() {
      // Lazily create (and resume) the AudioContext on first click —
      // browsers block AudioContext creation before a user gesture.
      if (!ctxRef.current) {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;

      // Oscillator — short frequency sweep from ~1.1 kHz → 550 Hz
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.055);

      // A second oscillator an octave lower adds body to the click
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(550, now);
      osc2.frequency.exponentialRampToValueAtTime(275, now + 0.055);

      // Gain envelope — quick attack, fast decay (percussive)
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.0, now);
      gain2.gain.linearRampToValueAtTime(0.10, now + 0.004);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
      osc2.start(now);
      osc2.stop(now + 0.08);
    }

    window.addEventListener("click", play, { capture: true });
    return () => window.removeEventListener("click", play, { capture: true });
  }, [enabled]);
}
