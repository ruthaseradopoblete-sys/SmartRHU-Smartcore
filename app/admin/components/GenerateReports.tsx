'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, FlaskConical, Package, FileBarChart, Monitor, UserCog, Download, Filter } from 'lucide-react'

const G = '#1a7a1a'
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function GenerateReport({ darkMode }: { darkMode: boolean }) {
  const dk   = darkMode
  const bg   = dk ? '#0d1a0f' : '#f0f4f1'
  const card = dk ? '#0f2014' : '#ffffff'
  const bdr  = dk ? '#1a3d24' : '#e5e7eb'
  const txt  = dk ? '#e2f5e9' : '#1f2937'
  const txt2 = dk ? '#6ee7b7' : '#6b7280'

  const currentYear  = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [filterType, setFilterType] = useState<'month'|'range'>('month')
  const [selYear,    setSelYear]    = useState(currentYear)
  const [selMonth,   setSelMonth]   = useState(currentMonth)
  const [rangeFrom,  setRangeFrom]  = useState(`${currentYear}-01-01`)
  const [rangeTo,    setRangeTo]    = useState(`${currentYear}-12-31`)
  const [loading,    setLoading]    = useState(false)
  const [preview,    setPreview]    = useState<Record<string,number>>({})

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i)

  const getDateRange = () => {
    if (filterType === 'month') {
      const pad = String(selMonth).padStart(2,'0')
      const lastDay = new Date(selYear, selMonth, 0).getDate()
      return { from:`${selYear}-${pad}-01`, to:`${selYear}-${pad}-${lastDay}`, label:`${MONTHS[selMonth-1]} ${selYear}` }
    }
    return { from:rangeFrom, to:rangeTo, label:`${rangeFrom} to ${rangeTo}` }
  }

  const fetchPreview = async () => {
    const { from, to } = getDateRange()
    setLoading(true)
    const [pRes, lRes, uRes] = await Promise.all([
      supabase.from('patients').select('id',{count:'exact',head:true}).gte('created_at',from).lte('created_at',to),
      supabase.from('lab_requests').select('id',{count:'exact',head:true}).gte('created_at',from).lte('created_at',to),
      supabase.from('users').select('user_id',{count:'exact',head:true}).gte('created_at',from).lte('created_at',to),
    ])
    setPreview({ patients:pRes.count||0, labs:lRes.count||0, users:uRes.count||0 })
    setLoading(false)
  }

  useEffect(() => { fetchPreview() }, [selYear, selMonth, filterType, rangeFrom, rangeTo])

  const reports = [
    { title:'Patient Summary Report',    desc:'All registered patients and their records',        color:G,        icon:Users,        table:'patients'      },
    { title:'Lab Results Report',         desc:'All lab tests and results by date range',          color:'#0891b2', icon:FlaskConical,  table:'lab_requests'  },
    { title:'Inventory Report',           desc:'Current stock levels and medicine inventory',      color:'#d97706', icon:Package,       table:'inventory'     },
    { title:'User Activity Report',       desc:'Login history and system actions by user',         color:'#7c3aed', icon:UserCog,       table:'users'         },
    { title:'System Audit Log',           desc:'Complete audit trail of all system changes',       color:'#db2777', icon:Monitor,       table:'audit_logs'    },
    { title:'Prescription Report',        desc:'All issued prescriptions and medicines dispensed', color:'#2563eb', icon:FileBarChart,  table:'prescriptions' },
  ]

  const handleExport = async (format: string, report: typeof reports[0]) => {
    const { from, to, label } = getDateRange()
    const { data } = await supabase.from(report.table as any).select('*').gte('created_at', from).lte('created_at', to)
    if (!data || data.length === 0) { alert('No data for selected period.'); return }

    if (format === 'CSV') {
      const headers = Object.keys(data[0]).join(',')
      const rows = data.map(row => Object.values(row).map(v=>`"${v??''}"`).join(','))
      const blob = new Blob([[headers,...rows].join('\n')],{type:'text/csv'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=`${report.title.replace(/\s+/g,'-')}_${label}.csv`; a.click()
      URL.revokeObjectURL(url); return
    }

    if (format === 'PDF' || format === 'Excel') {
      const headers = Object.keys(data[0])
      const w = window.open('','_blank')
      if (!w) return
      w.document.write(`<!DOCTYPE html><html><head><title>${report.title}</title>
        <style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px}h1{color:${G};font-size:18px;border-bottom:3px solid ${G};padding-bottom:8px}.meta{font-size:11px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:${G};color:#fff;padding:7px 10px;text-align:left}td{padding:6px 10px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f9f9f9}</style>
        </head><body>
        <h1>${report.title}</h1>
        <div class="meta">Period: <b>${label}</b> &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})} &nbsp;|&nbsp; Records: ${data.length}</div>
        <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${data.map(row=>`<tr>${headers.map(h=>`<td>${row[h]??'—'}</td>`).join('')}</tr>`).join('')}</tbody></table>
        </body></html>`)
      w.document.close(); w.print()
    }
  }

  const { label } = getDateRange()

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:dk?'#4ade80':G }}>Generate Reports</h2>
        <p style={{ margin:'4px 0 0', fontSize:12, color:txt2 }}>Export system reports with date filtering</p>
      </div>

      {/* Filter Panel */}
      <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:18, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <Filter size={16} color={G}/>
          <span style={{ fontWeight:800, fontSize:14, color:txt }}>Date Range Filter</span>
        </div>

        <div style={{ display:'flex', gap:3, background:bg, borderRadius:24, padding:3, border:`1px solid ${bdr}`, width:'fit-content', marginBottom:16 }}>
          {([['month','By Month'],['range','Custom Range']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setFilterType(v)}
              style={{ padding:'6px 18px', borderRadius:20, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
                background:filterType===v?`linear-gradient(135deg,${G},#0d9488)`:'transparent',
                color:filterType===v?'#fff':txt2, transition:'all 0.15s' }}>{l}</button>
          ))}
        </div>

        {filterType === 'month' ? (
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:txt2, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Year</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {years.map(y=>(
                  <button key={y} onClick={()=>setSelYear(y)}
                    style={{ padding:'6px 14px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer',
                      background:selYear===y?`linear-gradient(135deg,${G},#0d9488)`:'transparent',
                      color:selYear===y?'#fff':txt2, border:selYear===y?'none':`1.5px solid ${bdr}`, transition:'all 0.15s' }}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width:1, height:60, background:bdr, flexShrink:0, marginTop:28 }}/>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:txt2, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Month</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {MONTHS.map((m,i)=>(
                  <button key={m} onClick={()=>setSelMonth(i+1)}
                    style={{ padding:'6px 12px', borderRadius:10, fontSize:11, fontWeight:700, cursor:'pointer',
                      background:selMonth===i+1?`linear-gradient(135deg,${G},#0d9488)`:'transparent',
                      color:selMonth===i+1?'#fff':txt2, border:selMonth===i+1?'none':`1.5px solid ${bdr}`, transition:'all 0.15s' }}>
                    {m.slice(0,3)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
            {[['From',rangeFrom,setRangeFrom],['To',rangeTo,setRangeTo]].map(([l,v,fn])=>(
              <div key={String(l)}>
                <div style={{ fontSize:11, fontWeight:700, color:txt2, marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>{}</div>
                <input type="date" value={String(v)} onChange={e=>(fn as any)(e.target.value)}
                  style={{ padding:'8px 12px', borderRadius:10, border:`1.5px solid ${bdr}`, fontSize:13, color:txt, background:bg, outline:'none' }}
                  onFocus={e=>(e.currentTarget.style.borderColor=G)} onBlur={e=>(e.currentTarget.style.borderColor=bdr)}/>
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        <div style={{ marginTop:16, padding:'12px 16px', background:bg, borderRadius:12, border:`1px solid ${bdr}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:txt2, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>
            Records found for {label}
          </div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
            {[
              {l:'Patients',  v:preview.patients??0, c:G},
              {l:'Lab Requests', v:preview.labs??0,  c:'#0891b2'},
              {l:'New Users', v:preview.users??0,    c:'#7c3aed'},
            ].map(s=>(
              <div key={s.l} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:s.c }}/>
                <span style={{ fontSize:22, fontWeight:800, color:txt }}>{loading?'…':s.v}</span>
                <span style={{ fontSize:11, color:txt2 }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:16 }}>
        {reports.map(r=>(
          <div key={r.title} style={{ background:card, border:`1px solid ${bdr}`, borderRadius:16, padding:20 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:`${r.color}18`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              <r.icon size={20} color={r.color}/>
            </div>
            <div style={{ fontWeight:800, fontSize:14, color:txt, marginBottom:4 }}>{r.title}</div>
            <div style={{ fontSize:11, color:txt2, marginBottom:8, lineHeight:1.5 }}>{r.desc}</div>
            <div style={{ fontSize:10, color:r.color, padding:'3px 8px', background:`${r.color}10`, borderRadius:6, display:'inline-block', marginBottom:14 }}>
              📅 {label}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {['PDF','CSV','Excel'].map(fmt=>(
                <button key={fmt} onClick={()=>handleExport(fmt,r)}
                  style={{ flex:1, background:`${r.color}18`, color:r.color, border:`1px solid ${r.color}33`,
                    borderRadius:8, padding:'7px 0', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}
                  onMouseEnter={e=>(e.currentTarget.style.background=`${r.color}30`)}
                  onMouseLeave={e=>(e.currentTarget.style.background=`${r.color}18`)}>
                  <Download size={10}/>{fmt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}