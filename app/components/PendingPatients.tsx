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

interface AllPatient {
  id:         string;
  name:       string;
  age:        string;
  gender:     string;
  addr:       string;
  lastStatus: "waiting" | "done" | null;
}

interface Props {
  onConsult: (entry: QueueEntry) => void;
}

type Tab = "queue" | "all";

export default function PendingPatients({ onConsult }: Props) {
  const [tab,         setTab]         = useState<Tab>("queue");
  const [queue,       setQueue]       = useState<QueueEntry[]>([]);
  const [allPatients, setAllPatients] = useState<AllPatient[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");

  // ── Fetch TODAY's queue (filtered by queue_date = today) ──
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const { data: consultRows, error } = await supabase
      .from("soap_consultations")
      .select("id, status, created_at, patient_id, queue_number")
      .eq("queue_date", today)          // ← only today's entries
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
          queueNumber: row.queue_number,
          name:        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
          age:         p.age != null ? String(p.age) : "",
          gender:      p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : "",
          civil:       "",
          addr:        [p.purok, p.barangay, p.municipality].filter(Boolean).join(", "),
          time:        new Date(row.created_at).toLocaleTimeString("en-PH", { hour:"2-digit", minute:"2-digit" }),
          status:      row.status === "done" ? "done" : "waiting",
        } as QueueEntry;
      })
      .filter(Boolean) as QueueEntry[];

    setQueue(entries);
    setLoading(false);
  }, []);

  // ── Fetch ALL patients with their latest consultation status ──
  const fetchAllPatients = useCallback(async () => {
    const { data: pData, error } = await supabase
      .from("patients")
      .select("id, first_name, last_name, age, sex, purok, barangay, municipality")
      .order("last_name", { ascending: true });

    if (error) { console.error(error); return; }

    // Get latest consultation status per patient
    const { data: consultData } = await supabase
      .from("soap_consultations")
      .select("patient_id, status")
      .order("created_at", { ascending: false });

    const statusMap: Record<string, "waiting" | "done"> = {};
    (consultData ?? []).forEach((c: any) => {
      if (!statusMap[c.patient_id]) statusMap[c.patient_id] = c.status;
    });

    const mapped: AllPatient[] = (pData ?? []).map((p: any) => ({
      id:         p.id,
      name:       `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      age:        p.age != null ? String(p.age) : "",
      gender:     p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : "",
      addr:       [p.purok, p.barangay, p.municipality].filter(Boolean).join(", "),
      lastStatus: statusMap[p.id] ?? null,
    }));

    setAllPatients(mapped);
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchAllPatients();

    const channel = supabase
      .channel("pending_patients_realtime")
      .on("postgres_changes", { event:"*", schema:"public", table:"soap_consultations" }, () => {
        fetchQueue();
        fetchAllPatients();
      })
      .on("postgres_changes", { event:"*", schema:"public", table:"patients" }, () => {
        fetchAllPatients();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchQueue, fetchAllPatients]);

  async function handleCancel(queueId: string) {
    const { error } = await supabase
      .from("soap_consultations").delete().eq("id", queueId);
    if (error) { alert(`❌ Failed to remove: ${error.message}`); return; }
    fetchQueue();
  }

  // Add from All Patients → today's queue
  async function addToQueue(p: AllPatient) {
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("soap_consultations")
      .select("id").eq("patient_id", p.id).eq("queue_date", today).maybeSingle();

    if (existing) {
      alert(`${p.name} is already in today's queue.`);
      setTab("queue");
      return;
    }

    const { error } = await supabase
      .from("soap_consultations")
      .insert({ patient_id: p.id, consultation_date: today, queue_date: today, status: "waiting" });

    if (error) { alert(`❌ Failed to add to queue:\n${error.message}`); return; }

    await fetchQueue();
    setTab("queue");
  }

  // Quick consult from All Patients
  async function quickConsult(p: AllPatient) {
    const today = new Date().toISOString().split("T")[0];

    let { data: existing } = await supabase
      .from("soap_consultations")
      .select("id, queue_number")
      .eq("patient_id", p.id).eq("queue_date", today).maybeSingle();

    if (!existing) {
      const { data: newEntry, error } = await supabase
        .from("soap_consultations")
        .insert({ patient_id: p.id, consultation_date: today, queue_date: today, status: "waiting" })
        .select("id, queue_number").single();
      if (error || !newEntry) { alert(`❌ ${error?.message}`); return; }
      existing = newEntry;
    }

    await fetchQueue();
    onConsult({
      queueId:     existing.id,
      patientId:   p.id,
      queueNumber: existing.queue_number,
      name:        p.name,
      age:         p.age,
      gender:      p.gender,
      civil:       "",
      addr:        p.addr,
      time:        new Date().toLocaleTimeString("en-PH", { hour:"2-digit", minute:"2-digit" }),
      status:      "waiting",
    });
  }

  const waitingCount = queue.filter(q => q.status === "waiting").length;
  const filteredPatients = allPatients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`${styles.card} ${styles.pendingCard}`}>

      {/* Header */}
      <div className={styles.pendingHeader}>
        <h3 className={styles.pendingTitle}>Patients</h3>
        <span className={styles.pendingCount}>
          {tab === "queue" ? waitingCount : allPatients.length}
        </span>
      </div>

      {/* Tabs */}
      <div style={{display:"flex", borderBottom:"1px solid var(--border)", flexShrink:0}}>
        {([["queue","Today's Queue"],["all","All Patients"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setSearch(""); }}
            style={{
              flex:1, padding:"9px 0", border:"none", background:"transparent",
              fontSize:12, fontWeight:700, cursor:"pointer",
              fontFamily:"DM Sans,sans-serif",
              color: tab===t ? "var(--green)" : "var(--text3)",
              borderBottom: tab===t ? "2px solid var(--green)" : "2px solid transparent",
              transition:"all .15s",
            }}>
            {label}
          </button>
        ))}
      </div>



      {/* Search — all patients tab only */}
      {tab === "all" && (
        <div style={{padding:"8px 10px", flexShrink:0}}>
          <div style={{position:"relative"}}>
            <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text3)"}}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              style={{width:"100%",background:"var(--surface2)",border:"1.5px solid var(--border)",borderRadius:9,padding:"7px 12px 7px 30px",fontSize:12,color:"var(--text)",outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box"}}
              placeholder="Search patients…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── TODAY'S QUEUE ── */}
      {tab === "queue" && (
        <div className={styles.pendingList}>
          {loading && <div className={styles.emptyState}>Loading queue…</div>}
          {!loading && queue.length === 0 && (
            <div className={styles.emptyState}>No patients in queue today.</div>
          )}
          {!loading && queue.map((p) => (
            <div key={p.queueId}
              className={`${styles.pendingItem}${p.status==="done" ? " "+styles.pendingDone : ""}`}>
              <div className={styles.pendingItemTop}>
                {/* Queue number from DB */}
                <div style={{
                  width:28, height:28, borderRadius:"50%",
                  background: p.status==="done" ? "#9ca3af" : "var(--green)",
                  color:"#fff", fontSize:11, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                }}>
                  {p.queueNumber}
                </div>
                <div className={styles.pendingInfo}>
                  <div className={styles.pendingName}>{p.name}</div>
                  <div className={styles.pendingTime}>
                    {p.time}{p.age ? ` · ${p.age} yrs` : ""}{p.gender ? ` · ${p.gender}` : ""}
                  </div>
                </div>
                <span className={`${styles.statusPill} ${p.status==="done" ? styles.statusDone : styles.statusWaiting}`}>
                  {p.status==="done" ? "Done" : "Waiting"}
                </span>
              </div>
              {p.status !== "done" && (
                <div className={styles.pendingBtns}>
                  <button className={`${styles.pBtn} ${styles.pBtnCancel}`} onClick={() => handleCancel(p.queueId)}>
                    ✕ CANCEL
                  </button>
                  <button className={`${styles.pBtn} ${styles.pBtnConsult}`} onClick={() => onConsult(p)}>
                    ✓ CONSULT
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ALL PATIENTS ── */}
      {tab === "all" && (
        <div className={styles.pendingList}>
          {filteredPatients.length === 0 && (
            <div className={styles.emptyState}>
              {search ? `No patients found for "${search}"` : "No patients registered yet."}
            </div>
          )}
          {filteredPatients.map(p => (
            <div key={p.id} className={styles.pendingItem}
              style={{background: p.lastStatus==="done" ? "var(--surface2)" : "var(--green-light)"}}>
              <div className={styles.pendingItemTop}>
                <div style={{
                  width:32, height:32, borderRadius:"50%",
                  background: p.gender==="Female" ? "#ec4899" : "#3b82f6",
                  color:"#fff", fontSize:11, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                }}>
                  {p.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div className={styles.pendingInfo}>
                  <div className={styles.pendingName}>{p.name}</div>
                  <div className={styles.pendingTime}>
                    {p.age ? `${p.age} yrs` : ""}
                    {p.gender ? ` · ${p.gender}` : ""}
                    {p.addr  ? ` · ${p.addr}`  : ""}
                  </div>
                </div>
                {/* Show done badge if last consultation was done */}
                {p.lastStatus && (
                  <span className={`${styles.statusPill} ${p.lastStatus==="done" ? styles.statusDone : styles.statusWaiting}`}>
                    {p.lastStatus==="done" ? "Done" : "Waiting"}
                  </span>
                )}
              </div>
              <div className={styles.pendingBtns}>
                <button className={`${styles.pBtn} ${styles.pBtnCancel}`}
                  style={{background:"var(--green-light)",color:"var(--green)"}}
                  onClick={() => addToQueue(p)}>
                  + Add to Queue
                </button>
                <button className={`${styles.pBtn} ${styles.pBtnConsult}`}
                  onClick={() => quickConsult(p)}>
                  ✓ CONSULT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}