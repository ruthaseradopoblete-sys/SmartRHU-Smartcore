"use client";
import { Patient } from "../doctor/data";
import styles from "../styles/dashboard.module.css";

function initials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0,2); }

interface Props {
  patients: Patient[];
  onCancel: (id: number) => void;
  onConsult: (id: number) => void;
}
export default function PendingPatients({ patients, onCancel, onConsult }: Props) {
  const active = patients.filter(p => p.status !== "done").length;
  return (
    <div className={`${styles.card} ${styles.pendingCard}`}>
      <div className={styles.pendingHeader}>
        <h3 className={styles.pendingTitle}>Pending Patients</h3>
        <span className={styles.pendingCount}>{active}</span>
      </div>
      <div className={styles.pendingList}>
        {patients.map(p => (
          <div key={p.id} className={`${styles.pendingItem}${p.status==="done" ? " "+styles.pendingDone : ""}`}>
            <div className={styles.pendingItemTop}>
              <div className={styles.pendingAvatar}>{initials(p.name)}</div>
              <div className={styles.pendingInfo}>
                <div className={styles.pendingName}>{p.name}</div>
                <div className={styles.pendingTime}>{p.time}</div>
              </div>
              <span className={`${styles.statusPill} ${
                p.status==="waiting" ? styles.statusWaiting :
                p.status==="urgent"  ? styles.statusUrgent  : styles.statusDone}`}>
                {p.status}
              </span>
            </div>
            {p.status !== "done" && (
              <div className={styles.pendingBtns}>
                <button className={`${styles.pBtn} ${styles.pBtnCancel}`} onClick={() => onCancel(p.id)}>✕ CANCEL</button>
                <button className={`${styles.pBtn} ${styles.pBtnConsult}`} onClick={() => onConsult(p.id)}>✓ CONSULT</button>
              </div>
            )}
          </div>
        ))}
        {patients.length === 0 && <div className={styles.emptyState}>No patients in queue.</div>}
      </div>
    </div>
  );
}
