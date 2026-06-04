"use client";
import { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css";
import { supabase } from "@/lib/supabase";
import { logAction } from '@/utils/auditLogs'// dagdag lynnel
import { useAuth } from '@/context/AuthContext'// dagdag lynnel


const LAB_SECTIONS = [
  { title: "HEMATOLOGY", col: 0, tests: [
    { label: "Hgb/Hct",                           col: "hgb_hct" },
    { label: "Complete Blood Count with Platelet", col: "cbc_with_platelet" },
  ]},
  { title: "BLOOD CHEMISTRY", col: 0,
    note: "Fasting: 8–10 hours no food/water\n*Last meal: 10:30PM – 12AM*",
    tests: [
      { label: "Random Blood Sugar",  col: "random_blood_sugar" },
      { label: "Fasting Blood Sugar", col: "fasting_blood_sugar" },
      { label: "Cholesterol",         col: "cholesterol" },
      { label: "Triglycerides",       col: "triglycerides" },
      { label: "Lipid Profile",       col: "lipid_profile" },
      { label: "Blood Uric Acid",     col: "blood_uric_acid" },
    ],
  },
  { title: "MICROBIOLOGY", col: 0, tests: [
    { label: "AFB/DSSM",               col: "afb_dssm" },
    { label: "Culture and Sensitivity", col: "culture_and_sensitivity" },
  ]},
  { title: "MICROSCOPY / PARASITOLOGY", col: 1, tests: [
    { label: "Urinalysis",     col: "urinalysis" },
    { label: "Fecalysis",      col: "fecalysis" },
    { label: "Pregnancy Test", col: "pregnancy_test" },
  ]},
  { title: "SEROLOGY", col: 1, tests: [
    { label: "ABO, Rh Blood Typing", col: "abo_rh_blood_typing" },
    { label: "Dengue NS1",           col: "dengue_ns1" },
    { label: "Dengue IgG, IgM",      col: "dengue_igg_igm" },
    { label: "HbsAg",                col: "hbsag" },
    { label: "Gene Xpert",           col: "gene_xpert" },
  ]},
];

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
interface QueuePatient {
  id: string; name: string; age: string; gender: string; addr: string;
}

export default function LabRequestModal({ open, patient, onClose, onSend }: Props) {
  const today = new Date().toISOString().split("T")[0];
   const { user } = useAuth()// NAAGDAG LYNNEL 

  const [form,              setForm]              = useState({ name: "", date: today, age: "", gender: "", civil: "", addr: "" });
  const [checked,           setChecked]           = useState<string[]>([]);
  const [saving,            setSaving]            = useState(false);
  const [queuePatients,     setQueuePatients]     = useState<QueuePatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // ── Fetch today's queue when no patient prop ─────────────────────────────
  useEffect(() => {
    if (!open) return;

    if (!patient) {
      (async () => {
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: consultRows } = await supabase
          .from("soap_consultations")
          .select("patient_id")
          .eq("queue_date", todayStr)
          .order("queue_number", { ascending: true });

        if (!consultRows?.length) { setQueuePatients([]); return; }

        const ids = [...new Set(consultRows.map((r: any) => r.patient_id).filter(Boolean))];
        const { data: pRows } = await supabase
          .from("patients")
          .select("id, first_name, last_name, age, sex, purok, barangay, municipality")
          .in("id", ids);

        const pMap = Object.fromEntries((pRows ?? []).map((p: any) => [p.id, p]));
        const seen = new Set<string>();
        setQueuePatients(
          consultRows.map((r: any) => {
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

  // ── Reset on open ────────────────────────────────────────────────────────
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
  function toggle(col: string) {
    setChecked(c => c.includes(col) ? c.filter(x => x !== col) : [...c, col]);
  }

  function handleSelectQueuePatient(id: string) {
    setSelectedPatientId(id);
    const p = queuePatients.find(q => q.id === id);
    if (p) setForm(f => ({ ...f, name: p.name, age: p.age, gender: p.gender, addr: p.addr }));
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  async function handleSend() {
    if (!checked.length) { alert("Please select at least one test."); return; }
    setSaving(true);
    try {
      let patientUUID: string | null = selectedPatientId || null;

      if (!patientUUID && form.name.trim()) {
        const parts     = form.name.trim().split(" ");
        const lastName  = parts.length > 1 ? parts[parts.length - 1] : "";
        const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
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

      const testPayload: Record<string, boolean> = {};
      ALL_TESTS.forEach(t => { testPayload[t.col] = checked.includes(t.col); });

      const { error } = await supabase
        .from("laboratory_requests")
        .insert({ patient_id: patientUUID, request_date: form.date, status: "pending", ...testPayload });

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

  // ── Shared styles ────────────────────────────────────────────────────────
  const inputBase: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "DM Sans, sans-serif",
    color: "#111827",
    background: "#f0fdf4",
    outline: "none",
    transition: "border-color .15s",
  };

  const labelBase: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
    marginBottom: 6,
  };

  const col0 = LAB_SECTIONS.filter(s => s.col === 0);
  const col1 = LAB_SECTIONS.filter(s => s.col === 1);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          width: "min(740px, 96vw)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #064e3b 0%, #16a34a 100%)",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <h2 style={{
            margin: 0, fontSize: 20, fontWeight: 700,
            color: "#fff", fontFamily: "DM Sans, sans-serif",
          }}>
            Laboratory Request
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,255,255,0.2)",
              border: "none", color: "#fff", fontSize: 16,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              transition: "background .15s",
            }}
            onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
            onMouseOut={e  => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "20px 24px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>

          {/* Queue dropdown */}
          {!patient && (
            <>
              <div>
                <select
                  value={selectedPatientId}
                  onChange={e => handleSelectQueuePatient(e.target.value)}
                  style={{ ...inputBase, cursor: "pointer", appearance: "auto" as any }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
                  onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
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
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#9ca3af", fontSize: 12 }}>
                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                <span>or fill in manually</span>
                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              </div>
            </>
          )}

          {/* Patient Name + Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelBase}>Patient Name</label>
              <input
                style={inputBase}
                value={form.name}
                onChange={e => { setF("name", e.target.value); if (!patient) setSelectedPatientId(""); }}
                onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>
            <div>
              <label style={labelBase}>Date</label>
              <input
                type="date"
                style={inputBase}
                value={form.date}
                onChange={e => setF("date", e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>
          </div>

          {/* Age + Gender + Civil Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelBase}>Age</label>
              <input
                style={inputBase}
                value={form.age}
                onChange={e => setF("age", e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>
            <div>
              <label style={labelBase}>Gender</label>
              <input
                style={inputBase}
                value={form.gender}
                onChange={e => setF("gender", e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>
            <div>
              <label style={labelBase}>Civil Status</label>
              <input
                style={inputBase}
                value={form.civil}
                onChange={e => setF("civil", e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label style={labelBase}>Address</label>
            <input
              style={inputBase}
              value={form.addr}
              onChange={e => setF("addr", e.target.value)}
              onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
              onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
          </div>

          {/* ── Lab Tests (2-column grid) ── */}
          <div>
            <label style={{ ...labelBase, marginBottom: 12 }}>Laboratory Tests</label>

            {/* Selected count badge */}
            {checked.length > 0 && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#dcfce7", color: "#16a34a",
                borderRadius: 99, padding: "4px 12px",
                fontSize: 12, fontWeight: 700, marginBottom: 12,
              }}>
                ✓ {checked.length} test{checked.length > 1 ? "s" : ""} selected
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Column 0 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {col0.map(sec => (
                  <div key={sec.title} style={{
                    background: "#f8fafc",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}>
                    {/* Section header */}
                    <div style={{
                      background: "linear-gradient(90deg, #064e3b, #16a34a)",
                      padding: "8px 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: 0.8,
                    }}>
                      {sec.title}
                    </div>

                    {/* Tests */}
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {(sec as any).note && (
                        <p style={{
                          margin: 0, fontSize: 10, color: "#6b7280",
                          fontStyle: "italic", lineHeight: 1.5,
                          borderLeft: "3px solid #bbf7d0",
                          paddingLeft: 8, marginBottom: 4,
                        }}>
                          {(sec as any).note}
                        </p>
                      )}
                      {sec.tests.map(t => {
                        const isChecked = checked.includes(t.col);
                        return (
                          <label
                            key={t.col}
                            onClick={() => toggle(t.col)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              cursor: "pointer",
                              padding: "6px 10px",
                              borderRadius: 8,
                              background: isChecked ? "#dcfce7" : "#fff",
                              border: `1.5px solid ${isChecked ? "#16a34a" : "#e2e8f0"}`,
                              transition: "all .15s",
                              userSelect: "none",
                            }}
                          >
                            {/* Custom checkbox */}
                            <div style={{
                              width: 18, height: 18, borderRadius: 5,
                              flexShrink: 0,
                              background: isChecked ? "#16a34a" : "#fff",
                              border: `2px solid ${isChecked ? "#16a34a" : "#d1d5db"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all .15s",
                            }}>
                              {isChecked && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 5l2.5 2.5L8 3"
                                    stroke="#fff" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <span style={{
                              fontSize: 13,
                              fontWeight: isChecked ? 600 : 400,
                              color: isChecked ? "#166534" : "#374151",
                              transition: "all .15s",
                            }}>
                              {t.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Column 1 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {col1.map(sec => (
                  <div key={sec.title} style={{
                    background: "#f8fafc",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      background: "linear-gradient(90deg, #064e3b, #16a34a)",
                      padding: "8px 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: 0.8,
                    }}>
                      {sec.title}
                    </div>
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {sec.tests.map(t => {
                        const isChecked = checked.includes(t.col);
                        return (
                          <label
                            key={t.col}
                            onClick={() => toggle(t.col)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              cursor: "pointer",
                              padding: "6px 10px",
                              borderRadius: 8,
                              background: isChecked ? "#dcfce7" : "#fff",
                              border: `1.5px solid ${isChecked ? "#16a34a" : "#e2e8f0"}`,
                              transition: "all .15s",
                              userSelect: "none",
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: 5,
                              flexShrink: 0,
                              background: isChecked ? "#16a34a" : "#fff",
                              border: `2px solid ${isChecked ? "#16a34a" : "#d1d5db"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all .15s",
                            }}>
                              {isChecked && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 5l2.5 2.5L8 3"
                                    stroke="#fff" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <span style={{
                              fontSize: 13,
                              fontWeight: isChecked ? 600 : 400,
                              color: isChecked ? "#166534" : "#374151",
                              transition: "all .15s",
                            }}>
                              {t.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          flexShrink: 0,
          background: "#fff",
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 28px", borderRadius: 99,
              border: "2px solid #d1d5db", background: "transparent",
              color: "#374151", fontSize: 13, fontWeight: 700,
              fontFamily: "DM Sans, sans-serif",
              cursor: saving ? "not-allowed" : "pointer", transition: "all .15s",
            }}
            onMouseOver={e => { if (!saving) e.currentTarget.style.borderColor = "#9ca3af"; }}
            onMouseOut={e  => { if (!saving) e.currentTarget.style.borderColor = "#d1d5db"; }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSend}
            disabled={saving}
            style={{
              padding: "10px 32px", borderRadius: 99,
              border: "none",
              background: saving ? "#86efac" : "#16a34a",
              color: "#fff", fontSize: 13, fontWeight: 700,
              fontFamily: "DM Sans, sans-serif",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : "0 2px 8px rgba(22,163,74,0.3)",
              transition: "all .15s",
            }}
            onMouseOver={e => { if (!saving) e.currentTarget.style.background = "#15803d"; }}
            onMouseOut={e  => { if (!saving) e.currentTarget.style.background = "#16a34a"; }}
          >
            {saving ? "SENDING…" : "SEND"}
          </button>
        </div>
      </div>
    </div>
  );
}