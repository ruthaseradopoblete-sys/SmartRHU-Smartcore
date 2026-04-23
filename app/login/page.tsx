'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'
import { supabase } from '@/Lib/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = (searchParams.get('role') || 'member') as 'member' | 'admin'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!username || !password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)

    try {
      // Step 1 - Find user by username in public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

      if (userError || !userData) {
        setError('Username not found.')
        setLoading(false)
        return
      }

      // Step 2 - Check if role matches
      const allowedRoles = role === 'admin' ? ['admin'] : ['warehouse', 'pharmacist', 'doctor', 'registrar', 'medtech']
      if (!allowedRoles.includes(userData.role)) {
        setError(`This account does not have ${role} access.`)
        setLoading(false)
        return
      }

      // Step 3 - Check if account is active
      if (userData.status !== 'active') {
        setError('Your account is inactive. Please contact admin.')
        setLoading(false)
        return
      }

      // Step 4 - Sign in with Supabase Auth using email + password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password,
      })

      if (authError) {
        setError('Incorrect password.')
        setLoading(false)
        return
      }

      // Step 5 - Save user info to localStorage
      localStorage.setItem('userId', userData.user_id)
      localStorage.setItem('userName', userData.username)
      localStorage.setItem('userRole', userData.role)
      localStorage.setItem('userEmail', userData.email)
      localStorage.setItem('firstName', userData.first_name)
      localStorage.setItem('lastName', userData.last_name)
      localStorage.setItem('isFirstLogin', userData.is_first_login ? 'true' : 'false')

      // Step 6 - Check if first login
      if (userData.is_first_login) {
        router.push('/change-password')
      } else {
        router.push('/dashboard')
      }

    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
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
          <h2 className="text-lg font-medium text-gray-800 text-center mb-1 uppercase">
            {role === 'admin' ? 'Administrator' : 'Member'}
          </h2>
          <p className="text-sm text-green-700 text-center mb-8">Enter your credentials to proceed</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">Username:</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-600 transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">Password:</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-green-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="accent-green-700 w-3 h-3"
                />
                Remember Me
              </label>
              <button
                onClick={() => router.push('/forgot-password')}
                className="text-xs text-red-500 hover:text-red-600 transition-colors">
                Forgot Password?
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center bg-red-50 py-2 px-3 rounded-lg">{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-70">
              {loading ? 'Signing in...' : 'SIGN IN'}
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}