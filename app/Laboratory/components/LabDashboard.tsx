'use client'
import { useState, useEffect } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { fetchDashboardStats, fetchPendingRequests } from "./LabService"

const GREEN      = '#1a7a1a'
const DARK_GREEN = '#155a15'
const PIE_COLORS = ['#1a7a1a','#d46c10','#2255a8','#b8920a','#7c3aed']

const TEST_LABEL_MAP = {
  hgb_hct:'HGB/HCT', cbc_with_platelet:'CBC w/ Platelet',
  random_blood_sugar:'RBS', fasting_blood_sugar:'FBS',
  cholesterol:'Cholesterol', triglycerides:'Triglycerides',
  lipid_profile:'Lipid Profile', blood_uric_acid:'Uric Acid',
  urinalysis:'Urinalysis', fecalysis:'Fecalysis',
  dengue_ns1:'Dengue NS1', dengue_igg_igm:'Dengue IgG/IgM',
  hbsag:'HBsAg', pregnancy_test:'Pregnancy Test',
  abo_rh_blood_typing:'Blood Typing',
}

const TEST_ICONS = {
  Fecalysis:'💩', Urinalysis:'🧫', Hematology:'🩸',
  'Clinical Chemistry':'⚗️', Serology:'🔬', All:'🧪',
}
const TEST_FILTERS = ['All','Fecalysis','Urinalysis','Hematology','Clinical Chemistry','Serology']

/* ── Stat Card ── */
function StatCard({ label, value, sub, gradient, icon }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: gradient, borderRadius: 14, padding: '16px 18px', color: '#fff',
        position: 'relative', overflow: 'hidden',
        boxShadow: hov ? '0 12px 32px rgba(0,0,0,0.18)' : '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ position:'absolute', right:-14, top:-14, width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,0.1)' }}/>
      <div style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', fontSize:36, opacity:0.18 }}>{icon}</div>
      <div style={{ fontSize:10, opacity:0.85, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>{label}</div>
      <div style={{ fontSize:40, fontWeight:900, lineHeight:1.1, margin:'4px 0 2px' }}>{value}</div>
      <div style={{ fontSize:10, opacity:0.7 }}>{sub}</div>
    </div>
  )
}

/* ── Mini metric tile ── */
function MetricTile({ label, value, color, icon, darkMode }) {
  const cardBg = darkMode ? '#0f2014' : '#fff'
  const bdr    = darkMode ? '#1a3d24' : '#e5e7eb'
  return (
    <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:9, color:darkMode?'#3a6b48':'#9ca3af', textTransform:'uppercase', letterSpacing:0.7, fontWeight:700 }}>{label}</div>
        <div style={{ fontSize:20, fontWeight:900, color:color, lineHeight:1.2 }}>{value}</div>
      </div>
    </div>
  )
}

/* Props: darkMode, onOpenLabForm(request), onCancelRequest(request) */
export default function LabDashboard({ darkMode, onOpenLabForm, onCancelRequest }) {
  const [stats,      setStats]      = useState({ totalToday:0, totalPending:0, totalCompleted:0, barData:[], pieData:[] })
  const [pending,    setPending]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('All')
  const [selPatient, setSelPatient] = useState(null)

  const bg     = darkMode ? '#0d1a0f' : '#f0f4f1'
  const cardBg = darkMode ? '#0f2014' : '#ffffff'
  const sideBg = darkMode ? '#0a1a0d' : '#ffffff'
  const bdr    = darkMode ? '#1a3d24' : '#e5e7eb'
  const txt    = darkMode ? '#e2f5e9' : '#1f2937'
  const txt2   = darkMode ? '#6ee7b7' : '#6b7280'
  const muted  = darkMode ? '#3a6b48' : '#9ca3af'
  const pBg    = darkMode ? '#0d2010' : '#f0fdf4'
  const pBdr   = darkMode ? '#1a4a22' : '#bbf7d0'
  const subClr = darkMode ? '#86efac' : '#166534'

  const load = async () => {
    setLoading(true)
    const [s, p] = await Promise.all([fetchDashboardStats(), fetchPendingRequests()])
    setStats(s)
    setPending(p)
    setSelPatient(prev => p.find(x => x.id === prev?.id) || p[0] || null)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filteredPending = filter === 'All' ? pending : pending.filter(p => {
    if (filter === 'Fecalysis')          return p.tests?.fecalysis
    if (filter === 'Urinalysis')         return p.tests?.urinalysis
    if (filter === 'Hematology')         return p.tests?.hgb_hct || p.tests?.cbc_with_platelet
    if (filter === 'Clinical Chemistry') return p.tests?.random_blood_sugar || p.tests?.fasting_blood_sugar || p.tests?.cholesterol || p.tests?.triglycerides || p.tests?.lipid_profile || p.tests?.blood_uric_acid
    if (filter === 'Serology')           return p.tests?.hbsag || p.tests?.dengue_ns1 || p.tests?.dengue_igg_igm || p.tests?.pregnancy_test
    return true
  })

  const chemCount     = pending.filter(p => p.tests?.random_blood_sugar || p.tests?.fasting_blood_sugar || p.tests?.cholesterol || p.tests?.triglycerides || p.tests?.lipid_profile || p.tests?.blood_uric_acid).length
  const serologyCount = pending.filter(p => p.tests?.hbsag || p.tests?.dengue_ns1 || p.tests?.dengue_igg_igm || p.tests?.pregnancy_test || p.tests?.abo_rh_blood_typing).length

  return (
    <div style={{ display:'flex', minHeight:'100%', background:bg }}>

      {/* ══ LEFT / MAIN ══ */}
      <div style={{ flex:1, padding:'20px 18px 20px 22px', minWidth:0, overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:18 }}>
          <div>
            <div style={{ fontSize:11, color:txt2, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Laboratorian</div>
            <div style={{ fontSize:28, fontWeight:900, color:darkMode?'#4ade80':GREEN, letterSpacing:-0.5 }}>Dashboard</div>
            <div style={{ fontSize:11, color:txt2, marginTop:2 }}>
              {new Date().toLocaleDateString('en-PH',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </div>
          </div>
          <button onClick={load}
            style={{ background:GREEN, color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:12, fontWeight:700, cursor:'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background=DARK_GREEN}
            onMouseLeave={e => e.currentTarget.style.background=GREEN}>
            ↻ Refresh
          </button>
        </div>

        {/* 3 Stat Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
          <StatCard label="Today's Requests" icon="🧪"
            value={loading?'…':stats.totalToday}
            sub={`As of ${new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}`}
            gradient="linear-gradient(135deg,#1a7a1a,#0d9488)"/>
          <StatCard label="Pending Tests" icon="⏳"
            value={loading?'…':stats.totalPending}
            sub="Awaiting results"
            gradient="linear-gradient(135deg,#d97706,#b45309)"/>
          <StatCard label="Completed" icon="✅"
            value={loading?'…':stats.totalCompleted}
            sub="Results released today"
            gradient="linear-gradient(135deg,#2563eb,#7c3aed)"/>
        </div>

        {/* 5 Mini metric tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
          <MetricTile label="Hematology"         value={pending.filter(p=>p.tests?.hgb_hct||p.tests?.cbc_with_platelet).length} color="#7c3aed" icon="🩸" darkMode={darkMode}/>
          <MetricTile label="Urinalysis"         value={pending.filter(p=>p.tests?.urinalysis).length}                          color="#2563eb" icon="🧫" darkMode={darkMode}/>
          <MetricTile label="Fecalysis"          value={pending.filter(p=>p.tests?.fecalysis).length}                           color="#d97706" icon="💩" darkMode={darkMode}/>
          <MetricTile label="Clinical Chemistry" value={chemCount}                                                               color="#16a34a" icon="⚗️" darkMode={darkMode}/>
          <MetricTile label="Serology"           value={serologyCount}                                                           color="#dc2626" icon="🔬" darkMode={darkMode}/>
        </div>

        {/* Charts row — bar + pie */}
        <div style={{ display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:14 }}>

          {/* Bar chart */}
          <div style={{ background:cardBg, borderRadius:12, padding:'14px 16px', border:`1px solid ${bdr}` }}>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:800, color:darkMode?'#4ade80':GREEN }}>Monthly Lab Requests</div>
              <div style={{ fontSize:10, color:muted }}>12-month trend</div>
            </div>
            <ResponsiveContainer width="100%" height={155}>
              <BarChart data={stats.barData} barSize={13} margin={{ top:0, right:4, left:-28, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#1a3320':'#f3f4f6'}/>
                <XAxis dataKey="month" tick={{ fontSize:9, fill:muted }}/>
                <YAxis tick={{ fontSize:9, fill:muted }}/>
                <Tooltip contentStyle={{ fontSize:10, background:darkMode?'#0f2014':'#fff', border:`1px solid ${bdr}`, borderRadius:8, color:txt }} cursor={{ fill:'rgba(26,122,26,0.06)' }}/>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN}/><stop offset="100%" stopColor="#0d9488"/>
                  </linearGradient>
                </defs>
                <Bar dataKey="count" name="Requests" fill="url(#barGrad)" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div style={{ background:cardBg, borderRadius:12, padding:'14px 16px', border:`1px solid ${bdr}` }}>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:800, color:darkMode?'#4ade80':GREEN }}>Test Distribution</div>
              <div style={{ fontSize:10, color:muted }}>All-time by type</div>
            </div>
            {stats.pieData.length === 0
              ? <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', color:muted, fontSize:11 }}>No data yet</div>
              : <>
                  <ResponsiveContainer width="100%" height={110}>
                    <PieChart>
                      <Pie data={stats.pieData} innerRadius={32} outerRadius={48} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {stats.pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize:10, background:darkMode?'#0f2014':'#fff', border:`1px solid ${bdr}`, borderRadius:8 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:4 }}>
                    {stats.pieData.map((d,i) => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:10 }}>
                        <div style={{ width:7, height:7, borderRadius:2, background:PIE_COLORS[i%PIE_COLORS.length], flexShrink:0 }}/>
                        <span style={{ flex:1, color:txt2 }}>{d.name}</span>
                        <span style={{ fontWeight:800, color:PIE_COLORS[i%PIE_COLORS.length] }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
        </div>
      </div>

      {/* ══ RIGHT SIDEBAR — Pending Patients ══ */}
      <div style={{
        width:300, flexShrink:0, background:sideBg, borderLeft:`1px solid ${bdr}`,
        display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0, overflowY:'hidden',
      }}>

        {/* Sidebar header */}
        <div style={{ padding:'18px 16px 12px', borderBottom:`1px solid ${bdr}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:darkMode?'#4ade80':GREEN }}>Pending Patients</div>
              <div style={{ fontSize:10, color:muted, marginTop:1 }}>{filteredPending.length} awaiting lab test</div>
            </div>
            <div style={{ background:GREEN, color:'#fff', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:800 }}>
              {pending.length}
            </div>
          </div>
          {/* Filter pills */}
          <div style={{ display:'flex', gap:4, overflowX:'auto', paddingBottom:2 }}>
            {TEST_FILTERS.map(f => (
              <div key={f} onClick={() => setFilter(f)} style={{
                padding:'3px 8px', borderRadius:20, fontSize:9, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap', flexShrink:0,
                background: filter===f ? GREEN : (darkMode?'#1a3d24':'#f0fdf4'),
                color: filter===f ? '#fff' : (darkMode?'#86efac':GREEN),
                border:`1px solid ${filter===f?GREEN:(darkMode?'#1a3d24':'#bbf7d0')}`,
                transition:'all 0.1s',
              }}>
                {TEST_ICONS[f]} {f}
              </div>
            ))}
          </div>
        </div>

        {/* Patient list */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>
          {loading ? (
            <div style={{ padding:24, textAlign:'center', color:muted, fontSize:12 }}>Loading…</div>
          ) : filteredPending.length === 0 ? (
            <div style={{ padding:24, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🎉</div>
              <div style={{ fontSize:12, color:muted }}>No pending requests!</div>
            </div>
          ) : filteredPending.map(p => {
            const isSel = selPatient?.id === p.id
            return (
              <div key={p.id} onClick={() => setSelPatient(isSel ? null : p)}
                style={{
                  background: isSel ? (darkMode?'#1a3d22':'#dcfce7') : pBg,
                  border:`1.5px solid ${isSel?GREEN:pBdr}`,
                  borderRadius:10, padding:'10px 12px', marginBottom:8,
                  cursor:'pointer', transition:'all 0.15s',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.borderColor=GREEN }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.borderColor=pBdr }}>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:subClr, flex:1, marginRight:6, lineHeight:1.3 }}>{p.name}</div>
                  <div style={{ fontSize:9, color:muted, flexShrink:0 }}>
                    {new Date(p.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}
                  </div>
                </div>
                <div style={{ fontSize:10, color:txt2, marginBottom:5 }}>
                  {[p.age?p.age+' yrs':null, p.gender, p.address].filter(Boolean).join(' · ')}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:isSel?8:0 }}>
                  {p.tests && Object.entries(p.tests).filter(([,v])=>v).map(([k]) => (
                    <span key={k} style={{ fontSize:9, fontWeight:700, borderRadius:10, padding:'1px 6px', background:darkMode?'#1a4a22':'#dcfce7', color:subClr }}>
                      {TEST_LABEL_MAP[k]||k}
                    </span>
                  ))}
                </div>

                {/* Action buttons — expand on select */}
                {isSel && (
                  <div style={{ display:'flex', gap:6, marginTop:6, borderTop:`1px solid ${GREEN}30`, paddingTop:8 }}>
                    <button onClick={e => { e.stopPropagation(); onOpenLabForm(p) }}
                      style={{ flex:1, background:GREEN, color:'#fff', border:'none', borderRadius:7, padding:'7px 0', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}
                      onMouseEnter={e => e.currentTarget.style.background=DARK_GREEN}
                      onMouseLeave={e => e.currentTarget.style.background=GREEN}>
                      🧪 Test Patient
                    </button>
                    <button onClick={e => { e.stopPropagation(); onCancelRequest && onCancelRequest(p) }}
                      style={{ flex:1, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:7, padding:'7px 0', fontSize:11, fontWeight:700, cursor:'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background='#fee2e2'}
                      onMouseLeave={e => e.currentTarget.style.background='#fef2f2'}>
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px', borderTop:`1px solid ${bdr}`, flexShrink:0 }}>
          {selPatient ? (
            <div>
              <div style={{ fontSize:10, color:muted, marginBottom:6, textAlign:'center' }}>
                Selected: <strong style={{ color:subClr }}>{selPatient.name}</strong>
              </div>
              <button onClick={() => onOpenLabForm(selPatient)}
                style={{ width:'100%', background:`linear-gradient(135deg,${GREEN},#0d9488)`, color:'#fff', border:'none', borderRadius:8, padding:'10px', fontSize:12, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                🧪 Start Testing
              </button>
            </div>
          ) : (
            <div style={{ fontSize:11, color:muted, textAlign:'center', padding:'4px 0' }}>
              Select a patient to begin testing
            </div>
          )}
        </div>
      </div>
    </div>
  )
}