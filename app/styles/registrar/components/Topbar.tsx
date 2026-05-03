'use client'
import React from 'react'
import { useAuth } from '@/context/AuthContext'

interface TopbarProps {
  darkMode: boolean
  setDarkMode: (v: (d: boolean) => boolean) => void
}

export default function Topbar({ darkMode, setDarkMode }: TopbarProps) {
  const { user } = useAuth()

  return (
    <header style={{
      background:'#1b3a1b', height:64,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 24px', position:'sticky', top:0, zIndex:40,
      boxShadow:'0 1px 6px rgba(0,0,0,0.25)',
    }}>
      <div style={{ position:'relative', flex:1, maxWidth:420 }}>
        <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
          width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          placeholder="Search patients, medicines..."
          style={{ width:'100%', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:50, padding:'9px 18px 9px 38px', color:'#fff', fontSize:13, outline:'none' }}
        />
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:20 }}>
        {/* Bell */}
        <button style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%', width:38, height:38, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span style={{ position:'absolute', top:7, right:7, width:8, height:8, background:'#ff4444', borderRadius:'50%', border:'2px solid #1b3a1b' }}/>
        </button>

        {/* Dark mode */}
        <button onClick={() => setDarkMode(d => !d)}
          style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%', width:38, height:38, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {darkMode
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          }
        </button>

        {/* User pill */}
        <div style={{ display:'flex', alignItems:'center', gap:9, background:'rgba(255,255,255,0.12)', borderRadius:50, padding:'5px 16px 5px 5px' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg, #2ea82e, #1a7a1a)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>
            {user?.initials ?? 'R'}
          </div>
          <div>
            <div style={{ color:'#fff', fontWeight:600, fontSize:13, lineHeight:1.2 }}>{user?.name ?? 'Registrar'}</div>
            <div style={{ color:'rgba(255,255,255,0.55)', fontSize:10, textTransform:'uppercase', letterSpacing:0.5 }}>{user?.role ?? 'registrar'}</div>
          </div>
        </div>
      </div>
    </header>
  )
}