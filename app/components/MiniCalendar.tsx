"use client";
import { useState } from "react";
import styles from "../styles/dashboard.module.css";

const PH_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-02-25": "EDSA People Power Anniversary",
  "2026-04-02": "Maundy Thursday",
  "2026-04-03": "Good Friday",
  "2026-04-04": "Black Saturday",
  "2026-04-09": "Araw ng Kagitingan",
  "2026-05-01": "Labor Day",
  "2026-06-12": "Independence Day",
  "2026-08-21": "Ninoy Aquino Day",
  "2026-08-31": "National Heroes Day",
  "2026-11-01": "All Saints' Day",
  "2026-11-30": "Bonifacio Day",
  "2026-12-08": "Immaculate Conception",
  "2026-12-25": "Christmas Day",
  "2026-12-30": "Rizal Day",
  "2026-12-31": "Last Day of the Year",
};

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DOW    = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function MiniCalendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth     = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  function isToday(d: Date) {
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth()    === today.getMonth()    &&
      d.getDate()     === today.getDate()
    );
  }

  return (
    <div className={styles.miniCal}>
      {/* Header */}
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prevMonth}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className={styles.calTitle}>{MONTHS[month]} {year}</span>
        <button className={styles.calNav} onClick={nextMonth}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className={styles.calGrid}>
        {/* Day-of-week headers */}
        {DOW.map((d, i) => (
          <div
            key={`dow-${i}`}
            className={styles.calDow}
            style={i === 0 ? { color: "#ef4444" } : undefined}
          >
            {d}
          </div>
        ))}

        {/* Date cells */}
        {cells.map((d, idx) => {
          if (!d) return <div key={`empty-${idx}`} />;

          const isSun     = d.getDay() === 0;
          const isHol     = PH_HOLIDAYS[toISODate(d)] !== undefined;
          const todayCell = isToday(d);
          const holName   = PH_HOLIDAYS[toISODate(d)];

          return (
            <div
              key={toISODate(d)}
              title={holName || undefined}
              className={`${styles.calDay} ${todayCell ? styles.calDayToday : ""}`}
              style={
                todayCell ? undefined :
                isHol     ? { background: "var(--green-light)", color: "var(--green)", fontWeight: 700, borderRadius: 6 } :
                isSun     ? { color: "#ef4444", fontWeight: 600 } :
                undefined
              }
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}