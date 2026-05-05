"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DISEASES, MONTHS } from "./data";
import styles from "../styles/dashboard.module.css";
import DoctorSidebar from "../components/DoctorSidebar";
import PendingPatients, { QueueEntry } from "../components/PendingPatients";
import AiDictionary from "../components/AiDictionary";
import PrescriptionModal from "../components/PrescriptionModal";
import LabRequestModal from "../components/LabRequestModal";
import LabResultsModal from "../components/LabResultModal";
import SoapModal from "../components/SoapModal";
import MedicineStockCard from "../components/MedicineStockCard";

type ActiveModal = "presc" | "lab" | "soap" | null;

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const today = new Date();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const [currentEntry,   setCurrentEntry]   = useState<QueueEntry | null>(null);
  const [activeModal,    setActiveModal]    = useState<ActiveModal>(null);
  const [showLabResults, setShowLabResults] = useState(false);
  const [search,         setSearch]         = useState("");
  const [dark,           setDark]           = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"DM Sans,sans-serif",color:"#4b6557"}}>
      Loading…
    </div>
  );
  if (!user) return null;

  function closeModal() { setActiveModal(null); }

  function handleConsult(entry: QueueEntry) {
    setCurrentEntry(entry);
    setActiveModal("soap");
  }

  function openPresc() { setActiveModal("presc"); }
  function openLab()   { setActiveModal("lab");   }

  const modalPatient = currentEntry ? {
    id:     0,
    name:   currentEntry.name,
    age:    currentEntry.age,
    gender: currentEntry.gender,
    civil:  currentEntry.civil,
    addr:   currentEntry.addr,
    time:   currentEntry.time,
    status: "waiting" as const,
  } : null;

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div className={styles.root}>
      <DoctorSidebar />

      <div className={styles.mainArea}>
        {/* ── Topbar ── */}
        <header className={styles.topbar}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIco} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Search patients, medicines…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.iconBtn} title="Notifications">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span className={styles.notifDot}/>
            </button>
            <button className={styles.iconBtn} title="Toggle dark mode" onClick={() => setDark(d => !d)}>
              {dark
                ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              }
            </button>
            <div className={styles.avatarChip}>
              <div className={styles.avatar}>{user.initials}</div>
              <div className={styles.avatarInfo}>
                <span className={styles.avatarName}>{user.name}</span>
                <span className={styles.avatarRole}>{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <div className={styles.content}>
          <div className={styles.contentMain}>

            {/* Heading */}
            <div className={styles.pageHeading}>
              <div>
                <p className={styles.pageEyebrow}>Doctor</p>
                <h1 className={styles.pageTitle}>Dashboard</h1>
              </div>
              <div className={styles.headingActions}>
                <button className={`${styles.actionBtn} ${styles.primary}`} onClick={() => { setCurrentEntry(null); setActiveModal("presc"); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Send Prescription
                </button>
                <button className={`${styles.actionBtn} ${styles.outline}`} onClick={() => { setCurrentEntry(null); setActiveModal("lab"); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
                  </svg>
                  Send Lab Request
                </button>
                <button className={`${styles.actionBtn} ${styles.outline}`} onClick={() => setShowLabResults(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <path d="M9 12h6M9 16h4"/>
                  </svg>
                  View Lab Results
                </button>
              </div>
            </div>

            <p className={styles.sectionLabel}>Analytics</p>

            {/* ── Analytics Row ── */}
            <div className={styles.analyticsRow}>
              <div className={`${styles.statCard} ${styles.statCardGreen}`}>
                <div>
                  <p className={styles.statCardLabel}>Total Patient</p>
                  <p className={styles.statCardNum}>24</p>
                  <p className={styles.statCardSub}>Today, {today.toLocaleDateString("en-PH")}</p>
                </div>
                <div style={{opacity:.6}}>
                  <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
                    <circle cx="22" cy="20" r="10" fill="rgba(255,255,255,0.3)"/>
                    <circle cx="42" cy="20" r="10" fill="rgba(255,255,255,0.2)"/>
                    <path d="M4 52c0-10 8-16 18-16h20c10 0 18 6 18 16" fill="rgba(255,255,255,0.25)"/>
                  </svg>
                </div>
              </div>

              <div className={styles.bigStatsGrid}>
                <div className={`${styles.bigStatCard} ${styles.consultations}`}>
                  <div className={styles.bigStatIcoWrap}>🩺</div>
                  <div className={styles.bigStatText}>
                    <div className={styles.bigStatVal}>18</div>
                    <div className={styles.bigStatLbl}>Consultations</div>
                  </div>
                </div>
                <div className={`${styles.bigStatCard} ${styles.prescriptions}`}>
                  <div className={styles.bigStatIcoWrap}>💊</div>
                  <div className={styles.bigStatText}>
                    <div className={styles.bigStatVal}>12</div>
                    <div className={styles.bigStatLbl}>Prescriptions</div>
                  </div>
                </div>
                <div className={`${styles.bigStatCard} ${styles.labRequests}`}>
                  <div className={styles.bigStatIcoWrap}>🧪</div>
                  <div className={styles.bigStatText}>
                    <div className={styles.bigStatVal}>7</div>
                    <div className={styles.bigStatLbl}>Lab Requests</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bottom Row ── */}
            <div className={styles.bottomRow}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>DISEASE PREDICTION</div>
                <div className={styles.cardBody}>
                  <p className={styles.cardSubTitle}>Month — {MONTHS[today.getMonth()]}</p>
                  <div className={styles.diseaseList}>
                    {DISEASES.map(d => (
                      <div key={d.label} className={styles.diseaseRow}>
                        <span className={styles.diseaseDot} style={{background:d.color}}/>
                        <span className={styles.diseaseName}>{d.label}</span>
                        <div className={styles.diseaseBarWrap}>
                          <div className={styles.diseaseBar} style={{width:`${d.pct}%`,background:d.color}}/>
                        </div>
                        <span className={styles.diseasePct}>{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <MedicineStockCard />
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className={styles.contentRight}>
            <PendingPatients onConsult={handleConsult} />
            <AiDictionary />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <SoapModal
        open={activeModal === "soap"}
        entry={currentEntry}
        onClose={closeModal}
        onSave={closeModal}
        onOpenPresc={openPresc}
        onOpenLab={openLab}
      />
      <PrescriptionModal
        open={activeModal === "presc"}
        patient={modalPatient}
        onClose={closeModal}
        onSend={closeModal}
      />
      <LabRequestModal
        open={activeModal === "lab"}
        patient={modalPatient}
        onClose={closeModal}
        onSend={closeModal}
      />
      <LabResultsModal
        open={showLabResults}
        onClose={() => setShowLabResults(false)}
      />
    </div>
  );
}