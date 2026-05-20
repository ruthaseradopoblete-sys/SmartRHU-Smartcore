'use client'
import { useEffect, useState, useRef } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { supabase } from '@/lib/supabase'
import styles from './warehouse.module.css'

ChartJS.register(ArcElement, Tooltip, Legend)

interface MedicineType { med_type: string; total: number }
interface ExpiringSoon { med_name: string; exp_date: string; quantity: number }

export default function StatsCards() {
  const [totalMedicine, setTotalMedicine] = useState(0)
  const [medicineTypes, setMedicineTypes] = useState<MedicineType[]>([])
  const [expiringSoon, setExpiringSoon] = useState<ExpiringSoon[]>([])
  const [dayFilter, setDayFilter] = useState<30 | 60 | 90>(30)
  const [loading, setLoading] = useState(true)
  const [showOthersPopup, setShowOthersPopup] = useState(false)
  const othersRef = useRef<HTMLDivElement>(null)
  const today = new Date()
  const typeColors = ['#16a34a','#8b5cf6','#f59e0b','#3b82f6','#ef4444','#4ade80','#ed8936']

  useEffect(() => { fetchStats() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchExpiring(dayFilter) }, [dayFilter])

  const fetchStats = async () => {
    setLoading(true)
    const { count } = await supabase
      .from('warehouse_medicines')
      .select('*', { count: 'exact', head: true })
      .eq('archived', false)
    setTotalMedicine(count || 0)

    const { data: typeData } = await supabase
      .from('warehouse_medicines')
      .select('med_type, quantity')
      .eq('archived', false)
    if (typeData) {
      const grouped: Record<string, number> = {}
      typeData.forEach(m => { grouped[m.med_type] = (grouped[m.med_type] || 0) + m.quantity })
      const types = Object.entries(grouped)
        .map(([med_type, total]) => ({ med_type, total }))
        .sort((a, b) => b.total - a.total)
      setMedicineTypes(types)
    }
    setLoading(false)
  }

  const fetchExpiring = async (days: number) => {
    const startDate = new Date()
    const endDate = new Date()
    if (days === 30) { endDate.setDate(endDate.getDate() + 30) }
    else if (days === 60) { startDate.setDate(startDate.getDate() + 31); endDate.setDate(endDate.getDate() + 60) }
    else { startDate.setDate(startDate.getDate() + 61); endDate.setDate(endDate.getDate() + 90) }

    const { data } = await supabase
      .from('warehouse_medicines')
      .select('med_name, exp_date, quantity')
      .eq('archived', false)
      .gte('exp_date', startDate.toISOString().split('T')[0])
      .lte('exp_date', endDate.toISOString().split('T')[0])
      .order('exp_date', { ascending: true })
    setExpiringSoon(data || [])
  }

  const top5 = medicineTypes.slice(0, 5)
  const others = medicineTypes.slice(5)
  const othersTotal = others.reduce((sum, t) => sum + t.total, 0)
  const displayTypes = others.length > 0
    ? [...top5, { med_type: 'Others', total: othersTotal }]
    : top5

  const stockData = {
    labels: displayTypes.map(t => t.med_type),
    datasets: [{
      data: displayTypes.map(t => t.total),
      backgroundColor: [
        ...typeColors.slice(0, top5.length),
        ...(others.length > 0 ? ['#9ca3af'] : [])
      ],
      borderWidth: 0
    }]
  }

  const donutOpts = { plugins: { legend: { display: false } }, cutout: '55%' }

  const daysLeft = (expDate: string) => {
    const diff = new Date(expDate).getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const urgencyClass = (days: number) => {
    if (days <= 7) return styles.urgencyBadgeRed
    if (days <= 30) return styles.urgencyBadgeYellow
    return styles.urgencyBadgeGreen
  }

  return (
    <div className={styles.analyticsCard}>
      <div className={styles.analyticsLabel}>Analytics</div>
      <div className={styles.analyticsGrid}>

        {/* Total Medicine */}
        <div className={styles.statCardGreen}>
          <div className={styles.statLabel}>Total Medicine</div>
          <div className={styles.statNum}>{loading ? '—' : totalMedicine}</div>
          <div className={styles.statDate}>
            {today.toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}
          </div>
        </div>

        {/* Total Monthly Stock */}
        <div className={styles.statCardLight}>
          <div className={styles.statCardLightTitle}>Total Monthly Stock</div>
          {loading ? (
            <div className={styles.emptyText}>Loading...</div>
          ) : displayTypes.length > 0 ? (
            <div className={styles.donutRow}>
              <div className={styles.donutWrap}>
                <Doughnut data={stockData} options={donutOpts} />
              </div>
              <div className={styles.donutLegend}>
                {top5.map((t, i) => (
                  <div key={i} className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ backgroundColor: typeColors[i] }} />
                    <span className={styles.legendName}>{t.med_type}</span>
                    <span className={styles.legendVal}>{t.total}</span>
                  </div>
                ))}
                {others.length > 0 && (
                  <div
                    ref={othersRef}
                    className={styles.legendOthers}
                    onMouseEnter={() => setShowOthersPopup(true)}
                    onMouseLeave={() => setShowOthersPopup(false)}>
                    <div className={styles.legendDot} style={{ backgroundColor: '#9ca3af' }} />
                    <span className={styles.legendOthersName}>Others</span>
                    <span className={styles.legendVal}>{othersTotal}</span>
                    {showOthersPopup && (
                      <div className={styles.othersPopup}>
                        <div className={styles.othersPopupTitle}>Other Types</div>
                        {others.map((t, i) => (
                          <div key={i} className={styles.othersPopupItem}>
                            <div className={styles.othersPopupItemLeft}>
                              <div
                                className={styles.legendDot}
                                style={{ backgroundColor: typeColors[(top5.length + i) % typeColors.length] }}
                              />
                              <span>{t.med_type}</span>
                            </div>
                            <span className={styles.legendVal}>{t.total}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyText}>No data yet</div>
          )}
        </div>

        {/* Expiring Soon */}
        <div className={styles.statCardLight}>
          <div className={styles.expiringHeader}>
            <span className={styles.expiringTitle}>Expiring Soon</span>
            <div className={styles.filterPills}>
              {([30, 60, 90] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDayFilter(d)}
                  className={`${styles.filterPill} ${dayFilter === d ? styles.filterPillActive : ''}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className={styles.emptyText}>Loading...</div>
          ) : expiringSoon.length > 0 ? (
            <div className={styles.expiringList}>
              {expiringSoon.map((item, i) => {
                const days = daysLeft(item.exp_date)
                return (
                  <div key={i} className={styles.expiringItem}>
                    <div className={styles.expiringItemInfo}>
                      <span className={styles.expiringItemName}>{item.med_name}</span>
                      <span className={styles.expiringItemDate}>{item.exp_date}</span>
                    </div>
                    <span className={urgencyClass(days)}>{days}d</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={styles.emptyText}>
              {dayFilter === 30
                ? 'No medicines expiring within 30 days'
                : dayFilter === 60
                ? 'No medicines expiring between 31–60 days'
                : 'No medicines expiring between 61–90 days'}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}