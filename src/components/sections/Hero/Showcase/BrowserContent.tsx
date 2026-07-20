"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

import styles from "./Showcase.module.css";

interface Props{
    image:string;
    title:string;
}

export default function BrowserContent({

image,
title

}:Props){

const viewportRef=useRef<HTMLDivElement>(null);

const imageRef=useRef<HTMLDivElement>(null);

useEffect(()=>{

const viewport=viewportRef.current;

const wrapper=imageRef.current;

if(!viewport||!wrapper) return;

const img=wrapper.querySelector("img");

if(!img) return;

const animate=()=>{

const viewportHeight=

viewport.clientHeight;

const imageHeight=

img.clientHeight;

const distance = imageHeight - viewportHeight;

gsap.killTweensOf(wrapper);

gsap.set(wrapper, {
  y: 0,
  scale: 1,
});

// Short images (no scrolling needed)
if (distance <= 0) {
  gsap.timeline({
    repeat: -1,
    yoyo: true,
  })
  .to(wrapper, {
    y: -8,
    scale: 1.015,
    duration: 3,
    ease: "sine.inOut",
  });

  return;
}

// Tall images (scroll normally)
gsap.timeline({
  repeat: -1,
})
.to(wrapper, {
  y: -distance,
  duration: 10,
  ease: "none",
})
.to({}, {
  duration: 1.2,
})
.to(wrapper, {
  y: 0,
  duration: 10,
  ease: "none",
})
.to({}, {
  duration: 1,
});

};

if(img.complete){

animate();

}else{

img.onload=animate;

}

},[image]);

return(

<div
ref={viewportRef}
className={styles.browserViewport}
>

<div
ref={imageRef}
className={styles.browserImage}
>

<Image

src={image}

alt={title}

fill

priority

sizes="100vw"

className={styles.projectImage}

/>

</div>

</div>

);

}