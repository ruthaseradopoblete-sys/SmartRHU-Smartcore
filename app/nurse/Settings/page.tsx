'use client'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { User, Lock, Eye, EyeOff, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import styles from '../components/nurse.module.css'

type SettingsTab = 'profile' | 'password'

export default function NurseSettingsPage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [photo, setPhoto] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [uploading, setUploading] = useState(false)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const getUserId = () => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('smartrhu_user')
    if (!stored) return null
    try { return JSON.parse(stored).id } catch { return null }
  }
  const getUserEmail = () => {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('smartrhu_user')
    if (!stored) return ''
    try { return JSON.parse(stored).email } catch { return '' }
  }
  const userId = getUserId()

  useEffect(() => { setMounted(true); fetchProfile() }, [])

  const fetchProfile = async () => {
    if (!userId) return
    const { data } = await supabase.from('users').select('username, email, avatar_url').eq('user_id', userId).single()
    if (data) {
      setUsername(data.username || '')
      setEmail(data.email || '')
      if (data.avatar_url) setPhoto(data.avatar_url)
    }
  }

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 3000)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${userId}/avatar.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) { showToast(`Error: ${uploadError.message}`, 'error'); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const { error: updateError } = await supabase.from('users').update({ avatar_url: urlData.publicUrl }).eq('user_id', userId)
      if (updateError) { showToast('Error saving photo.', 'error'); setUploading(false); return }
      setPhoto(urlData.publicUrl)
      localStorage.setItem('userAvatar', urlData.publicUrl)
      window.dispatchEvent(new Event('avatarUpdated'))
      showToast('Photo uploaded successfully!', 'success')
    } catch { showToast('Something went wrong!', 'error') }
    setUploading(false)
  }

  const openCamera = async () => {
    setShowPhotoOptions(false)
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      showToast('Camera access denied.', 'error')
      setShowCamera(false)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setShowCamera(false)
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !userId) return
    const canvas = canvasRef.current
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    canvas.toBlob(async (blob) => {
      if (!blob) return
      setUploading(true)
      stopCamera()
      const filePath = `${userId}/avatar.jpg`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) { showToast(`Error: ${uploadError.message}`, 'error'); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const { error: updateError } = await supabase.from('users').update({ avatar_url: urlData.publicUrl }).eq('user_id', userId)
      if (updateError) { showToast('Error saving photo.', 'error'); setUploading(false); return }
      setPhoto(urlData.publicUrl)
      localStorage.setItem('userAvatar', urlData.publicUrl)
      window.dispatchEvent(new Event('avatarUpdated'))
      showToast('Photo saved successfully!', 'success')
      setUploading(false)
    }, 'image/jpeg', 0.9)
  }

  const handleSaveProfile = async () => {
    if (!username || !email) { showToast('Please fill in all fields.', 'error'); return }
    if (!userId) return
    const { error } = await supabase.from('users').update({ username, email }).eq('user_id', userId)
    if (error) { showToast('Error saving profile!', 'error'); return }
    const stored = localStorage.getItem('smartrhu_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        user.name = username
        user.email = email
        localStorage.setItem('smartrhu_user', JSON.stringify(user))
      } catch {}
    }
    window.dispatchEvent(new Event('profileUpdated'))
    showToast('Profile saved successfully!', 'success')
  }

  const handleChangePassword = async () => {
    if (!currentPassword) { showToast('Please enter your current password.', 'error'); return }
    if (newPassword.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return }
    if (!/[!@#$%^&*?]/.test(newPassword)) { showToast('Password must have a special character.', 'error'); return }
    if (!/[0-9]/.test(newPassword)) { showToast('Password must have a number.', 'error'); return }
    if (newPassword !== confirmPassword) { showToast('Passwords do not match.', 'error'); return }
    const userEmail = getUserEmail()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword })
    if (signInError) { showToast('Current password is incorrect.', 'error'); return }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) { showToast('Error changing password!', 'error'); return }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    showToast('Password changed successfully!', 'success')
  }

  return (
    <div className={`${styles.root} ${mounted && theme === 'dark' ? styles.dark : ''}`}>
      <Sidebar />
      <div className={styles.mainArea}>
        <Topbar />
        <div className={styles.content}>
          <p className={styles.pageEyebrow}>Nurse</p>
          <h1 className={styles.pageTitle}>Settings</h1>

          <div className={styles.settingsLayout}>
            <div className={styles.settingsSidebar}>
              <div className={styles.settingsSidebarTitle}>Settings</div>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setActiveTab('profile')}
                className={`${styles.settingsNavItem} ${activeTab === 'profile' ? styles.settingsNavItemActive : ''}`}>
                <User size={16} /> User Profile
              </button>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setActiveTab('password')}
                className={`${styles.settingsNavItem} ${activeTab === 'password' ? styles.settingsNavItemActive : ''}`}>
                <Lock size={16} /> Password
              </button>
            </div>

            <div className={styles.settingsContent}>
              {activeTab === 'profile' && (
                <div>
                  <div className={styles.settingsTabTitle}>User Profile</div>
                  <div className={styles.photoWrap}>
                    <div className={styles.photoCircle}>
                      {photo ? <img src={photo} alt="Profile" /> : <span>PHOTO</span>}
                    </div>
                    <button type="button" className={styles.uploadBtn} onClick={() => setShowPhotoOptions(true)} disabled={uploading}>
                      <Upload size={13} />
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Username:</label>
                    <input type="text" className={styles.formInput} value={username} onChange={e => setUsername(e.target.value)} />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Email:</label>
                    <input type="email" className={styles.formInput} value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <button type="button" className={styles.saveBtn} onClick={handleSaveProfile}>Save</button>
                </div>
              )}

              {activeTab === 'password' && (
                <div>
                  <div className={styles.settingsTabTitle}>Password</div>
                  <div className={styles.passwordBox}>
                    <div className={styles.passField}>
                      <label className={styles.passLabel}>Current Password:</label>
                      <div className={styles.passInputWrap}>
                        <input type="password" className={styles.passInput} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.passField}>
                      <label className={styles.passLabel}>New Password:</label>
                      <div className={styles.passInputWrap}>
                        <input type={showNew ? 'text' : 'password'} className={styles.passInput} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <button type="button" className={styles.passEye} onClick={() => setShowNew(!showNew)}>
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className={styles.passField}>
                      <label className={styles.passLabel}>Confirm Password:</label>
                      <div className={styles.passInputWrap}>
                        <input type={showConfirm ? 'text' : 'password'} className={styles.passInput} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        <button type="button" className={styles.passEye} onClick={() => setShowConfirm(!showConfirm)}>
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className={styles.conditions}>
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>Conditions:</p>
                      <div className={`${styles.condItem} ${newPassword.length >= 8 ? styles.condMet : ''}`}>
                        <span>{newPassword.length >= 8 ? '✓' : '•'}</span> Must be 8 characters at least.
                      </div>
                      <div className={`${styles.condItem} ${/[!@#$%^&*?]/.test(newPassword) ? styles.condMet : ''}`}>
                        <span>{/[!@#$%^&*?]/.test(newPassword) ? '✓' : '•'}</span> Must have special characters (!@#$%^&*?).
                      </div>
                      <div className={`${styles.condItem} ${/[0-9]/.test(newPassword) ? styles.condMet : ''}`}>
                        <span>{/[0-9]/.test(newPassword) ? '✓' : '•'}</span> Must have a number.
                      </div>
                    </div>
                  </div>
                  <button type="button" className={styles.changeBtn} onClick={handleChangePassword}>Change</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPhotoOptions && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal} style={{ maxWidth: 340 }}>
            <div className={styles.modalHeader}>
              <h2>Choose Option</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowPhotoOptions(false)}>✕</button>
            </div>
            <div className={styles.modalBody} style={{ gap: 10 }}>
              <button type="button" className={styles.btnConfirm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px' }} onClick={openCamera}>
                📷 Take Photo
              </button>
              <button type="button" className={styles.btnOutline} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px' }} onClick={() => { setShowPhotoOptions(false); fileRef.current?.click() }}>
                📁 Upload from Device
              </button>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal} style={{ maxWidth: 480 }}>
            <div className={styles.modalHeader}>
              <h2>Take Photo</h2>
              <button type="button" className={styles.modalClose} onClick={stopCamera}>✕</button>
            </div>
            <div className={styles.modalBody} style={{ alignItems: 'center', gap: 12 }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 10, background: '#000' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={stopCamera}>CANCEL</button>
              <button type="button" className={styles.btnConfirm} onClick={capturePhoto} disabled={uploading}>
                {uploading ? 'Saving...' : '📷 CAPTURE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toastType === 'error' ? styles.toastError : ''}`}>
          {toastType === 'success' ? '✓' : '✕'} {toast}
        </div>
      )}
    </div>
  )
}