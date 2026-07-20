"use client";

import { useEffect, useRef } from "react";
import SplitType from "split-type";

import { gsap } from "@/lib/gsap";

import styles from "./Hero.module.css";


export default function HeroTitle() {

  const titleRef = useRef<HTMLHeadingElement>(null);


  useEffect(() => {

    const element = titleRef.current;

    if (!element) return;


    const split = new SplitType(element, {
      types: "lines,words,chars",
    });


    gsap.set(split.chars, {
      yPercent: 120,
      opacity:0,
      rotateX:-80,
    });


    gsap.to(split.chars, {

      yPercent:0,

      opacity:1,

      rotateX:0,

      stagger:0.025,

      duration:1.2,

      ease:"power4.out",

      delay:.4

    });


    return () => {
      split.revert();
    };


  }, []);



  return (

    <h1
      ref={titleRef}
      className={styles.title}
    >

      Building Digital Products
      <br />

      That People Remember.

    </h1>

  );
}