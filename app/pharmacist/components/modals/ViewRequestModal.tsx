"use client";
import { CSSProperties, useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type RequestItem = {
  medicine: string;
  dosage: string;
  type: string;
  unit: string;
  qty: number;
};

type RestockRequest = {
  id: string;
  items: RequestItem[];
  status: "pending" | "fulfilled" | "cancelled";
  created_at: string;
};

type Props = {
  onClose: () => void;
};

const STATUS_MAP = {
  pending:   { bg: "#fef9c3", color: "#854d0e", border: "#fde047", label: "Pending" },
  fulfilled: { bg: "#dcfce7", color: "#166534", border: "#86efac", label: "Fulfilled" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", label: "Cancelled" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ViewRequestsModal({ onClose }: Props) {
  const { t } = useTheme();
  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter]     = useState<"all" | "pending" | "fulfilled" | "cancelled">("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("pharma_restock_request")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setRequests(data as RestockRequest[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = requests.filter(r => filter === "all" || r.status === filter);

  const counts = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === "pending").length,
    fulfilled: requests.filter(r => r.status === "fulfilled").length,
    cancelled: requests.filter(r => r.status === "cancelled").length,
  };

  const pill = (status: RestockRequest["status"]) => {
    const s = STATUS_MAP[status] ?? STATUS_MAP.pending;
    return (
      <span style={{
        background: s.bg, color: s.color,
        border: `1.5px solid ${s.border}`,
        borderRadius: 20, padding: "2px 10px",
        fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      }}>{s.label}</span>
    );
  };

  const thStyle: CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800,
    color: t.tableHead, textTransform: "uppercase", letterSpacing: "0.06em",
    borderBottom: `1px solid ${t.tableRowBorder}`, background: t.surface2,
    whiteSpace: "nowrap",
  };
  const tdStyle: CSSProperties = {
    padding: "10px 14px", fontSize: 12.5, color: t.text2,
    borderBottom: `1px solid ${t.tableRowBorder}`, verticalAlign: "middle",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: t.modalBg, borderRadius: 18, width: 680, maxHeight: "85vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{
          background: t.green, padding: "18px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)",
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
              Pharmacist
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
              Restock Requests
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
            width: 30, height: 30, borderRadius: 8, fontSize: 16,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "inherit",
          }}>✕</button>
        </div>

        {/* ── Filter tabs ── */}
        <div style={{
          display: "flex", gap: 8, padding: "14px 24px 0",
          borderBottom: `1px solid ${t.border2}`, flexShrink: 0, flexWrap: "wrap",
          paddingBottom: 14,
        }}>
          {(["all", "pending", "fulfilled", "cancelled"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 16px", borderRadius: 20,
              border: `1.5px solid ${filter === f ? t.green : t.border2}`,
              background: filter === f ? t.green : "transparent",
              color: filter === f ? "#fff" : t.text2,
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              textTransform: "capitalize",
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 700,
                background: filter === f ? "rgba(255,255,255,0.25)" : t.tableRowBorder,
                color: filter === f ? "#fff" : t.text3,
                borderRadius: 10, padding: "1px 7px",
              }}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.text3, fontSize: 13 }}>
              Loading requests…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: t.text3, fontSize: 13,
              fontStyle: "italic" }}>
              No requests found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((req) => (
                <div key={req.id} style={{
                  background: t.cardBg, borderRadius: 12,
                  border: `1px solid ${expanded === req.id ? t.green : t.cardBorder}`,
                  overflow: "hidden",
                  boxShadow: expanded === req.id
                    ? `0 0 0 3px ${t.green}22`
                    : "0 1px 6px rgba(0,0,0,0.06)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}>

                  {/* Request header row */}
                  <div
                    onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px", cursor: "pointer",
                    }}>
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: t.dispenseCard, display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>📦</div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                        {req.items.length} medicine{req.items.length !== 1 ? "s" : ""} requested
                      </div>
                      <div style={{ fontSize: 11.5, color: t.text3, marginTop: 2 }}>
                        {fmtDate(req.created_at)}
                      </div>
                    </div>

                    {/* Status + chevron */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {pill(req.status)}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={t.text3} strokeWidth="2"
                        style={{
                          transition: "transform 0.2s",
                          transform: expanded === req.id ? "rotate(180deg)" : "rotate(0deg)",
                        }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded items table */}
                  {expanded === req.id && (
                    <div style={{ borderTop: `1px solid ${t.border2}` }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                          <tr>
                            <th style={{ ...thStyle, width: 32 }}>#</th>
                            <th style={thStyle}>Medicine</th>
                            <th style={thStyle}>Dosage</th>
                            <th style={thStyle}>Type</th>
                            <th style={thStyle}>Unit</th>
                            <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {req.items.map((item, i) => (
                            <tr key={i}>
                              <td style={{ ...tdStyle, color: t.text3, fontSize: 11 }}>{i + 1}</td>
                              <td style={tdStyle}>
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 13 }}>💊</span>
                                  <span style={{ fontWeight: 600, color: t.text }}>{item.medicine}</span>
                                </span>
                              </td>
                              <td style={tdStyle}>
                                <span style={{
                                  background: t.dispenseCard, color: t.green,
                                  border: `1px solid ${t.border}`,
                                  borderRadius: 6, padding: "1px 8px",
                                  fontSize: 11, fontWeight: 700,
                                }}>{item.dosage || "—"}</span>
                              </td>
                              <td style={tdStyle}>{item.type}</td>
                              <td style={tdStyle}>{item.unit}</td>
                              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700,
                                color: t.text }}>{item.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}