"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const GREEN_DARK  = "#15803d";
const GREEN_DARK2 = "#166534";
const GREEN       = "#16a34a";
const INPUT_BG    = "#f0fdf4";
const INPUT_BD    = "#bbf7d0";

const VACCINE_GROUPS: { title: string; items: string[] }[] = [
  { title: "ROUTINE / EPI",   items: ["BCG", "OPV1", "OPV2", "OPV3", "DPT1", "DPT2", "DPT3", "Measles", "MMR"] },
  { title: "HEPATITIS",       items: ["HepA1", "HepA2", "HepA3", "Hepatitis B"] },
  { title: "OTHER VACCINES",  items: ["Varicella", "HPV", "Pneumococcal", "Flu Vaccine", "Tetanus Toxoid", "Meningococcal", "COVID-19 Booster"] },
];

interface PatientOption {
  queueId: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  alreadySent: boolean;
}

interface PrefillPatient {
  queueId: string;
  patientId: string;
  name: string;
  age: number | string;
  gender: string;
  civil?: string;
  addr?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  prefillPatient?: PrefillPatient | null;
}

function describeError(e: any): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  const parts: string[] = [];
  if (e.message) parts.push(e.message);
  if (e.details) parts.push(`details: ${e.details}`);
  if (e.hint)    parts.push(`hint: ${e.hint}`);
  if (e.code)    parts.push(`code: ${e.code}`);
  if (parts.length) return parts.join(" | ");
  try {
    const own = JSON.stringify(e, Object.getOwnPropertyNames(e));
    if (own && own !== "{}") return own;
  } catch { /**/ }
  const s = String(e);
  return s === "[object Object]" ? "Unknown error (see Network tab)" : s;
}

function getTodayPHT(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];
}

export default function SendVaccineToNurseModal({ open, onClose, onSent, prefillPatient }: Props) {
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [patients, setPatients]         = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);

  const [name, setName]       = useState("");
  const [date, setDate]       = useState(getTodayPHT);
  const [age, setAge]         = useState("");
  const [gender, setGender]   = useState("");
  const [civil, setCivil]     = useState("");
  const [address, setAddress] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const [showCloseConfirm,  setShowCloseConfirm]  = useState(false);
  // ── NEW: review/confirm before send ──────────────────────────────────
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setNotes("");
    setError("");
    setShowCloseConfirm(false);
    setShowReviewConfirm(false);
    setDate(getTodayPHT());

    if (prefillPatient) {
      const p: PatientOption = {
        queueId:     prefillPatient.queueId,
        patientId:   prefillPatient.patientId,
        name:        prefillPatient.name,
        age:         prefillPatient.age != null ? Number(prefillPatient.age) : (undefined as any),
        gender:      prefillPatient.gender || "",
        alreadySent: false,
      };
      setSelectedPatient(p);
      setPatients([p]);
      setName(p.name);
      setAge(prefillPatient.age != null ? String(prefillPatient.age) : "");
      setGender(p.gender);
      setCivil(prefillPatient.civil ?? "");
      setAddress(prefillPatient.addr ?? "");
    } else {
      setSelectedPatient(null);
      setName(""); setAge(""); setGender(""); setCivil(""); setAddress("");
      loadQueue();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillPatient]);

  async function loadQueue() {
    setLoadingQueue(true);
    setError("");
    const today = getTodayPHT();
    const rows: PatientOption[] = [];

    try {
      // ✅ FIX: dapat soap_consultations ang pagkukunan ng queue — ito ang
      // "doctor side" na queue (gaya ng PendingPatients.tsx "Today's Queue" tab).
      // Ang konsulta_registrations ay registrar-side pa lang; kasama dun yung
      // mga pasyenteng hindi pa nakikita ng doctor (e.g. diretso-vaccine lang
      // sa nurse), kaya hindi dapat dito kukunin ang list.
      const { data: consultRows, error: cErr } = await supabase
        .from("soap_consultations")
        .select("id, created_at, patient_id")
        .eq("queue_date", today)
        .order("created_at", { ascending: true });

      if (cErr) throw new Error(describeError(cErr));

      // Lahat ng nakikita ng doctor ngayong araw (waiting AT done) ay dapat
      // pumapasok dito — kahit tapos na ang consultation, posible pa ring
      // mag-order ng bakuna ang doctor para sa pasyente.
      const queueRows = consultRows ?? [];

      if (queueRows.length === 0) {
        setPatients([]);
        setLoadingQueue(false);
        return;
      }

      const patientIds = [...new Set(queueRows.map((r: any) => r.patient_id).filter(Boolean))] as string[];
      const { data: patientRows, error: pErr } = await supabase
        .from("patients")
        .select("id, first_name, last_name, age, sex")
        .in("id", patientIds);

      if (pErr) throw new Error(describeError(pErr));

      const patientMap = Object.fromEntries(
        (patientRows ?? []).map((p: any) => [p.id, p])
      );

      const seenPatientIds = new Set<string>();
      queueRows.forEach((r: any) => {
        // Dedupe by patient_id kung sakaling may duplicate consultation rows.
        if (seenPatientIds.has(r.patient_id)) return;
        seenPatientIds.add(r.patient_id);

        const p = patientMap[r.patient_id];
        if (!p) return;

        rows.push({
          queueId:     r.id,
          patientId:   r.patient_id,
          name:        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
          age:         p.age,
          gender:      p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : "",
          alreadySent: false,
        });
      });

      if (rows.length > 0) {
        const ids = rows.map((r) => r.queueId);
        const { data: vReqs } = await supabase
          .from("patient_vaccine_orders")
          .select("consultation_id")
          .in("consultation_id", ids);
        if (vReqs) {
          const sentSet = new Set(vReqs.map((v: any) => v.consultation_id));
          rows.forEach((r) => { r.alreadySent = sentSet.has(r.queueId); });
        }
      }

      setPatients(rows);
    } catch (e) {
      setError(`Hindi ma-load ang queue: ${describeError(e)}`);
    } finally {
      setLoadingQueue(false);
    }
  }

  function onPickPatient(queueId: string) {
    if (!queueId) { setSelectedPatient(null); return; }
    const p = patients.find((x) => x.queueId === queueId) || null;
    setSelectedPatient(p);
    if (p) { setName(p.name); setAge(p.age != null ? String(p.age) : ""); setGender(p.gender); }
  }

  function toggleVaccine(v: string) {
    setSelected((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  function hasUnsavedChanges() {
    const typedManual =
      !prefillPatient &&
      !selectedPatient &&
      (name.trim() !== "" || civil.trim() !== "" || address.trim() !== "");
    return selected.length > 0 || notes.trim() !== "" || typedManual;
  }

  function requestClose() {
    if (saving) return;
    if (hasUnsavedChanges()) setShowCloseConfirm(true);
    else onClose();
  }

  function confirmClose() {
    setShowCloseConfirm(false);
    onClose();
  }

  // ── Validate first, show review modal if OK ───────────────────────────
  function handleSendClick() {
    setError("");
    if (!selected.length)  { setError("Pumili ng kahit isang bakuna."); return; }
    if (!name.trim())      { setError("Kailangan ng pangalan ng pasyente."); return; }
    if (!selectedPatient)  { setError("Pumili muna ng pasyente mula sa queue."); return; }
    setShowReviewConfirm(true);
  }

  // ── Actual DB write — called only after review confirm ────────────────
  async function handleConfirmedSend() {
    setShowReviewConfirm(false);
    setSaving(true);
    setError("");

    const payload = {
      patient_id:      selectedPatient!.patientId,
      consultation_id: selectedPatient!.queueId,
      patient_name:    name.trim(),
      patient_age:     age ? Number(age) : null,
      patient_gender:  gender || null,
      vaccines:        selected,
      notes:           notes || null,
      status:          "pending",
    };

    const { error: dbErr } = await supabase
      .from("patient_vaccine_orders")
      .upsert(payload, { onConflict: "consultation_id" });

    setSaving(false);
    if (dbErr) { setError(describeError(dbErr)); return; }
    onSent();
    onClose();
  }

  if (!open) return null;
  const canSend = !!selected.length && !!name.trim() && !!selectedPatient;

  const INP: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: INPUT_BG,
    border: `1.5px solid ${INPUT_BD}`, borderRadius: 10,
    padding: "10px 14px", fontSize: 13, fontFamily: "'Nunito', sans-serif",
    color: "#111827", outline: "none",
  };
  const LBL: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#374151",
    textTransform: "uppercase" as const, letterSpacing: 0.5,
    display: "block", marginBottom: 5,
  };

  return (
    <>
    <div
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={requestClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 20, width: "min(860px,97vw)", maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.28)", overflow: "hidden" }}
      >
        {/* ── Header ── */}
        <div style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN_DARK2})`, padding: "18px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", fontFamily: "'Nunito', sans-serif"}}>💉 Vaccine Request</div>
            <div style={{ fontSize: 11, color: "#bbf7d0", marginTop: 2 }}>Doctor → Nurse vaccination order</div>
          </div>
          <button onClick={requestClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>

          {/* LEFT PANEL */}
          <div style={{ width: 340, flexShrink: 0, overflowY: "auto", padding: "20px 20px 20px 24px", display: "flex", flexDirection: "column", gap: 14, borderRight: `1.5px solid ${INPUT_BD}` }}>

            {prefillPatient ? (
              <>
                <div style={{
                  background: "linear-gradient(135deg,#f0fdf4,#ecfdf5)",
                  border: `1.5px solid ${INPUT_BD}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: GREEN_DARK, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                    🩺 From Current Consultation
                  </div>
                  <div style={{ fontSize: 11, color: GREEN_DARK, fontWeight: 700 }}>
                    Basic information is already filled from the completed consultation.
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={LBL}>Patient Name</label>
                    <input value={name} readOnly placeholder="Full name" style={{ ...INP, cursor: "not-allowed" }} />
                  </div>
                  <div>
                    <label style={LBL}>Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={INP} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={LBL}>Age</label>
                    <input value={age} readOnly placeholder="e.g. 2" style={{ ...INP, cursor: "not-allowed" }} />
                  </div>
                  <div>
                    <label style={LBL}>Gender</label>
                    <input value={gender} readOnly placeholder="Male / Female" style={{ ...INP, cursor: "not-allowed" }} />
                  </div>
                </div>

                <div>
                  <label style={LBL}>Civil Status</label>
                  <input value={civil} onChange={(e) => setCivil(e.target.value)} placeholder="Single / Married" style={INP} />
                </div>

                <div>
                  <label style={LBL}>Address</label>
                  <input value={address} readOnly placeholder="Barangay, Municipality, Province" style={{ ...INP, cursor: "not-allowed" }} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={LBL}>Select from Today's Queue</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={selectedPatient?.queueId ?? ""}
                      onChange={(e) => onPickPatient(e.target.value)}
                      style={{ ...INP, appearance: "none", cursor: "pointer", paddingRight: 36, fontWeight: 600, color: selectedPatient ? "#111827" : "#6b7280" }}
                    >
                      <option value="">
                        {loadingQueue ? "Naglo-load…" : `— Choose patient (${patients.length} today) —`}
                      </option>
                      {patients.map((p) => (
                        <option key={p.queueId} value={p.queueId}>
                          {p.name} · {p.age ?? "—"} yrs · {p.gender || "—"}{p.alreadySent ? " ✓" : ""}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: GREEN_DARK, fontSize: 11 }}>▼</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: INPUT_BD }} />
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>or fill in manually</span>
                  <div style={{ flex: 1, height: 1, background: INPUT_BD }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={LBL}>Patient Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={INP} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={LBL}>Age</label>
                    <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 2" style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>Gender</label>
                    <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Male / Female" style={INP} />
                  </div>
                </div>

                <div>
                  <label style={LBL}>Civil Status</label>
                  <input value={civil} onChange={(e) => setCivil(e.target.value)} placeholder="Single / Married" style={INP} />
                </div>

                <div>
                  <label style={LBL}>Address</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Barangay, Municipality, Province" style={INP} />
                </div>
              </>
            )}

            <div>
              <label style={LBL}>Instructions / Notes <span style={{ fontWeight: 400, textTransform: "none", color: "#9ca3af" }}>(optional)</span></label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. I-administer pagkatapos ng vitals…" rows={3} style={{ ...INP, resize: "vertical" }} />
            </div>

            {error && <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>⚠️ {error}</div>}
          </div>

          {/* RIGHT PANEL */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              Select Vaccines
              {selected.length > 0 && (
                <span style={{ background: GREEN_DARK, color: "#fff", borderRadius: 99, padding: "2px 10px", fontSize: 11 }}>
                  {selected.length} selected
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {VACCINE_GROUPS.map((group) => (
                <div key={group.title}>
                  <div style={{ background: GREEN_DARK, color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", padding: "8px 14px", borderRadius: 8, marginBottom: 10 }}>
                    {group.title}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {group.items.map((v) => {
                      const active = selected.includes(v);
                      return (
                        <button
                          key={v}
                          onClick={() => toggleVaccine(v)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${active ? GREEN : "#e5e7eb"}`, background: active ? INPUT_BG : "#fff", textAlign: "left", transition: "all .12s", width: "100%" }}
                        >
                          <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${active ? GREEN_DARK : "#cbd5e1"}`, background: active ? GREEN_DARK : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800, transition: "all .12s" }}>
                            {active ? "✓" : ""}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? GREEN_DARK2 : "#374151" }}>{v}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: selected.length ? GREEN_DARK : "#9ca3af", fontWeight: selected.length ? 700 : 400 }}>
            {selected.length > 0 ? `💉 ${selected.length} vaccine${selected.length > 1 ? "s" : ""} selected` : "No vaccines selected yet"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
         
            <button
              onClick={handleSendClick}
              disabled={saving || !canSend}
              style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: canSend ? `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` : "#e5e7eb", color: canSend ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 800, fontFamily: "'Nunito', sans-serif", cursor: canSend ? "pointer" : "not-allowed", boxShadow: canSend ? "0 2px 10px rgba(21,128,61,0.3)" : "none", transition: "all .15s", display: "flex", alignItems: "center", gap: 8 }}
            >
              {saving ? "⏳ Sending…" : `Review & Send${selected.length ? ` (${selected.length})` : ""} →`}
            </button>
          </div>
        </div>
      </div>
    </div>

   {/* ── REVIEW & SEND CONFIRMATION ── */}
    {showReviewConfirm && (
      <div
        onClick={() => setShowReviewConfirm(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 3200,
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff", borderRadius: 20,
            width: "min(480px, 95vw)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
            fontFamily: "'Nunito', sans-serif",
            overflow: "hidden",
          }}
        >
          {/* ── Header — gradient with date top-right ── */}
          <div style={{
            background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN_DARK2})`,
            padding: "20px 24px 22px",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", top: 16, right: 18,
              background: "rgba(255,255,255,0.18)", borderRadius: 99,
              padding: "4px 14px", fontSize: 12, fontWeight: 700, color: "#fff",
            }}>
              {new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#bbf7d0", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
              Review Request
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "'Nunito', sans-serif" }}>
              Confirm Vaccine Order
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Patient Information card */}
            <div style={{
              background: INPUT_BG, border: `1.5px solid ${INPUT_BD}`,
              borderRadius: 14, padding: "16px 18px",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 800, color: GREEN_DARK,
                letterSpacing: 1, textTransform: "uppercase", marginBottom: 10,
              }}>
                Patient Information
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 12 }}>
                {name}
              </div>
              {/* Grid: Age | Gender | Civil */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 0", marginBottom: address ? 10 : 0 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Age</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{age || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Gender</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: gender === "Female" ? "#db2777" : gender === "Male" ? "#2563eb" : "#111827" }}>{gender || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Civil Status</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{civil || "—"}</div>
                </div>
              </div>
              {address && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Address</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{address}</div>
                </div>
              )}
            </div>

            {/* Vaccines list */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 800, color: "#111827",
                letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10,
              }}>
                Vaccines to Administer ({selected.length})
              </div>
              <div style={{
                background: INPUT_BG, border: `1.5px solid ${INPUT_BD}`,
                borderRadius: 14, overflow: "hidden",
              }}>
                {/* Source label row */}
                <div style={{
                  background: GREEN_DARK, padding: "7px 16px",
                  display: "flex", alignItems: "center", gap: 7,
                }}>
                  <span style={{ fontSize: 13 }}>💉</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>
                    RHU NURSE STATION
                  </span>
                </div>
                <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {selected.map(v => (
                    <div key={v} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#111827", fontWeight: 500 }}>
                      <span style={{ color: GREEN, fontWeight: 800, fontSize: 15 }}>✓</span>
                      {v}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes — show if filled */}
            {notes.trim() && (
              <div style={{
                background: "#fffbeb", border: "1.5px solid #fcd34d",
                borderRadius: 12, padding: "10px 14px",
                display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <span style={{ fontSize: 13, color: "#b45309", marginTop: 1 }}>📝</span>
                <div style={{ fontSize: 13, color: "#78350f", fontWeight: 500 }}>{notes}</div>
              </div>
            )}

            {/* Notice box */}
            <div style={{
              background: "#fffbeb", border: "1.5px solid #fcd34d",
              borderRadius: 12, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ color: "#b45309", fontWeight: 800, fontSize: 13 }}>✓</span>
              <span style={{ fontSize: 12, color: "#78350f", fontWeight: 600 }}>
                After confirming, the vaccine order will be sent to the nurse.
              </span>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: "14px 22px",
            borderTop: "1px solid #f1f5f9",
            display: "flex", gap: 10, justifyContent: "flex-end",
            background: "#fff",
          }}>
            <button
              onClick={() => setShowReviewConfirm(false)}
              style={{
                padding: "10px 24px", borderRadius: 99,
                border: "1.5px solid #d1d5db", background: "#fff",
                color: "#374151", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "'Nunito', sans-serif",
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleConfirmedSend}
              style={{
                padding: "10px 28px", borderRadius: 99, border: "none",
                background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})`,
                color: "#fff", fontSize: 13, fontWeight: 800,
                cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                boxShadow: "0 2px 10px rgba(21,128,61,0.35)",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              ✓ Confirm
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── CLOSE WITHOUT SAVING CONFIRMATION ── */}
    {showCloseConfirm && (
      <div
        onClick={() => setShowCloseConfirm(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 3100,
          background: "rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff", borderRadius: 20, padding: "30px 34px",
            width: "min(380px, 90vw)", textAlign: "center",
            boxShadow: "0 14px 50px rgba(0,0,0,0.28)",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            Close without saving?
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
            Unsaved changes will be lost.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
         
            <button
              onClick={confirmClose}
              style={{ padding: "10px 30px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",fontFamily: "'Nunito', sans-serif" }}
            >Discard</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}