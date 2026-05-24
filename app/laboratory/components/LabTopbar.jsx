'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Upload, X, Check, AlertCircle, ChevronLeft, UserCircle, KeyRound, Settings } from 'lucide-react'

export default function LabTopbar({ darkMode, setDarkMode, sidebarOpen, setSidebarOpen }) {
  const [time,          setTime]          = useState('')
  const [showProfile,   setShowProfile]   = useState(false)
  const [showNotif,     setShowNotif]     = useState(false)
  const [notifs,        setNotifs]        = useState([])
  const [soundEnabled,  setSoundEnabled]  = useState(true)

  // ── Dropdown view: 'menu' | 'profile' | 'password' ──────────────────────
  const [dropView, setDropView] = useState('menu')

  // profile state
  const [profileName,      setProfileName]      = useState('')
  const [profileRole,      setProfileRole]      = useState('MedTech')
  const [profileAvatar,    setProfileAvatar]    = useState(null)
  const [profileEmail,     setProfileEmail]     = useState('')
  const [profileFirstName, setProfileFirstName] = useState('')
  const [profileLastName,  setProfileLastName]  = useState('')
  const [profileMiddle,    setProfileMiddle]    = useState('')
  const [profileStatus,    setProfileStatus]    = useState('')
  const [profileLicense,   setProfileLicense]   = useState('')

  // edit state
  const [editUsername,   setEditUsername]   = useState('')
  const [editEmail,      setEditEmail]      = useState('')
  const [editPhoto,      setEditPhoto]      = useState(null)
  const [savingProfile,  setSavingProfile]  = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uid,            setUid]            = useState(null)

  // password state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurPw, setShowCurPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConPw, setShowConPw] = useState(false)
  const [savingPw,  setSavingPw]  = useState(false)

  // toast
  const [toast,   setToast]   = useState('')
  const [toastOk, setToastOk] = useState(true)

  const profileRef  = useRef(null)
  const notifRef    = useRef(null)
  const audioCtxRef = useRef(null)
  const prevIdsRef  = useRef(new Set())
  const fileRef     = useRef(null)

  const { user } = useAuth()
  const unreadCount = notifs.filter(n => !n.read).length

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const id = session?.user?.id
    if (!id) return
    setUid(id)
    const { data } = await supabase.from('users')
      .select('username, email, avatar_url, role, first_name, middle_name, last_name, status, user_license')
      .eq('user_id', id).single()
    if (data) {
      setProfileName(data.username   || data.first_name || '')
      setProfileEmail(data.email     || '')
      setProfileRole(data.role       || 'MedTech')
      setProfileFirstName(data.first_name  || '')
      setProfileLastName(data.last_name    || '')
      setProfileMiddle(data.middle_name    || '')
      setProfileStatus(data.status         || 'active')
      setProfileLicense(data.user_license  || '')
      if (data.avatar_url) setProfileAvatar(data.avatar_url)
      setEditUsername(data.username  || '')
      setEditEmail(data.email        || '')
      setEditPhoto(data.avatar_url   || null)
    }
  }

  useEffect(() => { fetchProfile() }, [])

  useEffect(() => {
    const fn = () => fetchProfile()
    window.addEventListener('profileUpdated', fn)
    window.addEventListener('avatarUpdated',  fn)
    return () => { window.removeEventListener('profileUpdated', fn); window.removeEventListener('avatarUpdated', fn) }
  }, [])

  // ── Clock ──
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    const h = e => {
      if (profileRef.current && !profileRef.current.contains(e.target)) { setShowProfile(false); setDropView('menu') }
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotif(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Play notification sound ──
  const playNotifSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const tones = [
        { freq: 880,  start: 0,    duration: 0.12 },
        { freq: 1100, start: 0.1,  duration: 0.12 },
        { freq: 880,  start: 0.22, duration: 0.18 },
      ]
      tones.forEach(({ freq, start, duration }) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
        gain.gain.setValueAtTime(0, ctx.currentTime + start)
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + start + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + duration + 0.05)
      })
    } catch (e) { console.warn('Audio context error:', e) }
  }, [soundEnabled])

  // ── Load notifications ──
  const loadNotifs = useCallback(async () => {
    const { data, error } = await supabase
      .from('laboratory_requests')
      .select(`id, request_date, created_at, status, patients ( first_name, middle_name, last_name )`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) { console.error('loadNotifs:', error); return }
    setNotifs(prev => {
      const prevMap = Object.fromEntries(prev.map(n => [n.id, n]))
      return (data || []).map(r => ({
        id:           r.id,
        patient_name: [r.patients?.last_name, r.patients?.first_name].filter(Boolean).join(', '),
        request_date: r.request_date,
        created_at:   r.created_at,
        status:       r.status,
        read:         prevMap[r.id]?.read ?? false,
      }))
    })
    prevIdsRef.current = new Set((data || []).map(r => r.id))
  }, [])

  useEffect(() => { loadNotifs() }, [loadNotifs])

  // ── Realtime lab requests ──
  useEffect(() => {
    const channel = supabase.channel('lab-requests-notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'laboratory_requests' }, async (payload) => {
        const r = payload.new; if (!r) return
        const { data: patient } = await supabase.from('patients').select('first_name, middle_name, last_name').eq('id', r.patient_id).single()
        const newNotif = {
          id: r.id,
          patient_name: patient ? [patient.last_name, patient.first_name].filter(Boolean).join(', ') : 'Unknown Patient',
          request_date: r.request_date, created_at: r.created_at, status: r.status, read: false, isNew: true,
        }
        setNotifs(prev => [newNotif, ...prev].slice(0, 20))
        playNotifSound()
        setTimeout(() => setNotifs(prev => prev.map(n => n.id === r.id ? { ...n, isNew: false } : n)), 5000)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'laboratory_requests' }, (payload) => {
        const r = payload.new
        if (r.status !== 'pending') setNotifs(prev => prev.filter(n => n.id !== r.id))
      })
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
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  // ── Profile save ──
  const handleSaveProfile = async () => {
    if (!editUsername.trim() || !editEmail.trim()) { showToast('Fill in all fields.', false); return }
    if (!uid) { showToast('Not logged in.', false); return }
    setSavingProfile(true)
    const { error } = await supabase.from('users').update({ username: editUsername.trim(), email: editEmail.trim() }).eq('user_id', uid)
    setSavingProfile(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    setProfileName(editUsername.trim()); setProfileEmail(editEmail.trim())
    window.dispatchEvent(new Event('profileUpdated'))
    showToast('Profile saved!', true)
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? uid
    if (!userId) { showToast('Not logged in.', false); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Max 5 MB.', false); return }
    setUploadingPhoto(true)
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/avatar_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { showToast('Upload failed.', false); setUploadingPhoto(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData?.publicUrl
    if (!url) { showToast('Could not get URL.', false); setUploadingPhoto(false); return }
    await supabase.from('users').update({ avatar_url: url }).eq('user_id', userId)
    const busted = url + '?t=' + Date.now()
    setEditPhoto(busted); setProfileAvatar(busted)
    window.dispatchEvent(new Event('avatarUpdated'))
    showToast('Photo updated!', true)
    setUploadingPhoto(false); e.target.value = ''
  }

  const pwConds = {
    length:  newPw.length >= 8,
    special: /[!@#$%^&*?]/.test(newPw),
    number:  /[0-9]/.test(newPw),
    match:   newPw === confirmPw && confirmPw.length > 0,
  }

  const handleChangePassword = async () => {
    if (!currentPw)       { showToast('Enter current password.', false); return }
    if (!pwConds.length)  { showToast('Min 8 characters.', false); return }
    if (!pwConds.special) { showToast('Add a special character.', false); return }
    if (!pwConds.number)  { showToast('Add a number.', false); return }
    if (!pwConds.match)   { showToast('Passwords do not match.', false); return }
    setSavingPw(true)
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: profileEmail, password: currentPw })
    if (signErr) { showToast('Current password is incorrect.', false); setSavingPw(false); return }
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (updErr) { showToast('Error: ' + updErr.message, false); return }
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    showToast('Password changed!', true)
  }

  const showToast = (msg, ok) => {
    setToast(msg); setToastOk(ok)
    setTimeout(() => setToast(''), 3000)
  }

  const openDrop = (view) => {
    if (view === 'profile')  { setEditUsername(profileName); setEditEmail(profileEmail); setEditPhoto(profileAvatar) }
    if (view === 'password') { setCurrentPw(''); setNewPw(''); setConfirmPw('') }
    setDropView(view); setShowProfile(true)
  }

  // ── Derived display values ──
  const fullName      = [profileFirstName, profileLastName].filter(Boolean).join(' ')
  const displayName   = fullName   || profileName   || user?.name  || 'MedTech'
  const displayRole   = profileRole || user?.role   || 'MedTech'
  const displayEmail  = profileEmail || user?.email || ''
  const displayAvatar = profileAvatar || null
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'MT'

  // ── Shared styles ──
  const iconBtn = {
    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
    width: 38, height: 38, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', flexShrink: 0, transition: 'background 0.15s',
  }
  const inp = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    borderRadius: 9, border: '1.5px solid #e5e7eb',
    background: '#f9fafb', color: '#1f2937', fontSize: 12, outline: 'none',
  }
  const lbl = {
    display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4,
  }
  const saveBtn = {
    width: '100%', padding: '10px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg,#16a34a,#0d9488)',
    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    boxShadow: '0 4px 12px #16a34a33',
  }

  const AvatarCircle = ({ size = 32, fontSize = 13, src = displayAvatar }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: 'linear-gradient(135deg,#2ea82e,#1a7a1a)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize,
      border: '2px solid rgba(255,255,255,0.25)',
    }}>
      {src ? <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : initials}
    </div>
  )

  return (
    <>
      <header style={{
        background: '#1b3a1b', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 22px', position: 'sticky', top: 0, zIndex: 40,
        boxShadow: '0 1px 6px rgba(0,0,0,0.25)', gap: 16, flexShrink: 0,
      }}>

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
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2">
            </svg>
          </div>
        </div>

        {/* ── Right: clock, bell, dark mode, user pill ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

          {/* Clock */}
          <div style={{
            color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600,
            letterSpacing: 0.5, whiteSpace: 'nowrap',
            background: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: '5px 14px',
            fontVariantNumeric: 'tabular-nums',
          }}>{time}</div>

          {/* ── Notification Bell ── */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotif(p => !p); if (!showNotif) markAllRead() }}
              style={iconBtn}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                style={{ animation: notifs.some(n => n.isNew) ? 'bellShake 0.4s ease infinite alternate' : 'none' }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1b3a1b', padding: '0 3px' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotif && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', background: '#fff', borderRadius: 16, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 100 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#1b3a1b,#2d5a2d)' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>Lab Notifications</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                      {notifs.length} pending request{notifs.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => setSoundEnabled(s => !s)}
                      title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
                      style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {soundEnabled ? '🔔' : '🔕'}
                    </button>
                    {notifs.length > 0 && (
                      <button onClick={markAllRead}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {notifs.length === 0 ? (
                    <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🧪</div>
                      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>No pending lab requests</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Doctor requests will appear here</div>
                    </div>
                  ) : notifs.map((n, i) => (
                    <div key={n.id} onClick={() => markOneRead(n.id)}
                      style={{
                        padding: '11px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
                        borderBottom: i < notifs.length - 1 ? '1px solid #f9fafb' : 'none',
                        cursor: 'pointer',
                        background: n.isNew ? '#f0fdf4' : n.read ? 'transparent' : '#f8fffe',
                        transition: 'background 0.15s', position: 'relative',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseLeave={e => e.currentTarget.style.background = n.isNew ? '#f0fdf4' : n.read ? 'transparent' : '#f8fffe'}
                    >
                      <div style={{ marginTop: 4, flexShrink: 0 }}>
                        {n.isNew ? (
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 3px rgba(22,163,74,0.3)', animation: 'pulse 1s ease infinite' }}/>
                        ) : !n.read ? (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }}/>
                        ) : (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e5e7eb' }}/>
                        )}
                      </div>
                    
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: n.read ? 600 : 800, color: '#1f2937', marginBottom: 2 }}>Lab Request — Doctor</div>
                        <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.patient_name || 'Unknown Patient'}</div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, display: 'flex', gap: 6 }}>
                          <span> {n.request_date || '—'}</span>
                          <span>·</span>
                          <span>{timeAgo(n.created_at)}</span>
                        </div>
                        {n.isNew && (
                          <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#16a34a', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 }}>
                            ● NEW REQUEST
                          </div>
                        )}
                      </div>
                      <button onClick={e => dismissOne(n.id, e)} title="Dismiss"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>×</button>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid #f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={loadNotifs} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>↻ Refresh</button>
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, cursor: 'pointer' }}>View all in records →</span>
                </div>
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <button onClick={() => setDarkMode(d => !d)} style={iconBtn}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            {darkMode
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          {/* ── User pill ── */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <div
              onClick={() => { setShowProfile(p => !p); setDropView('menu') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                background: 'rgba(255,255,255,0.12)', borderRadius: 50,
                padding: '5px 16px 5px 5px', cursor: 'pointer',
                border: showProfile ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >
              <AvatarCircle size={32} fontSize={13}/>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1.2, whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{displayRole}</div>
              </div>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
                style={{ marginLeft: 2, transform: showProfile ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {/* ── Profile Dropdown ── */}
            {showProfile && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                background: '#fff', borderRadius: 16, width: 280,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 100,
              }}>

                {/* ── VIEW: menu ── */}
                {dropView === 'menu' && (
                  <>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg,#1b3a1b,#2d5a2d)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <AvatarCircle size={44} fontSize={16}/>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>{displayRole}</div>
                        {displayEmail && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayEmail}</div>}
                      </div>
                    </div>
                    <div style={{ padding: '6px 0' }}>
                      {[
                        { icon: UserCircle, label: 'My Profile',      sub: 'View and edit profile', action: () => openDrop('profile')  },
                        { icon: KeyRound,   label: 'Change Password', sub: 'Update your password',  action: () => openDrop('password') },
                        { icon: Settings,   label: 'Settings',        sub: 'App preferences',       action: () => setShowProfile(false) },
                      ].map((item, i) => (
                        <div key={i} onClick={item.action}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <item.icon size={16} color="#16a34a" strokeWidth={2}/>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{item.sub}</div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ flexShrink: 0, marginLeft: 'auto' }}><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── VIEW: profile ── */}
                {dropView === 'profile' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fafafa', flexShrink: 0 }}>
                      <button onClick={() => setDropView('menu')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: 4, borderRadius: 6 }}>
                        <ChevronLeft size={16}/>
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1f2937' }}>My Profile</span>
                    </div>

                    <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                        {/* Avatar + name banner */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', borderRadius: 12, padding: '12px' }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#16a34a,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 20, border: '3px solid #fff', boxShadow: '0 2px 8px #16a34a33' }}>
                              {editPhoto ? <img src={editPhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : initials}
                            </div>
                            <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} title="Change photo"
                              style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', border: '2px solid #fff', background: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: uploadingPhoto ? 0.6 : 1 }}>
                              <Upload size={10} color="#fff"/>
                            </button>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {[profileFirstName, profileMiddle, profileLastName].filter(Boolean).join(' ') || displayName}
                            </div>
                            <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>{displayRole}</div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: profileStatus === 'active' ? '#dcfce7' : '#fee2e2', borderRadius: 20, padding: '2px 8px' }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: profileStatus === 'active' ? '#16a34a' : '#dc2626' }}/>
                              <span style={{ fontSize: 9, fontWeight: 700, color: profileStatus === 'active' ? '#166534' : '#991b1b', textTransform: 'uppercase', letterSpacing: 0.4 }}>{profileStatus || 'active'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Read-only info */}
                        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Account Info</div>
                          {[
                            ['Full Name', [profileFirstName, profileMiddle, profileLastName].filter(Boolean).join(' ') || '—'],
                            ['Email',     displayEmail  || '—'],
                            ['Role',      displayRole   || '—'],
                            ...(profileLicense ? [['License No.', profileLicense]] : []),
                          ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                              <span style={{ fontSize: 11, color: '#1f2937', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Editable fields */}
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>Edit Profile</div>
                        <div>
                          <label style={lbl}>Username</label>
                          <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} style={inp}
                            onFocus={e => e.currentTarget.style.borderColor = '#16a34a'}
                            onBlur={e  => e.currentTarget.style.borderColor = '#e5e7eb'}/>
                        </div>
                        <div>
                          <label style={lbl}>Email</label>
                          <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={inp}
                            onFocus={e => e.currentTarget.style.borderColor = '#16a34a'}
                            onBlur={e  => e.currentTarget.style.borderColor = '#e5e7eb'}/>
                        </div>
                        <button onClick={handleSaveProfile} disabled={savingProfile} style={{ ...saveBtn, opacity: savingProfile ? 0.7 : 1 }}>
                          <Check size={13}/> {savingProfile ? 'Saving…' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── VIEW: password ── */}
                {dropView === 'password' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                      <button onClick={() => setDropView('menu')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: 4, borderRadius: 6 }}>
                        <ChevronLeft size={16}/>
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1f2937' }}>Change Password</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { lbl: 'Current Password', val: currentPw, set: setCurrentPw, show: showCurPw, tog: () => setShowCurPw(p => !p) },
                        { lbl: 'New Password',     val: newPw,     set: setNewPw,     show: showNewPw, tog: () => setShowNewPw(p => !p) },
                        { lbl: 'Confirm Password', val: confirmPw, set: setConfirmPw, show: showConPw, tog: () => setShowConPw(p => !p) },
                      ].map(({ lbl: l, val, set, show, tog }) => (
                        <div key={l}>
                          <label style={lbl}>{l}</label>
                          <div style={{ position: 'relative' }}>
                            <input type={show ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)}
                              style={{ ...inp, paddingRight: 36 }}
                              onFocus={e => e.currentTarget.style.borderColor = '#16a34a'}
                              onBlur={e  => e.currentTarget.style.borderColor = '#e5e7eb'}/>
                            <button onClick={tog} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}>
                              {show ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
                        {[
                          [pwConds.length,  '8+ chars'],
                          [pwConds.special, 'Special char'],
                          [pwConds.number,  'Number'],
                          [pwConds.match,   'Match'],
                        ].map(([met, label]) => (
                          <div key={String(label)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: met ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: met ? '#16a34a' : 'transparent', border: `1.5px solid ${met ? '#16a34a' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {met && <Check size={8} color="#fff" strokeWidth={3}/>}
                            </div>
                            {label}
                          </div>
                        ))}
                      </div>
                      <button onClick={handleChangePassword} disabled={savingPw} style={{ ...saveBtn, opacity: savingPw ? 0.7 : 1 }}>
                        🔒 {savingPw ? 'Saving…' : 'Change Password'}
                      </button>
                    </div>
                  </>
                )}

              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handlePhotoUpload} style={{ display: 'none' }}/>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toastOk ? 'linear-gradient(135deg,#16a34a,#0d9488)' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
          color: '#fff', borderRadius: 12, padding: '12px 18px',
          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13,
          boxShadow: `0 8px 24px ${toastOk ? '#16a34a' : '#dc2626'}55`,
        }}>
          {toastOk ? <Check size={15}/> : <AlertCircle size={15}/>}
          {toast}
        </div>
      )}

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
    </>
  )
}