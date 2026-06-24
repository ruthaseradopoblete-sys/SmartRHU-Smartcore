'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

interface Stats {
  consultations: number
  vaccinations:  number
  waiting:       number
}

export default function StatCards({ stats }: { stats: Stats }) {
  const [stockCount, setStockCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStock()
  }, [])

  async function fetchStock() {
    setLoading(true)

    const { data, error } = await supabase
      .from('vaccine_stock')
      .select('vials')

    if (error) {
      console.error('Failed to fetch vaccine_stock:', error.message)
      setStockCount(null)
      setLoading(false)
      return
    }

    const total = (data ?? []).reduce((sum, r) => sum + (Number(r.vials) || 0), 0)
    setStockCount(total)
    setLoading(false)
  }

  const cards = [
    { icon: '🩺', val: stats.consultations,        label: 'Consultations Today', accent: '#16a34a' },
    { icon: '💉', val: stats.vaccinations,         label: 'Vaccinations Done',   accent: '#7c3aed' },
    { icon: '⏳', val: stats.waiting,               label: 'Waiting Patients',    accent: '#f59e0b' },
    { icon: '🏥', val: loading ? '—' : stockCount ?? '—', label: 'Vaccine Stock', accent: '#0369a1' },
  ]

  return (
    <div className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {cards.map(s => (
        <div
          key={s.label}
          className={styles.statCard}
          style={{ borderTop: `3px solid ${s.accent}` }}
        >
          <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 6 }}>{s.icon}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: s.accent, lineHeight: 1 }}>
            {s.val}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 600, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: 0.06, marginTop: 4,
          }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}