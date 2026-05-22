'use client'
import React, { useState } from 'react'
import { Database, RefreshCw, Download, Upload, AlertTriangle } from 'lucide-react'

export default function BackupRestore({ darkMode }: { darkMode: boolean }) {
  const card   = darkMode ? 'rgba(10,26,13,0.9)' : '#fff'
  const border = darkMode ? 'rgba(77,184,106,0.12)' : 'rgba(26,122,26,0.1)'
  const txt    = darkMode ? '#d1fae5' : '#0d2e0d'
  const sub    = darkMode ? '#4db86a' : '#1a7a1a'

  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')

  const handleBackup = async () => {
    setLoading(true); setMsg('Initiating backup...')
    await new Promise(r => setTimeout(r, 2000))
    setMsg('✅ Backup completed successfully! Stored to secure cloud storage.')
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:txt }}>Backup & Restore</h2>
        <p style={{ margin:'4px 0 0', fontSize:12, color:sub }}>Manage system data backups and restoration</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Create Backup */}
        <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Database size={22} color="#1a7a1a"/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:txt }}>Create Backup</div>
              <div style={{ fontSize:11, color:sub }}>Export all system data securely</div>
            </div>
          </div>

          {msg && (
            <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:9,
              padding:'10px 14px', fontSize:12, color:'#15803d', marginBottom:14 }}>{msg}</div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
            {[
              { label:'Patient Records',   checked:true  },
              { label:'Lab Results',        checked:true  },
              { label:'Inventory Data',     checked:true  },
              { label:'User Accounts',      checked:true  },
              { label:'System Logs',        checked:false },
              { label:'Settings & Config',  checked:false },
            ].map((item, i) => (
              <label key={i} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, color:txt }}>
                <input type="checkbox" defaultChecked={item.checked} style={{ accentColor:'#1a7a1a', width:15, height:15 }}/>
                {item.label}
              </label>
            ))}
          </div>

          <button onClick={handleBackup} disabled={loading}
            style={{ background:'linear-gradient(135deg,#1a7a1a,#26a326)', color:'#fff', border:'none',
              borderRadius:10, padding:'11px 20px', fontSize:13, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', gap:8, width:'100%', justifyContent:'center',
              opacity: loading?0.7:1 }}>
            {loading
              ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Backing up...</>
              : <><Download size={14}/> Start Backup</>}
          </button>
        </div>

        {/* Restore */}
        <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <RefreshCw size={22} color="#d97706"/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:txt }}>Restore Data</div>
              <div style={{ fontSize:11, color:sub }}>Restore from a previous backup</div>
            </div>
          </div>

          <div style={{ background: darkMode?'rgba(245,158,11,0.1)':'#fffbeb', border:'1px solid #fcd34d',
            borderRadius:10, padding:'10px 14px', marginBottom:16, display:'flex', gap:8, alignItems:'flex-start' }}>
            <AlertTriangle size={14} color="#d97706" style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:12, color: darkMode?'#fbbf24':'#92400e' }}>
              Restoring will overwrite current data. This action cannot be undone.
            </span>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {[
              { date:'2026-05-17 03:00', size:'12.4 MB' },
              { date:'2026-05-16 03:00', size:'12.1 MB' },
              { date:'2026-05-15 03:00', size:'11.8 MB' },
            ].map((b, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'10px 14px', background: darkMode?'rgba(255,255,255,0.04)':'#f4fbf4',
                borderRadius:9, border:`1px solid ${border}` }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:txt }}>{b.date}</div>
                  <div style={{ fontSize:10, color:sub }}>Auto backup · {b.size}</div>
                </div>
                <button style={{ background:'#dcfce7', color:'#15803d', border:'none', borderRadius:7,
                  padding:'5px 10px', cursor:'pointer', fontSize:11, fontWeight:700 }}>Restore</button>
              </div>
            ))}
          </div>

          <div style={{ border:`2px dashed ${border}`, borderRadius:10, padding:20, textAlign:'center', cursor:'pointer' }}>
            <Upload size={24} color={sub} style={{ margin:'0 auto 8px' }}/>
            <div style={{ fontSize:13, fontWeight:600, color:txt }}>Upload Backup File</div>
            <div style={{ fontSize:11, color:sub, marginTop:4 }}>Drag & drop or click to upload .sql or .zip</div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}