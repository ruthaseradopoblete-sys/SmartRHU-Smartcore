'use client'
import { useState, useEffect } from 'react'

// Shared
import LoginPage  from '../components/shared/LoginPage'
import TopBar     from '../components/shared/TopBar'
import Settings   from '../components/shared/Settings'
import Help       from '../components/shared/Help'

// Registrar
import RegistrarSidebar  from '../components/registrar/RegistrarSidebar'
import RegistrarDashboard from '../components/registrar/RegistrarDashboard'
import PatientLogs        from '../components/registrar/PatientLogs'
import AddPatientModal    from '../components/registrar/AddPatientModal'

// Laboratory
import LabSidebar        from '../components/lab/LabSidebar'
import LabDashboard      from '../components/lab/LabDashboard'
import PatientLabRecords from '../components/lab/PatientLabRecords'
import AddTestModal      from '../components/lab/forms/AddTestModal'

export default function App() {
  const [user,        setUser]        = useState(null)
  const [dark,        setDark]        = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeMenu,  setActiveMenu]  = useState('Dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal,   setShowModal]   = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const handleLogin  = account => { setUser(account); setActiveMenu('Dashboard') }
  const handleLogout = () => { setUser(null); setActiveMenu('Dashboard'); setDark(false); setSidebarOpen(true) }

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!user) return <LoginPage onLogin={handleLogin} />

  const TOPBAR_PROPS = {
    dark, setDark, sidebarOpen, setSidebarOpen,
    searchQuery, setSearchQuery, user, onLogout: handleLogout, notifs: [],
  }

  // ── REGISTRAR ────────────────────────────────────────────────────────────
  if (user.role === 'registrar') {
    const renderContent = () => {
      switch (activeMenu) {
        case 'Patient Logs': return <PatientLogs />
        case 'Settings':     return <Settings user={user} />
        case 'Help':         return <Help />
        default:             return <RegistrarDashboard onAddPatient={() => setShowModal(true)} />
      }
    }
    return (
      <div className="min-h-screen flex" style={{ background:'var(--bg-main)' }}>
        <RegistrarSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} sidebarOpen={sidebarOpen} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar {...TOPBAR_PROPS} />
          {renderContent()}
        </div>
        {showModal && (
          <AddPatientModal isOpen={showModal} onClose={() => setShowModal(false)} onSaved={() => setShowModal(false)} />
        )}
      </div>
    )
  }

  // ── LABORATORY ───────────────────────────────────────────────────────────
  const renderLabContent = () => {
    switch (activeMenu) {
      case 'Patient Laboratory Records': return <PatientLabRecords user={user} />
      case 'Settings':                   return <Settings user={user} />
      case 'Help':                       return <Help />
      default:                           return <LabDashboard onAddTest={() => setShowModal(true)} />
    }
  }
  return (
    <div className="min-h-screen flex" style={{ background:'var(--bg-main)' }}>
      <LabSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} sidebarOpen={sidebarOpen} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar {...TOPBAR_PROPS} />
        {renderLabContent()}
      </div>
      {showModal && <AddTestModal onClose={() => setShowModal(false)} onSaved={() => setShowModal(false)} />}
    </div>
  )
}
