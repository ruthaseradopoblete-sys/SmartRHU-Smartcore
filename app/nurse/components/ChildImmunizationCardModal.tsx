"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const GREEN_DARK  = "#15803d";
const GREEN_DARK2 = "#166534";
const GREEN       = "#16a34a";
const INPUT_BG    = "#f0fdf4";
const INPUT_BD    = "#bbf7d0";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patientId: string;
  patientName: string;
}

interface OtherVaccineRow {
  vaccine_type: string;
  dose1_date: string;
  dose1_vaccinator: string;
  dose2_date: string;
  dose2_vaccinator: string;
  dose3_date: string;
  dose3_vaccinator: string;
}

const EMPTY_ROW: OtherVaccineRow = {
  vaccine_type: "", dose1_date: "", dose1_vaccinator: "",
  dose2_date: "", dose2_vaccinator: "", dose3_date: "", dose3_vaccinator: "",
};

function describeError(e: any): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  const parts: string[] = [];
  if (e.message) parts.push(e.message);
  if (e.details) parts.push(`details: ${e.details}`);
  if (e.hint)    parts.push(`hint: ${e.hint}`);
  if (parts.length) return parts.join(" | ");
  return String(e);
}

// ── EPI series — mirrors image 3 of the physical card exactly ──────────────
const EPI_FIELDS: { key: string; label: string; sub: string }[] = [
  { key: "newborn_screening_date", label: "Newborn Screening", sub: "After the first 24 hrs of life" },
  { key: "bcg_date",        label: "BCG",         sub: "At birth" },
  { key: "dpt1_date",       label: "DPT 1",       sub: "6 wks" },
  { key: "dpt2_date",       label: "DPT 2",       sub: "10 wks" },
  { key: "dpt3_date",       label: "DPT 3",       sub: "14 wks" },
  { key: "opv1_date",       label: "OPV 1",       sub: "6 wks" },
  { key: "opv2_date",       label: "OPV 2",       sub: "10 wks" },
  { key: "opv3_date",       label: "OPV 3",       sub: "14 wks" },
  { key: "hepb1_date",      label: "Hepatitis B 1", sub: "Within 24 hrs" },
  { key: "hepb2_date",      label: "Hepatitis B 2", sub: "6 wks" },
  { key: "hepb3_date",      label: "Hepatitis B 3", sub: "14 wks" },
  { key: "measles_date",    label: "Measles",     sub: "9 months" },
];

const SUPPLEMENT_FIELDS: { key: string; label: string }[] = [
  { key: "vitamin_a_given_date", label: "Vitamin A Supplementation" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>
      {children}
    </span>
  );
}

export default function ChildImmunizationCardModal({ open, onClose, onSaved, patientId, patientName }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState<"birth" | "epi" | "other">("birth");
  const [recordId, setRecordId] = useState<string | null>(null);

  // Birth details
  const [birthWeight,   setBirthWeight]   = useState("");
  const [birthLength,   setBirthLength]   = useState("");
  const [gestAge,       setGestAge]       = useState("");
  const [typeOfBirth,   setTypeOfBirth]   = useState("");
  const [placeOfDelivery, setPlaceOfDelivery] = useState("");
  const [birthAttendant, setBirthAttendant] = useState("");
  const [birthRegDate,  setBirthRegDate]  = useState("");

  // EPI dates
  const [epiDates, setEpiDates] = useState<Record<string, string>>({});

  // Td / MR / HPV / MCV (image 4)
  const [tdDate, setTdDate]               = useState("");
  const [tdVaccinator, setTdVaccinator]   = useState("");
  const [mrDate, setMrDate]               = useState("");
  const [mrVaccinator, setMrVaccinator]   = useState("");
  const [hpv1Date, setHpv1Date]           = useState("");
  const [hpv1Vaccinator, setHpv1Vaccinator] = useState("");
  const [hpv2Date, setHpv2Date]           = useState("");
  const [hpv2Vaccinator, setHpv2Vaccinator] = useState("");
  const [mcv1Date, setMcv1Date]           = useState("");
  const [mcv1Vaccinator, setMcv1Vaccinator] = useState("");
  const [mcv2Date, setMcv2Date]           = useState("");
  const [mcv2Vaccinator, setMcv2Vaccinator] = useState("");

  // Freeform "Other Vaccines" table rows
  const [otherRows, setOtherRows] = useState<OtherVaccineRow[]>([{ ...EMPTY_ROW }]);

  useEffect(() => {
    if (!open || !patientId) return;
    loadRecord();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patientId]);

  async function loadRecord() {
    setLoading(true);
    setError("");
    setTab("birth");
    try {
      const { data, error: err } = await supabase
        .from("child_immunization_records")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();

      if (err) throw err;

      if (data) {
        setRecordId(data.id);
        setBirthWeight(data.birth_weight_kg != null ? String(data.birth_weight_kg) : "");
        setBirthLength(data.birth_length_cm != null ? String(data.birth_length_cm) : "");
        setGestAge(data.gestational_age_weeks != null ? String(data.gestational_age_weeks) : "");
        setTypeOfBirth(data.type_of_birth || "");
        setPlaceOfDelivery(data.place_of_delivery || "");
        setBirthAttendant(data.birth_attendant || "");
        setBirthRegDate(data.date_of_birth_registration || "");

        const dates: Record<string, string> = {};
        [...EPI_FIELDS, ...SUPPLEMENT_FIELDS].forEach(({ key }) => {
          if (data[key]) dates[key] = data[key];
        });
        setEpiDates(dates);

        setTdDate(data.td_date || ""); setTdVaccinator(data.td_vaccinator || "");
        setMrDate(data.mr_date || ""); setMrVaccinator(data.mr_vaccinator || "");
        setHpv1Date(data.hpv1_date || ""); setHpv1Vaccinator(data.hpv1_vaccinator || "");
        setHpv2Date(data.hpv2_date || ""); setHpv2Vaccinator(data.hpv2_vaccinator || "");
        setMcv1Date(data.mcv1_date || ""); setMcv1Vaccinator(data.mcv1_vaccinator || "");
        setMcv2Date(data.mcv2_date || ""); setMcv2Vaccinator(data.mcv2_vaccinator || "");

        setOtherRows(
          Array.isArray(data.other_vaccine_rows) && data.other_vaccine_rows.length > 0
            ? data.other_vaccine_rows
            : [{ ...EMPTY_ROW }]
        );
      } else {
        // No existing record — reset to blanks for a fresh card.
        setRecordId(null);
        setBirthWeight(""); setBirthLength(""); setGestAge("");
        setTypeOfBirth(""); setPlaceOfDelivery(""); setBirthAttendant(""); setBirthRegDate("");
        setEpiDates({});
        setTdDate(""); setTdVaccinator("");
        setMrDate(""); setMrVaccinator("");
        setHpv1Date(""); setHpv1Vaccinator("");
        setHpv2Date(""); setHpv2Vaccinator("");
        setMcv1Date(""); setMcv1Vaccinator("");
        setMcv2Date(""); setMcv2Vaccinator("");
        setOtherRows([{ ...EMPTY_ROW }]);
      }
    } catch (e) {
      setError(`Failed to load immunization card: ${describeError(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function setEpiDate(key: string, value: string) {
    setEpiDates((prev) => ({ ...prev, [key]: value }));
  }

  function updateOtherRow(idx: number, field: keyof OtherVaccineRow, value: string) {
    setOtherRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addOtherRow() {
    setOtherRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeOtherRow(idx: number) {
    setOtherRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const cleanedOtherRows = otherRows.filter((r) => r.vaccine_type.trim() !== "");

    const payload: Record<string, any> = {
      patient_id: patientId,
      birth_weight_kg:       birthWeight ? Number(birthWeight) : null,
      birth_length_cm:       birthLength ? Number(birthLength) : null,
      gestational_age_weeks: gestAge ? Number(gestAge) : null,
      type_of_birth:         typeOfBirth || null,
      place_of_delivery:     placeOfDelivery || null,
      birth_attendant:       birthAttendant || null,
      date_of_birth_registration: birthRegDate || null,
      td_date: tdDate || null, td_vaccinator: tdVaccinator || null,
      mr_date: mrDate || null, mr_vaccinator: mrVaccinator || null,
      hpv1_date: hpv1Date || null, hpv1_vaccinator: hpv1Vaccinator || null,
      hpv2_date: hpv2Date || null, hpv2_vaccinator: hpv2Vaccinator || null,
      mcv1_date: mcv1Date || null, mcv1_vaccinator: mcv1Vaccinator || null,
      mcv2_date: mcv2Date || null, mcv2_vaccinator: mcv2Vaccinator || null,
      other_vaccine_rows: cleanedOtherRows,
    };
    [...EPI_FIELDS, ...SUPPLEMENT_FIELDS].forEach(({ key }) => {
      payload[key] = epiDates[key] || null;
    });

    const { error: dbErr } = await supabase
      .from("child_immunization_records")
      .upsert(payload, { onConflict: "patient_id" });

    setSaving(false);
    if (dbErr) { setError(describeError(dbErr)); return; }
    onSaved();
    onClose();
  }

  if (!open) return null;

  const INP: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: INPUT_BG,
    border: `1.5px solid ${INPUT_BD}`, borderRadius: 8,
    padding: "8px 11px", fontSize: 12, fontFamily: "'Nunito', sans-serif",
    color: "#111827", outline: "none",
  };
  const DATEINP: React.CSSProperties = { ...INP, padding: "7px 9px" };

  const TABS: { key: "birth" | "epi" | "other"; label: string; icon: string }[] = [
    { key: "birth", label: "Birth Details", icon: "👶" },
    { key: "epi",   label: "EPI Series",    icon: "💉" },
    { key: "other", label: "Other Vaccines", icon: "📋" },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 3400, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 20, width: "min(820px,97vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.28)", overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN_DARK2})`, padding: "18px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", fontFamily: "'Nunito', sans-serif" }}>
              👶 Child Immunization Card
            </div>
            <div style={{ fontSize: 11, color: "#bbf7d0", marginTop: 2 }}>{patientName} · Digital ECCD Card</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1.5px solid ${INPUT_BD}`, flexShrink: 0, background: "#fafafa" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: "11px 0", border: "none", background: "transparent",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                color: tab === t.key ? GREEN_DARK : "#9ca3af",
                borderBottom: tab === t.key ? `2.5px solid ${GREEN_DARK}` : "2.5px solid transparent",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>Loading card…</div>
          ) : (
            <>
              {/* ══ BIRTH DETAILS TAB ══ */}
              {tab === "birth" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <FieldLabel>Birth Weight (kg)</FieldLabel>
                      <input style={INP} value={birthWeight} onChange={(e) => setBirthWeight(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 3.2" />
                    </div>
                    <div>
                      <FieldLabel>Birth Length (cm)</FieldLabel>
                      <input style={INP} value={birthLength} onChange={(e) => setBirthLength(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 49" />
                    </div>
                    <div>
                      <FieldLabel>Gestational Age (weeks)</FieldLabel>
                      <input style={INP} value={gestAge} onChange={(e) => setGestAge(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 39" />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Type of Birth</FieldLabel>
                    <div style={{ display: "flex", gap: 16 }}>
                      {["Normal", "CS"].map((t) => (
                        <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
                          <input type="radio" name="typeOfBirth" checked={typeOfBirth === t} onChange={() => setTypeOfBirth(t)} />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Place of Delivery</FieldLabel>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {["Home", "Lying-in", "Hospital", "Others"].map((p) => (
                        <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
                          <input type="radio" name="placeOfDelivery" checked={placeOfDelivery === p} onChange={() => setPlaceOfDelivery(p)} />
                          {p}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Birth Attendant</FieldLabel>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {["Doctor", "Nurse", "Midwife", "Hilot", "Others"].map((a) => (
                        <label key={a} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
                          <input type="radio" name="birthAttendant" checked={birthAttendant === a} onChange={() => setBirthAttendant(a)} />
                          {a}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ width: 200 }}>
                    <FieldLabel>Date of Birth Registration</FieldLabel>
                    <input type="date" style={DATEINP} value={birthRegDate} onChange={(e) => setBirthRegDate(e.target.value)} />
                  </div>
                </div>
              )}

              {/* ══ EPI SERIES TAB ══ */}
              {tab === "epi" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                    Enter the date each dose was administered. Leave blank if not yet given.
                  </div>
                  {EPI_FIELDS.map(({ key, label, sub }) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 12px", background: epiDates[key] ? INPUT_BG : "#fafafa", border: `1.5px solid ${epiDates[key] ? INPUT_BD : "#e5e7eb"}`, borderRadius: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: epiDates[key] ? GREEN_DARK2 : "#374151" }}>{label}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>{sub}</div>
                      </div>
                      <input
                        type="date"
                        style={{ ...DATEINP, width: 160, background: "#fff" }}
                        value={epiDates[key] || ""}
                        onChange={(e) => setEpiDate(key, e.target.value)}
                      />
                    </div>
                  ))}

                  <div style={{ borderTop: `1.5px solid ${INPUT_BD}`, marginTop: 6, paddingTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: GREEN_DARK, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
                      Supplementary Services
                    </div>
                    {SUPPLEMENT_FIELDS.map(({ key, label }) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 12px", background: epiDates[key] ? INPUT_BG : "#fafafa", border: `1.5px solid ${epiDates[key] ? INPUT_BD : "#e5e7eb"}`, borderRadius: 10 }}>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: epiDates[key] ? GREEN_DARK2 : "#374151" }}>{label}</div>
                        <input
                          type="date"
                          style={{ ...DATEINP, width: 160, background: "#fff" }}
                          value={epiDates[key] || ""}
                          onChange={(e) => setEpiDate(key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══ OTHER VACCINES TAB — Td / MR / HPV / MCV + freeform rows ══ */}
              {tab === "other" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Td */}
                  <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e", marginBottom: 8 }}>Td (Tetanus-diphtheria)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                      <div><FieldLabel>Date Given</FieldLabel><input type="date" style={DATEINP} value={tdDate} onChange={(e) => setTdDate(e.target.value)} /></div>
                      <div><FieldLabel>Vaccinator</FieldLabel><input style={INP} value={tdVaccinator} onChange={(e) => setTdVaccinator(e.target.value)} placeholder="Name of vaccinator" /></div>
                    </div>
                  </div>

                  {/* MR */}
                  <div style={{ background: INPUT_BG, border: `1.5px solid ${INPUT_BD}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: GREEN_DARK2, marginBottom: 8 }}>MR (Measles-Rubella)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                      <div><FieldLabel>Date Given</FieldLabel><input type="date" style={DATEINP} value={mrDate} onChange={(e) => setMrDate(e.target.value)} /></div>
                      <div><FieldLabel>Vaccinator</FieldLabel><input style={INP} value={mrVaccinator} onChange={(e) => setMrVaccinator(e.target.value)} placeholder="Name of vaccinator" /></div>
                    </div>
                  </div>

                  {/* HPV */}
                  <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: GREEN_DARK2, marginBottom: 8 }}>HPV</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
                        <div><FieldLabel>1st Dose</FieldLabel><input type="date" style={DATEINP} value={hpv1Date} onChange={(e) => setHpv1Date(e.target.value)} /></div>
                        <div><FieldLabel>Vaccinator</FieldLabel><input style={INP} value={hpv1Vaccinator} onChange={(e) => setHpv1Vaccinator(e.target.value)} /></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
                        <div><FieldLabel>2nd Dose</FieldLabel><input type="date" style={DATEINP} value={hpv2Date} onChange={(e) => setHpv2Date(e.target.value)} /></div>
                        <div><FieldLabel>Vaccinator</FieldLabel><input style={INP} value={hpv2Vaccinator} onChange={(e) => setHpv2Vaccinator(e.target.value)} /></div>
                      </div>
                    </div>
                  </div>

                  {/* MCV */}
                  <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#9a3412", marginBottom: 8 }}>MCV (Meningococcal)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
                        <div><FieldLabel>1st Dose</FieldLabel><input type="date" style={DATEINP} value={mcv1Date} onChange={(e) => setMcv1Date(e.target.value)} /></div>
                        <div><FieldLabel>Vaccinator</FieldLabel><input style={INP} value={mcv1Vaccinator} onChange={(e) => setMcv1Vaccinator(e.target.value)} /></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
                        <div><FieldLabel>2nd Dose</FieldLabel><input type="date" style={DATEINP} value={mcv2Date} onChange={(e) => setMcv2Date(e.target.value)} /></div>
                        <div><FieldLabel>Vaccinator</FieldLabel><input style={INP} value={mcv2Vaccinator} onChange={(e) => setMcv2Vaccinator(e.target.value)} /></div>
                      </div>
                    </div>
                  </div>

                  {/* Freeform extra rows — matches the blank table at the
                      bottom of the physical card (image 4) */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>Additional Vaccines</div>
                      <button
                        onClick={addOtherRow}
                        style={{ fontSize: 11, fontWeight: 700, color: GREEN_DARK, background: "none", border: `1.5px dashed ${GREEN}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}
                      >
                        ＋ Add Row
                      </button>
                    </div>
                    {otherRows.map((row, idx) => (
                      <div key={idx} style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", marginBottom: 8, position: "relative" }}>
                        <button
                          onClick={() => removeOtherRow(idx)}
                          style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 5, background: "#fee2e2", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >×</button>
                        <div style={{ marginBottom: 8 }}>
                          <FieldLabel>Vaccine Type</FieldLabel>
                          <input style={{ ...INP, maxWidth: 280 }} value={row.vaccine_type} onChange={(e) => updateOtherRow(idx, "vaccine_type", e.target.value)} placeholder="e.g. Yellow Fever" />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr 1.3fr 1fr 1.3fr", gap: 8 }}>
                          <div><FieldLabel>Dose 1</FieldLabel><input type="date" style={DATEINP} value={row.dose1_date} onChange={(e) => updateOtherRow(idx, "dose1_date", e.target.value)} /></div>
                          <div><FieldLabel>Vaccinator</FieldLabel><input style={INP} value={row.dose1_vaccinator} onChange={(e) => updateOtherRow(idx, "dose1_vaccinator", e.target.value)} /></div>
                          <div><FieldLabel>Dose 2</FieldLabel><input type="date" style={DATEINP} value={row.dose2_date} onChange={(e) => updateOtherRow(idx, "dose2_date", e.target.value)} /></div>
                          <div><FieldLabel>Vaccinator</FieldLabel><input style={INP} value={row.dose2_vaccinator} onChange={(e) => updateOtherRow(idx, "dose2_vaccinator", e.target.value)} /></div>
                          <div><FieldLabel>Dose 3</FieldLabel><input type="date" style={DATEINP} value={row.dose3_date} onChange={(e) => updateOtherRow(idx, "dose3_date", e.target.value)} /></div>
                          <div><FieldLabel>Vaccinator</FieldLabel><input style={INP} value={row.dose3_vaccinator} onChange={(e) => updateOtherRow(idx, "dose3_vaccinator", e.target.value)} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div style={{ marginTop: 14, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>⚠️ {error}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fff", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: "10px 24px", borderRadius: 99, border: "1.5px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              padding: "10px 28px", borderRadius: 99, border: "none",
              background: saving || loading ? "#86efac" : `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})`,
              color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: "'Nunito', sans-serif",
              cursor: saving || loading ? "not-allowed" : "pointer",
              boxShadow: !saving && !loading ? "0 2px 10px rgba(21,128,61,0.3)" : "none",
            }}
          >
            {saving ? "⏳ Saving…" : "✓ Save Immunization Card"}
          </button>
        </div>
      </div>
    </div>
  );
}