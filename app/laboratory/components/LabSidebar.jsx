'use client'
import React, { useState } from 'react'
import { LayoutDashboard, FlaskConical, Settings, HelpCircle, LogOut } from 'lucide-react'

/* ── Mini Calendar ── */
function MiniCalendar({ darkMode }) {
  const [offset, setOffset] = useState(0)
  const base        = new Date()
  const d           = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const month       = d.toLocaleString('default', { month: 'long' }).toUpperCase()
  const year        = d.getFullYear()
  const firstDay    = d.getDay()
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const days        = ['S','M','T','W','T','F','S']

  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, color:'#1a7a1a', marginBottom:8 }}>
        <span style={{ cursor:'pointer', padding:'0 4px' }} onClick={() => setOffset(o => o - 1)}>◀</span>
        <span>{month} {year}</span>
        <span style={{ cursor:'pointer', padding:'0 4px' }} onClick={() => setOffset(o => o + 1)}>▶</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, textAlign:'center' }}>
        {days.map((day, i) => (
          <div key={i} style={{ fontWeight:700, color:'#999', padding:'2px 0', fontSize:10 }}>{day}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1
          const isToday = offset === 0 && day === base.getDate()
          return (
            <div key={day} style={{
              padding:'3px 0', borderRadius:4, cursor:'pointer',
              background: isToday ? '#1a7a1a' : 'transparent',
              color:      isToday ? '#fff'    : (darkMode ? '#a5d6a7' : '#444'),
              fontWeight: isToday ? 700       : 400,
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
  - activeMenu:    string
  - setActiveMenu: (m: string) => void
  - sidebarOpen:   boolean
  - setSidebarOpen: (v: boolean) => void   ← toggle from topbar hamburger
  - onLogout:      () => void
  - darkMode:      boolean
*/
export default function LabSidebar({ activeMenu, setActiveMenu, sidebarOpen, onLogout, darkMode }) {
  const bg  = darkMode ? '#0a1a0d' : '#ffffff'
  const bdr = darkMode ? '1px solid #1a3320' : '1px solid #dceadc'

  const NavBtn = ({ label, icon: Icon, active }) => (
    <button
      onClick={() => setActiveMenu(label)}
      style={{
        width:'100%', display:'flex', alignItems:'center',
        gap: sidebarOpen ? 10 : 0,
        justifyContent: sidebarOpen ? 'flex-start' : 'center',
        padding:'10px 12px', borderRadius:10, marginBottom:4,
        background: active ? '#1a7a1a' : 'transparent',
        color: active ? '#fff' : (darkMode ? '#a5d6a7' : '#555'),
        border:'none', cursor:'pointer', fontSize:13,
        fontWeight: active ? 600 : 400,
        transition:'all 0.15s', textAlign:'left', lineHeight:1.2,
        whiteSpace: sidebarOpen ? 'nowrap' : 'normal',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = darkMode ? '#1a3320' : '#f2faf2' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
      {sidebarOpen && (
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', fontSize: label.length > 22 ? 11 : 13 }}>
          {label}
        </span>
      )}
    </button>
  )

  return (
    <aside style={{
      width: sidebarOpen ? 220 : 72,
      minHeight: '100vh',
      background: bg,
      display: 'flex',
      flexDirection: 'column',
      borderRight: bdr,
      transition: 'width 0.25s ease',
      flexShrink: 0,
      overflow: 'hidden',
    }}>

      {/* ── Logo + Name ── */}
      <div style={{
        padding: '18px 16px 16px',
        borderBottom: bdr,
        display: 'flex', alignItems: 'center', gap: 10,
        overflow: 'hidden',
      }}>
        {/* Logo — uses /logo.jpg same as registrar */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #1a7a1a, #2ea82e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(26,122,26,0.35)',
          overflow: 'hidden',
        }}>
          <img
            src="/logo.jpg"
            alt="SMARTRHU Logo"
            style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }}
            onError={e => {
              // fallback grid icon if logo not found
              e.currentTarget.style.display = 'none'
              e.currentTarget.parentElement.innerHTML = `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3"  y="3"  width="7" height="7" rx="1.5" fill="white"/>
                  <rect x="14" y="3"  width="7" height="7" rx="1.5" fill="white" opacity="0.75"/>
                  <rect x="3"  y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.75"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.45"/>
                </svg>
              `
            }}
          />
        </div>

        {sidebarOpen && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontWeight: 800,
              color: darkMode ? '#4db86a' : '#1a7a1a',
              fontSize: 15, letterSpacing: 0.3, whiteSpace: 'nowrap',
            }}>
              SMARTRHU
            </div>
            <div style={{
              fontSize: 10,
              color: darkMode ? '#3a6b48' : '#999',
              marginTop: 1, whiteSpace: 'nowrap',
            }}>
              RHU Lopez, Quezon
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ padding: '14px 10px 0', flex: 1 }}>
        {sidebarOpen && (
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: darkMode ? '#3a6b48' : '#bbb',
            letterSpacing: 1.2, marginBottom: 8, paddingLeft: 10,
          }}>
            MENU
          </div>
        )}

        {MENU_ITEMS.filter(i => i.section === 'Menu').map(({ label, icon }) => (
          <NavBtn key={label} label={label} icon={icon} active={activeMenu === label} />
        ))}

        <div style={{ marginTop: 12 }}>
          {sidebarOpen && (
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: darkMode ? '#3a6b48' : '#bbb',
              letterSpacing: 1.2, marginBottom: 8, paddingLeft: 10,
            }}>
              GENERAL
            </div>
          )}

          {MENU_ITEMS.filter(i => i.section === 'General').map(({ label, icon }) => (
            <NavBtn key={label} label={label} icon={icon} active={activeMenu === label} />
          ))}

          {/* Logout */}
          <button
            onClick={onLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: sidebarOpen ? 10 : 0,
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding: '10px 12px', borderRadius: 10, marginBottom: 4,
              background: 'transparent', color: '#e53e3e',
              border: 'none', cursor: 'pointer', fontSize: 13,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = darkMode ? '#2d0f0f' : '#fff5f5' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={16} strokeWidth={2} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </nav>

      {/* ── Mini Calendar (only when open) ── */}
      {sidebarOpen && (
        <div style={{
          margin: '0 10px 12px',
          padding: '10px 10px 8px',
          background: darkMode ? '#0d2010' : '#f8fdf8',
          borderRadius: 12,
          border: darkMode ? '1px solid #1a3320' : '1px solid #dceadc',
        }}>
          <MiniCalendar darkMode={darkMode} />
        </div>
      )}
    </aside>
  )
}
