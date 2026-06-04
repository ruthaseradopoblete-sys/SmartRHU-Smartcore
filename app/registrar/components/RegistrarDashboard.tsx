'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Users, UserCheck, Clock, Activity, X, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const C = {
  green:'#16a34a', teal:'#0d9488', blue:'#2563eb', purple:'#7c3aed',
  orange:'#ea580c', pink:'#db2777', yellow:'#ca8a04', red:'#dc2626',
}

const MONTHLY_DATA = [
  { month:'Jan', patients:42 },{ month:'Feb', patients:58 },
  { month:'Mar', patients:51 },{ month:'Apr', patients:73 },
  { month:'May', patients:89 },{ month:'Jun', patients:65 },
  { month:'Jul', patients:94 },{ month:'Aug', patients:78 },
  { month:'Sep', patients:102},{ month:'Oct', patients:87 },
  { month:'Nov', patients:110},{ month:'Dec', patients:96 },
]

const CATEGORY_DATA = [
  { name:'General',        value:34, color:C.green  },
  { name:'Pediatric',      value:22, color:C.blue   },
  { name:'Pregnancy',      value:18, color:C.pink   },
  { name:'Teen Pregnancy', value:10, color:C.orange },
  { name:'Mental Health',  value:16, color:C.purple },
]

const WEEKLY_DATA = [
  { day:'Mon', new:8,  returning:5  },
  { day:'Tue', new:12, returning:7  },
  { day:'Wed', new:6,  returning:9  },
  { day:'Thu', new:15, returning:11 },
  { day:'Fri', new:10, returning:8  },
]

const SCHEDULE = [
  { day:'Monday',    consult:'General Consultation',           color:C.green,  icon:'🩺' },
  { day:'Tuesday',   consult:'Pediatric Consultation',         color:C.blue,   icon:'👶' },
  { day:'Wednesday', consult:'Pregnancy Consultation',         color:C.pink,   icon:'🤰' },
  { day:'Thursday',  consult:'Teenage Pregnancy Consultation', color:C.orange, icon:'📋' },
  { day:'Friday',    consult:'Mental Health Consultation',     color:C.purple, icon:'🧠' },
]

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return { isMobile: w < 640, isTablet: w < 1024, w }
}

function Modal({ title, color, onClose, children }: {
  title:string; color:string; onClose:()=>void; children:React.ReactNode
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:'16px' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:560, maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:`linear-gradient(135deg,${color},${color}bb)`, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <h2 style={{color:'#fff',margin:0,fontSize:16,fontWeight:800}}>{title}</h2>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'#fff',display:'flex',alignItems:'center'}}><X size={16}/></button>
        </div>
        <div style={{padding:'16px 20px',overflowY:'auto',flex:1}}>{children}</div>
      </div>
    </div>
  )
}

function PatientRow({ p, accent, bg, border }: { p:any; accent:string; bg:string; border:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:bg, border:`1px solid ${border}`, marginBottom:6 }}>
      <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${accent},${accent}99)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13 }}>
        {(p.first_name?.[0]??'?').toUpperCase()}
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.last_name}, {p.first_name} {p.middle_name??''}</div>
        <div style={{fontSize:11,color:'#6b7280'}}>{p.barangay??'—'} · {p.sex==='F'?'Female':'Male'} · {p.age??'—'} yrs</div>
      </div>
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{fontSize:10,color:'#9ca3af'}}>{p.created_at ? new Date(p.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</div>
        <div style={{marginTop:2,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:`${accent}18`,color:accent}}>{p.sex==='F'?'Female':'Male'}</div>
      </div>
    </div>
  )
}

/* ── Big stat card (top row) ── */
function StatCard({ label, value, sub, icon:Icon, gradient, isMobile, onClick }: {
  label:string; value:string|number; sub?:string;
  icon:React.ElementType; gradient:string[]; isMobile:boolean; onClick:()=>void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      borderRadius:16, padding: isMobile?'16px':'22px 24px', color:'#fff',
      position:'relative', overflow:'hidden', cursor:'pointer', userSelect:'none',
      background:`linear-gradient(135deg,${gradient[0]},${gradient[1]})`,
      boxShadow: hov?`0 16px 40px ${gradient[0]}66`:`0 8px 24px ${gradient[0]}44`,
      transform: hov?'translateY(-3px) scale(1.02)':'translateY(0) scale(1)',
      transition:'all 0.2s ease',
    }}>
      <div style={{position:'absolute',right:-16,top:-16,width:70,height:70,borderRadius:'50%',background:'rgba(255,255,255,0.12)'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <p style={{fontSize:10,fontWeight:700,opacity:0.85,margin:'0 0 4px',textTransform:'uppercase',letterSpacing:0.8}}>{label}</p>
          <h2 style={{fontSize:isMobile?32:42,fontWeight:900,margin:'0 0 2px',lineHeight:1}}>{value}</h2>
          {sub&&!isMobile&&<p style={{fontSize:10,opacity:0.7,margin:0}}>{sub}</p>}
        </div>
        <div style={{background:'rgba(255,255,255,0.2)',borderRadius:12,padding:8}}>
          <Icon size={isMobile?16:20} strokeWidth={2}/>
        </div>
      </div>
      {!isMobile&&<div style={{marginTop:8,display:'flex',alignItems:'center',gap:4,fontSize:10,opacity:0.8}}><ChevronRight size={11}/> Click to view</div>}
    </div>
  )
}

/* ── Small quick-stat card (below totals) ── */
function QuickCard({ icon, label, value, pct, color, bg, darkBg, hov, onEnter, onLeave, onClick }: {
  icon:string; label:string; value:number; pct:string
  color:string; bg:string; darkBg:boolean
  hov:boolean; onEnter:()=>void; onLeave:()=>void; onClick:()=>void
}) {
  return (
    <div onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} style={{
      background: darkBg ? '#0f2014' : bg,
      borderRadius:14, padding:'14px 16px',
      border:`1.5px solid ${hov ? color : 'transparent'}`,
      boxShadow: hov ? `0 8px 24px ${color}33` : '0 2px 8px rgba(0,0,0,0.06)',
      cursor:'pointer',
      transform: hov ? 'translateY(-3px)' : 'translateY(0)',
      transition:'all 0.2s',
      display:'flex', alignItems:'center', gap:14,
    }}>
      {/* Icon circle */}
      <div style={{
        width:46, height:46, borderRadius:'50%', flexShrink:0,
        background:`linear-gradient(135deg,${color},${color}99)`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
        boxShadow:`0 4px 12px ${color}44`,
      }}>{icon}</div>
      {/* Text */}
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:11, fontWeight:700, color: darkBg?'#6ee7b7':'#6b7280', marginBottom:2}}>{label}</div>
        <div style={{fontSize:26, fontWeight:900, color, lineHeight:1}}>{value}</div>
      </div>
      {/* Pct badge */}
      <div style={{
        background:`${color}18`, border:`1px solid ${color}33`,
        borderRadius:20, padding:'4px 10px', flexShrink:0,
        fontSize:12, fontWeight:800, color,
      }}>{pct}</div>
    </div>
  )
}

function SectionTitle({ title, dark }:{ title:string; dark:boolean }) {
  return (
    <h3 style={{fontSize:12,fontWeight:800,color:dark?'#6ee7b7':'#374151',margin:'0 0 12px',textTransform:'uppercase',letterSpacing:1.5}}>
      {title}
    </h3>
  )
}

interface Props {
  onAddPatient: () => void
  darkMode: boolean
  onGoToLogs?: () => void
}

export default function RegistrarDashboard({ onAddPatient, darkMode, onGoToLogs }: Props) {
  const dk = darkMode
  const { isMobile, isTablet } = useBreakpoint()

  const [stats, setStats]                 = useState({ total:0, today:0, pending:0, active:0 })
  const [patients, setPatients]           = useState<any[]>([])
  const [pendingList, setPendingList]     = useState<any[]>([])
  const [modal, setModal]                 = useState<string|null>(null)
  const [quickPatients, setQuickPatients] = useState<any[]>([])
  const [quickLoading, setQuickLoading]   = useState(false)
  const [hovSched, setHovSched]           = useState<string|null>(null)
  const [hovCat,   setHovCat]             = useState<string|null>(null)
  const [hovQuick, setHovQuick]           = useState<string|null>(null)

  const bg   = dk?'#0d1a0f':'#f0f4f1'
  const card = dk?'#0f2014':'#ffffff'
  const bdr  = dk?'#1a3d24':'#e5e7eb'
  const txt  = dk?'#e2f5e9':'#1f2937'
  const txt2 = dk?'#6ee7b7':'#6b7280'

  useEffect(()=>{
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      supabase.from('patients').select('*').order('created_at',{ascending:false}),
      supabase.from('patients').select('id',{count:'exact',head:true}).gte('created_at',today),
      supabase.from('consultations').select('*,patients(first_name,last_name)').eq('status','Pending'),
    ]).then(([all, tod, pend])=>{
      setPatients(all.data??[])
      setPendingList(pend.data??[])
      setStats({
        total:   all.data?.length??0,
        today:   tod.count??0,
        pending: pend.data?.length??0,
        active:  Math.max(0,(all.data?.length??0)-(pend.data?.length??0)),
      })
    })
  },[])

  const openQuickModal = async (key: string) => {
    setModal('quick_'+key)
    setQuickLoading(true)
    setQuickPatients([])
    try {
      let q = supabase.from('patients').select('*').order('created_at',{ascending:false})
      if (key==='male')   q = q.eq('sex','M')
      if (key==='female') q = q.eq('sex','F')
      if (key==='senior') q = q.gte('age',60)
      if (key==='kids')   q = q.lt('age',18)
      const { data } = await q
      setQuickPatients(data??[])
    } finally {
      setQuickLoading(false)
    }
  }

  const todayPatients = patients.filter(p=>p.created_at?.startsWith(new Date().toISOString().split('T')[0]))
  const isToday = (day:string) => new Date().toLocaleDateString('en-US',{weekday:'long'})===day

  const maleCount   = patients.filter(p=>p.sex==='M').length
  const femaleCount = patients.filter(p=>p.sex==='F').length
  const seniorCount = patients.filter(p=>p.age>=60).length
  const kidsCount   = patients.filter(p=>p.age<18).length
  const total       = patients.length||1

  const statCols  = isMobile ? 'repeat(2,1fr)' : isTablet ? 'repeat(2,1fr)' : 'repeat(4,1fr)'
  const quickCols = isMobile ? 'repeat(1,1fr)' : isTablet ? 'repeat(2,1fr)' : 'repeat(4,1fr)'
  const row2Cols  = isMobile ? '1fr' : isTablet ? '1fr' : '2fr 1fr'
  const row3Cols  = isMobile ? '1fr' : isTablet ? '1fr' : '1fr 1.6fr'

  const quickItems = [
    { label:'Male Patients',   value:maleCount,   pct:Math.round(maleCount/total*100)+'%',   color:C.blue,   icon:'', bg:'#eff6ff', key:'male'   },
    { label:'Female Patients', value:femaleCount, pct:Math.round(femaleCount/total*100)+'%', color:C.pink,   icon:'', bg:'#fdf2f8', key:'female' },
    { label:'Kids (Under 18)', value:kidsCount,   pct:Math.round(kidsCount/total*100)+'%',   color:C.purple, icon:'', bg:'#f5f3ff', key:'kids'   },
    { label:'Senior Citizens', value:seniorCount, pct:Math.round(seniorCount/total*100)+'%', color:C.orange, icon:'', bg:'#fff7ed', key:'senior' },
  ]

  return (
    <main style={{flex:1, padding: isMobile?14:24, overflowY:'auto', background:bg}}>

      {/* ── Header ── */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems: isMobile?'center':'flex-end', marginBottom: isMobile?18:28, gap:10, flexWrap:'wrap'}}>
        <div>
          <p style={{color:dk?'#4ade80':txt2, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:2}}>Registrar</p>
          <h1 style={{fontSize: isMobile?24:34, fontWeight:900, color:dk?'#4ade80':C.green, margin:0, lineHeight:1}}>Dashboard</h1>
          {!isMobile&&<p style={{color:txt2, fontSize:11, marginTop:4}}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>}
        </div>
        <button onClick={onAddPatient} style={{
          background:`linear-gradient(135deg,${C.green},${C.teal})`, color:'#fff', border:'none',
          borderRadius:12, padding: isMobile?'9px 16px':'12px 24px', cursor:'pointer',
          display:'flex', alignItems:'center', gap:6, fontWeight:800, fontSize: isMobile?12:14,
          boxShadow:'0 6px 20px rgba(22,163,74,0.4)', transition:'all 0.2s', whiteSpace:'nowrap',
        }}
          onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-2px)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}
        >
          <Plus size={isMobile?14:18}/> Add Patient
        </button>
      </div>

      {/* ── Row 1: Big stat cards ── */}
      <div style={{display:'grid', gridTemplateColumns:statCols, gap: isMobile?10:16, marginBottom: isMobile?10:14}}>
        <StatCard label="Total Patients"   value={stats.total}   sub="All time registered" icon={Users}     gradient={['#16a34a','#0d9488']} isMobile={isMobile} onClick={()=>onGoToLogs?.()} />
        <StatCard label="Today's Patients" value={stats.today}   sub="Registered today"    icon={UserCheck} gradient={['#2563eb','#7c3aed']} isMobile={isMobile} onClick={()=>setModal('today')} />
        <StatCard label="Pending Queue"    value={stats.pending} sub="Waiting for doctor"  icon={Clock}     gradient={['#ea580c','#ca8a04']} isMobile={isMobile} onClick={()=>setModal('pending')} />
        <StatCard label="Consultations"    value={stats.active}  sub="Served patients"     icon={Activity}  gradient={['#db2777','#7c3aed']} isMobile={isMobile} onClick={()=>setModal('active')} />
      </div>

      {/* ── Row 2: Quick breakdown cards (right below totals) ── */}
      <div style={{display:'grid', gridTemplateColumns:quickCols, gap: isMobile?8:12, marginBottom: isMobile?16:24}}>
        {quickItems.map(item => (
          <QuickCard
            key={item.key}
            icon={item.icon} label={item.label} value={item.value} pct={item.pct}
            color={item.color} bg={item.bg} darkBg={dk}
            hov={hovQuick===item.key}
            onEnter={()=>setHovQuick(item.key)}
            onLeave={()=>setHovQuick(null)}
            onClick={()=>openQuickModal(item.key)}
          />
        ))}
      </div>

      {/* ── Row 3: Bar + Pie ── */}
      <div style={{display:'grid', gridTemplateColumns:row2Cols, gap: isMobile?12:16, marginBottom: isMobile?12:20}}>
        <div style={{background:card, borderRadius:16, padding: isMobile?14:20, boxShadow:'0 2px 12px rgba(0,0,0,0.08)', border:`1px solid ${bdr}`}}>
          <SectionTitle title="Monthly Patient Trend" dark={dk}/>
          <ResponsiveContainer width="100%" height={isMobile?160:200}>
            <BarChart data={MONTHLY_DATA} margin={{top:0,right:8,left:-24,bottom:0}}
              onClick={(d:any)=>d?.activePayload&&setModal('month_'+d.activePayload[0].payload.month)}>
              <CartesianGrid strokeDasharray="3 3" stroke={dk?'#1a3d24':'#f0f0f0'}/>
              <XAxis dataKey="month" tick={{fontSize:isMobile?8:10,fill:txt2}}/>
              <YAxis tick={{fontSize:isMobile?8:10,fill:txt2}}/>
              <Tooltip contentStyle={{background:dk?'#122918':'#fff',border:`1px solid ${bdr}`,borderRadius:8,fontSize:11}} cursor={{fill:'rgba(22,163,74,0.08)'}}/>
              <Bar dataKey="patients" fill="url(#greenGrad)" radius={[5,5,0,0]} style={{cursor:'pointer'}}/>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green}/><stop offset="100%" stopColor={C.teal}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{background:card, borderRadius:16, padding: isMobile?14:20, boxShadow:'0 2px 12px rgba(0,0,0,0.08)', border:`1px solid ${bdr}`}}>
          <SectionTitle title="Patient Category" dark={dk}/>
          <ResponsiveContainer width="100%" height={isMobile?120:140}>
            <PieChart>
              <Pie data={CATEGORY_DATA} innerRadius={isMobile?32:42} outerRadius={isMobile?48:60} paddingAngle={4} dataKey="value"
                onClick={(d:any)=>setModal('cat_'+d.name)} style={{cursor:'pointer'}}>
                {CATEGORY_DATA.map((d,i)=><Cell key={i} fill={d.color} opacity={hovCat===d.name?0.7:1}/>)}
              </Pie>
              <Tooltip contentStyle={{background:dk?'#122918':'#fff',border:`1px solid ${bdr}`,borderRadius:8,fontSize:11}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{marginTop:6}}>
            {CATEGORY_DATA.map(d=>(
              <div key={d.name} onClick={()=>setModal('cat_'+d.name)}
                onMouseEnter={()=>setHovCat(d.name)} onMouseLeave={()=>setHovCat(null)}
                style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,fontSize:11,padding:'3px 6px',borderRadius:6,cursor:'pointer',background:hovCat===d.name?`${d.color}18`:'transparent',transition:'background 0.15s'}}>
                <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
                <span style={{flex:1,color:dk?'#a7f3d0':'#4b5563',fontSize:11}}>{d.name}</span>
                <span style={{fontWeight:700,color:d.color,fontSize:11}}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Weekly + Schedule ── */}
      <div style={{display:'grid', gridTemplateColumns:row3Cols, gap: isMobile?12:16}}>
        <div style={{background:card, borderRadius:16, padding: isMobile?14:20, boxShadow:'0 2px 12px rgba(0,0,0,0.08)', border:`1px solid ${bdr}`}}>
          <SectionTitle title="This Week" dark={dk}/>
          <ResponsiveContainer width="100%" height={isMobile?140:160}>
            <BarChart data={WEEKLY_DATA} margin={{top:0,right:8,left:-24,bottom:0}}
              onClick={(d:any)=>d?.activePayload&&setModal('week_'+d.activePayload[0].payload.day)}>
              <CartesianGrid strokeDasharray="3 3" stroke={dk?'#1a3d24':'#f0f0f0'}/>
              <XAxis dataKey="day" tick={{fontSize:isMobile?8:10,fill:txt2}}/>
              <YAxis tick={{fontSize:isMobile?8:10,fill:txt2}}/>
              <Tooltip contentStyle={{background:dk?'#122918':'#fff',border:`1px solid ${bdr}`,borderRadius:8,fontSize:11}} cursor={{fill:'rgba(22,163,74,0.08)'}}/>
              <Bar dataKey="new"       name="New"       fill={C.blue}   radius={[4,4,0,0]} style={{cursor:'pointer'}}/>
              <Bar dataKey="returning" name="Returning" fill={C.purple} radius={[4,4,0,0]} style={{cursor:'pointer'}}/>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:'flex',gap:12,marginTop:6,justifyContent:'center'}}>
            {[{label:'New',color:C.blue},{label:'Returning',color:C.purple}].map(l=>(
              <span key={l.label} style={{fontSize:10,display:'flex',alignItems:'center',gap:4,color:l.color}}>
                <div style={{width:8,height:8,borderRadius:2,background:l.color}}/>{l.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{background:card, borderRadius:16, padding: isMobile?14:20, boxShadow:'0 2px 12px rgba(0,0,0,0.08)', border:`1px solid ${bdr}`}}>
          <SectionTitle title="Weekly Schedule" dark={dk}/>
          <div style={{display:'flex',flexDirection:'column',gap: isMobile?6:8}}>
            {SCHEDULE.map(({day,consult,color,icon})=>(
              <div key={day} onClick={()=>setModal('sched_'+day)}
                onMouseEnter={()=>setHovSched(day)} onMouseLeave={()=>setHovSched(null)}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding: isMobile?'8px 10px':'10px 14px', borderRadius:10, cursor:'pointer',
                  border:`1.5px solid ${isToday(day)||hovSched===day?color:bdr}`,
                  background:isToday(day)?`${color}18`:hovSched===day?`${color}0d`:(dk?'#0d1f14':'#fafafa'),
                  transition:'all 0.15s', transform:hovSched===day?'translateX(3px)':'translateX(0)',
                }}>
                <span style={{fontSize:isMobile?14:18}}>{icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,fontWeight:800,color:isToday(day)||hovSched===day?color:txt2,textTransform:'uppercase',letterSpacing:0.5}}>{day}</div>
                  <div style={{fontSize:isMobile?11:12.5,fontWeight:600,color:txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{consult}</div>
                </div>
                {isToday(day)&&<span style={{background:color,color:'#fff',fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:20,textTransform:'uppercase',whiteSpace:'nowrap'}}>TODAY</span>}
                <ChevronRight size={12} color={hovSched===day?color:txt2}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MODALS ══ */}
      {modal==='today' && (
        <Modal title={`Today's Patients (${todayPatients.length})`} color={C.blue} onClose={()=>setModal(null)}>
          {todayPatients.length===0
            ? <p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No patients registered today yet.</p>
            : todayPatients.map(p=><PatientRow key={p.id} p={p} accent={C.blue} bg="#eff6ff" border="#bfdbfe"/>)}
        </Modal>
      )}
      {modal==='pending' && (
        <Modal title={`Pending Queue (${pendingList.length})`} color={C.orange} onClose={()=>setModal(null)}>
          {pendingList.length===0
            ? <p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No pending patients.</p>
            : pendingList.map((c,i)=>(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'#fff7ed',border:'1px solid #fed7aa',marginBottom:6}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:C.orange,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:11,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.patients?.last_name}, {c.patients?.first_name}</div>
                    <div style={{fontSize:11,color:'#6b7280'}}>Scheduled: {c.scheduled_time||'Walk-in'}</div>
                  </div>
                  <span style={{background:'#fed7aa',color:'#92400e',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>{c.priority||'Normal'}</span>
                </div>
              ))}
        </Modal>
      )}
      {modal?.startsWith('month_') && (
        <Modal title={`Patients in ${modal.replace('month_','')}`} color={C.green} onClose={()=>setModal(null)}>
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{fontSize:64,fontWeight:900,color:C.green,lineHeight:1}}>{MONTHLY_DATA.find(m=>m.month===modal.replace('month_',''))?.patients}</div>
            <p style={{color:'#6b7280',marginTop:8}}>Patients registered in {modal.replace('month_','')}</p>
          </div>
        </Modal>
      )}
      {modal?.startsWith('cat_') && (
        <Modal title={modal.replace('cat_','')+' Patients'} color={CATEGORY_DATA.find(c=>'cat_'+c.name===modal)?.color??C.green} onClose={()=>setModal(null)}>
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{fontSize:64,fontWeight:900,color:CATEGORY_DATA.find(c=>'cat_'+c.name===modal)?.color,lineHeight:1}}>{CATEGORY_DATA.find(c=>'cat_'+c.name===modal)?.value}%</div>
            <p style={{color:'#6b7280',marginTop:8}}>of total registered patients</p>
          </div>
        </Modal>
      )}
      {modal?.startsWith('sched_') && (()=>{
        const s = SCHEDULE.find(sc=>sc.day===modal.replace('sched_',''))!
        return s ? (
          <Modal title={s.day} color={s.color} onClose={()=>setModal(null)}>
            <div style={{textAlign:'center',padding:'16px 0'}}>
              <div style={{fontSize:44,marginBottom:10}}>{s.icon}</div>
              <div style={{fontSize:18,fontWeight:800,color:s.color,marginBottom:6}}>{s.consult}</div>
              <div style={{fontSize:13,color:'#6b7280',marginBottom:12}}>{s.day}s at RHU Lopez</div>
              {isToday(s.day)&&<div style={{background:`${s.color}18`,border:`1.5px solid ${s.color}`,borderRadius:10,padding:'10px 14px',fontSize:13,color:s.color,fontWeight:700}}>✅ Today is {s.day} — this consultation is ongoing</div>}
            </div>
          </Modal>
        ) : null
      })()}
      {modal?.startsWith('week_') && (()=>{
        const d = WEEKLY_DATA.find(w=>w.day===modal.replace('week_',''))
        return d ? (
          <Modal title={`${modal.replace('week_','')} Summary`} color={C.blue} onClose={()=>setModal(null)}>
            <div style={{display:'flex',gap:12,justifyContent:'center',padding:'16px 0',flexWrap:'wrap'}}>
              {[{label:'New Patients',value:d.new,color:C.blue},{label:'Returning',value:d.returning,color:C.purple}].map(item=>(
                <div key={item.label} style={{flex:1,minWidth:100,textAlign:'center',padding:'16px',background:`${item.color}10`,borderRadius:12,border:`1.5px solid ${item.color}33`}}>
                  <div style={{fontSize:44,fontWeight:900,color:item.color,lineHeight:1}}>{item.value}</div>
                  <div style={{fontSize:12,color:'#6b7280',marginTop:4}}>{item.label}</div>
                </div>
              ))}
            </div>
          </Modal>
        ) : null
      })()}
      {modal==='quick_male' && (
        <Modal title={`Male Patients (${quickLoading?'…':quickPatients.length})`} color={C.blue} onClose={()=>setModal(null)}>
          {quickLoading?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>Loading...</p>
            :quickPatients.length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No male patients found.</p>
            :quickPatients.map(p=><PatientRow key={p.id} p={p} accent={C.blue} bg="#eff6ff" border="#bfdbfe"/>)}
        </Modal>
      )}
      {modal==='quick_female' && (
        <Modal title={`Female Patients (${quickLoading?'…':quickPatients.length})`} color={C.pink} onClose={()=>setModal(null)}>
          {quickLoading?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>Loading...</p>
            :quickPatients.length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No female patients found.</p>
            :quickPatients.map(p=><PatientRow key={p.id} p={p} accent={C.pink} bg="#fdf2f8" border="#fbcfe8"/>)}
        </Modal>
      )}
      {modal==='quick_senior' && (
        <Modal title={`Senior Citizens 60+ (${quickLoading?'…':quickPatients.length})`} color={C.orange} onClose={()=>setModal(null)}>
          {quickLoading?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>Loading...</p>
            :quickPatients.length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No senior patients found.</p>
            :quickPatients.map(p=><PatientRow key={p.id} p={p} accent={C.orange} bg="#fff7ed" border="#fed7aa"/>)}
        </Modal>
      )}
      {modal==='quick_kids' && (
        <Modal title={`Kids — Under 18 (${quickLoading?'…':quickPatients.length})`} color={C.purple} onClose={()=>setModal(null)}>
          {quickLoading?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>Loading...</p>
            :quickPatients.length===0?<p style={{textAlign:'center',color:'#9ca3af',padding:'20px 0'}}>No patients under 18 found.</p>
            :(
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
                  {[
                    {label:'Infant (0–2)',  value:quickPatients.filter(p=>p.age<=2).length,            color:C.blue  },
                    {label:'Child (3–12)', value:quickPatients.filter(p=>p.age>=3&&p.age<=12).length, color:C.green },
                    {label:'Teen (13–17)', value:quickPatients.filter(p=>p.age>=13&&p.age<=17).length,color:C.purple},
                  ].map(g=>(
                    <div key={g.label} style={{background:`${g.color}10`,borderRadius:10,padding:'10px 8px',border:`1px solid ${g.color}33`,textAlign:'center'}}>
                      <div style={{fontSize:22,fontWeight:900,color:g.color}}>{g.value}</div>
                      <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>{g.label}</div>
                    </div>
                  ))}
                </div>
                {quickPatients.map(p=><PatientRow key={p.id} p={p} accent={C.purple} bg="#f5f3ff" border="#ddd6fe"/>)}
              </>
            )}
        </Modal>
      )}
    </main>
  )
}