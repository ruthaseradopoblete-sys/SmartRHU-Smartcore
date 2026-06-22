'use client'
import React, { useState, useRef, useEffect } from 'react'
import { LayoutDashboard, Users, Settings, HelpCircle, LogOut, Activity } from 'lucide-react'
import { logAction } from "@/utils/auditLogs"

interface SidebarProps {
  activeMenu:      string
  setActiveMenu:   (m: string) => void
  sidebarOpen:     boolean
  setSidebarOpen?: (v: boolean) => void   // ← NEW: lets the toggle flip the parent's state
  onLogout:        () => void
  darkMode:        boolean
}

const injectStyles = () => {
  if (typeof document === 'undefined') return
  const id = 'smartrhu-sidebar-styles'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

    .srhu-sidebar { font-family: 'Nunito', sans-serif; }

    .srhu-nav-btn { position: relative; overflow: hidden; }
    .srhu-nav-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 12px;
      background: linear-gradient(90deg, rgba(22,163,74,0.1) 0%, transparent 100%);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .srhu-nav-btn:hover::after { opacity: 1; }
    .srhu-nav-btn.active-btn::after { display: none; }

    .srhu-pulse {
      animation: pulse-dot 2.5s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 0.5; box-shadow: 0 0 4px rgba(74,222,128,0.4); }
      50% { opacity: 1; box-shadow: 0 0 10px rgba(74,222,128,0.8); }
    }

    .srhu-slide-in {
      animation: slideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-6px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .srhu-cal-day:hover {
      background: rgba(22,163,74,0.12) !important;
      border-radius: 6px;
    }

    .srhu-logout-icon { transition: transform 0.2s ease; }
    .srhu-logout-btn:hover .srhu-logout-icon { transform: translateX(2px); }

    .srhu-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      font-size: 10px;
      font-weight: 700;
      padding: 0 5px;
      background: linear-gradient(135deg, #4ade80, #166534);
      color: #fff;
      margin-left: auto;
      box-shadow: 0 2px 6px rgba(74,222,128,0.4);
    }

    /* Toggle arrow button */
    .srhu-toggle-btn {
      transition: top 0.25s cubic-bezier(0.22,1,0.36,1), background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    }
    .srhu-toggle-btn:hover {
      background: #166534 !important;
      transform: translateY(-50%) scale(1.08);
    }
  `
  document.head.appendChild(style)
}

if (typeof window !== 'undefined') injectStyles()

// ── Theme palette (Base Color spec) ──────────────────────────────────────
function useTheme(darkMode: boolean) {
  const dk = darkMode
  return {
    green:       '#16a34a',
    greenDark:   '#0d3b1f',
    greenMid:    '#166534',
    greenLight:  '#dcfce7',
    mint:        '#4ade80',
    bg:          dk ? '#061a0d' : '#f0f7f2',
    surface:     dk ? '#0d2516' : '#ffffff',
    surface2:    dk ? '#0f2e1a' : '#f6faf7',
    border:      dk ? 'rgba(74,222,128,0.1)'  : 'rgba(22,163,74,0.15)',
    text:        dk ? '#e2f5e9' : '#0a2912',
    text2:       dk ? '#9abea6' : '#4b6557',
    text3:       dk ? '#4b6557' : '#9ca3af',
    shadow:      dk ? '0 2px 16px rgba(0,0,0,0.4)' : '0 2px 16px rgba(13,59,31,0.08)',
    panelShadow: dk ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(13,59,31,0.18)',
    accentSoft:  dk ? 'rgba(74,222,128,0.12)' : '#dcfce7',
    radius:      14,
    radiusSm:    8,
  }
}

// ── PH Holidays (fixed-date, regular & special non-working) ──────────────
// NOTE: Movable holidays (Holy Week, Eid'l Fitr, Eid'l Adha, etc.) aren't
// included since their dates depend on yearly Malacañang proclamations.
// Format: 'MM-DD'
const PH_HOLIDAYS = new Set([
  '01-01', // New Year's Day
  '02-25', // EDSA People Power Anniversary
  '04-09', // Araw ng Kagitingan
  '05-01', // Labor Day
  '06-12', // Independence Day
  '08-21', // Ninoy Aquino Day
  '08-25', // National Heroes Day (last Mon of Aug — approx, adjust if needed)
  '11-01', // All Saints' Day
  '11-30', // Bonifacio Day
  '12-08', // Immaculate Conception
  '12-25', // Christmas Day
  '12-30', // Rizal Day
  '12-31', // New Year's Eve (special)
])

function isHoliday(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return PH_HOLIDAYS.has(`${mm}-${dd}`)
}

function MiniCalendar({ darkMode }: { darkMode: boolean }) {
  const C = useTheme(darkMode)
  const [currentDate, setCurrentDate] = useState(new Date())
  const today       = new Date()
  const month       = currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()
  const year        = currentDate.getFullYear()
  const firstDay    = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const days        = ['S','M','T','W','T','F','S']
  const RED         = '#dc2626'

  const navBtnStyle: React.CSSProperties = {
    background: C.accentSoft,
    border: 'none', borderRadius: 6, width: 22, height: 22,
    cursor: 'pointer', color: darkMode ? C.mint : C.green,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize: 14, fontWeight: 700, lineHeight: 1,
    transition: 'background 0.15s',
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} style={navBtnStyle}>‹</button>
        <span style={{ fontWeight:700, fontSize:10, letterSpacing:1, color: darkMode ? C.mint : C.green }}>
          {month} {year}
        </span>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} style={navBtnStyle}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, textAlign:'center' }}>
        {days.map((d, i) => (
          <div key={i} style={{
            fontWeight:700,
            color: i === 0 ? RED : C.text3,   // Sunday header in red too
            padding:'2px 0', fontSize:9, letterSpacing:0.5,
          }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day       = i + 1
          const cellDate  = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
          const dow       = cellDate.getDay()          // 0 = Sunday
          const isSunday  = dow === 0
          const holiday   = isHoliday(cellDate)
          const isToday   = day === today.getDate()
            && currentDate.getMonth() === today.getMonth()
            && currentDate.getFullYear() === today.getFullYear()
          const isRedDay  = isSunday || holiday

          return (
            <div key={day} className="srhu-cal-day" title={holiday ? 'Holiday' : undefined} style={{
              padding:'3px 0', borderRadius:6, cursor:'pointer',
              background: isToday
                ? `linear-gradient(135deg, ${C.green}, ${C.mint})`
                : 'transparent',
              color: isToday
                ? '#fff'
                : isRedDay
                  ? RED
                  : C.text2,
              fontWeight: isToday || isRedDay ? 700 : 400,
              fontSize: 10,
              boxShadow: isToday ? `0 2px 8px ${C.green}44` : 'none',
              transition: 'background 0.15s',
            }}>
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default function RegistrarSidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen, onLogout, darkMode }: SidebarProps) {
  const C = useTheme(darkMode)
  const [hoveredItem,       setHoveredItem]       = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  /* ── Open/closed state ──
     The component owns its own `open` state so the toggle always works,
     even if the parent doesn't pass `setSidebarOpen`. It stays in sync with
     the `sidebarOpen` prop when the parent changes it, and notifies the
     parent (if a setter was provided) whenever the toggle is clicked. */
  const [open, setOpen] = useState(sidebarOpen)
  useEffect(() => { setOpen(sidebarOpen) }, [sidebarOpen])
  const toggleSidebar = () => {
    setOpen(prev => {
      const next = !prev
      setSidebarOpen?.(next)
      return next
    })
  }

  /* ── Toggle button alignment to Dashboard row ── */
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dashRef    = useRef<HTMLButtonElement>(null)
  const [togglePos, setTogglePos] = useState(135) // px from top, aligned to Dashboard

  useEffect(() => {
    const el = dashRef.current, wrap = wrapperRef.current
    if (!el || !wrap) return
    const e = el.getBoundingClientRect()
    const w = wrap.getBoundingClientRect()
    setTogglePos(e.top - w.top + e.height / 2)
  }, [open])

  const menuItems = [
    { label:'Dashboard',       icon: LayoutDashboard, section:'Menu',    badge: null  },
    { label:'Patient Records', icon: Users,           section:'Menu',    badge: ''    },
    { label:'Settings',        icon: Settings,        section:'General', badge: null  },
  ]

  const NavBtn = ({ label, icon: Icon, active, badge, forwardedRef }: {
    label: string; icon: React.ElementType; active: boolean; badge: string | null;
    forwardedRef?: React.RefObject<HTMLButtonElement>
  }) => {
    const hovered = hoveredItem === label
    return (
      <button
        ref={forwardedRef}
        className={`srhu-nav-btn${active ? ' active-btn' : ''}`}
        onClick={() => setActiveMenu(label)}
        onMouseEnter={() => setHoveredItem(label)}
        onMouseLeave={() => setHoveredItem(null)}
        style={{
          width:'100%', display:'flex', alignItems:'center',
          gap: open ? 10 : 0,
          justifyContent: open ? 'flex-start' : 'center',
          padding: open ? '9px 14px' : '9px',
          borderRadius: 12, marginBottom: 3,
          background: active
            ? `linear-gradient(135deg, ${C.greenMid} 0%, ${C.green} 100%)`
            : hovered
              ? C.accentSoft
              : 'transparent',
          color: active ? '#fff' : C.text2,
          border: 'none', cursor:'pointer', fontSize:13,
          fontWeight: active ? 600 : 400,
          transition: 'all 0.18s ease',
          boxShadow: active
            ? `0 4px 18px ${C.green}44, inset 0 1px 0 rgba(255,255,255,0.15)`
            : 'none',
          position:'relative',
        }}
      >
        {active && (
          <span style={{
            position:'absolute', left:0, top:'22%', bottom:'22%',
            width:3, borderRadius:2,
            background:'rgba(255,255,255,0.55)',
          }} />
        )}

        <span style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:28, height:28, borderRadius:8, flexShrink:0,
          background: active
            ? 'rgba(255,255,255,0.18)'
            : hovered
              ? C.accentSoft
              : 'transparent',
          transition:'background 0.18s',
        }}>
          <Icon size={15} strokeWidth={active ? 2.5 : 2} />
        </span>

        {open && (
          <>
            <span style={{ flex:1, textAlign:'left' }}>{label}</span>
            {badge && <span className="srhu-badge">{badge}</span>}
          </>
        )}
      </button>
    )
  }

  return (
    <>
      {/* ── Logout Confirmation Modal ── */}
   {/* ── Logout Confirmation Modal ── */}
{/* ── Logout Confirmation Modal ── */}
{showLogoutConfirm && (
  <div style={{
    position:'fixed', inset:0, zIndex:9999,
    background:'rgba(0,0,0,0.45)',
    display:'flex', alignItems:'center', justifyContent:'center',
    padding:16,
  }} onClick={() => setShowLogoutConfirm(false)}>
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background:C.surface,
        borderRadius:16, width:'100%', maxWidth:360,
        boxShadow:C.panelShadow,
        overflow:'hidden',
        border:`1px solid ${C.border}`,
      }}
    >
      {/* Header bar */}
      <div style={{
        background:`linear-gradient(135deg, ${C.greenMid}, ${C.green})`,
        padding:'14px 18px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <span style={{ fontWeight:700, fontSize:15, color:'#fff' }}>Logout</span>
        <button
          onClick={() => setShowLogoutConfirm(false)}
          style={{
            background:'rgba(255,255,255,0.2)', border:'none', borderRadius:6,
            width:26, height:26, cursor:'pointer', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:14, fontWeight:700, lineHeight:1,
          }}
        >✕</button>
      </div>

      {/* Body */}
      <div style={{ padding:'32px 24px 20px', textAlign:'center' }}>
        <div style={{
          width:64, height:64, borderRadius:'50%', margin:'0 auto 20px',
          background: `linear-gradient(135deg, ${C.greenLight}, ${C.accentSoft})`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <LogOut size={28} color={C.green} strokeWidth={2}/>
        </div>
        <p style={{ fontSize:18, fontWeight:700, color:C.text, margin:'0 0 8px' }}>
          Are you sure?
        </p>
        <p style={{ fontSize:13, color:C.text3, margin:0, lineHeight:1.5 }}>
          You will be logged out of the system.
        </p>
      </div>

      {/* Footer */}
      <div style={{ padding:'8px 24px 24px', display:'flex', gap:10 }}>
        <button
          onClick={() => setShowLogoutConfirm(false)}
          style={{
            flex:1, padding:'11px 0', borderRadius:10,
            border:`1.5px solid ${C.border}`,
            background:C.surface, color:C.greenMid,
            fontSize:13, fontWeight:700, cursor:'pointer',
            letterSpacing:0.5, transition:'all 0.15s',
          }}
          onMouseEnter={e=>(e.currentTarget.style.background = C.accentSoft)}
          onMouseLeave={e=>(e.currentTarget.style.background = C.surface)}
        >
          CANCEL
        </button>
        <button
          onClick={() => { setShowLogoutConfirm(false); onLogout() }}
          style={{
            flex:1, padding:'11px 0', borderRadius:10,
            border:'none',
            background:`linear-gradient(135deg, ${C.green}, ${C.mint})`,
            color:'#fff',
            fontSize:13, fontWeight:700, cursor:'pointer',
            letterSpacing:0.5,
            boxShadow:`0 4px 14px ${C.green}59`,
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>(e.currentTarget.style.background=`linear-gradient(135deg, ${C.greenMid}, ${C.green})`)}
          onMouseLeave={e=>(e.currentTarget.style.background=`linear-gradient(135deg, ${C.green}, ${C.mint})`)}
        >
          LOGOUT
        </button>
      </div>
    </div>
  </div>
)}
      {/* ── STICKY WRAPPER ── */}
      <div ref={wrapperRef} style={{
        position:'sticky',
        top:0,
        height:'100vh',
        flexShrink:0,
        zIndex:100,
        width: open ? 270 : 72,
        alignSelf:'flex-start',
        transition:'width 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <aside className="srhu-sidebar" style={{
          width:'100%',
          height:'100vh',
          background: darkMode
            ? `linear-gradient(180deg, ${C.bg} 0%, #04100a 100%)`
            : `linear-gradient(180deg, ${C.bg} 0%, #e9f3ec 100%)`,
          display:'flex', flexDirection:'column',
          borderRight: `1px solid ${C.border}`,
          flexShrink:0, position:'relative', overflow:'hidden',
          overflowY:'auto',
        }}>

          {/* Background glow blobs */}
          <div style={{
            position:'absolute', top:-80, right:-80, width:220, height:220, borderRadius:'50%',
            background: `radial-gradient(circle, ${C.green}1a 0%, transparent 70%)`,
            pointerEvents:'none',
          }} />
          <div style={{
            position:'absolute', bottom:80, left:-60, width:180, height:180, borderRadius:'50%',
            background: `radial-gradient(circle, ${C.mint}14 0%, transparent 70%)`,
            pointerEvents:'none',
          }} />

          {/* Logo Header */}
          <div style={{
            padding:'18px 14px 16px',
            borderBottom:`1px solid ${C.border}`,
            display:'flex', alignItems:'center', gap:12,
            overflow:'hidden', position:'relative',
          }}>
            <div style={{
              width:44, height:44, borderRadius:13, flexShrink:0, position:'relative',
              background:`linear-gradient(135deg, ${C.greenMid}, ${C.mint})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: `0 4px 16px ${C.green}4d, inset 0 1px 0 rgba(255,255,255,0.2)`,
              overflow:'hidden',
            }}>
              <img
                src="/logo.jpg"
                alt="SMARTRHU"
                style={{ width:44, height:44, borderRadius:13, objectFit:'cover', position:'relative', zIndex:1 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <Activity size={20} color="#fff" strokeWidth={2.5} style={{ position:'absolute', zIndex:0 }} />
            </div>

            {open && (
              <div className="srhu-slide-in" style={{ overflow:'hidden' }}>
                <div style={{
                  fontFamily:"'Nunito', sans-serif",
                  fontWeight:800, fontSize:17, letterSpacing:0.2, lineHeight:1.2,
                  color: darkMode ? C.mint : C.green,
                  whiteSpace:'normal',
                }}>
                  Rural Healthcare Unit<br/>- Lopez, Quezon
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav style={{ padding:'14px 10px 0', flex:1, position:'relative', zIndex:1 }}>
            {open && (
              <div style={{
                fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase',
                color: C.text3, marginBottom:8, paddingLeft:6,
              }}>
                Menu
              </div>
            )}

            {menuItems.filter(i => i.section === 'Menu').map(({ label, icon, badge }) => (
              <NavBtn
                key={label}
                label={label}
                icon={icon}
                active={activeMenu === label}
                badge={badge}
                forwardedRef={label === 'Dashboard' ? dashRef : undefined}
              />
            ))}

            {/* Divider */}
            <div style={{
              height:1, margin:'10px 6px',
              background:`linear-gradient(90deg, transparent, ${C.border} 30%, ${C.border} 70%, transparent)`,
            }} />

            <div>
              {open && (
                <div style={{
                  fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase',
                  color: C.text3, marginBottom:8, paddingLeft:6,
                }}>
                  General
                </div>
              )}

              {menuItems.filter(i => i.section === 'General').map(({ label, icon, badge }) => (
                <NavBtn key={label} label={label} icon={icon} active={activeMenu === label} badge={badge} />
              ))}

              <div style={{ height:1, margin:'8px 6px', background: C.border }} />

              {/* Logout button — opens confirmation modal */}
              <button
                className="srhu-logout-btn"
                onClick={() => setShowLogoutConfirm(true)}
                onMouseEnter={() => setHoveredItem('__logout__')}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  width:'100%', display:'flex', alignItems:'center',
                  gap: open ? 10 : 0,
                  justifyContent: open ? 'flex-start' : 'center',
                  padding: open ? '9px 14px' : '9px',
                  borderRadius:12, marginTop:2,
                  background: hoveredItem === '__logout__'
                    ? (darkMode ? 'rgba(239,68,68,0.1)' : 'rgba(229,62,62,0.07)')
                    : 'transparent',
                  color: darkMode ? '#f08080' : '#d94040',
                  border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                  transition:'all 0.18s ease',
                }}
              >
                <span style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  width:28, height:28, borderRadius:8,
                  background: hoveredItem === '__logout__' ? (darkMode ? 'rgba(239,68,68,0.14)' : 'rgba(229,62,62,0.1)') : 'transparent',
                  transition:'background 0.18s',
                  flexShrink:0,
                }}>
                  <LogOut className="srhu-logout-icon" size={15} strokeWidth={2} />
                </span>
                {open && <span>Logout</span>}
              </button>
            </div>
          </nav>

          {/* Mini Calendar */}
          {open && (
            <div style={{
              margin:'0 10px 16px', padding:'12px 12px 10px',
              background: C.surface2,
              borderRadius:14,
              border:`1px solid ${C.border}`,
              backdropFilter:'blur(8px)',
              boxShadow: darkMode
                ? 'inset 0 1px 0 rgba(74,222,128,0.08)'
                : `inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 12px ${C.green}12`,
              position:'relative', zIndex:1,
            }}>
              <MiniCalendar darkMode={darkMode} />
            </div>
          )}
        </aside>

        {/* ── Toggle Arrow Button ── */}
        {/* Sits on the right edge of the sidebar, vertically aligned to the Dashboard nav row */}
        <button
          className="srhu-toggle-btn"
          onClick={toggleSidebar}
          style={{
            position: 'absolute',
            top: togglePos,
            right: -14,
            transform: 'translateY(-50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: C.green,
            border: `2px solid ${C.surface}`,
            boxShadow: `0 2px 10px ${C.green}73`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            color: '#fff',
            fontSize: 13,
            fontWeight: 900,
            lineHeight: 1,
          }}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
            transform: open ? 'rotate(0deg)' : 'rotate(180deg)',
            fontSize: 14,
            lineHeight: 1,
          }}>
            ‹
          </span>
        </button>
      </div>
    </>
  )
}