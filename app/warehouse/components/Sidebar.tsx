'use client'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Package, Settings, LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import styles from './warehouse.module.css'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [time, setTime] = useState('')
  const [today, setToday] = useState({ day: 0, month: 0, year: 0 })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes().toString().padStart(2, '0')
      const s = now.getSeconds().toString().padStart(2, '0')
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      setTime(`${h12}:${m}:${s} ${ampm}`)
      setToday({ day: now.getDate(), month: now.getMonth(), year: now.getFullYear() })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    localStorage.removeItem('isFirstLogin')
    localStorage.removeItem('userAvatar')
    router.push('/')
  }

  const menuItems = [
  { name: 'Dashboard', icon: <LayoutDashboard size={16} />, href: '/warehouse/dashboard' },
  { name: 'Medicine Stock', icon: <Package size={16} />, href: '/warehouse/medicinestock' },
]

const generalItems = [
  { name: 'Settings', icon: <Settings size={16} />, href: '/warehouse/settings' },
]

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const days = ['S','M','T','W','T','F','S']

  const getDates = () => {
    const firstDay = new Date(today.year, today.month, 1).getDay()
    const daysInMonth = new Date(today.year, today.month + 1, 0).getDate()
    const dates: (number | null)[] = Array(firstDay).fill(null)
    for (let i = 1; i <= daysInMonth; i++) dates.push(i)
    return dates
  }

  return (
    <>
      <div className={styles.sidebar}>

        <div className={styles.sidebarLogo}>
          <div className={styles.logoSeal}>
            <Image src="/logo.jpg" alt="MHO Logo" width={42} height={42} />
          </div>
          <div>
            <div className={styles.logoName}>Municipal<br/>Health Office</div>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            <span className={styles.navSectionLabel}>Menu</span>
            {menuItems.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}>
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>

          <div className={styles.navSection}>
            <span className={styles.navSectionLabel}>General</span>
            {generalItems.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}>
                {item.icon}
                {item.name}
              </Link>
            ))}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={`${styles.navItem} ${styles.navItemLogout}`}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </nav>

        <div className={styles.miniCal}>
          <div className={styles.calHeader}>
            <span className={styles.calTitle}>{months[today.month]} {today.year}</span>
          </div>
          <div className={styles.calTime}>{time}</div>
          <div className={styles.calGrid}>
            {days.map((d, i) => (
              <div key={i} className={styles.calDow}>{d}</div>
            ))}
            {getDates().map((d, i) => (
              <div
                key={i}
                className={`${styles.calDay} ${d === today.day ? styles.calDayToday : ''}`}>
                {d || ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
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
              <button
                className={styles.btnCancel}
                onClick={() => setShowLogoutConfirm(false)}>
                CANCEL
              </button>
              <button
                className={styles.btnConfirm}
                onClick={handleLogout}>
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}