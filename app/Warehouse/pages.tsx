'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { User, Shield } from 'lucide-react'

export default function AccessPoint() {
  const router = useRouter()
  const [selected, setSelected] = useState<'member' | 'admin' | null>(null)

  const handleSelect = (role: 'member' | 'admin') => {
    setSelected(role)
    setTimeout(() => {
      router.push(`/login?role=${role}`)
    }, 200)
  }

  return (
    <div className="flex h-screen w-screen">
      {/* Left Panel */}
      <div className="w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-green-600/60 z-10"></div>
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800"
          alt="Medical background"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-12 left-10 z-20">
          <p className="text-white text-3xl font-light">Welcome to</p>
          <p className="text-white text-5xl font-bold">
            SMART<span className="text-green-300">RHU</span>
          </p>
          <p className="text-white/80 text-sm mt-2">Inventory and Patient Management</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-1/2 bg-white flex flex-col items-center justify-between py-10 px-12">
        <div className="flex flex-col items-center">
          <Image src="/logo.jpg" alt="Logo" width={80} height={80} className="rounded-full mb-3" />
          <p className="text-xs text-gray-500">Rural Healthcare Unit Lopez, Quezon</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="border-t border-gray-200 mb-8"></div>
          <h2 className="text-lg font-medium text-gray-800 text-center mb-1">Secure Access</h2>
          <p className="text-sm text-green-700 text-center mb-8">Select your access type to continue</p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleSelect('member')}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl bg-green-700 hover:bg-green-600 transition-colors text-white ${selected === 'member' ? 'opacity-80' : ''}`}>
              <div className="w-10 h-10 rounded-full border-2 border-white/50 flex items-center justify-center">
                <User size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm tracking-wide">MEMBER</p>
                <p className="text-xs text-white/70">For Staffs</p>
              </div>
              <div className="w-7 h-7 rounded-full border border-white/40 flex items-center justify-center">
                <span className="text-xs">▶</span>
              </div>
            </button>

            <button
              onClick={() => handleSelect('admin')}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl bg-green-800 hover:bg-green-700 transition-colors text-white ${selected === 'admin' ? 'opacity-80' : ''}`}>
              <div className="w-10 h-10 rounded-full border-2 border-white/50 flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm tracking-wide">ADMIN</p>
                <p className="text-xs text-white/70">For Administrator Only</p>
              </div>
              <div className="w-7 h-7 rounded-full border border-white/40 flex items-center justify-center">
                <span className="text-xs">▶</span>
              </div>
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          RHU Lopez Quezon © 2026<br />Department of Health – Philippines
        </p>
      </div>
    </div>
  )
}