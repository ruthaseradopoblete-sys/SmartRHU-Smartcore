'use client'
import { useState, useEffect } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts"
import { fetchDashboardStats, fetchPendingRequests } from "./labService"

/* ── Design tokens ── */
const G  = '#15803d'
const G2 = '#0d9488'
const G3 = '#166534'
const G4 = '#14532d'
const G5 = '#22c55e'

const PIE_COLORS = ['#15803d','#0d9488','#166534','#4ade80','#86efac']

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
  Fecalysis:'', Urinalysis:'', Hematology:'',
  'Clinical Chemistry':'', Serology:'', All:'',
}
const TEST_FILTERS = ['All','Fecalysis','Urinalysis','Hematology','Clinical Chemistry','Serology']

/* ── Inject global styles ── */
const injectStyles = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById('ld-styles')) return
  const s = document.createElement('style')
  s.id = 'ld-styles'
  s.textContent = `
    .ld-spin { animation: ld-rotate 0.7s linear infinite; }
    @keyframes ld-rotate { to { transform: rotate(360deg); } }
    .ld-hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .ld-hover-lift:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(21,128,61,0.15) !important; }
    .ld-hover-row { transition: background 0.15s ease, transform 0.15s ease; cursor: pointer; }
    .ld-hover-row:hover { background: rgba(21,128,61,0.06) !important; transform: translateX(3px); }
    .ld-pill { transition: all 0.12s ease; cursor: pointer; }
    .ld-pill:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .ld-btn { transition: all 0.15s ease; }
    .ld-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .ld-pulse { animation: ld-pulse-anim 2s ease-in-out infinite; }
    @keyframes ld-pulse-anim {
      0%,100% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
      50%      { opacity: 1;   box-shadow: 0 0 0 6px rgba(34,197,94,0); }
    }
    @media (max-width: 1024px) {
      .ld-grid-3 { grid-template-columns: 1fr 1fr !important; }
      .ld-grid-charts { grid-template-columns: 1fr !important; }
      .ld-grid-5 { grid-template-columns: repeat(3, 1fr) !important; }
    }
    @media (max-width: 640px) {
      .ld-grid-3 { grid-template-columns: 1fr !important; }
      .ld-grid-5 { grid-template-columns: repeat(2, 1fr) !important; }
      .ld-side { display: none !important; }
      .ld-main-pad { padding: 14px !important; }
    }
  `
  document.head.appendChild(s)
}
if (typeof window !== 'undefined') injectStyles()

/* ── useBreakpoint ── */
function useBreakpoint() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return { isMobile: w < 640, isTablet: w < 1024, w }
}

/* ── Stat Card ── */
function StatCard({ label, value, sub, gradient, icon }) {
  return (
    <div className="ld-hover-lift" style={{
      background: gradient, borderRadius: 18, padding: '20px 22px', color: '#fff',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    }}>
      <div style={{ position:'absolute', right:-18, top:-18, width:88, height:88, borderRadius:'50%', background:'rgba(255,255,255,0.09)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', fontSize:40, opacity:0.14, pointerEvents:'none' }}>{icon}</div>
      <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:1.1, opacity:0.82, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:44, fontWeight:900, lineHeight:1, marginBottom:4, letterSpacing:'-1px' }}>{value}</div>
      <div style={{ fontSize:10, opacity:0.65 }}>{sub}</div>
    </div>
  )
}

/* ── Metric Tile ── */
function MetricTile({ label, value, color, icon, darkMode, sub }) {
  const cardBg = darkMode ? '#0f2014' : '#fff'
  const bdr    = darkMode ? '#1a3d24' : '#e5e7eb'
  const muted  = darkMode ? '#3a6b48' : '#9ca3af'
  return (
    <div className="ld-hover-lift" style={{
      background: cardBg, border: `1px solid ${bdr}`, borderRadius: 14,
      padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 11,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ width:40, height:40, borderRadius:12, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, border:`1px solid ${color}22` }}>
        {icon}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:9, color:muted, textTransform:'uppercase', letterSpacing:0.8, fontWeight:700, marginBottom:1 }}>{label}</div>
        <div style={{ fontSize:24, fontWeight:900, color, lineHeight:1.1 }}>{value}</div>
        {sub && <div style={{ fontSize:9, color:muted, marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ── Section heading ── */
function SH({ children, darkMode }) {
  const muted = darkMode ? '#3a6b48' : '#9ca3af'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, marginTop:4 }}>
      <div style={{ width:3, height:14, borderRadius:2, background:`linear-gradient(180deg,${G},${G2})`, flexShrink:0 }}/>
      <div style={{ fontSize:10, fontWeight:700, color:muted, textTransform:'uppercase', letterSpacing:1.3 }}>{children}</div>
    </div>
  )
}

/* ── Custom Tooltip ── */
function ChartTooltip({ active, payload, label, darkMode, bdr, txt }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:darkMode?'#0f2014':'#fff', border:`1px solid ${bdr}`, borderRadius:10, padding:'8px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.1)', fontSize:12 }}>
      <div style={{ fontWeight:700, color:txt, marginBottom:2 }}>{label}</div>
      <div style={{ fontWeight:800, color:G }}>{payload[0].value} requests</div>
    </div>
  )
}

/* ════════════════════════
   MAIN COMPONENT
════════════════════════ */
export default function LabDashboard({ darkMode, onOpenLabForm, onCancelRequest }) {
  const [stats,      setStats]      = useState({ totalToday:0, totalPending:0, totalCompleted:0, barData:[], pieData:[] })
  const [pending,    setPending]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [spinning,   setSpinning]   = useState(false)
  const [filter,     setFilter]     = useState('All')
  const [selPatient, setSelPatient] = useState(null)
  const [ptSearch,   setPtSearch]   = useState('')

  const { isMobile, isTablet } = useBreakpoint()

  /* theme */
  const bg     = darkMode ? '#0d1a0f' : '#f0fdf4'
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
    setSpinning(true); setLoading(true)
    const [s, p] = await Promise.all([fetchDashboardStats(), fetchPendingRequests()])
    setStats(s); setPending(p)
    setSelPatient(prev => p.find(x => x.id === prev?.id) || p[0] || null)
    setLoading(false)
    setTimeout(() => setSpinning(false), 700)
  }
  useEffect(() => { load() }, [])

  const filteredPending = pending
    .filter(p => {
      if (filter === 'Fecalysis')          return p.tests?.fecalysis
      if (filter === 'Urinalysis')         return p.tests?.urinalysis
      if (filter === 'Hematology')         return p.tests?.hgb_hct || p.tests?.cbc_with_platelet
      if (filter === 'Clinical Chemistry') return p.tests?.random_blood_sugar || p.tests?.fasting_blood_sugar || p.tests?.cholesterol || p.tests?.triglycerides || p.tests?.lipid_profile || p.tests?.blood_uric_acid
      if (filter === 'Serology')           return p.tests?.hbsag || p.tests?.dengue_ns1 || p.tests?.dengue_igg_igm || p.tests?.pregnancy_test
      return true
    })
    .filter(p => !ptSearch || (p.name||'').toLowerCase().includes(ptSearch.toLowerCase()))

  const chemCount     = pending.filter(p => p.tests?.random_blood_sugar || p.tests?.fasting_blood_sugar || p.tests?.cholesterol || p.tests?.triglycerides || p.tests?.lipid_profile || p.tests?.blood_uric_acid).length
  const serologyCount = pending.filter(p => p.tests?.hbsag || p.tests?.dengue_ns1 || p.tests?.dengue_igg_igm || p.tests?.pregnancy_test || p.tests?.abo_rh_blood_typing).length
  const completionRate = stats.totalToday > 0 ? Math.round((stats.totalCompleted / stats.totalToday) * 100) : 0

  return (
    <div style={{ display:'flex', minHeight:'100%', background:bg }}>

      {/* ══ MAIN ══ */}
      <div className="ld-main-pad" style={{ flex:1, padding: isMobile ? 14 : isTablet ? 18 : '22px 20px 22px 26px', minWidth:0, overflowY:'auto' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems: isMobile?'center':'flex-end', marginBottom: isMobile?18:24, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:10, color:txt2, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:3 }}>Laboratorian</div>
            <div style={{ fontSize: isMobile?24:32, fontWeight:900, color:darkMode?'#4ade80':G, letterSpacing:'-0.5px', lineHeight:1 }}>Dashboard</div>
            {!isMobile && (
              <div style={{ fontSize:11, color:txt2, marginTop:5, display:'flex', alignItems:'center', gap:6 }}>
                <span className="ld-pulse" style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#22c55e', flexShrink:0 }}/>
                {new Date().toLocaleDateString('en-PH',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
              </div>
            )}
          </div>
          <button className="ld-btn"
            onClick={load}
            style={{ background:G, color:'#fff', border:'none', borderRadius:10, padding: isMobile?'8px 14px':'9px 20px', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7, boxShadow:'0 3px 12px rgba(21,128,61,0.28)' }}>
            <svg className={spinning ? 'ld-spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 9"/>
              <path d="M21 3v6h-6"/>
              <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64L3 15"/>
              <path d="M3 21v-6h6"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <SH darkMode={darkMode}>Overview</SH>
        <div className="ld-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: isMobile?10:14, marginBottom: isMobile?14:20 }}>
          <StatCard label="Today's Requests" icon="🧪"
            value={loading ? '—' : stats.totalToday}
            sub={`As of ${new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}`}
            gradient={`linear-gradient(135deg,${G4},${G})`}/>
          <StatCard label="Pending Tests" icon="⏳"
            value={loading ? '—' : stats.totalPending}
            sub="Awaiting results"
            gradient={`linear-gradient(135deg,${G3},${G2})`}/>
          <StatCard label="Completed Today" icon="✅"
            value={loading ? '—' : stats.totalCompleted}
            sub={`${completionRate}% completion rate`}
            gradient={`linear-gradient(135deg,${G},#365314)`}/>
        </div>

        {/* ── Metric Tiles ── */}
        <SH darkMode={darkMode}>Pending by Test Type</SH>
        <div className="ld-grid-5" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap: isMobile?8:12, marginBottom: isMobile?18:24 }}>
          <MetricTile label="Hematology"    icon="🩸" color={G}       darkMode={darkMode} sub="blood count"  value={pending.filter(p=>p.tests?.hgb_hct||p.tests?.cbc_with_platelet).length}/>
          <MetricTile label="Urinalysis"    icon="🧫" color={G2}      darkMode={darkMode} sub="urine test"   value={pending.filter(p=>p.tests?.urinalysis).length}/>
          <MetricTile label="Fecalysis"     icon="💩" color={G3}      darkMode={darkMode} sub="stool test"   value={pending.filter(p=>p.tests?.fecalysis).length}/>
          <MetricTile label="Clin. Chem"    icon="⚗️" color={G4}      darkMode={darkMode} sub="chemistry"    value={chemCount}/>
          <MetricTile label="Serology"      icon="🔬" color="#365314"  darkMode={darkMode} sub="immunology"   value={serologyCount}/>
        </div>

        {/* ── Charts ── */}
        <SH darkMode={darkMode}>Analytics</SH>
        <div className="ld-grid-charts" style={{ display:'grid', gridTemplateColumns: isTablet ? '1fr' : '1.6fr 1fr', gap: isMobile?12:16, marginBottom: isMobile?14:20 }}>

          {/* Monthly Trend — Area Chart */}
          <div className="ld-hover-lift" style={{ background:cardBg, borderRadius:16, padding: isMobile?14:20, border:`1px solid ${bdr}`, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:darkMode?'#4ade80':G }}>Monthly Lab Requests</div>
                <div style={{ fontSize:10, color:muted, marginTop:2 }}>12-month trend overview</div>
              </div>
              <div style={{ background:`${G}14`, border:`1px solid ${G}30`, borderRadius:20, padding:'4px 12px', fontSize:10, fontWeight:800, color:G }}>
                {completionRate}% done today
              </div>
            </div>
            <ResponsiveContainer width="100%" height={isMobile?150:190}>
              <AreaChart data={stats.barData} margin={{ top:4, right:6, left:-28, bottom:0 }}>
                <defs>
                  <linearGradient id="labAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={G}  stopOpacity={0.22}/>
                    <stop offset="95%" stopColor={G2} stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#1a3320':'#f0f0f0'} vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:9, fill:muted }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:9, fill:muted }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip darkMode={darkMode} bdr={bdr} txt={txt}/>} cursor={{ stroke:G, strokeWidth:1, strokeDasharray:'4 4' }}/>
                <Area type="monotone" dataKey="count" stroke={G} strokeWidth={2.5} fill="url(#labAreaGrad)" dot={{ fill:G, r:3, strokeWidth:0 }} activeDot={{ r:5, fill:G, strokeWidth:0 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Test Distribution — Donut */}
          <div className="ld-hover-lift" style={{ background:cardBg, borderRadius:16, padding: isMobile?14:20, border:`1px solid ${bdr}`, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:darkMode?'#4ade80':G, marginBottom:4 }}>Test Distribution</div>
            <div style={{ fontSize:10, color:muted, marginBottom:12 }}>All-time volume by category</div>
            {stats.pieData.length === 0
              ? <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', color:muted, fontSize:11, flexDirection:'column', gap:6 }}>
                  <span style={{ fontSize:28 }}>🧪</span>No data yet
                </div>
              : <>
                  <ResponsiveContainer width="100%" height={isMobile?110:130}>
                    <PieChart>
                      <Pie data={stats.pieData} innerRadius={isMobile?30:36} outerRadius={isMobile?46:54} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {stats.pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize:11, background:darkMode?'#0f2014':'#fff', border:`1px solid ${bdr}`, borderRadius:10 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:6 }}>
                    {stats.pieData.map((d,i) => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:9, height:9, borderRadius:3, background:PIE_COLORS[i%PIE_COLORS.length], flexShrink:0 }}/>
                        <span style={{ flex:1, fontSize:11, color:txt2 }}>{d.name}</span>
                        <div style={{ width:44, height:5, borderRadius:3, background:darkMode?'#1a3d24':'#f0f0f0', overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:3, width:`${Math.min(100,d.value)}%`, background:PIE_COLORS[i%PIE_COLORS.length] }}/>
                        </div>
                        <span style={{ fontSize:11, fontWeight:800, color:PIE_COLORS[i%PIE_COLORS.length], minWidth:24, textAlign:'right' }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
        </div>

      </div>

      {/* ══ RIGHT SIDEBAR ══ */}
      <div className="ld-side" style={{
        width: isMobile ? 0 : 290, flexShrink:0, background:sideBg,
        borderLeft:`1px solid ${bdr}`,
        display:'flex', flexDirection:'column',
        height:'100vh', position:'sticky', top:0, overflowY:'hidden',
      }}>

        {/* Sidebar header */}
        <div style={{ padding:'18px 14px 10px', borderBottom:`1px solid ${bdr}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:darkMode?'#4ade80':G }}>Pending Patients</div>
              <div style={{ fontSize:10, color:muted, marginTop:1 }}>{filteredPending.length} of {pending.length} shown</div>
            </div>
            <div style={{ background:`linear-gradient(135deg,${G},${G2})`, color:'#fff', borderRadius:20, padding:'3px 11px', fontSize:12, fontWeight:800, boxShadow:'0 2px 8px rgba(21,128,61,0.28)' }}>
              {pending.length}
            </div>
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:8 }}>
            <svg style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={ptSearch}
              onChange={e => setPtSearch(e.target.value)}
              placeholder="Search patients…"
              style={{ width:'100%', background:darkMode?'#0d2010':'#f9fafb', border:`1px solid ${bdr}`, borderRadius:8, padding:'7px 10px 7px 28px', fontSize:11, outline:'none', color:txt, boxSizing:'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = G)}
              onBlur={e  => (e.currentTarget.style.borderColor = bdr)}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display:'flex', gap:4, overflowX:'auto', paddingBottom:2 }}>
            {TEST_FILTERS.map(f => (
              <div key={f} className="ld-pill" onClick={() => setFilter(f)} style={{
                padding:'3px 8px', borderRadius:20, fontSize:9, fontWeight:700, whiteSpace:'nowrap', flexShrink:0,
                background: filter===f ? G : (darkMode?'#1a3d24':'#f0fdf4'),
                color: filter===f ? '#fff' : (darkMode?'#86efac':G),
                border:`1px solid ${filter===f ? G : (darkMode?'#1a3d24':'#bbf7d0')}`,
                boxShadow: filter===f ? '0 2px 8px rgba(21,128,61,0.2)' : 'none',
              }}>
                {TEST_ICONS[f]} {f}
              </div>
            ))}
          </div>
        </div>

        {/* Patient list */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>
          {loading ? (
            <div style={{ padding:28, textAlign:'center', color:muted, fontSize:12 }}>Loading…</div>
          ) : filteredPending.length === 0 ? (
            <div style={{ padding:28, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🎉</div>
              <div style={{ fontSize:12, fontWeight:700, color:muted }}>{ptSearch ? 'No patients match' : 'No pending requests!'}</div>
              {ptSearch && <div style={{ fontSize:10, color:G, marginTop:5, cursor:'pointer', textDecoration:'underline' }} onClick={() => setPtSearch('')}>Clear search</div>}
            </div>
          ) : filteredPending.map(p => {
            const isSel = selPatient?.id === p.id
            return (
              <div key={p.id} className="ld-hover-row"
                onClick={() => setSelPatient(isSel ? null : p)}
                style={{
                  background: isSel ? (darkMode?'#1a3d22':'#dcfce7') : pBg,
                  border:`1.5px solid ${isSel ? G : pBdr}`,
                  borderRadius:11, padding:'10px 12px', marginBottom:8,
                  boxShadow: isSel ? `0 0 0 1px ${G}30` : 'none',
                }}>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:subClr, flex:1, marginRight:6, lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize:9, color:muted, flexShrink:0, background:darkMode?'#1a3d24':'#f3f4f6', borderRadius:8, padding:'2px 6px' }}>
                    {new Date(p.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}
                  </div>
                </div>

                <div style={{ fontSize:10, color:txt2, marginBottom:5 }}>
                  {[p.age ? p.age+' yrs' : null, p.gender, p.address].filter(Boolean).join(' · ')}
                </div>

                <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:isSel?8:0 }}>
                  {p.tests && Object.entries(p.tests).filter(([,v])=>v).map(([k]) => (
                    <span key={k} style={{ fontSize:9, fontWeight:700, borderRadius:10, padding:'2px 7px', background:darkMode?'#1a4a22':'#dcfce7', color:subClr, border:`1px solid ${darkMode?'#1a5a28':'#bbf7d0'}` }}>
                      {TEST_LABEL_MAP[k]||k}
                    </span>
                  ))}
                </div>

                {isSel && (
                  <div style={{ display:'flex', gap:6, marginTop:6, borderTop:`1px solid ${G}25`, paddingTop:8 }}>
                    <button className="ld-btn"
                      onClick={e => { e.stopPropagation(); onOpenLabForm(p) }}
                      style={{ flex:1, background:`linear-gradient(135deg,${G},${G2})`, color:'#fff', border:'none', borderRadius:8, padding:'8px 0', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4, boxShadow:`0 3px 10px rgba(21,128,61,0.28)` }}>
                      Test Patient
                    </button>
                    <button className="ld-btn"
                      onClick={e => { e.stopPropagation(); onCancelRequest && onCancelRequest(p) }}
                      style={{ flex:1, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, padding:'8px 0', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}