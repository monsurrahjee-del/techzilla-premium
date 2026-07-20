"use client";

import styles from "./Showcase.module.css";

interface Props {
  title: string;
  category: string;
  tech: string[];
  url: string;
  index: number;
  total: number;
}

export default function ProjectInfo({
  title,
  category,
  tech,
  index,
  total,
}: Props) {
  return (
    <div className={styles.projectInfo}>
      <div className={styles.projectMeta}>
        <span className={styles.projectCount}>
          {String(index + 1).padStart(2, "0")}
          <span className={styles.projectCountTotal}>
            {" / "}
            {String(total).padStart(2, "0")}
          </span>
        </span>

        <span className={styles.category}>{category}</span>
      </div>

      <h3>{title}</h3>

      <div className={styles.tech}>
        {tech.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}
