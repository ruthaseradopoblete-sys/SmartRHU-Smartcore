'use client'
import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import LabSidebar        from "./components/LabSidebar"
import LabTopbar         from "./components/LabTopbar"
import LabDashboard      from "./components/LabDashboard"
import PatientLabRecords from "./components/PatientLabRecords"
import LabFormModal      from "./components/LabFormModal"

export default function LaboratoryPage() {
  const { user }                       = useAuth()
  const [activeMenu,  setActiveMenu]   = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen]  = useState(true)
  const [darkMode,    setDarkMode]     = useState(false)
  const [labModal,    setLabModal]     = useState({ open:false, request:null })
  const [refreshKey,  setRefreshKey]   = useState(0)

  const openLabForm  = request => setLabModal({ open:true, request })
  const closeLabForm = ()      => setLabModal({ open:false, request:null })
  const handleSaved  = ()      => setRefreshKey(k => k + 1)

  // Cancel a pending request — no confirm dialog
  const handleCancelRequest = async (request) => {
    await supabase
      .from('laboratory_requests')
      .update({ status:'cancelled', updated_at: new Date().toISOString() })
      .eq('id', request.id)
    setRefreshKey(k => k + 1)
  }

  // Logout directly — no confirm dialog
  const handleLogout = () => {
    window.location.href = '/login'
  }

  const topbarUser = user ? {
    name:     `${user.first_name||''} ${user.last_name||''}`.trim() || 'Laboratorian',
    initials: `${user.first_name?.[0]||''}${user.last_name?.[0]||''}`.toUpperCase() || 'L',
    role:     user.role || 'medtech',
  } : null

  const bg = darkMode ? '#0d1a0f' : '#f0f4f1'

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:"'Segoe UI',Tahoma,sans-serif", background:bg }}>

      <LabSidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        onLogout={handleLogout}
        darkMode={darkMode}
      />

      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>
        <LabTopbar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          user={topbarUser}
        />

        <div style={{ flex:1, overflowY:'auto' }}>

          {activeMenu === 'Dashboard' && (
            <LabDashboard
              key={refreshKey}
              darkMode={darkMode}
              onOpenLabForm={openLabForm}
              onCancelRequest={handleCancelRequest}
            />
          )}

          {activeMenu === 'Patient Laboratory Records' && (
            <PatientLabRecords
              key={refreshKey}
              darkMode={darkMode}
            />
          )}

          {activeMenu === 'Settings' && (
            <div style={{ padding:32, background:bg, minHeight:'100%' }}>
              <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:1 }}>Laboratorian</div>
              <div style={{ fontSize:26, fontWeight:900, color:'#1a7a1a' }}>Settings</div>
              <p style={{ color:'#6b7280', marginTop:10 }}>Settings coming soon.</p>
            </div>
          )}

          {activeMenu === 'Help' && (
            <div style={{ padding:32, background:bg, minHeight:'100%' }}>
              <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:1 }}>Laboratorian</div>
              <div style={{ fontSize:26, fontWeight:900, color:'#1a7a1a' }}>Help</div>
              <p style={{ color:'#6b7280', marginTop:10 }}>Help & documentation coming soon.</p>
            </div>
          )}

        </div>
      </div>

      <LabFormModal
        isOpen={labModal.open}
        onClose={closeLabForm}
        request={labModal.request}
        onSaved={handleSaved}
        currentUser={user}
      />
    </div>
  )
}