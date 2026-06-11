"use client";
import { CSSProperties, useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";
import Donut from "../Donut";

const DONUT_COLORS = ["#7c6fcd","#b0d98a","#f0c040","#90d8f0","#f28b6e","#a8d8ea"];

type DispenseEntry = { med_name: string; quantity: number; dispensed_at: string };

type Props = {
  medicines: Medicine[];
  totalCount: number;
  onSendRequest: () => void;
  onOpenPrescriptions: () => void;
  onViewRequests: () => void;
};

async function exportToExcel(rows: Medicine[]) {
  const XLSX = await import("xlsx");
  const data = rows.map((m, i) => ({
    "No.": i + 1, "Medicine Name": m.med_name, "Dosage": m.med_dosage,
    "Type": m.med_type, "Unit": m.unit, "Qty": m.quantity, "EXP Date": m.exp_date,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Medicine Stock");
  XLSX.writeFile(wb, `medicine_stock_${new Date().toISOString().split("T")[0]}.xlsx`);
}

async function exportToPDF(rows: Medicine[]) {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Medicine Stock Report", 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-PH")}`, 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [["#", "Medicine Name", "Dosage", "Type", "Unit", "Qty", "EXP Date"]],
    body: rows.map((m, i) => [i + 1, m.med_name, m.med_dosage, m.med_type, m.unit, m.quantity, m.exp_date]),
    styles: { fontSize: 9 }, headStyles: { fillColor: [26, 94, 53] },
  });
  doc.save(`medicine_stock_${new Date().toISOString().split("T")[0]}.pdf`);
}

function MiniLineChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const W = 500, H = 80, pad = 14;
  const max = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2),
    y: H - pad - (d.value / max) * (H - pad * 2),
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = [
    `M${pts[0]?.x},${H - pad}`,
    ...pts.map(p => `L${p.x},${p.y}`),
    `L${pts[pts.length - 1]?.x},${H - pad}`,
    "Z",
  ].join(" ");

  return (
    <div style={{ width: "100%" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="lineGradFull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((v, i) => (
          <line
            key={i}
            x1={pad} y1={H - pad - v * (H - pad * 2)}
            x2={W - pad} y2={H - pad - v * (H - pad * 2)}
            stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="4 4"
          />
        ))}
        <path d={area} fill="url(#lineGradFull)" />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} fill={color} stroke="#fff" strokeWidth={2} />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fill={color} fontWeight="700">
              {data[i].value > 0 ? data[i].value : ""}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, padding: `0 ${pad}px` }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ medicines, totalCount, onSendRequest, onOpenPrescriptions, onViewRequests }: Props) {
  const { t } = useTheme();
  const [dispenseData, setDispenseData] = useState<DispenseEntry[]>([]);
  const [allDispense,  setAllDispense]  = useState<DispenseEntry[]>([]);

  const now     = new Date();
  const dateStr = `Day, ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

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
  }, []);

  // ── Today's dispense total ───────────────────────────────────────────────────
  const todayStr = now.toISOString().split("T")[0];
  const totalDispensedToday = allDispense
    .filter(r => r.dispensed_at.startsWith(todayStr))
    .reduce((s, r) => s + r.quantity, 0);

  // ── Donut segments ───────────────────────────────────────────────────────────
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

  // ── Monthly trend ────────────────────────────────────────────────────────────
  const monthlyTrend = (() => {
    const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      const value = allDispense
        .filter(r => {
          const rd = new Date(r.dispensed_at);
          return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
        })
        .reduce((s, r) => s + r.quantity, 0);
      months.push({ label, value });
    }
    return months;
  })();

  // ── Stock level counts ───────────────────────────────────────────────────────
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Title + buttons ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, marginBottom: 2 }}>Pharmacist</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: t.text, lineHeight: 1 }}>Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSendRequest} style={{
            background: t.green, color: "#fff", border: "none",
            borderRadius: 22, padding: "9px 22px", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit", boxShadow: `0 3px 12px ${t.green}55`,
          }}>Send Request</button>
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
            fontSize: 34, color: "#fff", fontWeight: 200,
          }}>💊</div>
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
            fontSize: 30, color: "#fff",
          }}>📦</div>
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
                    { label: "High",   count: highest, c: "#2db357", hint: "≥ 50" },
                    { label: "Medium", count: medium,  c: "#d4b800", hint: "10–49" },
                    { label: "Low",    count: lowest,  c: "#d94040", hint: "< 10" },
                  ].map(b => (
                    <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: b.c, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11.5, color: t.text2, fontWeight: 600 }}>{b.label}</span>
                      <span style={{ fontSize: 11, color: t.text3 }}>{b.hint}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: t.text, minWidth: 22, textAlign: "right" }}>{b.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Monthly Trend + Dispense Donut side by side ── */}
      <div style={{ display: "flex", gap: 14 }}>

        {/* Monthly Trend — shorter, takes more width */}
        <div style={{ flex: 2, ...cardStyle }}>
          <div style={{ ...cardHeader("#2596be"), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>📈 MONTHLY DISPENSE TREND</span>
            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>
              6-month total: {allDispense.reduce((s, r) => s + r.quantity, 0)} dispensed
            </span>
          </div>
          <div style={{ padding: "14px 20px", flex: 1 }}>
            {allDispense.length === 0 ? (
              <div style={emptyMsg}>No trend data available</div>
            ) : (
              <MiniLineChart data={monthlyTrend} color="#2596be" />
            )}
          </div>
        </div>

        {/* Dispense Medicine Monthly — beside the trend */}
        <div style={{
          flex: 1,
          background: t.dispenseCard,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
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