'use client'
import React from 'react'
import { LayoutDashboard, Users, Settings, HelpCircle, LogOut } from 'lucide-react'

interface SidebarProps {
  activeMenu:    string
  setActiveMenu: (m: string) => void
  sidebarOpen:   boolean
  onLogout:      () => void
  darkMode:      boolean
}

function MiniCalendar() {
  const today       = new Date()
  const month       = today.toLocaleString('default', { month: 'long' }).toUpperCase()
  const year        = today.getFullYear()
  const firstDay    = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const days        = ['S','M','T','W','T','F','S']

  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, color:'#1a7a1a', marginBottom:8 }}>
        <span style={{ cursor:'pointer', padding:'0 4px' }}>◀</span>
        <span>{month} {year}</span>
        <span style={{ cursor:'pointer', padding:'0 4px' }}>▶</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, textAlign:'center' }}>
        {days.map((d, i) => (
          <div key={i} style={{ fontWeight:700, color:'#999', padding:'2px 0', fontSize:10 }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1
          const isToday = day === today.getDate()
          return (
            <div key={day} style={{
              padding:'3px 0', borderRadius:4, cursor:'pointer',
              background: isToday ? '#1a7a1a' : 'transparent',
              color:      isToday ? '#fff'    : '#444',
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

export default function RegistrarSidebar({ activeMenu, setActiveMenu, sidebarOpen, onLogout, darkMode }: SidebarProps) {
  const menuItems = [
    { label:'Dashboard',    icon: LayoutDashboard, section:'Menu'    },
    { label:'Patient Logs', icon: Users,           section:'Menu'    },
    { label:'Settings',     icon: Settings,        section:'General' },
    { label:'Help',         icon: HelpCircle,      section:'General' },
  ]

  const NavBtn = ({ label, icon: Icon, active }: { label:string; icon:React.ElementType; active:boolean }) => (
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
        transition:'all 0.15s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = darkMode ? '#1a3320' : '#f2faf2' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      {sidebarOpen && <span>{label}</span>}
    </button>
  )

  return (
    <aside style={{
      width: sidebarOpen ? 220 : 72,
      minHeight:'100vh',
      background: darkMode ? '#0a1a0d' : '#ffffff',
      display:'flex', flexDirection:'column',
      borderRight: darkMode ? '1px solid #1a3320' : '1px solid #dceadc',
      transition:'width 0.25s ease',
      flexShrink:0,
    }}>
      {/* Logo */}
      <div style={{
        padding:'18px 16px 16px',
        borderBottom: darkMode ? '1px solid #1a3320' : '1px solid #dceadc',
        display:'flex', alignItems:'center', gap:10,
        overflow:'hidden',
      }}>
        <div style={{
          width:42, height:42, borderRadius:10, flexShrink:0,
          background:'linear-gradient(135deg, #1a7a1a, #2ea82e)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 2px 8px rgba(26,122,26,0.35)',
          overflow:'hidden',
        }}>
          <img src="/logo.jpg" alt="SMARTRHU Logo" style={{ width:42, height:42, borderRadius:10, objectFit:'cover' }} />
        </div>
        {sidebarOpen && (
          <div style={{ overflow:'hidden' }}>
            <div style={{ fontWeight:800, color: darkMode ? '#4db86a' : '#1a7a1a', fontSize:15, letterSpacing:0.3, whiteSpace:'nowrap' }}>
              SMARTRHU
            </div>
            <div style={{ fontSize:10, color: darkMode ? '#3a6b48' : '#999', marginTop:1, whiteSpace:'nowrap' }}>
              RHU Lopez, Quezon
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding:'14px 10px 0', flex:1 }}>
        {sidebarOpen && (
          <div style={{ fontSize:10, fontWeight:700, color: darkMode ? '#3a6b48' : '#bbb', letterSpacing:1.2, marginBottom:8, paddingLeft:10 }}>
            MENU
          </div>
        )}
        {menuItems.filter(i => i.section === 'Menu').map(({ label, icon }) => (
          <NavBtn key={label} label={label} icon={icon} active={activeMenu === label} />
        ))}

        <div style={{ marginTop:12 }}>
          {sidebarOpen && (
            <div style={{ fontSize:10, fontWeight:700, color: darkMode ? '#3a6b48' : '#bbb', letterSpacing:1.2, marginBottom:8, paddingLeft:10 }}>
              GENERAL
            </div>
          )}
          {menuItems.filter(i => i.section === 'General').map(({ label, icon }) => (
            <NavBtn key={label} label={label} icon={icon} active={activeMenu === label} />
          ))}

          <button
            onClick={onLogout}
            style={{
              width:'100%', display:'flex', alignItems:'center',
              gap: sidebarOpen ? 10 : 0,
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              padding:'10px 12px', borderRadius:10, marginBottom:4,
              background:'transparent', color:'#e53e3e',
              border:'none', cursor:'pointer', fontSize:13,
              transition:'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = darkMode ? '#2d0f0f' : '#fff5f5' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <LogOut size={16} strokeWidth={2} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </nav>

      {/* Calendar */}
      {sidebarOpen && (
        <div style={{
          margin:'0 10px 12px', padding:'10px 10px 8px',
          background: darkMode ? '#0d2010' : '#f8fdf8',
          borderRadius:12,
          border: darkMode ? '1px solid #1a3320' : '1px solid #dceadc',
        }}>
          <MiniCalendar />
        </div>
      )}
    </aside>
  )
}