"use client";
import { useEffect, useRef, useState } from "react";
import { STOCK, AI_RESPONSES } from "../doctor/data";
import styles from "../styles/dashboard.module.css";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────
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
  id: string;
  med_name: string;
  med_dosage: string;
  quantity: number;
  
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
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,minHeight:0,maxHeight:180}}>
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
  const [saving,  setSaving]  = useState(false);
  const [medList, setMedList] = useState<MedOption[]>([]);
  const [loadingMeds, setLoadingMeds] = useState(false);

  // Fetch medicines from Supabase
  useEffect(() => {
    async function fetchMeds() {
      setLoadingMeds(true);
      const { data, error } = await supabase
        .from("medicines")
        .select("id, med_name, med_dosage, quantity")
        .gt("quantity", 0)          // only show in-stock medicines
        
        .order("med_name", { ascending: true });
      if (!error && data) setMedList(data);
      setLoadingMeds(false);
    }
    if (open) fetchMeds();
  }, [open]);

  // Pre-fill form from patient
  useEffect(() => {
    if (open) setForm({
      name:    patient?.name   ?? "",
      date:    today,
      age:     patient?.age    ?? "",
      gender:  patient?.gender ?? "",
      civil:   patient?.civil  ?? "",
      addr:    patient?.addr   ?? "",
      medicine_id:"", medicine_name:"", qty:"", dosage:"", notes:""
    });
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

  async function handleSend() {
    if (!form.medicine_id) { alert("Please select a medicine."); return; }

    setSaving(true);
    try {
      // 1. Look up patient UUID
      const nameParts = form.name.trim().split(" ");
      const lastName  = nameParts.length > 1 ? nameParts[nameParts.length-1] : "";
      const firstName = nameParts.length > 1 ? nameParts.slice(0,-1).join(" ") : nameParts[0] ?? "";

      const { data: patientRows } = await supabase
        .from("patients").select("id")
        .ilike("first_name", firstName)
        .ilike("last_name",  lastName);

      const patientUUID = patientRows?.[0]?.id ?? null;

      // 2. Insert prescription
      const { error: prescError } = await supabase
        .from("prescriptions")
        .insert({
          patient_id:        patientUUID,
          prescription_date: form.date,
          medicine:          form.medicine_name,
          quantity:          form.qty      || null,
          dosage_frequency:  form.dosage   || null,
          notes:             form.notes    || null,
          status:            "sent",
        });

      if (prescError) { alert(`❌ Failed to save:\n${prescError.message}`); return; }

      // 3. Decrement medicine stock
      const med = medList.find(m => m.id === form.medicine_id);
      if (med && form.qty) {
        const dispensed = parseInt(form.qty) || 1;
        await supabase
          .from("medicines")
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
        style={{display:"flex",flexDirection:"row",background:"#fff",borderRadius:16,overflow:"hidden",width:"min(920px,96vw)",maxHeight:"92vh",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}
        onClick={e => e.stopPropagation()}
      >
        {/* ── LEFT PANEL ── */}
        <div style={{width:260,minWidth:220,background:"#f0fdf4",borderRight:"1.5px solid #bbf7d0",display:"flex",flexDirection:"column",padding:18,justifyContent:"center",alignItems:"stretch",gap:18,overflowY:"auto",boxSizing:"border-box"}}>
          <div style={{display:"flex",flexDirection:"column",gap:22,transform:"translateY(10px)"}}>

            {/* Medicine Stock — live from Supabase */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#16a34a",letterSpacing:2,marginBottom:10,textAlign:"center"}}>MEDICINE STOCK</div>
              <div style={{display:"flex",flexDirection:"column",gap:6,width:"100%"}}>
                {medList.slice(0,6).map(m => {
                  const maxQty = Math.max(...medList.map(x=>x.quantity),1);
                  const pct    = Math.round((m.quantity/maxQty)*100);
                  const color  = m.quantity >= 60 ? "#1d7a3f" : m.quantity >= 30 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:10,color:"#374151",width:80,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.med_name}</span>
                      <div style={{flex:1,height:7,background:"#dcfce7",borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:99,transition:"width .4s"}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color,width:28,textAlign:"right"}}>{m.quantity}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap",justifyContent:"center"}}>
                {[{label:"High",bg:"#1d7a3f"},{label:"Medium",bg:"#f59e0b"},{label:"Low",bg:"#ef4444"}].map(l => (
                  <span key={l.label} style={{background:l.bg,color:"#fff",borderRadius:99,padding:"2px 10px",fontSize:10,fontWeight:600}}>{l.label}</span>
                ))}
              </div>
            </div>

            <div style={{borderTop:"1px solid #bbf7d0",margin:"6px 0"}}/>

            {/* AI Dictionary */}
            <InlineAiDict />
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          <div className={styles.modalHeader}>
            <h2>Prescription</h2>
            <button className={styles.modalClose} onClick={onClose}>✕</button>
          </div>
          <div className={styles.modalBody} style={{overflowY:"auto",flex:1}}>
            <div className={styles.rxSymbol}>Rx</div>
            <div className={styles.formRow2}>
              <div className={styles.formGroup}><label>Patient Name</label>
                <input className={styles.modalInput} value={form.name} onChange={e=>set("name",e.target.value)} />
              </div>
              <div className={styles.formGroup}><label>Date</label>
                <input className={styles.modalInput} type="date" value={form.date} onChange={e=>set("date",e.target.value)} />
              </div>
            </div>
            <div className={styles.formRow3}>
              <div className={styles.formGroup}><label>Age</label>
                <input className={styles.modalInput} value={form.age} onChange={e=>set("age",e.target.value)} />
              </div>
              <div className={styles.formGroup}><label>Gender</label>
                <input className={styles.modalInput} value={form.gender} onChange={e=>set("gender",e.target.value)} />
              </div>
              <div className={styles.formGroup}><label>Civil Status</label>
                <input className={styles.modalInput} value={form.civil} onChange={e=>set("civil",e.target.value)} />
              </div>
            </div>
            <div className={styles.formGroup}><label>Address</label>
              <input className={styles.modalInput} value={form.addr} onChange={e=>set("addr",e.target.value)} />
            </div>
            <div className={styles.formRow2}>
              <div className={styles.formGroup}><label>Medicine</label>
                <select className={styles.modalInput} value={form.medicine_id}
                  onChange={e => handleMedicineSelect(e.target.value)}>
                  <option value="">-- Select Medicine --</option>
                  {loadingMeds
                    ? <option disabled>Loading…</option>
                    : medList.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.med_name} {m.med_dosage} — {m.quantity} units left
                        </option>
                      ))
                  }
                </select>
              </div>
              <div className={styles.formGroup}><label>Quantity</label>
                <input className={styles.modalInput} value={form.qty}
                  onChange={e=>set("qty",e.target.value)} placeholder="e.g. 21 tabs" />
              </div>
            </div>
            <div className={styles.formGroup}><label>Dosage &amp; Frequency</label>
              <input className={styles.modalInput} value={form.dosage}
                onChange={e=>set("dosage",e.target.value)} placeholder="e.g. 1 tab TID x 7 days" />
            </div>
            <div className={styles.formGroup}><label>Notes</label>
              <textarea className={`${styles.modalInput} ${styles.modalTextarea}`}
                value={form.notes} onChange={e=>set("notes",e.target.value)}
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