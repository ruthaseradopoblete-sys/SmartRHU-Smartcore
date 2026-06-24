"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import DiseasePrediction from "../components/DiseasePrediction";
import AnalyticsModal from "../components/AnalyticsModal";
import SendVaccineToNurseModal from "../components/SendVaccineToNurseModal";

import { supabase } from "@/lib/supabase";
import { useDarkMode } from "@/lib/Usedarkmode";

type ActiveModal = "presc" | "lab" | "soap" | "vaccine" | null;
type AnalyticsType = "consultations" | "prescriptions" | "labRequests" | null;

function getTodayPH() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
}

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  const rootRef = useRef<HTMLDivElement>(null);
  const { dark, toggleDark } = useDarkMode(rootRef);

  const [currentEntry, setCurrentEntry] = useState<QueueEntry | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [showLabResults, setShowLabResults] = useState(false);
  const [labResultId, setLabResultId] = useState<string | null>(null);
  const [analyticsType, setAnalyticsType] = useState<AnalyticsType>(null);

  const [stats, setStats] = useState({
    consultations: 0,
    prescriptions: 0,
    labRequests: 0,
  });

  const fetchStats = useCallback(async () => {
    const todayStr = getTodayPH();
    const start = `${todayStr}T00:00:00+08:00`;
    const end = `${todayStr}T23:59:59+08:00`;

    // ---- Consultations (today, done) ----
    const cRes = await supabase
      .from("soap_consultations")
      .select("id", { count: "exact", head: true })
      .eq("consultation_date", todayStr)
      .eq("status", "done")
      .is("archived_at", null);

    // ---- Prescriptions (today, by created_at) ----
    const prescRes = await supabase
      .from("prescriptions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", end);

    // ---- Lab Requests (today) ----
    // Bilangin sa DALAWANG paraan, tapos kunin ang mas malaki.
    // Gumagana ito kahit isa lang sa created_at o request_date ang naka-set
    // sa insert ng LabRequestModal.
    const { count: labCreatedCount, error: labCreatedErr } = await supabase
      .from("laboratory_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", end);

    const { count: labDateCount, error: labDateErr } = await supabase
      .from("laboratory_requests")
      .select("id", { count: "exact", head: true })
      .eq("request_date", todayStr);

    const labCount = Math.max(labCreatedCount ?? 0, labDateCount ?? 0);

    console.log("TODAY PH:", todayStr);
    console.log("consultations:", cRes.count, cRes.error);
    console.log("prescriptions:", prescRes.count, prescRes.error);
    console.log("lab by created_at:", labCreatedCount, labCreatedErr);
    console.log("lab by request_date:", labDateCount, labDateErr);
    console.log("lab final:", labCount);

    setStats({
      consultations: cRes.count ?? 0,
      prescriptions: prescRes.count ?? 0,
      labRequests: labCount,
    });
  }, []);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel("doctor_dashboard_today_stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "soap_consultations" },
        fetchStats
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prescriptions" },
        fetchStats
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "laboratory_requests" },
        fetchStats
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function closeModal() {
    setActiveModal(null);
  }

  function handleConsult(entry: QueueEntry) {
    setCurrentEntry(entry);
    setActiveModal("soap");
  }

  function openPresc() {
    setActiveModal("presc");
  }

  function openLab() {
    setActiveModal("lab");
  }

  async function openSoapFromNotif(
    consultationId: string,
    patientId: string,
    patientName: string
  ) {
    const { data: p } = await supabase
      .from("patients")
      .select(
        "first_name, last_name, age, sex, purok, barangay, municipality, civil_status"
      )
      .eq("id", patientId)
      .maybeSingle();

    const entry = {
      queueId: consultationId,
      patientId,
      name: p
        ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
        : patientName,
      age: p?.age != null ? String(p.age) : "",
      gender: p?.sex === "F" ? "Female" : p?.sex === "M" ? "Male" : "",
      civil: p?.civil_status ?? "",
      addr: p
        ? [p.purok, p.barangay, p.municipality].filter(Boolean).join(", ")
        : "",
      time: "",
    } as unknown as QueueEntry;

    setCurrentEntry(entry);
    setActiveModal("soap");
  }

  if (isLoading) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  if (!user) return null;

  const modalPatient = currentEntry
    ? {
        id: currentEntry.patientId,
        queueId: currentEntry.queueId,
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

  const statCards = [
    {
      key: "consultations" as const,
      label: "Consultations",
      value: stats.consultations,
      icon: "🩺",
    },
    {
      key: "prescriptions" as const,
      label: "Prescriptions",
      value: stats.prescriptions,
      icon: "💊",
    },
    {
      key: "labRequests" as const,
      label: "Lab Requests",
      value: stats.labRequests,
      icon: "🧪",
    },
  ];

  const todayLabel = new Date().toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <div ref={rootRef} className={styles.root}>
      <DoctorSidebar
        onViewLabResults={() => {
          setLabResultId(null);
          setShowLabResults(true);
        }}
      />

      <div className={styles.mainArea}>
        <DoctorTopbar
          rootRef={rootRef}
          dark={dark}
          onToggleDark={toggleDark}
          user={{
            name: user.name,
            initials: user.initials,
            role: roleLabel,
          }}
          onViewLabResults={(id) => {
            setLabResultId(id ?? null);
            setShowLabResults(true);
          }}
          onOpenPatient={openSoapFromNotif}
          onLogout={handleLogout}
        />

        <div className={styles.content}>
          <div className={styles.contentMain}>
            <div className={styles.pageHeading}>
              <h1 className={styles.pageTitle}>DASHBOARD</h1>

              <div className={styles.headingActions}>
                <button
                  className={`${styles.actionBtn} ${styles.primary}`}
                  onClick={() => {
                    setCurrentEntry(null);
                    setActiveModal("presc");
                  }}
                >
                  + Send Prescription
                </button>

                <button
                  className={`${styles.actionBtn} ${styles.outline}`}
                  onClick={() => {
                    setCurrentEntry(null);
                    setActiveModal("lab");
                  }}
                >
                  ⊞ Send Lab Request
                </button>

                <button
                  className={`${styles.actionBtn} ${styles.outline}`}
                  onClick={() => {
                    setCurrentEntry(null);
                    setActiveModal("vaccine");
                  }}
                >
                  ⌁ Send to Nurse
                </button>
              </div>
            </div>

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
                    background:
                      "linear-gradient(135deg, #16a34a 0%, #0d3b1f 100%)",
                    borderRadius: 14,
                    padding: "18px 20px",
                    minHeight: "100px",
                    color: "#ffffff",
                    boxShadow: "0 8px 22px rgba(13,59,31,0.35)",
                    overflow: "hidden",
                    cursor: "pointer",
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

                  <div
                    style={{
                      fontSize: "2.6rem",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
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

            <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
              <div
                className={styles.diseaseScrollWrap}
                style={{ flex: 1, minWidth: 0 }}
              >
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

      <SoapModal
        open={activeModal === "soap"}
        entry={currentEntry}
        onClose={closeModal}
        onSave={() => {
          closeModal();
          fetchStats();
        }}
        onOpenPresc={openPresc}
        onOpenLab={openLab}
      />

      <PrescriptionModal
        open={activeModal === "presc"}
        patient={modalPatient}
        onClose={closeModal}
        onSend={() => {
          closeModal();
          fetchStats();
        }}
      />

      <LabRequestModal
        open={activeModal === "lab"}
        patient={modalPatient}
        doctorName={user.name}
        onClose={closeModal}
        onSend={() => {
          closeModal();
          fetchStats();
        }}
      />

      <LabResultsModal
        open={showLabResults}
        initialRecordId={labResultId}
        onClose={() => {
          setShowLabResults(false);
          setLabResultId(null);
        }}
      />

      <SendVaccineToNurseModal
        open={activeModal === "vaccine"}
        onClose={closeModal}
        onSent={() => {
          closeModal();
          fetchStats();
        }}
      />

      <AnalyticsModal
        open={analyticsType !== null}
        type={analyticsType}
        dailyCount={
          analyticsType === "consultations"
            ? stats.consultations
            : analyticsType === "prescriptions"
            ? stats.prescriptions
            : analyticsType === "labRequests"
            ? stats.labRequests
            : 0
        }
        onClose={() => setAnalyticsType(null)}
      />
    </div>
  );
}