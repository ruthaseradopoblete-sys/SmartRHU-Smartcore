'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { supabase } from '@/Lib/supabase'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const isFirstLogin = localStorage.getItem('isFirstLogin')
    if (isFirstLogin !== 'true') {
      router.push('/dashboard')
    }
  }, [router])

  const handleChange = async () => {
    setError('')
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/[!@#$%^&*?]/.test(newPassword)) {
      setError('Password must have a special character (!@#$%^&*?).')
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('Password must have a number.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // Step 1 - Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (authError) {
        setError('Error updating password. Please try again.')
        setLoading(false)
        return
      }

      // Step 2 - Update is_first_login to false in public.users
      const userId = localStorage.getItem('userId')
      const { error: dbError } = await supabase
        .from('users')
        .update({ is_first_login: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (dbError) {
        setError('Error updating user. Please try again.')
        setLoading(false)
        return
      }

      // Step 3 - Update localStorage
      localStorage.setItem('isFirstLogin', 'false')
      setLoading(false)
      router.push('/dashboard')

    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen">
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

      <div className="w-1/2 bg-white flex flex-col items-center justify-between py-10 px-12">
        <div className="flex flex-col items-center">
          <Image src="/logo.jpg" alt="Logo" width={80} height={80} className="rounded-full mb-3" />
          <p className="text-xs text-gray-500">Rural Healthcare Unit Lopez, Quezon</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="border-t border-gray-200 mb-8"></div>
          <h2 className="text-lg font-medium text-gray-800 text-center mb-2 uppercase tracking-wide">
            Change Password
          </h2>
          <p className="text-xs text-gray-500 text-center mb-6">
            This is your first login. Please change your password to continue.
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">New Password:</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-green-600 transition-colors"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">Confirm Password:</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-green-600 transition-colors"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-1">
              <p className="mb-1">Conditions:</p>
              <ul className="flex flex-col gap-1 pl-2">
                <li className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                  <span>{newPassword.length >= 8 ? '✓' : '•'}</span> Must be 8 characters at least.
                </li>
                <li className={`flex items-center gap-1.5 ${/[!@#$%^&*?]/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span>{/[!@#$%^&*?]/.test(newPassword) ? '✓' : '•'}</span> Must have special characters e.g (!,@,#,$,%,&,*?).
                </li>
                <li className={`flex items-center gap-1.5 ${/[0-9]/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span>{/[0-9]/.test(newPassword) ? '✓' : '•'}</span> Must have a number.
                </li>
              </ul>
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center bg-red-50 py-2 px-3 rounded-lg">{error}</p>
            )}

            <button
              onClick={handleChange}
              disabled={loading}
              className="w-full py-2.5 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors uppercase tracking-wide disabled:opacity-70 mt-2">
              {loading ? 'Changing...' : 'Change Password'}
            </button>

            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 text-xs text-green-700 hover:text-green-600 transition-colors">
              <ArrowLeft size={13} />
              Return to Access Point
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