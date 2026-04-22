"use client";
import { useEffect, useState } from "react";
import { Patient } from "../doctor/data";
import styles from "../styles/dashboard.module.css";

interface Props {
  open: boolean; patient: Patient | null; onClose: () => void;
  onSave: (name: string) => void; onOpenPresc: () => void; onOpenLab: () => void;
}

export default function SoapModal({ open, patient, onClose, onSave, onOpenPresc, onOpenLab }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [soap, setSoap] = useState({ history:"", s:"", o:"", a:"", p:"" });
  useEffect(() => { if (open) setSoap({ history:"", s:"", o:"", a:"", p:"" }); }, [open]);

  function handleSave() {
    if (!patient) return;
    onSave(patient.name);
    alert(`✅ Consultation saved!\nPatient: ${patient.name}`);
    onClose();
  }
  if (!open || !patient) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalLg}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}><h2>SOAP Consultation</h2><button className={styles.modalClose} onClick={onClose}>✕</button></div>
        <div className={styles.modalBody}>
          {/* Patient info — read-only, auto-filled */}
          <div className={styles.soapInfoBadge}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Patient Info (auto-filled)
          </div>
          <div className={styles.formRow2}>
            <div className={styles.formGroup}><label>Patient Name</label><input className={`${styles.modalInput} ${styles.readOnly}`} readOnly value={patient.name} /></div>
            <div className={styles.formGroup}><label>Date</label><input className={`${styles.modalInput} ${styles.readOnly}`} readOnly type="date" defaultValue={today} /></div>
          </div>
          <div className={styles.formRow3}>
            <div className={styles.formGroup}><label>Age</label><input className={`${styles.modalInput} ${styles.readOnly}`} readOnly value={patient.age} /></div>
            <div className={styles.formGroup}><label>Gender</label><input className={`${styles.modalInput} ${styles.readOnly}`} readOnly value={patient.gender} /></div>
            <div className={styles.formGroup}><label>Civil Status</label><input className={`${styles.modalInput} ${styles.readOnly}`} readOnly value={patient.civil} /></div>
          </div>
          <div className={styles.formGroup}><label>Address</label><input className={`${styles.modalInput} ${styles.readOnly}`} readOnly value={patient.addr} /></div>
          <div className={styles.formGroup}><label>Medical History</label>
            <textarea className={styles.soapTextarea} value={soap.history} onChange={e => setSoap(f => ({...f, history:e.target.value}))} placeholder="Previous diagnoses, allergies, surgeries…" />
          </div>
          <div className={styles.soapLabel}>SOAP CONSULTATION</div>
          {[["s","Subjective (S)","Chief complaint, HPI…"],["o","Objective (O)","Vitals: BP ___, HR ___, Temp ___, SpO2 ___. PE findings…"],["a","Assessment (A)","Diagnosis / impression…"],["p","Plan (P)","Treatment, medications, referrals, follow-up…"]].map(([k,lbl,ph]) => (
            <div key={k} className={styles.formGroup}><label>{lbl}</label>
              <textarea className={styles.soapTextarea} value={(soap as any)[k]} onChange={e => setSoap(f => ({...f, [k]:e.target.value}))} placeholder={ph} />
            </div>
          ))}
        </div>
        <div className={styles.soapActions}>
          <button className={`${styles.actionBtn} ${styles.outline}`} onClick={onOpenPresc}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Prescription
          </button>
          <button className={`${styles.actionBtn} ${styles.outline}`} onClick={onOpenLab}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
            </svg>
            View Lab Result
          </button>
          <div style={{flex:1}} />
          <button className={`${styles.actionBtn} ${styles.primary}`} onClick={handleSave}>SAVE</button>
        </div>
      </div>
    </div>
  );
}
