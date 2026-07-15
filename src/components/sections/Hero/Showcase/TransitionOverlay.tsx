"use client";

import { forwardRef } from "react";
import styles from "./Showcase.module.css";

const TransitionOverlay = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className={styles.transitionOverlay} />
));

TransitionOverlay.displayName = "TransitionOverlay";

export default TransitionOverlay;