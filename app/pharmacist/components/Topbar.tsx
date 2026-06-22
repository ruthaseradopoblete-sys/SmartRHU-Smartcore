'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

type Notification = {
  id: string
  title: string
  sub: string
  read: boolean
  created_at: string
}

export default function Topbar({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user }         = useAuth()
  const { dark, toggle } = useTheme()
  const router           = useRouter()

  const [profileName,   setProfileName]   = useState('')
  const [profileRole,   setProfileRole]   = useState('Pharmacist')
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)
  const [profileEmail,  setProfileEmail]  = useState('')
  const [time,          setTime]          = useState('')
  const [showProfile,   setShowProfile]   = useState(false)
  const [showNotif,     setShowNotif]     = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef   = useRef<HTMLDivElement>(null)

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) return
    const { data, error } = await supabase
      .from('users').select('username, email, avatar_url, role')
      .eq('user_id', uid).single()
    if (error) { console.error('[Topbar] fetchProfile:', error); return }
    if (data) {
      setProfileName(data.username  || '')
      setProfileEmail(data.email    || '')
      setProfileRole(data.role      || 'Pharmacist')
      if (data.avatar_url) setProfileAvatar(data.avatar_url)
    }
  }

  // ── Listen to settings save events ────────────────────────────────────────
  useEffect(() => {
    window.addEventListener('profileUpdated', fetchProfile)
    window.addEventListener('avatarUpdated',  fetchProfile)
    return () => {
      window.removeEventListener('profileUpdated', fetchProfile)
      window.removeEventListener('avatarUpdated',  fetchProfile)
    }
  }, [])

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setTime(
      new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setShowNotif(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Fetch existing unread prescription notifications ───────────────────────
  useEffect(() => {
    fetchPrescriptionNotifications()
  }, [])

  const fetchPrescriptionNotifications = async () => {
    // Load recent prescriptions from the last 24 hours as notifications
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Select * first so we can inspect actual column names if something fails
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[Topbar] fetchPrescriptionNotifs:', error.message, error.details, error.hint)
      return
    }

    if (data && data.length > 0) {
      // Log the first row so you can see actual column names in the console
      console.log('[Topbar] pharma_prescriptions columns:', Object.keys(data[0]))

      const notifs: Notification[] = data.map((row: any) => {
        // Gracefully fall back across common column name variants
        const doctor  = row.doctor_name  ?? row.doctor   ?? row.physician ?? row.referred_by ?? 'Doctor'
        const patient = row.patient_name ?? row.patient  ?? row.full_name ?? row.name        ?? 'Patient'
        const ts      = row.created_at   ?? row.date     ?? row.timestamp ?? new Date().toISOString()
        return {
          id: String(row.id),
          title: 'New Prescription',
          sub: `${doctor} → ${patient} · ${timeAgo(ts)}`,
          read: false,
          created_at: ts,
        }
      })
      setNotifications(notifs)
    }
  }

  // ── Real-time: listen for new prescriptions ────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('pharma_prescriptions_notif')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'prescriptions' },
        (payload) => {
          const row = payload.new as any
          const doctor  = row.doctor_name  ?? row.doctor   ?? row.physician ?? row.referred_by ?? 'Doctor'
          const patient = row.patient_name ?? row.patient  ?? row.full_name ?? row.name        ?? 'Patient'
          const ts      = row.created_at   ?? row.date     ?? row.timestamp ?? new Date().toISOString()
          const newNotif: Notification = {
            id: String(row.id),
            title: 'New Prescription',
            sub: `${doctor} → ${patient} · just now`,
            read: false,
            created_at: ts,
          }
          setNotifications(prev => [newNotif, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // ── Mark single as read ────────────────────────────────────────────────────
  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  // ── Time ago helper ────────────────────────────────────────────────────────
  function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60)  return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const displayName   = profileName   || user?.name  || 'Pharmacist'
  const displayRole   = profileRole   || user?.role  || 'Pharmacist'
  const displayEmail  = profileEmail  || user?.email || ''
  const displayAvatar = profileAvatar || null
  const initials      = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'P'

  const iconBtn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
    width: 38, height: 38, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', flexShrink: 0, transition: 'background 0.15s',
  }

  const AvatarCircle = ({ size = 32, fontSize = 13 }: { size?: number; fontSize?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: 'linear-gradient(135deg,#2ea82e,#0d9488)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize,
      border: '2px solid rgba(255,255,255,0.25)',
    }}>
      {displayAvatar
        ? <img src={displayAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  )

  // ── Navigate helper ────────────────────────────────────────────────────────
  const goTo = (page: string, tab?: string) => {
    setShowProfile(false)
    onNavigate?.(page)
    router.push(`/pharmacist?page=${page}${tab ? `&tab=${tab}` : ''}`)
  }

  // ── SVG icons ──────────────────────────────────────────────────────────────
  const IconProfile = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
  const IconLock = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
  const IconSettings = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
  const IconLogout = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )

  const menuItems = [
    { icon: <IconProfile />,  label: 'My Profile',      action: () => goTo('settings', 'profile')  },
    { icon: <IconLock />,     label: 'Change Password', action: () => goTo('settings', 'password') },
    { icon: <IconSettings />, label: 'Settings',        action: () => goTo('settings', 'profile')  },
  ]

  return (
    <header style={{
      background: '#1b3a1b', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', position: 'sticky', top: 0, zIndex: 40,
      boxShadow: '0 1px 6px rgba(0,0,0,0.25)', gap: 16,
    }}>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          name="medicine-search"
          autoComplete="off"
          placeholder="Search medicines, prescriptions…"
          onChange={e => window.dispatchEvent(new CustomEvent('header-search', { detail: e.target.value }))}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50,
            padding: '9px 18px 9px 38px', color: '#fff', fontSize: 13,
            outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box',
          }}
          onFocus={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.5)')}
          onBlur={e  => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)')}
        />
      </div>

      {/* ── Right section ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

        {/* Clock */}
        <div style={{
          color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600,
          letterSpacing: 0.5, whiteSpace: 'nowrap',
          background: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: '5px 14px',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {time}
        </div>

        {/* ── Notification bell ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotif(p => !p)}
            style={iconBtn}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4, width: 16, height: 16,
                borderRadius: '50%', background: '#dc2626', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #1b3a1b',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotif && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 10px)',
              background: '#fff', borderRadius: 16, width: 320,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 100,
              animation: 'fadeDown 0.15s ease',
            }}>
              {/* Header */}
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid #f0fdf4',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#1b3a1b' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <span style={{
                      background: '#dc2626', color: '#fff',
                      borderRadius: 20, padding: '1px 7px',
                      fontSize: 10, fontWeight: 800,
                    }}>{unreadCount}</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <span
                    onClick={markAllRead}
                    style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Mark all read
                  </span>
                )}
              </div>

              {/* Notification list */}
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '28px 16px', textAlign: 'center',
                    color: '#9ca3af', fontSize: 12, fontStyle: 'italic',
                  }}>
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markRead(n.id)
                        setShowNotif(false)
                        onNavigate?.('prescriptions')
                      }}
                      style={{
                        padding: '11px 16px',
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        borderBottom: i < notifications.length - 1 ? '1px solid #f9fafb' : 'none',
                        cursor: 'pointer',
                        background: n.read ? 'transparent' : '#f0fdf4',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#dcfce7')}
                      onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : '#f0fdf4')}
                    >
                      {/* Unread dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                        background: n.read ? '#d1d5db' : '#16a34a',
                        transition: 'background 0.2s',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937' }}>{n.title}</div>
                        <div style={{
                          fontSize: 11, color: '#6b7280', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{n.sub}</div>
                      </div>
                      {/* Rx icon */}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0, marginTop: 2 }}>
                        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
                      </svg>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid #f0fdf4' }}>
                  <span
                    onClick={() => { setShowNotif(false); onNavigate?.('prescriptions') }}
                    style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, cursor: 'pointer' }}
                  >
                    View all prescriptions
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Dark mode ── */}
        <button onClick={toggle} style={iconBtn}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
          {dark
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

        {/* ── User pill + dropdown ── */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div onClick={() => setShowProfile(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'rgba(255,255,255,0.12)', borderRadius: 50,
            padding: '5px 16px 5px 5px', cursor: 'pointer',
            border: showProfile ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
            <AvatarCircle size={32} fontSize={13} />
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1.2,
                whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {displayRole}
              </div>
            </div>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
              style={{ marginLeft: 2, transform: showProfile ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {showProfile && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 10px)',
              background: '#fff', borderRadius: 16, width: 260,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 100,
              animation: 'fadeDown 0.15s ease',
            }}>
              <div style={{ padding: '14px 16px',
                background: 'linear-gradient(135deg,#1b3a1b,#2d5a2d)',
                display: 'flex', alignItems: 'center', gap: 10 }}>
                <AvatarCircle size={42} fontSize={16} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 13,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: 0.5 }}>{displayRole}</div>
                  {displayEmail && (
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {displayEmail}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: '#f0fdf4' }} />

              {menuItems.map((item, i) => (
                <button key={i} onClick={item.action} style={{
                  width: '100%', padding: '11px 16px', textAlign: 'left',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 13, color: '#1f2937', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: '1px solid #f9fafb', transition: 'background 0.1s',
                  fontFamily: 'inherit',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ color: '#4b6557', flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}

              <div style={{ height: 1, background: '#f0fdf4' }} />

              <button onClick={async () => {
                setShowProfile(false)
                await supabase.auth.signOut()
                window.location.href = '/login'
              }} style={{
                width: '100%', padding: '11px 16px', textAlign: 'left',
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, color: '#dc2626', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'background 0.1s', fontFamily: 'inherit',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ color: '#dc2626', flexShrink: 0 }}><IconLogout /></span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input[type="search"]::-webkit-search-cancel-button,
        input[type="search"]::-webkit-search-decoration { display: none; }
      `}</style>
    </header>
  )
}