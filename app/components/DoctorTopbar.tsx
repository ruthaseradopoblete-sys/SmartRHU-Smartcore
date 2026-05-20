"use client";
import { useEffect, useState, useRef, useCallback, RefObject } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const LAB_RESULT_TABLES = [
  "laboratory_results_chemistry",
  "laboratory_results_fecalysis",
  "laboratory_results_hematology",
  "laboratory_results_microbiology",
  "laboratory_results_serology",
  "laboratory_results_urinalysis",
] as const;

const LAB_RESULT_LABELS: Record<string, string> = {
  laboratory_results_chemistry:    "Chemistry",
  laboratory_results_fecalysis:    "Fecalysis",
  laboratory_results_hematology:   "Hematology",
  laboratory_results_microbiology: "Microbiology",
  laboratory_results_serology:     "Serology",
  laboratory_results_urinalysis:   "Urinalysis",
};

type NotifType = "lab_result" | "new_patient";

interface Notification {
  id: string; type: NotifType; message: string;
  patient: string; source: string;
  timestamp: Date; read: boolean; isNew?: boolean;
}

export interface DoctorTopbarProps {
// DoctorTopbar.tsx — line 33
rootRef: RefObject<HTMLDivElement | null>;
  user: { name: string; initials: string; role: string; } | null;
  search:            string;
  onSearchChange:    (value: string) => void;
  onViewLabResults?: () => void;
  onLogout?:         () => void;
}

function notifAccent(type: NotifType) { return type === "lab_result" ? "#f59e0b" : "#16a34a"; }
function notifIcon(type: NotifType)   { return type === "lab_result" ? "🧪" : "👤"; }
function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function resolvePatient(row: Record<string, unknown>): string {
  return (
    (row.patient_name as string) || (row.name as string) || (row.full_name as string) ||
    (row.patient_id != null ? `Patient ID ${row.patient_id}` : "") || "Unknown patient"
  );
}

const ICON_BTN: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)", border: "none", borderRadius: "50%",
  width: 38, height: 38, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  position: "relative", flexShrink: 0, transition: "background 0.15s", color: "#fff",
};

const PANEL_BTN: React.CSSProperties = {
  background: "rgba(255,255,255,0.18)", border: "none", color: "#fff",
  fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
  cursor: "pointer", fontFamily: "DM Sans, sans-serif",
};

export default function DoctorTopbar({
  rootRef, user, search, onSearchChange, onViewLabResults, onLogout,
}: DoctorTopbarProps) {
  const router = useRouter();

  // ── Dark mode ──────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(false);
  const toggleDark = () => {
    setDark(prev => {
      const next = !prev;
      if (rootRef.current) rootRef.current.classList.toggle("dark", next);
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  // ── Live profile from DB ───────────────────────────────────────────────────
  // These override whatever `user` prop says, so Settings changes appear immediately
  const [liveAvatar, setLiveAvatar] = useState<string | null>(null);
  const [liveName,   setLiveName]   = useState<string>("");
  const [liveEmail,  setLiveEmail]  = useState<string>("");
  const [liveRole,   setLiveRole]   = useState<string>("");

  const loadLiveProfile = useCallback(async () => {
    // Get uid from multiple sources
    const uid =
      (() => {
        try {
          const raw = localStorage.getItem("smartrhu_user");
          if (raw) return JSON.parse(raw)?.id;
        } catch {}
        return null;
      })();
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
  }, []);

  useEffect(() => {
    loadLiveProfile();

    // Re-fetch whenever Settings saves
    const onAvatarUpdated  = () => loadLiveProfile();
    const onProfileUpdated = () => loadLiveProfile();
    window.addEventListener("avatarUpdated",  onAvatarUpdated);
    window.addEventListener("profileUpdated", onProfileUpdated);
    return () => {
      window.removeEventListener("avatarUpdated",  onAvatarUpdated);
      window.removeEventListener("profileUpdated", onProfileUpdated);
    };
  }, [loadLiveProfile]);

  const displayName    = liveName  || user?.name     || "Doctor";
  const displayRole    = liveRole  || user?.role     || "Doctor";
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

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifications,  setNotifications]  = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [soundEnabled,   setSoundEnabled]   = useState(true);
  const notifPanelRef   = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const unreadCount  = notifications.filter(n => !n.read).length;
  const hasLabResult = notifications.some(n => n.type === "lab_result");
  const hasNew       = notifications.some(n => n.isNew);

  const playSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      [
        { freq: 880, start: 0, dur: 0.12 },
        { freq: 1100, start: 0.1, dur: 0.12 },
        { freq: 880, start: 0.22, dur: 0.18 },
      ].forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      });
    } catch {}
  }, []);
  const playSoundRef = useRef(playSound);
  useEffect(() => { playSoundRef.current = playSound; }, [playSound]);

  const addNotifRef = useRef<(type: NotifType, message: string, patient: string, source: string) => void>(() => {});
  const addNotification = useCallback((type: NotifType, message: string, patient: string, source: string) => {
    const n: Notification = { id: crypto.randomUUID(), type, message, patient, source, timestamp: new Date(), read: false, isNew: true };
    setNotifications(prev => [n, ...prev].slice(0, 60));
    playSoundRef.current();
    setTimeout(() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isNew: false } : x)), 5000);
  }, []);
  useEffect(() => { addNotifRef.current = addNotification; }, [addNotification]);

  useEffect(() => {
    const notify = (type: NotifType, message: string, patient: string, source: string) =>
      addNotifRef.current(type, message, patient, source);

    let ch = supabase.channel("doctor_topbar_v3");
    ch = ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "soap_consultations" }, ({ new: row }) => {
      const r = row as Record<string, unknown>;
      if ((r.status as string) !== "waiting") return;
      const pid = r.patient_id as string; if (!pid) return;
      supabase.from("patients").select("first_name, last_name").eq("id", pid).maybeSingle()
        .then(({ data }) => {
          const patient = data ? `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() : `Patient ID ${pid}`;
          notify("new_patient", "Patient added to today's queue", patient, "soap_consultations");
        });
    });
    for (const table of LAB_RESULT_TABLES) {
      ch = ch.on("postgres_changes", { event: "INSERT", schema: "public", table }, ({ new: row }) => {
        const label = LAB_RESULT_LABELS[table] ?? table;
        notify("lab_result", `Lab result ready — ${label}`, resolvePatient(row as Record<string, unknown>), table);
      });
    }
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!showNotifPanel) return;
    const h = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node))
        setShowNotifPanel(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showNotifPanel]);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markOneRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const dismissOne  = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setNotifications(prev => prev.filter(n => n.id !== id)); };
  const clearAll    = () => { setNotifications([]); setShowNotifPanel(false); };

  return (
    <>
      <header style={{
        background: "#0d3b1f", height: 64,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px", flexShrink: 0,
        boxShadow: "0 1px 8px rgba(0,0,0,0.30)",
        gap: 16, zIndex: 50,
      }}>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => onSearchChange(e.target.value)}
            placeholder="Search patients, medicines…"
            style={{
              width: "100%", background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.14)", borderRadius: 50,
              padding: "9px 18px 9px 40px", color: "#fff", fontSize: 13,
              outline: "none", fontFamily: "DM Sans, sans-serif",
              boxSizing: "border-box", transition: "border 0.2s",
            }}
            onFocus={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.50)")}
            onBlur={e  => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)")}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

          {/* ── Notification bell ── */}
          <div ref={notifPanelRef} style={{ position: "relative" }}>
            <button
              style={{ ...ICON_BTN, animation: hasNew ? "bellShake 0.4s ease infinite alternate" : "none" }}
              onClick={() => { const opening = !showNotifPanel; setShowNotifPanel(opening); if (opening) markAllRead(); }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  minWidth: 17, height: 17, padding: "0 3px", borderRadius: 9,
                  background: "#ef4444", border: "2px solid #0d3b1f",
                  color: "#fff", fontSize: 9, fontWeight: 800, lineHeight: "13px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "DM Sans, sans-serif", boxSizing: "content-box",
                }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </button>

            {showNotifPanel && (
              <div style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0,
                width: 350, maxHeight: 520, background: "#fff",
                border: "1px solid rgba(22,163,74,0.15)", borderRadius: 14,
                boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
                zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "linear-gradient(135deg, #0d3b1f, #1a6b35)", color: "#fff", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14 }}>Notifications</span>
                    {notifications.length > 0 && (
                      <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{notifications.length}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button title={soundEnabled?"Mute":"Unmute"} onClick={() => setSoundEnabled(s=>!s)}
                      style={{ background: soundEnabled?"rgba(255,255,255,0.18)":"rgba(239,68,68,0.45)", border:"none", color:"#fff", width:28, height:28, borderRadius:7, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s", flexShrink:0 }}>
                      {soundEnabled ? "🔔" : "🔕"}
                    </button>
                    {notifications.length > 0 && <button onClick={clearAll} style={PANEL_BTN}>Clear all</button>}
                    <button onClick={() => setShowNotifPanel(false)} style={{ ...PANEL_BTN, width:26, height:26, padding:0, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                  </div>
                </div>

                <div style={{ display:"flex", gap:6, padding:"8px 14px", borderBottom:"1px solid #f3f4f6", flexShrink:0, background:"#fafafa" }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, background:"rgba(245,158,11,0.12)", color:"#f59e0b", fontFamily:"DM Sans, sans-serif" }}>🧪 Lab Results</span>
                  <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, background:"rgba(22,163,74,0.10)", color:"#16a34a", fontFamily:"DM Sans, sans-serif" }}>👤 Queue Updates</span>
                </div>

                <div style={{ overflowY:"auto", flex:1 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding:"40px 20px", textAlign:"center", color:"#9ca3af" }}>
                      <div style={{ fontSize:40, marginBottom:10 }}>🔔</div>
                      <div style={{ fontSize:13, fontWeight:600, fontFamily:"DM Sans, sans-serif" }}>No notifications yet</div>
                      <div style={{ fontSize:11, marginTop:4, fontFamily:"DM Sans, sans-serif" }}>Lab results & queue updates will appear here</div>
                    </div>
                  ) : notifications.map((n, i) => (
                    <div key={n.id} onClick={() => markOneRead(n.id)}
                      style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 14px", borderBottom:i<notifications.length-1?"1px solid #f3f4f6":"none", background:n.isNew?`${notifAccent(n.type)}10`:n.read?"transparent":`${notifAccent(n.type)}07`, cursor:"pointer", transition:"background 0.15s" }}
                      onMouseEnter={e=>(e.currentTarget.style.background=`${notifAccent(n.type)}18`)}
                      onMouseLeave={e=>(e.currentTarget.style.background=n.isNew?`${notifAccent(n.type)}10`:n.read?"transparent":`${notifAccent(n.type)}07`)}
                    >
                      <div style={{ marginTop:6, flexShrink:0 }}>
                        {n.isNew?<div style={{ width:10, height:10, borderRadius:"50%", background:notifAccent(n.type), boxShadow:`0 0 0 3px ${notifAccent(n.type)}33`, animation:"pulse 1s ease infinite" }}/>
                          :!n.read?<div style={{ width:8, height:8, borderRadius:"50%", background:notifAccent(n.type) }}/>
                          :<div style={{ width:8, height:8, borderRadius:"50%", background:"#e5e7eb" }}/>}
                      </div>
                      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:`${notifAccent(n.type)}18`, border:`1.5px solid ${notifAccent(n.type)}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                        {notifIcon(n.type)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:n.read?600:800, margin:0, color:"#1a1a1a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"DM Sans, sans-serif" }}>{n.message}</p>
                        <p style={{ fontSize:11, margin:"2px 0 0", color:"#4b5563", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"DM Sans, sans-serif" }}>Patient: {n.patient}</p>
                        <p style={{ fontSize:10, margin:"2px 0 0", color:"#9ca3af", fontFamily:"DM Sans, sans-serif" }}>{timeAgo(n.timestamp)}</p>
                        {n.isNew && <div style={{ marginTop:4, display:"inline-flex", alignItems:"center", gap:4, background:`${notifAccent(n.type)}22`, color:notifAccent(n.type), fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, letterSpacing:.5, fontFamily:"DM Sans, sans-serif" }}>● NEW</div>}
                      </div>
                      <button onClick={e=>dismissOne(n.id,e)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:16, padding:"0 2px", lineHeight:1, flexShrink:0, marginTop:2 }}
                        onMouseEnter={e=>(e.currentTarget.style.color="#dc2626")}
                        onMouseLeave={e=>(e.currentTarget.style.color="#9ca3af")}>×</button>
                    </div>
                  ))}
                </div>

                {hasLabResult && (
                  <div style={{ padding:"10px 14px", borderTop:"1px solid #f3f4f6", flexShrink:0, background:"#fafafa" }}>
                    <button onClick={() => { onViewLabResults?.(); setShowNotifPanel(false); }}
                      style={{ width:"100%", padding:"9px 0", background:"linear-gradient(135deg, #0d3b1f, #1a6b35)", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"DM Sans, sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                      🧪 View Lab Results
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Dark mode toggle ── */}
          <button title={dark?"Light mode":"Dark mode"} onClick={toggleDark} style={ICON_BTN}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.18)")}
            onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,0.10)")}>
            {dark?(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ):(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
          </button>

          {/* ── Avatar chip with dropdown ── */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfile(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                background: showProfile ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.12)",
                borderRadius: 50, padding: "5px 12px 5px 5px",
                cursor: "pointer", border: "1px solid rgba(255,255,255,0.14)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.20)")}
              onMouseLeave={e=>{if(!showProfile)e.currentTarget.style.background="rgba(255,255,255,0.12)";}}
            >
              {/* Avatar */}
              <div style={{ width:34, height:34, borderRadius:"50%", overflow:"hidden", flexShrink:0, border:"2px solid rgba(255,255,255,0.3)", background:"linear-gradient(135deg,#2ea82e,#1a7a1a)" }}>
                {liveAvatar ? (
                  <img src={liveAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={()=>setLiveAvatar(null)}/>
                ) : (
                  <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:13, fontFamily:"DM Sans, sans-serif" }}>{displayInitial}</div>
                )}
              </div>
              <div style={{ textAlign:"left" }}>
                <div style={{ color:"#fff", fontWeight:600, fontSize:13, lineHeight:1.2, whiteSpace:"nowrap", fontFamily:"DM Sans, sans-serif" }}>{displayName}</div>
                <div style={{ color:"rgba(255,255,255,0.55)", fontSize:10, textTransform:"uppercase", letterSpacing:.5, fontFamily:"DM Sans, sans-serif" }}>{displayRole}</div>
              </div>
              {/* Chevron */}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
                style={{ marginLeft:2, transition:"transform .2s", transform:showProfile?"rotate(180deg)":"rotate(0deg)" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* ── Profile Dropdown ── */}
            {showProfile && (
              <div style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0,
                width: 260, background: "#fff",
                borderRadius: 14, overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
                border: "1px solid rgba(0,0,0,0.06)",
                zIndex: 9999,
              }}>
                {/* User info header */}
                <div style={{ background: "linear-gradient(135deg,#0d3b1f,#1a6b35)", padding: "18px 18px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:48, height:48, borderRadius:"50%", overflow:"hidden", flexShrink:0, border:"2.5px solid rgba(255,255,255,0.4)", background:"linear-gradient(135deg,#2ea82e,#1a7a1a)" }}>
                      {liveAvatar ? (
                        <img src={liveAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={()=>setLiveAvatar(null)}/>
                      ) : (
                        <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:18, fontFamily:"DM Sans, sans-serif" }}>{displayInitial}</div>
                      )}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ color:"#fff", fontWeight:700, fontSize:14, fontFamily:"Syne, sans-serif", letterSpacing:"-.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayName}</div>
                      <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, textTransform:"uppercase", letterSpacing:.04, fontFamily:"DM Sans, sans-serif", marginTop:2 }}>{displayRole}</div>
                      {liveEmail && <div style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontFamily:"DM Sans, sans-serif", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{liveEmail}</div>}
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div style={{ padding: "8px 0" }}>
                  {[
                    { icon:"👤", label:"My Profile",       onClick:()=>{ setShowProfile(false); router.push("/doctor/settings"); } },
                    { icon:"🔒", label:"Change Password",  onClick:()=>{ setShowProfile(false); router.push("/doctor/settings?tab=password"); } },
                    { icon:"⚙️", label:"Settings",         onClick:()=>{ setShowProfile(false); router.push("/doctor/settings"); } },
                  ].map(item=>(
                    <button key={item.label} onClick={item.onClick}
                      style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"11px 18px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"DM Sans, sans-serif", transition:"background .12s", textAlign:"left" as any }}
                      onMouseEnter={e=>(e.currentTarget.style.background="#f0fdf4")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                    >
                      <span style={{ fontSize:16, width:22, textAlign:"center" as any }}>{item.icon}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:"#1f2937" }}>{item.label}</span>
                    </button>
                  ))}

                  <div style={{ height:1, background:"#f3f4f6", margin:"6px 0" }}/>

                  {/* Logout */}
                  <button onClick={()=>{ setShowProfile(false); onLogout?.(); }}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"11px 18px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"DM Sans, sans-serif", transition:"background .12s", textAlign:"left" as any }}
                    onMouseEnter={e=>{e.currentTarget.style.background="#fff5f5";(e.currentTarget.querySelector("span:last-child") as HTMLElement).style.color="#dc2626";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";(e.currentTarget.querySelector("span:last-child") as HTMLElement).style.color="#dc2626";}}
                  >
                    <span style={{ fontSize:16, width:22, textAlign:"center" as any }}>🚪</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#dc2626", transition:"color .12s" }}>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <style>{`
        @keyframes bellShake { 0%{transform:rotate(-12deg)}100%{transform:rotate(12deg)} }
        @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(22,163,74,0.5)}100%{box-shadow:0 0 0 8px rgba(22,163,74,0)} }
      `}</style>
    </>
  );
}