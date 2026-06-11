"use client";
import { CSSProperties, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Props = {
  onClose: () => void;
  pharmacistName?: string;
};

type MedicineRow = {
  id: string;
  medicine_name: string;
  dosage: string;
  medicine_type: string;
  quantity: number;
};

const MEDICINE_TYPES = [
  "Tablet", "Capsule", "Syrup", "Injection", "Ointment",
  "Drops", "Inhaler", "Suppository", "Patch", "Other",
];

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyRow(): MedicineRow {
  return { id: genId(), medicine_name: "", dosage: "", medicine_type: "Tablet", quantity: 1 };
}

export default function RestockModal({ onClose, pharmacistName = "" }: Props) {
  const { t } = useTheme();
  const [pharmacist] = useState(pharmacistName); // read-only — comes from logged-in user
  const [rows, setRows]         = useState<MedicineRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  /* ── Row helpers ── */
  function updateRow(id: string, field: keyof MedicineRow, value: string | number) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function addRow() { setRows(prev => [...prev, emptyRow()]); }
  function removeRow(id: string) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }

  /* ── Submit ── */
  async function handleSubmit() {
    setError(null);

    if (!pharmacist.trim()) { setError("Pharmacist name not found. Please re-login."); return; }
    for (const r of rows) {
      if (!r.medicine_name.trim()) { setError("All medicine names are required."); return; }
      if (!r.dosage.trim())        { setError("All dosage fields are required."); return; }
      if (r.quantity < 1)          { setError("Quantity must be at least 1."); return; }
    }

    setSubmitting(true);

    const inserts = rows.map(r => ({
      pharmacist_name: pharmacist.trim(),
      medicine_name:   r.medicine_name.trim(),
      dosage:          r.dosage.trim(),
      medicine_type:   r.medicine_type,
      quantity:        r.quantity,
      status:          "pending",
    }));

    const { error: dbError } = await supabase
      .from("restock_requests")
      .insert(inserts);

    setSubmitting(false);

    if (dbError) {
      setError("Failed to submit request. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  /* ── Shared styles ── */
  const labelStyle: CSSProperties = {
    fontSize: 10, fontWeight: 800, textTransform: "uppercase",
    letterSpacing: "0.07em", color: t.text3, marginBottom: 4, display: "block",
  };
  const inputStyle: CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 12,
    border: `1.5px solid ${t.border2 ?? "#e5e7eb"}`,
    background: t.surface2 ?? "#f9fafb", color: t.text,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };
  const thStyle: CSSProperties = {
    padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 800,
    color: t.tableHead ?? t.text3, textTransform: "uppercase", letterSpacing: "0.06em",
    background: t.surface2 ?? "#f9fafb",
    borderBottom: `1px solid ${t.border2 ?? "#e5e7eb"}`,
    whiteSpace: "nowrap",
  };
  const tdStyle: CSSProperties = {
    padding: "6px 6px", verticalAlign: "middle",
    borderBottom: `1px solid ${t.border2 ?? "#e5e7eb"}`,
  };

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        onClick={onClose}
      >
        <div
          style={{ background: t.modalBg, borderRadius: 18, width: 420, padding: "40px 32px", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: t.text, marginBottom: 8 }}>Request Sent!</div>
          <div style={{ fontSize: 13, color: t.text3, marginBottom: 6 }}>
            Your restock request for <strong style={{ color: t.text }}>{rows.length} medicine{rows.length !== 1 ? "s" : ""}</strong> has been submitted.
          </div>
          <div style={{ fontSize: 12, color: t.text3, marginBottom: 28 }}>
            The warehouse will review and confirm your request shortly.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => { setSubmitted(false); setRows([emptyRow()]); }}
              style={{ padding: "10px 22px", borderRadius: 10, border: `1.5px solid ${t.border2 ?? "#e5e7eb"}`, background: "transparent", color: t.text2, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              New Request
            </button>
            <button
              onClick={onClose}
              style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: t.green, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: t.modalBg, borderRadius: 18, width: 740, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{ background: t.green, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
              Pharmacist
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Send Restock Request</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}
          >✕</button>
        </div>

        {/* ── Info banner ── */}
        <div style={{ background: "#fef9c3", borderBottom: "1px solid #fde047", padding: "8px 24px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13 }}>📋</span>
          <span style={{ fontSize: 11, color: "#854d0e", fontWeight: 500 }}>
            Fill in all medicine details below. The warehouse will review and <strong>confirm</strong> your request before stock is updated.
          </span>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Pharmacist name — read-only, auto-filled from logged-in user */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Your Name (Pharmacist)</label>
            <div style={{
              ...inputStyle,
              maxWidth: 320,
              background: t.surface2 ?? "#f3f4f6",
              color: t.text2,
              border: `1.5px solid ${t.border2 ?? "#e5e7eb"}`,
              display: "flex", alignItems: "center", gap: 8,
              cursor: "default",
            }}>
              <span style={{ fontSize: 13 }}>👤</span>
              <span style={{ fontWeight: 600 }}>{pharmacist || "—"}</span>
            </div>
          </div>

          {/* Medicine table */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>
              Medicine List
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, background: t.green + "22", color: t.green, borderRadius: 8, padding: "1px 8px" }}>
                {rows.length} item{rows.length !== 1 ? "s" : ""}
              </span>
            </label>

            <div style={{ border: `1px solid ${t.border2 ?? "#e5e7eb"}`, borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 28 }}>#</th>
                    <th style={thStyle}>Medicine Name</th>
                    <th style={{ ...thStyle, width: 120 }}>Dosage</th>
                    <th style={{ ...thStyle, width: 130 }}>Type</th>
                    <th style={{ ...thStyle, width: 90, textAlign: "right" }}>Qty</th>
                    <th style={{ ...thStyle, width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} style={{ background: i % 2 === 0 ? "transparent" : (t.surface2 ?? "#f9fafb") + "66" }}>
                      <td style={{ ...tdStyle, paddingLeft: 12, fontSize: 11, color: t.text3, fontWeight: 700 }}>{i + 1}</td>

                      <td style={tdStyle}>
                        <input
                          style={inputStyle}
                          placeholder="e.g. Paracetamol"
                          value={row.medicine_name}
                          onChange={e => updateRow(row.id, "medicine_name", e.target.value)}
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          style={inputStyle}
                          placeholder="e.g. 500mg"
                          value={row.dosage}
                          onChange={e => updateRow(row.id, "dosage", e.target.value)}
                        />
                      </td>

                      <td style={tdStyle}>
                        <select
                          style={{ ...inputStyle, cursor: "pointer" }}
                          value={row.medicine_type}
                          onChange={e => updateRow(row.id, "medicine_type", e.target.value)}
                        >
                          {MEDICINE_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>

                      <td style={{ ...tdStyle }}>
                        <input
                          style={{ ...inputStyle, textAlign: "right" }}
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={e => updateRow(row.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </td>

                      <td style={{ ...tdStyle, textAlign: "center", paddingRight: 8 }}>
                        <button
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          style={{
                            width: 26, height: 26, borderRadius: 6,
                            border: `1px solid ${t.border2 ?? "#e5e7eb"}`,
                            background: rows.length === 1 ? "transparent" : "#fee2e2",
                            color: rows.length === 1 ? t.text3 : "#991b1b",
                            fontSize: 14, cursor: rows.length === 1 ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: rows.length === 1 ? 0.4 : 1,
                            fontFamily: "inherit",
                          }}
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ padding: "8px 10px", borderTop: `1px solid ${t.border2 ?? "#e5e7eb"}`, fontSize: 11, fontWeight: 700, color: t.text3, textAlign: "right" }}>
                      Total units requested:
                    </td>
                    <td style={{ padding: "8px 10px", borderTop: `1px solid ${t.border2 ?? "#e5e7eb"}`, fontSize: 13, fontWeight: 800, color: t.green, textAlign: "right" }}>
                      {rows.reduce((s, r) => s + r.quantity, 0)}
                    </td>
                    <td style={{ borderTop: `1px solid ${t.border2 ?? "#e5e7eb"}` }} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <button
              onClick={addRow}
              style={{
                marginTop: 10, padding: "7px 16px", borderRadius: 8,
                border: `1.5px dashed ${t.green}`,
                background: t.green + "11",
                color: t.green, fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Medicine
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: 12, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${t.border2 ?? "#e5e7eb"}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: t.modalBg }}>
          <span style={{ fontSize: 11, color: t.text3 }}>
            {rows.length} medicine{rows.length !== 1 ? "s" : ""} · {rows.reduce((s, r) => s + r.quantity, 0)} total units
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{ padding: "9px 20px", borderRadius: 10, border: `1.5px solid ${t.border2 ?? "#e5e7eb"}`, background: "transparent", color: t.text2, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "9px 24px", borderRadius: 10, border: "none",
                background: submitting ? t.green + "88" : t.green,
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {submitting ? (
                <>
                  <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  Sending…
                </>
              ) : (
                <>📤 Send Request</>
              )}
            </button>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}