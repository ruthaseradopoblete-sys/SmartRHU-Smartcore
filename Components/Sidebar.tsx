'use client'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Package, Settings, HelpCircle, LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [time, setTime] = useState('')
  const [today, setToday] = useState({ day: 0, month: 0, year: 0 })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes().toString().padStart(2, '0')
      const s = now.getSeconds().toString().padStart(2, '0')
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      setTime(`${h12}:${m}:${s} ${ampm}`)
      setToday({ day: now.getDate(), month: now.getMonth(), year: now.getFullYear() })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    router.push('/')
  }

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={16} />, href: '/dashboard' },
    { name: 'Medicine Stock', icon: <Package size={16} />, href: '/medicine-stock' },
  ]

  const generalItems = [
    { name: 'Settings', icon: <Settings size={16} />, href: '/settings' },
    { name: 'Help', icon: <HelpCircle size={16} />, href: '/help' },
  ]

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const days = ['S','M','T','W','T','F','S']

  const getDates = () => {
    const firstDay = new Date(today.year, today.month, 1).getDay()
    const daysInMonth = new Date(today.year, today.month + 1, 0).getDate()
    const dates: (number | null)[] = Array(firstDay).fill(null)
    for (let i = 1; i <= daysInMonth; i++) dates.push(i)
    return dates
  }

  const navClass = (href: string) =>
    `flex items-center gap-2 mx-2 px-3 py-2 rounded-md text-sm transition-colors
    ${pathname === href
      ? 'bg-green-100 dark:bg-[#1e301e] text-green-800 dark:text-[#7aba7a] font-medium'
      : 'text-gray-600 dark:text-[#9ab89a] hover:bg-green-50 dark:hover:bg-[#1e2e1e] hover:text-green-700 dark:hover:text-[#7aba7a]'}`

  return (
    <>
      <div className="w-48 min-w-48 h-screen bg-white dark:bg-[#161d17] border-r border-gray-200 dark:border-[#2a3a2a] flex flex-col">

        <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-[#2a3a2a]">
          <Image src="/logo.jpg" alt="MHO Lopez Logo" width={40} height={40} className="rounded-full" />
          <span className="text-xs text-gray-500 dark:text-[#9ab89a] leading-tight">Municipal<br/>Health Office</span>
        </div>

        <div className="px-4 pt-3 pb-1 text-xs text-gray-400 dark:text-[#4a6a4a] uppercase tracking-wider">Menu</div>
        {menuItems.map(item => (
          <Link key={item.name} href={item.href} className={navClass(item.href)}>
            {item.icon}
            {item.name}
          </Link>
        ))}

        <div className="px-4 pt-3 pb-1 text-xs text-gray-400 dark:text-[#4a6a4a] uppercase tracking-wider mt-2">General</div>
        {generalItems.map(item => (
          <Link key={item.name} href={item.href} className={navClass(item.href)}>
            {item.icon}
            {item.name}
          </Link>
        ))}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 mx-2 px-3 py-2 rounded-md text-sm text-gray-600 dark:text-[#9ab89a] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors text-left">
          <LogOut size={16} />
          Logout
        </button>

        <div className="mt-auto p-3 border-t border-gray-200 dark:border-[#2a3a2a]">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-[#7a9a7a] mb-1">
            <span className="font-medium">{months[today.month]} {today.year}</span>
          </div>
          <div className="text-xs text-green-700 dark:text-green-500 font-medium mb-2 text-center">
            {time}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {days.map((d, i) => (
              <div key={i} className="text-center text-xs text-gray-400 dark:text-[#4a6a4a] font-medium py-px">{d}</div>
            ))}
            {getDates().map((d, i) => (
              <div key={i} className={`text-center text-xs py-px rounded-full
                ${d === today.day
                  ? 'bg-green-800 dark:bg-green-700 text-white'
                  : d === null ? '' : 'text-gray-500 dark:text-[#5a7a5a]'}`}>
                {d || ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#161d17] rounded-2xl shadow-xl p-8 w-[340px] border border-gray-200 dark:border-[#2a3a2a]">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 mx-auto mb-4">
              <LogOut size={24} className="text-red-500" />
            </div>
            <h2 className="text-lg font-medium text-gray-800 dark:text-[#c0d8c0] text-center mb-2">
              Logout
            </h2>
            <p className="text-sm text-gray-500 dark:text-[#7a9a7a] text-center mb-6">
              Are you sure you want to logout?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#2a3a2a] text-gray-600 dark:text-[#9ab89a] text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2e1e] transition-colors">
                CANCEL
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}