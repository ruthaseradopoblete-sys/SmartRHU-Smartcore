"use client";
import { CSSProperties, useState } from "react";
import { useTheme } from "@/lib/theme";
import { Medicine } from "@/lib/types";
import Donut from "@/components/Donut";

const PREDS = [
  { label: "Prediction 1", color: "#d94040" },
  { label: "Prediction 2", color: "#e07a30" },
  { label: "Prediction 3", color: "#d4c020" },
  { label: "Prediction 4", color: "#50c060" },
  { label: "Prediction 5", color: "#4488dd" },
];
const DISP_SEGS = [
  { v: 30, c: "#7c6fcd" }, { v: 25, c: "#b0d98a" },
  { v: 22, c: "#f0c040" }, { v: 23, c: "#90d8f0" },
];
const STOCK_SEGS = [
  { v: 40, c: "#50c060" }, { v: 35, c: "#f0c040" }, { v: 25, c: "#dd4444" },
];

type Props = {
  medicines: Medicine[];
  onSendRequest: () => void;
  onOpenPrescriptions: () => void;
};

export default function Dashboard({ medicines, onSendRequest, onOpenPrescriptions }: Props) {
  const { t } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);

  const now = new Date();
  const dateStr = `Day, ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const activeRows = medicines.filter(m => !m.archived).slice(0, 6);

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
                  {medicines.filter(m => !m.archived).length}
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Donut segments={DISP_SEGS} size={100} thick={22} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {DISP_SEGS.map((sg, i) => (
                    <div key={i} style={{ width: 15, height: 15, borderRadius: 3, background: sg.c }} />
                  ))}
                </div>
              </div>
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
            <button style={{
              marginLeft: "auto", background: t.greenLight, color: "#fff",
              border: "none", borderRadius: 12, padding: "4px 16px", fontSize: 11,
              fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em",
            }}>
              EXPORT
            </button>
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
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 10 }}>Month</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {PREDS.map(p => (
                <li key={p.label} style={{
                  display: "flex", alignItems: "center",
                  gap: 7, fontSize: 12.5, color: t.text2, marginBottom: 9,
                }}>
                  <span style={{ fontSize: 16, color: t.text3, lineHeight: 1, flexShrink: 0 }}>•</span>
                  <span style={{ width: 30, height: 12, borderRadius: 3, background: p.color, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ flex: 1 }}>{p.label}</span>
                  <span style={{ fontSize: 10.5, color: t.text3, fontFamily: "monospace" }}>00%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stock Levels */}
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
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Donut segments={STOCK_SEGS} size={120} thick={28} label="Stock Level" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              {[
                { label: "Highest", c: "#2db357" },
                { label: "Medium",  c: "#d4b800" },
                { label: "Lowest",  c: "#d94040" },
              ].map(b => (
                <span key={b.label} style={{
                  background: b.c, color: "#fff",
                  fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5,
                }}>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
