"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

import styles from "./Hero.module.css";
import Parallax from "@/components/ui/Parallax";


const items = [
  "AI",
  "React",
  "Next.js",
  "Three.js",
  "Node.js",
];


export default function FloatingElements(){

const container = useRef<HTMLDivElement>(null);


useEffect(()=>{

const elements =
container.current?.querySelectorAll(
".floatingItem"
);


if(!elements) return;


elements.forEach((item,index)=>{


gsap.to(item,{

y: index % 2 === 0 ? -25 : 25,

x: index * 8,

duration:3 + index,

repeat:-1,

yoyo:true,

ease:"sine.inOut",

delay:index*.3

});


});


},[]);



return (

<div
ref={container}
className={styles.floatingContainer}
>

{items.map((item,index)=>(

<Parallax
key={item}
strength={30 + index * 10}
className={styles[`float${index}`]}
>

<div
className={`${styles.floatingItem} floatingItem`}
>

{item}

</div>

</Parallax>

))}

</div>

);

}