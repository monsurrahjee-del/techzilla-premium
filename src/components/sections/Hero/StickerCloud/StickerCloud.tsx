"use client";

import Sticker from "./Sticker";

const stickers = [
  {
    src: "/sticker_img/s_01.png",
    top: "8%",
    left: "6%",
    size: 120,
    rotate: -15,
    delay: 0,
    depth:28
  },
  {
    src: "/sticker_img/s_02.png",
    top: "18%",
    left: "82%",
    size: 100,
    rotate: 12,
    delay: 0.5,
    depth:28
  },
  {
    src: "/sticker_img/s_03.png",
    top: "62%",
    left: "8%",
    size: 110,
    rotate: -8,
    delay: 1,
    depth:28
  },
  {
    src: "/sticker_img/s_04.png",
    top: "72%",
    left: "84%",
    size: 95,
    rotate: 15,
    delay: 1.5,
    depth:28
  },
  {
    src: "/sticker_img/s_05.png",
    top: "3%",
    left: "45%",
    size: 90,
    rotate: -10,
    delay: 2,
    depth:28
  },
  {
    src: "/sticker_img/s_06.png",
    top: "82%",
    left: "48%",
    size: 105,
    rotate: 8,
    delay: 2.5,
    depth:28
  },
];

export default function StickerCloud() {
  return (
    <div>
      {stickers.map((sticker) => (
        <Sticker
          key={sticker.src}
          {...sticker}
        />
      ))}
    </div>
  );
}