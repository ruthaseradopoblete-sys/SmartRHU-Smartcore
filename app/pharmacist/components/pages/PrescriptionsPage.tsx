"use client";
import { CSSProperties, useState } from "react";
import { useTheme } from "@/lib/theme";
import { Prescription, SAMPLE_PRESCRIPTIONS } from "@/lib/types";

export default function PrescriptionsPage() {
  const { t } = useTheme();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(SAMPLE_PRESCRIPTIONS);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");

  const filtered = prescriptions.filter(p => filter === "all" || p.status === filter);

  const updateStatus = (id: number, status: "confirmed" | "cancelled") => {
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    setSelected(null);
  };

  const statusBadge = (status: Prescription["status"]) => {
    const map = {
      pending:   { bg: "#fff8e1", color: "#b8860b", label: "Pending" },
      confirmed: { bg: "#e8f5e9", color: "#2e7d32", label: "Confirmed" },
      cancelled: { bg: "#fdecea", color: "#c62828", label: "Cancelled" },
    };
    const s = map[status];
    return (
      <span style={{
        background: s.bg, color: s.color, borderRadius: 20,
        padding: "2px 10px", fontSize: 11, fontWeight: 700,
      }}>
        {s.label}
      </span>
    );
  };

  const thStyle: CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800,
    color: t.tableHead, textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: `1px solid ${t.tableRowBorder}`, background: t.tableRow,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Title + filter tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, marginBottom: 2 }}>Pharmacist</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: t.text, lineHeight: 1 }}>Prescriptions</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "pending", "confirmed", "cancelled"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 16px", borderRadius: 20, border: `1.5px solid ${t.green}`,
              background: filter === f ? t.green : "transparent",
              color: filter === f ? "#fff" : t.green,
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              textTransform: "capitalize",
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: t.tableRow, borderRadius: 14,
        border: `1px solid ${t.border2}`, overflow: "hidden",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 40 }}>#</th>
              <th style={thStyle}>Doctor</th>
              <th style={thStyle}>Patient</th>
              <th style={thStyle}>Medicine</th>
              <th style={thStyle}>Dosage</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "30px", textAlign: "center", color: t.text3, fontSize: 13 }}>
                  No prescriptions found
                </td>
              </tr>
            ) : filtered.map((rx, i) => (
              <tr key={rx.id}>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${t.tableRowBorder}`, color: t.text3, background: t.tableRow }}>
                  {i + 1}
                </td>
                {[rx.doctor, rx.patient, rx.medicine, rx.dosage, String(rx.qty), rx.date].map((val, j) => (
                  <td key={j} style={{ padding: "10px 14px", borderBottom: `1px solid ${t.tableRowBorder}`, color: t.text2, background: t.tableRow }}>
                    {val}
                  </td>
                ))}
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${t.tableRowBorder}`, background: t.tableRow }}>
                  {statusBadge(rx.status)}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${t.tableRowBorder}`, background: t.tableRow, textAlign: "center" }}>
                  <button onClick={() => setSelected(rx)} style={{
                    background: t.green, color: "#fff", border: "none",
                    borderRadius: 8, padding: "4px 14px", fontSize: 11,
                    fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: t.modalBg, borderRadius: 16, width: 400,
            padding: "30px 34px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: t.green, margin: 0 }}>Prescription</h2>
              {statusBadge(selected.status)}
            </div>

            <div style={{
              fontSize: 11, color: t.text3, fontStyle: "italic",
              marginBottom: 14, background: t.readonlyBg, borderRadius: 6, padding: "5px 10px",
            }}>
              Sent by doctor — view only
            </div>

            {[
              ["Requested by", selected.doctor],
              ["Patient Name", selected.patient],
              ["Medicine Name", selected.medicine],
              ["Mg / Dosage", selected.dosage],
              ["Medicine Type", selected.type],
              ["Quantity", String(selected.qty)],
              ["Date", selected.date],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "8px 0",
                borderBottom: `1px solid ${t.tableRowBorder}`,
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: t.modalText2 }}>{label}</span>
                <span style={{ fontSize: 12.5, color: t.modalText, fontWeight: 600 }}>{value}</span>
              </div>
            ))}

            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              <button onClick={() => setSelected(null)} style={{
                flex: 1, padding: "10px 0", borderRadius: 8,
                border: `1.5px solid ${t.border2}`, background: "transparent",
                color: t.text2, fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Close
              </button>
              {selected.status === "pending" && (
                <>
                  <button onClick={() => updateStatus(selected.id, "cancelled")} style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    border: "none", background: "#d63031", color: "#fff",
                    fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    CANCEL
                  </button>
                  <button onClick={() => updateStatus(selected.id, "confirmed")} style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    border: `2px solid ${t.green}`, background: t.green,
                    color: "#fff", fontSize: 13, fontWeight: 900,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                    CONFIRM
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}