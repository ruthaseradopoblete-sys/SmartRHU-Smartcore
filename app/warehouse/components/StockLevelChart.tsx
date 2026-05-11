'use client'
import { useState, useEffect } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { supabase } from '@/Lib/supabase'
import styles from './warehouse.module.css'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Medicine { med_name: string; quantity: number }
type FilterType = 'Highest' | 'Medium' | 'Lowest'

export default function StockLevelChart() {
  const [active, setActive] = useState<FilterType>('Highest')
  const [highest, setHighest] = useState<Medicine[]>([])
  const [medium, setMedium] = useState<Medicine[]>([])
  const [lowest, setLowest] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStockLevels() }, [])

  const fetchStockLevels = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('warehouse_medicines')
      .select('med_name, quantity')
      .eq('archived', false)
      .order('quantity', { ascending: false })

    if (data && data.length > 0) {
      const n = data.length
      const h = Math.ceil(n / 3)
      const m = Math.ceil(n / 3)
      setHighest(data.slice(0, h))
      setMedium(data.slice(h, h + m))
      setLowest(data.slice(h + m))
    }
    setLoading(false)
  }

  const getColors = (f: FilterType) => {
    if (f === 'Highest') return ['#16a34a','#2d9e4f','#48bb78','#68d391','#9ae6b4']
    if (f === 'Medium')  return ['#f59e0b','#fbbf24','#fcd34d','#fde68a','#fef3c7']
    return ['#ef4444','#f56565','#fc8181','#fca5a5','#fecaca']
  }

  const current = active === 'Highest' ? highest : active === 'Medium' ? medium : lowest
  const colors = getColors(active)

  const chartData = {
    labels: current.map(m => m.med_name),
    datasets: [{
      data: current.map(m => m.quantity || 1),
      backgroundColor: colors.slice(0, current.length),
      borderWidth: 0
    }]
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Stock Levels</div>
      <div className={styles.cardBody}>
        <div className={styles.filterRow}>
          {(['Highest','Medium','Lowest'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`${styles.filterBtn} ${
                active === f
                  ? f === 'Highest' ? styles.filterBtnHighest
                    : f === 'Medium' ? styles.filterBtnMedium
                    : styles.filterBtnLowest
                  : ''
              }`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading...</div>
        ) : current.length > 0 ? (
          <div className={styles.stockRow2}>
            <div className={styles.stockChartWrap}>
              <Doughnut
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  cutout: '55%'
                }}
              />
            </div>
            <div className={styles.stockList}>
              {current.map((med, i) => (
                <div key={i} className={styles.stockItem}>
                  <div className={styles.stockDot} style={{ backgroundColor: colors[i] }} />
                  <span className={styles.stockName}>{med.med_name}</span>
                  <span className={styles.stockQty}>{med.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>No medicines added yet</div>
        )}
      </div>
    </div>
  )
}