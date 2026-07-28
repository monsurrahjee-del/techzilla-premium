"use client";

import { useLoaded } from "@/hooks/useLoaded";
import Sticker from "./Sticker";

const stickers = [
  // ── upper cluster ───────────────────────────────────────────────────
  { src:"/sticker_img/s_05.png", top:"10%",  left:"40%", size:88,  rotate:-9,  delay:0.0, depth:24, floatDur:5.2, floatAmp:13, front:false },
  { src:"/sticker_img/s_02.png", top:"14%",  left:"62%", size:96,  rotate: 11, delay:0.4, depth:30, floatDur:5.8, floatAmp:14, front:false },
  { src:"/sticker_img/s_11.png", top:"8%",   left:"24%", size:68,  rotate:  7, delay:1.6, depth:16, floatDur:6.8, floatAmp:9,  front:false },

  // ── mid cluster — overlapping the word ──────────────────────────────
  { src:"/sticker_img/s_01.png", top:"36%",  left:"18%", size:108, rotate:-14, delay:0.2, depth:36, floatDur:4.9, floatAmp:17, front:true  },
  { src:"/sticker_img/s_04.png", top:"38%",  left:"66%", size:96,  rotate: 13, delay:0.6, depth:28, floatDur:5.5, floatAmp:13, front:true  },

  // ── lower cluster ────────────────────────────────────────────────────
  { src:"/sticker_img/s_06.png", top:"64%",  left:"44%", size:100, rotate: 16, delay:1.8, depth:38, floatDur:5.3, floatAmp:15, front:true  },
  { src:"/sticker_img/s_10.png", top:"68%",  left:"22%", size:72,  rotate: -8, delay:2.0, depth:18, floatDur:6.5, floatAmp:10, front:false },
];

export default function StickerCloud() {
  const loaded = useLoaded();

  // Don't render any stickers until the hero is ready — they'll appear
  // naturally with their own float animations as the page reveals.
  if (!loaded) return null;

  return (
    <>
      {stickers.map((s) => (
        <Sticker key={`${s.src}-${s.top}`} {...s} />
      ))}
    </>
  );
}
