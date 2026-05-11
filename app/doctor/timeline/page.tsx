"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./timeline.module.css";
import DoctorSidebar from "../../components/DoctorSidebar";
import { supabase } from "@/lib/supabase";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════
type VisitType = "consultation" | "lab" | "prescription" | "follow-up";
type SortKey   = "az" | "za" | "newest" | "oldest" | "mostVisits";
type ViewMode  = "all" | "active" | "archived";
type ExportCat = "consultation" | "lab_request" | "lab_result" | "prescription";
type ExportFmt = "excel" | "pdf" | "csv";

interface VisitEvent {
  id: string | number;
  date: string; time: string; type: VisitType;
  title: string; doctor: string; diagnosis: string;
  prescription?: string[]; labTests?: string[];
  notes: string;
  bp?: string; temp?: string; weight?: string;
  status: "completed" | "ongoing" | "scheduled";
  followUpDate?: string; followUpNotes?: string;
}

interface TimelinePatient {
  id: string;
  name: string; age: string; gender: string;
  civil: string; addr: string; barangay: string;
  philHealth: string; bloodType: string;
  conditions: string[]; allergies: string[];
  visits: VisitEvent[];
  _visitCount?: number; _lastVisit?: string; _hasOngoing?: boolean;
}

// ══════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════
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

const AGE_GROUPS = ["All Ages","0–17 (Minor)","18–35 (Young Adult)","36–60 (Adult)","60+ (Senior)"];

const VISIT_FILTERS: { label: string; value: VisitType | "all"; icon: string; color: string }[] = [
  { label:"All",          value:"all",          icon:"◉", color:"#16a34a" },
  { label:"Consultation", value:"consultation", icon:"🩺", color:"#16a34a" },
  { label:"Lab Work",     value:"lab",          icon:"🧪", color:"#2563eb" },
  { label:"Prescription", value:"prescription", icon:"💊", color:"#7c3aed" },
  { label:"Follow-up",    value:"follow-up",    icon:"🔁", color:"#d97706" },
];

const TYPE_COLOR: Partial<Record<VisitType,string>> = {
  consultation:"#16a34a", lab:"#2563eb", prescription:"#7c3aed", "follow-up":"#d97706",
};
const TYPE_BG: Partial<Record<VisitType,string>> = {
  consultation:"#dcfce7", lab:"#dbeafe", prescription:"#ede9fe", "follow-up":"#fef3c7",
};
const TYPE_LABEL: Partial<Record<VisitType,string>> = {
  consultation:"Consultation", lab:"Lab Work", prescription:"Prescription", "follow-up":"Follow-up",
};
const TYPE_ICON: Partial<Record<VisitType,string>> = {
  consultation:"🩺", lab:"🧪", prescription:"💊", "follow-up":"🔁",
};

const EXPORT_CATS: { key: ExportCat; label: string; icon: string; color: string; bg: string }[] = [
  { key:"consultation", label:"Consultation", icon:"🩺", color:"#166534", bg:"#dcfce7" },
  { key:"lab_request",  label:"Lab Request",  icon:"🧪", color:"#1e40af", bg:"#dbeafe" },
  { key:"lab_result",   label:"Lab Result",   icon:"📊", color:"#6d28d9", bg:"#ede9fe" },
  { key:"prescription", label:"Prescription", icon:"💊", color:"#9a3412", bg:"#ffedd5" },
];

const FORMAT_CONFIG: { key: ExportFmt; label: string; icon: string; color: string; bg: string; ext: string }[] = [
  { key:"excel", label:"Excel (.xlsx)", icon:"📗", color:"#15803d", bg:"#dcfce7", ext:".xlsx" },
  { key:"pdf",   label:"PDF",           icon:"📕", color:"#dc2626", bg:"#fee2e2", ext:".pdf"  },
  { key:"csv",   label:"CSV",           icon:"📄", color:"#0369a1", bg:"#e0f2fe", ext:".csv"  },
];

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function initials(name: string) { return name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(); }
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
}
function fmtDateShort(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { month:"short", day:"numeric", year:"numeric" });
}
function avatarColor(gender: string) { return gender === "Female" ? "#db2777" : "#2563eb"; }
function checkedList(obj: any, keys: [string,string][]): string[] {
  if (!obj) return [];
  return keys.filter(([k]) => obj[k] === true).map(([,l]) => l);
}
function daysUntil(iso: string): number {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(iso); d.setHours(0,0,0,0);
  return Math.round((d.getTime()-t.getTime())/86400000);
}
function countdownLabel(iso: string): string {
  const d = daysUntil(iso);
  if (d===0) return "Today"; if (d===1) return "Tomorrow";
  if (d>1)   return `In ${d} days`; if (d===-1) return "Yesterday";
  return `${Math.abs(d)} days ago`;
}
function ageGroupRange(label: string): [number,number] {
  if (label==="0–17 (Minor)")        return [0,17];
  if (label==="18–35 (Young Adult)") return [18,35];
  if (label==="36–60 (Adult)")       return [36,60];
  if (label==="60+ (Senior)")        return [61,999];
  return [0,999];
}

// ── Export ─────────────────────────────────────────────────────────────────
function buildExportRows(visits: VisitEvent[]): Record<ExportCat, any[]> {
  const out: Record<ExportCat, any[]> = { consultation:[],lab_request:[],lab_result:[],prescription:[] };
  [...visits].sort((a,b)=>b.date.localeCompare(a.date)).forEach(v => {
    if (v.type==="consultation") out.consultation.push({ "Date":fmtDate(v.date),"Title":v.title,"Doctor":v.doctor,"Diagnosis":v.diagnosis,"BP":v.bp??""  ,"Temp":v.temp??""  ,"Weight":v.weight??""  ,"Notes":v.notes,"Status":v.status });
    if (v.type==="lab") { const row={"Date":fmtDate(v.date),"Doctor":v.doctor,"Tests":(v.labTests??[]).join(", "),"Status":v.status}; out.lab_request.push(row); out.lab_result.push({...row,"Result":v.status==="completed"?"Available":"Pending"}); }
    if (v.type==="prescription") out.prescription.push({"Date":fmtDate(v.date),"Doctor":v.doctor,"Medicine":v.title.replace("Prescription — ",""),"Details":(v.prescription??[]).join(", "),"Notes":v.notes,"Status":v.status});
  });
  return out;
}
function toCSV(rows:any[]):string{ if(!rows.length)return""; const h=Object.keys(rows[0]); return[h.join(","),...rows.map(r=>h.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(","))].join("\n"); }
function downloadFile(c:string,f:string,m:string){ const b=new Blob([c],{type:m}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=f;a.click();URL.revokeObjectURL(u); }

function doExportPDF(title:string,rows:Record<ExportCat,any[]>){
  const cats:ExportCat[]=["consultation","lab_request","lab_result","prescription"];
  const total=cats.reduce((s,c)=>s+rows[c].length,0);
  const sections=cats.map(cat=>{
    const cfg=EXPORT_CATS.find(c=>c.key===cat)!,data=rows[cat];if(!data.length)return"";
    const h=Object.keys(data[0]);
    return`<h2 style="font-family:sans-serif;font-size:13px;font-weight:800;color:#0d3b1f;margin:20px 0 6px;border-bottom:2px solid #16a34a;padding-bottom:4px;">${cfg.icon} ${cfg.label}</h2><table style="width:100%;border-collapse:collapse;font-size:11px;font-family:sans-serif;"><thead><tr style="background:#dcfce7;">${h.map(k=>`<th style="text-align:left;padding:6px 10px;border:1px solid #d1fae5;color:#166534;">${k}</th>`).join("")}</tr></thead><tbody>${data.map((r:any,i:number)=>`<tr style="background:${i%2===0?"#fff":"#f6faf7"};">${h.map(k=>`<td style="padding:5px 10px;border:1px solid #e5e7eb;">${r[k]??""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }).join("");
  const win=window.open("","_blank");if(!win)return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SmartRHU — ${title}</title></head><body style="padding:32px;font-family:sans-serif;"><h1 style="color:#0d3b1f;font-size:18px;border-bottom:3px solid #16a34a;padding-bottom:10px;">${title}</h1><p style="color:#6b7280;font-size:11px;">${total} records · ${new Date().toLocaleString("en-PH")}</p>${sections}</body></html>`);
  win.document.close();win.focus();setTimeout(()=>win.print(),500);
}
function doExportExcel(title:string,rows:Record<ExportCat,any[]>){
  const cats:ExportCat[]=["consultation","lab_request","lab_result","prescription"];
  const s=cats.map(cat=>{const cfg=EXPORT_CATS.find(c=>c.key===cat)!,data=rows[cat];if(!data.length)return"";const h=Object.keys(data[0]);return`<tr><td colspan="${h.length}" style="background:#0d3b1f;color:#4ade80;font-weight:bold;padding:8px;">${cfg.icon} ${cfg.label}</td></tr><tr>${h.map(k=>`<th style="background:#dcfce7;color:#166534;font-weight:bold;padding:6px;border:1px solid #d1fae5;">${k}</th>`).join("")}</tr>${data.map((r:any)=>`<tr>${h.map(k=>`<td style="padding:5px 8px;border:1px solid #e5e7eb;">${r[k]??""}</td>`).join("")}</tr>`).join("")}<tr><td colspan="${h.length}"></td></tr>`;}).join("");
  downloadFile(`<html><head><meta charset="UTF-8"></head><body><h2 style="font-family:sans-serif;color:#0d3b1f;">${title}</h2><table border="1" style="border-collapse:collapse;font-family:sans-serif;font-size:12px;">${s}</table></body></html>`,`${title.replace(/ /g,"_")}.xls`,"application/vnd.ms-excel");
}
function doExportCSV(title:string,rows:Record<ExportCat,any[]>){ const cats:ExportCat[]=["consultation","lab_request","lab_result","prescription"];cats.forEach(cat=>{const cfg=EXPORT_CATS.find(c=>c.key===cat)!;if(!rows[cat].length)return;downloadFile(toCSV(rows[cat]),`${title.replace(/ /g,"_")}_${cfg.label}.csv`,"text/csv");}); }

// ══════════════════════════════════════════════════════
//  FILTER BAR — clean, professional, matches image 2
// ══════════════════════════════════════════════════════
interface FilterBarProps {
  search: string; onSearch:(v:string)=>void;
  viewMode: ViewMode; onViewMode:(v:ViewMode)=>void;
  gender: "All"|"Female"|"Male"; onGender:(v:"All"|"Female"|"Male")=>void;
  ageGroup: string; onAgeGroup:(v:string)=>void;
  barangay: string; barangayOptions:string[]; onBarangay:(v:string)=>void;
  sortBy: SortKey; onSort:(v:SortKey)=>void;
  totalPatients: number; allVisits: VisitEvent[];
}

function FilterBar({ search,onSearch,viewMode,onViewMode,gender,onGender,ageGroup,onAgeGroup,barangay,barangayOptions,onBarangay,sortBy,onSort,totalPatients,allVisits }: FilterBarProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportOpen,  setExportOpen]  = useState(false);
  const [exporting,   setExporting]   = useState<ExportFmt|null>(null);
  const [exportDone,  setExportDone]  = useState(false);
  const [selectedCats,setSelectedCats]= useState<Set<ExportCat>>(new Set(["consultation","lab_request","lab_result","prescription"]));

  useEffect(()=>{
    function h(e:MouseEvent){ if(exportRef.current&&!exportRef.current.contains(e.target as Node))setExportOpen(false); }
    if(exportOpen)document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[exportOpen]);

  function toggleCat(cat:ExportCat){ setSelectedCats(prev=>{ const next=new Set(prev); if(next.has(cat)){if(next.size>1)next.delete(cat);}else next.add(cat); return next; }); }

  async function handleExport(fmt:ExportFmt){
    setExportOpen(false);setExporting(fmt);
    const rows=buildExportRows(allVisits);
    const filtered:Record<ExportCat,any[]>={consultation:[],lab_request:[],lab_result:[],prescription:[]};
    (["consultation","lab_request","lab_result","prescription"] as ExportCat[]).filter(c=>selectedCats.has(c)).forEach(c=>{filtered[c]=rows[c];});
    if(fmt==="excel")doExportExcel("Patient_Records",filtered);
    else if(fmt==="pdf")doExportPDF("Patient Records",filtered);
    else doExportCSV("Patient_Records",filtered);
    setExporting(null);setExportDone(true);setTimeout(()=>setExportDone(false),2500);
  }

  const isAllFilters = gender==="All" && ageGroup==="All Ages" && barangay==="All Barangays";

  const Pill = ({ active, onClick, children }: { active:boolean; onClick:()=>void; children:React.ReactNode }) => (
    <button onClick={onClick} style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600,
      cursor:"pointer", fontFamily:"DM Sans,sans-serif", transition:"all .15s",
      whiteSpace:"nowrap",
      background: active ? "#16a34a" : "transparent",
      color:      active ? "#fff"    : "#6b7280",
      border:     active ? "none"    : "1.5px solid #e5e7eb",
      boxShadow:  active ? "0 2px 8px rgba(22,163,74,.25)" : "none",
    }}>
      {children}
    </button>
  );

  const DropSelect = ({ value, onChange, children }: { value:string; onChange:(v:string)=>void; children:React.ReactNode }) => (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      padding:"6px 30px 6px 12px", borderRadius:20, fontSize:12, fontWeight:600,
      cursor:"pointer", fontFamily:"DM Sans,sans-serif",
      border:"1.5px solid #e5e7eb", background:"transparent",
      color:"#374151", outline:"none",
      appearance:"none" as any,
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
      backgroundRepeat:"no-repeat", backgroundPosition:"calc(100% - 9px) center",
    }}>
      {children}
    </select>
  );

  return (
    <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f0", flexShrink:0, boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>

      {/* Row 1 — Search + Export */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 24px 10px" }}>
        <div style={{ flex:1, position:"relative" }}>
          <svg style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#9ca3af" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e=>onSearch(e.target.value)}
            placeholder="Search patient name, barangay, address…"
            style={{
              width:"100%", boxSizing:"border-box" as any,
              paddingLeft:38, paddingRight:16, paddingTop:10, paddingBottom:10,
              border:"1.5px solid #e5e7eb", borderRadius:10,
              fontSize:13, fontFamily:"DM Sans,sans-serif",
              color:"#111827", outline:"none", background:"#fafafa",
              transition:"all .15s",
            }}
            onFocus={e=>{e.target.style.borderColor="#16a34a";e.target.style.background="#fff";e.target.style.boxShadow="0 0 0 3px rgba(22,163,74,.08)";}}
            onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.background="#fafafa";e.target.style.boxShadow="none";}}
          />
        </div>

        {/* Export */}
        <div ref={exportRef} style={{ position:"relative", flexShrink:0 }}>
          <button onClick={()=>setExportOpen(o=>!o)} style={{
            display:"inline-flex", alignItems:"center", gap:7,
            padding:"9px 18px", borderRadius:10,
            background: exportDone ? "#16a34a" : "#fff",
            color:      exportDone ? "#fff"    : "#16a34a",
            border:"1.5px solid #16a34a",
            fontSize:13, fontWeight:700,
            fontFamily:"DM Sans,sans-serif", cursor:"pointer",
            transition:"all .15s",
            boxShadow:"0 1px 3px rgba(22,163,74,.1)",
          }}>
            {exporting?(
              <span>⏳ Exporting…</span>
            ):exportDone?(
              <span>✅ Done!</span>
            ):(
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transition:"transform .2s", transform:exportOpen?"rotate(180deg)":"rotate(0deg)" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </>
            )}
          </button>

          {exportOpen && (
            <div style={{
              position:"absolute", top:"calc(100% + 8px)", right:0,
              background:"#fff", borderRadius:14,
              border:"1.5px solid #e5e7eb",
              boxShadow:"0 20px 60px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.06)",
              minWidth:240, overflow:"hidden", zIndex:600,
            }}>
              <div style={{ padding:"14px 16px 10px", borderBottom:"1px solid #f5f5f5", background:"linear-gradient(135deg,#f0fdf4,#dcfce7)" }}>
                <div style={{ fontSize:12, fontWeight:800, color:"#0a2912", fontFamily:"Syne,sans-serif" }}>Export Records</div>
                <div style={{ fontSize:11, color:"#4b6557", marginTop:2 }}>{totalPatients} patients · select categories</div>
              </div>
              <div style={{ padding:"10px 16px 8px", borderBottom:"1px solid #f5f5f5" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".1em", marginBottom:8 }}>Include</div>
                {EXPORT_CATS.map(cat=>{
                  const isOn=selectedCats.has(cat.key);
                  return(
                    <label key={cat.key} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"5px 2px" }} onClick={()=>toggleCat(cat.key)}>
                      <div style={{ width:16, height:16, borderRadius:4, flexShrink:0, background:isOn?cat.color:"transparent", border:`2px solid ${isOn?cat.color:"#d1d5db"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
                        {isOn&&<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>}
                      </div>
                      <span style={{ fontSize:12, fontWeight:600, color:isOn?cat.color:"#9ca3af", display:"flex", alignItems:"center", gap:5, transition:"color .15s" }}>
                        {cat.icon} {cat.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div style={{ padding:"8px 0" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".1em", padding:"0 16px 8px" }}>Format</div>
                {FORMAT_CONFIG.map((fmt,i)=>(
                  <button key={fmt.key} onClick={()=>handleExport(fmt.key)}
                    style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 16px", border:"none", borderBottom:i<FORMAT_CONFIG.length-1?"1px solid #f5f5f5":"none", background:"transparent", cursor:"pointer", fontFamily:"DM Sans,sans-serif", transition:"background .12s" }}
                    onMouseOver={e=>{e.currentTarget.style.background="#f0fdf4";}}
                    onMouseOut={e=>{e.currentTarget.style.background="transparent";}}
                  >
                    <span style={{ width:32, height:32, borderRadius:8, background:fmt.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{fmt.icon}</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#111827", textAlign:"left" }}>{fmt.label}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:fmt.color }}>{fmt.ext}</span>
                  </button>
                ))}
              </div>
              <div style={{ padding:"8px 16px 10px", fontSize:10, color:"#9ca3af", textAlign:"center", borderTop:"1px solid #f5f5f5", background:"#fafafa" }}>
                {selectedCats.size}/{EXPORT_CATS.length} categories selected
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 — View mode tabs */}
      <div style={{ display:"flex", alignItems:"center", gap:2, padding:"0 24px 8px" }}>
        {(["all","active","archived"] as ViewMode[]).map(mode=>{
          const active = viewMode===mode;
          const counts: Record<ViewMode,string> = { all:"All", active:"Active", archived:"Archived" };
          return(
            <button key={mode} onClick={()=>onViewMode(mode)} style={{
              padding:"5px 16px", borderRadius:8, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:"DM Sans,sans-serif", transition:"all .15s", border:"none",
              background: active ? "#f0fdf4" : "transparent",
              color:      active ? "#16a34a" : "#9ca3af",
              borderBottom: active ? "2px solid #16a34a" : "2px solid transparent",
            }}>
              {counts[mode]}
            </button>
          );
        })}
      </div>

      {/* Row 3 — Filter pills */}
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", padding:"0 24px 14px" }}>
        <Pill active={isAllFilters} onClick={()=>{onGender("All");onAgeGroup("All Ages");onBarangay("All Barangays");}}>All</Pill>

        <Pill active={gender==="Female"} onClick={()=>onGender(gender==="Female"?"All":"Female")}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="5"/><path d="M12 13v8M9 18h6"/></svg>
          Female
        </Pill>

        <Pill active={gender==="Male"} onClick={()=>onGender(gender==="Male"?"All":"Male")}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="10" cy="14" r="5"/><path d="M21 3l-6 6M21 3h-6M21 3v6"/></svg>
          Male
        </Pill>

        <div style={{ width:1, height:20, background:"#e5e7eb", margin:"0 2px" }}/>

        <DropSelect value={ageGroup} onChange={onAgeGroup}>
          {AGE_GROUPS.map(g=><option key={g} value={g}>{g}</option>)}
        </DropSelect>

        <DropSelect value={barangay} onChange={onBarangay}>
          {barangayOptions.map(b=><option key={b} value={b}>{b}</option>)}
        </DropSelect>

        <div style={{ width:1, height:20, background:"#e5e7eb", margin:"0 2px" }}/>

        <Pill active={sortBy==="az"||sortBy==="za"} onClick={()=>onSort(sortBy==="az"?"za":"az")}>
          {sortBy==="za"?"Z → A":"A → Z"}
        </Pill>
        <Pill active={sortBy==="oldest"} onClick={()=>onSort("oldest")}>Oldest</Pill>
        <Pill active={sortBy==="newest"} onClick={()=>onSort("newest")}>Newest</Pill>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  VISIT CARD
// ══════════════════════════════════════════════════════
function VisitCard({ visit }: { visit: VisitEvent }) {
  const [open, setOpen] = useState(false);
  const isFollowUp = visit.type === "follow-up";
  const color  = TYPE_COLOR[visit.type]  ?? "#9ca3af";
  const bg     = TYPE_BG[visit.type]     ?? "#f3f4f6";
  const icon   = TYPE_ICON[visit.type]   ?? "📄";
  const label  = TYPE_LABEL[visit.type]  ?? visit.type;
  const fuDays = visit.followUpDate ? daysUntil(visit.followUpDate) : null;
  const fuUpcoming = fuDays !== null && fuDays >= 0;

  return (
    <div style={{ position:"relative" }}>
      {/* Timeline dot */}
      <div style={{
        position:"absolute", left:-32, top:20,
        width:20, height:20, borderRadius:"50%",
        background:color, color:"#fff",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:9, boxShadow:`0 0 0 4px #f0f7f2, 0 0 0 5px ${color}30`,
        zIndex:1,
      }}>
        {icon}
      </div>

      <div
        onClick={()=>setOpen(o=>!o)}
        style={{
          background:"#fff",
          borderRadius:12,
          border:`1px solid ${open ? color+"50" : "#f0f0f0"}`,
          boxShadow: open
            ? `0 4px 20px ${color}18, 0 0 0 2px ${color}18`
            : "0 1px 4px rgba(0,0,0,.05)",
          overflow:"hidden",
          transition:"all .2s",
          cursor:"pointer",
        }}
      >
        {/* Follow-up alert banner */}
        {isFollowUp && visit.followUpDate && fuUpcoming && (
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"linear-gradient(90deg,#fef3c7,#fefce8)",
            borderBottom:"1px solid rgba(217,119,6,.15)",
            padding:"7px 16px", fontSize:11.5, fontWeight:600, color:"#92400e",
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#d97706", display:"inline-block", animation:"pulse 2s infinite" }}/>
            Upcoming Follow-up
            <span style={{ marginLeft:"auto", fontWeight:700, background:"rgba(217,119,6,.12)", padding:"2px 8px", borderRadius:20, fontSize:10 }}>
              {countdownLabel(visit.followUpDate)}
            </span>
          </div>
        )}

        {/* Card header */}
        <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px" }}>
          {/* Date block */}
          <div style={{ textAlign:"center", flexShrink:0, minWidth:48 }}>
            <div style={{ fontSize:18, fontWeight:800, color:color, fontFamily:"Syne,sans-serif", lineHeight:1 }}>
              {visit.date ? new Date(visit.date).getDate() : "—"}
            </div>
            <div style={{ fontSize:9, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".08em", marginTop:2 }}>
              {visit.date ? new Date(visit.date).toLocaleDateString("en-PH",{month:"short"}) : ""}
            </div>
            <div style={{ fontSize:9, color:"#9ca3af" }}>
              {visit.date ? new Date(visit.date).getFullYear() : ""}
            </div>
          </div>

          <div style={{ width:1, height:40, background:"#f0f0f0", flexShrink:0 }}/>

          {/* Main info */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{
                fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:20,
                background:bg, color:color, letterSpacing:".04em", textTransform:"uppercase",
              }}>
                {icon} {label}
              </span>
              <span style={{
                fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20,
                background: visit.status==="completed" ? "#f3f4f6" : visit.status==="ongoing" ? "#fef9c3" : "#dbeafe",
                color:      visit.status==="completed" ? "#6b7280" : visit.status==="ongoing"  ? "#92400e"  : "#1e40af",
              }}>
                {visit.status==="completed"?"Done":visit.status==="ongoing"?"In Progress":"Scheduled"}
              </span>
            </div>
            <div style={{ fontSize:13.5, fontWeight:700, color:"#111827", fontFamily:"Syne,sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {visit.title}
            </div>
            {visit.doctor && (
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>Dr. {visit.doctor}</div>
            )}
          </div>

          {/* Chevron */}
          <svg style={{ color:"#d1d5db", transition:"transform .2s", transform:open?"rotate(180deg)":"rotate(0deg)", flexShrink:0 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Expanded body */}
        {open && (
          <div style={{ padding:"16px 18px 20px", borderTop:"1px solid #f5f5f5", display:"flex", flexDirection:"column", gap:14 }} onClick={e=>e.stopPropagation()}>

            {(visit.bp||visit.temp||visit.weight) && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#9ca3af", marginBottom:8 }}>Vitals</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[
                    visit.bp     && { icon:"❤️", label:"BP",   val:`${visit.bp} mmHg` },
                    visit.temp   && { icon:"🌡️", label:"Temp", val:visit.temp },
                    visit.weight && { icon:"⚖️", label:"Wt",   val:visit.weight },
                  ].filter(Boolean).map((v:any)=>(
                    <div key={v.label} style={{ display:"flex", alignItems:"center", gap:6, background:"#fafafa", border:"1px solid #f0f0f0", borderRadius:8, padding:"7px 14px", fontSize:12 }}>
                      {v.icon} <span style={{ color:"#6b7280" }}>{v.label}</span> <strong style={{ color:"#111827" }}>{v.val}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visit.diagnosis && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#9ca3af", marginBottom:8 }}>Diagnosis</div>
                <div style={{ background:"#f0fdf4", borderLeft:"3px solid #16a34a", borderRadius:"0 8px 8px 0", padding:"10px 14px", fontSize:13, color:"#166534", fontWeight:500, lineHeight:1.6 }}>
                  {visit.diagnosis}
                </div>
              </div>
            )}

            {isFollowUp && visit.followUpDate && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#9ca3af", marginBottom:8 }}>Follow-up Schedule</div>
                <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef9c3)", borderLeft:"3px solid #d97706", borderRadius:"0 8px 8px 0", padding:"12px 16px", display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#78350f" }}>📅 {fmtDate(visit.followUpDate)}</div>
                  {visit.followUpNotes && <div style={{ fontSize:12, color:"#92400e", lineHeight:1.55 }}>{visit.followUpNotes}</div>}
                  {fuDays!==null&&(
                    <span style={{ fontSize:10, fontWeight:700, background:"#d97706", color:"#fff", padding:"3px 10px", borderRadius:20, width:"fit-content" }}>
                      {fuUpcoming?"🕐 ":"✓ "}{fuUpcoming?fuDays===0?"Checkup is today!":fuDays===1?"Tomorrow":`${fuDays} days away`:fuDays===-1?"Was yesterday":`${Math.abs(fuDays)} days ago`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {!!visit.prescription?.length && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#9ca3af", marginBottom:8 }}>Prescription</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {visit.prescription.map(rx=>(
                    <span key={rx} style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:20, padding:"5px 12px", fontSize:12, color:"#6d28d9" }}>
                      💊 {rx}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!!visit.labTests?.length && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#9ca3af", marginBottom:8 }}>Tests Ordered</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                  {visit.labTests.map(t=>(
                    <div key={t} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#374151" }}>
                      <div style={{ width:16, height:16, borderRadius:4, background:"#dbeafe", color:"#1e40af", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, flexShrink:0 }}>✓</div>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visit.notes && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#9ca3af", marginBottom:8 }}>Notes</div>
                <div style={{ background:"#fafafa", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#4b5563", lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                  {visit.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════
export default function PatientTimeline() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [patients,      setPatients]      = useState<TimelinePatient[]>([]);
  const [selected,      setSelected]      = useState<TimelinePatient|null>(null);
  const [visitFilter,   setVisitFilter]   = useState<VisitType|"all">("all");
  const [loadingList,   setLoadingList]   = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // FilterBar state
  const [search,      setSearch]      = useState("");
  const [viewMode,    setViewMode]    = useState<ViewMode>("all");
  const [gender,      setGender]      = useState<"All"|"Female"|"Male">("All");
  const [ageGroup,    setAgeGroup]    = useState("All Ages");
  const [barangay,    setBarangay]    = useState("All Barangays");
  const [sortBy,      setSortBy]      = useState<SortKey>("newest");
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());

  useEffect(()=>{ if(!isLoading&&!user)router.replace("/login"); },[user,isLoading,router]);

  const fetchPatients = useCallback(async()=>{
    setLoadingList(true);
    const {data:pData} = await supabase.from("patients").select("id,first_name,last_name,age,sex,purok,barangay,municipality,philhealth_pin").order("last_name",{ascending:true});
    if(!pData){setLoadingList(false);return;}

    const [{data:physData},{data:medData},{data:cData}] = await Promise.all([
      supabase.from("physical_exam_findings").select("patient_id,blood_type"),
      supabase.from("past_medical_history").select("patient_id,"+DISEASE_KEYS.map(([k])=>k).join(",")+",allergy_specify"),
      supabase.from("soap_consultations").select("patient_id,consultation_date,status").order("consultation_date",{ascending:false}),
    ]);

    const bloodMap:Record<string,string>={};
    (physData??[]).forEach((p:any)=>{if(p.blood_type)bloodMap[p.patient_id]=p.blood_type;});
    const medMap:Record<string,any>={};
    (medData??[]).forEach((m:any)=>{medMap[m.patient_id]=m;});

    const consultMap:Record<string,{count:number;last:string;hasOngoing:boolean}>={};
    const todayStr=new Date().toISOString().split("T")[0];
    (cData??[]).forEach((c:any)=>{
      if(!consultMap[c.patient_id])consultMap[c.patient_id]={count:0,last:"",hasOngoing:false};
      if(c.status==="done")consultMap[c.patient_id].count++;
      if(!consultMap[c.patient_id].last)consultMap[c.patient_id].last=c.consultation_date;
      if(c.status==="waiting"&&c.consultation_date===todayStr)consultMap[c.patient_id].hasOngoing=true;
    });

    setPatients(pData.map((p:any)=>{
      const med=medMap[p.id],cm=consultMap[p.id];
      return{
        id:p.id,
        name:`${p.first_name??""} ${p.last_name??""}`.trim(),
        age:p.age!=null?String(p.age):"",
        gender:p.sex==="F"?"Female":p.sex==="M"?"Male":"",
        civil:"",
        addr:[p.purok,p.barangay,p.municipality].filter(Boolean).join(", "),
        barangay:p.barangay??"",
        philHealth:p.philhealth_pin??"",
        bloodType:bloodMap[p.id]??"",
        conditions:checkedList(med,DISEASE_KEYS),
        allergies:med?.allergy&&med?.allergy_specify?[med.allergy_specify]:[],
        visits:[],
        _visitCount:cm?.count??0,
        _lastVisit:cm?.last??"",
        _hasOngoing:cm?.hasOngoing??false,
      };
    }));
    setLoadingList(false);
  },[]);

  useEffect(()=>{fetchPatients();},[fetchPatients]);

  async function fetchVisits(patientId:string):Promise<VisitEvent[]>{
    const[consultRes,prescRes,labRes,physRes]=await Promise.all([
      supabase.from("soap_consultations").select("id,consultation_date,status,subjective,objective,assessment,plan").eq("patient_id",patientId).order("consultation_date",{ascending:false}),
      supabase.from("prescriptions").select("id,prescription_date,medicine,dosage_frequency,quantity,notes,status").eq("patient_id",patientId).order("prescription_date",{ascending:false}),
      supabase.from("laboratory_requests").select("*").eq("patient_id",patientId).order("request_date",{ascending:false}),
      supabase.from("physical_exam_findings").select("blood_pressure_mmhg,temperature_c,weight_kg").eq("patient_id",patientId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    ]);
    const phys=physRes.data;
    const all:VisitEvent[]=[];

    (consultRes.data??[]).forEach((c:any)=>{
      const notes=[c.subjective?`S: ${c.subjective}`:"",c.objective?`O: ${c.objective}`:"",c.plan?`Plan: ${c.plan}`:""].filter(Boolean).join("\n\n");
      all.push({id:c.id,date:c.consultation_date,time:"",type:"consultation",title:c.assessment??"Consultation",doctor:user?.name??"Doctor",diagnosis:c.assessment??"",prescription:[],labTests:[],notes,bp:phys?.blood_pressure_mmhg??undefined,temp:phys?.temperature_c?`${phys.temperature_c}°C`:undefined,weight:phys?.weight_kg?`${phys.weight_kg} kg`:undefined,status:c.status==="done"?"completed":"ongoing"});
    });
    (prescRes.data??[]).forEach((p:any)=>{
      all.push({id:p.id,date:p.prescription_date,time:"",type:"prescription",title:`Prescription — ${p.medicine}`,doctor:user?.name??"Doctor",diagnosis:"",prescription:[`${p.medicine} ${p.dosage_frequency??""} ${p.quantity?`(${p.quantity})`:""}`],labTests:[],notes:p.notes??"",status:p.status==="sent"?"completed":"scheduled"});
    });
    (labRes.data??[]).forEach((l:any)=>{
      const tests=Object.keys(LAB_TEST_MAP).filter(k=>l[k]===true).map(k=>LAB_TEST_MAP[k]);
      all.push({id:l.id,date:l.request_date,time:"",type:"lab",title:"Lab Request",doctor:user?.name??"Doctor",diagnosis:"",prescription:[],labTests:tests,notes:"",status:l.status==="completed"?"completed":l.status==="cancelled"?"scheduled":"ongoing"});
    });
    return all.sort((a,b)=>b.date.localeCompare(a.date));
  }

  async function handleSelect(p:TimelinePatient){
    setVisitFilter("all");setLoadingDetail(true);
    const v=await fetchVisits(p.id);
    setSelected({...p,visits:v});
    setLoadingDetail(false);
  }

  if(isLoading||!user)return null;

  const barangayOptions=useMemo(()=>["All Barangays",...Array.from(new Set(patients.map(p=>p.barangay).filter(Boolean))).sort()],[patients]);
  const[agMin,agMax]=ageGroupRange(ageGroup);

  const filteredPatients=useMemo(()=>{
    return patients.filter(p=>{
      const archived=archivedIds.has(p.id);
      if(viewMode==="active"&&archived)return false;
      if(viewMode==="archived"&&!archived)return false;
      if(gender!=="All"&&p.gender!==gender)return false;
      const age=parseInt(p.age)||0;
      if(age<agMin||age>agMax)return false;
      if(barangay!=="All Barangays"&&p.barangay!==barangay)return false;
      if(search){const q=search.toLowerCase();if(!p.name.toLowerCase().includes(q)&&!p.barangay.toLowerCase().includes(q)&&!p.addr.toLowerCase().includes(q))return false;}
      return true;
    }).sort((a,b)=>{
      if(sortBy==="az")return a.name.localeCompare(b.name);
      if(sortBy==="za")return b.name.localeCompare(a.name);
      if(sortBy==="mostVisits")return(b._visitCount??0)-(a._visitCount??0);
      if(sortBy==="newest")return(b._lastVisit??"").localeCompare(a._lastVisit??"");
      if(sortBy==="oldest")return(a._lastVisit??"").localeCompare(b._lastVisit??"");
      return 0;
    });
  },[patients,archivedIds,viewMode,gender,ageGroup,barangay,search,sortBy,agMin,agMax]);

  const allVisits=useMemo(()=>patients.flatMap(p=>p.visits),[patients]);
  const visits=selected?selected.visits.filter(v=>visitFilter==="all"||v.type===visitFilter):[];
  const totalConsults    = selected?.visits.filter(v=>v.type==="consultation").length??0;
  const totalPrescr      = selected?.visits.filter(v=>v.type==="prescription").length??0;
  const totalLabs        = selected?.visits.filter(v=>v.type==="lab").length??0;
  const totalFollowUp    = selected?.visits.filter(v=>v.type==="follow-up").length??0;
  const lastVisitDate    = selected?.visits.find(v=>v.type==="consultation")?.date;
  const upcomingFollowUps= selected?.visits.filter(v=>v.type==="follow-up"&&v.followUpDate&&daysUntil(v.followUpDate)>=0).length??0;

  function badge(p:TimelinePatient){ if(p._hasOngoing)return{label:"In Queue",bg:"#dcfce7",color:"#166534"}; if((p._visitCount??0)>0)return{label:"Visited",bg:"#f3f4f6",color:"#6b7280"}; return{label:"New",bg:"#dbeafe",color:"#1e40af"}; }

  return (
    <div className={styles.root}>
      <DoctorSidebar />
      <div className={styles.mainArea}>

        {/* ── Topbar ── */}
        <header className={styles.topbar}>
          <div style={{ display:"flex", alignItems:"center", gap:12, flex:1 }}>
            <div style={{ fontFamily:"Syne,sans-serif", fontSize:18, fontWeight:800, color:"#fff", letterSpacing:"-.02em" }}>
              Patient Timeline
            </div>
            <div style={{ background:"rgba(255,255,255,.15)", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.85)" }}>
              {patients.length} patients
            </div>
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.iconBtn}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
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

        {/* ── Filter bar ── */}
        <FilterBar
          search={search} onSearch={setSearch}
          viewMode={viewMode} onViewMode={setViewMode}
          gender={gender} onGender={setGender}
          ageGroup={ageGroup} onAgeGroup={setAgeGroup}
          barangay={barangay} barangayOptions={barangayOptions} onBarangay={setBarangay}
          sortBy={sortBy} onSort={setSortBy}
          totalPatients={patients.length}
          allVisits={allVisits}
        />

        <div className={styles.body}>

          {/* ══ Patient list panel ══ */}
          <div style={{ background:"#fff", borderRight:"1px solid #f0f0f0", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {/* Header */}
            <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid #f5f5f5", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontFamily:"Syne,sans-serif", fontSize:13, fontWeight:800, color:"#111827", letterSpacing:"-.01em" }}>
                  Records
                </span>
                <span style={{ background:"#f0fdf4", color:"#16a34a", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>
                  {filteredPatients.length}
                </span>
              </div>
            </div>

            {/* List */}
            <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
              <style>{`
                .pt-scrollbar::-webkit-scrollbar{width:3px}
                .pt-scrollbar::-webkit-scrollbar-thumb{background:#f0f0f0;border-radius:3px}
                .pt-card{transition:all .15s;cursor:pointer;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:10px;border:1.5px solid transparent}
                .pt-card:hover{background:#f9fafb;border-color:#f0f0f0}
                .pt-card-active{background:#f0fdf4!important;border-color:#16a34a!important}
                @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}
              `}</style>

              {loadingList && (
                <div style={{ padding:24, textAlign:"center", color:"#9ca3af", fontSize:12 }}>
                  Loading patients…
                </div>
              )}
              {!loadingList && filteredPatients.length===0 && (
                <div style={{ padding:24, textAlign:"center", color:"#9ca3af", fontSize:12 }}>
                  No patients found
                </div>
              )}

              {filteredPatients.map(p=>{
                const b=badge(p);
                return(
                  <div key={p.id}
                    className={`pt-card${selected?.id===p.id?" pt-card-active":""}`}
                    onClick={()=>handleSelect(p)}
                  >
                    <div style={{ width:38, height:38, borderRadius:"50%", background:avatarColor(p.gender), color:"#fff", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {initials(p.name)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>
                        {p.age?`${p.age}y`:""}{p.gender?` · ${p.gender}`:""} · {p._visitCount??0} visit{(p._visitCount??0)!==1?"s":""}
                      </div>
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, background:b.bg, color:b.color, flexShrink:0 }}>
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══ Timeline panel ══ */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#f8fafb" }}>
            {!selected && !loadingDetail ? (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
                <div style={{ width:72, height:72, borderRadius:"50%", background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>📋</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#374151", fontFamily:"Syne,sans-serif" }}>Select a patient</div>
                <div style={{ fontSize:13, color:"#9ca3af" }}>Choose from the list to view their medical timeline</div>
              </div>
            ) : loadingDetail ? (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontSize:13, color:"#9ca3af" }}>Loading records…</div>
              </div>
            ) : selected ? (
              <>
                {/* Patient info bar */}
                <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f0", padding:"16px 28px", display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
                  <div style={{ width:52, height:52, borderRadius:"50%", background:avatarColor(selected.gender), color:"#fff", fontSize:17, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {initials(selected.name)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"Syne,sans-serif", fontSize:19, fontWeight:800, color:"#111827", letterSpacing:"-.02em" }}>
                      {selected.name}
                    </div>
                    <div style={{ display:"flex", gap:10, marginTop:5, flexWrap:"wrap" }}>
                      {[
                        selected.age       && `🕐 ${selected.age} yrs`,
                        selected.gender    && `👤 ${selected.gender}`,
                        selected.addr      && `📍 ${selected.addr}`,
                        selected.bloodType && `🩸 ${selected.bloodType}`,
                        selected.philHealth&& `🪪 ${selected.philHealth}`,
                      ].filter(Boolean).map(chip=>(
                        <span key={chip as string} style={{ fontSize:11.5, color:"#6b7280", display:"flex", alignItems:"center", gap:4 }}>{chip}</span>
                      ))}
                    </div>
                    {(selected.conditions.length>0||selected.allergies.length>0)&&(
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                        {selected.conditions.map(c=>(
                          <span key={c} style={{ fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#fff0f0", color:"#b91c1c", border:"1px solid #fca5a5" }}>
                            ● {c}
                          </span>
                        ))}
                        {selected.allergies.map(a=>(
                          <span key={a} style={{ fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#fffbeb", color:"#92400e", border:"1px solid #fcd34d" }}>
                            ⚠️ Allergy: {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats strip */}
                <div style={{ display:"flex", background:"#fff", borderBottom:"1px solid #f0f0f0", flexShrink:0 }}>
                  {[
                    { val:totalConsults,    lbl:"Consultations",  color:"#16a34a" },
                    { val:totalPrescr,      lbl:"Prescriptions",  color:"#7c3aed" },
                    { val:totalLabs,        lbl:"Lab Requests",   color:"#2563eb" },
                    { val:totalFollowUp,    lbl:`Follow-ups${upcomingFollowUps>0?` (${upcomingFollowUps} due)`:""}`, color:upcomingFollowUps>0?"#d97706":"#16a34a" },
                    { val:lastVisitDate?fmtDateShort(lastVisitDate):"—", lbl:"Last Visit", color:"#6b7280", small:true },
                  ].map((s,i)=>(
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"14px 8px", borderRight:i<4?"1px solid #f5f5f5":"none" }}>
                      <div style={{ fontFamily:"Syne,sans-serif", fontSize:s.small?12:22, fontWeight:800, color:s.color, lineHeight:1, marginTop:s.small?4:0 }}>
                        {s.val}
                      </div>
                      <div style={{ fontSize:9.5, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".08em", textAlign:"center" }}>
                        {s.lbl}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <div style={{ fontFamily:"Syne,sans-serif", fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:".14em", textTransform:"uppercase" }}>
                      Medical Timeline
                    </div>
                    <div style={{ fontSize:11, color:"#9ca3af" }}>
                      {visits.length} record{visits.length!==1?"s":""}
                    </div>
                  </div>

                  {/* Visit type filter tabs */}
                  <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
                    {VISIT_FILTERS.map(f=>{
                      const active=visitFilter===f.value;
                      return(
                        <button key={f.value}
                          onClick={()=>setVisitFilter(f.value)}
                          style={{
                            display:"inline-flex", alignItems:"center", gap:5,
                            padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600,
                            cursor:"pointer", fontFamily:"DM Sans,sans-serif", transition:"all .15s",
                            background: active ? f.color : "#fff",
                            color:      active ? "#fff"  : "#6b7280",
                            border:     active ? "none"  : "1.5px solid #e5e7eb",
                            boxShadow:  active ? `0 2px 8px ${f.color}30` : "none",
                          }}
                        >
                          {f.icon} {f.label}
                          {f.value==="follow-up"&&upcomingFollowUps>0&&(
                            <span style={{ marginLeft:4, background:"rgba(255,255,255,.3)", borderRadius:10, padding:"0 5px", fontSize:9, fontWeight:800 }}>
                              {upcomingFollowUps}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Timeline track */}
                  {visits.length>0?(
                    <div style={{ position:"relative", paddingLeft:44, display:"flex", flexDirection:"column", gap:16 }}>
                      {/* Vertical line */}
                      <div style={{ position:"absolute", left:9, top:10, bottom:10, width:2, background:"linear-gradient(to bottom,#16a34a,rgba(22,163,74,.08))", borderRadius:2 }}/>
                      {visits.map(v=><VisitCard key={v.id} visit={v}/>)}
                    </div>
                  ):(
                    <div style={{ padding:"48px 0", textAlign:"center", color:"#9ca3af", fontSize:13 }}>
                      No records for this filter.
                    </div>
                  )}
                </div>
              </>
            ):null}
          </div>
        </div>
      </div>
    </div>
  );
}