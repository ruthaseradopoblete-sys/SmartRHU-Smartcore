"use client";
import { CSSProperties, useCallback, useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";
import AddMedicineModal from "../modals/AddMedicineModal";

type Props = {
  onToast: (msg: string, type: "success" | "error") => void;
};

export default function MedicineStockPage({ onToast }: Props) {
  const { t } = useTheme();
  const [medicines, setMedicines]     = useState<Medicine[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<string[]>([]);
  const [showExport, setShowExport]   = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

 const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pharma_medicines")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMedicines((data as Medicine[]) ?? []);
    } catch (err: any) {
      onToast(err.message || "Failed to load medicines.", "error");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  const toggleAll = () =>
    setSelected(s => s.length === medicines.length ? [] : medicines.map(m => m.id));
  const toggleRow = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const archiveSelected = async () => {
    if (selected.length === 0) return;
    try {
      for (const id of selected) {
        const { error } = await supabase
          .from("pharma_medicines")
          .update({ archived: true })
          .eq("id", id);
        if (error) throw error;
      }
      onToast(`Archived ${selected.length} item(s).`, "success");
      setSelected([]);
      fetchMedicines();
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: t.green, margin: 0 }}>Medicine Stocks</h1>
        <button onClick={() => setShowAddModal(true)} style={{
          background: t.green, color: "#fff", border: "none",
          borderRadius: 22, padding: "9px 20px", fontWeight: 700, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit", display: "flex",
          alignItems: "center", gap: 6, boxShadow: `0 3px 12px ${t.green}55`,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 300 }}>+</span>
          Medicine
        </button>
      </div>

      <div>
        {/* Toolbar */}
        <div style={{
          background: t.green, borderRadius: "10px 10px 0 0",
          padding: "7px 12px", display: "flex", alignItems: "center",
          gap: 10, flexWrap: "wrap", position: "relative",
        }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 4,
            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            <input type="checkbox"
              checked={medicines.length > 0 && selected.length === medicines.length}
              onChange={toggleAll}
              style={{ accentColor: "#fff", width: 12, height: 12 }} />
            Select All
          </label>

          <button onClick={archiveSelected} disabled={selected.length === 0} style={{
            display: "flex", alignItems: "center", gap: 4,
            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            background: "none", border: "none", fontFamily: "inherit",
            opacity: selected.length === 0 ? 0.5 : 1,
          }}>
            Archive ({selected.length})
          </button>

          {/* Export dropdown */}
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <button onClick={() => setShowExport(v => !v)} style={{
              background: t.greenLight, color: "#fff", border: "none",
              borderRadius: 12, padding: "4px 16px", fontSize: 11,
              fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em",
            }}>
              EXPORT
            </button>
            {showExport && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)",
                background: t.notifBg, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                border: `1px solid ${t.notifBorder}`, overflow: "hidden", zIndex: 100, minWidth: 110,
              }}>
                {[{ label: "Excel", icon: "🟩" }, { label: "PDF", icon: "🟥" }, { label: "CSV", icon: "📊" }].map(opt => (
                  <button key={opt.label} onClick={() => setShowExport(false)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 14px", border: "none", background: t.notifBg,
                    cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
                    fontWeight: 600, color: t.notifText, textAlign: "left",
                    borderBottom: `1px solid ${t.notifBorder}`,
                  }}>
                    <span style={{ fontSize: 14 }}>{opt.icon}</span>{opt.label}
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
                <th style={thStyle}>Mg (Dosage)</th>
                <th style={thStyle}>Medicine Type</th>
                <th style={thStyle}>Unit</th>
                <th style={thStyle}>EXP Date</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Stock Quantity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: t.text3, fontSize: 13 }}>
                    Loading…
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: t.text3, fontSize: 13 }}>
                    No medicines found. Add one to get started.
                  </td>
                </tr>
              ) : medicines.map((med, n) => {
                const sel = selected.includes(med.id);
                const isExpired = new Date(med.exp_date) < new Date();
                return (
                  <tr key={med.id}>
                    <td style={tdStyle(sel)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleRow(med.id)}
                          style={{ accentColor: t.green, width: 12, height: 12 }} />
                        <span style={{ color: t.text3, fontSize: 12 }}>{n + 1}</span>
                      </div>
                    </td>
                    <td style={tdStyle(sel)}>{med.med_name}</td>
                    <td style={tdStyle(sel)}>{med.med_dosage}</td>
                    <td style={tdStyle(sel)}>{med.med_type}</td>
                    <td style={tdStyle(sel)}>{med.unit}</td>
                    <td style={{ ...tdStyle(sel), color: isExpired ? "#d63031" : t.text2 }}>
                      {med.exp_date}
                      {isExpired && (
                        <span style={{
                          fontSize: 10, marginLeft: 4,
                          background: "#d63031", color: "#fff", borderRadius: 4, padding: "1px 5px",
                        }}>EXPIRED</span>
                      )}
                    </td>
                    <td style={{
                      ...tdStyle(sel), textAlign: "right", fontWeight: 700,
                      color: med.quantity <= 10 ? "#d63031" : t.text2,
                    }}>
                      {med.quantity}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddMedicineModal
          onClose={() => setShowAddModal(false)}
          onSaved={fetchMedicines}
          onToast={onToast}
        />
      )}
    </div>
  );
}