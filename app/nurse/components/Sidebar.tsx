'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './nurse.module.css'
import { supabase } from '@/lib/supabase'

export default function Sidebar() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const router    = useRouter()
  const pathname  = usePathname()

  // Try useAuth first, fallback to supabase signOut
  let logoutFn: (() => Promise<void>) | null = null
  try {
    const { logout } = useAuth()
    logoutFn = logout
  } catch {}

  async function handleLogout() {
    if (logoutFn) await logoutFn()
    else await supabase.auth.signOut()
    localStorage.removeItem('smartrhu_user')
    router.push('/')
  }

  // ── '/nurse' is the actual dashboard route (app/nurse/page.tsx).
  //    There is no app/nurse/dashboard/page.tsx, so pushing that path 404s.
  //    Kept '/nurse/dashboard' in the active-state check only in case a
  //    future route gets added there, but navigation always targets '/nurse'.
  const onDash     = pathname === '/nurse' || pathname === '/nurse/dashboard'
  const onSettings = pathname.startsWith('/nurse/settings')

  return (
    <>
      <aside className={styles.sidebar}>

        {/* ── Logo ── */}
        <div className={styles.sidebarLogo}>
          <div className={styles.logoSeal}>
            <Image src="/logo.jpg" alt="SMARTRHU Logo" width={42} height={42} className={styles.logoImg} />
          </div>
          <div>
            <div className={styles.logoName}>SMARTRHU</div>
            <div className={styles.logoSub}>RHU Lopez, Quezon</div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            <span className={styles.navSectionLabel}>Menu</span>

            <button
              className={`${styles.navItem} ${onDash ? styles.navItemActive : ''}`}
              onClick={() => router.push('/nurse')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              Dashboard
            </button>
          </div>

          <div className={styles.navSection}>
            <span className={styles.navSectionLabel}>General</span>

            {/* ── Settings — flat single link, no dropdown (matches Pharmacist sidebar) ── */}
            <button
              className={`${styles.navItem} ${onSettings ? styles.navItemActive : ''}`}
              onClick={() => router.push('/nurse/settings')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              Settings
            </button>

            <button className={styles.navItem}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                <circle cx="12" cy="17" r=".5" fill="currentColor"/>
              </svg>
              Help
            </button>

            <button
              className={`${styles.navItem} ${styles.navItemLogout}`}
              onClick={() => setShowLogoutConfirm(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </nav>

        {/* ── Mini Calendar ── */}
        <NurseMiniCalendar />

      </aside>

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

// ── Inline MiniCalendar (matches Doctor's style) ──────────────
function NurseMiniCalendar() {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']
  const shortMonth = ['JAN','FEB','MAR','APR','MAY','JUN',
                      'JUL','AUG','SEP','OCT','NOV','DEC']

  const firstDay   = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null)]
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  return (
    <div className={styles.miniCal}>
      <div className={styles.calTopRow}>
        <span className={styles.calNav}>‹</span>
        <span className={styles.calMonthLabel}>{shortMonth[month]} {year}</span>
        <span className={styles.calNav}>›</span>
      </div>

      <div className={styles.calGrid}>
        {['S','M','T','W','TH','F','S'].map((d, i) => (
          <div key={i} className={styles.calDow}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className={`${styles.calDay} ${d === today ? styles.calDayToday : ''}`}>
            {d ?? ''}
          </div>
        ))}
      </div>
    </div>
  )
}