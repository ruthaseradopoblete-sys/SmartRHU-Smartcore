// Dashboard.tsx — Full updated file
"use client";
import { CSSProperties, useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";
import Donut from "../Donut";

const DONUT_COLORS = ["#7c6fcd","#b0d98a","#f0c040","#90d8f0","#f28b6e","#a8d8ea"];

type DispenseEntry = { med_name: string; quantity: number; dispensed_at: string };

type RxRow = {
  id:                string;
  patient_name:      string;
  patient_age:       number | null;
  patient_sex:       string | null;
  patient_address:   string | null;
  medicine:          string;
  dosage:            string | null;
  frequency:         string | null;
  quantity:          string | null;
  status:            "draft" | "sent" | "dispensed" | "cancelled" | string | null;
  prescription_date: string;
};

type Props = {
  medicines:           Medicine[];
  totalCount:          number;
  onSendRequest:       (type: "drugs" | "supplies") => void;
  onOpenPrescriptions: () => void;
  onViewRequests:      () => void;
  onStockChanged?:     () => void;
};

type RxFilter = "all" | "sent" | "dispensed" | "cancelled";

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
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </svg>
);
const WarningIcon = ({ color = "currentColor" }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const RxIcon = ({ size = 13, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

// ── Helper: build a patient address string from parts ─────────────────────────
function buildAddress(p: any): string | null {
  const parts = [p?.purok, p?.barangay, p?.municipality].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ── Helper: map a patient row to demographics ─────────────────────────────────
function mapPatientRow(row: any): { name: string; age: number | null; sex: string | null; address: string | null } {
  const p = row.patients;
  const fullName = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "Unknown";
  return {
    name:    fullName || "Unknown",
    age:     p?.age    ?? null,
    sex:     p?.sex    ? String(p.sex).trim() : null,
    address: buildAddress(p),
  };
}

// ── Helper: normalize a medicine name for fuzzy matching ──────────────────────
function normalizeName(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// ── Helper: rank pharma_medicines candidates against a prescription's free-text name ──
function rankCandidates(rxMedicineName: string, pool: Medicine[]): Medicine[] {
  const target = normalizeName(rxMedicineName);
  const targetWords = new Set(target.split(" ").filter(Boolean));
  const scored = pool.map(m => {
    const name = normalizeName(m.med_name);
    let score = 0;
    if (name === target) score += 100;
    if (name.includes(target) || target.includes(name)) score += 40;
    const words = name.split(" ").filter(Boolean);
    const overlap = words.filter(w => targetWords.has(w)).length;
    score += overlap * 5;
    return { m, score };
  });
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.m);
}

// ── Helper: parse a usable integer quantity out of free-text prescription quantity ──
function parseRxQuantity(raw: string | null): number {
  if (!raw) return 1;
  const match = raw.match(/\d+/);
  if (!match) return 1;
  const n = parseInt(match[0], 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// ── Helper: check if a medicine is expired ────────────────────────────────────
function isMedicineExpired(med: Medicine): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(med.exp_date);
  exp.setHours(0, 0, 0, 0);
  return exp < today;
}

export default function Dashboard({ medicines, totalCount, onSendRequest, onOpenPrescriptions, onViewRequests, onStockChanged }: Props) {
  const { t } = useTheme();
  const [dispenseData,    setDispenseData]    = useState<DispenseEntry[]>([]);
  const [allDispense,     setAllDispense]     = useState<DispenseEntry[]>([]);
  const [showRequestMenu, setShowRequestMenu] = useState(false);
  const [rxRows,          setRxRows]          = useState<RxRow[]>([]);
  const [rxLoading,       setRxLoading]       = useState(true);
  const [rxFilter,        setRxFilter]        = useState<RxFilter>("sent");
  const [rxExpanded,      setRxExpanded]      = useState<Set<string>>(new Set());
  const [viewRx,          setViewRx]          = useState<RxRow | null>(null);
  const [rxUpdating,      setRxUpdating]      = useState(false);
  const [pendingSlipId,   setPendingSlipId]   = useState<string | null>(null);
  const [confirmAction,   setConfirmAction]   = useState<"dispensed" | "cancelled" | null>(null);
  // ── NEW: dispense error state ─────────────────────────────────────────────
  const [dispenseError,   setDispenseError]   = useState<string | null>(null);

  const now     = new Date();
  const dateStr = `Day, ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

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
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      if (id) setPendingSlipId(String(id));
    };
    window.addEventListener("openPrescriptionSlip", handler);
    return () => window.removeEventListener("openPrescriptionSlip", handler);
  }, []);

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

  // ── Fetch prescriptions ───────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchRx() {
      setRxLoading(true);
      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select(`
            id,
            prescription_date,
            medicine,
            dosage,
            frequency,
            quantity,
            status,
            patients (
              first_name,
              last_name,
              age,
              sex,
              purok,
              barangay,
              municipality
            )
          `)
          .order("created_at", { ascending: false })
          .limit(30);
        if (error) throw error;
        const mapped: RxRow[] = (data ?? []).map((row: any) => {
          const { name, age, sex, address } = mapPatientRow(row);
          return {
            id:               row.id,
            patient_name:     name,
            patient_age:      age,
            patient_sex:      sex,
            patient_address:  address,
            medicine:         row.medicine,
            dosage:           row.dosage    ?? null,
            frequency:        row.frequency ?? null,
            quantity:         row.quantity  ?? null,
            status:           row.status,
            prescription_date: row.prescription_date,
          };
        });
        setRxRows(mapped);
      } catch {
        setRxRows([]);
      } finally {
        setRxLoading(false);
      }
    }
    fetchRx();
  }, []);

  // ── Resolve a pending slip (from Topbar notification click) ──────────────────
  useEffect(() => {
    if (!pendingSlipId || rxLoading) return;
    const match = rxRows.find(r => r.id === pendingSlipId);
    if (match) {
      setRxExpanded(prev => new Set(prev).add(match.patient_name));
      setViewRx(match);
      setPendingSlipId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select(`
            id,
            prescription_date,
            medicine,
            dosage,
            frequency,
            quantity,
            status,
            patients (
              first_name,
              last_name,
              age,
              sex,
              purok,
              barangay,
              municipality
            )
          `)
          .eq("id", pendingSlipId)
          .maybeSingle();
        if (error || !data || cancelled) return;
        const { name, age, sex, address } = mapPatientRow(data);
        const row: RxRow = {
          id:               (data as any).id,
          patient_name:     name,
          patient_age:      age,
          patient_sex:      sex,
          patient_address:  address,
          medicine:         (data as any).medicine,
          dosage:           (data as any).dosage    ?? null,
          frequency:        (data as any).frequency ?? null,
          quantity:         (data as any).quantity  ?? null,
          status:           (data as any).status,
          prescription_date: (data as any).prescription_date,
        };
        setViewRx(row);
      } finally {
        if (!cancelled) setPendingSlipId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [pendingSlipId, rxLoading, rxRows]);

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

  const rxCounts: Record<RxFilter, number> = {
    all:       rxRows.length,
    sent:      rxRows.filter(r => r.status === "sent").length,
    dispensed: rxRows.filter(r => r.status === "dispensed").length,
    cancelled: rxRows.filter(r => r.status === "cancelled").length,
  };
  const filteredRx = rxRows.filter(r => rxFilter === "all" || r.status === rxFilter);

  type RxGroup = { patient_name: string; rows: RxRow[] };
  const rxGroups: RxGroup[] = (() => {
    const map = new Map<string, RxGroup>();
    for (const rx of filteredRx) {
      if (!map.has(rx.patient_name)) {
        map.set(rx.patient_name, { patient_name: rx.patient_name, rows: [] });
      }
      map.get(rx.patient_name)!.rows.push(rx);
    }
    return Array.from(map.values()).slice(0, 8);
  })();

  const toggleRxGroup = (name: string) => {
    setRxExpanded(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const cardStyle: CSSProperties = {
    background: t.cardBg, borderRadius: 10, border: `1px solid ${t.cardBorder}`,
    overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "flex", flexDirection: "column",
  };
  const cardHeader = (bg: string): CSSProperties => ({
    background: bg, color: "#fff", fontSize: 10.5, fontWeight: 800,
    letterSpacing: "0.06em", padding: "7px 12px", flexShrink: 0,
  });
  const emptyMsg: CSSProperties = {
    textAlign: "center", color: t.text3, fontSize: 11,
    padding: "16px 0", fontStyle: "italic",
  };

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
    return `${days}d left`;
  };

  const rxStatusBadge = (status: string | null) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      sent:      { bg: "#fff8e1", color: "#b8860b", label: "Sent"      },
      dispensed: { bg: "#e8f5e9", color: "#2e7d32", label: "Dispensed" },
      cancelled: { bg: "#fdecea", color: "#c62828", label: "Cancelled" },
    };
    const s = map[status ?? ""] ?? { bg: "#f0f0f0", color: "#888", label: status ?? "—" };
    return (
      <span style={{ background: s.bg, color: s.color, borderRadius: 14,
        padding: "1.5px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
        {s.label}
      </span>
    );
  };

  // ── NEW: pre-validate a prescription before showing confirm dialog ────────────
  const validateDispense = (rx: RxRow): string | null => {
    // Search only active (non-archived), non-expired medicines
    const validPool = medicines.filter(m => {
      if (m.archived) return false;
      if (isMedicineExpired(m)) return false;
      if (m.quantity <= 0) return false;
      return true;
    });

    const bestMatch = rankCandidates(rx.medicine, validPool)[0] ?? null;

    if (!bestMatch) {
      // Try to find the medicine in active stock (ignoring qty/expiry) to give a better error
      const anyMatch = rankCandidates(rx.medicine, medicines.filter(m => !m.archived))[0] ?? null;
      if (anyMatch) {
        if (isMedicineExpired(anyMatch)) {
          return `Cannot dispense — "${anyMatch.med_name}" is expired and has been archived. Please restock with a valid batch.`;
        }
        if (anyMatch.quantity <= 0) {
          return `Cannot dispense — "${anyMatch.med_name}" is out of stock. Please restock before dispensing.`;
        }
      }
      return `Cannot dispense — no matching medicine found in active inventory for "${rx.medicine}".`;
    }

    return null; // all good
  };

  // ── Handle confirm dispense button click — validate first ─────────────────────
  const handleConfirmDispenseClick = () => {
    if (!viewRx) return;
    const error = validateDispense(viewRx);
    if (error) {
      setDispenseError(error);
      return;
    }
    setDispenseError(null);
    setConfirmAction("dispensed");
  };

  // ── Simplified dispense: auto-match best inventory item, parse qty, deduct stock ──
  const handleRxUpdate = async (id: string, status: "dispensed" | "cancelled") => {
    setRxUpdating(true);
    try {
      if (status === "dispensed") {
        const rx = rxRows.find(r => r.id === id) ?? viewRx;
        if (rx) {
          // Only search active, non-expired, in-stock medicines
          const validPool = medicines.filter(m => {
            if (m.archived) return false;
            if (isMedicineExpired(m)) return false;
            if (m.quantity <= 0) return false;
            return true;
          });

          const bestMatch = rankCandidates(rx.medicine, validPool)[0] ?? null;

          // Hard block: if still no valid match, abort
          if (!bestMatch) {
            const anyMatch = rankCandidates(rx.medicine, medicines.filter(m => !m.archived))[0] ?? null;
            let msg = `Cannot dispense — no matching active medicine found for "${rx.medicine}".`;
            if (anyMatch) {
              if (isMedicineExpired(anyMatch)) msg = `Cannot dispense — "${anyMatch.med_name}" is expired.`;
              else if (anyMatch.quantity <= 0)  msg = `Cannot dispense — "${anyMatch.med_name}" is out of stock.`;
            }
            setDispenseError(msg);
            setConfirmAction(null);
            return;
          }

          // Double-check expiry and archived at dispense time (re-fetch safety)
          const { data: freshMed } = await supabase
            .from("pharma_medicines")
            .select("id, quantity, exp_date, archived")
            .eq("id", bestMatch.id)
            .maybeSingle();

          if (!freshMed) {
            setDispenseError("Could not verify medicine status. Please try again.");
            setConfirmAction(null);
            return;
          }
          if (freshMed.archived) {
            setDispenseError(`Cannot dispense — "${bestMatch.med_name}" has been archived.`);
            setConfirmAction(null);
            return;
          }
          const freshExpDate = new Date(freshMed.exp_date);
          freshExpDate.setHours(0, 0, 0, 0);
          const today = new Date(); today.setHours(0, 0, 0, 0);
          if (freshExpDate < today) {
            setDispenseError(`Cannot dispense — "${bestMatch.med_name}" is expired (exp: ${freshMed.exp_date}).`);
            setConfirmAction(null);
            return;
          }
          if (freshMed.quantity <= 0) {
            setDispenseError(`Cannot dispense — "${bestMatch.med_name}" is out of stock.`);
            setConfirmAction(null);
            return;
          }

          const qty       = parseRxQuantity(rx.quantity);
          const available = freshMed.quantity as number;
          const actual    = Math.min(qty, available);
          const remaining = Math.max(0, available - actual);

          if (actual > 0) {
            const { error: dispErr } = await supabase.from("pharma_dispense").insert([{
              medicine_id:  bestMatch.id,
              med_name:     bestMatch.med_name,
              quantity:     actual,
              dispensed_at: new Date().toISOString(),
            }]);
            if (dispErr) throw dispErr;
          }
          const { error: stockErr } = await supabase
            .from("pharma_medicines").update({ quantity: remaining }).eq("id", bestMatch.id);
          if (stockErr) throw stockErr;
          onStockChanged?.();
        }
      }

      const { error } = await supabase.from("prescriptions").update({ status }).eq("id", id);
      if (error) throw error;
      setRxRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      setViewRx(null);
      setConfirmAction(null);
      setDispenseError(null);
    } catch (err) {
      console.error(err);
    } finally {
      setRxUpdating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Title + buttons ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, color: t.text3, fontWeight: 600, marginBottom: 2 }}>Pharmacist</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: t.text, lineHeight: 1 }}>Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

          <div style={{ position: "relative" }} data-request-menu>
            <button
              onClick={() => setShowRequestMenu(v => !v)}
              style={{
                background: t.green, color: "#fff", border: "none",
                borderRadius: 20, padding: "8px 18px", fontWeight: 700, fontSize: 12.5,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: `0 3px 10px ${t.green}55`,
                display: "flex", alignItems: "center", gap: 6,
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
            background: "transparent", color: t.green, border: `1.5px solid ${t.green}`,
            borderRadius: 20, padding: "8px 18px", fontWeight: 700, fontSize: 12.5,
            cursor: "pointer", fontFamily: "inherit",
          }}>View Requests</button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>

        {/* ── Left column ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Stat cards row */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{
              flex: 1,
              background: `linear-gradient(135deg,${t.green} 0%,${t.greenLight} 100%)`,
              borderRadius: 12, padding: "14px 18px",
              display: "flex", flexDirection: "column", justifyContent: "center",
              boxShadow: `0 3px 12px ${t.green}40`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>Total Medicine</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1, margin: "2px 0 2px" }}>{totalCount}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>{dateStr}</div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.45)",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <PillIcon size={17} color="#fff" />
                </div>
              </div>
            </div>

            <div style={{
              flex: 1,
              background: "linear-gradient(135deg,#2596be 0%,#5bbcda 100%)",
              borderRadius: 12, padding: "14px 18px",
              display: "flex", flexDirection: "column", justifyContent: "center",
              boxShadow: "0 3px 12px rgba(37,150,190,0.3)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>Dispensed Today</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1, margin: "2px 0 2px" }}>{totalDispensedToday}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>medicines out today</div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.45)",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <BoxIcon size={16} color="#fff" />
                </div>
              </div>
            </div>
          </div>

          {/* Stock Levels + Dispense Monthly */}
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            <div style={{ ...cardStyle, flex: 1, minWidth: 0 }}>
              <div style={cardHeader(t.green)}>STOCK LEVELS</div>
              <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                {active.length === 0 ? (
                  <div style={emptyMsg}>No medicines yet</div>
                ) : (
                  <>
                    <Donut segments={stockSegs} size={104} thick={18} label={`${active.length}`} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                      {[
                        { label: "High",   count: highest, c: "#2db357" },
                        { label: "Medium", count: medium,  c: "#d4b800" },
                        { label: "Low",    count: lowest,  c: "#d94040" },
                      ].map(b => (
                        <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.c, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: t.text2, fontWeight: 600, minWidth: 52 }}>{b.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: t.text, minWidth: 22, textAlign: "right" }}>{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{
              background: t.dispenseCard,
              border: `1px solid ${t.border}`, borderRadius: 10,
              overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column",
              flex: 1, minWidth: 0,
            }}>
              <div style={cardHeader("#7c6fcd")}>DISPENSE (MONTHLY)</div>
              <div style={{ padding: "10px 14px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {dispenseSegs.length === 0 ? (
                  <div style={emptyMsg}>No dispense records this month</div>
                ) : (
                  <>
                    <Donut segments={dispenseSegs} size={88} thick={16} label={String(totalDispensed)} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
                      {dispenseLegend.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 10.5, color: t.text2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: t.text, flexShrink: 0 }}>{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Expiring Soon */}
          <div style={cardStyle}>
            <div style={{
              background: "#dc2626", padding: "7px 12px", flexShrink: 0,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{
                color: "#fff", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <CalendarIcon color="#fff" />
                EXPIRING SOON (30 DAYS)
              </span>
              {expiringMeds.length > 0 && (
                <span style={{
                  background: "rgba(255,255,255,0.25)", color: "#fff",
                  borderRadius: 16, padding: "1px 8px", fontSize: 10, fontWeight: 700,
                }}>
                  {expiringMeds.length}
                </span>
              )}
            </div>

            <div>
              {expiringMeds.length === 0 ? (
                <div style={{ ...emptyMsg, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span style={{ color: t.text3, fontSize: 11 }}>No medicines expiring soon</span>
                </div>
              ) : (
                expiringMeds.map((med, i) => {
                  const color = expiryColor(med.daysLeft);
                  const bg    = expiryBg(med.daysLeft);
                  return (
                    <div key={med.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px",
                      borderBottom: i < expiringMeds.length - 1 ? `1px solid ${t.tableRowBorder}` : "none",
                      background: i % 2 === 0 ? t.tableRow : t.surface2,
                    }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.text,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {med.med_name}
                        </div>
                        <div style={{ fontSize: 10.5, color: t.text3, marginTop: 1 }}>
                          {med.med_dosage} · {med.med_type}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: t.text3, marginBottom: 1 }}>
                          {new Date(med.exp_date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                        </div>
                        <span style={{
                          background: bg, color, borderRadius: 16, padding: "1.5px 7px",
                          fontSize: 9.5, fontWeight: 800, whiteSpace: "nowrap",
                          display: "flex", alignItems: "center", gap: 3,
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
        </div>

        {/* ── Right column: Prescriptions panel ── */}
        <div style={{ flex: 0.49, minHeight: 640, maxHeight: 640, ...cardStyle }}>
          <div style={{
            padding: "9px 12px", borderBottom: `1px solid ${t.border2}`,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{
                fontSize: 13, fontWeight: 800, color: t.text,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <RxIcon size={14} color={t.green} />
                Prescriptions
              </span>
            </div>

            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {([
                { key: "sent" as const,      label: "Pending"   },
                { key: "dispensed" as const, label: "Dispensed" },
                { key: "cancelled" as const, label: "Cancelled" },
                { key: "all" as const,       label: "All"       },
              ]).map(tab => (
                <button key={tab.key} onClick={() => setRxFilter(tab.key)} style={{
                  padding: "4px 10px", borderRadius: 14,
                  border: `1.5px solid ${rxFilter === tab.key ? t.green : t.border2}`,
                  background: rxFilter === tab.key ? t.green : "transparent",
                  color: rxFilter === tab.key ? "#fff" : t.text2,
                  fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}>
                  {tab.label}
                  <span style={{
                    marginLeft: 4, fontSize: 9, fontWeight: 700,
                    background: rxFilter === tab.key ? "rgba(255,255,255,0.25)" : t.tableRowBorder,
                    color: rxFilter === tab.key ? "#fff" : t.text3,
                    borderRadius: 8, padding: "0px 5px",
                  }}>{rxCounts[tab.key]}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {rxLoading ? (
              <div style={emptyMsg}>Loading prescriptions…</div>
            ) : rxGroups.length === 0 ? (
              <div style={emptyMsg}>No prescriptions found.</div>
            ) : (
              rxGroups.map(group => {
                const isOpen = rxExpanded.has(group.patient_name);
                return (
                  <div key={group.patient_name}>
                    <div
                      onClick={() => toggleRxGroup(group.patient_name)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", cursor: "pointer",
                        borderBottom: `1px solid ${t.tableRowBorder}`,
                        background: isOpen ? `${t.green}10` : t.tableRow,
                        transition: "background 0.15s",
                      }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: `${t.green}1c`, color: t.green,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800,
                      }}>
                        {group.patient_name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: t.text,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {group.patient_name}
                        </div>
                        <div style={{ fontSize: 9.5, color: t.text3, marginTop: 1 }}>
                          {group.rows.length} prescription{group.rows.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke={t.text3} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)", flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>

                    {isOpen && group.rows.map((rx, i) => (
                      <div key={rx.id}
                        onClick={() => { setViewRx(rx); setDispenseError(null); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px 8px 38px", cursor: "pointer",
                          borderBottom: `1px solid ${t.tableRowBorder}`,
                          background: i % 2 === 0 ? t.surface2 : t.tableRow,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${t.green}14`)}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? t.surface2 : t.tableRow)}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: t.text,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {rx.medicine}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                          {rxStatusBadge(rx.status)}
                          <span style={{ fontSize: 9.5, color: t.text3 }}>
                            {new Date(rx.prescription_date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Full RHU prescription slip ── */}
      {viewRx && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, overflowY: "auto", padding: "32px 0",
          }}
          onClick={() => { setViewRx(null); setConfirmAction(null); setDispenseError(null); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
          >
            {/* 4.25 × 5.5in Slip */}
            <div style={{
              width: "4.25in",
              minHeight: "5.5in",
              background: "#fff",
              fontFamily: "Arial, sans-serif",
              color: "#000",
              padding: "0.22in 0.28in",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
              position: "relative",
            }}>

              {/* Close button */}
              <button
                onClick={() => { setViewRx(null); setConfirmAction(null); setDispenseError(null); }}
                style={{
                  position: "absolute", top: 8, right: 8,
                  width: 26, height: 26, borderRadius: "50%",
                  background: "#f3f4f6", border: "1px solid #d1d5db",
                  color: "#374151", fontSize: 13, fontWeight: 900,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", zIndex: 10, lineHeight: 1, flexShrink: 0,
                }}>
                ✕
              </button>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <img
                  src="/logo.jpg" alt="seal"
                  style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div style={{ textAlign: "center", flex: 1, padding: "0 10px", lineHeight: 1.5 }}>
                  <div style={{ fontSize: "8pt" }}>Republic of the Philippines</div>
                  <div style={{ fontSize: "11pt", fontWeight: 900, textTransform: "uppercase" }}>Department of Health</div>
                  <div style={{ fontSize: "10pt", fontWeight: 900, textTransform: "uppercase" }}>Rural Health Unit</div>
                  <div style={{ fontSize: "8.5pt" }}>Lopez, Quezon</div>
                </div>
                <img
                  src="/logo.jpg" alt="seal"
                  style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* Patient fields */}
              <div style={{ fontSize: "9pt", marginBottom: 6 }}>
                {/* Row 1: Name + Date */}
                <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, marginRight: 4, whiteSpace: "nowrap" }}>Name:</span>
                  <span style={{ flex: 2.2, borderBottom: "1px solid #000", paddingLeft: 3, paddingBottom: 1, marginRight: 16 }}>
                    {viewRx.patient_name}
                  </span>
                  <span style={{ fontWeight: 700, marginRight: 4, whiteSpace: "nowrap" }}>Date:</span>
                  <span style={{ flex: 1, borderBottom: "1px solid #000", paddingLeft: 3, paddingBottom: 1 }}>
                    {new Date(viewRx.prescription_date).toLocaleDateString("en-US", {
                      month: "long", day: "numeric", year: "numeric",
                    })}
                  </span>
                </div>

                {/* Row 2: Age + Gender + Civil Status */}
                <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, marginRight: 4, whiteSpace: "nowrap" }}>Age:</span>
                  <span style={{ flex: 0.7, borderBottom: "1px solid #000", paddingLeft: 3, paddingBottom: 1, marginRight: 14 }}>
                    {viewRx.patient_age ?? ""}
                  </span>
                  <span style={{ fontWeight: 700, marginRight: 4, whiteSpace: "nowrap" }}>Gender:</span>
                  <span style={{ flex: 0.9, borderBottom: "1px solid #000", paddingLeft: 3, paddingBottom: 1, marginRight: 14 }}>
                    {viewRx.patient_sex === "M" ? "Male" : viewRx.patient_sex === "F" ? "Female" : ""}
                  </span>
                  <span style={{ fontWeight: 700, marginRight: 4, whiteSpace: "nowrap" }}>Civil Status:</span>
                  <span style={{ flex: 1.2, borderBottom: "1px solid #000", minHeight: 16 }} />
                </div>

                {/* Row 3: Address */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <span style={{ fontWeight: 700, marginRight: 4, whiteSpace: "nowrap" }}>Address:</span>
                  <span style={{ flex: 1, borderBottom: "1px solid #000", paddingLeft: 3, paddingBottom: 1, minHeight: 16 }}>
                    {viewRx.patient_address ?? ""}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid #000", margin: "6px 0 8px" }} />

              {/* Rx symbol */}
              <div style={{ fontFamily: "serif", fontWeight: "bold", fontSize: "30pt", lineHeight: 1, marginBottom: 10 }}>
                R<sub style={{ fontSize: "17pt" }}>x</sub>
              </div>

              {/* Medicine */}
              <div style={{ flex: 1, paddingLeft: 4, fontSize: "10pt" }}>
                <div style={{ fontSize: "11pt", fontWeight: "bold", marginBottom: 5 }}>{viewRx.medicine}</div>
                {viewRx.dosage    && <div style={{ marginBottom: 3 }}><b>Dosage:</b> {viewRx.dosage}</div>}
                {viewRx.frequency && <div style={{ marginBottom: 3 }}><b>Sig:</b> {viewRx.frequency}</div>}
                {viewRx.quantity  && <div style={{ marginBottom: 3 }}><b>Qty:</b> #{viewRx.quantity}</div>}
              </div>

              {/* Footer */}
              <div style={{ marginTop: "auto", paddingTop: 14, textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #000", width: "60%", margin: "0 auto 4px" }} />
                <div style={{ fontSize: "9pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  PAOLO GAYLORD S. VILLAFAÑE, MD, FPPS
                </div>
                <div style={{ fontSize: "8pt" }}>Municipal Health Officer</div>
                <div style={{ fontSize: "8pt" }}>Lic. No. 89594</div>
              </div>
            </div>

            {/* ── Dispense error banner ── */}
            {dispenseError && (
              <div style={{
                width: "4.25in",
                background: "#fef2f2",
                border: "1.5px solid #fca5a5",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#dc2626", marginBottom: 2 }}>Cannot Dispense</div>
                  <div style={{ fontSize: 11.5, color: "#7f1d1d", lineHeight: 1.5 }}>{dispenseError}</div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {viewRx.status === "sent" ? (
              <div style={{ display: "flex", gap: 10, width: "4.25in" }}>
                <button
                  onClick={() => setConfirmAction("cancelled")}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 8,
                    border: "none", background: "#d63031", color: "#fff",
                    fontSize: 13, fontWeight: 900, cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                  CANCEL DISPENSE
                </button>
                <button
                  onClick={handleConfirmDispenseClick}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 8,
                    border: "none", background: "#1b5e20", color: "#fff",
                    fontSize: 13, fontWeight: 900, cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                  CONFIRM DISPENSE
                </button>
              </div>
            ) : (
              <div style={{ width: "4.25in" }}>
                <button
                  onClick={() => { setViewRx(null); setDispenseError(null); }}
                  style={{
                    width: "100%", padding: "9px 0", borderRadius: 8,
                    border: "none", background: "#374151", color: "#fff",
                    fontSize: 13, fontWeight: 900, cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                  CLOSE
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirmation dialog ── */}
      {viewRx && confirmAction && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1100,
          }}
          onClick={() => !rxUpdating && setConfirmAction(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: t.cardBg, borderRadius: 14, width: 380,
              padding: "24px 24px 20px", boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              textAlign: "center",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: confirmAction === "dispensed" ? "#1b5e2022" : "#d6303122",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {confirmAction === "dispensed" ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1b5e20" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="9"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d63031" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              )}
            </div>

            <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>
              {confirmAction === "dispensed" ? "Confirm Dispense?" : "Cancel This Prescription?"}
            </div>
            <div style={{ fontSize: 12.5, color: t.text3, lineHeight: 1.5 }}>
              {confirmAction === "dispensed"
                ? <>Dispense <b>{viewRx.medicine}</b> to <b>{viewRx.patient_name}</b> and deduct from inventory? This cannot be undone.</>
                : <>This will cancel <b>{viewRx.medicine}</b> for <b>{viewRx.patient_name}</b>. This cannot be undone.</>
              }
            </div>

            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 8 }}>
              <button
                onClick={() => setConfirmAction(null)}
                disabled={rxUpdating}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8,
                  border: `1.5px solid ${t.border2}`, background: "transparent",
                  color: t.text2, fontSize: 13, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit",
                  opacity: rxUpdating ? 0.6 : 1,
                }}>
                Go Back
              </button>
              <button
                onClick={() => handleRxUpdate(viewRx.id, confirmAction)}
                disabled={rxUpdating}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8,
                  border: "none",
                  background: confirmAction === "dispensed" ? "#1b5e20" : "#d63031",
                  color: "#fff", fontSize: 13, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit",
                  opacity: rxUpdating ? 0.6 : 1,
                }}>
                {rxUpdating ? "Saving…" : "Yes, Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}