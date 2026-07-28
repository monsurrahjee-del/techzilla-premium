"use client";

import { useLoaded } from "@/hooks/useLoaded";
import Sticker from "./Sticker";

/**
 * Each sticker has unique physics — no two are identical.
 * Properties intentionally vary to create depth, weight, and personality:
 *
 * depth      — parallax strength; heavier objects have less parallax
 * floatDur   — idle float cycle duration; lighter objects float faster
 * floatAmp   — float amplitude in px
 * pull       — cursor magnetic attraction (0 = none, 1 = max)
 * maxPull    — max displacement toward cursor in px
 * stiffness  — spring stiffness; snappier = more reactive
 * damping    — spring damping; lower = more oscillation
 * front      — z-order: true = in front of "build" script word
 */
const stickers = [
  // ── upper-left cluster ──────────────────────────────────────────────
  {
    src: "/sticker_img/s_11.png", top: "6%",  left: "8%",
    size: 74,  rotate: -8,  delay: 0.0,
    depth: 14, floatDur: 6.8, floatAmp: 8,
    pull: 0.22, maxPull: 30, stiffness: 90,  damping: 16,
    front: false,
  },
  {
    src: "/sticker_img/s_05.png", top: "11%", left: "30%",
    size: 92,  rotate: -12, delay: 0.3,
    depth: 22, floatDur: 5.4, floatAmp: 14,
    pull: 0.28, maxPull: 38, stiffness: 110, damping: 20,
    front: false,
  },

  // ── upper-right cluster ─────────────────────────────────────────────
  {
    src: "/sticker_img/s_02.png", top: "9%",  left: "60%",
    size: 98,  rotate:  14, delay: 0.5,
    depth: 28, floatDur: 5.8, floatAmp: 15,
    pull: 0.35, maxPull: 44, stiffness: 130, damping: 22,
    front: false,
  },
  {
    src: "/sticker_img/s_08.png", top: "5%",  left: "80%",
    size: 66,  rotate: -6,  delay: 1.2,
    depth: 10, floatDur: 7.2, floatAmp: 7,
    pull: 0.18, maxPull: 24, stiffness: 70,  damping: 14,
    front: false,
  },

  // ── mid-left — high depth, slow mass ────────────────────────────────
  {
    src: "/sticker_img/s_01.png", top: "38%", left: "6%",
    size: 112, rotate: -15, delay: 0.2,
    depth: 38, floatDur: 4.9, floatAmp: 18,
    pull: 0.42, maxPull: 52, stiffness: 150, damping: 24,
    front: true,
  },

  // ── mid-right — overlaps the script word ────────────────────────────
  {
    src: "/sticker_img/s_04.png", top: "36%", left: "72%",
    size: 100, rotate:  16, delay: 0.7,
    depth: 32, floatDur: 5.6, floatAmp: 14,
    pull: 0.38, maxPull: 48, stiffness: 140, damping: 21,
    front: true,
  },

  // ── lower cluster ────────────────────────────────────────────────────
  {
    src: "/sticker_img/s_06.png", top: "66%", left: "40%",
    size: 104, rotate:  18, delay: 1.8,
    depth: 40, floatDur: 5.2, floatAmp: 16,
    pull: 0.45, maxPull: 54, stiffness: 160, damping: 26,
    front: true,
  },
  {
    src: "/sticker_img/s_10.png", top: "70%", left: "18%",
    size: 76,  rotate: -10, delay: 2.1,
    depth: 18, floatDur: 6.6, floatAmp: 11,
    pull: 0.24, maxPull: 32, stiffness: 85,  damping: 15,
    front: false,
  },
  {
    src: "/sticker_img/s_03.png", top: "72%", left: "68%",
    size: 86,  rotate:  8,  delay: 1.5,
    depth: 24, floatDur: 6.1, floatAmp: 12,
    pull: 0.30, maxPull: 36, stiffness: 100, damping: 18,
    front: false,
  },
];

export default function StickerCloud() {
  const loaded = useLoaded();

  if (!loaded) return null;

  return (
    <>
      {stickers.map((s) => (
        <Sticker key={`${s.src}-${s.top}-${s.left}`} {...s} />
      ))}
    </>
  );
}
