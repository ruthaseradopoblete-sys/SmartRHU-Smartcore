"use client";
import { useEffect, useState } from "react";
import { Patient, MEDICINES } from "../doctor/data";
import styles from "../styles/dashboard.module.css";

interface Props { open: boolean; patient: Patient | null; onClose: () => void; onSend: (name: string) => void; }

export default function PrescriptionModal({ open, patient, onClose, onSend }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ name:"", date:today, age:"", gender:"", civil:"", addr:"", medicine:"", qty:"", dosage:"", notes:"" });

  useEffect(() => {
    if (open) setForm({ name:patient?.name??"", date:today, age:patient?.age??"", gender:patient?.gender??"", civil:patient?.civil??"", addr:patient?.addr??"", medicine:"", qty:"", dosage:"", notes:"" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleSend() {
    if (!form.medicine) { alert("Please select a medicine."); return; }
    onSend(form.name);
    alert(`✅ Prescription sent!\nPatient: ${form.name}\nMedicine: ${form.medicine}${form.dosage ? "\nDosage: "+form.dosage : ""}`);
    onClose();
  }

  if (!open) return null;
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}><h2>Prescription</h2><button className={styles.modalClose} onClick={onClose}>✕</button></div>
        <div className={styles.modalBody}>
          <div className={styles.rxSymbol}>Rx</div>
          <div className={styles.formRow2}>
            <div className={styles.formGroup}><label>Patient Name</label><input className={styles.modalInput} value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div className={styles.formGroup}><label>Date</label><input className={styles.modalInput} type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          </div>
          <div className={styles.formRow3}>
            <div className={styles.formGroup}><label>Age</label><input className={styles.modalInput} value={form.age} onChange={e => set("age", e.target.value)} /></div>
            <div className={styles.formGroup}><label>Gender</label><input className={styles.modalInput} value={form.gender} onChange={e => set("gender", e.target.value)} /></div>
            <div className={styles.formGroup}><label>Civil Status</label><input className={styles.modalInput} value={form.civil} onChange={e => set("civil", e.target.value)} /></div>
          </div>
          <div className={styles.formGroup}><label>Address</label><input className={styles.modalInput} value={form.addr} onChange={e => set("addr", e.target.value)} /></div>
          <div className={styles.formRow2}>
            <div className={styles.formGroup}><label>Medicine</label>
              <select className={styles.modalInput} value={form.medicine} onChange={e => set("medicine", e.target.value)}>
                <option value="">-- Select Medicine --</option>
                {MEDICINES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}><label>Quantity</label><input className={styles.modalInput} value={form.qty} onChange={e => set("qty", e.target.value)} placeholder="e.g. 21 tabs" /></div>
          </div>
          <div className={styles.formGroup}><label>Dosage &amp; Frequency</label><input className={styles.modalInput} value={form.dosage} onChange={e => set("dosage", e.target.value)} placeholder="e.g. 1 tab TID x 7 days" /></div>
          <div className={styles.formGroup}><label>Notes</label><textarea className={`${styles.modalInput} ${styles.modalTextarea}`} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional instructions…" /></div>
        </div>
        <div className={styles.modalFooter}>
          <button className={`${styles.actionBtn} ${styles.outline}`} onClick={onClose}>CANCEL</button>
          <button className={`${styles.actionBtn} ${styles.primary}`} onClick={handleSend}>SEND</button>
        </div>
      </div>
    </div>
  );
}
