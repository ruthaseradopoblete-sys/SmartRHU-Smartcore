'use client'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

export default function Topbar() {
  const [userName, setUserName] = useState('Name')
  const [userRole, setUserRole] = useState('Nurse')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('smartrhu_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        setUserName(user.name || 'Name')
        setUserRole(user.role || 'Nurse')
        if (user.id) {
          supabase
            .from('users')
            .select('avatar_url')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => {
              if (data?.avatar_url) setUserAvatar(data.avatar_url)
            })
        }
      } catch {}
    }

    const handleProfileUpdate = () => {
      const stored = localStorage.getItem('smartrhu_user')
      if (stored) {
        try { setUserName(JSON.parse(stored).name || 'Name') } catch {}
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

  const initials = userName.slice(0, 2).toUpperCase()

  if (!mounted) return (
    <div className={styles.topbar}>
      <div style={{ marginLeft: 'auto' }} />
    </div>
  )

  return (
    <div className={styles.topbar}>
      <div className={styles.topbarTitle}>
        SmartRHU — <span>Nurse</span>
      </div>

      <div className={styles.topbarActions}>
        <button
          className={styles.iconBtn}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className={styles.avatarChip}
            onClick={() => setShowProfile(!showProfile)}>
            <div className={styles.avatar}>
              {userAvatar ? <img src={userAvatar} alt="avatar" /> : initials}
            </div>
            <span className={styles.avatarName}>{userName}</span>
          </button>

          {showProfile && (
            <div className={`${styles.dropdown} ${styles.profilePanel}`}>
              <div className={styles.profileTop}>
                <div className={styles.profileAvatar}>
                  {userAvatar ? <img src={userAvatar} alt="avatar" /> : initials}
                </div>
                <div className={styles.profileName}>Hi, {userName}!</div>
                <div className={styles.profileRole}>{userRole}</div>
              </div>
              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Name</span>
                <span className={styles.profileValue}>{userName}</span>
              </div>
              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Role</span>
                <span className={styles.profileValue}>{userRole}</span>
              </div>
              <button className={styles.profileClose} onClick={() => setShowProfile(false)}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}