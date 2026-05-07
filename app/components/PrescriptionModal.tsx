"use client";
import { useEffect, useRef, useState } from "react";
import { AI_RESPONSES } from "../doctor/data";
import styles from "../styles/dashboard.module.css";
import { supabase } from "@/lib/supabase";

interface ModalPatient {
  name: string; age: string; gender: string; civil: string; addr: string;
}
interface Props {
  open: boolean;
  patient: ModalPatient | null;
  onClose: () => void;
  onSend: (name: string) => void;
}
interface MedOption {
  id: string; med_name: string; med_dosage: string; quantity: number;
}
interface QueuePatient {
  id: string; name: string; age: string; gender: string; addr: string;
}

// ── Mini AI Dictionary ─────────────────────────────────────
function InlineAiDict() {
  const [msg, setMsg] = useState("");
  const [log, setLog] = useState<{from:"user"|"ai";text:string}[]>([
    { from:"ai", text:"Ask me about any medicine or disease." }
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [log]);

  function send() {
    const m = msg.trim(); if (!m) return;
    setLog(l => [...l, {from:"user",text:m}]);
    setMsg("");
    setTimeout(() => {
      const key = Object.keys(AI_RESPONSES).find(k => m.toLowerCase().includes(k));
      const reply = key ? AI_RESPONSES[key] : `Searching for "${m}"… Consider proper diagnosis and pharmacotherapy per clinical guidelines.`;
      setLog(l => [...l, {from:"ai",text:reply}]);
    }, 700);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minHeight:0}}>
      <div style={{fontSize:11,fontWeight:700,color:"#16a34a",letterSpacing:1,marginBottom:2,textAlign:"center"}}>AI DICTIONARY</div>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,minHeight:0,maxHeight:160}}>
        {log.map((m,i) => (
          <div key={i} style={{
            alignSelf: m.from==="ai" ? "flex-start" : "flex-end",
            background: m.from==="ai" ? "#f0fdf4" : "#16a34a",
            color: m.from==="ai" ? "#166534" : "#fff",
            borderRadius:8, padding:"6px 10px", fontSize:11, maxWidth:"90%", lineHeight:1.5
          }}>{m.text}</div>
        ))}
        <div ref={endRef}/>
      </div>
      <div style={{display:"flex",gap:6,marginTop:4}}>
        <input
          style={{flex:1,border:"1.5px solid #bbf7d0",borderRadius:8,padding:"6px 10px",fontSize:11,outline:"none",background:"#f0fdf4"}}
          placeholder="Type a medical term…" value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key==="Enter" && send()}
        />
        <button onClick={send} style={{background:"#16a34a",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#fff",fontSize:13}}>➤</button>
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────
export default function PrescriptionModal({ open, patient, onClose, onSend }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    name:"", date:today, age:"", gender:"", civil:"", addr:"",
    medicine_id:"", medicine_name:"", qty:"", dosage:"", notes:""
  });
  const [saving,          setSaving]          = useState(false);
  const [medList,         setMedList]         = useState<MedOption[]>([]);
  const [medSearch,       setMedSearch]       = useState("");
  const [loadingMeds,     setLoadingMeds]     = useState(false);
  const [queuePatients,   setQueuePatients]   = useState<QueuePatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // Fetch medicines + queue on open
  useEffect(() => {
    if (!open) return;

    // Medicines from pharma_medicines
    (async () => {
      setLoadingMeds(true);
      const { data, error } = await supabase
        .from("pharma_medicines")
        .select("id, med_name, med_dosage, quantity")
        .gt("quantity", 0)
        .order("med_name", { ascending: true });
      if (!error && data) setMedList(data);
      setLoadingMeds(false);
    })();

    // Today's queue — only needed when opened from dashboard (patient === null)
    if (!patient) {
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
    }
  }, [open, patient]);

  // Pre-fill from patient prop (from SOAP consultation — already has patient context)
  useEffect(() => {
    if (open) {
      setForm({
        name:   patient?.name   ?? "",
        date:   today,
        age:    patient?.age    ?? "",
        gender: patient?.gender ?? "",
        civil:  patient?.civil  ?? "",
        addr:   patient?.addr   ?? "",
        medicine_id:"", medicine_name:"", qty:"", dosage:"", notes:""
      });
      setSelectedPatientId("");
      setMedSearch("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient]);

  function set(k: string, v: string) { setForm(f => ({...f, [k]:v})); }

  function handleMedicineSelect(id: string) {
    const med = medList.find(m => m.id === id);
    setForm(f => ({
      ...f,
      medicine_id:   id,
      medicine_name: med ? `${med.med_name} ${med.med_dosage}`.trim() : "",
    }));
  }

  function handleSelectQueuePatient(id: string) {
    setSelectedPatientId(id);
    const p = queuePatients.find(q => q.id === id);
    if (p) setForm(f => ({ ...f, name:p.name, age:p.age, gender:p.gender, addr:p.addr }));
  }

  // Filtered medicine list for search
  const filteredMeds = medSearch.trim()
    ? medList.filter(m =>
        `${m.med_name} ${m.med_dosage}`.toLowerCase().includes(medSearch.toLowerCase())
      )
    : medList;

  async function handleSend() {
    if (!form.medicine_id) { alert("Please select a medicine."); return; }
    setSaving(true);
    try {
      // Resolve patient UUID
      let patientUUID: string | null = selectedPatientId || null;

      if (!patientUUID && form.name.trim()) {
        const parts    = form.name.trim().split(" ");
        const lastName  = parts.length > 1 ? parts[parts.length-1] : "";
        const firstName = parts.length > 1 ? parts.slice(0,-1).join(" ") : parts[0] ?? "";
        const { data: rows } = await supabase
          .from("patients").select("id")
          .ilike("first_name", firstName)
          .ilike("last_name",  lastName);
        patientUUID = rows?.[0]?.id ?? null;
      }

      if (!patientUUID) {
        alert(`❌ Patient "${form.name}" not found. Please select from the queue.`);
        return;
      }

      const { error: prescError } = await supabase
        .from("prescriptions")
        .insert({
          patient_id:        patientUUID,
          prescription_date: form.date,
          medicine:          form.medicine_name,
          quantity:          form.qty    || null,
          dosage_frequency:  form.dosage || null,
          notes:             form.notes  || null,
          status:            "sent",
        });

      if (prescError) { alert(`❌ Failed to save:\n${prescError.message}`); return; }

      // Decrement stock
      const med = medList.find(m => m.id === form.medicine_id);
      if (med && form.qty) {
        const dispensed = parseInt(form.qty) || 1;
        await supabase
          .from("pharma_medicines")
          .update({ quantity: Math.max(0, med.quantity - dispensed) })
          .eq("id", form.medicine_id);
      }

      onSend(form.name);
      alert(`✅ Prescription saved!\nPatient: ${form.name}\nMedicine: ${form.medicine_name}${form.dosage ? "\nDosage: "+form.dosage : ""}`);
      onClose();

    } catch(err) {
      console.error(err);
      alert("❌ Unexpected error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        style={{display:"flex",flexDirection:"row",background:"var(--surface,#fff)",borderRadius:16,overflow:"hidden",width:"min(940px,96vw)",maxHeight:"92vh",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}
        onClick={e => e.stopPropagation()}
      >
        {/* ══ LEFT PANEL ══ */}
        <div style={{width:270,minWidth:230,background:"#f0fdf4",borderRight:"1.5px solid #bbf7d0",display:"flex",flexDirection:"column",padding:18,gap:16,overflowY:"auto",boxSizing:"border-box"}}>

          {/* Medicine Stock */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#16a34a",letterSpacing:2,marginBottom:8,textAlign:"center"}}>MEDICINE STOCK</div>

            {/* Search box */}
            <div style={{position:"relative",marginBottom:8}}>
              <svg style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#9ca3af"}}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                style={{width:"100%",paddingLeft:26,paddingRight:8,paddingTop:5,paddingBottom:5,fontSize:11,border:"1.5px solid #bbf7d0",borderRadius:8,outline:"none",background:"#fff",boxSizing:"border-box",fontFamily:"DM Sans,sans-serif"}}
                placeholder="Search medicine…"
                value={medSearch}
                onChange={e => setMedSearch(e.target.value)}
              />
            </div>

            {/* Medicine list */}
            <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:200,overflowY:"auto"}}>
              {loadingMeds ? (
                <div style={{fontSize:10,color:"#9ca3af",textAlign:"center",padding:"8px 0"}}>Loading…</div>
              ) : filteredMeds.length === 0 ? (
                <div style={{fontSize:10,color:"#9ca3af",textAlign:"center",padding:"8px 0"}}>
                  {medSearch ? `No results for "${medSearch}"` : "No medicines in stock"}
                </div>
              ) : (
                filteredMeds.slice(0, 8).map(m => {
                  const maxQty = Math.max(...filteredMeds.map(x => x.quantity), 1);
                  const pct    = Math.round((m.quantity / maxQty) * 100);
                  const color  = m.quantity >= 60 ? "#1d7a3f" : m.quantity >= 30 ? "#f59e0b" : "#ef4444";
                  const isSelected = form.medicine_id === m.id;
                  return (
                    <div key={m.id}
                      onClick={() => handleMedicineSelect(m.id)}
                      style={{
                        display:"flex", alignItems:"center", gap:6,
                        padding:"5px 8px", borderRadius:8, cursor:"pointer",
                        background: isSelected ? "#dcfce7" : "transparent",
                        border: isSelected ? "1.5px solid #16a34a" : "1.5px solid transparent",
                        transition:"all .15s",
                      }}
                    >
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:600,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {m.med_name}
                          {m.med_dosage ? <span style={{fontWeight:400,color:"#9ca3af"}}> {m.med_dosage}</span> : ""}
                        </div>
                        <div style={{height:4,background:"#dcfce7",borderRadius:2,marginTop:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:2}}/>
                        </div>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color,flexShrink:0,minWidth:24,textAlign:"right"}}>{m.quantity}</span>
                    </div>
                  );
                })
              )}
              {!medSearch && filteredMeds.length > 8 && (
                <div style={{fontSize:10,color:"#9ca3af",textAlign:"center"}}>+{filteredMeds.length - 8} more — search to filter</div>
              )}
            </div>

            {/* Legend */}
            <div style={{display:"flex",gap:6,marginTop:8,justifyContent:"center",flexWrap:"wrap"}}>
              {[{label:"High",bg:"#1d7a3f"},{label:"Medium",bg:"#f59e0b"},{label:"Low",bg:"#ef4444"}].map(l => (
                <span key={l.label} style={{background:l.bg,color:"#fff",borderRadius:99,padding:"2px 8px",fontSize:9,fontWeight:600}}>{l.label}</span>
              ))}
            </div>
          </div>

          <div style={{borderTop:"1px solid #bbf7d0"}}/>

          {/* AI Dictionary */}
          <InlineAiDict />
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          <div className={styles.modalHeader}>
            <h2>Prescription</h2>
            <button className={styles.modalClose} onClick={onClose}>✕</button>
          </div>

          <div className={styles.modalBody} style={{overflowY:"auto",flex:1}}>
            <div className={styles.rxSymbol}>Rx</div>

            {/* ── Queue dropdown — only shown when opened from dashboard (no patient context) ── */}
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

            {/* Patient info */}
            <div className={styles.formRow2}>
              <div className={styles.formGroup}><label>Patient Name</label>
                <input className={styles.modalInput} value={form.name}
                  onChange={e => { set("name", e.target.value); if (!patient) setSelectedPatientId(""); }} />
              </div>
              <div className={styles.formGroup}><label>Date</label>
                <input className={styles.modalInput} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
              </div>
            </div>
            <div className={styles.formRow3}>
              <div className={styles.formGroup}><label>Age</label>
                <input className={styles.modalInput} value={form.age} onChange={e => set("age", e.target.value)} />
              </div>
              <div className={styles.formGroup}><label>Gender</label>
                <input className={styles.modalInput} value={form.gender} onChange={e => set("gender", e.target.value)} />
              </div>
              <div className={styles.formGroup}><label>Civil Status</label>
                <input className={styles.modalInput} value={form.civil} onChange={e => set("civil", e.target.value)} />
              </div>
            </div>
            <div className={styles.formGroup}><label>Address</label>
              <input className={styles.modalInput} value={form.addr} onChange={e => set("addr", e.target.value)} />
            </div>

            {/* Medicine select (dropdown) */}
            <div className={styles.formRow2}>
              <div className={styles.formGroup}><label>Medicine</label>
                <select className={styles.modalInput} value={form.medicine_id}
                  onChange={e => handleMedicineSelect(e.target.value)}>
                  <option value="">-- Select Medicine --</option>
                  {loadingMeds
                    ? <option disabled>Loading…</option>
                    : filteredMeds.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.med_name} {m.med_dosage} — {m.quantity} units left
                        </option>
                      ))
                  }
                </select>
              </div>
              <div className={styles.formGroup}><label>Quantity</label>
                <input className={styles.modalInput} value={form.qty}
                  onChange={e => set("qty", e.target.value)} placeholder="e.g. 21 tabs" />
              </div>
            </div>

            <div className={styles.formGroup}><label>Dosage &amp; Frequency</label>
              <input className={styles.modalInput} value={form.dosage}
                onChange={e => set("dosage", e.target.value)} placeholder="e.g. 1 tab TID x 7 days" />
            </div>
            <div className={styles.formGroup}><label>Notes</label>
              <textarea className={`${styles.modalInput} ${styles.modalTextarea}`}
                value={form.notes} onChange={e => set("notes", e.target.value)}
                placeholder="Additional instructions…" />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button className={`${styles.actionBtn} ${styles.outline}`} onClick={onClose} disabled={saving}>CANCEL</button>
            <button className={`${styles.actionBtn} ${styles.primary}`} onClick={handleSend} disabled={saving}
              style={saving?{opacity:.7,cursor:"not-allowed"}:{}}>
              {saving ? "SAVING…" : "SEND"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}