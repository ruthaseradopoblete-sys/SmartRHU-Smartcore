'use client'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function StatsCards() {
  const donutOpts = { plugins: { legend: { display: false } }, cutout: '68%' }

  const stockData = {
    labels: ['Paracetamol', 'Amoxicillin', 'Other'],
    datasets: [{ data: [45, 30, 25], backgroundColor: ['#1a6b2f','#8b5cf6','#f59e0b'], borderWidth: 0 }]
  }
  const outflowData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{ data: [30, 25, 25, 20], backgroundColor: ['#1a6b2f','#8b5cf6','#f59e0b','#3b82f6'], borderWidth: 0 }]
  }

  return (
    <div className="bg-white dark:bg-[#161d17] border border-gray-200 dark:border-[#2a3a2a] rounded-xl p-4 mb-4">
      <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-3">Analytics</p>
      <div className="grid grid-cols-3 gap-3">

        <div className="bg-green-800 dark:bg-[#0d3d1a] rounded-xl p-4 text-white">
          <p className="text-xs opacity-75 mb-1">Total Medicine</p>
          <p className="text-4xl font-medium">24</p>
          <p className="text-xs opacity-50 mt-6">Day, 19/04/2026</p>
        </div>

        <div className="bg-green-50 dark:bg-[#1a2a1a] rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-[#7a9a7a] mb-2">Total Monthly Stock</p>
          <div className="h-20"><Doughnut data={stockData} options={donutOpts} /></div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {['#1a6b2f','#8b5cf6','#f59e0b'].map((c, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-gray-500 dark:text-[#7a9a7a]">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: c }}></div>
                {['Paracetamol','Amoxicillin','Other'][i]}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-50 dark:bg-[#1a2a1a] rounded-xl p-3">
          <p className="text-xs text-gray-500 dark:text-[#7a9a7a] mb-2">Monthly Medicine Outflow</p>
          <div className="h-20"><Doughnut data={outflowData} options={donutOpts} /></div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {['#1a6b2f','#8b5cf6','#f59e0b','#3b82f6'].map((c, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-gray-500 dark:text-[#7a9a7a]">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: c }}></div>
                {['Wk1','Wk2','Wk3','Wk4'][i]}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}