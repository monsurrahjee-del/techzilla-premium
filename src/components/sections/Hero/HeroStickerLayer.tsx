"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import Parallax from "@/components/ui/Parallax";
import styles from "./Hero.module.css";

const stickers = [
  {
    image: "/sticker_img/s_01.png",
    className: "sticker1",
    rotate: -12,
    scale: 1,
    float: 18,
    depth: 18,
  },
  {
    image: "/sticker_img/s_02.png",
    className: "sticker2",
    rotate: 8,
    scale: .9,
    float: 22,
    depth: 25,
  },
  {
    image: "/sticker_img/s_03.png",
    className: "sticker3",
    rotate: -5,
    scale: 1.05,
    float: 16,
    depth: 20,
  },
  {
    image: "/sticker_img/s_04.png",
    className: "sticker4",
    rotate: 15,
    scale: .8,
    float: 26,
    depth: 28,
  },
  {
    image: "/sticker_img/s_05.png",
    className: "sticker5",
    rotate: -18,
    scale: 1,
    float: 20,
    depth: 16,
  },
  {
    image: "/sticker_img/s_06.png",
    className: "sticker6",
    rotate: 6,
    scale: .95,
    float: 24,
    depth: 30,
  },
  {
    image: "/sticker_img/s_07.png",
    className: "sticker7",
    rotate: -8,
    scale: .85,
    float: 18,
    depth: 18,
  },
  {
    image: "/sticker_img/s_08.png",
    className: "sticker8",
    rotate: 10,
    scale: 1,
    float: 21,
    depth: 24,
  },
  {
    image: "/sticker_img/s_09.png",
    className: "sticker9",
    rotate: -15,
    scale: .92,
    float: 20,
    depth: 22,
  },
  {
    image: "/sticker_img/s_10.png",
    className: "sticker10",
    rotate: 14,
    scale: 1,
    float: 24,
    depth: 28,
  },
  {
    image: "/sticker_img/s_11.png",
    className: "sticker11",
    rotate: -4,
    scale: .9,
    float: 18,
    depth: 18,
  },
  {
    image: "/sticker_img/s_12.png",
    className: "sticker12",
    rotate: 7,
    scale: 1,
    float: 22,
    depth: 20,
  },
];

export default function HeroStickerLayer() {
  const container = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const items =
      container.current?.querySelectorAll(".heroSticker");

    if (!items) return;

    items.forEach((item, i) => {
      gsap.fromTo(
        item,
        {
          opacity: 0,
          scale: .7,
          y: 80,
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.2,
          ease: "power4.out",
          delay: i * .08,
        }
      );

      gsap.to(item, {
        y: `+=${stickers[i].float}`,
        duration: 3 + i * .4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
  }, []);

  return (
    <div
      ref={container}
      className={styles.stickerLayer}
    >
      {stickers.map((sticker, index) => (
        <Parallax
          key={index}
          strength={sticker.depth}
        >
          <div
            className={`${styles.heroSticker} ${styles[sticker.className]}`}
            style={{
              rotate: `${sticker.rotate}deg`,
              scale: sticker.scale,
            }}
          >
            <Image
              src={sticker.image}
              alt=""
              width={240}
              height={240}
              priority={index < 4}
            />
          </div>
        </Parallax>
      ))}
    </div>
  );
}