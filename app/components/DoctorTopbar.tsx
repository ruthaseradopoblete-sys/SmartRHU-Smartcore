"use client";
import React, {
  useState, useEffect, useRef, useCallback, RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type LabNotif = {
  id: string;
  patient_name: string;
  request_date?: string;
  created_at: string;
  read: boolean;
  isNew: boolean;
};

type PatientNotif = {
  id: string;
  patient_id: string;
  patient_name: string;
  subjective?: string;
  created_at: string;
  read: boolean;
  isNew: boolean;
};

export interface DoctorTopbarProps {
  rootRef?:          RefObject<HTMLDivElement | null>;
  dark:              boolean;
  onToggleDark:      () => void;
  user?:             { name: string; initials: string; role: string } | null;
  search?:           string;
  onSearchChange?:   (value: string) => void;
  onViewLabResults?: (labRequestId?: string) => void;
  onOpenPatient?:    (consultationId: string, patientId: string, patientName: string) => void;
  onLogout?:         () => void;
  sidebarOpen?:      boolean;
  onToggleSidebar?:  () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return "—";
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 0)     return "just now";
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

async function fetchPatientName(patientId: string): Promise<string> {
  if (!patientId) return "Unknown Patient";
  try {
    const { data } = await supabase
      .from("patients")
      .select("first_name, last_name")
      .eq("id", patientId)
      .maybeSingle();
    if (!data) return `Patient #${patientId}`;
    return [data.last_name, data.first_name].filter(Boolean).join(", ") || `Patient #${patientId}`;
  } catch {
    return `Patient #${patientId}`;
  }
}

// ─── Persistent read-state (localStorage) ───────────────────────────────────────
// Naaalala kung aling notification IDs na ang nabasa ng doctor, kaya kahit
// i-reload ang system ay hindi na ito babalik sa unread count. Per-user ang key
// para hindi magsanib ang read-status kung may ibang gagamit ng parehong browser.

function readStoreKey(): string {
  try {
    const raw = localStorage.getItem("smartrhu_user");
    const uid = raw ? JSON.parse(raw)?.id : null;
    return uid ? `doctor_notif_read_ids_${uid}` : "doctor_notif_read_ids";
  } catch {
    return "doctor_notif_read_ids";
  }
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(readStoreKey());
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function addReadIds(...ids: string[]) {
  if (!ids.length) return;
  try {
    const set = loadReadIds();
    ids.forEach(id => id && set.add(id));
    // Cap para hindi lumaki nang walang hanggan (panatilihin ang huling 500)
    const trimmed = [...set].slice(-500);
    localStorage.setItem(readStoreKey(), JSON.stringify(trimmed));
  } catch {}
}

// ─── Persistent DISMISSED-state (localStorage) ──────────────────────────────────
// Kapag "Clear all" o dinismiss (×) ang isang notif, tuluyan na itong mawawala —
// hindi na babalik kahit i-reload o muling i-fetch. Mga BAGONG ID lang (mga
// dumating PAGKATAPOS mag-clear) ang muling lalabas. Per-user din ang key.

function dismissStoreKey(): string {
  try {
    const raw = localStorage.getItem("smartrhu_user");
    const uid = raw ? JSON.parse(raw)?.id : null;
    return uid ? `doctor_notif_dismissed_ids_${uid}` : "doctor_notif_dismissed_ids";
  } catch {
    return "doctor_notif_dismissed_ids";
  }
}

function loadDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(dismissStoreKey());
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function addDismissedIds(...ids: string[]) {
  if (!ids.length) return;
  try {
    const set = loadDismissedIds();
    ids.forEach(id => id && set.add(id));
    // Mas malaki ang cap dito dahil patuloy na dumarami ang dumadaang patients/labs
    const trimmed = [...set].slice(-1000);
    localStorage.setItem(dismissStoreKey(), JSON.stringify(trimmed));
  } catch {}
}

// ─── Notification sound ───────────────────────────────────────────────────────

function playTone(type: "lab" | "patient") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const tones =
      type === "lab"
        ? [
            { freq: 880,  start: 0,    dur: 0.12 },
            { freq: 1100, start: 0.10, dur: 0.12 },
            { freq: 880,  start: 0.22, dur: 0.18 },
          ]
        : [
            { freq: 660, start: 0,    dur: 0.15 },
            { freq: 780, start: 0.15, dur: 0.20 },
          ];
    tones.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.30, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
  } catch {}
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const ICON_BTN: React.CSSProperties = {
  background:     "rgba(255,255,255,0.10)",
  border:         "none",
  borderRadius:   "50%",
  width:          38,
  height:         38,
  cursor:         "pointer",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  position:       "relative",
  flexShrink:     0,
  transition:     "background 0.15s",
  color:          "#fff",
};

const PANEL_BTN: React.CSSProperties = {
  background:   "rgba(255,255,255,0.15)",
  border:       "none",
  color:        "#fff",
  fontSize:     10,
  fontWeight:   700,
  padding:      "3px 9px",
  borderRadius: 6,
  cursor:       "pointer",
  fontFamily:   "DM Sans, sans-serif",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DoctorTopbar({
  dark,
  onToggleDark,
  user,
  search = "",
  onSearchChange,
  onViewLabResults,
  onOpenPatient,
  onLogout,
  sidebarOpen,
  onToggleSidebar,
}: DoctorTopbarProps) {
  const router = useRouter();

  // ── Dark-mode palette ──────────────────────────────────────────────────────
  const dm = {
    panelBg:       dark ? "#0d2516"               : "#ffffff",
    stripBg:       dark ? "#061a0d"               : "#f9fafb",
    panelBorder:   dark ? "rgba(74,222,128,0.18)" : "rgba(22,163,74,0.18)",
    stripBorder:   dark ? "rgba(74,222,128,0.10)" : "#f3f4f6",
    divider:       dark ? "rgba(74,222,128,0.08)" : "#f3f4f6",
    menuBorder:    dark ? "rgba(74,222,128,0.12)" : "rgba(0,0,0,0.06)",
    textPrimary:   dark ? "#e2f5e9"               : "#1a1a1a",
    textSecondary: dark ? "#9abea6"               : "#374151",
    textMuted:     dark ? "#4b6557"               : "#9ca3af",
    menuItemText:  dark ? "#e2f5e9"               : "#1f2937",
    itemHoverBg:   dark ? "rgba(22,163,74,0.10)"  : "#f0fdf4",
    logoutHoverBg: dark ? "rgba(220,38,38,0.14)"  : "#fff5f5",
    emptyText:     dark ? "#9abea6"               : "#6b7280",
    emptyHint:     dark ? "#4b6557"               : "#9ca3af",
    badgeBg:       dark ? "rgba(255,255,255,0.14)": "rgba(255,255,255,0.22)",
    readDot:       dark ? "#2d4a38"               : "#e5e7eb",
    panelShadow:   dark
      ? "0 20px 60px rgba(0,0,0,0.55)"
      : "0 20px 60px rgba(0,0,0,0.18)",
    tabLabActive:  dark ? "#064e3b" : "#f0fdf4",
    tabLabText:    dark ? "#34d399" : "#065f46",
    tabPtActive:   dark ? "#1c1917" : "#fff7ed",
    tabPtText:     dark ? "#fb923c" : "#c2410c",
  };

  const headerGrad = "linear-gradient(135deg, #0d3b1f 0%, #1a6b35 100%)";

  // ── Clock ──────────────────────────────────────────────────────────────────
  const [time,    setTime]    = useState("");
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-PH",    { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDateStr(now.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Live profile ───────────────────────────────────────────────────────────
  const [liveAvatar, setLiveAvatar] = useState<string | null>(null);
  const [liveName,   setLiveName]   = useState("");
  const [liveEmail,  setLiveEmail]  = useState("");
  const [liveRole,   setLiveRole]   = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const raw = localStorage.getItem("smartrhu_user");
      const uid = raw ? JSON.parse(raw)?.id : null;
      if (!uid) return;
      const { data } = await supabase
        .from("users")
        .select("username, email, avatar_url, role")
        .eq("user_id", uid)
        .single();
      if (data) {
        if (data.avatar_url) setLiveAvatar(`${data.avatar_url}?t=${Date.now()}`);
        if (data.username)   setLiveName(data.username);
        if (data.email)      setLiveEmail(data.email);
        if (data.role)       setLiveRole(data.role);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadProfile();
    window.addEventListener("avatarUpdated",  loadProfile);
    window.addEventListener("profileUpdated", loadProfile);
    return () => {
      window.removeEventListener("avatarUpdated",  loadProfile);
      window.removeEventListener("profileUpdated", loadProfile);
    };
  }, [loadProfile]);

  const displayName    = liveName || user?.name || "Doctor";
  const displayRole    = liveRole || user?.role || "Doctor";
  const displayInitial = displayName.charAt(0).toUpperCase();

  // ── Profile dropdown ───────────────────────────────────────────────────────
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showProfile) return;
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setShowProfile(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showProfile]);

  // ── Notification state ─────────────────────────────────────────────────────
  const [labNotifs,      setLabNotifs]      = useState<LabNotif[]>([]);
  const [patientNotifs,  setPatientNotifs]  = useState<PatientNotif[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [activeTab,      setActiveTab]      = useState<"lab" | "patient">("lab");
  const [soundEnabled,   setSoundEnabled]   = useState(true);

  const soundRef = useRef(soundEnabled);
  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

  const notifPanelRef = useRef<HTMLDivElement>(null);

  const unreadLab     = labNotifs.filter(n => !n.read).length;
  const unreadPatient = patientNotifs.filter(n => !n.read).length;
  const totalUnread   = unreadLab + unreadPatient;
  const hasNewLab     = labNotifs.some(n => n.isNew);
  const hasNewPatient = patientNotifs.some(n => n.isNew);
  const hasAnyNew     = hasNewLab || hasNewPatient;
  const hasLabResult  = labNotifs.length > 0;

  // ── Load lab notifications ─────────────────────────────────────────────────
  const loadLabNotifs = useCallback(async () => {
    const { data, error } = await supabase
      .from("laboratory_requests")
      .select("id, request_date, updated_at, created_at, status, patient_id, patients ( first_name, last_name )")
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error) { console.error("[DoctorTopbar] loadLabNotifs:", error); return; }

    const rows = await Promise.all(
      (data || []).map(async (r: any) => {
        const joined = r.patients
          ? [r.patients.last_name, r.patients.first_name].filter(Boolean).join(", ")
          : null;
        const patient_name = joined || await fetchPatientName(r.patient_id);
        return {
          id:           r.id,
          patient_name,
          request_date: r.request_date,
          created_at:   r.updated_at || r.created_at,
          read:         false,
          isNew:        false,
        } as LabNotif;
      })
    );

    const readIds      = loadReadIds();
    const dismissedIds = loadDismissedIds();
    setLabNotifs(prev => {
      const map = Object.fromEntries(prev.map(n => [n.id, n]));
      return rows
        .filter(r => !dismissedIds.has(r.id)) // tuluyan nang itinago ang na-clear/na-dismiss
        .map(r => {
          const isRead = readIds.has(r.id) || (map[r.id]?.read ?? false);
          return { ...r, read: isRead, isNew: isRead ? false : r.isNew };
        });
    });
  }, []);

  // ── Load patient notifications ─────────────────────────────────────────────
  const loadPatientNotifs = useCallback(async () => {
    const { data, error } = await supabase
      .from("soap_consultations")
      .select("id, created_at, status, subjective, patient_id")
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("[DoctorTopbar] loadPatientNotifs:", {
        message: error.message,
        code:    error.code,
        details: error.details,
        hint:    error.hint,
      });
    }
    const rows = await Promise.all(
      (data || []).map(async (r: any) => ({
        id:              r.id,
        patient_id:      r.patient_id,
        patient_name:    await fetchPatientName(r.patient_id),
        chief_complaint: r.chief_complaint || "—",
        created_at:      r.created_at,
        read:            false,
        isNew:           false,
      } as PatientNotif))
    );

    const readIds      = loadReadIds();
    const dismissedIds = loadDismissedIds();
    setPatientNotifs(prev => {
      const map = Object.fromEntries(prev.map(n => [n.id, n]));
      return rows
        .filter(r => !dismissedIds.has(r.id)) // tuluyan nang itinago ang na-clear/na-dismiss
        .map(r => {
          const isRead = readIds.has(r.id) || (map[r.id]?.read ?? false);
          return { ...r, read: isRead, isNew: isRead ? false : r.isNew };
        });
    });
  }, []);

  useEffect(() => {
    loadLabNotifs();
    loadPatientNotifs();
  }, [loadLabNotifs, loadPatientNotifs]);

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("doctor_topbar_rt");

    ch.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "laboratory_requests" },
      async ({ new: row, old: oldRow }) => {
        const r   = row    as Record<string, any>;
        const old = oldRow as Record<string, any>;
        if (r.status !== "completed" || old.status === "completed") return;
        if (loadDismissedIds().has(r.id)) return; // na-clear na dati — huwag nang ibalik
        const already      = loadReadIds().has(r.id);
        const patient_name = await fetchPatientName(r.patient_id);
        const notif: LabNotif = {
          id: r.id, patient_name,
          request_date: r.request_date,
          created_at:   r.updated_at || r.created_at,
          read: already, isNew: !already,
        };
        setLabNotifs(prev => [notif, ...prev.filter(n => n.id !== r.id)].slice(0, 20));
        if (!already) {
          if (soundRef.current) playTone("lab");
          setActiveTab("lab");
          setTimeout(() =>
            setLabNotifs(prev => prev.map(n => n.id === r.id ? { ...n, isNew: false } : n)),
          5000);
        }
      }
    );

    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "soap_consultations" },
      async ({ new: row }) => {
        const r = row as Record<string, any>;
        if (r.status !== "waiting") return;
        if (loadDismissedIds().has(r.id)) return; // na-clear na dati — huwag nang ibalik
        const already      = loadReadIds().has(r.id);
        const patient_name = await fetchPatientName(r.patient_id);
        const notif: PatientNotif = {
          id: r.id, patient_id: r.patient_id, patient_name,
          subjective: r.chief_complaint || "—",
          created_at: r.created_at,
          read: already, isNew: !already,
        };
        setPatientNotifs(prev => [notif, ...prev.filter(n => n.id !== r.id)].slice(0, 20));
        if (!already) {
          if (soundRef.current) playTone("patient");
          setActiveTab("patient");
          setTimeout(() =>
            setPatientNotifs(prev => prev.map(n => n.id === r.id ? { ...n, isNew: false } : n)),
          5000);
        }
      }
    );

    ch.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "soap_consultations" },
      ({ new: row }) => {
        const r = row as Record<string, any>;
        if (r.status !== "waiting")
          setPatientNotifs(prev => prev.filter(n => n.id !== r.id));
      }
    );

    ch.subscribe(s => {
      if (s === "SUBSCRIBED")    console.log("[DoctorTopbar] Realtime ✓");
      if (s === "CHANNEL_ERROR") console.error("[DoctorTopbar] Realtime channel error");
    });

    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Close panel on outside click ──────────────────────────────────────────
  useEffect(() => {
    if (!showNotifPanel) return;
    const h = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node))
        setShowNotifPanel(false);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [showNotifPanel]);

  // ── Notification actions ───────────────────────────────────────────────────
  // Lahat ng nagmamark ng "read" o nagde-dismiss ay isi-save din sa localStorage
  // para tuluyan nang maalis sa bilang kahit mag-reload.
  const markAllRead = () => {
    addReadIds(...labNotifs.map(n => n.id), ...patientNotifs.map(n => n.id));
    setLabNotifs(prev     => prev.map(n => ({ ...n, read: true, isNew: false })));
    setPatientNotifs(prev => prev.map(n => ({ ...n, read: true, isNew: false })));
  };
  const markLabRead     = (id: string) => { addReadIds(id); setLabNotifs(prev     => prev.map(n => n.id === id ? { ...n, read: true, isNew: false } : n)); };
  const markPatientRead = (id: string) => { addReadIds(id); setPatientNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true, isNew: false } : n)); };
  const dismissLab      = (id: string, e: React.MouseEvent) => { e.stopPropagation(); addDismissedIds(id); setLabNotifs(prev     => prev.filter(n => n.id !== id)); };
  const dismissPatient  = (id: string, e: React.MouseEvent) => { e.stopPropagation(); addDismissedIds(id); setPatientNotifs(prev => prev.filter(n => n.id !== id)); };
  const clearAll        = () => { addDismissedIds(...labNotifs.map(n => n.id), ...patientNotifs.map(n => n.id)); setLabNotifs([]); setPatientNotifs([]); setShowNotifPanel(false); };

  const activeNotifs = activeTab === "lab" ? labNotifs        : patientNotifs;
  const markOneRead  = activeTab === "lab" ? markLabRead      : markPatientRead;
  const dismissOne   = activeTab === "lab" ? dismissLab       : dismissPatient;
  const tabColor     = activeTab === "lab" ? "#16a34a"        : "#c2410c";

  // ── Open a notification ────────────────────────────────────────────────────
  // Pag-click ng patient notification:
  //   1) kung may onOpenPatient prop  → tatawagin ito (parent ang magbubukas)
  //   2) kung wala                    → magpapadala ng global event "doctor:openSoap"
  //      na pwede mong pakinggan kahit saan naka-render ang SoapModal mo.
  // (Lab → onViewLabResults.) WALANG router.push dito kasi MODAL ang SOAP, hindi page.
  const handleOpenNotif = (n: LabNotif | PatientNotif) => {
    markOneRead(n.id);
    setShowNotifPanel(false);
    if (activeTab === "lab") {
      onViewLabResults?.(n.id); // dumiretso sa eksaktong result (n.id = laboratory_requests.id)
      return;
    }
    const pn = n as PatientNotif;
    const detail = {
      consultationId: pn.id,
      patientId:      pn.patient_id,
      patientName:    pn.patient_name,
    };
    if (onOpenPatient) {
      onOpenPatient(pn.id, pn.patient_id, pn.patient_name);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("doctor:openSoap", { detail }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <header style={{
        background:     "#0d3b1f",
        height:         64,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0 22px",
        flexShrink:     0,
        boxShadow:      "0 1px 8px rgba(0,0,0,0.30)",
        gap:            16,
        zIndex:         50,
        position:       "sticky",
        top:            0,
      }}>

        {/* ── Left: hamburger + search ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              style={{ ...ICON_BTN, borderRadius: 9 }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="3"  y1="6"  x2="21" y2="6"/>
                <line x1="3"  y1="12" x2="21" y2="12"/>
                <line x1="3"  y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          )}

          <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
            <svg
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.40)" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => onSearchChange?.(e.target.value)}
              placeholder="Search patients, medicines…"
              style={{
                width: "100%", background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.14)", borderRadius: 50,
                padding: "9px 18px 9px 40px", color: "#fff", fontSize: 13,
                outline: "none", fontFamily: "DM Sans, sans-serif",
                boxSizing: "border-box", transition: "border 0.2s",
              }}
              onFocus={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.55)")}
              onBlur={e  => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)")}
            />
          </div>
        </div>

        {/* ── Right: clock → bell → dark mode → user ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

          {/* ── Clock — FIRST ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10, padding: "5px 14px", flexShrink: 0,
          }}>
            <span style={{
              color: "#fff", fontSize: 15, fontWeight: 700,
              fontFamily: "DM Sans, sans-serif", letterSpacing: "0.04em",
              lineHeight: 1.2, fontVariantNumeric: "tabular-nums",
            }}>
              {time || "––:––:––"}
            </span>
          </div>

          {/* ── Notification Bell — SECOND ── */}
          <div ref={notifPanelRef} style={{ position: "relative" }}>
            <button
              style={{
                ...ICON_BTN,
                animation: hasAnyNew ? "bellShake 0.4s ease infinite alternate" : "none",
              }}
              onClick={() => {
                const opening = !showNotifPanel;
                setShowNotifPanel(opening);
                if (opening) markAllRead();
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {totalUnread > 0 && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  minWidth: 17, height: 17, padding: "0 3px",
                  borderRadius: 9, background: "#ef4444",
                  border: "2px solid #0d3b1f", color: "#fff",
                  fontSize: 9, fontWeight: 800, lineHeight: "13px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "DM Sans, sans-serif", boxSizing: "content-box",
                }}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>

            {/* ── Notification Panel ── */}
            {showNotifPanel && (
              <div style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0,
                width: 370, maxHeight: 580,
                background: dm.panelBg, border: `1px solid ${dm.panelBorder}`,
                borderRadius: 14, boxShadow: dm.panelShadow,
                zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
              }}>

                {/* Panel header */}
                <div style={{
                  background: headerGrad, padding: "12px 14px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexShrink: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#fff", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14 }}>
                      Notifications
                    </span>
                    <span style={{ background: dm.badgeBg, borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                      {labNotifs.length + patientNotifs.length}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      title={soundEnabled ? "Mute" : "Unmute"}
                      onClick={() => setSoundEnabled(s => !s)}
                      style={{
                        background: soundEnabled ? "rgba(255,255,255,0.18)" : "rgba(239,68,68,0.50)",
                        border: "none", color: "#fff", width: 28, height: 28,
                        borderRadius: 7, cursor: "pointer", fontSize: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.15s",
                      }}>
                      {soundEnabled ? "🔔" : "🔕"}
                    </button>
                    <button
                      onClick={() => { loadLabNotifs(); loadPatientNotifs(); }}
                      style={PANEL_BTN}
                      title="Refresh"
                    >
                      ↻
                    </button>
                    {(labNotifs.length + patientNotifs.length) > 0 && (
                      <button onClick={clearAll} style={PANEL_BTN}>Clear all</button>
                    )}
                    <button
                      onClick={() => setShowNotifPanel(false)}
                      style={{ ...PANEL_BTN, width: 26, height: 26, padding: 0, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: `1px solid ${dm.stripBorder}`, flexShrink: 0, background: dm.stripBg }}>
                  {(["lab", "patient"] as const).map(tab => {
                    const isActive = activeTab === tab;
                    const color    = tab === "lab" ? "#16a34a"       : "#c2410c";
                    const activeBg = tab === "lab" ? dm.tabLabActive : dm.tabPtActive;
                    const unread   = tab === "lab" ? unreadLab       : unreadPatient;
                    const hasNew   = tab === "lab" ? hasNewLab       : hasNewPatient;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                          flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                          fontSize: 12, fontWeight: 700,
                          background:   isActive ? activeBg       : "transparent",
                          color:        isActive ? color          : dm.textMuted,
                          borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          gap: 6, transition: "all 0.15s", fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {tab === "lab" ? "🧪 Lab Results" : "🏥 Queue"}
                        {unread > 0 && (
                          <span style={{ background: color, color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 20 }}>
                            {unread}
                          </span>
                        )}
                        {hasNew && (
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Notification list */}
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {activeNotifs.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>
                        {activeTab === "lab" ? "🧪" : "🏥"}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: dm.emptyText, fontFamily: "DM Sans, sans-serif" }}>
                        {activeTab === "lab" ? "No completed lab results" : "No patients in queue"}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 4, color: dm.emptyHint, fontFamily: "DM Sans, sans-serif" }}>
                        {activeTab === "lab"
                          ? "Results from medtech will appear here"
                          : "Patients added by registrar will appear here"}
                      </div>
                    </div>
                  ) : (activeNotifs as any[]).map((n, i) => {
                    const accent   = tabColor;
                    const rowBg    = n.isNew ? `${accent}18` : n.read ? "transparent" : `${accent}0d`;
                    const rowHover = `${accent}22`;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleOpenNotif(n)}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "11px 14px",
                          borderBottom: i < activeNotifs.length - 1 ? `1px solid ${dm.divider}` : "none",
                          background: rowBg, cursor: "pointer", transition: "background 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = rowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                      >
                        {/* Unread dot */}
                        <div style={{ marginTop: 6, flexShrink: 0 }}>
                          {n.isNew ? (
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, boxShadow: `0 0 0 3px ${accent}44`, animation: "pulse 1s ease infinite" }} />
                          ) : !n.read ? (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />
                          ) : (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dm.readDot }} />
                          )}
                        </div>

                        {/* Icon badge */}
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: `${accent}22`, border: `1.5px solid ${accent}44`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                        }}>
                          {activeTab === "lab" ? "🧪" : "👤"}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: n.read ? 600 : 800, margin: 0, color: dm.textPrimary, fontFamily: "DM Sans, sans-serif" }}>
                            {activeTab === "lab" ? "Lab Result Ready" : "Patient for Consultation"}
                          </p>
                          <p style={{ fontSize: 12, margin: "2px 0 0", color: accent, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "DM Sans, sans-serif" }}>
                            {n.patient_name}
                          </p>
                          {activeTab === "patient" && (n as PatientNotif).subjective && (
                            <p style={{ fontSize: 11, margin: "2px 0 0", color: dm.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "DM Sans, sans-serif" }}>
                              CC: {(n as PatientNotif).subjective}
                            </p>
                          )}
                          {activeTab === "lab" && (n as LabNotif).request_date && (
                            <p style={{ fontSize: 11, margin: "2px 0 0", color: dm.textSecondary, fontFamily: "DM Sans, sans-serif" }}>
                              📅 {(n as LabNotif).request_date}
                            </p>
                          )}
                          <p style={{ fontSize: 10, margin: "2px 0 0", color: dm.textMuted, fontFamily: "DM Sans, sans-serif" }}>
                            {timeAgo(n.created_at)}
                          </p>
                          {n.isNew && (
                            <span style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, background: `${accent}22`, color: accent, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: 0.5, fontFamily: "DM Sans, sans-serif" }}>
                              ● NEW
                            </span>
                          )}
                        </div>

                        {/* Dismiss */}
                        <button
                          onClick={e => dismissOne(n.id, e)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: dm.textMuted, fontSize: 16, padding: "0 2px", lineHeight: 1, flexShrink: 0, marginTop: 2 }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
                          onMouseLeave={e => (e.currentTarget.style.color = dm.textMuted)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Panel footer */}
                <div style={{
                  padding: "10px 14px", borderTop: `1px solid ${dm.stripBorder}`,
                  background: dm.stripBg, display: "flex", justifyContent: "space-between",
                  alignItems: "center", flexShrink: 0,
                }}>
                  <span style={{ fontSize: 11, color: dm.textMuted, fontFamily: "DM Sans, sans-serif" }}>
                    {unreadLab} lab · {unreadPatient} patient unread
                  </span>
                  {hasLabResult && activeTab === "lab" && (
                    <button
                      onClick={() => { onViewLabResults?.(); setShowNotifPanel(false); }}
                      style={{ background: headerGrad, color: "#fff", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, padding: "5px 12px", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                    >
                      🧪 View Lab Results →
                    </button>
                  )}
                  {activeTab === "patient" && patientNotifs.length > 0 && (
                    <button
                      onClick={() => setShowNotifPanel(false)}
                      style={{ background: "none", border: "none", fontSize: 11, fontWeight: 700, color: "#c2410c", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
                    >
                      View all patients →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Dark mode toggle ── */}
          <button
            title={dark ? "Light mode" : "Dark mode"}
            onClick={onToggleDark}
            style={ICON_BTN}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
          >
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
          </button>

          {/* ── User pill ── */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfile(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                background: showProfile ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.12)",
                borderRadius: 50, padding: "5px 12px 5px 5px",
                cursor: "pointer", border: "1px solid rgba(255,255,255,0.14)", transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.20)")}
              onMouseLeave={e => { if (!showProfile) e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
            >
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.30)",
                background: "linear-gradient(135deg,#22c55e,#15803d)",
              }}>
                {liveAvatar ? (
                  <img
                    src={liveAvatar} alt="avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={() => setLiveAvatar(null)}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "DM Sans, sans-serif" }}>
                    {displayInitial}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, lineHeight: 1.2, whiteSpace: "nowrap", fontFamily: "DM Sans, sans-serif" }}>
                  {displayName}
                </div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "DM Sans, sans-serif" }}>
                  {displayRole}
                </div>
              </div>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
                style={{ marginLeft: 2, transition: "transform .2s", transform: showProfile ? "rotate(180deg)" : "rotate(0deg)" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Profile dropdown */}
            {showProfile && (
              <div style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0,
                width: 260, background: dm.panelBg, borderRadius: 14,
                overflow: "hidden", boxShadow: dm.panelShadow,
                border: `1px solid ${dm.menuBorder}`, zIndex: 9999,
              }}>
                {/* Dropdown header */}
                <div style={{ background: headerGrad, padding: "18px 18px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                      border: "2.5px solid rgba(255,255,255,0.40)",
                      background: "linear-gradient(135deg,#22c55e,#15803d)",
                    }}>
                      {liveAvatar ? (
                        <img src={liveAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setLiveAvatar(null)} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18, fontFamily: "DM Sans, sans-serif" }}>
                          {displayInitial}
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "Syne, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {displayName}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.04, fontFamily: "DM Sans, sans-serif", marginTop: 2 }}>
                        {displayRole}
                      </div>
                      {liveEmail && (
                        <div style={{ color: "rgba(255,255,255,0.50)", fontSize: 11, fontFamily: "DM Sans, sans-serif", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {liveEmail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div style={{ padding: "8px 0", background: dm.panelBg }}>
                  {[
                    { icon: "👤", label: "My Profile",      path: "/doctor/settings" },
                    { icon: "🔒", label: "Change Password", path: "/doctor/settings?tab=password" },
                    { icon: "⚙️", label: "Settings",        path: "/doctor/settings" },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => { setShowProfile(false); router.push(item.path); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "background .12s", textAlign: "left" as const }}
                      onMouseEnter={e => (e.currentTarget.style.background = dm.itemHoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontSize: 16, width: 22, textAlign: "center" as const }}>{item.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: dm.menuItemText }}>{item.label}</span>
                    </button>
                  ))}
                  <div style={{ height: 1, background: dm.divider, margin: "6px 0" }} />
                  <button
                    onClick={() => { setShowProfile(false); onLogout?.(); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "background .12s", textAlign: "left" as const }}
                    onMouseEnter={e => (e.currentTarget.style.background = dm.logoutHoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 16, width: 22, textAlign: "center" as const }}>🚪</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <style>{`
        @keyframes bellShake {
          0%   { transform: rotate(-12deg); }
          100% { transform: rotate(12deg);  }
        }
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0   rgba(22,163,74,0.50); }
          100% { box-shadow: 0 0 0 8px rgba(22,163,74,0);    }
        }
      `}</style>
    </>
  );
}