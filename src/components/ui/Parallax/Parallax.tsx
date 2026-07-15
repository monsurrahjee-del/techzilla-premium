"use client";

import {
useEffect,
useRef,
ReactNode
} from "react";

import { gsap } from "@/lib/gsap";
import { useMouse } from "@/hooks/useMouse";


interface Props {

children:ReactNode;

strength?:number;

className?:string;

}


export default function Parallax({

children,

strength=20,

className

}:Props){


const ref =
useRef<HTMLDivElement>(null);


const mouse =
useMouse();



useEffect(()=>{


if(!ref.current)
return;


gsap.to(
ref.current,
{

x:mouse.x * strength,

y:mouse.y * strength,

duration:1.2,

ease:"power3.out"

});


},[mouse,strength]);



return (

<div
ref={ref}
className={className}
>

{children}

</div>

);


}