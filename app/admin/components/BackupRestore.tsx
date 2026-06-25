'use client'
import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database, RefreshCw, Download, Upload, AlertTriangle, CheckCircle, ShieldAlert, FileJson, HardDrive, Cloud } from 'lucide-react'

/* Maps the friendly label → the real Supabase table name */
const TABLES: { label: string; table: string; checked: boolean }[] = [
  { label: 'Patient Records',      table: 'patients',             checked: true  },
  { label: 'Lab Requests',         table: 'laboratory_requests',  checked: true  },
  { label: 'Prescriptions',        table: 'prescriptions',        checked: true  },
  { label: 'Consultations (SOAP)', table: 'soap_consultations',   checked: true  },
  { label: 'Pharmacy Inventory',   table: 'pharma_medicines',     checked: true  },
  { label: 'Warehouse Inventory',  table: 'warehouse_medicines',  checked: true  },
  { label: 'User Accounts',        table: 'users',                checked: true  },
  { label: 'System Logs (Audit)',  table: 'audit_logs',           checked: false },
]

function useNarrow(bp = 880) {
  const [n, setN] = useState(false)
  useEffect(() => {
    const fn = () => setN(window.innerWidth < bp)
    fn(); window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [bp])
  return n
}

export default function BackupRestore({ darkMode = false }: { darkMode?: boolean }) {
  const narrow = useNarrow()

  const C = {
    pageBg:  darkMode ? 'transparent' : 'transparent',
    card:    darkMode ? 'rgba(13,37,22,0.6)' : '#ffffff',
    border:  darkMode ? 'rgba(77,184,106,0.16)' : 'rgba(26,122,26,0.12)',
    txt:     darkMode ? '#e2f5e9' : '#0d2e0d',
    txt2:    darkMode ? '#9abea6' : '#5b7a63',
    brand:   darkMode ? '#4ade80' : '#1a7a1a',
    soft:    darkMode ? 'rgba(255,255,255,0.03)' : '#f5fbf6',
    softBdr: darkMode ? 'rgba(77,184,106,0.12)' : 'rgba(26,122,26,0.08)',
    shadow:  darkMode ? '0 2px 16px rgba(0,0,0,0.35)' : '0 2px 16px rgba(13,59,31,0.06)',
  }

  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(TABLES.map(t => [t.table, t.checked]))
  )
  const [loading, setLoading]   = useState(false)
  const [progress, setProgress] = useState('')
  const [summary, setSummary]   = useState<{ table: string; count: number; ok: boolean; note?: string }[] | null>(null)

  const [restorePreview, setRestorePreview] = useState<{ name: string; count: number }[] | null>(null)
  const [restoreMeta,    setRestoreMeta]    = useState<{ exported_at?: string; app?: string } | null>(null)
  const [restoreError,   setRestoreError]   = useState('')
  const [dragOver,       setDragOver]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const toggle = (table: string) => setSelected(s => ({ ...s, [table]: !s[table] }))
  const selectedCount = Object.values(selected).filter(Boolean).length

  async function fetchAllRows(table: string): Promise<any[]> {
    const pageSize = 1000
    let from = 0
    let all: any[] = []
    while (true) {
      const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      all = all.concat(data)
      if (data.length < pageSize) break
      from += pageSize
    }
    return all
  }

  const handleBackup = async () => {
    const chosen = TABLES.filter(t => selected[t.table])
    if (chosen.length === 0) { setProgress('Select at least one data set to back up.'); return }

    setLoading(true); setSummary(null); setProgress('Starting backup…')
    const result: { table: string; count: number; ok: boolean; note?: string }[] = []
    const payloadTables: Record<string, any[]> = {}

    for (const t of chosen) {
      setProgress(`Exporting ${t.label}…`)
      try {
        const rows = await fetchAllRows(t.table)
        payloadTables[t.table] = rows
        result.push({ table: t.label, count: rows.length, ok: true })
      } catch (err: any) {
        const missing = String(err?.message || '').toLowerCase().includes('does not exist')
        result.push({ table: t.label, count: 0, ok: false, note: missing ? 'Table not found — skipped' : (err?.message || 'Error') })
      }
    }

    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`
    const payload = {
      app: 'SmartRHU', facility: 'RHU Lopez, Quezon', version: 1,
      exported_at: now.toISOString(),
      tables: payloadTables,
      counts: Object.fromEntries(Object.entries(payloadTables).map(([k, v]) => [k, v.length])),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `smartrhu-backup-${stamp}.json`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)

    setSummary(result)
    const total = result.reduce((s, r) => s + r.count, 0)
    setProgress(`Backup downloaded — ${total} records across ${result.filter(r=>r.ok).length} data set(s).`)
    setLoading(false)
  }

  const readBackupFile = async (file?: File) => {
    setRestoreError(''); setRestorePreview(null); setRestoreMeta(null)
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.tables || typeof data.tables !== 'object') {
        setRestoreError('This file does not look like a SmartRHU backup (missing "tables").'); return
      }
      const preview = Object.entries(data.tables).map(([name, rows]) => ({
        name, count: Array.isArray(rows) ? rows.length : 0,
      }))
      setRestorePreview(preview)
      setRestoreMeta({ exported_at: data.exported_at, app: data.app })
    } catch {
      setRestoreError('Could not read the file. Make sure it is a valid .json backup.')
    }
  }

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await readBackupFile(e.target.files?.[0]); e.target.value = ''
  }

  /* ── small UI helpers ── */
  const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, boxShadow:C.shadow, ...style }}>{children}</div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* ── Header ── */}
      <div>
        <p style={{ margin:0, fontSize:11, fontWeight:800, color:C.brand, textTransform:'uppercase', letterSpacing:1.5 }}>Admin</p>
        <h1 style={{ margin:'2px 0 0', fontSize:narrow?24:30, fontWeight:900, color:C.brand, lineHeight:1.1 }}>BACKUP &amp; RESTORE</h1>
      </div>

      {/* ── Two columns ── */}
      <div style={{ display:'grid', gridTemplateColumns: narrow ? '1fr' : '1.05fr 0.95fr', gap:16, alignItems:'start' }}>

        {/* ════ CREATE BACKUP ════ */}
        <Card style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:18 }}>
            <div style={{ width:46, height:46, borderRadius:13, background:'linear-gradient(135deg,#1a7a1a,#26a326)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(26,122,26,0.3)' }}>
              <Database size={22} color="#fff"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:16, color:C.txt }}>Create Backup</div>
              <div style={{ fontSize:11.5, color:C.txt2 }}>Downloads a complete .json copy of the selected data</div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:20, fontWeight:900, color:C.brand, lineHeight:1 }}>{selectedCount}</div>
              <div style={{ fontSize:9, color:C.txt2, textTransform:'uppercase', letterSpacing:0.5, fontWeight:700 }}>selected</div>
            </div>
          </div>

          {/* Data set list */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:18 }}>
            {TABLES.map((item) => {
              const on = !!selected[item.table]
              return (
                <label key={item.table}
                  style={{ display:'flex', alignItems:'center', gap:11, cursor:'pointer', fontSize:13, color:C.txt,
                    padding:'9px 12px', borderRadius:10, background: on ? C.soft : 'transparent',
                    border:`1px solid ${on ? C.softBdr : 'transparent'}`, transition:'all 0.12s' }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(item.table)}
                    style={{ accentColor:'#1a7a1a', width:16, height:16, flexShrink:0 }}/>
                  <span style={{ fontWeight:600 }}>{item.label}</span>
                  <span style={{ marginLeft:'auto', fontSize:10, color:C.txt2, fontFamily:'ui-monospace, monospace', opacity:0.7 }}>{item.table}</span>
                </label>
              )
            })}
          </div>

          {progress && (
            <div style={{ background: darkMode?'rgba(34,197,94,0.1)':'#f0fdf4', border:`1px solid ${darkMode?'rgba(34,197,94,0.25)':'#86efac'}`, borderRadius:10,
              padding:'10px 14px', fontSize:12, color: darkMode?'#86efac':'#15803d', marginBottom:14, lineHeight:1.4 }}>{progress}</div>
          )}

          <button onClick={handleBackup} disabled={loading}
            style={{ background: loading ? '#6b9e6b' : 'linear-gradient(135deg,#1a7a1a,#26a326)', color:'#fff', border:'none',
              borderRadius:11, padding:'13px 20px', fontSize:13.5, fontWeight:800, cursor: loading?'not-allowed':'pointer',
              display:'flex', alignItems:'center', gap:8, width:'100%', justifyContent:'center',
              boxShadow: loading?'none':'0 6px 16px rgba(26,122,26,0.28)', transition:'all 0.15s' }}>
            {loading
              ? <><RefreshCw size={15} style={{ animation:'spin 1s linear infinite' }}/> Backing up…</>
              : <><Download size={15}/> Download Backup (.json)</>}
          </button>

          {summary && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:10, fontWeight:800, color:C.txt2, textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>Result</div>
              {summary.map((r) => (
                <div key={r.table} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12.5, color:C.txt }}>
                  {r.ok ? <CheckCircle size={14} color="#16a34a"/> : <AlertTriangle size={14} color="#d97706"/>}
                  <span style={{ fontWeight:600 }}>{r.table}</span>
                  <span style={{ marginLeft:'auto', color:C.txt2, fontWeight:600 }}>
                    {r.ok ? `${r.count} records` : (r.note || 'skipped')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ════ RESTORE / VERIFY ════ */}
        <Card style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:18 }}>
            <div style={{ width:46, height:46, borderRadius:13, background:'linear-gradient(135deg,#d97706,#f59e0b)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(217,119,6,0.25)' }}>
              <RefreshCw size={22} color="#fff"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:16, color:C.txt }}>Restore Data</div>
              <div style={{ fontSize:11.5, color:C.txt2 }}>Verify a backup file before restoring in Supabase</div>
            </div>
          </div>

          <div style={{ background: darkMode?'rgba(245,158,11,0.08)':'#fffbeb', border:`1px solid ${darkMode?'rgba(245,158,11,0.25)':'#fcd34d'}`,
            borderRadius:11, padding:'11px 14px', marginBottom:16, display:'flex', gap:9, alignItems:'flex-start' }}>
            <ShieldAlert size={15} color="#d97706" style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:11.5, color: darkMode?'#fbbf24':'#92400e', lineHeight:1.5 }}>
              For safety, restoring is <strong>not</strong> done from this page (it could overwrite live records).
              Upload a backup to check its contents, then perform the actual restore in Supabase.
            </span>
          </div>

          {/* Upload / drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e)=>{ e.preventDefault(); setDragOver(true) }}
            onDragLeave={()=>setDragOver(false)}
            onDrop={(e)=>{ e.preventDefault(); setDragOver(false); readBackupFile(e.dataTransfer.files?.[0]) }}
            style={{ border:`2px dashed ${dragOver ? C.brand : C.border}`, borderRadius:12,
              padding:'26px 20px', textAlign:'center', cursor:'pointer', marginBottom:14,
              background: dragOver ? (darkMode?'rgba(74,222,128,0.06)':'#f0fdf4') : 'transparent', transition:'all 0.15s' }}>
            <Upload size={26} color={C.brand} style={{ margin:'0 auto 10px' }}/>
            <div style={{ fontSize:13.5, fontWeight:700, color:C.txt }}>Upload Backup File</div>
            <div style={{ fontSize:11, color:C.txt2, marginTop:4 }}>Click or drag a .json backup here</div>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleRestoreFile} style={{ display:'none' }}/>
          </div>

          {restoreError && (
            <div style={{ background: darkMode?'rgba(220,38,38,0.12)':'#fee2e2', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#dc2626', display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
              <AlertTriangle size={15} style={{ flexShrink:0 }}/> {restoreError}
            </div>
          )}

          {restorePreview && (
            <div style={{ background:C.soft, borderRadius:11, border:`1px solid ${C.border}`, padding:'13px 15px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <FileJson size={15} color={C.brand}/>
                <span style={{ fontSize:12.5, fontWeight:800, color:C.txt }}>Backup contents</span>
                <CheckCircle size={14} color="#16a34a" style={{ marginLeft:'auto' }}/>
              </div>
              {restoreMeta?.exported_at && (
                <div style={{ fontSize:10.5, color:C.txt2, marginBottom:9, paddingBottom:9, borderBottom:`1px solid ${C.border}` }}>
                  {restoreMeta.app || 'Backup'} · exported {new Date(restoreMeta.exported_at).toLocaleString('en-PH')}
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {restorePreview.map((p) => (
                  <div key={p.name} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:C.txt }}>
                    <span style={{ fontFamily:'ui-monospace, monospace' }}>{p.name}</span>
                    <span style={{ color:C.brand, fontWeight:800 }}>{p.count} rows</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}