"use client";
import { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css";
import { supabase } from "@/lib/supabase";
import { QueueEntry } from "./PendingPatients";
import { logAction } from "@/utils/auditLogs";
import { useAuth } from "@/context/AuthContext";
import SendVaccineToNurseModal from "../components/SendVaccineToNurseModal";

// ── Design tokens ──────────────────────────────────────────
const DARK   = "#064e3b";
const G      = "#16a34a";
const MID    = "#15803d";
const LIGHT  = "#f0fdf4";
const BORDER = "#d1fae5";

// ── SOAP color config ──────────────────────────────────────
const SOAP_CFG = [
  {
    key: "s", label: "Subjective",  icon: "💬",
    ph: "Chief complaint, history of present illness…",
    bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", tag: "#dbeafe",
  },
  {
    key: "o", label: "Objective",   icon: "🔍",
    ph: "Physical exam findings, vitals interpretation…",
    bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", tag: "#dcfce7",
  },
  {
    key: "a", label: "Assessment",  icon: "📋",
    ph: "Diagnosis / clinical impression…",
    bg: "#fff7ed", border: "#fed7aa", color: "#c2410c", tag: "#ffedd5",
  },
  {
    key: "p", label: "Plan",        icon: "🎯",
    ph: "Treatment, medications, referrals, follow-up…",
    bg: "#fdf4ff", border: "#e9d5ff", color: "#7e22ce", tag: "#f3e8ff",
  },
] as const;

// ── Types ──────────────────────────────────────────────────
interface Props {
  open: boolean;
  entry: QueueEntry | null;
  onClose: () => void;
  onSave: () => void;
  onOpenPresc: () => void;
  onOpenLab: () => void;
}
interface FollowUpState {
  date: string;
  notes: string;
  saving: boolean;
  saved: boolean;
  error: string;
}

const DISEASE_KEYS = [
  ["allergy",                "Allergy"],
  ["asthma",                 "Asthma"],
  ["cancer",                 "Cancer"],
  ["cerebrovascular_disease","Cerebrovascular Disease"],
  ["coronary_artery_disease","Coronary Artery Disease"],
  ["diabetes_mellitus",      "Diabetes Mellitus"],
  ["emphysema",              "Emphysema"],
  ["epilepsy_seizure",       "Epilepsy / Seizure"],
  ["hepatitis",              "Hepatitis"],
  ["hyperlipidemia",         "Hyperlipidemia"],
  ["hypertension",           "Hypertension"],
  ["peptic_ulcer",           "Peptic Ulcer"],
  ["pneumonia",              "Pneumonia"],
  ["thyroid_disease",        "Thyroid Disease"],
  ["ptb",                    "PTB"],
  ["urinary_tract_infection","UTI"],
  ["mental_illness",         "Mental Illness"],
  ["others",                 "Others"],
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
  obj: any,
  keys: readonly (readonly [string, string])[]
): string[] {
  if (!obj) return [];
  return keys.filter(([k]) => obj[k] === true).map(([, l]) => l);
}
function hasAny(obj: any): boolean {
  return (
    obj != null &&
    Object.values(obj).some(
      (v) => v !== null && v !== false && v !== "" && v !== 0
    )
  );
}

// ── Table-routing helper ────────────────────────────────────
// SoapModal is shared between the doctor flow (soap_consultations) and the
// nurse flow (nurse_consultation_queue). Every Supabase call that touches
// "the consultation row itself" needs to hit the right table depending on
// where the entry came from. entry.source is set by whichever queue
// component (PendingPatients for doctor, PatientQueue for nurse) built the
// QueueEntry in the first place.
function consultationTable(entry: QueueEntry | null): "soap_consultations" | "nurse_consultation_queue" {
  return entry?.source === "nurse" ? "nurse_consultation_queue" : "soap_consultations";
}

// ── Small UI pieces ────────────────────────────────────────
function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 24px" }}>
      {children}
    </div>
  );
}
function InfoItem({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{value}</span>
    </div>
  );
}
function ChipList({
  items,
  color = DARK,
  bg = LIGHT,
}: {
  items: string[];
  color?: string;
  bg?: string;
}) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((i) => (
        <span
          key={i}
          style={{
            background: bg, color,
            border: `1px solid ${BORDER}`,
            borderRadius: 99, padding: "3px 12px",
            fontSize: 11, fontWeight: 600,
          }}
        >
          {i}
        </span>
      ))}
    </div>
  );
}
function VitalBadge({
  label, value, unit, icon,
}: {
  label: string; value: any; unit?: string; icon: string;
}) {
  if (!value) return null;
  return (
    <div
      style={{
        background: LIGHT, border: `1.5px solid ${BORDER}`,
        borderRadius: 12, padding: "10px 14px",
        display: "flex", flexDirection: "column", gap: 3,
      }}
    >
      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: DARK, fontFamily: "'DM Sans',sans-serif" }}>
        {value}
        {unit && (
          <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginLeft: 3 }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

// ══ PATIENT SUMMARY STRIP ════════════════════════════════
function PatientSummaryStrip({ d, isFemale }: { d: any; isFemale: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!d) return null;

  const conditions    = checkedList(d.pastMed,     DISEASE_KEYS);
  const famConditions = checkedList(d.famHist,      DISEASE_KEYS);
  const vaccines      = checkedList(d.immunization, VACCINE_KEYS);
  const allergies =
    d.pastMed?.allergy && d.pastMed?.allergy_specify
      ? [d.pastMed.allergy_specify]
      : d.pastMed?.allergy
      ? ["Yes (unspecified)"]
      : [];
  const hasVitals = d.physical && hasAny({
    a: d.physical.blood_pressure_mmhg,
    b: d.physical.heart_rate_bpm,
    c: d.physical.temperature_c,
    e: d.physical.weight_kg,
  });
  const hasSocial   = d.social != null;
  const hasAnything =
    conditions.length > 0 || allergies.length > 0 || hasVitals ||
    hasSocial || famConditions.length > 0 || vaccines.length > 0;

  if (!hasAnything) return null;

  return (
    <div
      style={{
        background: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16,
        overflow: "hidden", marginBottom: 14,
        boxShadow: "0 1px 8px rgba(22,163,74,0.07)",
      }}
    >
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 18px",
          background: "linear-gradient(90deg, #f0fdf4, #fff)",
          borderBottom: expanded ? `1px solid ${BORDER}` : "none",
          cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: DARK, letterSpacing: 0.7, textTransform: "uppercase" }}>
            📋 Patient Summary
          </span>
          {allergies.map((a) => (
            <span
              key={a}
              style={{
                background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca",
                borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 800,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              ⚠️ Allergy: {a}
            </span>
          ))}
          {conditions.length > 0 && (
            <span style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
              🏥 {conditions.length} condition{conditions.length > 1 ? "s" : ""}
            </span>
          )}
          {hasSocial && d.social?.smoking === "Yes" && (
            <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
              🚬 Smoker
            </span>
          )}
          {hasSocial && d.social?.alcohol === "Yes" && (
            <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
              🍺 Drinks Alcohol
            </span>
          )}
          {hasSocial && d.social?.illicit_drugs === "Yes" && (
            <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
              ⚠️ Illicit Drugs
            </span>
          )}
          {hasSocial &&
            d.social?.smoking !== "Yes" &&
            d.social?.alcohol !== "Yes" &&
            d.social?.illicit_drugs !== "Yes" && (
              <span style={{ background: LIGHT, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
                🚬 Social Hx recorded
              </span>
            )}
          {hasVitals && d.physical?.blood_pressure_mmhg && (
            <span style={{ background: LIGHT, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
              🫀 BP: {d.physical.blood_pressure_mmhg} mmHg
            </span>
          )}
          {hasVitals && d.physical?.temperature_c && (
            <span style={{ background: LIGHT, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
              🌡️ {d.physical.temperature_c}°C
            </span>
          )}
          {hasVitals && d.physical?.weight_kg && (
            <span style={{ background: LIGHT, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
              ⚖️ {d.physical.weight_kg} kg
            </span>
          )}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#6b7280" strokeWidth="2.5"
          style={{
            flexShrink: 0, marginLeft: 8, transition: "transform .2s",
            transform: expanded ? "rotate(180deg)" : "none",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {hasVitals && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: DARK, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                💓 Vitals
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                <VitalBadge icon="🫀" label="Blood Pressure" value={d.physical.blood_pressure_mmhg} unit="mmHg" />
                <VitalBadge icon="💗" label="Heart Rate"     value={d.physical.heart_rate_bpm}       unit="bpm" />
                <VitalBadge icon="🌡️" label="Temperature"    value={d.physical.temperature_c}        unit="°C" />
                <VitalBadge icon="🫁" label="Resp. Rate"     value={d.physical.respiratory_rate_cpm} unit="cpm" />
                <VitalBadge icon="⚖️" label="Weight"         value={d.physical.weight_kg}            unit="kg" />
                <VitalBadge icon="📏" label="Height"         value={d.physical.height_cm}            unit="cm" />
              </div>
              {(d.physical.blood_type || d.physical.visual_acuity_right_eye) && (
                <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {d.physical.blood_type               && <InfoItem label="Blood Type"      value={d.physical.blood_type} />}
                  {d.physical.visual_acuity_right_eye  && <InfoItem label="Visual Acuity R" value={d.physical.visual_acuity_right_eye} />}
                  {d.physical.visual_acuity_left_eye   && <InfoItem label="Visual Acuity L" value={d.physical.visual_acuity_left_eye} />}
                </div>
              )}
            </div>
          )}

          {allergies.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#dc2626", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                ⚠️ Allergies
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {allergies.map((a) => (
                  <span
                    key={a}
                    style={{
                      background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca",
                      borderRadius: 99, padding: "4px 14px", fontSize: 12, fontWeight: 700,
                    }}
                  >
                    ⚠️ {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {conditions.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#c2410c", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                🏥 Past Medical Conditions
              </div>
              <ChipList items={conditions} color="#92400e" bg="#fff7ed" />
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {d.pastMed?.cancer_specify          && <InfoItem label="Cancer type"    value={d.pastMed.cancer_specify} />}
                {d.pastMed?.hypertension_highest_bp && <InfoItem label="Highest BP"     value={d.pastMed.hypertension_highest_bp} />}
                {d.pastMed?.past_surgeries_done     && <InfoItem label="Past surgeries" value={d.pastMed.past_surgeries_done} />}
              </div>
            </div>
          )}

          {famConditions.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#6d28d9", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                👨‍👩‍👧 Family History
              </div>
              <ChipList items={famConditions} color="#6d28d9" bg="#fdf4ff" />
            </div>
          )}

          {hasSocial && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#374151", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                🚬 Personal & Social History
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(
                  [
                    ["Smoking",         d.social?.smoking],
                    ["Alcohol",         d.social?.alcohol],
                    ["Illicit Drugs",   d.social?.illicit_drugs],
                    ["Sexually Active", d.social?.sexually_active],
                  ] as [string, string | null][]
                )
                  .filter(([, v]) => v != null)
                  .map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: LIGHT, border: `1px solid ${BORDER}`,
                        borderRadius: 10, padding: "7px 12px",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                      <span
                        style={{
                          fontSize: 12, fontWeight: 700,
                          color: value === "Yes" ? "#dc2626" : value === "No" ? "#16a34a" : DARK,
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {isFemale && d.menstrual && hasAny({ a: d.menstrual.menarche_age, b: d.menstrual.last_menstrual_period }) && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#be185d", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                🩺 Menstrual History
              </div>
              <InfoGrid>
                <InfoItem label="LMP"             value={d.menstrual.last_menstrual_period} />
                <InfoItem label="Menarche Age"    value={d.menstrual.menarche_age} />
                <InfoItem label="Cycle (days)"    value={d.menstrual.interval_cycle_days} />
                <InfoItem label="Duration (days)" value={d.menstrual.period_duration_days} />
                <InfoItem label="Pads / Day"      value={d.menstrual.pads_per_day} />
                <InfoItem label="Menopause"       value={d.menstrual.menopause ? "Yes" : null} />
              </InfoGrid>
            </div>
          )}

          {isFemale && d.pregnancy && hasAny({ g: d.pregnancy.gravida, p: d.pregnancy.para }) && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#be185d", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                🤰 Pregnancy History
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, textAlign: "center" }}>
                {(["gravida", "para", "term", "preterm", "abortion", "living"] as const).map((k) =>
                  d.pregnancy[k] != null ? (
                    <div
                      key={k}
                      style={{
                        background: LIGHT, border: `1.5px solid ${BORDER}`,
                        borderRadius: 10, padding: "8px 6px",
                      }}
                    >
                      <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                        {k}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: DARK }}>{d.pregnancy[k]}</div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {vaccines.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#0369a1", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                💉 Immunization
              </div>
              <ChipList items={vaccines} color="#0369a1" bg="#e0f2fe" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Follow-up block ────────────────────────────────────────
function FollowUpBlock({
  followUp, setFollowUp, onSave,
}: {
  followUp: FollowUpState;
  setFollowUp: React.Dispatch<React.SetStateAction<FollowUpState>>;
  onSave: () => void;
}) {
  if (followUp.saved) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
          border: "1.5px solid #86efac", borderRadius: 14, padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            ✅
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: DARK }}>Follow-up Scheduled</div>
            <div style={{ fontSize: 11, color: "#4b6557" }}>Forwarded to registrar queue automatically</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
            <span style={{ color: "#6b7280", minWidth: 60, fontSize: 11 }}>Date</span>
            <span style={{ fontWeight: 700, color: DARK }}>
              {new Date(followUp.date + "T00:00:00").toLocaleDateString("en-PH", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          </div>
          {followUp.notes && (
            <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
              <span style={{ color: "#6b7280", minWidth: 60, fontSize: 11 }}>Notes</span>
              <span style={{ color: "#111" }}>{followUp.notes}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setFollowUp((f) => ({ ...f, saved: false }))}
          style={{
            marginTop: 8, background: "none", border: "none",
            color: "#854d0e", fontSize: 11, fontWeight: 600,
            cursor: "pointer", textDecoration: "underline", padding: 0,
          }}
        >
          Edit schedule
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#fffbeb,#fef9c3)",
        border: "1.5px solid #fcd34d", borderRadius: 14, padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          📅
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#78350f" }}>Schedule Follow-up Checkup</div>
          <div style={{ fontSize: 11, color: "#92400e" }}>Patient won't need to re-register</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#78350f", textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 5 }}>
            Return Date *
          </label>
          <input
            type="date"
            value={followUp.date}
            onChange={(e) => setFollowUp((f) => ({ ...f, date: e.target.value, error: "" }))}
            style={{
              width: "100%", boxSizing: "border-box", background: "#fff",
              border: `1.5px solid ${followUp.error ? "#ef4444" : "#fcd34d"}`,
              borderRadius: 8, padding: "8px 12px",
              fontSize: 13, fontFamily: "DM Sans,sans-serif", color: "#0a2912", outline: "none",
            }}
          />
        </div>
        <div style={{ flex: 2, minWidth: 180 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#78350f", textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 5 }}>
            Instructions / Reason
          </label>
          <input
            type="text"
            placeholder="e.g. BP recheck, wound dressing change…"
            value={followUp.notes}
            onChange={(e) => setFollowUp((f) => ({ ...f, notes: e.target.value }))}
            style={{
              width: "100%", boxSizing: "border-box", background: "#fff",
              border: "1.5px solid #fcd34d", borderRadius: 8, padding: "8px 12px",
              fontSize: 13, fontFamily: "DM Sans,sans-serif", color: "#0a2912", outline: "none",
            }}
          />
        </div>
      </div>
      {followUp.error && (
        <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginBottom: 6 }}>
          {followUp.error}
        </div>
      )}
      <button
        onClick={onSave}
        disabled={followUp.saving || !followUp.date}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "9px 20px", borderRadius: 99,
          background: followUp.date ? DARK : "#e5e7eb",
          color: followUp.date ? "#fff" : "#9ca3af",
          border: "none", fontSize: 12, fontWeight: 700,
          fontFamily: "DM Sans,sans-serif",
          cursor: followUp.date ? "pointer" : "not-allowed",
          transition: "all .15s",
          boxShadow: followUp.date ? "0 2px 8px rgba(6,78,59,0.25)" : "none",
        }}
      >
        {followUp.saving ? "⏳ Scheduling…" : "📅 Schedule & Forward to Registrar"}
      </button>
    </div>
  );
}

// ══ MAIN MODAL ════════════════════════════════════════════
export default function SoapModal({
  open, entry, onClose, onSave, onOpenPresc, onOpenLab,
}: Props) {
  const { user } = useAuth();

  const [patientData,      setPatientData]      = useState<any>(null);
  const [loading,          setLoading]          = useState(false);
  const [isDone,           setIsDone]           = useState(false);
  const [soap,             setSoap]             = useState({ s: "", o: "", a: "", p: "" });
  const [saving,           setSaving]           = useState(false);
  const [showPostSave,     setShowPostSave]     = useState(false);
  const [consultationId,   setConsultationId]   = useState("");
  const [consultDate,      setConsultDate]      = useState("");
  const [showFollowUp,     setShowFollowUp]     = useState(false);
  const [showVaccineModal, setShowVaccineModal] = useState(false);
  const [vaccineSent,      setVaccineSent]      = useState(false);
  const [followUp, setFollowUp] = useState<FollowUpState>({
    date: "", notes: "", saving: false, saved: false, error: "",
  });

  const isNurse = entry?.source === "nurse";

  useEffect(() => {
    if (open && entry) {
      setLoading(true);
      setIsDone(false);
      setConsultDate("");
      setFollowUp({ date: "", notes: "", saving: false, saved: false, error: "" });
      setShowFollowUp(false);
      setVaccineSent(false);
      setConsultationId(entry.queueId);
      loadAll(entry.queueId, entry.patientId, entry.source);
    }
    if (!open) {
      setPatientData(null);
      setIsDone(false);
      setConsultDate("");
      setSoap({ s: "", o: "", a: "", p: "" });
      setShowPostSave(false);
      setFollowUp({ date: "", notes: "", saving: false, saved: false, error: "" });
      setShowFollowUp(false);
      setVaccineSent(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry]);

  async function loadAll(consultId: string, patientId: string, source?: string) {
    const table = source === "nurse" ? "nurse_consultation_queue" : "soap_consultations";
    try {
      const [cR, phR, pmR, fhR, shR, mnR, prR, imR, fuR, vrR] = await Promise.all([
        supabase.from(table).select("*").eq("id", consultId).maybeSingle(),
        supabase.from("physical_exam_findings").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("past_medical_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("family_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("personal_social_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("menstrual_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("pregnancy_history").select("*").eq("patient_id", patientId).order("id", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("immunization_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("follow_up_schedules").select("*").eq("consultation_id", consultId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("patient_vaccine_orders").select("id").eq("consultation_id", consultId).maybeSingle(),
      ]);

      const consultData = cR.data;
      // nurse_consultation_queue's status values are "pending"/"done" (see
      // PatientQueue.tsx), soap_consultations uses "waiting"/"done" — both
      // treat "done" as done, so this check works unchanged for either table.
      const done = consultData?.status === "done";
      setIsDone(done);
      // nurse_consultation_queue has no consultation_date column at all —
      // consultData?.consultation_date is simply undefined there, so this
      // already falls through to queue_date correctly for nurse rows.
      setConsultDate(consultData?.consultation_date ?? consultData?.queue_date ?? "");

      const assessmentText =
        Array.isArray(consultData?.assessments) && consultData.assessments.length > 0
          ? consultData.assessments[0]
          : "";

      setSoap({
        s: consultData?.subjective ?? "",
        o: consultData?.objective  ?? "",
        a: assessmentText,
        p: consultData?.plan       ?? "",
      });

      if (fuR.data) {
        setFollowUp((f) => ({
          ...f,
          date:  fuR.data.follow_up_date ?? "",
          notes: fuR.data.notes ?? "",
          saved: true,
        }));
        setShowFollowUp(true);
      }

      if (vrR.data) setVaccineSent(true);

      setPatientData({
        consult:      consultData,
        physical:     phR.data,
        pastMed:      pmR.data,
        famHist:      fhR.data,
        social:       shR.data,
        menstrual:    mnR.data,
        pregnancy:    prR.data,
        immunization: imR.data,
      });
    } catch (err) {
      console.error("loadAll error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!entry || isDone) return;
    const table = consultationTable(entry);
    setSaving(true);

    const parsedAssessments = soap.a
      ? soap.a.split(",").map((item) => item.trim()).filter(Boolean)
      : null;

    // nurse_consultation_queue has no consultation_date column — queue_date
    // is the single source of truth there, so only select/carry forward
    // consultation_date for the doctor table.
    const { data: existingRow } = await supabase
      .from(table)
      .select(table === "nurse_consultation_queue" ? "queue_date" : "queue_date, consultation_date")
      .eq("id", entry.queueId)
      .maybeSingle();

    const appointmentDate =
      table === "nurse_consultation_queue"
        ? (existingRow as any)?.queue_date ?? null
        : (existingRow as any)?.consultation_date ?? (existingRow as any)?.queue_date ?? null;

    const { error } = await supabase
      .from(table)
      .update({
        subjective:   soap.s || null,
        objective:    soap.o || null,
        assessments:  parsedAssessments,
        plan:         soap.p || null,
        status:       "done",
        ...(table !== "nurse_consultation_queue" && appointmentDate ? { consultation_date: appointmentDate } : {}),
      })
      .eq("id", entry.queueId);

    setSaving(false);

    if (error) {
      console.error("SOAP save error:", error);
      alert(`❌ Save failed: ${error.message}`);
      return;
    }

    try {
      await logAction({
        user_name:   user?.name || "",
        user_role:   user?.role || (isNurse ? "Nurse" : "Doctor"),
        action:      "Conduct consultation",
        module:      "Consultation",
        description: `Saved SOAP notes for patient: ${entry.name}`,
        status:      "success",
      });
    } catch (e) {
      console.warn("logAction failed:", e);
    }

    if (soap.a?.trim()) {
      try {
        const { data: existing } = await supabase
          .from("diagnosesml")
          .select("id")
          .eq("consultation_id", entry.queueId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("diagnosesml")
            .update({ disease_name: soap.a.trim() })
            .eq("consultation_id", entry.queueId);
        } else {
          await supabase.from("diagnosesml").insert({
            consultation_id: entry.queueId,
            patient_id:      entry.patientId,
            disease_name:    soap.a.trim(),
            icd10_code:      null,
          });
        }
      } catch (e) {
        console.warn("⚠️ diagnosesml:", e);
      }
    }

    await loadAll(entry.queueId, entry.patientId, entry.source);
    setIsDone(true);
    setShowPostSave(true);
  }

  async function handleSaveFollowUp() {
    if (!entry || !followUp.date) {
      setFollowUp((f) => ({ ...f, error: "Please select a follow-up date." }));
      return;
    }
    const table = consultationTable(entry);
    setFollowUp((f) => ({ ...f, saving: true, error: "" }));

    const { error } = await supabase.from("follow_up_schedules").upsert(
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

    if (!error) {
      await supabase
        .from(table)
        .update({ follow_up_date: followUp.date, follow_up_notes: followUp.notes || null })
        .eq("id", consultationId);
    }

    setFollowUp((f) => ({
      ...f,
      saving: false,
      saved:  !error,
      error:  error ? error.message : "",
    }));
  }

  if (!open || !entry) return null;

  const isFemale = entry.gender?.toLowerCase().includes("f");
  const d        = patientData;
  const avatarBg = isFemale ? "#ec4899" : "#2563eb";
  const inits    = entry.name.split(" ").map((n: string) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const displayDate = consultDate
    ? new Date(consultDate + "T00:00:00").toLocaleDateString("en-PH", {
        year: "numeric", month: "long", day: "numeric",
      })
    : new Date().toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

  return (
    <>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        .soap-ta:focus { outline: none; box-shadow: 0 0 0 3px rgba(22,163,74,0.12) !important; }
        .fu-toggle:hover { color: ${G} !important; }
      `}</style>

      {/* ══ Vaccine Request Modal (reuses SendVaccineToNurseModal) ══ */}
      <SendVaccineToNurseModal
        open={showVaccineModal}
        onClose={() => setShowVaccineModal(false)}
        onSent={() => {
          setShowVaccineModal(false);
          setVaccineSent(true);
        }}
      />

      {/* ══ Post-save dialog ════════════════════════════════════════ */}
      {showPostSave && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            style={{
              background: "#fff", borderRadius: 24, padding: "36px 40px",
              textAlign: "center", maxWidth: 480, width: "100%",
              boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
              animation: "slideUp .25s ease",
            }}
          >
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>
              ✅
            </div>
            <div style={{ fontWeight: 800, fontSize: 20, color: DARK, marginBottom: 6, fontFamily: "'Syne',sans-serif" }}>
              Consultation Saved!
            </div>
            <div style={{ fontSize: 13, color: "#4b6557", marginBottom: 20, lineHeight: 1.7 }}>
              SOAP notes for <strong>{entry.name}</strong> have been recorded.
            </div>
            <div style={{ textAlign: "left", marginBottom: 20 }}>
              <FollowUpBlock followUp={followUp} setFollowUp={setFollowUp} onSave={handleSaveFollowUp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Prescription / Lab Request — doctor-only for now. No nurse-
                  side equivalent target exists yet, so these are hidden
                  rather than wired to a no-op, to avoid implying they did
                  something. */}
              {!isNurse && (
                <>
                  <button
                    onClick={() => { setShowPostSave(false); onSave(); onOpenPresc(); }}
                    style={{
                      padding: "13px 24px", borderRadius: 12, background: DARK, color: "#fff",
                      border: "none", fontSize: 14, fontWeight: 700, fontFamily: "DM Sans,sans-serif",
                      cursor: "pointer", boxShadow: "0 4px 16px rgba(6,78,59,0.3)", transition: "all .15s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = G)}
                    onMouseOut={(e)  => (e.currentTarget.style.background = DARK)}
                  >
                    💊 Send Prescription
                  </button>
                  <button
                    onClick={() => { setShowPostSave(false); onSave(); onOpenLab(); }}
                    style={{
                      padding: "13px 24px", borderRadius: 12, background: "transparent",
                      color: DARK, border: `2px solid ${DARK}`, fontSize: 14, fontWeight: 700,
                      fontFamily: "DM Sans,sans-serif", cursor: "pointer", transition: "all .15s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = LIGHT)}
                    onMouseOut={(e)  => (e.currentTarget.style.background = "transparent")}
                  >
                    🧪 Send Lab Request
                  </button>
                </>
              )}

              {/* ── Vaccine Request button — same SendVaccineToNurseModal /
                     patient_vaccine_orders table for both roles. Label only
                     changes for nurse, since "to Nurse" doesn't make sense
                     when a nurse is the one sending it. ── */}
              {!vaccineSent ? (
                <button
                  onClick={() => setShowVaccineModal(true)}
                  style={{
                    padding: "13px 24px", borderRadius: 12,
                    background: "linear-gradient(135deg,#15803d,#16a34a)",
                    color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
                    fontFamily: "DM Sans,sans-serif", cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(21,128,61,0.3)", transition: "all .15s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
                  onMouseOut={(e)  => (e.currentTarget.style.opacity = "1")}
                >
                  💉 {isNurse ? "Request Vaccine" : "Request Vaccine to Nurse"}
                </button>
              ) : (
                <div
                  style={{
                    padding: "13px 24px", borderRadius: 12,
                    background: "#dcfce7", border: "1.5px solid #86efac",
                    color: "#15803d", fontSize: 13, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  ✅ Vaccine request sent{isNurse ? "" : " to nurse"}
                </div>
              )}

              <button
                onClick={() => { setShowPostSave(false); onSave(); onClose(); }}
                style={{
                  padding: "11px 24px", borderRadius: 12, background: "#f8fafc",
                  color: "#6b7280", border: "1.5px solid #e2e8f0", fontSize: 13,
                  fontWeight: 600, fontFamily: "DM Sans,sans-serif", cursor: "pointer",
                  transition: "background .15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseOut={(e)  => (e.currentTarget.style.background = "#f8fafc")}
              >
                Done — Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Main modal ══════════════════════════════════════════════ */}
      <div className={styles.modalBackdrop} onClick={onClose}>
        <div
          className={`${styles.modal} ${styles.modalLg}`}
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", flexDirection: "column", maxHeight: "92vh", overflow: "hidden" }}
        >
          {/* Header */}
          <div
            style={{
              background: `linear-gradient(135deg, ${DARK} 0%, ${MID} 55%, ${G} 100%)`,
              padding: "18px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                🩺
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "'Syne',sans-serif" }}>
                  SOAP Consultation
                </h2>
                {isDone && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 99, padding: "2px 10px", fontSize: 10, fontWeight: 700, marginTop: 3, letterSpacing: 0.5 }}>
                    ✅ COMPLETED
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {vaccineSent && (
                <span style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", borderRadius: 99, padding: "3px 10px", fontSize: 10, fontWeight: 700 }}>
                  💉 Vaccine requested
                </span>
              )}
              <button
                onClick={onClose}
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
                onMouseOut={(e)  => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px", background: "#fafafa" }}>

            {/* Patient name card */}
            <div style={{ background: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 12, boxShadow: "0 1px 8px rgba(22,163,74,0.07)" }}>
              <div style={{ background: `linear-gradient(90deg, ${LIGHT} 0%, #fff 100%)`, padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: avatarBg, color: "#fff", fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${avatarBg}55` }}>
                  {inits}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: DARK, fontFamily: "'Syne',sans-serif" }}>
                    {entry.name}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    {[
                      { icon: "🕐", val: `${entry.age} yrs` },
                      { icon: "👤", val: entry.gender },
                      { icon: "📍", val: entry.addr },
                    ].map(
                      ({ icon, val }) =>
                        val && (
                          <span key={val} style={{ fontSize: 11, color: "#6b7280", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 99, padding: "2px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                            {icon} {val}
                          </span>
                        )
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>
                    Consultation Date
                  </div>
                  <div style={{ fontWeight: 700, color: DARK }}>{displayDate}</div>
                </div>
              </div>
            </div>

            {/* Patient Summary Strip */}
            {!loading && d && <PatientSummaryStrip d={d} isFemale={isFemale} />}

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `4px solid ${BORDER}`, borderTopColor: G, animation: "spin .8s linear infinite" }} />
                <div style={{ fontSize: 13, color: "#6b7280" }}>Loading patient records…</div>
              </div>
            )}

            {/* SOAP Notes */}
            <div style={{ background: "#fff", border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 14, boxShadow: "0 1px 8px rgba(22,163,74,0.07)" }}>
              <div style={{ background: LIGHT, padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📝</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: DARK, letterSpacing: 0.8, textTransform: "uppercase" }}>
                    SOAP Notes
                  </span>
                </div>
                {isDone ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 99, padding: "2px 10px" }}>
                    🔒 Read-only
                  </span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: G, background: "#dcfce7", border: `1px solid ${BORDER}`, borderRadius: 99, padding: "2px 10px" }}>
                    ✏️ {isNurse ? "Nurse fills this" : "Doctor fills this"}
                  </span>
                )}
              </div>

              {isDone && (
                <div style={{ background: "#fef9c3", borderBottom: "1px solid #fde68a", padding: "10px 20px", fontSize: 12, color: "#854d0e", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                  🔒 This consultation has been completed and cannot be edited.
                </div>
              )}

              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {SOAP_CFG.map(({ key, label, icon, ph, bg, border, color, tag }) => (
                  <div
                    key={key}
                    style={{
                      background: bg, border: `1.5px solid ${border}`,
                      borderRadius: 12, overflow: "hidden",
                      opacity: isDone && !soap[key as keyof typeof soap] ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: `1px solid ${border}`, background: bg }}>
                      <span style={{ background: tag, color, borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                        {icon} {key.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
                    </div>
                    <textarea
                      className="soap-ta"
                      value={soap[key as keyof typeof soap]}
                      onChange={(e) => !isDone && setSoap((f) => ({ ...f, [key]: e.target.value }))}
                      readOnly={isDone}
                      placeholder={isDone ? "" : ph}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        border: "none", background: "transparent",
                        padding: "12px 14px", fontSize: 13,
                        fontFamily: "DM Sans, sans-serif", color: "#111827",
                        resize: "vertical", minHeight: 80,
                        cursor: isDone ? "default" : "text", outline: "none",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-up */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📅</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: DARK, letterSpacing: 0.8, textTransform: "uppercase" }}>
                    Follow-up Schedule
                  </span>
                  <span style={{ fontSize: 9, color: "#9ca3af", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 99, padding: "1px 8px" }}>
                    Optional
                  </span>
                </div>
                {!isDone && !showFollowUp && (
                  <button
                    className="fu-toggle"
                    onClick={() => setShowFollowUp(true)}
                    style={{ background: "none", border: "none", color: "#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "color .15s" }}
                  >
                    ＋ Add follow-up
                  </button>
                )}
              </div>
              {(showFollowUp || isDone) && (
                <FollowUpBlock followUp={followUp} setFollowUp={setFollowUp} onSave={handleSaveFollowUp} />
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "14px 24px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "flex-end", gap: 10, background: "#fff", flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{ padding: "10px 24px", borderRadius: 99, border: "1.5px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans,sans-serif", cursor: "pointer", transition: "all .15s" }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "#9ca3af")}
              onMouseOut={(e)  => (e.currentTarget.style.borderColor = "#d1d5db")}
            >
              Close
            </button>
            {!isDone && (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 28px", borderRadius: 99, border: "none",
                  background: saving ? "#86efac" : `linear-gradient(135deg, ${DARK}, ${G})`,
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  fontFamily: "DM Sans,sans-serif",
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: saving ? "none" : "0 2px 10px rgba(22,163,74,0.3)",
                  transition: "all .15s",
                }}
                onMouseOver={(e) => { if (!saving) e.currentTarget.style.opacity = "0.88"; }}
                onMouseOut={(e)  => { if (!saving) e.currentTarget.style.opacity = "1"; }}
              >
                {saving ? "SAVING…" : "SAVE CONSULTATION"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}