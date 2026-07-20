"use client";

import { forwardRef } from "react";
import styles from "./Loader.module.css";

const Wipe = forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div
      ref={ref}
      className={styles.wipe}
    />
  );
});

Wipe.displayName = "Wipe";

export default Wipe;