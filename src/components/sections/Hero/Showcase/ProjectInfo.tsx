"use client";

import styles from "./Showcase.module.css";

interface Props {
  title: string;
  category: string;
  tech: string[];
}

export default function ProjectInfo({
  title,
  category,
  tech,
}: Props) {
  return (
    <div className={styles.projectInfo}>
      <p className={styles.category}>
        {category}
      </p>

      <h3>
        {title}
      </h3>

      <div className={styles.tech}>
        {tech.map((item) => (
          <span key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}