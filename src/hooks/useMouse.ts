"use client";

import { useEffect, useState } from "react";


export function useMouse(){

const [mouse,setMouse] = useState({
    x:0,
    y:0,
});


useEffect(()=>{


const move = (event:MouseEvent)=>{


setMouse({

x:
(event.clientX / window.innerWidth) - 0.5,


y:
(event.clientY / window.innerHeight) - 0.5,


});


};



window.addEventListener(
"mousemove",
move
);



return ()=>{

window.removeEventListener(
"mousemove",
move
);

};


},[]);



return mouse;

}