"use client";
import { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css";
import { supabase } from "@/lib/supabase";

// Map DB column → human label
const TEST_MAP: Record<string, string> = {
  hgb_hct:               "Hgb/Hct",
  cbc_with_platelet:     "CBC with Platelet",
  random_blood_sugar:    "Random Blood Sugar",
  fasting_blood_sugar:   "Fasting Blood Sugar",
  cholesterol:           "Cholesterol",
  triglycerides:         "Triglycerides",
  lipid_profile:         "Lipid Profile",
  blood_uric_acid:       "Blood Uric Acid",
  afb_dssm:              "AFB/DSSM",
  culture_and_sensitivity:"Culture & Sensitivity",
  urinalysis:            "Urinalysis",
  fecalysis:             "Fecalysis",
  pregnancy_test:        "Pregnancy Test",
  abo_rh_blood_typing:   "ABO/Rh Blood Typing",
  dengue_ns1:            "Dengue NS1",
  dengue_igg_igm:        "Dengue IgG/IgM",
  hbsag:                 "HbsAg",
  gene_xpert:            "Gene Xpert",
};

const TEST_COLS = Object.keys(TEST_MAP);

interface LabResult {
  id:           string;
  request_date: string;
  status:       "pending" | "completed" | "cancelled";
  patient_name: string;
  tests:        string[]; // human-readable list of requested tests
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:   { background:"#fef9c3", color:"#854d0e" },
  completed: { background:"#dcfce7", color:"#166534" },
  cancelled: { background:"#fee2e2", color:"#991b1b" },
};

export default function LabResultsModal({ open, onClose }: Props) {
  const [results,   setResults]   = useState<LabResult[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [filter,    setFilter]    = useState<"all"|"pending"|"completed"|"cancelled">("all");
  const [search,    setSearch]    = useState("");
  const [expanded,  setExpanded]  = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchResults();
  }, [open]);

  async function fetchResults() {
    setLoading(true);
    const { data, error } = await supabase
      .from("laboratory_requests")
      .select(`
        id, request_date, status,
        ${TEST_COLS.join(", ")},
        patients ( first_name, last_name )
      `)
      .order("request_date", { ascending: false })
      .order("created_at",   { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    const mapped: LabResult[] = (data ?? []).map((row: any) => ({
      id:           row.id,
      request_date: row.request_date,
      status:       row.status,
      patient_name: row.patients
        ? `${row.patients.first_name ?? ""} ${row.patients.last_name ?? ""}`.trim()
        : "Unknown",
      tests: TEST_COLS.filter(col => row[col] === true).map(col => TEST_MAP[col]),
    }));

    setResults(mapped);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("laboratory_requests").update({ status }).eq("id", id);
    fetchResults();
  }

  const filtered = results.filter(r => {
    const matchFilter = filter === "all" || r.status === filter;
    const matchSearch = r.patient_name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all:       results.length,
    pending:   results.filter(r => r.status === "pending").length,
    completed: results.filter(r => r.status === "completed").length,
    cancelled: results.filter(r => r.status === "cancelled").length,
  };

  if (!open) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:"var(--surface)", borderRadius:20,
          width:"min(780px,96vw)", maxHeight:"90vh",
          display:"flex", flexDirection:"column",
          boxShadow:"0 24px 64px rgba(0,0,0,.28)",
          animation:"slideUp .25s ease",
          overflow:"hidden",
        }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>🧪 Lab Results</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Search + filter bar */}
        <div style={{padding:"14px 20px", borderBottom:"1px solid var(--border)", display:"flex", gap:10, flexWrap:"wrap", background:"var(--surface)", flexShrink:0}}>
          <input
            style={{flex:1, minWidth:180, background:"var(--surface2)", border:"1.5px solid var(--border)", borderRadius:10, padding:"7px 14px", fontSize:13, color:"var(--text)", outline:"none", fontFamily:"DM Sans,sans-serif"}}
            placeholder="Search by patient name…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <div style={{display:"flex", gap:6}}>
            {(["all","pending","completed","cancelled"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding:"6px 14px", borderRadius:20, border:"1.5px solid",
                fontSize:11, fontWeight:700, cursor:"pointer",
                fontFamily:"DM Sans,sans-serif", transition:"all .15s",
                background: filter === f ? (f==="pending"?"#854d0e":f==="completed"?"#166534":f==="cancelled"?"#991b1b":"var(--green-dark)") : "transparent",
                color: filter === f ? "#fff" : "var(--text2)",
                borderColor: filter === f ? "transparent" : "var(--border)",
              }}>
                {f.charAt(0).toUpperCase()+f.slice(1)} ({counts[f]})
              </button>
            ))}
          </div>
        </div>

        {/* Results list */}
        <div style={{overflowY:"auto", flex:1, padding:"12px 20px", display:"flex", flexDirection:"column", gap:10}}>
          {loading && (
            <div style={{textAlign:"center", padding:40, color:"var(--text3)", fontSize:13}}>Loading results…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{textAlign:"center", padding:40, color:"var(--text3)", fontSize:13}}>
              {search ? `No results found for "${search}"` : "No lab requests found."}
            </div>
          )}

          {!loading && filtered.map(r => (
            <div key={r.id} style={{
              background:"var(--surface)", border:"1.5px solid var(--border)",
              borderRadius:12, overflow:"hidden",
              boxShadow:"var(--shadow-sm)",
              transition:"box-shadow .15s",
            }}>
              {/* Row header */}
              <div
                style={{display:"flex", alignItems:"center", gap:12, padding:"12px 16px", cursor:"pointer"}}
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                {/* Patient avatar */}
                <div style={{
                  width:36, height:36, borderRadius:"50%",
                  background:"var(--green)", color:"#fff",
                  fontSize:12, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0,
                }}>
                  {r.patient_name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                </div>

                {/* Info */}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:600, fontSize:14, color:"var(--text)"}}>
                    {r.patient_name}
                  </div>
                  <div style={{fontSize:11, color:"var(--text3)", marginTop:2}}>
                    {new Date(r.request_date).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}
                    {" · "}{r.tests.length} test{r.tests.length!==1?"s":""} requested
                  </div>
                </div>

                {/* Status pill */}
                <span style={{
                  ...STATUS_STYLE[r.status],
                  fontSize:10, fontWeight:700,
                  padding:"3px 10px", borderRadius:20,
                  textTransform:"uppercase", letterSpacing:".05em",
                  flexShrink:0,
                }}>
                  {r.status}
                </span>

                {/* Chevron */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"
                  style={{transform: expanded===r.id?"rotate(180deg)":"none", transition:"transform .2s", flexShrink:0}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {/* Expanded detail */}
              {expanded === r.id && (
                <div style={{borderTop:"1px solid var(--border)", padding:"14px 16px", display:"flex", flexDirection:"column", gap:12}}>
                  {/* Tests list */}
                  <div>
                    <div style={{fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:8}}>
                      Tests Ordered
                    </div>
                    <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                      {r.tests.map(t => (
                        <span key={t} style={{
                          background:"var(--surface2)", border:"1px solid var(--border)",
                          borderRadius:20, padding:"4px 12px",
                          fontSize:11, color:"var(--text2)", fontWeight:500,
                        }}>
                          🧪 {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Status actions */}
                  {r.status === "pending" && (
                    <div style={{display:"flex", gap:8}}>
                      <button
                        onClick={() => updateStatus(r.id, "completed")}
                        style={{flex:1, padding:"8px", borderRadius:8, border:"none", background:"var(--success-light)", color:"var(--green-mid)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"DM Sans,sans-serif"}}>
                        ✓ Mark Completed
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, "cancelled")}
                        style={{flex:1, padding:"8px", borderRadius:8, border:"none", background:"var(--danger-light)", color:"var(--danger)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"DM Sans,sans-serif"}}>
                        ✕ Cancel Request
                      </button>
                    </div>
                  )}
                  {r.status === "completed" && (
                    <div style={{fontSize:12, color:"var(--green)", fontWeight:600, display:"flex", alignItems:"center", gap:5}}>
                      ✅ Results completed
                    </div>
                  )}
                  {r.status === "cancelled" && (
                    <div style={{fontSize:12, color:"var(--danger)", fontWeight:600, display:"flex", alignItems:"center", gap:5}}>
                      ✕ This request was cancelled
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 20px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"flex-end", flexShrink:0}}>
          <button className={`${styles.actionBtn} ${styles.outline}`} onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}