"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

interface Props { open: boolean; onClose: () => void; }

// ── Shared table header style ─────────────────────────────────────────────────
const TH: React.CSSProperties = {
  background: G, color: "#fff", fontWeight: 700,
  fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase",
  padding: "5px 8px", border: `1px solid ${G}`, textAlign: "center",
};

// ── Small labeled field for the confirm view ──────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "#111827" }}>{value}</div>
    </div>
  );
}

// ── Confirm Request view — replaces the old print/result form view ────────────
function ConfirmRequestView({
  record,
  onBack,
  onConfirmed,
}: {
  record: LabRecord;
  onBack: () => void;
  onConfirmed: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setConfirming(true);
    setError(null);

    const { error: dbError } = await supabase
      .from("laboratory_requests")
      .update({ status: "completed" })
      .eq("id", record.id);

    setConfirming(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onConfirmed();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Header bar ──────────────────────────────────────────────────── */}
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
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "Syne, sans-serif" }}>
              {record.patient_name}
            </div>
            <div style={{ color: "rgba(255,255,255,.65)", fontSize: 11, marginTop: 2 }}>
              {record.request_date} · {record.primaryTest}
            </div>
          </div>
        </div>

        <StatusBadge status={record.status} />
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "#f5f7f5" }}>
        <div style={{
          background: "#fff", borderRadius: 10, padding: "20px 24px",
          boxShadow: "0 2px 8px rgba(0,0,0,.06)", marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 14 }}>
            Patient Information
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13 }}>
            <Field label="Name"          value={record.patient_name} />
            <Field label="Request Date" value={record.request_date} />
            <Field label="Age"           value={record.age || "—"} />
            <Field label="Gender"        value={record.gender || "—"} />
            <Field label="Address"       value={record.address || "—"} />
            <Field label="Contact"       value={record.contact || "—"} />
          </div>
        </div>

        <div style={{
          background: "#fff", borderRadius: 10, padding: "20px 24px",
          boxShadow: "0 2px 8px rgba(0,0,0,.06)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 14 }}>
            Tests Requested
          </div>
          {record.tests.length === 0 ? (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>No tests on file.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {record.tests.map((t) => (
                <span key={t} style={{
                  fontSize: 12, fontWeight: 600, color: "#166534",
                  background: "#dcfce7", padding: "5px 12px", borderRadius: 20,
                }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div style={{
            marginTop: 16, padding: "10px 14px", background: "#fef2f2",
            border: "1px solid #fca5a5", borderRadius: 8,
            color: "#b91c1c", fontSize: 13,
          }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: "14px 24px", borderTop: "1px solid #e5e7eb",
        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10,
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          padding: "9px 24px", borderRadius: 8,
          border: "1px solid #d1d5db", background: "#fff",
          fontSize: 14, cursor: "pointer", fontWeight: 600, color: "#374151",
        }}>
          Close
        </button>

        {record.status === "pending" ? (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              padding: "9px 28px", borderRadius: 8, border: "none",
              background: confirming ? "#6b7280" : G,
              color: "#fff", fontSize: 14,
              cursor: confirming ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {confirming ? "Confirming…" : "Confirm Request"}
          </button>
        ) : (
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {record.status === "completed" ? "✓ Already confirmed" : "This request was cancelled."}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; icon: string }> = {
    completed: { bg: "#dcfce7", color: "#166534", icon: "✓"  },
    pending:   { bg: "#fef9c3", color: "#854d0e", icon: "⏳" },
    cancelled: { bg: "#fee2e2", color: "#991b1b", icon: "✕"  },
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

// ══ MAIN MODAL ════════════════════════════════════════════════════════════════
export default function LabResultsModal({ open, onClose }: Props) {
  const [records,     setRecords]     = useState<LabRecord[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [filter,      setFilter]      = useState<"all"|"pending"|"completed"|"cancelled">("all");
  const [search,      setSearch]      = useState("");
  const [sortAZ,      setSortAZ]      = useState(false);
  const [sortNewest,  setSortNewest]  = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewRecord,  setViewRecord]  = useState<LabRecord | null>(null);

  useEffect(() => {
    if (open) { load(); setViewRecord(null); }
  }, [open]);

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
  if (sortAZ)     filtered = [...filtered].sort((a, b) => a.patient_name.localeCompare(b.patient_name));
  if (sortNewest) filtered = [...filtered].sort((a, b) => b.request_date.localeCompare(a.request_date));

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(r => r.id)));
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
          background: "#fff", borderRadius: 16,
          width: "min(1000px, 96vw)", height: "min(88vh, 700px)",
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,.28)",
          overflow: "hidden",
        }}
      >
        {/* ── If a record is selected: show the confirm request view ── */}
        {viewRecord ? (
          <ConfirmRequestView
            record={viewRecord}
            onBack={() => setViewRecord(null)}
            onConfirmed={() => { load(); setViewRecord(null); }}
          />
        ) : (
          <>
            {/* ── List header ─────────────────────────────────────── */}
            <div style={{
              background: `linear-gradient(135deg, ${DARK}, ${G})`,
              padding: "16px 22px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <h2 style={{
                margin: 0, color: "#fff",
                fontFamily: "Syne, sans-serif",
                fontSize: 18, fontWeight: 800, letterSpacing: "-.01em",
              }}>
                Patient Laboratory Record
              </h2>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(["all","pending","completed","cancelled"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: "5px 14px", borderRadius: 20, border: "1.5px solid",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    transition: "all .15s",
                    background:  filter === f ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.12)",
                    color:       filter === f ? G : "rgba(255,255,255,.85)",
                    borderColor: filter === f ? "transparent" : "rgba(255,255,255,.25)",
                  }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== "all" && (
                      <span style={{ marginLeft: 4, fontSize: 9, opacity: .8 }}>({counts[f as keyof typeof counts]})</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={onClose}
                  style={{
                    background: "rgba(255,255,255,.15)", border: "none", color: "#fff",
                    borderRadius: "50%", width: 32, height: 32,
                    cursor: "pointer", fontSize: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >✕</button>
              </div>
            </div>

            {/* ── Toolbar ─────────────────────────────────────────── */}
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
                  {allSelected && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <polyline points="2,6 5,9 10,3" stroke={G} strokeWidth="2.2" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                Select All
              </button>

              {/* Sort A-Z */}
              <button
                onClick={() => { setSortAZ(!sortAZ); setSortNewest(false); }}
                style={{
                  background: sortAZ ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)",
                  border: "none", color: "#fff", borderRadius: 7,
                  padding: "6px 12px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >A-Z</button>

              {/* Sort Newest */}
              <button
                onClick={() => { setSortNewest(true); setSortAZ(false); }}
                style={{
                  background: sortNewest ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)",
                  border: "none", color: "#fff", borderRadius: 7,
                  padding: "6px 12px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >Newest First</button>

              {/* Sort Oldest */}
              <button
                onClick={() => { setSortNewest(false); setSortAZ(false); setRecords(prev => [...prev].reverse()); }}
                style={{
                  background: !sortNewest && !sortAZ ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)",
                  border: "none", color: "#fff", borderRadius: 7,
                  padding: "6px 12px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >Oldest First</button>

              {/* Search */}
              <div style={{ flex: 1, position: "relative" }}>
                <svg
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.5)", pointerEvents: "none" }}
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
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

            {/* ── Records table ────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "DM Sans, sans-serif" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                  <tr style={{ background: "#f0fdf4", borderBottom: "2px solid #d1fae5" }}>
                    {[
                      { label: "",               w: 40,        align: "center" },
                      { label: "No.",            w: 40,        align: "center" },
                      { label: "Name",           w: undefined, align: "left"   },
                      { label: "Age",            w: 50,        align: "center" },
                      { label: "Sex",            w: 50,        align: "center" },
                      { label: "Address",        w: undefined, align: "left"   },
                      { label: "Contact",        w: undefined, align: "left"   },
                      { label: "Test Requested", w: undefined, align: "center" },
                      { label: "Date",           w: undefined, align: "center" },
                      { label: "Status",         w: undefined, align: "center" },
                      { label: "Action",         w: undefined, align: "center" },
                    ].map(({ label, w, align }, i) => (
                      <th key={i} style={{
                        ...TH,
                        background: "#e8f5e9", color: "#374151",
                        textAlign: align as any,
                        padding: align === "left" ? "10px 12px" : "10px 8px",
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
                    const isEven     = idx % 2 === 0;

                    return (
                      <tr
                        key={r.id}
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
                            {isSelected && (
                              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                                <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
                              </svg>
                            )}
                          </div>
                        </td>

                        {/* Row number */}
                        <td style={{ textAlign: "center", color: "#9ca3af", fontSize: 11, padding: "10px 8px", verticalAlign: "middle" }}>
                          {idx + 1}
                        </td>

                        {/* Name */}
                        <td style={{ padding: "10px 12px", verticalAlign: "middle", fontWeight: 600, color: "#111827" }}>
                          {r.patient_name}
                        </td>

                        {/* Age */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle", color: "#374151" }}>
                          {r.age || "—"}
                        </td>

                        {/* Sex */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle", color: "#374151" }}>
                          {r.gender}
                        </td>

                        {/* Address */}
                        <td style={{ padding: "10px 12px", verticalAlign: "middle", color: "#374151" }}>
                          {r.address || "—"}
                        </td>

                        {/* Contact */}
                        <td style={{ padding: "10px 12px", verticalAlign: "middle", color: "#374151" }}>
                          {r.contact || "—"}
                        </td>

                        {/* Test badge */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                            background: testBadge.bg, color: testBadge.color, whiteSpace: "nowrap",
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

                        {/* View button */}
                        <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "middle" }}>
                          <button
                            onClick={() => setViewRecord(r)}
                            style={{
                              background: r.status === "completed" ? G
                                        : r.status === "cancelled" ? "#991b1b"
                                        : "#854d0e",
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

                  {/* Filler rows for visual consistency */}
                  {!loading && filtered.length > 0 && filtered.length < 6 &&
                    Array.from({ length: 6 - filtered.length }).map((_, i) => (
                      <tr key={`empty-${i}`} style={{ background: (filtered.length + i) % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td colSpan={11} style={{ height: 44, borderBottom: "1px solid #f1f5f9" }} />
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}