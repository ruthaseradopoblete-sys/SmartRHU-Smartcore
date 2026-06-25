'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard, Clock, FlaskConical, Settings, LogOut,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

interface DoctorSidebarProps {
  onViewLabResults?: () => void
}

function useIsMobile(bp = 820) {
  const [m, setM] = useState(false)

  useEffect(() => {
    const f = () => setM(window.innerWidth < bp)
    f()
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [bp])

  return m
}

const injectStyles = () => {
  if (typeof document === 'undefined') return

  const id = 'smartrhu-doctor-sidebar-styles'
  if (document.getElementById(id)) return

  const style = document.createElement('style')
  style.id = id
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

    .srhu-doc-sidebar {
      font-family: 'DM Sans', sans-serif;
    }

    .srhu-doc-nav-btn {
      position: relative;
      overflow: hidden;
    }

    .srhu-doc-cal-day:hover {
      background: rgba(26,122,26,.12) !important;
      border-radius:6px;
    }

    .srhu-doc-logout-icon {
      transition: transform .2s ease;
    }

    .srhu-doc-logout-btn:hover .srhu-doc-logout-icon {
      transform: translateX(2px);
    }

    .srhu-doc-backdrop {
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.45);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:2000;
    }

    .srhu-doc-modal {
      background:#fff;
      border-radius:16px;
      padding:28px 24px 20px;
      width:340px;
      box-shadow:0 20px 60px rgba(0,0,0,.18);
      font-family:'DM Sans',sans-serif;
    }

    .srhu-doc-modal-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:20px;
    }

    .srhu-doc-modal-header h2 {
      font-size:16px;
      font-weight:700;
      color:#1a1a1a;
      margin:0;
    }

    .srhu-doc-modal-close {
      border:none;
      background:transparent;
      cursor:pointer;
      font-size:16px;
      color:#888;
      line-height:1;
    }

    .srhu-doc-modal-body {
      text-align:center;
      padding:8px 0 20px;
    }

    .srhu-doc-warn-icon {
      width:52px;
      height:52px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      background:rgba(239,68,68,.1);
      margin:0 auto 12px;
    }

    .srhu-doc-modal-body p.title {
      font-weight:700;
      font-size:15px;
      color:#1a1a1a;
      margin:0 0 6px;
    }

    .srhu-doc-modal-body p.sub {
      font-size:13px;
      color:#666;
      margin:0;
    }

    .srhu-doc-modal-footer {
      display:flex;
      gap:10px;
    }

    .srhu-doc-btn-cancel {
      flex:1;
      padding:10px;
      border-radius:10px;
      border:1.5px solid #e5e7eb;
      background:#fff;
      cursor:pointer;
      font-size:13px;
      font-weight:600;
      color:#555;
    }

    .srhu-doc-btn-confirm {
      flex:1;
      padding:10px;
      border-radius:10px;
      border:none;
      background:linear-gradient(135deg,#ef4444,#dc2626);
      color:#fff;
      cursor:pointer;
      font-size:13px;
      font-weight:700;
      box-shadow:0 4px 14px rgba(239,68,68,.35);
    }

    .srhu-doc-nav-btn:hover {
      transition: background .18s ease;
    }
  `
  document.head.appendChild(style)
}

if (typeof window !== 'undefined') injectStyles()

// PH holidays
const PH_HOLIDAYS: Record<string, string> = {
  '2026-01-01': "New Year's Day",
  '2026-02-25': 'EDSA People Power Anniversary',
  '2026-04-02': 'Maundy Thursday',
  '2026-04-03': 'Good Friday',
  '2026-04-04': 'Black Saturday',
  '2026-04-09': 'Araw ng Kagitingan',
  '2026-05-01': 'Labor Day',
  '2026-06-12': 'Independence Day',
  '2026-08-21': 'Ninoy Aquino Day',
  '2026-08-31': 'National Heroes Day',
  '2026-11-01': "All Saints' Day",
  '2026-11-30': 'Bonifacio Day',
  '2026-12-08': 'Immaculate Conception',
  '2026-12-25': 'Christmas Day',
  '2026-12-30': 'Rizal Day',
  '2026-12-31': 'Last Day of the Year',
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function MiniCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = new Date()

  const month = currentDate
    .toLocaleString('default', { month: 'long' })
    .toUpperCase()

  const year = currentDate.getFullYear()
  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay()

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate()

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const navBtn: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    width: 22,
    height: 22,
    cursor: 'pointer',
    color: '#555',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1,
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
            )
          }
          style={navBtn}
        >
          ‹
        </button>

        <span
          style={{
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 0.5,
            color: '#1a7a1a',
          }}
        >
          {month} {year}
        </span>

        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
            )
          }
          style={navBtn}
        >
          ›
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7,1fr)',
          gap: 2,
          textAlign: 'center',
        }}
      >
        {days.map((d, i) => (
          <div
            key={i}
            style={{
              fontWeight: 700,
              color: i === 0 ? '#ef4444' : '#999',
              padding: '2px 0',
              fontSize: 10,
              letterSpacing: 0.5,
            }}
          >
            {d}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`b${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const cellDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day
          )
          const isToday =
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()

          const isSun = cellDate.getDay() === 0
          const holName = PH_HOLIDAYS[toISODate(cellDate)]
          const isHol = holName !== undefined

          let background = 'transparent'
          let color = '#333'
          let fontWeight: number = 400
          let boxShadow = 'none'

          if (isToday) {
            background = '#1a7a1a'
            color = '#fff'
            fontWeight = 700
            boxShadow = '0 2px 6px rgba(26,122,26,.35)'
          } else if (isHol) {
            background = 'rgba(239,68,68,.1)'
            color = '#ef4444'
            fontWeight = 700
          } else if (isSun) {
            color = '#ef4444'
            fontWeight = 500
          }

          return (
            <div
              key={day}
              className="srhu-doc-cal-day"
              title={holName || undefined}
              style={{
                padding: '3px 0',
                borderRadius: 6,
                cursor: 'pointer',
                background,
                color,
                fontWeight,
                fontSize: 11,
                boxShadow,
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DoctorSidebar({ onViewLabResults }: DoctorSidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const mobile = useIsMobile()

  const onDash = pathname === '/doctor' || pathname === '/doctor/'
  const onTimeline = pathname.startsWith('/doctor/timeline')
  const onSettings = pathname.startsWith('/doctor/settings')

  // Get user initials for avatar
  const getUserInitial = () => {
    if (!user) return 'D'
    const email = user.email || ''
    const name = user.user_metadata?.full_name || user.user_metadata?.name || ''
    if (name) return name.charAt(0).toUpperCase()
    if (email) return email.charAt(0).toUpperCase()
    return 'D'
  }

  const getUserName = () => {
    if (!user) return 'Doctor'
    return user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Doctor'
  }

  useEffect(() => {
    const saved = localStorage.getItem('doctorSidebarCollapsed')
    if (saved === 'true') setSidebarOpen(false)
  }, [])

  function toggleSidebar() {
    setSidebarOpen((prev) => {
      const next = !prev
      localStorage.setItem('doctorSidebarCollapsed', String(!next))
      return next
    })
  }

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  const expanded = mobile ? true : sidebarOpen
  const borderCol = 'rgba(26,122,26,.12)'

  const NavBtn = ({
    label,
    icon: Icon,
    active,
    onClick,
  }: {
    label: string
    icon: React.ElementType
    active: boolean
    onClick: () => void
  }) => {
    const hovered = hoveredItem === label

    return (
      <button
        className="srhu-doc-nav-btn"
        onClick={onClick}
        onMouseEnter={() => setHoveredItem(label)}
        onMouseLeave={() => setHoveredItem(null)}
        title={!expanded ? label : undefined}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: expanded ? 12 : 0,
          justifyContent: expanded ? 'flex-start' : 'center',
          padding: expanded ? '10px 16px' : '10px',
          borderRadius: 14,
          marginBottom: 2,
          background: active
            ? 'linear-gradient(135deg,#1a7a1a,#26a326)'
            : hovered
              ? 'rgba(26,122,26,.08)'
              : 'transparent',
          color: active ? '#fff' : hovered ? '#1a7a1a' : '#2d2d2d',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: active ? 600 : 400,
          transition: 'background .18s ease, color .18s ease',
          boxShadow: active
            ? '0 4px 18px rgba(26,122,26,.28)'
            : 'none',
          position: 'relative',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 10,
            flexShrink: 0,
            background: active
              ? 'rgba(255,255,255,.2)'
              : hovered
                ? 'rgba(26,122,26,.1)'
                : 'rgba(0,0,0,.05)',
          }}
        >
          <Icon size={16} strokeWidth={active ? 2.5 : 2} />
        </span>

        {expanded && (
          <span style={{ flex: 1 }}>
            {label}
          </span>
        )}
      </button>
    )
  }

  const asideStyle: React.CSSProperties = {
    height: '100vh',
    background: 'linear-gradient(180deg,#f0faf0,#e8f5e8)',
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${borderCol}`,
    flexShrink: 0,
    overflow: 'hidden',
    ...(mobile
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          width: 270,
          zIndex: 1200,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .28s cubic-bezier(.22,1,.36,1)',
          boxShadow: sidebarOpen ? '4px 0 28px rgba(0,0,0,.28)' : 'none',
        }
      : {
          position: 'relative',
          width: sidebarOpen ? 270 : 72,
          transition: 'width .25s cubic-bezier(.22,1,.36,1)',
        }),
  }

  const wrapperStyle: React.CSSProperties = mobile
    ? {}
    : {
        position: 'relative',
        flexShrink: 0,
        width: sidebarOpen ? 270 : 72,
        transition: 'width .25s cubic-bezier(.22,1,.36,1)',
      }

  return (
    <>
      {mobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.5)',
            zIndex: 1199,
          }}
        />
      )}

      {/* Collapse toggle button */}
      {!mobile && (
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            position: 'fixed',
            left: sidebarOpen ? 254 : 56,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1.5px solid rgba(26,122,26,.2)',
            background: '#fff',
            color: '#1a7a1a',
            cursor: 'pointer',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            transition: 'left .25s cubic-bezier(.22,1,.36,1)',
          }}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      )}

      <div style={wrapperStyle}>
        <aside className="srhu-doc-sidebar" style={asideStyle}>

          {/* ── HEADER: Logo + Title (Image 1 style — seamless, no white bg block) ── */}
          <div
            style={{
              padding: expanded ? '20px 20px 16px' : '20px 10px 16px',
              borderBottom: `1px solid ${borderCol}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: expanded ? 'flex-start' : 'center',
              gap: 12,
              flexShrink: 0,
            }}
          >
            {/* Logo circle */}
            <div
              style={{
                width: expanded ? 56 : 40,
                height: expanded ? 56 : 40,
                borderRadius: '50%',
                flexShrink: 0,
                overflow: 'hidden',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,.12)',
                transition: 'width .25s ease, height .25s ease',
              }}
            >
              <img
                src="/logo.jpg"
                alt="RHU Lopez Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>

            {expanded && (
              <div
                style={{ overflow: 'hidden', lineHeight: 1.25 }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: '#1a7a1a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Rural Healthcare Unit
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: '#1a7a1a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  – Lopez, Quezon
                </div>
              </div>
            )}
          </div>

          {/* ── NAV ── */}
          <nav
            style={{
              padding: '16px 10px 0',
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {expanded && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#1a7a1a',
                  marginBottom: 8,
                  paddingLeft: 6,
                }}
              >
                Menu
              </div>
            )}

            <NavBtn
              label="Dashboard"
              icon={LayoutDashboard}
              active={onDash}
              onClick={() => {
                router.push('/doctor')
                mobile && setSidebarOpen(false)
              }}
            />

            <NavBtn
              label="Patient Timeline"
              icon={Clock}
              active={onTimeline}
              onClick={() => {
                router.push('/doctor/timeline')
                mobile && setSidebarOpen(false)
              }}
            />

            <NavBtn
              label="View Lab Results"
              icon={FlaskConical}
              active={false}
              onClick={() => {
                onViewLabResults?.()
                mobile && setSidebarOpen(false)
              }}
            />

            {/* Divider */}
            <div
              style={{
                height: 1,
                margin: '12px 6px',
                background: borderCol,
              }}
            />

            {expanded && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#1a7a1a',
                  marginBottom: 8,
                  paddingLeft: 6,
                }}
              >
                General
              </div>
            )}

            <NavBtn
              label="Settings"
              icon={Settings}
              active={onSettings}
              onClick={() => {
                router.push('/doctor/settings')
                mobile && setSidebarOpen(false)
              }}
            />

            {/* Divider */}
            <div
              style={{
                height: 1,
                margin: '10px 6px',
                background: borderCol,
              }}
            />

            {/* Logout */}
            <button
              className="srhu-doc-logout-btn"
              onClick={() => setShowLogoutModal(true)}
              onMouseEnter={() => setHoveredItem('__logout__')}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: expanded ? 12 : 0,
                justifyContent: expanded ? 'flex-start' : 'center',
                padding: expanded ? '10px 16px' : '10px',
                borderRadius: 14,
                marginBottom: 8,
                background:
                  hoveredItem === '__logout__'
                    ? 'rgba(239,68,68,.08)'
                    : 'transparent',
                color: '#d94040',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'background .18s ease',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background:
                    hoveredItem === '__logout__'
                      ? 'rgba(239,68,68,.12)'
                      : 'rgba(0,0,0,.05)',
                  flexShrink: 0,
                }}
              >
                <LogOut className="srhu-doc-logout-icon" size={16} strokeWidth={2} />
              </span>

              {expanded && <span>Logout</span>}
            </button>
          </nav>

          {/* ── CALENDAR ── */}
          {expanded && (
            <div
              style={{
                margin: '0 10px 0',
                padding: '12px 12px 10px',
                background: 'rgba(255,255,255,.75)',
                borderRadius: 14,
                border: `1px solid ${borderCol}`,
              }}
            >
              <MiniCalendar />
            </div>
          )}

          {/* ── USER AVATAR (Image 1 style — "N" circle at the bottom) ── */}
          <div
            style={{
              padding: expanded ? '12px 16px 16px' : '12px 0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              justifyContent: expanded ? 'flex-start' : 'center',
              borderTop: `1px solid ${borderCol}`,
              marginTop: 8,
            }}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#1a1a2e',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 15,
                flexShrink: 0,
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: 0.5,
              }}
            >
              {getUserInitial()}
            </div>

            {expanded && (
              <div
                style={{ overflow: 'hidden', minWidth: 0 }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#1a1a1a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {getUserName()}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#888',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Doctor
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── LOGOUT MODAL ── */}
      {showLogoutModal && (
        <div className="srhu-doc-backdrop">
          <div className="srhu-doc-modal">
            <div className="srhu-doc-modal-header">
              <h2>Logout</h2>

              <button
                className="srhu-doc-modal-close"
                onClick={() => setShowLogoutModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="srhu-doc-modal-body">
              <div className="srhu-doc-warn-icon">
                <LogOut size={24} color="#ef4444" />
              </div>

              <p className="title">Are you sure?</p>
              <p className="sub">You will be logged out of the system.</p>
            </div>

            <div className="srhu-doc-modal-footer">
              <button
                className="srhu-doc-btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                CANCEL
              </button>

              <button className="srhu-doc-btn-confirm" onClick={handleLogout}>
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}