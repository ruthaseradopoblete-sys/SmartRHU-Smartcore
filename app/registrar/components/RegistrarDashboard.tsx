'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Users, UserCheck, Clock,Milestone, X, ChevronRight, RefreshCw, Stethoscope, Baby, Smile, ClipboardList, Brain, Mars, Venus, Star, Award } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

<style>{`
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
`}</style>


// ── Base palette (brand spec) ─────────────────────────────────────────────
// blue / pink / amber are kept exactly as before — they're tied to the
// Male / Female / Kids quick-stat cards and intentionally untouched.
const C = {
  green:      '#16a34a',  // main accent green
  greenDark:  '#0d3b1f',  // darkest green, headers/topbar
  greenMid:   '#166534',  // hover state, mid-tone
  greenLight: '#dcfce7',  // light green, backgrounds/badges
  mint:       '#4ade80',  // bright mint accent
  blue:  '#2563eb', pink: '#db2777', amber: '#d97706',
}

// 5-tone green family used anywhere the dashboard previously needed several
// distinct categorical colors (pie chart, weekly schedule, bar chart).
const GREENS = [C.green, C.mint, C.greenMid, C.greenDark, C.greenLight]

// Single shared gradient for the 4 top summary cards (Total / Today / Awaiting /
// Follow Up) — matches the Warehouse dashboard's analytics cards, which all use
// one consistent green gradient instead of a different shade per card.
const STAT_GRADIENT: [string, string] = [C.green, C.greenDark]

const CATEGORY_DATA = [
  { name:'General',        value:34, color:GREENS[0] },
  { name:'Pediatric',      value:22, color:GREENS[1] },
  { name:'Pregnancy',      value:18, color:GREENS[2] },
  { name:'Teen Pregnancy', value:10, color:GREENS[3] },
  { name:'Mental Health',  value:16, color:GREENS[4] },
]

const SCHEDULE: { day:string; consult:string; color:string; Icon:React.ElementType }[] = [
  { day:'Monday',    consult:'General Consultation',           color:GREENS[0], Icon:ClipboardList },
  { day:'Tuesday',   consult:'Pediatric Consultation',         color:GREENS[1], Icon:Stethoscope   },
  { day:'Wednesday', consult:'Pregnancy Consultation',         color:GREENS[2], Icon:Baby          },
  { day:'Thursday',  consult:'Teenage Pregnancy Consultation', color:GREENS[3], Icon:Milestone     },
  { day:'Friday',    consult:'Mental Health Consultation',     color:GREENS[4], Icon:Brain         },
]

function useBreakpoint() {
  const [mounted, setMounted] = useState(false)
  const [w, setW] = useState(1200)
  useEffect(() => {
    setMounted(true); setW(window.innerWidth)
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  if (!mounted) return { isMobile: false, isTablet: false, isSmall: false, w: 1200 }
  return { isMobile: w < 480, isTablet: w < 768, isSmall: w < 1024, w }
}

function Modal({ title, color, onClose, children }: {
  title:string; color:string; onClose:()=>void; children:React.ReactNode
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:540, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:`linear-gradient(135deg,${color},${color}cc)`, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <h2 style={{color:'#fff',margin:0,fontSize:15,fontWeight:800}}>{title}</h2>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,padding:'5px 9px',cursor:'pointer',color:'#fff',display:'flex',alignItems:'center',transition:'background 0.15s'}}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.35)')}
            onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.2)')}
          ><X size={15}/></button>
        </div>
        <div style={{padding:'16px 20px',overflowY:'auto',flex:1}}>{children}</div>
      </div>
    </div>
  )
}

function PatientRow({ p, accent, bg, border }: { p:any; accent:string; bg:string; border:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:bg, border:`1px solid ${border}`, marginBottom:6, transition:'all 0.1s' }}>
      <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${accent},${accent}88)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13 }}>
        {(p.first_name?.[0]??'?').toUpperCase()}
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.last_name}, {p.first_name} {p.middle_name??''}</div>
        <div style={{fontSize:10,color:'#6b7280',marginTop:1}}>{p.barangay??'--'} · {p.sex==='F'?'Female':'Male'} · {p.age??'--'} yrs</div>
      </div>
      <div style={{fontSize:9,fontWeight:700,padding:'3px 9px',borderRadius:20,background:`${accent}18`,color:accent,flexShrink:0,border:`1px solid ${accent}33`}}>{p.sex==='F'?'Female':'Male'}</div>
    </div>
  )
}

function StatCard({ label, value, sub, badge, icon:Icon, gradient, compact, onClick }: {
  label:string; value:string|number; sub?:string; badge?:string
  icon:React.ElementType; gradient:string[]; compact:boolean; onClick:()=>void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      borderRadius:16, padding: compact ? '16px 18px' : '22px 24px',
      color:'#fff', position:'relative', overflow:'hidden', cursor:'pointer', userSelect:'none',
      background:`linear-gradient(135deg,${gradient[0]},${gradient[1]})`,
      boxShadow: hov?`0 16px 40px ${gradient[0]}55`:`0 6px 20px ${gradient[0]}33`,
      transform: hov?'translateY(-3px)':'translateY(0)',
      transition:'all 0.2s ease',
    }}>
      <div style={{position:'absolute',right:-20,top:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.1)'}}/>
      <div style={{position:'absolute',right:10,bottom:-30,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'relative'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
            <p style={{fontSize:9,fontWeight:700,opacity:0.9,margin:0,textTransform:'uppercase',letterSpacing:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</p>
            {badge&&(<span style={{background:'rgba(255,255,255,0.28)',borderRadius:20,padding:'1px 7px',fontSize:8,fontWeight:800,whiteSpace:'nowrap',flexShrink:0,letterSpacing:0.3}}>{badge}</span>)}
          </div>
          <h2 style={{fontSize:compact?30:42,fontWeight:900,margin:'0 0 2px',lineHeight:1}}>{value}</h2>
          {sub&&!compact&&<p style={{fontSize:9,opacity:0.75,margin:0,marginTop:2}}>{sub}</p>}
        </div>
        <div style={{background:'rgba(255,255,255,0.22)',borderRadius:12,padding:compact?8:10,flexShrink:0,marginLeft:10,backdropFilter:'blur(4px)'}}>
          <Icon size={compact?16:20} strokeWidth={2}/>
        </div>
      </div>
      {!compact&&(
        <div style={{marginTop:10,display:'flex',alignItems:'center',gap:4,fontSize:9,opacity:0.8,background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'3px 10px',width:'fit-content'}}>
          <ChevronRight size={10}/> View details
        </div>
      )}
    </div>
  )
}

function QuickCard({ icon, label, value, pct, color, bg, border, darkBg, compact, hov, onEnter, onLeave }: {
  icon:string; label:string; value:number; pct:string
  color:string; bg:string; border:string; darkBg:boolean; compact:boolean
  hov:boolean; onEnter:()=>void; onLeave:()=>void
}) {
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} style={{
      background: darkBg ? '#0d2516' : bg,
      borderRadius:14, padding: compact ? '12px 14px' : '15px 17px',
      border:`1.5px solid ${hov ? color : border}`,
      boxShadow: hov ? `0 8px 24px ${color}30` : '0 2px 8px rgba(0,0,0,0.06)',
      cursor:'default', transform: hov ? 'translateY(-3px)' : 'translateY(0)',
      transition:'all 0.18s', display:'flex', alignItems:'center', gap: compact ? 10 : 14,
      position:'relative', overflow:'hidden',
    }}>
      <div style={{position:'absolute',right:-10,bottom:-10,width:50,height:50,borderRadius:'50%',background:`${color}08`}}/>
      <div style={{
        width: compact?40:48, height: compact?40:48, borderRadius:12, flexShrink:0,
        background:`linear-gradient(135deg,${color},${color}88)`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: compact ? 18 : 22, boxShadow:`0 4px 12px ${color}33`,
      }}>{icon}</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:10, fontWeight:700, color: darkBg?'#9abea6':'#6b7280', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textTransform:'uppercase', letterSpacing:0.5}}>{label}</div>
        <div style={{fontSize: compact?22:28, fontWeight:900, color, lineHeight:1}}>{value}</div>
      </div>
      <div style={{background:`${color}18`, border:`1.5px solid ${color}33`, borderRadius:20, padding: compact?'4px 8px':'5px 11px', flexShrink:0, fontSize:12, fontWeight:800, color}}>{pct}</div>
    </div>
  )
}

function SectionTitle({ title, dark, extra }:{ title:string; dark:boolean; extra?:React.ReactNode }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:3,height:16,borderRadius:99,background:`linear-gradient(${STAT_GRADIENT[0]},${STAT_GRADIENT[1]})`}}/>
        <h3 style={{fontSize:11,fontWeight:800,color:dark?'#9abea6':'#374151',margin:0,textTransform:'uppercase',letterSpacing:1.4}}>{title}</h3>
      </div>
      {extra}
    </div>
  )
}

const CustomBarLabel = (props: any) => {
  const { x, y, width, value } = props
  if (!value) return null
  return <text x={x + width / 2} y={y - 4} fill="#9ca3af" textAnchor="middle" fontSize={8} fontWeight={700}>{value}</text>
}

function YearDropdown({ value, years, onChange, dark, bdr }: {
  value: number; years: number[]; onChange: (y: number) => void; dark: boolean; bdr: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen(p => !p)} style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
        borderRadius: 20, border: `1.5px solid ${open ? C.green : bdr}`,
        background: open ? `linear-gradient(135deg,${STAT_GRADIENT[0]},${STAT_GRADIENT[1]})` : dark ? '#0d2516' : '#f0fdf4',
        color: open ? '#fff' : C.green, fontSize: 11, fontWeight: 800, cursor: 'pointer', outline: 'none',
        boxShadow: open ? `0 4px 14px rgba(22,163,74,0.35)` : 'none',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}>
        {value}
        <span style={{ fontSize: 8, display:'inline-block', transform: open?'rotate(180deg)':'rotate(0)', transition:'transform 0.15s' }}>v</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
          background: dark ? '#0d2516' : '#fff', border: `1.5px solid ${C.green}`,
          borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.15)', minWidth: 110, overflow: 'hidden',
        }}>
          <div style={{ padding: '7px 12px 5px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: C.green, borderBottom: `1px solid ${dark?'rgba(74,222,128,0.1)':'#e5e7eb'}`, background: dark?'#0f2e1a':'#f0fdf4' }}>Select Year</div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {years.map(y => {
              const isSel = y === value
              return (
                <div key={y} onClick={() => { onChange(y); setOpen(false) }} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 14px', fontSize: 13, fontWeight: isSel ? 800 : 600,
                  color: isSel ? '#fff' : dark ? '#e2f5e9' : '#1f2937',
                  background: isSel ? `linear-gradient(135deg,${STAT_GRADIENT[0]},${STAT_GRADIENT[1]})` : 'transparent',
                  cursor: 'pointer', transition: 'background 0.1s',
                  borderBottom: `1px solid ${dark?'rgba(74,222,128,0.08)':'#f3f4f6'}`,
                }}
                  onMouseEnter={e => { if(!isSel) e.currentTarget.style.background=dark?'#0f2e1a':'#f0fdf4' }}
                  onMouseLeave={e => { if(!isSel) e.currentTarget.style.background='transparent' }}
                >
                  <span>{y}</span>
                  {isSel && <span style={{ fontSize:10, fontWeight:800, background:'rgba(255,255,255,0.25)', padding:'1px 6px', borderRadius:20 }}>Active</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface Props { onAddPatient: () => void; darkMode: boolean; onGoToLogs?: () => void }

export default function RegistrarDashboard({ onAddPatient, darkMode, onGoToLogs }: Props) {
  const dk = darkMode
  const { isMobile, isTablet, isSmall } = useBreakpoint()

  const [stats, setStats]               = useState({ total:0, today:0, pending:0, followUp:0 })
  const [patients, setPatients]         = useState<any[]>([])
  const [todayPatients, setTodayPatients] = useState<any[]>([])
  const [pendingList, setPendingList]   = useState<any[]>([])
  const [followUpList, setFollowUpList] = useState<any[]>([])
  const [followUpToday, setFollowUpToday] = useState<any[]>([])
  const [modal, setModal]               = useState<string|null>(null)
  const [monthlyData, setMonthlyData]   = useState<{month:string;patients:number;year:number}[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()])
  const [hovSched, setHovSched]         = useState<string|null>(null)
  const [hovCat,   setHovCat]           = useState<string|null>(null)
  const [hovQuick, setHovQuick]         = useState<string|null>(null)
  const [demoCounts, setDemoCounts]     = useState({ male:0, female:0, senior:0, kids:0 })

  // ── Theme tokens (brand spec) ─────────────────────────────────────────────
  const bg   = dk ? '#061a0d' : '#f0f7f2'
  const card = dk ? '#0d2516' : '#ffffff'
  const bdr  = dk ? 'rgba(74,222,128,0.1)' : 'rgba(22,163,74,0.15)'
  const txt  = dk ? '#e2f5e9' : '#0a2912'
  const txt2 = dk ? '#9abea6' : '#4b6557'

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const fetchMonthly = async (year: number) => {
    const { data } = await supabase
      .from('konsulta_registrations').select('registration_date')
      .gte('registration_date', `${year}-01-01`).lte('registration_date', `${year}-12-31`)
      .not('registration_date', 'is', null)
    const counts: Record<string,number> = {}
    MONTHS.forEach(m => (counts[m] = 0))
    ;(data ?? []).forEach((r: any) => {
      if (r.registration_date) counts[MONTHS[new Date(r.registration_date).getMonth()]]++
    })
    setMonthlyData(MONTHS.map(month => ({ month, patients: counts[month], year })))
  }

  const fetchAvailableYears = async () => {
    const { data } = await supabase.from('konsulta_registrations').select('registration_date').not('registration_date','is',null).order('registration_date',{ascending:true})
    const yearsSet = new Set<number>()
    ;(data ?? []).forEach((r: any) => { if (r.registration_date) yearsSet.add(new Date(r.registration_date).getFullYear()) })
    const currentYear = new Date().getFullYear()
    yearsSet.add(currentYear)
    const years = Array.from(yearsSet).sort((a,b)=>b-a)
    setAvailableYears(years)
    const defaultYear = years[0] ?? currentYear
    setSelectedYear(defaultYear)
    return defaultYear
  }

  // Today's patients are now based on konsulta_registrations.registration_date,
  // so an existing patient who registers again today still shows up here.
  const fetchTodayRegistrations = async (dateStr: string) => {
    const { data, count } = await supabase
      .from('konsulta_registrations')
      .select('*', { count: 'exact' })
      .eq('registration_date', dateStr)
    setTodayPatients(data ?? [])
    setStats(prev => ({ ...prev, today: count ?? (data?.length ?? 0) }))
  }

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      supabase.from('patients').select('id',{count:'exact',head:true}),
      supabase.from('consultations').select('*,patients(first_name,last_name)').eq('status','Pending'),
      supabase.from('patients').select('*').order('created_at',{ascending:false}).limit(100),
    ]).then(([totalRes,pend,recent])=>{
      setPatients(recent.data??[])
      setPendingList(pend.data??[])
      setStats(prev=>({...prev, total:totalRes.count??0, pending:pend.data?.length??0}))
    })
    fetchTodayRegistrations(today)
    supabase.from('follow_up_schedules').select('*').eq('status','pending').order('follow_up_date',{ascending:true})
      .then(({data})=>{
        const all=data??[]
        setFollowUpList(all)
        setFollowUpToday(all.filter((r:any)=>r.follow_up_date===today))
        setStats(prev=>({...prev, followUp:all.length}))
      })
    Promise.all([
      supabase.from('patients').select('id',{count:'exact',head:true}).eq('sex','M'),
      supabase.from('patients').select('id',{count:'exact',head:true}).eq('sex','F'),
      supabase.from('patients').select('id',{count:'exact',head:true}).gte('age',60),
      supabase.from('patients').select('id',{count:'exact',head:true}).lt('age',18),
    ]).then(([male,female,senior,kids])=>{
      setDemoCounts({male:male.count??0,female:female.count??0,senior:senior.count??0,kids:kids.count??0})
    })
    fetchAvailableYears().then(yr=>fetchMonthly(yr))
    const channel = supabase.channel('dashboard_realtime')
      .on('postgres_changes',{event:'*',schema:'public',table:'follow_up_schedules'},()=>{
        supabase.from('follow_up_schedules').select('*').eq('status','pending').order('follow_up_date',{ascending:true})
          .then(({data})=>{
            const all=data??[]
            setFollowUpList(all)
            setFollowUpToday(all.filter((r:any)=>r.follow_up_date===today))
            setStats(prev=>({...prev,followUp:all.length}))
          })
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'konsulta_registrations'},()=>{
        fetchAvailableYears().then(()=>fetchMonthly(selectedYear))
        fetchTodayRegistrations(today)
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'patients'},()=>{
        supabase.from('patients').select('id',{count:'exact',head:true}).then(({count})=>setStats(prev=>({...prev,total:count??prev.total})))
        Promise.all([
          supabase.from('patients').select('id',{count:'exact',head:true}).eq('sex','M'),
          supabase.from('patients').select('id',{count:'exact',head:true}).eq('sex','F'),
          supabase.from('patients').select('id',{count:'exact',head:true}).gte('age',60),
          supabase.from('patients').select('id',{count:'exact',head:true}).lt('age',18),
        ]).then(([m,f,s,k])=>setDemoCounts({male:m.count??0,female:f.count??0,senior:s.count??0,kids:k.count??0}))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { if (selectedYear) fetchMonthly(selectedYear) }, [selectedYear])

  const isToday = (day:string) => new Date().toLocaleDateString('en-US',{weekday:'long'})===day
  const total = stats.total || 1
  const pad      = isMobile ? 14 : isTablet ? 18 : 24
  const gap      = isMobile ? 10 : isTablet ? 12 : 16
  const compact  = isTablet
  const statCols = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)'
  const quickCols= isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)'
  const chartCols= isSmall  ? '1fr' : '2fr 1fr'

  // ── Male / Female / Kids / Seniors — intentionally untouched colors ──────
  const quickItems = [
    { label:'Male',     value:demoCounts.male,   pct:Math.round(demoCounts.male/total*100)+'%',   color:C.blue,  bg:'#eff6ff', border:'#bfdbfe', icon:'♂', key:'male'   },
    { label:'Female',   value:demoCounts.female, pct:Math.round(demoCounts.female/total*100)+'%', color:C.pink,  bg:'#fdf2f8', border:'#f9a8d4', icon:'♀', key:'female' },
    { label:'Kids <18', value:demoCounts.kids,   pct:Math.round(demoCounts.kids/total*100)+'%',   color:C.amber, bg:'#fefce8', border:'#fde047', icon:'★', key:'kids'   },
    { label:'Seniors',  value:demoCounts.senior, pct:Math.round(demoCounts.senior/total*100)+'%', color:C.green, bg:'#f0fdf4', border:'#86efac', icon:'☆', key:'senior' },
  ]

  const barColors = Array.from({ length: 12 }, (_, i) => GREENS[i % GREENS.length])
  const emptyMonths = MONTHS.map(month => ({ month, patients: 0, year: selectedYear }))

  return (
<main style={{flex:1, padding:pad, overflowY:'hidden', background:bg, minWidth:0, height:'100vh', fontFamily:"'Nunito', sans-serif"}}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:gap+6, gap:10, flexWrap:'wrap'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:C.green,boxShadow:`0 0 0 3px ${C.green}33`,animation:'pulse 2s infinite'}}/>
            <p style={{color:dk?C.mint:txt2, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, margin:0}}>Live Dashboard</p>
          </div>
          <h1 style={{fontSize:isMobile?28:isTablet?30:36, fontWeight:1000, color:dk?C.mint:C.green, margin:0, lineHeight:1}}>DASHBOARD</h1>
        </div>
        <button onClick={onAddPatient} style={{
          background:`linear-gradient(135deg,${STAT_GRADIENT[0]},${STAT_GRADIENT[1]})`, color:'#fff', border:'none',
          borderRadius:12, padding:isMobile?'9px 16px':'11px 22px', cursor:'pointer',
          display:'flex', alignItems:'center', gap:6, fontWeight:800, fontSize:isMobile?12:13,
          boxShadow:'0 6px 20px rgba(22,163,74,0.4)', transition:'all 0.2s', whiteSpace:'nowrap',
        }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 10px 28px rgba(22,163,74,0.5)'}}
          onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 6px 20px rgba(22,163,74,0.4)'}}
        ><Plus size={isMobile?13:16}/> Add Patient</button>
      </div>

      {/* Stat cards — single shared gradient, like the Warehouse dashboard's analytics cards */}
      <div style={{display:'grid', gridTemplateColumns:statCols, gap, marginBottom:gap}}>
        <StatCard label="Total Patients"   value={stats.total}    sub="All registered patients" icon={Users}      gradient={STAT_GRADIENT} compact={compact} onClick={()=>onGoToLogs?.()} />
        <StatCard label="Today"            value={stats.today}    sub="Registered today"        icon={UserCheck}  gradient={STAT_GRADIENT} compact={compact} onClick={()=>setModal('today')} />
        <StatCard label="Awaiting Consult" value={stats.pending}  sub="Currently in queue"      icon={Clock}      gradient={STAT_GRADIENT} compact={compact} onClick={()=>setModal('pending')} />
        <StatCard label="Follow Up"        value={stats.followUp} sub="Pending return visits" badge={followUpToday.length>0?`${followUpToday.length} today`:undefined} icon={RefreshCw} gradient={STAT_GRADIENT} compact={compact} onClick={()=>setModal('followup')} />
      </div>

      {/* Quick demographic cards — Male / Female / Kids / Seniors: colors unchanged, no popup on click */}
      <div style={{display:'grid', gridTemplateColumns:quickCols, gap, marginBottom:gap+4}}>
        {quickItems.map(item=>(
          <QuickCard key={item.key} icon={item.icon} label={item.label} value={item.value} pct={item.pct}
            color={item.color} bg={item.bg} border={item.border} darkBg={dk} compact={compact}
            hov={hovQuick===item.key} onEnter={()=>setHovQuick(item.key)} onLeave={()=>setHovQuick(null)}
          />
        ))}
      </div>

      {/* Charts row */}
      <div style={{display:'grid', gridTemplateColumns:chartCols, gap, marginBottom:gap}}>
        <div style={{background:card, borderRadius:16, padding:compact?14:20, border:`1px solid ${bdr}`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', minWidth:0}}>
          <SectionTitle title="Monthly Patient Trend" dark={dk} extra={
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <YearDropdown value={selectedYear} years={availableYears} onChange={setSelectedYear} dark={dk} bdr={bdr}/>
              <span style={{fontSize:9,color:txt2,background:dk?'#0f2e1a':'#f0fdf4',border:`1px solid ${bdr}`,padding:'2px 8px',borderRadius:20,flexShrink:0,display:isMobile?'none':'block'}}>From registrations</span>
            </div>
          }/>
          <ResponsiveContainer width="100%" height={isMobile?130:compact?155:185}>
            <BarChart data={monthlyData.length?monthlyData:emptyMonths} margin={{top:16,right:4,left:-28,bottom:0}}
              onClick={(d:any)=>d?.activePayload&&setModal('month_'+d.activePayload[0].payload.month)}>
              <CartesianGrid strokeDasharray="3 3" stroke={dk?'rgba(74,222,128,0.08)':'rgba(22,163,74,0.08)'} vertical={false}/>
              <XAxis dataKey="month" tick={{fontSize:isMobile?7:9,fill:txt2}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:isMobile?7:9,fill:txt2}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{background:dk?'#0d2516':'#fff',border:`1px solid ${bdr}`,borderRadius:10,fontSize:11,boxShadow:'0 8px 24px rgba(0,0,0,0.12)'}} formatter={(value:any)=>[value,`Registrations (${selectedYear})`]} cursor={{fill:'rgba(22,163,74,0.07)'}}/>
              <Bar dataKey="patients" label={isMobile?undefined:<CustomBarLabel/>} radius={[6,6,0,0]} style={{cursor:'pointer'}}>
                {(monthlyData.length?monthlyData:emptyMonths).map((_,i)=>(<Cell key={i} fill={barColors[i%12]}/>))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:card, borderRadius:16, padding:compact?14:20, border:`1px solid ${bdr}`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', minWidth:0}}>
          <SectionTitle title="Patient Category" dark={dk}/>
          <ResponsiveContainer width="100%" height={compact?90:120}>
            <PieChart>
              <Pie data={CATEGORY_DATA} innerRadius={compact?26:36} outerRadius={compact?40:54} paddingAngle={4} dataKey="value"
                onClick={(d:any)=>setModal('cat_'+d.name)} style={{cursor:'pointer'}}>
                {CATEGORY_DATA.map((d,i)=><Cell key={i} fill={d.color} opacity={hovCat===d.name?0.65:1}/>)}
              </Pie>
              <Tooltip contentStyle={{background:dk?'#0d2516':'#fff',border:`1px solid ${bdr}`,borderRadius:10,fontSize:10}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{marginTop:6}}>
            {CATEGORY_DATA.map(d=>(
              <div key={d.name} onClick={()=>setModal('cat_'+d.name)}
                onMouseEnter={()=>setHovCat(d.name)} onMouseLeave={()=>setHovCat(null)}
                style={{display:'flex',alignItems:'center',gap:7,marginBottom:4,padding:'3px 7px',borderRadius:7,cursor:'pointer',background:hovCat===d.name?`${d.color}12`:'transparent',transition:'background 0.12s'}}>
                <div style={{width:8,height:8,borderRadius:3,background:d.color,flexShrink:0}}/>
                <span style={{flex:1,color:dk?'#a7f3d0':'#4b5563',fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</span>
                <span style={{fontWeight:800,color:d.color,fontSize:11,flexShrink:0}}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly schedule */}
      <div style={{background:card, borderRadius:16, padding:compact?14:20, border:`1px solid ${bdr}`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
        <SectionTitle title="Weekly Consultation Schedule" dark={dk}/>
        <div style={{
          display:'grid',
          gridTemplateColumns: isMobile?'repeat(2,1fr)':isTablet?'repeat(3,1fr)':isSmall?'repeat(3,1fr)':'repeat(5,1fr)',
          gap: isMobile?8:10,
        }}>
          {SCHEDULE.map(({day,consult,color,Icon})=>{
            const active = isToday(day)
            const hov    = hovSched===day
            return (
              <div key={day}
                onMouseEnter={()=>setHovSched(day)} onMouseLeave={()=>setHovSched(null)}
                style={{
                  borderRadius:12, cursor:'default', overflow:'hidden',
                  border:`1.5px solid ${active||hov?color:bdr}`,
                  background: active ? `linear-gradient(135deg,${color}18,${color}08)` : hov ? `${color}08` : dk?'#0f2e1a':'#fafafa',
                  transition:'all 0.15s', transform:hov?'translateY(-2px)':'translateY(0)',
                  boxShadow: active ? `0 4px 16px ${color}22` : hov ? `0 4px 14px ${color}18` : 'none',
                }}>
                <div style={{height:3,background:active||hov?`linear-gradient(90deg,${color},${color}88)`:`linear-gradient(90deg,${bdr},transparent)`}}/>
                <div style={{padding:compact?'10px 12px':'13px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <div style={{
                      width:34,height:34,borderRadius:8,
                      background:active||hov?`linear-gradient(135deg,${color},${color}88)`:`${color}18`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                    }}>
                      <Icon size={18} color={active||hov?'#fff':color} strokeWidth={2}/>
                    </div>
                    {active&&<span style={{background:color,color:'#fff',fontSize:7,fontWeight:800,padding:'2px 7px',borderRadius:20,textTransform:'uppercase',letterSpacing:0.5}}>Today</span>}
                  </div>
                  <div style={{fontSize:9,fontWeight:800,color:active||hov?color:txt2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>{day}</div>
                  <div style={{fontSize:10,fontWeight:600,color:txt,lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box' as any,WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>{consult}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODALS */}
      {modal==='today' && (
        <Modal title={`Today's Registrations (${todayPatients.length})`} color={C.green} onClose={()=>setModal(null)}>
          {todayPatients.length===0
            ? <p style={{textAlign:'center',color:'#9ca3af',padding:'24px 0'}}>No patients registered today yet.</p>
            : todayPatients.map(p=><PatientRow key={p.id} p={p} accent={C.green} bg="#f0fdf4" border="#86efac"/>)}
        </Modal>
      )}
      {modal==='pending' && (
        <Modal title={`Awaiting Consult (${pendingList.length})`} color={C.green} onClose={()=>setModal(null)}>
          {pendingList.length===0
            ? <p style={{textAlign:'center',color:'#019429',padding:'24px 0'}}>No patients in queue.</p>
            : pendingList.map((c,i)=>(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:'#f0fdf4',border:'1px solid #86efac',marginBottom:6}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:C.green,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:11,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.patients?.last_name}, {c.patients?.first_name}</div>
                    <div style={{fontSize:10,color:'#6b7280'}}>Scheduled: {c.scheduled_time||'Walk-in'}</div>
                  </div>
                  <span style={{background:C.mint,color:C.greenDark,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{c.priority||'Normal'}</span>
                </div>
              ))}
        </Modal>
      )}
      {modal==='followup' && (
        <Modal title={`Follow Up Queue (${followUpList.length})`} color={C.green} onClose={()=>setModal(null)}>
          {followUpList.length > 0 && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
              {[
                {label:'Today',value:followUpToday.length,color:C.green},
                {label:'Upcoming',value:followUpList.filter((r:any)=>r.follow_up_date>new Date().toISOString().split('T')[0]).length,color:C.mint},
                {label:'Total',value:followUpList.length,color:C.greenMid},
              ].map(g=>(
                <div key={g.label} style={{background:`${g.color}10`,borderRadius:12,padding:'12px 8px',border:`1px solid ${g.color}33`,textAlign:'center'}}>
                  <div style={{fontSize:24,fontWeight:900,color:g.color}}>{g.value}</div>
                  <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>{g.label}</div>
                </div>
              ))}
            </div>
          )}
          {followUpList.length===0
            ? <div style={{textAlign:'center',padding:'32px 0'}}><div style={{fontSize:13,color:'#9ca3af'}}>No follow-ups scheduled</div><div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>Doctor-scheduled follow-ups will appear here</div></div>
            : followUpList.map((entry:any)=>{
                const isToday2=entry.follow_up_date===new Date().toISOString().split('T')[0]
                const isFemale=entry.patient_gender?.toLowerCase().includes('f')
                const dateLabel=isToday2?'Today':new Date(entry.follow_up_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                return (
                  <div key={entry.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',borderRadius:12,marginBottom:6,background:isToday2?'#f0fdf4':'#f9fafb',border:`1px solid ${isToday2?'#86efac':'#e5e7eb'}`}}>
                    <div style={{width:40,height:40,borderRadius:'50%',flexShrink:0,background:isFemale?'#fbcfe8':'#bfdbfe',display:'flex',alignItems:'center',justifyContent:'center',color:isFemale?'#9d174d':'#1e40af',fontWeight:800,fontSize:13}}>
                      {entry.patient_name?.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()||'?'}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{entry.patient_name}</div>
                      <div style={{fontSize:10,color:'#6b7280',display:'flex',gap:6,flexWrap:'wrap',marginTop:1}}>
                        {entry.patient_age&&<span>{entry.patient_age}y</span>}
                        {entry.patient_gender&&<span>· {entry.patient_gender}</span>}
                        {entry.patient_addr&&<span>· {entry.patient_addr}</span>}
                      </div>
                      {entry.notes&&<div style={{fontSize:10,color:'#854d0e',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:6,padding:'2px 7px',marginTop:3,display:'inline-block'}}>Notes: {entry.notes}</div>}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3,flexShrink:0}}>
                      {isToday2&&<span style={{background:C.green,color:'#fff',fontSize:7,fontWeight:800,padding:'2px 6px',borderRadius:20,textTransform:'uppercase'}}>Today</span>}
                      <span style={{fontSize:9,color:'#6b7280'}}>{dateLabel}</span>
                      <span style={{background:'#fef9c3',color:'#854d0e',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20}}>Pending</span>
                    </div>
                  </div>
                )
              })}
        </Modal>
      )}
      {modal?.startsWith('month_') && (
        <Modal title={`${modal.replace('month_','')} ${selectedYear} Registrations`} color={C.green} onClose={()=>setModal(null)}>
          <div style={{textAlign:'center',padding:'24px 0'}}>
            <div style={{fontSize:72,fontWeight:900,color:C.green,lineHeight:1}}>{monthlyData.find(m=>m.month===modal.replace('month_',''))?.patients??0}</div>
            <p style={{color:'#6b7280',marginTop:8,fontSize:13}}>Patients registered in {modal.replace('month_','')} {selectedYear}</p>
            <p style={{color:'#9ca3af',fontSize:11,marginTop:4}}>Based on registration_date in Konsulta Registration form</p>
          </div>
        </Modal>
      )}
      {modal?.startsWith('cat_') && (
        <Modal title={modal.replace('cat_','')+' Patients'} color={CATEGORY_DATA.find(c=>'cat_'+c.name===modal)?.color??C.green} onClose={()=>setModal(null)}>
          <div style={{textAlign:'center',padding:'24px 0'}}>
            <div style={{fontSize:72,fontWeight:900,color:CATEGORY_DATA.find(c=>'cat_'+c.name===modal)?.color,lineHeight:1}}>{CATEGORY_DATA.find(c=>'cat_'+c.name===modal)?.value}%</div>
            <p style={{color:'#6b7280',marginTop:8,fontSize:13}}>of total registered patients</p>
          </div>
        </Modal>
      )}
    </main>
  )
}