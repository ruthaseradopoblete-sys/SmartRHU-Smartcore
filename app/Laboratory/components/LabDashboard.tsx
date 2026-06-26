'use client'
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { fetchDashboardStats, fetchPendingRequests } from './LabService'
import { Droplets, FlaskConical, Microscope, TestTube, Activity, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import LabRequestPrintForm from './NotAvailable'

const G  = '#16a34a'
const G2 = '#4ade80'
const G3 = '#166534'
const G4 = '#0d3b1f'
const PIE_COLORS = ['#16a34a','#4ade80','#166534','#4ade80','#dcfce7']

const TEST_LABEL_MAP = {
  hgb_hct:'HGB/HCT', cbc_with_platelet:'CBC w/ Platelet',
  random_blood_sugar:'RBS', fasting_blood_sugar:'FBS',
  cholesterol:'Cholesterol', triglycerides:'Triglycerides',
  lipid_profile:'Lipid Profile', blood_uric_acid:'Uric Acid',
  urinalysis:'Urinalysis', fecalysis:'Fecalysis',
  dengue_ns1:'Dengue NS1', dengue_igg_igm:'Dengue IgG/IgM',
  hbsag:'HBsAg', pregnancy_test:'Pregnancy Test',
  abo_rh_blood_typing:'Blood Typing',
  gene_xpert:'Gene Xpert', afb_dssm:'AFB/DSSM',
  culture_and_sensitivity:'Culture & Sensitivity',
}

const AVAILABLE_TESTS = [
  'hgb_hct','cbc_with_platelet','urinalysis','fecalysis',
  'random_blood_sugar','fasting_blood_sugar','cholesterol','triglycerides',
  'lipid_profile','blood_uric_acid',
  'hbsag','dengue_ns1','dengue_igg_igm','pregnancy_test','abo_rh_blood_typing',
  'afb_dssm','culture_and_sensitivity',   // ← moved here
]

const UNAVAILABLE_TESTS = ['gene_xpert']  // ← only gene_xpert remains

const KNOWN_TESTS = [...AVAILABLE_TESTS, ...UNAVAILABLE_TESTS]

const TEST_FILTERS = ['All','Fecalysis','Urinalysis','Hematology','Clinical Chemistry','Serology']

const injectStyles = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById('ld-styles')) return
  const s = document.createElement('style')
  s.id = 'ld-styles'
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap');
    .ld-root, .ld-root * { font-family: 'Nunito', sans-serif !important; }
    .ld-spin { animation: ld-rotate 0.7s linear infinite; }
    @keyframes ld-rotate { to { transform: rotate(360deg); } }
    .ld-hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .ld-hover-lift:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(21,128,61,0.13) !important; }
    .ld-pill { transition: all 0.12s ease; cursor: pointer; }
    .ld-pill:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .ld-btn { transition: all 0.15s ease; }
    .ld-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .ld-pulse { animation: ld-pulse-anim 2s ease-in-out infinite; }
    @keyframes ld-pulse-anim {
      0%,100% { opacity:0.6; box-shadow:0 0 0 0 rgba(34,197,94,0.4); }
      50%      { opacity:1;   box-shadow:0 0 0 6px rgba(34,197,94,0); }
    }
    .ld-card-glow { transition: box-shadow 0.2s; }
    .ld-card-glow:hover { box-shadow: 0 0 0 2px rgba(22,163,74,0.15), 0 8px 28px rgba(21,128,61,0.12) !important; }
    .ld-root {
      height: calc(100dvh - 64px);
      max-height: calc(100dvh - 64px);
      min-height: 0 !important;
      overflow: hidden !important;
    }
    .ld-main-pad,
    .ld-side {
      min-height: 0 !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .ld-main-pad::-webkit-scrollbar,
    .ld-side::-webkit-scrollbar,
    .ld-filter-scroll::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
    .ld-filter-scroll {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    /* Mini scrollbar for the pending patients queue */
    .ld-patient-list {
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      scrollbar-width: thin !important;
      scrollbar-color: rgba(22,163,74,0.35) transparent;
    }
    .ld-patient-list::-webkit-scrollbar {
      width: 5px !important;
      display: block !important;
    }
    .ld-patient-list::-webkit-scrollbar-track {
      background: transparent;
    }
    .ld-patient-list::-webkit-scrollbar-thumb {
      background: rgba(22,163,74,0.35);
      border-radius: 10px;
    }
    .ld-patient-list::-webkit-scrollbar-thumb:hover {
      background: rgba(22,163,74,0.55);
    }
    @media (max-width:1024px) {
      .ld-grid-3 { grid-template-columns: 1fr 1fr !important; }
      .ld-grid-charts { grid-template-columns: 1fr !important; }
      .ld-grid-5 { grid-template-columns: repeat(3,1fr) !important; }
    }
    @media (max-width:640px) {
      .ld-root { height: calc(100dvh - 64px); max-height: calc(100dvh - 64px); overflow: hidden !important; }
      .ld-grid-3 { grid-template-columns: 1fr !important; }
      .ld-grid-5 { grid-template-columns: repeat(2,1fr) !important; }
      .ld-side { display:none !important; }
      .ld-main-pad { padding:10px !important; overflow:hidden !important; }
    }
  `
  document.head.appendChild(s)
}
if (typeof window !== 'undefined') injectStyles()

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return { isMobile: w < 640, isTablet: w < 1024, w }
}

function StatCard({ label, value, sub, gradient, icon }) {
  return (
    <div className="ld-hover-lift" style={{
      background: gradient, borderRadius: 20, padding: '16px 18px', color: '#ffffff',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
    }}>
      <div style={{ position:'absolute', right:-24, top:-24, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', right:20, bottom:-28, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', right:18, top:'50%', transform:'translateY(-50%)', opacity:0.2, pointerEvents:'none' }}>{icon}</div>
      <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.4, opacity:0.78, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:38, fontWeight:900, lineHeight:1, marginBottom:5, letterSpacing:'-2px', fontVariantNumeric:'tabular-nums' }}>{value}</div>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'2px 9px', fontSize:9, fontWeight:700 }}>{sub}</div>
      </div>
    </div>
  )
}

function MetricTile({ label, value, color, icon, darkMode, sub }) {
  const cardBg = darkMode ? '#0d2516' : '#ffffff'
  const bdr    = darkMode ? 'rgba(74,222,128,0.1)' : 'rgba(22,163,74,0.15)'
  const muted  = darkMode ? '#4b6557' : '#9ca3af'
  return (
    <div className="ld-card-glow" style={{
      background: cardBg, border: `1px solid ${bdr}`, borderRadius: 14,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:`linear-gradient(180deg,${color},${color}88)`, borderRadius:'14px 0 0 14px' }}/>
      <div style={{ width:42, height:42, borderRadius:12, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:`1.5px solid ${color}22`, color:color }}>
        {icon}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:9, color:muted, textTransform:'uppercase', letterSpacing:0.9, fontWeight:700, marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:26, fontWeight:900, color, lineHeight:1.1, fontVariantNumeric:'tabular-nums' }}>{value}</div>
        {sub && <div style={{ fontSize:9, color:muted, marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  )
}

function SH({ children, darkMode }) {
  const muted = darkMode ? '#4b6557' : '#9ca3af'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:11, marginTop:6 }}>
      <div style={{ width:3, height:14, borderRadius:2, background:`linear-gradient(180deg,${G},${G2})`, flexShrink:0 }}/>
      <div style={{ fontSize:10, fontWeight:800, color:muted, textTransform:'uppercase', letterSpacing:1.4 }}>{children}</div>
    </div>
  )
}

function ChartTooltip({ active, payload, label, darkMode, bdr, txt }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:darkMode?'#0d2516':'#ffffff', border:`1px solid ${bdr}`, borderRadius:10, padding:'8px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.1)', fontSize:12 }}>
      <div style={{ fontWeight:700, color:txt, marginBottom:2 }}>{label}</div>
      <div style={{ fontWeight:800, color:G }}>{payload[0].value} requests</div>
    </div>
  )
}

export default function LabDashboard({ darkMode, onOpenLabForm, onCancelRequest }) {
  const [stats,        setStats]        = useState({ totalToday:0, totalPending:0, totalCompleted:0, barData:[], pieData:[] })
  const [pending,      setPending]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [spinning,     setSpinning]     = useState(false)
  const [filter,       setFilter]       = useState('All')
  const [queueTab,     setQueueTab]     = useState('available')
  const [selPatient,   setSelPatient]   = useState(null)
  const [ptSearch,     setPtSearch]     = useState('')
  const [showPrintForm, setShowPrintForm] = useState(false)
  const [printPatient,  setPrintPatient]  = useState(null)

  const { isMobile, isTablet } = useBreakpoint()

  const bg     = darkMode ? '#061a0d' : '#f0f7f2'
  const cardBg = darkMode ? '#0d2516' : '#ffffff'
  const sideBg = darkMode ? '#061a0d' : '#ffffff'
  const bdr    = darkMode ? 'rgba(74,222,128,0.1)' : 'rgba(22,163,74,0.15)'
  const txt    = darkMode ? '#e2f5e9' : '#0a2912'
  const txt2   = darkMode ? '#9abea6' : '#4b6557'
  const muted  = darkMode ? '#4b6557' : '#9ca3af'
  const pBg    = darkMode ? '#0f2e1a' : '#dcfce7'
  const pBdr   = darkMode ? 'rgba(74,222,128,0.1)' : 'rgba(22,163,74,0.15)'
  const subClr = darkMode ? '#dcfce7' : '#166534'

  const load = async () => {
    setSpinning(true); setLoading(true)
    const [s, p] = await Promise.all([fetchDashboardStats(), fetchPendingRequests()])
    setStats(s); setPending(p)
    setSelPatient(prev => p.find(x => x.id === prev?.id) || p[0] || null)
    setLoading(false)
    setTimeout(() => setSpinning(false), 700)
  }
  useEffect(() => { load() }, [])

  // ── Realtime sync (same approach as the topbar notifications) ──────────────
  useEffect(() => {
    const channel = supabase.channel('lab-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laboratory_requests' }, () => {
        load()
      })
      .subscribe()

    // Polling fallback in case a realtime event is missed
    const interval = setInterval(load, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
  const handler = (e) => {
    const { requestId } = e.detail
    // highlight or scroll to the row with this requestId
    // e.g. setHighlightedId(requestId) or setSelectedRequest(requestId)
  }
  window.addEventListener('labNavigateToRequest', handler)
  return () => window.removeEventListener('labNavigateToRequest', handler)
}, [])
// Tests the RHU lab cannot perform in-house
// Replace the two availablePatients / unavailablePatients lines with:

const EXTERNAL_TESTS = [
  'pt_ptt',
  'bun',
  'creatinine',
  'sgpt_alt',
  'sgot_ast',
  'serum_na_k_cl',
  'typhidot_igg_igm',
  'ecg_12_lead',
  'gene_xpert',
]

const hasExternal = (p) =>
  EXTERNAL_TESTS.some(t => p.tests?.[t]) ||
  !!p.ultrasound || !!p.xray || !!p.others

const availablePatients   = pending.filter((p) => !hasExternal(p))
const unavailablePatients = pending.filter((p) =>  hasExternal(p))

  const baseList = queueTab === 'available' ? availablePatients : unavailablePatients

  const filteredPending = baseList
    .filter(p => {
      if (filter === 'Fecalysis')          return p.tests?.fecalysis
      if (filter === 'Urinalysis')         return p.tests?.urinalysis
      if (filter === 'Hematology')         return p.tests?.hgb_hct || p.tests?.cbc_with_platelet
      if (filter === 'Clinical Chemistry') return p.tests?.random_blood_sugar || p.tests?.fasting_blood_sugar || p.tests?.cholesterol || p.tests?.triglycerides || p.tests?.lipid_profile || p.tests?.blood_uric_acid
      if (filter === 'Serology')           return p.tests?.hbsag || p.tests?.dengue_ns1 || p.tests?.dengue_igg_igm || p.tests?.pregnancy_test || p.tests?.abo_rh_blood_typing
      return true
    })
    .filter(p => !ptSearch || (p.name||'').toLowerCase().includes(ptSearch.toLowerCase()))

  const hemCount       = pending.filter(p => p.tests?.hgb_hct || p.tests?.cbc_with_platelet).length
  const uriCount       = pending.filter(p => p.tests?.urinalysis).length
  const fecCount       = pending.filter(p => p.tests?.fecalysis).length
  const chemCount      = pending.filter(p => p.tests?.random_blood_sugar || p.tests?.fasting_blood_sugar || p.tests?.cholesterol || p.tests?.triglycerides || p.tests?.lipid_profile || p.tests?.blood_uric_acid).length
  const serologyCount  = pending.filter(p => p.tests?.hbsag || p.tests?.dengue_ns1 || p.tests?.dengue_igg_igm || p.tests?.pregnancy_test || p.tests?.abo_rh_blood_typing).length
  const completionRate = stats.totalToday > 0 ? Math.round((stats.totalCompleted / stats.totalToday) * 100) : 0

  return (
    <div className="ld-root" style={{ display:'flex', height:'calc(100dvh - 64px)', maxHeight:'calc(100dvh - 64px)', minHeight:0, background:bg, fontFamily:"'Nunito', sans-serif", overflow:'hidden' }}>

      {/* MAIN */}
      <div className="ld-main-pad" style={{ flex:1, padding:isMobile?10:isTablet?14:'16px 18px 16px 22px', minWidth:0, minHeight:0, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:isMobile?'center':'flex-end', marginBottom:isMobile?10:14, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:10, color:txt2, fontWeight:800, textTransform:'uppercase', letterSpacing:1.8, marginBottom:3 }}>Laboratory</div>
            <div style={{ fontSize:isMobile?24:34, fontWeight:900, color:darkMode?'#4ade80':G, letterSpacing:'-0.5px', lineHeight:1 }}>DASHBOARD</div>
            {!isMobile && (
              <div style={{ fontSize:11, color:txt2, marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
        
                
              </div>
            )}
          </div>
          <button className="ld-btn" onClick={load} style={{
            background:`linear-gradient(135deg,${G},${G2})`, color:'#ffffff', border:'none',
            borderRadius:12, padding:isMobile?'8px 16px':'10px 22px', fontSize:12, fontWeight:800,
            cursor:'pointer', display:'flex', alignItems:'center', gap:7,
            boxShadow:'0 4px 16px rgba(21,128,61,0.35)',
          }}>
            <RefreshCw size={14} className={spinning ? 'ld-spin' : ''}/>
            Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <SH darkMode={darkMode}>Overview</SH>
        <div className="ld-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:isMobile?10:14, marginBottom:isMobile?10:12 }}>
          <StatCard label="Today's Requests"
            icon={<FlaskConical size={36} strokeWidth={1.5}/>}
            value={loading ? '--' : stats.totalToday}
            sub={`As of ${new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}`}
            gradient={`linear-gradient(135deg,${G4} 0%,${G} 100%)`}/>
          <StatCard label="Pending Tests"
            icon={<Clock size={36} strokeWidth={1.5}/>}
            value={loading ? '--' : stats.totalPending}
            sub="Awaiting results"
            gradient={`linear-gradient(135deg,${G3} 0%,${G2} 100%)`}/>
          <StatCard label="Completed Today"
            icon={<CheckCircle2 size={36} strokeWidth={1.5}/>}
            value={loading ? '--' : stats.totalCompleted}
            sub={`${completionRate}% completion rate`}
            gradient={`linear-gradient(135deg,${G} 0%,#166534 100%)`}/>
        </div>

        {/* Metric Tiles */}
        <SH darkMode={darkMode}>Pending by Test Type</SH>
        <div className="ld-grid-5" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:isMobile?8:12, marginBottom:isMobile?10:14 }}>
          <MetricTile label="Hematology"    icon={<Droplets size={20} strokeWidth={2}/>}     color={G}       darkMode={darkMode} sub="blood count"  value={hemCount}/>
          <MetricTile label="Urinalysis"    icon={<TestTube size={20} strokeWidth={2}/>}     color={G2}      darkMode={darkMode} sub="urine test"   value={uriCount}/>
          <MetricTile label="Fecalysis"     icon={<Activity size={20} strokeWidth={2}/>}     color={G3}      darkMode={darkMode} sub="stool test"   value={fecCount}/>
          <MetricTile label="Clin. Chem"    icon={<FlaskConical size={20} strokeWidth={2}/>} color="#166534" darkMode={darkMode} sub="chemistry"    value={chemCount}/>
          <MetricTile label="Serology"      icon={<Microscope size={20} strokeWidth={2}/>}   color="#16a34a" darkMode={darkMode} sub="immunology"   value={serologyCount}/>
        </div>

        {/* Charts */}
        <SH darkMode={darkMode}>Analytics</SH>
        <div className="ld-grid-charts" style={{ display:'grid', gridTemplateColumns:isTablet?'1fr':'1.65fr 1fr', gap:isMobile?12:16, marginBottom:isMobile?10:12 }}>

          <div className="ld-hover-lift" style={{ background:cardBg, borderRadius:18, padding:isMobile?14:22, border:`1px solid ${bdr}`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:darkMode?'#4ade80':G, marginBottom:2 }}>Monthly Laboratory Requests</div>
                <div style={{ fontSize:10, color:muted }}>12-month trend overview</div>
              </div>
              <div style={{ background:`${G}18`, border:`1px solid ${G}30`, borderRadius:20, padding:'4px 12px', fontSize:10, fontWeight:800, color:G }}>
                {completionRate}% done today
              </div>
            </div>
            <ResponsiveContainer width="100%" height={isMobile?115:145}>
              <AreaChart data={stats.barData} margin={{ top:6, right:6, left:-28, bottom:0 }}>
                <defs>
                  <linearGradient id="labAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={G}  stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={G2} stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode?'rgba(74,222,128,0.1)':'#f6faf7'} vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:9, fill:muted }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:9, fill:muted }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip darkMode={darkMode} bdr={bdr} txt={txt}/>} cursor={{ stroke:G, strokeWidth:1, strokeDasharray:'4 4' }}/>
                <Area type="monotone" dataKey="count" stroke={G} strokeWidth={2.5} fill="url(#labAreaGrad)" dot={{ fill:G, r:3, strokeWidth:0 }} activeDot={{ r:5, fill:G, strokeWidth:0 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="ld-hover-lift" style={{ background:cardBg, borderRadius:18, padding:isMobile?14:22, border:`1px solid ${bdr}`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:darkMode?'#4ade80':G, marginBottom:3 }}>Laboratory Test Breakdown</div>
            <div style={{ fontSize:10, color:muted, marginBottom:14 }}>All-time volume by category</div>
            {stats.pieData.length === 0
              ? <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', color:muted, fontSize:11, flexDirection:'column', gap:6 }}>
                  <FlaskConical size={32} color={muted}/>
                  <span>No data yet</span>
                </div>
              : <>
                  <ResponsiveContainer width="100%" height={isMobile?88:105}>
                    <PieChart>
                      <Pie data={stats.pieData} innerRadius={isMobile?30:38} outerRadius={isMobile?46:54} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {stats.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize:11, background:darkMode?'#0d2516':'#ffffff', border:`1px solid ${bdr}`, borderRadius:10 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                    {stats.pieData.map((d, i) => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:9, height:9, borderRadius:3, background:PIE_COLORS[i%PIE_COLORS.length], flexShrink:0 }}/>
                        <span style={{ flex:1, fontSize:11, color:txt2 }}>{d.name}</span>
                        <div style={{ width:44, height:5, borderRadius:3, background:darkMode?'rgba(74,222,128,0.1)':'#f6faf7', overflow:'hidden' }}>
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

      {/* RIGHT SIDEBAR */}
      <div className="ld-side" style={{
        width:isMobile?0:400, flexShrink:0, background:sideBg,
        borderLeft:`1px solid ${bdr}`,
        display:'flex', flexDirection:'column',
        height:'calc(100dvh - 64px)', maxHeight:'calc(100dvh - 64px)', position:'sticky', top:0, overflow:'hidden',
      }}>

        <div style={{ padding:'18px 14px 12px', borderBottom:`1px solid ${bdr}`, flexShrink:0 }}>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:800, color:darkMode?'#4ade80':G }}>Pending Patients</div>
            <div style={{ background:`linear-gradient(135deg,${G},${G2})`, color:'#ffffff', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:800, boxShadow:'0 2px 8px rgba(21,128,61,0.28)' }}>
              {pending.length}
            </div>
          </div>

          {/* Queue tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            <button onClick={()=>{ setQueueTab('available'); setFilter('All') }} style={{
              flex:1, padding:'8px 0', borderRadius:10, fontSize:11, fontWeight:800,
              cursor:'pointer', border:'none',
              background: queueTab==='available' ? `linear-gradient(135deg,${G},${G2})` : (darkMode?'rgba(74,222,128,0.1)':'#dcfce7'),
              color: queueTab==='available' ? '#ffffff' : (darkMode?'#dcfce7':G),
              boxShadow: queueTab==='available' ? '0 3px 10px rgba(21,128,61,0.28)' : 'none',
              transition:'all 0.15s',
            }}>
              In Queue
              <span style={{ marginLeft:5, background:queueTab==='available'?'rgba(255,255,255,0.25)':`${G}22`, borderRadius:20, padding:'1px 7px', fontSize:10 }}>
                {availablePatients.length}
              </span>
            </button>
            <button onClick={()=>{ setQueueTab('unavailable'); setFilter('All') }} style={{
              flex:1, padding:'8px 0', borderRadius:10, fontSize:11, fontWeight:800,
              cursor:'pointer', border:'none',
              background: queueTab==='unavailable' ? 'linear-gradient(135deg,#166534,#16a34a)' : (darkMode?'#0f2e1a':'#f6faf7'),
              color: queueTab==='unavailable' ? '#ffffff' : '#166534',
              boxShadow: queueTab==='unavailable' ? '0 3px 10px rgba(234,88,12,0.28)' : 'none',
              transition:'all 0.15s',
            }}>
              Not Available
              <span style={{ marginLeft:5, background:queueTab==='unavailable'?'rgba(255,255,255,0.25)':'#dcfce7', borderRadius:20, padding:'1px 7px', fontSize:10, color:queueTab==='unavailable'?'#ffffff':'#166534' }}>
                {unavailablePatients.length}
              </span>
            </button>
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:10 }}>
            <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={ptSearch} onChange={e=>setPtSearch(e.target.value)} placeholder="Search patients..."
              style={{ width:'100%', background:darkMode?'#0f2e1a':'#f6faf7', border:`1.5px solid ${bdr}`, borderRadius:10, padding:'8px 10px 8px 30px', fontSize:11, outline:'none', color:txt, boxSizing:'border-box', transition:'border 0.15s' }}
              onFocus={e=>(e.currentTarget.style.borderColor=G)}
              onBlur={e=>(e.currentTarget.style.borderColor=bdr)}
            />
          </div>

          {queueTab === 'available' && (
            <div className="ld-filter-scroll" style={{ display:'flex', gap:4, overflowX:'hidden', paddingBottom:3, flexWrap:'wrap' }}>
              {TEST_FILTERS.map(f => (
                <div key={f} className="ld-pill" onClick={()=>setFilter(f)} style={{
                  padding:'4px 9px', borderRadius:20, fontSize:9, fontWeight:800, whiteSpace:'nowrap', flexShrink:0,
                  background: filter===f ? `linear-gradient(135deg,${G},${G2})` : (darkMode?'rgba(74,222,128,0.1)':'#dcfce7'),
                  color: filter===f ? '#ffffff' : (darkMode?'#dcfce7':G),
                  border:`1px solid ${filter===f ? 'transparent' : (darkMode?'rgba(74,222,128,0.1)':'rgba(22,163,74,0.15)')}`,
                  boxShadow: filter===f ? '0 2px 10px rgba(21,128,61,0.25)' : 'none',
                }}>
                  {f}
                </div>
              ))}
            </div>
          )}

          {queueTab === 'unavailable' && (
            <div style={{ background:'#f6faf7', border:'1px solid rgba(22,163,74,0.15)', borderRadius:10, padding:'8px 10px', fontSize:10, color:'#166534', fontWeight:600, lineHeight:1.5 }}>
              Tests not available here (X-ray,Gene Xpert, AFB/DSSM, Culture & Sensitivity).
            </div>
          )}
        </div>

        {/* Patient list */}
        <div className="ld-patient-list" style={{ flex:1, minHeight:0, overflowY:'auto', overflowX:'hidden', padding:'8px 10px' }}>
          {loading ? (
            <div style={{ padding:28, textAlign:'center', color:muted, fontSize:12 }}>Loading...</div>
          ) : filteredPending.length === 0 ? (
            <div style={{ padding:28, textAlign:'center' }}>
              <CheckCircle2 size={36} color={queueTab==='unavailable'?'#166534':muted} style={{ margin:'0 auto 8px', display:'block' }}/>
              <div style={{ fontSize:12, fontWeight:700, color:queueTab==='unavailable'?'#166534':muted }}>
                {ptSearch ? 'No patients match' : queueTab==='unavailable' ? 'No unavailable requests' : 'No pending requests!'}
              </div>
              {ptSearch && <div style={{ fontSize:10, color:G, marginTop:6, cursor:'pointer', textDecoration:'underline' }} onClick={()=>setPtSearch('')}>Clear search</div>}
            </div>
          ) : filteredPending.map(p => {
            const isSel        = selPatient?.id === p.id
            const unknownTests = p.tests
              ? Object.entries(p.tests).filter(([k,v]) => v && !KNOWN_TESTS.includes(k))
              : []
            const hasUnknown   = unknownTests.length > 0
            const isUnavail    = queueTab === 'unavailable'

            return (
              <div key={p.id}
                onClick={()=>setSelPatient(isSel ? null : p)}
                onMouseEnter={e=>{
                  if (!isSel) {
                    e.currentTarget.style.background  = isUnavail ? '#f6faf7' : (darkMode?'#0f2e1a':'#dcfce7')
                    e.currentTarget.style.borderColor = isUnavail ? '#166534' : G
                    e.currentTarget.style.transform   = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow   = isUnavail ? '0 6px 18px rgba(234,88,12,0.14)' : `0 6px 18px rgba(21,128,61,0.14)`
                  }
                }}
                onMouseLeave={e=>{
                  if (!isSel) {
                    e.currentTarget.style.background  = pBg
                    e.currentTarget.style.borderColor = isUnavail ? 'rgba(22,163,74,0.15)' : pBdr
                    e.currentTarget.style.transform   = 'translateY(0)'
                    e.currentTarget.style.boxShadow   = '0 1px 4px rgba(0,0,0,0.04)'
                  }
                }}
                style={{
                  background: isSel ? (isUnavail?'#f6faf7':(darkMode?'#0f2e1a':'#dcfce7')) : pBg,
                  border:`1.5px solid ${isSel ? (isUnavail?'#166534':G) : (isUnavail?'rgba(22,163,74,0.15)':pBdr)}`,
                  borderRadius:12, padding:'11px 12px', marginBottom:8,
                  boxShadow: isSel ? (isUnavail?'0 4px 14px rgba(234,88,12,0.15)':`0 4px 14px rgba(21,128,61,0.15)`) : '0 1px 4px rgba(0,0,0,0.04)',
                  transition:'all 0.15s', cursor:'pointer',
                }}>

                {isSel && <div style={{ height:2, background:isUnavail?'linear-gradient(90deg,#166534,#16a34a)':`linear-gradient(90deg,${G},${G2})`, borderRadius:99, marginBottom:8, marginLeft:-12, marginRight:-12, marginTop:-11 }}/>}

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, flex:1, marginRight:6, minWidth:0 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:isUnavail?'linear-gradient(135deg,#166534,#16a34a)':`linear-gradient(135deg,${G},${G2})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#ffffff', fontWeight:800, fontSize:11, flexShrink:0 }}>
                      {(p.name||'?')[0].toUpperCase()}
                    </div>
                    <div style={{ fontWeight:700, fontSize:12, color:isUnavail?'#166534':subClr, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                    <div style={{ fontSize:9, color:muted, background:darkMode?'rgba(74,222,128,0.1)':'#f6faf7', borderRadius:8, padding:'2px 7px' }}>
                      {new Date(p.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}
                    </div>
                    {hasUnknown && (
                      <div style={{ fontSize:8, fontWeight:800, color:'#166534', background:'#f6faf7', border:'1px solid rgba(22,163,74,0.15)', borderRadius:8, padding:'2px 7px', whiteSpace:'nowrap' }}>
                        +{unknownTests.length} other
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize:10, color:txt2, marginBottom:6, paddingLeft:35 }}>
                  {[p.age ? p.age+' yrs' : null, p.gender, p.address].filter(Boolean).join(' · ')}
                </div>

                <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:isSel?10:0 }}>
                  {p.tests && Object.entries(p.tests).filter(([,v])=>v).map(([k]) => {
                    const isUnavailTest = UNAVAILABLE_TESTS.includes(k)
                    return (
                      <span key={k} style={{
                        fontSize:9, fontWeight:700, borderRadius:10, padding:'2px 7px',
                        background: isUnavailTest ? '#f6faf7' : (darkMode?'rgba(74,222,128,0.1)':'#dcfce7'),
                        color:      isUnavailTest ? '#166534' : subClr,
                        border:`1px solid ${isUnavailTest ? 'rgba(22,163,74,0.15)' : (darkMode?'rgba(74,222,128,0.1)':'rgba(22,163,74,0.15)')}`,
                      }}>
                        {TEST_LABEL_MAP[k]||k}
                      </span>
                    )
                  })}
                </div>

                {isSel && (
                  <div style={{ display:'flex', gap:7, marginTop:2, borderTop:`1px solid ${isUnavail?'rgba(22,163,74,0.15)':`${G}22`}`, paddingTop:10 }}>
                    {!isUnavail && (
                      <button className="ld-btn"
                        onClick={e=>{ e.stopPropagation(); onOpenLabForm(p) }}
                        style={{ flex:1, background:`linear-gradient(135deg,${G},${G2})`, color:'#ffffff', border:'none', borderRadius:9, padding:'9px 0', fontSize:11, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, boxShadow:`0 4px 12px rgba(21,128,61,0.3)` }}>
                        <Microscope size={13}/> Test Patient
                      </button>
                    )}
                    {isUnavail && (
                      <button className="ld-btn"
                        onClick={e=>{ e.stopPropagation(); setPrintPatient(p); setShowPrintForm(true) }}
                        style={{ flex:1, background:'linear-gradient(135deg,#166534,#16a34a)', color:'#ffffff', border:'none', borderRadius:9, padding:'9px 0', fontSize:11, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 12px rgba(234,88,12,0.3)', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                         Print
                      </button>
                    )}
                    <button className="ld-btn"
                      onClick={e=>{ e.stopPropagation(); onCancelRequest && onCancelRequest(p) }}
                      style={{ flex:isUnavail?1:1, background:'#dcfce7', color:'#16a34a', border:'1.5px solid rgba(22,163,74,0.15)', borderRadius:9, padding:'9px 0', fontSize:11, fontWeight:800, cursor:'pointer' }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Print form modal */}
      {showPrintForm && printPatient && (
        <LabRequestPrintForm
          patient={printPatient}
          onClose={() => { setShowPrintForm(false); setPrintPatient(null) }}
        />
      )}

    </div>
  )
}