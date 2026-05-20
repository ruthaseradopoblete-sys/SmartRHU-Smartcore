'use client'
import React, { useState } from 'react'
import AdminSidebar     from './AdminSidebar'
import AdminTopbar      from './AdminTopbar'
import Dashboard        from './Dashboard'
import PatientRecords   from './PatientRecords'
import LabRecords       from './LabRecords'
import InventoryRecords from './InventoryRecords'
import GenerateReport   from './GenerateReport'
import UserManagement   from './UserManagement'
import RolesPermissions from './RolesPermissions'
import SystemActivities from './SystemActivities'
import BackupRestore    from './BackupRestore'
import { Settings, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode,    setDarkMode]    = useState(false)
  const [activeMenu,  setActiveMenu]  = useState('Dashboard')
  const router = useRouter()

  const bg  = darkMode ? '#0a1a0d' : '#f4fbf4'
  const txt = darkMode ? '#d1fae5' : '#0d2e0d'
  const sub = darkMode ? '#4db86a' : '#1a7a1a'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'Dashboard':           return <Dashboard          darkMode={darkMode} onNavigate={setActiveMenu}/>
      case 'Patient Records':     return <PatientRecords     darkMode={darkMode}/>
      case 'Lab Records':         return <LabRecords         darkMode={darkMode}/>
      case 'Inventory Records':   return <InventoryRecords   darkMode={darkMode}/>
      case 'Generate Report':     return <GenerateReport     darkMode={darkMode}/>
      case 'User Management':     return <UserManagement     darkMode={darkMode}/>
      case 'Roles & Permissions': return <RolesPermissions   darkMode={darkMode}/>
      case 'System Activities':   return <SystemActivities   darkMode={darkMode}/>
      case 'Backup & Restore':    return <BackupRestore      darkMode={darkMode}/>
      case 'Settings':
        return (
          <div style={{ background:darkMode?'rgba(10,26,13,0.9)':'#fff', border:`1px solid ${darkMode?'rgba(77,184,106,0.12)':'rgba(26,122,26,0.1)'}`, borderRadius:16, padding:24, maxWidth:500 }}>
            <h2 style={{ margin:'0 0 8px', fontSize:18, fontWeight:800, color:txt }}>Admin Settings</h2>
            <p style={{ margin:'0 0 20px', fontSize:12, color:sub }}>Configure your admin profile and preferences</p>
            <div style={{ textAlign:'center', padding:32, color:sub }}>
              <Settings size={40} color={darkMode?'#3a6b48':'#a7c4a7'} style={{ margin:'0 auto 16px' }}/>
              <div style={{ fontSize:13 }}>Connect your Settings component here</div>
            </div>
          </div>
        )
      default:
        return (
          <div style={{ textAlign:'center', padding:64, color:sub }}>
            <Activity size={48} color={darkMode?'#3a6b48':'#c6e6c6'} style={{ margin:'0 auto 16px' }}/>
            <div style={{ fontSize:14, fontWeight:600, color:txt }}>Select a menu item</div>
          </div>
        )
    }
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:bg, fontFamily:"'DM Sans', sans-serif" }}>
      <AdminSidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        onLogout={handleLogout}
        darkMode={darkMode}
      />

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <AdminTopbar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onNavigate={setActiveMenu}
        />

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            position:'fixed', left:sidebarOpen?208:48, top:72, zIndex:50,
            width:28, height:28, borderRadius:'50%',
            background:'linear-gradient(135deg,#1a7a1a,#26a326)',
            border:'2px solid #fff', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 10px rgba(26,122,26,0.4)',
            transition:'left 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"
            style={{ transform:sidebarOpen?'rotate(0)':'rotate(180deg)', transition:'transform 0.25s' }}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <main style={{ flex:1, padding:28, overflowY:'auto' }}>
          {renderContent()}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
      `}</style>
    </div>
  )
}