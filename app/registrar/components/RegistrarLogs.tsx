'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Download } from 'lucide-react'
import AddPatientModal from './forms'    // keep as is
import PatientInfo from './PatientInfo'

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

export default function RegistrarLogs({ darkMode = false }: { darkMode?: boolean }) {
  const [patients,     setPatients]     = useState<Patient[]>([])
  const [loading,      setLoading]      = useState(true)
  const [open,         setOpen]         = useState(false)
  const [selected,     setSelected]     = useState<string[]>([])
  const [sortMode,     setSortMode]     = useState('none')
  const [showArchived, setShowArchived] = useState(false)
  const [search,       setSearch]       = useState('')
  const [showExport,   setShowExport]   = useState(false)
  const [viewPatient,  setViewPatient]  = useState<Patient | null>(null)
  const [archivedIds,  setArchivedIds]  = useState<string[]>([])

  const fetchPatients = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    setPatients((data as Patient[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchPatients() }, [showArchived])

  const handleArchive = () => {
    setArchivedIds(prev => [...new Set([...prev, ...selected])])
    setSelected([])
  }

  const handleArchiveSingle = (id: string) => {
    setArchivedIds(prev => [...new Set([...prev, id])])
    setSelected(s => s.filter(x => x !== id))
  }

  let display = patients.filter(p => {
    const isArchived = archivedIds.includes(p.id)
    if (showArchived && !isArchived) return false
    if (!showArchived && isArchived) return false
    if (!search) return true
    const full = `${p.last_name} ${p.first_name} ${p.email}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })
  if (sortMode === 'az')   display = [...display].sort((a, b) => (a.last_name||'').localeCompare(b.last_name||''))
  if (sortMode === 'asc')  display = [...display].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  if (sortMode === 'desc') display = [...display].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const allSel    = display.length > 0 && display.every(p => selected.includes(p.id))
  const toggleAll = () => setSelected(allSel ? [] : display.map(p => p.id))
  const toggleOne = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const exportCSV = () => {
    const headers = ['No.','Last Name','First Name','Age','Sex','Birthdate','Barangay','Municipality','Contact','Email']
    const rows = display.map((p, i) =>
      [i+1, p.last_name, p.first_name, p.age, p.sex, p.birthdate, p.barangay, p.municipality, p.contact_number, p.email].join(',')
    )
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'patients.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = () => {
    const headers = ['No.','Last Name','First Name','Age','Sex','Birthdate','Barangay','Municipality','Contact','Email']
    const rows = display.map((p, i) =>
      [i+1, p.last_name, p.first_name, p.age, p.sex, p.birthdate, p.barangay, p.municipality, p.contact_number, p.email].join('\t')
    )
    const blob = new Blob([[headers.join('\t'), ...rows].join('\n')], { type:'application/vnd.ms-excel' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'patients.xls'; a.click()
    URL.revokeObjectURL(url)
  }

  const ROWS    = 12
  const empties = Math.max(0, ROWS - display.length)

  return (
    <main style={{ flex:1, padding:24, overflowY:'auto', background: darkMode ? '#0d1a0f' : '#f0f4f1' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <p style={{ color: darkMode ? '#3a6b48' : '#aaa', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Registrar</p>
          <h1 style={{ fontSize:32, fontWeight:900, color: darkMode ? '#4db86a' : '#0b6b2e', margin:0 }}>Patient Logs</h1>
        </div>
        <button onClick={() => setOpen(true)} style={{ background:'#1a7a1a', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(26,122,26,0.25)' }}>
          <Plus size={15} /> Add Patient
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ background:'#1a7a1a', borderRadius:'10px 10px 0 0', padding:'10px 14px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
          <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ width:14, height:14, accentColor:'#fff' }} />
          <span style={{ color:'#fff', fontSize:12, fontWeight:600 }}>Select All</span>
        </label>
        <div style={{ width:1, height:16, background:'rgba(255,255,255,0.3)', margin:'0 4px' }} />
        {[
          { label:'Archive',            active: showArchived,      fn: () => { setShowArchived(p => !p); setSelected([]) } },
          { label:'A-Z',                active: sortMode==='az',   fn: () => setSortMode(s => s==='az'  ? 'none' : 'az') },
          { label:'Ascending by Date',  active: sortMode==='asc',  fn: () => setSortMode(s => s==='asc' ? 'none' : 'asc') },
          { label:'Descending by Date', active: sortMode==='desc', fn: () => setSortMode(s => s==='desc'? 'none' : 'desc') },
        ].map(({ label, active, fn }) => (
          <button key={label} onClick={fn} style={{ padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', transition:'all 0.15s', background: active ? '#fff' : 'rgba(255,255,255,0.2)', color: active ? '#1a7a1a' : '#fff' }}>
            {label}
          </button>
        ))}

        {/* Search */}
        <div style={{ position:'relative' }}>
          <svg style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:6, padding:'4px 10px 4px 26px', color:'#fff', fontSize:12, outline:'none', width:160 }}
          />
        </div>

        <div style={{ flex:1 }} />

        {selected.length > 0 && (
          <button onClick={handleArchive} style={{ padding:'5px 14px', borderRadius:6, fontSize:12, fontWeight:700, border:'none', cursor:'pointer', background:'#facc15', color:'#713f12' }}>
            Archive ({selected.length})
          </button>
        )}

        <div style={{ position:'relative' }}>
          <button onClick={() => setShowExport(p => !p)} style={{ background:'#fff', color:'#1a7a1a', border:'none', borderRadius:6, padding:'5px 14px', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <Download size={12} /> EXPORT ▾
          </button>
          {showExport && (
            <div style={{ position:'absolute', right:0, top:'110%', background:'#fff', border:'1px solid #e0e0e0', borderRadius:8, zIndex:99, minWidth:120, boxShadow:'0 4px 16px rgba(0,0,0,0.12)', overflow:'hidden' }}>
              {[
                { label:'📊 Excel', fn: () => { exportExcel(); setShowExport(false) } },
                { label:'📄 PDF',   fn: () => { window.print(); setShowExport(false) } },
                { label:'📋 CSV',   fn: () => { exportCSV();   setShowExport(false) } },
              ].map(({ label, fn }) => (
                <button key={label} onClick={fn}
                  style={{ width:'100%', padding:'9px 16px', textAlign:'left', border:'none', background:'#fff', cursor:'pointer', fontSize:13, color:'#333', display:'block' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#f0faf0'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#fff'}
                >{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: darkMode ? '#0f2014' : '#fff', borderRadius:'0 0 12px 12px', overflow:'auto', border:'2px solid #1a7a1a', borderTop:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background: darkMode ? '#0a1a0d' : '#f0faf0' }}>
              {['No.','Name','Age','Sex','Birthdate','Address','Contact No.','E-mail','Status',''].map((h, i) => (
                <th key={i} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color: darkMode ? '#4db86a' : '#1a7a1a', borderBottom:'2px solid #1a5c1a', fontSize:12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign:'center', padding:32, color: darkMode ? '#3a6b48' : '#999', fontSize:13 }}>Loading patients...</td></tr>
            ) : display.map((p, i) => (
              <tr key={p.id} onClick={() => toggleOne(p.id)}
                style={{ background: selected.includes(p.id) ? (darkMode ? '#1a3d22' : '#e8f5e9') : i%2===0 ? (darkMode ? '#0f2014' : '#fff') : (darkMode ? '#0d1c11' : '#fafff8'), borderBottom: darkMode ? '1px solid #1a3320' : '1px solid #e8f0e8', cursor:'pointer', transition:'background 0.1s' }}
                onMouseEnter={e => { if (!selected.includes(p.id)) (e.currentTarget as HTMLTableRowElement).style.background = darkMode ? '#1a3d22' : '#f5fff5' }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = selected.includes(p.id) ? (darkMode ? '#1a3d22' : '#e8f5e9') : i%2===0 ? (darkMode ? '#0f2014' : '#fff') : (darkMode ? '#0d1c11' : '#fafff8') }}
              >
                <td style={{ padding:'10px 12px', color: darkMode ? '#3a6b48' : '#999' }}>{i+1}</td>
                <td style={{ padding:'10px 12px', fontWeight:600, color: darkMode ? '#c8e6c9' : '#1a2e1a' }}>{p.last_name}, {p.first_name}</td>
                <td style={{ padding:'10px 12px', color: darkMode ? '#a5d6a7' : '#333' }}>{p.age}</td>
                <td style={{ padding:'10px 12px', color: darkMode ? '#a5d6a7' : '#333' }}>{p.sex}</td>
                <td style={{ padding:'10px 12px', color: darkMode ? '#a5d6a7' : '#333' }}>{p.birthdate || '—'}</td>
                <td style={{ padding:'10px 12px', color: darkMode ? '#a5d6a7' : '#333' }}>{[p.barangay, p.municipality].filter(Boolean).join(', ') || '—'}</td>
                <td style={{ padding:'10px 12px', color: darkMode ? '#a5d6a7' : '#333' }}>{p.contact_number || '—'}</td>
                <td style={{ padding:'10px 12px', color: darkMode ? '#a5d6a7' : '#333' }}>{p.email || '—'}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background: archivedIds.includes(p.id) ? '#ffebee' : '#e8f5e9', color: archivedIds.includes(p.id) ? '#c62828' : '#0b6b2e' }}>
                    {archivedIds.includes(p.id) ? 'Archived' : 'Active'}
                  </span>
                </td>
                <td style={{ padding:'10px 12px', display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setViewPatient(p)} style={{ padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, color:'#fff', border:'none', background:'#1a7a1a', cursor:'pointer' }}>
                    View
                  </button>
                  {selected.includes(p.id) && (
                    <button onClick={e => { e.stopPropagation(); handleArchiveSingle(p.id) }} style={{ padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, color:'#713f12', border:'none', background:'#facc15', cursor:'pointer', whiteSpace:'nowrap' }}>
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && Array.from({ length: empties }).map((_, i) => (
              <tr key={`e-${i}`} style={{ borderBottom: darkMode ? '1px solid #1a3320' : '1px solid #e8f0e8', background:(display.length+i)%2===0 ? (darkMode ? '#0f2014' : '#fff') : (darkMode ? '#0d1c11' : '#fafff8') }}>
                <td style={{ padding:'10px 12px', color: darkMode ? '#1a3320' : '#ccc' }}>{display.length+i+1}</td>
                {Array(9).fill(null).map((_, j) => <td key={j} style={{ padding:'10px 12px' }} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddPatientModal isOpen={open} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); fetchPatients() }} />
      {viewPatient && <PatientInfo patient={viewPatient} onClose={() => setViewPatient(null)} />}
    </main>
  )
}