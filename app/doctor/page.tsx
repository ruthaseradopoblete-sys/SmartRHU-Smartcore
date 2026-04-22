"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { INITIAL_PATIENTS, DISEASES, STOCK, MONTHS, Patient } from "./data";
import styles from "../styles/dashboard.module.css";
import DonutChart from "../components/DonutChart";
import DoctorSidebar from "../components/DoctorSidebar";
import PendingPatients from "../components/PendingPatients";
import AiDictionary from "../components/AiDictionary";
import PrescriptionModal from "../components/PrescriptionModal";
import LabRequestModal from "../components/LabRequestModal";
import SoapModal from "../components/SoapModal";

type ActiveModal = "presc" | "lab" | "soap" | null;

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const today = new Date();

  async function handleLogout() {
  await logout();
  router.push("/login");
}

  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"DM Sans,sans-serif",color:"#4b6557"}}>Loading…</div>;
  if (!user) return null;

  function cancelPatient(id: number) { setPatients(p => p.filter(x => x.id !== id)); }
  function consultPatient(id: number) {
    const pat = patients.find(p => p.id === id) ?? null;
    setCurrentPatient(pat); setActiveModal("soap");
  }
  function markDone(name: string) { setPatients(p => p.map(x => x.name === name ? {...x, status:"done"} : x)); }
  function closeModal() { setActiveModal(null); }
  function openPresc(pat?: Patient | null) { if (pat !== undefined) setCurrentPatient(pat); setActiveModal("presc"); }
  function openLab(pat?: Patient | null) { if (pat !== undefined) setCurrentPatient(pat); setActiveModal("lab"); }

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div className={`${styles.root}${dark ? " "+styles.dark : ""}`}>
      <DoctorSidebar />

      <div className={styles.mainArea}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIco} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input className={styles.searchInput} placeholder="Search patients, medicines…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.iconBtn} title="Notifications">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span className={styles.notifDot}/>
            </button>
            {/* Dark / Light mode toggle */}
            <button className={styles.iconBtn} title="Toggle dark mode" onClick={() => setDark(d => !d)}>
              {dark
                ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              }
            </button>
            {/* Logged-in user chip — shows real name from Supabase */}
            <div className={styles.avatarChip}>
              <div className={styles.avatar}>{user.initials}</div>
              <div className={styles.avatarInfo}>
                <span className={styles.avatarName}>{user.name}</span>
                <span className={styles.avatarRole}>{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.contentMain}>
            {/* Heading */}
            <div className={styles.pageHeading}>
              <div>
                <p className={styles.pageEyebrow}>Doctor</p>
                <h1 className={styles.pageTitle}>Dashboard</h1>
              </div>
              <div className={styles.headingActions}>
                <button className={`${styles.actionBtn} ${styles.primary}`} onClick={() => openPresc(null)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Send Prescription
                </button>
                <button className={`${styles.actionBtn} ${styles.outline}`} onClick={() => openLab(null)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
                  Send Lab Request
                </button>
              </div>
            </div>
            <p className={styles.sectionLabel}>Analytics</p>

            {/* Analytics Row */}
            <div className={styles.analyticsRow}>
              <div className={`${styles.statCard} ${styles.statCardGreen}`}>
                <div>
                  <p className={styles.statCardLabel}>Total Patient</p>
                  <p className={styles.statCardNum}>{patients.length + 19}</p>
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

              <div className={`${styles.statCard} ${styles.statCardLight}`}>
                <p className={styles.statCardLabelDark}>Disease Prediction</p>
                <div className={styles.donutWrap}>
                  <DonutChart data={DISEASES.map(d => ({val:d.pct,color:d.color,label:d.label,count:d.count}))} size={100} hole={0.6} />
                  <div className={styles.donutLegend}>
                    {DISEASES.map(d => (
                      <div key={d.label} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{background:d.color}}/>
                        <span className={styles.legendLabel}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.miniStats}>
                {[{label:"Consultations",val:"18",icon:"🩺",color:"#16a34a"},{label:"Prescriptions",val:"12",icon:"💊",color:"#3b82f6"},{label:"Lab Requests",val:"7",icon:"🧪",color:"#f59e0b"}].map(s => (
                  <div key={s.label} className={styles.miniStatCard}>
                    <span className={styles.miniStatIco}>{s.icon}</span>
                    <div><div className={styles.miniStatVal} style={{color:s.color}}>{s.val}</div><div className={styles.miniStatLbl}>{s.label}</div></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Row */}
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
                        <div className={styles.diseaseBarWrap}><div className={styles.diseaseBar} style={{width:`${d.pct}%`,background:d.color}}/></div>
                        <span className={styles.diseasePct}>{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>MEDICINE STOCK LEVELS</div>
                <div className={styles.cardBody}>
                  <div className={styles.stockTop}>
                    <DonutChart data={STOCK.map(s => ({val:s.level,color:s.color,label:s.name}))} size={110} hole={0.55} />
                    <div className={styles.stockList}>
                      {STOCK.map(s => (
                        <div key={s.name} className={styles.stockRow}>
                          <span className={styles.stockName}>{s.name}</span>
                          <div className={styles.stockBarWrap}><div className={styles.stockBar} style={{width:`${s.level}%`,background:s.color}}/></div>
                          <span className={styles.stockPct} style={{color:s.level<35?"#ef4444":"#16a34a"}}>{s.level}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.stockLegend}>
                    <span className={styles.legendPill} style={{background:"#1d7a3f",color:"#fff"}}>Highest</span>
                    <span className={styles.legendPill} style={{background:"#f59e0b",color:"#fff"}}>Medium</span>
                    <span className={styles.legendPill} style={{background:"#ef4444",color:"#fff"}}>Lowest</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className={styles.contentRight}>
            <PendingPatients patients={patients} onCancel={cancelPatient} onConsult={consultPatient} />
            <AiDictionary />
          </div>
        </div>
      </div>

      {/* Modals */}
      <PrescriptionModal open={activeModal==="presc"} patient={currentPatient} onClose={closeModal} onSend={markDone} />
      <LabRequestModal   open={activeModal==="lab"}   patient={currentPatient} onClose={closeModal} onSend={markDone} />
      <SoapModal open={activeModal==="soap"} patient={currentPatient} onClose={closeModal} onSave={markDone}
        onOpenPresc={() => setActiveModal("presc")} onOpenLab={() => setActiveModal("lab")} />
    </div>
  );
}
