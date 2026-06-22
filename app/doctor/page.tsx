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
import AnalyticsModal from "../components/AnalyticsModal";
import SendVaccineToNurseModal from "../components/SendVaccineToNurseModal";


type ActiveModal = "presc" | "lab" | "soap" | "vaccine" | null;

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
  const [labResultId,    setLabResultId]    = useState<string | null>(null);
  const [search,         setSearch]         = useState("");

  // ── Analytics modal state ─────────────────────────────────────────────────
// ── Analytics modal state ─────────────────────────────────────────────────
  type AnalyticsType = "consultations" | "prescriptions" | "labRequests" | null;
  const [analyticsType, setAnalyticsType] = useState<AnalyticsType>(null);

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Nunito', sans-serif", color: "#4b6557" }}>
      Loading…
    </div>
  );
  if (!user) return null;

  function closeModal()                     { setActiveModal(null); }
  function handleConsult(entry: QueueEntry) { setCurrentEntry(entry); setActiveModal("soap"); }
  function openPresc()                      { setActiveModal("presc"); }
  function openLab()                        { setActiveModal("lab"); }

  // ── Buksan ang SoapModal galing sa patient notification ──────────────────────
  // Tinatawag ng DoctorTopbar pag-click ng patient sa Queue notifications.
  // Kinukuha muna ang demographics (age/sex/address) para kumpleto ang header,
  // ginagawang QueueEntry, tapos binubuksan ang SOAP modal — kapareho ng
  // nangyayari kapag pinindot ang "Consult" sa PendingPatients.
  async function openSoapFromNotif(
    consultationId: string,
    patientId: string,
    patientName: string,
  ) {
    const { data: p } = await supabase
      .from("patients")
      .select("first_name, last_name, age, sex, purok, barangay, municipality, civil_status")
      .eq("id", patientId)
      .maybeSingle();

    const entry = {
      queueId:   consultationId, // = soap_consultations.id (binabasa ito ng loadAll)
      patientId,
      name:   p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : patientName,
      age:    p?.age != null ? String(p.age) : "",
      gender: p?.sex === "F" ? "Female" : p?.sex === "M" ? "Male" : "",
      civil:  p?.civil_status ?? "",
      addr:   p ? [p.purok, p.barangay, p.municipality].filter(Boolean).join(", ") : "",
      time:   "",
    } as unknown as QueueEntry;

    setCurrentEntry(entry);
    setActiveModal("soap");
  }

  const modalPatient = currentEntry
    ? {
        id: "",
        name: currentEntry.name,
        age: String(currentEntry.age ?? ""),
        gender: currentEntry.gender,
        civil: currentEntry.civil,
        addr: currentEntry.addr,
        time: currentEntry.time,
        status: "waiting" as const,
      }
    : null;

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  // ── Stat cards config (gradient green, katulad ng Analytics cards) ────────
  const statCards = [
    { key: "consultations" as const, label: "Consultations", value: stats.consultations, icon: "🩺" },
    { key: "prescriptions" as const, label: "Prescriptions", value: stats.prescriptions, icon: "💊" },
    { key: "labRequests"   as const, label: "Lab Requests",  value: stats.labRequests,   icon: "🧪" },
  ];

  const todayLabel = new Date().toLocaleDateString("en-PH", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <div ref={rootRef} className={styles.root}>
      <DoctorSidebar
        onViewLabResults={() => { setLabResultId(null); setShowLabResults(true); }}
      />

      <div className={styles.mainArea}>

        <DoctorTopbar
          rootRef={rootRef}
          dark={dark}
          onToggleDark={toggleDark}
          user={{ name: user.name, initials: user.initials, role: roleLabel }}
          onViewLabResults={(id) => { setLabResultId(id ?? null); setShowLabResults(true); }}
          onOpenPatient={openSoapFromNotif}
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
                  onClick={() => { setCurrentEntry(null); setActiveModal("vaccine"); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2l4 4M17 7l-3-3M9.5 8.5l6 6M14 12l-7.5 7.5a2.12 2.12 0 01-3-3L11 9M16 6l2 2"/></svg>
                  Send to Nurse
                </button>
              </div>
            </div>

            {/* Row 1: Big Stats Cards — gradient green, katulad ng Analytics cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              {statCards.map((item) => (
                <div
                  key={item.key}
                  onClick={() => setAnalyticsType(item.key)}
                  style={{
                    position: "relative",
                    background: "linear-gradient(135deg, #16a34a 0%, #0d3b1f 100%)",
                    borderRadius: 14,
                    padding: "18px 20px",
                    minHeight: "100px",
                    color: "#ffffff",
                    boxShadow: "0 8px 22px rgba(13,59,31,0.35)",
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "transform .18s ease, box-shadow .18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 12px 28px rgba(13,59,31,0.45)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 8px 22px rgba(13,59,31,0.35)";
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      opacity: 0.85,
                      marginBottom: 10,
                    }}
                  >
                    {item.label}
                  </div>

                  <div style={{ fontSize: "2.6rem", fontWeight: 800, lineHeight: 1 }}>
                    {item.value}
                  </div>

                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
                    {todayLabel}
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      right: 14,
                      bottom: 10,
                      fontSize: 38,
                      opacity: 0.18,
                    }}
                  >
                    {item.icon}
                  </div>
                </div>
              ))}
            </div>
{/* palitan ng */}
<div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
  <div className={styles.diseaseScrollWrap} style={{ flex: 1, minWidth: 0 }}>
    <DiseasePrediction />
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
      <LabRequestModal   open={activeModal === "lab"}   patient={modalPatient} doctorName={user.name} onClose={closeModal} onSend={closeModal} />
      <LabResultsModal   open={showLabResults} initialRecordId={labResultId} onClose={() => { setShowLabResults(false); setLabResultId(null); }} />

      <SendVaccineToNurseModal
        open={activeModal === "vaccine"}
        onClose={closeModal}
        onSent={closeModal}
      />

      <AnalyticsModal
        open={analyticsType !== null}
        type={analyticsType}
        dailyCount={
          analyticsType === "consultations" ? stats.consultations :
          analyticsType === "prescriptions" ? stats.prescriptions :
          analyticsType === "labRequests"   ? stats.labRequests   : 0
        }
        onClose={() => setAnalyticsType(null)}
      />
    </div>
  );
}