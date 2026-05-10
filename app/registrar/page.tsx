'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import Topbar from './components/Topbar'
import RegistrarSidebar from './components/Sidebar'
import RegistrarDashboard from './components/RegistrarDashboard'
import RegistrarLogs from './components/RegistrarLogs'
import AddPatientModal from './components/forms'; 

export default function RegistrarPage() {
  const [activeMenu,  setActiveMenu]  = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode,    setDarkMode]    = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    router.push('/login')
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: darkMode ? '#0d1a0f' : '#f0f4f1', fontFamily:"'Segoe UI', sans-serif" }}>
      <RegistrarSidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        onLogout={handleLogout}
        darkMode={darkMode}
      />
      

      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>
        <Topbar darkMode={darkMode} setDarkMode={setDarkMode} />

        <div style={{ flex:1, overflowY:'auto' }}>
          {activeMenu === 'Dashboard'    && <RegistrarDashboard onAddPatient={() => setIsAddModalOpen(true)} darkMode={darkMode} />}
          {activeMenu === 'Patient Records' && <RegistrarLogs darkMode={darkMode} />}
          {activeMenu === 'Settings' && (
            <div style={{ padding:32, background: darkMode ? '#0d1a0f' : '#f0f4f1', minHeight:'100%' }}>
              <p style={{ color: darkMode ? '#3a6b48' : '#aaa', fontSize:12, textTransform:'uppercase', marginBottom:4 }}>Registrar</p>
              <h1 style={{ fontSize:32, fontWeight:800, color: darkMode ? '#4db86a' : '#1a7a1a' }}>Settings</h1>
              <p style={{ color: darkMode ? '#7ab88a' : '#666', marginTop:12 }}>Settings page coming soon.</p>
            </div>
            
          )}
          {activeMenu === 'Help' && (
            <div style={{ padding:32, background: darkMode ? '#0d1a0f' : '#f0f4f1', minHeight:'100%' }}>
              <p style={{ color: darkMode ? '#3a6b48' : '#aaa', fontSize:12, textTransform:'uppercase', marginBottom:4 }}>Registrar</p>
              <h1 style={{ fontSize:32, fontWeight:800, color: darkMode ? '#4db86a' : '#1a7a1a' }}>Help</h1>
              <p style={{ color: darkMode ? '#7ab88a' : '#666', marginTop:12 }}>Help & documentation coming soon.</p>
            </div>
          )}
          <AddPatientModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSaved={() => {
                setIsAddModalOpen(false);
                }}
            />
            
        </div>
      </div>
    </div>
  )
}