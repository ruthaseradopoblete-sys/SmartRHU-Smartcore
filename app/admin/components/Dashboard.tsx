'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Users, FlaskConical, Package, Activity, UserPlus, FileBarChart,
  Database, Monitor, ChevronRight, TrendingUp, TrendingDown,
  AlertTriangle, Bell, ShieldAlert, Heart, Pill
} from 'lucide-react'

interface Props { darkMode: boolean; onNavigate: (menu: string) => void }

// ── Green palette ───────────────────────────────────────────────────────────
const G   = {
  darkest: '#0d3b0d',
  dark:    '#1a7a1a',
  mid:     '#2e7d32',
  base:    '#388e3c',
  light:   '#43a047',
  muted:   '#66bb6a',
  pale:    '#81c784',
  ghost:   '#c8e6c8',
  surface: '#e8f5e9',
  bg:      '#f1f8f1',
}

// Accent colors kept minimal for semantic use
const RED    = '#e53935'
const AMBER  = '#f9a825'
const BLUE   = '#1565c0'

function StatCard({ label, value, icon: Icon, color, sub, subAlert, trend, darkMode, onClick }: any) {
  const card   = darkMode ? '#0f2014' : '#fff'
  const border = darkMode ? '#1a4d1a' : G.ghost
  const txt    = darkMode ? '#c8e6c8' : G.darkest
  const txt2   = darkMode ? '#81c784' : G.dark
  const txt3   = darkMode ? '#388e3c' : G.muted
  return (
    <div
      onClick={onClick}
      style={{
        background: card,
        border: `1.5px solid ${border}`,
        borderRadius: 16,
        padding: '0',
        overflow: 'hidden',
        flex: 1, minWidth: 150,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 14px rgba(26,122,26,0.08)',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(26,122,26,0.18)' }}}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=darkMode?'0 4px 20px rgba(0,0,0,0.3)':'0 2px 14px rgba(26,122,26,0.08)' }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }}/>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: darkMode ? `${color}22` : G.surface,
          border: `1.5px solid ${darkMode ? color+'44' : G.ghost}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} color={color} strokeWidth={2}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: txt, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: txt2, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
          {sub && <div style={{ fontSize: 10, color: subAlert ? RED : txt3, marginTop: 2, fontWeight: subAlert ? 700 : 400 }}>{sub}</div>}
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 5, fontSize: 10, fontWeight: 700, color: trend.up ? G.dark : RED }}>
              {trend.up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {trend.val} vs last month
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ darkMode, onNavigate }: Props) {
  const dk = darkMode

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const pageBg   = dk ? '#0a150a' : G.bg
  const cardBg   = dk ? '#0f2014' : '#fff'
  const cardBdr  = dk ? '#1a4d1a' : G.ghost
  const txt      = dk ? '#c8e6c8' : G.darkest
  const txt2     = dk ? '#81c784' : G.dark
  const txt3     = dk ? '#388e3c' : G.muted
  const headerBg = dk
    ? 'linear-gradient(135deg,#0d3b0d,#1a4d1a)'
    : 'linear-gradient(135deg,#1a7a1a,#2e7d32)'

  const [stats,      setStats]      = useState({ users:0, patients:0, labs:0, inventory:0, consultations:0, prescriptions:0, lowStock:0, expiringSoon:0, patientsPrev:0, labsPrev:0, pendingLabs:0 })
  const [logs,       setLogs]       = useState<any[]>([])
  const [byRole,     setByRole]     = useState<Record<string,number>>({})
  const [bySex,      setBySex]      = useState({ M:0, F:0 })
  const [monthly,    setMonthly]    = useState<any[]>([])
  const [diseases,   setDiseases]   = useState<{name:string;count:number}[]>([])
  const [alerts,     setAlerts]     = useState<{msg:string;type:'warning'|'error'|'info'}[]>([])
  const [ageGroups,  setAgeGroups]  = useState<{label:string;count:number}[]>([])

  useEffect(() => {
    const now       = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth()-1, 1)
    const prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0)
    const fmt       = (d:Date) => d.toISOString().split('T')[0]

    const load = async () => {
      const [uRes, pRes, lRes, invRes, consRes, prescRes, pPrev, lPrev, pendLab] = await Promise.all([
        supabase.from('users').select('user_id',{count:'exact',head:true}),
        supabase.from('patients').select('id',{count:'exact',head:true}),
        supabase.from('laboratory_requests').select('id',{count:'exact',head:true}),
        supabase.from('pharma_medicines').select('id',{count:'exact',head:true}).eq('archived',false),
        supabase.from('soap_consultations').select('id',{count:'exact',head:true}),
        supabase.from('prescriptions').select('id',{count:'exact',head:true}),
        supabase.from('patients').select('id',{count:'exact',head:true}).gte('created_at',fmt(prevMonth)).lte('created_at',fmt(prevEnd)),
        supabase.from('laboratory_requests').select('id',{count:'exact',head:true}).gte('created_at',fmt(prevMonth)).lte('created_at',fmt(prevEnd)),
        supabase.from('laboratory_requests').select('id',{count:'exact',head:true}).eq('status','pending'),
      ])
      const today = fmt(now)
      const in90  = fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate()+90))
      const [lowRes, expRes] = await Promise.all([
        supabase.from('pharma_medicines').select('id',{count:'exact',head:true}).eq('archived',false).lte('quantity',10),
        supabase.from('pharma_medicines').select('id',{count:'exact',head:true}).eq('archived',false).gte('exp_date',today).lte('exp_date',in90),
      ])
      setStats({
        users:        uRes.count||0,   patients:      pRes.count||0,
        labs:         lRes.count||0,   inventory:     invRes.count||0,
        consultations:consRes.count||0,prescriptions: prescRes.count||0,
        lowStock:     lowRes.count||0, expiringSoon:  expRes.count||0,
        patientsPrev: pPrev.count||0,  labsPrev:      lPrev.count||0,
        pendingLabs:  pendLab.count||0,
      })
      const newAlerts: any[] = []
      if ((lowRes.count||0) > 0)  newAlerts.push({ msg:`${lowRes.count} medicine(s) low in stock`, type:'warning' })
      if ((expRes.count||0) > 0)  newAlerts.push({ msg:`${expRes.count} medicine(s) expiring within 90 days`, type:'warning' })
      if ((pendLab.count||0) > 0) newAlerts.push({ msg:`${pendLab.count} lab request(s) still pending`, type:'info' })
      const yd = new Date(Date.now()-24*60*60*1000).toISOString()
      const { count: failCount } = await supabase.from('audit_logs').select('id',{count:'exact',head:true}).eq('action','FAILED_LOGIN').gte('created_at',yd)
      if ((failCount||0) > 0) newAlerts.push({ msg:`${failCount} failed login attempt(s) in last 24 hrs`, type:'error' })
      setAlerts(newAlerts)

      const { data: pSex } = await supabase.from('patients').select('sex')
      if (pSex) { const m = pSex.filter((p:any)=>p.sex==='M').length; setBySex({ M:m, F:pSex.length-m }) }

      const { data: pAge } = await supabase.from('patients').select('age')
      if (pAge) {
        setAgeGroups([
          { label:'0–17',  count: pAge.filter((p:any)=>(p.age||0)<=17).length },
          { label:'18–35', count: pAge.filter((p:any)=>(p.age||0)>=18&&(p.age||0)<=35).length },
          { label:'36–60', count: pAge.filter((p:any)=>(p.age||0)>=36&&(p.age||0)<=60).length },
          { label:'60+',   count: pAge.filter((p:any)=>(p.age||0)>60).length },
        ])
      }

      const { data: uRole } = await supabase.from('users').select('role')
      if (uRole) {
        const counts: Record<string,number> = {}
        uRole.forEach((u:any)=>{ counts[u.role]=(counts[u.role]||0)+1 })
        setByRole(counts)
      }

      const { data: pmh } = await supabase.from('past_medical_history').select('*').limit(500)
      if (pmh) {
        const keys: [string,string][] = [
          ['hypertension','Hypertension'],['diabetes_mellitus','Diabetes'],['asthma','Asthma'],
          ['ptb','PTB'],['pneumonia','Pneumonia'],['cancer','Cancer'],['hepatitis','Hepatitis'],['coronary_artery_disease','Heart Disease'],
        ]
        setDiseases(keys.map(([k,l])=>({ name:l, count:pmh.filter((r:any)=>r[k]===true).length })).sort((a,b)=>b.count-a.count).slice(0,6))
      }

      const months: any[] = []
      for (let i=5; i>=0; i--) {
        const d    = new Date(now.getFullYear(), now.getMonth()-i, 1)
        const from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
        const to   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}`
        const [p,l,c] = await Promise.all([
          supabase.from('patients').select('id',{count:'exact',head:true}).gte('created_at',from).lte('created_at',to),
          supabase.from('laboratory_requests').select('id',{count:'exact',head:true}).gte('created_at',from).lte('created_at',to),
          supabase.from('soap_consultations').select('id',{count:'exact',head:true}).gte('created_at',from).lte('created_at',to),
        ])
        months.push({ month:d.toLocaleString('en',{month:'short'}), patients:p.count||0, labs:l.count||0, consults:c.count||0 })
      }
      setMonthly(months)
    }

    const loadLogs = async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(8)
      if (data) setLogs(data.map((l:any)=>({ id:l.id, user_name:l.user_name||'System', user_role:l.user_role||'—', action:l.action||'', module:l.module||'', description:l.description||'', timestamp:l.created_at||'', status:l.status||'success', ip:l.ip_address||'—' })))
      else setLogs([
        {id:'1',user_name:'Admin',user_role:'Admin',action:'LOGIN',module:'Auth',description:'Admin logged in',timestamp:new Date(Date.now()-60000).toISOString(),status:'success',ip:'192.168.1.1'},
        {id:'2',user_name:'Maria Santos',user_role:'Registrar',action:'REGISTER_PATIENT',module:'Patient Records',description:'Registered: Juan Dela Cruz',timestamp:new Date(Date.now()-300000).toISOString(),status:'success',ip:'192.168.1.3'},
        {id:'3',user_name:'Unknown',user_role:'—',action:'FAILED_LOGIN',module:'Auth',description:'Failed login attempt',timestamp:new Date(Date.now()-900000).toISOString(),status:'error',ip:'203.0.113.42'},
        {id:'4',user_name:'Med. Tech Cruz',user_role:'Medical Technologist',action:'UPLOAD_LAB',module:'Lab Records',description:'Uploaded CBC result',timestamp:new Date(Date.now()-1800000).toISOString(),status:'success',ip:'192.168.1.8'},
      ])
    }

    load(); loadLogs()
  }, [])

  const pTrend    = stats.patientsPrev > 0 ? `+${stats.patients - stats.patientsPrev}` : `${stats.patients}`
  const lTrend    = stats.labsPrev > 0 ? `+${stats.labs - stats.labsPrev}` : `${stats.labs}`
  const maxBar    = Math.max(...monthly.map(m=>Math.max(m.patients,m.labs,m.consults)),1)
  const maxDis    = Math.max(...diseases.map(d=>d.count),1)
  const maxAge    = Math.max(...ageGroups.map(a=>a.count),1)
  const maxRole   = Math.max(...Object.values(byRole),1)
  const sexTotal  = bySex.M + bySex.F || 1

  // Green shades for charts
  const GreenShades = ['#1a7a1a','#2e7d32','#388e3c','#43a047','#66bb6a','#81c784']

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* ── Topbar banner ─────────────────────────────────────────────── */}
      <div style={{ background:headerBg, borderRadius:16, padding:'16px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 20px rgba(26,122,26,0.25)' }}>
        <div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>
            SmartRHU · RHU Lopez, Quezon
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:0.5 }}>Admin Dashboard</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.65)', marginTop:3 }}>
            {new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:20, padding:'4px 14px', color:'#fff', fontSize:11, fontWeight:700 }}>🛡 Admin Panel</div>
          <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:14 }}>A</div>
        </div>
      </div>
      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize:10, fontWeight:800, letterSpacing:2, textTransform:'uppercase', color:txt2, marginBottom:8, paddingLeft:2 }}>Overview</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <StatCard label="Total Users"     value={stats.users}          icon={Users}       color={G.dark}   sub="All roles"                                       darkMode={dk} onClick={()=>onNavigate('User Management')}/>
          <StatCard label="Total Patients"  value={stats.patients}       icon={Activity}    color={G.mid}    sub="Registered"  trend={{val:pTrend,up:Number(pTrend)>=0}}  darkMode={dk} onClick={()=>onNavigate('Patient Records')}/>
          <StatCard label="Lab Requests"    value={stats.labs}           icon={FlaskConical} color={G.base}   sub={`${stats.pendingLabs} pending`}                  darkMode={dk} onClick={()=>onNavigate('Lab Records')}/>
          <StatCard label="Consultations"   value={stats.consultations}  icon={Heart}       color={G.light}  sub="Total SOAP notes"                                darkMode={dk}/>
          <StatCard label="Prescriptions"   value={stats.prescriptions}  icon={Pill}        color={G.muted}  sub="Total issued"                                    darkMode={dk}/>
          <StatCard label="Medicine Stock"  value={stats.inventory}      icon={Package}     color={G.pale}   sub={stats.lowStock>0?`⚠ ${stats.lowStock} low stock`:'All levels OK'} subAlert={stats.lowStock>0} darkMode={dk} onClick={()=>onNavigate('Inventory Records')}/>
        </div>
      </div>

      {/* ── Row 2: Monthly chart + Disease trends ─────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:14 }}>

        {/* Monthly bar chart */}
        <div style={{ background:cardBg, border:`1.5px solid ${cardBdr}`, borderRadius:16, padding:20, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:txt }}>Monthly Activity Trend</div>
              <div style={{ fontSize:11, color:txt3, marginTop:2 }}>Patients · Lab Requests · Consultations (last 6 months)</div>
            </div>
            <div style={{ background:G.surface, borderRadius:8, padding:'4px 10px', fontSize:10, fontWeight:700, color:G.dark }}>Live</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:120 }}>
            {monthly.map((m,i)=>(
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:100 }}>
                  <div style={{ flex:1, background:G.dark, borderRadius:'4px 4px 0 0', height:`${(m.patients/maxBar)*100}%`, minHeight:3 }} title={`Patients: ${m.patients}`}/>
                  <div style={{ flex:1, background:G.light, borderRadius:'4px 4px 0 0', height:`${(m.labs/maxBar)*100}%`, minHeight:3, opacity:0.9 }} title={`Labs: ${m.labs}`}/>
                  <div style={{ flex:1, background:G.pale, borderRadius:'4px 4px 0 0', height:`${(m.consults/maxBar)*100}%`, minHeight:3, opacity:0.85 }} title={`Consults: ${m.consults}`}/>
                </div>
                <div style={{ fontSize:9, color:txt3, fontWeight:700 }}>{m.month}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:12, paddingTop:10, borderTop:`1px solid ${cardBdr}` }}>
            {[{c:G.dark,l:'Patients'},{c:G.light,l:'Lab Requests'},{c:G.pale,l:'Consultations'}].map(s=>(
              <div key={s.l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:txt3 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:s.c }}/> {s.l}
              </div>
            ))}
          </div>
        </div>

        {/* Disease trends */}
        <div style={{ background:cardBg, border:`1.5px solid ${cardBdr}`, borderRadius:16, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:800, color:txt, marginBottom:2 }}>Top Disease Trends</div>
          <div style={{ fontSize:11, color:txt3, marginBottom:16 }}>Based on past medical history</div>
          <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
            {diseases.length === 0
              ? <div style={{ fontSize:12, color:txt3 }}>No data yet</div>
              : diseases.map((d,i)=>{
                const c = GreenShades[i % GreenShades.length]
                return (
                  <div key={d.name}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:txt, marginBottom:4 }}>
                      <span>{d.name}</span>
                      <span style={{ color:c, fontWeight:900 }}>{d.count}</span>
                    </div>
                    <div style={{ height:8, borderRadius:8, background:dk?'rgba(255,255,255,0.06)':G.surface, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(d.count/maxDis)*100}%`, background:c, borderRadius:8, transition:'width 0.6s' }}/>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>

      {/* ── Row 3: Sex donut + Age + Role ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>

        {/* Sex breakdown with SVG donut */}
        <div style={{ background:cardBg, border:`1.5px solid ${cardBdr}`, borderRadius:16, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:800, color:txt, marginBottom:2 }}>Patient by Sex</div>
          <div style={{ fontSize:11, color:txt3, marginBottom:14 }}>Gender distribution</div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {/* Donut SVG */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <svg width="90" height="90" viewBox="0 0 36 36" style={{ transform:'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={dk?'rgba(255,255,255,0.08)':G.surface} strokeWidth="5"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={G.dark} strokeWidth="5"
                  strokeDasharray={`${(bySex.F/sexTotal)*100} ${100-(bySex.F/sexTotal)*100}`} strokeLinecap="round"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={G.pale} strokeWidth="5"
                  strokeDasharray={`${(bySex.M/sexTotal)*100} ${100-(bySex.M/sexTotal)*100}`}
                  strokeDashoffset={`-${(bySex.F/sexTotal)*100}`} strokeLinecap="round"/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
                <div style={{ fontSize:14, fontWeight:900, color:txt }}>{bySex.F+bySex.M}</div>
                <div style={{ fontSize:8, color:txt3, fontWeight:700 }}>total</div>
              </div>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
              {[{l:'Female ♀',v:bySex.F,c:G.dark},{l:'Male ♂',v:bySex.M,c:G.pale}].map(s=>(
                <div key={s.l}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700, color:txt, marginBottom:4 }}>
                    <span>{s.l}</span><span style={{ color:s.c, fontWeight:900 }}>{s.v}</span>
                  </div>
                  <div style={{ height:7, borderRadius:6, background:dk?'rgba(255,255,255,0.06)':G.surface, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(s.v/sexTotal)*100}%`, background:s.c, borderRadius:6 }}/>
                  </div>
                  <div style={{ fontSize:10, color:txt3, marginTop:2, textAlign:'right' }}>{Math.round((s.v/sexTotal)*100)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Age groups */}
        <div style={{ background:cardBg, border:`1.5px solid ${cardBdr}`, borderRadius:16, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:800, color:txt, marginBottom:2 }}>Patient by Age Group</div>
          <div style={{ fontSize:11, color:txt3, marginBottom:14 }}>Age distribution</div>
          <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
            {ageGroups.map((a,i)=>{
              const c = GreenShades[i]
              return (
                <div key={a.label}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:txt, marginBottom:4 }}>
                    <span>{a.label}</span><span style={{ color:c, fontWeight:900 }}>{a.count}</span>
                  </div>
                  <div style={{ height:8, borderRadius:8, background:dk?'rgba(255,255,255,0.06)':G.surface, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(a.count/maxAge)*100}%`, background:c, borderRadius:8, transition:'width 0.6s' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>      
    </div>
  )
}