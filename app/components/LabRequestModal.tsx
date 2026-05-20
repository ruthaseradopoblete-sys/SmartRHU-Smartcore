"use client";
import { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css";
import { supabase } from "@/lib/supabase";
import { logAction } from '@/utils/auditLog'// HATDOG KA LYNNEL
import { useAuth } from '@/context/AuthContext'// DAGDAG ITO LYNNEL

const LAB_SECTIONS = [
  { title:"HEMATOLOGY", col:0, tests:[
    { label:"Hgb/Hct",                           col:"hgb_hct" },
    { label:"Complete Blood Count with Platelet", col:"cbc_with_platelet" },
  ]},
  { title:"MICROSCOPY / PARASITOLOGY", col:1, tests:[
    { label:"Urinalysis",     col:"urinalysis" },
    { label:"Fecalysis",      col:"fecalysis" },
    { label:"Pregnancy Test", col:"pregnancy_test" },
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
    { label:"AFB/DSSM",                col:"afb_dssm" },
    { label:"Culture and Sensitivity", col:"culture_and_sensitivity" },
  ]},
];

const ALL_TESTS = LAB_SECTIONS.flatMap(s => s.tests);

interface ModalPatient { name:string; age:string; gender:string; civil:string; addr:string; }
interface Props {
  open:    boolean;
  patient: ModalPatient | null;
  onClose: () => void;
  onSend:  (name: string) => void;
}
interface QueuePatient { id:string; name:string; age:string; gender:string; addr:string; }

export default function LabRequestModal({ open, patient, onClose, onSend }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const { user } = useAuth()// NAAGDAG LYNNEL 
  const [form,    setForm]    = useState({ name:"", date:today, age:"", gender:"", civil:"", addr:"" });
  const [checked, setChecked] = useState<string[]>([]);
  const [saving,  setSaving]  = useState(false);

  // Queue dropdown — only used when opened from dashboard (patient === null)
  const [queuePatients,    setQueuePatients]    = useState<QueuePatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // Fetch today's queue only when there's no patient context (dashboard button)
  useEffect(() => {
    if (!open || patient) return;

    (async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: consultRows } = await supabase
        .from("soap_consultations")
        .select("patient_id")
        .eq("queue_date", todayStr)
        .order("queue_number", { ascending: true });

      if (!consultRows?.length) { setQueuePatients([]); return; }

      const ids = [...new Set(consultRows.map((r:any) => r.patient_id).filter(Boolean))];
      const { data: pRows } = await supabase
        .from("patients")
        .select("id, first_name, last_name, age, sex, purok, barangay, municipality")
        .in("id", ids);

      const pMap = Object.fromEntries((pRows ?? []).map((p:any) => [p.id, p]));
      const seen = new Set<string>();
      setQueuePatients(
        consultRows.map((r:any) => {
          const p = pMap[r.patient_id];
          if (!p || seen.has(p.id)) return null;
          seen.add(p.id);
          return {
            id:     p.id,
            name:   `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
            age:    p.age != null ? String(p.age) : "",
            gender: p.sex === "F" ? "Female" : p.sex === "M" ? "Male" : "",
            addr:   [p.purok, p.barangay, p.municipality].filter(Boolean).join(", "),
          };
        }).filter(Boolean) as QueuePatient[]
      );
    })();
  }, [open, patient]);

  // Pre-fill form (from SOAP consultation — patient already known)
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
      setSelectedPatientId("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient]);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function toggle(col: string) { setChecked(c => c.includes(col) ? c.filter(x => x !== col) : [...c, col]); }

  function handleSelectQueuePatient(id: string) {
    setSelectedPatientId(id);
    const p = queuePatients.find(q => q.id === id);
    if (p) setForm(f => ({ ...f, name:p.name, age:p.age, gender:p.gender, addr:p.addr }));
  }

  async function handleSend() {
    if (!checked.length) { alert("Please select at least one test."); return; }
    setSaving(true);
    try {
      // Resolve patient UUID — prefer dropdown, fallback to name lookup
      let patientId: string | null = selectedPatientId || null;

      if (!patientId && form.name.trim()) {
        const parts     = form.name.trim().split(" ");
        const lastName  = parts.length > 1 ? parts[parts.length - 1] : "";
        const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
        const { data: rows } = await supabase
          .from("patients").select("id")
          .ilike("first_name", firstName)
          .ilike("last_name",  lastName);
        patientId = rows?.[0]?.id ?? null;
      }

      if (!patientId) {
        alert(`❌ Patient "${form.name}" not found. Please select from the queue.`);
        return;
      }

      const testPayload: Record<string, boolean> = {};
      ALL_TESTS.forEach(t => { testPayload[t.col] = checked.includes(t.col); });

      const { error } = await supabase
        .from("laboratory_requests")
        .insert({ patient_id:patientId, request_date:form.date, status:"pending", ...testPayload });

      if (error) { alert(`❌ Failed to send lab request:\n${error.message}`); return; }

      onSend(form.name);

      // ── DAGDAG MO ITO LYNNE ──────────────────────────────
      await logAction({
        user_name:   user?.name || '',
        user_role:   user?.role || 'Doctor',
        action:      'Send lab request',
        module:      'Lab Records',
        description: `Sent lab request for ${form.name} — ${checked.map(col => ALL_TESTS.find(t => t.col === col)?.label ?? col).join(', ')}`,
        status:      'success',
      })
      // ───────────────────────────────────────────────
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

          {/* ── Queue dropdown — only shown from dashboard, NOT from consultation ── */}
          {!patient && (
            <>
              <div className={styles.formGroup}>
                <label>Select Patient from Today&apos;s Queue</label>
                <select className={styles.modalInput} value={selectedPatientId}
                  onChange={e => handleSelectQueuePatient(e.target.value)}>
                  <option value="">— Choose a patient —</option>
                  {queuePatients.length === 0
                    ? <option disabled>No patients in queue today</option>
                    : queuePatients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.age ? ` · ${p.age} yrs` : ""}{p.gender ? ` · ${p.gender}` : ""}
                        </option>
                      ))
                  }
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,margin:"4px 0 8px",color:"var(--text3,#9ca3af)",fontSize:11}}>
                <div style={{flex:1,height:1,background:"var(--border,rgba(22,163,74,.15))"}}/>
                <span>or fill in manually</span>
                <div style={{flex:1,height:1,background:"var(--border,rgba(22,163,74,.15))"}}/>
              </div>
            </>
          )}

          {/* Patient fields */}
          <div className={styles.formRow2}>
            <div className={styles.formGroup}><label>Patient Name</label>
              <input className={styles.modalInput} value={form.name}
                onChange={e => { setF("name", e.target.value); if (!patient) setSelectedPatientId(""); }} />
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

          {/* Lab tests */}
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