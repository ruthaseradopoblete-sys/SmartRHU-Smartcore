'use client'
import React, { useState, useRef, useEffect } from 'react'
import { LayoutDashboard, FlaskConical, Settings, LogOut, Activity } from 'lucide-react'
import { logAction } from "@/utils/auditLogs";

/* ── Inject CSS animations ── */
const injectStyles = () => {
  if (typeof document === 'undefined') return
  const id = 'smartrhu-lab-sidebar-styles'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap');

    .lab-sidebar, .lab-sidebar * { font-family: 'Nunito', sans-serif !important; }
    .lab-sidebar::-webkit-scrollbar { display: none; }
    .lab-sidebar { scrollbar-width: none; -ms-overflow-style: none; }

    .lab-nav-btn { position: relative; overflow: hidden; }
    .lab-nav-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 12px;
      background: linear-gradient(90deg, rgba(22,163,74,0.1) 0%, transparent 100%);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .lab-nav-btn:hover::after { opacity: 1; }
    .lab-nav-btn.lab-active-btn::after { display: none; }

    .lab-ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(26,122,26,0.22);
      pointer-events: none;
      transform: scale(0);
      animation: lab-ripple-anim 0.45s ease-out forwards;
    }
    @keyframes lab-ripple-anim {
      to { transform: scale(4); opacity: 0; }
    }
    .lab-ripple-red { background: rgba(229,62,62,0.18); }

    .lab-pulse {
      animation: lab-pulse-dot 2.5s ease-in-out infinite;
    }
    @keyframes lab-pulse-dot {
      0%, 100% { opacity: 0.5; box-shadow: 0 0 4px rgba(34,197,94,0.4); }
      50%       { opacity: 1;   box-shadow: 0 0 10px rgba(34,197,94,0.8); }
    }

    .lab-slide-in {
      animation: lab-slideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes lab-slideIn {
      from { opacity: 0; transform: translateX(-6px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .lab-cal-day:hover {
      background: rgba(26,122,26,0.12) !important;
      border-radius: 6px;
    }

    .lab-logout-icon { transition: transform 0.2s ease; }
    .lab-logout-btn:hover .lab-logout-icon { transform: translateX(3px); }

    .lab-tooltip {
      position: absolute;
      left: calc(100% + 12px);
      top: 50%;
      transform: translateY(-50%) translateX(-4px);
      background: #16a34a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: 7px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.18s ease, transform 0.18s ease;
      box-shadow: 0 4px 12px rgba(26,122,26,0.25);
      font-family: 'Nunito', sans-serif;
      z-index: 999;
    }
    .lab-tooltip::before {
      content: '';
      position: absolute;
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 5px solid transparent;
      border-right-color: #16a34a;
    }
    .lab-nav-btn:hover .lab-tooltip,
    .lab-logout-btn:hover .lab-tooltip {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }

    /* Toggle arrow button */
    .lab-toggle-btn {
      transition: top 0.25s cubic-bezier(0.22,1,0.36,1), background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    }
    .lab-toggle-btn:hover {
      background: #16a34a !important;
      transform: translateY(-50%) scale(1.08);
    }
  `
  document.head.appendChild(style)
}

if (typeof window !== 'undefined') injectStyles()

function useTheme(darkMode) {
  return {
    green: '#16a34a',
    greenDark: '#0d3b1f',
    greenMid: '#166534',
    greenLight: '#dcfce7',
    mint: '#4ade80',
    bg: darkMode ? '#061a0d' : '#f0f7f2',
    surface: darkMode ? '#0d2516' : '#ffffff',
    surface2: darkMode ? '#0f2e1a' : '#f6faf7',
    border: darkMode ? 'rgba(74,222,128,0.1)' : 'rgba(22,163,74,0.15)',
    text: darkMode ? '#e2f5e9' : '#0a2912',
    text2: darkMode ? '#9abea6' : '#4b6557',
    text3: darkMode ? '#4b6557' : '#9ca3af',
    shadow: darkMode ? '0 2px 16px rgba(0,0,0,0.4)' : '0 2px 16px rgba(13,59,31,0.08)',
    panelShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(13,59,31,0.18)',
    accentSoft: darkMode ? 'rgba(74,222,128,0.12)' : '#dcfce7',
    radius: 14,
    radiusSm: 8,
  }
}

const PH_HOLIDAYS = new Set(['01-01','02-25','04-09','05-01','06-12','08-21','08-25','11-01','11-30','12-08','12-25','12-30','12-31'])
function isHoliday(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return PH_HOLIDAYS.has(`${mm}-${dd}`)
}

/* ── Mini Calendar ── */
function MiniCalendar({ darkMode }) {
  const C = useTheme(darkMode)
  const [currentDate, setCurrentDate] = useState(new Date())
  const today       = new Date()
  const month       = currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()
  const year        = currentDate.getFullYear()
  const firstDay    = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const days        = ['S','M','T','W','T','F','S']

  const navBtnStyle = {
    background: C.accentSoft,
    border: 'none', borderRadius: 6, width: 22, height: 22,
    cursor: 'pointer', color: darkMode ? C.mint : C.green,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, lineHeight: 1,
    transition: 'background 0.15s',
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          style={navBtnStyle}
          onMouseEnter={e => e.currentTarget.style.background = darkMode?'rgba(77,184,106,0.2)':'rgba(26,122,26,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = darkMode?'rgba(77,184,106,0.1)':'rgba(26,122,26,0.07)'}
        >‹</button>
        <span style={{ fontWeight:700, fontSize:10, letterSpacing:1, color: darkMode ? C.mint : C.green }}>
          {month} {year}
        </span>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          style={navBtnStyle}
          onMouseEnter={e => e.currentTarget.style.background = darkMode?'rgba(77,184,106,0.2)':'rgba(26,122,26,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = darkMode?'rgba(77,184,106,0.1)':'rgba(26,122,26,0.07)'}
        >›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, textAlign:'center' }}>
        {days.map((d, i) => (
          <div key={i} style={{ fontWeight:700, color: '#9ca3af', padding:'2px 0', fontSize:9, letterSpacing:0.5 }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1
          const isToday = day === today.getDate()
            && currentDate.getMonth()    === today.getMonth()
            && currentDate.getFullYear() === today.getFullYear()
          return (
            <div key={day} className="lab-cal-day" style={{
              padding:'3px 0', borderRadius:6, cursor:'pointer',
              background: isToday ? `linear-gradient(135deg, ${C.green}, ${C.mint})` : 'transparent',
              color:      isToday ? '#ffffff' : (isHoliday(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)) || new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay() === 0 ? '#dc2626' : C.text2),
              fontWeight: isToday || isHoliday(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)) || new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay() === 0 ? 700 : 400,
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

const MENU_ITEMS = [
  { label: 'Dashboard',                  icon: LayoutDashboard, section: 'Menu'    },
  { label: 'Patient Laboratory Records', icon: FlaskConical,    section: 'Menu'    },
  { label: 'Settings',                   icon: Settings,        section: 'General' },
]

/*
  Props:
  - activeMenu:     string
  - setActiveMenu:  (m: string) => void
  - onLogout:       () => void
  - darkMode:       boolean
*/
export default function LabSidebar({ activeMenu, setActiveMenu, onLogout, darkMode }) {
  const C = useTheme(darkMode)
  const [sidebarOpen,        setSidebarOpen]        = useState(true)
  const [hoveredItem,        setHoveredItem]        = useState(null)
  const [showLogoutConfirm,  setShowLogoutConfirm]  = useState(false)

  /* ── Toggle button alignment to Dashboard row ── */
  const wrapperRef = useRef(null)
  const dashRef    = useRef(null)
  const [togglePos, setTogglePos] = useState(135) // px from top, aligned to Dashboard

  useEffect(() => {
    const el = dashRef.current, wrap = wrapperRef.current
    if (!el || !wrap) return
    const e = el.getBoundingClientRect()
    const w = wrap.getBoundingClientRect()
    setTogglePos(e.top - w.top + e.height / 2)
  }, [sidebarOpen])

  const borderCol  = C.border
  const sectionCol = C.text3

  /* ── Ripple helper ── */
  const spawnRipple = (e, ref, extraClass = '') => {
    const btn  = ref.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const r    = document.createElement('span')
    r.className = `lab-ripple${extraClass ? ` ${extraClass}` : ''}`
    r.style.width  = size + 'px'
    r.style.height = size + 'px'
    r.style.left   = (e.clientX - rect.left  - size / 2) + 'px'
    r.style.top    = (e.clientY - rect.top   - size / 2) + 'px'
    btn.appendChild(r)
    setTimeout(() => r.remove(), 500)
  }

  const NavBtn = ({ label, icon: Icon, active, forwardedRef }) => {
    const hovered = hoveredItem === label
    const btnRef  = useRef(null)
    const setRefs = (node) => {
      btnRef.current = node
      if (forwardedRef) forwardedRef.current = node
    }

    const handleClick = (e) => {
      spawnRipple(e, btnRef)
      setActiveMenu(label)
    }

    return (
      <button
        ref={setRefs}
        className={`lab-nav-btn${active ? ' lab-active-btn' : ''}`}
        onClick={handleClick}
        onMouseEnter={() => setHoveredItem(label)}
        onMouseLeave={() => setHoveredItem(null)}
        style={{
          width:'100%', display:'flex', alignItems:'center',
          gap: sidebarOpen ? 10 : 0,
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
          padding: sidebarOpen ? '9px 14px' : '9px',
          borderRadius: 12, marginBottom: 3,
          background: active
            ? `linear-gradient(135deg, ${C.greenMid} 0%, ${C.green} 100%)`
            : hovered
              ? C.accentSoft
              : 'transparent',
          color: active ? '#ffffff' : C.text2,
          border: 'none', cursor: 'pointer', fontSize: 13,
          fontWeight: active ? 600 : 400,
          transition: 'all 0.18s ease',
          boxShadow: active
            ? `0 4px 18px ${C.green}44, inset 0 1px 0 rgba(255,255,255,0.15)`
            : 'none',
          position: 'relative',
          textAlign: 'left',
        }}
      >
        {active && (
          <span style={{
            position:'absolute', left:0, top:'22%', bottom:'22%',
            width:3, borderRadius:2,
            background:'rgba(255,255,255,0.55)',
          }}/>
        )}

        <span style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:28, height:28, borderRadius:8, flexShrink:0,
          background: active
            ? 'rgba(255,255,255,0.18)'
            : hovered
              ? C.accentSoft
              : 'transparent',
          transition: 'background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
          transform:  hovered && !active ? 'translateY(-2px) scale(1.08)' : 'none',
          boxShadow:  hovered && !active
            ? `0 4px 10px ${C.green}26`
            : 'none',
        }}>
          <Icon
            size={15}
            strokeWidth={active ? 2.5 : 2}
            style={{ transition: 'transform 0.18s ease', transform: hovered && !active ? 'scale(1.1)' : 'none' }}
          />
        </span>

        {sidebarOpen && (
          <span style={{
            flex: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            fontSize: label.length > 22 ? 11 : 13,
            letterSpacing: hovered && !active ? '0.3px' : 'normal',
            transition: 'letter-spacing 0.18s ease',
          }}>
            {label}
          </span>
        )}

        {!sidebarOpen && (
          <span className="lab-tooltip">{label}</span>
        )}
      </button>
    )
  }

  const logoutRef   = useRef(null)
  const logoutHover = hoveredItem === '__logout__'

  const handleLogoutClick = (e) => {
    spawnRipple(e, logoutRef, 'lab-ripple-red')
    setShowLogoutConfirm(true)
  }

  return (
    <>
      {/* ── Logout Confirmation Modal ── */}
      {showLogoutConfirm && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'rgba(0,0,0,0.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:16,
        }} onClick={() => setShowLogoutConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background:C.surface, borderRadius:16, width:'100%', maxWidth:360,
            boxShadow:'0 20px 60px rgba(0,0,0,0.2)', overflow:'hidden',
          }}>
            <div style={{ background:C.green, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:15, color:'#ffffff' }}>Logout</span>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:6, width:26, height:26, cursor:'pointer', color:'#ffffff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700 }}>✕</button>
            </div>
            <div style={{ padding:'32px 24px 20px', textAlign:'center' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 20px', background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <LogOut size={28} color="#dc2626" strokeWidth={2}/>
              </div>
              <p style={{ fontSize:18, fontWeight:700, color:C.text, margin:'0 0 8px' }}>Are you sure?</p>
              <p style={{ fontSize:13, color:C.text3, margin:0, lineHeight:1.5 }}>You will be logged out of the system.</p>
            </div>
            <div style={{ padding:'8px 24px 24px', display:'flex', gap:10 }}>
              <button onClick={() => setShowLogoutConfirm(false)}
                style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1.5px solid rgba(220,38,38,0.3)', background:'#ffffff', color:'#dc2626', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:0.5, transition:'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}>
                CANCEL
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); onLogout() }}
                style={{ flex:1, padding:'11px 0', borderRadius:10, border:'none', background:'#16a34a', color:'#ffffff', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:0.5, boxShadow:'0 4px 14px rgba(22,163,74,0.35)', transition:'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#16a34a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#16a34a')}>
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STICKY WRAPPER ── */}
      <div ref={wrapperRef} style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
        zIndex: 100,
        width: sidebarOpen ? 232 : 72,
        transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <aside className="lab-sidebar" style={{
          width: '100%',
          height: '100vh',
          background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg} 100%)`,
          display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${borderCol}`,
          flexShrink: 0, position: 'relative', overflow: 'hidden',
          overflowY: 'hidden',
        }}>

          {/* Background glow blobs */}
          <div style={{
            position:'absolute', top:-80, right:-80, width:220, height:220, borderRadius:'50%',
            background: darkMode
              ? 'radial-gradient(circle, rgba(26,122,26,0.14) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>
          <div style={{
            position:'absolute', bottom:80, left:-60, width:180, height:180, borderRadius:'50%',
            background: darkMode
              ? 'radial-gradient(circle, rgba(46,168,46,0.08) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(26,122,26,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>

          {/* ── Logo Header ── */}
          <div style={{
            padding:'18px 14px 16px',
            borderBottom: `1px solid ${borderCol}`,
            display:'flex', alignItems:'center', gap:12,
            overflow:'hidden', position:'relative',
          }}>
            <div style={{
              width:44, height:44, borderRadius:13, flexShrink:0, position:'relative',
              background:`linear-gradient(135deg, ${C.green}, ${C.mint})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: darkMode
                ? '0 4px 16px rgba(26,122,26,0.55), inset 0 1px 0 rgba(255,255,255,0.15)'
                : '0 4px 16px rgba(26,122,26,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
              overflow:'hidden',
            }}>
              <img
                src="/logo.jpg"
                alt="SMARTRHU"
                style={{ width:44, height:44, borderRadius:13, objectFit:'cover', position:'relative', zIndex:1 }}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
              <Activity size={20} color="#ffffff" strokeWidth={2.5} style={{ position:'absolute', zIndex:0 }}/>
            </div>

            {sidebarOpen && (
              <div className="lab-slide-in" style={{ overflow:'hidden' }}>
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

          {/* ── Navigation ── */}
          <nav style={{ padding:'14px 10px 0', flex:1, position:'relative', zIndex:1 }}>
            {sidebarOpen && (
              <div style={{
                fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase',
                color: sectionCol, marginBottom:8, paddingLeft:6,
              }}>
                Menu
              </div>
            )}

            {MENU_ITEMS.filter(i => i.section === 'Menu').map(({ label, icon }) => (
              <NavBtn
                key={label}
                label={label}
                icon={icon}
                active={activeMenu === label}
                forwardedRef={label === 'Dashboard' ? dashRef : undefined}
              />
            ))}

            <div style={{
              height:1, margin:'10px 6px',
              background:`linear-gradient(90deg, transparent, ${borderCol} 30%, ${borderCol} 70%, transparent)`,
            }}/>

            <div>
              {sidebarOpen && (
                <div style={{
                  fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase',
                  color: sectionCol, marginBottom:8, paddingLeft:6,
                }}>
                  General
                </div>
              )}

              {MENU_ITEMS.filter(i => i.section === 'General').map(({ label, icon }) => (
                <NavBtn key={label} label={label} icon={icon} active={activeMenu === label}/>
              ))}

              <div style={{ height:1, margin:'8px 6px', background: borderCol }}/>

              {/* ── Logout ── */}
              <button
                ref={logoutRef}
                className="lab-logout-btn"
                onClick={handleLogoutClick}
                onMouseEnter={() => setHoveredItem('__logout__')}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  width:'100%', display:'flex', alignItems:'center',
                  gap: sidebarOpen ? 10 : 0,
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  padding: sidebarOpen ? '9px 14px' : '9px',
                  borderRadius:12, marginTop:2,
                  background: logoutHover ? 'rgba(229,62,62,0.07)' : 'transparent',
                  color: darkMode ? '#f08080' : '#dc2626',
                  border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                  transition:'all 0.18s ease',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <span style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  width:28, height:28, borderRadius:8, flexShrink:0,
                  background: logoutHover ? 'rgba(229,62,62,0.1)' : 'transparent',
                  transition:'background 0.18s ease, transform 0.18s ease',
                  transform: logoutHover ? 'translateX(3px)' : 'none',
                }}>
                  <LogOut className="lab-logout-icon" size={15} strokeWidth={2}/>
                </span>
                {sidebarOpen && <span>Logout</span>}
                {!sidebarOpen && (
                  <span className="lab-tooltip">Logout</span>
                )}
              </button>
            </div>
          </nav>

          {/* ── Mini Calendar ── */}
          {sidebarOpen && (
            <div style={{
              margin:'0 10px 16px', padding:'12px 12px 10px',
              background: C.surface,
              borderRadius:14,
              border:`1px solid ${borderCol}`,
              backdropFilter:'blur(8px)',
              boxShadow: C.shadow,
              position:'relative', zIndex:1,
            }}>
              <MiniCalendar darkMode={darkMode}/>
            </div>
          )}
        </aside>

        {/* ── Toggle Arrow Button ── */}
        {/* Sits on the right edge of the sidebar, vertically aligned to the Dashboard nav row */}
        <button
          className="lab-toggle-btn"
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            position: 'absolute',
            top: togglePos,
            right: -14,
            transform: 'translateY(-50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#16a34a',
            border: '2px solid #ffffff',
            boxShadow: '0 2px 10px rgba(22,163,74,0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 900,
            lineHeight: 1,
          }}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
            transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
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