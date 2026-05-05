'use client'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Bell, Moon, Sun, Search, X } from 'lucide-react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { supabase } from '@/Lib/supabase'

ChartJS.register(ArcElement, Tooltip, Legend)

interface RestockRequest {
  id: number
  pharmacist_name: string
  medicine_name: string
  dosage: string
  medicine_type: string
  quantity: number
  created_at: string
}

interface MedicineStock {
  name: string
  dosage: string
  currentStock: number
  level: 'Highest' | 'Medium' | 'Lowest'
}

interface Medicine {
  id: string
  med_name: string
  med_dosage: string
  med_type: string
  exp_date: string
  quantity: number
}

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
  const [notifSearch, setNotifSearch] = useState('')
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'alert' | 'confirm'>('confirm')
  const [showProfile, setShowProfile] = useState(false)
  const [userName, setUserName] = useState('Name')
  const [userRole, setUserRole] = useState('Member')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [requests, setRequests] = useState<RestockRequest[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Medicine[]>([])
  const [showSearchDrop, setShowSearchDrop] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '', dosage: '', type: '', expDate: '', quantity: '', unit: ''
  })
  const [addToast, setAddToast] = useState('')

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const name = localStorage.getItem('userName') || 'Name'
    const role = localStorage.getItem('userRole') || 'member'
    const avatar = localStorage.getItem('userAvatar') || null
    setUserName(name)
    setUserRole(role === 'admin' ? 'Administrator' : 'Member')
    setUserAvatar(avatar)
    fetchRequests()

    const handleProfileUpdate = () => {
      setUserName(localStorage.getItem('userName') || 'Name')
    }
    const handleAvatarUpdate = () => {
      setUserAvatar(localStorage.getItem('userAvatar') || null)
    }

    window.addEventListener('profileUpdated', handleProfileUpdate)
    window.addEventListener('avatarUpdated', handleAvatarUpdate)
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
      window.removeEventListener('avatarUpdated', handleAvatarUpdate)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDrop(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('restock_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length < 1) {
      setSearchResults([])
      setShowSearchDrop(false)
      return
    }
    setSearchLoading(true)
    setShowSearchDrop(true)

    const { data } = await supabase
      .from('warehouse_medicines')
      .select('*')
      .ilike('med_name', `%${query}%`)
      .eq('archived', false)
      .limit(6)

    setSearchResults(data || [])
    setSearchLoading(false)
  }

  const handleSelectMedicine = (med: Medicine) => {
    setSearchQuery(med.med_name)
    setShowSearchDrop(false)
  }

  const handleAddFromSearch = () => {
    setAddForm({ ...addForm, name: searchQuery })
    setShowSearchDrop(false)
    setShowAddModal(true)
  }

  const handleAddMedicine = async () => {
    if (!addForm.name || !addForm.dosage || !addForm.type || !addForm.expDate || !addForm.quantity) {
      setAddToast('Please fill in all fields.')
      setTimeout(() => setAddToast(''), 3000)
      return
    }

    const { error } = await supabase
      .from('warehouse_medicines')
      .insert({
        med_name: addForm.name,
        med_dosage: addForm.dosage,
        med_type: addForm.type,
        exp_date: addForm.expDate,
        quantity: Number(addForm.quantity),
        unit: addForm.unit,
        archived: false,
      })

    if (error) {
      setAddToast('Error adding medicine!')
      setTimeout(() => setAddToast(''), 3000)
      return
    }

    setAddForm({ name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '' })
    setShowAddModal(false)
    setSearchQuery('')
    showToastMsg('Medicine added successfully!', 'confirm')
  }

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

  const filteredRequests = requests.filter(r =>
    notifSearch.trim() === ''
      ? true
      : r.medicine_name.toLowerCase().includes(notifSearch.toLowerCase()) ||
        r.pharmacist_name.toLowerCase().includes(notifSearch.toLowerCase())
  )

  const initials = userName.slice(0, 2).toUpperCase()

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (!mounted) return (
    <div className="bg-green-800 dark:bg-[#0d3d1a] px-5 py-2 flex items-center gap-3">
      <input type="text" placeholder="Search medicine..." className="bg-white/20 text-white placeholder-white/60 text-sm rounded-full px-4 py-1.5 outline-none w-60" />
    </div>
  )

  return (
    <>
      <div className="bg-green-800 dark:bg-[#0d3d1a] px-5 py-2 flex items-center gap-3 relative z-20">

        {/* Search Bar */}
        <div className="relative" ref={searchRef}>
          <div className="flex items-center bg-white/20 rounded-full px-3 py-1.5 w-72">
            <Search size={14} className="text-white/60 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchQuery.length > 0 && setShowSearchDrop(true)}
              placeholder="Search medicine..."
              className="bg-transparent text-white placeholder-white/60 text-sm outline-none flex-1"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowSearchDrop(false); setSearchResults([]) }}>
                <X size={14} className="text-white/60 hover:text-white" />
              </button>
            )}
          </div>

          {showSearchDrop && (
            <div className="absolute top-10 left-0 bg-white dark:bg-[#1e2e1e] border border-gray-200 dark:border-[#2a3a2a] rounded-xl shadow-lg z-30 w-80 overflow-hidden">
              {searchLoading ? (
                <div className="px-4 py-3 text-xs text-gray-400 dark:text-[#4a6a4a]">Searching...</div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="px-3 pt-3 pb-1 text-xs text-gray-400 dark:text-[#4a6a4a] font-medium uppercase tracking-wider">Results</div>
                  {searchResults.map(med => (
                    <button key={med.id} onClick={() => handleSelectMedicine(med)}
                      className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-green-50 dark:hover:bg-[#1e301e] transition-colors text-left">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-[#9ab89a]">{med.med_name}</p>
                        <p className="text-xs text-gray-400 dark:text-[#4a6a4a]">{med.med_dosage} · {med.med_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400">{med.quantity} pcs</p>
                        <p className="text-xs text-gray-400 dark:text-[#4a6a4a]">Exp: {med.exp_date}</p>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-gray-100 dark:border-[#2a3a2a]">
                    <button onClick={handleAddFromSearch}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-[#1e301e] transition-colors text-sm font-medium">
                      <span className="text-lg leading-none">+</span>
                      Add "{searchQuery}" as new medicine
                    </button>
                  </div>
                </>
              ) : (
                <div className="overflow-hidden">
                  <div className="px-4 py-3 text-xs text-gray-400 dark:text-[#4a6a4a]">No medicine found for "{searchQuery}"</div>
                  <div className="border-t border-gray-100 dark:border-[#2a3a2a]">
                    <button onClick={handleAddFromSearch}
                      className="flex items-center gap-2 w-full px-4 py-3 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-[#1e301e] transition-colors text-sm font-medium">
                      <span className="text-lg leading-none">+</span>
                      Add "{searchQuery}" as new medicine
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotif(!showNotif); setSelectedRequest(null) }}
              className="text-white/80 hover:text-white transition-colors relative">
              <Bell size={18} />
              {requests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {showNotif && !selectedRequest && (
              <div className="absolute right-0 top-9 bg-white dark:bg-[#1e2e1e] border border-gray-200 dark:border-[#2a3a2a] rounded-xl shadow-lg z-30 w-64 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2a3a2a]">
                  <p className="text-sm font-medium text-gray-800 dark:text-[#c0d8c0]">Notifications</p>
                  {requests.length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {requests.length > 0 ? requests.map(req => (
                    <button key={req.id} onClick={() => setSelectedRequest(req)}
                      className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-[#2a3a2a] hover:bg-green-50 dark:hover:bg-[#1e301e] transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-800 dark:text-[#c0d8c0]">Restock Request</p>
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Urgent</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-[#7a9a7a]">{req.medicine_name} — {req.pharmacist_name}</p>
                      <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mt-0.5">{formatDate(req.created_at)}</p>
                    </button>
                  )) : (
                    <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-[#4a6a4a]">No pending requests</div>
                  )}
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
            className="flex items-center gap-2 hover:opacity-80 transition-opacity relative">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
              {userAvatar
                ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <span className="text-white text-sm font-medium">{userName}</span>
          </button>

          {/* Profile Panel */}
          {showProfile && (
            <div className="absolute right-4 top-12 bg-white dark:bg-[#1e2e1e] border border-gray-200 dark:border-[#2a3a2a] rounded-xl shadow-lg z-30 w-56 overflow-hidden">
              <div className="bg-green-700 dark:bg-[#0d3d1a] p-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-xl font-medium mb-2 overflow-hidden">
                  {userAvatar
                    ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
                    : initials
                  }
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
                <button onClick={() => setShowProfile(false)}
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
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Requested by:</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.pharmacist_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Medicine Name:</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.medicine_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Mg/Dosage:</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.dosage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Medicine Type:</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.medicine_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Quantity:</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{selectedRequest.quantity}</p>
                </div>
                <div className="mt-auto">
                  <p className="text-xs text-gray-400 dark:text-[#4a6a4a] mb-0.5">Date and Time</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{formatDate(selectedRequest.created_at)}</p>
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
                  <button key={f} onClick={() => { setStockFilter(f); setNotifSearch('') }}
                    className={`text-xs px-4 py-1.5 rounded-full font-medium transition-colors
                      ${stockFilter === f
                        ? f === 'Highest' ? 'bg-green-700 text-white' : f === 'Medium' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-[#1a2a1a] text-gray-500 dark:text-[#7a9a7a]'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search medicine name or dosage..." value={notifSearch}
                  onChange={e => setNotifSearch(e.target.value)}
                  className="w-full border border-gray-200 dark:border-[#2a3a2a] rounded-full pl-8 pr-4 py-1.5 text-xs outline-none bg-white dark:bg-[#0f1410] text-gray-700 dark:text-[#9ab89a] focus:border-green-600 transition-colors" />
              </div>
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="grid grid-cols-3 text-xs text-gray-400 dark:text-[#4a6a4a] px-3 pb-1 font-medium uppercase tracking-wider">
                  <span>Medicine</span>
                  <span className="text-center">Mg/Dosage</span>
                  <span className="text-right">Current Stock</span>
                </div>
                {filteredRequests.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {filteredRequests.map((req, i) => (
                      <div key={i} className="grid grid-cols-3 items-center px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#1a2a1a]">
                        <span className="text-xs font-medium text-gray-700 dark:text-[#9ab89a]">{req.medicine_name}</span>
                        <span className="text-xs text-gray-500 dark:text-[#7a9a7a] text-center">{req.dosage}</span>
                        <span className="text-xs font-medium text-right text-gray-700 dark:text-[#9ab89a]">{req.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-400 dark:text-[#4a6a4a]">No requests found</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedRequest(null); setShowNotif(false); setNotifSearch('') }}
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

      {/* Add Medicine Modal from Search */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#161d17] rounded-2xl shadow-xl p-8 w-[420px] border border-gray-200 dark:border-[#2a3a2a]">
            <h2 className="text-xl font-medium text-gray-800 dark:text-[#c0d8c0] mb-6">Add Medicine</h2>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Medicine Name', key: 'name', type: 'text' },
                { label: 'Mg/Dosage', key: 'dosage', type: 'text' },
                { label: 'Medicine Type', key: 'type', type: 'text' },
                { label: 'EXP Date', key: 'expDate', type: 'date' },
                { label: 'Quantity', key: 'quantity', type: 'number' },
                { label: 'Unit', key: 'unit', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key} className="flex items-center gap-4">
                  <label className="text-sm text-gray-600 dark:text-[#9ab89a] w-36 flex-shrink-0">{label}:</label>
                  <input
                    type={type}
                    value={addForm[key as keyof typeof addForm]}
                    onChange={e => setAddForm({ ...addForm, [key]: e.target.value })}
                    className="flex-1 border border-gray-300 dark:border-[#2a3a2a] rounded-lg px-3 py-1.5 text-sm outline-none bg-white dark:bg-[#0f1410] text-gray-700 dark:text-[#9ab89a] focus:border-green-600 transition-colors"
                  />
                </div>
              ))}
            </div>
            {addToast && (
              <p className="text-xs text-red-500 text-center mt-3">{addToast}</p>
            )}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowAddModal(false); setAddForm({ name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '' }) }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">
                CANCEL
              </button>
              <button onClick={handleAddMedicine}
                className="flex-1 py-2.5 rounded-xl border-2 border-green-700 text-green-700 dark:text-green-400 dark:border-green-600 text-sm font-medium hover:bg-green-50 dark:hover:bg-[#1e2e1e] transition-colors">
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm px-6 py-3 rounded-full shadow-lg z-50 ${toastType === 'alert' ? 'bg-yellow-500' : 'bg-green-700'}`}>
          ✓ {toast}
        </div>
      )}
    </>
  )
}