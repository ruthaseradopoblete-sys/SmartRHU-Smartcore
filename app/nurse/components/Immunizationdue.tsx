'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

/* ──────────────────────────────────────────────
   IMMUNIZATION DUE — replaces VaccinationPanel
   Shows children who are OVERDUE or DUE SOON for
   their next EPI vaccine dose.
────────────────────────────────────────────── */

// Flip to false once your Supabase tables are wired (see fetchDue below)
const USE_MOCK = true

// How many days ahead counts as "due soon"
const DUE_SOON_WINDOW = 14

// Philippine EPI schedule: vaccine, dose, and recommended age (in weeks)
const EPI_SCHEDULE = [
  { vaccine: 'BCG',         dose: '1st', weeks: 0 },
  { vaccine: 'Hepatitis B', dose: '1st', weeks: 0 },
  { vaccine: 'Pentavalent', dose: '1st', weeks: 6 },
  { vaccine: 'OPV',         dose: '1st', weeks: 6 },
  { vaccine: 'PCV',         dose: '1st', weeks: 6 },
  { vaccine: 'Pentavalent', dose: '2nd', weeks: 10 },
  { vaccine: 'OPV',         dose: '2nd', weeks: 10 },
  { vaccine: 'PCV',         dose: '2nd', weeks: 10 },
  { vaccine: 'Pentavalent', dose: '3rd', weeks: 14 },
  { vaccine: 'OPV',         dose: '3rd', weeks: 14 },
  { vaccine: 'IPV',         dose: '1st', weeks: 14 },
  { vaccine: 'PCV',         dose: '3rd', weeks: 14 },
  { vaccine: 'Measles',     dose: '1st', weeks: 39 }, // ~9 months
  { vaccine: 'MMR',         dose: '1st', weeks: 52 }, // 12 months
]

// ── helpers ──────────────────────────────────
const MS_DAY = 86400000

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function ageLabel(birthDate) {
  const days = Math.floor((Date.now() - new Date(birthDate).getTime()) / MS_DAY)
  const weeks = Math.floor(days / 7)
  if (weeks < 16) return `${weeks} wks`
  const months = Math.floor(days / 30.4)
  if (months < 24) return `${months} mos`
  return `${Math.floor(months / 12)} yrs`
}

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// Given a child + completed dose keys, return the vaccines that are due/overdue
function computeDue(child) {
  const completed = new Set(child.completed || [])
  const birth = new Date(child.birthDate).getTime()
  const today = Date.now()
  const items = []

  for (const s of EPI_SCHEDULE) {
    const key = `${s.vaccine}-${s.dose}`
    if (completed.has(key)) continue

    const dueDate = birth + s.weeks * 7 * MS_DAY
    const diffDays = Math.round((dueDate - today) / MS_DAY)

    // overdue (already passed) or coming up within the window
    if (diffDays <= DUE_SOON_WINDOW) {
      items.push({ ...s, dueDate, diffDays })
    }
  }
  if (!items.length) return null

  // earliest-due first; the child's headline status is its most urgent dose
  items.sort((a, b) => a.dueDate - b.dueDate)
  const lead = items[0]
  return {
    id: child.id,
    name: child.name,
    age: ageLabel(child.birthDate),
    vaccines: items.map(i => `${i.vaccine} ${i.dose}`).join(' · '),
    diffDays: lead.diffDays,
    dueDate: lead.dueDate,
    overdue: lead.diffDays < 0,
  }
}

function formatDue(row) {
  if (row.overdue) {
    const late = Math.abs(row.diffDays)
    return `${late} day${late === 1 ? '' : 's'} late`
  }
  if (row.diffDays === 0) return 'due today'
  const d = new Date(row.dueDate)
  return `due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// ── mock children (remove once USE_MOCK = false) ──
const MOCK_CHILDREN = [
  { id: 1, name: 'Juan Cruz',       birthDate: daysAgo(77),  completed: ['BCG-1st', 'Hepatitis B-1st', 'Pentavalent-1st', 'OPV-1st', 'PCV-1st'] },
  { id: 2, name: 'Maria Santos',    birthDate: daysAgo(100), completed: ['BCG-1st', 'Hepatitis B-1st', 'Pentavalent-1st', 'Pentavalent-2nd', 'OPV-1st', 'OPV-2nd', 'PCV-1st', 'PCV-2nd'] },
  { id: 3, name: 'Ana Reyes',       birthDate: daysAgo(270), completed: ['BCG-1st', 'Hepatitis B-1st', 'Pentavalent-1st', 'Pentavalent-2nd', 'Pentavalent-3rd', 'OPV-1st', 'OPV-2nd', 'OPV-3rd', 'IPV-1st', 'PCV-1st', 'PCV-2nd', 'PCV-3rd'] },
  { id: 4, name: 'Pedro Garcia',    birthDate: daysAgo(40),  completed: ['BCG-1st', 'Hepatitis B-1st'] },
  { id: 5, name: 'Liza Mendoza',    birthDate: daysAgo(95),  completed: ['BCG-1st', 'Hepatitis B-1st', 'Pentavalent-1st', 'OPV-1st', 'PCV-1st'] },
  { id: 6, name: 'Carlo Dela Cruz', birthDate: daysAgo(285), completed: ['BCG-1st', 'Hepatitis B-1st', 'Pentavalent-1st', 'Pentavalent-2nd', 'Pentavalent-3rd', 'OPV-1st', 'OPV-2nd', 'OPV-3rd', 'IPV-1st', 'PCV-1st', 'PCV-2nd', 'PCV-3rd'] },
]

export default function ImmunizationDue() {
  const [tab, setTab] = useState('overdue') // 'overdue' | 'soon'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const children = await fetchChildren()
      if (!active) return
      const due = children.map(computeDue).filter(Boolean)
      due.sort((a, b) => a.dueDate - b.dueDate)
      setRows(due)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const overdue = rows.filter(r => r.overdue)
  const soon = rows.filter(r => !r.overdue)
  const list = tab === 'overdue' ? overdue : soon
  const onSchedule = 41 // TODO: count children up-to-date; placeholder

  return (
    <div className={styles.vaccCard}>
      <div className={styles.vaccHeader}>
        <span className={styles.vaccTitle}>IMMUNIZATION DUE</span>
        <div className={styles.dueToggle}>
          <button
            className={`${styles.vaccViewBtn} ${tab === 'overdue' ? styles.vaccViewBtnActive : ''}`}
            onClick={() => setTab('overdue')}
          >
            Overdue
          </button>
          <button
            className={`${styles.vaccViewBtn} ${tab === 'soon' ? styles.vaccViewBtnActive : ''}`}
            onClick={() => setTab('soon')}
          >
            Due soon
          </button>
        </div>
      </div>

      <div className={styles.dueStatRow}>
        <div className={`${styles.dueStat} ${styles.dueStatRed}`}>
          <span className={styles.dueStatNum}>{overdue.length}</span>
          <span className={styles.dueStatLabel}>Overdue</span>
        </div>
        <div className={`${styles.dueStat} ${styles.dueStatAmber}`}>
          <span className={styles.dueStatNum}>{soon.length}</span>
          <span className={styles.dueStatLabel}>Due this week</span>
        </div>
        <div className={`${styles.dueStat} ${styles.dueStatGreen}`}>
          <span className={styles.dueStatNum}>{onSchedule}</span>
          <span className={styles.dueStatLabel}>On schedule</span>
        </div>
      </div>

      <div className={styles.dueList}>
        {loading && <div className={styles.emptyState}>Loading…</div>}

        {!loading && list.length === 0 && (
          <div className={styles.emptyState}>
            {tab === 'overdue' ? 'No overdue children 🎉' : 'No upcoming doses this week'}
          </div>
        )}

        {!loading && list.map(row => (
          <div key={row.id} className={styles.dueItem}>
            <div className={`${styles.dueAvatar} ${row.overdue ? styles.dueAvatarRed : styles.dueAvatarAmber}`}>
              {initials(row.name)}
            </div>
            <div className={styles.dueInfo}>
              <div className={styles.dueName}>
                {row.name} <span className={styles.dueAge}>· {row.age}</span>
              </div>
              <div className={styles.dueVaccines}>{row.vaccines}</div>
            </div>
            <div className={styles.dueRight}>
              <span className={row.overdue ? styles.dueLate : styles.dueSoonLabel}>
                {formatDue(row)}
              </span>
              <button
                className={styles.dueBtn}
                onClick={() => alert(`Schedule vaccination for ${row.name}`)}
              >
                Schedule
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   DATA SOURCE
   Returns: [{ id, name, birthDate, completed: ['Pentavalent-1st', ...] }]
   Wire this to your real tables, then set USE_MOCK = false above.
────────────────────────────────────────────── */
async function fetchChildren() {
  if (USE_MOCK) return MOCK_CHILDREN

  // 1) pull child patients (adjust table/column names to your schema)
  const { data: patients, error: pErr } = await supabase
    .from('patients')
    .select('id, full_name, birth_date')
    .lte('birth_date', new Date().toISOString())        // born already
    .gte('birth_date', daysAgo(365 * 2))                 // under ~2 yrs
  if (pErr) { console.error(pErr); return [] }

  // 2) pull every recorded dose for those children
  const ids = patients.map(p => p.id)
  const { data: history, error: hErr } = await supabase
    .from('immunization_history')
    .select('patient_id, vaccine, dose')
    .in('patient_id', ids)
  if (hErr) { console.error(hErr); return [] }

  // 3) merge into the shape computeDue() expects
  const byChild = {}
  for (const h of history) {
    (byChild[h.patient_id] ||= []).push(`${h.vaccine}-${h.dose}`)
  }
  return patients.map(p => ({
    id: p.id,
    name: p.full_name,
    birthDate: p.birth_date,
    completed: byChild[p.id] || [],
  }))
}