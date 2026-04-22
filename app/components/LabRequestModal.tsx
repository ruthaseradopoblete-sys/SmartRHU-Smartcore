"use client";
import { useEffect, useState } from "react";
import { Patient } from "../doctor/data";
import styles from "../styles/dashboard.module.css";

const LAB_SECTIONS = [
  { title:"HEMATOLOGY", col:0, tests:["Hgb/Hct","Complete Blood Count with Platelet Count"] },
  { title:"MICROSCOPY / PARASITOLOGY", col:1, tests:["Urinalysis","Fecalysis","Pregnancy Test"] },
  { title:"BLOOD CHEMISTRY", col:0, note:"Fasting: 8-10 hours no food/water\n*Last meal: 10:30PM – 12AM*",
    tests:["Random Blood Sugar","Fasting Blood Sugar","Cholesterol","Triglycerides","Lipid Profile","Blood Uric Acid"] },
  { title:"SEROLOGY", col:1, tests:["ABO, Rh Blood Typing","Dengue NS1","Dengue IgG, IgM","HbsAg","Gene Xpert"] },
  { title:"MICROBIOLOGY", col:0, tests:["AFB/DSSM","Culture and Sensitivity"] },
];

interface Props { open: boolean; patient: Patient | null; onClose: () => void; onSend: (name: string) => void; }

export default function LabRequestModal({ open, patient, onClose, onSend }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ name:"", date:today, age:"", gender:"", civil:"", addr:"" });
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setForm({ name:patient?.name??"", date:today, age:patient?.age??"", gender:patient?.gender??"", civil:patient?.civil??"", addr:patient?.addr??"" });
      setChecked([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function toggle(t: string) { setChecked(c => c.includes(t) ? c.filter(x => x !== t) : [...c, t]); }

  function handleSend() {
    if (!checked.length) { alert("Please select at least one test."); return; }
    onSend(form.name);
    alert(`✅ Lab request sent!\nPatient: ${form.name}\nTests: ${checked.join(", ")}`);
    onClose();
  }

  if (!open) return null;
  const col0 = LAB_SECTIONS.filter(s => s.col === 0);
  const col1 = LAB_SECTIONS.filter(s => s.col === 1);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalLg}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}><h2>Laboratory Request</h2><button className={styles.modalClose} onClick={onClose}>✕</button></div>
        <div className={styles.modalBody}>
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
          <div className={styles.labGrid}>
            <div className={styles.labCol}>
              {col0.map(sec => (
                <div key={sec.title} style={{marginBottom:8}}>
                  <div className={styles.labSectionTitle}>{sec.title}</div>
                  {sec.tests.map(t => (
                    <label key={t} className={styles.checkboxLabel}>
                      <input type="checkbox" checked={checked.includes(t)} onChange={() => toggle(t)} style={{accentColor:"#16a34a",width:14,height:14}} />{t}
                    </label>
                  ))}
                  {"note" in sec && sec.note && <p className={styles.fastingNote}>{sec.note}</p>}
                </div>
              ))}
            </div>
            <div className={styles.labCol}>
              {col1.map(sec => (
                <div key={sec.title} style={{marginBottom:8}}>
                  <div className={styles.labSectionTitle}>{sec.title}</div>
                  {sec.tests.map(t => (
                    <label key={t} className={styles.checkboxLabel}>
                      <input type="checkbox" checked={checked.includes(t)} onChange={() => toggle(t)} style={{accentColor:"#16a34a",width:14,height:14}} />{t}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={`${styles.actionBtn} ${styles.outline}`} onClick={onClose}>CANCEL</button>
          <button className={`${styles.actionBtn} ${styles.primary}`} onClick={handleSend}>SEND</button>
        </div>
      </div>
    </div>
  );
}
