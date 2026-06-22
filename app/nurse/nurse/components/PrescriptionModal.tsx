"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./nurse.module.css";
import { supabase } from "@/lib/supabase";
import { logAction } from '@/utils/auditLogs';
import { useAuth } from '@/context/AuthContext';

// ── Design tokens ──────────────────────────────────────────
const DARK   = "#064e3b"; 
const G      = "#16a34a";
const LIGHT  = "#f0fdf4";
const BORDER = "#d1fae5";

interface ModalPatient { id?: string; name: string; age: string; gender: string; civil: string; addr: string; }
interface Props {
  open: boolean; patient: ModalPatient | null;
  onClose: () => void; onSend: (name: string) => void;
}
interface MedOption    { id: string; med_name: string; med_dosage: string; quantity: number; }
interface QueuePatient { id: string; name: string; age: string; gender: string; addr: string; }
interface SelectedMed  {
  id: string;
  med_name: string;
  med_dosage: string;
  dosage: string;
  maxQty: number;
  qty: string;
  frequency: string;
  qtyError?: string;
  source: "pharmacy" | "external";
}
interface AiMed        { id: string; med_name: string; med_dosage: string; med_type: string; exp_date: string; quantity: number; unit: string; description?: string; }
interface ChatMessage  { from: "user" | "ai"; text: string; loading?: boolean; medicines?: AiMed[]; }

// ── Typing dots ────────────────────────────────────────────
function TypingDots() {
  const dotStyle = (delay: string): React.CSSProperties => ({
    display: "inline-block", width: 5, height: 5,
    borderRadius: "50%", background: "#9ca3af", margin: "0 2px",
    animation: "dictBounce 1s infinite ease-in-out", animationDelay: delay,
  });
  return (
    <>
      <style>{`@keyframes dictBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
      <span style={{ display: "inline-flex", alignItems: "center", height: 16 }}>
        <span style={dotStyle("0s")} />
        <span style={dotStyle("0.18s")} />
        <span style={dotStyle("0.36s")} />
      </span>
    </>
  );
}

// ── Mini AI Dictionary ─────────────────────────────────────
interface InlineAiDictProps {
  medList: MedOption[];
  onAddMed: (med: MedOption) => void;
  selectedMeds: SelectedMed[];
}

function InlineAiDict({ medList, onAddMed, selectedMeds }: InlineAiDictProps) {
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog]         = useState<ChatMessage[]>([
    { from: "ai", text: "Describe your patient's symptoms, age, and condition — I'll suggest medicines available in your inventory." },
  ]);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [log]);

  async function send() {
    const m = msg.trim();
    if (!m || loading) return;
    setLog(l => [...l, { from: "user", text: m }, { from: "ai", text: "", loading: true }]);
    setMsg("");
    setLoading(true);
    try {
      const res  = await fetch("/api/ai_dictionary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: m }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `Server error ${res.status}`);
      setLog(l => {
        const filtered = l.filter(x => !x.loading);
        return [...filtered, { from: "ai" as const, text: data.recommendation ?? "No response available.", medicines: data.medicines ?? [] }];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLog(l => [...l.filter(x => !x.loading), { from: "ai" as const, text: `⚠ ${message}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: 0, height: "100%" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: 1, textAlign: "center", flexShrink: 0 }}>
        AI DICTIONARY
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {log.map((entry, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: entry.from === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "90%", background: entry.from === "user" ? G : LIGHT,
                color: entry.from === "user" ? "#fff" : "#166534",
                borderRadius: entry.from === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                padding: "6px 10px", fontSize: 11, lineHeight: 1.5,
              }}>
                {entry.loading ? <TypingDots /> : entry.text}
              </div>
            </div>
            {entry.medicines && entry.medicines.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4, letterSpacing: 0.5 }}>
                  {entry.medicines.length} MEDICINE{entry.medicines.length > 1 ? "S" : ""} IN STOCK
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {entry.medicines.map((med: AiMed) => {
                    const stockMed       = medList.find(m => m.id === med.id);
                    const isAdded        = !!selectedMeds.find(s => s.id === med.id);
                    const expDate        = new Date(med.exp_date);
                    const isExpiringSoon = expDate < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                    const isExpired      = expDate < new Date();
                    return (
                      <div key={med.id} style={{
                        background: isAdded ? "#dcfce7" : "#fff",
                        border: `1.5px solid ${isAdded ? G : BORDER}`,
                        borderRadius: 8, padding: "7px 9px",
                        display: "flex", alignItems: "center", gap: 7, transition: "all .15s",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isAdded ? "#166534" : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {med.med_name}
                            {med.med_dosage && <span style={{ fontWeight: 400, fontSize: 10, color: "#6b7280", marginLeft: 4 }}>{med.med_dosage}</span>}
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 9, color: "#6b7280" }}>
                              Stock: <b style={{ color: med.quantity >= 20 ? G : "#ef4444" }}>{med.quantity}</b>
                            </span>
                            <span style={{ fontSize: 9, color: isExpired ? "#ef4444" : isExpiringSoon ? "#f59e0b" : "#6b7280" }}>
                              Exp: {expDate.toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
                              {isExpired ? " ⚠" : isExpiringSoon ? " ⚠" : ""}
                            </span>
                          </div>
                        </div>
                        <button
                          disabled={!stockMed || isAdded}
                          onClick={() => stockMed && onAddMed(stockMed)}
                          title={isAdded ? "Already added" : !stockMed ? "Out of stock" : "Add to prescription"}
                          style={{
                            flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                            border: "none", cursor: isAdded || !stockMed ? "default" : "pointer",
                            background: isAdded ? "#bbf7d0" : !stockMed ? "#f3f4f6" : G,
                            color: isAdded ? G : !stockMed ? "#9ca3af" : "#fff",
                            fontSize: 14, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
                          }}
                        >{isAdded ? "✓" : "+"}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {entry.medicines && entry.medicines.length === 0 && entry.from === "ai" && !entry.loading && (
              <div style={{ marginTop: 4, fontSize: 10, color: "#9ca3af", fontStyle: "italic", paddingLeft: 4 }}>
                No matching medicines found in current inventory.
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <input
          ref={inputRef}
          style={{ flex: 1, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, outline: "none", background: LIGHT, fontFamily: "DM Sans, sans-serif", color: "#111827" }}
          placeholder="e.g. 2-yr-old with fever and cough…"
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button
          onClick={send} disabled={loading || !msg.trim()}
          style={{ background: loading || !msg.trim() ? "#86efac" : G, border: "none", borderRadius: 8, padding: "6px 10px", cursor: loading || !msg.trim() ? "not-allowed" : "pointer", color: "#fff", fontSize: 13, transition: "background .15s" }}
        >{loading ? "…" : "➤"}</button>
      </div>
    </div>
  );
}

// ══ MAIN MODAL ════════════════════════════════════════════
export default function PrescriptionModal({ open, patient, onClose, onSend }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const { user } = useAuth();

  const [form, setForm]                           = useState({ name: "", date: today, age: "", gender: "", civil: "", addr: "", notes: "" });
  const [saving,            setSaving]            = useState(false);
  const [medList,           setMedList]           = useState<MedOption[]>([]);
  const [medSearch,         setMedSearch]         = useState("");
  const [loadingMeds,       setLoadingMeds]       = useState(false);
  const [queuePatients,     setQueuePatients]     = useState<QueuePatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedMeds,      setSelectedMeds]      = useState<SelectedMed[]>([]);

  // ── Add-external-medicine form state ──────────────────
  const [showExtForm,  setShowExtForm]  = useState(false);
  const [extName,      setExtName]      = useState("");
  const [extDosage,    setExtDosage]    = useState("");
  const [extQty,       setExtQty]       = useState("");
  const [extFrequency, setExtFrequency] = useState("");

  // ── Fetch on open ──────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingMeds(true);
      const todayISO = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("pharma_medicines")
        .select("id, med_name, med_dosage, quantity")
        .gt("quantity", 0).gt("exp_date", todayISO).neq("archived", true)
        .order("med_name", { ascending: true });
      if (!error && data) setMedList(data);
      setLoadingMeds(false);
    })();

    if (!patient) {
      (async () => {
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: consultRows } = await supabase
          .from("soap_consultations").select("patient_id")
          .eq("queue_date", todayStr).order("queue_number", { ascending: true });
        if (!consultRows?.length) { setQueuePatients([]); return; }
        const ids = [...new Set(consultRows.map((r: any) => r.patient_id).filter(Boolean))];
        const { data: pRows } = await supabase
          .from("patients").select("id, first_name, last_name, age, sex, purok, barangay, municipality")
          .in("id", ids);
        const pMap = Object.fromEntries((pRows ?? []).map((p: any) => [p.id, p]));
        const seen = new Set<string>();
        setQueuePatients(
          consultRows.map((r: any) => {
            const p = pMap[r.patient_id];
            if (!p || seen.has(p.id)) return null;
            seen.add(p.id);
            return {
              id: p.id,
              name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
              age: p.age != null ? String(p.age) : "",
              gender: p.sex === "F" ? "Female" : p.sex === "M" ? "Male" : "",
              addr: [p.purok, p.barangay, p.municipality].filter(Boolean).join(", "),
            };
          }).filter(Boolean) as QueuePatient[]
        );
      })();
    }
  }, [open, patient]);

  // ── Reset form on open ─────────────────────────────────
  useEffect(() => {
    if (open) {
      setForm({ name: patient?.name ?? "", date: today, age: patient?.age ?? "", gender: patient?.gender ?? "", civil: patient?.civil ?? "", addr: patient?.addr ?? "", notes: "" });
      setSelectedPatientId("");
      setMedSearch("");
      setSelectedMeds([]);
      setShowExtForm(false);
      setExtName(""); setExtDosage(""); setExtQty(""); setExtFrequency("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleSelectQueuePatient(id: string) {
    setSelectedPatientId(id);
    const p = queuePatients.find(q => q.id === id);
    if (p) setForm(f => ({ ...f, name: p.name, age: p.age, gender: p.gender, addr: p.addr }));
  }

  // ── Add pharmacy medicine ──────────────────────────────
  function toggleMed(med: MedOption) {
    setSelectedMeds(prev => {
      const exists = prev.find(m => m.id === med.id);
      if (exists) return prev.filter(m => m.id !== med.id);
      return [...prev, {
        id: med.id,
        med_name: med.med_name,
        med_dosage: med.med_dosage,
        dosage: med.med_dosage,
        maxQty: med.quantity,
        qty: "",
        frequency: "",
        source: "pharmacy",
      }];
    });
  }

  // ── Add external medicine manually ────────────────────
  function handleAddExternal() {
    const name = extName.trim();
    if (!name) return;
    const extId = `ext_${Date.now()}`;
    setSelectedMeds(prev => [...prev, {
      id: extId,
      med_name: name,
      med_dosage: extDosage.trim(),
      dosage: extDosage.trim(),
      maxQty: Infinity,
      qty: extQty.trim(),
      frequency: extFrequency.trim(),
      source: "external",
    }]);
    setExtName(""); setExtDosage(""); setExtQty(""); setExtFrequency("");
    setShowExtForm(false);
  }

  // ── Update a field on a selected med ──────────────────
  function updateMed(id: string, field: "qty" | "frequency" | "dosage", value: string) {
    setSelectedMeds(prev => prev.map(m => {
      if (m.id !== id) return m;
      if (field === "qty") {
        const parsed = parseInt(value);
        const qtyError =
          m.source === "pharmacy" && value !== "" && (isNaN(parsed) || parsed <= 0)
            ? "Please enter a valid quantity."
            : m.source === "pharmacy" && !isNaN(parsed) && parsed > m.maxQty
            ? `Only ${m.maxQty} available in stock.`
            : undefined;
        return { ...m, qty: value, qtyError };
      }
      return { ...m, [field]: value };
    }));
  }

  const filteredMeds = medSearch.trim()
    ? medList.filter(m => `${m.med_name} ${m.med_dosage}`.toLowerCase().includes(medSearch.toLowerCase()))
    : medList;

  const hasQtyErrors = selectedMeds.some(m => !!m.qtyError);

  // ── Send prescription ──────────────────────────────────
  async function handleSend() {
    if (!selectedMeds.length) { alert("Please select at least one medicine."); return; }

    const overLimitMeds = selectedMeds.filter(med => {
      const parsed = parseInt(med.qty);
      return med.source === "pharmacy" && !isNaN(parsed) && parsed > med.maxQty;
    });
    if (overLimitMeds.length > 0) {
      const lines = overLimitMeds.map(m => `• ${m.med_name}${m.dosage ? ` ${m.dosage}` : ""}: requested ${m.qty}, only ${m.maxQty} available`).join("\n");
      alert(`❌ Cannot send prescription. The following medicines exceed available stock:\n\n${lines}\n\nPlease adjust the quantities.`);
      return;
    }

    setSaving(true);
    try {
      let patientUUID: string | null = selectedPatientId || patient?.id || null;
      if (!patientUUID && form.name.trim()) {
        const parts     = form.name.trim().split(" ");
        const lastName  = parts.length > 1 ? parts[parts.length - 1] : "";
        const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
        const { data: rows } = await supabase.from("patients").select("id").ilike("first_name", firstName).ilike("last_name", lastName);
        patientUUID = rows?.[0]?.id ?? null;
      }
      if (!patientUUID) { alert(`❌ Patient "${form.name}" not found. Please select from the queue.`); return; }

      const insertRows = selectedMeds.map(med => ({
        patient_id:        patientUUID,
        prescription_date: form.date,
        medicine:          med.med_name,
        quantity:          med.qty      || null,
        dosage:            med.dosage   || null,
        frequency:         med.frequency || null,
        notes: med.source === "external"
          ? `[Buy outside — not available in RHU pharmacy]${form.notes ? " | " + form.notes : ""}`
          : form.notes || null,
        status: "sent",
      }));

      const { error: prescError } = await supabase.from("prescriptions").insert(insertRows);
      if (prescError) { alert(`❌ Failed to save:\n${prescError.message}`); return; }

      for (const med of selectedMeds.filter(m => m.source === "pharmacy")) {
        const src = medList.find(m => m.id === med.id);
        if (src && med.qty) {
          const dispensed = parseInt(med.qty) || 1;
          await supabase.from("pharma_medicines")
            .update({ quantity: Math.max(0, src.quantity - dispensed) })
            .eq("id", med.id);
        }
      }

      onSend(form.name);
      await logAction({
        user_name:   user?.name  || '',
        user_role:   user?.role  || 'Doctor',
        action:      'Send prescription',
        module:      'Prescription',
        description: `Sent prescription to ${form.name} — ${selectedMeds.map(m => m.med_name).join(', ')}`,
        status:      'success',
      });

      const pharmacyMeds = selectedMeds.filter(m => m.source === "pharmacy");
      const externalMeds = selectedMeds.filter(m => m.source === "external");
      let summary = `✅ Prescription saved!\nPatient: ${form.name}\n`;
      if (pharmacyMeds.length)
        summary += `\n💊 From RHU Pharmacy:\n` +
          pharmacyMeds.map(m =>
            `• ${m.med_name}${m.dosage ? " " + m.dosage : ""}${m.frequency ? " — " + m.frequency : ""}`
          ).join("\n");
      if (externalMeds.length)
        summary += `\n\n🛒 To Buy Outside (not in RHU stock):\n` +
          externalMeds.map(m =>
            `• ${m.med_name}${m.dosage ? " " + m.dosage : ""}${m.frequency ? " — " + m.frequency : ""}`
          ).join("\n");
      alert(summary);
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const INP: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13,
    fontFamily: "DM Sans, sans-serif", color: "#111827",
    background: LIGHT, outline: "none", transition: "border-color .15s",
  };
  const LBL: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5,
  };
  const EXTINP: React.CSSProperties = {
    ...INP, fontSize: 12, padding: "7px 10px", background: "#fff",
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: "flex", flexDirection: "row", background: "#fff", borderRadius: 16,
          overflow: "hidden", width: "min(1020px, 97vw)", height: "90vh",
          boxShadow: "0 8px 48px rgba(0,0,0,0.2)",
        }}
      >

        {/* ══ LEFT PANEL ════════════════════════════════ */}
        <div style={{
          width: 290, minWidth: 250, background: LIGHT,
          borderRight: `1.5px solid ${BORDER}`,
          display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden",
        }}>
          <div style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${G} 100%)`, padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>💊 Medicine Stock</div>
            <div style={{ fontSize: 10, color: "#bbf7d0", marginTop: 2 }}>Click a medicine to add it</div>
          </div>

          <div style={{ padding: "10px 12px 6px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0, background: LIGHT }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                style={{ width: "100%", paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7, fontSize: 12, border: `1.5px solid ${BORDER}`, borderRadius: 8, outline: "none", background: "#fff", boxSizing: "border-box", fontFamily: "DM Sans,sans-serif", color: "#374151" }}
                placeholder="Search medicine…" value={medSearch} onChange={e => setMedSearch(e.target.value)}
              />
            </div>
          </div>

          {selectedMeds.length > 0 && (
            <div style={{ padding: "5px 12px", background: "#dcfce7", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>✓ {selectedMeds.length} medicine{selectedMeds.length > 1 ? "s" : ""} selected</span>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            {loadingMeds ? (
              <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>Loading…</div>
            ) : filteredMeds.length === 0 ? (
              <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>
                {medSearch ? `No results for "${medSearch}"` : "No medicines in stock"}
              </div>
            ) : (
              filteredMeds.map(m => {
                const maxQty     = Math.max(...filteredMeds.map(x => x.quantity), 1);
                const pct        = Math.round((m.quantity / maxQty) * 100);
                const stockClr   = m.quantity >= 60 ? G : m.quantity >= 20 ? "#f59e0b" : "#ef4444";
                const isSelected = !!selectedMeds.find(s => s.id === m.id);
                return (
                  <div key={m.id} onClick={() => toggleMed(m)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                    background: isSelected ? "#dcfce7" : "#fff", border: `1.5px solid ${isSelected ? G : BORDER}`,
                    transition: "all .15s", boxShadow: isSelected ? "0 1px 6px rgba(22,163,74,0.15)" : "none",
                  }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: isSelected ? G : "#fff", border: `2px solid ${isSelected ? G : "#d1d5db"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                      {isSelected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: isSelected ? 700 : 600, color: isSelected ? "#166534" : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.med_name}
                        {m.med_dosage && <span style={{ fontWeight: 400, fontSize: 10, color: "#6b7280", marginLeft: 4 }}>{m.med_dosage}</span>}
                      </div>
                      <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: isSelected ? G : stockClr, borderRadius: 2, transition: "width .3s" }}/>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? "#166534" : stockClr, background: isSelected ? "#bbf7d0" : `${stockClr}18`, borderRadius: 99, padding: "2px 8px", flexShrink: 0, border: `1px solid ${isSelected ? "#86efac" : `${stockClr}44`}` }}>
                      {m.quantity}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ padding: "6px 12px", borderTop: `1px solid ${BORDER}`, borderBottom: `2px solid ${BORDER}`, background: LIGHT, display: "flex", gap: 6, justifyContent: "center", flexShrink: 0 }}>
            {[{ label: "High", bg: G }, { label: "Medium", bg: "#f59e0b" }, { label: "Low", bg: "#ef4444" }].map(l => (
              <span key={l.label} style={{ background: l.bg, color: "#fff", borderRadius: 99, padding: "2px 9px", fontSize: 9, fontWeight: 700 }}>{l.label}</span>
            ))}
          </div>

          <div style={{ flex: 1, minHeight: 0, background: "#fff", padding: "10px 14px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <InlineAiDict medList={medList} selectedMeds={selectedMeds} onAddMed={med => toggleMed(med)} />
          </div>
        </div>{/* end LEFT PANEL */}

        {/* ══ RIGHT PANEL ═══════════════════════════════ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          <div style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${G} 100%)`, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "DM Sans, sans-serif" }}>Prescription</h2>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}
              onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
              onMouseOut={e  => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
            >✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

            {!patient && (
              <>
                <div>
                  <label style={LBL}>Select Patient from Today's Queue</label>
                  <select value={selectedPatientId} onChange={e => handleSelectQueuePatient(e.target.value)}
                    style={{ ...INP, cursor: "pointer", appearance: "auto" as any }}
                    onFocus={e => (e.currentTarget.style.borderColor = G)}
                    onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  >
                    <option value="">— Choose a patient —</option>
                    {queuePatients.length === 0
                      ? <option disabled>No patients in queue today</option>
                      : queuePatients.map(p => <option key={p.id} value={p.id}>{p.name}{p.age ? ` · ${p.age} yrs` : ""}{p.gender ? ` · ${p.gender}` : ""}</option>)
                    }
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#9ca3af", fontSize: 12 }}>
                  <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}/>
                  <span>or fill in manually</span>
                  <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}/>
                </div>
              </>
            )}

            {/* Patient Name + Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={LBL}>Patient Name</label>
                <input style={INP} value={form.name}
                  onChange={e => { set("name", e.target.value); if (!patient) setSelectedPatientId(""); }}
                  onFocus={e => (e.currentTarget.style.borderColor = G)}
                  onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
                />
              </div>
              <div>
                <label style={LBL}>Date</label>
                <input type="date" style={INP} value={form.date} onChange={e => set("date", e.target.value)}
                  onFocus={e => (e.currentTarget.style.borderColor = G)}
                  onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
                />
              </div>
            </div>

            {/* Age + Gender + Civil Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {(["age", "gender", "civil"] as const).map(k => (
                <div key={k}>
                  <label style={LBL}>{k === "civil" ? "Civil Status" : k.charAt(0).toUpperCase() + k.slice(1)}</label>
                  <input style={INP} value={form[k]} onChange={e => set(k, e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = G)}
                    onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  />
                </div>
              ))}
            </div>

            {/* Address */}
            <div>
              <label style={LBL}>Address</label>
              <input style={INP} value={form.addr} onChange={e => set("addr", e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = G)}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>

            {/* ── Selected Medicines ── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ ...LBL, marginBottom: 0 }}>
                  Selected Medicines
                  {selectedMeds.length > 0 && (
                    <span style={{ marginLeft: 8, background: "#dcfce7", color: G, borderRadius: 99, padding: "1px 9px", fontSize: 10, fontWeight: 700 }}>
                      {selectedMeds.length}
                    </span>
                  )}
                </label>
                {selectedMeds.length > 0 && (
                  <button onClick={() => setSelectedMeds([])} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    Clear all
                  </button>
                )}
              </div>

              {selectedMeds.length === 0 ? (
                <div style={{ border: `1.5px dashed ${BORDER}`, borderRadius: 12, padding: "28px 16px", textAlign: "center", background: "#f9fefb", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 28 }}>💊</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>No medicines selected yet</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Click a medicine in the left panel, or add one manually below</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selectedMeds.map((med, idx) => (
                    <div key={med.id} style={{
                      border: `1.5px solid ${med.qtyError ? "#fecaca" : med.source === "external" ? "#fed7aa" : BORDER}`,
                      borderRadius: 12, background: LIGHT, overflow: "hidden",
                    }}>
                      {/* Card header */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", borderBottom: `1px solid ${BORDER}`,
                        background: med.source === "external" ? "#fff7ed" : "#dcfce7",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: med.source === "external" ? "#f97316" : G, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {idx + 1}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: med.source === "external" ? "#9a3412" : "#166534" }}>
                                {med.med_name}
                              </span>
                              {med.source === "external" && (
                                <span style={{ fontSize: 9, fontWeight: 700, background: "#fed7aa", color: "#c2410c", borderRadius: 99, padding: "2px 7px", letterSpacing: 0.5 }}>
                                  🛒 BUY OUTSIDE
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: "#6b7280" }}>
                              {med.source === "pharmacy" ? `${med.maxQty} in stock` : "Not available in RHU pharmacy"}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setSelectedMeds(prev => prev.filter(m => m.id !== med.id))}
                          style={{ width: 24, height: 24, borderRadius: 6, background: "#fee2e2", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, lineHeight: 1, padding: 0 }}
                          title="Remove"
                        >×</button>
                      </div>

                      {/* Qty + Dosage + Frequency */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10, padding: "10px 14px" }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Quantity</div>
                          <input
                            style={{ ...INP, fontSize: 12, padding: "7px 10px", borderColor: med.qtyError ? "#ef4444" : "#e2e8f0" }}
                            value={med.qty}
                            onChange={e => updateMed(med.id, "qty", e.target.value)}
                            placeholder={med.source === "pharmacy" ? `max ${med.maxQty}` : "e.g. 10"}
                            onFocus={e => (e.currentTarget.style.borderColor = med.qtyError ? "#ef4444" : G)}
                            onBlur={e  => (e.currentTarget.style.borderColor = med.qtyError ? "#ef4444" : "#e2e8f0")}
                          />
                          {med.qtyError && (
                            <div style={{ fontSize: 10, color: "#ef4444", marginTop: 3, fontWeight: 600 }}>⚠ {med.qtyError}</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Dosage</div>
                          <input
                            style={{ ...INP, fontSize: 12, padding: "7px 10px" }}
                            value={med.dosage}
                            onChange={e => updateMed(med.id, "dosage", e.target.value)}
                            placeholder="e.g. 500mg"
                            onFocus={e => (e.currentTarget.style.borderColor = G)}
                            onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Frequency</div>
                          <input
                            style={{ ...INP, fontSize: 12, padding: "7px 10px" }}
                            value={med.frequency}
                            onChange={e => updateMed(med.id, "frequency", e.target.value)}
                            placeholder="e.g. 1 tab TID x 7 days"
                            onFocus={e => (e.currentTarget.style.borderColor = G)}
                            onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Medicine Manually button / form */}
              <div style={{ marginTop: 10 }}>
                {!showExtForm ? (
                  <button
                    onClick={() => setShowExtForm(true)}
                    style={{
                      width: "100%", padding: "9px 0", borderRadius: 10,
                      border: `1.5px dashed #fb923c`, background: "#fff7ed",
                      color: "#c2410c", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "background .15s",
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = "#ffedd5")}
                    onMouseOut={e  => (e.currentTarget.style.background = "#fff7ed")}
                  >
                    <span style={{ fontSize: 15 }}>＋</span> ADD MEDICINES
                  </button>
                ) : (
                  <div style={{ border: `1.5px solid #fed7aa`, borderRadius: 12, background: "#fff7ed", overflow: "hidden" }}>
                    <div style={{ background: "#ffedd5", padding: "10px 14px", borderBottom: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 16 }}>🛒</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#9a3412" }}>Add Medicine to Buy Outside</span>
                      </div>
                      <button onClick={() => setShowExtForm(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
                    </div>
                    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Medicine Name <span style={{ color: "#ef4444" }}>*</span></div>
                          <input
                            style={{ ...EXTINP, borderColor: "#fed7aa" }}
                            placeholder="e.g. Amoxicillin"
                            value={extName}
                            onChange={e => setExtName(e.target.value)}
                            onFocus={e => (e.currentTarget.style.borderColor = "#f97316")}
                            onBlur={e  => (e.currentTarget.style.borderColor = "#fed7aa")}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Dosage / Strength</div>
                          <input
                            style={{ ...EXTINP, borderColor: "#fed7aa" }}
                            placeholder="e.g. 500mg"
                            value={extDosage}
                            onChange={e => setExtDosage(e.target.value)}
                            onFocus={e => (e.currentTarget.style.borderColor = "#f97316")}
                            onBlur={e  => (e.currentTarget.style.borderColor = "#fed7aa")}
                          />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Quantity</div>
                          <input
                            style={{ ...EXTINP, borderColor: "#fed7aa" }}
                            placeholder="e.g. 21 tabs"
                            value={extQty}
                            onChange={e => setExtQty(e.target.value)}
                            onFocus={e => (e.currentTarget.style.borderColor = "#f97316")}
                            onBlur={e  => (e.currentTarget.style.borderColor = "#fed7aa")}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Frequency</div>
                          <input
                            style={{ ...EXTINP, borderColor: "#fed7aa" }}
                            placeholder="e.g. 1 cap TID x 7 days"
                            value={extFrequency}
                            onChange={e => setExtFrequency(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && extName.trim() && handleAddExternal()}
                            onFocus={e => (e.currentTarget.style.borderColor = "#f97316")}
                            onBlur={e  => (e.currentTarget.style.borderColor = "#fed7aa")}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => setShowExtForm(false)}
                          style={{ padding: "7px 18px", borderRadius: 99, border: "1.5px solid #d1d5db", background: "transparent", color: "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                        >Cancel</button>
                        <button
                          onClick={handleAddExternal}
                          disabled={!extName.trim()}
                          style={{ padding: "7px 18px", borderRadius: 99, border: "none", background: !extName.trim() ? "#fed7aa" : "#f97316", color: "#fff", fontSize: 12, fontWeight: 700, cursor: !extName.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background .15s" }}
                          onMouseOver={e => { if (extName.trim()) e.currentTarget.style.background = "#ea580c"; }}
                          onMouseOut={e  => { if (extName.trim()) e.currentTarget.style.background = "#f97316"; }}
                        >＋ Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={LBL}>Notes</label>
              <textarea
                style={{ ...INP, minHeight: 80, resize: "vertical", lineHeight: 1.6 }}
                value={form.notes} onChange={e => set("notes", e.target.value)}
                placeholder="Additional instructions…"
                onFocus={e => (e.currentTarget.style.borderColor = G)}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>

          </div>{/* end scrollable body */}

          {/* Footer */}
          <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {selectedMeds.length > 0 ? (
                <span style={{ color: "#166534", fontWeight: 600 }}>
                  {selectedMeds.filter(m => m.source === "pharmacy").length > 0 && `💊 ${selectedMeds.filter(m => m.source === "pharmacy").length} from pharmacy`}
                  {selectedMeds.filter(m => m.source === "pharmacy").length > 0 && selectedMeds.filter(m => m.source === "external").length > 0 && "  "}
                  {selectedMeds.filter(m => m.source === "external").length > 0 && <span style={{ color: "#c2410c" }}>🛒 {selectedMeds.filter(m => m.source === "external").length} to buy outside</span>}
                </span>
              ) : (
                <span style={{ color: "#9ca3af" }}>No medicines selected</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} disabled={saving}
                style={{ padding: "10px 24px", borderRadius: 99, border: "1.5px solid #d1d5db", background: "transparent", color: "#374151", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans, sans-serif", cursor: saving ? "not-allowed" : "pointer", transition: "all .15s" }}
                onMouseOver={e => { if (!saving) e.currentTarget.style.borderColor = "#9ca3af"; }}
                onMouseOut={e  => { if (!saving) e.currentTarget.style.borderColor = "#d1d5db"; }}
              >CANCEL</button>
              <button
                onClick={handleSend}
                disabled={saving || selectedMeds.length === 0 || hasQtyErrors}
                style={{
                  padding: "10px 28px", borderRadius: 99, border: "none",
                  background: saving || !selectedMeds.length || hasQtyErrors ? "#86efac" : G,
                  color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans, sans-serif",
                  cursor: saving || !selectedMeds.length || hasQtyErrors ? "not-allowed" : "pointer",
                  boxShadow: !saving && selectedMeds.length && !hasQtyErrors ? "0 2px 10px rgba(22,163,74,0.3)" : "none",
                  transition: "all .15s",
                }}
                onMouseOver={e => { if (!saving && selectedMeds.length && !hasQtyErrors) e.currentTarget.style.background = "#15803d"; }}
                onMouseOut={e  => { if (!saving && selectedMeds.length && !hasQtyErrors) e.currentTarget.style.background = G; }}
              >
                {saving ? "SAVING…" : `SEND${selectedMeds.length > 1 ? ` (${selectedMeds.length})` : ""}`}
              </button>
            </div>
          </div>

        </div>{/* end RIGHT PANEL */}
      </div>
    </div>
  );
}