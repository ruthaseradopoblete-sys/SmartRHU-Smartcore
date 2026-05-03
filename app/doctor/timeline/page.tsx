"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./timeline.module.css";
import DoctorSidebar from "../../components/DoctorSidebar";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────
interface PatientSummary {
  id: string; name: string; age: string; gender: string;
  civil: string; addr: string; philHealth: string; bloodType: string;
  lastVisit: string | null; visitCount: number;
}

interface Consultation {
  id: string; date: string; status: string;
  subjective: string | null; objective: string | null;
  assessment: string | null; plan: string | null;
}

interface Prescription {
  id: string; date: string; medicine: string;
  quantity: string | null; dosage_frequency: string | null;
  notes: string | null; status: string;
}

interface LabRequest {
  id: string; date: string; status: string; tests: string[];
}

interface PatientDetail {
  patient:      any;
  consultations: Consultation[];
  prescriptions: Prescription[];
  labRequests:   LabRequest[];
  physical:      any;
  pastMed:       any;
  famHist:       any;
  social:        any;
  menstrual:     any;
  pregnancy:     any;
  immunization:  any;
}

// ── Lab test column map ────────────────────────────────────
const LAB_TEST_MAP: Record<string,string> = {
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

const DISEASE_KEYS = [
  ["allergy","Allergy"],["asthma","Asthma"],["cancer","Cancer"],
  ["cerebrovascular_disease","Cerebrovascular Disease"],
  ["coronary_artery_disease","Coronary Artery Disease"],
  ["diabetes_mellitus","Diabetes Mellitus"],["emphysema","Emphysema"],
  ["epilepsy_seizure","Epilepsy/Seizure"],["hepatitis","Hepatitis"],
  ["hyperlipidemia","Hyperlipidemia"],["hypertension","Hypertension"],
  ["peptic_ulcer","Peptic Ulcer"],["pneumonia","Pneumonia"],
  ["thyroid_disease","Thyroid Disease"],["ptb","PTB"],
  ["urinary_tract_infection","UTI"],["mental_illness","Mental Illness"],
] as const;

const VACCINE_KEYS = [
  ["bcg","BCG"],["opv1","OPV1"],["opv2","OPV2"],["opv3","OPV3"],
  ["dpt1","DPT1"],["dpt2","DPT2"],["dpt3","DPT3"],["measles","Measles"],
  ["hapa1","HepA1"],["hapa2","HepA2"],["hapa3","HepA3"],
  ["varicella","Varicella"],["hpv","HPV"],["mmr","MMR"],
  ["pneumococcal_vaccine","Pneumococcal"],["flu_vaccine","Flu Vaccine"],
] as const;

// ── Helpers ────────────────────────────────────────────────
function initials(name: string) { return name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(); }
function avatarColor(gender: string) { return gender==="Female" ? "#ec4899" : "#3b82f6"; }
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"});
}
function checkedList(obj: any, keys: readonly (readonly [string,string])[]): string[] {
  if (!obj) return [];
  return keys.filter(([k]) => obj[k]===true).map(([,l]) => l);
}

// ── Sub-components ─────────────────────────────────────────
function Chip({ text, color="#16a34a" }: { text:string; color?:string }) {
  return (
    <span style={{background:`${color}18`,color,border:`1px solid ${color}40`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>
      {text}
    </span>
  );
}

function InfoRow({ label, value }: { label:string; value:any }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{display:"flex",gap:8,fontSize:12,padding:"2px 0"}}>
      <span style={{color:"var(--text3)",minWidth:150,flexShrink:0,fontSize:11}}>{label}</span>
      <span style={{color:"var(--text)",fontWeight:500}}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:10,fontWeight:700,color:"var(--text3)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"1px solid var(--border)"}}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status:string }) {
  const styles_: Record<string,React.CSSProperties> = {
    done:      {background:"#dcfce7",color:"#166534"},
    waiting:   {background:"#fef9c3",color:"#854d0e"},
    completed: {background:"#dcfce7",color:"#166534"},
    pending:   {background:"#fef9c3",color:"#854d0e"},
    cancelled: {background:"#fee2e2",color:"#991b1b"},
    sent:      {background:"#dbeafe",color:"#1e40af"},
  };
  const s = styles_[status] ?? {background:"#f3f4f6",color:"#6b7280"};
  return (
    <span style={{...s,fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,textTransform:"uppercase",letterSpacing:".05em",flexShrink:0}}>
      {status}
    </span>
  );
}

// ── Expandable visit card ──────────────────────────────────
function ConsultCard({ c }: { c: Consultation }) {
  const [open, setOpen] = useState(false);
  const hasContent = c.assessment || c.subjective || c.objective || c.plan;
  return (
    <div style={{background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:12,overflow:"hidden",marginBottom:10,boxShadow:"var(--shadow-sm)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:hasContent?"pointer":"default"}}
        onClick={() => hasContent && setOpen(o=>!o)}>
        <div style={{width:8,height:8,borderRadius:"50%",background:c.status==="done"?"var(--green)":"var(--text3)",flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{fmtDate(c.date)}</div>
          {c.assessment && <div style={{fontSize:11,color:"var(--text2)",marginTop:1}}>{c.assessment}</div>}
        </div>
        <StatusBadge status={c.status} />
        {hasContent && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"
            style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>
      {open && hasContent && (
        <div style={{borderTop:"1px solid var(--border)",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
          {c.subjective  && <div><div style={{fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:4}}>Subjective</div><div style={{fontSize:12,color:"var(--text2)",lineHeight:1.6,background:"var(--surface2)",borderRadius:8,padding:"8px 12px"}}>{c.subjective}</div></div>}
          {c.objective   && <div><div style={{fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:4}}>Objective</div><div style={{fontSize:12,color:"var(--text2)",lineHeight:1.6,background:"var(--surface2)",borderRadius:8,padding:"8px 12px"}}>{c.objective}</div></div>}
          {c.assessment  && <div><div style={{fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:4}}>Assessment</div><div style={{fontSize:12,color:"var(--green-dark)",fontWeight:500,lineHeight:1.6,background:"var(--green-light)",borderLeft:"3px solid var(--green)",borderRadius:"0 8px 8px 0",padding:"8px 12px"}}>{c.assessment}</div></div>}
          {c.plan        && <div><div style={{fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:4}}>Plan</div><div style={{fontSize:12,color:"var(--text2)",lineHeight:1.6,background:"var(--surface2)",borderRadius:8,padding:"8px 12px"}}>{c.plan}</div></div>}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function PatientTimeline() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [patients,    setPatients]    = useState<PatientSummary[]>([]);
  const [detail,      setDetail]      = useState<PatientDetail | null>(null);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [patSearch,   setPatSearch]   = useState("");
  const [search,      setSearch]      = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab,   setActiveTab]   = useState<"timeline"|"history">("timeline");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  // ── Fetch patient list ────────────────────────────────
  const fetchPatients = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("patients")
      .select("id, first_name, last_name, age, sex, purok, barangay, municipality, philhealth_pin")
      .order("last_name", { ascending: true });

    if (error) { console.error(error); setLoadingList(false); return; }

    // Get consultation counts
    const { data: counts } = await supabase
      .from("soap_consultations")
      .select("patient_id, consultation_date")
      .eq("status", "done");

    const countMap: Record<string, { count: number; last: string }> = {};
    (counts ?? []).forEach((c: any) => {
      if (!countMap[c.patient_id]) countMap[c.patient_id] = { count:0, last:"" };
      countMap[c.patient_id].count++;
      if (!countMap[c.patient_id].last || c.consultation_date > countMap[c.patient_id].last)
        countMap[c.patient_id].last = c.consultation_date;
    });

    setPatients((data ?? []).map((p: any) => ({
      id:          p.id,
      name:        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      age:         p.age != null ? String(p.age) : "",
      gender:      p.sex === "F" ? "Female" : p.sex === "M" ? "Male" : "",
      civil:       "",
      addr:        [p.purok, p.barangay, p.municipality].filter(Boolean).join(", "),
      philHealth:  p.philhealth_pin ?? "",
      bloodType:   "",
      lastVisit:   countMap[p.id]?.last ?? null,
      visitCount:  countMap[p.id]?.count ?? 0,
    })));
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // ── Fetch full patient detail ─────────────────────────
  async function fetchDetail(patientId: string) {
    setLoadingDetail(true);
    setDetail(null);
    setActiveTab("timeline");

    const [
      patRes, consultRes, prescRes, labRes,
      physicalRes, pastMedRes, famHistRes,
      socialRes, menstrualRes, pregnancyRes, immunoRes,
    ] = await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).single(),
      supabase.from("soap_consultations").select("id,consultation_date,status,subjective,objective,assessment,plan")
        .eq("patient_id", patientId).order("consultation_date",{ascending:false}),
      supabase.from("prescriptions").select("id,prescription_date,medicine,quantity,dosage_frequency,notes,status")
        .eq("patient_id", patientId).order("prescription_date",{ascending:false}),
      supabase.from("laboratory_requests").select("*")
        .eq("patient_id", patientId).order("request_date",{ascending:false}),
      supabase.from("physical_exam_findings").select("*").eq("patient_id",patientId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("past_medical_history").select("*").eq("patient_id",patientId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("family_history").select("*").eq("patient_id",patientId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("personal_social_history").select("*").eq("patient_id",patientId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("menstrual_history").select("*").eq("patient_id",patientId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("pregnancy_history").select("*").eq("patient_id",patientId).order("id",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("immunization_history").select("*").eq("patient_id",patientId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    ]);

    const consultations: Consultation[] = (consultRes.data ?? []).map((c: any) => ({
      id: c.id, date: c.consultation_date, status: c.status,
      subjective: c.subjective, objective: c.objective,
      assessment: c.assessment, plan: c.plan,
    }));

    const prescriptions: Prescription[] = (prescRes.data ?? []).map((p: any) => ({
      id: p.id, date: p.prescription_date, medicine: p.medicine,
      quantity: p.quantity, dosage_frequency: p.dosage_frequency,
      notes: p.notes, status: p.status,
    }));

    const labRequests: LabRequest[] = (labRes.data ?? []).map((l: any) => ({
      id: l.id, date: l.request_date, status: l.status,
      tests: Object.keys(LAB_TEST_MAP).filter(k => l[k]===true).map(k => LAB_TEST_MAP[k]),
    }));

    setDetail({
      patient: patRes.data,
      consultations, prescriptions, labRequests,
      physical: physicalRes.data,
      pastMed:  pastMedRes.data,
      famHist:  famHistRes.data,
      social:   socialRes.data,
      menstrual: menstrualRes.data,
      pregnancy: pregnancyRes.data,
      immunization: immunoRes.data,
    });
    setLoadingDetail(false);
  }

  function selectPatient(p: PatientSummary) {
    setSelectedId(p.id);
    fetchDetail(p.id);
  }

  if (isLoading || !user) return null;

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patSearch.toLowerCase())
  );

  const selected = patients.find(p => p.id === selectedId) ?? null;
  const isFemale = selected?.gender === "Female";

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

          {/* ── Patient List ── */}
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
              {loadingList && <div style={{padding:20,textAlign:"center",fontSize:12,color:"var(--text3)"}}>Loading patients…</div>}
              {!loadingList && filteredPatients.length === 0 && (
                <div style={{padding:20,textAlign:"center",fontSize:12,color:"var(--text3)"}}>No patients found</div>
              )}
              {filteredPatients.map(p => (
                <div key={p.id}
                  className={`${styles.patientCard}${selectedId===p.id?" "+styles.patientCardActive:""}`}
                  onClick={() => selectPatient(p)}>
                  <div className={styles.patientAvatar} style={{background:avatarColor(p.gender)}}>
                    {initials(p.name)}
                  </div>
                  <div className={styles.patientCardInfo}>
                    <div className={styles.patientCardName}>{p.name}</div>
                    <div className={styles.patientCardMeta}>
                      {p.age ? `${p.age}y` : ""}{p.gender ? ` · ${p.gender}` : ""} · {p.visitCount} visit{p.visitCount!==1?"s":""}
                    </div>
                  </div>
                  <span className={`${styles.patientCardBadge} ${p.visitCount>0?styles.badgeOngoing:styles.badgeCompleted}`}>
                    {p.visitCount > 0 ? "Active" : "New"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Detail Panel ── */}
          <div className={styles.timelinePanel}>
            {!selectedId ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📋</div>
                <div className={styles.emptyText}>Select a patient</div>
                <div className={styles.emptyHint}>Choose a patient from the list to view their records</div>
              </div>
            ) : loadingDetail ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} style={{fontSize:32,opacity:.3}}>⏳</div>
                <div className={styles.emptyText}>Loading records…</div>
              </div>
            ) : detail && selected ? (
              <>
                {/* Patient info bar */}
                <div className={styles.patientInfoBar}>
                  <div className={styles.patientInfoAvatar} style={{background:avatarColor(selected.gender)}}>
                    {initials(selected.name)}
                  </div>
                  <div className={styles.patientInfoDetails}>
                    <div className={styles.patientInfoName}>{selected.name}</div>
                    <div className={styles.patientInfoMeta}>
                      {selected.age    && <span className={styles.patientInfoChip}>🕐 {selected.age} yrs</span>}
                      {selected.gender && <span className={styles.patientInfoChip}>👤 {selected.gender}</span>}
                      {selected.addr   && <span className={styles.patientInfoChip}>📍 {selected.addr}</span>}
                      {detail.patient?.philhealth_pin && <span className={styles.patientInfoChip}>🪪 {detail.patient.philhealth_pin}</span>}
                      {detail.physical?.blood_type    && <span className={styles.patientInfoChip}>🩸 {detail.physical.blood_type}</span>}
                    </div>
                    {/* Condition & allergy badges from past medical history */}
                    <div className={styles.patientBadges}>
                      {checkedList(detail.pastMed, DISEASE_KEYS).map(c => (
                        <span key={c} className={styles.conditionBadge}>
                          <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#c0152a",marginRight:5,verticalAlign:"middle"}}/>
                          {c}
                        </span>
                      ))}
                      {detail.pastMed?.allergy && detail.pastMed?.allergy_specify && (
                        <span className={styles.allergyBadge}>⚠️ Allergy: {detail.pastMed.allergy_specify}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats strip */}
                <div className={styles.statsStrip}>
                  <div className={styles.statChip}>
                    <div className={styles.statChipVal}>{detail.consultations.length}</div>
                    <div className={styles.statChipLbl}>Consultations</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statChipVal}>{detail.prescriptions.length}</div>
                    <div className={styles.statChipLbl}>Prescriptions</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statChipVal}>{detail.labRequests.length}</div>
                    <div className={styles.statChipLbl}>Lab Requests</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statChipVal} style={{fontSize:12,marginTop:3}}>
                      {selected.lastVisit ? fmtDate(selected.lastVisit) : "—"}
                    </div>
                    <div className={styles.statChipLbl}>Last Visit</div>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{display:"flex",borderBottom:"1px solid var(--border)",flexShrink:0,background:"var(--surface)"}}>
                  {([["timeline","📅 Timeline"],["history","📋 Medical History"]] as const).map(([t,l]) => (
                    <button key={t} onClick={() => setActiveTab(t)} style={{
                      flex:1, padding:"11px 0", border:"none", background:"transparent",
                      fontSize:12, fontWeight:700, cursor:"pointer",
                      fontFamily:"DM Sans,sans-serif",
                      color: activeTab===t ? "var(--green)" : "var(--text3)",
                      borderBottom: activeTab===t ? "2px solid var(--green)" : "2px solid transparent",
                      transition:"all .15s",
                    }}>{l}</button>
                  ))}
                </div>

                <div className={styles.timelineScroll}>

                  {/* ── TIMELINE TAB ── */}
                  {activeTab === "timeline" && (
                    <>
                      {/* Consultations */}
                      {detail.consultations.length > 0 && (
                        <Section title="Consultations">
                          {detail.consultations.map(c => <ConsultCard key={c.id} c={c} />)}
                        </Section>
                      )}

                      {/* Prescriptions */}
                      {detail.prescriptions.length > 0 && (
                        <Section title="Prescriptions">
                          {detail.prescriptions.map(p => (
                            <div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:10,marginBottom:8,boxShadow:"var(--shadow-sm)"}}>
                              <span style={{fontSize:18,flexShrink:0}}>💊</span>
                              <div style={{flex:1}}>
                                <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{p.medicine}</div>
                                {p.dosage_frequency && <div style={{fontSize:11,color:"var(--text2)",marginTop:1}}>{p.dosage_frequency}</div>}
                                {p.quantity         && <div style={{fontSize:11,color:"var(--text3)"}}>Qty: {p.quantity}</div>}
                                {p.notes            && <div style={{fontSize:11,color:"var(--text3)",fontStyle:"italic",marginTop:2}}>{p.notes}</div>}
                                <div style={{fontSize:10,color:"var(--text3)",marginTop:3}}>{fmtDate(p.date)}</div>
                              </div>
                              <StatusBadge status={p.status} />
                            </div>
                          ))}
                        </Section>
                      )}

                      {/* Lab Requests */}
                      {detail.labRequests.length > 0 && (
                        <Section title="Lab Requests">
                          {detail.labRequests.map(l => (
                            <div key={l.id} style={{background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:10,marginBottom:8,overflow:"hidden",boxShadow:"var(--shadow-sm)"}}>
                              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px"}}>
                                <span style={{fontSize:18}}>🧪</span>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{fmtDate(l.date)}</div>
                                  <div style={{fontSize:11,color:"var(--text3)",marginTop:1}}>{l.tests.length} test{l.tests.length!==1?"s":""} ordered</div>
                                </div>
                                <StatusBadge status={l.status} />
                              </div>
                              {l.tests.length > 0 && (
                                <div style={{padding:"0 14px 10px",display:"flex",flexWrap:"wrap",gap:5}}>
                                  {l.tests.map(t => <Chip key={t} text={t} color="#3b82f6" />)}
                                </div>
                              )}
                            </div>
                          ))}
                        </Section>
                      )}

                      {detail.consultations.length === 0 && detail.prescriptions.length === 0 && detail.labRequests.length === 0 && (
                        <div style={{textAlign:"center",padding:"40px 0",color:"var(--text3)",fontSize:13}}>No visit records yet.</div>
                      )}
                    </>
                  )}

                  {/* ── MEDICAL HISTORY TAB ── */}
                  {activeTab === "history" && (
                    <>
                      {/* Vitals */}
                      {detail.physical && (
                        <Section title="Latest Vitals & Physical Exam">
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px 16px",background:"var(--surface2)",borderRadius:10,padding:"12px 16px"}}>
                            <InfoRow label="Blood Pressure"    value={detail.physical.blood_pressure_mmhg} />
                            <InfoRow label="Heart Rate"        value={detail.physical.heart_rate_bpm ? `${detail.physical.heart_rate_bpm} bpm` : null} />
                            <InfoRow label="Temperature"       value={detail.physical.temperature_c ? `${detail.physical.temperature_c}°C` : null} />
                            <InfoRow label="Respiratory Rate"  value={detail.physical.respiratory_rate_cpm} />
                            <InfoRow label="Weight"            value={detail.physical.weight_kg ? `${detail.physical.weight_kg} kg` : null} />
                            <InfoRow label="Height"            value={detail.physical.height_cm ? `${detail.physical.height_cm} cm` : null} />
                            <InfoRow label="Blood Type"        value={detail.physical.blood_type} />
                            <InfoRow label="Visual Acuity (R)" value={detail.physical.visual_acuity_right_eye} />
                            <InfoRow label="Visual Acuity (L)" value={detail.physical.visual_acuity_left_eye} />
                          </div>
                        </Section>
                      )}

                      {/* Past Medical */}
                      {checkedList(detail.pastMed, DISEASE_KEYS).length > 0 && (
                        <Section title="Past Medical History">
                          <div style={{background:"var(--surface2)",borderRadius:10,padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                              {checkedList(detail.pastMed, DISEASE_KEYS).map(c => <Chip key={c} text={c} />)}
                            </div>
                            {detail.pastMed?.allergy_specify         && <InfoRow label="Allergy details"   value={detail.pastMed.allergy_specify} />}
                            {detail.pastMed?.cancer_specify          && <InfoRow label="Cancer type"        value={detail.pastMed.cancer_specify} />}
                            {detail.pastMed?.hypertension_highest_bp && <InfoRow label="Highest BP"         value={detail.pastMed.hypertension_highest_bp} />}
                            {detail.pastMed?.past_surgeries_done     && <InfoRow label="Past surgeries"     value={detail.pastMed.past_surgeries_done} />}
                          </div>
                        </Section>
                      )}

                      {/* Family History */}
                      {checkedList(detail.famHist, DISEASE_KEYS).length > 0 && (
                        <Section title="Family History">
                          <div style={{background:"var(--surface2)",borderRadius:10,padding:"12px 16px"}}>
                            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                              {checkedList(detail.famHist, DISEASE_KEYS).map(c => <Chip key={c} text={c} color="#9333ea" />)}
                            </div>
                          </div>
                        </Section>
                      )}

                      {/* Personal & Social */}
                      {detail.social && (detail.social.smoking || detail.social.alcohol || detail.social.illicit_drugs || detail.social.sexually_active) && (
                        <Section title="Personal & Social History">
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px",background:"var(--surface2)",borderRadius:10,padding:"12px 16px"}}>
                            <InfoRow label="Smoking"         value={detail.social.smoking} />
                            <InfoRow label="Alcohol"         value={detail.social.alcohol} />
                            <InfoRow label="Illicit Drugs"   value={detail.social.illicit_drugs} />
                            <InfoRow label="Sexually Active" value={detail.social.sexually_active} />
                          </div>
                        </Section>
                      )}

                      {/* Menstrual — female only */}
                      {isFemale && detail.menstrual && (detail.menstrual.last_menstrual_period || detail.menstrual.menarche_age) && (
                        <Section title="Menstrual History">
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px 16px",background:"var(--surface2)",borderRadius:10,padding:"12px 16px"}}>
                            <InfoRow label="LMP"             value={detail.menstrual.last_menstrual_period} />
                            <InfoRow label="Menarche Age"    value={detail.menstrual.menarche_age} />
                            <InfoRow label="Cycle (days)"    value={detail.menstrual.interval_cycle_days} />
                            <InfoRow label="Duration (days)" value={detail.menstrual.period_duration_days} />
                            <InfoRow label="Pads / Day"      value={detail.menstrual.pads_per_day} />
                            <InfoRow label="Menopause"       value={detail.menstrual.menopause ? "Yes" : null} />
                          </div>
                        </Section>
                      )}

                      {/* Pregnancy — female only */}
                      {isFemale && detail.pregnancy && (detail.pregnancy.gravida != null || detail.pregnancy.para != null) && (
                        <Section title="Pregnancy History">
                          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,textAlign:"center",background:"var(--surface2)",borderRadius:10,padding:"14px 16px"}}>
                            {["gravida","para","term","preterm","abortion","living"].map(k => (
                              detail.pregnancy[k] != null && (
                                <div key={k}>
                                  <div style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".08em"}}>{k}</div>
                                  <div style={{fontSize:22,fontWeight:800,color:"var(--green)",fontFamily:"Syne,sans-serif",lineHeight:1.3}}>{detail.pregnancy[k]}</div>
                                </div>
                              )
                            ))}
                          </div>
                        </Section>
                      )}

                      {/* Immunization */}
                      {checkedList(detail.immunization, VACCINE_KEYS).length > 0 && (
                        <Section title="Immunization History">
                          <div style={{background:"var(--surface2)",borderRadius:10,padding:"12px 16px"}}>
                            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                              {checkedList(detail.immunization, VACCINE_KEYS).map(v => <Chip key={v} text={v} color="#f59e0b" />)}
                            </div>
                            {detail.immunization?.others && <InfoRow label="Others" value={detail.immunization.others} />}
                          </div>
                        </Section>
                      )}

                      {/* No history */}
                      {!detail.physical && !detail.pastMed && !detail.famHist && !detail.social && !detail.immunization && (
                        <div style={{textAlign:"center",padding:"40px 0",color:"var(--text3)",fontSize:13}}>No medical history recorded yet.</div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}