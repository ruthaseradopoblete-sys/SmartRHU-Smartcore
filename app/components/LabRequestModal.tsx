"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/utils/auditLogs";

type CheckedTests = Record<string, boolean>;

const HEMATOLOGY = [
  { id: "hgb_hct", label: "Hgb/Hct" },
  { id: "cbc_with_platelet", label: "CBC with Platelet Count" },
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

// ─── Print-ready Lab Request Form (preview + print are THE SAME) ──────────────
function LabRequestFormPrint({
  name, age, gender, civilStatus, address, date, checked, ultrasound, xray, others, doctorName,
}: {
  name: string; age: string; gender: string; civilStatus: string;
  address: string; date: string; checked: CheckedTests;
  ultrasound: string; xray: string; others: string; doctorName?: string;
}) {
  const bool = (id: string) => !!checked[id];

  const formattedDate = (() => {
    try {
      return new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch { return date; }
  })();

  const CB = ({ id }: { id: string }) => (
    <span style={{
      display: "inline-block", width: 12, height: 12,
      border: "1px solid #333", marginRight: 6, verticalAlign: "middle",
      background: bool(id) ? "#1a6b3a" : "#fff",
      position: "relative", flexShrink: 0,
    }}>
      {bool(id) && (
        <span style={{
          position: "absolute", top: -2, left: 1,
          color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1,
        }}>✓</span>
      )}
    </span>
  );

  const Row = ({ id, label }: { id: string; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 5, fontSize: 10 }}>
      <CB id={id} />
      <span style={{ fontWeight: bool(id) ? 700 : 400 }}>{label}</span>
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontWeight: 800, fontSize: 10.5, marginBottom: 6, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>
      {children}
    </div>
  );

  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      width: "100%",
      background: "#fff",
      color: "#000",
      padding: "18px 24px",
      boxSizing: "border-box",
    }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, gap: 0 }}>
        <img src="/logo.jpg" alt="logo"
          style={{ width: 54, height: 54, objectFit: "contain", flexShrink: 0 }}
          onError={(e: any) => { e.target.style.display = "none"; }} />
        <div style={{ textAlign: "center", lineHeight: 1.55, padding: "0 14px" }}>
          <div style={{ fontSize: 9 }}>Republic of the Philippines</div>
          <div style={{ fontSize: 9 }}>Department of Health</div>
          <div style={{ fontSize: 9 }}>Lopez, Quezon</div>
          <div style={{ fontSize: 9 }}>Municipal Health Office</div>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.3 }}>LABORATORY DEPARTMENT</div>
        </div>
        <img src="/logo.jpg" alt="seal"
          style={{ width: 54, height: 54, objectFit: "contain", flexShrink: 0 }}
          onError={(e: any) => { e.target.style.display = "none"; }} />
      </div>

      {/* ── Patient Info ── */}
      <div style={{ borderTop: "2px solid #000", borderBottom: "1px solid #000", padding: "8px 0", marginBottom: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 20px", fontSize: 10 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ fontWeight: 700, minWidth: 42 }}>Name:</span>
          <span style={{ flex: 1, borderBottom: "1px solid #000", paddingLeft: 4 }}>{name}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ fontWeight: 700, minWidth: 32 }}>Date:</span>
          <span style={{ borderBottom: "1px solid #000", minWidth: 120, paddingLeft: 4 }}>{formattedDate}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ fontWeight: 700, minWidth: 42 }}>Age:</span>
          <span style={{ borderBottom: "1px solid #000", minWidth: 60, paddingLeft: 4 }}>{age}</span>
          <span style={{ fontWeight: 700, marginLeft: 10, minWidth: 50 }}>Gender:</span>
          <span style={{ borderBottom: "1px solid #000", minWidth: 80, paddingLeft: 4 }}>{gender}</span>
          <span style={{ fontWeight: 700, marginLeft: 10, minWidth: 70 }}>Civil Status:</span>
          <span style={{ flex: 1, borderBottom: "1px solid #000", paddingLeft: 4 }}>{civilStatus}</span>
        </div>
        <div /> {/* spacer */}
        <div style={{ display: "flex", gap: 4, gridColumn: "1 / -1" }}>
          <span style={{ fontWeight: 700, minWidth: 42 }}>Address:</span>
          <span style={{ flex: 1, borderBottom: "1px solid #000", paddingLeft: 4 }}>{address}</span>
        </div>
      </div>

      {/* ── Two-column test list ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>

        {/* LEFT COLUMN */}
        <div>
          {/* Rx symbol */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 10 }}>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, fontFamily: "serif" }}>R<sub style={{ fontSize: 14 }}>x</sub></div>
            <div style={{ flex: 1 }}>
              <SectionTitle>Hematology</SectionTitle>
              <Row id="hgb_hct" label="Hgb/Hct" />
              <Row id="cbc_with_platelet" label="CBC with Platelet Count" />
              <Row id="pt_ptt" label="PT, PTT" />
            </div>
          </div>

          <SectionTitle>Blood Chemistry</SectionTitle>
          <Row id="random_blood_sugar" label="Random Blood Sugar" />
          <Row id="fasting_blood_sugar" label="Fasting Blood Sugar" />
          <Row id="cholesterol" label="Cholesterol" />
          <Row id="triglycerides" label="Triglycerides" />
          <Row id="lipid_profile" label="Lipid Profile" />
          <Row id="blood_uric_acid" label="Blood Uric Acid" />
          <Row id="bun" label="BUN" />
          <Row id="creatinine" label="Creatinine" />
          <Row id="sgpt_alt" label="SGPT (ALT)" />
          <Row id="sgot_ast" label="SGOT (AST)" />
          <Row id="serum_na_k_cl" label="Serum Na, K, Cl" />

          <div style={{ fontSize: 9, fontStyle: "italic", color: "#444", marginTop: 6, lineHeight: 1.5 }}>
            Fasting: 8-10 hours no food/water<br />
            *Last meal: 10:30PM – 12AM*
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <SectionTitle>Microscopy/Parasitology</SectionTitle>
          <Row id="urinalysis" label="Urinalysis" />
          <Row id="fecalysis" label="Fecalysis" />
          <Row id="pregnancy_test" label="Pregnancy Test" />

          <div style={{ marginTop: 10 }}>
            <SectionTitle>Serology</SectionTitle>
            <Row id="abo_rh_blood_typing" label="ABO, Rh Blood Typing" />
            <Row id="dengue_ns1" label="Dengue NS1" />
            <Row id="dengue_igg_igm" label="Dengue IgG, IgM" />
            <Row id="typhidot_igg_igm" label="Typhidot IgG/IgM" />
            <Row id="hbsag" label="HbsAg" />
            <Row id="ecg_12_lead" label="12 Lead ECG" />
            <Row id="gene_xpert" label="Gene Xpert" />
          </div>

          <div style={{ marginTop: 10 }}>
            <SectionTitle>Microbiology</SectionTitle>
            <Row id="afb_dssm" label="AFB/DSSM" />
            <Row id="culture_and_sensitivity" label="Culture and Sensitivity" />
          </div>

          <div style={{ marginTop: 10 }}>
            <SectionTitle>Others</SectionTitle>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, fontSize: 10, marginBottom: 5 }}>
              <span style={{ fontWeight: 600, minWidth: 70 }}>Ultrasound:</span>
              <span style={{ flex: 1, borderBottom: "1px solid #000", minHeight: 14, paddingLeft: 2 }}>{ultrasound}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, fontSize: 10, marginBottom: 5 }}>
              <span style={{ fontWeight: 600, minWidth: 70 }}>X-ray:</span>
              <span style={{ flex: 1, borderBottom: "1px solid #000", minHeight: 14, paddingLeft: 2 }}>{xray}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, fontSize: 10 }}>
              <span style={{ fontWeight: 600, minWidth: 70 }}>Others:</span>
              <span style={{ flex: 1, borderBottom: "1px solid #000", minHeight: 14, paddingLeft: 2 }}>{others}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer / Signature ── */}
      <div style={{ marginTop: 20, borderTop: "1px solid #000", paddingTop: 10, textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 11 }}>
          PAOLO GAYLORD S. VILLAFAÑE, MD, FPPS
        </div>
        <div style={{ fontSize: 10 }}>Municipal Health Officer</div>
        <div style={{ fontSize: 10 }}>Lic No. 89594</div>
      </div>
    </div>
  );
}

// ─── Preview/Print Modal ──────────────────────────────────────────────────────
function PreviewModal({
  open, name, age, gender, civilStatus, address, date,
  checked, ultrasound, xray, others, doctorName,
  onBack, onConfirm, saving,
}: {
  open: boolean; name: string; age: string; gender: string; civilStatus: string;
  address: string; date: string; checked: CheckedTests;
  ultrasound: string; xray: string; others: string; doctorName?: string;
  onBack: () => void; onConfirm: () => void; saving: boolean;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=700,height=900");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head>
      <title>Laboratory Request</title>
      <style>
        @page { size: A5 portrait; margin: 0; }
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        * { box-sizing: border-box; }
      </style>
      </head><body>${content}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1100, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 620,
        maxHeight: "95vh", display: "flex", flexDirection: "column",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
      }}>
        {/* Header */}
        <div style={{
          background: "#1a6b3a", borderRadius: "16px 16px 0 0",
          padding: "14px 20px", display: "flex",
          justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
            🧾 Laboratory Request Form
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePrint} style={{
              background: "#fff", color: "#1a6b3a", border: "none",
              borderRadius: 8, padding: "7px 16px", fontWeight: 700,
              fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              🖨 Print
            </button>
            <button onClick={onBack} style={{
              background: "rgba(255,255,255,0.2)", color: "#fff", border: "none",
              borderRadius: 8, padding: "7px 16px", fontWeight: 700,
              fontSize: 13, cursor: "pointer",
            }}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Scrollable form preview — exact same as print */}
        <div style={{ overflowY: "auto", flex: 1, background: "#f3f4f6", padding: 16 }}>
          <div ref={printRef} style={{
            background: "#fff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            borderRadius: 4,
          }}>
            <LabRequestFormPrint
              name={name} age={age} gender={gender} civilStatus={civilStatus}
              address={address} date={date} checked={checked}
              ultrasound={ultrasound} xray={xray} others={others}
              doctorName={doctorName}
            />
          </div>
        </div>

        {/* Footer — confirm to save */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid #e5e7eb",
          display: "flex", justifyContent: "flex-end", gap: 10,
          background: "#fafafa", borderRadius: "0 0 16px 16px", flexShrink: 0,
        }}>
          <button onClick={onBack} disabled={saving} style={{
            padding: "9px 22px", borderRadius: 8,
            border: "1px solid #d1d5db", background: "#fff",
            fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600, color: "#374151",
          }}>
            ← Back
          </button>
          <button onClick={onConfirm} disabled={saving} style={{
            padding: "9px 28px", borderRadius: 8, border: "none",
            background: saving ? "#6b7280" : "#1a6b3a",
            color: "#fff", fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer", fontWeight: 700,
          }}>
            {saving ? "Saving…" : "✓ Confirm & Send"}
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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
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

  function getTodayPH(): string {
    const d = new Date();
    d.setUTCHours(d.getUTCHours() + 8);
    return d.toISOString().slice(0, 10);
  }

  async function fetchTodayPatients() {
    const today = getTodayPH();
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
      setManualName(""); setManualAge(""); setManualGender("");
      setManualCivilStatus(""); setManualAddress("");
    }
  }

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const bool = (id: string) => !!checked[id];
  const hasAnyTest = Object.values(checked).some(Boolean) || !!ultrasound || !!xray || !!others;

  function hasUnsavedChanges() {
    const typedWithoutPatient = !patient && !selectedPatientId &&
      (manualName.trim() !== "" || manualAddress.trim() !== "");
    return hasAnyTest || typedWithoutPatient;
  }

  function requestClose() {
    if (saving) return;
    if (hasUnsavedChanges()) setShowCloseConfirm(true);
    else onClose();
  }

  function confirmClose() { setShowCloseConfirm(false); onClose(); }

  function handleReview() {
    if (!selectedPatientId && !manualName.trim()) {
      setError("Please select or enter a patient name."); return;
    }
    if (!hasAnyTest) {
      setError("Please select at least one test."); return;
    }
    setError(null);
    setShowPreview(true);
  }

  async function handleConfirmedSend() {
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase
      .from("laboratory_requests")
      .insert({
        patient_id: selectedPatientId || null,
        request_date: date,
        req_physician: doctorName || null,
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

    if (dbError) {
      setSaving(false);
      setShowPreview(false);
      setError(dbError.message);
      return;
    }

    await logAction("Requested laboratory test", "Laboratory Request", "doctor");
    setSaving(false);
    onSend();
    onClose();
  }

  async function retryFetch() {
    setFetchError(null);
    setLoadingPatients(true);
    await fetchTodayPatients();
  }

  const CheckRow = ({ id, label }: { id: string; label: string }) => (
    <label style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 8,
      background: checked[id] ? "#e6f4ec" : "#fff",
      border: `1px solid ${checked[id] ? "#1a6b3a" : "#d1d5db"}`,
      cursor: "pointer", fontSize: 13.5, transition: "all 0.15s",
    }}>
      <input type="checkbox" checked={!!checked[id]} onChange={() => toggle(id)}
        style={{ accentColor: "#1a6b3a", width: 16, height: 16, flexShrink: 0 }} />
      {label}
    </label>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div style={{
      background: "#1a6b3a", color: "#fff", padding: "7px 14px", borderRadius: 6,
      fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 10,
    }}>
      {title}
    </div>
  );

  const TestSection = ({ title, tests, note }: { title: string; tests: { id: string; label: string }[]; note?: React.ReactNode }) => (
    <div style={{ marginBottom: 18 }}>
      <SectionHeader title={title} />
      {note}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {tests.map((t) => <CheckRow key={t.id} id={t.id} label={t.label} />)}
      </div>
    </div>
  );

  const selectedCount = Object.values(checked).filter(Boolean).length +
    (ultrasound ? 1 : 0) + (xray ? 1 : 0) + (others ? 1 : 0);

  return (
    <>
      {/* Preview/Print Modal */}
      <PreviewModal
        open={showPreview}
        name={manualName} age={manualAge} gender={manualGender}
        civilStatus={manualCivilStatus} address={manualAddress}
        date={date} checked={checked}
        ultrasound={ultrasound} xray={xray} others={others}
        doctorName={doctorName}
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
            background: "#1a6b3a", padding: "16px 24px",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
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

          {/* Body */}
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            {/* LEFT: Patient info */}
            <div style={{
              width: 320, flexShrink: 0, borderRight: "1px solid #e5e7eb",
              overflowY: "auto", padding: "18px 20px", background: "#fcfdfc",
            }}>
              {fetchError && (
                <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#b91c1c", fontSize: 13 }}>
                  <div style={{ marginBottom: 6 }}>⚠ {fetchError}</div>
                  <button onClick={retryFetch} style={{ fontSize: 12, color: "#b91c1c", background: "none", border: "1px solid #fca5a5", borderRadius: 4, cursor: "pointer", padding: "2px 8px" }}>Retry</button>
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6b3a", letterSpacing: 1, marginBottom: 8 }}>SELECT FROM TODAY'S QUEUE</div>

              <select value={selectedPatientId} onChange={(e) => handlePatientSelect(e.target.value)} disabled={loadingPatients}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, marginBottom: 10, background: "#f0faf4", color: selectedPatientId ? "#111" : "#6b7280", cursor: loadingPatients ? "wait" : "default", boxSizing: "border-box" }}>
                <option value="">
                  {loadingPatients ? "Loading patients…" : patients.length === 0 && !fetchError ? "No patients in today's queue" : `— Choose a patient (${patients.length} today) —`}
                </option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.last_name}, {p.first_name}{p.middle_name ? ` ${p.middle_name}` : ""}
                  </option>
                ))}
              </select>

              <div style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", margin: "4px 0 14px" }}>or fill in manually</div>

              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Patient Name</label>
                <input value={manualName} onChange={(e) => { setManualName(e.target.value); setSelectedPatientId(""); }} style={inputStyle} placeholder="Full name" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
              </div>
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
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Civil Status</label>
                <input value={manualCivilStatus} onChange={(e) => setManualCivilStatus(e.target.value)} placeholder="Single / Married" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={fieldLabel}>Address</label>
                <input value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} placeholder="Barangay, Municipality, Province" style={inputStyle} />
              </div>
            </div>

            {/* RIGHT: Tests */}
            <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Select Tests</div>
                {selectedCount > 0 && (
                  <div style={{ background: "#1a6b3a", color: "#fff", borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                    {selectedCount} selected
                  </div>
                )}
              </div>

              <TestSection title="HEMATOLOGY" tests={HEMATOLOGY} />
              <TestSection title="BLOOD CHEMISTRY" tests={BLOOD_CHEMISTRY}
                note={
                  <div style={{ fontSize: 11, color: "#6b7280", fontStyle: "italic", marginBottom: 10, padding: "5px 10px", background: "#f9fafb", borderRadius: 4, borderLeft: "3px solid #1a6b3a" }}>
                    Fasting: 8–10 hours no food/water · Last meal: 10:30PM – 12AM
                  </div>
                }
              />
              <TestSection title="MICROSCOPY / PARASITOLOGY" tests={MICROSCOPY} />
              <TestSection title="SEROLOGY" tests={SEROLOGY} />
              <TestSection title="MICROBIOLOGY" tests={MICROBIOLOGY} />

              <div style={{ marginBottom: 6 }}>
                <SectionHeader title="OTHERS" />
                {[
                  { label: "Ultrasound", val: ultrasound, set: setUltrasound },
                  { label: "X-ray", val: xray, set: setXray },
                  { label: "Others", val: others, set: setOthers },
                ].map(({ label, val, set }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <label style={fieldLabel}>{label}</label>
                    <input value={val} onChange={(e) => set(e.target.value)} placeholder={`Specify ${label.toLowerCase()}…`} style={inputStyle} />
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#b91c1c", fontSize: 13 }}>
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
              <button onClick={requestClose} style={{ padding: "9px 24px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 600, color: "#374151" }}>
                CANCEL
              </button>
              <button onClick={handleReview} style={{ padding: "9px 28px", borderRadius: 8, border: "none", background: "#1a6b3a", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                Review & Send →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close confirm */}
      {showCloseConfirm && (
        <div onClick={() => setShowCloseConfirm(false)} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: "30px 34px", width: "min(380px, 90vw)", textAlign: "center", boxShadow: "0 14px 50px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Close without saving?</div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>Unsaved changes will be lost.</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setShowCloseConfirm(false)} style={{ padding: "10px 30px", borderRadius: 10, border: "none", background: "#f1f5f9", color: "#374151", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmClose} style={{ padding: "10px 30px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}