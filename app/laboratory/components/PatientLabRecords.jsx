'use client'
import { useState, useEffect } from "react"
import { fetchAllRequests } from "./labService"
import ViewResultModal from "./ViewResultModal"

const GREEN = '#1a7a1a'

export default function PatientLabRecords({ darkMode }) {
  const [requests,     setRequests]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [selRows,      setSelRows]      = useState([])
  const [sortMode,     setSortMode]     = useState('none')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [showExport,   setShowExport]   = useState(false)
  const [viewModal,    setViewModal]    = useState({ open:false, request:null })

  const bg   = darkMode ? '#0d1a0f' : '#f5f7f5'
  const card = darkMode ? '#0f2014' : '#fff'
  const bdr  = darkMode ? '#1a3d24' : '#e5e7eb'
  const txt2 = darkMode ? '#6ee7b7' : '#6b7280'
  const muted= darkMode ? '#3a6b48' : '#bbb'

  const load = async () => { setLoading(true); const d = await fetchAllRequests(); setRequests(d); setLoading(false) }
  useEffect(() => { load() }, [])

  let display = requests.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    return !search || (p.name||'').toLowerCase().includes(search.toLowerCase())
  })
  if (sortMode==='az')   display=[...display].sort((a,b)=>(a.name||'').localeCompare(b.name||''))
  if (sortMode==='asc')  display=[...display].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))
  if (sortMode==='desc') display=[...display].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))

  const allSel    = display.length>0 && display.every(p=>selRows.includes(p.id))
  const toggleAll = () => setSelRows(allSel?[]:display.map(p=>p.id))
  const toggleOne = id => setSelRows(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])

  const exportCSV = () => {
    const rows=display.map((p,i)=>[i+1,p.name,p.age,p.gender,p.address,p.contact,p.email,p.test,p.status,p.request_date].join(','))
    const blob=new Blob([['No.,Name,Age,Sex,Address,Contact,Email,Test,Status,Date',...rows].join('\n')],{type:'text/csv'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lab-records.csv';a.click()
  }

  const TBBtn=({label,active,fn})=>(
    <button onClick={fn} style={{ padding:'4px 10px', borderRadius:5, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', background:active?'#fff':'rgba(255,255,255,0.2)', color:active?GREEN:'#fff' }}>{label}</button>
  )

  const ROWS=12

  return (
    <>
      <div style={{ padding:'18px 22px', background:bg, minHeight:'100%' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          <div style={{ fontSize:22, fontWeight:900, color:darkMode?'#4ade80':GREEN }}>Patient Laboratory Record</div>

          {/* Status filter */}
          <div style={{ display:'flex', gap:5 }}>
            {[['all','All'],['pending','Pending'],['completed','Completed']].map(([v,l])=>(
              <div key={v} onClick={()=>setStatusFilter(v)} style={{ padding:'3px 12px', borderRadius:20, fontSize:11, cursor:'pointer', fontWeight:600, background:statusFilter===v?GREEN:(darkMode?'#1a3d24':'#f0fdf4'), color:statusFilter===v?'#fff':(darkMode?'#86efac':GREEN), border:`1px solid ${statusFilter===v?GREEN:(darkMode?'#1a3d24':'#bbf7d0')}` }}>
                {l}
              </div>
            ))}
          </div>

          <button onClick={load} style={{ background:GREEN, color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>↻</button>

          {/* Export */}
          <div style={{ position:'relative', marginLeft:'auto' }}>
            <button onClick={()=>setShowExport(p=>!p)} style={{ background:GREEN, color:'#fff', border:'none', borderRadius:4, padding:'5px 14px', fontWeight:700, fontSize:11, cursor:'pointer' }}>EXPORT ▾</button>
            {showExport && (
              <div style={{ position:'absolute', right:0, top:'110%', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, zIndex:99, minWidth:110, boxShadow:'0 4px 12px rgba(0,0,0,0.12)', overflow:'hidden' }}>
                {[{label:'📋 CSV',fn:()=>{exportCSV();setShowExport(false)}},{label:'📄 PDF',fn:()=>{window.print();setShowExport(false)}}].map(({label,fn})=>(
                  <button key={label} onClick={fn} style={{ width:'100%', padding:'8px 14px', textAlign:'left', border:'none', background:'#fff', cursor:'pointer', fontSize:12 }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ background:GREEN, borderRadius:'8px 8px 0 0', padding:'8px 12px', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <label style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
            <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ width:12, height:12, accentColor:'#fff' }}/>
            <span style={{ color:'#fff', fontSize:11, fontWeight:600 }}>Select All</span>
          </label>
          <div style={{ width:1, height:14, background:'rgba(255,255,255,0.3)', margin:'0 2px' }}/>
          <TBBtn label="A–Z"          active={sortMode==='az'}   fn={()=>setSortMode(s=>s==='az'  ?'none':'az')}/>
          <TBBtn label="Newest First" active={sortMode==='desc'} fn={()=>setSortMode(s=>s==='desc'?'none':'desc')}/>
          <TBBtn label="Oldest First" active={sortMode==='asc'}  fn={()=>setSortMode(s=>s==='asc' ?'none':'asc')}/>
          <div style={{ position:'relative' }}>
            <svg style={{ position:'absolute', left:7, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient..." style={{ background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:5, padding:'4px 8px 4px 22px', color:'#fff', fontSize:11, outline:'none', width:150 }}/>
          </div>
          <div style={{ flex:1 }}/>
          <span style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>{display.length} record{display.length!==1?'s':''}</span>
        </div>

        {/* Table */}
        <div style={{ background:card, borderRadius:'0 0 8px 8px', overflow:'auto', border:`2px solid ${GREEN}`, borderTop:'none' }}>
          {loading
            ? <div style={{ padding:28, textAlign:'center', color:muted, fontSize:12 }}>Loading records…</div>
            : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:darkMode?'#0a1a0d':'#f9fafb' }}>
                    {['','No.','Name','Age','Sex','Address','Contact','Test Requested','Date','Status','Action'].map((h,i)=>(
                      <th key={i} style={{ padding:'8px 7px', textAlign:'left', fontWeight:700, color:GREEN, borderBottom:`2px solid ${GREEN}`, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {display.map((p,i)=>{
                    const isSel=selRows.includes(p.id)
                    const rowBg=isSel?'#dcfce7':i%2===0?(darkMode?'#0f2014':'#fff'):(darkMode?'#0d1c11':'#fafff8')
                    return (
                      <tr key={p.id} style={{ background:rowBg, borderBottom:`1px solid ${bdr}`, transition:'background 0.1s' }}
                        onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background=darkMode?'#1a3d22':'#f0fdf4' }}
                        onMouseLeave={e=>{ e.currentTarget.style.background=rowBg }}>
                        <td style={{ padding:'7px 7px' }}><input type="checkbox" checked={isSel} onChange={()=>toggleOne(p.id)} style={{ accentColor:GREEN }}/></td>
                        <td style={{ padding:'7px 7px', color:muted }}>{i+1}</td>
                        <td style={{ padding:'7px 7px', fontWeight:600, color:darkMode?'#c8e6c9':'#166534', whiteSpace:'nowrap' }}>{p.name}</td>
                        <td style={{ padding:'7px 7px', color:txt2 }}>{p.age||'—'}</td>
                        <td style={{ padding:'7px 7px', color:txt2 }}>{p.gender||'—'}</td>
                        <td style={{ padding:'7px 7px', color:txt2, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.address||'—'}</td>
                        <td style={{ padding:'7px 7px', color:txt2, whiteSpace:'nowrap' }}>{p.contact||'—'}</td>
                        <td style={{ padding:'7px 7px' }}>
                          <span style={{ padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700, background:'#dcfce7', color:GREEN }}>{p.test}</span>
                        </td>
                        <td style={{ padding:'7px 7px', color:txt2, whiteSpace:'nowrap' }}>
                          {p.request_date ? new Date(p.request_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                        </td>
                        <td style={{ padding:'7px 7px' }}>
                          <span style={{ padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700, background:p.status==='completed'?'#dcfce7':p.status==='pending'?'#fef3c7':'#fee2e2', color:p.status==='completed'?GREEN:p.status==='pending'?'#92400e':'#dc2626', textTransform:'capitalize' }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding:'7px 7px' }}>
                          {/* VIEW → opens ViewResultModal (read-only, Image 2) */}
                          <button
                            onClick={() => setViewModal({ open:true, request:p })}
                            style={{ padding:'4px 12px', borderRadius:5, fontSize:11, fontWeight:700, color:'#fff', border:'none', background:GREEN, cursor:'pointer' }}>
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {display.length === 0 && !loading && (
                    <tr><td colSpan={11} style={{ padding:28, textAlign:'center', color:muted, fontSize:12 }}>No records found</td></tr>
                  )}
                  {Array.from({length:Math.max(0,ROWS-display.length)}).map((_,i)=>(
                    <tr key={'e'+i} style={{ background:(display.length+i)%2===0?(darkMode?'#0f2014':'#fff'):(darkMode?'#0d1c11':'#fafff8'), borderBottom:`1px solid ${bdr}` }}>
                      <td style={{ padding:'7px 7px' }}/><td style={{ padding:'7px 7px', color:'#eee' }}>{display.length+i+1}</td>
                      {Array(9).fill(null).map((_,j)=><td key={j} style={{ padding:'7px 7px' }}/>)}
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>

      {/* View Result Modal — read-only, Image 2 style */}
      <ViewResultModal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open:false, request:null })}
        request={viewModal.request}
      />
    </>
  )
}
