'use client'
import { useEffect, useState, useRef } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { supabase } from '@/lib/supabase'

ChartJS.register(ArcElement, Tooltip, Legend)

interface MedicineType {
  med_type: string
  total: number
}

interface ExpiringSoon {
  med_name: string
  exp_date: string
  quantity: number
}

export default function StatsCards() {
  const [totalMedicine, setTotalMedicine] = useState(0)
  const [medicineTypes, setMedicineTypes] = useState<MedicineType[]>([])
  const [expiringSoon, setExpiringSoon] = useState<ExpiringSoon[]>([])
  const [dayFilter, setDayFilter] = useState<30 | 60 | 90>(30)
  const [loading, setLoading] = useState(true)
  const [showOthersPopup, setShowOthersPopup] = useState(false)
  const othersRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  useEffect(() => {
    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchExpiring(dayFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayFilter])

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
      typeData.forEach(m => {
        grouped[m.med_type] = (grouped[m.med_type] || 0) + m.quantity
      })
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

    if (days === 30) {
      endDate.setDate(endDate.getDate() + 30)
    } else if (days === 60) {
      startDate.setDate(startDate.getDate() + 31)
      endDate.setDate(endDate.getDate() + 60)
    } else {
      startDate.setDate(startDate.getDate() + 61)
      endDate.setDate(endDate.getDate() + 90)
    }

    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    const { data } = await supabase
      .from('warehouse_medicines')
      .select('med_name, exp_date, quantity')
      .eq('archived', false)
      .gte('exp_date', startStr)
      .lte('exp_date', endStr)
      .order('exp_date', { ascending: true })

    setExpiringSoon(data || [])
  }

  const typeColors = ['#1a6b2f', '#8b5cf6', '#f59e0b', '#3b82f6', '#e53e3e', '#48bb78', '#ed8936']

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

  const donutOpts = {
    plugins: { legend: { display: false } },
    cutout: '55%'
  }

  const daysLeft = (expDate: string) => {
    const diff = new Date(expDate).getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const urgencyBadge = (days: number) => {
    if (days <= 7) return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    if (days <= 30) return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }

  const emptyExpiringText =
    dayFilter === 30
      ? 'No medicines expiring within 30 days'
      : dayFilter === 60
      ? 'No medicines expiring between 31–60 days'
      : 'No medicines expiring between 61–90 days'

  return (
    <div className="bg-white dark:bg-[#161d17] border border-gray-200 dark:border-[#2a3a2a] rounded-xl p-4 mb-4">
      <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-3">Analytics</p>
      <div className="grid grid-cols-3 gap-3">

        {/* Total Medicine */}
        <div className="bg-green-800 dark:bg-[#0d3d1a] rounded-xl p-4 text-white">
          <p className="text-xs opacity-75 mb-1">Total Medicine</p>
          <p className="text-4xl font-medium">{loading ? '—' : totalMedicine}</p>
          <p className="text-xs opacity-50 mt-2">
            {today.toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}
          </p>
        </div>

        {/* Total Monthly Stock */}
        <div className="bg-green-50 dark:bg-[#1a2a1a] rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-[#7a9a7a] mb-2">Total Monthly Stock</p>
          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <p className="text-xs text-gray-400">Loading...</p>
            </div>
          ) : displayTypes.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-24 h-24 flex-shrink-0">
                <Doughnut data={stockData} options={donutOpts} />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {top5.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-[#7a9a7a]">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: typeColors[i] }}></div>
                    <span className="truncate">{t.med_type}</span>
                    <span className="ml-auto font-medium flex-shrink-0">{t.total}</span>
                  </div>
                ))}
                {others.length > 0 && (
                  <div
                    ref={othersRef}
                    className="relative"
                    onMouseEnter={() => setShowOthersPopup(true)}
                    onMouseLeave={() => setShowOthersPopup(false)}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-[#7a9a7a] cursor-pointer hover:text-green-700 dark:hover:text-green-400 transition-colors">
                      <div className="w-2 h-2 rounded-sm flex-shrink-0 bg-gray-400"></div>
                      <span className="truncate underline decoration-dotted">Others</span>
                      <span className="ml-auto font-medium flex-shrink-0">{othersTotal}</span>
                    </div>
                    {showOthersPopup && (
                      <div className="absolute left-0 bottom-6 bg-white dark:bg-[#1e2e1e] border border-gray-200 dark:border-[#2a3a2a] rounded-xl shadow-xl z-50 w-48 p-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-[#7a9a7a] mb-2 uppercase tracking-wider">Other Types</p>
                        <div className="flex flex-col gap-1.5">
                          {others.map((t, i) => (
                            <div key={i} className="flex items-center justify-between text-xs text-gray-600 dark:text-[#9ab89a]">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: typeColors[(top5.length + i) % typeColors.length] }}></div>
                                <span className="truncate max-w-[100px]">{t.med_type}</span>
                              </div>
                              <span className="font-medium flex-shrink-0 ml-2">{t.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center">
              <p className="text-xs text-gray-400 dark:text-[#4a6a4a]">No data yet</p>
            </div>
          )}
        </div>

        {/* Expiring Soon */}
        <div className="bg-green-50 dark:bg-[#1a2a1a] rounded-xl p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 dark:text-[#7a9a7a]">Expiring Soon</p>
            <div className="flex gap-1">
              {([30, 60, 90] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDayFilter(d)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors font-medium
                    ${dayFilter === d
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-200 dark:bg-[#2a3a2a] text-gray-500 dark:text-[#7a9a7a] hover:bg-gray-300 dark:hover:bg-[#3a4a3a]'
                    }`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-gray-400">Loading...</p>
            </div>
          ) : expiringSoon.length > 0 ? (
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-28">
              {expiringSoon.map((item, i) => {
                const days = daysLeft(item.exp_date)
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block text-gray-700 dark:text-[#9ab89a]">
                        {item.med_name}
                      </span>
                      <span className="text-gray-400 dark:text-[#4a6a4a]">{item.exp_date}</span>
                    </div>
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs font-medium ${urgencyBadge(days)}`}>
                      {days}d
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-gray-400 dark:text-[#4a6a4a] text-center">{emptyExpiringText}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}