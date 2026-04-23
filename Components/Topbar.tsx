'use client'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Bell, Moon, Sun, Search, X } from 'lucide-react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface RestockRequest {
  id: number
  pharmacist: string
  medicineName: string
  dosage: string
  type: string
  quantity: number
  dateTime: string
}

interface MedicineStock {
  name: string
  dosage: string
  currentStock: number
  level: 'Highest' | 'Medium' | 'Lowest'
}

const mockRequests: RestockRequest[] = [
  { id: 1, pharmacist: 'Juan Dela Cruz', medicineName: 'Paracetamol', dosage: '500mg', type: 'Tablet', quantity: 100, dateTime: '2026-04-19 08:30 AM' },
  { id: 2, pharmacist: 'Maria Santos', medicineName: 'Amoxicillin', dosage: '250mg', type: 'Capsule', quantity: 50, dateTime: '2026-04-19 09:15 AM' },
  { id: 3, pharmacist: 'Pedro Reyes', medicineName: 'Ibuprofen', dosage: '200mg', type: 'Tablet', quantity: 75, dateTime: '2026-04-19 10:00 AM' },
]

const allMedicines: MedicineStock[] = [
  { name: 'Paracetamol', dosage: '500mg', currentStock: 120, level: 'Highest' },
  { name: 'Amoxicillin', dosage: '250mg', currentStock: 95, level: 'Highest' },
  { name: 'Vitamin C', dosage: '100mg', currentStock: 80, level: 'Highest' },
  { name: 'Ibuprofen', dosage: '200mg', currentStock: 55, level: 'Medium' },
  { name: 'Mefenamic Acid', dosage: '500mg', currentStock: 45, level: 'Medium' },
  { name: 'Cetirizine', dosage: '10mg', currentStock: 40, level: 'Medium' },
  { name: 'Insulin', dosage: '100IU', currentStock: 10, level: 'Lowest' },
  { name: 'Metformin', dosage: '500mg', currentStock: 8, level: 'Lowest' },
  { name: 'Losartan', dosage: '50mg', currentStock: 5, level: 'Lowest' },
]

const stockData = {
  Highest: { labels: ['Paracetamol', 'Amoxicillin', 'Vitamin C'], data: [120, 95, 80], colors: ['#1a6b2f', '#2d9e4f', '#48bb78'] },
  Medium: { labels: ['Ibuprofen', 'Mefenamic', 'Cetirizine'], data: [55, 45, 40], colors: ['#f59e0b', '#fbbf24', '#fcd34d'] },
  Lowest: { labels: ['Insulin', 'Metformin', 'Losartan'], data: [10, 8, 5], colors: ['#e53e3e', '#f56565', '#fc8181'] },
}

type FilterType = 'Highest' | 'Medium' | 'Lowest'

export default function Topbar() {
  const [showNotif, setShowNotif] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RestockRequest | null>(null)
  const [stockFilter, setStockFilter] = useState<FilterType>('Highest')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'alert' | 'confirm'>('confirm')
  const [showProfile, setShowProfile] = useState(false)
  const [userName, setUserName] = useState('Name')
  const [userRole, setUserRole] = useState('Member')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const name = localStorage.getItem('userName') || 'Name'
    const role = localStorage.getItem('userRole') || 'member'
    setUserName(name)
    setUserRole(role === 'admin' ? 'Administrator' : 'Member')
  }, [])

  const showToastMsg = (msg: string, type: 'alert' | 'confirm') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3000)
  }

  const current = stockData[stockFilter]
  const chartData = {
    labels: current.labels,
    datasets: [{ data: current.data, backgroundColor: current.colors, borderWidth: 0 }]
  }

  const filteredMedicines = allMedicines.filter(m =>
    search.trim() === ''
      ? m.level === stockFilter
      : m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.dosage.toLowerCase().includes(search.toLowerCase())
  )

  const stockBadgeColor = (level: string) => {
    if (level === 'Highest') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (level === 'Medium') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  const stockBarColor = (level: string) => {
    if (level === 'Highest') return 'bg-green-500'
    if (level === 'Medium') return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const maxStock = Math.max(...allMedicines.map(m => m.currentStock))
  const initials = userName.slice(0, 2).toUpperCase()

  if (!mounted) return (
    <div className="bg-green-800 dark:bg-[#0d3d1a] px-5 py-2 flex items-center gap-3">
      <input type="text" placeholder="Search" className="bg-white/20 text-white placeholder-white/60 text-sm rounded-full px-4 py-1.5 outline-none w-60" />
    </div>
  )

  return (
    <>
      <div className="bg-green-800 dark:bg-[#0d3d1a] px-5 py-2 flex items-center gap-3 relative z-20">
        <input
          type="text"
          placeholder="Search"
          className="bg-white/20 text-white placeholder-white/60 text-sm rounded-full px-4 py-1.5 outline-none w-60"
        />
        <div className="ml-auto flex items-center gap-3">

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotif(!showNotif); setSelectedRequest(null) }}
              className="text-white/80 hover:text-white transition-colors relative">
              <Bell size={18} />
              {mockRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {showNotif && !selectedRequest && (
              <div className="absolute right-0 top-9 bg-white dark:bg-[#1e2e1e] border border-gray-200 dark:border-[#2a3a2a] rounded-xl shadow-lg z-30 w-64 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2a3a2a]">
                  <p className="text-sm font-medium text-gray-800 dark:text-[#c0d8c0]">Notifications</p>
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{mockRequests.length}</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {mockRequests.map(req => (
                    <button
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-[#2a3a2a] hover:bg-green-50 dark:hover:bg-[#1e301e] transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-800 dark:text-[#c0d8c0]">Restock Request</p>
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Urgent</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-[#7a9a7a]">{req.medicineName} — {req.pharmacist}</p>
                      <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mt-0.5">{req.dateTime}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-white/80 hover:text-white transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Profile Button */}
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-medium">
              {initials}
            </div>
            <span className="text-white text-sm font-medium">{userName}</span>
          </button>

          {/* Profile Panel */}
          {showProfile && (
            <div className="absolute right-4 top-12 bg-white dark:bg-[#1e2e1e] border border-gray-200 dark:border-[#2a3a2a] rounded-xl shadow-lg z-30 w-56 overflow-hidden">
              <div className="bg-green-700 dark:bg-[#0d3d1a] p-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-xl font-medium mb-2">
                  {initials}
                </div>
                <p className="text-white text-sm font-medium">Hi, {userName}!</p>
                <p className="text-white/60 text-xs">{userRole}</p>
              </div>
              <div className="p-3 flex flex-col gap-1">
                <div className="flex justify-between text-xs py-1.5 px-2">
                  <span className="text-gray-400 dark:text-[#4a6a4a]">Username</span>
                  <span className="text-gray-700 dark:text-[#9ab89a] font-medium">{userName}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 px-2">
                  <span className="text-gray-400 dark:text-[#4a6a4a]">Role</span>
                  <span className="text-gray-700 dark:text-[#9ab89a] font-medium">{userRole}</span>
                </div>
                <button
                  onClick={() => setShowProfile(false)}
                  className="mt-2 w-full py-1.5 text-xs text-gray-500 dark:text-[#7a9a7a] hover:bg-gray-50 dark:hover:bg-[#1e301e] rounded-lg transition-colors">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restock Request Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-[#161d17] rounded-2xl shadow-xl w-[720px] max-h-[90vh] border border-gray-200 dark:border-[#2a3a2a] flex overflow-hidden">

            <div className="w-56 flex-shrink-0 p-6 border-r border-gray-100 dark:border-[#2a3a2a] flex flex-col">
              <h2 className="text-base font-medium text-gray-800 dark:text-[#c0d8c0] mb-5 text-center">Requested Medicine</h2>
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Requested by: (Name of the Pharmacist)</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.pharmacist}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Medicine Name:</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.medicineName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Mg/Dosage:</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.dosage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Medicine Type:</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Quantity:</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.quantity}</p>
                </div>
                <div className="mt-auto">
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Date and Time</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.dateTime}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              <div className="bg-green-800 dark:bg-[#0d3d1a] rounded-xl px-4 py-2.5 mb-4 text-center">
                <h3 className="text-sm font-medium text-white uppercase tracking-wide">Stock Levels</h3>
              </div>

              <div className="h-40 mb-3">
                <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '60%' }} />
              </div>

              <div className="flex justify-center gap-2 mb-4">
                {(['Highest', 'Medium', 'Lowest'] as FilterType[]).map(f => (
                  <button key={f} onClick={() => { setStockFilter(f); setSearch('') }}
                    className={`text-xs px-4 py-1.5 rounded-full font-medium transition-colors
                      ${stockFilter === f
                        ? f === 'Highest' ? 'bg-green-700 text-white' : f === 'Medium' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-[#1a2a1a] text-gray-500 dark:text-[#7a9a7a] hover:bg-gray-200 dark:hover:bg-[#1e2e1e]'}`}>
                    {f}
                  </button>
                ))}
              </div>

              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search medicine name or dosage..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full border border-gray-200 dark:border-[#2a3a2a] rounded-full pl-8 pr-4 py-1.5 text-xs outline-none bg-white dark:bg-[#0f1410] text-gray-700 dark:text-[#9ab89a] focus:border-green-600 transition-colors" />
              </div>

              <div className="flex-1 overflow-y-auto mb-4">
                <div className="grid grid-cols-3 text-xs text-gray-400 dark:text-[#4a6a4a] px-3 pb-1 font-medium uppercase tracking-wider">
                  <span>Medicine</span>
                  <span className="text-center">Mg/Dosage</span>
                  <span className="text-right">Current Stock</span>
                </div>
                {filteredMedicines.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {filteredMedicines.map((med, i) => (
                      <div key={i} className="grid grid-cols-3 items-center px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#1a2a1a] hover:bg-green-50 dark:hover:bg-[#1e301e] transition-colors">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${med.level === 'Highest' ? 'bg-green-500' : med.level === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                          <span className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{med.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-[#7a9a7a] text-center">{med.dosage}</span>
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-[#2a3a2a] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${stockBarColor(med.level)}`} style={{ width: `${(med.currentStock / maxStock) * 100}%` }}></div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stockBadgeColor(med.level)}`}>{med.currentStock}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-400 dark:text-[#4a6a4a]">No medicines found</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setSelectedRequest(null); setShowNotif(false); setSearch('') }}
                  className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors">
                  CANCEL
                </button>
                <button onClick={() => showToastMsg('Alert message has been sent!', 'alert')}
                  className="flex-1 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-white text-xs font-medium transition-colors">
                  Send Alert Message
                </button>
                <button onClick={() => showToastMsg('Confirmation message has been sent!', 'confirm')}
                  className="flex-1 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-medium transition-colors">
                  Send Confirmation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm px-6 py-3 rounded-full shadow-lg z-50 transition-all ${toastType === 'alert' ? 'bg-yellow-500' : 'bg-green-700'}`}>
          ✓ {toast}
        </div>
      )}
    </>
  )
}