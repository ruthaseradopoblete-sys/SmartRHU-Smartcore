"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { generateLabRequestPDF } from "@/lib/generateLabRequestPDF";

type CheckedTests = Record<string, boolean>;

const HEMATOLOGY = [
  { id: "hgb_hct", label: "Hgb/Hct" },
  { id: "cbc_with_platelet", label: "Complete Blood Count with Platelet Count" },
  { id: "pt_ptt", label: "PT, PTT" },
];

const BLOOD_CHEMISTRY = [
  { id: "random_blood_sugar", label: "Random Blood Sugar" },
  { id: "fasting_blood_sugar", label: "Fasting Blood Sugar" },
  { id: "cholesterol", label: "Cholesterol" },
  { id: "triglycerides", label: "Triglycerides" },
  { id: "lipid_profile", label: "Lipid Profile" },
  { id: "blood_uric_acid", label: "Blood Uric Acid" },
  { id: "bun", label: "BUN" },
  { id: "creatinine", label: "Creatinine" },
  { id: "sgpt_alt", label: "SGPT (ALT)" },
  { id: "sgot_ast", label: "SGOT (AST)" },
  { id: "serum_na_k_cl", label: "Serum Na, K, Cl" },
];

const MICROSCOPY = [
  { id: "urinalysis", label: "Urinalysis" },
  { id: "fecalysis", label: "Fecalysis" },
  { id: "pregnancy_test", label: "Pregnancy Test" },
];

const SEROLOGY = [
  { id: "abo_rh_blood_typing", label: "ABO, Rh Blood Typing" },
  { id: "dengue_ns1", label: "Dengue NS1" },
  { id: "dengue_igg_igm", label: "Dengue IgG, IgM" },
  { id: "typhidot_igg_igm", label: "Typhidot IgG/IgM" },
  { id: "hbsag", label: "HbsAg" },
  { id: "ecg_12_lead", label: "12 Lead ECG" },
  { id: "gene_xpert", label: "Gene Xpert" },
];

const MICROBIOLOGY = [
  { id: "afb_dssm", label: "AFB/DSSM" },
  { id: "culture_and_sensitivity", label: "Culture and Sensitivity" },
];

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  age?: number;
  gender?: string;
  civil_status?: string;
  address?: string;
};

type Props = {
  patients: Patient[];
  onClose: () => void;
  onSaved?: () => void;
};

export default function LabRequestForm({ patients, onClose, onSaved }: Props) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualAge, setManualAge] = useState("");
  const [manualGender, setManualGender] = useState("");
  const [manualCivilStatus, setManualCivilStatus] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [checked, setChecked] = useState<CheckedTests>({});
  const [ultrasound, setUltrasound] = useState("");
  const [xray, setXray] = useState("");
  const [others, setOthers] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePatientSelect(id: string) {
    setSelectedPatientId(id);
    if (id) {
      const p = patients.find((pt) => pt.id === id);
      if (p) {
        setManualName(`${p.first_name} ${p.last_name}`);
        setManualAge(p.age?.toString() ?? "");
        setManualGender(p.gender ?? "");
        setManualCivilStatus(p.civil_status ?? "");
        setManualAddress(p.address ?? "");
      }
    } else {
      setManualName("");
      setManualAge("");
      setManualGender("");
      setManualCivilStatus("");
      setManualAddress("");
    }
  }

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const bool = (id: string) => !!checked[id];

  const hasAnyTest =
    Object.values(checked).some(Boolean) || ultrasound || xray || others;

  // ── Format date for display on PDF (e.g. "June 14, 2026") ──
  const formatDateForPDF = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  async function handleSendAndPrint() {
    if (!selectedPatientId && !manualName.trim()) {
      setError("Please select a patient or fill in the patient name.");
      return;
    }
    if (!hasAnyTest) {
      setError("Please select at least one test.");
      return;
    }

    setSaving(true);
    setError(null);

    // 1️⃣ Save to Supabase (only if a real patient is selected)
    if (selectedPatientId) {
      const payload = {
        patient_id: selectedPatientId,
        request_date: date,
        hgb_hct: bool("hgb_hct"),
        cbc_with_platelet: bool("cbc_with_platelet"),
        pt_ptt: bool("pt_ptt"),
        random_blood_sugar: bool("random_blood_sugar"),
        fasting_blood_sugar: bool("fasting_blood_sugar"),
        cholesterol: bool("cholesterol"),
        triglycerides: bool("triglycerides"),
        lipid_profile: bool("lipid_profile"),
        blood_uric_acid: bool("blood_uric_acid"),
        bun: bool("bun"),
        creatinine: bool("creatinine"),
        sgpt_alt: bool("sgpt_alt"),
        sgot_ast: bool("sgot_ast"),
        serum_na_k_cl: bool("serum_na_k_cl"),
        urinalysis: bool("urinalysis"),
        fecalysis: bool("fecalysis"),
        pregnancy_test: bool("pregnancy_test"),
        abo_rh_blood_typing: bool("abo_rh_blood_typing"),
        dengue_ns1: bool("dengue_ns1"),
        dengue_igg_igm: bool("dengue_igg_igm"),
        typhidot_igg_igm: bool("typhidot_igg_igm"),
        hbsag: bool("hbsag"),
        ecg_12_lead: bool("ecg_12_lead"),
        gene_xpert: bool("gene_xpert"),
        afb_dssm: bool("afb_dssm"),
        culture_and_sensitivity: bool("culture_and_sensitivity"),
        ultrasound: ultrasound || null,
        xray: xray || null,
        others: others || null,
        status: "pending",
      };

      const { error: dbError } = await supabase
        .from("laboratory_requests")
        .insert(payload);

      if (dbError) {
        setSaving(false);
        setError(dbError.message);
        return;
      }
    }

    // 2️⃣ Generate + open print dialog
    generateLabRequestPDF({
      patientName: manualName,
      age: manualAge,
      gender: manualGender,
      civilStatus: manualCivilStatus,
      address: manualAddress,
      date: formatDateForPDF(date),

      hgb_hct: bool("hgb_hct"),
      cbc_with_platelet: bool("cbc_with_platelet"),
      pt_ptt: bool("pt_ptt"),
      random_blood_sugar: bool("random_blood_sugar"),
      fasting_blood_sugar: bool("fasting_blood_sugar"),
      cholesterol: bool("cholesterol"),
      triglycerides: bool("triglycerides"),
      lipid_profile: bool("lipid_profile"),
      blood_uric_acid: bool("blood_uric_acid"),
      bun: bool("bun"),
      creatinine: bool("creatinine"),
      sgpt_alt: bool("sgpt_alt"),
      sgot_ast: bool("sgot_ast"),
      serum_na_k_cl: bool("serum_na_k_cl"),
      urinalysis: bool("urinalysis"),
      fecalysis: bool("fecalysis"),
      pregnancy_test: bool("pregnancy_test"),
      abo_rh_blood_typing: bool("abo_rh_blood_typing"),
      dengue_ns1: bool("dengue_ns1"),
      dengue_igg_igm: bool("dengue_igg_igm"),
      typhidot_igg_igm: bool("typhidot_igg_igm"),
      hbsag: bool("hbsag"),
      ecg_12_lead: bool("ecg_12_lead"),
      gene_xpert: bool("gene_xpert"),
      afb_dssm: bool("afb_dssm"),
      culture_and_sensitivity: bool("culture_and_sensitivity"),
      ultrasound: ultrasound || undefined,
      xray: xray || undefined,
      others: others || undefined,
    });

    setSaving(false);
    onSaved?.();
    onClose();
  }

  const CheckRow = ({ id, label }: { id: string; label: string }) => (
    <label style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 8,
      background: checked[id] ? "#e6f4ec" : "#fff",
      border: `1px solid ${checked[id] ? "#1a6b3a" : "#d1d5db"}`,
      cursor: "pointer", marginBottom: 6, fontSize: 14,
      transition: "all 0.15s",
    }}>
      <input
        type="checkbox"
        checked={!!checked[id]}
        onChange={() => toggle(id)}
        style={{ accentColor: "#1a6b3a", width: 16, height: 16 }}
      />
      {label}
    </label>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div style={{
      background: "#1a6b3a", color: "#fff",
      padding: "6px 12px", borderRadius: 6,
      fontSize: 12, fontWeight: 700, letterSpacing: 1,
      marginBottom: 8,
    }}>
      {title}
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 760,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }}>
        {/* Modal Header */}
        <div style={{
          background: "#1a6b3a", borderRadius: "16px 16px 0 0",
          padding: "16px 24px", display: "flex",
          justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>
            Laboratory Request
          </span>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", border: "none",
            color: "#fff", width: 32, height: 32, borderRadius: "50%",
            cursor: "pointer", fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>

          {/* Patient selector */}
          <select
            value={selectedPatientId}
            onChange={(e) => handlePatientSelect(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: "1px solid #d1d5db", fontSize: 14, marginBottom: 8,
              background: "#f0faf4", color: selectedPatientId ? "#111" : "#6b7280",
            }}
          >
            <option value="">— Choose a patient —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>

          <div style={{ textAlign: "center", fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            or fill in manually
          </div>

          {/* Patient info fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Patient Name
              </label>
              <input
                value={manualName}
                onChange={(e) => { setManualName(e.target.value); setSelectedPatientId(""); }}
                placeholder="Full name"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { label: "Age", val: manualAge, set: setManualAge, placeholder: "e.g. 35" },
              { label: "Gender", val: manualGender, set: setManualGender, placeholder: "Male / Female" },
              { label: "Civil Status", val: manualCivilStatus, set: setManualCivilStatus, placeholder: "Single / Married" },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                  {label}
                </label>
                <input
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              Address
            </label>
            <input
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Barangay, Municipality, Province"
              style={inputStyle}
            />
          </div>

          {/* Lab Tests */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
            Laboratory Tests
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Left column */}
            <div>
              <SectionHeader title="HEMATOLOGY" />
              {HEMATOLOGY.map((t) => <CheckRow key={t.id} id={t.id} label={t.label} />)}

              <div style={{ marginTop: 16 }}>
                <SectionHeader title="BLOOD CHEMISTRY" />
                <div style={{
                  fontSize: 11, color: "#6b7280", fontStyle: "italic",
                  marginBottom: 8, padding: "4px 8px",
                  background: "#f9fafb", borderRadius: 4,
                }}>
                  Fasting: 8–10 hours no food/water *Last meal: 10:30PM – 12AM*
                </div>
                {BLOOD_CHEMISTRY.map((t) => <CheckRow key={t.id} id={t.id} label={t.label} />)}
              </div>
            </div>

            {/* Right column */}
            <div>
              <SectionHeader title="MICROSCOPY / PARASITOLOGY" />
              {MICROSCOPY.map((t) => <CheckRow key={t.id} id={t.id} label={t.label} />)}

              <div style={{ marginTop: 16 }}>
                <SectionHeader title="SEROLOGY" />
                {SEROLOGY.map((t) => <CheckRow key={t.id} id={t.id} label={t.label} />)}
              </div>

              <div style={{ marginTop: 16 }}>
                <SectionHeader title="MICROBIOLOGY" />
                {MICROBIOLOGY.map((t) => <CheckRow key={t.id} id={t.id} label={t.label} />)}
              </div>

              {/* Ultrasound / X-ray / Others */}
              <div style={{ marginTop: 16 }}>
                <SectionHeader title="OTHERS" />
                {[
                  { label: "Ultrasound", val: ultrasound, set: setUltrasound },
                  { label: "X-ray", val: xray, set: setXray },
                  { label: "Others", val: others, set: setOthers },
                ].map(({ label, val, set }) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                      {label}
                    </label>
                    <input
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={`Specify ${label.toLowerCase()}…`}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: "10px 14px", background: "#fef2f2",
              border: "1px solid #fca5a5", borderRadius: 8,
              color: "#b91c1c", fontSize: 13,
            }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid #e5e7eb",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button onClick={onClose} style={{
            padding: "9px 24px", borderRadius: 8,
            border: "1px solid #d1d5db", background: "#fff",
            fontSize: 14, cursor: "pointer", fontWeight: 600, color: "#374151",
          }}>
            CANCEL
          </button>
          <button
            onClick={handleSendAndPrint}
            disabled={saving}
            style={{
              padding: "9px 28px", borderRadius: 8,
              border: "none",
              background: saving ? "#6b7280" : "#1a6b3a",
              color: "#fff", fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 700,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {saving ? "Saving…" : "Review & Send →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #d1d5db", fontSize: 14,
  background: "#f0faf4", outline: "none",
  boxSizing: "border-box",
};