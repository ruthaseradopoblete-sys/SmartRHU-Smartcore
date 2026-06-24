"use client";
import { CSSProperties, useCallback, useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";
import AddMedicineModal from "../modal/AddMedicineModal";
import RestockModal     from "../modal/RestockModal";

type Props = {
  onToast: (msg: string, type: "success" | "error") => void;
  onMedicineAdded?: () => void;
};

type Tab = "drugs" | "supplies";

type ImportRow = {
  med_name:   string;
  med_dosage: string;   // stores either Dosage (drugs) or Specification (supplies)
  med_type:   string;
  unit:       string;
  exp_date:   string;
  quantity:   number;
};

// ── SVG icons ──────────────────────────────────────────────────────────────────
const IconDrug = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
    <circle cx="18" cy="18" r="4"/>
    <path d="M18 14v8M14 18h8"/>
  </svg>
);
const IconSupply = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>
  </svg>
);
const IconArchive = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);
const IconRestock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4"/>
  </svg>
);
const IconSearch = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconImport = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconExcelFile = () => (
  <svg width="34" height="40" viewBox="0 0 34 40" fill="none">
    <path d="M4 0h18l12 12v24a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#dcfce7"/>
    <path d="M22 0l12 12H26a4 4 0 0 1-4-4V0z" fill="#86efac"/>
    <text x="17" y="30" textAnchor="middle" fontSize="9" fontWeight="800" fill="#16a34a" fontFamily="inherit">XLS</text>
  </svg>
);
const IconPdfFile = () => (
  <svg width="34" height="40" viewBox="0 0 34 40" fill="none">
    <path d="M4 0h18l12 12v24a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#fee2e2"/>
    <path d="M22 0l12 12H26a4 4 0 0 1-4-4V0z" fill="#fca5a5"/>
    <text x="17" y="30" textAnchor="middle" fontSize="10" fontWeight="800" fill="#dc2626" fontFamily="inherit">PDF</text>
  </svg>
);

// ── Export helpers ─────────────────────────────────────────────────────────────
async function exportToExcel(rows: Medicine[], tabLabel: string, isDrugs: boolean) {
  const XLSX = await import("xlsx");
  const data = rows.map((m, i) => ({
    "No.":                          i + 1,
    "Medicine Name":                m.med_name,
    [isDrugs ? "Dosage" : "Specification"]: m.med_dosage,
    "Type":                         m.med_type,
    "Unit":                         m.unit,
    "EXP Date":                     m.exp_date,
    "Quantity":                     m.quantity,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tabLabel);
  XLSX.writeFile(wb, `${tabLabel.toLowerCase().replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

async function exportToPDF(rows: Medicine[], tabLabel: string, isDrugs: boolean) {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`${tabLabel} Report`, 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-PH")}`, 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [["#", "Medicine", isDrugs ? "Dosage" : "Specification", "Type", "Unit", "EXP Date", "Quantity"]],
    body: rows.map((m, i) => [
      i + 1, m.med_name, m.med_dosage, m.med_type, m.unit, m.exp_date, m.quantity,
    ]),
    styles: { fontSize: 8 }, headStyles: { fillColor: [26, 94, 53] },
  });
  doc.save(`${tabLabel.toLowerCase().replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ── Categorise medicine by type ────────────────────────────────────────────────
const DRUG_TYPES   = ["tablet","capsule","syrup","suspension","injection","drops","inhaler","patch","suppository","solution","ointment","powder","injectable","vaccine","vial"];
const SUPPLY_TYPES = ["bandage","gauze","gloves","syringe","cotton","alcohol","mask","dressing","iv","catheter","supply","equipment","lab","ppe","insecticide","tape","form"];

function categorise(med: Medicine): Tab {
  const type = (med.med_type ?? "").toLowerCase();
  if (SUPPLY_TYPES.some(s => type.includes(s))) return "supplies";
  if (DRUG_TYPES.some(d => type.includes(d)))   return "drugs";
  return "drugs";
}

// ── Stock badge component ──────────────────────────────────────────────────────
function StockBadge({ med }: { med: Medicine }) {
  const total     = med.quantity;
  const unitLabel = med.unit || "pcs";
  const color     = total === 0 ? "#dc2626" : total <= 10 ? "#d97706" : "#16a34a";
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 15, fontWeight: 900, color }}>{total}</div>
      <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.4 }}>{unitLabel}</div>
    </div>
  );
}

// ── Detect whether an import file is for supplies based on its columns ─────────
// Returns true if the file has a "Specification" column (supply template),
// false if it has "Dosage" (drug template) or neither (fall back to drug).
function detectImportType(row: Record<string, unknown>): "drugs" | "supplies" {
  if ("Specification" in row || "specification" in row) return "supplies";
  return "drugs";
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MedicineStockPage({ onToast, onMedicineAdded }: Props) {
  const { t } = useTheme();
  const [medicines, setMedicines]             = useState<Medicine[]>([]);
  const [archivedMeds, setArchivedMeds]       = useState<Medicine[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [selected, setSelected]               = useState<string[]>([]);
  const [showExport, setShowExport]           = useState(false);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [restockTarget, setRestockTarget]     = useState<Medicine | null>(null);
  const [activeTab, setActiveTab]             = useState<Tab>("drugs");
  const [showArchived, setShowArchived]       = useState(false);
  const [search, setSearch]                   = useState("");

  useEffect(() => {
    const handler = (e: Event) => setSearch((e as CustomEvent).detail?.toLowerCase() ?? "");
    window.addEventListener("header-search", handler);
    return () => window.removeEventListener("header-search", handler);
  }, []);

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pharma_medicines").select("*")
        .eq("archived", false).order("created_at", { ascending: false });
      if (error) throw error;
      const all = (data as Medicine[]) ?? [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const expired = all.filter(m => new Date(m.exp_date) < today);
      if (expired.length > 0) {
        await Promise.all(expired.map(m =>
          supabase.from("pharma_medicines").update({ archived: true }).eq("id", m.id)
        ));
        const { data: fresh } = await supabase
          .from("pharma_medicines").select("*")
          .eq("archived", false).order("created_at", { ascending: false });
        setMedicines((fresh as Medicine[]) ?? []);
        onToast(`${expired.length} expired item(s) auto-archived.`, "success");
      } else {
        setMedicines(all);
      }
    } catch (err: any) {
      onToast(err.message || "Failed to load medicines.", "error");
    } finally { setLoading(false); }
  }, [onToast]);

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
    } finally { setLoadingArchived(false); }
  }, [onToast]);

  const unarchiveItem = async (id: string) => {
    try {
      await supabase.from("pharma_medicines").update({ archived: false }).eq("id", id);
      onToast("Item restored successfully.", "success");
      fetchArchived(); fetchMedicines();
    } catch (err: any) { onToast(err.message || "Failed to restore.", "error"); }
  };

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);
  useEffect(() => { fetchArchived(); }, [fetchArchived]);
  useEffect(() => { if (showArchived) fetchArchived(); }, [showArchived, fetchArchived]);
  useEffect(() => { setSelected([]); }, [activeTab]);

  const [importPreview,     setImportPreview]     = useState<ImportRow[] | null>(null);
  const [importIsSupplies,  setImportIsSupplies]  = useState(false);   // ← NEW
  const [importing,         setImporting]         = useState(false);

  // ── Step 1: parse Excel → detect type → show preview modal ────────────────
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const XLSX   = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb     = XLSX.read(buffer);
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const rows   = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      if (rows.length === 0) {
        onToast("No valid rows found in file.", "error");
        return;
      }

      // ── Detect whether this is a supplies or drugs template ──────────────
      const fileType = detectImportType(rows[0]);
      setImportIsSupplies(fileType === "supplies");

      const parsed: ImportRow[] = rows
        .map(row => {
          const name = String(row["Medicine Name"] ?? row["med_name"] ?? "").trim();
          if (!name) return null;

          // ── Read Specification OR Dosage, whichever is present ──────────
          const specOrDosage = String(
            row["Specification"] ?? row["specification"] ??
            row["Dosage"]        ?? row["dosage"]        ??
            row["med_dosage"]    ?? "N/A"
          ).trim();

          const quantity = parseInt(String(
            row["Quantity"] ?? row["quantity"] ?? row["Total Pieces"] ?? row["Stock"] ?? "0"
          ), 10);

          return {
            med_name:   name,
            med_dosage: specOrDosage,
            med_type:   String(row["Type"] ?? row["med_type"] ?? (fileType === "supplies" ? "Supply" : "Tablet")).trim(),
            unit:       String(row["Unit"] ?? row["unit"]     ?? "Pieces").trim(),
            exp_date:   String(row["EXP Date"] ?? row["exp_date"] ?? new Date().toISOString().split("T")[0]),
            quantity:   isNaN(quantity) ? 0 : quantity,
          } as ImportRow;
        })
        .filter(Boolean) as ImportRow[];

      if (parsed.length === 0) {
        onToast("No valid rows found in file.", "error");
        return;
      }
      setImportPreview(parsed);
    } catch (err: any) {
      onToast(err.message || "Failed to read file.", "error");
    }
  };

  // ── Step 2: user confirmed → insert all rows ──────────────────────────────
  const handleImportConfirm = async () => {
    if (!importPreview) return;
    setImporting(true);
    let count = 0;
    try {
      for (const row of importPreview) {
        const { error } = await supabase.from("pharma_medicines").insert([{
          ...row,
          archived: false,
        }]);
        if (!error) count++;
      }
      onToast(`Imported ${count} item(s) successfully.`, "success");
      setImportPreview(null);
      fetchMedicines();
      onMedicineAdded?.();
    } catch (err: any) {
      onToast(err.message || "Failed to import.", "error");
    } finally {
      setImporting(false);
    }
  };

  const tabRows = medicines
    .filter(m => categorise(m) === activeTab)
    .filter(m =>
      !search ||
      m.med_name.toLowerCase().includes(search)   ||
      m.med_type.toLowerCase().includes(search)   ||
      m.med_dosage.toLowerCase().includes(search) ||
      m.unit.toLowerCase().includes(search)       ||
      m.exp_date.includes(search)
    );

  const drugCount   = medicines.filter(m => categorise(m) === "drugs").length;
  const supplyCount = medicines.filter(m => categorise(m) === "supplies").length;
  const tabLabel    = activeTab === "drugs" ? "Medicine Drugs" : "Medicine Supplies";
  const isDrugsTab  = activeTab === "drugs";

  const toggleAll = () =>
    setSelected(s => s.length === tabRows.length ? [] : tabRows.map(m => m.id));
  const toggleRow = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const archiveSelected = async () => {
    if (selected.length === 0) return;
    try {
      for (const id of selected)
        await supabase.from("pharma_medicines").update({ archived: true }).eq("id", id);
      onToast(`Archived ${selected.length} item(s).`, "success");
      setSelected([]); fetchMedicines();
      if (showArchived) fetchArchived();
    } catch (err: any) { onToast(err.message || "Failed to archive.", "error"); }
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

  const TabBtn = ({ tab }: { tab: Tab }) => {
    const count  = tab === "drugs" ? drugCount : supplyCount;
    const active = activeTab === tab && !showArchived;
    return (
      <button onClick={() => { setActiveTab(tab); setShowArchived(false); }} style={{
        display: "flex", alignItems: "center", gap: 7, padding: "9px 20px",
        background: active ? t.green : "transparent",
        color: active ? "#fff" : t.text3,
        border: "none", borderRadius: "10px 10px 0 0",
        fontFamily: "inherit", fontSize: 13, fontWeight: active ? 700 : 600,
        cursor: "pointer", marginBottom: -2,
        borderBottom: active ? `2px solid ${t.green}` : "2px solid transparent",
        transition: "all 0.15s",
      }}>
        {tab === "drugs" ? <IconDrug /> : <IconSupply />}
        {tab === "drugs" ? "Medicine Drugs" : "Medicine Supplies"}
        <span style={{
          background: active ? "rgba(255,255,255,0.25)" : t.tableRowBorder,
          color: active ? "#fff" : t.text3,
          borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700,
        }}>{count}</span>
      </button>
    );
  };

  // ── Column label: "Dosage" for drugs, "Specification" for supplies ─────────
  const dosageColLabel   = isDrugsTab ? "Dosage"         : "Specification";
  const importColLabel   = importIsSupplies ? "Specification" : "Dosage";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, marginBottom: 2 }}>Pharmacist</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: t.green, margin: 0 }}>Medicine Inventory</h1>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

          {/* Import Excel */}
          <label style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "transparent", color: t.green,
            border: `2px solid ${t.green}`, borderRadius: 22,
            padding: "8px 18px", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = `${t.green}12`)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <IconImport />
            Import
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              style={{ display: "none" }}
            />
          </label>

          {/* Add Medicine */}
          <button onClick={() => setShowAddModal(true)} style={{
            background: t.green, color: "#fff", border: "none", borderRadius: 22,
            padding: "9px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
            boxShadow: `0 3px 12px ${t.green}55`,
          }}>
            <IconPlus />
            Medicine
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: `2px solid ${t.border2}` }}>
        <TabBtn tab="drugs" />
        <TabBtn tab="supplies" />
        <button onClick={() => setShowArchived(v => !v)} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "9px 20px",
          background: showArchived ? "#6b7280" : "transparent",
          color: showArchived ? "#fff" : t.text3,
          border: "none", borderRadius: "10px 10px 0 0",
          fontFamily: "inherit", fontSize: 13, fontWeight: showArchived ? 700 : 600,
          cursor: "pointer", marginBottom: -2,
          borderBottom: showArchived ? "2px solid #6b7280" : "2px solid transparent",
          transition: "all 0.15s",
        }}>
          <IconArchive />
          Archived
          <span style={{
            background: showArchived ? "rgba(255,255,255,0.25)" : t.tableRowBorder,
            color: showArchived ? "#fff" : t.text3,
            borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700,
          }}>{archivedMeds.length}</span>
        </button>
      </div>

      {/* ── Active medicines table ── */}
      {!showArchived && (
        <div>
          {/* Toolbar */}
          <div style={{
            background: t.green, borderRadius: "10px 10px 0 0", padding: "7px 12px",
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4,
              color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <input type="checkbox"
                checked={tabRows.length > 0 && selected.length === tabRows.length}
                onChange={toggleAll} style={{ accentColor: "#fff", width: 12, height: 12 }} />
              Select All
            </label>

            <button onClick={archiveSelected} disabled={selected.length === 0} style={{
              color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: "none", border: "none", fontFamily: "inherit",
              opacity: selected.length === 0 ? 0.5 : 1,
            }}>Archive ({selected.length})</button>

            {search && (
              <div style={{
                background: "rgba(255,255,255,0.2)", borderRadius: 20,
                padding: "2px 12px", fontSize: 11, color: "#fff", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <IconSearch />
                &quot;{search}&quot;
              </div>
            )}

            {/* Export */}
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
                  overflow: "hidden", zIndex: 100, minWidth: 180,
                }}>
                  {[
                    { label: "Download as PDF",   action: () => exportToPDF(tabRows, tabLabel, isDrugsTab),   clr: "#dc2626", icon: <IconPdfFile /> },
                    { label: "Download as Excel", action: () => exportToExcel(tabRows, tabLabel, isDrugsTab), clr: "#16a34a", icon: <IconExcelFile /> },
                  ].map((opt, i, arr) => (
                    <button key={opt.label}
                      onClick={() => { opt.action(); setShowExport(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 16px", border: "none", cursor: "pointer",
                        fontFamily: "inherit", background: t.notifBg ?? "#fff",
                        borderBottom: i < arr.length - 1 ? `1px solid ${t.notifBorder ?? "#f3f4f6"}` : "none",
                        fontSize: 13, fontWeight: 600, color: t.notifText ?? "#1f2937",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${opt.clr}11`)}
                      onMouseLeave={e => (e.currentTarget.style.background = t.notifBg ?? "#fff")}>
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: t.tableRow, border: `1px solid ${t.border2}`,
            borderTop: "none", borderRadius: "0 0 14px 14px", overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 50 }}>No.</th>
                  <th style={thStyle}>Medicine Name</th>
                  {/* ── "Dosage" for drugs, "Specification" for supplies ── */}
                  <th style={thStyle}>{dosageColLabel}</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>EXP Date</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Stock</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: "30px", textAlign: "center", color: t.text3 }}>
                    Loading…
                  </td></tr>
                ) : tabRows.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "30px", textAlign: "center", color: t.text3 }}>
                    {search
                      ? `No medicines found matching "${search}"`
                      : `No ${tabLabel.toLowerCase()} found. Add one to get started.`}
                  </td></tr>
                ) : tabRows.map((med, n) => {
                  const sel        = selected.includes(med.id);
                  const isExpired  = new Date(med.exp_date) < new Date();
                  const outOfStock = med.quantity === 0;
                  const isLowStock = !outOfStock && med.quantity <= 10;

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
                          <span style={{ color: t.text3, flexShrink: 0 }}>
                            {isDrugsTab ? <IconDrug /> : <IconSupply />}
                          </span>
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
                      <td style={tdStyle(sel)}>
                        <StockBadge med={med} />
                      </td>

                      {/* ── Status column ── */}
                      <td style={{ ...tdStyle(sel), textAlign: "center" }}>
                        {outOfStock ? (
                          <button
                            onClick={() => setRestockTarget(med)}
                            title="Out of stock — request restock"
                            style={{
                              background: "#fef2f2", color: "#dc2626",
                              border: "1.5px solid #fca5a5",
                              borderRadius: 8, padding: "5px 14px",
                              fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                              cursor: "pointer", fontFamily: "inherit",
                              display: "inline-flex", alignItems: "center", gap: 5,
                            }}>
                            <IconRestock />
                            Restock
                          </button>
                        ) : isExpired ? (
                          <span style={{
                            background: "#fef2f2", color: "#dc2626",
                            border: "1.5px solid #fca5a5",
                            borderRadius: 8, padding: "5px 12px",
                            fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                            display: "inline-block",
                          }}>Expired</span>
                        ) : isLowStock ? (
                          <span style={{
                            background: "#fffbeb", color: "#d97706",
                            border: "1.5px solid #fde68a",
                            borderRadius: 8, padding: "5px 12px",
                            fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                            display: "inline-block",
                          }}>Low Stock</span>
                        ) : (
                          <span style={{
                            background: "#f0fdf4", color: "#16a34a",
                            border: "1.5px solid #bbf7d0",
                            borderRadius: 8, padding: "5px 12px",
                            fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                            display: "inline-block",
                          }}>In Stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Archived table ── */}
      {showArchived && (
        <div>
          <div style={{ background: "#6b7280", borderRadius: "10px 10px 0 0",
            padding: "7px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: 20,
              padding: "2px 12px", fontSize: 11, fontWeight: 700, color: "#fff" }}>
              Archived Medicines &amp; Supplies
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11,
              color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
              {archivedMeds.length} item{archivedMeds.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ background: t.tableRow, border: `1px solid ${t.border2}`,
            borderTop: "none", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 50 }}>No.</th>
                  <th style={thStyle}>Medicine Name</th>
                  <th style={thStyle}>Dosage / Specification</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>EXP Date</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Stock</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingArchived ? (
                  <tr><td colSpan={8} style={{ padding: "30px", textAlign: "center", color: t.text3 }}>Loading…</td></tr>
                ) : archivedMeds.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "30px", textAlign: "center", color: t.text3 }}>No archived items.</td></tr>
                ) : archivedMeds.map((med, n) => {
                  const isExpired = new Date(med.exp_date) < new Date();
                  return (
                    <tr key={med.id}>
                      <td style={tdStyle(false)}>
                        <span style={{ color: t.text3, fontSize: 12 }}>{n + 1}</span>
                      </td>
                      <td style={tdStyle(false)}>
                        <span style={{ fontWeight: 600, color: t.text }}>{med.med_name}</span>
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
                      <td style={tdStyle(false)}>
                        <StockBadge med={med} />
                      </td>
                      <td style={{ ...tdStyle(false), textAlign: "center" }}>
                        <button onClick={() => unarchiveItem(med.id)} style={{
                          background: "transparent", color: t.green,
                          border: `1px solid ${t.green}`, borderRadius: 8,
                          padding: "5px 14px", fontSize: 11, fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit",
                        }}>Restore</button>
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
      {restockTarget && (
        <RestockModal
          onClose={() => setRestockTarget(null)}
          onToast={onToast}
          medicineId={restockTarget.id}
          onSaved={() => { fetchMedicines(); fetchArchived(); onMedicineAdded?.(); }}
          prefill={{
            medicine: restockTarget.med_name,
            dosage:   restockTarget.med_dosage,
            type:     restockTarget.med_type,
            unit:     restockTarget.unit,
            qty:      1,
          }}
        />
      )}

      {/* ── Import Preview Confirmation Modal ── */}
      {importPreview && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "20px",
        }} onClick={() => !importing && setImportPreview(null)}>
          <div style={{
            background: t.modalBg, borderRadius: 16, width: "min(860px, 100%)",
            maxHeight: "88vh", display: "flex", flexDirection: "column",
            boxShadow: "0 24px 64px rgba(0,0,0,0.35)", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{
              background: t.green, padding: "18px 24px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)",
                  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
                  Excel Import · {importIsSupplies ? "Medicine Supplies" : "Medicine Drugs"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
                  Confirm Import
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                  {importPreview.length} item{importPreview.length !== 1 ? "s" : ""} to import
                </span>
                <button onClick={() => setImportPreview(null)} style={{
                  background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
                  width: 30, height: 30, borderRadius: 8, fontSize: 16,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "inherit",
                }}>✕</button>
              </div>
            </div>

            {/* Info banner */}
            <div style={{
              padding: "10px 24px", background: `${t.green}10`,
              borderBottom: `1px solid ${t.border2}`, flexShrink: 0,
              fontSize: 12, color: t.text3, display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.green}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Please review the data below before confirming. You can edit values directly in the table.
            </div>

            {/* Scrollable table */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 640 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                  <tr>
                    {/* ── Column header: "Dosage" for drugs, "Specification" for supplies ── */}
                    {["#", "Medicine Name", importColLabel, "Type", "Unit", "EXP Date", "Quantity"].map((h, i) => (
                      <th key={h} style={{
                        padding: "10px 12px", textAlign: i === 6 ? "right" : "left",
                        fontSize: 10, fontWeight: 800, color: t.tableHead,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: `2px solid ${t.border2}`,
                        background: t.surface2, whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? t.tableRow : t.surface2 }}>
                      <td style={{ padding: "9px 12px", color: t.text3, fontSize: 11,
                        borderBottom: `1px solid ${t.tableRowBorder}` }}>{i + 1}</td>

                      {(["med_name","med_dosage","med_type","unit","exp_date"] as (keyof ImportRow)[]).map(key => (
                        <td key={key} style={{ padding: "6px 8px",
                          borderBottom: `1px solid ${t.tableRowBorder}` }}>
                          <input
                            value={String(row[key])}
                            onChange={e => {
                              const updated = [...importPreview];
                              (updated[i] as any)[key] = e.target.value;
                              setImportPreview(updated);
                            }}
                            style={{
                              border: `1px solid ${t.inputBorder}`, borderRadius: 6,
                              padding: "5px 8px", fontSize: 12, width: "100%",
                              background: t.modalBg, color: t.modalText,
                              fontFamily: "inherit", outline: "none",
                              minWidth: key === "med_name" ? 160 : key === "med_type" ? 120 : 80,
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = t.green)}
                            onBlur={e  => (e.currentTarget.style.borderColor = t.inputBorder)}
                          />
                        </td>
                      ))}

                      <td style={{ padding: "6px 8px",
                        borderBottom: `1px solid ${t.tableRowBorder}`, textAlign: "right" }}>
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={e => {
                            const updated = [...importPreview];
                            const val = parseInt(e.target.value, 10);
                            updated[i] = { ...updated[i], quantity: isNaN(val) ? 0 : val };
                            setImportPreview(updated);
                          }}
                          style={{
                            border: `1px solid ${t.inputBorder}`, borderRadius: 6,
                            padding: "5px 8px", fontSize: 12, width: 80,
                            background: `${t.green}10`, color: t.green,
                            fontFamily: "inherit", outline: "none", textAlign: "right",
                            fontWeight: 700,
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = t.green)}
                          onBlur={e  => (e.currentTarget.style.borderColor = t.inputBorder)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer buttons */}
            <div style={{
              padding: "16px 24px", borderTop: `1px solid ${t.border2}`,
              display: "flex", gap: 12, flexShrink: 0,
              background: t.modalBg,
            }}>
              <button onClick={() => setImportPreview(null)} disabled={importing} style={{
                flex: 1, padding: "11px 0", borderRadius: 8, border: "none",
                background: "#d63031", color: "#fff", fontSize: 13, fontWeight: 900,
                cursor: "pointer", fontFamily: "inherit",
                opacity: importing ? 0.6 : 1,
              }}>CANCEL</button>
              <button onClick={handleImportConfirm} disabled={importing} style={{
                flex: 2, padding: "11px 0", borderRadius: 8,
                border: `2.5px solid ${t.green}`, background: importing ? t.green : "transparent",
                color: importing ? "#fff" : t.green, fontSize: 13, fontWeight: 900,
                cursor: importing ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {importing ? (
                  <>Importing {importPreview.length} items…</>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    CONFIRM IMPORT ({importPreview.length} items)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}