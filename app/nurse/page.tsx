'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

// ── Layout
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'

// ── Dashboard components
import StatCards from './components/StatCards'
import VaccinationPanel from './components/VaccinationPanel'
import VaccineStock from './components/VaccineStock'
import PatientQueue from './components/PatientQueue'
import AIDictionary from './components/Aidictionart'
import PrescriptionModal from './components/PrescriptionModal'
import VaccineRequestModal from './components/VaccineRequestModal'
import NurseSoapModal from './components/SoapModal'

import type { QueueEntry } from './components/PatientQueue'

import styles from './components/nurse.module.css'

export default function NurseDashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [showPrescription, setShowPrescription] = useState(false)
  const [showVaccineRequest, setShowVaccineRequest] = useState(false)

  const [stats, setStats] = useState({
    consultations: 0,
    vaccinations: 47,
    waiting: 0,
  })

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [showSoap, setShowSoap] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null)

  function handleConsult(entry: QueueEntry) {
    setSelectedEntry(entry)
    setShowSoap(true)
  }

  function handleSoapClose() {
    setShowSoap(false)
    setSelectedEntry(null)
  }

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    async function fetchStats() {
      const today = new Date().toISOString().split('T')[0]

      const [done, wait] = await Promise.all([
        supabase
          .from('konsulta_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('registration_date', today)
          .eq('nurse_status', 'DONE'),

        supabase
          .from('konsulta_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('registration_date', today)
          .eq('nurse_status', 'WAITING'),
      ])

      setStats((s) => ({
        ...s,
        consultations: done.count ?? 0,
        waiting: wait.count ?? 0,
      }))
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#16a34a',
        }}
      >
        Loading…
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={styles.root}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
      />

      <div
        className={styles.mainArea}
        style={{
          marginLeft: sidebarCollapsed ? 64 : 240,
          transition: 'margin-left .2s ease',
        }}
      >
        <Topbar />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div className={styles.pageHeading}>
              <div>
                <p className={styles.pageEyebrow}>Nurse</p>
                <h1 className={styles.pageTitle}>Dashboard</h1>
              </div>

              <div className={styles.headingActions}>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  onClick={() => setShowPrescription(true)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Send Prescription
                </button>

                <button
                  className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                  onClick={() => setShowVaccineRequest(true)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                  Send Vaccine Request
                </button>
              </div>
            </div>

            <StatCards stats={stats} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                alignItems: 'start',
              }}
            >
              <VaccinationPanel />
              <VaccineStock onRequest={() => setShowVaccineRequest(true)} />
            </div>
          </div>

          <div
            style={{
              width: 320,
              borderLeft: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <PatientQueue onConsult={handleConsult} />
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <AIDictionary />
            </div>
          </div>
        </div>
      </div>

      <PrescriptionModal
        open={showPrescription}
        onClose={() => setShowPrescription(false)}
      />

      <VaccineRequestModal
        open={showVaccineRequest}
        onClose={() => setShowVaccineRequest(false)}
      />

      <NurseSoapModal
        open={showSoap}
        entry={selectedEntry}
        onClose={handleSoapClose}
        onSave={handleSoapClose}
      />
    </div>
  )
}