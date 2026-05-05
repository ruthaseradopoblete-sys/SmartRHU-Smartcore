import Sidebar from '@/Components/Sidebar'
import Topbar from '@/Components/Topbar'
import StatsCards from '@/Components/StatsCards'
import StockLevelChart from '@/Components/StockLevelChart'

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f1410]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="p-5 overflow-y-auto bg-gray-50 dark:bg-[#0f1410]">
          <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-1">Warehouse</p>
          <h1 className="text-2xl font-medium text-green-800 dark:text-[#7aba7a] mb-4">Dashboard</h1>
          <StatsCards />
          <div className="mt-4">
            <StockLevelChart />
          </div>
        </main>
      </div>
    </div>
  )
}