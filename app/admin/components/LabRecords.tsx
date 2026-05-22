'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, RefreshCw, FlaskConical } from 'lucide-react'

// ── Import the actual lab components ───────────────────────────────────────
import ViewResultModal from '@/app/Laboratory/components/ViewResultModal'

interface LabRequest {
  id: string
  name: string
  age?: string | number
  gender?: string
  address?: string
  request_date?: string
  status?: string
  patient_id?: string
  requested_by?: string
  tests?: string[]
}

const G = '#1a7a1a'
const PER_PAGE = 10

export default function LabRecords({ darkMode }: { darkMode: boolean }) {
  const dk   = darkMode
  const bg   = dk ? '#0d1a0f' : '#f0f4f1'
  const card = dk ? '#0f2014' : '#ffffff'
  const bdr  = dk ? '#1a3d24' : '#e5e7eb'
  const txt  = dk ? '#e2f5e9' : '#1f2937'
  const txt2 = dk ? '#6ee7b7' : '#6b7280'

  const [requests,    setRequests]    = useState<LabRequest[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<LabRequest | null>(null)
  const [search,      setSearch]      = useState('')
  const [statusFilter,setStatusFilter]= useState<'all'|'pending'|'completed'>('all')
  const [page,        setPage]        = useState(1)

  const fetchRequests = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('laboratory_requests')
      .select(`
        *,
        patients (
          id, first_name, last_name, age, sex,
          purok, barangay, municipality, contact_number, email
        )
      `)
      .order('created_at', { ascending: false })

    if (data) {
      setRequests(data.map((r: any) => ({
        ...r,
        // Build the shape ViewResultModal expects
        name:    r.patients ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim() : r.name || '—',
        age:     r.patients?.age     || r.age     || '—',
        gender:  r.patients?.sex === 'F' ? 'Female' : r.patients?.sex === 'M' ? 'Male' : r.gender || '—',
        address: r.patients
          ? [r.patients.purok, r.patients.barangay, r.patients.municipality].filter(Boolean).join(', ')
          : r.address || '—',
        // Determine which tests were requested
        tests: r,  // pass full row so ViewResultModal can read flags
      })))
    }
    setLoading(false)
  }

  useEffect(() => { fetchRequests() }, [])

  const display = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const full = `${r.name||''} ${r.id||''} ${r.request_date||''}`.toLowerCase()
      if (!full.includes(q)) return false
    }
    return true
  })

  useEffect(() => { setPage(1) }, [search, statusFilter])
  const totalPages = Math.max(1, Math.ceil(display.length / PER_PAGE))
  const paginated  = display.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const statusColor = (s?: string) => s === 'completed'
    ? { bg:'#dcfce7', color:'#15803d', border:'#86efac' }
    : { bg:'#fef3c7', color:'#92400e', border:'#fcd34d' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:900, color: dk?'#4ade80':G }}>Lab Records</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:txt2 }}>
            Admin view — all laboratory requests and results
          </p>
        </div>
        <button onClick={fetchRequests}
          style={{ background:card, border:`1.5px solid ${bdr}`, borderRadius:10, padding:'8px 16px',
            display:'flex', alignItems:'center', gap:7, cursor:'pointer', color:txt2, fontSize:13, fontWeight:700 }}>
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      {/* Filter Panel */}
      <div style={{ background:card, borderRadius:18, padding:'14px 18px', border:`1px solid ${bdr}`, display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:txt2 }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search patient name, ID, date..."
              style={{ width:'100%', boxSizing:'border-box', padding:'8px 36px', borderRadius:12, border:`1.5px solid ${bdr}`, fontSize:12, outline:'none', color:txt, background:bg }}
              onFocus={e=>(e.currentTarget.style.borderColor=G)}
              onBlur={e=>(e.currentTarget.style.borderColor=bdr)}/>
          </div>
        </div>

        {/* Status filter */}
        <div style={{ display:'flex', gap:3, background:bg, borderRadius:24, padding:3, border:`1px solid ${bdr}`, width:'fit-content' }}>
          {(['all','pending','completed'] as const).map(v=>(
            <button key={v} onClick={()=>setStatusFilter(v)}
              style={{ padding:'5px 16px', borderRadius:20, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
                background: statusFilter===v?`linear-gradient(135deg,${G},#0d9488)`:'transparent',
                color: statusFilter===v?'#fff':txt2, boxShadow: statusFilter===v?`0 2px 8px ${G}44`:'none', transition:'all 0.15s' }}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display:'flex', gap:12 }}>
        {[
          { label:'Total',     count:requests.length,                                  color:'#1a7a1a' },
          { label:'Pending',   count:requests.filter(r=>r.status!=='completed').length, color:'#d97706' },
          { label:'Completed', count:requests.filter(r=>r.status==='completed').length, color:'#059669' },
        ].map(s=>(
          <div key={s.label} style={{ background:card, border:`1px solid ${bdr}`, borderRadius:12,
            padding:'10px 18px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
            <span style={{ fontSize:20, fontWeight:800, color:txt }}>{s.count}</span>
            <span style={{ fontSize:12, color:txt2 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:18, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:bg, borderBottom:`2px solid ${bdr}` }}>
              {['#','Patient Name','Age','Sex','Request Date','Status','Tests','Actions'].map(h=>(
                <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontWeight:800, color: dk?'#4ade80':G, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:txt2 }}>
                <div style={{ width:28, height:28, border:`3px solid ${G}`, borderTopColor:'transparent', borderRadius:'50%', margin:'0 auto 8px', animation:'spin 0.8s linear infinite' }}/>
                Loading lab records…
              </td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:txt2, fontSize:13 }}>
                <FlaskConical size={40} color={bdr} style={{ display:'block', margin:'0 auto 10px' }}/>
                No lab records found.
              </td></tr>
            ) : paginated.map((r,i) => {
              const sc = statusColor(r.status)
              return (
                <tr key={r.id} style={{ borderBottom:`1px solid ${bdr}`, transition:'background 0.1s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=dk?'rgba(26,122,26,0.05)':'rgba(26,122,26,0.02)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'11px 14px', color:txt2, fontWeight:700 }}>{(page-1)*PER_PAGE+i+1}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ fontWeight:700, color:txt }}>{r.name||'—'}</div>
                    <div style={{ fontSize:10, color:txt2 }}>ID: {r.id}</div>
                  </td>
                  <td style={{ padding:'11px 14px', color:txt }}>{r.age||'—'}</td>
                  <td style={{ padding:'11px 14px', color:txt }}>{r.gender||'—'}</td>
                  <td style={{ padding:'11px 14px', color:txt2, fontSize:11 }}>{r.request_date||'—'}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:800,
                      background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
                      {r.status==='completed'?'✅ Completed':'⏳ Pending'}
                    </span>
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:11, color:txt2 }}>
                    {Array.isArray(r.tests) ? r.tests.join(', ') : '—'}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <button onClick={()=>setSelected(r)}
                      style={{ padding:'5px 14px', borderRadius:8, fontSize:11, fontWeight:800, color:'#fff', border:'none', cursor:'pointer',
                        background:`linear-gradient(135deg,${G},#0d9488)`, whiteSpace:'nowrap' }}>
                      View Result
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderTop:`1px solid ${bdr}`, background:bg, flexWrap:'wrap', gap:8 }}>
          <span style={{ fontSize:12, color:txt2, fontWeight:600 }}>
            {display.length===0?'No results':`Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE,display.length)} of ${display.length} records`}
          </span>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===1?txt2:G, cursor:page===1?'default':'pointer' }}>← Prev</button>
            {Array.from({length:totalPages}).map((_,i)=>(
              <button key={i} onClick={()=>setPage(i+1)}
                style={{ padding:'5px 11px', borderRadius:10, fontSize:12, fontWeight:800, border:'none', cursor:'pointer',
                  background: page===i+1?`linear-gradient(135deg,${G},#0d9488)`:'transparent',
                  color: page===i+1?'#fff':txt2 }}>
                {i+1}
              </button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===totalPages?txt2:G, cursor:page===totalPages?'default':'pointer' }}>Next →</button>
          </div>
        </div>
      </div>

      {/* View Result Modal - uses the actual laboratory ViewResultModal */}
      {selected && (
        <ViewResultModal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          request={selected}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}