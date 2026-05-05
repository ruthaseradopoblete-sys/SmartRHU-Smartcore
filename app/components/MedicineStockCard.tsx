"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../styles/dashboard.module.css";

type Filter = "all" | "highest" | "medium" | "lowest";

interface Medicine {
  id: string;
  med_name: string;
  med_dosage: string;
  med_type: string;
  quantity: number;
  exp_date: string;
  unit: string;
  archived: boolean;
}

const HIGH_MIN   = 60;
const MEDIUM_MIN = 30;

function getLevel(qty: number): "highest" | "medium" | "lowest" {
  if (qty >= HIGH_MIN)   return "highest";
  if (qty >= MEDIUM_MIN) return "medium";
  return "lowest";
}

function levelColor(level: string) {
  if (level === "highest") return "#1d7a3f";
  if (level === "medium")  return "#f59e0b";
  return "#ef4444";
}

function levelBg(level: string) {
  if (level === "highest") return "rgba(29,122,63,.1)";
  if (level === "medium")  return "rgba(245,158,11,.1)";
  return "rgba(239,68,68,.1)";
}

export default function MedicineStockCard() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<Filter>("all");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchMedicines(); }, []);

  async function fetchMedicines() {
    setLoading(true);
    const { data, error } = await supabase
      .from("pharma_medicines")
      .select("id, med_name, med_dosage, med_type, quantity, exp_date, unit, archived")
      .eq("archived", false)
      .order("quantity", { ascending: false }); // highest first, like disease prediction

    if (!error && data) setMedicines(data);
    setLoading(false);
  }

  const maxQty = Math.max(...medicines.map(m => m.quantity), 1);

  const filtered = filter === "all"
    ? medicines
    : medicines.filter(m => getLevel(m.quantity) === filter);

  const counts = {
    highest: medicines.filter(m => getLevel(m.quantity) === "highest").length,
    medium:  medicines.filter(m => getLevel(m.quantity) === "medium").length,
    lowest:  medicines.filter(m => getLevel(m.quantity) === "lowest").length,
  };

  const FILTERS: { key: Filter; label: string; bg: string; color: string; count: number }[] = [
    { key: "all",     label: "All",     bg: "#0d3b1f", color: "#fff", count: medicines.length },
    { key: "highest", label: "Highest", bg: "#1d7a3f", color: "#fff", count: counts.highest },
    { key: "medium",  label: "Medium",  bg: "#f59e0b", color: "#fff", count: counts.medium },
    { key: "lowest",  label: "Lowest",  bg: "#ef4444", color: "#fff", count: counts.lowest },
  ];

  // Assign a consistent color per medicine (cycles through disease-prediction palette)
  const PALETTE = ["#ef4444","#f97316","#f59e0b","#22c55e","#3b82f6","#8b5cf6","#ec4899","#06b6d4","#84cc16","#1d7a3f"];

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>MEDICINE STOCK LEVELS</div>
        <div className={styles.cardBody}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: 12 }}>
              Loading medicines…
            </div>
          ) : (
            <>
              {/* ── Month label (mirrors "Month — May" in Disease Prediction) ── */}
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
                Stock — All Medicines
              </div>

              {/* ── Bar rows (Disease Prediction style) ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.slice(0, 6).map((m, i) => {
                  const level = getLevel(m.quantity);
                  const pct   = Math.round((m.quantity / maxQty) * 100);
                  const dot   = levelColor(level); // color by stock level, like disease colors
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Colored dot */}
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: dot, flexShrink: 0,
                      }} />

                      {/* Medicine name */}
                      <span style={{
                        width: 130, fontSize: 13, color: "#374151",
                        fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {m.med_name}
                      </span>

                      {/* Progress bar track */}
                      <div style={{
                        flex: 1, height: 8, background: "#e5e7eb",
                        borderRadius: 99, overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: dot, borderRadius: 99,
                          transition: "width .4s",
                        }} />
                      </div>

                      {/* Quantity */}
                      <span style={{
                        width: 38, textAlign: "right",
                        fontSize: 13, fontWeight: 700,
                        color: dot, fontFamily: "'DM Sans', sans-serif",
                        flexShrink: 0,
                      }}>
                        {m.quantity}
                      </span>
                    </div>
                  );
                })}

                {filtered.length > 6 && (
                  <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 2 }}>
                    +{filtered.length - 6} more · click a filter to see all
                  </div>
                )}
                {filtered.length === 0 && (
                  <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
                    No medicines in this category.
                  </div>
                )}
              </div>

              {/* ── Filter pills ── */}
              <div className={styles.stockLegend} style={{ marginTop: 18 }}>
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setFilter(f.key); if (f.key !== "all") setShowModal(true); }}
                    style={{
                      background:   filter === f.key ? f.bg : "transparent",
                      color:        filter === f.key ? f.color : f.key === "all" ? "#0d3b1f" : f.bg,
                      border:       `1.5px solid ${f.key === "all" ? "#0d3b1f" : f.bg}`,
                      borderRadius: 20,
                      padding:      "4px 12px",
                      fontSize:     11,
                      fontWeight:   700,
                      cursor:       "pointer",
                      fontFamily:   "'DM Sans', sans-serif",
                      transition:   "all .15s",
                      display:      "flex",
                      alignItems:   "center",
                      gap:          4,
                    }}
                  >
                    {f.label}
                    <span style={{
                      background:   filter === f.key ? "rgba(255,255,255,.25)" : (f.key === "all" ? "rgba(13,59,31,.1)" : levelBg(f.key)),
                      borderRadius: 10,
                      padding:      "0 5px",
                      fontSize:     10,
                    }}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Filter Modal (unchanged) ── */}
      {showModal && filter !== "all" && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => { setShowModal(false); setFilter("all"); }}
        >
          <div
            style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,.28)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ background: `linear-gradient(90deg,#0d3b1f,${levelColor(filter)})`, padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: "rgba(255,255,255,.7)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Medicine Stock</div>
                <div style={{ color: "#fff", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, marginTop: 2 }}>
                  {filter === "highest" ? "🟢 High Stock" : filter === "medium" ? "🟡 Medium Stock" : "🔴 Low Stock"}
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, opacity: .8 }}>({counts[filter]} medicines)</span>
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); setFilter("all"); }}
                style={{ border: "none", background: "rgba(255,255,255,.2)", color: "#fff", width: 28, height: 28, borderRadius: 7, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >✕</button>
            </div>

            {/* Medicine list */}
            <div style={{ overflowY: "auto", padding: "12px 0" }}>
              {medicines.filter(m => getLevel(m.quantity) === filter).length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#9ca3af", fontSize: 13 }}>No medicines in this category.</div>
              ) : (
                medicines.filter(m => getLevel(m.quantity) === filter).map(m => {
                  const level     = getLevel(m.quantity);
                  const pct       = Math.round((m.quantity / maxQty) * 100);
                  const isExpired = m.exp_date && new Date(m.exp_date) < new Date();
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 22px", borderBottom: "1px solid rgba(22,163,74,.08)" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: levelColor(level), flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0a2912", display: "flex", alignItems: "center", gap: 6 }}>
                          {m.med_name}
                          {isExpired && <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 6 }}>EXPIRED</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                          {m.med_dosage}{m.med_type ? ` · ${m.med_type}` : ""}
                          {m.exp_date ? ` · Exp: ${m.exp_date}` : ""}
                        </div>
                        <div style={{ marginTop: 5, height: 5, background: "rgba(22,163,74,.1)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: levelColor(level), borderRadius: 3, transition: "width .4s" }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: levelColor(level), fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>{m.quantity}</div>
                        <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".06em" }}>{m.unit}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 22px", borderTop: "1px solid rgba(22,163,74,.1)", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowModal(false); setFilter("all"); }}
                style={{ background: "#0d3b1f", color: "#fff", border: "none", borderRadius: 20, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}