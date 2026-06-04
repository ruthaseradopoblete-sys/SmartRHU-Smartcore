'use client'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import StockLevelCard from '../components/StockLevelCard'
import DispensedMedicineCard from '../components/DispensedMedicineCard'
import PharmacyRequestsCard from '../components/Pharmacyrequestcard'
import styles from '../components/warehouse.module.css'
import { supabase } from '@/lib/supabase'

/* ─── Types ─────────────────────────────────────────────── */
type ExpiryFilter = '30' | '60' | '90'

interface Medicine {
  id: string
  med_name: string
  med_type: string
  quantity: number
  exp_date: string
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function DashboardPage() {
  const { theme } = useTheme()
  const [mounted,      setMounted]      = useState(false)
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('30')
  const [medicines,    setMedicines]    = useState<Medicine[]>([])
  const [loadingMeds,  setLoadingMeds]  = useState(true)

  useEffect(() => {
    setMounted(true)
    fetchMedicines()
  }, [])

  async function fetchMedicines() {
    setLoadingMeds(true)
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('warehouse_medicines')
      .select('id, med_name, med_type, quantity, exp_date')
      .eq('archived', false)
      .gt('exp_date', today)
      .order('quantity', { ascending: false })
    if (!error && data) setMedicines(data)
    setLoadingMeds(false)
  }

  /* ── Expiry logic ── */
  const today = new Date()
  const days  = parseInt(expiryFilter)
  const expiring = medicines
    .map(m => ({ ...m, daysLeft: Math.ceil((new Date(m.exp_date).getTime() - today.getTime()) / 86400000) }))
    .filter(m => m.daysLeft <= days && m.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const urgencyBadge = (d: number) => {
    if (d <= 14) return { bg: '#fee2e2', color: '#dc2626', label: `${d}d` }
    if (d <= 30) return { bg: '#fef9c3', color: '#ca8a04', label: `${d}d` }
    return { bg: '#dcfce7', color: '#16a34a', label: `${d}d` }
  }

  const isDark = mounted && theme === 'dark'

  /* ── Donut data ── */
  const typeColors = ['#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0','#6ee7b7','#34d399']
  const typeTotals: Record<string, number> = {}
  medicines.forEach(m => { typeTotals[m.med_type] = (typeTotals[m.med_type] || 0) + m.quantity })
  const typeEntries = Object.entries(typeTotals).sort((a, b) => b[1] - a[1])
  const total = typeEntries.reduce((s, [, v]) => s + v, 0)

  const size = 90, cx = 45, r = 34, circ = 2 * Math.PI * r
  let offset = 0
  const segments = typeEntries.map(([, v], i) => {
    const dash = (v / (total || 1)) * circ
    const el   = { dash, gap: circ - dash, offset, color: typeColors[i] ?? '#ccc' }
    offset += dash
    return el
  })

  /* ════════════ RENDER ════════════ */
  return (
    <div className={`${styles.root} ${isDark ? styles.dark : ''}`}>
      <Sidebar />
      <div className={styles.mainArea}>
        <Topbar />
        <div className={styles.content}>

          <p className={styles.pageEyebrow}>Warehouse</p>
          <h1 className={styles.pageTitle}>Dashboard</h1>

          {/* ══ OUTER GRID: left column | pharmacy requests ══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'stretch' }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── ANALYTICS ROW ── */}
              <div className={styles.analyticsCard}>
                <div className={styles.analyticsLabel}>Analytics</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>

                  {/* Total Medicine */}
                  <div className={styles.statCardGreen}>
                    <div className={styles.statLabel}>Total Medicine</div>
                    <div className={styles.statNum}>{loadingMeds ? '—' : medicines.length}</div>
                    <div className={styles.statDate}>
                      {today.toLocaleDateString('en-PH', {
                        weekday: 'short', year: 'numeric',
                        month: '2-digit', day: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Total Monthly Stock donut */}
                  <div className={styles.statCardLight}>
                    <div className={styles.statCardLightTitle}>Total Monthly Stock</div>
                    {loadingMeds ? (
                      <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>Loading…</div>
                    ) : (
                      <div className={styles.donutRow}>
                        <div className={styles.donutWrap}>
                          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                            <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(22,163,74,0.08)" strokeWidth={12} />
                            {segments.length === 0 ? (
                              <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e5e7eb" strokeWidth={12} />
                            ) : segments.map((s, i) => (
                              <circle key={i} cx={cx} cy={cx} r={r}
                                fill="none" stroke={s.color} strokeWidth={11.7}
                                strokeDasharray={`${s.dash} ${s.gap}`}
                                strokeDashoffset={-s.offset}
                                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                              />
                            ))}
                          </svg>
                        </div>
                        <div className={styles.donutLegend}>
                          {typeEntries.length === 0 ? (
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>No data yet</div>
                          ) : (
                            typeEntries.slice(0, 5).map(([type, qty], i) => (
                              <div key={type} className={styles.legendItem}>
                                <div className={styles.legendDot} style={{ background: typeColors[i] }} />
                                <span className={styles.legendName}>{type}</span>
                                <span className={styles.legendVal}>{qty}</span>
                              </div>
                            ))
                          )}
                          {typeEntries.length > 5 && (
                            <div className={styles.legendItem} style={{ color: 'var(--text3)', fontSize: 11 }}>
                              +{typeEntries.length - 5} others
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* ── BOTTOM ROW ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: 16, flex: 1 }}>

                <StockLevelCard />
                <DispensedMedicineCard />

                {/* Expiry Detail */}
                <div className={styles.card} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className={styles.cardHeader}>Expiry Detail</div>
                  <div className={styles.cardBody} style={{ padding: '12px 14px', flex: 1, overflowY: 'auto' }}>
                    <div className={styles.filterRow} style={{ marginBottom: 10 }}>
                      {(['30', '60', '90'] as ExpiryFilter[]).map(f => (
                        <button
                          key={f}
                          className={`${styles.filterPill} ${expiryFilter === f ? styles.filterPillActive : ''}`}
                          onClick={() => setExpiryFilter(f)}
                        >{f}d</button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {loadingMeds ? (
                        <p className={styles.emptyText}>Loading…</p>
                      ) : expiring.length === 0 ? (
                        <p className={styles.emptyText}>No medicines expiring within {expiryFilter} days</p>
                      ) : (
                        expiring.map(m => {
                          const pct = Math.min(100, (m.daysLeft / days) * 100)
                          const b   = urgencyBadge(m.daysLeft)
                          return (
                            <div key={m.id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.med_name}
                                </span>
                                <span style={{ background: b.bg, color: b.color, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8 }}>{b.label}</span>
                              </div>
                              <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: b.color, borderRadius: 4, transition: 'width .4s ease' }} />
                              </div>
                              <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{m.exp_date}</div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>{/* end bottom row */}
            </div>{/* end left column */}

            {/* ── RIGHT: Pharmacy Requests — separate component ── */}
            <PharmacyRequestsCard />

          </div>{/* end outer grid */}

        </div>
      </div>
    </div>
  )
}