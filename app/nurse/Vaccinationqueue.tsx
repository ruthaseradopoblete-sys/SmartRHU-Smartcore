'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

/* ──────────────────────────────────────────────
   TODAY'S VACCINATION QUEUE — replaces VaccineStock
   Live log + queue of today's vaccinations.
────────────────────────────────────────────── */

const USE_MOCK = true

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ── mock today's queue (remove once USE_MOCK = false) ──
const MOCK_QUEUE = [
  { id: 1, time: '09:45', name: 'Liza Mendoza',    vaccine: 'BCG',         dose: '1st', status: 'NEXT' },
  { id: 2, time: '09:50', name: 'Carlo Dela Cruz', vaccine: 'Pentavalent', dose: '2nd', status: 'WAITING' },
  { id: 3, time: '09:55', name: 'Nina Flores',     vaccine: 'OPV',         dose: '1st', status: 'WAITING' },
  { id: 4, time: '09:30', name: 'Sofia Ramos',     vaccine: 'Measles',     dose: '1st', status: 'DONE' },
  { id: 5, time: '09:20', name: 'Miguel Torres',   vaccine: 'OPV',         dose: '3rd', status: 'DONE' },
  { id: 6, time: '09:05', name: 'Bea Aquino',      vaccine: 'IPV',         dose: '1st', status: 'DONE' },
]

const STATUS_STYLE = {
  NEXT:    styles => `${styles.statusPill} ${styles.statusWaiting}`,
  WAITING: styles => `${styles.statusPill} ${styles.statusWaiting}`,
  DONE:    styles => `${styles.statusPill} ${styles.statusDone}`,
}

export default function VaccinationQueue() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  // Computed client-side only (empty on server) to avoid SSR hydration mismatch
  const [todayLabel, setTodayLabel] = useState('')

  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

    let active = true
    async function load() {
      setLoading(true)
      const data = await fetchQueue()
      if (!active) return
      setQueue(data)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const done = queue.filter(q => q.status === 'DONE')
  const waiting = queue.filter(q => q.status === 'WAITING' || q.status === 'NEXT')
  const vialsUsed = done.length // 1 vial per dose; adjust if you track partial vials

  return (
    <div className={styles.vaccCard}>
      <div className={styles.vaccHeader}>
        <span className={styles.vaccTitle}>TODAY'S VACCINATION QUEUE</span>
        <span className={styles.queueDate}>{todayLabel}</span>
      </div>

      <div className={styles.dueStatRow}>
        <div className={`${styles.dueStat} ${styles.dueStatGreen}`}>
          <span className={styles.dueStatNum}>{done.length}</span>
          <span className={styles.dueStatLabel}>Done</span>
        </div>
        <div className={`${styles.dueStat} ${styles.dueStatAmber}`}>
          <span className={styles.dueStatNum}>{waiting.length}</span>
          <span className={styles.dueStatLabel}>Waiting</span>
        </div>
        <div className={`${styles.dueStat} ${styles.dueStatBlue}`}>
          <span className={styles.dueStatNum}>{vialsUsed}</span>
          <span className={styles.dueStatLabel}>Vials used</span>
        </div>
      </div>

      <div className={styles.dueList}>
        {loading && <div className={styles.emptyState}>Loading…</div>}

        {!loading && queue.length === 0 && (
          <div className={styles.emptyState}>No vaccinations recorded today yet</div>
        )}

        {!loading && queue.map(q => (
          <div key={q.id} className={styles.qItem}>
            <div className={styles.qTime}>{q.time}</div>
            <div className={styles.dueInfo}>
              <div className={styles.dueName}>{q.name}</div>
              <div className={styles.dueVaccines}>{q.vaccine} · {q.dose}</div>
            </div>
            <span className={STATUS_STYLE[q.status](styles)}>
              {q.status === 'DONE' ? '✓ Done' : q.status === 'NEXT' ? 'Next' : 'Waiting'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   DATA SOURCE
   Returns today's vaccinations newest-first:
   [{ id, time, name, vaccine, dose, status }]
   Wire to your immunization_history table, then USE_MOCK = false.
────────────────────────────────────────────── */
async function fetchQueue() {
  if (USE_MOCK) return MOCK_QUEUE

  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('immunization_history')
    .select('id, created_at, patient_name, vaccine, dose, status')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)
    .order('created_at', { ascending: false })

  if (error) { console.error(error); return [] }

  return (data || []).map(r => ({
    id: r.id,
    time: new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    name: r.patient_name,
    vaccine: r.vaccine,
    dose: r.dose,
    status: (r.status || 'DONE').toUpperCase(),
  }))
}