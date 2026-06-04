'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

/*
  Props:
  - darkMode:       boolean
  - setDarkMode:    (fn) => void
  - sidebarOpen:    boolean
  - setSidebarOpen: (fn) => void
  - user:           { name, initials, role } | null
*/
export default function LabTopbar({ darkMode, setDarkMode, sidebarOpen, setSidebarOpen }) {
  const [time,         setTime]         = useState('')
  const [showProfile,  setShowProfile]  = useState(false)
  const [showNotif,    setShowNotif]    = useState(false)
  const [notifs,       setNotifs]       = useState([])      // { id, patient_name, request_date, created_at, read }
  const [soundEnabled, setSoundEnabled] = useState(true)

  const profileRef  = useRef(null)
  const notifRef    = useRef(null)
  const audioCtxRef = useRef(null)
  const prevIdsRef  = useRef(new Set())

  // Build full name from users table (first_name + last_name)
  const { user } = useAuth()
  const userRole    = user?.role ?? 'medtech'
  const unreadCount = notifs.filter(n => !n.read).length

  /* ── Clock ── */
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    const h = e => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotif(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  /* ── Play notification sound using Web Audio API (no file needed) ── */
  const playNotifSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx

      // Two-tone ping: high then slightly lower
      const tones = [
        { freq: 880, start: 0,    duration: 0.12 },
        { freq: 1100,start: 0.1,  duration: 0.12 },
        { freq: 880, start: 0.22, duration: 0.18 },
      ]
      tones.forEach(({ freq, start, duration }) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
        gain.gain.setValueAtTime(0, ctx.currentTime + start)
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + start + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + duration + 0.05)
      })
    } catch (e) {
      console.warn('Audio context error:', e)
    }
  }, [soundEnabled])

  /* ── Load initial notifications (last 20 pending requests) ── */
  const loadNotifs = useCallback(async () => {
    const { data, error } = await supabase
      .from('laboratory_requests')
      .select(`
        id,
        request_date,
        created_at,
        status,
        patients ( first_name, middle_name, last_name )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) { console.error('loadNotifs:', error); return }

    setNotifs(prev => {
      const prevMap = Object.fromEntries(prev.map(n => [n.id, n]))
      const next = (data || []).map(r => ({
        id:           r.id,
        patient_name: [r.patients?.last_name, r.patients?.first_name].filter(Boolean).join(', '),
        request_date: r.request_date,
        created_at:   r.created_at,
        status:       r.status,
        read:         prevMap[r.id]?.read ?? false,
      }))
      return next
    })

    // Track current IDs for new arrival detection
    const ids = new Set((data || []).map(r => r.id))
    prevIdsRef.current = ids
  }, [])

  useEffect(() => { loadNotifs() }, [loadNotifs])

  /* ── Supabase Realtime — listen for new lab requests ── */
  useEffect(() => {
    const channel = supabase
      .channel('lab-requests-notif')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'laboratory_requests' },
        async (payload) => {
          const r = payload.new
          if (!r) return

          // Fetch patient name
          const { data: patient } = await supabase
            .from('patients')
            .select('first_name, middle_name, last_name')
            .eq('id', r.patient_id)
            .single()

          const newNotif = {
            id:           r.id,
            patient_name: patient ? [patient.last_name, patient.first_name].filter(Boolean).join(', ') : 'Unknown Patient',
            request_date: r.request_date,
            created_at:   r.created_at,
            status:       r.status,
            read:         false,
            isNew:        true, // flash indicator
          }

          setNotifs(prev => [newNotif, ...prev].slice(0, 20))
          playNotifSound()

          // Remove isNew flag after 5s
          setTimeout(() => {
            setNotifs(prev => prev.map(n => n.id === r.id ? { ...n, isNew: false } : n))
          }, 5000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'laboratory_requests' },
        (payload) => {
          const r = payload.new
          if (r.status !== 'pending') {
            // Remove from notifications if no longer pending
            setNotifs(prev => prev.filter(n => n.id !== r.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [playNotifSound])

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  const markOneRead = (id) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const dismissOne  = (id, e) => { e.stopPropagation(); setNotifs(prev => prev.filter(n => n.id !== id)) }

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m} min${m!==1?'s':''} ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} hr${h!==1?'s':''} ago`
    return `${Math.floor(h/24)}d ago`
  }

  const iconBtn = {
    background: 'rgba(255,255,255,0.1)',
    border: 'none', borderRadius: '50%',
    width: 38, height: 38, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', flexShrink: 0, transition: 'background 0.15s',
  }

  return (
    <header style={{
      background: '#1b3a1b', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 22px', position: 'sticky', top: 0, zIndex: 40,
      boxShadow: '0 1px 6px rgba(0,0,0,0.25)', gap: 16, flexShrink: 0,
    }}>

      {/* Left: hamburger + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ ...iconBtn, borderRadius: 8 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
          <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search patients, lab tests..."
            style={{ width:'100%', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:50, padding:'9px 18px 9px 38px', color:'#fff', fontSize:13, outline:'none', transition:'border 0.2s', boxSizing:'border-box' }}
            onFocus={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.5)'}
            onBlur={e  => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)'}
          />
        </div>
      </div>

      {/* Right: clock, bell, dark mode, user */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>

        {/* Clock */}
        <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:600, letterSpacing:0.5, whiteSpace:'nowrap', background:'rgba(255,255,255,0.07)', borderRadius:20, padding:'5px 14px', fontVariantNumeric:'tabular-nums' }}>
          {time}
        </div>

        {/* ── Notification Bell ── */}
        <div ref={notifRef} style={{ position:'relative' }}>
          <button
            onClick={() => { setShowNotif(p => !p); if (!showNotif) markAllRead() }}
            style={iconBtn}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            {/* Bell with subtle shake animation if new */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              style={{ animation: notifs.some(n=>n.isNew) ? 'bellShake 0.4s ease infinite alternate' : 'none' }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{ position:'absolute', top:4, right:4, minWidth:16, height:16, borderRadius:'50%', background:'#dc2626', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #1b3a1b', padding:'0 3px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* ── Notification Dropdown ── */}
          {showNotif && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 10px)', background:'#fff', borderRadius:16, width:340, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', overflow:'hidden', zIndex:100 }}>

              {/* Header */}
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0fdf4', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg,#1b3a1b,#2d5a2d)' }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:'#fff' }}>Lab Notifications</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', marginTop:1 }}>
                    {notifs.length} pending request{notifs.length!==1?'s':''}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  {/* Sound toggle */}
                  <button
                    onClick={() => setSoundEnabled(s => !s)}
                    title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
                    style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'#fff', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                    {soundEnabled ? '🔔' : '🔕'}
                  </button>
                  {notifs.length > 0 && (
                    <button onClick={markAllRead}
                      style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'rgba(255,255,255,0.85)', fontSize:11 }}>
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Notification list */}
              <div style={{ maxHeight:380, overflowY:'auto' }}>
                {notifs.length === 0 ? (
                  <div style={{ padding:'28px 20px', textAlign:'center' }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>🧪</div>
                    <div style={{ fontSize:12, color:'#6b7280', fontWeight:600 }}>No pending lab requests</div>
                    <div style={{ fontSize:11, color:'#9ca3af', marginTop:3 }}>Doctor requests will appear here</div>
                  </div>
                ) : notifs.map((n, i) => (
                  <div
                    key={n.id}
                    onClick={() => markOneRead(n.id)}
                    style={{
                      padding:'11px 16px', display:'flex', gap:10, alignItems:'flex-start',
                      borderBottom: i < notifs.length-1 ? '1px solid #f9fafb' : 'none',
                      cursor:'pointer',
                      background: n.isNew ? '#f0fdf4' : n.read ? 'transparent' : '#f8fffe',
                      transition:'background 0.15s',
                      position:'relative',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = n.isNew?'#f0fdf4':n.read?'transparent':'#f8fffe'}
                  >
                    {/* Indicator dot */}
                    <div style={{ marginTop:4, flexShrink:0 }}>
                      {n.isNew ? (
                        /* Pulsing green dot for brand-new */
                        <div style={{ width:10, height:10, borderRadius:'50%', background:'#16a34a', boxShadow:'0 0 0 3px rgba(22,163,74,0.3)', animation:'pulse 1s ease infinite' }}/>
                      ) : !n.read ? (
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#16a34a' }}/>
                      ) : (
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#e5e7eb' }}/>
                      )}
                    </div>

                    {/* Icon */}
                    <div style={{ width:36, height:36, borderRadius:10, background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      🧪
                    </div>

                    {/* Content */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight: n.read?600:800, color:'#1f2937', marginBottom:2 }}>
                        Lab Request — Doctor
                      </div>
                      <div style={{ fontSize:12, color:'#16a34a', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {n.patient_name || 'Unknown Patient'}
                      </div>
                      <div style={{ fontSize:10, color:'#6b7280', marginTop:2, display:'flex', gap:6 }}>
                        <span>📅 {n.request_date || '—'}</span>
                        <span>·</span>
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                      {n.isNew && (
                        <div style={{ marginTop:4, display:'inline-flex', alignItems:'center', gap:4, background:'#dcfce7', color:'#16a34a', fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:20, letterSpacing:0.5 }}>
                          ● NEW REQUEST
                        </div>
                      )}
                    </div>

                    {/* Dismiss X */}
                    <button
                      onClick={e => dismissOne(n.id, e)}
                      title="Dismiss"
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:14, padding:'0 2px', lineHeight:1, flexShrink:0 }}
                      onMouseEnter={e => e.currentTarget.style.color='#dc2626'}
                      onMouseLeave={e => e.currentTarget.style.color='#9ca3af'}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ padding:'10px 16px', textAlign:'center', borderTop:'1px solid #f0fdf4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <button onClick={loadNotifs}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#6b7280', fontWeight:600 }}>
                  ↻ Refresh
                </button>
                <span style={{ fontSize:11, color:'#16a34a', fontWeight:700, cursor:'pointer' }}>
                  View all in records →
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Dark mode */}
        <button onClick={() => setDarkMode(d => !d)} style={iconBtn}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
          {darkMode
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
          }
        </button>

        {/* User pill */}
        <div ref={profileRef} style={{ position:'relative' }}>
          <div onClick={() => setShowProfile(p => !p)}
            style={{ display:'flex', alignItems:'center', gap:9, background:'rgba(255,255,255,0.12)', borderRadius:50, padding:'5px 16px 5px 5px', cursor:'pointer', border: showProfile?'1px solid rgba(255,255,255,0.3)':'1px solid transparent', transition:'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#2ea82e,#1a7a1a)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0 }}>
              {user?.initials ?? 'M'}
            </div>
            <div>
              <div style={{ color:'#fff', fontWeight:600, fontSize:13, lineHeight:1.2, whiteSpace:'nowrap' }}>{user?.name ?? 'MedTech'}</div>
              <div style={{ color:'rgba(255,255,255,0.55)', fontSize:10, textTransform:'uppercase', letterSpacing:0.5 }}>{user?.role ?? 'medtech'}</div>
            </div>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
              style={{ marginLeft:2, transform: showProfile?'rotate(180deg)':'rotate(0)', transition:'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {showProfile && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 10px)', background:'#fff', borderRadius:16, width:220, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', overflow:'hidden', zIndex:100 }}>
              <div style={{ padding:'14px 16px', background:'linear-gradient(135deg,#1b3a1b,#2d5a2d)', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#2ea82e,#1a7a1a)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:15, flexShrink:0 }}>
                  {user?.initials ?? 'M'}
                </div>
                <div>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:13 }}>{user?.name ?? 'MedTech'}</div>
                  <div style={{ color:'rgba(255,255,255,0.6)', fontSize:10, textTransform:'uppercase', letterSpacing:0.5 }}>{user?.role ?? 'medtech'}</div>
                </div>
              </div>
              {[{ icon:'👤', label:'My Profile' },{ icon:'🔒', label:'Change Password' },{ icon:'⚙️', label:'Settings' }].map((item,i) => (
                <button key={i} style={{ width:'100%', padding:'11px 16px', textAlign:'left', border:'none', background:'transparent', cursor:'pointer', fontSize:13, color:'#1f2937', fontWeight:600, display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #f9fafb', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontSize:15 }}>{item.icon}</span> {item.label}
                </button>
              ))}
              <button style={{ width:'100%', padding:'11px 16px', textAlign:'left', border:'none', background:'transparent', cursor:'pointer', fontSize:13, color:'#dc2626', fontWeight:700, display:'flex', alignItems:'center', gap:10, transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize:15 }}>🚪</span> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CSS Animations (injected once) ── */}
      <style>{`
        @keyframes bellShake {
          0%   { transform: rotate(-12deg); }
          100% { transform: rotate(12deg); }
        }
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0   rgba(22,163,74,0.5); }
          100% { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
        }
      `}</style>
    </header>
  )
}