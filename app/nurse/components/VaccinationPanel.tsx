'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

// Schedule definition stays static — only the "given" counts come from real data now.
const VACCINE_SCHEDULE = [
  { vaccine: 'BCG',         dose: '1st', ageGroup: 'At Birth', target: 50, color: '#16a34a' },
  { vaccine: 'Hepatitis B', dose: '1st', ageGroup: 'At Birth', target: 50, color: '#2563eb' },
  { vaccine: 'Pentavalent', dose: '1st', ageGroup: '6 weeks',  target: 45, color: '#7c3aed' },
  { vaccine: 'Pentavalent', dose: '2nd', ageGroup: '10 weeks', target: 45, color: '#7c3aed' },
  { vaccine: 'Pentavalent', dose: '3rd', ageGroup: '14 weeks', target: 45, color: '#7c3aed' },
  { vaccine: 'OPV',         dose: '1st', ageGroup: '6 weeks',  target: 45, color: '#f59e0b' },
  { vaccine: 'IPV',         dose: '1st', ageGroup: '14 weeks', target: 45, color: '#ef4444' },
  { vaccine: 'Measles',     dose: '1st', ageGroup: '9 months', target: 40, color: '#06b6d4' },
] as const

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface CoverageRow {
  vaccine: string
  dose: string
  ageGroup: string
  target: number
  color: string
  given: number
}

interface MonthlyRow {
  month: string
  count: number
}

export default function VaccinationPanel() {
  const [view, setView] = useState<'coverage' | 'monthly'>('coverage')
  const [coverage, setCoverage] = useState<CoverageRow[]>(
    VACCINE_SCHEDULE.map(v => ({ ...v, given: 0 }))
  )
  const [monthly, setMonthly] = useState<MonthlyRow[]>(
    MONTH_LABELS.slice(0, 6).map(m => ({ month: m, count: 0 }))
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)

    const year = new Date().getFullYear()
    const yearStart = `${year}-01-01T00:00:00+00:00`
    const yearEnd = `${year + 1}-01-01T00:00:00+00:00`

    const { data, error: fetchError } = await supabase
      .from('immunization_history_vaccination')
      .select('vaccine_name, dose_label, administered_at')
      .gte('administered_at', yearStart)
      .lt('administered_at', yearEnd)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = data ?? []

    // --- Coverage: count per (vaccine_name, dose_label) ---
    const counts: Record<string, number> = {}
    for (const r of rows) {
      const key = `${r.vaccine_name}__${r.dose_label}`
      counts[key] = (counts[key] ?? 0) + 1
    }

    setCoverage(
      VACCINE_SCHEDULE.map(v => ({
        ...v,
        given: counts[`${v.vaccine}__${v.dose}`] ?? 0,
      }))
    )

    // --- Monthly: count per calendar month (Jan..current month) ---
    const currentMonth = new Date().getMonth() // 0-indexed
    const monthCounts = new Array(currentMonth + 1).fill(0)
    for (const r of rows) {
      const m = new Date(r.administered_at).getMonth()
      if (m <= currentMonth) monthCounts[m] += 1
    }

    setMonthly(
      monthCounts.map((count, i) => ({ month: MONTH_LABELS[i], count }))
    )

    setLoading(false)
  }

  const maxMonthly = Math.max(1, ...monthly.map(m => m.count))
  const totalMonthly = monthly.reduce((a, m) => a + m.count, 0)

  return (
    <div className={styles.vaccCard}>
      <div className={styles.vaccHeader}>
        <span className={styles.vaccTitle}>💉 VACCINATION ANALYTICS</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['coverage', 'monthly'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`${styles.vaccViewBtn} ${view === v ? styles.vaccViewBtnActive : ''}`}
            >
              {v === 'coverage' ? 'Coverage' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.vaccBody}>
        {error && (
          <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>
            Failed to load immunization data: {error}
          </p>
        )}

        {view === 'coverage' ? (
          <>
            <p className={styles.vaccSubtitle}>
              Immunization Coverage — {new Date().getFullYear()}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: loading ? 0.5 : 1 }}>
              {coverage.map((v, i) => {
                const pct = v.target > 0 ? Math.round((v.given / v.target) * 100) : 0
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        {v.vaccine}{' '}
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>
                          ({v.dose} · {v.ageGroup})
                        </span>
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: v.color }}>
                        {v.given}/{v.target} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 7, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4, background: v.color,
                        width: `${Math.min(pct, 100)}%`, transition: 'width .5s',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <p className={styles.vaccSubtitle}>
              Monthly Vaccinations — {new Date().getFullYear()}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, opacity: loading ? 0.5 : 1 }}>
              {monthly.map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#374151' }}>{m.count}</span>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0', background: '#16a34a',
                    height: `${(m.count / maxMonthly) * 100}%`, minHeight: 4,
                    opacity: i === monthly.length - 1 ? 1 : 0.55,
                  }} />
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{m.month}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Total {new Date().getFullYear()} (Jan–{monthly[monthly.length - 1]?.month})
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                {totalMonthly} vaccinations
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}