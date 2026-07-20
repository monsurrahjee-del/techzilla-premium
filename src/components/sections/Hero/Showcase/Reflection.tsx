"use client";

import styles from "./Showcase.module.css";
import { forwardRef, HTMLAttributes } from "react";

const Reflection = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <div
    ref={ref}
    className={styles.reflection}
    {...props}
  />
));

Reflection.displayName = "Reflection";

export default Reflection;