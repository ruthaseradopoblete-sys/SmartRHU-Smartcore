'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Package, RefreshCw, AlertTriangle } from 'lucide-react'

const G = '#1a7a1a'
const PER_PAGE = 10

interface InventoryItem {
  id: string
  medicine_name?: string
  generic_name?: string
  brand_name?: string
  category?: string
  quantity?: number
  unit?: string
  expiry_date?: string
  reorder_level?: number
  location?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export default function InventoryRecords({ darkMode }: { darkMode: boolean }) {
  const dk   = darkMode
  const bg   = dk ? '#0d1a0f' : '#f0f4f1'
  const card = dk ? '#0f2014' : '#ffffff'
  const bdr  = dk ? '#1a3d24' : '#e5e7eb'
  const txt  = dk ? '#e2f5e9' : '#1f2937'
  const txt2 = dk ? '#6ee7b7' : '#6b7280'

  const [items,       setItems]       = useState<InventoryItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [stockFilter, setStockFilter] = useState<'all'|'low'|'out'>('all')
  const [page,        setPage]        = useState(1)

  const fetchInventory = async () => {
    setLoading(true)
    // Try 'inventory' table first, then 'medicine_inventory' (pharmacist's table)
    const { data: d1 } = await supabase.from('inventory').select('*').order('created_at', { ascending: false })
    if (d1 && d1.length > 0) { setItems(d1); setLoading(false); return }

    const { data: d2 } = await supabase.from('medicine_inventory').select('*').order('created_at', { ascending: false })
    if (d2 && d2.length > 0) { setItems(d2); setLoading(false); return }

    // Try 'medicines' table
    const { data: d3 } = await supabase.from('medicines').select('*').order('created_at', { ascending: false })
    setItems(d3 || [])
    setLoading(false)
  }

  useEffect(() => { fetchInventory() }, [])

  const display = items.filter(item => {
    const qty = Number(item.quantity ?? 0)
    const reorder = Number(item.reorder_level ?? 10)
    if (stockFilter === 'low'  && !(qty > 0 && qty <= reorder)) return false
    if (stockFilter === 'out'  && qty !== 0) return false
    if (search) {
      const q = search.toLowerCase()
      const full = `${item.medicine_name||''} ${item.generic_name||''} ${item.brand_name||''} ${item.category||''}`.toLowerCase()
      if (!full.includes(q)) return false
    }
    return true
  })

  useEffect(() => { setPage(1) }, [search, stockFilter])
  const totalPages = Math.max(1, Math.ceil(display.length / PER_PAGE))
  const paginated  = display.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const getStockStatus = (item: InventoryItem) => {
    const qty = Number(item.quantity ?? 0)
    const reorder = Number(item.reorder_level ?? 10)
    if (qty === 0)           return { label:'Out of Stock', bg:'#fee2e2', color:'#dc2626', border:'#fca5a5' }
    if (qty <= reorder)      return { label:'Low Stock',    bg:'#fef3c7', color:'#d97706', border:'#fcd34d' }
    return                          { label:'In Stock',     bg:'#dcfce7', color:'#15803d', border:'#86efac' }
  }

  const isExpiringSoon = (date?: string) => {
    if (!date) return false
    const exp = new Date(date)
    const diff = (exp.getTime() - Date.now()) / (1000*60*60*24)
    return diff >= 0 && diff <= 90
  }

  const isExpired = (date?: string) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  // Summary stats
  const outOfStock  = items.filter(i => Number(i.quantity??0) === 0).length
  const lowStock    = items.filter(i => { const q=Number(i.quantity??0); const r=Number(i.reorder_level??10); return q>0 && q<=r }).length
  const expiringSoon = items.filter(i => isExpiringSoon(i.expiry_date) && !isExpired(i.expiry_date)).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:900, color: dk?'#4ade80':G }}>Inventory Records</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:txt2 }}>Admin view — pharmacy medicine inventory</p>
        </div>
        <button onClick={fetchInventory}
          style={{ background:card, border:`1.5px solid ${bdr}`, borderRadius:10, padding:'8px 16px',
            display:'flex', alignItems:'center', gap:7, cursor:'pointer', color:txt2, fontSize:13, fontWeight:700 }}>
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[
          { label:'Total Items',    count:items.length,  color:G         },
          { label:'Out of Stock',   count:outOfStock,    color:'#dc2626' },
          { label:'Low Stock',      count:lowStock,      color:'#d97706' },
          { label:'Expiring Soon',  count:expiringSoon,  color:'#7c3aed' },
        ].map(s=>(
          <div key={s.label} style={{ background:card, border:`1px solid ${bdr}`, borderRadius:12,
            padding:'14px 20px', display:'flex', alignItems:'center', gap:12, flex:1, minWidth:140 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:txt, lineHeight:1 }}>{s.count}</div>
              <div style={{ fontSize:11, color:txt2, marginTop:3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert for critical stock */}
      {(outOfStock > 0 || lowStock > 0) && (
        <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:12,
          padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <AlertTriangle size={16} color="#d97706"/>
          <span style={{ fontSize:13, color:'#92400e', fontWeight:600 }}>
            {outOfStock > 0 && `${outOfStock} item(s) out of stock. `}
            {lowStock > 0 && `${lowStock} item(s) running low.`}
          </span>
        </div>
      )}

      {/* Filter Panel */}
      <div style={{ background:card, borderRadius:18, padding:'14px 18px', border:`1px solid ${bdr}`, display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:txt2 }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search medicine name, generic name, category..."
            style={{ width:'100%', boxSizing:'border-box', padding:'8px 36px', borderRadius:12, border:`1.5px solid ${bdr}`, fontSize:12, outline:'none', color:txt, background:bg }}
            onFocus={e=>(e.currentTarget.style.borderColor=G)} onBlur={e=>(e.currentTarget.style.borderColor=bdr)}/>
        </div>
        <div style={{ display:'flex', gap:3, background:bg, borderRadius:24, padding:3, border:`1px solid ${bdr}`, width:'fit-content' }}>
          {([['all','All'],['low','Low Stock'],['out','Out of Stock']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setStockFilter(v)}
              style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
                background: stockFilter===v?`linear-gradient(135deg,${G},#0d9488)`:'transparent',
                color: stockFilter===v?'#fff':txt2, transition:'all 0.15s' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:18, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:bg, borderBottom:`2px solid ${bdr}` }}>
              {['#','Medicine / Generic Name','Category','Quantity','Unit','Expiry Date','Stock Status','Location'].map(h=>(
                <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontWeight:800, color: dk?'#4ade80':G, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:txt2 }}>
                <div style={{ width:28, height:28, border:`3px solid ${G}`, borderTopColor:'transparent', borderRadius:'50%', margin:'0 auto 8px', animation:'spin 0.8s linear infinite' }}/>
                Loading inventory…
              </td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:txt2, fontSize:13 }}>
                <Package size={40} color={bdr} style={{ display:'block', margin:'0 auto 10px' }}/>
                No inventory records found.<br/>
                <span style={{ fontSize:11, marginTop:6, display:'block' }}>Make sure your Supabase table is named <code>inventory</code>, <code>medicine_inventory</code>, or <code>medicines</code>.</span>
              </td></tr>
            ) : paginated.map((item, i) => {
              const sc  = getStockStatus(item)
              const exp = isExpired(item.expiry_date)
              const exp90 = isExpiringSoon(item.expiry_date)
              return (
                <tr key={item.id} style={{ borderBottom:`1px solid ${bdr}`, transition:'background 0.1s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=dk?'rgba(26,122,26,0.05)':'rgba(26,122,26,0.02)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'11px 14px', color:txt2, fontWeight:700 }}>{(page-1)*PER_PAGE+i+1}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ fontWeight:700, color:txt }}>{item.medicine_name || item.generic_name || '—'}</div>
                    {item.generic_name && item.medicine_name && (
                      <div style={{ fontSize:10, color:txt2 }}>{item.generic_name}</div>
                    )}
                    {item.brand_name && <div style={{ fontSize:10, color:txt2, fontStyle:'italic' }}>{item.brand_name}</div>}
                  </td>
                  <td style={{ padding:'11px 14px', color:txt2, fontSize:11 }}>{item.category||'—'}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ fontWeight:800, fontSize:14, color: Number(item.quantity??0)===0?'#dc2626':Number(item.quantity??0)<=(Number(item.reorder_level??10))?'#d97706':txt }}>
                      {item.quantity??'—'}
                    </span>
                  </td>
                  <td style={{ padding:'11px 14px', color:txt2, fontSize:11 }}>{item.unit||'—'}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ fontSize:11, fontWeight:600,
                      color: exp?'#dc2626':exp90?'#d97706':txt2 }}>
                      {item.expiry_date ? (
                        <>{exp?'⚠️ ':exp90?'⏰ ':''}{item.expiry_date}</>
                      ) : '—'}
                    </span>
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:800,
                      background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
                      {sc.label}
                    </span>
                  </td>
                  <td style={{ padding:'11px 14px', color:txt2, fontSize:11 }}>{item.location||'—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderTop:`1px solid ${bdr}`, background:bg, flexWrap:'wrap', gap:8 }}>
          <span style={{ fontSize:12, color:txt2, fontWeight:600 }}>
            {display.length===0?'No results':`Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE,display.length)} of ${display.length} items`}
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

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}