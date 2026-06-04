"use client";
import { CSSProperties, useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Prescription = {
  id: string;
  patient_name: string;
  medicine: string;
  dosage_frequency: string | null;
  med_type: string | null;
  quantity: string | null;
  prescription_date: string;
  status: "draft" | "sent" | "dispensed" | "cancelled";
};

type Filter = "all" | "sent" | "dispensed" | "cancelled";

export default function PrescriptionsPage() {
  const { t } = useTheme();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<Prescription | null>(null);
  const [filter, setFilter]               = useState<Filter>("all");
  const [updating, setUpdating]           = useState(false);
  const [toast, setToast]                 = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch all prescriptions ────────────────────────────────────────────────
  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          id,
          prescription_date,
          medicine,
          quantity,
          dosage_frequency,
          notes,
          status,
          patients ( first_name, last_name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: Prescription[] = (data ?? []).map((row: any) => {
        const p = row.patients;
        const fullName = p
          ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
          : "Unknown";
        return {
          id:                row.id,
          patient_name:      fullName || "Unknown",
          medicine:          row.medicine,
          dosage_frequency:  row.dosage_frequency,
          med_type:          null,           // not in prescriptions table
          quantity:          row.quantity,
          prescription_date: row.prescription_date,
          status:            row.status,
        };
      });

      setPrescriptions(mapped);
    } catch (err: any) {
      showToast(err.message || "Failed to load prescriptions.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrescriptions(); }, []);

  // ── Update status ──────────────────────────────────────────────────────────
  const updateStatus = async (id: string, status: "dispensed" | "cancelled") => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      showToast(
        status === "dispensed"
          ? "Prescription marked as dispensed."
          : "Prescription cancelled.",
        "success"
      );
      setSelected(null);
      await fetchPrescriptions();
    } catch (err: any) {
      showToast(err.message || "Failed to update prescription.", "error");
    } finally {
      setUpdating(false);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = prescriptions.filter(p =>
    filter === "all" || p.status === filter
  );

  // ── Status badge ───────────────────────────────────────────────────────────
  const statusBadge = (status: Prescription["status"]) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      draft:     { bg: "#f0f0f0", color: "#888",    label: "Draft" },
      sent:      { bg: "#fff8e1", color: "#b8860b", label: "Sent" },
      dispensed: { bg: "#e8f5e9", color: "#2e7d32", label: "Dispensed" },
      cancelled: { bg: "#fdecea", color: "#c62828", label: "Cancelled" },
    };
    const s = map[status] ?? map.draft;
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "#2e7d32" : "#c62828",
          color: "#fff", borderRadius: 10, padding: "12px 22px",
          fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Title + filter tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, marginBottom: 2 }}>Pharmacist</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: t.text, lineHeight: 1 }}>Prescriptions</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "sent", "dispensed", "cancelled"] as Filter[]).map(f => (
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
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: "30px", textAlign: "center", color: t.text3, fontSize: 13 }}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "30px", textAlign: "center", color: t.text3, fontSize: 13 }}>
                  No prescriptions found.
                </td>
              </tr>
            ) : filtered.map((rx, i) => (
              <tr key={rx.id}>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${t.tableRowBorder}`, color: t.text3, background: t.tableRow }}>
                  {i + 1}
                </td>
                {[
                  rx.patient_name,
                  rx.medicine,
                  rx.dosage_frequency ?? "—",
                  rx.quantity ?? "—",
                  new Date(rx.prescription_date).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  }),
                ].map((val, j) => (
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
              ["Patient Name",  selected.patient_name],
              ["Medicine Name", selected.medicine],
              ["Mg / Dosage",   selected.dosage_frequency ?? "—"],
              ["Quantity",      selected.quantity ?? "—"],
              ["Date", new Date(selected.prescription_date).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })],
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
              {selected.status === "sent" && (
                <>
                  <button
                    onClick={() => updateStatus(selected.id, "cancelled")}
                    disabled={updating}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 8,
                      border: "none", background: "#d63031", color: "#fff",
                      fontSize: 13, fontWeight: 900, cursor: "pointer",
                      fontFamily: "inherit", opacity: updating ? 0.6 : 1,
                    }}>
                    CANCEL
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, "dispensed")}
                    disabled={updating}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 8,
                      border: `2px solid ${t.green}`, background: t.green,
                      color: "#fff", fontSize: 13, fontWeight: 900,
                      cursor: "pointer", fontFamily: "inherit",
                      opacity: updating ? 0.6 : 1,
                    }}>
                    {updating ? "SAVING…" : "CONFIRM"}
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