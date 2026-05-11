'use client'
import { useState, Suspense } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { supabase } from '@/Lib/supabase'
import styles from '@/Components/Warehouse.module.css'

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
    if (!username || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)

    try {
      const { data: userData, error: userError } = await supabase
        .from('users').select('*').eq('username', username).single()

      if (userError || !userData) { setError('Username not found.'); setLoading(false); return }

      const allowedRoles = role === 'admin' ? ['admin'] : ['warehouse','pharmacist','doctor','registrar','medtech']
      if (!allowedRoles.includes(userData.role)) {
        setError(`This account does not have ${role} access.`)
        setLoading(false); return
      }

      if (userData.status !== 'active') {
        setError('Your account is inactive. Please contact admin.')
        setLoading(false); return
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email, password,
      })
      if (authError) { setError('Incorrect password.'); setLoading(false); return }

      localStorage.setItem('userId', userData.user_id)
      localStorage.setItem('userName', userData.username)
      localStorage.setItem('userRole', userData.role)
      localStorage.setItem('userEmail', userData.email)
      localStorage.setItem('firstName', userData.first_name)
      localStorage.setItem('lastName', userData.last_name)
      localStorage.setItem('isFirstLogin', userData.is_first_login ? 'true' : 'false')

      if (userData.is_first_login) router.push('/change-password')
      else router.push('/dashboard')

    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authLeft}>
        <div className={styles.authLeftOverlay} />
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800"
          alt="Medical background"
          className={styles.authLeftImg}
        />
        <div className={styles.authLeftText}>
          <p className={styles.authLeftSub}>Welcome to</p>
          <p className={styles.authLeftTitle}>SMART<span>RHU</span></p>
          <p className={styles.authLeftCaption}>Inventory and Patient Management</p>
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authLogo}>
          <Image src="/logo.jpg" alt="Logo" width={80} height={80} className={styles.authLogoImg} />
          <p className={styles.authLogoSub}>Rural Healthcare Unit Lopez, Quezon</p>
        </div>

        <div className={styles.authForm}>
          <div className={styles.authDivider} />
          <p className={styles.authTitle}>{role === 'admin' ? 'Administrator' : 'Member'}</p>
          <p className={styles.authSubtitle}>Enter your credentials to proceed</p>

          <div className={styles.authField}>
            <label className={styles.authLabel}>Username:</label>
            <input
              type="text"
              className={styles.authInput}
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className={styles.authField}>
            <label className={styles.authLabel}>Password:</label>
            <div className={styles.authInputWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.authInput}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button className={styles.authEye} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.authRow}>
            <label className={styles.authCheckLabel}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
              Remember Me
            </label>
            <button className={styles.authForgot} onClick={() => router.push('/forgot-password')}>
              Forgot Password?
            </button>
          </div>

          {error && <div className={styles.authError}>{error}</div>}

          <button className={styles.authSignIn} onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'SIGN IN'}
          </button>

          <button className={styles.authBack} onClick={() => router.push('/')}>
            <ArrowLeft size={13} /> Return to Access Point
          </button>
        </div>

        <p className={styles.authFooter}>
          RHU Lopez Quezon © 2026<br />Department of Health – Philippines
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}