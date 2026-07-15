"use client";

import {
  useRef,
  useEffect,
  ReactNode,
} from "react";

import { gsap } from "@/lib/gsap";


interface Props {
  children: ReactNode;
  strength?: number;
}


export default function Magnetic({
  children,
  strength = 0.35,
}: Props) {


const ref = useRef<HTMLDivElement>(null);



useEffect(()=>{


const element = ref.current;


if(!element) return;



const move = (e:MouseEvent)=>{


const box =
element.getBoundingClientRect();



const x =
e.clientX -
(box.left + box.width/2);



const y =
e.clientY -
(box.top + box.height/2);



gsap.to(element,{

x:x * strength,

y:y * strength,

duration:.5,

ease:"power3.out"

});


};



const leave = ()=>{


gsap.to(element,{

x:0,

y:0,

duration:.8,

ease:"elastic.out(1,0.3)"

});


};



element.addEventListener(
"mousemove",
move
);


element.addEventListener(
"mouseleave",
leave
);



return()=>{

element.removeEventListener(
"mousemove",
move
);


element.removeEventListener(
"mouseleave",
leave
);


}



},[strength]);




return(

<div ref={ref}>

{children}

</div>

)

}