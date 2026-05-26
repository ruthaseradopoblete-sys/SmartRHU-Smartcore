'use client'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import StatsCards from '../components/StatsCard'
import StockLevelCard from '../components/StockLevelCard'
import DispensedMedicineCard from '../components/DispensedMedicineCard'
import PharmacyRequestsCard from '../components/Pharmacyrequestcard'
import DispenseMedicineModal from '../components/DispenseMedicineModal'
import styles from '../components/warehouse.module.css'

export default function DashboardPage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showDispenseModal, setShowDispenseModal] = useState(false)
  const [toast, setToast] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => setMounted(true), [])

  const handleDispenseSuccess = () => {
    setShowDispenseModal(false)
    setToast('Medicine dispensed successfully!')
    setRefreshKey(k => k + 1)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className={`${styles.root} ${mounted && theme === 'dark' ? styles.dark : ''}`}>
      <Sidebar />
      <div className={styles.mainArea}>
        <Topbar />
        <div className={styles.content}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p className={styles.pageEyebrow}>Warehouse</p>
              <h1 className={styles.pageTitle}>Dashboard</h1>
            </div>
            <button
              onClick={() => setShowDispenseModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 22,
                border: 'none',
                background: 'linear-gradient(135deg, #0d3b1f, #16a34a)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(13,59,31,.35)',
                transition: 'all .18s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              💊 Medicine Dispense
            </button>
          </div>

          <StatsCards key={`stats-${refreshKey}`} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
            <StockLevelCard key={`stock-${refreshKey}`} />
            <DispensedMedicineCard key={`dispensed-${refreshKey}`} />
            <PharmacyRequestsCard />
          </div>

        </div>
      </div>

      {/* Dispense Modal */}
      {showDispenseModal && (
        <DispenseMedicineModal
          onClose={() => setShowDispenseModal(false)}
          onSuccess={handleDispenseSuccess}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={styles.toast}>✓ {toast}</div>
      )}
    </div>
  )
}