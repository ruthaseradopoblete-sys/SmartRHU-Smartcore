"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "../styles/dashboard.module.css";
import DoctorSidebar from "../components/DoctorSidebar";
import DoctorTopbar from "../components/DoctorTopbar";
import PendingPatients, { QueueEntry } from "../components/PendingPatients";
import AiDictionary from "../components/AiDictionary";
import PrescriptionModal from "../components/PrescriptionModal";
import LabRequestModal from "../components/LabRequestModal";
import LabResultsModal from "../components/LabResultModal";
import SoapModal from "../components/SoapModal";
import MedicineStockCard from "../components/MedicineStockCard";
import { supabase } from "@/lib/supabase";
import DiseasePrediction from "../components/DiseasePrediction";
import { useDarkMode } from "@/lib/Usedarkmode";

type ActiveModal = "presc" | "lab" | "soap" | null;

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  const rootRef = useRef<HTMLDivElement>(null);
  const { dark, toggleDark } = useDarkMode(rootRef);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const [currentEntry,   setCurrentEntry]   = useState<QueueEntry | null>(null);
  const [activeModal,    setActiveModal]    = useState<ActiveModal>(null);
  const [showLabResults, setShowLabResults] = useState(false);
  const [search,         setSearch]         = useState("");

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    consultations: 0,
    prescriptions: 0,
    labRequests:   0,
  });

  async function fetchStats() {
    const todayStr = new Date().toISOString().split("T")[0];
    const [pRes, cRes, prescRes, labRes] = await Promise.all([
      supabase.from("patients").select("id", { count: "exact", head: true }),
      supabase
        .from("soap_consultations")
        .select("id", { count: "exact", head: true })
        .eq("status", "done")
        .eq("consultation_date", todayStr),
      supabase
        .from("prescriptions")
        .select("id", { count: "exact", head: true })
        .eq("prescription_date", todayStr),
      supabase
        .from("laboratory_requests")
        .select("id", { count: "exact", head: true })
        .eq("request_date", todayStr),
    ]);
    setStats({
      consultations: cRes.count     ?? 0,
      prescriptions: prescRes.count ?? 0,
      labRequests:   labRes.count   ?? 0,
    });
  }

  const fetchStatsRef = useRef(fetchStats);
  useEffect(() => { fetchStatsRef.current = fetchStats; });

  useEffect(() => {
    fetchStatsRef.current();
    const channel = supabase
      .channel("smartrhu_doctor_dashboard_stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "soap_consultations" },   () => fetchStatsRef.current())
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions" },         () => fetchStatsRef.current())
      .on("postgres_changes", { event: "*", schema: "public", table: "laboratory_requests" },   () => fetchStatsRef.current())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "patients" },         () => fetchStatsRef.current())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Calibre", color: "#4b6557" }}>
      Loading…
    </div>
  );
  if (!user) return null;

  function closeModal()                     { setActiveModal(null); }
  function handleConsult(entry: QueueEntry) { setCurrentEntry(entry); setActiveModal("soap"); }
  function openPresc()                      { setActiveModal("presc"); }
  function openLab()                        { setActiveModal("lab"); }

  const modalPatient = currentEntry
    ? { id: 0, name: currentEntry.name, age: currentEntry.age, gender: currentEntry.gender, civil: currentEntry.civil, addr: currentEntry.addr, time: currentEntry.time, status: "waiting" as const }
    : null;

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div ref={rootRef} className={styles.root}>
      <DoctorSidebar />

      <div className={styles.mainArea}>

        <DoctorTopbar
          rootRef={rootRef}
          dark={dark}
          onToggleDark={toggleDark}
          user={{ name: user.name, initials: user.initials, role: roleLabel }}
          search={search}
          onSearchChange={setSearch}
          onViewLabResults={() => setShowLabResults(true)}
          onLogout={handleLogout}
        />

        <div className={styles.content}>
          <div className={styles.contentMain}>

            <div className={styles.pageHeading}>
              <div>
                <h1 className={styles.pageTitle}>Dashboard</h1>
              </div>
              <div className={styles.headingActions}>
                <button
                  className={`${styles.actionBtn} ${styles.primary}`}
                  onClick={() => { setCurrentEntry(null); setActiveModal("presc"); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Send Prescription
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.outline}`}
                  onClick={() => { setCurrentEntry(null); setActiveModal("lab"); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
                  Send Lab Request
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.outline}`}
                  onClick={() => setShowLabResults(true)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
                  View Lab Results
                </button>
              </div>
            </div>

            {/* Row 1: Big Stats Cards — full width, 3 columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div
                className={`${styles.bigStatCard} ${styles.consultations}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 24px",
                  minHeight: "100px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "6px", lineHeight: 1 }}>🩺</div>
                <div style={{ fontSize: "2.2rem", fontWeight: 700, lineHeight: 1, marginBottom: "4px" }}>{stats.consultations}</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75 }}>Consultations</div>
              </div>
              <div
                className={`${styles.bigStatCard} ${styles.prescriptions}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 24px",
                  minHeight: "100px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "6px", lineHeight: 1 }}>💊</div>
                <div style={{ fontSize: "2.2rem", fontWeight: 700, lineHeight: 1, marginBottom: "4px" }}>{stats.prescriptions}</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75 }}>Prescriptions</div>
              </div>
              <div
                className={`${styles.bigStatCard} ${styles.labRequests}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 24px",
                  minHeight: "100px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "6px", lineHeight: 1 }}>🧪</div>
                <div style={{ fontSize: "2.2rem", fontWeight: 700, lineHeight: 1, marginBottom: "4px" }}>{stats.labRequests}</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75 }}>Lab Requests</div>
              </div>
            </div>

            {/* Row 2: Disease Prediction (left, flex-1) + Medicine Stock (right, fixed width) */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <DiseasePrediction />
              </div>
              <div style={{ minWidth: "320px", maxWidth: "360px" }}>
                <MedicineStockCard />
              </div>
            </div>

          </div>

          <div className={styles.contentRight}>
            <PendingPatients onConsult={handleConsult} />
            <AiDictionary />
          </div>
        </div>
      </div>

      <SoapModal        open={activeModal === "soap"} entry={currentEntry}  onClose={closeModal} onSave={closeModal} onOpenPresc={openPresc} onOpenLab={openLab} />
      <PrescriptionModal open={activeModal === "presc"} patient={modalPatient} onClose={closeModal} onSend={closeModal} />
      <LabRequestModal   open={activeModal === "lab"}   patient={modalPatient} onClose={closeModal} onSend={closeModal} />
      <LabResultsModal   open={showLabResults} onClose={() => setShowLabResults(false)} />
    </div>
  );
}