"use client";
import { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css";
import { supabase } from "@/lib/supabase";
import { QueueEntry } from "./PendingPatients";

interface Props {
  open:        boolean;
  entry:       QueueEntry | null;
  onClose:     () => void;
  onSave:      () => void;
  onOpenPresc: () => void;
  onOpenLab:   () => void;
}

const DISEASE_KEYS = [
  ["allergy",              "Allergy"],
  ["asthma",               "Asthma"],
  ["cancer",               "Cancer"],
  ["cerebrovascular_disease","Cerebrovascular Disease"],
  ["coronary_artery_disease","Coronary Artery Disease"],
  ["diabetes_mellitus",    "Diabetes Mellitus"],
  ["emphysema",            "Emphysema"],
  ["epilepsy_seizure",     "Epilepsy / Seizure"],
  ["hepatitis",            "Hepatitis"],
  ["hyperlipidemia",       "Hyperlipidemia"],
  ["hypertension",         "Hypertension"],
  ["peptic_ulcer",         "Peptic Ulcer"],
  ["pneumonia",            "Pneumonia"],
  ["thyroid_disease",      "Thyroid Disease"],
  ["ptb",                  "PTB"],
  ["urinary_tract_infection","UTI"],
  ["mental_illness",       "Mental Illness"],
  ["others",               "Others"],
] as const;

const VACCINE_KEYS = [
  ["bcg",                  "BCG"],
  ["opv1",                 "OPV1"],
  ["opv2",                 "OPV2"],
  ["opv3",                 "OPV3"],
  ["dpt1",                 "DPT1"],
  ["dpt2",                 "DPT2"],
  ["dpt3",                 "DPT3"],
  ["measles",              "Measles"],
  ["hapa1",                "HepA1"],
  ["hapa2",                "HepA2"],
  ["hapa3",                "HepA3"],
  ["varicella",            "Varicella"],
  ["hpv",                  "HPV"],
  ["mmr",                  "MMR"],
  ["pneumococcal_vaccine", "Pneumococcal"],
  ["flu_vaccine",          "Flu Vaccine"],
] as const;

function checkedList(
  obj:  any,
  keys: readonly (readonly [string, string])[]
): string[] {
  if (!obj) return [];
  return keys.filter(([k]) => obj[k] === true).map(([, label]) => label);
}

function hasAny(obj: any): boolean {
  return (
    obj != null &&
    Object.values(obj).some(v => v !== null && v !== false && v !== "" && v !== 0)
  );
}

// ── Follow-up state shape ─────────────────────────────────────────────────────
interface FollowUpState {
  date:   string;
  notes:  string;
  saving: boolean;
  saved:  boolean;
  error:  string;
}

export default function SoapModal({
  open, entry, onClose, onSave, onOpenPresc, onOpenLab,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [patientData,      setPatientData]      = useState<any>(null);
  const [loading,          setLoading]          = useState(false);
  const [isDone,           setIsDone]           = useState(false);
  const [soap,             setSoap]             = useState({ s: "", o: "", a: "", p: "" });
  const [saving,           setSaving]           = useState(false);
  const [savedOk,          setSavedOk]          = useState(false);
  const [showPostSave,     setShowPostSave]     = useState(false);
  const [consultationId,   setConsultationId]   = useState<string>("");
  const [showFollowUpInSoap, setShowFollowUpInSoap] = useState(false);

  const [followUp, setFollowUp] = useState<FollowUpState>({
    date: "", notes: "", saving: false, saved: false, error: "",
  });

  // ── Open / close side-effects ─────────────────────────────────────────────
  useEffect(() => {
    if (open && entry) {
      setLoading(true);
      setIsDone(false);
      setFollowUp({ date: "", notes: "", saving: false, saved: false, error: "" });
      setShowFollowUpInSoap(false);
      setConsultationId(entry.queueId);
      loadAll(entry.queueId, entry.patientId);
    }
    if (!open) {
      setPatientData(null);
      setIsDone(false);
      setSoap({ s: "", o: "", a: "", p: "" });
      setSavedOk(false);
      setShowPostSave(false);
      setFollowUp({ date: "", notes: "", saving: false, saved: false, error: "" });
      setShowFollowUpInSoap(false);
    }
  }, [open, entry]);

  // ── Load all patient sub-tables ───────────────────────────────────────────
  async function loadAll(consultId: string, patientId: string) {
    const [
      consultRes,
      physicalRes,
      pastMedRes,
      famHistRes,
      socialRes,
      menstrualRes,
      pregnancyRes,
      immunoRes,
      followUpRes,
    ] = await Promise.all([
      supabase.from("soap_consultations").select("*").eq("id", consultId).maybeSingle(),
      supabase.from("physical_exam_findings").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("past_medical_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("family_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("personal_social_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("menstrual_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("pregnancy_history").select("*").eq("patient_id", patientId).order("id", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("immunization_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("follow_up_schedules").select("*").eq("consultation_id", consultId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const alreadyDone = consultRes.data?.status === "done";
    setIsDone(alreadyDone);

    setSoap({
      s: consultRes.data?.subjective ?? "",
      o: consultRes.data?.objective  ?? "",
      a: consultRes.data?.assessment ?? "",
      p: consultRes.data?.plan       ?? "",
    });

    // Pre-fill follow-up if already scheduled
    if (followUpRes.data) {
      setFollowUp(f => ({
        ...f,
        date:  followUpRes.data.follow_up_date ?? "",
        notes: followUpRes.data.notes          ?? "",
        saved: true,
      }));
      setShowFollowUpInSoap(true);
    }

    setPatientData({
      consult:      consultRes.data,
      physical:     physicalRes.data,
      pastMed:      pastMedRes.data,
      famHist:      famHistRes.data,
      social:       socialRes.data,
      menstrual:    menstrualRes.data,
      pregnancy:    pregnancyRes.data,
      immunization: immunoRes.data,
    });

    setLoading(false);
  }

  // ── Save SOAP notes ───────────────────────────────────────────────────────
  async function handleSave() {
    if (!entry || isDone) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("soap_consultations")
        .update({
          subjective: soap.s || null,
          objective:  soap.o || null,
          assessment: soap.a || null,
          plan:       soap.p || null,
          status:     "done",
        })
        .eq("id", entry.queueId);

      if (error) { alert(`❌ Failed to save:\n${error.message}`); return; }

      setIsDone(true);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
      setShowPostSave(true);
    } catch {
      alert("❌ Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  // ── Save follow-up schedule ───────────────────────────────────────────────
  async function handleSaveFollowUp() {
    if (!entry || !followUp.date) {
      setFollowUp(f => ({ ...f, error: "Please select a follow-up date." }));
      return;
    }
    setFollowUp(f => ({ ...f, saving: true, error: "" }));

    try {
      const { error: fuError } = await supabase
        .from("follow_up_schedules")
        .upsert(
          {
            patient_id:      entry.patientId,
            consultation_id: consultationId,
            follow_up_date:  followUp.date,
            notes:           followUp.notes || null,
            status:          "pending",
            patient_name:    entry.name,
            patient_age:     entry.age,
            patient_gender:  entry.gender,
            patient_addr:    entry.addr,
          },
          { onConflict: "consultation_id" }
        );

      if (fuError) {
        setFollowUp(f => ({ ...f, saving: false, error: fuError.message }));
        return;
      }

      // Mirror follow-up date on the consultation row for timeline display
      await supabase
        .from("soap_consultations")
        .update({
          follow_up_date:  followUp.date,
          follow_up_notes: followUp.notes || null,
        })
        .eq("id", consultationId);

      setFollowUp(f => ({ ...f, saving: false, saved: true }));
    } catch {
      setFollowUp(f => ({ ...f, saving: false, error: "Unexpected error." }));
    }
  }

  if (!open || !entry) return null;

  const isFemale = entry.gender?.toLowerCase().includes("f");
  const d        = patientData;
  const ro       = `${styles.modalInput} ${styles.readOnly}`;

  // ── Small helpers ─────────────────────────────────────────────────────────
  const sectionHeader = (title: string, source: string) => (
    <div
      className={styles.soapLabel}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
    >
      <span>{title}</span>
      <span style={{ fontSize: 9, fontWeight: 500, color: "var(--text3)", letterSpacing: ".06em", textTransform: "none" }}>
        {source}
      </span>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: any }) =>
    value ? (
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12, padding: "3px 0" }}>
        <span style={{ color: "var(--text3)", minWidth: 160, flexShrink: 0, fontSize: 11 }}>{label}</span>
        <span style={{ color: "var(--text)", fontWeight: 500 }}>{value}</span>
      </div>
    ) : null;

  const ChipList = ({ items }: { items: string[] }) =>
    items.length > 0 ? (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        {items.map(i => (
          <span
            key={i}
            style={{
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "var(--text2)",
            }}
          >
            {i}
          </span>
        ))}
      </div>
    ) : null;

  const InfoBox = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      background: "var(--surface2)", borderRadius: 10,
      padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      {children}
    </div>
  );

  const soapTextareaClass = isDone
    ? `${styles.soapTextarea} ${styles.readOnly}`
    : styles.soapTextarea;

  // ── Reusable follow-up schedule block ────────────────────────────────────
  const FollowUpScheduleBlock = ({ compact = false }: { compact?: boolean }) => (
    <div style={{
      background: followUp.saved
        ? "linear-gradient(135deg,#f0fdf4,#dcfce7)"
        : "linear-gradient(135deg,#fffbeb,#fef9c3)",
      border: `1.5px solid ${followUp.saved ? "#86efac" : "#fcd34d"}`,
      borderRadius: 14,
      padding: compact ? "16px 20px" : "20px 24px",
      display: "flex", flexDirection: "column", gap: 14,
    }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: followUp.saved ? "#dcfce7" : "#fef3c7",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>
          {followUp.saved ? "✅" : "📅"}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0a2912", fontFamily: "Syne,sans-serif" }}>
            {followUp.saved ? "Follow-up Scheduled ✓" : "Schedule Follow-up Checkup"}
          </div>
          <div style={{ fontSize: 11, color: "#4b6557", marginTop: 1 }}>
            {followUp.saved
              ? "Patient will appear in the registrar queue — no re-registration needed."
              : "Set a return date and it will be forwarded to the registrar automatically."}
          </div>
        </div>
      </div>

      {/* Saved summary */}
      {followUp.saved ? (
        <div style={{
          background: "rgba(255,255,255,0.7)", borderRadius: 10,
          padding: "10px 16px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ color: "#4b6557", minWidth: 100, fontSize: 11 }}>Date</span>
            <span style={{ fontWeight: 700, color: "#0a2912" }}>
              {new Date(followUp.date).toLocaleDateString("en-PH", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          </div>
          {followUp.notes && (
            <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
              <span style={{ color: "#4b6557", minWidth: 100, fontSize: 11, flexShrink: 0 }}>Notes</span>
              <span style={{ color: "#0a2912" }}>{followUp.notes}</span>
            </div>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 4,
            background: "#bbf7d0", borderRadius: 8, padding: "6px 12px", width: "fit-content",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a" }}/>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>
              Forwarded to Registrar Queue
            </span>
          </div>
          {!compact && (
            <button
              onClick={() => setFollowUp(f => ({ ...f, saved: false }))}
              style={{
                marginTop: 4, background: "none", border: "none",
                color: "#854d0e", fontSize: 11, fontWeight: 600,
                cursor: "pointer", textDecoration: "underline",
                padding: 0, alignSelf: "flex-start",
              }}
            >
              Edit schedule
            </button>
          )}
        </div>
      ) : (
        /* Input form */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: "#4b6557",
                letterSpacing: ".06em", textTransform: "uppercase",
                display: "block", marginBottom: 5,
              }}>
                Return Date *
              </label>
              <input
                type="date"
                min={(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  return d.toISOString().split("T")[0];
                })()}
                value={followUp.date}
                onChange={e => setFollowUp(f => ({ ...f, date: e.target.value, error: "" }))}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#fff",
                  border: `1.5px solid ${followUp.error ? "#ef4444" : "#fcd34d"}`,
                  borderRadius: 8, padding: "8px 12px",
                  fontSize: 13, fontFamily: "DM Sans,sans-serif",
                  color: "#0a2912", outline: "none",
                }}
              />
            </div>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: "#4b6557",
                letterSpacing: ".06em", textTransform: "uppercase",
                display: "block", marginBottom: 5,
              }}>
                Instructions / Reason
              </label>
              <input
                type="text"
                placeholder="e.g. BP recheck, wound dressing change…"
                value={followUp.notes}
                onChange={e => setFollowUp(f => ({ ...f, notes: e.target.value }))}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#fff", border: "1.5px solid #fcd34d",
                  borderRadius: 8, padding: "8px 12px",
                  fontSize: 13, fontFamily: "DM Sans,sans-serif",
                  color: "#0a2912", outline: "none",
                }}
              />
            </div>
          </div>

          {followUp.error && (
            <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
              {followUp.error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleSaveFollowUp}
              disabled={followUp.saving || !followUp.date}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 20px", borderRadius: 9,
                background: followUp.date ? "#0d3b1f" : "#e5e7eb",
                color:      followUp.date ? "#fff"    : "#9ca3af",
                border: "none", fontSize: 12, fontWeight: 700,
                fontFamily: "DM Sans,sans-serif",
                cursor: followUp.date ? "pointer" : "not-allowed",
                transition: "all .15s",
              }}
            >
              {followUp.saving ? (
                <>⏳ Scheduling…</>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  Schedule &amp; Forward to Registrar
                </>
              )}
            </button>
            <span style={{ fontSize: 10, color: "#92400e" }}>
              Patient won&apos;t need to re-register
            </span>
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══ Post-save dialog ══ */}
      {showPostSave && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, overflowY: "auto",
        }}>
          <div style={{
            background: "var(--surface,#fff)",
            borderRadius: 24, padding: "36px 40px",
            textAlign: "center", maxWidth: 480, width: "100%",
            boxShadow: "0 32px 80px rgba(0,0,0,.35)",
            animation: "slideUp .25s ease",
          }}>
            <div style={{
              width: 68, height: 68, borderRadius: "50%",
              background: "#dcfce7", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: 32,
            }}>
              ✅
            </div>

            <div style={{
              fontFamily: "Syne,sans-serif", fontWeight: 800,
              fontSize: 20, color: "var(--text,#0a2912)", marginBottom: 6,
            }}>
              Consultation Saved!
            </div>
            <div style={{
              fontSize: 13, color: "var(--text2,#4b6557)",
              marginBottom: 20, lineHeight: 1.7,
            }}>
              SOAP notes for <strong>{entry.name}</strong> have been recorded.
            </div>

            {/* Follow-up block */}
            <div style={{ textAlign: "left", marginBottom: 20 }}>
              <FollowUpScheduleBlock compact />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Send Prescription */}
              <button
                onClick={() => { setShowPostSave(false); onSave(); onOpenPresc(); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "14px 24px", borderRadius: 12,
                  background: "#0d3b1f", color: "#fff",
                  border: "none", fontSize: 14, fontWeight: 700,
                  fontFamily: "DM Sans,sans-serif", cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(13,59,31,.35)", transition: "all .15s",
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background  = "#16a34a";
                  e.currentTarget.style.transform   = "translateY(-1px)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background  = "#0d3b1f";
                  e.currentTarget.style.transform   = "none";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Send Prescription
              </button>

              {/* Send Lab Request */}
              <button
                onClick={() => { setShowPostSave(false); onSave(); onOpenLab(); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "14px 24px", borderRadius: 12,
                  background: "transparent", color: "#0d3b1f",
                  border: "2px solid #0d3b1f",
                  fontSize: 14, fontWeight: 700,
                  fontFamily: "DM Sans,sans-serif", cursor: "pointer", transition: "all .15s",
                }}
                onMouseOver={e => { e.currentTarget.style.background = "#dcfce7"; }}
                onMouseOut={e => { e.currentTarget.style.background  = "transparent"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
                </svg>
                Send Lab Request
              </button>

              {/* Done */}
              <button
                onClick={() => { setShowPostSave(false); onSave(); onClose(); }}
                style={{
                  padding: "12px 24px", borderRadius: 12,
                  background: "#f6faf7", color: "#4b6557",
                  border: "1.5px solid rgba(22,163,74,.2)",
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "DM Sans,sans-serif", cursor: "pointer", transition: "background .15s",
                }}
                onMouseOver={e => { e.currentTarget.style.background = "#e8f5e9"; }}
                onMouseOut={e => { e.currentTarget.style.background  = "#f6faf7"; }}
              >
                Done — Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Main SOAP modal ══ */}
      <div className={styles.modalBackdrop} onClick={onClose}>
        <div
          className={`${styles.modal} ${styles.modalLg}`}
          onClick={e => e.stopPropagation()}
          style={{ position: "relative" }}
        >

          {/* Header */}
          <div className={styles.modalHeader}>
            <h2>SOAP Consultation</h2>
            {isDone && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: "rgba(255,255,255,.2)", color: "#fff",
                borderRadius: 8, padding: "3px 10px", letterSpacing: ".04em",
              }}>
                ✅ COMPLETED
              </span>
            )}
            <button className={styles.modalClose} onClick={onClose}>✕</button>
          </div>

          <div className={styles.modalBody}>

            {/* ── Patient Info ── */}
            <div className={styles.soapInfoBadge}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Patient Info
            </div>

            <div className={styles.formRow2}>
              <div className={styles.formGroup}>
                <label>Patient Name</label>
                <input className={ro} readOnly value={entry.name} />
              </div>
              <div className={styles.formGroup}>
                <label>Date</label>
                <input className={ro} readOnly type="date" defaultValue={today} />
              </div>
            </div>

            <div className={styles.formRow3}>
              <div className={styles.formGroup}>
                <label>Age</label>
                <input className={ro} readOnly value={entry.age} />
              </div>
              <div className={styles.formGroup}>
                <label>Gender</label>
                <input className={ro} readOnly value={entry.gender} />
              </div>
              <div className={styles.formGroup}>
                <label>Address</label>
                <input className={ro} readOnly value={entry.addr} />
              </div>
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text3)", fontSize: 12 }}>
                Loading patient records…
              </div>
            )}

            {/* ── Historical Records ── */}
            {!loading && d && (
              <>
                {/* Vitals */}
                {d.physical && hasAny({
                  bp:   d.physical.blood_pressure_mmhg,
                  hr:   d.physical.heart_rate_bpm,
                  temp: d.physical.temperature_c,
                  rr:   d.physical.respiratory_rate_cpm,
                  wt:   d.physical.weight_kg,
                  ht:   d.physical.height_cm,
                }) && (
                  <>
                    {sectionHeader("VITALS", "physical_exam_findings")}
                    <InfoBox>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px" }}>
                        <InfoRow label="Blood Pressure"   value={d.physical.blood_pressure_mmhg} />
                        <InfoRow label="Heart Rate"       value={d.physical.heart_rate_bpm       ? `${d.physical.heart_rate_bpm} bpm`       : null} />
                        <InfoRow label="Temperature"      value={d.physical.temperature_c        ? `${d.physical.temperature_c}°C`           : null} />
                        <InfoRow label="Respiratory Rate" value={d.physical.respiratory_rate_cpm ? `${d.physical.respiratory_rate_cpm} cpm` : null} />
                        <InfoRow label="Weight"           value={d.physical.weight_kg            ? `${d.physical.weight_kg} kg`              : null} />
                        <InfoRow label="Height"           value={d.physical.height_cm            ? `${d.physical.height_cm} cm`              : null} />
                        <InfoRow label="Blood Type"       value={d.physical.blood_type} />
                        <InfoRow label="Visual Acuity (R)" value={d.physical.visual_acuity_right_eye} />
                        <InfoRow label="Visual Acuity (L)" value={d.physical.visual_acuity_left_eye} />
                      </div>
                    </InfoBox>
                  </>
                )}

                {/* Past Medical History */}
                {d.pastMed && checkedList(d.pastMed, DISEASE_KEYS).length > 0 && (
                  <>
                    {sectionHeader("PAST MEDICAL HISTORY", "past_medical_history")}
                    <InfoBox>
                      <ChipList items={checkedList(d.pastMed, DISEASE_KEYS)} />
                      {d.pastMed.allergy_specify         && <InfoRow label="Allergy details" value={d.pastMed.allergy_specify} />}
                      {d.pastMed.cancer_specify          && <InfoRow label="Cancer type"      value={d.pastMed.cancer_specify} />}
                      {d.pastMed.hypertension_highest_bp && <InfoRow label="Highest BP"       value={d.pastMed.hypertension_highest_bp} />}
                      {d.pastMed.past_surgeries_done     && <InfoRow label="Past surgeries"   value={d.pastMed.past_surgeries_done} />}
                      {d.pastMed.date_surgery_done       && <InfoRow label="Surgery date"     value={d.pastMed.date_surgery_done} />}
                    </InfoBox>
                  </>
                )}

                {/* Family History */}
                {d.famHist && checkedList(d.famHist, DISEASE_KEYS).length > 0 && (
                  <>
                    {sectionHeader("FAMILY HISTORY", "family_history")}
                    <InfoBox>
                      <ChipList items={checkedList(d.famHist, DISEASE_KEYS)} />
                      {d.famHist.allergy_specify         && <InfoRow label="Allergy details" value={d.famHist.allergy_specify} />}
                      {d.famHist.cancer_specify          && <InfoRow label="Cancer type"      value={d.famHist.cancer_specify} />}
                      {d.famHist.hypertension_highest_bp && <InfoRow label="Highest BP"       value={d.famHist.hypertension_highest_bp} />}
                    </InfoBox>
                  </>
                )}

                {/* Personal & Social */}
                {d.social && hasAny({
                  s: d.social.smoking, a: d.social.alcohol,
                  d: d.social.illicit_drugs, x: d.social.sexually_active,
                }) && (
                  <>
                    {sectionHeader("PERSONAL & SOCIAL HISTORY", "personal_social_history")}
                    <InfoBox>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                        <InfoRow label="Smoking"         value={d.social.smoking} />
                        {d.social.smoking_packs_per_year && <InfoRow label="Packs/year" value={d.social.smoking_packs_per_year} />}
                        <InfoRow label="Alcohol"         value={d.social.alcohol} />
                        <InfoRow label="Illicit Drugs"   value={d.social.illicit_drugs} />
                        <InfoRow label="Sexually Active" value={d.social.sexually_active} />
                      </div>
                    </InfoBox>
                  </>
                )}

                {/* Menstrual History */}
                {isFemale && d.menstrual && hasAny({
                  a: d.menstrual.menarche_age,
                  b: d.menstrual.last_menstrual_period,
                  c: d.menstrual.period_duration_days,
                }) && (
                  <>
                    {sectionHeader("MENSTRUAL HISTORY", "menstrual_history")}
                    <InfoBox>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px" }}>
                        <InfoRow label="LMP"             value={d.menstrual.last_menstrual_period} />
                        <InfoRow label="Menarche Age"    value={d.menstrual.menarche_age} />
                        <InfoRow label="Cycle (days)"    value={d.menstrual.interval_cycle_days} />
                        <InfoRow label="Duration (days)" value={d.menstrual.period_duration_days} />
                        <InfoRow label="Pads / Day"      value={d.menstrual.pads_per_day} />
                        <InfoRow label="Menopause"       value={d.menstrual.menopause ? "Yes" : null} />
                        {d.menstrual.menopause && (
                          <InfoRow label="Age at Menopause" value={d.menstrual.age_at_menopause} />
                        )}
                      </div>
                    </InfoBox>
                  </>
                )}

                {/* Pregnancy History */}
                {isFemale && d.pregnancy && hasAny({ g: d.pregnancy.gravida, p: d.pregnancy.para }) && (
                  <>
                    {sectionHeader("PREGNANCY HISTORY", "pregnancy_history")}
                    <InfoBox>
                      <div style={{
                        display: "grid", gridTemplateColumns: "repeat(6,1fr)",
                        gap: 8, textAlign: "center",
                      }}>
                        {["gravida","para","term","preterm","abortion","living"].map(k =>
                          d.pregnancy[k] != null ? (
                            <div key={k}>
                              <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                                {k}
                              </div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", fontFamily: "Syne,sans-serif", lineHeight: 1.2 }}>
                                {d.pregnancy[k]}
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>
                    </InfoBox>
                  </>
                )}

                {/* Immunization History */}
                {d.immunization && checkedList(d.immunization, VACCINE_KEYS).length > 0 && (
                  <>
                    {sectionHeader("IMMUNIZATION HISTORY", "immunization_history")}
                    <InfoBox>
                      <ChipList items={checkedList(d.immunization, VACCINE_KEYS)} />
                      {d.immunization.others && <InfoRow label="Others" value={d.immunization.others} />}
                    </InfoBox>
                  </>
                )}
              </>
            )}

            {/* ── SOAP Notes ── */}
            <div
              className={styles.soapLabel}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>SOAP NOTES</span>
              {isDone
                ? <span style={{ fontSize: 9, fontWeight: 700, color: "var(--danger,#ef4444)", letterSpacing: ".06em" }}>🔒 READ-ONLY</span>
                : <span style={{ fontSize: 9, fontWeight: 600, color: "var(--green)",           letterSpacing: ".06em" }}>DOCTOR FILLS THIS ↓</span>
              }
            </div>

            {isDone && (
              <div style={{
                background: "#fef9c3", border: "1px solid #fcd34d",
                borderRadius: 8, padding: "8px 14px",
                fontSize: 12, color: "#854d0e", fontWeight: 500,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                🔒 This consultation has been completed and cannot be edited.
              </div>
            )}

            {([ ["s","Subjective (S)","Chief complaint, HPI…"],
                ["o","Objective (O)","PE findings, vitals interpretation…"],
                ["a","Assessment (A)","Diagnosis / impression…"],
                ["p","Plan (P)","Treatment, medications, referrals, follow-up…"],
            ] as const).map(([k, lbl, ph]) => (
              <div key={k} className={styles.formGroup}>
                <label>{lbl}</label>
                <textarea
                  className={soapTextareaClass}
                  value={soap[k]}
                  onChange={e => !isDone && setSoap(f => ({ ...f, [k]: e.target.value }))}
                  readOnly={isDone}
                  placeholder={isDone ? "" : ph}
                  style={isDone ? { cursor: "default", opacity: .8 } : {}}
                />
              </div>
            ))}

            {/* Follow-up block — always visible after consultation is done */}
            {isDone && (
              <div style={{ marginTop: 4 }}>
                <div
                  className={styles.soapLabel}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}
                >
                  <span>FOLLOW-UP CHECKUP SCHEDULE</span>
                  <span style={{ fontSize: 9, fontWeight: 500, color: "var(--text3)" }}>Optional</span>
                </div>
                <FollowUpScheduleBlock />
              </div>
            )}

            {/* Toggle to add follow-up while still in draft */}
            {!isDone && (
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <button
                  onClick={() => setShowFollowUpInSoap(v => !v)}
                  style={{
                    background: "none", border: "none",
                    color: "var(--text3)", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 8px", borderRadius: 6, transition: "color .15s",
                  }}
                  onMouseOver={e => { e.currentTarget.style.color = "var(--green)"; }}
                  onMouseOut={e => { e.currentTarget.style.color  = "var(--text3)"; }}
                >
                  📅 {showFollowUpInSoap ? "Hide" : "Add"} follow-up schedule
                </button>
              </div>
            )}

            {!isDone && showFollowUpInSoap && (
              <div style={{ marginTop: 4 }}>
                <FollowUpScheduleBlock />
              </div>
            )}

          </div>{/* end modalBody */}

          {/* Footer */}
          <div className={styles.soapActions}>
            <div style={{ flex: 1 }}/>
            <button className={`${styles.actionBtn} ${styles.outline}`} onClick={onClose}>
              Close
            </button>
            {!isDone && (
              <button
                className={`${styles.actionBtn} ${styles.primary}`}
                onClick={handleSave}
                disabled={saving}
                style={saving ? { opacity: .7, cursor: "not-allowed" } : {}}
              >
                {saving ? "SAVING…" : "SAVE"}
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}