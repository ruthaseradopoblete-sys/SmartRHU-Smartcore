'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

/* ──────────────────────────────────────────────
   VACCINE STOCK — middle panel (pairs with Immunization Due)
   Shows vials on hand, dispensed, status + expiry alerts.
────────────────────────────────────────────── */

const USE_MOCK = true

const EXPIRING_DAYS = 14   // <= this many days to expiry = "expiring"
const SOON_DAYS     = 30   // <= this many days = amber expiry text
const LOW_VIALS     = 5    // <= this many vials = "low"
const CRITICAL_VIALS = 2   // <= this many vials = "critical"

const MS_DAY = 86400000

function daysTo(dateStr) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / MS_DAY)
}

function statusOf(v) {
  const dte = daysTo(v.expiry)
  const pct = v.current / v.total
  if (dte < 0) return 'expired'
  if (v.current <= CRITICAL_VIALS || pct <= 0.05) return 'critical'
  if (dte <= EXPIRING_DAYS) return 'expiring'
  if (v.current <= LOW_VIALS || pct <= 0.15) return 'low'
  return 'ok'
}

const STATUS_LABEL = { ok: 'OK', low: 'Low', critical: 'Critical', expiring: 'Expiring', expired: 'Expired' }
const STATUS_CLASS = {
  ok:       'stockBadgeOk',
  low:      'stockBadgeLow',
  critical: 'stockBadgeCritical',
  expiring: 'stockBadgeExpiring',
  expired:  'stockBadgeCritical',
}
const BAR_CLASS = {
  ok:       'stockBarOk',
  low:      'stockBarLow',
  critical: 'stockBarCritical',
  expiring: 'stockBarExpiring',
  expired:  'stockBarCritical',
}

function expiryClass(v) {
  const dte = daysTo(v.expiry)
  if (dte <= EXPIRING_DAYS) return styles.medExpired       // red (reuses your existing class)
  if (dte <= SOON_DAYS) return styles.medExpiringSoon      // amber
  return ''
}

// ── mock stock (remove once USE_MOCK = false) ──
const MOCK_STOCK = [
  { id: 1, name: 'BCG',         total: 50, current: 12, dispensed: 42, expiry: '2026-07-15' },
  { id: 2, name: 'Hepatitis B', total: 50, current: 8,  dispensed: 38, expiry: '2026-06-28' },
  { id: 3, name: 'Pentavalent', total: 45, current: 3,  dispensed: 35, expiry: '2026-08-20' },
  { id: 4, name: 'OPV',         total: 45, current: 2,  dispensed: 33, expiry: '2026-06-18' },
  { id: 5, name: 'IPV',         total: 45, current: 18, dispensed: 25, expiry: '2026-09-30' },
  { id: 6, name: 'Measles',     total: 40, current: 5,  dispensed: 20, expiry: '2026-07-05' },
]

export default function VaccineStock({ onRequest }) {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const data = await fetchStock()
      if (!active) return
      setStock(data)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const totalVials = stock.reduce((sum, v) => sum + v.current, 0)
  const needRestock = stock.filter(v => ['low', 'critical', 'expired'].includes(statusOf(v))).length
  const expiringSoon = stock.filter(v => daysTo(v.expiry) <= EXPIRING_DAYS).length

  return (
    <div className={styles.vaccCard}>
      <div className={styles.vaccHeader}>
        <span className={styles.vaccTitle}>VACCINE STOCK</span>
        {onRequest && (
          <button className={styles.vaccViewBtn} onClick={onRequest}>+ Request</button>
        )}
      </div>

      <div className={styles.dueStatRow}>
        <div className={`${styles.dueStat} ${styles.dueStatBlue}`}>
          <span className={styles.dueStatNum}>{totalVials}</span>
          <span className={styles.dueStatLabel}>Vials on hand</span>
        </div>
        <div className={`${styles.dueStat} ${styles.dueStatAmber}`}>
          <span className={styles.dueStatNum}>{needRestock}</span>
          <span className={styles.dueStatLabel}>Need restock</span>
        </div>
        <div className={`${styles.dueStat} ${styles.dueStatRed}`}>
          <span className={styles.dueStatNum}>{expiringSoon}</span>
          <span className={styles.dueStatLabel}>Expiring soon</span>
        </div>
      </div>

      <div className={styles.dueList}>
        {loading && <div className={styles.emptyState}>Loading…</div>}

        {!loading && stock.length === 0 && (
          <div className={styles.emptyState}>No vaccine stock recorded</div>
        )}

        {!loading && stock.map(v => {
          const status = statusOf(v)
          const pct = Math.min(100, Math.round((v.current / v.total) * 100))
          return (
            <div key={v.id} className={styles.stockItem}>
              <div className={styles.stockTop}>
                <div className={styles.stockNameRow}>
                  <span className={styles.stockName}>{v.name}</span>
                  <span className={`${styles.stockBadge} ${styles[STATUS_CLASS[status]]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <span className={styles.stockVials}>{v.current}/{v.total} vials</span>
              </div>

              <div className={styles.stockBar}>
                <div
                  className={`${styles.stockBarFill} ${styles[BAR_CLASS[status]]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className={styles.stockBottom}>
                <span className={styles.stockDispensed}>Dispensed: {v.dispensed}</span>
                <span className={expiryClass(v)}>Exp: {v.expiry}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   DATA SOURCE
   Returns: [{ id, name, total, current, dispensed, expiry }]
   Wire to your vaccine inventory table, then USE_MOCK = false.
────────────────────────────────────────────── */
async function fetchStock() {
  if (USE_MOCK) return MOCK_STOCK

  const { data, error } = await supabase
    .from('vaccine_stock')                                   // adjust to your table
    .select('id, vaccine_name, capacity, vials_on_hand, dispensed, expiry_date')
    .order('vaccine_name', { ascending: true })

  if (error) { console.error(error); return [] }

  return (data || []).map(r => ({
    id: r.id,
    name: r.vaccine_name,
    total: r.capacity,
    current: r.vials_on_hand,
    dispensed: r.dispensed,
    expiry: r.expiry_date,
  }))
}