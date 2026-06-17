'use client'

type StockStatus = 'ok' | 'low' | 'critical' | 'expiring'

interface VaccItem {
  name: string
  vials: number
  capacity: number
  expiry: string
  status: StockStatus
  dispensed: number
}

const VACC_STOCK: VaccItem[] = [
  { name: 'BCG',         vials: 12, capacity: 50, expiry: '2026-07-15', status: 'ok',       dispensed: 42 },
  { name: 'Hepatitis B', vials: 8,  capacity: 50, expiry: '2026-06-28', status: 'expiring', dispensed: 38 },
  { name: 'Pentavalent', vials: 3,  capacity: 45, expiry: '2026-08-20', status: 'low',      dispensed: 35 },
  { name: 'OPV',         vials: 2,  capacity: 45, expiry: '2026-06-18', status: 'critical', dispensed: 33 },
  { name: 'IPV',         vials: 18, capacity: 45, expiry: '2026-09-30', status: 'ok',       dispensed: 25 },
  { name: 'Measles',     vials: 5,  capacity: 40, expiry: '2026-07-05', status: 'low',      dispensed: 20 },
]

const BADGE: Record<StockStatus, { bg: string; color: string; label: string }> = {
  ok:       { bg: '#dcfce7', color: '#166534', label: 'OK' },
  low:      { bg: '#fef9c3', color: '#854d0e', label: 'Low' },
  critical: { bg: '#fee2e2', color: '#991b1b', label: 'Critical' },
  expiring: { bg: '#ffedd5', color: '#9a3412', label: 'Expiring' },
}

export default function VaccineStock({ onRequest }: { onRequest: () => void }) {
  const alerts = VACC_STOCK.filter(v => v.status !== 'ok')

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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '8px 14px' }}>
          <p style={{ fontSize: 11, color: '#92400e', fontWeight: 700, margin: '0 0 4px' }}>
            ⚠ Alerts ({alerts.length})
          </p>
          {alerts.map(v => (
            <div key={v.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#b45309' }}>
              <span>{v.name}</span>
              <span>
                {v.status === 'expiring' || v.status === 'critical'
                  ? `Exp: ${v.expiry}`
                  : `Only ${v.vials} vials left`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stock list */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {VACC_STOCK.map(v => {
          const pct = Math.round((v.vials / v.capacity) * 100)
          const barColor =
            v.status === 'critical' ? '#ef4444' :
            v.status === 'low'      ? '#f59e0b' :
            v.status === 'expiring' ? '#f97316' : '#16a34a'
          const b = BADGE[v.status]
          const expiryWarn = v.status === 'expiring' || v.status === 'critical'

          return (
            <div key={v.name}>
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
                  width: `${pct}%`, height: '100%',
                  background: barColor, borderRadius: 4,
                  transition: 'width .4s',
                }} />
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>Dispensed: {v.dispensed}</span>
                <span style={{ fontSize: 10, color: expiryWarn ? '#ef4444' : '#9ca3af' }}>
                  Exp: {v.expiry}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}