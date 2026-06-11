'use client'
import { useState } from 'react'
import styles from './nurse.module.css'

const VACCINE_SCHEDULE = [
  { vaccine: 'BCG',         dose: '1st', ageGroup: 'At Birth', given: 42, target: 50, color: '#16a34a' },
  { vaccine: 'Hepatitis B', dose: '1st', ageGroup: 'At Birth', given: 38, target: 50, color: '#2563eb' },
  { vaccine: 'Pentavalent', dose: '1st', ageGroup: '6 weeks',  given: 35, target: 45, color: '#7c3aed' },
  { vaccine: 'Pentavalent', dose: '2nd', ageGroup: '10 weeks', given: 30, target: 45, color: '#7c3aed' },
  { vaccine: 'Pentavalent', dose: '3rd', ageGroup: '14 weeks', given: 28, target: 45, color: '#7c3aed' },
  { vaccine: 'OPV',         dose: '1st', ageGroup: '6 weeks',  given: 33, target: 45, color: '#f59e0b' },
  { vaccine: 'IPV',         dose: '1st', ageGroup: '14 weeks', given: 25, target: 45, color: '#ef4444' },
  { vaccine: 'Measles',     dose: '1st', ageGroup: '9 months', given: 20, target: 40, color: '#06b6d4' },
]

const MONTHLY_VACC = [
  { month: 'Jan', count: 28 }, { month: 'Feb', count: 35 },
  { month: 'Mar', count: 42 }, { month: 'Apr', count: 38 },
  { month: 'May', count: 51 }, { month: 'Jun', count: 47 },
]

export default function VaccinationPanel() {
  const [view, setView] = useState<'coverage' | 'monthly'>('coverage')
  const maxMonthly = Math.max(...MONTHLY_VACC.map(m => m.count))

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
        {view === 'coverage' ? (
          <>
            <p className={styles.vaccSubtitle}>Immunization Coverage — 2026</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {VACCINE_SCHEDULE.map((v, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      {v.vaccine}{' '}
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>
                        ({v.dose} · {v.ageGroup})
                      </span>
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: v.color }}>
                      {v.given}/{v.target} ({Math.round((v.given / v.target) * 100)}%)
                    </span>
                  </div>
                  <div style={{ height: 7, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, background: v.color,
                      width: `${(v.given / v.target) * 100}%`, transition: 'width .5s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 12, fontStyle: 'italic' }}>
              * Mock data — connect immunization_history table to show real data
            </p>
          </>
        ) : (
          <>
            <p className={styles.vaccSubtitle}>Monthly Vaccinations — 2026</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {MONTHLY_VACC.map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#374151' }}>{m.count}</span>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0', background: '#16a34a',
                    height: `${(m.count / maxMonthly) * 100}%`, minHeight: 4,
                    opacity: i === MONTHLY_VACC.length - 1 ? 1 : 0.55,
                  }} />
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{m.month}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Total 2026 (Jan–Jun)</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                {MONTHLY_VACC.reduce((a, m) => a + m.count, 0)} vaccinations
              </span>
            </div>
            <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>
              * Mock data — connect immunization_history table to show real data
            </p>
          </>
        )}
      </div>
    </div>
  )
}
