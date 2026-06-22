"use client";
import { useState } from "react";
import styles from "../styles/dashboard.module.css";

// ── PH Holidays (update yearly — proclamation-based dates like Eid'l Fitr/Adha need manual update) ──
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

function isHoliday(d: Date) {
  return PH_HOLIDAYS[toISODate(d)] !== undefined;
}

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function MiniCalendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth     = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  function isToday(d: Date) {
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }

  return (
    <div className={styles.miniCal}>
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prevMonth}>‹</button>
        <span className={styles.calTitle}>{MONTHS[month]} {year}</span>
        <button className={styles.calNav} onClick={nextMonth}>›</button>
      </div>

      <div className={styles.calGrid}>
        {DOW.map((d, i) => (
          <div
            key={d}
            className={`${styles.calDow} ${i === 0 ? styles.calDowSun : ""}`}
          >
            {d}
          </div>
        ))}

        {cells.map((d, idx) => {
          if (!d) return <div key={`empty-${idx}`} />;

          const sun   = d.getDay() === 0;
          const hol   = isHoliday(d);
          const todayCell = isToday(d);
          const holidayName = PH_HOLIDAYS[toISODate(d)];

          return (
            <div
              key={toISODate(d)}
              className={[
                styles.calDay,
                sun ? styles.calDaySun : "",
                hol ? styles.calDayHoliday : "",
                todayCell ? styles.calDayToday : "",
              ].join(" ").trim()}
              title={holidayName || ""}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}