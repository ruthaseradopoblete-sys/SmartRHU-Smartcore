'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import styles from './nurse.module.css'
import { supabase } from '@/lib/supabase'

// Fixed-date Philippine holidays (month is 0-indexed to match JS Date).
// Lunar/movable holidays (Holy Week, Eid, Chinese New Year) are intentionally
// excluded since they shift every year and need a separate lookup table.
const PH_HOLIDAYS: Record<string, string> = {
  '0-1':   "New Year's Day",
  '1-25':  'EDSA People Power Anniversary',
  '3-9':   'Araw ng Kagitingan',
  '4-1':   'Labor Day',
  '5-12':  'Independence Day',
  '7-21':  'Ninoy Aquino Day',
  '7-25':  'National Heroes Day',
  '9-31':  "All Saints' Day Eve",
  '10-1':  "All Saints' Day",
  '10-30': 'Bonifacio Day',
  '11-8':  'Feast of the Immaculate Conception',
  '11-24': 'Christmas Eve',
  '11-25': 'Christmas Day',
  '11-30': 'Rizal Day',
  '11-31': "New Year's Eve",
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [today, setToday] = useState({ day: 0, month: 0, year: 0 })
  const [viewMonth, setViewMonth] = useState(0)
  const [viewYear, setViewYear] = useState(0)
  const router    = useRouter()
  const pathname  = usePathname()

  // Try useAuth first, fallback to supabase signOut
  let logoutFn: (() => Promise<void>) | null = null
  try {
    const { logout } = useAuth()
    logoutFn = logout
  } catch {}

  useEffect(() => {
    const now = new Date()
    setToday({ day: now.getDate(), month: now.getMonth(), year: now.getFullYear() })
    setViewMonth(now.getMonth())
    setViewYear(now.getFullYear())
  }, [])

  async function handleLogout() {
    if (logoutFn) await logoutFn()
    else await supabase.auth.signOut()
    localStorage.removeItem('smartrhu_user')
    router.push('/')
  }

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const isHoliday = (month: number, day: number) => PH_HOLIDAYS[`${month}-${day}`]

  // ── '/nurse' is the actual dashboard route (app/nurse/page.tsx).
  //    There is no app/nurse/dashboard/page.tsx, so pushing that path 404s.
  //    Kept '/nurse/dashboard' in the active-state check only in case a
  //    future route gets added there, but navigation always targets '/nurse'.
  const onDash     = pathname === '/nurse' || pathname === '/nurse/dashboard'
  // ── NEW: Patient Timeline nav state ──
  const onTimeline = pathname.startsWith('/nurse/timeline')
  const onSettings = pathname.startsWith('/nurse/settings')

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const days = ['S','M','T','W','T','F','S']

  const getDates = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const dates: (number | null)[] = Array(firstDay).fill(null)
    for (let i = 1; i <= daysInMonth; i++) dates.push(i)
    return dates
  }

  return (
    <>
      <aside className={styles.sidebar} style={{ width: collapsed ? 64 : 240, transition: 'width .2s ease', overflowX: 'visible', position: 'fixed' }}>

        {/* ── Logo ── */}
        <div className={styles.sidebarLogo} style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '18px 8px' : undefined }}>
          <div className={styles.logoSeal}>
            <Image src="/logo.jpg" alt="SMARTRHU Logo" width={42} height={42} className={styles.logoImg} />
          </div>
          {!collapsed && (
            <div>
              <div className={styles.logoName}>Rural Healthcare Unit<br/>- Lopez, Quezon</div>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            {!collapsed && <span className={styles.navSectionLabel}>Menu</span>}

            <button
              className={`${styles.navItem} ${onDash ? styles.navItemActive : ''}`}
              title={collapsed ? 'Dashboard' : undefined}
              onClick={() => router.push('/nurse')}
              style={collapsed ? { justifyContent: 'center', padding: '9px 0' } : undefined}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              {!collapsed && 'Dashboard'}
            </button>

            {/* ── NEW: Patient Timeline — consultation + split adult/child
                vaccine history, scoped to patients the nurse has actually
                handled (not the full clinic roster). ── */}
            <button
              className={`${styles.navItem} ${onTimeline ? styles.navItemActive : ''}`}
              title={collapsed ? 'Patient Timeline' : undefined}
              onClick={() => router.push('/nurse/timeline')}
              style={collapsed ? { justifyContent: 'center', padding: '9px 0' } : undefined}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {!collapsed && 'Patient Timeline'}
            </button>
          </div>

          <div className={styles.navSection}>
            {!collapsed && <span className={styles.navSectionLabel}>General</span>}

            {/* ── Settings — flat single link, no dropdown (matches Pharmacist sidebar) ── */}
            <button
              className={`${styles.navItem} ${onSettings ? styles.navItemActive : ''}`}
              title={collapsed ? 'Settings' : undefined}
              onClick={() => router.push('/nurse/settings')}
              style={collapsed ? { justifyContent: 'center', padding: '9px 0' } : undefined}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              {!collapsed && 'Settings'}
            </button>

            <button
              className={`${styles.navItem} ${styles.navItemLogout}`}
              title={collapsed ? 'Logout' : undefined}
              onClick={() => setShowLogoutConfirm(true)}
              style={collapsed ? { justifyContent: 'center', padding: '9px 0' } : undefined}>
              <LogOut size={15} />
              {!collapsed && 'Logout'}
            </button>
          </div>
        </nav>

        {/* ── Mini calendar — hidden when collapsed ── */}
        {!collapsed && (
          <div className={styles.miniCal}>
            <div className={styles.calHeader}>
              <button
                onClick={goPrevMonth}
                style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className={styles.calTitle}>{months[viewMonth]} {viewYear}</span>
              <button
                onClick={goNextMonth}
                style={{ border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <div className={styles.calGrid} style={{ minHeight: 168 }}>
              {days.map((d, i) => (
                <div
                  key={i}
                  className={styles.calDow}
                  style={i === 0 ? { color: '#ef4444' } : undefined}
                >{d}</div>
              ))}
              {getDates().map((d, i) => {
                if (!d) return <div key={i} />
                const dayOfWeek = i % 7
                const isSunday = dayOfWeek === 0
                const isToday = d === today.day && viewMonth === today.month && viewYear === today.year
                const holidayName = isHoliday(viewMonth, d)
                return (
                  <div
                    key={i}
                    title={holidayName || undefined}
                    className={`${styles.calDay} ${isToday ? styles.calDayToday : ''}`}
                    style={
                      isToday ? undefined :
                      holidayName ? { background: 'var(--green-light)', color: 'var(--green)', fontWeight: 700 } :
                      isSunday ? { color: '#ef4444', fontWeight: 600 } :
                      undefined
                    }
                  >
                    {d}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </aside>

      {/* ── Collapse / expand toggle — rendered as its own viewport-fixed
          element, NOT nested inside <aside>. ── */}
      <button
        onClick={onToggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'fixed',
          top: 16,
          left: collapsed ? 64 - 12 : 240 - 12,
          width: 24, height: 24,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--green), var(--green-mid))',
          border: '2px solid var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(22,163,74,.4)',
          zIndex: 110,
          padding: 0,
          transition: 'left .2s ease',
        }}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'block' }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* ── Logout Modal ── */}
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
    </>
  )
}