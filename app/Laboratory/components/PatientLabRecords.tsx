'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Download, X, ChevronDown } from 'lucide-react'
import { fetchAllRequests } from './LabService'
import ViewResultModal from './ViewResultModal'

const C = {
  green:  '#16a34a',
  teal:   '#0d9488',
  blue:   '#2563eb',
  purple: '#7c3aed',
  orange: '#ea580c',
  pink:   '#db2777',
  yellow: '#ca8a04',
  red:    '#dc2626',
}

const TEST_TYPES = ['All Tests','Fecalysis','Urinalysis','Hematology','Clinical Chemistry','Serology']
const PER_PAGE   = 12

/* Avatar gradient based on sex */
const avatarGrad = (gender) => {
  const g = (gender||'').toLowerCase()
  if (g === 'female' || g === 'f') return 'linear-gradient(135deg,#db2777,#ec4899)'  // pink
  if (g === 'male'   || g === 'm') return 'linear-gradient(135deg,#2563eb,#3b82f6)'  // blue
  return 'linear-gradient(135deg,#16a34a,#0d9488)'                                    // default green
}

function FilterBtn({ label, active, onClick, activeColor = C.green }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:700,
        cursor:'pointer', border: active ? 'none' : `1.5px solid rgba(22,163,74,0.25)`,
        background: active ? activeColor : hov ? 'rgba(22,163,74,0.08)' : 'transparent',
        color: active ? '#fff' : C.green, transition:'all 0.15s',
        boxShadow: active ? `0 4px 12px ${activeColor}44` : 'none', whiteSpace:'nowrap',
      }}>
      {label}
    </button>
  )
}

function Chip({ label, onRemove }) {
  return (
    <span style={{ fontSize:11, borderRadius:20, padding:'3px 10px 3px 12px', fontWeight:700, display:'inline-flex', alignItems:'center', gap:4, background:'rgba(22,163,74,0.12)', color:C.green, border:'1px solid rgba(22,163,74,0.25)' }}>
      {label}
      <button onClick={onRemove} style={{ background:'none', border:'none', cursor:'pointer', color:C.green, fontSize:13, padding:0, lineHeight:1, display:'flex', alignItems:'center' }}>
        <X size={11}/>
      </button>
    </span>
  )
}

export default function PatientLabRecords({ darkMode = false }) {
  const dk   = darkMode
  const bg   = dk ? '#0d1a0f' : '#f0f4f1'
  const card = dk ? '#0f2014' : '#ffffff'
  const bdr  = dk ? '#1a3d24' : '#e5e7eb'
  const txt  = dk ? '#e2f5e9' : '#1f2937'
  const txt2 = dk ? '#6ee7b7' : '#6b7280'

  const [requests,    setRequests]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState([])
  const [viewModal,   setViewModal]   = useState({ open:false, request:null })
  const [showExport,  setShowExport]  = useState(false)
  const [isMobile,    setIsMobile]    = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const exportRef = useRef(null)

  /* ── Filters ── */
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [testFilter,   setTestFilter]   = useState('All Tests')
  const [sortMode,     setSortMode]     = useState('desc')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [barangay,     setBarangay]     = useState('')
  const [page,         setPage]         = useState(1)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const h = e => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const load = async () => { setLoading(true); const d = await fetchAllRequests(); setRequests(d||[]); setLoading(false) }
  useEffect(() => { load() }, [])

  /* ── Derived: unique barangays ── */
  const barangayOptions = useMemo(() => {
    const set = new Set(requests.map(r => r.address).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [requests])

  /* ── Filtered + sorted list ── */
  const display = useMemo(() => {
    let d = requests.filter(p => {
      // Status
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      // Test type
      if (testFilter !== 'All Tests' && p.test !== testFilter) return false
      // Barangay
      if (barangay && barangay !== 'All' && p.address !== barangay) return false
      // Date range
      if (dateFrom) {
        const recDate = p.request_date ? new Date(p.request_date) : new Date(p.created_at)
        if (recDate < new Date(dateFrom)) return false
      }
      if (dateTo) {
        const recDate = p.request_date ? new Date(p.request_date) : new Date(p.created_at)
        if (recDate > new Date(dateTo + 'T23:59:59')) return false
      }
      // Search
      if (search) {
        const q    = search.toLowerCase()
        const full = `${p.name??''} ${p.test??''} ${p.email??''} ${p.contact??''} ${p.address??''}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
    if (sortMode==='az')   d = [...d].sort((a,b)=>(a.name||'').localeCompare(b.name||''))
    if (sortMode==='asc')  d = [...d].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))
    if (sortMode==='desc') d = [...d].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
    return d
  }, [requests, statusFilter, testFilter, barangay, dateFrom, dateTo, search, sortMode])

  const totalPages = Math.max(1, Math.ceil(display.length / PER_PAGE))
  const paginated  = display.slice((page-1)*PER_PAGE, page*PER_PAGE)
  useEffect(() => { setPage(1) }, [search, statusFilter, testFilter, barangay, dateFrom, dateTo, sortMode])

  const allSel    = paginated.length>0 && paginated.every(p=>selected.includes(p.id))
  const toggleAll = () => setSelected(allSel ? [] : paginated.map(p=>p.id))
  const toggleOne = id => setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])

  const activeFilterCount = [
    search, statusFilter!=='all'?statusFilter:null,
    testFilter!=='All Tests'?testFilter:null,
    barangay && barangay!=='All'?barangay:null,
    dateFrom, dateTo,
  ].filter(Boolean).length

  const clearAll = () => { setSearch(''); setStatusFilter('all'); setTestFilter('All Tests'); setBarangay(''); setDateFrom(''); setDateTo('') }

  /* ── Export ── */
  const HEADERS = ['No.','Name','Age','Sex','Address','Contact','Email','Test','Status','Date']
  const buildRows = () => display.map((p,i) => [
    i+1, p.name, p.age, p.gender, p.address, p.contact, p.email, p.test, p.status,
    p.request_date ? new Date(p.request_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—',
  ])
  const exportCSV = () => {
    const rows = buildRows().map(r=>r.map(v=>`"${v??''}"`).join(','))
    const blob = new Blob([[HEADERS.join(','),...rows].join('\n')],{type:'text/csv'})
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='lab-records.csv'; a.click()
    setShowExport(false)
  }
  const exportPDF = () => { window.print(); setShowExport(false) }

  const statusStyle = status => {
    if (status==='completed') return { bg:`${C.green}18`,  color:C.green,    border:`1px solid ${C.green}33` }
    if (status==='pending')   return { bg:'#fef3c718',     color:'#92400e',  border:'1px solid #fef3c733' }
    return                           { bg:`${C.red}18`,    color:C.red,      border:`1px solid ${C.red}33` }
  }

  const inputStyle = {
    width:'100%', boxSizing:'border-box', padding:'7px 10px',
    borderRadius:10, border:`1.5px solid ${bdr}`, fontSize:12,
    outline:'none', color:txt, background:bg, transition:'border 0.15s',
  }
  const labelStyle = { fontSize:11, fontWeight:700, color:txt2, textTransform:'uppercase', letterSpacing:0.7, marginBottom:4, display:'block' }

  /* ── Stats summary ── */
  const stats = useMemo(() => ({
    total:     display.length,
    pending:   display.filter(p=>p.status==='pending').length,
    completed: display.filter(p=>p.status==='completed').length,
  }), [display])

  /* ── Mobile Card ── */
  const MobileCard = ({ p }) => {
    const sel = selected.includes(p.id)
    const st  = statusStyle(p.status)
    return (
      <div onClick={() => toggleOne(p.id)} style={{ background:sel?`${C.green}08`:card, border:`1px solid ${sel?C.green:bdr}`, borderRadius:14, padding:'14px 16px', marginBottom:10, cursor:'pointer', transition:'all 0.15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <input type="checkbox" checked={sel} onChange={()=>toggleOne(p.id)} onClick={e=>e.stopPropagation()} style={{ accentColor:C.green, width:14, height:14, flexShrink:0 }}/>
          <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:avatarGrad(p.gender), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13 }}>
            {(p.name||'?')[0]}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, color:txt, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name||'—'}</div>
            <div style={{ fontSize:11, color:txt2 }}>{p.test||'—'}</div>
          </div>
          <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:800, background:st.bg, color:st.color, border:st.border, flexShrink:0, textTransform:'capitalize' }}>{p.status}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px', fontSize:12, marginBottom:10 }}>
          {[['Age',p.age||'—'],['Sex',p.gender||'—'],['Contact',p.contact||'—'],['Barangay',p.address||'—'],['Date',p.request_date?new Date(p.request_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):'—']].map(([k,v])=>(
            <div key={k}><span style={{ color:txt2, fontWeight:600 }}>{k}: </span><span style={{ color:txt }}>{v}</span></div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setViewModal({open:true,request:p})}
            style={{ flex:1, padding:'7px 0', borderRadius:8, fontSize:12, fontWeight:800, color:'#fff', border:'none', cursor:'pointer', background:`linear-gradient(135deg,${C.green},${C.teal})` }}>
            View Result
          </button>
        </div>
      </div>
    )
  }

  return (
    <main style={{ flex:1, padding:isMobile?14:24, overflowY:'auto', background:bg }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', flexDirection:isMobile?'column':'row', justifyContent:'space-between', alignItems:isMobile?'flex-start':'flex-end', gap:isMobile?12:0, marginBottom:20 }}>
        <div>
          <p style={{ color:dk?'#4ade80':txt2, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:4 }}>Laboratory</p>
          <h1 style={{ fontSize:isMobile?26:34, fontWeight:900, color:dk?'#4ade80':C.green, margin:0, lineHeight:1 }}>Patient Lab Records</h1>
          <p style={{ color:txt2, fontSize:12, marginTop:4 }}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignSelf:isMobile?'stretch':'auto' }}>
          <button onClick={()=>setShowFilters(f=>!f)}
            style={{ padding:'10px 16px', borderRadius:12, fontSize:12, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:C.green, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <span>🔍</span> Filters {activeFilterCount>0 && <span style={{ background:C.green, color:'#fff', borderRadius:20, padding:'1px 7px', fontSize:10, fontWeight:800 }}>{activeFilterCount}</span>}
            <ChevronDown size={13} style={{ transform:showFilters?'rotate(180deg)':'rotate(0)', transition:'transform 0.2s' }}/>
          </button>
          <button onClick={load}
            style={{ background:`linear-gradient(135deg,${C.green},${C.teal})`, color:'#fff', border:'none', borderRadius:12, padding:'10px 20px', cursor:'pointer', fontWeight:800, fontSize:13, display:'flex', alignItems:'center', gap:6 }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Result summary bar ── */}
      <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
        {[
          { label:'Total', value:stats.total,     color:C.teal  },
          { label:'Pending',   value:stats.pending,    color:C.orange},
          { label:'Completed', value:stats.completed,  color:C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:card, border:`1px solid ${bdr}`, borderRadius:10, padding:'7px 14px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color }}/>
            <span style={{ fontSize:11, color:txt2, fontWeight:600 }}>{label}</span>
            <span style={{ fontSize:14, fontWeight:900, color:color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Filter Panel (collapsible) ── */}
      {showFilters && (
        <div style={{ background:card, borderRadius:20, padding:isMobile?'14px':20, marginBottom:14, border:`1px solid ${bdr}`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* Row 1: Search + Export */}
          <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
            <div style={{ position:'relative', flex:1 }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:txt2, fontSize:15, pointerEvents:'none' }}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search name, test, contact, barangay…"
                style={{ ...inputStyle, paddingLeft:34 }}
                onFocus={e=>e.currentTarget.style.borderColor=C.green}
                onBlur={e=>e.currentTarget.style.borderColor=bdr}/>
              {search && (
                <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:txt2, display:'flex', padding:0 }}>
                  <X size={14}/>
                </button>
              )}
            </div>
            <div ref={exportRef} style={{ position:'relative', flexShrink:0 }}>
              <button onClick={()=>setShowExport(p=>!p)}
                style={{ padding:'7px 14px', borderRadius:12, fontSize:12, fontWeight:800, border:`1.5px solid ${bdr}`, background:card, color:C.green, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <Download size={13}/> {!isMobile&&'Export'} ▾
              </button>
              {showExport && (
                <div style={{ position:'absolute', right:0, top:'110%', background:card, border:`1px solid ${bdr}`, borderRadius:14, zIndex:99, minWidth:140, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
                  {[{label:'📄 PDF',fn:exportPDF},{label:'📋 CSV',fn:exportCSV}].map(({label,fn})=>(
                    <button key={label} onClick={fn} style={{ width:'100%', padding:'10px 16px', textAlign:'left', border:'none', background:'transparent', cursor:'pointer', fontSize:13, color:txt, display:'block', fontWeight:600 }}
                      onMouseEnter={e=>e.currentTarget.style.background=bg}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Status + Test Type + Sort */}
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:12, marginBottom:14 }}>

            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ display:'flex', gap:3, background:bg, borderRadius:24, padding:3, border:`1px solid ${bdr}` }}>
                {[['all','All'],['pending','Pending'],['completed','Completed']].map(([v,l])=>(
                  <button key={v} onClick={()=>{setStatusFilter(v);setSelected([])}}
                    style={{ flex:1, padding:'5px 0', borderRadius:20, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', transition:'all 0.15s',
                      background:statusFilter===v?`linear-gradient(135deg,${C.green},${C.teal})`:'transparent',
                      color:statusFilter===v?'#fff':txt2 }}>{l}</button>
                ))}
              </div>
            </div>

            {/* Test Type */}
            <div>
              <label style={labelStyle}>Test Type</label>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {TEST_TYPES.map(t=>(
                  <button key={t} onClick={()=>setTestFilter(t)}
                    style={{ padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:700, cursor:'pointer', border:'none', transition:'all 0.12s',
                      background:testFilter===t?C.teal:`${C.teal}12`,
                      color:testFilter===t?'#fff':C.teal }}>
                    {t==='All Tests'?'All':t}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <label style={labelStyle}>Sort by</label>
              <div style={{ display:'flex', gap:4 }}>
                {[['az','A–Z'],['asc','Oldest'],['desc','Newest']].map(([v,l])=>(
                  <FilterBtn key={v} label={l} active={sortMode===v} onClick={()=>setSortMode(s=>s===v?'none':v)}/>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Date Range + Barangay */}
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:12, marginBottom:activeFilterCount?12:0 }}>

            {/* Date From */}
            <div>
              <label style={labelStyle}>Date From</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                style={inputStyle}
                onFocus={e=>e.currentTarget.style.borderColor=C.green}
                onBlur={e=>e.currentTarget.style.borderColor=bdr}/>
            </div>

            {/* Date To */}
            <div>
              <label style={labelStyle}>Date To</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                style={inputStyle}
                onFocus={e=>e.currentTarget.style.borderColor=C.green}
                onBlur={e=>e.currentTarget.style.borderColor=bdr}/>
            </div>

            {/* Barangay */}
            <div>
              <label style={labelStyle}>Barangay</label>
              <select value={barangay} onChange={e=>setBarangay(e.target.value)}
                style={{ ...inputStyle, cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' }}>
                <option value="">All Barangays</option>
                {barangayOptions.filter(b=>b!=='All').map(b=>(
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:11, color:txt2, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Active:</span>
              {search          && <Chip label={`"${search}"`}   onRemove={()=>setSearch('')}/>}
              {statusFilter!=='all'      && <Chip label={statusFilter}  onRemove={()=>setStatusFilter('all')}/>}
              {testFilter!=='All Tests'  && <Chip label={testFilter}    onRemove={()=>setTestFilter('All Tests')}/>}
              {barangay&&barangay!=='All'&& <Chip label={barangay}      onRemove={()=>setBarangay('')}/>}
              {dateFrom        && <Chip label={`From: ${dateFrom}`}     onRemove={()=>setDateFrom('')}/>}
              {dateTo          && <Chip label={`To: ${dateTo}`}         onRemove={()=>setDateTo('')}/>}
              <button onClick={clearAll} style={{ fontSize:11, background:`${C.red}10`, border:'none', color:C.red, cursor:'pointer', fontWeight:800, padding:'2px 10px', borderRadius:20 }}>
                ✕ Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      {selected.length > 0 && (
        <div style={{ background:`${C.orange}12`, border:`1.5px solid ${C.orange}44`, borderRadius:14, padding:'12px 18px', marginBottom:14, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:800, color:C.orange }}>{selected.length} record{selected.length>1?'s':''} selected</span>
          <button onClick={()=>setSelected([])} style={{ fontSize:12, color:txt2, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Deselect all</button>
        </div>
      )}

      {/* ── Mobile Cards ── */}
      {isMobile ? (
        <div>
          {loading
            ? <div style={{ textAlign:'center', padding:48, color:txt2 }}>
                <div style={{ width:32, height:32, border:`3px solid ${C.green}`, borderTopColor:'transparent', borderRadius:'50%', margin:'0 auto 8px', animation:'spin 0.8s linear infinite' }}/>
                Loading records…
              </div>
            : paginated.length===0
              ? <div style={{ textAlign:'center', padding:48, color:txt2, fontSize:13 }}>No records found.</div>
              : paginated.map(p=><MobileCard key={p.id} p={p}/>)
          }
        </div>
      ) : (
        /* ── Desktop Table ── */
        <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:20, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:bg, borderBottom:`2px solid ${bdr}` }}>
                  <th style={{ padding:'12px 16px' }}>
                    <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ accentColor:C.green, width:14, height:14 }}/>
                  </th>
                  {['No.','Name','Age','Sex','Barangay','Contact','Test Requested','Date','Status','Action'].map((h,i)=>(
                    <th key={i} style={{ padding:'12px 12px', textAlign:'left', fontWeight:800, color:dk?'#4ade80':C.green, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} style={{ textAlign:'center', padding:48, color:txt2, fontSize:13 }}>
                    <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                      <div style={{ width:32, height:32, border:`3px solid ${C.green}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                      Loading records…
                    </div>
                  </td></tr>
                ) : paginated.length===0 ? (
                  <tr><td colSpan={11} style={{ textAlign:'center', padding:48, color:txt2, fontSize:13 }}>No records match your filters.</td></tr>
                ) : paginated.map((p,i)=>{
                  const sel   = selected.includes(p.id)
                  const st    = statusStyle(p.status)
                  const rowBg = sel?(dk?'#1a3d22':`${C.green}08`):i%2===0?card:(dk?'#0d1c11':'#fafff8')
                  return (
                    <tr key={p.id} onClick={()=>toggleOne(p.id)}
                      style={{ background:rowBg, borderBottom:`1px solid ${bdr}`, cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e=>{if(!sel)e.currentTarget.style.background=dk?'#1a3d22':`${C.green}05`}}
                      onMouseLeave={e=>{e.currentTarget.style.background=rowBg}}>
                      <td style={{ padding:'11px 16px' }} onClick={e=>e.stopPropagation()}>
                        <input type="checkbox" checked={sel} onChange={()=>toggleOne(p.id)} style={{ accentColor:C.green, width:14, height:14 }}/>
                      </td>
                      <td style={{ padding:'11px 12px', color:txt2, fontWeight:700 }}>{(page-1)*PER_PAGE+i+1}</td>
                      <td style={{ padding:'11px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:avatarGrad(p.gender), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:11 }}>
                            {(p.name||'?')[0]}
                          </div>
                          <div style={{ fontWeight:700, color:txt, fontSize:12, whiteSpace:'nowrap' }}>{p.name||'—'}</div>
                        </div>
                      </td>
                      <td style={{ padding:'11px 12px', color:txt, fontWeight:600 }}>{p.age||'—'}</td>
                      <td style={{ padding:'11px 12px', color:txt2 }}>{p.gender||'—'}</td>
                      <td style={{ padding:'11px 12px', color:txt, fontSize:11, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={p.address}>{p.address||'—'}</td>
                      <td style={{ padding:'11px 12px', color:txt2, whiteSpace:'nowrap' }}>{p.contact||'—'}</td>
                      <td style={{ padding:'11px 12px' }}>
                        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:800, background:`${C.teal}18`, color:C.teal, border:`1px solid ${C.teal}33`, whiteSpace:'nowrap' }}>{p.test||'—'}</span>
                      </td>
                      <td style={{ padding:'11px 12px', color:txt2, whiteSpace:'nowrap', fontSize:11 }}>
                        {p.request_date?new Date(p.request_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):'—'}
                      </td>
                      <td style={{ padding:'11px 12px' }}>
                        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:800, background:st.bg, color:st.color, border:st.border, textTransform:'capitalize' }}>{p.status}</span>
                      </td>
                      <td style={{ padding:'11px 12px' }} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>setViewModal({open:true,request:p})}
                          style={{ padding:'5px 14px', borderRadius:8, fontSize:11, fontWeight:800, color:'#fff', border:'none', cursor:'pointer', background:`linear-gradient(135deg,${C.green},${C.teal})`, boxShadow:`0 2px 8px ${C.green}44`, whiteSpace:'nowrap' }}>
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderTop:`1px solid ${bdr}`, background:bg, flexWrap:'wrap', gap:8 }}>
            <span style={{ fontSize:12, color:txt2, fontWeight:600 }}>
              {display.length===0?'No results':`Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE,display.length)} of ${display.length} records`}
            </span>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===1?txt2:C.green, cursor:page===1?'default':'pointer' }}>
                ← Prev
              </button>
              {Array.from({length:Math.min(totalPages,7)}).map((_,i)=>{
                const pg = totalPages<=7 ? i+1 : i<3 ? i+1 : i===3 ? page : i===4 ? totalPages-1 : i===5 ? totalPages : null
                if(!pg) return null
                return (
                  <button key={i} onClick={()=>setPage(pg)}
                    style={{ padding:'5px 11px', borderRadius:10, fontSize:12, fontWeight:800, border:'none', cursor:'pointer', transition:'all 0.15s',
                      background:page===pg?`linear-gradient(135deg,${C.green},${C.teal})`:'transparent',
                      color:page===pg?'#fff':txt2 }}>
                    {pg}
                  </button>
                )
              })}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===totalPages?txt2:C.green, cursor:page===totalPages?'default':'pointer' }}>
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile pagination */}
      {isMobile && display.length>PER_PAGE && (
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:16 }}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{ padding:'8px 18px', borderRadius:10, fontSize:13, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===1?txt2:C.green, cursor:page===1?'default':'pointer' }}>
            ← Prev
          </button>
          <span style={{ padding:'8px 14px', fontSize:13, color:txt2, fontWeight:600 }}>{page} / {totalPages}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
            style={{ padding:'8px 18px', borderRadius:10, fontSize:13, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===totalPages?txt2:C.green, cursor:page===totalPages?'default':'pointer' }}>
            Next →
          </button>
        </div>
      )}

      <ViewResultModal
        isOpen={viewModal.open}
        onClose={()=>setViewModal({open:false,request:null})}
        request={viewModal.request}
      />
    </main>
  )
}