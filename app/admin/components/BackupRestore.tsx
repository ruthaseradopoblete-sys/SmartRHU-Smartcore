'use client'
import React, { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Database, RefreshCw, Download, Upload, AlertTriangle, CheckCircle, ShieldAlert, FileJson } from 'lucide-react'

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

export default function BackupRestore({ darkMode }: { darkMode: boolean }) {
  const card   = darkMode ? 'rgba(10,26,13,0.9)' : '#fff'
  const border = darkMode ? 'rgba(77,184,106,0.12)' : 'rgba(26,122,26,0.1)'
  const txt    = darkMode ? '#d1fae5' : '#0d2e0d'
  const sub    = darkMode ? '#4db86a' : '#1a7a1a'
  const soft   = darkMode ? 'rgba(255,255,255,0.04)' : '#f4fbf4'

  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(TABLES.map(t => [t.table, t.checked]))
  )
  const [loading, setLoading]   = useState(false)
  const [progress, setProgress] = useState('')
  const [summary, setSummary]   = useState<{ table: string; count: number; ok: boolean; note?: string }[] | null>(null)

  // restore preview
  const [restorePreview, setRestorePreview] = useState<{ name: string; count: number }[] | null>(null)
  const [restoreMeta,    setRestoreMeta]    = useState<{ exported_at?: string; app?: string } | null>(null)
  const [restoreError,   setRestoreError]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const toggle = (table: string) => setSelected(s => ({ ...s, [table]: !s[table] }))

  /* Fetch every row of a table (pages of 1000) */
  async function fetchAllRows(table: string): Promise<any[]> {
    const pageSize = 1000
    let from = 0
    let all: any[] = []
    // eslint-disable-next-line no-constant-condition
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
      app: 'SmartRHU',
      facility: 'RHU Lopez, Quezon',
      version: 1,
      exported_at: now.toISOString(),
      tables: payloadTables,
      counts: Object.fromEntries(Object.entries(payloadTables).map(([k, v]) => [k, v.length])),
    }

    // Trigger download
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `smartrhu-backup-${stamp}.json`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)

    setSummary(result)
    const total = result.reduce((s, r) => s + r.count, 0)
    setProgress(`Backup downloaded — ${total} records across ${result.filter(r=>r.ok).length} data set(s).`)
    setLoading(false)
  }

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setRestoreError(''); setRestorePreview(null); setRestoreMeta(null)
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.tables || typeof data.tables !== 'object') {
        setRestoreError('This file does not look like a SmartRHU backup (missing "tables").')
        return
      }
      const preview = Object.entries(data.tables).map(([name, rows]) => ({
        name, count: Array.isArray(rows) ? rows.length : 0,
      }))
      setRestorePreview(preview)
      setRestoreMeta({ exported_at: data.exported_at, app: data.app })
    } catch (err: any) {
      setRestoreError('Could not read the file. Make sure it is a valid .json backup.')
    }
    e.target.value = ''
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:txt }}>Backup &amp; Restore</h2>
        <p style={{ margin:'4px 0 0', fontSize:12, color:sub }}>Export a real off-site copy of your data. Restore is done safely via Supabase.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* ── Create Backup (REAL export) ── */}
        <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Database size={22} color="#1a7a1a"/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:txt }}>Create Backup</div>
              <div style={{ fontSize:11, color:sub }}>Downloads a real .json copy of the selected data</div>
            </div>
          </div>

          {progress && (
            <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:9,
              padding:'10px 14px', fontSize:12, color:'#15803d', marginBottom:14 }}>{progress}</div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
            {TABLES.map((item) => (
              <label key={item.table} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, color:txt }}>
                <input type="checkbox" checked={!!selected[item.table]} onChange={() => toggle(item.table)}
                  style={{ accentColor:'#1a7a1a', width:15, height:15 }}/>
                {item.label}
                <span style={{ marginLeft:'auto', fontSize:10, color:sub, fontFamily:'monospace' }}>{item.table}</span>
              </label>
            ))}
          </div>

          <button onClick={handleBackup} disabled={loading}
            style={{ background:'linear-gradient(135deg,#1a7a1a,#26a326)', color:'#fff', border:'none',
              borderRadius:10, padding:'11px 20px', fontSize:13, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', gap:8, width:'100%', justifyContent:'center',
              opacity: loading?0.7:1 }}>
            {loading
              ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Backing up…</>
              : <><Download size={14}/> Download Backup (.json)</>}
          </button>

          {/* Per-table result */}
          {summary && (
            <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:6 }}>
              {summary.map((r) => (
                <div key={r.table} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:txt }}>
                  {r.ok
                    ? <CheckCircle size={13} color="#16a34a"/>
                    : <AlertTriangle size={13} color="#d97706"/>}
                  <span style={{ fontWeight:600 }}>{r.table}</span>
                  <span style={{ marginLeft:'auto', color:sub }}>
                    {r.ok ? `${r.count} records` : (r.note || 'skipped')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Restore (safe: preview only) ── */}
        <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <RefreshCw size={22} color="#d97706"/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:txt }}>Restore Data</div>
              <div style={{ fontSize:11, color:sub }}>Preview a backup file before restoring via Supabase</div>
            </div>
          </div>

          <div style={{ background: darkMode?'rgba(245,158,11,0.1)':'#fffbeb', border:'1px solid #fcd34d',
            borderRadius:10, padding:'10px 14px', marginBottom:16, display:'flex', gap:8, alignItems:'flex-start' }}>
            <ShieldAlert size={14} color="#d97706" style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:12, color: darkMode?'#fbbf24':'#92400e', lineHeight:1.5 }}>
              For safety, restoring is <strong>not</strong> done from this page (it could overwrite live records).
              Upload a backup to preview it, then perform the actual restore in Supabase (SQL editor or <code>psql</code>).
            </span>
          </div>

          {/* Upload / preview */}
          <div onClick={() => fileRef.current?.click()}
            style={{ border:`2px dashed ${border}`, borderRadius:10, padding:20, textAlign:'center', cursor:'pointer', marginBottom:14 }}>
            <Upload size={24} color={sub} style={{ margin:'0 auto 8px' }}/>
            <div style={{ fontSize:13, fontWeight:600, color:txt }}>Upload Backup File</div>
            <div style={{ fontSize:11, color:sub, marginTop:4 }}>Click to choose a .json backup</div>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleRestoreFile} style={{ display:'none' }}/>
          </div>

          {restoreError && (
            <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:9, padding:'10px 14px', fontSize:12, color:'#b91c1c', display:'flex', gap:8, alignItems:'center' }}>
              <AlertTriangle size={14}/> {restoreError}
            </div>
          )}

          {restorePreview && (
            <div style={{ background:soft, borderRadius:10, border:`1px solid ${border}`, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <FileJson size={14} color={sub}/>
                <span style={{ fontSize:12, fontWeight:800, color:txt }}>Backup contents</span>
              </div>
              {restoreMeta?.exported_at && (
                <div style={{ fontSize:10, color:sub, marginBottom:8 }}>
                  {restoreMeta.app || 'Backup'} · exported {new Date(restoreMeta.exported_at).toLocaleString('en-PH')}
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {restorePreview.map((p) => (
                  <div key={p.name} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:txt }}>
                    <span style={{ fontFamily:'monospace' }}>{p.name}</span>
                    <span style={{ color:sub, fontWeight:700 }}>{p.count} rows</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Guidance card ── */}
      <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:'18px 20px' }}>
        <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:10 }}>Recommended backup routine</div>
        <ol style={{ margin:0, paddingLeft:18, fontSize:12, color:darkMode?'#9abea6':'#4b6557', lineHeight:1.7 }}>
          <li><strong>Weekly app export</strong> — click “Download Backup” and keep the .json on an external drive / cloud.</li>
          <li><strong>Full database dump</strong> — for a complete copy, run <code>pg_dump</code> (or <code>supabase db dump</code>) from the Supabase connection string.</li>
          <li><strong>Restore</strong> — done by the admin in Supabase (SQL editor / <code>psql</code>), never automatically from the app.</li>
          <li><strong>Production</strong> — upgrade to Supabase Pro (~₱1,500/mo) for automatic daily backups + point-in-time recovery.</li>
        </ol>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}