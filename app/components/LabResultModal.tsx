"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchLabResults } from "../Laboratory/components/LabService";

// ── Constants ───────────────────────────────────────────────────────────────
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

// ── Types ───────────────────────────────────────────────────────────────────
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

interface Props { open: boolean; onClose: () => void; }

// ── Shared table styles ──────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  background: G, color: "#fff", fontWeight: 700,
  fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase",
  padding: "5px 8px", border: `1px solid ${G}`, textAlign: "center",
};
const TD: React.CSSProperties = {
  border: "1px solid #d1fae5", padding: "5px 8px",
  fontSize: 11, verticalAlign: "middle",
};
const TD_LBL: React.CSSProperties = {
  ...TD, fontWeight: 600, color: "#374151", whiteSpace: "nowrap",
  background: "#f9fef9", width: 1,
};
const TD_VAL: React.CSSProperties = { ...TD, minWidth: 80, background: "#fff" };
const TD_NRM: React.CSSProperties = {
  ...TD, fontSize: 9, color: "#6b7280", whiteSpace: "pre-line",
  textAlign: "center", background: "#fff",
};

function SecBar({ title }: { title: string }) {
  return (
    <div style={{
      background: `linear-gradient(90deg,${G},#2e7d32)`,
      color: "#fff", fontWeight: 800, fontSize: 10,
      padding: "5px 12px", letterSpacing: 1, textTransform: "uppercase",
    }}>{title}</div>
  );
}

function FR({ label, value, unit, normal }: { label: string; value?: string; unit?: string; normal?: string }) {
  const v = value || "";
  return (
    <tr>
      <td style={TD_LBL}>{label}</td>
      <td style={{ ...TD_VAL, fontWeight: v ? 700 : 400, color: v ? "#111" : "#bbb" }}>
        {v || "—"}
        {unit && v && <span style={{ fontSize: 9, color: "#888", marginLeft: 4 }}>{unit}</span>}
      </td>
      <td style={TD_NRM}>{normal || ""}</td>
    </tr>
  );
}

// ── Result section views ─────────────────────────────────────────────────────
function ClinChemView({ d }: { d: any }) {
  return (
    <div style={{ border: "1px solid #d1fae5", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
      <SecBar title="Clinical Chemistry" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>
            <th style={TH}>Test</th><th style={TH}>Result</th><th style={TH}>Normal Values</th>
          </tr></thead>
          <tbody>
            <FR label="RBS"       value={d.rbs}  unit="mg/dL" normal="< 160 mg/dL" />
            <FR label="FBS"       value={d.fbs}  unit="mg/dL" normal="70–105 mg/dL" />
            <FR label="URIC ACID" value={d.uric} unit="mg/dL" normal={"M: 3.5–7.7\nF: 2.6–6.0"} />
          </tbody>
        </table>
        <table style={{ borderCollapse: "collapse", width: "100%", borderLeft: "2px solid #d1fae5" }}>
          <thead><tr>
            <th style={TH}>Test</th><th style={TH}>Result</th><th style={TH}>Normal</th>
          </tr></thead>
          <tbody>
            <FR label="Total Cholesterol" value={d.chol} unit="mg/dL" normal="< 200 mg/dL" />
            <FR label="Triglycerides"     value={d.trig} unit="mg/dL" normal="< 150 mg/dL" />
            <FR label="HDL"               value={d.hdl}  unit="mg/dL" normal="≥ 60 mg/dL" />
            <FR label="LDL"               value={d.ldl}  unit="mg/dL" normal="< 130 mg/dL" />
          </tbody>
        </table>
      </div>
      {(d.remarks || d.lastMeal || d.timeEx) && (
        <div style={{ borderTop: "1px solid #d1fae5", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {[["Remarks", d.remarks], ["Last Meal", d.lastMeal], ["Time of Extraction", d.timeEx]].map(([lbl, val]) =>
            val ? (
              <div key={lbl as string} style={{ display: "flex", gap: 8, fontSize: 11 }}>
                <span style={{ fontWeight: 600, color: "#374151", minWidth: 130 }}>{lbl as string}:</span>
                <span>{val as string}</span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function UrinalysisView({ d }: { d: any }) {
  return (
    <div style={{ border: "1px solid #d1fae5", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
      <SecBar title="Urinalysis" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div style={{ background: "#f0fdf4", padding: "4px 10px", fontSize: 10, fontWeight: 700, color: G, borderBottom: "1px solid #d1fae5" }}>MACROSCOPIC EXAM</div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr><th style={TH}>Field</th><th style={TH}>Result</th><th style={TH}>Normal</th></tr></thead>
            <tbody>
              <FR label="Color"             value={d.color}   />
              <FR label="Consistency"       value={d.consist} />
              <FR label="Specific Gravity"  value={d.spg}     />
              <FR label="pH Reaction"       value={d.ph}      />
              <FR label="Protein"           value={d.protein} normal="Negative" />
              <FR label="Sugar"             value={d.sugar}   normal="Negative" />
            </tbody>
          </table>
        </div>
        <div style={{ borderLeft: "2px solid #d1fae5" }}>
          <div style={{ background: "#f0fdf4", padding: "4px 10px", fontSize: 10, fontWeight: 700, color: G, borderBottom: "1px solid #d1fae5" }}>MICROSCOPIC EXAM</div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr><th style={TH}>Field</th><th style={TH}>Result</th><th style={TH}>Normal</th></tr></thead>
            <tbody>
              <FR label="WBC/PUS Cell"    value={d.wbc}      normal="0–2/HPF" />
              <FR label="Red Blood Cell"  value={d.rbc}      normal="0–2/HPF" />
              <FR label="Epithelial Cell" value={d.epi}      />
              <FR label="Amorphous Subs." value={d.amorph}   />
              <FR label="Mucus Thread"    value={d.mucus}    />
              <FR label="Bacteria"        value={d.bacteria} />
            </tbody>
          </table>
        </div>
      </div>
      {d.others && (
        <div style={{ borderTop: "1px solid #d1fae5", padding: "6px 12px", fontSize: 11 }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Others: </span>{d.others}
        </div>
      )}
    </div>
  );
}

function FecalysisView({ d }: { d: any }) {
  return (
    <div style={{ border: "1px solid #d1fae5", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
      <SecBar title="Fecalysis" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div style={{ background: "#f0fdf4", padding: "4px 10px", fontSize: 10, fontWeight: 700, color: G, borderBottom: "1px solid #d1fae5" }}>MACROSCOPIC EXAM</div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              <FR label="Color"       value={d.color}   />
              <FR label="Consistency" value={d.consist} />
            </tbody>
          </table>
        </div>
        <div style={{ borderLeft: "2px solid #d1fae5" }}>
          <div style={{ background: "#f0fdf4", padding: "4px 10px", fontSize: 10, fontWeight: 700, color: G, borderBottom: "1px solid #d1fae5" }}>MICROSCOPIC EXAM</div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr><th style={TH}>Field</th><th style={TH}>Result</th><th style={TH}>Normal</th></tr></thead>
            <tbody>
              <FR label="WBC/PUS Cell"   value={d.wbc} normal="0–2/HPF" />
              <FR label="Red Blood Cell" value={d.rbc} normal="0–2/HPF" />
            </tbody>
          </table>
        </div>
      </div>
      {(d.parasite || d.others) && (
        <div style={{ borderTop: "1px solid #d1fae5", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {[["PARASITE", d.parasite], ["Others", d.others]].map(([lbl, val]) =>
            val ? (
              <div key={lbl as string} style={{ display: "flex", gap: 8, fontSize: 11 }}>
                <span style={{ fontWeight: 600, color: "#374151", minWidth: 80 }}>{lbl as string}:</span>
                <span>{val as string}</span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function HematologyView({ d }: { d: any }) {
  const main: [string, string, string, string][] = [
    ["Hemoglobin", d.hgb,  "g/dL",      "120–160"],
    ["Hematocrit", d.hct,  "%",          "37–47"],
    ["WBC",        d.wbc,  "×10³/µL",   "5–10"],
    ["RBC",        d.rbc,  "×10⁶/µL",   "4.5–5.5"],
    ["Platelets",  d.plt,  "×10³/µL",   "150–400"],
  ];
  const diff: [string, string, string][] = [
    ["Neutrophils", d.neut, "50–70%"],
    ["Lymphocytes", d.lymp, "20–40%"],
    ["Monocytes",   d.mono, "2–8%"],
    ["Eosinophils", d.eos,  "1–4%"],
    ["Basophils",   d.baso, "0–1%"],
  ];
  return (
    <div style={{ border: "1px solid #d1fae5", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
      <SecBar title="Hematology" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>
            <th style={TH}>Test</th><th style={TH}>Result</th><th style={TH}>Unit</th><th style={TH}>Normal</th>
          </tr></thead>
          <tbody>
            {main.map(([lbl, val, unit, norm]) => (
              <tr key={lbl}>
                <td style={TD_LBL}>{lbl}</td>
                <td style={{ ...TD_VAL, fontWeight: val ? 700 : 400, color: val ? "#111" : "#bbb" }}>{val || "—"}</td>
                <td style={TD_NRM}>{unit}</td>
                <td style={TD_NRM}>{norm}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderLeft: "2px solid #d1fae5" }}>
          <div style={{ background: "#f0fdf4", padding: "4px 10px", fontSize: 10, fontWeight: 700, color: G, borderBottom: "1px solid #d1fae5" }}>DIFFERENTIAL COUNT</div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr><th style={TH}>Cell</th><th style={TH}>%</th><th style={TH}>Normal</th></tr></thead>
            <tbody>
              {diff.map(([lbl, val, norm]) => (
                <tr key={lbl}>
                  <td style={TD_LBL}>{lbl}</td>
                  <td style={{ ...TD_VAL, fontWeight: val ? 700 : 400, color: val ? "#111" : "#bbb" }}>{val || "—"}</td>
                  <td style={TD_NRM}>{norm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {d.remarks && (
        <div style={{ borderTop: "1px solid #d1fae5", padding: "6px 12px", fontSize: 11 }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Remarks: </span>{d.remarks}
        </div>
      )}
    </div>
  );
}

function SerologyView({ d }: { d: any }) {
  const rows: [string, string][] = [
    ["HbsAg Screening Test", "hbsAg"],
    ["DENGUE NS1 Ag",         "ns1"],
    ["DENGUE DUO IgG",        "igG"],
    ["DENGUE DUO IgM",        "igM"],
    ["HIV 1/2 3.0 Antigen",   "hiv"],
    ["SYPHILIS",               "syphilis"],
  ];
  return (
    <div style={{ border: "1px solid #d1fae5", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
      <SecBar title="Serology" />
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>{["TEST","TEST KIT","LOT NO.","EXP DATE","TYPE OF TEST","RESULT"].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(([lbl, key], i) => {
            const r = d[key] || {};
            return (
              <tr key={key} style={{ background: i % 2 === 0 ? "#fff" : "#f9fef9" }}>
                <td style={{ ...TD_LBL, fontSize: 10 }}>{lbl}</td>
                {(["kit","lot","exp","type","result"] as const).map(f => (
                  <td key={f} style={{
                    ...TD, textAlign: "center",
                    fontWeight: f === "result" && r[f] ? 800 : 400,
                    color: f === "result" && r[f] === "Reactive"     ? "#dc2626"
                         : f === "result" && r[f] === "Non-Reactive" ? G
                         : r[f] ? "#111" : "#bbb",
                    fontSize: f === "result" ? 11 : 10,
                    background: i % 2 === 0 ? "#fff" : "#f9fef9",
                  }}>
                    {r[f] || "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Result detail view (shown when View is clicked) ──────────────────────────
function ResultDetailView({ record, onBack }: { record: LabRecord; onBack: () => void }) {
  const [data,      setData]      = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("");

  const tabs = Object.keys(TEST_FLAGS).filter(tab =>
    TEST_FLAGS[tab].some(flag => record.testsRaw[flag])
  );
  const allTabs = tabs.length > 0 ? tabs : Object.keys(TEST_FLAGS);

  useEffect(() => {
    setLoading(true);
    fetchLabResults(record.id).then(res => {
      setData({
        chemistry: {
          rbs:      res.chemistry?.rbs                || "",
          fbs:      res.chemistry?.fbs                || "",
          uric:     res.chemistry?.blood_uric_acid    || "",
          chol:     res.chemistry?.cholesterol        || "",
          trig:     res.chemistry?.triglycerides      || "",
          hdl:      res.chemistry?.hdl                || "",
          ldl:      res.chemistry?.ldl                || "",
          remarks:  res.chemistry?.remarks            || "",
          lastMeal: res.chemistry?.last_meal          || "",
          timeEx:   res.chemistry?.time_of_extraction || "",
        },
        urinalysis: {
          color:    res.urinalysis?.color             || "",
          consist:  res.urinalysis?.consistency       || "",
          spg:      res.urinalysis?.specific_gravity  || "",
          ph:       res.urinalysis?.ph_reaction       || "",
          protein:  res.urinalysis?.protein           || "",
          sugar:    res.urinalysis?.sugar             || "",
          wbc:      res.urinalysis?.wbc_pus_cell      || "",
          rbc:      res.urinalysis?.rbc               || "",
          epi:      res.urinalysis?.epithelial_cell   || "",
          amorph:   res.urinalysis?.amorphous_subs    || "",
          mucus:    res.urinalysis?.mucus_thread      || "",
          bacteria: res.urinalysis?.bacteria          || "",
          others:   res.urinalysis?.others            || "",
        },
        fecalysis: {
          color:    res.fecalysis?.color        || "",
          consist:  res.fecalysis?.consistency  || "",
          wbc:      res.fecalysis?.wbc_pus_cell || "",
          rbc:      res.fecalysis?.rbc          || "",
          parasite: res.fecalysis?.parasite     || "",
          others:   res.fecalysis?.others       || "",
        },
        hematology: {
          hgb:  res.hematology?.hgb            || "",
          hct:  res.hematology?.hct            || "",
          wbc:  res.hematology?.wbc            || "",
          rbc:  res.hematology?.rbc            || "",
          plt:  res.hematology?.platelet_count || "",
          neut: res.hematology?.neutrophils    || "",
          lymp: res.hematology?.lymphocytes    || "",
          mono: res.hematology?.monocytes      || "",
          eos:  res.hematology?.eosinophils    || "",
          baso: res.hematology?.basophils      || "",
          remarks: res.hematology?.remarks     || "",
        },
        serology: (() => {
          const s: any = {};
          const keyMap: Record<string, string> = {
            "HbsAg Screening Test": "hbsAg",
            "DENGUE NS1 Ag":         "ns1",
            "DENGUE DUO IgG":        "igG",
            "DENGUE DUO IgM":        "igM",
            "HIV 1/2 3.0 Antigen":   "hiv",
            "SYPHILIS":               "syphilis",
          };
          (res.serology || []).forEach((r: any) => {
            const k = keyMap[r.test_name];
            if (k) s[k] = { kit: r.test_kit || "", lot: r.lot_number || "", exp: r.expiry_date || "", type: r.type_of_test || "", result: r.result || "" };
          });
          return s;
        })(),
      });
      setActiveTab(allTabs[0] || "");
      setLoading(false);
    });
  }, [record.id]);

  const reqDate = new Date(record.request_date).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Detail header */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK}, ${G})`,
        padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack}
            style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            ← Back
          </button>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "Syne, sans-serif" }}>
              {record.patient_name}
            </div>
            <div style={{ color: "rgba(255,255,255,.65)", fontSize: 11, marginTop: 2 }}>
              {record.request_date} · {record.primaryTest}
            </div>
          </div>
        </div>
        {/* Status badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "4px 14px", borderRadius: 20,
          textTransform: "uppercase" as const, letterSpacing: ".06em",
          background: record.status === "completed" ? "#dcfce7" : record.status === "pending" ? "#fef9c3" : "#fee2e2",
          color:      record.status === "completed" ? "#166534" : record.status === "pending" ? "#854d0e" : "#991b1b",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {record.status === "completed" ? "✓" : record.status === "pending" ? "⏳" : "✕"} {record.status}
        </span>
      </div>

      {/* Patient info strip */}
      <div style={{
        background: "#fff",
        borderBottom: `2.5px solid ${G}`,
        padding: "12px 20px",
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "4px 32px", flexShrink: 0,
      }}>
        {[
          ["Name",          record.patient_name],
          ["Date",          reqDate],
          ["Address",       record.address || "—"],
          ["Age",           record.age ? `${record.age} years old` : "—"],
          ["Req. Physician","—"],
          ["Sex",           record.gender || "—"],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: G, minWidth: 110, flexShrink: 0 }}>{lbl}:</span>
            <span style={{ flex: 1, borderBottom: "1px solid #d1fae5", paddingBottom: 1, fontWeight: val !== "—" ? 600 : 300, color: "#111" }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", borderBottom: `2px solid #e8f5e9`,
        background: "#f9fef9", padding: "0 16px", gap: 2,
        overflowX: "auto", flexShrink: 0,
      }}>
        {allTabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            border: "none",
            background: activeTab === tab ? "#fff" : "transparent",
            borderBottom: activeTab === tab ? `2.5px solid ${G}` : "2.5px solid transparent",
            color: activeTab === tab ? DARK : "#9ca3af",
            fontWeight: activeTab === tab ? 800 : 500,
            fontSize: 11, padding: "9px 16px", cursor: "pointer",
            borderRadius: "6px 6px 0 0", transition: "all .15s",
            fontFamily: "inherit", marginBottom: -2, whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            {tab}
            {/* dot if this tab has results */}
            {!loading && data && (
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: activeTab === tab ? G : "#9ca3af",
                flexShrink: 0,
              }}/>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af", fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔬</div>
            Loading results…
          </div>
        ) : !data ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 13 }}>No results on file yet.</div>
        ) : (
          <>
            {activeTab === "Clinical Chemistry" && <ClinChemView  d={data.chemistry}  />}
            {activeTab === "Urinalysis"         && <UrinalysisView d={data.urinalysis} />}
            {activeTab === "Fecalysis"          && <FecalysisView  d={data.fecalysis}  />}
            {activeTab === "Hematology"         && <HematologyView d={data.hematology} />}
            {activeTab === "Serology"           && <SerologyView   d={data.serology}   />}

            {/* Signatures */}
            <div style={{
              marginTop: 24, paddingTop: 14,
              borderTop: "1px solid #e8f5e9",
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: 20, textAlign: "center",
            }}>
              {["Medical Technologist","Req. Physician","Pathologist"].map(r => (
                <div key={r}>
                  <div style={{ borderBottom: `1.5px solid ${G}`, height: 28, marginBottom: 5 }}/>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{r}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; icon: string }> = {
    completed: { bg: "#dcfce7", color: "#166534", icon: "✓" },
    pending:   { bg: "#fef9c3", color: "#854d0e", icon: "⏳" },
    cancelled: { bg: "#fee2e2", color: "#991b1b", icon: "✕" },
  };
  const s = cfg[status] || cfg.pending;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 20,
      textTransform: "uppercase" as const, letterSpacing: ".05em",
      background: s.bg, color: s.color,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {s.icon} {status}
    </span>
  );
}

function deriveTestLabel(testsRaw: Record<string, boolean>): string {
  if (testsRaw.fecalysis)               return "Fecalysis";
  if (testsRaw.urinalysis)              return "Urinalysis";
  if (testsRaw.hgb_hct || testsRaw.cbc_with_platelet) return "Hematology";
  if (testsRaw.random_blood_sugar || testsRaw.fasting_blood_sugar || testsRaw.cholesterol) return "Clinical Chemistry";
  if (testsRaw.hbsag || testsRaw.dengue_ns1 || testsRaw.dengue_igg_igm) return "Serology";
  return "Multiple Tests";
}

// ── Test badge colours ───────────────────────────────────────────────────────
const TEST_BADGE: Record<string, { bg: string; color: string }> = {
  "Clinical Chemistry": { bg: "#dcfce7", color: "#166534" },
  "Urinalysis":         { bg: "#dbeafe", color: "#1e40af" },
  "Fecalysis":          { bg: "#fef9c3", color: "#854d0e" },
  "Hematology":         { bg: "#ede9fe", color: "#5b21b6" },
  "Serology":           { bg: "#ffedd5", color: "#9a3412" },
  "Multiple Tests":     { bg: "#f1f5f9", color: "#475569" },
};

// ══ MAIN MODAL ════════════════════════════════════════════════════════════════
export default function LabResultsModal({ open, onClose }: Props) {
  const [records,       setRecords]       = useState<LabRecord[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [filter,        setFilter]        = useState<"all"|"pending"|"completed"|"cancelled">("all");
  const [search,        setSearch]        = useState("");
  const [sortAZ,        setSortAZ]        = useState(false);
  const [sortNewest,    setSortNewest]    = useState(true);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [viewRecord,    setViewRecord]    = useState<LabRecord | null>(null);

  useEffect(() => { if (open) { load(); setViewRecord(null); } }, [open]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("laboratory_requests")
      .select(`id, request_date, status, ${TEST_COLS.join(", ")}, patients ( first_name, last_name, age, sex, barangay, contact_number )`)
      .order("request_date",  { ascending: false })
      .order("created_at",    { ascending: false });

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
        age:          row.patients?.age ? String(row.patients.age) : "",
        gender:       row.patients?.sex === "F" ? "F" : row.patients?.sex === "M" ? "M" : "—",
        address:      row.patients?.barangay      || "",
        contact:      row.patients?.contact_number || "",
        tests:        TEST_COLS.filter(col => row[col] === true).map(col => TEST_MAP[col]),
        testsRaw,
        primaryTest:  deriveTestLabel(testsRaw),
      };
    });

    setRecords(mapped);
    setLoading(false);
  }

  if (!open) return null;

  const counts = {
    all:       records.length,
    pending:   records.filter(r => r.status === "pending").length,
    completed: records.filter(r => r.status === "completed").length,
    cancelled: records.filter(r => r.status === "cancelled").length,
  };

  let filtered = records.filter(r =>
    (filter === "all" || r.status === filter) &&
    (r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
     r.address.toLowerCase().includes(search.toLowerCase()))
  );
  if (sortAZ)     filtered = [...filtered].sort((a,b) => a.patient_name.localeCompare(b.patient_name));
  if (sortNewest) filtered = [...filtered].sort((a,b) => b.request_date.localeCompare(a.request_date));

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(r => r.id)));
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16,
          width: "min(1000px, 96vw)", height: "min(88vh, 700px)",
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,.28)",
          overflow: "hidden",
        }}
      >
        {/* ── If viewing a specific result ── */}
        {viewRecord ? (
          <ResultDetailView record={viewRecord} onBack={() => setViewRecord(null)} />
        ) : (
          <>
            {/* ── List view header ── */}
            <div style={{
              background: `linear-gradient(135deg, ${DARK}, ${G})`,
              padding: "16px 22px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div>
                <h2 style={{ margin: 0, color: "#fff", fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "-.01em" }}>
                  Patient Laboratory Record
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Filter pills */}
                {(["all","pending","completed","cancelled"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: "5px 14px", borderRadius: 20, border: "1.5px solid",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    transition: "all .15s",
                    background: filter === f ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.12)",
                    color:      filter === f ? G : "rgba(255,255,255,.85)",
                    borderColor: filter === f ? "transparent" : "rgba(255,255,255,.25)",
                  }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== "all" && <span style={{ marginLeft: 4, fontSize: 9, opacity: .8 }}>({counts[f]})</span>}
                  </button>
                ))}
                <button onClick={onClose}
                  style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✕
                </button>
              </div>
            </div>

            {/* ── Toolbar ── */}
            <div style={{
              background: G, padding: "8px 16px",
              display: "flex", alignItems: "center", gap: 8,
              flexShrink: 0,
            }}>
              {/* Select All */}
              <button onClick={toggleSelectAll} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,.18)", border: "none", color: "#fff",
                borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3,
                  border: "2px solid #fff", flexShrink: 0,
                  background: allSelected ? "#fff" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {allSelected && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke={G} strokeWidth="2.2" strokeLinecap="round"/></svg>}
                </div>
                Select All
              </button>

              {/* A-Z sort */}
              <button onClick={() => { setSortAZ(!sortAZ); setSortNewest(false); }} style={{
                background: sortAZ ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)",
                border: "none", color: "#fff", borderRadius: 7,
                padding: "6px 12px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                A-Z
              </button>

              {/* Newest First */}
              <button onClick={() => { setSortNewest(true); setSortAZ(false); }} style={{
                background: sortNewest ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)",
                border: "none", color: "#fff", borderRadius: 7,
                padding: "6px 12px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Newest First
              </button>

              {/* Oldest First */}
              <button onClick={() => { setSortNewest(false); setSortAZ(false); setRecords(prev => [...prev].reverse()); }} style={{
                background: !sortNewest && !sortAZ ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)",
                border: "none", color: "#fff", borderRadius: 7,
                padding: "6px 12px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Oldest First
              </button>

              {/* Search */}
              <div style={{ flex: 1, position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.5)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search patient..."
                  style={{
                    width: "100%", boxSizing: "border-box" as any,
                    background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)",
                    borderRadius: 7, padding: "6px 12px 6px 30px",
                    color: "#fff", fontSize: 12, outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>

              <span style={{ fontSize: 11, color: "rgba(255,255,255,.7)", flexShrink: 0, marginLeft: 4 }}>
                {filtered.length} records
              </span>
            </div>

            {/* ── Table ── */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "DM Sans, sans-serif" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                  <tr style={{ background: "#f0fdf4", borderBottom: "2px solid #d1fae5" }}>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151", width: 40, padding: "10px 8px" }}></th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151", width: 40 }}>No.</th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151", textAlign: "left", padding: "10px 12px" }}>Name</th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151", width: 50 }}>Age</th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151", width: 50 }}>Sex</th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151", textAlign: "left", padding: "10px 12px" }}>Address</th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151", textAlign: "left", padding: "10px 12px" }}>Contact</th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151" }}>Test Requested</th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151" }}>Date</th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151" }}>Status</th>
                    <th style={{ ...TH, background: "#e8f5e9", color: "#374151" }}>Action</th>
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
                    const testBadge = TEST_BADGE[r.primaryTest] || TEST_BADGE["Multiple Tests"];
                    const isEven = idx % 2 === 0;
                    return (
                      <tr key={r.id}
                        style={{
                          background: isSelected ? "#f0fdf4" : isEven ? "#fff" : "#fafafa",
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background .12s",
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f0fdf4"; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isEven ? "#fff" : "#fafafa"; }}
                      >
                        {/* Checkbox */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle" }}>
                          <div
                            onClick={() => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                                return next;
                              });
                            }}
                            style={{
                              width: 16, height: 16, borderRadius: 3,
                              border: `2px solid ${isSelected ? G : "#d1d5db"}`,
                              background: isSelected ? G : "#fff",
                              cursor: "pointer", margin: "0 auto",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {isSelected && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>}
                          </div>
                        </td>
                        {/* No */}
                        <td style={{ textAlign: "center", color: "#9ca3af", fontSize: 11, padding: "10px 8px", verticalAlign: "middle" }}>{idx + 1}</td>
                        {/* Name */}
                        <td style={{ padding: "10px 12px", verticalAlign: "middle", fontWeight: 600, color: "#111827" }}>{r.patient_name}</td>
                        {/* Age */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle", color: "#374151" }}>{r.age || "—"}</td>
                        {/* Sex */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle", color: "#374151" }}>{r.gender}</td>
                        {/* Address */}
                        <td style={{ padding: "10px 12px", verticalAlign: "middle", color: "#374151" }}>{r.address || "—"}</td>
                        {/* Contact */}
                        <td style={{ padding: "10px 12px", verticalAlign: "middle", color: "#374151" }}>{r.contact || "—"}</td>
                        {/* Test Requested */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                            background: testBadge.bg, color: testBadge.color,
                            whiteSpace: "nowrap",
                          }}>
                            {r.primaryTest}
                          </span>
                        </td>
                        {/* Date */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle", color: "#374151", fontSize: 11, whiteSpace: "nowrap" }}>
                          {new Date(r.request_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        {/* Status */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle" }}>
                          <StatusBadge status={r.status} />
                        </td>
                        {/* Action */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle" }}>
                          <button onClick={() => setViewRecord(r)}
                            style={{
                              background: r.status === "completed" ? G : r.status === "cancelled" ? "#991b1b" : "#854d0e",
                              color: "#fff", border: "none", borderRadius: 6,
                              padding: "6px 18px", fontSize: 11, fontWeight: 700,
                              cursor: "pointer", fontFamily: "inherit",
                              boxShadow: "0 1px 4px rgba(0,0,0,.15)",
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
                  {/* Empty rows for visual consistency */}
                  {!loading && filtered.length > 0 && filtered.length < 6 && Array.from({ length: 6 - filtered.length }).map((_, i) => (
                    <tr key={`empty-${i}`} style={{ background: (filtered.length + i) % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td colSpan={11} style={{ height: 44, borderBottom: "1px solid #f1f5f9" }}/>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}