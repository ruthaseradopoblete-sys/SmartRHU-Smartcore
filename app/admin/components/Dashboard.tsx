'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, FlaskConical, Package, Activity, UserPlus, FileBarChart, Database, Monitor, ChevronRight, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface Props { darkMode: boolean; onNavigate: (menu: string) => void }

const G = '#1a7a1a'

function StatCard({ label, value, icon: Icon, color, sub, trend, darkMode }:
  { label:string; value:string|number; icon:React.ElementType; color:string; sub?:string; trend?:{val:string;up:boolean}; darkMode:boolean }) {
  const card = darkMode?'rgba(10,26,13,0.9)':'#fff'
  const bdr  = darkMode?'rgba(77,184,106,0.12)':'rgba(26,122,26,0.1)'
  const txt  = darkMode?'#d1fae5':'#0d2e0d'
  const txt2 = darkMode?'#4db86a':'#1a7a1a'
  const txt3 = darkMode?'#3a6b48':'#86efac'
  return (
    <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:16, padding:'18px 20px',
      boxShadow:darkMode?'0 4px 24px rgba(0,0,0,0.3)':'0 2px 16px rgba(26,122,26,0.06)',
      display:'flex', alignItems:'center', gap:16, flex:1, minWidth:160 }}>
      <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${color}22,${color}44)`, border:`1px solid ${color}33`,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={22} color={color} strokeWidth={2}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:26, fontWeight:800, color:txt, lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:11, fontWeight:600, color:txt2, marginTop:4 }}>{label}</div>
        {sub && <div style={{ fontSize:10, color:txt3, marginTop:2 }}>{sub}</div>}
        {trend && (
          <div style={{ display:'flex', alignItems:'center', gap:3, marginTop:4, fontSize:10, fontWeight:700, color:trend.up?'#059669':'#dc2626' }}>
            {trend.up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {trend.val} this month
          </div>
        )}
      </div>
    </div>
  )
}

interface SystemLog {
  id:string; user_name:string; user_role:string; action:string; module:string; description?:string
  timestamp:string; status:'success'|'warning'|'error'; ip_address:string
}

export default function Dashboard({ darkMode, onNavigate }: Props) {
  const dk   = darkMode
  const bg   = dk?'#0d1a0f':'#f0f4f1'
  const card = dk?'rgba(10,26,13,0.9)':'#fff'
  const bdr  = dk?'rgba(77,184,106,0.12)':'rgba(26,122,26,0.1)'
  const txt  = dk?'#d1fae5':'#0d2e0d'
  const txt2 = dk?'#4db86a':'#1a7a1a'
  const txt3 = dk?'#3a6b48':'#6b7280'

  const [stats,   setStats]   = useState({ users:0, patients:0, labs:0, inventory:0, patientsPrev:0, labsPrev:0 })
  const [logs,    setLogs]    = useState<SystemLog[]>([])
  const [alerts,  setAlerts]  = useState<string[]>([])
  const [byRole,  setByRole]  = useState<Record<string,number>>({})
  const [bySex,   setBySex]   = useState({ M:0, F:0 })
  const [monthly, setMonthly] = useState<{month:string;patients:number;labs:number}[]>([])

  useEffect(() => {
    const now = new Date()
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const prevMonth = new Date(now.getFullYear(), now.getMonth()-1, 1)
    const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}-01`
    const prevMonthEnd   = `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}-${new Date(now.getFullYear(),now.getMonth(),0).getDate()}`

    const load = async () => {
      const [uRes, pRes, lRes, iRes, pPrev, lPrev, pSex, uRole] = await Promise.all([
        supabase.from('users').select('user_id',{count:'exact',head:true}),
        supabase.from('patients').select('id',{count:'exact',head:true}),
        supabase.from('lab_requests').select('id',{count:'exact',head:true}),
        supabase.from('inventory').select('id',{count:'exact',head:true}),
        supabase.from('patients').select('id',{count:'exact',head:true}).gte('created_at',prevMonthStart).lte('created_at',prevMonthEnd),
        supabase.from('lab_requests').select('id',{count:'exact',head:true}).gte('created_at',prevMonthStart).lte('created_at',prevMonthEnd),
        supabase.from('patients').select('sex'),
        supabase.from('users').select('role'),
      ])
      setStats({ users:uRes.count||0, patients:pRes.count||0, labs:lRes.count||0, inventory:iRes.count||0, patientsPrev:pPrev.count||0, labsPrev:lPrev.count||0 })

      // Sex breakdown
      if (pSex.data) {
        const m = pSex.data.filter((p:any)=>p.sex==='M').length
        setBySex({ M:m, F:pSex.data.length-m })
      }

      // Role breakdown
      if (uRole.data) {
        const counts: Record<string,number> = {}
        uRole.data.forEach((u:any)=>{ counts[u.role]=(counts[u.role]||0)+1 })
        setByRole(counts)
      }

      // Monthly trend (last 6 months)
      const months: {month:string;patients:number;labs:number}[] = []
      for (let i=5;i>=0;i--) {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
        const from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
        const to   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}`
        const [p,l] = await Promise.all([
          supabase.from('patients').select('id',{count:'exact',head:true}).gte('created_at',from).lte('created_at',to),
          supabase.from('lab_requests').select('id',{count:'exact',head:true}).gte('created_at',from).lte('created_at',to),
        ])
        months.push({ month:d.toLocaleString('en',{month:'short'}), patients:p.count||0, labs:l.count||0 })
      }
      setMonthly(months)

      // Check alerts
      const newAlerts: string[] = []
      const { data: lowStock } = await supabase.from('inventory').select('id',{count:'exact',head:true}).lte('quantity',10)
      if ((lowStock as any)?.count > 0) newAlerts.push(`${(lowStock as any).count} medicines are low in stock`)
      const { data: pendingLabs } = await supabase.from('lab_requests').select('id',{count:'exact',head:true}).neq('status','completed')
      if ((pendingLabs as any)?.count > 0) newAlerts.push(`${(pendingLabs as any).count} lab requests pending`)
      setAlerts(newAlerts)
    }

    const loadLogs = async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(6)
      if (data) {
        setLogs(data.map((l:any)=>({ id:l.id, user_name:l.user_name||'System', user_role:l.user_role||'—', action:l.action||'', module:l.module||'', description:l.description||'', timestamp:l.created_at||'', status:l.status||'success', ip_address:l.ip_address||'—' })))
      } else {
        setLogs([
          {id:'1',user_name:'Admin',user_role:'Admin',action:'LOGIN',module:'Auth',description:'Admin logged in',timestamp:new Date(Date.now()-60000).toISOString(),status:'success',ip_address:'192.168.1.1'},
          {id:'2',user_name:'Maria Santos',user_role:'Registrar',action:'REGISTER_PATIENT',module:'Patient Records',description:'Registered: Juan Dela Cruz',timestamp:new Date(Date.now()-300000).toISOString(),status:'success',ip_address:'192.168.1.3'},
          {id:'3',user_name:'Dr. Reyes',user_role:'Doctor',action:'LOGIN',module:'Auth',description:'Doctor logged in',timestamp:new Date(Date.now()-600000).toISOString(),status:'success',ip_address:'192.168.1.5'},
          {id:'4',user_name:'Unknown',user_role:'—',action:'FAILED_LOGIN',module:'Auth',description:'Failed login attempt',timestamp:new Date(Date.now()-900000).toISOString(),status:'error',ip_address:'203.0.113.42'},
          {id:'5',user_name:'Med. Tech Cruz',user_role:'Medical Technologist',action:'UPLOAD_LAB',module:'Lab Records',description:'Uploaded CBC result',timestamp:new Date(Date.now()-1800000).toISOString(),status:'success',ip_address:'192.168.1.8'},
          {id:'6',user_name:'System',user_role:'System',action:'BACKUP',module:'Backup',description:'Auto backup (12.4MB)',timestamp:new Date(Date.now()-3600000).toISOString(),status:'success',ip_address:'localhost'},
        ])
      }
    }

    load(); loadLogs()
  }, [])

  const pTrend = stats.patientsPrev > 0 ? `+${stats.patients - stats.patientsPrev}` : `${stats.patients}`
  const lTrend = stats.labsPrev > 0 ? `+${stats.labs - stats.labsPrev}` : `${stats.labs}`
  const maxBar = Math.max(...monthly.map(m=>Math.max(m.patients,m.labs)), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:14, padding:'12px 16px', display:'flex', gap:10, alignItems:'flex-start' }}>
          <AlertTriangle size={16} color="#d97706" style={{ flexShrink:0, marginTop:1 }}/>
          <div>
            <div style={{ fontWeight:700, fontSize:12, color:'#92400e', marginBottom:4 }}>System Alerts</div>
            {alerts.map((a,i)=><div key={i} style={{ fontSize:12, color:'#92400e' }}>• {a}</div>)}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
        <StatCard label="Total Users"     value={stats.users}     icon={Users}        color="#7c3aed"  sub="All roles"          darkMode={dk}/>
        <StatCard label="Total Patients"  value={stats.patients}  icon={Activity}     color={G}        sub="Registered"         trend={{val:pTrend, up:Number(pTrend)>=0}} darkMode={dk}/>
        <StatCard label="Lab Records"     value={stats.labs}      icon={FlaskConical} color="#0891b2"  sub="All requests"        trend={{val:lTrend, up:Number(lTrend)>=0}} darkMode={dk}/>
        <StatCard label="Inventory Items" value={stats.inventory} icon={Package}      color="#d97706"  sub="Medicines & stock"   darkMode={dk}/>
      </div>

      {/* Middle row: Monthly trend + Sex breakdown + Role breakdown */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14 }}>

        {/* Monthly trend bar chart */}
        <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:16, padding:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:txt, marginBottom:4 }}>Monthly Trend</div>
          <div style={{ fontSize:11, color:txt3, marginBottom:16 }}>Patients & Lab Requests (last 6 months)</div>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:100 }}>
            {monthly.map((m,i)=>(
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:80 }}>
                  <div style={{ flex:1, background:G, borderRadius:'3px 3px 0 0', opacity:0.85,
                    height:`${(m.patients/maxBar)*100}%`, minHeight:2, transition:'height 0.5s' }}
                    title={`Patients: ${m.patients}`}/>
                  <div style={{ flex:1, background:'#0891b2', borderRadius:'3px 3px 0 0', opacity:0.85,
                    height:`${(m.labs/maxBar)*100}%`, minHeight:2, transition:'height 0.5s' }}
                    title={`Labs: ${m.labs}`}/>
                </div>
                <div style={{ fontSize:9, color:txt3, fontWeight:700 }}>{m.month}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:txt3 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:G }}/> Patients
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:txt3 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:'#0891b2' }}/> Lab Requests
            </div>
          </div>
        </div>

        {/* Sex breakdown */}
        <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:16, padding:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:txt, marginBottom:4 }}>Patient by Sex</div>
          <div style={{ fontSize:11, color:txt3, marginBottom:16 }}>Gender distribution</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[{l:'Female ♀',v:bySex.F,c:'#db2777'},{l:'Male ♂',v:bySex.M,c:'#2563eb'}].map(s=>{
              const total = bySex.F+bySex.M||1
              return (
                <div key={s.l}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:600, color:txt, marginBottom:4 }}>
                    <span>{s.l}</span><span>{s.v}</span>
                  </div>
                  <div style={{ height:10, borderRadius:10, background:dk?'rgba(255,255,255,0.08)':'#f0f0f0', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(s.v/total)*100}%`, background:s.c, borderRadius:10, transition:'width 0.6s' }}/>
                  </div>
                  <div style={{ fontSize:10, color:txt3, marginTop:2, textAlign:'right' }}>{Math.round((s.v/total)*100)}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Role breakdown */}
        <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:16, padding:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:txt, marginBottom:4 }}>Users by Role</div>
          <div style={{ fontSize:11, color:txt3, marginBottom:12 }}>Staff distribution</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {Object.entries(byRole).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([role,count])=>{
              const colors: Record<string,string> = { Admin:'#7c3aed', Doctor:'#059669', Nurse:'#db2777', Registrar:'#d97706', Pharmacist:'#2563eb', 'Warehouse Staff':'#b45309', 'Medical Technologist':'#0891b2' }
              const c = colors[role]||'#6b7280'
              const maxCount = Math.max(...Object.values(byRole),1)
              return (
                <div key={role} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:c, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:txt, marginBottom:2 }}>
                      <span style={{ fontWeight:600 }}>{role.split(' ')[0]}</span><span style={{ fontWeight:800 }}>{count}</span>
                    </div>
                    <div style={{ height:5, borderRadius:5, background:dk?'rgba(255,255,255,0.08)':'#f0f0f0', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(count/maxCount)*100}%`, background:c, borderRadius:5 }}/>
                    </div>
                  </div>
                </div>
              )
            })}
            {Object.keys(byRole).length === 0 && <div style={{ fontSize:11, color:txt3 }}>No user data yet</div>}
          </div>
        </div>
      </div>

      {/* Bottom row: Activity log + Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>

        {/* Recent Activity */}
        <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${bdr}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:800, fontSize:14, color:txt }}>Recent System Activity</span>
            <button onClick={()=>onNavigate('System Activities')}
              style={{ background:'none', border:'none', cursor:'pointer', color:txt2, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
              View all <ChevronRight size={13}/>
            </button>
          </div>
          {logs.map(log=>(
            <div key={log.id} style={{ padding:'10px 18px', borderBottom:`1px solid ${bdr}`, display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, marginTop:4,
                background:log.status==='success'?'#22c55e':log.status==='error'?'#ef4444':'#f59e0b' }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:txt, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  <span style={{ color:txt2 }}>{log.user_name}</span> ({log.user_role}) — {log.description||log.action}
                </div>
                <div style={{ fontSize:10, color:txt3, marginTop:2 }}>
                  {log.module} · {new Date(log.timestamp).toLocaleString('en-PH',{hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}
                </div>
              </div>
              <span style={{ fontSize:10, color:txt3, flexShrink:0, fontFamily:'monospace' }}>{log.ip_address}</span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:4 }}>Quick Actions</div>
          {[
            {l:'Add New User',      icon:UserPlus,    fn:()=>onNavigate('User Management'), c:'#7c3aed'},
            {l:'View All Patients', icon:Users,       fn:()=>onNavigate('Patient Records'), c:G},
            {l:'View Lab Records',  icon:FlaskConical,fn:()=>onNavigate('Lab Records'),     c:'#0891b2'},
            {l:'Generate Report',   icon:FileBarChart,fn:()=>onNavigate('Generate Report'), c:'#d97706'},
            {l:'Backup System',     icon:Database,    fn:()=>onNavigate('Backup & Restore'),c:'#7c3aed'},
            {l:'System Monitor',    icon:Monitor,     fn:()=>onNavigate('System Activities'),c:'#db2777'},
          ].map((qa,i)=>(
            <button key={i} onClick={qa.fn}
              style={{ background:card, border:`1px solid ${bdr}`, borderRadius:12, padding:'10px 14px',
                display:'flex', alignItems:'center', gap:10, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=qa.c+'66';e.currentTarget.style.transform='translateX(2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=bdr;e.currentTarget.style.transform='translateX(0)'}}>
              <div style={{ width:28, height:28, borderRadius:8, background:`${qa.c}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <qa.icon size={13} color={qa.c} strokeWidth={2}/>
              </div>
              <span style={{ fontSize:12, fontWeight:600, color:txt, flex:1 }}>{qa.l}</span>
              <ChevronRight size={12} color={txt3}/>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}