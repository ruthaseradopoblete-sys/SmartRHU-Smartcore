"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./timeline.module.css";
import DoctorSidebar from "../../components/DoctorSidebar";
import { supabase } from "@/lib/supabase";

// ── Types (replaces data.ts types) ────────────────────────
type VisitType = "consultation" | "lab" | "prescription" | "follow-up";

interface VisitEvent {
  id: string | number;
  date: string; time: string; type: VisitType;
  title: string; doctor: string; diagnosis: string;
  prescription?: string[]; labTests?: string[];
  notes: string;
  bp?: string; temp?: string; weight?: string;
  status: "completed" | "ongoing" | "scheduled";
}

interface TimelinePatient {
  id: string;
  name: string; age: string; gender: string;
  civil: string; addr: string;
  philHealth: string; bloodType: string;
  conditions: string[]; allergies: string[];
  visits: VisitEvent[];
}

// ── Lab test map ───────────────────────────────────────────
const LAB_TEST_MAP: Record<string, string> = {
  hgb_hct:"Hgb/Hct", cbc_with_platelet:"CBC with Platelet",
  random_blood_sugar:"Random Blood Sugar", fasting_blood_sugar:"Fasting Blood Sugar",
  cholesterol:"Cholesterol", triglycerides:"Triglycerides",
  lipid_profile:"Lipid Profile", blood_uric_acid:"Blood Uric Acid",
  afb_dssm:"AFB/DSSM", culture_and_sensitivity:"Culture & Sensitivity",
  urinalysis:"Urinalysis", fecalysis:"Fecalysis",
  pregnancy_test:"Pregnancy Test", abo_rh_blood_typing:"ABO/Rh Blood Typing",
  dengue_ns1:"Dengue NS1", dengue_igg_igm:"Dengue IgG/IgM",
  hbsag:"HbsAg", gene_xpert:"Gene Xpert",
};

const DISEASE_KEYS: [string, string][] = [
  ["allergy","Allergy"],["asthma","Asthma"],["cancer","Cancer"],
  ["cerebrovascular_disease","Cerebrovascular Disease"],
  ["coronary_artery_disease","Coronary Artery Disease"],
  ["diabetes_mellitus","Diabetes Mellitus"],["emphysema","Emphysema"],
  ["epilepsy_seizure","Epilepsy/Seizure"],["hepatitis","Hepatitis"],
  ["hyperlipidemia","Hyperlipidemia"],["hypertension","Hypertension"],
  ["peptic_ulcer","Peptic Ulcer"],["pneumonia","Pneumonia"],
  ["thyroid_disease","Thyroid Disease"],["ptb","PTB"],
  ["urinary_tract_infection","UTI"],["mental_illness","Mental Illness"],
];

// ── Helpers ────────────────────────────────────────────────
function initials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0,2); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"}); }
function avatarColor(gender: string) { return gender==="Female" ? "#ec4899" : "#3b82f6"; }
function checkedList(obj: any, keys: [string,string][]): string[] {
  if (!obj) return [];
  return keys.filter(([k]) => obj[k]===true).map(([,l]) => l);
}

// ── Type maps (unchanged from original) ───────────────────
const TYPE_LABELS: Partial<Record<VisitType,string>> = {
  consultation:"Consultation", lab:"Lab Work",
  prescription:"Prescription", "follow-up":"Follow-up",
};
const TYPE_STYLE: Partial<Record<VisitType,string>> = {
  consultation:styles.typeConsultation, lab:styles.typeLab,
  prescription:styles.typePrescription, "follow-up":styles.typeFollowUp,
};
const TYPE_COLOR: Partial<Record<VisitType,string>> = {
  consultation:"#16a34a", lab:"#3b82f6",
  prescription:"#9333ea", "follow-up":"#f59e0b",
};
const TYPE_ICON: Partial<Record<VisitType,string>> = {
  consultation:"🩺", lab:"🧪", prescription:"💊", "follow-up":"🔁",
};
const FILTERS: { label:string; value:VisitType|"all" }[] = [
  {label:"All",value:"all"},{label:"Consultation",value:"consultation"},
  {label:"Lab Work",value:"lab"},{label:"Prescription",value:"prescription"},
  {label:"Follow-up",value:"follow-up"},
];

// ── VisitCard (identical to original) ─────────────────────
function VisitCard({ visit }: { visit: VisitEvent }) {
  const [open, setOpen] = useState(false);
  const color = TYPE_COLOR[visit.type] ?? "#9ca3af";
  const icon  = TYPE_ICON[visit.type]  ?? "📄";
  const label = TYPE_LABELS[visit.type] ?? visit.type;
  const style = TYPE_STYLE[visit.type] ?? "";

  return (
    <div className={styles.event}>
      <div className={styles.eventDot} style={{background:color}}>{icon}</div>
      <div className={`${styles.eventCard}${open?" "+styles.eventCardOpen:""}`} onClick={() => setOpen(o=>!o)}>
        <div className={styles.eventHeader}>
          <div className={styles.eventHeaderLeft}>
            <div className={styles.eventDate}>{fmtDate(visit.date)}{visit.time ? ` · ${visit.time}` : ""}</div>
            <div className={styles.eventTitle}>{visit.title}</div>
            <div className={styles.eventDoctor}>{visit.doctor}</div>
          </div>
          <div className={styles.eventHeaderRight}>
            <span className={`${styles.typePill} ${style}`}>{label}</span>
            <div className={`${styles.statusDot}${
              visit.status==="completed"?" "+styles.statusDotCompleted:
              visit.status==="scheduled"?" "+styles.statusDotScheduled:""
            }`} title={visit.status}/>
          </div>
          <svg className={`${styles.chevron}${open?" "+styles.chevronOpen:""}`}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {open && (
          <div className={styles.eventBody} onClick={e=>e.stopPropagation()}>
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
            {visit.diagnosis && (
              <div>
                <div className={styles.sectionLabel}>Diagnosis</div>
                <div className={styles.diagnosisBox}>{visit.diagnosis}</div>
              </div>
            )}
            {!!visit.prescription?.length && (
              <div>
                <div className={styles.sectionLabel}>Prescription</div>
                <div className={styles.pillList}>
                  {visit.prescription.map(rx => (
                    <div key={rx} className={styles.pill}>💊 {rx}</div>
                  ))}
                </div>
              </div>
            )}
            {!!visit.labTests?.length && (
              <div>
                <div className={styles.sectionLabel}>Lab Tests Ordered</div>
                <div className={styles.labList}>
                  {visit.labTests.map(t => (
                    <div key={t} className={styles.labItem}>
                      <div className={styles.labCheck}>✓</div>{t}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {visit.notes && (
              <div>
                <div className={styles.sectionLabel}>Doctor&apos;s Notes</div>
                <div className={styles.notesBox}>{visit.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────
export default function PatientTimeline() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [patients,      setPatients]      = useState<TimelinePatient[]>([]);
  const [selected,      setSelected]      = useState<TimelinePatient|null>(null);
  const [patSearch,     setPatSearch]     = useState("");
  const [filter,        setFilter]        = useState<VisitType|"all">("all");
  const [search,        setSearch]        = useState("");
  const [loadingList,   setLoadingList]   = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  // ── Fetch patient list ──────────────────────────────────
  const fetchPatients = useCallback(async () => {
    setLoadingList(true);

    const { data: pData } = await supabase
      .from("patients")
      .select("id, first_name, last_name, age, sex, purok, barangay, municipality, philhealth_pin")
      .order("last_name", { ascending: true });

    if (!pData) { setLoadingList(false); return; }

    // Blood type from physical_exam_findings
    const { data: physData } = await supabase
      .from("physical_exam_findings")
      .select("patient_id, blood_type");
    const bloodMap: Record<string,string> = {};
    (physData ?? []).forEach((p:any) => { if (p.blood_type) bloodMap[p.patient_id] = p.blood_type; });

    // Allergy / conditions from past_medical_history
    const { data: medData } = await supabase
      .from("past_medical_history")
      .select("patient_id, " + DISEASE_KEYS.map(([k])=>k).join(", ") + ", allergy_specify");
    const medMap: Record<string,any> = {};
    (medData ?? []).forEach((m:any) => { medMap[m.patient_id] = m; });

    // Consultations for visit count + status + last visit
    const { data: cData } = await supabase
      .from("soap_consultations")
      .select("patient_id, consultation_date, status, assessment")
      .order("consultation_date", { ascending: false });
    const consultMap: Record<string,{count:number;last:string;hasOngoing:boolean}> = {};
    const todayStr = new Date().toISOString().split("T")[0];
    (cData ?? []).forEach((c:any) => {
      if (!consultMap[c.patient_id]) consultMap[c.patient_id] = {count:0,last:"",hasOngoing:false};
      consultMap[c.patient_id].count++;
      if (!consultMap[c.patient_id].last) consultMap[c.patient_id].last = c.consultation_date;
      // ONGOING only if there's a waiting consultation TODAY (not past days)
      if (c.status==="waiting" && c.consultation_date === todayStr) consultMap[c.patient_id].hasOngoing = true;
    });

    const mapped: TimelinePatient[] = pData.map((p:any) => {
      const med = medMap[p.id];
      const conditions = checkedList(med, DISEASE_KEYS);
      const allergies  = med?.allergy && med?.allergy_specify ? [med.allergy_specify] : [];
      const cm = consultMap[p.id];
      return {
        id:         p.id,
        name:       `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
        age:        p.age != null ? String(p.age) : "",
        gender:     p.sex==="F" ? "Female" : p.sex==="M" ? "Male" : "",
        civil:      "",
        addr:       [p.purok, p.barangay, p.municipality].filter(Boolean).join(", "),
        philHealth: p.philhealth_pin ?? "",
        bloodType:  bloodMap[p.id] ?? "",
        conditions, allergies,
        visits: [],
        _visitCount:  cm?.count   ?? 0,
        _lastVisit:   cm?.last    ?? "",
        _hasOngoing:  cm?.hasOngoing ?? false,
      } as any;
    });

    setPatients(mapped);
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // ── Fetch visits for selected patient ──────────────────
  async function fetchVisits(patientId: string): Promise<VisitEvent[]> {
    const [consultRes, prescRes, labRes, physRes] = await Promise.all([
      supabase.from("soap_consultations")
        .select("id, consultation_date, status, subjective, objective, assessment, plan")
        .eq("patient_id", patientId)
        .order("consultation_date", { ascending: false }),
      supabase.from("prescriptions")
        .select("id, prescription_date, medicine, dosage_frequency, quantity, notes, status")
        .eq("patient_id", patientId)
        .order("prescription_date", { ascending: false }),
      supabase.from("laboratory_requests")
        .select("*")
        .eq("patient_id", patientId)
        .order("request_date", { ascending: false }),
      supabase.from("physical_exam_findings")
        .select("blood_pressure_mmhg, temperature_c, weight_kg")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle(),
    ]);

    const latestPhys = physRes.data;
    const allVisits: VisitEvent[] = [];

    // Consultations
    (consultRes.data ?? []).forEach((c:any) => {
      const notesParts = [
        c.subjective  ? `S: ${c.subjective}`  : "",
        c.objective   ? `O: ${c.objective}`   : "",
        c.plan        ? `Plan: ${c.plan}`      : "",
      ].filter(Boolean);
      allVisits.push({
        id: c.id, date: c.consultation_date, time: "",
        type: "consultation",
        title: c.assessment ?? "Consultation",
        doctor: user?.name ?? "Doctor",
        diagnosis: c.assessment ?? "",
        prescription: [], labTests: [],
        notes: notesParts.join("\n\n"),
        bp:     latestPhys?.blood_pressure_mmhg ?? undefined,
        temp:   latestPhys?.temperature_c ? `${latestPhys.temperature_c}°C` : undefined,
        weight: latestPhys?.weight_kg ? `${latestPhys.weight_kg} kg` : undefined,
        status: c.status==="done" ? "completed" : "ongoing",
      });
    });

    // Prescriptions
    (prescRes.data ?? []).forEach((p:any) => {
      const rxLabel = [p.medicine, p.dosage_frequency, p.quantity ? `(${p.quantity})` : ""]
        .filter(Boolean).join(" ");
      allVisits.push({
        id: p.id, date: p.prescription_date, time: "",
        type: "prescription",
        title: `Prescription — ${p.medicine}`,
        doctor: user?.name ?? "Doctor",
        diagnosis: "",
        prescription: [rxLabel],
        labTests: [],
        notes: p.notes ?? "",
        status: p.status==="sent" ? "completed" : "scheduled",
      });
    });

    // Lab Requests
    (labRes.data ?? []).forEach((l:any) => {
      const tests = Object.keys(LAB_TEST_MAP).filter(k => l[k]===true).map(k => LAB_TEST_MAP[k]);
      allVisits.push({
        id: l.id, date: l.request_date, time: "",
        type: "lab",
        title: "Lab Request",
        doctor: user?.name ?? "Doctor",
        diagnosis: "",
        prescription: [],
        labTests: tests,
        notes: "",
        status: l.status==="completed" ? "completed" : l.status==="cancelled" ? "scheduled" : "ongoing",
      });
    });

    // Sort by date descending
    return allVisits.sort((a,b) => b.date.localeCompare(a.date));
  }

  async function handleSelect(p: TimelinePatient) {
    setFilter("all");
    setLoadingDetail(true);
    const v = await fetchVisits(p.id);
    setSelected({ ...p, visits: v });
    setLoadingDetail(false);
  }

  if (isLoading || !user) return null;

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patSearch.toLowerCase())
  );

  const visits = selected
    ? selected.visits.filter(v => filter==="all" || v.type===filter)
    : [];

  const totalPrescr = selected?.visits.filter(v=>v.type==="prescription").length ?? 0;
  const totalLabs   = selected?.visits.filter(v=>v.type==="lab").length ?? 0;
  const lastVisit   = selected?.visits[0]?.date ? fmtDate(selected.visits[0].date) : "—";

  function badge(p: any) {
    if (p._hasOngoing)      return { label:"Ongoing",   cls:styles.badgeOngoing };
    if (p._visitCount > 0)  return { label:"Completed", cls:styles.badgeCompleted };
    return                         { label:"New",        cls:styles.badgeScheduled };
  }

  return (
    <div className={styles.root}>
      <DoctorSidebar />

      <div className={styles.mainArea}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIco} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input className={styles.searchInput} placeholder="Search patients, records…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.iconBtn}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span className={styles.notifDot}/>
            </button>
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

          {/* ── Patient List Panel ── */}
          <div className={styles.patientPanel}>
            <div className={styles.patientPanelHeader}>
              <div className={styles.patientPanelTitle}>Patient Records</div>
              <div className={styles.patientSearchWrap}>
                <svg className={styles.patientSearchIco} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input className={styles.patientSearch} placeholder="Search by name…" value={patSearch} onChange={e=>setPatSearch(e.target.value)}/>
              </div>
            </div>
            <div className={styles.patientList}>
              {loadingList && (
                <div style={{padding:20,textAlign:"center",fontSize:12,color:"var(--text3)"}}>Loading patients…</div>
              )}
              {!loadingList && filteredPatients.length === 0 && (
                <div style={{padding:20,textAlign:"center",fontSize:12,color:"var(--text3)"}}>No patients found</div>
              )}
              {filteredPatients.map(p => {
                const b = badge(p);
                return (
                  <div key={p.id}
                    className={`${styles.patientCard}${selected?.id===p.id?" "+styles.patientCardActive:""}`}
                    onClick={() => handleSelect(p)}>
                    <div className={styles.patientAvatar} style={{background:avatarColor(p.gender)}}>
                      {initials(p.name)}
                    </div>
                    <div className={styles.patientCardInfo}>
                      <div className={styles.patientCardName}>{p.name}</div>
                      <div className={styles.patientCardMeta}>
                        {p.age ? `${p.age}y` : ""}
                        {p.gender ? ` · ${p.gender}` : ""}
                        {` · ${(p as any)._visitCount ?? 0} visit${(p as any)._visitCount !== 1 ? "s" : ""}`}
                      </div>
                    </div>
                    <span className={`${styles.patientCardBadge} ${b.cls}`}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Timeline Panel ── */}
          <div className={styles.timelinePanel}>
            {!selected && !loadingDetail ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📋</div>
                <div className={styles.emptyText}>Select a patient</div>
                <div className={styles.emptyHint}>Choose a patient from the list to view their timeline</div>
              </div>
            ) : loadingDetail ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} style={{fontSize:32,opacity:.3}}>⏳</div>
                <div className={styles.emptyText}>Loading records…</div>
              </div>
            ) : selected ? (
              <>
                {/* Patient info bar — identical structure */}
                <div className={styles.patientInfoBar}>
                  <div className={styles.patientInfoAvatar} style={{background:avatarColor(selected.gender)}}>
                    {initials(selected.name)}
                  </div>
                  <div className={styles.patientInfoDetails}>
                    <div className={styles.patientInfoName}>{selected.name}</div>
                    <div className={styles.patientInfoMeta}>
                      {selected.age       && <span className={styles.patientInfoChip}>🕐 {selected.age} yrs</span>}
                      {selected.gender    && <span className={styles.patientInfoChip}>👤 {selected.gender}{selected.civil ? ` · ${selected.civil}` : ""}</span>}
                      {selected.addr      && <span className={styles.patientInfoChip}>📍 {selected.addr}</span>}
                      {selected.bloodType && <span className={styles.patientInfoChip}>🩸 {selected.bloodType}</span>}
                      {selected.philHealth && <span className={styles.patientInfoChip}>🪪 {selected.philHealth}</span>}
                    </div>
                    <div className={styles.patientBadges}>
                      {selected.conditions.map(c => (
                        <span key={c} className={styles.conditionBadge}>
                          <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#c0152a",marginRight:5,flexShrink:0,verticalAlign:"middle"}}/>
                          {c}
                        </span>
                      ))}
                      {selected.allergies.map(a => (
                        <span key={a} className={styles.allergyBadge}>
                          ⚠️ Allergy: {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats strip — identical structure */}
                <div className={styles.statsStrip}>
                  <div className={styles.statChip}>
                    <div className={styles.statChipVal}>{selected.visits.filter(v=>v.type==="consultation").length}</div>
                    <div className={styles.statChipLbl}>Total Visits</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statChipVal}>{totalPrescr}</div>
                    <div className={styles.statChipLbl}>Prescriptions</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statChipVal}>{totalLabs}</div>
                    <div className={styles.statChipLbl}>Lab Requests</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statChipVal} style={{fontSize:12,marginTop:3}}>{lastVisit}</div>
                    <div className={styles.statChipLbl}>Last Visit</div>
                  </div>
                </div>

                {/* Timeline — identical structure */}
                <div className={styles.timelineScroll}>
                  <div className={styles.timelineHeading}>Medical Timeline</div>
                  <div className={styles.filterBar}>
                    {FILTERS.map(f => (
                      <button key={f.value}
                        className={`${styles.filterTab}${filter===f.value?" "+styles.filterTabActive:""}`}
                        onClick={() => setFilter(f.value)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {visits.length > 0
                    ? <div className={styles.track}>{visits.map(v => <VisitCard key={v.id} visit={v}/>)}</div>
                    : <div style={{padding:"40px 0",textAlign:"center",color:"var(--text3)",fontSize:13}}>No records found.</div>
                  }
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}