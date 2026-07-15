"use client";


import { useEffect, useRef } from "react";

import { gsap } from "@/lib/gsap";

import { useMouse } from "@/hooks/useMouse";
import Parallax from "@/components/ui/Parallax";

import styles from "./Hero.module.css";



export default function HeroBackground(){


const glowRef = useRef<HTMLDivElement>(null);


const mouse = useMouse();



useEffect(()=>{


const glow = glowRef.current;


if(!glow)return;



gsap.to(glow,{

x:
(mouse.x - window.innerWidth/2) * .15,


y:
(mouse.y - window.innerHeight/2) * .15,


duration:1.5,


ease:"power3.out"

});



},[mouse]);




return(

<div className={styles.background}>

<Parallax strength={10}>
<div
ref={glowRef}
className={styles.glow}
/>
</Parallax>

<div className={styles.grid}/>


<div className={styles.spotlight}/>


</div>

)

}