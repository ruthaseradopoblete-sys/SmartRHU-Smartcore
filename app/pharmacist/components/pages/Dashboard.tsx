"use client";
import { CSSProperties, useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";
import Donut from "../Donut";

const DONUT_COLORS = ["#7c6fcd","#b0d98a","#f0c040","#90d8f0","#f28b6e","#a8d8ea"];

type DispenseEntry = { med_name: string; quantity: number; dispensed_at: string };

type Props = {
  medicines:           Medicine[];
  totalCount:          number;
  onSendRequest:       (type: "drugs" | "supplies") => void;
  onOpenPrescriptions: () => void;
  onViewRequests:      () => void;
};

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const PillIcon = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="9" width="20" height="6" rx="3" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="12" y1="9" x2="12" y2="15" stroke={color} strokeWidth="2"/>
    <rect x="2" y="9" width="10" height="6" rx="3" fill={color} opacity="0.25"/>
  </svg>
);
const BoxIcon = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M21 8L12 3 3 8v8l9 5 9-5V8z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M3 8l9 5 9-5" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    <line x1="12" y1="13" x2="12" y2="21" stroke={color} strokeWidth="2"/>
  </svg>
);
const DrugIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="9" width="20" height="6" rx="3"/>
    <line x1="12" y1="9" x2="12" y2="15"/>
  </svg>
);
const SupplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const CalendarIcon = ({ color = "currentColor" }: { color?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </svg>
);
const WarningIcon = ({ color = "currentColor" }: { color?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function Dashboard({ medicines, totalCount, onSendRequest, onOpenPrescriptions, onViewRequests }: Props) {
  const { t } = useTheme();
  const [dispenseData,    setDispenseData]    = useState<DispenseEntry[]>([]);
  const [allDispense,     setAllDispense]     = useState<DispenseEntry[]>([]);
  const [showRequestMenu, setShowRequestMenu] = useState(false);

  const now     = new Date();
  const dateStr = `Day, ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

  // Close dropdown on outside click
  useEffect(() => {
    if (!showRequestMenu) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-request-menu]")) setShowRequestMenu(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [showRequestMenu]);

  useEffect(() => {
    async function fetchDispense() {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const { data, error } = await supabase
        .from("pharma_dispense").select("med_name, quantity, dispensed_at")
        .gte("dispensed_at", start).lt("dispensed_at", end);
      if (!error && data) setDispenseData(data as DispenseEntry[]);
    }
    fetchDispense();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function fetchAllDispense() {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
      const { data, error } = await supabase
        .from("pharma_dispense").select("med_name, quantity, dispensed_at")
        .gte("dispensed_at", start);
      if (!error && data) setAllDispense(data as DispenseEntry[]);
    }
    fetchAllDispense();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayStr = now.toISOString().split("T")[0];
  const totalDispensedToday = allDispense
    .filter(r => r.dispensed_at.startsWith(todayStr))
    .reduce((s, r) => s + r.quantity, 0);

  // ── Expiring medicines ────────────────────────────────────────────────────────
  const expiringMeds = medicines
    .filter(m => !m.archived)
    .map(m => {
      const exp  = new Date(m.exp_date);
      exp.setHours(0, 0, 0, 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const days  = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...m, daysLeft: days };
    })
    .filter(m => m.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // ── Donut data ────────────────────────────────────────────────────────────────
  const dispenseSegs = (() => {
    if (dispenseData.length === 0) return [];
    const totals: Record<string, number> = {};
    for (const row of dispenseData) totals[row.med_name] = (totals[row.med_name] ?? 0) + row.quantity;
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top    = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    const result = top.map(([, v], i) => ({ v, c: DONUT_COLORS[i] }));
    if (others > 0) result.push({ v: others, c: "#ccc" });
    return result;
  })();

  const dispenseLegend = (() => {
    if (dispenseData.length === 0) return [];
    const totals: Record<string, number> = {};
    for (const row of dispenseData) totals[row.med_name] = (totals[row.med_name] ?? 0) + row.quantity;
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top    = sorted.slice(0, 5).map(([name, qty], i) => ({ name, qty, color: DONUT_COLORS[i] }));
    const othersQty = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    if (othersQty > 0) top.push({ name: "Others", qty: othersQty, color: "#ccc" });
    return top;
  })();

  const totalDispensed = dispenseData.reduce((s, r) => s + r.quantity, 0);

  const active  = medicines.filter(m => !m.archived);
  const highest = active.filter(m => m.quantity >= 50).length;
  const medium  = active.filter(m => m.quantity >= 10 && m.quantity < 50).length;
  const lowest  = active.filter(m => m.quantity < 10).length;
  const stockSegs = [
    { v: highest || 0.001, c: "#2db357" },
    { v: medium  || 0.001, c: "#d4b800" },
    { v: lowest  || 0.001, c: "#d94040" },
  ];

  const cardStyle: CSSProperties = {
    background: t.cardBg, borderRadius: 12, border: `1px solid ${t.cardBorder}`,
    overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    display: "flex", flexDirection: "column",
  };
  const cardHeader = (bg: string): CSSProperties => ({
    background: bg, color: "#fff", fontSize: 11, fontWeight: 800,
    letterSpacing: "0.07em", padding: "9px 14px", flexShrink: 0,
  });
  const emptyMsg: CSSProperties = {
    textAlign: "center", color: t.text3, fontSize: 11,
    padding: "20px 0", fontStyle: "italic",
  };

  // Expiry urgency helpers
  const expiryColor = (days: number) => {
    if (days < 0)  return "#dc2626";
    if (days <= 7) return "#dc2626";
    if (days <= 14)return "#ea580c";
    return "#d97706";
  };
  const expiryBg = (days: number) => {
    if (days < 0)  return "#fef2f2";
    if (days <= 7) return "#fef2f2";
    if (days <= 14)return "#fff7ed";
    return "#fffbeb";
  };
  const expiryLabel = (days: number) => {
    if (days < 0)  return `Expired ${Math.abs(days)}d ago`;
    if (days === 0)return "Expires today!";
    if (days === 1)return "Expires tomorrow";
    return `${days} days left`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Title + buttons ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, marginBottom: 2 }}>Pharmacist</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: t.text, lineHeight: 1 }}>Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

          {/* ── Send Request dropdown ── */}
          <div style={{ position: "relative" }} data-request-menu>
            <button
              onClick={() => setShowRequestMenu(v => !v)}
              style={{
                background: t.green, color: "#fff", border: "none",
                borderRadius: 22, padding: "9px 22px", fontWeight: 700, fontSize: 13,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: `0 3px 12px ${t.green}55`,
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              Send Request <ChevronDown />
            </button>

            {showRequestMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0,
                background: t.notifBg ?? "#fff", borderRadius: 12,
                boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                border: `1px solid ${t.notifBorder ?? "#e5e7eb"}`,
                overflow: "hidden", zIndex: 200, minWidth: 210,
              }}>
                {([
                  { label: "Medicine Drugs",    type: "drugs"    as const, Icon: DrugIcon,   desc: "Tablets, capsules, syrup…"  },
                  { label: "Medicine Supplies", type: "supplies" as const, Icon: SupplyIcon, desc: "Gauze, gloves, tape…"        },
                ] as const).map((opt, i, arr) => (
                  <button key={opt.type}
                    onClick={() => { onSendRequest(opt.type); setShowRequestMenu(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 16px", border: "none", cursor: "pointer",
                      fontFamily: "inherit", background: "transparent",
                      borderBottom: i < arr.length - 1 ? `1px solid ${t.notifBorder ?? "#f3f4f6"}` : "none",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${t.green}12`)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: 8, background: `${t.green}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: t.green, flexShrink: 0,
                    }}>
                      <opt.Icon />
                    </span>
                    <span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.notifText ?? "#1f2937" }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{opt.desc}</div>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={onViewRequests} style={{
            background: "transparent", color: t.green, border: `2px solid ${t.green}`,
            borderRadius: 22, padding: "9px 22px", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>View Requests</button>

          <button onClick={onOpenPrescriptions} style={{
            background: "transparent", color: t.green, border: `2px solid ${t.green}`,
            borderRadius: 22, padding: "9px 22px", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>Prescriptions</button>
        </div>
      </div>

      {/* ── Row 1: Total Medicine · Today Dispense · Stock Levels ── */}
      <div style={{ display: "flex", gap: 14 }}>

        {/* Total Medicine */}
        <div style={{
          flex: 1,
          background: `linear-gradient(135deg,${t.green} 0%,${t.greenLight} 100%)`,
          borderRadius: 16, padding: "20px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: `0 4px 18px ${t.green}44`,
        }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600, letterSpacing: "0.04em" }}>Total Medicine</div>
            <div style={{ fontSize: 58, fontWeight: 900, color: "#fff", lineHeight: 1, margin: "2px 0 4px" }}>{totalCount}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{dateStr}</div>
          </div>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            border: "2.5px solid rgba(255,255,255,0.45)",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PillIcon size={30} color="#fff" />
          </div>
        </div>

        {/* Total Dispensed Today */}
        <div style={{
          flex: 1,
          background: "linear-gradient(135deg,#2596be 0%,#5bbcda 100%)",
          borderRadius: 16, padding: "20px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 4px 18px rgba(37,150,190,0.35)",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600, letterSpacing: "0.04em" }}>Total Dispensed Today</div>
            <div style={{ fontSize: 58, fontWeight: 900, color: "#fff", lineHeight: 1, margin: "2px 0 4px" }}>{totalDispensedToday}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>medicines out today</div>
          </div>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            border: "2.5px solid rgba(255,255,255,0.45)",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BoxIcon size={28} color="#fff" />
          </div>
        </div>

        {/* Stock Levels */}
        <div style={{ flex: 1, ...cardStyle }}>
          <div style={cardHeader(t.green)}>STOCK LEVELS</div>
          <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {active.length === 0 ? (
              <div style={emptyMsg}>No medicines yet</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Donut segments={stockSegs} size={100} thick={24} label={`${active.length}`} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
                  {[
                    { label: "High",   count: highest, c: "#2db357" },
                    { label: "Medium", count: medium,  c: "#d4b800" },
                    { label: "Low",    count: lowest,  c: "#d94040" },
                  ].map(b => (
                    <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: b.c, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11.5, color: t.text2, fontWeight: 600 }}>{b.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: t.text, minWidth: 22, textAlign: "right" }}>{b.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Expiring Soon + Dispense Donut ── */}
      <div style={{ display: "flex", gap: 14 }}>

        {/* ── Expiring Soon ── */}
        <div style={{ flex: 2, ...cardStyle }}>
          {/* Header */}
          <div style={{
            background: "#dc2626", padding: "9px 14px", flexShrink: 0,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{
              color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: "0.07em",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <CalendarIcon color="#fff" />
              EXPIRING SOON (WITHIN 30 DAYS)
            </span>
            {expiringMeds.length > 0 && (
              <span style={{
                background: "rgba(255,255,255,0.25)", color: "#fff",
                borderRadius: 20, padding: "1px 10px", fontSize: 11, fontWeight: 700,
              }}>
                {expiringMeds.length} item{expiringMeds.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 240 }}>
            {expiringMeds.length === 0 ? (
              <div style={{ ...emptyMsg, padding: "28px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span style={{ color: t.text3, fontSize: 12 }}>No medicines expiring soon</span>
              </div>
            ) : (
              expiringMeds.map((med, i) => {
                const color = expiryColor(med.daysLeft);
                const bg    = expiryBg(med.daysLeft);
                return (
                  <div key={med.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px",
                    borderBottom: i < expiringMeds.length - 1 ? `1px solid ${t.tableRowBorder}` : "none",
                    background: i % 2 === 0 ? t.tableRow : t.surface2,
                  }}>
                    {/* Urgency dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: color, flexShrink: 0,
                    }} />

                    {/* Medicine info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: 700, color: t.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {med.med_name}
                      </div>
                      <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>
                        {med.med_dosage} · {med.med_type} · {med.unit}
                      </div>
                    </div>

                    {/* EXP date */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: t.text3, marginBottom: 2 }}>
                        {new Date(med.exp_date).toLocaleDateString("en-PH", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </div>
                      <span style={{
                        background: bg, color,
                        borderRadius: 20, padding: "2px 8px",
                        fontSize: 10, fontWeight: 800, whiteSpace: "nowrap",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <WarningIcon color={color} />
                        {expiryLabel(med.daysLeft)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Dispense Medicine Monthly */}
        <div style={{
          flex: 1, background: t.dispenseCard,
          border: `1px solid ${t.border}`, borderRadius: 12,
          overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={cardHeader("#7c6fcd")}>DISPENSE MEDICINE (MONTHLY)</div>
          <div style={{ padding: "14px 16px", flex: 1 }}>
            {dispenseSegs.length === 0 ? (
              <div style={emptyMsg}>No dispense records this month</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Donut segments={dispenseSegs} size={90} thick={20} label={String(totalDispensed)} />
                <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
                  {dispenseLegend.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: t.text2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.text, flexShrink: 0 }}>{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}