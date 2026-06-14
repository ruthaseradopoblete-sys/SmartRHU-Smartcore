"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../styles/dashboard.module.css";

type ModalType = "consultations" | "prescriptions" | "labRequests";

interface Props {
  open: boolean;
  type: ModalType | null;
  dailyCount: number;
  onClose: () => void;
}

const CONFIG = {
  consultations: {
    label: "Consultations",
    icon: "🩺",
    table: "soap_consultations",
    dateField: "consultation_date",
    nameJoin: "patient_id",
    statusFilter: { field: "status", value: "done" },
  },
  prescriptions: {
    label: "Prescriptions",
    icon: "💊",
    table: "prescriptions",
    dateField: "prescription_date",
    nameJoin: "patient_id",
    statusFilter: null,
  },
  labRequests: {
    label: "Lab Requests",
    icon: "🧪",
    table: "laboratory_requests",
    dateField: "request_date",
    nameJoin: "patient_id",
    statusFilter: null,
  },
};

export default function AnalyticsModal({ open, type, dailyCount, onClose }: Props) {
  const [tab, setTab] = useState<"today" | "all">("today");
  const [totalCount, setTotalCount] = useState(0);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const cfg = type ? CONFIG[type] : null;
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!open || !cfg) return;
    setTab("today");
    fetchData("today");
  }, [open, type]);

  async function fetchData(activeTab: "today" | "all") {
    if (!cfg) return;
    setLoading(true);

    // total count
    let totalQ = supabase.from(cfg.table).select("id", { count: "exact", head: true });
    if (cfg.statusFilter) totalQ = totalQ.eq(cfg.statusFilter.field, cfg.statusFilter.value);
    const { count } = await totalQ;
    setTotalCount(count ?? 0);

    // records list
    let recQ = supabase
      .from(cfg.table)
      .select(`*, patients(name)`)
      .order(cfg.dateField, { ascending: false })
      .limit(20);
    if (cfg.statusFilter) recQ = recQ.eq(cfg.statusFilter.field, cfg.statusFilter.value);
    if (activeTab === "today") recQ = recQ.eq(cfg.dateField, todayStr);
    const { data } = await recQ;
    setRecords(data ?? []);
    setLoading(false);
  }

  function handleTabChange(t: "today" | "all") {
    setTab(t);
    fetchData(t);
  }

  function formatDate(dateStr: string) {
    if (dateStr === todayStr) return "Today";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  }

  if (!open || !cfg) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--bg, #fff)",
        borderRadius: 16, width: "100%", maxWidth: 520,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{cfg.icon}</span> {cfg.label}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888" }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 20px" }}>
          <div style={{ background: "#f0f7ff", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#2563eb" }}>{dailyCount}</div>
            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>Today</div>
            <div style={{ fontSize: 10, color: "#3b82f6", background: "#dbeafe", borderRadius: 20, padding: "2px 8px", display: "inline-block", marginTop: 6 }}>resets at midnight</div>
          </div>
          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#16a34a" }}>{totalCount}</div>
            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>All-time total</div>
            <div style={{ fontSize: 10, color: "#15803d", background: "#dcfce7", borderRadius: 20, padding: "2px 8px", display: "inline-block", marginTop: 6 }}>since records began</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, padding: "0 20px 12px" }}>
          {(["today", "all"] as const).map((t) => (
            <button key={t} onClick={() => handleTabChange(t)} style={{
              fontSize: 12, padding: "5px 14px", borderRadius: 20,
              border: tab === t ? "none" : "1px solid #ddd",
              background: tab === t ? "#2563eb" : "none",
              color: tab === t ? "#fff" : "#6b7280",
              cursor: "pointer",
            }}>
              {t === "today" ? "Today's records" : "All records"}
            </button>
          ))}
        </div>

        {/* Records */}
        <div style={{ padding: "0 20px 16px", maxHeight: 240, overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#aaa", padding: "24px 0", fontSize: 13 }}>Loading…</div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: "center", color: "#aaa", padding: "24px 0", fontSize: 13 }}>No records found.</div>
          ) : records.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < records.length - 1 ? "1px solid #f3f4f6" : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{r.patients?.name ?? "—"}</div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  {r.chief_complaint ?? r.diagnosis ?? r.test_type ?? ""}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#aaa" }}>{formatDate(r[cfg.dateField])}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}