'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Users, UserCheck, Clock, X, ChevronRight, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const C = {
  green:    '#16a34a', teal:     '#0d9488', emerald:  '#059669',
  lime:     '#65a30d', forest:   '#166534', mint:     '#34d399',
  olive:    '#3f6212', blue:     '#2563eb', pink:     '#db2777', amber: '#d97706',
}

const CATEGORY_DATA = [
  { name:'General',        value:34, color:C.green   },
  { name:'Pediatric',      value:22, color:C.teal    },
  { name:'Pregnancy',      value:18, color:C.emerald },
  { name:'Teen Pregnancy', value:10, color:C.lime    },
  { name:'Mental Health',  value:16, color:C.forest  },
]

const SCHEDULE = [
  { day:'Monday',    consult:'General Consultation',           color:C.green,   icon:'🩺' },
  { day:'Tuesday',   consult:'Pediatric Consultation',         color:C.teal,    icon:'👶' },
  { day:'Wednesday', consult:'Pregnancy Consultation',         color:C.emerald, icon:'🤰' },
  { day:'Thursday',  consult:'Teenage Pregnancy Consultation', color:C.lime,    icon:'📋' },
  { day:'Friday',    consult:'Mental Health Consultation',     color:C.forest,  icon:'🧠' },
]

// ── Breakpoint hook ────────────────────────────────────────────────────────────
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
  return {
    isMobile:  w < 480,   // phone
    isTablet:  w < 768,   // small tablet / large phone
    isSmall:   w < 1024,  // tablet landscape
    w,
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ title, color, onClose, children }: {
  title:string; color:string; onClose:()=>void; children:React.ReactNode
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:12 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:`linear-gradient(135deg,${color},${color}bb)`, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <h2 style={{color:'#fff',margin:0,fontSize:15,fontWeight:800}}>{title}</h2>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'#fff',display:'flex',alignItems:'center'}}><X size={15}/></button>
        </div>
        <div style={{padding:'14px 18px',overflowY:'auto',flex:1}}>{children}</div>
      </div>
    </div>
  )
}

// ── Patient row ────────────────────────────────────────────────────────────────
function PatientRow({ p, accent, bg, border }: { p:any; accent:string; bg:string; border:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:10, background:bg, border:`1px solid ${border}`, marginBottom:6 }}>
      <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${accent},${accent}99)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:12 }}>
        {(p.first_name?.[0]??'?').toUpperCase()}
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:12,fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.last_name}, {p.first_name} {p.middle_name??''}</div>
        <div style={{fontSize:10,color:'#6b7280'}}>{p.barangay??'—'} · {p.sex==='F'?'F':'M'} · {p.age??'—'} yrs</div>
      </div>
      <div style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,background:`${accent}18`,color:accent,flexShrink:0}}>{p.sex==='F'?'Female':'Male'}</div>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, badge, icon:Icon, gradient, compact, onClick }: {
  label:string; value:string|number; sub?:string; badge?:string
  icon:React.ElementType; gradient:string[]; compact:boolean; onClick:()=>void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      borderRadius:14, padding: compact ? '14px 16px' : '20px 22px',
      color:'#fff', position:'relative', overflow:'hidden', cursor:'pointer', userSelect:'none',
      background:`linear-gradient(135deg,${gradient[0]},${gradient[1]})`,
      boxShadow: hov?`0 12px 32px ${gradient[0]}55`:`0 6px 18px ${gradient[0]}33`,
      transform: hov?'translateY(-2px)':'translateY(0)',
      transition:'all 0.2s ease',
    }}>
      <div style={{position:'absolute',right:-14,top:-14,width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,0.12)'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
            <p style={{fontSize:9,fontWeight:700,opacity:0.85,margin:0,textTransform:'uppercase',letterSpacing:0.8,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</p>
            {badge&&(
              <span style={{background:'rgba(255,255,255,0.25)',borderRadius:20,padding:'1px 6px',fontSize:8,fontWeight:800,whiteSpace:'nowrap',flexShrink:0}}>
                {badge}
              </span>
            )}
          </div>
          <h2 style={{fontSize:compact?28:38,fontWeight:900,margin:'0 0 1px',lineHeight:1}}>{value}</h2>
          {sub&&!compact&&<p style={{fontSize:9,opacity:0.7,margin:0}}>{sub}</p>}
        </div>
        <div style={{background:'rgba(255,255,255,0.2)',borderRadius:10,padding:compact?6:8,flexShrink:0,marginLeft:8}}>
          <Icon size={compact?14:18} strokeWidth={2}/>
        </div>
      </div>
      {!compact&&<div style={{marginTop:6,display:'flex',alignItems:'center',gap:3,fontSize:9,opacity:0.75}}><ChevronRight size={10}/> Click to view</div>}
    </div>
  )
}

// ── Quick card ─────────────────────────────────────────────────────────────────
function QuickCard({ icon, label, value, pct, color, bg, border, darkBg, compact, hov, onEnter, onLeave, onClick }: {
  icon:string; label:string; value:number; pct:string
  color:string; bg:string; border:string; darkBg:boolean; compact:boolean
  hov:boolean; onEnter:()=>void; onLeave:()=>void; onClick:()=>void
}) {
  return (
    <div onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} style={{
      background: darkBg ? '#0f2014' : bg,
      borderRadius:12, padding: compact ? '10px 12px' : '13px 15px',
      border:`1.5px solid ${hov ? color : border}`,
      boxShadow: hov ? `0 6px 20px ${color}2a` : '0 2px 6px rgba(0,0,0,0.05)',
      cursor:'pointer',
      transform: hov ? 'translateY(-2px)' : 'translateY(0)',
      transition:'all 0.18s',
      display:'flex', alignItems:'center', gap: compact ? 10 : 13,
    }}>
      <div style={{
        width: compact?38:44, height: compact?38:44, borderRadius:'50%', flexShrink:0,
        background:`linear-gradient(135deg,${color},${color}99)`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: compact ? 16 : 19,
      }}>{icon}</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:10, fontWeight:700, color: darkBg?'#6ee7b7':'#6b7280', marginBottom:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{label}</div>
        <div style={{fontSize: compact?20:24, fontWeight:900, color, lineHeight:1}}>{value}</div>
      </div>
      <div style={{
        background:`${color}18`, border:`1px solid ${color}2e`,
        borderRadius:20, padding: compact?'3px 7px':'4px 9px', flexShrink:0,
        fontSize:11, fontWeight:800, color,
      }}>{pct}</div>
    </div>
  )
}

function SectionTitle({ title, dark }:{ title:string; dark:boolean }) {
  return (
    <h3 style={{fontSize:11,fontWeight:800,color:dark?'#6ee7b7':'#374151',margin:'0 0 10px',textTransform:'uppercase',letterSpacing:1.4}}>
      {title}
    </h3>
  )
}

const CustomBarLabel = (props: any) => {
  const { x, y, width, value } = props
  if (!value) return null
  return <text x={x + width / 2} y={y - 3} fill="#9ca3af" textAnchor="middle" fontSize={8}>{value}</text>
}

// ═══════════════════════════════════════════════════════════════════════════════
interface Props {
  onAddPatient: () => void
  darkMode: boolean
  onGoToLogs?: () => void
}

export default function RegistrarDashboard({ onAddPatient, darkMode, onGoToLogs }: Props) {
  const dk = darkMode
  const { isMobile, isTablet, isSmall } = useBreakpoint()

  const [stats, setStats]               = useState({ total:0, today:0, pending:0, followUp:0 })
  const [patients, setPatients]         = useState<any[]>([])
  const [pendingList, setPendingList]   = useState<any[]>([])
  const [followUpList, setFollowUpList] = useState<any[]>([])
  const [followUpToday, setFollowUpToday] = useState<any[]>([])
  const [modal, setModal]               = useState<string|null>(null)
  const [quickPatients, setQuickPatients] = useState<any[]>([])
  const [quickLoading, setQuickLoading]     = useState(false)
  const [quickTotalCount, setQuickTotalCount] = useState(0)
  const [monthlyData, setMonthlyData]   = useState<{month:string;patients:number}[]>([])
  const [hovSched, setHovSched]         = useState<string|null>(null)
  const [hovCat,   setHovCat]           = useState<string|null>(null)
  const [hovQuick, setHovQuick]         = useState<string|null>(null)
  // Accurate demographic counts from DB (not limited by fetch)
  const [demoCounts, setDemoCounts]     = useState({ male:0, female:0, senior:0, kids:0 })

  const bg   = dk?'#0d1a0f':'#f0f4f1'
  const card = dk?'#0f2014':'#ffffff'
  const bdr  = dk?'#1a3d24':'#e5e7eb'
  const txt  = dk?'#e2f5e9':'#1f2937'
  const txt2 = dk?'#6ee7b7':'#6b7280'

  useEffect(()=>{
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      // ── Use count:'exact' to get true total — no row limit ──
      supabase.from('patients').select('id',{count:'exact',head:true}),
      supabase.from('patients').select('id',{count:'exact',head:true}).gte('created_at',today),
      supabase.from('consultations').select('*,patients(first_name,last_name)').eq('status','Pending'),
      // ── Only fetch recent 100 patients for display (modals/lists) ──
      supabase.from('patients').select('*').order('created_at',{ascending:false}).limit(100),
    ]).then(([totalRes, tod, pend, recent])=>{
      const recentData = recent.data??[]
      setPatients(recentData)
      setPendingList(pend.data??[])
      setStats(prev=>({
        ...prev,
        total:   totalRes.count ?? 0,  // true total count
        today:   tod.count     ?? 0,
        pending: pend.data?.length ?? 0,
      }))
    })

    // ── Follow-up schedules from follow_up_schedules table ─────────────────
    supabase
      .from('follow_up_schedules')
      .select('*')
      .eq('status','pending')
      .order('follow_up_date',{ascending:true})
      .then(({ data }) => {
        const all = data??[]
        const todayItems = all.filter((r:any)=>r.follow_up_date===today)
        setFollowUpList(all)
        setFollowUpToday(todayItems)
        setStats(prev=>({ ...prev, followUp: all.length }))
      })

    // ── Accurate demographic counts — separate count queries, no row limit ──
    Promise.all([
      supabase.from('patients').select('id',{count:'exact',head:true}).eq('sex','M'),
      supabase.from('patients').select('id',{count:'exact',head:true}).eq('sex','F'),
      supabase.from('patients').select('id',{count:'exact',head:true}).gte('age',60),
      supabase.from('patients').select('id',{count:'exact',head:true}).lt('age',18),
    ]).then(([male,female,senior,kids]) => {
      setDemoCounts({
        male:   male.count   ?? 0,
        female: female.count ?? 0,
        senior: senior.count ?? 0,
        kids:   kids.count   ?? 0,
      })
    })

    // ── Monthly patient trend from DB ──────────────────────────────────────
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const fetchMonthly = () => {
      supabase.from('patients').select('created_at')
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString())
        .then(({ data }) => {
          const counts: Record<string,number> = {}
          MONTHS.forEach(m => counts[m] = 0)
          ;(data??[]).forEach(r => { const m = MONTHS[new Date(r.created_at).getMonth()]; counts[m]++ })
          setMonthlyData(MONTHS.map(month => ({ month, patients: counts[month] })))
        })
    }
    fetchMonthly()

    // ── Real-time: re-fetch follow-up + monthly when patients/follow-ups change ──
    const channel = supabase.channel('dashboard_realtime')
      .on('postgres_changes',{event:'*',schema:'public',table:'follow_up_schedules'},()=>{
        supabase.from('follow_up_schedules').select('*').eq('status','pending')
          .order('follow_up_date',{ascending:true})
          .then(({data})=>{
            const all=data??[]
            setFollowUpList(all)
            setFollowUpToday(all.filter((r:any)=>r.follow_up_date===today))
            setStats(prev=>({...prev,followUp:all.length}))
          })
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'patients'},()=>{
        // re-fetch monthly trend + total count + demo counts when new patient is added
        fetchMonthly()
        supabase.from('patients').select('id',{count:'exact',head:true})
          .then(({count}) => setStats(prev=>({...prev, total: count??prev.total})))
        Promise.all([
          supabase.from('patients').select('id',{count:'exact',head:true}).eq('sex','M'),
          supabase.from('patients').select('id',{count:'exact',head:true}).eq('sex','F'),
          supabase.from('patients').select('id',{count:'exact',head:true}).gte('age',60),
          supabase.from('patients').select('id',{count:'exact',head:true}).lt('age',18),
        ]).then(([m,f,s,k]) => setDemoCounts({ male:m.count??0, female:f.count??0, senior:s.count??0, kids:k.count??0 }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },[])

  const openQuickModal = async (key: string) => {
    setModal('quick_'+key); setQuickLoading(true); setQuickPatients([])
    try {
      // Use count:'exact' + limit for display — shows true total in title, 200 rows in list
      let q = supabase.from('patients').select('*',{count:'exact'}).order('created_at',{ascending:false}).limit(200)
      if (key==='male')   q = q.eq('sex','M')
      if (key==='female') q = q.eq('sex','F')
      if (key==='senior') q = q.gte('age',60)
      if (key==='kids')   q = q.lt('age',18)
      const { data, count } = await q
      setQuickPatients(data??[])
      // Store the real count separately for display in modal title
      setQuickTotalCount(count??0)
    } finally { setQuickLoading(false) }
  }

  const todayPatients = patients.filter(p=>p.created_at?.startsWith(new Date().toISOString().split('T')[0]))
  const isToday = (day:string) => new Date().toLocaleDateString('en-US',{weekday:'long'})===day
  // ── Counts derived from patients list are approximate (limited to 100 fetched) ──
  // For accurate counts, we use dedicated state from DB count queries
  // Use accurate DB counts for cards/percentages
  const maleCount   = demoCounts.male
  const femaleCount = demoCounts.female
  const seniorCount = demoCounts.senior
  const kidsCount   = demoCounts.kids
  const total       = stats.total || 1

  // ── Responsive grid columns ────────────────────────────────────────────────
  const pad       = isMobile ? 12 : isTablet ? 16 : 24
  const gap       = isMobile ? 8  : isTablet ? 10 : 14
  const statCols  = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)'
  const quickCols = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)'
  const chartCols = isSmall  ? '1fr' : '2fr 1fr'
  const compact   = isTablet  // use compact sizing below tablet

  const quickItems = [
    { label:'Male',     value:maleCount,   pct:Math.round(maleCount/total*100)+'%',   color:C.blue,  bg:'#eff6ff', border:'#bfdbfe', icon:'♂', key:'male'   },
    { label:'Female',   value:femaleCount, pct:Math.round(femaleCount/total*100)+'%', color:C.pink,  bg:'#fdf2f8', border:'#f9a8d4', icon:'♀', key:'female' },
    { label:'Kids <18', value:kidsCount,   pct:Math.round(kidsCount/total*100)+'%',   color:C.amber, bg:'#fefce8', border:'#fde047', icon:'⭐', key:'kids'   },
    { label:'Seniors',  value:seniorCount, pct:Math.round(seniorCount/total*100)+'%', color:C.green, bg:'#f0fdf4', border:'#86efac', icon:'☘', key:'senior' },
  ]

  const barColors = [C.green,C.teal,C.emerald,C.lime,C.forest,C.mint,C.green,C.teal,C.emerald,C.lime,C.forest,C.mint]
  const emptyMonths = Array.from({length:12},(_,i)=>({month:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],patients:0}))

  return (
    <main style={{flex:1, padding:pad, overflowY:'auto', background:bg, minWidth:0}}>

      {/* ── Header ── */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:gap+8, gap:8, flexWrap:'wrap'}}>
        <div>
          <p style={{color:dk?'#4ade80':txt2, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:1}}>Registrar</p>
          <h1 style={{fontSize: isMobile?22:isTablet?28:34, fontWeight:900, color:dk?'#4ade80':C.green, margin:0, lineHeight:1}}>Dashboard</h1>
          {!isMobile&&<p style={{color:txt2, fontSize:10, marginTop:3}}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>}
        </div>
        <button onClick={onAddPatient} style={{
          background:`linear-gradient(135deg,${C.green},${C.teal})`, color:'#fff', border:'none',
          borderRadius:10, padding: isMobile?'8px 14px':'10px 20px', cursor:'pointer',
          display:'flex', alignItems:'center', gap:5, fontWeight:800, fontSize: isMobile?11:13,
          boxShadow:'0 4px 14px rgba(22,163,74,0.38)', transition:'transform 0.15s', whiteSpace:'nowrap',
        }}
          onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
        >
          <Plus size={isMobile?12:16}/> Add Patient
        </button>
      </div>

      {/* ── Row 1: Stat cards ── */}
      <div style={{display:'grid', gridTemplateColumns:statCols, gap, marginBottom:gap}}>
        <StatCard label="Total Patients"   value={stats.total}    sub="All time registered" icon={Users}     gradient={[C.green,  C.teal  ]} compact={compact} onClick={()=>onGoToLogs?.()} />
        <StatCard label="Today"            value={stats.today}    sub="Registered today"    icon={UserCheck} gradient={[C.emerald,C.forest]} compact={compact} onClick={()=>setModal('today')} />
        <StatCard label="Awaiting Consult" value={stats.pending}  sub="In queue now"        icon={Clock}     gradient={['#0ea5e9','#0369a1']} compact={compact} onClick={()=>setModal('pending')} />
        <StatCard label="Follow Up"        value={stats.followUp} sub="Pending return visits" badge={followUpToday.length>0?`${followUpToday.length} today`:undefined} icon={RefreshCw} gradient={[C.lime, C.olive]} compact={compact} onClick={()=>setModal('followup')} />
      </div>

      {/* ── Row 2: Quick cards ── */}
      <div style={{display:'grid', gridTemplateColumns:quickCols, gap, marginBottom:gap+4}}>
        {quickItems.map(item => (
          <QuickCard
            key={item.key} icon={item.icon} label={item.label} value={item.value} pct={item.pct}
            color={item.color} bg={item.bg} border={item.border} darkBg={dk} compact={compact}
            hov={hovQuick===item.key}
            onEnter={()=>setHovQuick(item.key)} onLeave={()=>setHovQuick(null)}
            onClick={()=>openQuickModal(item.key)}
          />
        ))}
      </div>

      {/* ── Row 3: Monthly trend + Pie ── */}
      <div style={{display:'grid', gridTemplateColumns:chartCols, gap, marginBottom:gap}}>
        {/* Bar chart */}
        <div style={{background:card, borderRadius:14, padding:compact?14:18, border:`1px solid ${bdr}`, minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:6}}>
            <SectionTitle title="Monthly Patient Trend" dark={dk}/>
            <span style={{fontSize:9,color:txt2,background:dk?'#1a3d24':'#f0fdf4',border:`1px solid ${bdr}`,padding:'2px 7px',borderRadius:20,flexShrink:0}}>Live from DB</span>
          </div>
          <ResponsiveContainer width="100%" height={isMobile?140:compact?160:190}>
            <BarChart
              data={monthlyData.length ? monthlyData : emptyMonths}
              margin={{top:14,right:4,left:-28,bottom:0}}
              onClick={(d:any)=>d?.activePayload&&setModal('month_'+d.activePayload[0].payload.month)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={dk?'#1a3d24':'#f0f0f0'}/>
              <XAxis dataKey="month" tick={{fontSize:isMobile?7:9,fill:txt2}}/>
              <YAxis tick={{fontSize:isMobile?7:9,fill:txt2}}/>
              <Tooltip contentStyle={{background:dk?'#122918':'#fff',border:`1px solid ${bdr}`,borderRadius:8,fontSize:10}} cursor={{fill:'rgba(22,163,74,0.07)'}}/>
              <Bar dataKey="patients" label={isMobile?undefined:<CustomBarLabel/>} radius={[4,4,0,0]} style={{cursor:'pointer'}}>
                {(monthlyData.length ? monthlyData : emptyMonths).map((_,i) => (
                  <Cell key={i} fill={barColors[i % 12]}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div style={{background:card, borderRadius:14, padding:compact?14:18, border:`1px solid ${bdr}`, minWidth:0}}>
          <SectionTitle title="Patient Category" dark={dk}/>
          <ResponsiveContainer width="100%" height={compact?100:130}>
            <PieChart>
              <Pie data={CATEGORY_DATA} innerRadius={compact?28:38} outerRadius={compact?42:54} paddingAngle={4} dataKey="value"
                onClick={(d:any)=>setModal('cat_'+d.name)} style={{cursor:'pointer'}}>
                {CATEGORY_DATA.map((d,i)=><Cell key={i} fill={d.color} opacity={hovCat===d.name?0.65:1}/>)}
              </Pie>
              <Tooltip contentStyle={{background:dk?'#122918':'#fff',border:`1px solid ${bdr}`,borderRadius:8,fontSize:10}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{marginTop:4}}>
            {CATEGORY_DATA.map(d=>(
              <div key={d.name} onClick={()=>setModal('cat_'+d.name)}
                onMouseEnter={()=>setHovCat(d.name)} onMouseLeave={()=>setHovCat(null)}
                style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,padding:'2px 5px',borderRadius:5,cursor:'pointer',background:hovCat===d.name?`${d.color}18`:'transparent',transition:'background 0.12s'}}>
                <div style={{width:7,height:7,borderRadius:2,background:d.color,flexShrink:0}}/>
                <span style={{flex:1,color:dk?'#a7f3d0':'#4b5563',fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</span>
                <span style={{fontWeight:700,color:d.color,fontSize:10,flexShrink:0}}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Schedule ── */}
      <div style={{background:card, borderRadius:14, padding:compact?14:18, border:`1px solid ${bdr}`}}>
        <SectionTitle title="Weekly Schedule" dark={dk}/>
        <div style={{
          display:'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : isSmall ? 'repeat(3,1fr)' : 'repeat(5,1fr)',
          gap: isMobile?5:8,
        }}>
          {SCHEDULE.map(({day,consult,color,icon})=>(
            <div key={day} onClick={()=>setModal('sched_'+day)}
              onMouseEnter={()=>setHovSched(day)} onMouseLeave={()=>setHovSched(null)}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding: compact?'8px 10px':'11px 13px', borderRadius:10, cursor:'pointer',
                border:`1.5px solid ${isToday(day)||hovSched===day?color:bdr}`,
                background:isToday(day)?`${color}18`:hovSched===day?`${color}0d`:(dk?'#0d1f14':'#fafafa'),
                transition:'all 0.13s', transform:hovSched===day?'translateY(-2px)':'translateY(0)',
              }}>
              <span style={{fontSize:compact?14:18,flexShrink:0}}>{icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:9,fontWeight:800,color:isToday(day)||hovSched===day?color:txt2,textTransform:'uppercase',letterSpacing:0.5}}>{day}</div>
                <div style={{fontSize:10,fontWeight:600,color:txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{consult}</div>
              </div>
              {isToday(day)&&<span style={{background:color,color:'#fff',fontSize:7,fontWeight:800,padding:'2px 5px',borderRadius:20,textTransform:'uppercase',whiteSpace:'nowrap',flexShrink:0}}>TODAY</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ══ MODALS ══ */}
      {modal==='today' && (
        <Modal title={`Today's Patients (${todayPatients.length})`} color={C.emerald} onClose={()=>setModal(null)}>
          {todayPatients.length===0
            ? <p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No patients registered today yet.</p>
            : todayPatients.map(p=><PatientRow key={p.id} p={p} accent={C.emerald} bg="#ecfdf5" border="#a7f3d0"/>)}
        </Modal>
      )}

      {modal==='pending' && (
        <Modal title={`Awaiting Consult (${pendingList.length})`} color='#0ea5e9' onClose={()=>setModal(null)}>
          {pendingList.length===0
            ? <p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No patients in queue.</p>
            : pendingList.map((c,i)=>(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius:10,background:'#f0f9ff',border:'1px solid #bae6fd',marginBottom:6}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'#0ea5e9',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:10,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.patients?.last_name}, {c.patients?.first_name}</div>
                    <div style={{fontSize:10,color:'#6b7280'}}>Scheduled: {c.scheduled_time||'Walk-in'}</div>
                  </div>
                  <span style={{background:'#bae6fd',color:'#0c4a6e',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,whiteSpace:'nowrap'}}>{c.priority||'Normal'}</span>
                </div>
              ))}
        </Modal>
      )}

      {modal==='followup' && (
        <Modal title={`Follow Up Queue (${followUpList.length})`} color={C.lime} onClose={()=>setModal(null)}>
          {/* Summary strip */}
          {followUpList.length > 0 && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
              {[
                { label:'Today',    value:followUpToday.length,                                                                                  color:C.green },
                { label:'Upcoming', value:followUpList.filter((r:any)=>r.follow_up_date>new Date().toISOString().split('T')[0]).length,           color:C.teal  },
                { label:'Total',    value:followUpList.length,                                                                                   color:C.lime  },
              ].map(g=>(
                <div key={g.label} style={{background:`${g.color}10`,borderRadius:10,padding:'10px 8px',border:`1px solid ${g.color}33`,textAlign:'center'}}>
                  <div style={{fontSize:22,fontWeight:900,color:g.color}}>{g.value}</div>
                  <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>{g.label}</div>
                </div>
              ))}
            </div>
          )}
          {followUpList.length===0
            ? (
              <div style={{textAlign:'center',padding:'32px 0'}}>
                <div style={{fontSize:40,marginBottom:8}}>📅</div>
                <div style={{fontSize:14,fontWeight:600,color:'#166534'}}>No follow-ups scheduled</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:4}}>Doctor-scheduled follow-ups will appear here</div>
              </div>
            )
            : followUpList.map((entry:any)=>{
                const isToday2 = entry.follow_up_date===new Date().toISOString().split('T')[0]
                const isFemale = entry.patient_gender?.toLowerCase().includes('f')
                const dateLabel = isToday2 ? 'Today' : new Date(entry.follow_up_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                return (
                  <div key={entry.id} style={{
                    display:'flex',alignItems:'center',gap:10,
                    padding:'10px 12px',borderRadius:10,marginBottom:6,
                    background: isToday2?'#f0fdf4':'#f9fafb',
                    border:`1px solid ${isToday2?'#86efac':'#e5e7eb'}`,
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width:38,height:38,borderRadius:'50%',flexShrink:0,
                      background:isFemale?'#fbcfe8':'#bfdbfe',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:isFemale?'#9d174d':'#1e40af',fontWeight:800,fontSize:12,
                    }}>
                      {entry.patient_name?.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()||'?'}
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{entry.patient_name}</div>
                      <div style={{fontSize:10,color:'#6b7280',display:'flex',gap:6,flexWrap:'wrap',marginTop:1}}>
                        {entry.patient_age&&<span>{entry.patient_age}y</span>}
                        {entry.patient_gender&&<span>· {entry.patient_gender}</span>}
                        {entry.patient_addr&&<span>· {entry.patient_addr}</span>}
                      </div>
                      {entry.notes&&(
                        <div style={{fontSize:10,color:'#854d0e',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:4,padding:'2px 6px',marginTop:3,display:'inline-block'}}>
                          📋 {entry.notes}
                        </div>
                      )}
                    </div>
                    {/* Badges */}
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
        <Modal title={`Patients in ${modal.replace('month_','')}`} color={C.green} onClose={()=>setModal(null)}>
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{fontSize:60,fontWeight:900,color:C.green,lineHeight:1}}>{monthlyData.find(m=>m.month===modal.replace('month_',''))?.patients??0}</div>
            <p style={{color:'#6b7280',marginTop:8,fontSize:13}}>Patients registered in {modal.replace('month_','')}</p>
          </div>
        </Modal>
      )}

      {modal?.startsWith('cat_') && (
        <Modal title={modal.replace('cat_','')+' Patients'} color={CATEGORY_DATA.find(c=>'cat_'+c.name===modal)?.color??C.green} onClose={()=>setModal(null)}>
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{fontSize:60,fontWeight:900,color:CATEGORY_DATA.find(c=>'cat_'+c.name===modal)?.color,lineHeight:1}}>{CATEGORY_DATA.find(c=>'cat_'+c.name===modal)?.value}%</div>
            <p style={{color:'#6b7280',marginTop:8,fontSize:13}}>of total registered patients</p>
          </div>
        </Modal>
      )}

      {modal?.startsWith('sched_') && (()=>{
        const s = SCHEDULE.find(sc=>sc.day===modal.replace('sched_',''))!
        return s ? (
          <Modal title={s.day} color={s.color} onClose={()=>setModal(null)}>
            <div style={{textAlign:'center',padding:'16px 0'}}>
              <div style={{fontSize:40,marginBottom:10}}>{s.icon}</div>
              <div style={{fontSize:17,fontWeight:800,color:s.color,marginBottom:6}}>{s.consult}</div>
              <div style={{fontSize:12,color:'#6b7280',marginBottom:12}}>{s.day}s at RHU Lopez</div>
              {isToday(s.day)&&<div style={{background:`${s.color}18`,border:`1.5px solid ${s.color}`,borderRadius:10,padding:'10px 14px',fontSize:12,color:s.color,fontWeight:700}}>Today is {s.day} — this consultation is ongoing</div>}
            </div>
          </Modal>
        ) : null
      })()}

      {modal==='quick_male' && (
        <Modal title={`Male Patients (${quickLoading?'…':quickTotalCount.toLocaleString()})`} color={C.blue} onClose={()=>setModal(null)}>
          {quickLoading?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>Loading...</p>
            :quickPatients.length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No male patients found.</p>
            :quickPatients.map(p=><PatientRow key={p.id} p={p} accent={C.blue} bg="#eff6ff" border="#bfdbfe"/>)}
        </Modal>
      )}
      {modal==='quick_female' && (
        <Modal title={`Female Patients (${quickLoading?'…':quickTotalCount.toLocaleString()})`} color={C.pink} onClose={()=>setModal(null)}>
          {quickLoading?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>Loading...</p>
            :quickPatients.length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No female patients found.</p>
            :quickPatients.map(p=><PatientRow key={p.id} p={p} accent={C.pink} bg="#fdf2f8" border="#f9a8d4"/>)}
        </Modal>
      )}
      {modal==='quick_senior' && (
        <Modal title={`Senior Citizens 60+ (${quickLoading?'…':quickPatients.length})`} color={C.green} onClose={()=>setModal(null)}>
          {quickLoading?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>Loading...</p>
            :quickPatients.length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No senior patients found.</p>
            :quickPatients.map(p=><PatientRow key={p.id} p={p} accent={C.green} bg="#f0fdf4" border="#86efac"/>)}
        </Modal>
      )}
      {modal==='quick_kids' && (
        <Modal title={`Kids — Under 18 (${quickLoading?'…':quickPatients.length})`} color={C.amber} onClose={()=>setModal(null)}>
          {quickLoading?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>Loading...</p>
            :quickPatients.length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No patients under 18 found.</p>
            :(
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                  {[
                    {label:'Infant (0–2)',  value:quickPatients.filter(p=>p.age<=2).length,            color:C.teal  },
                    {label:'Child (3–12)', value:quickPatients.filter(p=>p.age>=3&&p.age<=12).length, color:C.green },
                    {label:'Teen (13–17)', value:quickPatients.filter(p=>p.age>=13&&p.age<=17).length,color:C.amber },
                  ].map(g=>(
                    <div key={g.label} style={{background:`${g.color}10`,borderRadius:10,padding:'9px 7px',border:`1px solid ${g.color}33`,textAlign:'center'}}>
                      <div style={{fontSize:20,fontWeight:900,color:g.color}}>{g.value}</div>
                      <div style={{fontSize:9,color:'#6b7280',marginTop:2}}>{g.label}</div>
                    </div>
                  ))}
                </div>
                {quickPatients.map(p=><PatientRow key={p.id} p={p} accent={C.amber} bg="#fefce8" border="#fde047"/>)}
              </>
            )}
        </Modal>
      )}
    </main>
  )
}