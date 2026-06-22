"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchLabResults } from "../Laboratory/components/LabService";
import { PrintLabForms } from "../Laboratory/components/LabFormPrint";

// ── Constants ────────────────────────────────────────────────────────────────
const G    = "#1a7a1a";
const DARK = "#145214";

const TEST_MAP: Record<string, string> = {
  hgb_hct:                 "Hgb/Hct",
  cbc_with_platelet:       "CBC with Platelet",
  random_blood_sugar:      "Random Blood Sugar",
  fasting_blood_sugar:     "Fasting Blood Sugar",
  cholesterol:             "Cholesterol",
  triglycerides:           "Triglycerides",
  lipid_profile:           "Lipid Profile",
  blood_uric_acid:         "Blood Uric Acid",
  afb_dssm:                "AFB/DSSM",
  culture_and_sensitivity: "Culture & Sensitivity",
  urinalysis:              "Urinalysis",
  fecalysis:               "Fecalysis",
  pregnancy_test:          "Pregnancy Test",
  abo_rh_blood_typing:     "ABO/Rh Blood Typing",
  dengue_ns1:              "Dengue NS1",
  dengue_igg_igm:          "Dengue IgG/IgM",
  hbsag:                   "HbsAg",
  gene_xpert:              "Gene Xpert",
};
const TEST_COLS = Object.keys(TEST_MAP);

const TEST_FLAGS: Record<string, string[]> = {
  "Clinical Chemistry": ["random_blood_sugar","fasting_blood_sugar","cholesterol","triglycerides","lipid_profile","blood_uric_acid"],
  "Urinalysis":         ["urinalysis"],
  "Fecalysis":          ["fecalysis"],
  "Hematology":         ["hgb_hct","cbc_with_platelet"],
  "Serology":           ["dengue_ns1","dengue_igg_igm","hbsag","pregnancy_test","abo_rh_blood_typing"],
};

const MEDTECHS = [
  { name: "SHEKINAH GLARE O. DEGALA, RMT", lic: "Lic. No. 0102571" },
  { name: "MARIA SANTOS, RMT",             lic: "Lic. No. 0044556" },
];

const MHOS = [
  { name: "PAOLO GAYLORD S. VILLAFAÑE, MD, FPPS", role: "Municipal Health Officer", lic: "Lic. No. 89594" },
  { name: "ROSARIO B. DELA CRUZ, MD",             role: "Municipal Health Officer", lic: "Lic. No. 55123" },
  { name: "JOSE ANTONIO C. REYES, MD",            role: "Municipal Health Officer", lic: "Lic. No. 67890" },
];

// ── Types ────────────────────────────────────────────────────────────────────
interface LabRecord {
  id:           string;
  request_date: string;
  status:       "pending" | "completed" | "cancelled";
  patient_name: string;
  age:          string;
  gender:       string;
  address:      string;
  contact:      string;
  tests:        string[];
  testsRaw:     Record<string, boolean>;
  primaryTest:  string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialRecordId?: string | null;
}

// ── Shared table header style ─────────────────────────────────────────────────
const TH: React.CSSProperties = {
  background: G, color: "#fff", fontWeight: 700,
  fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase",
  padding: "5px 8px", border: `1px solid ${G}`, textAlign: "center",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const TEST_TYPES = ["all","Fecalysis","Urinalysis","Hematology","Clinical Chemistry","Serology"] as const;
type TestType = typeof TEST_TYPES[number];

function recordHasTestType(testsRaw: Record<string, boolean>, type: TestType): boolean {
  if (type === "all") return true;
  return (TEST_FLAGS[type] || []).some(flag => testsRaw[flag]);
}

// ── Avatar color: pink=female, blue=male, orange=kids<18, green=seniors>=60 ──
function avatarColor(gender: string, age: string): string {
  const ageNum = parseInt(age) || 0;
  if (ageNum > 0 && ageNum < 18) return "#f97316"; // orange — kids
  if (ageNum >= 60)              return "#16a34a"; // green — seniors
  if (gender === "F")            return "#ec4899"; // pink — female
  if (gender === "M")            return "#3b82f6"; // blue — male
  return "#9ca3af";                                // gray — unknown
}

function avatarInitial(name: string): string {
  const c = (name || "?").trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}

// ── Result detail view ────────────────────────────────────────────────────────
function ResultDetailView({ record, onBack }: { record: LabRecord; onBack: () => void }) {
  const [results,   setResults]   = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [sigs, setSigs] = useState({
    medtech:    "",
    medtechLic: "",
    mho:        "",
    mhoLic:     "",
    mhoRole:    "Municipal Health Officer",
    reqPhys:    "",
  });

  const tabs = Object.keys(TEST_FLAGS).filter(tab =>
    TEST_FLAGS[tab].some(flag => record.testsRaw[flag])
  );
  const allTabs = tabs.length > 0 ? tabs : Object.keys(TEST_FLAGS);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetchLabResults(record.id),
      supabase
        .from("lab_signatures")
        .select("*")
        .eq("request_id", record.id)
        .maybeSingle(),
    ]).then(([res, { data: sigData }]) => {

      if (sigData) {
        const mt      = sigData.med_technologist || "";
        const mhoNm   = sigData.req_physician    || "";
        const reqPhys = sigData.pathologist      || "";
        const foundMt  = MEDTECHS.find(m => m.name === mt);
        const foundMho = MHOS.find(m => m.name === mhoNm);
        setSigs({
          medtech:    mt,
          medtechLic: foundMt  ? foundMt.lic   : "",
          mho:        mhoNm,
          mhoLic:     foundMho ? foundMho.lic  : "",
          mhoRole:    foundMho ? foundMho.role : "Municipal Health Officer",
          reqPhys:    reqPhys || mhoNm,
        });
      }

      const mapped = {
        fecalysis: res.fecalysis?.request_id ? {
          color:        res.fecalysis.color        || "",
          consistency:  res.fecalysis.consistency  || "",
          wbcPusCell:   res.fecalysis.wbc_pus_cell || "",
          redBloodCell: res.fecalysis.rbc          || "",
          parasite:     res.fecalysis.parasite     || "",
          others:       res.fecalysis.others       || "",
          remarks:      res.fecalysis.remarks      || "",
        } : {},

        urinalysis: res.urinalysis?.request_id ? {
          color:           res.urinalysis.color            || "",
          consistency:     res.urinalysis.consistency      || "",
          specificGravity: res.urinalysis.specific_gravity || "",
          phReaction:      res.urinalysis.ph_reaction      || "",
          protein:         res.urinalysis.protein          || "",
          sugar:           res.urinalysis.sugar            || "",
          wbcPusCell:      res.urinalysis.wbc_pus_cell     || "",
          redBloodCell:    res.urinalysis.rbc              || "",
          epithelialCell:  res.urinalysis.epithelial_cell  || "",
          amorphousSubs:   res.urinalysis.amorphous_subs   || "",
          mucusThread:     res.urinalysis.mucus_thread     || "",
          bacteria:        res.urinalysis.bacteria         || "",
          others:          res.urinalysis.others           || "",
          remarks:         res.urinalysis.remarks          || "",
        } : {},

        hematology: res.hematology?.request_id ? {
          hemoglobin:    res.hematology.hgb            || "",
          hematocrit:    res.hematology.hct            || "",
          rbcCount:      res.hematology.rbc            || "",
          wbcCount:      res.hematology.wbc            || "",
          plateletCount: res.hematology.platelet_count || "",
          neutrophil:    res.hematology.neutrophils    || "",
          lymphocytes:   res.hematology.lymphocytes    || "",
          monocytes:     res.hematology.monocytes      || "",
          eosinophil:    res.hematology.eosinophils    || "",
          basophil:      res.hematology.basophils      || "",
          total:         res.hematology.total          || "",
          bloodType:     res.hematology.blood_type     || "",
          others:        res.hematology.others         || "",
          remarks:       res.hematology.remarks        || "",
        } : {},

        chemistry: res.chemistry?.request_id ? {
          rbs:              res.chemistry.rbs                || "",
          fbs:              res.chemistry.fbs                || "",
          uricAcid:         res.chemistry.blood_uric_acid    || "",
          totalCholesterol: res.chemistry.cholesterol        || "",
          triglycerides:    res.chemistry.triglycerides      || "",
          hdl:              res.chemistry.hdl                || "",
          ldl:              res.chemistry.ldl                || "",
          lastMeal:         res.chemistry.last_meal          || "",
          timeOfExtraction: res.chemistry.time_of_extraction || "",
          remarks:          res.chemistry.remarks            || "",
        } : {},

        serology: {} as Record<string, any>,
      };

      if (res.serology?.length > 0) {
        res.serology.forEach((r: any) => {
          mapped.serology[r.test_name] = {
            kit:    r.test_kit     || "",
            lot:    r.lot_number   || "",
            exp:    r.expiry_date  || "",
            type:   r.type_of_test || "",
            result: r.result       || "",
          };
        });
      }

      setResults(mapped);
      setActiveTab(allTabs[0] || "");
      setLoading(false);
    });
  }, [record.id]);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const printContent = document.getElementById("doctor-print-area")?.innerHTML || "";
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Lab Result — ${record.patient_name} — ${activeTab}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9px; background: #fff; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000; padding: 3px 6px; font-size: 9px; }
    th { font-weight: 700; text-align: center; background: #fff; }
    img { max-width: 100%; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${printContent}</body>
</html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  const requestForPrint = {
    name:         record.patient_name,
    address:      record.address      || "",
    reqPhysician: sigs.reqPhys        || "",
    request_date: record.request_date || "",
    age:          record.age          || "",
    gender:       record.gender       || "",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK}, ${G})`,
        padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,.15)", border: "none", color: "#fff",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ← Back
          </button>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "'Nunito', sans-serif" }}>
              {record.patient_name}
            </div>
            <div style={{ color: "rgba(255,255,255,.65)", fontSize: 11, marginTop: 2 }}>
              {record.request_date} · {record.primaryTest}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handlePrint}
            style={{
              background: "#fff", color: G, border: "none", borderRadius: 8,
              padding: "6px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            🖨 Print
          </button>

          <span style={{
            fontSize: 10, fontWeight: 700, padding: "4px 14px", borderRadius: 20,
            textTransform: "uppercase" as const, letterSpacing: ".06em",
            background: record.status === "completed" ? "#dcfce7"
                      : record.status === "pending"   ? "#fef9c3"
                      : "#fee2e2",
            color:      record.status === "completed" ? "#166534"
                      : record.status === "pending"   ? "#854d0e"
                      : "#991b1b",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {record.status === "completed" ? "✓" : record.status === "pending" ? "⏳" : "✕"} {record.status}
          </span>
        </div>
      </div>

      {/* Status strip */}
      <div style={{
        background: record.status === "completed" ? "#dcfce7" : "#fef3c7",
        padding: "6px 18px",
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: "1px solid #e5e7eb",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: record.status === "completed" ? G : "#92400e",
          textTransform: "uppercase",
        }}>
          {record.status === "completed" ? "✅ Completed" : "⏳ Pending"}
        </span>
        <span style={{ fontSize: 11, color: "#6b7280" }}>Request ID: {record.id}</span>
      </div>

      {/* Test tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid #e5e7eb",
        background: "#fff", overflowX: "auto",
        flexShrink: 0,
      }}>
        {allTabs.map(tab => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "9px 16px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
              fontWeight:   activeTab === tab ? 700 : 400,
              color:        activeTab === tab ? G : "#6b7280",
              borderBottom: activeTab === tab ? `3px solid ${G}` : "3px solid transparent",
              background:   activeTab === tab ? "#f0fdf4" : "transparent",
              display: "flex", alignItems: "center", gap: 5,
              transition: "all 0.12s",
            }}
          >
            {tab}
            {!loading && results && (
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: G, display: "inline-block",
                opacity: activeTab === tab ? 1 : 0.4,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "14px 18px",
        background: "#f5f7f5",
      }}>
        {loading ? (
          <div style={{
            padding: 40, textAlign: "center", color: "#aaa", fontSize: 13,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 40, height: 40,
              border: `4px solid #bbf7d0`,
              borderTopColor: G,
              borderRadius: "50%",
              animation: "doc-spin .8s linear infinite",
            }} />
            Loading results…
            <style>{`@keyframes doc-spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : !results ? (
          <div style={{ padding: 40, textAlign: "center", color: "#bbb", fontSize: 13 }}>
            No results on file yet.
          </div>
        ) : (
          <div
            id="doctor-print-area"
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <PrintLabForms
              request={requestForPrint}
              results={results}
              selTest={activeTab}
              medtech={sigs.medtech}
              medtechLic={sigs.medtechLic}
              mho={sigs.mho}
              mhoLic={sigs.mhoLic}
              mhoRole={sigs.mhoRole}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status cell ───────────────────────────────────────────────────────────────
function StatusCell({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20,
        background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca",
        display: "inline-flex", alignItems: "center", gap: 4,
      }}>
        ✕ Cancelled
      </span>
    );
  }
  const isDone = status === "completed";
  return (
    <span style={{
      fontSize: 12, fontWeight: 800,
      color: isDone ? G : "#b45309",
    }}>
      {isDone ? "Completed" : "Pending"}
    </span>
  );
}

function deriveTestLabel(testsRaw: Record<string, boolean>): string {
  if (testsRaw.fecalysis)                              return "Fecalysis";
  if (testsRaw.urinalysis)                             return "Urinalysis";
  if (testsRaw.hgb_hct || testsRaw.cbc_with_platelet) return "Hematology";
  if (testsRaw.random_blood_sugar || testsRaw.fasting_blood_sugar || testsRaw.cholesterol) return "Clinical Chemistry";
  if (testsRaw.hbsag || testsRaw.dengue_ns1 || testsRaw.dengue_igg_igm) return "Serology";
  return "Multiple Tests";
}

const TEST_BADGE: Record<string, { bg: string; color: string }> = {
  "Clinical Chemistry": { bg: "#dcfce7", color: "#166534" },
  "Urinalysis":         { bg: "#dbeafe", color: "#1e40af" },
  "Fecalysis":          { bg: "#fef9c3", color: "#854d0e" },
  "Hematology":         { bg: "#ede9fe", color: "#5b21b6" },
  "Serology":           { bg: "#ffedd5", color: "#9a3412" },
  "Multiple Tests":     { bg: "#f1f5f9", color: "#475569" },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: ".06em",
      color: "#6b7280", textTransform: "uppercase", marginBottom: 7,
    }}>
      {children}
    </div>
  );
}

// ══ MAIN MODAL ════════════════════════════════════════════════════════════════
export default function LabResultsModal({ open, onClose, initialRecordId }: Props) {
  const [records,     setRecords]     = useState<LabRecord[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [filter,      setFilter]      = useState<"all"|"pending"|"completed">("all");
  const [testType,    setTestType]    = useState<TestType>("all");
  const [sort,        setSort]        = useState<"newest"|"oldest"|"az">("newest");
  const [search,      setSearch]      = useState("");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [barangay,    setBarangay]    = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewRecord,  setViewRecord]  = useState<LabRecord | null>(null);
  const [exportOpen,  setExportOpen]  = useState(false);

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialRecordId]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("laboratory_requests")
      .select(`id, request_date, status, ${TEST_COLS.join(", ")}, patients ( first_name, last_name, age, sex, barangay, contact_number )`)
      .order("request_date", { ascending: false })
      .order("created_at",   { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    const mapped: LabRecord[] = (data ?? []).map((row: any) => {
      const testsRaw: Record<string, boolean> = Object.fromEntries(
        TEST_COLS.map(col => [col, row[col] === true])
      );
      return {
        id:           row.id,
        request_date: row.request_date,
        status:       row.status,
        patient_name: row.patients
          ? `${row.patients.last_name ?? ""}, ${row.patients.first_name ?? ""}`.replace(/^, |, $/, "").trim()
          : "Unknown",
        age:     row.patients?.age           ? String(row.patients.age) : "",
        gender:  row.patients?.sex === "F"   ? "F" : row.patients?.sex === "M" ? "M" : "—",
        address: row.patients?.barangay       || "",
        contact: row.patients?.contact_number || "",
        tests:   TEST_COLS.filter(col => row[col] === true).map(col => TEST_MAP[col]),
        testsRaw,
        primaryTest: deriveTestLabel(testsRaw),
      };
    });

    setRecords(mapped);
    setLoading(false);

    if (initialRecordId) {
      const rec = mapped.find(r => r.id === initialRecordId);
      setViewRecord(rec ?? null);
    } else {
      setViewRecord(null);
    }
  }

  if (!open) return null;

  const barangayList = Array.from(new Set(records.map(r => r.address).filter(Boolean))).sort();

  const q = search.toLowerCase();
  let filtered = records.filter(r => {
    if (filter !== "all" && r.status !== filter) return false;
    if (q && !(
      r.patient_name.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      r.contact.toLowerCase().includes(q) ||
      r.tests.join(" ").toLowerCase().includes(q)
    )) return false;
    if (testType !== "all" && !recordHasTestType(r.testsRaw, testType)) return false;
    if (barangay !== "all" && r.address !== barangay) return false;
    if (dateFrom && r.request_date < dateFrom) return false;
    if (dateTo   && r.request_date > dateTo)   return false;
    return true;
  });

  if      (sort === "az")     filtered = [...filtered].sort((a, b) => a.patient_name.localeCompare(b.patient_name));
  else if (sort === "oldest") filtered = [...filtered].sort((a, b) => a.request_date.localeCompare(b.request_date));
  else                        filtered = [...filtered].sort((a, b) => b.request_date.localeCompare(a.request_date));

  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));

  const exportCSV = () => {
    const headers = ["No.","Name","Age","Sex","Barangay","Contact","Test Requested","Date","Status"];
    const rows = filtered.map((r, i) => [
      i + 1, r.patient_name, r.age, r.gender, r.address, r.contact, r.tests.join("; "), r.request_date, r.status,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "patient-lab-records.csv"; a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const sortPill = (active: boolean): React.CSSProperties => ({
    padding: "7px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
    fontFamily: "'Nunito', sans-serif", transition: "all .15s",
    border: `1.5px solid ${active ? "transparent" : "#cbd5d1"}`,
    background: active ? G : "#fff",
    color: active ? "#fff" : "#4b5563",
  });

  const inputBox: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: "#fff",
    border: "1.5px solid #d6ddd6", borderRadius: 10, padding: "10px 12px",
    color: "#374151", fontSize: 13, outline: "none", fontFamily: "'Nunito', sans-serif",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#eef3ee", borderRadius: 16,
          width: "min(1400px, 97vw)", height: "min(92vh, 820px)",
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,.28)",
          overflow: "hidden",
        }}
      >
        {viewRecord ? (
          <ResultDetailView record={viewRecord} onBack={() => setViewRecord(null)} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>

            {/* Page header */}
            <div style={{
              padding: "20px 26px 6px",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div>
                <h1 style={{
                  margin: 0, color: DARK,
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 30, fontWeight: 900, letterSpacing: "-.02em",
                }}>
                  Patient Lab Records
                </h1>
                <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{today}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={load}
                  style={{
                    background: G, color: "#fff", border: "none", borderRadius: 10,
                    padding: "10px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                    fontFamily: "'Nunito', sans-serif",
                    display: "flex", alignItems: "center", gap: 8,
                    boxShadow: "0 2px 6px rgba(26,122,26,.3)",
                  }}
                >
                  ↻ Refresh
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: "#fff", border: "1.5px solid #d6ddd6", color: "#6b7280",
                    borderRadius: "50%", width: 38, height: 38,
                    cursor: "pointer", fontSize: 17,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >✕</button>
              </div>
            </div>

            {/* Filters panel */}
            <div style={{
              margin: "12px 26px 0", padding: "18px 20px",
              background: "#fff", borderRadius: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,.05)",
              flexShrink: 0,
            }}>
              {/* Search + Export */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <svg
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }}
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, test, contact, barangay…"
                    style={{ ...inputBox, padding: "11px 12px 11px 38px", background: "#f3f6f3" }}
                  />
                </div>

                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setExportOpen(o => !o)}
                    style={{
                      background: "#fff", color: G, border: "1.5px solid #cbe3cb",
                      borderRadius: 10, padding: "11px 18px", fontSize: 13, fontWeight: 800,
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                    }}
                  >
                    ⤓ Export ▾
                  </button>
                  {exportOpen && (
                    <div style={{
                      position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 5,
                      background: "#fff", borderRadius: 10, minWidth: 160,
                      boxShadow: "0 8px 24px rgba(0,0,0,.15)", border: "1px solid #e5e7eb",
                      overflow: "hidden",
                    }}>
                      <button
                        onClick={exportCSV}
                        style={{
                          width: "100%", textAlign: "left", padding: "11px 14px",
                          background: "#fff", border: "none", cursor: "pointer",
                          fontSize: 13, fontWeight: 600, color: "#374151",
                          fontFamily: "'Nunito', sans-serif",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                      >
                        Export as CSV ({filtered.length})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* STATUS + TEST TYPE + SORT BY */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 28, marginBottom: 16 }}>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <div style={{
                    display: "inline-flex", background: "#eef3ee", borderRadius: 10,
                    padding: 4, border: "1.5px solid #dbe5db",
                  }}>
                    {(["all","pending","completed"] as const).map(f => (
                      <button key={f} onClick={() => setFilter(f)} style={{
                        padding: "8px 26px", borderRadius: 7, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif",
                        transition: "all .15s",
                        background: filter === f ? G : "transparent",
                        color: filter === f ? "#fff" : "#6b7280",
                        boxShadow: filter === f ? "0 1px 4px rgba(26,122,26,.35)" : "none",
                      }}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>Test Type</FieldLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {TEST_TYPES.map(t => {
                      const active = testType === t;
                      return (
                        <button key={t} onClick={() => setTestType(t)} style={{
                          padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                          fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif",
                          transition: "all .15s",
                          background: active ? G : "#e8f3e8",
                          color: active ? "#fff" : G,
                        }}>
                          {t === "all" ? "All" : t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel>Sort By</FieldLabel>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setSort("az")}     style={sortPill(sort === "az")}>A–Z</button>
                    <button onClick={() => setSort("oldest")} style={sortPill(sort === "oldest")}>Oldest</button>
                    <button onClick={() => setSort("newest")} style={sortPill(sort === "newest")}>Newest</button>
                  </div>
                </div>
              </div>

              {/* DATE FROM / DATE TO / BARANGAY */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                  <FieldLabel>Date From</FieldLabel>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputBox} />
                </div>
                <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                  <FieldLabel>Date To</FieldLabel>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputBox} />
                </div>
                <div style={{ flex: "1 1 240px", minWidth: 200 }}>
                  <FieldLabel>Barangay</FieldLabel>
                  <select value={barangay} onChange={e => setBarangay(e.target.value)} style={{ ...inputBox, cursor: "pointer" }}>
                    <option value="all">All Barangays</option>
                    {barangayList.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Records table */}
            <div style={{
              margin: "16px 26px 26px", background: "#fff", borderRadius: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,.05)", overflow: "hidden",
              flex: 1, display: "flex", flexDirection: "column", minHeight: 240,
            }}>
              <div style={{ overflowY: "auto", flex: 1 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Nunito', sans-serif" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                    <tr style={{ background: "#f0f6f0", borderBottom: "2px solid #d8e8d8" }}>
                      {[
                        { label: "",               w: 44,        align: "center" },
                        { label: "No.",            w: 50,        align: "center" },
                        { label: "Name",           w: undefined, align: "left"   },
                        { label: "Age",            w: 60,        align: "center" },
                        { label: "Sex",            w: 60,        align: "center" },
                        { label: "Barangay",       w: undefined, align: "left"   },
                        { label: "Contact",        w: undefined, align: "left"   },
                        { label: "Test Requested", w: undefined, align: "center" },
                        { label: "Date",           w: undefined, align: "center" },
                        { label: "Status",         w: undefined, align: "center" },
                        { label: "Action",         w: undefined, align: "center" },
                      ].map(({ label, w, align }, i) => (
                        <th key={i} style={{
                          ...TH,
                          background: "transparent", color: G, border: "none",
                          textAlign: align as any,
                          padding: align === "left" ? "13px 14px" : "13px 8px",
                          fontSize: 10,
                          width: w,
                        }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={11} style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af", fontSize: 13 }}>
                          Loading records…
                        </td>
                      </tr>
                    )}
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={11} style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af", fontSize: 13 }}>
                          {search ? `No results for "${search}"` : "No lab requests found."}
                        </td>
                      </tr>
                    )}

                    {!loading && filtered.map((r, idx) => {
                      const isSelected = selectedIds.has(r.id);
                      const testBadge  = TEST_BADGE[r.primaryTest] || TEST_BADGE["Multiple Tests"];

                      return (
                        <tr
                          key={r.id}
                          style={{
                            background: isSelected ? "#f0fdf4" : "#fff",
                            borderBottom: "1px solid #f1f5f1",
                            transition: "background .12s",
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f7faf7"; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "#fff"; }}
                        >
                          {/* Checkbox */}
                          <td style={{ textAlign: "center", padding: "12px 8px", verticalAlign: "middle" }}>
                            <div
                              onClick={() => {
                                setSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                                  return next;
                                });
                              }}
                              style={{
                                width: 17, height: 17, borderRadius: 4,
                                border: `2px solid ${isSelected ? G : "#cbd5d1"}`,
                                background: isSelected ? G : "#fff",
                                cursor: "pointer", margin: "0 auto",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              {isSelected && (
                                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                                  <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
                                </svg>
                              )}
                            </div>
                          </td>

                          {/* Row number */}
                          <td style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, padding: "12px 8px", verticalAlign: "middle" }}>
                            {idx + 1}
                          </td>

                          {/* Name + avatar — color based on gender & age */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                                background: avatarColor(r.gender, r.age),
                                color: "#fff", fontWeight: 800, fontSize: 14,
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {avatarInitial(r.patient_name)}
                              </div>
                              <span style={{ fontWeight: 700, color: "#111827" }}>{r.patient_name}</span>
                            </div>
                          </td>

                          {/* Age */}
                          <td style={{ textAlign: "center", padding: "12px 8px", verticalAlign: "middle", color: "#374151" }}>
                            {r.age || "—"}
                          </td>

                          {/* Sex */}
                          <td style={{ textAlign: "center", padding: "12px 8px", verticalAlign: "middle", color: G, fontWeight: 700 }}>
                            {r.gender}
                          </td>

                          {/* Barangay */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle", color: "#374151" }}>
                            {r.address || "—"}
                          </td>

                          {/* Contact */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle", color: "#374151" }}>
                            {r.contact || "—"}
                          </td>

                          {/* Test badge */}
                          <td style={{ textAlign: "center", padding: "12px 8px", verticalAlign: "middle" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                              background: testBadge.bg, color: testBadge.color, whiteSpace: "nowrap",
                            }}>
                              {r.primaryTest}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ textAlign: "center", padding: "12px 8px", verticalAlign: "middle", color: "#374151", fontSize: 12, whiteSpace: "nowrap" }}>
                            {new Date(r.request_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>

                          {/* Status */}
                          <td style={{ textAlign: "center", padding: "12px 8px", verticalAlign: "middle" }}>
                            <StatusCell status={r.status} />
                          </td>

                          {/* View button */}
                          <td style={{ textAlign: "center", padding: "12px 8px", verticalAlign: "middle" }}>
                            <button
                              onClick={() => setViewRecord(r)}
                              style={{
                                background: G, color: "#fff", border: "none", borderRadius: 7,
                                padding: "7px 20px", fontSize: 12, fontWeight: 700,
                                cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                                boxShadow: "0 1px 4px rgba(26,122,26,.3)",
                                transition: "opacity .15s",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
                              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer count */}
              {!loading && (
                <div style={{
                  borderTop: "1px solid #eef2ee", padding: "10px 16px",
                  fontSize: 12, color: "#6b7280", flexShrink: 0,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>{filtered.length} record{filtered.length === 1 ? "" : "s"}</span>
                  {selectedIds.size > 0 && (
                    <span style={{ color: G, fontWeight: 700 }}>{selectedIds.size} selected</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}