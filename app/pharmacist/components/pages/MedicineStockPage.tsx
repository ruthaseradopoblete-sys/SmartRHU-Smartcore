"use client";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";
import AddMedicineModal      from "../modal/AddMedicineModal";
import DispenseMedicineModal from "../modal/DispenseMedicineModal";

type Props = {
  onToast: (msg: string, type: "success" | "error") => void;
  onMedicineAdded?: () => void;
};

type Tab = "drugs" | "supplies";

/* ─────────────────────────────────────────────
   Export helpers
───────────────────────────────────────────── */
async function exportToExcel(rows: Medicine[], tabLabel: string) {
  const XLSX = await import("xlsx");
  const data = rows.map((m, i) => ({
    "No.": i + 1, "Medicine Name": m.med_name, "Dosage": m.med_dosage,
    "Type": m.med_type, "Unit": m.unit, "EXP Date": m.exp_date, "Qty": m.quantity,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tabLabel);
  XLSX.writeFile(wb, `${tabLabel.toLowerCase().replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

async function exportToPDF(rows: Medicine[], tabLabel: string) {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`${tabLabel} Report`, 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-PH")}`, 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [["#", "Medicine Name", "Dosage", "Type", "Unit", "EXP Date", "Qty"]],
    body: rows.map((m, i) => [i + 1, m.med_name, m.med_dosage, m.med_type, m.unit, m.exp_date, m.quantity]),
    styles: { fontSize: 9 }, headStyles: { fillColor: [26, 94, 53] },
  });
  doc.save(`${tabLabel.toLowerCase().replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

/* ─────────────────────────────────────────────
   Categorisation
───────────────────────────────────────────── */
const DRUG_TYPES   = ["tablet","capsule","syrup","suspension","injection","drops","inhaler","patch","suppository","solution"];
const SUPPLY_TYPES = ["bandage","gauze","gloves","syringe","cotton","alcohol","mask","dressing","iv","catheter","supply","equipment"];

function categorise(med: Medicine): Tab {
  const type = (med.med_type ?? "").toLowerCase();
  if (SUPPLY_TYPES.some(s => type.includes(s))) return "supplies";
  if (DRUG_TYPES.some(d => type.includes(d)))   return "drugs";
  return (med as any).category === "supplies" ? "supplies" : "drugs";
}

/* ─────────────────────────────────────────────
   Download template helper
───────────────────────────────────────────── */
async function downloadTemplate(tab: Tab) {
  const XLSX = await import("xlsx");
  const headers = tab === "drugs"
    ? [["Medicine Name","Dosage (mg)","Medicine Type","Unit","EXP Date (YYYY-MM-DD)","Stock Qty"]]
    : [["Supply Name","Size/Spec","Supply Type","Unit","EXP Date (YYYY-MM-DD)","Stock Qty"]];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  ws["!cols"] = headers[0].map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tab === "drugs" ? "Medicine Drugs" : "Medicine Supplies");
  XLSX.writeFile(wb, `import_template_${tab}.xlsx`);
}

/* ─────────────────────────────────────────────
   Import Modal
───────────────────────────────────────────── */
interface ImportRow {
  med_name: string;
  med_dosage: string;
  med_type: string;
  unit: string;
  exp_date: string;
  quantity: number;
  _status?: "ok" | "error";
  _error?: string;
}

interface ImportModalProps {
  tab: Tab;
  onClose: () => void;
  onImported: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
}

function ImportMedicineModal({ tab, onClose, onImported, onToast }: ImportModalProps) {
  const { t }                           = useTheme();
  const fileRef                         = useRef<HTMLInputElement>(null);
  const [rows, setRows]                 = useState<ImportRow[]>([]);
  const [fileName, setFileName]         = useState("");
  const [importing, setImporting]       = useState(false);
  const [step, setStep]                 = useState<"upload" | "preview" | "done">("upload");
  const [successCount, setSuccessCount] = useState(0);

  const tabLabel = tab === "drugs" ? "Medicine Drugs" : "Medicine Supplies";

  const parseFile = async (file: File) => {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (raw.length < 2) { onToast("File is empty or has no data rows.", "error"); return; }

    const parsed: ImportRow[] = raw.slice(1).filter(r => r[0]).map(r => ({
      med_name:   String(r[0] ?? "").trim(),
      med_dosage: String(r[1] ?? "").trim(),
      med_type:   String(r[2] ?? "").trim(),
      unit:       String(r[3] ?? "").trim(),
      exp_date:   String(r[4] ?? "").trim(),
      quantity:   parseInt(String(r[5] ?? "0"), 10) || 0,
    }));

    const validated = parsed.map(row => {
      if (!row.med_name) return { ...row, _status: "error" as const, _error: "Name required" };
      if (!row.exp_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.exp_date))
        return { ...row, _status: "error" as const, _error: "EXP date must be YYYY-MM-DD" };
      if (row.quantity < 0) return { ...row, _status: "error" as const, _error: "Qty must be ≥ 0" };
      return { ...row, _status: "ok" as const };
    });

    setRows(validated);
    setFileName(file.name);
    setStep("preview");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    const valid = rows.filter(r => r._status === "ok");
    if (valid.length === 0) { onToast("No valid rows to import.", "error"); return; }
    setImporting(true);
    let ok = 0, fail = 0;
    try {
      for (const row of valid) {
        const { error } = await supabase.from("pharma_medicines").insert({
          med_name:   row.med_name,
          med_dosage: row.med_dosage,
          med_type:   row.med_type,
          unit:       row.unit,
          exp_date:   row.exp_date,
          quantity:   row.quantity,
          archived:   false,
          category:   tab,
        });
        if (error) fail++; else ok++;
      }
      setSuccessCount(ok);
      setStep("done");
      if (fail > 0) onToast(`${ok} imported, ${fail} failed.`, "error");
    } catch (err: any) {
      onToast(err.message || "Import failed.", "error");
    } finally {
      setImporting(false);
    }
  };

  const overlay: CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
  };
  const modal: CSSProperties = {
    background: t.card ?? "#fff", borderRadius: 20, width: "min(640px, 95vw)",
    maxHeight: "88vh", display: "flex", flexDirection: "column",
    boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden",
  };
  const hdr: CSSProperties = {
    background: "linear-gradient(135deg,#1b3a1b,#2d5a2d)",
    padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
  };
  const btnPrimary: CSSProperties = {
    background: t.green, color: "#fff", border: "none", borderRadius: 10,
    padding: "9px 22px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  };
  const btnSecondary: CSSProperties = {
    background: "transparent", color: t.text3, border: `1px solid ${t.border2}`, borderRadius: 10,
    padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  };

  const okRows  = rows.filter(r => r._status === "ok").length;
  const errRows = rows.filter(r => r._status === "error").length;

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        <div style={hdr}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{tab === "drugs" ? "💊" : "🩺"}</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Import {tabLabel}</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>Bulk upload via Excel / CSV</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%",
            width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1 }}>
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{
                background: t.greenLight ? `${t.green}12` : "#f0fdf4",
                border: `1px dashed ${t.green}55`, borderRadius: 12, padding: "14px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: t.green }}>📋 Download Template First</div>
                  <div style={{ fontSize: 12, color: t.text3, marginTop: 3 }}>
                    Use the template to format your data correctly before importing.
                  </div>
                </div>
                <button onClick={() => downloadTemplate(tab)} style={{
                  ...btnPrimary, whiteSpace: "nowrap", padding: "8px 16px", fontSize: 12, flexShrink: 0,
                }}>⬇ Template</button>
              </div>

              <div
                onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${t.green}66`, borderRadius: 14,
                  padding: "40px 24px", textAlign: "center",
                  cursor: "pointer", transition: "background 0.15s", background: "transparent",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${t.green}08`)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 4 }}>
                  Drag & drop your file here
                </div>
                <div style={{ fontSize: 12, color: t.text3 }}>
                  or click to browse — .xlsx, .xls, .csv supported
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }} onChange={handleFile} />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, marginBottom: 8 }}>
                  Expected columns (in order):
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(tab === "drugs"
                    ? ["Medicine Name","Dosage (mg)","Medicine Type","Unit","EXP Date","Stock Qty"]
                    : ["Supply Name","Size/Spec","Supply Type","Unit","EXP Date","Stock Qty"]
                  ).map((col, i) => (
                    <span key={i} style={{
                      background: `${t.green}18`, color: t.green,
                      borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    }}>{col}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                  ✅ {okRows} valid row{okRows !== 1 ? "s" : ""}
                </div>
                {errRows > 0 && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#dc2626" }}>
                    ❌ {errRows} row{errRows !== 1 ? "s" : ""} with errors
                  </div>
                )}
                <div style={{ background: `${t.green}12`, border: `1px solid ${t.green}33`,
                  borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 600, color: t.text3,
                  marginLeft: "auto" }}>
                  📄 {fileName}
                </div>
              </div>

              <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${t.border2}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: t.tableRow }}>
                      {["#","Name","Dosage","Type","Unit","EXP Date","Qty","Status"].map(h => (
                        <th key={h} style={{
                          padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 800,
                          color: t.tableHead, textTransform: "uppercase",
                          borderBottom: `1px solid ${t.tableRowBorder}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ background: row._status === "error" ? "#fff5f5" : "transparent" }}>
                        <td style={{ padding: "7px 10px", color: t.text3, borderBottom: `1px solid ${t.tableRowBorder}` }}>{i + 1}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: t.text, borderBottom: `1px solid ${t.tableRowBorder}` }}>{row.med_name || "—"}</td>
                        <td style={{ padding: "7px 10px", color: t.text2, borderBottom: `1px solid ${t.tableRowBorder}` }}>{row.med_dosage || "—"}</td>
                        <td style={{ padding: "7px 10px", color: t.text2, borderBottom: `1px solid ${t.tableRowBorder}` }}>{row.med_type || "—"}</td>
                        <td style={{ padding: "7px 10px", color: t.text2, borderBottom: `1px solid ${t.tableRowBorder}` }}>{row.unit || "—"}</td>
                        <td style={{ padding: "7px 10px", color: t.text2, borderBottom: `1px solid ${t.tableRowBorder}` }}>{row.exp_date || "—"}</td>
                        <td style={{ padding: "7px 10px", color: t.text2, borderBottom: `1px solid ${t.tableRowBorder}` }}>{row.quantity}</td>
                        <td style={{ padding: "7px 10px", borderBottom: `1px solid ${t.tableRowBorder}` }}>
                          {row._status === "ok"
                            ? <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 11 }}>✓ OK</span>
                            : <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 11 }} title={row._error}>⚠ {row._error}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {errRows > 0 && (
                <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2",
                  borderRadius: 10, padding: "10px 14px", fontWeight: 600 }}>
                  ⚠️ Rows with errors will be skipped. Fix your file and re-upload to include them.
                </div>
              )}
            </div>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: t.green, marginBottom: 6 }}>
                Import Complete!
              </div>
              <div style={{ fontSize: 14, color: t.text3 }}>
                <strong style={{ color: t.text }}>{successCount}</strong> {tabLabel.toLowerCase()} added successfully.
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: "14px 24px", borderTop: `1px solid ${t.border2}`,
          display: "flex", justifyContent: "flex-end", gap: 10,
          background: t.card ?? "#fff",
        }}>
          {step === "upload" && <button onClick={onClose} style={btnSecondary}>Cancel</button>}
          {step === "preview" && (
            <>
              <button onClick={() => { setRows([]); setFileName(""); setStep("upload"); }} style={btnSecondary}>
                ← Re-upload
              </button>
              <button onClick={handleImport} disabled={importing || okRows === 0} style={{
                ...btnPrimary,
                opacity: importing || okRows === 0 ? 0.6 : 1,
                cursor: importing || okRows === 0 ? "not-allowed" : "pointer",
              }}>
                {importing ? "Importing…" : `Import ${okRows} Row${okRows !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={() => { onImported(); onClose(); }} style={btnPrimary}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function MedicineStockPage({ onToast, onMedicineAdded }: Props) {
  const { t } = useTheme();
  const [medicines, setMedicines]             = useState<Medicine[]>([]);
  const [archivedMeds, setArchivedMeds]       = useState<Medicine[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [selected, setSelected]               = useState<string[]>([]);
  const [showExport, setShowExport]           = useState(false);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [dispenseTarget, setDispenseTarget]   = useState<Medicine | null>(null);
  const [activeTab, setActiveTab]             = useState<Tab>("drugs");
  const [showArchived, setShowArchived]       = useState(false);

  /* ── Fetch active medicines ── */
  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pharma_medicines").select("*")
        .eq("archived", false).order("created_at", { ascending: false });
      if (error) throw error;

      const all = (data as Medicine[]) ?? [];

      // Auto-archive expired
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expired = all.filter(m => new Date(m.exp_date) < today);

      if (expired.length > 0) {
        await Promise.all(
          expired.map(m =>
            supabase.from("pharma_medicines").update({ archived: true }).eq("id", m.id)
          )
        );
        const { data: fresh, error: err2 } = await supabase
          .from("pharma_medicines").select("*")
          .eq("archived", false).order("created_at", { ascending: false });
        if (err2) throw err2;
        setMedicines((fresh as Medicine[]) ?? []);
        onToast(`${expired.length} expired item(s) auto-archived.`, "success");
      } else {
        setMedicines(all);
      }
    } catch (err: any) {
      onToast(err.message || "Failed to load medicines.", "error");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  /* ── Fetch archived medicines ── */
  const fetchArchived = useCallback(async () => {
    setLoadingArchived(true);
    try {
      const { data, error } = await supabase
        .from("pharma_medicines").select("*")
        .eq("archived", true).order("updated_at", { ascending: false });
      if (error) throw error;
      setArchivedMeds((data as Medicine[]) ?? []);
    } catch (err: any) {
      onToast(err.message || "Failed to load archived.", "error");
    } finally {
      setLoadingArchived(false);
    }
  }, [onToast]);

  /* ── Unarchive / Restore ── */
  const unarchiveItem = async (id: string) => {
    try {
      const { error } = await supabase.from("pharma_medicines")
        .update({ archived: false }).eq("id", id);
      if (error) throw error;
      onToast("Item restored successfully.", "success");
      fetchArchived();
      fetchMedicines();
    } catch (err: any) {
      onToast(err.message || "Failed to restore.", "error");
    }
  };

  // ── KEY FIX: fetchArchived on mount so count shows immediately ──
  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);
  useEffect(() => { fetchArchived(); }, [fetchArchived]);
  useEffect(() => { if (showArchived) fetchArchived(); }, [showArchived, fetchArchived]);
  useEffect(() => { setSelected([]); }, [activeTab]);

  const tabRows     = medicines.filter(m => categorise(m) === activeTab);
  const drugCount   = medicines.filter(m => categorise(m) === "drugs").length;
  const supplyCount = medicines.filter(m => categorise(m) === "supplies").length;
  const tabLabel    = activeTab === "drugs" ? "Medicine Drugs" : "Medicine Supplies";

  const toggleAll = () =>
    setSelected(s => s.length === tabRows.length ? [] : tabRows.map(m => m.id));
  const toggleRow = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const archiveSelected = async () => {
    if (selected.length === 0) return;
    try {
      for (const id of selected) {
        const { error } = await supabase.from("pharma_medicines")
          .update({ archived: true }).eq("id", id);
        if (error) throw error;
      }
      onToast(`Archived ${selected.length} item(s).`, "success");
      setSelected([]);
      fetchMedicines();
      if (showArchived) fetchArchived();
    } catch (err: any) {
      onToast(err.message || "Failed to archive.", "error");
    }
  };

  const thStyle: CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800,
    color: t.tableHead, textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: `1px solid ${t.tableRowBorder}`, background: t.tableRow,
  };
  const tdStyle = (sel: boolean): CSSProperties => ({
    padding: "10px 14px", borderBottom: `1px solid ${t.tableRowBorder}`,
    color: t.text2, background: sel ? t.tableRowSel : t.tableRow, verticalAlign: "middle",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, marginBottom: 2 }}>Pharmacist</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: t.green, margin: 0 }}>Medicine Stocks</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowImportModal(true)} style={{
            background: "transparent", color: t.green, border: `2px solid ${t.green}`,
            borderRadius: 22, padding: "8px 18px", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center",
            gap: 6, transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = `${t.green}12`; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import
          </button>
          <button onClick={() => setShowAddModal(true)} style={{
            background: t.green, color: "#fff", border: "none", borderRadius: 22,
            padding: "9px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
            boxShadow: `0 3px 12px ${t.green}55`,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 300 }}>+</span>
            Medicine
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 6, borderBottom: `2px solid ${t.border2}` }}>
        {(["drugs", "supplies"] as Tab[]).map(tab => {
          const label  = tab === "drugs" ? "Medicine Drugs" : "Medicine Supplies";
          const count  = tab === "drugs" ? drugCount : supplyCount;
          const active = activeTab === tab && !showArchived;
          const icon   = tab === "drugs"
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
              </svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>
              </svg>;
          return (
            <button key={tab} onClick={() => { setActiveTab(tab); setShowArchived(false); }} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 20px",
              background: active ? t.green : "transparent",
              color: active ? "#fff" : t.text3, border: "none",
              borderRadius: "10px 10px 0 0", fontFamily: "inherit", fontSize: 13,
              fontWeight: active ? 700 : 600, cursor: "pointer", marginBottom: -2,
              borderBottom: active ? `2px solid ${t.green}` : "2px solid transparent",
              transition: "all 0.15s",
            }}>
              {icon}
              {label}
              <span style={{
                background: active ? "rgba(255,255,255,0.25)" : t.tableRowBorder,
                color: active ? "#fff" : t.text3, borderRadius: 20, padding: "1px 8px",
                fontSize: 11, fontWeight: 700, minWidth: 22, textAlign: "center",
              }}>{count}</span>
            </button>
          );
        })}

        {/* Archived tab */}
        <button onClick={() => setShowArchived(v => !v)} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "9px 20px",
          background: showArchived ? "#6b7280" : "transparent",
          color: showArchived ? "#fff" : t.text3, border: "none",
          borderRadius: "10px 10px 0 0", fontFamily: "inherit", fontSize: 13,
          fontWeight: showArchived ? 700 : 600, cursor: "pointer", marginBottom: -2,
          borderBottom: showArchived ? "2px solid #6b7280" : "2px solid transparent",
          transition: "all 0.15s",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
          Archived
          <span style={{
            background: showArchived ? "rgba(255,255,255,0.25)" : t.tableRowBorder,
            color: showArchived ? "#fff" : t.text3, borderRadius: 20, padding: "1px 8px",
            fontSize: 11, fontWeight: 700, minWidth: 22, textAlign: "center",
          }}>{archivedMeds.length}</span>
        </button>
      </div>

      {/* ── Active Toolbar + Table ── */}
      {!showArchived && (
        <div>
          <div style={{
            background: t.green, borderRadius: "10px 10px 0 0", padding: "7px 12px",
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", position: "relative",
          }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 4, color: "#fff",
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <input type="checkbox"
                checked={tabRows.length > 0 && selected.length === tabRows.length}
                onChange={toggleAll} style={{ accentColor: "#fff", width: 12, height: 12 }} />
              Select All
            </label>

            <button onClick={archiveSelected} disabled={selected.length === 0} style={{
              display: "flex", alignItems: "center", gap: 4, color: "#fff",
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              background: "none", border: "none", fontFamily: "inherit",
              opacity: selected.length === 0 ? 0.5 : 1,
            }}>
              Archive ({selected.length})
            </button>

            <div style={{
              background: "rgba(255,255,255,0.18)", borderRadius: 20,
              padding: "2px 12px", fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.04em",
            }}>{tabLabel}</div>

            <div style={{ marginLeft: "auto", position: "relative" }}>
              <button onClick={() => setShowExport(v => !v)} style={{
                background: t.greenLight, color: "#fff", border: "none", borderRadius: 12,
                padding: "4px 16px", fontSize: 11, fontWeight: 800, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: "0.05em",
              }}>EXPORT</button>
              {showExport && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)",
                  background: t.notifBg ?? "#fff", borderRadius: 12,
                  boxShadow: "0 8px 28px rgba(0,0,0,0.15)",
                  border: `1px solid ${t.notifBorder ?? "#e5e7eb"}`,
                  overflow: "hidden", zIndex: 100, minWidth: 190,
                }}>
                  <button onClick={() => { exportToPDF(tabRows, tabLabel); setShowExport(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 16px", border: "none", cursor: "pointer",
                      fontFamily: "inherit", background: t.notifBg ?? "#fff",
                      borderBottom: `1px solid ${t.notifBorder ?? "#f3f4f6"}`, transition: "background 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                    onMouseLeave={e => (e.currentTarget.style.background = t.notifBg ?? "#fff")}>
                    <div style={{ width: 34, height: 40, flexShrink: 0 }}>
                      <svg width="34" height="40" viewBox="0 0 34 40" fill="none">
                        <path d="M4 0h18l12 12v24a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#fee2e2"/>
                        <path d="M22 0l12 12H26a4 4 0 0 1-4-4V0z" fill="#fca5a5"/>
                        <text x="17" y="30" textAnchor="middle" fontSize="10" fontWeight="800" fill="#dc2626" fontFamily="inherit">PDF</text>
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.notifText ?? "#1f2937" }}>Download as PDF</span>
                  </button>
                  <button onClick={() => { exportToExcel(tabRows, tabLabel); setShowExport(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 16px", border: "none", cursor: "pointer",
                      fontFamily: "inherit", background: t.notifBg ?? "#fff", transition: "background 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                    onMouseLeave={e => (e.currentTarget.style.background = t.notifBg ?? "#fff")}>
                    <div style={{ width: 34, height: 40, flexShrink: 0 }}>
                      <svg width="34" height="40" viewBox="0 0 34 40" fill="none">
                        <path d="M4 0h18l12 12v24a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#dcfce7"/>
                        <path d="M22 0l12 12H26a4 4 0 0 1-4-4V0z" fill="#86efac"/>
                        <text x="17" y="30" textAnchor="middle" fontSize="9" fontWeight="800" fill="#16a34a" fontFamily="inherit">XLS</text>
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.notifText ?? "#1f2937" }}>Download as Excel</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: t.tableRow, border: `1px solid ${t.border2}`,
            borderTop: "none", borderRadius: "0 0 14px 14px", overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 50 }}>No.</th>
                  <th style={thStyle}>Medicine Name</th>
                  <th style={thStyle}>Mg (Dosage)</th>
                  <th style={thStyle}>{activeTab === "drugs" ? "Medicine Type" : "Supply Type"}</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>EXP Date</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Stock Qty</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: "30px", textAlign: "center", color: t.text3, fontSize: 13 }}>Loading…</td></tr>
                ) : tabRows.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: t.text3, fontSize: 13 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 36 }}>{activeTab === "drugs" ? "💊" : "🩺"}</span>
                      <span>No {tabLabel.toLowerCase()} found.</span>
                      <button onClick={() => setShowImportModal(true)} style={{
                        background: `${t.green}18`, color: t.green, border: `1px solid ${t.green}44`,
                        borderRadius: 10, padding: "7px 18px", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                      }}>⬆ Import from file</button>
                    </div>
                  </td></tr>
                ) : tabRows.map((med, n) => {
                  const sel        = selected.includes(med.id);
                  const isExpired  = new Date(med.exp_date) < new Date();
                  const outOfStock = med.quantity === 0;
                  return (
                    <tr key={med.id}>
                      <td style={tdStyle(sel)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleRow(med.id)}
                            style={{ accentColor: t.green, width: 12, height: 12 }} />
                          <span style={{ color: t.text3, fontSize: 12 }}>{n + 1}</span>
                        </div>
                      </td>
                      <td style={tdStyle(sel)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{activeTab === "drugs" ? "💊" : "🩺"}</span>
                          <span style={{ fontWeight: 600, color: t.text }}>{med.med_name}</span>
                        </div>
                      </td>
                      <td style={tdStyle(sel)}>{med.med_dosage}</td>
                      <td style={tdStyle(sel)}>{med.med_type}</td>
                      <td style={tdStyle(sel)}>{med.unit}</td>
                      <td style={{ ...tdStyle(sel), color: isExpired ? "#d63031" : t.text2 }}>
                        {med.exp_date}
                        {isExpired && (
                          <span style={{ fontSize: 10, marginLeft: 4, background: "#d63031",
                            color: "#fff", borderRadius: 4, padding: "1px 5px" }}>EXPIRED</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle(sel), textAlign: "right", fontWeight: 700,
                        color: med.quantity <= 10 ? "#d63031" : t.text2 }}>
                        {med.quantity}
                      </td>
                      <td style={{ ...tdStyle(sel), textAlign: "center" }}>
                        <button
                          onClick={() => setDispenseTarget(med)}
                          disabled={isExpired || outOfStock}
                          title={isExpired ? "Medicine expired" : outOfStock ? "Out of stock" : "Dispense"}
                          style={{
                            background: isExpired || outOfStock ? t.tableRowBorder : t.green,
                            color:      isExpired || outOfStock ? t.text3 : "#fff",
                            border: "none", borderRadius: 8, padding: "5px 14px",
                            fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                            cursor: isExpired || outOfStock ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                          }}>
                          {outOfStock ? "Empty" : "Dispense"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Archived Table ── */}
      {showArchived && (
        <div>
          <div style={{
            background: "#6b7280", borderRadius: "10px 10px 0 0", padding: "7px 12px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              background: "rgba(255,255,255,0.18)", borderRadius: 20,
              padding: "2px 12px", fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.04em",
            }}>Archived Medicines &amp; Supplies</div>
            <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
              {archivedMeds.length} item{archivedMeds.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div style={{
            background: t.tableRow, border: `1px solid ${t.border2}`,
            borderTop: "none", borderRadius: "0 0 14px 14px", overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 50 }}>No.</th>
                  <th style={thStyle}>Medicine Name</th>
                  <th style={thStyle}>Mg (Dosage)</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>EXP Date</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Stock Qty</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingArchived ? (
                  <tr><td colSpan={8} style={{ padding: "30px", textAlign: "center", color: t.text3, fontSize: 13 }}>Loading…</td></tr>
                ) : archivedMeds.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: t.text3, fontSize: 13 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 36 }}>📦</span>
                      <span>No archived items found.</span>
                    </div>
                  </td></tr>
                ) : archivedMeds.map((med, n) => {
                  const isExpired = new Date(med.exp_date) < new Date();
                  return (
                    <tr key={med.id}>
                      <td style={tdStyle(false)}>
                        <span style={{ color: t.text3, fontSize: 12 }}>{n + 1}</span>
                      </td>
                      <td style={tdStyle(false)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>
                            {(med as any).category === "supplies" ? "🩺" : "💊"}
                          </span>
                          <span style={{ fontWeight: 600, color: t.text }}>{med.med_name}</span>
                        </div>
                      </td>
                      <td style={tdStyle(false)}>{med.med_dosage}</td>
                      <td style={tdStyle(false)}>{med.med_type}</td>
                      <td style={tdStyle(false)}>{med.unit}</td>
                      <td style={{ ...tdStyle(false), color: isExpired ? "#d63031" : t.text2 }}>
                        {med.exp_date}
                        {isExpired && (
                          <span style={{ fontSize: 10, marginLeft: 4, background: "#d63031",
                            color: "#fff", borderRadius: 4, padding: "1px 5px" }}>EXPIRED</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle(false), textAlign: "right", fontWeight: 700 }}>
                        {med.quantity}
                      </td>
                      <td style={{ ...tdStyle(false), textAlign: "center" }}>
                        <button
                          onClick={() => unarchiveItem(med.id)}
                          style={{
                            background: "transparent", color: t.green,
                            border: `1px solid ${t.green}`, borderRadius: 8,
                            padding: "5px 14px", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                          }}>
                          Restore
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showAddModal && (
        <AddMedicineModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { fetchMedicines(); onMedicineAdded?.(); }}
          onToast={onToast}
          defaultTab={activeTab}
        />
      )}

      {showImportModal && (
        <ImportMedicineModal
          tab={activeTab}
          onClose={() => setShowImportModal(false)}
          onImported={() => { fetchMedicines(); onMedicineAdded?.(); }}
          onToast={onToast}
        />
      )}

      {dispenseTarget && (
        <DispenseMedicineModal
          medicine={dispenseTarget}
          onClose={() => setDispenseTarget(null)}
          onSaved={() => { fetchMedicines(); onMedicineAdded?.(); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}