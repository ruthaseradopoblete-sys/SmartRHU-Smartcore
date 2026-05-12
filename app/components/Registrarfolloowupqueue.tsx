"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────
interface FollowUpEntry {
  id: string;
  patient_id: string;
  consultation_id: string;
  follow_up_date: string;
  notes: string | null;
  status: "pending" | "arrived" | "done" | "missed";
  patient_name: string;
  patient_age: string;
  patient_gender: string;
  patient_addr: string;
  created_at: string;
}

type StatusFilter = "all" | "pending" | "arrived" | "done" | "missed";

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(iso); d.setHours(0,0,0,0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function countdownLabel(iso: string): { label: string; color: string; bg: string } {
  const d = daysUntil(iso);
  if (d === 0)  return { label:"Today",        color:"#166534", bg:"#dcfce7" };
  if (d === 1)  return { label:"Tomorrow",     color:"#1e40af", bg:"#dbeafe" };
  if (d > 1)    return { label:`In ${d} days`, color:"#854d0e", bg:"#fef9c3" };
  if (d === -1) return { label:"Yesterday",    color:"#7e22ce", bg:"#fae8ff" };
  return               { label:`${Math.abs(d)}d ago`, color:"#6b7280", bg:"#f3f4f6" };
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
}

// ── Component ──────────────────────────────────────────────
export default function RegistrarFollowUpQueue() {
  const [entries,    setEntries]    = useState<FollowUpEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<StatusFilter>("all");
  const [search,     setSearch]     = useState("");
  const [updating,   setUpdating]   = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("follow_up_schedules")
      .select("*")
      .order("follow_up_date", { ascending: true });

    const rows = (data ?? []) as FollowUpEntry[];
    setEntries(rows);
    setTodayCount(rows.filter(r => r.follow_up_date === today && r.status === "pending").length);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    fetchEntries();

    // Realtime subscription
    const channel = supabase.channel("follow_up_realtime")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "follow_up_schedules",
      }, () => fetchEntries())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchEntries]);

  async function markStatus(id: string, status: FollowUpEntry["status"]) {
    setUpdating(id);
    await supabase.from("follow_up_schedules").update({ status }).eq("id", id);
    setUpdating(null);
    // Optimistic UI
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    setTodayCount(
      entries.filter(r => r.follow_up_date === today && r.status === "pending" && r.id !== id).length
    );
  }

  // ── Filter + Search ────────────────────────────────────
  const filtered = entries
    .filter(e => filter === "all" || e.status === filter)
    .filter(e => e.patient_name.toLowerCase().includes(search.toLowerCase()));

  // ── Group by date ──────────────────────────────────────
  const grouped: Record<string, FollowUpEntry[]> = {};
  filtered.forEach(e => {
    const key = e.follow_up_date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  const sortedDates = Object.keys(grouped).sort();

  const STATUS_CONFIG: Record<FollowUpEntry["status"], { label:string; color:string; bg:string }> = {
    pending:  { label:"Pending",  color:"#854d0e", bg:"#fef9c3" },
    arrived:  { label:"Arrived",  color:"#1e40af", bg:"#dbeafe" },
    done:     { label:"Done",     color:"#166534", bg:"#dcfce7" },
    missed:   { label:"Missed",   color:"#991b1b", bg:"#fee2e2" },
  };

  const FILTER_OPTIONS: { label:string; value:StatusFilter }[] = [
    { label:"All",     value:"all" },
    { label:"Pending", value:"pending" },
    { label:"Arrived", value:"arrived" },
    { label:"Done",    value:"done" },
    { label:"Missed",  value:"missed" },
  ];

  return (
    <div style={{
      fontFamily:"DM Sans,sans-serif",
      background:"#f0f7f2",
      minHeight:"100vh",
      padding:"28px 32px",
      color:"#0a2912",
    }}>

      {/* ── Header ── */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
        <div>
          <p style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:".12em",textTransform:"uppercase",marginBottom:4}}>
            Registrar
          </p>
          <h1 style={{fontFamily:"Syne,sans-serif",fontSize:28,fontWeight:900,color:"#0a2912",margin:0,letterSpacing:"-.02em"}}>
            Follow-up Queue
          </h1>
          <p style={{fontSize:13,color:"#4b6557",marginTop:6}}>
            Patients with scheduled follow-up checkups — no re-registration required.
          </p>
        </div>

        {/* Today's count badge */}
        {todayCount > 0 && (
          <div style={{
            background:"#0d3b1f",color:"#fff",
            borderRadius:14,padding:"14px 22px",
            textAlign:"center",minWidth:120,
          }}>
            <div style={{fontFamily:"Syne,sans-serif",fontSize:32,fontWeight:900,lineHeight:1}}>
              {todayCount}
            </div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginTop:4,opacity:.7}}>
              Due Today
            </div>
          </div>
        )}
      </div>

      {/* ── Search + Filter bar ── */}
      <div style={{
        display:"flex",gap:12,marginBottom:24,
        background:"#fff",borderRadius:14,
        border:"1.5px solid rgba(22,163,74,.15)",
        padding:"14px 18px",
        alignItems:"center",flexWrap:"wrap",
      }}>
        {/* Search */}
        <div style={{position:"relative",flex:1,minWidth:180}}>
          <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#9ca3af"}}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patient name…"
            style={{
              width:"100%",boxSizing:"border-box",
              background:"#f6faf7",border:"1.5px solid rgba(22,163,74,.15)",
              borderRadius:9,padding:"7px 12px 7px 30px",
              fontSize:12,color:"#0a2912",fontFamily:"DM Sans,sans-serif",outline:"none",
            }}
          />
        </div>

        {/* Status filters */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding:"6px 16px",borderRadius:20,
                border:`1.5px solid ${filter === f.value ? "#16a34a" : "rgba(22,163,74,.2)"}`,
                background: filter === f.value ? "#16a34a" : "#fff",
                color: filter === f.value ? "#fff" : "#4b6557",
                fontSize:12,fontWeight:600,
                fontFamily:"DM Sans,sans-serif",cursor:"pointer",transition:"all .15s",
              }}
            >
              {f.label}
              {f.value === "pending" && entries.filter(e => e.status === "pending").length > 0 && (
                <span style={{
                  marginLeft:6,background: filter === "pending" ? "rgba(255,255,255,.3)" : "#f59e0b",
                  color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:700,
                }}>
                  {entries.filter(e => e.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#9ca3af",fontSize:13}}>
          Loading follow-up schedules…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"80px 0"}}>
          <div style={{fontSize:52,opacity:.3,marginBottom:12}}>📅</div>
          <div style={{fontSize:15,fontWeight:600,color:"#4b6557"}}>No follow-up schedules found</div>
          <div style={{fontSize:13,color:"#9ca3af",marginTop:4}}>
            {filter !== "all" ? "Try a different filter" : "Doctor-scheduled follow-ups will appear here"}
          </div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:28}}>
          {sortedDates.map(dateKey => {
            const countdown = countdownLabel(dateKey);
            const isToday = dateKey === today;
            return (
              <div key={dateKey}>
                {/* Date group header */}
                <div style={{
                  display:"flex",alignItems:"center",gap:12,marginBottom:12,
                }}>
                  <div style={{
                    fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:14,
                    color: isToday ? "#0d3b1f" : "#0a2912",
                  }}>
                    {isToday ? "📌 Today — " : ""}{fmtDate(dateKey)}
                  </div>
                  <span style={{
                    fontSize:10,fontWeight:700,
                    padding:"2px 10px",borderRadius:10,
                    color:countdown.color,background:countdown.bg,
                  }}>
                    {countdown.label}
                  </span>
                  <div style={{flex:1,height:1,background:"rgba(22,163,74,.15)"}}/>
                  <span style={{fontSize:11,color:"#9ca3af"}}>{grouped[dateKey].length} patient{grouped[dateKey].length!==1?"s":""}</span>
                </div>

                {/* Cards */}
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {grouped[dateKey].map(entry => {
                    const sc = STATUS_CONFIG[entry.status];
                    const isUpdating = updating === entry.id;
                    return (
                      <div
                        key={entry.id}
                        style={{
                          background:"#fff",
                          borderRadius:14,
                          border:`1.5px solid ${entry.status === "arrived" ? "#93c5fd" : entry.status === "done" ? "#86efac" : "rgba(22,163,74,.15)"}`,
                          padding:"16px 20px",
                          display:"flex",alignItems:"center",gap:16,
                          boxShadow:"0 2px 12px rgba(13,59,31,.06)",
                          transition:"all .2s",
                          opacity: entry.status === "done" || entry.status === "missed" ? 0.75 : 1,
                        }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width:46,height:46,borderRadius:"50%",
                          background: entry.patient_gender?.toLowerCase().includes("f") ? "#fbcfe8" : "#bfdbfe",
                          color: entry.patient_gender?.toLowerCase().includes("f") ? "#9d174d" : "#1e40af",
                          fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:14,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          flexShrink:0,
                        }}>
                          {initials(entry.patient_name)}
                        </div>

                        {/* Patient info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:14,color:"#0a2912",marginBottom:2}}>
                            {entry.patient_name}
                          </div>
                          <div style={{fontSize:11,color:"#9ca3af",display:"flex",gap:10,flexWrap:"wrap"}}>
                            {entry.patient_age && <span>🕐 {entry.patient_age}y</span>}
                            {entry.patient_gender && <span>👤 {entry.patient_gender}</span>}
                            {entry.patient_addr && <span>📍 {entry.patient_addr}</span>}
                          </div>
                          {entry.notes && (
                            <div style={{
                              marginTop:6,fontSize:12,color:"#854d0e",
                              background:"#fffbeb",border:"1px solid #fde68a",
                              borderRadius:6,padding:"4px 10px",display:"inline-block",
                            }}>
                              📋 {entry.notes}
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        <div style={{
                          fontSize:10,fontWeight:700,
                          padding:"3px 12px",borderRadius:20,
                          color:sc.color,background:sc.bg,
                          textTransform:"uppercase",letterSpacing:".06em",
                          flexShrink:0,
                        }}>
                          {sc.label}
                        </div>

                        {/* Action buttons */}
                        <div style={{display:"flex",gap:6,flexShrink:0}}>
                          {entry.status === "pending" && (
                            <>
                              <button
                                disabled={isUpdating}
                                onClick={() => markStatus(entry.id, "arrived")}
                                style={{
                                  padding:"7px 16px",borderRadius:9,
                                  background:"#0d3b1f",color:"#fff",
                                  border:"none",fontSize:11,fontWeight:700,
                                  fontFamily:"DM Sans,sans-serif",cursor:"pointer",
                                  transition:"all .15s",opacity:isUpdating?.5:1,
                                }}
                                onMouseOver={e => { e.currentTarget.style.background="#16a34a"; }}
                                onMouseOut={e => { e.currentTarget.style.background="#0d3b1f"; }}
                              >
                                {isUpdating ? "…" : "✓ Arrived"}
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => markStatus(entry.id, "missed")}
                                style={{
                                  padding:"7px 14px",borderRadius:9,
                                  background:"transparent",color:"#9ca3af",
                                  border:"1.5px solid #e5e7eb",
                                  fontSize:11,fontWeight:600,
                                  fontFamily:"DM Sans,sans-serif",cursor:"pointer",transition:"all .15s",
                                }}
                                onMouseOver={e => { e.currentTarget.style.color="#ef4444"; e.currentTarget.style.borderColor="#fca5a5"; }}
                                onMouseOut={e => { e.currentTarget.style.color="#9ca3af"; e.currentTarget.style.borderColor="#e5e7eb"; }}
                              >
                                Missed
                              </button>
                            </>
                          )}
                          {entry.status === "arrived" && (
                            <button
                              disabled={isUpdating}
                              onClick={() => markStatus(entry.id, "done")}
                              style={{
                                padding:"7px 16px",borderRadius:9,
                                background:"#16a34a",color:"#fff",
                                border:"none",fontSize:11,fontWeight:700,
                                fontFamily:"DM Sans,sans-serif",cursor:"pointer",transition:"all .15s",
                              }}
                            >
                              {isUpdating ? "…" : "Mark Done"}
                            </button>
                          )}
                          {(entry.status === "done" || entry.status === "missed") && (
                            <button
                              disabled={isUpdating}
                              onClick={() => markStatus(entry.id, "pending")}
                              style={{
                                padding:"7px 14px",borderRadius:9,
                                background:"transparent",color:"#9ca3af",
                                border:"1.5px solid #e5e7eb",
                                fontSize:11,fontWeight:600,
                                fontFamily:"DM Sans,sans-serif",cursor:"pointer",
                              }}
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}