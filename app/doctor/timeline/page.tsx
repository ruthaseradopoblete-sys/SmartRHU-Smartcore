"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DoctorSidebar from "../../components/DoctorSidebar";
import DoctorTopbar from "../../components/DoctorTopbar";
import { supabase } from "@/lib/supabase";
import { fetchLabResults } from "@/app/Laboratory/components/LabService";
import { PrintLabForms } from "@/app/Laboratory/components/LabFormPrint";
import { generateLabRequestPDF } from "@/lib/Generatelabrequestpdf";
import styles from "./timeline.module.css";

type VisitType = "consultation" | "lab" | "prescription" | "follow-up" | "vaccination";
type ViewMode  = "all" | "active" | "archived";
type ExportCat = "consultation" | "lab_request" | "lab_result" | "prescription";
type ExportFmt = "excel" | "pdf" | "csv";

interface VisitEvent {
  id: string | number;
  date: string;
  type: VisitType;
  title: string;
  doctor: string;
  diagnosis: string;
  prescription?: string[];
  labTests?: string[];
  notes: string;
  bp?: string;
  temp?: string;
  weight?: string;
  status: "completed" | "ongoing" | "scheduled";
  followUpDate?: string;
  followUpNotes?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  labRequestId?: string;
  prescriptionId?: string;
  prescriptionStatus?: string;
  vaccineName?: string;
  vaccineDose?: string;
  vaccineLotNo?: string;
  nextDoseDate?: string;
  // for vaccine orders
  isVaccineOrder?: boolean;
  vaccineOrderStatus?: "pending" | "done";
  vaccinesOrdered?: string[];
}

interface TimelinePatient {
  id: string;
  name: string;
  age: string;
  gender: string;
  addr: string;
  barangay: string;
  philHealth: string;
  bloodType: string;
  conditions: string[];
  allergies: string[];
  visits: VisitEvent[];
  _visitCount?: number;
  _lastVisit?: string;
  _lastActivity?: string;
  _hasOngoing?: boolean;
  _hasActivityToday?: boolean;
}

const LAB_TEST_MAP: Record<string, string> = {
  hgb_hct: "Hgb/Hct",
  cbc_with_platelet: "CBC with Platelet",
  random_blood_sugar: "Random Blood Sugar",
  fasting_blood_sugar: "Fasting Blood Sugar",
  cholesterol: "Cholesterol",
  triglycerides: "Triglycerides",
  lipid_profile: "Lipid Profile",
  blood_uric_acid: "Blood Uric Acid",
  afb_dssm: "AFB/DSSM",
  culture_and_sensitivity: "Culture & Sensitivity",
  urinalysis: "Urinalysis",
  fecalysis: "Fecalysis",
  pregnancy_test: "Pregnancy Test",
  abo_rh_blood_typing: "ABO/Rh Blood Typing",
  dengue_ns1: "Dengue NS1",
  dengue_igg_igm: "Dengue IgG/IgM",
  hbsag: "HbsAg",
  gene_xpert: "Gene Xpert",
};

const DISEASE_KEYS: [string, string][] = [
  ["allergy", "Allergy"],
  ["asthma", "Asthma"],
  ["cancer", "Cancer"],
  ["cerebrovascular_disease", "Cerebrovascular Disease"],
  ["coronary_artery_disease", "Coronary Artery Disease"],
  ["diabetes_mellitus", "Diabetes Mellitus"],
  ["emphysema", "Emphysema"],
  ["epilepsy_seizure", "Epilepsy/Seizure"],
  ["hepatitis", "Hepatitis"],
  ["hyperlipidemia", "Hyperlipidemia"],
  ["hypertension", "Hypertension"],
  ["peptic_ulcer", "Peptic Ulcer"],
  ["pneumonia", "Pneumonia"],
  ["thyroid_disease", "Thyroid Disease"],
  ["ptb", "PTB"],
  ["urinary_tract_infection", "UTI"],
  ["mental_illness", "Mental Illness"],
];

const TYPE_COLOR: Record<VisitType, string> = {
  consultation: "#16a34a",
  lab: "#2563eb",
  prescription: "#7c3aed",
  "follow-up": "#d97706",
  vaccination: "#0891b2",
};
const TYPE_BG: Record<VisitType, string> = {
  consultation: "#dcfce7",
  lab: "#dbeafe",
  prescription: "#ede9fe",
  "follow-up": "#fef3c7",
  vaccination: "#cffafe",
};
const TYPE_LABEL: Record<VisitType, string> = {
  consultation: "Consultation",
  lab: "Lab Results",
  prescription: "Prescription",
  "follow-up": "Follow-up",
  vaccination: "Vaccination",
};
const TYPE_ICON: Record<VisitType, string> = {
  consultation: "🩺",
  lab: "📊",
  prescription: "💊",
  "follow-up": "🔁",
  vaccination: "💉",
};

const EXPORT_CATS: { key: ExportCat; label: string; icon: string; excelLabel: string; color: string; bg: string }[] = [
  { key: "consultation", label: "Consultation", icon: "🩺", excelLabel: "CONSULTATION", color: "#166534", bg: "#dcfce7" },
  { key: "lab_request",  label: "Lab Request",  icon: "🧪", excelLabel: "LAB REQUEST",  color: "#1e40af", bg: "#dbeafe" },
  { key: "lab_result",   label: "Lab Result",   icon: "📊", excelLabel: "LAB RESULT",   color: "#6d28d9", bg: "#ede9fe" },
  { key: "prescription", label: "Prescription", icon: "💊", excelLabel: "PRESCRIPTION", color: "#9a3412", bg: "#ffedd5" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(n: string) {
  return n.split(" ").map((x) => x[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}
function fmtDate(iso: string) {
  const d = toDateOnly(iso);
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}
function fmtDateShort(iso: string) {
  const d = toDateOnly(iso);
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
function checkedList(obj: any, keys: [string, string][]) {
  if (!obj) return [];
  return keys.filter(([k]) => obj[k] === true).map(([, l]) => l);
}
function daysUntil(iso: string) {
  const norm = toDateOnly(iso);
  if (!norm) return NaN;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(norm + "T00:00:00"); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}
function ageInRange(age: string, group: string) {
  if (group === "All Ages") return true;
  const n = parseInt(age) || 0;
  if (group === "0–17") return n <= 17;
  if (group === "18–35") return n >= 18 && n <= 35;
  if (group === "36–60") return n >= 36 && n <= 60;
  if (group === "60+") return n >= 61;
  return true;
}
function toCSV(rows: any[]) {
  if (!rows.length) return "";
  const h = Object.keys(rows[0]);
  return [h.join(","), ...rows.map((r) =>
    h.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
  )].join("\n");
}
function downloadFile(c: string, f: string, m: string) {
  const b = new Blob([c], { type: m });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = f; a.click();
  URL.revokeObjectURL(u);
}

function phtDateStr(): string {
  const d = new Date();
  return new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function phtCurrentYear(): number {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCFullYear();
}

function toDateOnly(s: string | null | undefined): string {
  if (!s) return "";
  const str = String(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str.includes("T") ? str : str.replace(" ", "T"));
  if (isNaN(d.getTime())) return str.slice(0, 10);
  return new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function yearOf(dateStr: string | null | undefined): number {
  const d = toDateOnly(dateStr);
  if (!d) return NaN;
  return parseInt(d.slice(0, 4), 10);
}

function buildExportRows(visits: VisitEvent[]): Record<ExportCat, any[]> {
  const out: Record<ExportCat, any[]> = {
    consultation: [], lab_request: [], lab_result: [], prescription: [],
  };
  [...visits].sort((a, b) => b.date.localeCompare(a.date)).forEach((v) => {
    if (v.type === "consultation")
      out.consultation.push({
        Date: fmtDate(v.date), Title: v.title, Doctor: v.doctor,
        Subjective: v.subjective ?? "", Objective: v.objective ?? "",
        Assessment: v.assessment ?? "", Plan: v.plan ?? "",
        BP: v.bp ?? "", Temp: v.temp ?? "", Weight: v.weight ?? "", Status: v.status,
      });
    if (v.type === "lab")
      out.lab_request.push({ Date: fmtDate(v.date), Doctor: v.doctor, Tests: (v.labTests ?? []).join(", "), Status: v.status });
    if (v.type === "prescription")
      out.prescription.push({
        Date: fmtDate(v.date), Doctor: v.doctor,
        Medicine: v.title.replace("Prescription — ", ""),
        Details: (v.prescription ?? []).join(", "), Notes: v.notes,
        Status: v.prescriptionStatus === "dispensed" ? "Dispensed" : "Pending",
      });
  });
  return out;
}

// ── localStorage — manual archive only ───────────────────────────────────────
const LS_KEY = "smartrhu_archived_v3";
function loadArchivedFromStorage(): Set<string> {
  try {
    ["smartrhu_archived", "smartrhu_archived_v2", "smartrhu_manual_overrides"].forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });
    const saved = localStorage.getItem(LS_KEY);
    return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
  } catch { return new Set<string>(); }
}
function saveArchivedToStorage(ids: Set<string>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...ids])); } catch {}
}

// ══ LAB RESULT ════════════════════════════════════════════════════════════════
const G_TAB = "#1a7a1a";

function hasValues(obj: any): boolean {
  if (!obj) return false;
  return Object.values(obj).some((v) => v !== null && v !== undefined && v !== "");
}

function mapChemistry(c: any) {
  return {
    rbs: c.rbs||"", fbs: c.fbs||"", uricAcid: c.blood_uric_acid||"",
    totalCholesterol: c.cholesterol||"", triglycerides: c.triglycerides||"",
    hdl: c.hdl||"", ldl: c.ldl||"", remarks: c.remarks||"",
    lastMeal: c.last_meal||"", timeOfExtraction: c.time_of_extraction||"",
  };
}
function mapUrinalysis(u: any) {
  return {
    color: u.color||"", consistency: u.consistency||"", specificGravity: u.specific_gravity||"",
    phReaction: u.ph_reaction||"", protein: u.protein||"", sugar: u.sugar||"",
    wbcPusCell: u.wbc_pus_cell||"", redBloodCell: u.rbc||"", epithelialCell: u.epithelial_cell||"",
    amorphousSubs: u.amorphous_subs||"", mucusThread: u.mucus_thread||"",
    bacteria: u.bacteria||"", others: u.others||"",
  };
}
function mapFecalysis(f: any) {
  return {
    color: f.color||"", consistency: f.consistency||"", wbcPusCell: f.wbc_pus_cell||"",
    redBloodCell: f.rbc||"", parasite: f.parasite||"", others: f.others||"",
  };
}
function mapHematology(h: any) {
  return {
    hemoglobin: h.hgb||"", hematocrit: h.hct||"", rbcCount: h.rbc||"", wbcCount: h.wbc||"",
    plateletCount: h.platelet_count||"", neutrophil: h.neutrophils||"", lymphocytes: h.lymphocytes||"",
    monocytes: h.monocytes||"", eosinophil: h.eosinophils||"", basophil: h.basophils||"",
    total: h.total||"", bloodType: h.blood_type||"", others: h.others||"", remarks: h.remarks||"",
  };
}

function deriveRequestCategories(labTests: string[]): string[] {
  const cats: string[] = [];
  const hemTests = ["Hgb/Hct", "CBC with Platelet"];
  const chemTests = ["Random Blood Sugar", "Fasting Blood Sugar", "Cholesterol", "Triglycerides", "Lipid Profile", "Blood Uric Acid"];
  const seroTests = ["Dengue NS1", "Dengue IgG/IgM", "HbsAg", "Pregnancy Test", "ABO/Rh Blood Typing"];
  if (labTests.some(t => hemTests.includes(t)))  cats.push("Hematology");
  if (labTests.some(t => chemTests.includes(t))) cats.push("Clinical Chemistry");
  if (labTests.includes("Urinalysis"))            cats.push("Urinalysis");
  if (labTests.includes("Fecalysis"))             cats.push("Fecalysis");
  if (labTests.some(t => seroTests.includes(t))) cats.push("Serology");
  return cats;
}

function LabResultFull({ requestId, visit, patient }: {
  requestId: string; visit: VisitEvent; patient: TimelinePatient;
}) {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("");
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchLabResults(requestId)
      .then((res) => {
        setData(res);
        const tabs: string[] = [];
        if (res.chemistry  && Object.keys(res.chemistry).length  > 0) tabs.push("Clinical Chemistry");
        if (res.hematology && Object.keys(res.hematology).length > 0) tabs.push("Hematology");
        if (res.urinalysis && Object.keys(res.urinalysis).length > 0) tabs.push("Urinalysis");
        if (res.fecalysis  && Object.keys(res.fecalysis).length  > 0) tabs.push("Fecalysis");
        if ((res.serology || []).length > 0)                           tabs.push("Serology");
        const orderedCats = deriveRequestCategories(visit.labTests ?? []);
        orderedCats.forEach((cat) => { if (!tabs.includes(cat)) tabs.push(cat); });
        setTab(tabs[0] || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error("[LabResultFull] fetchLabResults error:", err);
        setError("Failed to load results.");
        setLoading(false);
      });
  }, [requestId]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "18px 0", color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #16a34a", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      Loading results…
    </div>
  );

  if (error) return (
    <div style={{ fontSize: 12, color: "#ef4444", padding: "10px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
      ❌ {error}
    </div>
  );

  if (!data) return null;

  const chem = data.chemistry  || {};
  const hem  = data.hematology || {};
  const uri  = data.urinalysis || {};
  const fec  = data.fecalysis  || {};
  const ser: any[] = data.serology || [];

  const avail: string[] = [];
  if (Object.keys(chem).length > 0) avail.push("Clinical Chemistry");
  if (Object.keys(hem ).length > 0) avail.push("Hematology");
  if (Object.keys(uri ).length > 0) avail.push("Urinalysis");
  if (Object.keys(fec ).length > 0) avail.push("Fecalysis");
  if (ser.length > 0)               avail.push("Serology");

  const orderedCats = deriveRequestCategories(visit.labTests ?? []);
  orderedCats.forEach((cat) => { if (!avail.includes(cat)) avail.push(cat); });

  if (!avail.length) return (
    <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", padding: "10px 0" }}>
      No results entered yet.
    </div>
  );

  const active = tab || avail[0];

  const tabHasData = (() => {
    if (active === "Clinical Chemistry") return hasValues(chem);
    if (active === "Hematology")         return hasValues(hem);
    if (active === "Urinalysis")         return hasValues(uri);
    if (active === "Fecalysis")          return hasValues(fec);
    if (active === "Serology")           return ser.some((r: any) => r.result || r.test_kit || r.lot_number);
    return false;
  })();

  const request = {
    name: patient.name || "",
    address: patient.addr || patient.barangay || "",
    reqPhysician: visit.doctor || "",
    request_date: visit.date || "",
    age: patient.age || "",
    gender: patient.gender === "Female" ? "F" : patient.gender === "Male" ? "M" : "",
  };
  const results = {
    chemistry:  mapChemistry(chem),
    urinalysis: mapUrinalysis(uri),
    fecalysis:  mapFecalysis(fec),
    hematology: mapHematology(hem),
    serology:   ser,
  };
  const selTestMap: Record<string, string> = {
    "Clinical Chemistry": "Clinical Chemistry",
    Hematology:  "Hematology",
    Urinalysis:  "Urinalysis",
    Fecalysis:   "Fecalysis",
    Serology:    "Serology",
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginTop: 4, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", borderBottom: "2px solid #e8f5e9", background: "#f9fef9", padding: "0 10px", gap: 2, overflowX: "auto", alignItems: "center" }}>
        {avail.map((t) => {
          const hasDat = (() => {
            if (t === "Clinical Chemistry") return hasValues(chem);
            if (t === "Hematology")         return hasValues(hem);
            if (t === "Urinalysis")         return hasValues(uri);
            if (t === "Fecalysis")          return hasValues(fec);
            if (t === "Serology")           return ser.some((r: any) => r.result || r.test_kit || r.lot_number);
            return false;
          })();
          return (
            <button key={t} onClick={(e) => { e.stopPropagation(); setTab(t); }}
              style={{
                border: "none",
                background: active === t ? "#fff" : "transparent",
                borderBottom: active === t ? `2.5px solid ${G_TAB}` : "2.5px solid transparent",
                color: active === t ? "#145214" : "#9ca3af",
                fontWeight: active === t ? 800 : 500,
                fontSize: 10, padding: "7px 12px", cursor: "pointer",
                fontFamily: "inherit", marginBottom: -2, whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 4,
              }}>
              {t}
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: hasDat ? "#16a34a" : "#f59e0b",
                boxShadow: hasDat ? "0 0 0 2px #dcfce7" : "0 0 0 2px #fef3c7",
              }} />
            </button>
          );
        })}
        <div style={{ marginLeft: "auto", paddingRight: 8, flexShrink: 0 }}>
          {visit.status === "completed" ? (
            <span style={{ fontSize: 9, fontWeight: 700, background: "#dcfce7", color: "#166634", border: "1px solid #a7f3d0", borderRadius: 20, padding: "2px 8px", letterSpacing: 0.5 }}>
              COMPLETED
            </span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 700, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 20, padding: "2px 8px", letterSpacing: 0.5 }}>
              PENDING
            </span>
          )}
        </div>
      </div>

      {tabHasData ? (
        <PrintLabForms
          request={request}
          results={results}
          selTest={selTestMap[active] || active}
        />
      ) : (
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "#fffbeb" }}>
          <div style={{ fontSize: 28 }}>⏳</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>
            Awaiting {active} Results
          </div>
          <div style={{ fontSize: 11, color: "#a16207", textAlign: "center", maxWidth: 260 }}>
            This test was ordered. Results will appear here once the laboratory has entered them.
          </div>
          {visit.labTests && visit.labTests.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 4 }}>
              {visit.labTests
                .filter(t => {
                  if (active === "Hematology")         return ["Hgb/Hct","CBC with Platelet"].includes(t);
                  if (active === "Clinical Chemistry")  return ["Random Blood Sugar","Fasting Blood Sugar","Cholesterol","Triglycerides","Lipid Profile","Blood Uric Acid"].includes(t);
                  if (active === "Urinalysis")          return t === "Urinalysis";
                  if (active === "Fecalysis")           return t === "Fecalysis";
                  if (active === "Serology")            return ["Dengue NS1","Dengue IgG/IgM","HbsAg","Pregnancy Test","ABO/Rh Blood Typing"].includes(t);
                  return false;
                })
                .map(t => (
                  <span key={t} style={{ fontSize: 10, fontWeight: 700, background: "#fff", border: "1px solid #fcd34d", borderRadius: 20, padding: "3px 10px", color: "#92400e" }}>
                    🧪 {t}
                  </span>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══ PRESCRIPTION BODY ════════════════════════════════════════════════════════
function PrescriptionBody({ visit }: { visit: VisitEvent }) {
  const [status,  setStatus]  = useState(visit.prescriptionStatus ?? "sent");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const isDone = status === "dispensed";
  async function confirmDispense() {
    if (!visit.prescriptionId) return;
    setLoading(true); setError("");
    const { error: err } = await supabase.from("prescriptions").update({ status: "dispensed" }).eq("id", visit.prescriptionId);
    if (err) { setError(err.message); setLoading(false); return; }
    setStatus("dispensed"); setLoading(false);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
        background: isDone ? "linear-gradient(90deg,#f0fdf4,#dcfce7)" : "linear-gradient(90deg,#fffbeb,#fef9c3)",
        border: `1.5px solid ${isDone ? "#86efac" : "#fcd34d"}` }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: isDone ? "#dcfce7" : "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          {isDone ? "✅" : "⏳"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: isDone ? "#166534" : "#92400e" }}>
            {isDone ? "Medicine Dispensed" : "Awaiting Pharmacy Confirmation"}
          </div>
          <div style={{ fontSize: 11, color: isDone ? "#4b7a4b" : "#a16207", marginTop: 2 }}>
            {isDone ? "Patient has received their medicine." : "Prescription sent — pending pharmacy release."}
          </div>
        </div>
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
          textTransform: "uppercase", padding: "4px 12px", borderRadius: 99,
          background: isDone ? "#16a34a" : "#f59e0b", color: "#fff" }}>
          {isDone ? "Done" : "Pending"}
        </span>
      </div>
      {!!visit.prescription?.length && (
        <div>
          <div className={styles.sectionLabel}>Medicine</div>
          <div className={styles.rxPillList}>
            {visit.prescription.map((rx) => (
              <span key={rx} style={{ display: "inline-flex", alignItems: "center", gap: 6,
                background: isDone ? "#f0fdf4" : "#fef9c3", border: `1px solid ${isDone ? "#d1fae5" : "#fde68a"}`,
                borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600,
                color: isDone ? "#166534" : "#92400e" }}>
                💊 {rx}
              </span>
            ))}
          </div>
        </div>
      )}
      {visit.notes && <div><div className={styles.sectionLabel}>Notes</div><div className={styles.notesBox}>{visit.notes}</div></div>}
      {!isDone && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {error && <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>❌ {error}</div>}
          <button onClick={(e) => { e.stopPropagation(); confirmDispense(); }} disabled={loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px 18px", borderRadius: 10, border: "none",
              background: loading ? "#86efac" : "linear-gradient(135deg,#064e3b,#16a34a)",
              color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "DM Sans,sans-serif",
              cursor: loading ? "not-allowed" : "pointer", transition: "all .15s", alignSelf: "flex-start" }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.opacity = "0.88"; }}
            onMouseOut={(e)  => { if (!loading) e.currentTarget.style.opacity = "1"; }}>
            {loading ? <><span style={{ animation: "spin .7s linear infinite", display: "inline-block" }}>⏳</span> Confirming…</> : <>✅ Confirm — Medicine Given to Patient</>}
          </button>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>This will mark the prescription as dispensed and update the patient's record.</div>
        </div>
      )}
    </div>
  );
}

// ══ VACCINATION BODY ═════════════════════════════════════════════════════════
function VaccinationBody({ visit }: { visit: VisitEvent }) {
  const fuDays = visit.nextDoseDate ? daysUntil(visit.nextDoseDate) : null;
  const fuUp   = fuDays !== null && !isNaN(fuDays) && fuDays >= 0;

  // Detect if this is a vaccine ORDER (from doctor→nurse) vs actual vaccination record
  const isVaccineOrder  = visit.isVaccineOrder === true;
  const orderStatus     = visit.vaccineOrderStatus ?? "pending";
  const isPending       = orderStatus === "pending";
  const vaccinesOrdered = visit.vaccinesOrdered ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Vaccine ORDER status banner ── */}
      {isVaccineOrder && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 10,
          background: isPending
            ? "linear-gradient(90deg,#fffbeb,#fef9c3)"
            : "linear-gradient(90deg,#f0fdf4,#dcfce7)",
          border: `1.5px solid ${isPending ? "#fcd34d" : "#86efac"}`,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: isPending ? "#fef3c7" : "#dcfce7",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>
            {isPending ? "⏳" : "✅"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: isPending ? "#92400e" : "#166534" }}>
              {isPending ? "Pending — Awaiting Nurse Administration" : "Vaccine Administered by Nurse"}
            </div>
            <div style={{ fontSize: 11, color: isPending ? "#a16207" : "#4b7a4b", marginTop: 2 }}>
              {isPending
                ? "Doctor has ordered this vaccine. Nurse has not yet administered it."
                : "Nurse has marked this vaccine order as administered."}
            </div>
          </div>
          <span style={{
            flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
            textTransform: "uppercase", padding: "4px 12px", borderRadius: 99,
            background: isPending ? "#f59e0b" : "#16a34a", color: "#fff",
          }}>
            {isPending ? "Pending" : "Done"}
          </span>
        </div>
      )}

      {/* ── Vaccines ordered (pill list) ── */}
      {isVaccineOrder && vaccinesOrdered.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Vaccines Ordered</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {vaccinesOrdered.map((v) => (
              <span key={v} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: isPending ? "#fef9c3" : "#f0fdf4",
                border: `1px solid ${isPending ? "#fde68a" : "#d1fae5"}`,
                borderRadius: 20, padding: "5px 12px",
                fontSize: 12, fontWeight: 600,
                color: isPending ? "#92400e" : "#166534",
              }}>
                💉 {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Actual vaccination details (non-order records) ── */}
      {!isVaccineOrder && (visit.vaccineName || visit.vaccineDose || visit.vaccineLotNo) && (
        <div>
          <div className={styles.sectionLabel}>Vaccination Details</div>
          <div className={styles.vitalsRow}>
            {visit.vaccineName && (
              <div className={styles.vitalChip}>
                💉 <span style={{ color: "#9ca3af" }}>Vaccine</span> <strong>{visit.vaccineName}</strong>
              </div>
            )}
            {visit.vaccineDose && (
              <div className={styles.vitalChip}>
                📊 <span style={{ color: "#9ca3af" }}>Dose</span> <strong>{visit.vaccineDose}</strong>
              </div>
            )}
            {visit.vaccineLotNo && (
              <div className={styles.vitalChip}>
                🏷️ <span style={{ color: "#9ca3af" }}>Lot No.</span> <strong>{visit.vaccineLotNo}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {visit.notes && (
        <div>
          <div className={styles.sectionLabel}>Notes</div>
          <div className={styles.notesBox}>{visit.notes}</div>
        </div>
      )}

      {/* ── Next dose (only for actual vaccination records) ── */}
      {!isVaccineOrder && visit.nextDoseDate && (
        <div>
          <div className={styles.sectionLabel}>Next Dose Schedule</div>
          <div className={styles.followUpBox}>
            <div className={styles.followUpBoxDate}>📅 {fmtDate(visit.nextDoseDate)}</div>
            {fuDays !== null && !isNaN(fuDays) && (
              <span className={styles.followUpCountdown}>
                {fuUp
                  ? (fuDays === 0 ? "Today" : fuDays === 1 ? "Tomorrow" : `${fuDays} days away`)
                  : (fuDays === -1 ? "Yesterday" : `${Math.abs(fuDays)} days ago`)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══ VISIT CARD ════════════════════════════════════════════════════════════════
function VisitCard({ visit, patient }: { visit: VisitEvent; patient: TimelinePatient }) {
  const [open, setOpen] = useState(false);
  const color  = TYPE_COLOR[visit.type];
  const bg     = TYPE_BG[visit.type];
  const icon   = visit.isVaccineOrder ? "📋💉" : TYPE_ICON[visit.type];
  const label  = visit.isVaccineOrder ? "Vaccine Order" : TYPE_LABEL[visit.type];
  const fuDays = visit.followUpDate ? daysUntil(visit.followUpDate) : null;
  const fuUp   = fuDays !== null && !isNaN(fuDays) && fuDays >= 0;
  const d      = visit.date ? new Date(visit.date + "T00:00:00") : null;

  // For vaccine orders, use teal color scheme same as vaccination
  const cardColor = color;
  const cardBg    = bg;

  // Status pill logic — vaccine orders override default
  const statusBg = (() => {
    if (visit.isVaccineOrder) {
      return visit.vaccineOrderStatus === "done" ? "#dcfce7" : "#fef9c3";
    }
    return visit.status === "completed" ? "#f3f4f6" : visit.status === "ongoing" ? "#fef9c3" : "#dbeafe";
  })();
  const statusColor = (() => {
    if (visit.isVaccineOrder) {
      return visit.vaccineOrderStatus === "done" ? "#166534" : "#92400e";
    }
    return visit.status === "completed" ? "#6b7280" : visit.status === "ongoing" ? "#92400e" : "#1e40af";
  })();
  const statusLabel = (() => {
    if (visit.isVaccineOrder) {
      return visit.vaccineOrderStatus === "done" ? "Administered" : "Pending";
    }
    return visit.status === "completed" ? "Done" : visit.status === "ongoing" ? "In Progress" : "Scheduled";
  })();

  return (
    <div className={styles.visitCard}>
      <div className={styles.visitDot} style={{ background: cardColor, boxShadow: `0 0 0 3px #f7fbf8,0 0 0 5px ${cardColor}40` }} />
      <div className={`${styles.visitCardInner} ${open ? styles.visitCardOpen : ""} ${visit.type === "follow-up" ? styles.visitCardFollowUp : ""}`}
        onClick={() => setOpen((o) => !o)}>
        {visit.type === "follow-up" && visit.followUpDate && fuUp && (
          <div className={styles.followUpBanner}>
            <span className={styles.followUpBannerDot} />
            Upcoming Follow-up
            <span className={styles.followUpBannerDate}>{fuDays === 0 ? "Today" : fuDays === 1 ? "Tomorrow" : `In ${fuDays} days`}</span>
          </div>
        )}
        <div className={styles.visitHeader}>
          {d && (
            <div className={styles.visitDateBlock}>
              <div className={styles.visitDay} style={{ color: cardColor }}>{d.getDate()}</div>
              <div className={styles.visitMonth}>{d.toLocaleDateString("en-PH", { month: "short" })}</div>
              <div className={styles.visitYear}>{d.getFullYear()}</div>
            </div>
          )}
          <div className={styles.visitDivider} />
          <div className={styles.visitMain}>
            <div className={styles.visitTypeBadges}>
              <span className={styles.typePill} style={{ background: cardBg, color: cardColor }}>{icon} {label}</span>
              <span className={styles.statusPill} style={{ background: statusBg, color: statusColor }}>{statusLabel}</span>
            </div>
            <div className={styles.visitTitle}>{visit.title}</div>
            {visit.doctor && <div className={styles.visitDoctor}>Dr. {visit.doctor}</div>}
          </div>
          <svg className={`${styles.visitChevron} ${open ? styles.visitChevronOpen : ""}`}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {open && (
          <div className={styles.visitBody} onClick={(e) => e.stopPropagation()}>
            {visit.type === "consultation" && (
              <>
                {(visit.bp || visit.temp || visit.weight) && (
                  <div>
                    <div className={styles.sectionLabel}>Vitals</div>
                    <div className={styles.vitalsRow}>
                      {visit.bp     && <div className={styles.vitalChip}>❤️ <span style={{ color: "#9ca3af" }}>BP</span> <strong>{visit.bp} mmHg</strong></div>}
                      {visit.temp   && <div className={styles.vitalChip}>🌡️ <span style={{ color: "#9ca3af" }}>Temp</span> <strong>{visit.temp}</strong></div>}
                      {visit.weight && <div className={styles.vitalChip}>⚖️ <span style={{ color: "#9ca3af" }}>Wt</span> <strong>{visit.weight}</strong></div>}
                    </div>
                  </div>
                )}
                {(visit.subjective || visit.objective || visit.assessment || visit.plan) && (
                  <div>
                    <div className={styles.sectionLabel}>SOAP Notes</div>
                    <div className={styles.soapSection}>
                      {visit.subjective && <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}><div style={{ fontSize: 10, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>💬 Subjective</div><div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{visit.subjective}</div></div>}
                      {visit.objective  && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}><div style={{ fontSize: 10, fontWeight: 800, color: "#166534", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>🔍 Objective</div><div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{visit.objective}</div></div>}
                      {visit.assessment && <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}><div style={{ fontSize: 10, fontWeight: 800, color: "#9a3412", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>📋 Assessment</div><div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{visit.assessment}</div></div>}
                      {visit.plan       && <div style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "10px 12px" }}><div style={{ fontSize: 10, fontWeight: 800, color: "#6d28d9", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>🎯 Plan</div><div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{visit.plan}</div></div>}
                    </div>
                  </div>
                )}
                {visit.followUpDate && (
                  <div>
                    <div className={styles.sectionLabel}>Follow-up Schedule</div>
                    <div className={styles.followUpBox}>
                      <div className={styles.followUpBoxDate}>📅 {fmtDate(visit.followUpDate)}</div>
                      {visit.followUpNotes && <div className={styles.followUpBoxNotes}>{visit.followUpNotes}</div>}
                    </div>
                  </div>
                )}
              </>
            )}
            {visit.type === "prescription" && <PrescriptionBody visit={visit} />}
            {visit.type === "vaccination" && <VaccinationBody visit={visit} />}
            {visit.type === "lab" && (
              <>
                {!!visit.labTests?.length && (
                  <div>
                    <div className={styles.sectionLabel}>Tests Ordered</div>
                    <div className={styles.labGrid}>
                      {visit.labTests.map((t) => <div key={t} className={styles.labItem}><div className={styles.labCheck}>✓</div>{t}</div>)}
                    </div>
                  </div>
                )}
                {visit.labRequestId && (
                  <div>
                    <div className={styles.sectionLabel} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Lab Results
                      {visit.status !== "completed" && (
                        <span style={{ fontSize: 9, fontWeight: 700, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 20, padding: "1px 7px" }}>
                          PENDING
                        </span>
                      )}
                    </div>
                    <LabResultFull requestId={visit.labRequestId} visit={visit} patient={patient} />
                  </div>
                )}
              </>
            )}
            {visit.type === "follow-up" && visit.followUpDate && (
              <div>
                <div className={styles.sectionLabel}>Follow-up Schedule</div>
                <div className={styles.followUpBox}>
                  <div className={styles.followUpBoxDate}>📅 {fmtDate(visit.followUpDate)}</div>
                  {visit.followUpNotes && <div className={styles.followUpBoxNotes}>{visit.followUpNotes}</div>}
                  {fuDays !== null && !isNaN(fuDays) && (
                    <span className={styles.followUpCountdown}>
                      {fuUp ? (fuDays === 0 ? "Today" : fuDays === 1 ? "Tomorrow" : `${fuDays} days away`) : (fuDays === -1 ? "Yesterday" : `${Math.abs(fuDays)} days ago`)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══ MAIN PAGE ═════════════════════════════════════════════════════════════════
export default function PatientTimeline() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const rootRef   = useRef<HTMLDivElement>(null!);
  const exportRef = useRef<HTMLDivElement>(null!);

  const [patients,      setPatients]      = useState<TimelinePatient[]>([]);
  const [selected,      setSelected]      = useState<TimelinePatient | null>(null);
  const [visitFilter,   setVisitFilter]   = useState<VisitType | "all">("all");
  const [loadingList,   setLoadingList]   = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search,        setSearch]        = useState("");
  const [topSearch,     setTopSearch]     = useState("");
  const [viewMode,      setViewMode]      = useState<ViewMode>("all");
  const [gender,        setGender]        = useState<"All" | "Female" | "Male">("All");
  const [ageGroup,      setAgeGroup]      = useState("All Ages");
  const [barangay,      setBarangay]      = useState("All Barangays");
  const [sortBy,        setSortBy]        = useState<"az" | "za" | "newest" | "oldest" | "mostVisits">("newest");
  const [exportOpen,    setExportOpen]    = useState(false);
  const [selectedCats,  setSelectedCats]  = useState<Set<ExportCat>>(new Set());
  const [exporting,     setExporting]     = useState(false);
  const [exportDone,    setExportDone]    = useState(false);
  const [archivedIds,   setArchivedIds]   = useState<Set<string>>(() => loadArchivedFromStorage());

  const selectedIdRef   = useRef<string | null>(null);
  const prevFilterKey   = useRef("");
  const prevPatientsLen = useRef(0);

  useEffect(() => { selectedIdRef.current = selected?.id ?? null; }, [selected?.id]);

  const barangayOptions = useMemo(() => [
    "All Barangays",
    ...Array.from(new Set(patients.map((p) => p.barangay).filter(Boolean))).sort(),
  ], [patients]);

  const currentYear = useMemo(() => phtCurrentYear(), []);
  const isArchived = useCallback((p: TimelinePatient) => {
    if (archivedIds.has(p.id)) return true;
    const last = p._lastActivity || p._lastVisit || "";
    if (!last) return false;
    const year = yearOf(last);
    return !isNaN(year) && year < currentYear;
  }, [archivedIds, currentYear]);

  const filteredPatients = useMemo(() =>
    patients.filter((p) => {
      if (viewMode === "archived") return isArchived(p);
      if (isArchived(p))  return false;
      if (viewMode === "active" && !p._hasActivityToday) return false;
      if (gender !== "All" && p.gender !== gender) return false;
      if (!ageInRange(p.age, ageGroup)) return false;
      if (barangay !== "All Barangays" && p.barangay !== barangay) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.barangay.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "az")         return a.name.localeCompare(b.name);
      if (sortBy === "za")         return b.name.localeCompare(a.name);
      if (sortBy === "mostVisits") return (b._visitCount ?? 0) - (a._visitCount ?? 0);
      if (sortBy === "newest")     return (b._lastVisit ?? "").localeCompare(a._lastVisit ?? "");
      if (sortBy === "oldest")     return (a._lastVisit ?? "").localeCompare(b._lastVisit ?? "");
      return 0;
    }),
  [patients, viewMode, archivedIds, isArchived, gender, ageGroup, barangay, search, sortBy]);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!exportOpen) return;
    const h = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [exportOpen]);

  // ── Fetch patient list ────────────────────────────────────────────────────
  const fetchPatients = useCallback(async () => {
    setLoadingList(true);
    const today = phtDateStr();

    const PAGE = 1000;
    async function fetchAll(make: (from: number, to: number) => any): Promise<any[]> {
      const out: any[] = [];
      for (let i = 0; i < 50; i++) {
        const { data, error } = await make(i * PAGE, i * PAGE + PAGE - 1);
        if (error || !data || data.length === 0) break;
        out.push(...data);
        if (data.length < PAGE) break;
      }
      return out;
    }

    const [pData, physData, medData, cData, prescData, labData, vaxData, vaxOrderData, todayRows] = await Promise.all([
      fetchAll((f, t) => supabase.from("patients")
        .select("id,first_name,last_name,age,sex,purok,barangay,municipality,philhealth_pin")
        .order("last_name", { ascending: true }).range(f, t)),
      fetchAll((f, t) => supabase.from("physical_exam_findings")
        .select("patient_id,blood_type").range(f, t)),
      fetchAll((f, t) => supabase.from("past_medical_history")
        .select("patient_id," + DISEASE_KEYS.map(([k]) => k).join(",") + ",allergy_specify").range(f, t)),
      fetchAll((f, t) => supabase.from("soap_consultations")
        .select("patient_id,queue_date,consultation_date,status")
        .order("queue_date", { ascending: false }).range(f, t)),
      fetchAll((f, t) => supabase.from("prescriptions")
        .select("patient_id,prescription_date")
        .order("prescription_date", { ascending: false }).range(f, t)),
      fetchAll((f, t) => supabase.from("laboratory_requests")
        .select("patient_id,request_date")
        .order("request_date", { ascending: false }).range(f, t)),
      fetchAll((f, t) => supabase.from("vaccinations")
        .select("patient_id,vaccination_date")
        .order("vaccination_date", { ascending: false }).range(f, t)),
      // ── NEW: fetch vaccine orders for last-activity tracking ──
      fetchAll((f, t) => supabase.from("patient_vaccine_orders")
        .select("patient_id,created_at")
        .order("created_at", { ascending: false }).range(f, t)),
      supabase.from("soap_consultations").select("patient_id").eq("queue_date", today)
        .then((r) => r.data ?? []),
    ]);

    if (!pData.length) { setLoadingList(false); return; }

    const todaySet = new Set<string>((todayRows ?? []).map((r: any) => r.patient_id));

    const bloodMap: Record<string, string> = {};
    (physData ?? []).forEach((p: any) => { if (p.blood_type) bloodMap[p.patient_id] = p.blood_type; });

    const medMap: Record<string, any> = {};
    (medData ?? []).forEach((m: any) => { medMap[m.patient_id] = m; });

    const prescDateMap: Record<string, string> = {};
    (prescData ?? []).forEach((p: any) => {
      const d = toDateOnly(p.prescription_date);
      if (d && (!prescDateMap[p.patient_id] || d > prescDateMap[p.patient_id]))
        prescDateMap[p.patient_id] = d;
    });

    const labDateMap: Record<string, string> = {};
    (labData ?? []).forEach((l: any) => {
      const d = toDateOnly(l.request_date);
      if (d && (!labDateMap[l.patient_id] || d > labDateMap[l.patient_id]))
        labDateMap[l.patient_id] = d;
    });

    const vaxDateMap: Record<string, string> = {};
    (vaxData ?? []).forEach((v: any) => {
      const d = toDateOnly(v.vaccination_date);
      if (d && (!vaxDateMap[v.patient_id] || d > vaxDateMap[v.patient_id]))
        vaxDateMap[v.patient_id] = d;
    });

    // ── NEW: vaccine order date map ──
    const vaxOrderDateMap: Record<string, string> = {};
    (vaxOrderData ?? []).forEach((v: any) => {
      const d = toDateOnly(v.created_at);
      if (d && (!vaxOrderDateMap[v.patient_id] || d > vaxOrderDateMap[v.patient_id]))
        vaxOrderDateMap[v.patient_id] = d;
    });

    const hasTx = new Set<string>();
    (cData ?? []).forEach((c: any) => {
      if (c.status === "done") hasTx.add(c.patient_id);
    });
    (prescData ?? []).forEach((p: any)      => hasTx.add(p.patient_id));
    (labData ?? []).forEach((l: any)        => hasTx.add(l.patient_id));
    (vaxData ?? []).forEach((v: any)        => hasTx.add(v.patient_id));
    (vaxOrderData ?? []).forEach((v: any)   => hasTx.add(v.patient_id)); // ← NEW

    const cMap: Record<string, {
      count: number;
      lastQueueDate: string;
      hasOngoing: boolean;
      hasActivityToday: boolean;
    }> = {};

    (cData ?? []).forEach((c: any) => {
      if (!cMap[c.patient_id])
        cMap[c.patient_id] = { count: 0, lastQueueDate: "", hasOngoing: false, hasActivityToday: false };

      const qd = toDateOnly(c.queue_date) || toDateOnly(c.consultation_date);

      if (qd > cMap[c.patient_id].lastQueueDate)
        cMap[c.patient_id].lastQueueDate = qd;

      if (c.status === "done")    cMap[c.patient_id].count++;
      if (c.status === "waiting") cMap[c.patient_id].hasOngoing = true;

      if (qd === today) cMap[c.patient_id].hasActivityToday = true;
    });

    const built: TimelinePatient[] = pData
      .filter((p: any) => hasTx.has(p.id))
      .map((p: any) => {
        const med = medMap[p.id];
        const cm  = cMap[p.id];
        const lastQueueDate  = cm?.lastQueueDate        ?? "";
        const prescDate      = prescDateMap[p.id]       ?? "";
        const labDate        = labDateMap[p.id]         ?? "";
        const vaxDate        = vaxDateMap[p.id]         ?? "";
        const vaxOrderDate   = vaxOrderDateMap[p.id]    ?? ""; // ← NEW
        const lastActivity   = [lastQueueDate, prescDate, labDate, vaxDate, vaxOrderDate]
          .filter(Boolean).reduce((a, b) => (a > b ? a : b), "");

        return {
          id: p.id,
          name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
          age: p.age != null ? String(p.age) : "",
          gender: p.sex === "F" ? "Female" : p.sex === "M" ? "Male" : "",
          addr: [p.purok, p.barangay, p.municipality].filter(Boolean).join(", "),
          barangay: p.barangay ?? "",
          philHealth: p.philhealth_pin ?? "",
          bloodType: bloodMap[p.id] ?? "",
          conditions: checkedList(med, DISEASE_KEYS),
          allergies: med?.allergy && med?.allergy_specify ? [med.allergy_specify] : [],
          visits: [],
          _visitCount:       cm?.count           ?? 0,
          _lastVisit:        lastQueueDate,
          _lastActivity:     lastActivity,
          _hasOngoing:       cm?.hasOngoing       ?? false,
          _hasActivityToday: todaySet.has(p.id) || (cm?.hasActivityToday ?? false) || vaxDateMap[p.id] === today || vaxOrderDateMap[p.id] === today,
        };
      });

    const nameMap = new Map<string, TimelinePatient>();
    for (const p of built) {
      const key = p.name.toLowerCase().trim();
      const existing = nameMap.get(key);
      if (!existing) {
        nameMap.set(key, p);
      } else {
        const existingActivity = existing._lastActivity ?? "";
        const newActivity      = p._lastActivity       ?? "";
        if (
          newActivity > existingActivity ||
          (newActivity === existingActivity &&
            (p._visitCount ?? 0) > (existing._visitCount ?? 0))
        ) {
          nameMap.set(key, p);
        }
      }
    }
    const deduped = [...nameMap.values()];

    setPatients(deduped);
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // ── Fetch visits for one patient ──────────────────────────────────────────
  const fetchVisits = useCallback(async (patientId: string): Promise<VisitEvent[]> => {
    const [consultRes, prescRes, labRes, physRes, vaxRes, vaxOrderRes] = await Promise.all([
      supabase.from("soap_consultations")
        .select("id,queue_date,consultation_date,status,subjective,objective,assessments,plan,follow_up_date,follow_up_notes")
        .eq("patient_id", patientId)
        .order("queue_date", { ascending: true }),
      supabase.from("prescriptions")
        .select("id,prescription_date,medicine,dosage,frequency,quantity,notes,status")
        .eq("patient_id", patientId).order("prescription_date", { ascending: true }),
      supabase.from("laboratory_requests").select("*")
        .eq("patient_id", patientId).order("request_date", { ascending: true }),
      supabase.from("physical_exam_findings")
        .select("blood_pressure_mmhg,temperature_c,weight_kg")
        .eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("vaccinations")
        .select("id,vaccination_date,vaccine_name,dose_number,lot_number,next_dose_date,notes,status,administered_by")
        .eq("patient_id", patientId).order("vaccination_date", { ascending: true }),
      // ── NEW: fetch vaccine orders for this patient ──
      supabase.from("patient_vaccine_orders")
        .select("id,consultation_id,vaccines,notes,status,created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true }),
    ]);

    const phys = physRes.data;
    const all: VisitEvent[] = [];

    (consultRes.data ?? []).forEach((c: any) => {
      const assessmentText =
        Array.isArray(c.assessments) && c.assessments.length > 0
          ? c.assessments.join(", ") : "";
      const displayDate = toDateOnly(c.queue_date) || toDateOnly(c.consultation_date);
      const fuDate = toDateOnly(c.follow_up_date);
      all.push({
        id: c.id, date: displayDate, type: "consultation",
        title: assessmentText || (c.status === "waiting" ? "In Progress" : "Consultation"),
        doctor: user?.name ?? "Doctor", diagnosis: assessmentText,
        subjective: c.subjective ?? "", objective: c.objective ?? "",
        assessment: assessmentText, plan: c.plan ?? "", notes: "",
        bp:     phys?.blood_pressure_mmhg ?? undefined,
        temp:   phys?.temperature_c ? `${phys.temperature_c}°C` : undefined,
        weight: phys?.weight_kg     ? `${phys.weight_kg} kg`    : undefined,
        status: c.status === "done" ? "completed" : c.status === "waiting" ? "ongoing" : "scheduled",
        ...(fuDate ? { followUpDate: fuDate, followUpNotes: c.follow_up_notes ?? "" } : {}),
      });
      if (fuDate) all.push({
        id: `fu-${c.id}`, date: fuDate, type: "follow-up",
        title: "Follow-up Visit", doctor: user?.name ?? "Doctor", diagnosis: "",
        notes: c.follow_up_notes ?? "", status: "scheduled",
        followUpDate: fuDate, followUpNotes: c.follow_up_notes ?? "",
      });
    });

    (prescRes.data ?? []).forEach((p: any) => {
      const dosageFreq = [p.dosage, p.frequency].filter(Boolean).join(" · ");
      all.push({
        id: p.id, date: toDateOnly(p.prescription_date), type: "prescription",
        title: `Prescription — ${p.medicine}`, doctor: user?.name ?? "Doctor", diagnosis: "",
        prescription: [`${p.medicine}${dosageFreq ? " · " + dosageFreq : ""}${p.quantity ? " (" + p.quantity + ")" : ""}`],
        notes: p.notes ?? "", status: p.status === "dispensed" ? "completed" : "ongoing",
        prescriptionId: String(p.id), prescriptionStatus: p.status ?? "sent",
      });
    });

    (labRes.data ?? []).forEach((l: any) => {
      const tests = Object.keys(LAB_TEST_MAP).filter((k) => l[k] === true).map((k) => LAB_TEST_MAP[k]);
      all.push({
        id: l.id,
        date: toDateOnly(l.request_date),
        type: "lab",
        title: tests.length === 1 ? `Lab — ${tests[0]}` : tests.length > 1 ? `Lab — ${tests[0]} +${tests.length - 1} more` : "Lab Request",
        doctor: user?.name ?? "Doctor",
        diagnosis: "",
        labTests: tests,
        notes: "",
        status: l.status === "completed" ? "completed" : l.status === "cancelled" ? "scheduled" : "ongoing",
        labRequestId: String(l.id),
      });
    });

    (vaxRes.data ?? []).forEach((v: any) => {
      const nextDose = toDateOnly(v.next_dose_date);
      all.push({
        id: v.id,
        date: toDateOnly(v.vaccination_date),
        type: "vaccination",
        title: v.vaccine_name ? `Vaccination — ${v.vaccine_name}${v.dose_number ? ` (Dose ${v.dose_number})` : ""}` : "Vaccination",
        doctor: v.administered_by ?? user?.name ?? "Doctor",
        diagnosis: "",
        notes: v.notes ?? "",
        status: v.status === "completed" ? "completed" : v.status === "scheduled" ? "scheduled" : "completed",
        vaccineName: v.vaccine_name ?? "",
        vaccineDose: v.dose_number != null ? String(v.dose_number) : "",
        vaccineLotNo: v.lot_number ?? "",
        ...(nextDose ? { nextDoseDate: nextDose } : {}),
        isVaccineOrder: false,
      });
    });

    // ── NEW: map vaccine orders as vaccination-type visit events ──
    (vaxOrderRes.data ?? []).forEach((vo: any) => {
      const vaccines: string[] = vo.vaccines ?? [];
      const orderDate = toDateOnly(vo.created_at);
      const isPending = vo.status === "pending";

      all.push({
        id: `vo-${vo.id}`,
        date: orderDate,
        type: "vaccination",
        title: vaccines.length === 0
          ? "Vaccine Order"
          : vaccines.length === 1
            ? `Vaccine Order — ${vaccines[0]}`
            : `Vaccine Order — ${vaccines[0]} +${vaccines.length - 1} more`,
        doctor: user?.name ?? "Doctor",
        diagnosis: "",
        notes: vo.notes ?? "",
        // status maps: pending → ongoing so card shows "In Progress" unless overridden
        status: isPending ? "ongoing" : "completed",
        // ── vaccine order specific fields ──
        isVaccineOrder: true,
        vaccineOrderStatus: vo.status as "pending" | "done",
        vaccinesOrdered: vaccines,
        // keep vaccineName as join for display fallback
        vaccineName: vaccines.join(", "),
        vaccineDose: "",
        vaccineLotNo: "",
      });
    });

    return all.filter((v) => !!v.date).sort((a, b) => a.date.localeCompare(b.date));
  }, [user?.name]);

  // ── Select patient ────────────────────────────────────────────────────────
  const handleSelect = useCallback(async (p: TimelinePatient) => {
    setVisitFilter("all");
    setLoadingDetail(true);
    const v = await fetchVisits(p.id);
    setSelected({ ...p, visits: v });
    setLoadingDetail(false);
  }, [fetchVisits]);

  // ── Auto-select ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (loadingList) return;

    const currentKey = [viewMode, gender, ageGroup, barangay, search, sortBy].join("|");
    const filterChanged = currentKey !== prevFilterKey.current;
    const grewFromZero  = prevPatientsLen.current === 0 && filteredPatients.length > 0;

    prevFilterKey.current   = currentKey;
    prevPatientsLen.current = filteredPatients.length;

    if (filteredPatients.length === 0) { setSelected(null); return; }

    if (filterChanged || grewFromZero || !selectedIdRef.current) {
      handleSelect(filteredPatients[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingList, filteredPatients]);

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    async function refreshSelected(patientId: string) {
      if (patientId !== selectedIdRef.current) return;
      setLoadingDetail(true);
      const v = await fetchVisits(patientId);
      setSelected((prev) => prev ? { ...prev, visits: v } : prev);
      setLoadingDetail(false);
    }
    const channel = supabase
      .channel("timeline_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "soap_consultations" },
        async (payload) => {
          await fetchPatients();
          const pid = (payload.new as any)?.patient_id ?? (payload.old as any)?.patient_id;
          if (pid) await refreshSelected(pid);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions" },
        async (payload) => {
          await fetchPatients();
          const pid = (payload.new as any)?.patient_id ?? (payload.old as any)?.patient_id;
          if (pid) await refreshSelected(pid);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "laboratory_requests" },
        async (payload) => {
          await fetchPatients();
          const pid = (payload.new as any)?.patient_id ?? (payload.old as any)?.patient_id;
          if (pid) await refreshSelected(pid);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "vaccinations" },
        async (payload) => {
          await fetchPatients();
          const pid = (payload.new as any)?.patient_id ?? (payload.old as any)?.patient_id;
          if (pid) await refreshSelected(pid);
        }
      )
      // ── NEW: listen for vaccine order changes ──
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_vaccine_orders" },
        async (payload) => {
          await fetchPatients();
          const pid = (payload.new as any)?.patient_id ?? (payload.old as any)?.patient_id;
          if (pid) await refreshSelected(pid);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "laboratory_results_chemistry" },
        async (payload) => {
          const reqId = (payload.new as any)?.request_id ?? (payload.old as any)?.request_id;
          if (!reqId) return;
          const { data } = await supabase.from("laboratory_requests").select("patient_id").eq("id", reqId).maybeSingle();
          if (data?.patient_id) await refreshSelected(data.patient_id);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "laboratory_results_hematology" },
        async (payload) => {
          const reqId = (payload.new as any)?.request_id ?? (payload.old as any)?.request_id;
          if (!reqId) return;
          const { data } = await supabase.from("laboratory_requests").select("patient_id").eq("id", reqId).maybeSingle();
          if (data?.patient_id) await refreshSelected(data.patient_id);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "laboratory_results_urinalysis" },
        async (payload) => {
          const reqId = (payload.new as any)?.request_id ?? (payload.old as any)?.request_id;
          if (!reqId) return;
          const { data } = await supabase.from("laboratory_requests").select("patient_id").eq("id", reqId).maybeSingle();
          if (data?.patient_id) await refreshSelected(data.patient_id);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "laboratory_results_fecalysis" },
        async (payload) => {
          const reqId = (payload.new as any)?.request_id ?? (payload.old as any)?.request_id;
          if (!reqId) return;
          const { data } = await supabase.from("laboratory_requests").select("patient_id").eq("id", reqId).maybeSingle();
          if (data?.patient_id) await refreshSelected(data.patient_id);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "laboratory_results_serology" },
        async (payload) => {
          const reqId = (payload.new as any)?.request_id ?? (payload.old as any)?.request_id;
          if (!reqId) return;
          const { data } = await supabase.from("laboratory_requests").select("patient_id").eq("id", reqId).maybeSingle();
          if (data?.patient_id) await refreshSelected(data.patient_id);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPatients, fetchVisits]);

  // ── Archive toggle ────────────────────────────────────────────────────────
  function toggleArchive(id: string) {
    setArchivedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      saveArchivedToStorage(n);
      return n;
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async function doExport(fmt: ExportFmt) {
    if (selectedCats.size === 0) return;
    setExportOpen(false); setExporting(true);
    let allVisits: VisitEvent[] = [];
    if (selected?.visits.length) { allVisits = selected.visits; }
    else { for (const p of filteredPatients) { const v = await fetchVisits(p.id); allVisits.push(...v); } }
    const rows = buildExportRows(allVisits);
    const fil: Record<ExportCat, any[]> = { consultation: [], lab_request: [], lab_result: [], prescription: [] };
    (["consultation", "lab_request", "prescription"] as ExportCat[]).filter((c) => selectedCats.has(c)).forEach((c) => { fil[c] = rows[c]; });
    if (selectedCats.has("lab_result")) {
      const labVisits = allVisits.filter((v) => v.type === "lab" && v.labRequestId && v.status === "completed");
      for (const v of labVisits) {
        try {
          const res = await fetchLabResults(v.labRequestId!);
          const date = fmtDate(v.date); const doctor = v.doctor; const tests = (v.labTests ?? []).join(", ");
          if (res.chemistry&&Object.values(res.chemistry).some((x)=>x)){const c=res.chemistry;fil.lab_result.push({Date:date,Doctor:doctor,Category:"Clinical Chemistry",RBS:c.rbs||"—",FBS:c.fbs||"—","Uric Acid":c.blood_uric_acid||"—",Cholesterol:c.cholesterol||"—",Triglycerides:c.triglycerides||"—",HDL:c.hdl||"—",LDL:c.ldl||"—",Remarks:c.remarks||"—","Last Meal":c.last_meal||"—"});}
          if (res.urinalysis&&Object.values(res.urinalysis).some((x)=>x)){const u=res.urinalysis;fil.lab_result.push({Date:date,Doctor:doctor,Category:"Urinalysis",Color:u.color||"—",Consistency:u.consistency||"—","Specific Gravity":u.specific_gravity||"—",pH:u.ph_reaction||"—",Protein:u.protein||"—",Sugar:u.sugar||"—","WBC/PUS Cell":u.wbc_pus_cell||"—",RBC:u.rbc||"—","Epithelial Cell":u.epithelial_cell||"—","Amorphous Subs.":u.amorphous_subs||"—","Mucus Thread":u.mucus_thread||"—",Bacteria:u.bacteria||"—",Others:u.others||"—"});}
          if (res.hematology&&Object.values(res.hematology).some((x)=>x)){const h=res.hematology;fil.lab_result.push({Date:date,Doctor:doctor,Category:"Hematology",Hemoglobin:h.hgb||"—",Hematocrit:h.hct||"—",WBC:h.wbc||"—",RBC:h.rbc||"—",Platelets:h.platelet_count||"—",Neutrophils:h.neutrophils||"—",Lymphocytes:h.lymphocytes||"—",Monocytes:h.monocytes||"—",Eosinophils:h.eosinophils||"—",Basophils:h.basophils||"—",Remarks:h.remarks||"—"});}
          if (res.fecalysis&&Object.values(res.fecalysis).some((x)=>x)){const f=res.fecalysis;fil.lab_result.push({Date:date,Doctor:doctor,Category:"Fecalysis",Color:f.color||"—",Consistency:f.consistency||"—","WBC/PUS Cell":f.wbc_pus_cell||"—",RBC:f.rbc||"—",Parasite:f.parasite||"—",Others:f.others||"—"});}
          if ((res.serology||[]).some((r:any)=>r.result)){(res.serology||[]).forEach((r:any)=>{if(r.result)fil.lab_result.push({Date:date,Doctor:doctor,Category:"Serology",Test:r.test_name||"—","Test Kit":r.test_kit||"—","Lot No.":r.lot_number||"—","Exp Date":r.expiry_date||"—","Type of Test":r.type_of_test||"—",Result:r.result||"—"});});}
          if (fil.lab_result.length === 0) fil.lab_result.push({ Date: date, Doctor: doctor, Category: "Lab Result", Tests: tests, Status: "Completed — No details entered" });
        } catch { /* skip */ }
      }
      allVisits.filter((v) => v.type === "lab" && v.status !== "completed").forEach((v) => {
        fil.lab_result.push({ Date: fmtDate(v.date), Doctor: v.doctor, Category: "Pending", Tests: (v.labTests ?? []).join(", "), Status: "Awaiting Results" });
      });
    }

    if (fmt === "csv") {
      EXPORT_CATS.filter((c) => selectedCats.has(c.key)).forEach((c) => {
        if (fil[c.key].length) downloadFile(toCSV(fil[c.key]), `SmartRHU_${c.label}.csv`, "text/csv");
      });

    } else if (fmt === "excel") {
      const s = EXPORT_CATS.filter((c) => selectedCats.has(c.key)).map((cat) => {
        const d = fil[cat.key];
        if (!d.length) return "";
        const h = Object.keys(d[0]);
        return `
          <tr>
            <td colspan="${h.length}" style="background:#064e3b;color:#4ade80;font-weight:bold;padding:8px;font-family:Arial,sans-serif;font-size:13px;">
              ${cat.excelLabel}
            </td>
          </tr>
          <tr>
            ${h.map((k) => `<th style="background:#d1fae5;color:#166534;font-weight:bold;padding:6px;border:1px solid #a7f3d0;font-family:Arial,sans-serif;">${k}</th>`).join("")}
          </tr>
          ${d.map((r: any) => `<tr>${h.map((k) => `<td style="padding:5px 8px;border:1px solid #e5e7eb;font-family:Arial,sans-serif;">${r[k] ?? ""}</td>`).join("")}</tr>`).join("")}
          <tr><td colspan="${h.length}"></td></tr>
        `;
      }).join("");

      downloadFile(
        `<html>
          <head>
            <meta charset="UTF-8"/>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
          </head>
          <body>
            <h2 style="font-family:Arial,sans-serif;color:#064e3b;">SmartRHU Patient Records</h2>
            <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
              ${s}
            </table>
          </body>
        </html>`,
        "SmartRHU_Records.xls",
        "application/vnd.ms-excel"
      );

    } else {
      const cats = EXPORT_CATS.filter((c) => selectedCats.has(c.key));
      const total = cats.reduce((s, c) => s + fil[c.key].length, 0);
      const sections = cats.map((cat) => {
        const d = fil[cat.key];
        if (!d.length) return "";
        const h = Object.keys(d[0]);
        return `
          <h2 style="font-family:sans-serif;font-size:13px;font-weight:700;color:#064e3b;margin:20px 0 6px;">
            ${cat.icon} ${cat.label}
          </h2>
          <table style="width:100%;border-collapse:collapse;font-size:11px;font-family:sans-serif;">
            <thead>
              <tr style="background:#d1fae5;">
                ${h.map((k) => `<th style="padding:6px 10px;border:1px solid #a7f3d0;color:#166534;">${k}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${d.map((r: any, i: number) => `
                <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"};">
                  ${h.map((k) => `<td style="padding:5px 10px;border:1px solid #e2e8f0;">${r[k] ?? ""}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        `;
      }).join("");

      const win = window.open("", "_blank");
      if (!win) { setExporting(false); return; }
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8"><title>SmartRHU Records</title></head>
          <body style="padding:32px;font-family:sans-serif;">
            <h1 style="color:#064e3b;font-size:18px;">SmartRHU — Patient Records</h1>
            <p style="color:#94a3b8;font-size:11px;">${total} records · ${new Date().toLocaleString("en-PH")}</p>
            ${sections}
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
    }

    setExporting(false);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2500);
  }

  if (isLoading || !user) return null;

  const visits        = selected ? selected.visits.filter((v) => visitFilter === "all" || v.type === visitFilter) : [];
  const totalConsults = selected?.visits.filter((v) => v.type === "consultation").length ?? 0;
  const totalPrescr   = selected?.visits.filter((v) => v.type === "prescription").length ?? 0;
  const totalLabs     = selected?.visits.filter((v) => v.type === "lab").length ?? 0;
  // vaccinations stat: actual vaccinations + vaccine orders
  const totalVax      = selected?.visits.filter((v) => v.type === "vaccination").length ?? 0;
  const upcomingFU    = selected?.visits.filter((v) => v.type === "follow-up" && v.followUpDate && daysUntil(v.followUpDate) >= 0).length ?? 0;
  const totalAll      = selected?.visits.length ?? 0;
  const lastVisitDate = [...(selected?.visits.filter((v) => v.type === "consultation") ?? [])].pop()?.date;

  const statCells = [
    { val: totalAll,      lbl: "All Records",  color: "#16a34a" },
    { val: totalConsults, lbl: "Consultations", color: "#16a34a" },
    { val: totalPrescr,   lbl: "Prescriptions", color: "#7c3aed" },
    { val: totalLabs,     lbl: "Lab Results",   color: "#2563eb" },
    { val: totalVax,      lbl: "Vaccinations",  color: "#0891b2" },
    { val: upcomingFU,    lbl: "Follow-ups",    color: "#d97706" },
    { val: lastVisitDate ? fmtDateShort(lastVisitDate) : "—", lbl: "Last Visit", color: "#64748b", sm: true },
  ];

  const visitFilterTabs = [
    { filt: "all"          as const, label: "All",          icon: "📋", color: "#16a34a" },
    { filt: "consultation" as const, label: "Consultation",  icon: "🩺", color: "#16a34a" },
    { filt: "prescription" as const, label: "Prescription",  icon: "💊", color: "#7c3aed" },
    { filt: "lab"          as const, label: "Lab Results",   icon: "📊", color: "#2563eb" },
    { filt: "vaccination"  as const, label: "Vaccination",   icon: "💉", color: "#0891b2" },
    { filt: "follow-up"    as const, label: "Follow-up",     icon: "🔁", color: "#d97706" },
  ];

  function avatarCls(g: string) {
    return g === "Female" ? styles.avatarFemale : g === "Male" ? styles.avatarMale : styles.avatarDefault;
  }
  function headerAvatarCls(g: string) {
    return g === "Female" ? styles.patientHeaderAvatarFemale : g === "Male" ? styles.patientHeaderAvatarMale : styles.patientHeaderAvatarDefault;
  }
  function badgeCls(p: TimelinePatient) {
    if (isArchived(p))           return { cls: styles.badgeArchived, label: "Archived"   };
    if (p._hasOngoing)            return { cls: styles.badgeQueue,    label: "In Queue"   };
    if (p._hasActivityToday)      return { cls: styles.badgeVisited,  label: "Seen Today" };
    if ((p._visitCount ?? 0) > 0) return { cls: styles.badgeVisited,  label: "Visited"    };
    return                               { cls: styles.badgeNew,      label: "New"        };
  }

  const todayCount = patients.filter((p) => p._hasActivityToday && !isArchived(p)).length;
  const allCount   = patients.filter((p) => !isArchived(p)).length;
  const archCount  = patients.filter((p) => isArchived(p)).length;

  return (
    <div ref={rootRef} className={styles.root}>
      <DoctorSidebar />
      <div className={styles.mainArea}>
        <DoctorTopbar
          rootRef={rootRef}
          user={{ name: user.name, initials: user.initials, role: user.role }}
          search={topSearch} onSearchChange={setTopSearch}
          onViewLabResults={() => {}}
          onLogout={async () => { router.push("/login"); }}
          dark={false} onToggleDark={() => {}}
        />
        <div className={styles.toolbar}>
          <div className={styles.viewModeTabs}>
            {([
              ["all",      `All (${allCount})`],
              ["active",   `Today (${todayCount})`],
              ["archived", `Archived (${archCount})`],
            ] as [ViewMode, string][]).map(([m, label]) => (
              <button key={m}
                className={`${styles.viewModeBtn} ${viewMode === m ? styles.viewModeBtnActive : ""}`}
                onClick={() => setViewMode(m)}>
                {label}
              </button>
            ))}
          </div>
          <div className={styles.divider} />
          {(["All", "Female", "Male"] as const).map((g) => (
            <button key={g}
              className={`${styles.genderPill} ${gender === g ? styles.genderPillActive : ""}`}
              onClick={() => setGender(g)}>{g}</button>
          ))}
          <div className={styles.divider} />
          <select className={styles.filterSelect} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
            {["All Ages", "0–17", "18–35", "36–60", "60+"].map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className={styles.filterSelect} value={barangay} onChange={(e) => setBarangay(e.target.value)}>
            {barangayOptions.map((b) => <option key={b}>{b}</option>)}
          </select>
          <div className={styles.divider} />
          <select className={styles.filterSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="mostVisits">Most Visits</option>
          </select>
          <div className={styles.spacer} />
          <span className={styles.patientCount}>{filteredPatients.length} patient{filteredPatients.length !== 1 ? "s" : ""}</span>
          <div ref={exportRef} className={styles.exportWrap}>
            <button className={`${styles.exportBtn} ${exportDone ? styles.exportBtnDone : ""}`} onClick={() => setExportOpen((o) => !o)}>
              {exporting
                ? <><span style={{ animation: "spin .8s linear infinite", display: "inline-block" }}>&#x23F3;</span> Exporting…</>
                : exportDone ? <>✅ Done!</>
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export{" "}<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: "transform .2s", transform: exportOpen ? "rotate(180deg)" : "none" }}><polyline points="6 9 12 15 18 9"/></svg></>}
            </button>
            {exportOpen && (
              <div className={styles.exportDropdown}>
                <div className={styles.exportDropHeader}>
                  <div className={styles.exportDropTitle}>Export Records</div>
                  <div className={styles.exportDropSub}>{selected ? `${selected.name}'s records` : `All ${filteredPatients.length} patients`}</div>
                </div>
                <div className={styles.exportDropSection}>
                  <div className={styles.exportDropSectionLabel}>Include</div>
                  {EXPORT_CATS.map((cat) => {
                    const on = selectedCats.has(cat.key);
                    return (
                      <label key={cat.key} className={styles.exportCatLabel}
                        onClick={() => setSelectedCats((prev) => { const n = new Set(prev); n.has(cat.key) ? n.delete(cat.key) : n.add(cat.key); return n; })}>
                        <div className={styles.exportCatCheck} style={{ background: on ? cat.color : "transparent", border: `2px solid ${on ? cat.color : "#cbd5e1"}` }}>
                          {on && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>}
                        </div>
                        <span className={styles.exportCatName} style={{ color: on ? cat.color : "#9ca3af" }}>{cat.icon} {cat.label}</span>
                      </label>
                    );
                  })}
                </div>
                <div style={{ padding: "6px 0" }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".09em", padding: "0 14px 7px" }}>Format</div>
                  {selectedCats.size === 0 && <div style={{ fontSize: 10, color: "#f59e0b", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, margin: "0 12px 8px", padding: "6px 10px", display: "flex", alignItems: "center", gap: 5 }}>⚠️ Select at least one category</div>}
                  {([["excel", "📗", "Excel (.xls)"], ["pdf", "📕", "PDF"], ["csv", "📄", "CSV"]] as [ExportFmt, string, string][]).map(([fmt, ico, lbl]) => (
                    <button key={fmt} className={styles.exportFmtItem} onClick={() => doExport(fmt)} disabled={selectedCats.size === 0}
                      style={selectedCats.size === 0 ? { opacity: 0.35, cursor: "not-allowed", pointerEvents: "none" } : {}}>
                      <span style={{ fontSize: 18 }}>{ico}</span><span className={styles.exportFmtLabel}>{lbl}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.patientPanel}>
            <div className={styles.patientPanelHeader}>
              <div className={styles.patientPanelHeading}>Patients</div>
              <div className={styles.searchWrap}>
                <svg className={styles.searchIco} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input className={styles.searchInput} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or barangay..." />
              </div>
            </div>
            <div className={styles.patientList}>
              {loadingList && <div style={{ padding: "32px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Loading patients…</div>}
              {!loadingList && filteredPatients.length === 0 && (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                  {viewMode === "archived" ? "No archived patients" : viewMode === "active" ? "No patients consulted today yet" : "No patients found"}
                </div>
              )}
              {filteredPatients.map((p) => {
                const b = badgeCls(p); const isActive = selected?.id === p.id;
                return (
                  <div key={p.id} className={`${styles.patientRow} ${isActive ? styles.patientRowActive : ""}`} onClick={() => handleSelect(p)}>
                    <div className={avatarCls(p.gender)}>{initials(p.name)}</div>
                    <div className={styles.patientRowInfo}>
                      <div className={styles.patientRowName}>{p.name}</div>
                      <div className={styles.patientRowMeta}>
                        {p.age    ? `${p.age}y`                            : ""}
                        {p.gender ? ` · ${p.gender[0]}`                    : ""}
                        {p.id     ? ` · P-${p.id.slice(-4).toUpperCase()}` : ""}
                      </div>
                    </div>
                    <span className={b.cls}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.timelinePanel}>
            {!selected && !loadingDetail && (
              <div className={styles.emptyState}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  <circle cx="18.5" cy="15.5" r="2.5" /><path d="M20.5 17.5L22 19" />
                </svg>
                <div className={styles.emptyText}>Select a patient</div>
                <div className={styles.emptyHint}>Choose a record from the list to view their timeline</div>
              </div>
            )}
            {loadingDetail && <div className={styles.loadingState}>Loading records…</div>}
            {selected && !loadingDetail && (
              <>
                <div className={styles.patientHeader}>
                  <div className={headerAvatarCls(selected.gender)}>{initials(selected.name)}</div>
                  <div className={styles.patientHeaderDetails}>
                    <div className={styles.patientHeaderName}>{selected.name}</div>
                    <div className={styles.patientHeaderChips}>
                      {selected.age       && <span className={styles.patientHeaderChip}>🕐 {selected.age} yrs</span>}
                      {selected.gender    && <span className={styles.patientHeaderChip}>👤 {selected.gender}</span>}
                      {selected.addr      && <span className={styles.patientHeaderChip}>📍 {selected.addr}</span>}
                      {selected.bloodType && <span className={styles.patientHeaderChip}>🩸 {selected.bloodType}</span>}
                    </div>
                    {(selected.conditions.length > 0 || selected.allergies.length > 0) && (
                      <div className={styles.patientHeaderBadges}>
                        {selected.conditions.map((c) => <span key={c} className={styles.conditionBadge}>● {c}</span>)}
                        {selected.allergies.map((a)  => <span key={a} className={styles.allergyBadge}>⚠️ Allergy: {a}</span>)}
                      </div>
                    )}
                  </div>
                  <button className={styles.archiveBtn}
                    style={{ color: archivedIds.has(selected.id) ? "#16a34a" : "#94a3b8" }}
                    onClick={() => toggleArchive(selected.id)}>
                    {archivedIds.has(selected.id) ? "📂 Unarchive" : "📁 Archive"}
                  </button>
                </div>
                <div className={styles.statsStrip}>
                  {statCells.map((s, i) => (
                    <div key={i} className={styles.statCell}>
                      {(s as any).sm
                        ? <div className={styles.statValSm} style={{ color: s.color }}>{s.val}</div>
                        : <div className={styles.statVal}   style={{ color: s.color }}>{s.val}</div>}
                      <div className={styles.statLabel}>{s.lbl}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.timelineScroll}>
                  <div className={styles.timelineHeadRow}>
                    <div className={styles.timelineHeading}>Medical Timeline</div>
                    <div className={styles.timelineRecordCount}>{visits.length} record{visits.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div className={styles.visitFilterBar}>
                    {visitFilterTabs.map(({ filt, label, icon, color }) => {
                      const isActive = visitFilter === filt;
                      return (
                        <button key={filt} className={styles.visitFilterBtn}
                          style={isActive ? { background: color, color: "#fff", borderColor: color, boxShadow: `0 2px 8px ${color}40` } : {}}
                          onClick={() => setVisitFilter(filt)}>
                          {icon} {label}
                        </button>
                      );
                    })}
                  </div>
                  {visits.length > 0
                    ? <div className={styles.track}>{visits.map((v) => <VisitCard key={v.id} visit={v} patient={selected} />)}</div>
                    : <div className={styles.noRecords}>No records for this filter.</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
      `}</style>
    </div>
  );
}