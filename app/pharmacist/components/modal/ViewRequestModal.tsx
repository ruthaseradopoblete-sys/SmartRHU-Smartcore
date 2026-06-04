"use client";
import { CSSProperties, useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type ReqStatus = "pending" | "alerted" | "confirmed" | "rejected";

type RestockRequest = {
  id: string;
  pharmacist_name: string;
  medicine_name: string;
  dosage: string;
  medicine_type: string;
  quantity: number;
  status: ReqStatus;
  created_at: string;
};

type Props = {
  onClose: () => void;
};

const STATUS_MAP: Record<ReqStatus, { bg: string; color: string; border: string; label: string }> = {
  pending:   { bg: "#fef9c3", color: "#854d0e", border: "#fde047", label: "Pending"   },
  alerted:   { bg: "#ffedd5", color: "#9a3412", border: "#fdba74", label: "Alerted"   },
  confirmed: { bg: "#dcfce7", color: "#166534", border: "#86efac", label: "Confirmed" },
  rejected:  { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", label: "Rejected"  },
};

type FilterTab = "all" | ReqStatus;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusPill({ status }: { status: ReqStatus }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1.5px solid ${s.border}`,
      borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

export default function ViewRequestsModal({ onClose }: Props) {
  const { t } = useTheme();
  const [requests,  setRequests]  = useState<RestockRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<FilterTab>("all");
  const [expanded,  setExpanded]  = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("restock_requests")
      .select("id, pharmacist_name, medicine_name, dosage, medicine_type, quantity, status, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setRequests(data as RestockRequest[]);
    setLoading(false);
  }

  /* ── Group rows by pharmacist_name + date (same-day same-pharmacist = one batch) ── */
  type GroupedBatch = {
    key: string;
    pharmacist_name: string;
    created_at: string;
    items: RestockRequest[];
    /* overall batch status = worst of all items */
    batchStatus: ReqStatus;
  };

  function batchStatus(items: RestockRequest[]): ReqStatus {
    if (items.some(i => i.status === "rejected"))  return "rejected";
    if (items.some(i => i.status === "alerted"))   return "alerted";
    if (items.some(i => i.status === "pending"))   return "pending";
    return "confirmed";
  }

  const batches: GroupedBatch[] = [];
  const seen = new Map<string, GroupedBatch>();

  requests.forEach(r => {
    const day = r.created_at.slice(0, 10);
    const key = `${r.pharmacist_name}__${day}`;
    if (!seen.has(key)) {
      const b: GroupedBatch = { key, pharmacist_name: r.pharmacist_name, created_at: r.created_at, items: [], batchStatus: "pending" };
      seen.set(key, b);
      batches.push(b);
    }
    seen.get(key)!.items.push(r);
  });
  batches.forEach(b => { b.batchStatus = batchStatus(b.items); });

  const filtered = filter === "all"
    ? batches
    : batches.filter(b => b.batchStatus === filter);

  const counts: Record<FilterTab, number> = {
    all:       batches.length,
    pending:   batches.filter(b => b.batchStatus === "pending").length,
    alerted:   batches.filter(b => b.batchStatus === "alerted").length,
    confirmed: batches.filter(b => b.batchStatus === "confirmed").length,
    rejected:  batches.filter(b => b.batchStatus === "rejected").length,
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all",       label: "All"       },
    { key: "pending",   label: "Pending"   },
    { key: "alerted",   label: "Alerted"   },
    { key: "confirmed", label: "Confirmed" },
    { key: "rejected",  label: "Rejected"  },
  ];

  const thStyle: CSSProperties = {
    padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 800,
    color: t.tableHead, textTransform: "uppercase", letterSpacing: "0.06em",
    borderBottom: `1px solid ${t.tableRowBorder}`, background: t.surface2,
    whiteSpace: "nowrap",
  };
  const tdStyle: CSSProperties = {
    padding: "9px 12px", fontSize: 12, color: t.text2,
    borderBottom: `1px solid ${t.tableRowBorder}`, verticalAlign: "middle",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: t.modalBg, borderRadius: 18, width: 700, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{ background: t.green, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
              Warehouse
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
              Restock Requests
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
              {batches.length} batch{batches.length !== 1 ? "es" : ""} · {requests.length} item{requests.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}
            >✕</button>
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display: "flex", gap: 8, padding: "14px 24px", borderBottom: `1px solid ${t.border2}`, flexShrink: 0, flexWrap: "wrap" }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: "6px 14px", borderRadius: 20,
                border: `1.5px solid ${filter === tab.key ? t.green : t.border2}`,
                background: filter === tab.key ? t.green : "transparent",
                color: filter === tab.key ? "#fff" : t.text2,
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {tab.label}
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 700,
                background: filter === tab.key ? "rgba(255,255,255,0.25)" : t.tableRowBorder,
                color: filter === tab.key ? "#fff" : t.text3,
                borderRadius: 10, padding: "1px 7px",
              }}>{counts[tab.key]}</span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.text3, fontSize: 13 }}>Loading requests…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: t.text3, fontSize: 13, fontStyle: "italic" }}>No requests found</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(batch => (
                <div
                  key={batch.key}
                  style={{
                    background: t.cardBg, borderRadius: 12,
                    border: `1px solid ${expanded === batch.key ? t.green : t.cardBorder}`,
                    overflow: "hidden",
                    boxShadow: expanded === batch.key ? `0 0 0 3px ${t.green}22` : "0 1px 6px rgba(0,0,0,0.06)",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                >
                  {/* Batch header row */}
                  <div
                    onClick={() => setExpanded(expanded === batch.key ? null : batch.key)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                  >
                    {/* Icon */}
                    <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: t.dispenseCard ?? "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                      📦
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                        {batch.pharmacist_name}
                      </div>
                      <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                        {batch.items.length} medicine{batch.items.length !== 1 ? "s" : ""} · {fmtDate(batch.created_at)}
                      </div>
                    </div>

                    {/* Status + chevron */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <StatusPill status={batch.batchStatus} />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="2"
                        style={{ transition: "transform 0.2s", transform: expanded === batch.key ? "rotate(180deg)" : "rotate(0deg)" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded items table */}
                  {expanded === batch.key && (
                    <div style={{ borderTop: `1px solid ${t.border2}` }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ ...thStyle, width: 28 }}>#</th>
                            <th style={thStyle}>Medicine</th>
                            <th style={thStyle}>Dosage</th>
                            <th style={thStyle}>Type</th>
                            <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
                            <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batch.items.map((item, i) => (
                            <tr key={item.id}>
                              <td style={{ ...tdStyle, color: t.text3, fontSize: 11 }}>{i + 1}</td>
                              <td style={tdStyle}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 13 }}>💊</span>
                                  <span style={{ fontWeight: 600, color: t.text }}>{item.medicine_name}</span>
                                </div>
                              </td>
                              <td style={tdStyle}>
                                <span style={{
                                  background: t.dispenseCard ?? "#f0fdf4", color: t.green,
                                  border: `1px solid ${t.border ?? "#e5e7eb"}`,
                                  borderRadius: 6, padding: "1px 8px",
                                  fontSize: 11, fontWeight: 700,
                                }}>{item.dosage || "—"}</span>
                              </td>
                              <td style={tdStyle}>{item.medicine_type}</td>
                              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: t.text }}>{item.quantity}</td>
                              <td style={{ ...tdStyle, textAlign: "center" }}>
                                <StatusPill status={item.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {/* Batch total */}
                        <tfoot>
                          <tr>
                            <td colSpan={4} style={{ ...tdStyle, fontWeight: 700, color: t.text3, fontSize: 11, textAlign: "right", borderBottom: "none" }}>
                              Total units:
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 800, color: t.green, textAlign: "right", borderBottom: "none" }}>
                              {batch.items.reduce((s, i) => s + i.quantity, 0)}
                            </td>
                            <td style={{ borderBottom: "none" }} />
                          </tr>
                        </tfoot>
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