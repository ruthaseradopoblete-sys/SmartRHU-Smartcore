"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type ModalType = "consultations" | "prescriptions" | "labRequests";

interface Props {
  open: boolean;
  type: ModalType | null;
  dailyCount?: number;
  onClose: () => void;
}

/**
 * CONFIG
 * - dateField:      petsa na ipinapakita / ginagamit ng consultations para sa "today".
 * - timestampField: kung naka-set (created_at), ITO ang gagamitin para sa "today"
 *                   counting — mas reliable kaysa sa user-editable na date field,
 *                   at tumutugma sa logic ng DoctorDashboard card.
 */
const CONFIG = {
  consultations: {
    label: "Consultations",
    icon: "🩺",
    table: "soap_consultations",
    dateField: "consultation_date",
    timestampField: null as string | null,
    statusFilter: { field: "status", value: "done" } as
      | { field: string; value: string }
      | null,
  },
  prescriptions: {
    label: "Prescriptions",
    icon: "💊",
    table: "prescriptions",
    dateField: "prescription_date",
    timestampField: "created_at" as string | null,
    statusFilter: null as { field: string; value: string } | null,
  },
  labRequests: {
    label: "Lab Requests",
    icon: "🧪",
    table: "laboratory_requests",
    dateField: "request_date",
    timestampField: "created_at" as string | null,
    statusFilter: null as { field: string; value: string } | null,
  },
} as const;

export default function AnalyticsModal({ open, type, onClose }: Props) {
  const [tab, setTab] = useState<"today" | "all">("today");
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cfg = type ? CONFIG[type] : null;

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
  }, []);

  // PH day window (para sa created_at na timestamptz)
  const start = `${todayStr}T00:00:00+08:00`;
  const end = `${todayStr}T23:59:59+08:00`;

  const fetchData = useCallback(
    async (activeTab: "today" | "all") => {
      if (!cfg) return;

      setLoading(true);
      setError("");

      // ── TODAY count ──────────────────────────────────────────────
      // Kung may timestampField (created_at), bilangin sa DALAWANG paraan
      // tapos kunin ang mas malaki — gumagana kahit alin man sa created_at
      // o sa date field ang naka-set. Para sa consultations (walang
      // timestampField), date field lang ang gagamitin.
      let todayTotal = 0;

      if (cfg.timestampField) {
        let qTs = supabase
          .from(cfg.table)
          .select("id", { count: "exact", head: true })
          .gte(cfg.timestampField, start)
          .lte(cfg.timestampField, end);

        let qDate = supabase
          .from(cfg.table)
          .select("id", { count: "exact", head: true })
          .eq(cfg.dateField, todayStr);

        if (cfg.statusFilter) {
          qTs = qTs.eq(cfg.statusFilter.field, cfg.statusFilter.value);
          qDate = qDate.eq(cfg.statusFilter.field, cfg.statusFilter.value);
        }

        const [tsRes, dateRes] = await Promise.all([qTs, qDate]);

        // Kung pareho silang may error, ipakita ang error.
        if (tsRes.error && dateRes.error) {
          setError(tsRes.error.message);
          setLoading(false);
          return;
        }

        todayTotal = Math.max(tsRes.count ?? 0, dateRes.count ?? 0);
      } else {
        let qDate = supabase
          .from(cfg.table)
          .select("id", { count: "exact", head: true })
          .eq(cfg.dateField, todayStr);

        if (cfg.statusFilter) {
          qDate = qDate.eq(cfg.statusFilter.field, cfg.statusFilter.value);
        }

        const { count, error: dErr } = await qDate;
        if (dErr) {
          setError(dErr.message);
          setLoading(false);
          return;
        }
        todayTotal = count ?? 0;
      }

      setTodayCount(todayTotal);

      // ── ALL-TIME total ───────────────────────────────────────────
      let totalQ = supabase
        .from(cfg.table)
        .select("id", { count: "exact", head: true });

      if (cfg.statusFilter) {
        totalQ = totalQ.eq(cfg.statusFilter.field, cfg.statusFilter.value);
      }

      const { count: allTotal, error: totalError } = await totalQ;

      if (totalError) {
        setError(totalError.message);
        setLoading(false);
        return;
      }

      setTotalCount(allTotal ?? 0);

      // ── RECORDS list ─────────────────────────────────────────────
      const orderField = cfg.timestampField ?? cfg.dateField;

      let recQ = supabase
        .from(cfg.table)
        .select(
          `
          *,
          patients (
            first_name,
            middle_name,
            last_name
          )
        `
        )
        .order(orderField, { ascending: false })
        .limit(20);

      if (cfg.statusFilter) {
        recQ = recQ.eq(cfg.statusFilter.field, cfg.statusFilter.value);
      }

      if (activeTab === "today") {
        if (cfg.timestampField) {
          recQ = recQ.gte(cfg.timestampField, start).lte(cfg.timestampField, end);
        } else {
          recQ = recQ.eq(cfg.dateField, todayStr);
        }
      }

      const { data, error: recError } = await recQ;

      if (recError) {
        setError(recError.message);
        setRecords([]);
        setLoading(false);
        return;
      }

      setRecords(data ?? []);
      setLoading(false);
    },
    [cfg, todayStr, start, end]
  );

  useEffect(() => {
    if (!open || !cfg) return;
    setTab("today");
    fetchData("today");
  }, [open, type, cfg, fetchData]);

  function handleTabChange(t: "today" | "all") {
    setTab(t);
    fetchData(t);
  }

  function getPatientName(r: any) {
    const p = r.patients;
    if (!p) return "No patient name";

    return [p.first_name, p.middle_name, p.last_name]
      .filter(Boolean)
      .join(" ");
  }

  // PH date mula sa created_at timestamp (para tama ang araw na ipinapakita)
  function phDateFromTimestamp(ts?: string) {
    if (!ts) return undefined;
    return new Date(ts).toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    if (dateStr === todayStr) return "Today";

    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Ipakita ang date field kung meron; kung wala, gamitin ang PH date ng created_at.
  function getDisplayDate(r: any) {
    if (!cfg) return "—";
    const raw =
      r[cfg.dateField] ??
      (cfg.timestampField ? phDateFromTimestamp(r[cfg.timestampField]) : undefined);
    return formatDate(raw);
  }

  function getRecordSubtitle(r: any) {
    if (type === "labRequests") {
      return r.status ? `Status: ${r.status}` : "Laboratory request";
    }

    if (type === "prescriptions") {
      return r.status ? `Status: ${r.status}` : "Prescription record";
    }

    return (
      r.chief_complaint ??
      r.diagnosis ??
      r.remarks ??
      "Consultation record"
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
          background: "#ffffff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 680,
          boxShadow: "0 10px 35px rgba(22,163,74,0.18)",
          overflow: "hidden",
          border: "1px solid rgba(22,163,74,0.15)",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(22,163,74,0.15)",
            background: "#f6faf7",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#064e3b",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>{cfg.icon}</span>
            {cfg.label}
          </div>

          <button
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid rgba(22,163,74,0.25)",
              cursor: "pointer",
              fontSize: 20,
              color: "#166534",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
            padding: "20px 26px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #16a34a, #14532d)",
              borderRadius: 14,
              padding: "20px",
              color: "#ffffff",
              boxShadow: "0 8px 18px rgba(22,163,74,0.25)",
            }}
          >
            <div style={{ fontSize: 16, opacity: 0.9 }}>Today</div>
            <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>
              {todayCount}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 12 }}>
              Today only
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #15803d, #064e3b)",
              borderRadius: 14,
              padding: "20px",
              color: "#ffffff",
              boxShadow: "0 8px 18px rgba(22,163,74,0.25)",
            }}
          >
            <div style={{ fontSize: 16, opacity: 0.9 }}>All-time total</div>
            <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>
              {totalCount}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 12 }}>
              All records
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "0 26px 18px" }}>
          <button
            onClick={() => handleTabChange("today")}
            style={{
              fontSize: 14,
              fontWeight: 800,
              padding: "11px 20px",
              borderRadius: 999,
              border:
                tab === "today" ? "none" : "1px solid rgba(22,163,74,0.2)",
              background: tab === "today" ? "#16a34a" : "#f6faf7",
              color: tab === "today" ? "#ffffff" : "#166534",
              cursor: "pointer",
            }}
          >
            Today's records
          </button>

          <button
            onClick={() => handleTabChange("all")}
            style={{
              fontSize: 14,
              fontWeight: 800,
              padding: "11px 20px",
              borderRadius: 999,
              border: tab === "all" ? "none" : "1px solid rgba(22,163,74,0.2)",
              background: tab === "all" ? "#16a34a" : "#f6faf7",
              color: tab === "all" ? "#ffffff" : "#166534",
              cursor: "pointer",
            }}
          >
            All records
          </button>
        </div>

        <div
          style={{
            margin: "0 26px 24px",
            maxHeight: 300,
            overflowY: "auto",
            background: "#f6faf7",
            borderRadius: 14,
            border: "1px solid rgba(22,163,74,0.15)",
            padding: "8px 18px",
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: 34, color: "#6b7280" }}>
              Loading…
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: 34, color: "#b91c1c" }}>
              {error}
            </div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: "center", padding: 34, color: "#6b7280" }}>
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
                  gap: 16,
                  padding: "14px 0",
                  borderBottom:
                    i < records.length - 1
                      ? "1px solid rgba(22,163,74,0.15)"
                      : "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  >
                    {getPatientName(r)}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      marginTop: 4,
                    }}
                  >
                    {getRecordSubtitle(r)}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#166534",
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {getDisplayDate(r)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}