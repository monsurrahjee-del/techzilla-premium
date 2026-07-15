"use client";


import { useRef } from "react";

import { useMouse } from "@/hooks/useMouse";

import { gsap } from "@/lib/gsap";

import { useEffect } from "react";


import styles from "./Hero.module.css";



export default function HeroContent({

children

}:{

children:React.ReactNode

}){


const ref = useRef<HTMLDivElement>(null);


const mouse = useMouse();



useEffect(()=>{


if(!ref.current)return;


gsap.to(ref.current,{

x:
(mouse.x-window.innerWidth/2)*.02,


y:
(mouse.y-window.innerHeight/2)*.02,


rotateY:
(mouse.x-window.innerWidth/2)*.005,


duration:1.2,


ease:"power3.out"

});



},[mouse]);



return(

<div
ref={ref}
className={styles.content}
>

{children}


</div>

)

}