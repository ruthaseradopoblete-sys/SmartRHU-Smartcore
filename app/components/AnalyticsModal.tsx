"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ModalType = "consultations" | "prescriptions" | "labRequests";

interface Props {
  open: boolean;
  type: ModalType | null;
  dailyCount: number;
  onClose: () => void;
}

const COLORS = {
  bg: "#f0f7f2",
  surface: "#ffffff",
  surface2: "#f6faf7",
  border: "rgba(22,163,74,0.15)",
  green: "#16a34a",
  greenDark: "#166534",
  greenDarker: "#064e3b",
  text: "#111827",
  muted: "#6b7280",
};

const CONFIG = {
  consultations: {
    label: "Consultations",
    icon: "🩺",
    table: "soap_consultations",
    dateField: "consultation_date",
    statusFilter: { field: "status", value: "done" },
  },
  prescriptions: {
    label: "Prescriptions",
    icon: "💊",
    table: "prescriptions",
    dateField: "prescription_date",
    statusFilter: null,
  },
  labRequests: {
    label: "Lab Requests",
    icon: "🧪",
    table: "laboratory_requests",
    dateField: "request_date",
    statusFilter: null,
  },
} as const;

export default function AnalyticsModal({
  open,
  type,
  dailyCount,
  onClose,
}: Props) {
  const [tab, setTab] = useState<"today" | "all">("today");
  const [totalCount, setTotalCount] = useState(0);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const cfg = type ? CONFIG[type] : null;

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
  }, []);

  useEffect(() => {
    if (!open || !cfg) return;
    setTab("today");
    fetchData("today");
  }, [open, type]);

  async function fetchData(activeTab: "today" | "all") {
    if (!cfg) return;

    setLoading(true);

    let totalQ = supabase
      .from(cfg.table)
      .select("id", { count: "exact", head: true });

    if (cfg.statusFilter) {
      totalQ = totalQ.eq(cfg.statusFilter.field, cfg.statusFilter.value);
    }

    const { count } = await totalQ;
    setTotalCount(count ?? 0);

    let recQ = supabase
      .from(cfg.table)
      .select(`*, patients(name)`)
      .order(cfg.dateField, { ascending: false })
      .limit(20);

    if (cfg.statusFilter) {
      recQ = recQ.eq(cfg.statusFilter.field, cfg.statusFilter.value);
    }

    if (activeTab === "today") {
      recQ = recQ.eq(cfg.dateField, todayStr);
    }

    const { data } = await recQ;

    setRecords(data ?? []);
    setLoading(false);
  }

  function handleTabChange(t: "today" | "all") {
    setTab(t);
    fetchData(t);
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    if (dateStr === todayStr) return "Today";

    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  }

  function getRecordSubtitle(r: any) {
    return (
      r.chief_complaint ??
      r.diagnosis ??
      r.test_type ??
      r.prescription_notes ??
      r.remarks ??
      ""
    );
  }

  if (!open || !cfg) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(6,78,59,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: COLORS.surface,
          borderRadius: 18,
          width: "100%",
          maxWidth: 540,
          boxShadow: "0 10px 35px rgba(22,163,74,0.18)",
          overflow: "hidden",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.surface2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: COLORS.greenDarker,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{cfg.icon}</span>
            {cfg.label}
          </div>

          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              cursor: "pointer",
              fontSize: 16,
              color: COLORS.greenDark,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "16px 20px",
            background: COLORS.surface,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #16a34a, #14532d)",
              borderRadius: 14,
              padding: "15px 16px",
              color: "#ffffff",
              boxShadow: "0 8px 18px rgba(22,163,74,0.25)",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.85 }}>Today</div>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
              {dailyCount}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8 }}>
              resets at midnight
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #15803d, #064e3b)",
              borderRadius: 14,
              padding: "15px 16px",
              color: "#ffffff",
              boxShadow: "0 8px 18px rgba(22,163,74,0.25)",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              All-time total
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
              {totalCount}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8 }}>
              since records began
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "0 20px 14px",
            background: COLORS.surface,
          }}
        >
          {(["today", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 15px",
                borderRadius: 999,
                border:
                  tab === t ? "none" : `1px solid ${COLORS.border}`,
                background: tab === t ? COLORS.green : COLORS.surface2,
                color: tab === t ? "#ffffff" : COLORS.greenDark,
                cursor: "pointer",
              }}
            >
              {t === "today" ? "Today's records" : "All records"}
            </button>
          ))}
        </div>

        <div
          style={{
            margin: "0 20px 18px",
            maxHeight: 250,
            overflowY: "auto",
            background: COLORS.surface2,
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            padding: "4px 14px",
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: "center",
                color: COLORS.muted,
                padding: "26px 0",
                fontSize: 13,
              }}
            >
              Loading…
            </div>
          ) : records.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: COLORS.muted,
                padding: "26px 0",
                fontSize: 13,
              }}
            >
              No records found.
            </div>
          ) : (
            records.map((r, i) => (
              <div
                key={r.id ?? i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  padding: "11px 0",
                  borderBottom:
                    i < records.length - 1
                      ? `1px solid ${COLORS.border}`
                      : "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {r.patients?.name ?? "—"}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.muted,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 330,
                    }}
                  >
                    {getRecordSubtitle(r)}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: COLORS.greenDark,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {formatDate(r[cfg.dateField])}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}