"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

const ALL_SECTIONS = [
  { title: "Hematology", tests: HEMATOLOGY },
  { title: "Blood Chemistry", tests: BLOOD_CHEMISTRY },
  { title: "Microscopy / Parasitology", tests: MICROSCOPY },
  { title: "Serology", tests: SEROLOGY },
  { title: "Microbiology", tests: MICROBIOLOGY },
];

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  age?: number;
  sex?: string;
  purok?: string;
  barangay?: string;
  municipality?: string;
};

type Props = {
  open: boolean;
  patient?: {
    id?: string;
    name?: string;
    age?: number;
    gender?: string;
    civil?: string;
    addr?: string;
  } | null;
  onClose: () => void;
  onSend: () => void;
  // Pangalan ng naka-login na doctor na nag-request — itatala bilang Req. Physician
  doctorName?: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  background: "#f0faf4",
  outline: "none",
  boxSizing: "border-box",
};

const fieldLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "#374151",
  display: "block", marginBottom: 4,
};

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({
  open,
  name,
  age,
  gender,
  civilStatus,
  address,
  date,
  checked,
  ultrasound,
  xray,
  others,
  onBack,
  onConfirm,
  saving,
}: {
  open: boolean;
  name: string;
  age: string;
  gender: string;
  civilStatus: string;
  address: string;
  date: string;
  checked: CheckedTests;
  ultrasound: string;
  xray: string;
  others: string;
  onBack: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  if (!open) return null;

  const selectedTests = ALL_SECTIONS.flatMap((s) =>
    s.tests.filter((t) => checked[t.id]).map((t) => ({ section: s.title, label: t.label }))
  );

  const groupedTests: Record<string, string[]> = {};
  selectedTests.forEach(({ section, label }) => {
    if (!groupedTests[section]) groupedTests[section] = [];
    groupedTests[section].push(label);
  });

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1100, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{
          background: "#1a6b3a", borderRadius: "16px 16px 0 0",
          padding: "16px 24px", display: "flex",
          justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ color: "#a7f3c2", fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 2 }}>
              REVIEW REQUEST
            </div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>
              Confirm Laboratory Request
            </span>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.15)", borderRadius: 8,
            padding: "4px 10px", color: "#fff", fontSize: 12, fontWeight: 600,
          }}>
            {formattedDate}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>

          {/* Patient Info Card */}
          <div style={{
            background: "#f0faf4", border: "1px solid #bbf7d0",
            borderRadius: 12, padding: "14px 18px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b3a", letterSpacing: 1, marginBottom: 10 }}>
              PATIENT INFORMATION
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{name || "—"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Age", val: age || "—" },
                { label: "Gender", val: gender || "—" },
                { label: "Civil Status", val: civilStatus || "—" },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>
            {address && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, marginBottom: 2 }}>Address</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{address}</div>
              </div>
            )}
          </div>

          {/* Selected Tests */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
            REQUESTED TESTS ({selectedTests.length})
          </div>

          {Object.keys(groupedTests).length === 0 && !ultrasound && !xray && !others ? (
            <div style={{
              padding: "16px", background: "#fef9c3", borderRadius: 8,
              fontSize: 13, color: "#92400e", textAlign: "center",
            }}>
              No tests selected.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(groupedTests).map(([section, labels]) => (
                <div key={section} style={{
                  border: "1px solid #d1fae5", borderRadius: 10, overflow: "hidden",
                }}>
                  <div style={{
                    background: "#dcfce7", padding: "6px 14px",
                    fontSize: 11, fontWeight: 700, color: "#166534", letterSpacing: 0.5,
                  }}>
                    {section.toUpperCase()}
                  </div>
                  <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {labels.map((label) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1f2937" }}>
                        <span style={{ color: "#16a34a", fontSize: 16, lineHeight: 1 }}>✓</span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {(ultrasound || xray || others) && (
                <div style={{ border: "1px solid #d1fae5", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{
                    background: "#dcfce7", padding: "6px 14px",
                    fontSize: 11, fontWeight: 700, color: "#166534", letterSpacing: 0.5,
                  }}>
                    OTHERS
                  </div>
                  <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {ultrasound && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1f2937" }}>
                        <span style={{ color: "#16a34a", fontSize: 16 }}>✓</span>
                        Ultrasound: <strong>{ultrasound}</strong>
                      </div>
                    )}
                    {xray && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1f2937" }}>
                        <span style={{ color: "#16a34a", fontSize: 16 }}>✓</span>
                        X-ray: <strong>{xray}</strong>
                      </div>
                    )}
                    {others && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1f2937" }}>
                        <span style={{ color: "#16a34a", fontSize: 16 }}>✓</span>
                        Others: <strong>{others}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info note */}
          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 8, fontSize: 12, color: "#92400e",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            ✓ After confirming, the lab request will be sent to the laboratory.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid #e5e7eb",
          display: "flex", justifyContent: "flex-end", gap: 10,
          background: "#fafafa", borderRadius: "0 0 16px 16px",
        }}>
          <button onClick={onBack} disabled={saving} style={{
            padding: "9px 22px", borderRadius: 8,
            border: "1px solid #d1d5db", background: "#fff",
            fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600, color: "#374151",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            ← Back
          </button>
          <button onClick={onConfirm} disabled={saving} style={{
            padding: "9px 28px", borderRadius: 8, border: "none",
            background: saving ? "#6b7280" : "#1a6b3a",
            color: "#fff", fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer", fontWeight: 700,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {saving ? "Saving…" : "✓ Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function LabRequestModal({ open, patient, onClose, onSend, doctorName }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
  const [showPreview, setShowPreview] = useState(false);

  // Close-confirmation dialog
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // ── Fetch TODAY's patients via soap_consultations ─────────────────────────
  useEffect(() => {
    if (!open) return;

    // Reset form state
    setChecked({});
    setUltrasound("");
    setXray("");
    setOthers("");
    setError(null);
    setFetchError(null);
    setShowPreview(false);
    setShowCloseConfirm(false);
    setDate(new Date().toISOString().split("T")[0]);

    setLoadingPatients(true);
    fetchTodayPatients();
  }, [open, patient]);

  // PH time → "YYYY-MM-DD"  (same logic as PendingPatients)
  function getTodayPH(): string {
    const d = new Date();
    d.setUTCHours(d.getUTCHours() + 8);
    return d.toISOString().slice(0, 10);
  }

  async function fetchTodayPatients() {
    const today = getTodayPH();

    // Same query pattern as PendingPatients: eq("queue_date", today)
    const { data: queueRows, error: qErr } = await supabase
      .from("soap_consultations")
      .select("patient_id")
      .eq("queue_date", today);

    if (qErr) {
      setLoadingPatients(false);
      setFetchError(`Could not load today's queue: ${qErr.message}`);
      setPatients([]);
      return;
    }

    const todayIds = [...new Set(
      (queueRows ?? []).map((r: any) => r.patient_id).filter(Boolean)
    )] as string[];

    if (todayIds.length === 0) {
      setLoadingPatients(false);
      setPatients([]);
      return;
    }

    const { data, error: dbErr } = await supabase
      .from("patients")
      .select("id, first_name, last_name, middle_name, age, sex, purok, barangay, municipality")
      .in("id", todayIds)
      .order("last_name", { ascending: true });

    setLoadingPatients(false);

    if (dbErr) {
      setFetchError(`Could not load patients: ${dbErr.message}`);
      setPatients([]);
      return;
    }

    setPatients(data ?? []);

    // Pre-fill if a patient was passed in
    if (patient?.id) {
      setSelectedPatientId(patient.id);
      setManualName(patient.name ?? "");
      setManualAge(patient.age?.toString() ?? "");
      setManualGender(patient.gender ?? "");
      setManualCivilStatus(patient.civil ?? "");
      setManualAddress(patient.addr ?? "");
    } else {
      setSelectedPatientId("");
      setManualName("");
      setManualAge("");
      setManualGender("");
      setManualCivilStatus("");
      setManualAddress("");
    }
  }

  if (!open) return null;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function handlePatientSelect(id: string) {
    setSelectedPatientId(id);
    if (id) {
      const p = patients.find((pt) => pt.id === id);
      if (p) {
        setManualName([p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" "));
        setManualAge(p.age?.toString() ?? "");
        setManualGender(p.sex ?? "");
        setManualCivilStatus("");
        setManualAddress([p.purok, p.barangay, p.municipality].filter(Boolean).join(", "));
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
    Object.values(checked).some(Boolean) || !!ultrasound || !!xray || !!others;

  // ── Close-guard helpers ──────────────────────────────────────────────────
  function hasUnsavedChanges() {
    const typedWithoutPatient =
      !patient && !selectedPatientId &&
      (manualName.trim() !== "" || manualAddress.trim() !== "");
    return hasAnyTest || typedWithoutPatient;
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

  // ── Validate → show preview ──────────────────────────────────────────────
  function handleReview() {
    if (!selectedPatientId && !manualName.trim()) {
      setError("Please select or enter a patient name.");
      return;
    }
    if (!hasAnyTest) {
      setError("Please select at least one test.");
      return;
    }
    setError(null);
    setShowPreview(true);
  }

  // ── Confirm: save lang (NO print) ───────────────────────────────────────
  async function handleConfirmedSend() {
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase
      .from("laboratory_requests")
      .insert({
        patient_id: selectedPatientId || null,
        request_date: date,
        req_physician: doctorName || null,   // sinong doctor ang nag-request
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
      });

    setSaving(false);

    if (dbError) {
      setShowPreview(false);
      setError(dbError.message);
      return;
    }

    // Walang auto-print — i-save lang ang request. (Pwede pa ring i-print mula sa
    // Lab Results / Laboratory module kung kailangan ng official form.)
    alert("✅ Successfully sent the lab request.");

    onSend();
    onClose();
  }

  // ── Retry fetch ──────────────────────────────────────────────────────────
  async function retryFetch() {
    setFetchError(null);
    setLoadingPatients(true);
    await fetchTodayPatients();
  }

  // ── Sub-components ───────────────────────────────────────────────────────
  const CheckRow = ({ id, label }: { id: string; label: string }) => (
    <label style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 8,
      background: checked[id] ? "#e6f4ec" : "#fff",
      border: `1px solid ${checked[id] ? "#1a6b3a" : "#d1d5db"}`,
      cursor: "pointer", fontSize: 13.5,
      transition: "all 0.15s",
    }}>
      <input
        type="checkbox"
        checked={!!checked[id]}
        onChange={() => toggle(id)}
        style={{ accentColor: "#1a6b3a", width: 16, height: 16, flexShrink: 0 }}
      />
      {label}
    </label>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div style={{
      background: "#1a6b3a", color: "#fff",
      padding: "7px 14px", borderRadius: 6,
      fontSize: 12, fontWeight: 700, letterSpacing: 1,
      marginBottom: 10,
    }}>
      {title}
    </div>
  );

  // Section block: full-width green header + 2-column grid of tests (like Vaccine modal)
  const TestSection = ({ title, tests, note }: { title: string; tests: { id: string; label: string }[]; note?: React.ReactNode }) => (
    <div style={{ marginBottom: 18 }}>
      <SectionHeader title={title} />
      {note}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {tests.map((t) => <CheckRow key={t.id} id={t.id} label={t.label} />)}
      </div>
    </div>
  );

  const selectedCount =
    Object.values(checked).filter(Boolean).length +
    (ultrasound ? 1 : 0) +
    (xray ? 1 : 0) +
    (others ? 1 : 0);

  return (
    <>
      {/* Preview Modal */}
      <PreviewModal
        open={showPreview}
        name={manualName}
        age={manualAge}
        gender={manualGender}
        civilStatus={manualCivilStatus}
        address={manualAddress}
        date={date}
        checked={checked}
        ultrasound={ultrasound}
        xray={xray}
        others={others}
        onBack={() => setShowPreview(false)}
        onConfirm={handleConfirmedSend}
        saving={saving}
      />

      {/* Main Modal */}
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}>
        <div style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 880,
          maxHeight: "92vh", display: "flex", flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            background: "#1a6b3a",
            padding: "16px 24px", display: "flex",
            justifyContent: "space-between", alignItems: "center", flexShrink: 0,
          }}>
            <div>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                🧪 Laboratory Request
              </span>
              <div style={{ color: "#a7f3c2", fontSize: 12, marginTop: 2 }}>
                Doctor → Laboratory test order
              </div>
            </div>
            <button onClick={requestClose} style={{
              background: "rgba(255,255,255,0.2)", border: "none",
              color: "#fff", width: 32, height: 32, borderRadius: "50%",
              cursor: "pointer", fontSize: 18,
            }}>×</button>
          </div>

          {/* ── Two-pane body: LEFT patient info · RIGHT tests (scroll) ── */}
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

            {/* ===== LEFT PANE: Patient info (fixed width) ===== */}
            <div style={{
              width: 320, flexShrink: 0,
              borderRight: "1px solid #e5e7eb",
              overflowY: "auto", padding: "18px 20px",
              background: "#fcfdfc",
            }}>
              {/* Fetch error banner */}
              {fetchError && (
                <div style={{
                  marginBottom: 14, padding: "10px 14px",
                  background: "#fef2f2", border: "1px solid #fca5a5",
                  borderRadius: 8, color: "#b91c1c", fontSize: 13,
                }}>
                  <div style={{ marginBottom: 6 }}>⚠ {fetchError}</div>
                  <button onClick={retryFetch} style={{
                    fontSize: 12, color: "#b91c1c",
                    background: "none", border: "1px solid #fca5a5",
                    borderRadius: 4, cursor: "pointer", padding: "2px 8px",
                  }}>
                    Retry
                  </button>
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b3a", letterSpacing: 1, marginBottom: 8 }}>
                SELECT FROM TODAY'S QUEUE
              </div>

              {/* Patient selector */}
              <select
                value={selectedPatientId}
                onChange={(e) => handlePatientSelect(e.target.value)}
                disabled={loadingPatients}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: "1px solid #d1d5db", fontSize: 14, marginBottom: 10,
                  background: "#f0faf4",
                  color: selectedPatientId ? "#111" : "#6b7280",
                  cursor: loadingPatients ? "wait" : "default",
                  boxSizing: "border-box",
                }}
              >
                <option value="">
                  {loadingPatients
                    ? "Loading patients…"
                    : patients.length === 0 && !fetchError
                    ? "No patients in today's queue"
                    : `— Choose a patient (${patients.length} today) —`}
                </option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.last_name}, {p.first_name}
                    {p.middle_name ? ` ${p.middle_name}` : ""}
                  </option>
                ))}
              </select>

              <div style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", margin: "4px 0 14px" }}>
                or fill in manually
              </div>

              {/* Patient Name */}
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Patient Name</label>
                <input
                  value={manualName}
                  onChange={(e) => { setManualName(e.target.value); setSelectedPatientId(""); }}
                  style={inputStyle}
                  placeholder="Full name"
                />
              </div>

              {/* Date */}
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Age + Gender */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={fieldLabel}>Age</label>
                  <input value={manualAge} onChange={(e) => setManualAge(e.target.value)} placeholder="e.g. 35" style={inputStyle} />
                </div>
                <div>
                  <label style={fieldLabel}>Gender</label>
                  <input value={manualGender} onChange={(e) => setManualGender(e.target.value)} placeholder="Male / Female" style={inputStyle} />
                </div>
              </div>

              {/* Civil Status */}
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Civil Status</label>
                <input value={manualCivilStatus} onChange={(e) => setManualCivilStatus(e.target.value)} placeholder="Single / Married" style={inputStyle} />
              </div>

              {/* Address */}
              <div style={{ marginBottom: 4 }}>
                <label style={fieldLabel}>Address</label>
                <input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Barangay, Municipality, Province"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* ===== RIGHT PANE: Tests (scrolls down) ===== */}
            <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "18px 22px" }}>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Select Tests</div>
                {selectedCount > 0 && (
                  <div style={{
                    background: "#1a6b3a", color: "#fff",
                    borderRadius: 99, padding: "3px 12px",
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {selectedCount} selected
                  </div>
                )}
              </div>

              <TestSection title="HEMATOLOGY" tests={HEMATOLOGY} />

              <TestSection
                title="BLOOD CHEMISTRY"
                tests={BLOOD_CHEMISTRY}
                note={
                  <div style={{
                    fontSize: 11, color: "#6b7280", fontStyle: "italic",
                    marginBottom: 10, padding: "5px 10px",
                    background: "#f9fafb", borderRadius: 4,
                    borderLeft: "3px solid #1a6b3a",
                  }}>
                    Fasting: 8–10 hours no food/water · Last meal: 10:30PM – 12AM
                  </div>
                }
              />

              <TestSection title="MICROSCOPY / PARASITOLOGY" tests={MICROSCOPY} />

              <TestSection title="SEROLOGY" tests={SEROLOGY} />

              <TestSection title="MICROBIOLOGY" tests={MICROBIOLOGY} />

              {/* OTHERS — free-text imaging fields */}
              <div style={{ marginBottom: 6 }}>
                <SectionHeader title="OTHERS" />
                {[
                  { label: "Ultrasound", val: ultrasound, set: setUltrasound },
                  { label: "X-ray", val: xray, set: setXray },
                  { label: "Others", val: others, set: setOthers },
                ].map(({ label, val, set }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <label style={fieldLabel}>{label}</label>
                    <input
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={`Specify ${label.toLowerCase()}…`}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              {/* Inline error */}
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
          </div>

          {/* Footer */}
          <div style={{
            padding: "14px 24px", borderTop: "1px solid #e5e7eb",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            background: "#fafafa", flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              {selectedCount > 0 ? `${selectedCount} test${selectedCount > 1 ? "s" : ""} selected` : "No tests selected yet"}
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={requestClose} style={{
                padding: "9px 24px", borderRadius: 8,
                border: "1px solid #d1d5db", background: "#fff",
                fontSize: 14, cursor: "pointer", fontWeight: 600, color: "#374151",
              }}>
                CANCEL
              </button>
              <button onClick={handleReview} style={{
                padding: "9px 28px", borderRadius: 8, border: "none",
                background: "#1a6b3a", color: "#fff",
                fontSize: 14, cursor: "pointer", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                Review & Send →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLOSE-WITHOUT-SAVING CONFIRMATION ── */}
      {showCloseConfirm && (
        <div
          onClick={() => setShowCloseConfirm(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1200,
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
              boxShadow: "0 14px 50px rgba(0,0,0,0.25)",
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
                onClick={() => setShowCloseConfirm(false)}
                style={{
                  padding: "10px 30px", borderRadius: 10, border: "none",
                  background: "#f1f5f9", color: "#374151",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >Cancel</button>
              <button
                onClick={confirmClose}
                style={{
                  padding: "10px 30px", borderRadius: 10, border: "none",
                  background: "#ef4444", color: "#fff",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}