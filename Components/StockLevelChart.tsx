'use client'
import { useState } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const stockData = {
  Highest: {
    labels: ['Paracetamol', 'Amoxicillin', 'Vitamin C'],
    data: [120, 95, 80],
    colors: ['#1a6b2f', '#2d9e4f', '#48bb78'],
  },
  Medium: {
    labels: ['Ibuprofen', 'Mefenamic', 'Cetirizine'],
    data: [55, 45, 40],
    colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
  },
  Lowest: {
    labels: ['Insulin', 'Metformin', 'Losartan'],
    data: [10, 8, 5],
    colors: ['#e53e3e', '#f56565', '#fc8181'],
  },
}

type FilterType = 'Highest' | 'Medium' | 'Lowest'

export default function StockLevelChart() {
  const [active, setActive] = useState<FilterType>('Highest')

  const current = stockData[active]

  const chartData = {
    labels: current.labels,
    datasets: [{
      data: current.data,
      backgroundColor: current.colors,
      borderWidth: 0,
    }]
  }

  const buttonStyles: Record<FilterType, string> = {
    Highest: 'bg-green-700 text-white',
    Medium:  'bg-yellow-500 text-white',
    Lowest:  'bg-red-500 text-white',
  }

  const inactiveStyle = 'bg-gray-100 dark:bg-[#1a2a1a] text-gray-500 dark:text-[#7a9a7a]'

  return (
    <div className="bg-white dark:bg-[#161d17] border border-gray-200 dark:border-[#2a3a2a] rounded-xl p-4">
      <p className="text-green-800 dark:text-[#7aba7a] font-medium text-sm mb-3 text-center">
        Stock Levels
      </p>

      <div className="flex justify-center gap-2 mb-3">
        {(['Highest', 'Medium', 'Lowest'] as FilterType[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setActive(filter)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors
              ${active === filter ? buttonStyles[filter] : inactiveStyle}`}>
            {filter}
          </button>
        ))}
      </div>

      <div className="h-36">
        <Doughnut
          data={chartData}
          options={{ plugins: { legend: { display: false } }, cutout: '60%' }}
        />
      </div>

      <div className="flex flex-col gap-1 mt-3">
        {current.labels.map((label, i) => (
          <div key={label} className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#7a9a7a]">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: current.colors[i] }}></div>
            {label}
            <span className="ml-auto font-medium">{current.data[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}