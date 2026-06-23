'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { LogOut } from 'lucide-react'
import styles from './nurse.module.css'

export default function Topbar() {
  const router = useRouter()

  // Try useAuth first, fallback to supabase signOut (matches Sidebar.tsx pattern)
  let logoutFn: (() => Promise<void>) | null = null
  try {
    const { logout } = useAuth()
    logoutFn = logout
  } catch {}

  const [profileName,   setProfileName]   = useState('')
  const [profileRole,   setProfileRole]   = useState('Nurse')
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)
  const [profileEmail,  setProfileEmail]  = useState('')
  const [time,          setTime]          = useState('')
  const [showProfile,   setShowProfile]   = useState(false)

  // ── Logout confirmation — mirrors Sidebar.tsx's modal exactly (same
  //    CSS classes from nurse.module.css) so Topbar and Sidebar logout
  //    behave identically instead of Topbar logging out immediately.
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)

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
      setProfileName(data.username || '')
      setProfileEmail(data.email   || '')
      setProfileRole(data.role     || 'Nurse')
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

  // ── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayName   = profileName   || 'Nurse'
  const displayRole   = profileRole   || 'Nurse'
  const displayEmail  = profileEmail  || ''
  const displayAvatar = profileAvatar || null
  const initials      = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'N'

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

  const goTo = (path: string) => {
    setShowProfile(false)
    router.push(path)
  }

  // ── Opens the confirmation modal instead of logging out immediately.
  //    The dropdown closes right away so the modal isn't shown behind it.
  const requestLogout = () => {
    setShowProfile(false)
    setShowLogoutConfirm(true)
  }

  // ── Actually performs the logout — only called from the modal's
  //    LOGOUT button, same flow Sidebar.tsx uses.
  const handleLogout = async () => {
    setShowLogoutConfirm(false)
    if (logoutFn) await logoutFn()
    else await supabase.auth.signOut()
    localStorage.removeItem('smartrhu_user')
    router.push('/')
  }

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
    { icon: <IconProfile />,  label: 'My Profile',      action: () => goTo('/nurse/settings') },
    { icon: <IconLock />,     label: 'Change Password', action: () => goTo('/nurse/settings?tab=password') },
    { icon: <IconSettings />, label: 'Settings',        action: () => goTo('/nurse/settings') },
  ]

  return (
    <header style={{
      background: '#1b3a1b', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', position: 'sticky', top: 0, zIndex: 40,
      boxShadow: '0 1px 6px rgba(0,0,0,0.25)', gap: 16,
    }}>

      {/* ── Brand label — matches the warehouse Topbar's "SMARTRHU" title,
          sitting to the left of the search bar instead of leaving that
          space blank. ── */}
      <h2 style={{
        color: '#fff', fontSize: 18, fontWeight: 700, margin: 0,
        letterSpacing: '-.01em', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        SMARTRHU
      </h2>

      {/* ── Search bar — narrowed from flex:1/maxWidth:420 so it no longer
          spans the whole space where the SMARTRHU label now sits; keeps a
          sensible max width and lets the right-section actions stay
          anchored right. ── */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          name="nurse-search"
          autoComplete="off"
          placeholder="Search patients, records…"
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

              {/* ── Logout now opens the confirmation modal instead of
                  signing out immediately, matching Sidebar.tsx ── */}
              <button onClick={requestLogout} style={{
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

      {/* ── Logout Confirmation Modal (same markup/classes as Sidebar.tsx) ── */}
      {showLogoutConfirm && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal} style={{ maxWidth: 360 }}>
            <div className={styles.modalHeader}>
              <h2>Logout</h2>
              <button className={styles.modalClose} onClick={() => setShowLogoutConfirm(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={`${styles.warnIcon} ${styles.warnIconRed}`}>
                <LogOut size={24} color="#ef4444" />
              </div>
              <p className={styles.warnTitle}>Are you sure?</p>
              <p className={styles.warnText}>You will be logged out of the system.</p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setShowLogoutConfirm(false)}>CANCEL</button>
              <button className={styles.btnConfirm} onClick={handleLogout}>LOGOUT</button>
            </div>
          </div>
        </div>
      )}

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