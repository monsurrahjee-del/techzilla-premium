"use client";

import { useEffect, useState } from "react";
import styles from "./Hero.module.css";

const format = () =>
  new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

export default function HeroClock() {
  const [time, setTime] = useState(() => format());

  useEffect(() => {
    const id = setInterval(() => setTime(format()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.clock} suppressHydrationWarning>
      <span suppressHydrationWarning>{time}</span>
      <span className={styles.clockZone}>GMT+1&nbsp;NG</span>
    </div>
  );
}
