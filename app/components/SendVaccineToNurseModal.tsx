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

  interface Props {
    open: boolean;
    onClose: () => void;
    onSent: () => void;
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

  export default function SendVaccineToNurseModal({ open, onClose, onSent }: Props) {
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

    useEffect(() => {
      if (open) {
        setSelectedPatient(null);
        setName(""); setAge(""); setGender(""); setCivil(""); setAddress("");
        setDate(getTodayPHT());
        setSelected([]); setNotes(""); setError("");
        loadQueue();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function loadQueue() {
      setLoadingQueue(true);
      setError("");
      const today = getTodayPHT();
      const rows: PatientOption[] = [];

      try {
        // Probe columns first to avoid hardcoding wrong names
        const { data: probe } = await supabase
          .from("konsulta_registrations")
          .select("*")
          .limit(1);

        const sample   = probe?.[0] ?? {};
        const dateCol  = "registration_date" in sample ? "registration_date"
                      : "queue_date"         in sample ? "queue_date"
                      : "date"               in sample ? "date"
                      : "created_at";
        const statusCol = "status"       in sample ? "status"
                        : "nurse_status" in sample ? "nurse_status"
                        : null;

        const selectCols = `id, patient_id, ${dateCol}${statusCol ? ", " + statusCol : ""}, patients ( first_name, last_name, age, sex )`;
        const { data: kAll, error: kErr } = await supabase
          .from("konsulta_registrations")
          .select(selectCols)
          .order("created_at", { ascending: false })
          .limit(200);

        if (kErr) throw new Error(describeError(kErr));

        const matched = (kAll ?? []).filter((r: any) => {
          const val = r[dateCol];
          if (!val) return false;
          if (String(val).includes("T") || String(val).includes("+")) {
            const pht = new Date(new Date(val).getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];
            return pht === today;
          }
          return String(val).startsWith(today);
        });

        const cancelled = ["CANCELLED", "cancelled", "Cancelled"];
        matched
          .filter((r: any) => !statusCol || !cancelled.includes(r[statusCol]))
          .forEach((r: any) => {
            rows.push({
              queueId:     r.id,
              patientId:   r.patient_id,
              name:        `${r.patients?.first_name ?? ""} ${r.patients?.last_name ?? ""}`.trim(),
              age:         r.patients?.age,
              gender:      r.patients?.sex === "M" ? "Male" : r.patients?.sex === "F" ? "Female" : "",
              alreadySent: false,
            });
          });

        // Flag already-sent
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

   async function handleSend() {
  if (!selected.length) { setError("Pumili ng kahit isang bakuna."); return; }
  if (!name.trim())     { setError("Kailangan ng pangalan ng pasyente."); return; }
  if (!selectedPatient) { setError("Pumili muna ng pasyente mula sa queue."); return; } // ← dagdag ito
  setSaving(true); setError("");

  const payload = {
    patient_id:      selectedPatient.patientId,   // guaranteed not null na
    consultation_id: selectedPatient.queueId,
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
  onClose();  // ← isara ang modal pagkatapos
}

    if (!open) return null;
   const canSend = !!selected.length && !!name.trim() && !!selectedPatient;

    const INP: React.CSSProperties = {
      width: "100%", boxSizing: "border-box", background: INPUT_BG,
      border: `1.5px solid ${INPUT_BD}`, borderRadius: 10,
      padding: "10px 14px", fontSize: 13, fontFamily: "DM Sans,sans-serif",
      color: "#111827", outline: "none",
    };
    const LBL: React.CSSProperties = {
      fontSize: 11, fontWeight: 700, color: "#374151",
      textTransform: "uppercase" as const, letterSpacing: 0.5,
      display: "block", marginBottom: 5,
    };

    return (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ background: "#fff", borderRadius: 20, width: "min(860px,97vw)", maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.28)", overflow: "hidden" }}
        >
          {/* ── Header ── */}
          <div style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN_DARK2})`, padding: "18px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", fontFamily: "'Syne',sans-serif" }}>💉 Vaccine Request</div>
              <div style={{ fontSize: 11, color: "#bbf7d0", marginTop: 2 }}>Doctor → Nurse vaccination order</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* ── Body: left patient info | right vaccine list ── */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>

            {/* LEFT PANEL — patient details */}
            <div style={{ width: 340, flexShrink: 0, overflowY: "auto", padding: "20px 20px 20px 24px", display: "flex", flexDirection: "column", gap: 14, borderRight: `1.5px solid ${INPUT_BD}` }}>

              {/* Queue picker */}
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

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: INPUT_BD }} />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>or fill in manually</span>
                <div style={{ flex: 1, height: 1, background: INPUT_BD }} />
              </div>

              {/* Name + Date */}
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

              {/* Age / Gender / Civil */}
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

              {/* Address */}
              <div>
                <label style={LBL}>Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Barangay, Municipality, Province" style={INP} />
              </div>

              {/* Notes */}
              <div>
                <label style={LBL}>Instructions / Notes <span style={{ fontWeight: 400, textTransform: "none", color: "#9ca3af" }}>(optional)</span></label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. I-administer pagkatapos ng vitals…" rows={3} style={{ ...INP, resize: "vertical" }} />
              </div>

              {error && <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>⚠️ {error}</div>}
            </div>

            {/* RIGHT PANEL — vaccine checkboxes, 2-column grid per group */}
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
                    {/* Group header — full width */}
                    <div style={{ background: GREEN_DARK, color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", padding: "8px 14px", borderRadius: 8, marginBottom: 10 }}>
                      {group.title}
                    </div>
                    {/* 2-column grid of checkboxes */}
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
              <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans,sans-serif", cursor: "pointer" }}>
                CANCEL
              </button>
              <button
                onClick={handleSend}
                disabled={saving || !canSend}
                style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: canSend ? `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` : "#e5e7eb", color: canSend ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 800, fontFamily: "DM Sans,sans-serif", cursor: canSend ? "pointer" : "not-allowed", boxShadow: canSend ? "0 2px 10px rgba(21,128,61,0.3)" : "none", transition: "all .15s", display: "flex", alignItems: "center", gap: 8 }}
              >
                {saving ? "⏳ Sending…" : `Send to Nurse${selected.length ? ` (${selected.length})` : ""} →`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }