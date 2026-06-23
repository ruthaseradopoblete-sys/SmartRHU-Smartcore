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

  useEffect(() => {
    async function fetchStock() {
      const tables = ['vaccine_stocks', 'vaccine_inventory', 'vaccines', 'medicine_stocks']

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })

        if (!error) {
          const { data: rows } = await supabase.from(table).select('*').limit(1)
          const sample = rows?.[0] ?? {}
          const qtyCol = 'quantity'      in sample ? 'quantity'
                       : 'stock'         in sample ? 'stock'
                       : 'stocks'        in sample ? 'stocks'
                       : 'current_stock' in sample ? 'current_stock'
                       : null

          if (qtyCol) {
            const { data: allRows } = await supabase.from(table).select(qtyCol)
            const total = (allRows ?? []).reduce((sum: number, r: any) => sum + (Number(r[qtyCol]) || 0), 0)
            setStockCount(total)
          } else {
            const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
            setStockCount(count ?? 0)
          }
          break
        }
      }
    }

    fetchStock()
  }, [])

  const cards = [
    { icon: '🩺', val: stats.consultations, label: 'Consultations Today', accent: '#16a34a' },
    { icon: '💉', val: stats.vaccinations,  label: 'Vaccinations Done',   accent: '#7c3aed' },
    { icon: '⏳', val: stats.waiting,       label: 'Waiting Patients',    accent: '#f59e0b' },
    { icon: '🏥', val: stockCount ?? '—',   label: 'Vaccine Stock',       accent: '#0369a1' },
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