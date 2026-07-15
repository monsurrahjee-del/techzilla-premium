"use client";


import Magnetic from "@/components/ui/Magnetic";

import styles from "./Hero.module.css";



export default function HeroButtons(){


return(

<div className={styles.buttons}>


<Magnetic>

<a
href="#contact"
className={styles.primary}
>

Start A Project

<span>
↗
</span>

</a>

</Magnetic>



<Magnetic>

<a
href="#projects"
className={styles.secondary}
>

View Our Work

</a>

</Magnetic>



</div>

)

}