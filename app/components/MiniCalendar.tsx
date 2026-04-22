"use client";
import { useState } from "react";
import { MONTHS, DAY_LABELS } from "../doctor/data";
import styles from "../styles/dashboard.module.css";

export default function MiniCalendar() {
  const today = new Date();
  const [y, setY] = useState(today.getFullYear());
  const [m, setM] = useState(today.getMonth());
  const days = new Date(y, m + 1, 0).getDate();
  const first = new Date(y, m, 1).getDay();

  function prev() { m === 0 ? (setM(11), setY(v => v - 1)) : setM(v => v - 1); }
  function next() { m === 11 ? (setM(0), setY(v => v + 1)) : setM(v => v + 1); }

  return (
    <div className={styles.miniCal}>
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prev}>‹</button>
        <span className={styles.calTitle}>{MONTHS[m].slice(0,3).toUpperCase()} {y}</span>
        <button className={styles.calNav} onClick={next}>›</button>
      </div>
      <div className={styles.calGrid}>
       {DAY_LABELS.map((d, i) => ( <div key={i} className={styles.calDow}>{d}</div>))}
        {Array.from({length: first}).map((_, i) => <div key={"e"+i} />)}
        {Array.from({length: days}).map((_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate() && m === today.getMonth() && y === today.getFullYear();
          return <div key={day} className={`${styles.calDay}${isToday ? " "+styles.calDayToday : ""}`}>{day}</div>;
        })}
      </div>
    </div>
  );
}
