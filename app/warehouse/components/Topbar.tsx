'use client'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Bell, Moon, Sun, Search, X } from 'lucide-react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { supabase } from '@/lib/supabase'
import styles from './warehouse.module.css'

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

interface Medicine {
  id: string
  med_name: string
  med_dosage: string
  med_type: string
  exp_date: string
  quantity: number
}

const stockData = {
  Highest: { labels: ['Paracetamol','Amoxicillin','Vitamin C'], data: [120,95,80], colors: ['#16a34a','#2d9e4f','#4ade80'] },
  Medium:  { labels: ['Ibuprofen','Mefenamic','Cetirizine'],   data: [55,45,40],   colors: ['#f59e0b','#fbbf24','#fcd34d'] },
  Lowest:  { labels: ['Insulin','Metformin','Losartan'],        data: [10,8,5],     colors: ['#ef4444','#f56565','#fc8181'] },
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '', dosage: '', type: '', expDate: '', quantity: '', unit: ''
  })
  const [addToast, setAddToast] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  
 useEffect(() => {
  setMounted(true)
  fetchRequests()

  // Read from AuthContext's localStorage key
  const stored = localStorage.getItem('smartrhu_user')
  if (stored) {
    try {
      const user = JSON.parse(stored)
      setUserName(user.name || 'Name')
      setUserRole(user.role === 'admin' ? 'Administrator' : user.role.charAt(0).toUpperCase() + user.role.slice(1))
    } catch {}
  }

  // Fetch avatar from database
  const stored2 = localStorage.getItem('smartrhu_user')
  if (stored2) {
    try {
      const user = JSON.parse(stored2)
      if (user.id) {
        supabase
          .from('users')
          .select('avatar_url')
          .eq('user_id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.avatar_url) {
              setUserAvatar(data.avatar_url)
            }
          })
      }
    } catch {}
  }

  const handleProfileUpdate = () => {
    const stored = localStorage.getItem('smartrhu_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        setUserName(user.name || 'Name')
      } catch {}
    }
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
  const handler = (e: MouseEvent) => {
    if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
      setShowSearchDrop(false)
      setSearchQuery('')       
      setSearchResults([])      
    }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
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
    if (!query.trim()) { setSearchResults([]); setShowSearchDrop(false); return }
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

  const showToastMsg = (msg: string, type: 'alert' | 'confirm') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3000)
  }

  const handleAddMedicine = async () => {
    if (!addForm.name || !addForm.dosage || !addForm.type || !addForm.expDate || !addForm.quantity) {
      setAddToast('Please fill in all fields.')
      setTimeout(() => setAddToast(''), 3000)
      return
    }
    const { error } = await supabase.from('warehouse_medicines').insert({
      med_name: addForm.name,
      med_dosage: addForm.dosage,
      med_type: addForm.type,
      exp_date: addForm.expDate,
      quantity: Number(addForm.quantity),
      unit: addForm.unit,
      archived: false,
    })
    if (!error) {
      setShowAddModal(false)
      setAddForm({ name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '' })
      setSearchQuery('')
      showToastMsg('Medicine added successfully!', 'confirm')
    } else {
      setAddToast('Error adding medicine!')
      setTimeout(() => setAddToast(''), 3000)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const initials = userName.slice(0, 2).toUpperCase()
  const current = stockData[stockFilter]
  const chartData = {
    labels: current.labels,
    datasets: [{ data: current.data, backgroundColor: current.colors, borderWidth: 0 }]
  }

  const filteredRequests = requests.filter(r =>
    notifSearch.trim() === '' ? true :
    r.medicine_name.toLowerCase().includes(notifSearch.toLowerCase()) ||
    r.pharmacist_name.toLowerCase().includes(notifSearch.toLowerCase())
  )

 if (!mounted) return (
  <div className={styles.topbar}>
    <div className={styles.searchWrap}>
      <div className={styles.searchInner}>
        <Search size={14} className={styles.searchIco} />
        <input className={styles.searchInput} placeholder="Search medicine..." value="" readOnly />
      </div>
    </div>
  </div>
)

  return (
    <>
      <div className={styles.topbar}>

        {/* Search */}
        <div className={styles.searchWrap} ref={searchRef}>
          <div className={styles.searchInner}>
            <Search size={14} className={styles.searchIco} />
           <input
  className={styles.searchInput}
  placeholder="Search medicine..."
  value={searchQuery}
  onChange={e => handleSearch(e.target.value)}
  onFocus={() => searchQuery && setShowSearchDrop(true)}
  onKeyDown={e => e.stopPropagation()}
  onBlur={() => setTimeout(() => setShowSearchDrop(false), 150)}
  autoComplete="off"
  autoFocus={false}
/>
            {searchQuery && (
              <button
                className={styles.searchClear}
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDrop(false) }}>
                <X size={14} />
              </button>
            )}
          </div>

          {showSearchDrop && (
            <div className={styles.searchDrop}>
              {searchLoading ? (
                <div className={styles.searchDropEmpty}>Searching...</div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className={styles.searchDropLabel}>Results</div>
                  {searchResults.map(med => (
                    <button
                      key={med.id}
                      className={styles.searchDropItem}
                      onClick={() => { setSearchQuery(med.med_name); setShowSearchDrop(false) }}>
                      <div>
                        <div className={styles.searchDropItemName}>{med.med_name}</div>
                        <div className={styles.searchDropItemSub}>{med.med_dosage} · {med.med_type}</div>
                      </div>
                      <div>
                        <div className={styles.searchDropItemQty}>{med.quantity} pcs</div>
                        <div className={styles.searchDropItemExp}>Exp: {med.exp_date}</div>
                      </div>
                    </button>
                  ))}
                  <div className={styles.searchDropDivider}>
                    <button
                      className={styles.searchDropAdd}
                      onClick={() => { setAddForm(f => ({ ...f, name: searchQuery })); setShowSearchDrop(false); setShowAddModal(true) }}>
                      + Add "{searchQuery}" as new medicine
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.searchDropEmpty}>No medicine found for "{searchQuery}"</div>
                  <div className={styles.searchDropDivider}>
                    <button
                      className={styles.searchDropAdd}
                      onClick={() => { setAddForm(f => ({ ...f, name: searchQuery })); setShowSearchDrop(false); setShowAddModal(true) }}>
                      + Add "{searchQuery}" as new medicine
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.topbarActions}>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              className={styles.iconBtn}
              onClick={() => { setShowNotif(!showNotif); setSelectedRequest(null) }}>
              <Bell size={18} />
              {requests.length > 0 && <span className={styles.notifDot} />}
            </button>

            {showNotif && !selectedRequest && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <span className={styles.dropdownTitle}>Notifications</span>
                  {requests.length > 0 && (
                    <span className={styles.dropdownBadge}>{requests.length}</span>
                  )}
                </div>
                {requests.length > 0 ? requests.map(req => (
                  <button
                    key={req.id}
                    className={styles.notifItem}
                    onClick={() => setSelectedRequest(req)}>
                    <div className={styles.notifItemTop}>
                      <span className={styles.notifItemName}>Restock Request</span>
                      <span className={styles.urgentBadge}>Urgent</span>
                    </div>
                    <div className={styles.notifItemSub}>{req.medicine_name} — {req.pharmacist_name}</div>
                    <div className={styles.notifItemTime}>{formatDate(req.created_at)}</div>
                  </button>
                )) : (
                  <div className={styles.notifEmpty}>No pending requests</div>
                )}
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            className={styles.iconBtn}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Profile */}
          <div style={{ position: 'relative' }}>
            <button
              className={styles.avatarChip}
              onClick={() => setShowProfile(!showProfile)}>
              <div className={styles.avatar}>
                {userAvatar
                  ? <img src={userAvatar} alt="avatar" />
                  : initials}
              </div>
              <span className={styles.avatarName}>{userName}</span>
            </button>

            {showProfile && (
              <div className={`${styles.dropdown} ${styles.profilePanel}`}>
                <div className={styles.profileTop}>
                  <div className={styles.profileAvatar}>
                    {userAvatar
                      ? <img src={userAvatar} alt="avatar" />
                      : initials}
                  </div>
                  <div className={styles.profileName}>Hi, {userName}!</div>
                  <div className={styles.profileRole}>{userRole}</div>
                </div>
                <div className={styles.profileRow}>
                  <span className={styles.profileLabel}>Username</span>
                  <span className={styles.profileValue}>{userName}</span>
                </div>
                <div className={styles.profileRow}>
                  <span className={styles.profileLabel}>Role</span>
                  <span className={styles.profileValue}>{userRole}</span>
                </div>
                <button
                  className={styles.profileClose}
                  onClick={() => setShowProfile(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restock Request Modal */}
      {selectedRequest && (
        <div className={styles.modalBackdrop}>
          <div className={`${styles.modal} ${styles.restockModal}`}>

            <div className={styles.restockLeft}>
              <p className={styles.restockLeftTitle}>Requested Medicine</p>
              {[
                ['Requested by:', selectedRequest.pharmacist_name],
                ['Medicine Name:', selectedRequest.medicine_name],
                ['Mg/Dosage:', selectedRequest.dosage],
                ['Medicine Type:', selectedRequest.medicine_type],
                ['Quantity:', String(selectedRequest.quantity)],
                ['Date and Time:', formatDate(selectedRequest.created_at)],
              ].map(([label, value]) => (
                <div key={label} className={styles.restockField}>
                  <span className={styles.restockFieldLabel}>{label}</span>
                  <span className={styles.restockFieldValue}>{value}</span>
                </div>
              ))}
            </div>

            <div className={styles.restockRight}>
              <div className={styles.restockChartHeader}>Stock Levels</div>
              <div className={styles.restockChart}>
                <Doughnut
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: '60%'
                  }}
                />
              </div>

              <div className={styles.filterRow}>
                {(['Highest','Medium','Lowest'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => { setStockFilter(f); setNotifSearch('') }}
                    className={`${styles.filterBtn} ${
                      stockFilter === f
                        ? f === 'Highest' ? styles.filterBtnHighest
                          : f === 'Medium' ? styles.filterBtnMedium
                          : styles.filterBtnLowest
                        : ''
                    }`}>
                    {f}
                  </button>
                ))}
              </div>

              <div className={styles.restockSearch}>
                <Search size={13} className={styles.restockSearchIco} />
                <input
                  className={styles.restockSearchInput}
                  placeholder="Search medicine name or dosage..."
                  value={notifSearch}
                  onChange={e => setNotifSearch(e.target.value)}
                />
              </div>

              <div className={styles.restockList}>
                <div className={styles.restockListHeader}>
                  <span>Medicine</span>
                  <span style={{ textAlign: 'center' }}>Mg/Dosage</span>
                  <span style={{ textAlign: 'right' }}>Quantity</span>
                </div>
                {filteredRequests.length > 0 ? filteredRequests.map((req, i) => (
                  <div key={i} className={styles.restockListItem}>
                    <span className={styles.restockListItemName}>{req.medicine_name}</span>
                    <span className={styles.restockListItemDosage}>{req.dosage}</span>
                    <span className={styles.restockListItemQty}>{req.quantity}</span>
                  </div>
                )) : (
                  <div className={styles.restockEmpty}>No requests found</div>
                )}
              </div>

              <div className={styles.modalFooter} style={{ padding: 0, borderTop: 'none' }}>
                <button
                  className={styles.btnCancel}
                  onClick={() => { setSelectedRequest(null); setShowNotif(false); setNotifSearch('') }}>
                  CANCEL
                </button>
                <button
                  className={styles.btnWarning}
                  onClick={() => showToastMsg('Alert message has been sent!', 'alert')}>
                  Send Alert
                </button>
                <button
                  className={styles.btnConfirm}
                  onClick={() => showToastMsg('Confirmation sent!', 'confirm')}>
                  Send Confirmation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Add Medicine</h2>
              <button className={styles.modalClose} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {[
                { label: 'Medicine Name', key: 'name', type: 'text' },
                { label: 'Mg/Dosage', key: 'dosage', type: 'text' },
                { label: 'Medicine Type', key: 'type', type: 'text' },
                { label: 'EXP Date', key: 'expDate', type: 'date' },
                { label: 'Quantity', key: 'quantity', type: 'number' },
                { label: 'Unit', key: 'unit', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label>{label}</label>
                  <input
                    type={type}
                    className={styles.modalInput}
                    value={addForm[key as keyof typeof addForm]}
                    onChange={e => setAddForm({ ...addForm, [key]: e.target.value })}
                  />
                </div>
              ))}
              {addToast && (
                <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{addToast}</p>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => { setShowAddModal(false); setAddForm({ name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '' }) }}>
                CANCEL
              </button>
              <button className={styles.btnConfirm} onClick={handleAddMedicine}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toastType === 'alert' ? styles.toastWarning : ''}`}>
          ✓ {toast}
        </div>
      )}
    </>
  )
}