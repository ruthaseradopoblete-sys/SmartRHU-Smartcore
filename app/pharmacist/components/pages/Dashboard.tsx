"use client";
import { CSSProperties, useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";
import Donut from "../Donut";
import { usePredictions } from "@/lib/usePredictions";

const DONUT_COLORS = ["#7c6fcd","#b0d98a","#f0c040","#90d8f0","#f28b6e","#a8d8ea"];

const STOCK_SEGS = [
  { v: 40, c: "#50c060" }, { v: 35, c: "#f0c040" }, { v: 25, c: "#dd4444" },
];

type DispenseEntry = { med_name: string; quantity: number };

type Props = {
  medicines: Medicine[];
  totalCount: number;
  onSendRequest: () => void;
  onOpenPrescriptions: () => void;
  onViewRequests: () => void;
};

// ── Export helpers ─────────────────────────────────────────────────────────────
async function exportToExcel(rows: Medicine[]) {
  const XLSX = await import("xlsx");
  const data = rows.map((m, i) => ({
    "No.":           i + 1,
    "Medicine Name": m.med_name,
    "Dosage":        m.med_dosage,
    "Type":          m.med_type,
    "Unit":          m.unit,
    "Qty":           m.quantity,
    "EXP Date":      m.exp_date,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Medicine Stock");
  XLSX.writeFile(wb, `medicine_stock_${new Date().toISOString().split("T")[0]}.xlsx`);
}

async function exportToPDF(rows: Medicine[]) {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Medicine Stock Report", 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-PH")}`, 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [["#", "Medicine Name", "Dosage", "Type", "Unit", "Qty", "EXP Date"]],
    body: rows.map((m, i) => [
      i + 1, m.med_name, m.med_dosage, m.med_type, m.unit, m.quantity, m.exp_date,
    ]),
    styles:     { fontSize: 9 },
    headStyles: { fillColor: [26, 94, 53] },
  });
  doc.save(`medicine_stock_${new Date().toISOString().split("T")[0]}.pdf`);
}

export default function Dashboard({ medicines, totalCount, onSendRequest, onOpenPrescriptions, onViewRequests }: Props) {
  const { t } = useTheme();
  const [selected, setSelected]         = useState<string[]>([]);
  const [dispenseData, setDispenseData] = useState<DispenseEntry[]>([]);
  const [showExport, setShowExport]     = useState(false);
  const { predictions, loading: predLoading, model_used } = usePredictions();

  const now = new Date();
  const dateStr = `Day, ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const activeRows = medicines.filter(m => !m.archived).slice(0, 6);

  useEffect(() => {
    async function fetchDispense() {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const { data, error } = await supabase
        .from("pharma_dispense")
        .select("med_name, quantity")
        .gte("dispensed_at", start)
        .lt("dispensed_at", end);
      if (!error && data) setDispenseData(data as DispenseEntry[]);
    }
    fetchDispense();
  }, []);

  const dispenseSegs = (() => {
    if (dispenseData.length === 0) return [];
    const totals: Record<string, number> = {};
    for (const row of dispenseData) {
      totals[row.med_name] = (totals[row.med_name] ?? 0) + row.quantity;
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top    = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    const result = top.map(([, v], i) => ({ v, c: DONUT_COLORS[i] }));
    if (others > 0) result.push({ v: others, c: "#ccc" });
    return result;
  })();

  const dispenseLegend = (() => {
    if (dispenseData.length === 0) return [];
    const totals: Record<string, number> = {};
    for (const row of dispenseData) {
      totals[row.med_name] = (totals[row.med_name] ?? 0) + row.quantity;
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top    = sorted.slice(0, 5).map(([name, qty], i) => ({
      name, qty, color: DONUT_COLORS[i],
    }));
    const othersQty = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    if (othersQty > 0) top.push({ name: "Others", qty: othersQty, color: "#ccc" });
    return top;
  })();

  const totalDispensed = dispenseData.reduce((s, r) => s + r.quantity, 0);

  const toggleAll = () =>
    setSelected(s => s.length === activeRows.length ? [] : activeRows.map(m => m.id));
  const toggleRow = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const tdStyle = (sel: boolean): CSSProperties => ({
    padding: "9px 12px", borderBottom: `1px solid ${t.tableRowBorder}`,
    color: t.text2, background: sel ? t.tableRowSel : t.tableRow, verticalAlign: "middle",
  });

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {/* ── Left column ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

        {/* Title + buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, marginBottom: 2 }}>Pharmacist</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: t.text, lineHeight: 1 }}>Dashboard</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onSendRequest} style={{
              background: t.green, color: "#fff", border: "none",
              borderRadius: 22, padding: "9px 22px", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit", boxShadow: `0 3px 12px ${t.green}55`,
            }}>
              Send Request
            </button>
            <button onClick={onViewRequests} style={{
              background: "transparent", color: t.green, border: `2px solid ${t.green}`,
              borderRadius: 22, padding: "9px 22px", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              View Requests
            </button>
            <button onClick={onOpenPrescriptions} style={{
              background: "transparent", color: t.green, border: `2px solid ${t.green}`,
              borderRadius: 22, padding: "9px 22px", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Prescriptions
            </button>
          </div>
        </div>

        {/* Analytics cards */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 800, color: t.text3,
            textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8,
          }}>Analytics</div>
          <div style={{ display: "flex", gap: 12 }}>
            {/* Total medicine */}
            <div style={{
              flex: 1,
              background: `linear-gradient(135deg,${t.green} 0%,${t.greenLight} 100%)`,
              borderRadius: 16, padding: "16px 20px", display: "flex",
              justifyContent: "space-between", alignItems: "center",
              boxShadow: `0 4px 18px ${t.green}44`, minWidth: 0,
            }}>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Total Medicine</div>
                <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", lineHeight: 1, margin: "4px 0" }}>
                  {totalCount}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{dateStr}</div>
              </div>
              <div style={{
                width: 54, height: 54, borderRadius: "50%", flexShrink: 0,
                border: "2.5px solid rgba(255,255,255,0.45)",
                background: "rgba(255,255,255,0.15)", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 32, color: "#fff", fontWeight: 200,
              }}>+</div>
            </div>

            {/* Dispense donut */}
            <div style={{
              flex: 1, background: t.dispenseCard,
              border: `1px solid ${t.border}`, borderRadius: 16, padding: "12px 16px", minWidth: 0,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text2, marginBottom: 8 }}>
                Dispense Medicine (Monthly)
              </div>
              {dispenseSegs.length === 0 ? (
                <div style={{ textAlign: "center", color: t.text3, fontSize: 12,
                  padding: "18px 0", fontStyle: "italic" }}>
                  No dispense records this month
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flexShrink: 0 }}>
                    <Donut segments={dispenseSegs} size={90} thick={20} label={String(totalDispensed)} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    {dispenseLegend.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%",
                          background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, color: t.text2, flex: 1,
                          overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap" }}>{item.name}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700,
                          color: t.text, flexShrink: 0 }}>{item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent medicines table */}
        <div>
          <div style={{
            background: t.green, borderRadius: "10px 10px 0 0",
            padding: "7px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 4,
              color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <input type="checkbox"
                checked={activeRows.length > 0 && selected.length === activeRows.length}
                onChange={toggleAll}
                style={{ accentColor: "#fff", width: 12, height: 12 }} />
              Select All
            </label>

            {/* Export dropdown */}
            <div style={{ marginLeft: "auto", position: "relative" }}>
              <button
                onClick={() => setShowExport(v => !v)}
                style={{
                  background: t.greenLight, color: "#fff", border: "none",
                  borderRadius: 12, padding: "4px 16px", fontSize: 11,
                  fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                  letterSpacing: "0.05em",
                }}>
                EXPORT
              </button>
              {showExport && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 6px)",
                  background: t.notifBg, borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  border: `1px solid ${t.notifBorder}`,
                  overflow: "hidden", zIndex: 100, minWidth: 120,
                }}>
                  {[
                    { label: "Excel", icon: "🟩", action: () => exportToExcel(activeRows) },
                    { label: "PDF",   icon: "🟥", action: () => exportToPDF(activeRows)   },
                  ].map((opt, i, arr) => (
                    <button key={opt.label}
                      onClick={() => { opt.action(); setShowExport(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "9px 14px", border: "none", background: t.notifBg,
                        cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
                        fontWeight: 600, color: t.notifText, textAlign: "left",
                        borderBottom: i < arr.length - 1 ? `1px solid ${t.notifBorder}` : "none",
                      }}>
                      <span style={{ fontSize: 14 }}>{opt.icon}</span>{opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: t.tableRow, border: `1px solid ${t.border2}`,
            borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.tableRowBorder}` }}>
                  {["No.", "Medicine Name", "Dosage", "Type", "Unit", "Qty", "EXP Date"].map(h => (
                    <th key={h} style={{
                      padding: "9px 12px", textAlign: "left", fontSize: 11,
                      fontWeight: 800, color: t.tableHead, textTransform: "uppercase",
                      letterSpacing: "0.04em", background: t.tableRow,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: t.text3, fontSize: 13 }}>
                      No medicines in stock
                    </td>
                  </tr>
                ) : activeRows.map((med, idx) => {
                  const sel = selected.includes(med.id);
                  return (
                    <tr key={med.id}>
                      <td style={tdStyle(sel)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleRow(med.id)}
                            style={{ accentColor: t.green, width: 12, height: 12 }} />
                          <span style={{ color: t.text3, fontSize: 12 }}>{idx + 1}</span>
                        </div>
                      </td>
                      <td style={tdStyle(sel)}>{med.med_name}</td>
                      <td style={tdStyle(sel)}>{med.med_dosage}</td>
                      <td style={tdStyle(sel)}>{med.med_type}</td>
                      <td style={tdStyle(sel)}>{med.unit}</td>
                      <td style={tdStyle(sel)}>{med.quantity}</td>
                      <td style={tdStyle(sel)}>{med.exp_date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Right column ── */}
      <div style={{ width: 215, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Medicine Prediction */}
        <div style={{
          background: t.cardBg, borderRadius: 12, border: `1px solid ${t.cardBorder}`,
          overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}>
          <div style={{
            background: t.green, color: "#fff", textAlign: "center",
            fontSize: 12, fontWeight: 800, letterSpacing: "0.07em", padding: "9px 8px",
          }}>
            MEDICINE PREDICTION
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: t.text3, marginBottom: 10,
              textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
              Expiring within 7 days
            </div>
            {predLoading ? (
              <div style={{ color: t.text3, fontSize: 12, textAlign: "center",
                padding: "16px 0" }}>Loading…</div>
            ) : predictions.length === 0 ? (
              <div style={{ color: "#2db357", fontSize: 12,
                textAlign: "center", padding: "16px 0" }}>
                ✓ No medicines expiring soon
              </div>
            ) : (
              <ul style={{
                listStyle: "none", padding: 0, margin: 0,
                maxHeight: 320, overflowY: "auto",
                paddingRight: 2,
              }}>
                {predictions.map((p, i) => {
                  const urgencyColor =
                    p.urgency === "critical" ? "#d94040" : "#e07a30";
                  const days = (p as any).days_until_expiry ?? 0;
                  return (
                    <li key={i} style={{ marginBottom: 12,
                      background: p.urgency === "expired" ? "#fff0f0"
                                : p.urgency === "critical" ? "#fff5f5" : t.surface2,
                      borderRadius: 8, padding: "8px 10px",
                      border: `1px solid ${urgencyColor}33` }}>
                      <div style={{ display: "flex", alignItems: "center",
                        gap: 6, marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%",
                          flexShrink: 0, background: urgencyColor }} />
                        <span style={{ flex: 1, fontSize: 11.5, color: t.text,
                          fontWeight: 700, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.med_name}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800,
                          color: urgencyColor, whiteSpace: "nowrap" }}>
                          {days <= 1 ? "Tomorrow!" : `${days}d left`}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: t.text3, display: "flex",
                        justifyContent: "space-between", marginBottom: 2 }}>
                        <span>EXP: {(p as any).exp_date}</span>
                        <span>Qty: {p.current_stock}</span>
                      </div>
                      <div style={{ fontSize: 10, color: urgencyColor,
                        fontStyle: "italic", marginBottom: 4 }}>
                        {(p as any).risk_label}
                      </div>
                      {/* Progress bar: full = 7 days */}
                      <div style={{ height: 4, background: t.tableRowBorder,
                        borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
                        <div style={{
                          height: "100%", borderRadius: 4,
                          width: `${Math.min(100, (days / 7) * 100)}%`,
                          background: urgencyColor,
                          transition: "width 0.4s",
                        }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {model_used && (
              <div style={{ fontSize: 10, color: t.text3, marginTop: 8,
                textAlign: "right" }}>
                Model: {model_used}
              </div>
            )}
          </div>
        </div>

        {/* Stock Levels */}
        {(() => {
          const active  = medicines.filter(m => !m.archived);
          const highest = active.filter(m => m.quantity >= 50).length;
          const medium  = active.filter(m => m.quantity >= 10 && m.quantity < 50).length;
          const lowest  = active.filter(m => m.quantity < 10).length;
          const total   = active.length || 1;

          const stockSegs = [
            { v: highest || 0.001, c: "#2db357" },
            { v: medium  || 0.001, c: "#d4b800" },
            { v: lowest  || 0.001, c: "#d94040" },
          ];

          return (
            <div style={{
              background: t.cardBg, borderRadius: 12, border: `1px solid ${t.cardBorder}`,
              overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}>
              <div style={{
                background: t.green, color: "#fff", textAlign: "center",
                fontSize: 12, fontWeight: 800, letterSpacing: "0.07em", padding: "9px 8px",
              }}>
                STOCK LEVELS
              </div>
              <div style={{ padding: 14 }}>
                {active.length === 0 ? (
                  <div style={{ textAlign: "center", color: t.text3, fontSize: 12,
                    padding: "20px 0" }}>
                    No medicines yet
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Donut segments={stockSegs} size={120} thick={28} label={`${total}`} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                      {[
                        { label: "Highest", count: highest, c: "#2db357", hint: "≥ 50 qty" },
                        { label: "Medium",  count: medium,  c: "#d4b800", hint: "10–49 qty" },
                        { label: "Lowest",  count: lowest,  c: "#d94040", hint: "< 10 qty" },
                      ].map(b => (
                        <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%",
                            background: b.c, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 11.5, color: t.text2,
                            fontWeight: 600 }}>{b.label}</span>
                          <span style={{ fontSize: 11, color: t.text3 }}>{b.hint}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: t.text,
                            minWidth: 20, textAlign: "right" }}>{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}