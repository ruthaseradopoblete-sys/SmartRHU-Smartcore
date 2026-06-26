'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type StockStatus = 'ok' | 'low' | 'critical' | 'expiring'

interface VaccItem {
  id: string
  name: string
  vials: number
  capacity: number
  expiry: string | null
  dispensed: number
  status: StockStatus
}

interface VaccineStockRow {
  id: string
  vaccine_name: string
  vials: number
  capacity: number
  dispensed: number
  expiry_date: string | null
  low_threshold: number
  critical_threshold: number
  expiring_days: number
}

const BADGE: Record<StockStatus, { bg: string; color: string; label: string }> = {
  ok:       { bg: '#dcfce7', color: '#166534', label: 'OK' },
  low:      { bg: '#fef9c3', color: '#854d0e', label: 'Low' },
  critical: { bg: '#fee2e2', color: '#991b1b', label: 'Critical' },
  expiring: { bg: '#ffedd5', color: '#9a3412', label: 'Expiring' },
}

function computeStatus(row: VaccineStockRow): StockStatus {
  if (row.vials <= row.critical_threshold) return 'critical'

  if (row.expiry_date) {
    const daysToExpiry = Math.ceil(
      (new Date(row.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysToExpiry <= row.expiring_days) return 'expiring'
  }

  if (row.vials <= row.low_threshold) return 'low'

  return 'ok'
}

export default function VaccineStock({ onRequest }: { onRequest: () => void }) {
  const [stock, setStock] = useState<VaccItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStock()
  }, [])

  async function fetchStock() {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('vaccine_stock')
      .select('id, vaccine_name, vials, capacity, dispensed, expiry_date, low_threshold, critical_threshold, expiring_days')
      .order('vaccine_name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as VaccineStockRow[]

    setStock(
      rows.map(r => ({
        id: r.id,
        name: r.vaccine_name,
        vials: r.vials,
        capacity: r.capacity,
        expiry: r.expiry_date,
        dispensed: r.dispensed,
        status: computeStatus(r),
      }))
    )

    setLoading(false)
  }

  const alerts = stock.filter(v => v.status !== 'ok')

  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(90deg, #14532d, #16a34a)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          Vaccine Stock
        </span>
        <button
          onClick={onRequest}
          style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
            border: 'none', background: 'rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer',
          }}
        >
          + Request
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', fontSize: 11, color: '#ef4444' }}>
          Failed to load vaccine stock: {error}
        </div>
      )}

      {/* Alerts */}
      {!loading && alerts.length > 0 && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '8px 14px' }}>
          <p style={{ fontSize: 11, color: '#92400e', fontWeight: 700, margin: '0 0 4px' }}>
            ⚠ Alerts ({alerts.length})
          </p>
          {alerts.map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#b45309' }}>
              <span>{v.name}</span>
              <span>
                {v.status === 'expiring' || v.status === 'critical'
                  ? `Exp: ${v.expiry ?? 'N/A'}`
                  : `Only ${v.vials} vials left`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stock list */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10, opacity: loading ? 0.5 : 1 }}>
        {loading && stock.length === 0 && (
          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
            Loading vaccine stock...
          </p>
        )}

        {!loading && stock.length === 0 && !error && (
          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
            No vaccine stock records yet.
          </p>
        )}

        {stock.map(v => {
          const pct = v.capacity > 0 ? Math.round((v.vials / v.capacity) * 100) : 0
          const barColor =
            v.status === 'critical' ? '#ef4444' :
            v.status === 'low'      ? '#f59e0b' :
            v.status === 'expiring' ? '#f97316' : '#16a34a'
          const b = BADGE[v.status]
          const expiryWarn = v.status === 'expiring' || v.status === 'critical'

          return (
            <div key={v.id}>
              {/* Name + badge + count */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{v.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                    background: b.bg, color: b.color,
                  }}>
                    {b.label}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{v.vials}/{v.capacity} vials</span>
              </div>

              {/* Progress bar */}
              <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(pct, 100)}%`, height: '100%',
                  background: barColor, borderRadius: 4,
                  transition: 'width .4s',
                }} />
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>Dispensed: {v.dispensed}</span>
                <span style={{ fontSize: 10, color: expiryWarn ? '#ef4444' : '#9ca3af' }}>
                  Exp: {v.expiry ?? 'N/A'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}