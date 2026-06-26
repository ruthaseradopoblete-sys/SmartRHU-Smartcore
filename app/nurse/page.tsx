'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'

import StatCards from './components/StatCards'
import VaccinationPanel from './components/VaccinationPanel'
import VaccineStock from './components/VaccineStock'
import PatientQueue from './components/PatientQueue'
import AIDictionary from './components/Aidictionart'
import PrescriptionModal from './components/PrescriptionModal'
import VaccineRequestModal from './components/VaccineRequestModal'
import NurseSoapModal from './components/SoapModal'

// IMPORTANT: nurse LabRequestModal ito, hindi ../components/LabRequestModal
import LabRequestModal from './components/Labrequestmodal'

import type { QueueEntry } from './components/PatientQueue'
import styles from './components/nurse.module.css'

type ModalPatient = {
  id: string
  queueId?: string
  name: string
  age: string
  gender: string
  civil: string
  addr: string
  address?: string
}

export default function NurseDashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [showPrescription, setShowPrescription] = useState(false)
  const [showVaccineRequest, setShowVaccineRequest] = useState(false)
  const [showLabRequest, setShowLabRequest] = useState(false)

  const [modalPatient, setModalPatient] = useState<ModalPatient | null>(null)

  const [stats, setStats] = useState({
    consultations: 0,
    vaccinations: 47,
    waiting: 0,
  })

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSoap, setShowSoap] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null)

  function patientFromEntry(entry?: QueueEntry | null): ModalPatient | null {
    if (!entry) return null

    const e: any = entry

    return {
      id: e.patientId || e.patient_id || e.id || '',
      queueId: e.queueId || e.queue_id || '',
      name: e.name || e.patient_name || '',
      age: String(e.age || e.patient_age || ''),
      gender: e.gender || e.patient_gender || '',
      civil: e.civil || e.civil_status || '',
      addr: e.addr || e.address || e.patient_address || '',
      address: e.addr || e.address || e.patient_address || '',
    }
  }

  function handleConsult(entry: QueueEntry) {
    setSelectedEntry(entry)
    setModalPatient(patientFromEntry(entry))
    setShowSoap(true)
  }

  function handleSoapClose() {
    setShowSoap(false)
    setSelectedEntry(null)
  }

  function openPrescriptionFromSoap(entry?: QueueEntry) {
    const patient = patientFromEntry(entry || selectedEntry)
    if (!patient) return

    setModalPatient(patient)
    setShowSoap(false)
    setShowPrescription(true)
  }

  function openLabFromSoap(entry?: QueueEntry) {
    const patient = patientFromEntry(entry || selectedEntry)
    if (!patient) return

    setModalPatient(patient)
    setShowSoap(false)
    setShowLabRequest(true)
  }

  function openVaccineFromSoap(entry?: QueueEntry) {
    const patient = patientFromEntry(entry || selectedEntry)
    if (!patient) return

    setModalPatient(patient)
    setShowSoap(false)
    setShowVaccineRequest(true)
  }

  function closePrescription() {
    setShowPrescription(false)
    setModalPatient(null)
  }

  function closeLabRequest() {
    setShowLabRequest(false)
    setModalPatient(null)
  }

  function closeVaccineRequest() {
    setShowVaccineRequest(false)
    setModalPatient(null)
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

  const greenBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '12px 24px',
    borderRadius: 999,
    border: 'none',
    background: 'linear-gradient(135deg,#15803d,#16a34a)',
    color: '#fff',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(22,163,74,.25)',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  }

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
            <div
              className={styles.pageHeading}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 20,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <p className={styles.pageEyebrow}>Nurse</p>
                <h1 className={styles.pageTitle}>Dashboard</h1>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <button
                  style={greenBtnStyle}
                  onClick={() => {
                    setModalPatient(null)
                    setShowPrescription(true)
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Send Prescription
                </button>

                <button
                  style={greenBtnStyle}
                  onClick={() => {
                    setModalPatient(null)
                    setShowLabRequest(true)
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                  >
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <path d="M8 8h8" />
                    <path d="M8 12h8" />
                    <path d="M8 16h5" />
                  </svg>
                  Send Lab Request
                </button>

                <button
                  style={greenBtnStyle}
                  onClick={() => {
                    setModalPatient(null)
                    setShowVaccineRequest(true)
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                  >
                    <path d="M10 21l9-9" />
                    <path d="M14 7l3 3" />
                    <path d="M5 19l4-4" />
                    <path d="M7 17l-4-4 9-9 4 4" />
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

              <VaccineStock
                onRequest={() => {
                  setModalPatient(null)
                  setShowVaccineRequest(true)
                }}
              />
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
        patient={modalPatient}
        onClose={closePrescription}
        onSend={closePrescription}
      />

      <LabRequestModal
        open={showLabRequest}
        patient={modalPatient}
        onClose={closeLabRequest}
        onSent={closeLabRequest}
      />

      <VaccineRequestModal
        open={showVaccineRequest}
        patient={modalPatient}
        prefillPatient={modalPatient}
        onClose={closeVaccineRequest}
        onSent={closeVaccineRequest}
      />

      <NurseSoapModal
        open={showSoap}
        entry={selectedEntry}
        onClose={handleSoapClose}
        onSave={() => {}}
        onOpenPresc={openPrescriptionFromSoap}
        onOpenLab={openLabFromSoap}
        onOpenVaccine={openVaccineFromSoap}
      />
    </div>
  )
}