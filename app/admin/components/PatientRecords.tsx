'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Archive, Download, X, Search } from 'lucide-react'

// ── Import the actual registrar components ──────────────────────────────────
import PatientInfo from '@/app/registrar/components/PatientInfo'
import AddPatientModal from '@/app/registrar/components/forms'

interface Patient {
  id: string
  last_name: string
  first_name: string
  middle_name?: string
  age: number
  sex: string
  birthdate: string
  purok?: string
  barangay: string
  municipality: string
  contact_number: string
  email: string
  created_at: string
}

const C = {
  green: '#1a7a1a', teal: '#0d9488', blue: '#2563eb',
  purple: '#7c3aed', orange: '#ea580c', pink: '#db2777',
}

const LOPEZ_BARANGAYS = [
  'Bacungan','Bagacay','Banabahin Ibaba','Banabahin Ilaya','Bayabas','Bebito','Bigajo',
  'Binahian A','Binahian B','Binahian C','Bocboc','Buenavista','Burgos (Poblacion)',
  'Buyacanin','Cagacag','Calantipayan','Canda Ibaba','Canda Ilaya','Cawayan','Cawayanin',
  'Cogorin Ibaba','Cogorin Ilaya','Concepcion','Danlagan (Poblacion)','De La Paz',
  'Del Pilar','Del Rosario','Esperanza Ibaba','Esperanza Ilaya','Gomez (Poblacion)',
  'Guihay','Guinuangan','Guites','Hondagua','Ilayang Ilog A','Ilayang Ilog B',
  'Inalusan','Jongo','Lalaguna','Lourdes','Mabanban','Mabini','Magallanes','Maguilayan',
  'Mahayod-Hayod','Mal-ay','Mandoog','Manguisian','Matinik','Magsaysay (Poblacion)',
  'Monteclaro','Pamampangin','Pansol','Peñafrancia','Pisipis','Rizal (Poblacion)',
  'Rizal (Rural)','Roma','Rosario','Samat','San Andres','San Antonio',
  'San Francisco A','San Francisco B','San Isidro','San Jose','San Lorenzo Ruiz (Poblacion)',
  'San Miguel (Dao)','San Pedro','San Rafael','San Roque','Silang','Sta. Catalina',
  'Sta. Elena','Sta. Jacobe','Sta. Lucia','Sta. Maria','Sta. Rosa','Sta. Teresa',
  'Sto. Niño Ibaba','Sto. Niño Ilaya','Sugod','Sumilang','Talolong (Poblacion)',
  'Tan-ag Ibaba','Tan-ag Ilaya','Tocalin','Vegaflor','Vergaña','Veronica',
  'Villa Aurora','Villa Espina','Villageda','Villahermosa','Villamonte','Villanacaob',
]

const AGE_GROUPS = [
  { label:'All Ages',            min:0,  max:999 },
  { label:'0–17 (Minor)',        min:0,  max:17  },
  { label:'18–35 (Young Adult)', min:18, max:35  },
  { label:'36–60 (Adult)',       min:36, max:60  },
  { label:'60+ (Senior)',        min:61, max:999 },
]

const PER_PAGE = 10

export default function PatientRecords({ darkMode }: { darkMode: boolean }) {
  const dk   = darkMode
  const bg   = dk ? '#0d1a0f' : '#f0f4f1'
  const card = dk ? '#0f2014' : '#ffffff'
  const bdr  = dk ? '#1a3d24' : '#e5e7eb'
  const txt  = dk ? '#e2f5e9' : '#1f2937'
  const txt2 = dk ? '#6ee7b7' : '#6b7280'

  const [patients,    setPatients]    = useState<Patient[]>([])
  const [loading,     setLoading]     = useState(true)
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
  const [viewPatient, setViewPatient] = useState<Patient | null>(null)
  const [open,        setOpen]        = useState(false)
  const [selected,    setSelected]    = useState<string[]>([])
  const [showExport,  setShowExport]  = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Filters
  const [search,    setSearch]    = useState('')
  const [viewMode,  setViewMode]  = useState<'all'|'active'|'archived'>('active')
  const [sexFilter, setSexFilter] = useState<'All'|'M'|'F'>('All')
  const [ageGroup,  setAgeGroup]  = useState('All Ages')
  const [barangay,  setBarangay]  = useState('All Barangays')
  const [sortMode,  setSortMode]  = useState<'az'|'desc'|'asc'|'none'>('desc')
  const [page,      setPage]      = useState(1)

  const fetchPatients = async () => {
    setLoading(true)
    const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false })
    setPatients((data as Patient[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchPatients() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const display = useMemo(() => {
    const ag = AGE_GROUPS.find(g => g.label === ageGroup) ?? AGE_GROUPS[0]
    let d = patients.filter(p => {
      if (viewMode === 'active'   && archivedIds.has(p.id))  return false
      if (viewMode === 'archived' && !archivedIds.has(p.id)) return false
      if (sexFilter !== 'All' && p.sex !== sexFilter) return false
      if (p.age < ag.min || p.age > ag.max) return false
      if (barangay !== 'All Barangays' && p.barangay !== barangay) return false
      if (search) {
        const q = search.toLowerCase()
        const full = `${p.last_name} ${p.first_name} ${p.middle_name??''} ${p.email} ${p.contact_number} ${p.barangay}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
    if (sortMode === 'az')   d = [...d].sort((a,b) => a.last_name.localeCompare(b.last_name))
    if (sortMode === 'asc')  d = [...d].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sortMode === 'desc') d = [...d].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return d
  }, [patients, archivedIds, viewMode, sexFilter, ageGroup, barangay, search, sortMode])

  useEffect(() => { setPage(1) }, [search, viewMode, sexFilter, ageGroup, barangay, sortMode])

  const totalPages = Math.max(1, Math.ceil(display.length / PER_PAGE))
  const paginated  = display.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const allSel     = paginated.length > 0 && paginated.every(p => selected.includes(p.id))

  const exportCSV = () => {
    const headers = ['No.','Last Name','First Name','Age','Sex','Birthdate','Barangay','Municipality','Contact','Email','Status']
    const rows = display.map((p,i) => [i+1,p.last_name,p.first_name,p.age,p.sex,p.birthdate,p.barangay,p.municipality,p.contact_number,p.email,archivedIds.has(p.id)?'Archived':'Active'].map(v=>`"${v??''}"`).join(','))
    const blob = new Blob([[headers.join(','),...rows].join('\n')],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='patients.csv'; a.click()
    URL.revokeObjectURL(url); setShowExport(false)
  }

  const SEL_BTN = (label: string, active: boolean, onClick: ()=>void, color=C.green) => (
    <button onClick={onClick} style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:700,
      cursor:'pointer', border: active?'none':`1.5px solid ${bdr}`,
      background: active ? color : 'transparent',
      color: active ? '#fff' : txt2, transition:'all 0.15s',
      boxShadow: active ? `0 4px 12px ${color}44` : 'none' }}>
      {label}
    </button>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:900, color: dk?'#4ade80':C.green }}>Patient Records</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:txt2 }}>
            Admin view — {display.length} patient{display.length!==1?'s':''} found
          </p>
        </div>
        <button onClick={() => setOpen(true)}
          style={{ background:`linear-gradient(135deg,${C.green},${C.teal})`, color:'#fff', border:'none',
            borderRadius:12, padding:'10px 22px', cursor:'pointer', display:'flex', alignItems:'center', gap:8,
            fontWeight:800, fontSize:13, boxShadow:`0 4px 16px ${C.green}44` }}>
          <Plus size={16}/> Add Patient
        </button>
      </div>

      {/* Filter Panel */}
      <div style={{ background:card, borderRadius:18, padding:'14px 18px', border:`1px solid ${bdr}`, display:'flex', flexDirection:'column', gap:10 }}>
        {/* Search + Export */}
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:txt2 }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name, email, contact, barangay..."
              style={{ width:'100%', boxSizing:'border-box', padding:'8px 36px 8px 34px', borderRadius:12,
                border:`1.5px solid ${bdr}`, fontSize:12, outline:'none', color:txt, background:bg }}
              onFocus={e=>(e.currentTarget.style.borderColor=C.green)}
              onBlur={e=>(e.currentTarget.style.borderColor=bdr)}/>
            {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:txt2, display:'flex', padding:0 }}><X size={13}/></button>}
          </div>
          <div ref={exportRef} style={{ position:'relative' }}>
            <button onClick={()=>setShowExport(p=>!p)}
              style={{ padding:'7px 14px', borderRadius:12, fontSize:12, fontWeight:800, border:`1.5px solid ${bdr}`,
                background:card, color:C.green, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <Download size={13}/> Export ▾
            </button>
            {showExport && (
              <div style={{ position:'absolute', right:0, top:'110%', background:card, border:`1px solid ${bdr}`, borderRadius:12, zIndex:99, minWidth:130, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
                {[{label:'📋 CSV', fn:exportCSV},{label:'📄 PDF', fn:()=>{window.print();setShowExport(false)}}].map(({label,fn})=>(
                  <button key={label} onClick={fn} style={{ width:'100%', padding:'9px 14px', textAlign:'left', border:'none', background:'transparent', cursor:'pointer', fontSize:12, color:txt, fontWeight:600 }}
                    onMouseEnter={e=>(e.currentTarget.style.background=bg)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* View mode */}
        <div style={{ display:'flex', gap:3, background:bg, borderRadius:24, padding:3, border:`1px solid ${bdr}`, width:'fit-content' }}>
          {(['all','active','archived'] as const).map(v=>(
            <button key={v} onClick={()=>{setViewMode(v);setSelected([])}}
              style={{ padding:'5px 16px', borderRadius:20, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
                background: viewMode===v?`linear-gradient(135deg,${C.green},${C.teal})`:'transparent',
                color: viewMode===v?'#fff':txt2, boxShadow: viewMode===v?`0 2px 8px ${C.green}44`:'none', transition:'all 0.15s' }}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {SEL_BTN('All',    sexFilter==='All', ()=>setSexFilter('All'))}
          {SEL_BTN('♀ Female', sexFilter==='F', ()=>setSexFilter('F'), C.pink)}
          {SEL_BTN('♂ Male',   sexFilter==='M', ()=>setSexFilter('M'), C.blue)}
          <div style={{ width:1, height:24, background:bdr }}/>
          <select value={ageGroup} onChange={e=>setAgeGroup(e.target.value)}
            style={{ padding:'5px 10px', borderRadius:12, border:`1.5px solid ${bdr}`, fontSize:12, color:txt, background:bg, cursor:'pointer', outline:'none', fontWeight:600 }}>
            {AGE_GROUPS.map(g=><option key={g.label}>{g.label}</option>)}
          </select>
          <select value={barangay} onChange={e=>setBarangay(e.target.value)}
            style={{ padding:'5px 10px', borderRadius:12, border:`1.5px solid ${bdr}`, fontSize:12, color:txt, background:bg, cursor:'pointer', outline:'none', fontWeight:600 }}>
            <option>All Barangays</option>
            {LOPEZ_BARANGAYS.map(b=><option key={b}>{b}</option>)}
          </select>
          <div style={{ width:1, height:24, background:bdr }}/>
          {SEL_BTN('A–Z',    sortMode==='az',   ()=>setSortMode(s=>s==='az'  ?'none':'az'))}
          {SEL_BTN('Oldest', sortMode==='asc',  ()=>setSortMode(s=>s==='asc' ?'none':'asc'))}
          {SEL_BTN('Newest', sortMode==='desc', ()=>setSortMode(s=>s==='desc'?'none':'desc'))}
        </div>
      </div>

      {/* Bulk action */}
      {selected.length > 0 && (
        <div style={{ background:`${C.orange}15`, border:`1.5px solid ${C.orange}44`, borderRadius:12,
          padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:13, fontWeight:800, color:C.orange }}>{selected.length} selected</span>
          <button onClick={()=>setSelected([])} style={{ fontSize:12, color:txt2, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Deselect</button>
          <div style={{ flex:1 }}/>
          <button onClick={()=>{setArchivedIds(prev=>new Set([...prev,...selected]));setSelected([])}}
            style={{ padding:'6px 16px', borderRadius:10, fontSize:12, fontWeight:800, border:'none', background:`linear-gradient(135deg,${C.orange},#ca8a04)`, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <Archive size={13}/> Archive ({selected.length})
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:18, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:bg, borderBottom:`2px solid ${bdr}` }}>
                <th style={{ padding:'12px 16px' }}>
                  <input type="checkbox" checked={allSel} onChange={()=>setSelected(allSel?[]:paginated.map(p=>p.id))} style={{ accentColor:C.green, width:14, height:14 }}/>
                </th>
                {['#','Name','Age','Sex','Birthdate','Address','Contact','Email','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'12px 12px', textAlign:'left', fontWeight:800, color: dk?'#4ade80':C.green, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ textAlign:'center', padding:48, color:txt2 }}>
                  <div style={{ width:28, height:28, border:`3px solid ${C.green}`, borderTopColor:'transparent', borderRadius:'50%', margin:'0 auto 8px', animation:'spin 0.8s linear infinite' }}/>
                  Loading patients…
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign:'center', padding:48, color:txt2, fontSize:13 }}>No patients found.</td></tr>
              ) : paginated.map((p,i) => {
                const sel = selected.includes(p.id)
                const isArchived = archivedIds.has(p.id)
                return (
                  <tr key={p.id} style={{ background: sel?(dk?'#1a3d22':'rgba(26,122,26,0.05)'):i%2===0?card:(dk?'#0d1c11':'#fafff8'), borderBottom:`1px solid ${bdr}`, transition:'background 0.1s', cursor:'pointer' }}
                    onClick={()=>setSelected(s=>s.includes(p.id)?s.filter(x=>x!==p.id):[...s,p.id])}>
                    <td style={{ padding:'11px 16px' }} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={sel} onChange={()=>setSelected(s=>s.includes(p.id)?s.filter(x=>x!==p.id):[...s,p.id])} style={{ accentColor:C.green, width:14, height:14 }}/>
                    </td>
                    <td style={{ padding:'11px 12px', color:txt2, fontWeight:700 }}>{(page-1)*PER_PAGE+i+1}</td>
                    <td style={{ padding:'11px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0,
                          background: p.sex==='F'?`linear-gradient(135deg,${C.pink},${C.purple})`:`linear-gradient(135deg,${C.blue},${C.teal})`,
                          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:11 }}>
                          {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, color:txt, fontSize:12 }}>{p.last_name}, {p.first_name}</div>
                          {p.middle_name&&<div style={{ fontSize:10, color:txt2 }}>{p.middle_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'11px 12px', color:txt, fontWeight:600 }}>{p.age}</td>
                    <td style={{ padding:'11px 12px' }}>
                      <span style={{ padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:800,
                        background: p.sex==='F'?`${C.pink}18`:`${C.blue}18`, color: p.sex==='F'?C.pink:C.blue }}>
                        {p.sex==='F'?'♀ F':'♂ M'}
                      </span>
                    </td>
                    <td style={{ padding:'11px 12px', color:txt2, fontSize:11 }}>{p.birthdate||'—'}</td>
                    <td style={{ padding:'11px 12px', color:txt, fontSize:11 }}>{[p.barangay,p.municipality].filter(Boolean).join(', ')||'—'}</td>
                    <td style={{ padding:'11px 12px', color:txt, fontSize:11 }}>{p.contact_number||'—'}</td>
                    <td style={{ padding:'11px 12px', color:txt, fontSize:11 }}>{p.email||'—'}</td>
                    <td style={{ padding:'11px 12px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:800,
                        background: isArchived?`${C.orange}15`:`${C.green}18`,
                        color: isArchived?C.orange:C.green,
                        border: isArchived?`1px solid ${C.orange}33`:`1px solid ${C.green}33` }}>
                        {isArchived?'Archived':'Active'}
                      </span>
                    </td>
                    <td style={{ padding:'11px 12px' }} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={()=>setViewPatient(p)}
                          style={{ padding:'4px 12px', borderRadius:8, fontSize:11, fontWeight:800, color:'#fff', border:'none', cursor:'pointer', background:`linear-gradient(135deg,${C.green},${C.teal})`, whiteSpace:'nowrap' }}>
                          View
                        </button>
                        {isArchived
                          ? <button onClick={()=>{const n=new Set(archivedIds);n.delete(p.id);setArchivedIds(n)}} style={{ padding:'4px 8px', borderRadius:8, fontSize:12, color:C.green, border:`1.5px solid ${C.green}44`, background:'transparent', cursor:'pointer' }}>↩</button>
                          : <button onClick={()=>setArchivedIds(prev=>new Set([...prev,p.id]))} style={{ padding:'4px 8px', borderRadius:8, fontSize:12, color:C.orange, border:'none', background:`${C.orange}18`, cursor:'pointer' }}>🗑️</button>
                        }
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderTop:`1px solid ${bdr}`, background:bg, flexWrap:'wrap', gap:8 }}>
          <span style={{ fontSize:12, color:txt2, fontWeight:600 }}>
            {display.length===0?'No results':`Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE,display.length)} of ${display.length} patients`}
          </span>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===1?txt2:C.green, cursor:page===1?'default':'pointer' }}>← Prev</button>
            {Array.from({length:totalPages}).map((_,i)=>(
              <button key={i} onClick={()=>setPage(i+1)}
                style={{ padding:'5px 11px', borderRadius:10, fontSize:12, fontWeight:800, border:'none', cursor:'pointer',
                  background: page===i+1?`linear-gradient(135deg,${C.green},${C.teal})`:'transparent',
                  color: page===i+1?'#fff':txt2, boxShadow: page===i+1?`0 2px 8px ${C.green}44`:'none' }}>
                {i+1}
              </button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===totalPages?txt2:C.green, cursor:page===totalPages?'default':'pointer' }}>Next →</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddPatientModal isOpen={open} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);fetchPatients()}}/>
      {viewPatient && <PatientInfo patient={viewPatient} onClose={()=>setViewPatient(null)}/>}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}