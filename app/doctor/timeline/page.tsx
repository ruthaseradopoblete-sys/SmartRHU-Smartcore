"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TIMELINE_PATIENTS, TimelinePatient, VisitEvent, VisitType } from "../data";
import styles from "./timeline.module.css";
import DoctorSidebar from "../../components/DoctorSidebar";

function initials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0,2); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"}); }
function avatarColor(gender: string) { return gender==="Female" ? "#ec4899" : "#3b82f6"; }

const TYPE_LABELS: Record<VisitType,string> = { consultation:"Consultation", lab:"Lab Work", prescription:"Prescription", "follow-up":"Follow-up", emergency:"Emergency" };
const TYPE_STYLE: Record<VisitType,string>  = { consultation:styles.typeConsultation, lab:styles.typeLab, prescription:styles.typePrescription, "follow-up":styles.typeFollowUp, emergency:styles.typeEmergency };
const TYPE_COLOR: Record<VisitType,string>  = { consultation:"#16a34a", lab:"#3b82f6", prescription:"#9333ea", "follow-up":"#f59e0b", emergency:"#ef4444" };
const TYPE_ICON:  Record<VisitType,string>  = { consultation:"🩺", lab:"🧪", prescription:"💊", "follow-up":"🔁", emergency:"🚨" };
const FILTERS: { label:string; value:VisitType|"all" }[] = [
  {label:"All",value:"all"},{label:"Consultation",value:"consultation"},{label:"Lab Work",value:"lab"},
  {label:"Prescription",value:"prescription"},{label:"Follow-up",value:"follow-up"},{label:"Emergency",value:"emergency"},
];

function VisitCard({ visit }: { visit: VisitEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.event}>
      <div className={styles.eventDot} style={{background:TYPE_COLOR[visit.type]}}>{TYPE_ICON[visit.type]}</div>
      <div className={`${styles.eventCard}${open?" "+styles.eventCardOpen:""}`} onClick={() => setOpen(o => !o)}>
        <div className={styles.eventHeader}>
          <div className={styles.eventHeaderLeft}>
            <div className={styles.eventDate}>{fmtDate(visit.date)} · {visit.time}</div>
            <div className={styles.eventTitle}>{visit.title}</div>
            <div className={styles.eventDoctor}>{visit.doctor}</div>
          </div>
          <div className={styles.eventHeaderRight}>
            <span className={`${styles.typePill} ${TYPE_STYLE[visit.type]}`}>{TYPE_LABELS[visit.type]}</span>
            <div className={`${styles.statusDot}${visit.status==="completed"?" "+styles.statusDotCompleted:visit.status==="scheduled"?" "+styles.statusDotScheduled:""}`} title={visit.status}/>
          </div>
          <svg className={`${styles.chevron}${open?" "+styles.chevronOpen:""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        {open && (
          <div className={styles.eventBody} onClick={e => e.stopPropagation()}>
            {(visit.bp||visit.temp||visit.weight) && (
              <div>
                <div className={styles.sectionLabel}>Vitals</div>
                <div className={styles.vitalsRow}>
                  {visit.bp     && <div className={styles.vitalChip}>❤️ BP <span className={styles.vitalVal}>{visit.bp} mmHg</span></div>}
                  {visit.temp   && <div className={styles.vitalChip}>🌡️ Temp <span className={styles.vitalVal}>{visit.temp}</span></div>}
                  {visit.weight && <div className={styles.vitalChip}>⚖️ Wt <span className={styles.vitalVal}>{visit.weight}</span></div>}
                </div>
              </div>
            )}
            <div><div className={styles.sectionLabel}>Diagnosis</div><div className={styles.diagnosisBox}>{visit.diagnosis}</div></div>
            {visit.prescription?.length && (
              <div>
                <div className={styles.sectionLabel}>Prescription</div>
                <div className={styles.pillList}>{visit.prescription.map(rx => <div key={rx} className={styles.pill}>💊 {rx}</div>)}</div>
              </div>
            )}
            {visit.labTests?.length && (
              <div>
                <div className={styles.sectionLabel}>Lab Tests Ordered</div>
                <div className={styles.labList}>{visit.labTests.map(t => <div key={t} className={styles.labItem}><div className={styles.labCheck}>✓</div>{t}</div>)}</div>
              </div>
            )}
            <div><div className={styles.sectionLabel}>Doctor&apos;s Notes</div><div className={styles.notesBox}>{visit.notes}</div></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientTimeline() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [selected, setSelected] = useState<TimelinePatient|null>(null);
  const [patSearch, setPatSearch] = useState("");
  const [filter, setFilter] = useState<VisitType|"all">("all");
  const [search, setSearch] = useState("");
  const [dark] = useState(false);

  useEffect(() => { if (!isLoading && !user) router.replace("/login"); }, [user,isLoading,router]);
  if (isLoading) return null;
  if (!user) return null;

  const filtered = TIMELINE_PATIENTS.filter(p => p.name.toLowerCase().includes(patSearch.toLowerCase()));
  const visits = selected ? selected.visits.filter(v => filter==="all" || v.type===filter) : [];
  const totalPrescr = selected?.visits.reduce((a,v) => a+(v.prescription?.length??0), 0) ?? 0;
  const totalLabs   = selected?.visits.filter(v => v.type==="lab").length ?? 0;
  const lastVisit   = selected?.visits[0]?.date ? fmtDate(selected.visits[0].date) : "—";

  function badge(p: TimelinePatient) {
    const s = p.visits[0]?.status;
    if (s==="ongoing")   return { label:"Ongoing",   cls:styles.badgeOngoing };
    if (s==="scheduled") return { label:"Scheduled", cls:styles.badgeScheduled };
    return                      { label:"Completed", cls:styles.badgeCompleted };
  }

  return (
    <div className={`${styles.root}${dark?" "+styles.dark:""}`}>
      <DoctorSidebar />
      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIco} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input className={styles.searchInput} placeholder="Search patients, records…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.iconBtn}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><span className={styles.notifDot}/></button>
            <div className={styles.avatarChip}>
              <div className={styles.avatar}>{user.initials}</div>
              <div className={styles.avatarInfo}>
                <span className={styles.avatarName}>{user.name}</span>
                <span className={styles.avatarRole}>{user.role}</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.body}>
          {/* Patient list */}
          <div className={styles.patientPanel}>
            <div className={styles.patientPanelHeader}>
              <div className={styles.patientPanelTitle}>Patient Records</div>
              <div className={styles.patientSearchWrap}>
                <svg className={styles.patientSearchIco} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input className={styles.patientSearch} placeholder="Search by name…" value={patSearch} onChange={e => setPatSearch(e.target.value)} />
              </div>
            </div>
            <div className={styles.patientList}>
              {filtered.map(p => {
                const b = badge(p);
                return (
                  <div key={p.id} className={`${styles.patientCard}${selected?.id===p.id?" "+styles.patientCardActive:""}`} onClick={() => { setSelected(p); setFilter("all"); }}>
                    <div className={styles.patientAvatar} style={{background:avatarColor(p.gender)}}>{initials(p.name)}</div>
                    <div className={styles.patientCardInfo}>
                      <div className={styles.patientCardName}>{p.name}</div>
                      <div className={styles.patientCardMeta}>{p.age}y · {p.gender} · {p.visits.length} visit{p.visits.length!==1?"s":""}</div>
                    </div>
                    <span className={`${styles.patientCardBadge} ${b.cls}`}>{b.label}</span>
                  </div>
                );
              })}
              {filtered.length===0 && <div style={{padding:20,textAlign:"center",fontSize:12,color:"#9ca3af"}}>No patients found</div>}
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.timelinePanel}>
            {!selected ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📋</div>
                <div className={styles.emptyText}>Select a patient</div>
                <div className={styles.emptyHint}>Choose a patient from the list to view their timeline</div>
              </div>
            ) : (
              <>
                <div className={styles.patientInfoBar}>
                  <div className={styles.patientInfoAvatar} style={{background:avatarColor(selected.gender)}}>{initials(selected.name)}</div>
                  <div className={styles.patientInfoDetails}>
                    <div className={styles.patientInfoName}>{selected.name}</div>
                    <div className={styles.patientInfoMeta}>
                      <span className={styles.patientInfoChip}>🕐 {selected.age} yrs</span>
                      <span className={styles.patientInfoChip}>👤 {selected.gender} · {selected.civil}</span>
                      <span className={styles.patientInfoChip}>📍 {selected.addr}</span>
                      <span className={styles.patientInfoChip}>🩸 {selected.bloodType}</span>
                      <span className={styles.patientInfoChip}>🪪 {selected.philHealth}</span>
                    </div>
                  </div>
                  <div className={styles.patientBadges}>
                    {selected.conditions.map(c => <span key={c} className={styles.conditionBadge}>{c}</span>)}
                    {selected.allergies.map(a => <span key={a} className={styles.allergyBadge}>⚠️ {a}</span>)}
                  </div>
                </div>

                <div className={styles.statsStrip}>
                  <div className={styles.statChip}><div className={styles.statChipVal}>{selected.visits.length}</div><div className={styles.statChipLbl}>Total Visits</div></div>
                  <div className={styles.statChip}><div className={styles.statChipVal}>{totalPrescr}</div><div className={styles.statChipLbl}>Prescriptions</div></div>
                  <div className={styles.statChip}><div className={styles.statChipVal}>{totalLabs}</div><div className={styles.statChipLbl}>Lab Requests</div></div>
                  <div className={styles.statChip}><div className={styles.statChipVal} style={{fontSize:12,marginTop:3}}>{lastVisit}</div><div className={styles.statChipLbl}>Last Visit</div></div>
                </div>

                <div className={styles.timelineScroll}>
                  <div className={styles.timelineHeading}>Medical Timeline</div>
                  <div className={styles.filterBar}>
                    {FILTERS.map(f => (
                      <button key={f.value} className={`${styles.filterTab}${filter===f.value?" "+styles.filterTabActive:""}`} onClick={() => setFilter(f.value)}>{f.label}</button>
                    ))}
                  </div>
                  {visits.length > 0
                    ? <div className={styles.track}>{visits.map(v => <VisitCard key={v.id} visit={v}/>)}</div>
                    : <div style={{padding:"40px 0",textAlign:"center",color:"#9ca3af",fontSize:13}}>No records found.</div>
                  }
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
