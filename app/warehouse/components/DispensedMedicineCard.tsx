'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './warehouse.module.css'

interface DispensedItem {
  id: string
  med_name: string
  quantity_dispensed: number
  dispensed_to: string
  dispensed_at: string
}

interface GroupedItem {
  med_name: string
  total: number
  topDestination: string
}

function MiniBar({ value, max, color = '#16a34a' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s ease' }} />
    </div>
  )
}

const BAR_COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#6ee7b7', '#34d399', '#10b981']

export default function DispensedMedicineCard() {
  const [items,   setItems]   = useState<GroupedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total,   setTotal]   = useState(0)
  const [month,   setMonth]   = useState('')

  useEffect(() => { fetchDispensed() }, [])

  async function fetchDispensed() {
    setLoading(true)

    // Get current month range
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    setMonth(now.toLocaleString('default', { month: 'long', year: 'numeric' }))

    const { data, error } = await supabase
      .from('warehouse_dispensed')
      .select('id, med_name, quantity_dispensed, dispensed_to, dispensed_at')
      .gte('dispensed_at', start)
      .lte('dispensed_at', end)

    if (!error && data) {
      // Group by medicine name
      const grouped: Record<string, { total: number; destinations: Record<string, number> }> = {}
      data.forEach((item: DispensedItem) => {
        if (!grouped[item.med_name]) grouped[item.med_name] = { total: 0, destinations: {} }
        grouped[item.med_name].total += item.quantity_dispensed
        const dest = item.dispensed_to || 'Unknown'
        grouped[item.med_name].destinations[dest] = (grouped[item.med_name].destinations[dest] || 0) + item.quantity_dispensed
      })

      const result: GroupedItem[] = Object.entries(grouped)
        .map(([med_name, v]) => ({
          med_name,
          total: v.total,
          topDestination: Object.entries(v.destinations).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
        }))
        .sort((a, b) => b.total - a.total)

      setItems(result)
      setTotal(result.reduce((s, i) => s + i.total, 0))
    }

    setLoading(false)
  }

  const maxVal = Math.max(...items.map(i => i.total), 1)
  const topMed = items[0]

  return (
    <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.cardHeader}>Dispensed Medicine</div>
      <div className={styles.cardBody} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 14px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 12 }}>
            Loading dispensed records…
          </div>
        ) : (
          <>
            {/* Summary header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Total This Month
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', lineHeight: 1.1 }}>
                  {total.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>units dispensed</div>
              </div>
              {topMed && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Top Medicine
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{topMed.med_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>{topMed.total} units</div>
                </div>
              )}
            </div>

            {/* Bar list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
              {items.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
                  No dispensed records this month.
                </div>
              ) : (
                items.map((item, i) => (
                  <div key={item.med_name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%' }}>
                        {item.med_name}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>{item.total}</span>
                    </div>
                    <MiniBar value={item.total} max={maxVal} color={BAR_COLORS[i % BAR_COLORS.length]} />
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{item.topDestination}</div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'var(--text3)' }}>{month}</span>
              <span style={{ fontSize: 9, color: 'var(--green)', fontWeight: 600 }}>
                {items.length} medicine{items.length !== 1 ? 's' : ''} tracked
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}