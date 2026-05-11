'use client'
import { useState, useEffect } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { supabase } from '@/lib/supabase'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Medicine {
  med_name: string
  quantity: number
}

type FilterType = 'Highest' | 'Medium' | 'Lowest'

export default function StockLevelChart() {
  const [active, setActive] = useState<FilterType>('Highest')
  const [highest, setHighest] = useState<Medicine[]>([])
  const [medium, setMedium] = useState<Medicine[]>([])
  const [lowest, setLowest] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStockLevels()
  }, [])

  const fetchStockLevels = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('warehouse_medicines')
      .select('med_name, quantity')
      .eq('archived', false)
      .order('quantity', { ascending: false })

    if (data && data.length > 0) {
      const total = data.length
      const highCount = Math.ceil(total / 3)
      const midCount = Math.ceil(total / 3)
      setHighest(data.slice(0, highCount))
      setMedium(data.slice(highCount, highCount + midCount))
      setLowest(data.slice(highCount + midCount))
    }
    setLoading(false)
  }

  const getColors = (filter: FilterType) => {
    if (filter === 'Highest') return ['#1a6b2f', '#2d9e4f', '#48bb78', '#68d391', '#9ae6b4']
    if (filter === 'Medium') return ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7']
    return ['#e53e3e', '#f56565', '#fc8181', '#feb2b2', '#fed7d7']
  }

  const getCurrentData = () => {
    if (active === 'Highest') return highest
    if (active === 'Medium') return medium
    return lowest
  }

  const current = getCurrentData()
  const colors = getColors(active)

  const chartData = {
    labels: current.map(m => m.med_name),
    datasets: [{
      data: current.map(m => m.quantity || 1),
      backgroundColor: colors.slice(0, current.length),
      borderWidth: 0
    }]
  }

  const buttonStyles: Record<FilterType, string> = {
    Highest: 'bg-green-700 text-white',
    Medium: 'bg-yellow-500 text-white',
    Lowest: 'bg-red-500 text-white',
  }

  const inactiveStyle = 'bg-gray-100 dark:bg-[#1a2a1a] text-gray-500 dark:text-[#7a9a7a]'

  return (
    <div className="bg-white dark:bg-[#161d17] border border-gray-200 dark:border-[#2a3a2a] rounded-xl p-4">
      <p className="text-green-800 dark:text-[#7aba7a] font-medium text-sm mb-3 text-center">Stock Levels</p>

      <div className="flex justify-center gap-2 mb-4">
        {(['Highest', 'Medium', 'Lowest'] as FilterType[]).map(filter => (
          <button
            key={filter}
            onClick={() => setActive(filter)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors
              ${active === filter ? buttonStyles[filter] : inactiveStyle}`}>
            {filter}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-xs text-gray-400 dark:text-[#4a6a4a]">Loading...</p>
        </div>
      ) : current.length > 0 ? (
        <div className="flex items-center gap-4">
          <div className="w-48 h-48 flex-shrink-0">
            <Doughnut
              data={chartData}
              options={{
                plugins: { legend: { display: false } },
                cutout: '55%'
              }}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {current.map((med, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-[#7a9a7a]">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: colors[i] }}></div>
                <span className="flex-1 truncate font-medium">{med.med_name}</span>
                <span className="font-medium flex-shrink-0">{med.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center">
          <p className="text-xs text-gray-400 dark:text-[#4a6a4a]">No medicines added yet</p>
        </div>
      )}
    </div>
  )
}