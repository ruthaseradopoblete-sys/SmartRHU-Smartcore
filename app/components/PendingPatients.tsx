"use client";
import { useEffect, useState, useCallback } from "react";
import styles from "../styles/dashboard.module.css";
import { supabase } from "@/lib/supabase";

export interface QueueEntry {
  queueId:     string;
  patientId:   string;
  name:        string;
  age:         string;
  gender:      string;
  civil:       string;
  addr:        string;
  time:        string;
  status:      "waiting" | "done";
  queueNumber: number;
}

interface CompletedConsult {
  consultId:        string;
  patientId:        string;
  name:             string;
  age:              string;
  gender:           string;
  addr:             string;
  consultationDate: string | null;
}

interface SoapDetail {
  consultation_date: string | null;
  subjective:        string | null;
  objective:         string | null;
  plan:              string | null;
  assessments:       string[] | null;
  icd10_codes:       string[] | null;
  follow_up_date:    string | null;
  follow_up_notes:   string | null;
}

interface Props {
  onConsult: (entry: QueueEntry) => void;
}

type Tab = "queue" | "completed";

function getTodayPHT(): string {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 8);
  return d.toISOString().slice(0, 10);
}

export default function PendingPatients({ onConsult }: Props) {
  const [tab,       setTab]       = useState<Tab>("queue");
  const [queue,     setQueue]     = useState<QueueEntry[]>([]);
  const [completed, setCompleted] = useState<CompletedConsult[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [search, setSearch] = useState("");

  const [viewTarget, setViewTarget] = useState<{ consultId: string; patientId: string; name: string } | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const today = getTodayPHT();

    const { data: consultRows, error } = await supabase
      .from("soap_consultations")
      .select("id, status, created_at, patient_id, queue_number")
      .eq("queue_date", today)
      .order("queue_number", { ascending: true });

    if (error) {
      console.error("Queue fetch error:", JSON.stringify(error));
      setLoading(false);
      return;
    }

    if (!consultRows || consultRows.length === 0) {
      setQueue([]);
      setLoading(false);
      return;
    }

    const patientIds = consultRows.map((r: any) => r.patient_id).filter(Boolean);
    const { data: patientRows } = await supabase
      .from("patients")
      .select("id, first_name, last_name, age, sex, purok, barangay, municipality")
      .in("id", patientIds);

    const patientMap = Object.fromEntries(
      (patientRows ?? []).map((p: any) => [p.id, p])
    );

    const entries: QueueEntry[] = consultRows
      .map((row: any) => {
        const p = patientMap[row.patient_id];
        if (!p) return null;
        return {
          queueId:     row.id,
          patientId:   row.patient_id,
          queueNumber: row.queue_number ?? 0,
          name:        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
          age:         p.age != null ? String(p.age) : "",
          gender:      p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : "",
          civil:       "",
          addr:        [p.purok, p.barangay, p.municipality].filter(Boolean).join(", "),
          time:        new Date(row.created_at).toLocaleTimeString("en-PH", {
                        hour: "2-digit", minute: "2-digit",
                      }),
          status:      row.status === "done" ? "done" : "waiting",
        } as QueueEntry;
      })
      .filter(Boolean) as QueueEntry[];

    const sorted: QueueEntry[] = [
      ...entries
        .filter(e => e.status === "waiting")
        .sort((a, b) => a.queueNumber - b.queueNumber),
      ...entries
        .filter(e => e.status === "done")
        .sort((a, b) => a.queueNumber - b.queueNumber),
    ];

    setQueue(sorted);
    setLoading(false);
  }, []);

  // ── Completed Consultations — EXCLUDES archived records ────────────────
  // Filter: status = "done" AND archived_at IS NULL.
  // Pag na-archive na yung consultation (may laman na ang archived_at),
  // hindi na ito lalabas dito. Realtime "*" subscription sa ibaba ang
  // nag-rre-refresh ng listahan kapag may UPDATE sa archived_at.
  const fetchCompleted = useCallback(async () => {
    setLoadingCompleted(true);

    const { data: consultRows, error } = await supabase
      .from("soap_consultations")
      .select("id, patient_id, consultation_date")
      .eq("status", "done")
      .is("archived_at", null)
      .order("consultation_date", { ascending: false });

    if (error) {
      console.error("Completed fetch error:", JSON.stringify(error));
      setLoadingCompleted(false);
      return;
    }

    if (!consultRows || consultRows.length === 0) {
      setCompleted([]);
      setLoadingCompleted(false);
      return;
    }

    const seen = new Set<string>();
    const latestRows = consultRows.filter((row: any) => {
      if (seen.has(row.patient_id)) return false;
      seen.add(row.patient_id);
      return true;
    });

    const patientIds = [...seen];
    const { data: patientRows } = await supabase
      .from("patients")
      .select("id, first_name, last_name, age, sex, purok, barangay, municipality")
      .in("id", patientIds);

    const patientMap = Object.fromEntries(
      (patientRows ?? []).map((p: any) => [p.id, p])
    );

    const entries: CompletedConsult[] = latestRows
      .map((row: any) => {
        const p = patientMap[row.patient_id];
        if (!p) return null;
        return {
          consultId:        row.id,
          patientId:        row.patient_id,
          name:             `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
          age:              p.age != null ? String(p.age) : "",
          gender:           p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : "",
          addr:             [p.purok, p.barangay, p.municipality].filter(Boolean).join(", "),
          consultationDate: row.consultation_date,
        } as CompletedConsult;
      })
      .filter(Boolean) as CompletedConsult[];

    setCompleted(entries);
    setLoadingCompleted(false);
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchCompleted();

    const channel = supabase
      .channel("pending_patients_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "soap_consultations" }, () => {
        fetchQueue();
        fetchCompleted();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
        fetchCompleted();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchQueue, fetchCompleted]);

  async function handleCancel(queueId: string) {
    const { error } = await supabase
      .from("soap_consultations")
      .delete()
      .eq("id", queueId);

    if (error) { alert(`❌ Failed to remove: ${error.message}`); return; }
    fetchQueue();
  }

  const waitingCount = queue.filter(q => q.status === "waiting").length;
  const filteredCompleted = completed.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`${styles.card} ${styles.pendingCard}`}>

      {/* ── Header ── */}
      <div className={styles.pendingHeader}>
        <h3 className={styles.pendingTitle}>Patients</h3>
        <span className={styles.pendingCount}>
          {tab === "queue" ? waitingCount : filteredCompleted.length}
        </span>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {([ ["queue", "Today's Queue"], ["completed", "Completed Consultation"] ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(""); }}
            style={{
              flex: 1, padding: "9px 0", border: "none", background: "transparent",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
             fontFamily: "'Nunito', sans-serif",
              color:        tab === t ? "var(--green)" : "var(--text3)",
              borderBottom: tab === t ? "2px solid var(--green)" : "2px solid transparent",
              transition: "all .15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Search (Completed Consultation tab only) ── */}
      {tab === "completed" && (
        <div style={{ padding: "8px 10px", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <svg
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              style={{
                width: "100%", background: "var(--surface2)", border: "1.5px solid var(--border)",
                borderRadius: 9, padding: "7px 12px 7px 30px", fontSize: 12,
                color: "var(--text)", outline: "none", fontFamily: "'Nunito', sans-serif",
                boxSizing: "border-box",
              }}
              placeholder="Search completed consultations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* TODAY'S QUEUE TAB */}
      {tab === "queue" && (
        <div className={styles.pendingList}>
          {loading && (
            <div className={styles.emptyState}>Loading queue…</div>
          )}

          {!loading && queue.length === 0 && (
            <div className={styles.emptyState}>No patients in queue today.</div>
          )}

          {!loading && queue.some(q => q.status === "waiting") && queue.some(q => q.status === "done") && (() => {
            const firstDoneIndex = queue.findIndex(q => q.status === "done");
            return queue.map((p, idx) => (
              <div key={p.queueId}>
                {idx === firstDoneIndex && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 12px", margin: "4px 0",
                  }}>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "var(--text3)",
                      letterSpacing: ".08em", textTransform: "uppercase",
                    }}>
                      Completed
                    </span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
                  </div>
                )}
                <QueueItem p={p} onConsult={onConsult} onCancel={handleCancel} />
              </div>
            ));
          })()}

          {!loading && !(queue.some(q => q.status === "waiting") && queue.some(q => q.status === "done")) &&
            queue.map(p => (
              <QueueItem key={p.queueId} p={p} onConsult={onConsult} onCancel={handleCancel} />
            ))
          }
        </div>
      )}

      {/* COMPLETED CONSULTATION TAB */}
      {tab === "completed" && (
        <div className={styles.pendingList}>
          {loadingCompleted && (
            <div className={styles.emptyState}>Loading completed consultations…</div>
          )}

          {!loadingCompleted && filteredCompleted.length === 0 && (
            <div className={styles.emptyState}>
              {search ? `No completed consultations found for "${search}"` : "No completed consultations yet."}
            </div>
          )}

          {!loadingCompleted && filteredCompleted.map(c => (
            <div key={c.patientId} className={styles.pendingItem}>
              <div className={styles.pendingItemTop}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: c.gender === "Female" ? "#ec4899" : "#3b82f6",
                  color: "#fff", fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className={styles.pendingInfo}>
                  <div className={styles.pendingName}>{c.name}</div>
                  <div className={styles.pendingTime}>
                    {c.consultationDate
                      ? new Date(c.consultationDate).toLocaleDateString("en-PH", {
                          month: "short", day: "numeric", year: "numeric",
                        })
                      : ""}
                    {c.age    ? ` · ${c.age} yrs` : ""}
                    {c.gender ? ` · ${c.gender}`  : ""}
                  </div>
                </div>
                <span className={`${styles.statusPill} ${styles.statusDone}`}>
                  Done
                </span>
              </div>

              <div className={styles.pendingBtns}>
                <button
                  className={`${styles.pBtn} ${styles.pBtnConsult}`}
                  style={{ width: "100%" }}
                  onClick={() => setViewTarget({ consultId: c.consultId, patientId: c.patientId, name: c.name })}
                >
                  👁 VIEW
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── VIEW modal ── */}
      {viewTarget && (
        <SoapViewModal
          consultId={viewTarget.consultId}
          patientId={viewTarget.patientId}
          patientName={viewTarget.name}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}
function QueueItem({
  p,
  onConsult,
  onCancel,
}: {
  p: QueueEntry;
  onConsult: (e: QueueEntry) => void;
  onCancel:  (id: string)    => void;
}) {
  return (
    <div
      className={`${styles.pendingItem}${p.status === "done" ? " " + styles.pendingDone : ""}`}
    >
      <div className={styles.pendingItemTop}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: p.status === "done" ? "#9ca3af" : "var(--green)",
          color: "#fff", fontSize: 11, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {p.queueNumber}
        </div>

        <div className={styles.pendingInfo}>
          <div className={styles.pendingName}>{p.name}</div>
          <div className={styles.pendingTime}>
            {p.time}
            {p.age    ? ` · ${p.age} yrs` : ""}
            {p.gender ? ` · ${p.gender}`  : ""}
          </div>
        </div>

        <span className={`${styles.statusPill} ${p.status === "done" ? styles.statusDone : styles.statusWaiting}`}>
          {p.status === "done" ? "Done" : "Waiting"}
        </span>
      </div>

      {p.status !== "done" && (
        <div className={styles.pendingBtns}>
          <button
            className={`${styles.pBtn} ${styles.pBtnCancel}`}
            onClick={() => onCancel(p.queueId)}
          >
            ✕ CANCEL
          </button>
          <button
            className={`${styles.pBtn} ${styles.pBtnConsult}`}
            onClick={() => onConsult(p)}
          >
            ✓ CONSULT
          </button>
        </div>
      )}
    </div>
  );
}

// ── Design tokens ──────────────────────────────────────────────────────────
const DARK   = "#064e3b";
const G      = "#16a34a";
const LIGHT  = "#f0fdf4";
const BORDER = "#d1fae5";

const SOAP_CFG = [
  { key: "s", label: "Subjective", icon: "💬", bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", tag: "#dbeafe" },
  { key: "o", label: "Objective",  icon: "🔍", bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", tag: "#dcfce7" },
  { key: "a", label: "Assessment", icon: "📋", bg: "#fff7ed", border: "#fed7aa", color: "#c2410c", tag: "#ffedd5" },
  { key: "p", label: "Plan",       icon: "🎯", bg: "#fdf4ff", border: "#e9d5ff", color: "#7e22ce", tag: "#f3e8ff" },
] as const;

function VitalPill({ icon, label, value, unit }: { icon: string; label: string; value: any; unit?: string }) {
  if (!value) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "#fff", border: `1.5px solid ${BORDER}`,
      borderRadius: 99, padding: "8px 14px",
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: DARK }}>
        {value}{unit && <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
  );
}

function SoapViewModal({
  consultId,
  patientId,
  patientName,
  onClose,
}: {
  consultId:   string;
  patientId:   string;
  patientName: string;
  onClose:     () => void;
}) {
  const [data,    setData]    = useState<SoapDetail | null>(null);
  const [vitals,  setVitals]  = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [cR, vR] = await Promise.all([
        supabase
          .from("soap_consultations")
          .select("consultation_date, subjective, objective, plan, assessments, icd10_codes, follow_up_date, follow_up_notes")
          .eq("id", consultId)
          .maybeSingle(),
        supabase
          .from("physical_exam_findings")
          .select("blood_pressure_mmhg, heart_rate_bpm, temperature_c, respiratory_rate_cpm, weight_kg, height_cm")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!cancelled) {
        if (cR.error) console.error("SOAP view fetch error:", cR.error);
        setData((cR.data as SoapDetail) ?? null);
        setVitals(vR.data ?? null);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [consultId, patientId]);

  const hasVitals = vitals && (
    vitals.blood_pressure_mmhg || vitals.heart_rate_bpm || vitals.temperature_c ||
    vitals.respiratory_rate_cpm || vitals.weight_kg || vitals.height_cm
  );

  const assessmentList = data?.assessments && data.assessments.length ? data.assessments : null;
  const soapValues: Record<string, string> = {
    s: data?.subjective ?? "",
    o: data?.objective ?? "",
    a: assessmentList ? assessmentList.join(", ") : "",
    p: data?.plan ?? "",
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.modalLg}`}
        onClick={e => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", maxHeight: "88vh", overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #15803d 55%, ${G} 100%)`,
          padding: "16px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "'Nunito', sans-serif" }}>
              {patientName}
            </h2>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
              SOAP Consultation — {data?.consultation_date
                ? new Date(data.consultation_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
                : "—"}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 22px", background: "#fafafa" }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 0", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", border: `4px solid ${BORDER}`, borderTopColor: G, animation: "spin .8s linear infinite" }} />
              <div style={{ fontSize: 12, color: "#6b7280" }}>Loading…</div>
            </div>
          )}

          {!loading && !data && (
            <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>
              Walang nahanap na record.
            </p>
          )}

          {!loading && data && (
            <>
              {hasVitals && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                    Vitals
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <VitalPill icon="❤️" label="BP"   value={vitals.blood_pressure_mmhg} unit="mmHg" />
                    <VitalPill icon="💗" label="HR"   value={vitals.heart_rate_bpm}       unit="bpm" />
                    <VitalPill icon="🌡️" label="Temp" value={vitals.temperature_c}        unit="°C" />
                    <VitalPill icon="🫁" label="RR"   value={vitals.respiratory_rate_cpm} unit="cpm" />
                    <VitalPill icon="⚖️" label="Wt"   value={vitals.weight_kg}            unit="kg" />
                    <VitalPill icon="📏" label="Ht"   value={vitals.height_cm}            unit="cm" />
                  </div>
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 8 }}>
                SOAP Notes
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                {SOAP_CFG.map(({ key, label, icon, bg, border, color, tag }) => (
                  <div
                    key={key}
                    style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, overflow: "hidden" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}>
                      <span style={{ background: tag, color, borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                        {icon} {label.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ padding: "0 14px 12px", fontSize: 13, color: "#111827", whiteSpace: "pre-wrap" }}>
                      {soapValues[key] || <span style={{ color: "#9ca3af" }}>—</span>}
                    </div>
                  </div>
                ))}
              </div>

              {data.icd10_codes && data.icd10_codes.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 6 }}>
                    ICD-10 Codes
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.icd10_codes.map(code => (
                      <span key={code} style={{ background: LIGHT, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 99, padding: "3px 12px", fontSize: 11, fontWeight: 700, fontFamily: "'Nunito', sans-serif"}}>
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.follow_up_date && (
                <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 12, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#78350f", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 4 }}>
                    📅 Follow-up
                  </div>
                  <div style={{ fontSize: 13, color: "#78350f" }}>
                    {new Date(data.follow_up_date).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                    {data.follow_up_notes ? ` — ${data.follow_up_notes}` : ""}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "flex-end", background: "#fff", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 22px", borderRadius: 99, border: "1.5px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}