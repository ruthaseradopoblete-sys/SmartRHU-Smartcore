"use client";
import { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css";
import { supabase } from "@/lib/supabase";

const LAB_SECTIONS = [
  { title:"HEMATOLOGY", col:0, tests:[
    { label:"Hgb/Hct",                          col:"hgb_hct" },
    { label:"Complete Blood Count with Platelet", col:"cbc_with_platelet" },
  ]},
  { title:"MICROSCOPY / PARASITOLOGY", col:1, tests:[
    { label:"Urinalysis",      col:"urinalysis" },
    { label:"Fecalysis",       col:"fecalysis" },
    { label:"Pregnancy Test",  col:"pregnancy_test" },
  ]},
  { title:"BLOOD CHEMISTRY", col:0, note:"Fasting: 8-10 hours no food/water\n*Last meal: 10:30PM – 12AM*", tests:[
    { label:"Random Blood Sugar",  col:"random_blood_sugar" },
    { label:"Fasting Blood Sugar", col:"fasting_blood_sugar" },
    { label:"Cholesterol",         col:"cholesterol" },
    { label:"Triglycerides",       col:"triglycerides" },
    { label:"Lipid Profile",       col:"lipid_profile" },
    { label:"Blood Uric Acid",     col:"blood_uric_acid" },
  ]},
  { title:"SEROLOGY", col:1, tests:[
    { label:"ABO, Rh Blood Typing", col:"abo_rh_blood_typing" },
    { label:"Dengue NS1",           col:"dengue_ns1" },
    { label:"Dengue IgG, IgM",      col:"dengue_igg_igm" },
    { label:"HbsAg",                col:"hbsag" },
    { label:"Gene Xpert",           col:"gene_xpert" },
  ]},
  { title:"MICROBIOLOGY", col:0, tests:[
    { label:"AFB/DSSM",              col:"afb_dssm" },
    { label:"Culture and Sensitivity",col:"culture_and_sensitivity" },
  ]},
];

// All test columns for easy iteration
const ALL_TESTS = LAB_SECTIONS.flatMap(s => s.tests);

interface ModalPatient {
  name: string; age: string; gender: string; civil: string; addr: string;
}
interface Props {
  open: boolean;
  patient: ModalPatient | null;
  onClose: () => void;
  onSend: (name: string) => void;
}

export default function LabRequestModal({ open, patient, onClose, onSend }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form,    setForm]    = useState({ name:"", date:today, age:"", gender:"", civil:"", addr:"" });
  const [checked, setChecked] = useState<string[]>([]);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name:   patient?.name   ?? "",
        date:   today,
        age:    patient?.age    ?? "",
        gender: patient?.gender ?? "",
        civil:  patient?.civil  ?? "",
        addr:   patient?.addr   ?? "",
      });
      setChecked([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient]);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function toggle(col: string) { setChecked(c => c.includes(col) ? c.filter(x => x !== col) : [...c, col]); }

  async function handleSend() {
    if (!checked.length) { alert("Please select at least one test."); return; }
    setSaving(true);

    try {
      // 1. Look up patient UUID
      const parts     = form.name.trim().split(" ");
      const lastName  = parts.length > 1 ? parts[parts.length - 1] : "";
      const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";

      const { data: patientRows } = await supabase
        .from("patients").select("id")
        .ilike("first_name", firstName)
        .ilike("last_name",  lastName);

      const patientId = patientRows?.[0]?.id ?? null;
      if (!patientId) {
        alert(`❌ Patient "${form.name}" not found in the database.`);
        return;
      }

      // 2. Build insert payload — map checked columns to true
      const testPayload: Record<string, boolean> = {};
      ALL_TESTS.forEach(t => { testPayload[t.col] = checked.includes(t.col); });

      const { error } = await supabase
        .from("laboratory_requests")
        .insert({
          patient_id:   patientId,
          request_date: form.date,
          status:       "pending",
          ...testPayload,
        });

      if (error) { alert(`❌ Failed to send lab request:\n${error.message}`); return; }

      onSend(form.name);
      const testLabels = checked.map(col => ALL_TESTS.find(t => t.col === col)?.label ?? col);
      alert(`✅ Lab request sent!\nPatient: ${form.name}\nTests: ${testLabels.join(", ")}`);
      onClose();

    } catch (err) {
      console.error(err);
      alert("❌ Unexpected error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const col0 = LAB_SECTIONS.filter(s => s.col === 0);
  const col1 = LAB_SECTIONS.filter(s => s.col === 1);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalLg}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Laboratory Request</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formRow2}>
            <div className={styles.formGroup}><label>Patient Name</label>
              <input className={styles.modalInput} value={form.name} onChange={e => setF("name", e.target.value)} />
            </div>
            <div className={styles.formGroup}><label>Date</label>
              <input className={styles.modalInput} type="date" value={form.date} onChange={e => setF("date", e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow3}>
            <div className={styles.formGroup}><label>Age</label>
              <input className={styles.modalInput} value={form.age} onChange={e => setF("age", e.target.value)} />
            </div>
            <div className={styles.formGroup}><label>Gender</label>
              <input className={styles.modalInput} value={form.gender} onChange={e => setF("gender", e.target.value)} />
            </div>
            <div className={styles.formGroup}><label>Civil Status</label>
              <input className={styles.modalInput} value={form.civil} onChange={e => setF("civil", e.target.value)} />
            </div>
          </div>
          <div className={styles.formGroup}><label>Address</label>
            <input className={styles.modalInput} value={form.addr} onChange={e => setF("addr", e.target.value)} />
          </div>

          <div className={styles.labGrid}>
            <div className={styles.labCol}>
              {col0.map(sec => (
                <div key={sec.title} style={{marginBottom:12}}>
                  <div className={styles.labSectionTitle}>{sec.title}</div>
                  {sec.tests.map(t => (
                    <label key={t.col} className={styles.checkboxLabel}>
                      <input type="checkbox" checked={checked.includes(t.col)}
                        onChange={() => toggle(t.col)}
                        style={{accentColor:"#16a34a",width:14,height:14}} />
                      {t.label}
                    </label>
                  ))}
                  {"note" in sec && sec.note && <p className={styles.fastingNote}>{sec.note}</p>}
                </div>
              ))}
            </div>
            <div className={styles.labCol}>
              {col1.map(sec => (
                <div key={sec.title} style={{marginBottom:12}}>
                  <div className={styles.labSectionTitle}>{sec.title}</div>
                  {sec.tests.map(t => (
                    <label key={t.col} className={styles.checkboxLabel}>
                      <input type="checkbox" checked={checked.includes(t.col)}
                        onChange={() => toggle(t.col)}
                        style={{accentColor:"#16a34a",width:14,height:14}} />
                      {t.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={`${styles.actionBtn} ${styles.outline}`} onClick={onClose} disabled={saving}>CANCEL</button>
          <button className={`${styles.actionBtn} ${styles.primary}`} onClick={handleSend} disabled={saving}
            style={saving?{opacity:.7,cursor:"not-allowed"}:{}}>
            {saving ? "SENDING…" : "SEND"}
          </button>
        </div>
      </div>
    </div>
  );
}