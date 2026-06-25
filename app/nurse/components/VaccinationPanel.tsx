'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface VaccineStat {
  vaccine_name: string
  count: number
  color: string
}

interface MonthlyRow {
  month: string
  doses: number
}

const VACCINE_COLORS: Record<string, string> = {
  'BCG': '#16a34a',
  'Hepatitis B': '#2563eb',
  'Pentavalent': '#7c3aed',
  'OPV': '#f59e0b',
  'IPV': '#ef4444',
  'Measles': '#06b6d4',
  'MMR': '#ec4899',
  'Rotavirus': '#8b5cf6',
  'PCV': '#0891b2',
  'Varicella': '#65a30d',
}

function getColor(name: string): string {
  for (const [key, color] of Object.entries(VACCINE_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color
  }
  const colors = ['#6366f1', '#f97316', '#14b8a6', '#a855f7', '#84cc16']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function VaccinationPanel() {
  const [view, setView] = useState<'stock' | 'monthly'>('stock')
  const [vaccineStats, setVaccineStats] = useState<VaccineStat[]>([])
  const [monthly, setMonthly] = useState<MonthlyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)

    const year = new Date().getFullYear()
    const yearStart = `${year}-01-01T00:00:00+00:00`
    const yearEnd   = `${year + 1}-01-01T00:00:00+00:00`

    const { data, error: err } = await supabase
      .from('patient_vaccine_orders')
      .select('vaccines, created_at')
      .eq('status', 'done')
      .gte('created_at', yearStart)
      .lt('created_at', yearEnd)

    if (err) { setError(err.message); setLoading(false); return }

    const currentMonth = new Date().getMonth()

    // --- Stock tab: count per vaccine name ---
    const vaccineCounts: Record<string, number> = {}

    // --- Monthly tab: total doses per month ---
    const monthDoses = new Array(currentMonth + 1).fill(0)

    for (const row of data ?? []) {
      const vaccines: string[] = row.vaccines ?? []
      const m = new Date(row.created_at).getMonth()

      for (const v of vaccines) {
        const name = v.trim()
        if (!name) continue
        vaccineCounts[name] = (vaccineCounts[name] ?? 0) + 1
        if (m <= currentMonth) monthDoses[m] += 1
      }
    }

    const stats: VaccineStat[] = Object.entries(vaccineCounts)
      .map(([vaccine_name, count]) => ({ vaccine_name, count, color: getColor(vaccine_name) }))
      .sort((a, b) => b.count - a.count)

    setVaccineStats(stats)
    setMonthly(monthDoses.map((doses, i) => ({ month: MONTH_LABELS[i], doses })))
    setLoading(false)
  }

  const maxMonthly   = Math.max(1, ...monthly.map(m => m.doses))
  const totalDoses   = monthly.reduce((a, m) => a + m.doses, 0)
  const maxVaccCount = Math.max(1, ...vaccineStats.map(v => v.count))

  return (
    <div className={styles.vaccCard}>
      <div className={styles.vaccHeader}>
        <span className={styles.vaccTitle}>💉 VACCINATION ANALYTICS</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['stock', 'monthly'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`${styles.vaccViewBtn} ${view === v ? styles.vaccViewBtnActive : ''}`}
            >
              {v === 'stock' ? 'Stock' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.vaccBody}>
        {error && (
          <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>
            Failed to load data: {error}
          </p>
        )}

        {view === 'stock' ? (
          <>
            <p className={styles.vaccSubtitle}>
              Completed Orders by Vaccine — {new Date().getFullYear()}
            </p>

            {!loading && vaccineStats.length === 0 && (
              <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingTop: 24 }}>
                No completed vaccine orders found for this year.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: loading ? 0.4 : 1 }}>
              {vaccineStats.map((v, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      {v.vaccine_name}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: v.color }}>
                      {v.count} patient{v.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ height: 7, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: v.color,
                      width: `${Math.round((v.count / maxVaccCount) * 100)}%`,
                      transition: 'width .5s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className={styles.vaccSubtitle}>
              Total Doses Given — {new Date().getFullYear()}
            </p>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8, height: 120,
              opacity: loading ? 0.4 : 1,
            }}>
              {monthly.map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#374151' }}>{m.doses}</span>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0', background: '#16a34a',
                    height: `${(m.doses / maxMonthly) * 100}%`, minHeight: m.doses > 0 ? 4 : 0,
                    opacity: i === monthly.length - 1 ? 1 : 0.55,
                  }} />
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{m.month}</span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 12,
              paddingTop: 8, borderTop: '1px solid #f3f4f6',
            }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Total {new Date().getFullYear()} (Jan–{monthly[monthly.length - 1]?.month ?? '—'})
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                {totalDoses} doses
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}