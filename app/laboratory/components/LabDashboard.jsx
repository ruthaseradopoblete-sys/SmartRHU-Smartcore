'use client'
import { useState, useEffect, useRef } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { fetchDashboardStats, fetchPendingRequests } from "./labService"

/* ══ Design tokens ══ */
const G  = '#1a7a1a'
const G2 = '#0d9488'
const DG = '#155a15'

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

/* ── Inject CSS ── */
const injectDashStyles = () => {
  if (typeof document === 'undefined') return
  const id = 'lab-dash-styles'
  if (document.getElementById(id)) return
  const s = document.createElement('style')
  s.id = id
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Playfair+Display:wght@700;800;900&display=swap');

    .ld-card {
      transition: box-shadow 0.22s ease, transform 0.22s ease;
    }
    .ld-card:hover {
      box-shadow: 0 8px 32px rgba(26,122,26,0.13) !important;
      transform: translateY(-2px);
    }

    .ld-stat {
      transition: box-shadow 0.22s ease, transform 0.22s ease;
      cursor: default;
    }
    .ld-stat:hover {
      transform: translateY(-4px) scale(1.01);
      box-shadow: 0 18px 40px rgba(0,0,0,0.22) !important;
    }

    .ld-metric {
      transition: all 0.18s ease;
      cursor: default;
    }
    .ld-metric:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(26,122,26,0.12) !important;
    }

    .ld-pill {
      transition: all 0.12s ease;
      cursor: pointer;
    }
    .ld-pill:hover {
      filter: brightness(1.08);
      transform: translateY(-1px);
    }

    .ld-patient-card {
      transition: all 0.16s ease;
      cursor: pointer;
    }
    .ld-patient-card:hover {
      transform: translateX(3px);
    }

    .ld-btn-test {
      transition: all 0.15s ease;
    }
    .ld-btn-test:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 14px rgba(26,122,26,0.4);
      transform: translateY(-1px);
    }

    .ld-btn-cancel {
      transition: all 0.15s ease;
    }
    .ld-btn-cancel:hover {
      background: #fee2e2 !important;
      transform: translateY(-1px);
    }

    .ld-refresh {
      transition: all 0.15s ease;
    }
    .ld-refresh:hover {
      background: ${DG} !important;
      box-shadow: 0 4px 14px rgba(26,122,26,0.35);
      transform: translateY(-1px);
    }
    .ld-refresh:active {
      transform: scale(0.96);
    }
    .ld-refresh.spinning svg {
      animation: ld-spin 0.7s linear infinite;
    }
    @keyframes ld-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    .ld-start-btn {
      transition: all 0.15s ease;
    }
    .ld-start-btn:hover {
      filter: brightness(1.08);
      box-shadow: 0 6px 20px rgba(26,122,26,0.45);
      transform: translateY(-1px);
    }

    /* bar fill on hover */
    .ld-bar-fill {
      transition: width 0.6s cubic-bezier(0.22,1,0.36,1);
    }

    /* progress bar shimmer */
    @keyframes ld-shimmer {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .ld-shimmer::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
      animation: ld-shimmer 2s ease infinite;
    }

    .ld-pulse-dot {
      animation: ld-pulse 2.5s ease-in-out infinite;
    }
    @keyframes ld-pulse {
      0%,100% { opacity:0.55; box-shadow:0 0 4px rgba(34,197,94,0.4); }
      50%      { opacity:1;    box-shadow:0 0 10px rgba(34,197,94,0.8); }
    }

    .ld-badge-new {
      animation: ld-pop 0.35s cubic-bezier(0.22,1,0.36,1) both;
    }
    @keyframes ld-pop {
      from { opacity:0; transform:scale(0.7); }
      to   { opacity:1; transform:scale(1); }
    }
  `
  document.head.appendChild(s)
}
if (typeof window !== 'undefined') injectDashStyles()

/* ══ Stat Card ══ */
function StatCard({ label, value, sub, gradient, icon, badge }) {
  return (
    <div className="ld-stat" style={{
      background: gradient, borderRadius:16, padding:'18px 20px', color:'#fff',
      position:'relative', overflow:'hidden',
      boxShadow:'0 6px 20px rgba(0,0,0,0.12)',
      fontFamily:"'Libre Baskerville', Georgia, serif",
    }}>
      {/* Decorative circle */}
      <div style={{ position:'absolute', right:-20, top:-20, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', right:-4, bottom:-20, width:55, height:55, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>
      {/* Icon */}
      <div style={{ position:'absolute', right:18, top:'50%', transform:'translateY(-50%)', fontSize:38, opacity:0.16, pointerEvents:'none' }}>{icon}</div>
      <div style={{ fontSize:9.5, opacity:0.82, fontWeight:700, textTransform:'uppercase', letterSpacing:1.1 }}>{label}</div>
      <div style={{ fontSize:42, fontWeight:900, lineHeight:1.05, margin:'5px 0 3px', fontFamily:"'Playfair Display', Georgia, serif" }}>{value}</div>
      <div style={{ fontSize:10, opacity:0.68 }}>{sub}</div>
      {badge !== undefined && (
        <div className="ld-badge-new" style={{ position:'absolute', top:12, right:12, background:'rgba(255,255,255,0.22)', borderRadius:20, padding:'2px 8px', fontSize:9, fontWeight:800, letterSpacing:0.5 }}>
          {badge}
        </div>
      )}
    </div>
  )
}

/* ══ Metric Tile ══ */
function MetricTile({ label, value, color, icon, darkMode, sub }) {
  const cardBg = darkMode ? '#0f2014' : '#fff'
  const bdr    = darkMode ? '#1a3d24' : '#e5e7eb'
  const txt2   = darkMode ? '#6ee7b7' : '#6b7280'
  return (
    <div className="ld-metric" style={{
      background:cardBg, border:`1px solid ${bdr}`, borderRadius:12,
      padding:'12px 14px', display:'flex', alignItems:'center', gap:10,
      boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
      fontFamily:"'Libre Baskerville', Georgia, serif",
    }}>
      <div style={{ width:38, height:38, borderRadius:11, background:`${color}16`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0, border:`1px solid ${color}22` }}>
        {icon}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:9, color:darkMode?'#3a6b48':'#9ca3af', textTransform:'uppercase', letterSpacing:0.8, fontWeight:700, whiteSpace:'nowrap' }}>{label}</div>
        <div style={{ fontSize:22, fontWeight:900, color:color, lineHeight:1.15, fontFamily:"'Playfair Display', Georgia, serif" }}>{value}</div>
        {sub && <div style={{ fontSize:9, color:txt2, marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ══ Custom Bar tooltip ══ */
const CustomTooltip = ({ active, payload, label, darkMode, bdr, txt }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:darkMode?'#0f2014':'#fff', border:`1px solid ${bdr}`, borderRadius:10, padding:'8px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)', fontFamily:"'Libre Baskerville', Georgia, serif" }}>
      <div style={{ fontSize:11, fontWeight:700, color:txt, marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:800, color:G }}>{payload[0].value} requests</div>
    </div>
  )
}

/* ══ Section heading ══ */
const SH = ({ children, darkMode }) => (
  <div style={{ fontSize:10, fontWeight:700, color:darkMode?'#3a6b48':'#9ca3af', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8, fontFamily:"'Libre Baskerville', Georgia, serif" }}>
    {children}
  </div>
)

/* ════════════════════════════════════════
   MAIN COMPONENT
   Props: darkMode, onOpenLabForm(request), onCancelRequest(request)
════════════════════════════════════════ */
export default function LabDashboard({ darkMode, onOpenLabForm, onCancelRequest }) {
  const [stats,      setStats]      = useState({ totalToday:0, totalPending:0, totalCompleted:0, barData:[], pieData:[], chemStats:{}, seroStats:{} })
  const [pending,    setPending]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [spinning,   setSpinning]   = useState(false)
  const [filter,     setFilter]     = useState('All')
  const [selPatient, setSelPatient] = useState(null)
  // New: search inside sidebar
  const [ptSearch,   setPtSearch]   = useState('')
  // New: collapsed/expanded sidebar
  const [sideCollapsed, setSideCollapsed] = useState(false)

  /* Dark tokens */
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
    setSpinning(true); setLoading(true)
    const [s, p] = await Promise.all([fetchDashboardStats(), fetchPendingRequests()])
    setStats(s)
    setPending(p)
    setSelPatient(prev => p.find(x => x.id === prev?.id) || p[0] || null)
    setLoading(false)
    setTimeout(() => setSpinning(false), 600)
  }
  useEffect(() => { load() }, [])

  /* Filter + search logic */
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
    <div style={{ display:'flex', minHeight:'100%', background:bg, fontFamily:"'Libre Baskerville', Georgia, serif" }}>

      {/* ══════════════════════════════════
          LEFT / MAIN CONTENT
      ══════════════════════════════════ */}
      <div style={{ flex:1, padding:'22px 20px 22px 24px', minWidth:0, overflowY:'auto' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:10.5, color:txt2, fontWeight:700, textTransform:'uppercase', letterSpacing:1.3, marginBottom:2 }}>
              Laboratorian
            </div>
            <div style={{ fontSize:30, fontWeight:900, color:darkMode?'#4ade80':G, letterSpacing:-0.8, lineHeight:1, fontFamily:"'Playfair Display', Georgia, serif" }}>
              Dashboard
            </div>
            <div style={{ fontSize:11, color:txt2, marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
              <span className="ld-pulse-dot" style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#22c55e', flexShrink:0 }}/>
              {new Date().toLocaleDateString('en-PH',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </div>
          </div>
          <button
            className={`ld-refresh${spinning?' spinning':''}`}
            onClick={load}
            style={{ background:G, color:'#fff', border:'none', borderRadius:10, padding:'8px 18px', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7, boxShadow:'0 3px 12px rgba(26,122,26,0.25)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 9"/>
              <path d="M21 3v6h-6"/>
              <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64L3 15"/>
              <path d="M3 21v-6h6"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* ── 3 Stat Cards ── */}
        <SH darkMode={darkMode}>Overview</SH>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:13, marginBottom:18 }}>
          <StatCard label="Today's Requests" icon="🧪"
            value={loading?'—':stats.totalToday}
            sub={`Last updated ${new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}`}
            gradient={`linear-gradient(135deg,${G},${G2})`}
            badge={`+${stats.totalToday}`}/>
          <StatCard label="Pending Tests" icon="⏳"
            value={loading?'—':stats.totalPending}
            sub="Awaiting results"
            gradient="linear-gradient(135deg,#d97706,#b45309)"/>
          <StatCard label="Completed" icon="✅"
            value={loading?'—':stats.totalCompleted}
            sub="Results released today"
            gradient="linear-gradient(135deg,#2563eb,#7c3aed)"/>
        </div>

        {/* ── 5 Metric tiles ── */}
        <SH darkMode={darkMode}>Pending by Test Type</SH>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:18 }}>
          <MetricTile label="Hematology"   value={pending.filter(p=>p.tests?.hgb_hct||p.tests?.cbc_with_platelet).length} color="#7c3aed" icon="🩸" darkMode={darkMode} sub="blood count"/>
          <MetricTile label="Urinalysis"   value={pending.filter(p=>p.tests?.urinalysis).length}                          color="#2563eb" icon="🧫" darkMode={darkMode} sub="urine test"/>
          <MetricTile label="Fecalysis"    value={pending.filter(p=>p.tests?.fecalysis).length}                           color="#d97706" icon="💩" darkMode={darkMode} sub="stool test"/>
          <MetricTile label="Clin. Chem"   value={chemCount}                                                               color="#16a34a" icon="⚗️" darkMode={darkMode} sub="chemistry"/>
          <MetricTile label="Serology"     value={serologyCount}                                                           color="#dc2626" icon="🔬" darkMode={darkMode} sub="immunology"/>
        </div>

        {/* ── Charts row ── */}
        <SH darkMode={darkMode}>Analytics</SH>
        <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr', gap:14, marginBottom:18 }}>

          {/* Bar chart */}
          <div className="ld-card" style={{ background:cardBg, borderRadius:14, padding:'16px 18px', border:`1px solid ${bdr}`, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:800, color:darkMode?'#4ade80':G, fontFamily:"'Playfair Display', Georgia, serif" }}>Monthly Lab Requests</div>
                <div style={{ fontSize:10, color:muted, marginTop:1 }}>12-month trend</div>
              </div>
              {/* Completion badge */}
              <div style={{ background:`${G}14`, border:`1px solid ${G}30`, borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700, color:G }}>
                {completionRate}% done today
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={stats.barData} barSize={14} margin={{ top:0, right:4, left:-28, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#1a3320':'#f3f4f6'} vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:9, fill:muted, fontFamily:"'Libre Baskerville', Georgia, serif" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:9, fill:muted }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip darkMode={darkMode} bdr={bdr} txt={txt}/>} cursor={{ fill:'rgba(26,122,26,0.05)', borderRadius:6 }}/>
                <defs>
                  <linearGradient id="labBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={G}/><stop offset="100%" stopColor={G2} stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <Bar dataKey="count" name="Requests" fill="url(#labBarGrad)" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="ld-card" style={{ background:cardBg, borderRadius:14, padding:'16px 18px', border:`1px solid ${bdr}`, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:800, color:darkMode?'#4ade80':G, fontFamily:"'Playfair Display', Georgia, serif" }}>Test Distribution</div>
              <div style={{ fontSize:10, color:muted, marginTop:1 }}>All-time by type</div>
            </div>
            {stats.pieData.length === 0
              ? <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', color:muted, fontSize:11 }}>No data yet</div>
              : <>
                  <ResponsiveContainer width="100%" height={105}>
                    <PieChart>
                      <Pie data={stats.pieData} innerRadius={30} outerRadius={46} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {stats.pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize:10, background:darkMode?'#0f2014':'#fff', border:`1px solid ${bdr}`, borderRadius:10 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}>
                    {stats.pieData.map((d,i) => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:7, fontSize:10 }}>
                        <div style={{ width:8, height:8, borderRadius:3, background:PIE_COLORS[i%PIE_COLORS.length], flexShrink:0 }}/>
                        <span style={{ flex:1, color:txt2, fontWeight:500 }}>{d.name}</span>
                        <span style={{ fontWeight:800, color:PIE_COLORS[i%PIE_COLORS.length] }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
        </div>

        {/* ── NEW: Chemistry + Serology completion rate bars ── */}
        <SH darkMode={darkMode}>Completion Rate by Test</SH>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* Chemistry */}
          <div className="ld-card" style={{ background:cardBg, borderRadius:14, padding:'16px 18px', border:`1px solid ${bdr}`, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:12, fontWeight:800, color:darkMode?'#4ade80':G, marginBottom:12, fontFamily:"'Playfair Display', Georgia, serif" }}>
              ⚗️ Clinical Chemistry
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                ['RBS',           'random_blood_sugar',  '#d97706'],
                ['FBS',           'fasting_blood_sugar', '#2563eb'],
                ['Cholesterol',   'cholesterol',         '#7c3aed'],
                ['Triglycerides', 'triglycerides',       '#db2777'],
                ['Lipid Profile', 'lipid_profile',       '#0891b2'],
                ['Uric Acid',     'blood_uric_acid',     '#059669'],
              ].map(([lbl, key, col]) => {
                const s     = stats.chemStats?.[key] || { pending:0, completed:0 }
                const total = s.pending + s.completed
                const pct   = total > 0 ? Math.round((s.completed / total) * 100) : 0
                return (
                  <div key={key}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:10.5, color:txt2, fontWeight:600 }}>{lbl}</span>
                      <span style={{ fontSize:10, fontWeight:800, color: pct===100?G:pct>50?col:muted }}>
                        {s.completed}<span style={{ color:muted, fontWeight:500 }}>/{total}</span>
                        <span style={{ color:muted, marginLeft:4, fontWeight:500 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height:5, borderRadius:4, background:darkMode?'#1a3d24':'#f3f4f6', overflow:'hidden', position:'relative' }}>
                      <div className="ld-bar-fill" style={{ height:'100%', borderRadius:4, width:`${pct}%`,
                        background: pct===100 ? `linear-gradient(90deg,${G},${G2})` : `linear-gradient(90deg,${col},${col}bb)` }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Serology */}
          <div className="ld-card" style={{ background:cardBg, borderRadius:14, padding:'16px 18px', border:`1px solid ${bdr}`, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:12, fontWeight:800, color:darkMode?'#4ade80':G, marginBottom:12, fontFamily:"'Playfair Display', Georgia, serif" }}>
              🔬 Serology
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                ['HBsAg',          'hbsag',               '#dc2626'],
                ['Dengue NS1',     'dengue_ns1',           '#ea580c'],
                ['Dengue IgG/IgM', 'dengue_igg_igm',      '#d97706'],
                ['Pregnancy Test', 'pregnancy_test',       '#db2777'],
                ['Blood Typing',   'abo_rh_blood_typing',  '#7c3aed'],
              ].map(([lbl, key, col]) => {
                const s     = stats.seroStats?.[key] || { pending:0, completed:0 }
                const total = s.pending + s.completed
                const pct   = total > 0 ? Math.round((s.completed / total) * 100) : 0
                return (
                  <div key={key}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:10.5, color:txt2, fontWeight:600 }}>{lbl}</span>
                      <span style={{ fontSize:10, fontWeight:800, color: pct===100?G:pct>50?col:muted }}>
                        {s.completed}<span style={{ color:muted, fontWeight:500 }}>/{total}</span>
                        <span style={{ color:muted, marginLeft:4, fontWeight:500 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height:5, borderRadius:4, background:darkMode?'#1a3d24':'#f3f4f6', overflow:'hidden' }}>
                      <div className="ld-bar-fill" style={{ height:'100%', borderRadius:4, width:`${pct}%`,
                        background: pct===100 ? `linear-gradient(90deg,${G},${G2})` : `linear-gradient(90deg,${col},${col}bb)` }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          RIGHT SIDEBAR — Pending Patients
      ══════════════════════════════════ */}
      <div style={{
        width: sideCollapsed ? 52 : 300, flexShrink:0, background:sideBg,
        borderLeft:`1px solid ${bdr}`,
        display:'flex', flexDirection:'column',
        height:'100vh', position:'sticky', top:0, overflowY:'hidden',
        transition:'width 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}>

        {/* Collapse toggle button */}
        <button
          onClick={() => setSideCollapsed(c => !c)}
          title={sideCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position:'absolute', left:-14, top:22, width:28, height:28, borderRadius:'50%',
            background:cardBg, border:`1.5px solid ${bdr}`, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 8px rgba(0,0,0,0.1)', zIndex:10, flexShrink:0,
            transition:'all 0.15s', color:txt2,
          }}
          onMouseEnter={e => { e.currentTarget.style.background=G; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor=G }}
          onMouseLeave={e => { e.currentTarget.style.background=cardBg; e.currentTarget.style.color=txt2; e.currentTarget.style.borderColor=bdr }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {sideCollapsed ? <polyline points="9 18 15 12 9 6"/> : <polyline points="15 18 9 12 15 6"/>}
          </svg>
        </button>

        {sideCollapsed ? (
          /* Collapsed: show count + filter icons vertically */
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:20, gap:10 }}>
            <div style={{ background:G, color:'#fff', borderRadius:20, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }}>
              {pending.length}
            </div>
            <div style={{ fontSize:8, color:muted, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, writingMode:'vertical-rl', transform:'rotate(180deg)', marginTop:6 }}>
              Pending
            </div>
          </div>
        ) : (
          <>
            {/* Sidebar header */}
            <div style={{ padding:'18px 14px 10px', borderBottom:`1px solid ${bdr}`, flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:darkMode?'#4ade80':G, fontFamily:"'Playfair Display', Georgia, serif" }}>
                    Pending Patients
                  </div>
                  <div style={{ fontSize:10, color:muted, marginTop:1 }}>
                    {filteredPending.length} of {pending.length} shown
                  </div>
                </div>
                <div style={{ background:`linear-gradient(135deg,${G},${G2})`, color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:800, boxShadow:'0 2px 8px rgba(26,122,26,0.3)' }}>
                  {pending.length}
                </div>
              </div>

              {/* Search box — NEW */}
              <div style={{ position:'relative', marginBottom:8 }}>
                <svg style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={ptSearch}
                  onChange={e => setPtSearch(e.target.value)}
                  placeholder="Search patients…"
                  style={{ width:'100%', background:darkMode?'#0d2010':'#f9fafb', border:`1px solid ${bdr}`, borderRadius:8, padding:'6px 10px 6px 28px', fontSize:11, outline:'none', color:txt, boxSizing:'border-box', fontFamily:"'Libre Baskerville', Georgia, serif" }}
                  onFocus={e => e.currentTarget.style.borderColor=G}
                  onBlur={e  => e.currentTarget.style.borderColor=bdr}
                />
              </div>

              {/* Filter pills */}
              <div style={{ display:'flex', gap:4, overflowX:'auto', paddingBottom:2 }}>
                {TEST_FILTERS.map(f => (
                  <div key={f} className="ld-pill" onClick={() => setFilter(f)} style={{
                    padding:'3px 8px', borderRadius:20, fontSize:9, fontWeight:700, whiteSpace:'nowrap', flexShrink:0,
                    background: filter===f ? G : (darkMode?'#1a3d24':'#f0fdf4'),
                    color: filter===f ? '#fff' : (darkMode?'#86efac':G),
                    border:`1px solid ${filter===f?G:(darkMode?'#1a3d24':'#bbf7d0')}`,
                    boxShadow: filter===f ? '0 2px 8px rgba(26,122,26,0.25)' : 'none',
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
                <div style={{ padding:28, textAlign:'center' }}>
                  <div style={{ fontSize:34, marginBottom:8 }}>🎉</div>
                  <div style={{ fontSize:12, fontWeight:700, color:muted }}>
                    {ptSearch ? 'No patients match search' : 'No pending requests!'}
                  </div>
                  {ptSearch && <div style={{ fontSize:10, color:muted, marginTop:4, cursor:'pointer', textDecoration:'underline' }} onClick={() => setPtSearch('')}>Clear search</div>}
                </div>
              ) : filteredPending.map(p => {
                const isSel = selPatient?.id === p.id
                return (
                  <div key={p.id}
                    className="ld-patient-card"
                    onClick={() => setSelPatient(isSel ? null : p)}
                    style={{
                      background: isSel ? (darkMode?'#1a3d22':'#dcfce7') : pBg,
                      border:`1.5px solid ${isSel?G:pBdr}`,
                      borderRadius:10, padding:'10px 12px', marginBottom:8,
                      boxShadow: isSel ? `0 0 0 1px ${G}40` : 'none',
                    }}>

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                      <div style={{ fontWeight:700, fontSize:12, color:subClr, flex:1, marginRight:6, lineHeight:1.3, fontFamily:"'Libre Baskerville', Georgia, serif" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize:9, color:muted, flexShrink:0, background:darkMode?'#1a3d24':'#f3f4f6', borderRadius:10, padding:'2px 6px' }}>
                        {new Date(p.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}
                      </div>
                    </div>
                    <div style={{ fontSize:10, color:txt2, marginBottom:5 }}>
                      {[p.age?p.age+' yrs':null, p.gender, p.address].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:isSel?8:0 }}>
                      {p.tests && Object.entries(p.tests).filter(([,v])=>v).map(([k]) => (
                        <span key={k} style={{ fontSize:9, fontWeight:700, borderRadius:10, padding:'2px 7px', background:darkMode?'#1a4a22':'#dcfce7', color:subClr, border:`1px solid ${darkMode?'#1a5a28':'#bbf7d0'}` }}>
                          {TEST_LABEL_MAP[k]||k}
                        </span>
                      ))}
                    </div>

                    {isSel && (
                      <div style={{ display:'flex', gap:6, marginTop:6, borderTop:`1px solid ${G}30`, paddingTop:8 }}>
                        <button className="ld-btn-test"
                          onClick={e => { e.stopPropagation(); onOpenLabForm(p) }}
                          style={{ flex:1, background:`linear-gradient(135deg,${G},${G2})`, color:'#fff', border:'none', borderRadius:8, padding:'7px 0', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4, boxShadow:`0 3px 10px rgba(26,122,26,0.25)` }}>
                          🧪 Test Patient
                        </button>
                        <button className="ld-btn-cancel"
                          onClick={e => { e.stopPropagation(); onCancelRequest && onCancelRequest(p) }}
                          style={{ flex:1, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, padding:'7px 0', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                          ✕ Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{ padding:'12px 12px 14px', borderTop:`1px solid ${bdr}`, flexShrink:0 }}>
              {selPatient ? (
                <div>
                  <div style={{ fontSize:10, color:muted, marginBottom:6, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    Selected: <strong style={{ color:subClr }}>{selPatient.name}</strong>
                  </div>
                  <button className="ld-start-btn" onClick={() => onOpenLabForm(selPatient)}
                    style={{ width:'100%', background:`linear-gradient(135deg,${G},${G2})`, color:'#fff', border:'none', borderRadius:10, padding:'10px', fontSize:12, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:`0 4px 16px rgba(26,122,26,0.3)`, fontFamily:"'Libre Baskerville', Georgia, serif" }}>
                    🧪 Start Testing
                  </button>
                </div>
              ) : (
                <div style={{ fontSize:11, color:muted, textAlign:'center', padding:'4px 0' }}>
                  Select a patient to begin testing
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}