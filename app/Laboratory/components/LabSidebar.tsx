'use client'
import React, { useState } from 'react'
import { LayoutDashboard, FlaskConical, Settings, HelpCircle, LogOut, Activity } from 'lucide-react'

/* ── Inject CSS animations (same as registrar) ── */
const injectStyles = () => {
  if (typeof document === 'undefined') return
  const id = 'smartrhu-lab-sidebar-styles'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

    .lab-sidebar { font-family: 'DM Sans', sans-serif; }

    .lab-nav-btn { position: relative; overflow: hidden; }
    .lab-nav-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 12px;
      background: linear-gradient(90deg, rgba(26,122,26,0.1) 0%, transparent 100%);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .lab-nav-btn:hover::after { opacity: 1; }
    .lab-nav-btn.lab-active-btn::after { display: none; }

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
    .lab-logout-btn:hover .lab-logout-icon { transform: translateX(2px); }
  `
  document.head.appendChild(style)
}

if (typeof window !== 'undefined') injectStyles()

/* ── Mini Calendar — matches registrar exactly ── */
function MiniCalendar({ darkMode }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const today       = new Date()
  const month       = currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()
  const year        = currentDate.getFullYear()
  const firstDay    = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const days        = ['S','M','T','W','T','F','S']

  const navBtnStyle = {
    background: darkMode ? 'rgba(77,184,106,0.1)' : 'rgba(26,122,26,0.07)',
    border: 'none', borderRadius: 6, width: 22, height: 22,
    cursor: 'pointer', color: darkMode ? '#4db86a' : '#1a7a1a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, lineHeight: 1,
    transition: 'background 0.15s',
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          style={navBtnStyle}
          onMouseEnter={e => e.currentTarget.style.background = darkMode?'rgba(77,184,106,0.2)':'rgba(26,122,26,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = darkMode?'rgba(77,184,106,0.1)':'rgba(26,122,26,0.07)'}
        >‹</button>
        <span style={{ fontWeight:700, fontSize:10, letterSpacing:1, color: darkMode?'#4db86a':'#1a7a1a' }}>
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
          <div key={i} style={{ fontWeight:700, color: darkMode?'#3a6b48':'#b0c0b0', padding:'2px 0', fontSize:9, letterSpacing:0.5 }}>{d}</div>
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
              background: isToday ? 'linear-gradient(135deg, #1a7a1a, #26a326)' : 'transparent',
              color:      isToday ? '#fff' : darkMode ? '#7bc98a' : '#4a6a4a',
              fontWeight: isToday ? 700 : 400,
              fontSize: 10,
              boxShadow: isToday ? '0 2px 8px rgba(26,122,26,0.4)' : 'none',
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
  { label: 'Help',                       icon: HelpCircle,      section: 'General' },
]

/*
  Props:
  - activeMenu:     string
  - setActiveMenu:  (m: string) => void
  - sidebarOpen:    boolean
  - onLogout:       () => void
  - darkMode:       boolean
*/
export default function LabSidebar({ activeMenu, setActiveMenu, sidebarOpen, onLogout, darkMode }) {
  const [hoveredItem, setHoveredItem] = useState(null)

  const borderCol  = darkMode ? 'rgba(77,184,106,0.12)' : 'rgba(26,122,26,0.1)'
  const sectionCol = darkMode ? '#3a6b48' : '#a8c0a8'

  const NavBtn = ({ label, icon: Icon, active }) => {
    const hovered = hoveredItem === label
    return (
      <button
        className={`lab-nav-btn${active ? ' lab-active-btn' : ''}`}
        onClick={() => setActiveMenu(label)}
        onMouseEnter={() => setHoveredItem(label)}
        onMouseLeave={() => setHoveredItem(null)}
        style={{
          width:'100%', display:'flex', alignItems:'center',
          gap: sidebarOpen ? 10 : 0,
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
          padding: sidebarOpen ? '9px 14px' : '9px',
          borderRadius: 12, marginBottom: 3,
          background: active
            ? darkMode
              ? 'linear-gradient(135deg, #1a4d1a 0%, #1e6b1e 100%)'
              : 'linear-gradient(135deg, #1a7a1a 0%, #26a326 100%)'
            : hovered
              ? darkMode ? 'rgba(77,184,106,0.08)' : 'rgba(26,122,26,0.07)'
              : 'transparent',
          color: active ? '#fff' : darkMode ? '#7bc98a' : '#3a6340',
          border: 'none', cursor: 'pointer', fontSize: 13,
          fontWeight: active ? 600 : 400,
          transition: 'all 0.18s ease',
          boxShadow: active
            ? darkMode
              ? '0 4px 18px rgba(26,122,26,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 4px 18px rgba(26,122,26,0.25), inset 0 1px 0 rgba(255,255,255,0.25)'
            : 'none',
          position: 'relative',
          textAlign: 'left',
        }}
      >
        {/* Left accent bar when active */}
        {active && (
          <span style={{
            position:'absolute', left:0, top:'22%', bottom:'22%',
            width:3, borderRadius:2,
            background:'rgba(255,255,255,0.55)',
          }}/>
        )}

        {/* Icon wrapper */}
        <span style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:28, height:28, borderRadius:8, flexShrink:0,
          background: active
            ? 'rgba(255,255,255,0.18)'
            : hovered
              ? darkMode ? 'rgba(77,184,106,0.12)' : 'rgba(26,122,26,0.1)'
              : 'transparent',
          transition: 'background 0.18s',
        }}>
          <Icon size={15} strokeWidth={active ? 2.5 : 2} />
        </span>

        {sidebarOpen && (
          <span style={{
            flex: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            fontSize: label.length > 22 ? 11 : 13,
          }}>
            {label}
          </span>
        )}
      </button>
    )
  }

  return (
    <aside className="lab-sidebar" style={{
      width: sidebarOpen ? 232 : 72,
      minHeight: '100vh',
      background: darkMode
        ? 'linear-gradient(180deg, #0a1a0d 0%, #081408 100%)'
        : 'linear-gradient(180deg, #f4fbf4 0%, #edf7ed 100%)',
      display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${borderCol}`,
      transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1)',
      flexShrink: 0, position: 'relative', overflow: 'hidden',
    }}>

      {/* Background glow blobs — same as registrar */}
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
          background:'linear-gradient(135deg, #1a7a1a, #2ea82e)',
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
          {/* Fallback icon behind the image */}
          <Activity size={20} color="#fff" strokeWidth={2.5} style={{ position:'absolute', zIndex:0 }}/>
        </div>

        {sidebarOpen && (
          <div className="lab-slide-in" style={{ overflow:'hidden' }}>
            <div style={{
              fontFamily:"'Syne', sans-serif",
              fontWeight:800, fontSize:14, letterSpacing:0.5, lineHeight:1.1,
              color: darkMode ? '#5fcf7a' : '#1a7a1a',
              whiteSpace:'nowrap',
            }}>
              SMARTRHU
            </div>
            <div style={{
              fontSize:10, fontWeight:500, letterSpacing:0.3,
              color: darkMode ? '#3a6b48' : '#8aaa8a',
              marginTop:4, whiteSpace:'nowrap',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <span className="lab-pulse" style={{
                display:'inline-block', width:6, height:6, borderRadius:'50%',
                background:'#22c55e', flexShrink:0,
              }}/>
              RHU Lopez, Quezon
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
          <NavBtn key={label} label={label} icon={icon} active={activeMenu === label}/>
        ))}

        {/* Divider */}
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

          {/* Logout */}
          <button
            className="lab-logout-btn"
            onClick={onLogout}
            onMouseEnter={() => setHoveredItem('__logout__')}
            onMouseLeave={() => setHoveredItem(null)}
            style={{
              width:'100%', display:'flex', alignItems:'center',
              gap: sidebarOpen ? 10 : 0,
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: sidebarOpen ? '9px 14px' : '9px',
              borderRadius:12, marginTop:2,
              background: hoveredItem === '__logout__' ? 'rgba(229,62,62,0.07)' : 'transparent',
              color: darkMode ? '#f08080' : '#d94040',
              border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
              transition:'all 0.18s ease',
            }}
          >
            <span style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              width:28, height:28, borderRadius:8, flexShrink:0,
              background: hoveredItem === '__logout__' ? 'rgba(229,62,62,0.1)' : 'transparent',
              transition:'background 0.18s',
            }}>
              <LogOut className="lab-logout-icon" size={15} strokeWidth={2}/>
            </span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </nav>

      {/* ── Mini Calendar — glassmorphism card same as registrar ── */}
      {sidebarOpen && (
        <div style={{
          margin:'0 10px 16px', padding:'12px 12px 10px',
          background: darkMode
            ? 'rgba(13,30,16,0.85)'
            : 'rgba(255,255,255,0.85)',
          borderRadius:14,
          border:`1px solid ${borderCol}`,
          backdropFilter:'blur(8px)',
          boxShadow: darkMode
            ? 'inset 0 1px 0 rgba(77,184,106,0.1)'
            : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 12px rgba(26,122,26,0.07)',
          position:'relative', zIndex:1,
        }}>
          <MiniCalendar darkMode={darkMode}/>
        </div>
      )}
    </aside>
  )
}