'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DoctorSidebar from '../../components/DoctorSidebar'
import DoctorTopbar from '../../components/DoctorTopbar'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import styles from "../../styles/dashboard.module.css"

type SettingsTab = 'profile' | 'password'

export default function DoctorSettingsPage() {
  const rootRef      = useRef<HTMLDivElement>(null!)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { user: authUser, isLoading } = useAuth()

  const [activeTab, setActiveTab]             = useState<SettingsTab>('profile')
  const [photo, setPhoto]                     = useState<string | null>(null)
  const [username, setUsername]               = useState('')
  const [email, setEmail]                     = useState('')
  const [role, setRole]                       = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [toast, setToast]                     = useState('')
  const [toastType, setToastType]             = useState<'success' | 'error'>('success')
  const [uploading, setUploading]             = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [changingPw, setChangingPw]           = useState(false)
  const [userId, setUserId]                   = useState<string | null>(null)
  const [userInfo, setUserInfo]               = useState({ name: '', initials: 'D', role: 'Doctor' })
  const [showCamera, setShowCamera]           = useState(false)
  const [search, setSearch]                   = useState('')

  const fileRef   = useRef<HTMLInputElement>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const req = {
    length:  newPassword.length >= 8,
    special: /[!@#$%^&*?]/.test(newPassword),
    number:  /[0-9]/.test(newPassword),
    match:   newPassword.length > 0 && newPassword === confirmPassword,
  }

  // ── Handle ?tab=password URL param ──────────────────────────────────────
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'password') setActiveTab('password')
  }, [searchParams])

  useEffect(() => {
    if (!isLoading && !authUser) router.replace('/login')
  }, [authUser, isLoading, router])

  // ── Get userId — use smartrhu_user key (consistent with AuthContext) ──
  useEffect(() => {
    // Prefer AuthContext id
    if (authUser?.id) {
      setUserId(authUser.id)
      return
    }
    // Fallback: parse smartrhu_user from localStorage
    try {
      const raw = localStorage.getItem('smartrhu_user')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.id) { setUserId(parsed.id); return }
      }
    } catch {}
    // Last fallback
    const id = localStorage.getItem('userId')
    if (id) setUserId(id)
  }, [authUser])

  useEffect(() => {
    if (!userId) return
    fetchProfile(userId)
  }, [userId])

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('username, email, avatar_url, role')
      .eq('user_id', uid)
      .single()

    if (error) { showToast('Failed to load profile.', 'error'); return }
    if (data) {
      setUsername(data.username || '')
      setEmail(data.email || '')
      setRole(data.role || 'doctor')
      if (data.avatar_url) setPhoto(`${data.avatar_url}?t=${Date.now()}`)
      const name = data.username || authUser?.name || 'Doctor'
      setUserInfo({
        name,
        initials: name.charAt(0).toUpperCase(),
        role: data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : 'Doctor',
      })
    }
  }

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  const getUid = () => userId || authUser?.id || (() => {
    try { const r = localStorage.getItem('smartrhu_user'); if (r) return JSON.parse(r)?.id } catch {}
    return localStorage.getItem('userId')
  })()

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const uid = getUid()
    if (!uid) { showToast('User not found. Please refresh.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5 MB.', 'error'); return }

    setPhoto(URL.createObjectURL(file))
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${uid}/avatar.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) { showToast(`Upload error: ${uploadError.message}`, 'error'); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl
      const displayUrl = `${publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase.from('users').update({ avatar_url: publicUrl }).eq('user_id', uid)
      if (updateError) { showToast(`Error saving photo: ${updateError.message}`, 'error'); setUploading(false); return }
      setPhoto(displayUrl)
      localStorage.setItem('userAvatar', publicUrl)
      // ← This triggers DoctorTopbar to re-fetch from DB
      window.dispatchEvent(new Event('avatarUpdated'))
      showToast('Photo updated successfully!', 'success')
    } catch { showToast('Something went wrong.', 'error') }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const openCamera = async () => {
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch { showToast('Camera access denied.', 'error'); setShowCamera(false) }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const uid = getUid()
    if (!uid) return
    const canvas = canvasRef.current
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    canvas.toBlob(async (blob) => {
      if (!blob) return
      setUploading(true); stopCamera()
      const filePath = `${uid}/avatar.jpg`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) { showToast(`Upload error: ${uploadError.message}`, 'error'); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl
      const displayUrl = `${publicUrl}?t=${Date.now()}`
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('user_id', uid)
      setPhoto(displayUrl)
      localStorage.setItem('userAvatar', publicUrl)
      window.dispatchEvent(new Event('avatarUpdated'))
      showToast('Photo saved!', 'success')
      setUploading(false)
    }, 'image/jpeg', 0.9)
  }

  const handleSaveProfile = async () => {
    if (!username.trim()) { showToast('Please enter a username.', 'error'); return }
    if (!email.trim())    { showToast('Please enter an email.', 'error'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Please enter a valid email.', 'error'); return }
    const uid = getUid()
    if (!uid) { showToast('User not found. Please refresh.', 'error'); return }

    setSaving(true)
    const { error } = await supabase.from('users')
      .update({ username: username.trim(), email: email.trim() })
      .eq('user_id', uid)
    setSaving(false)

    if (error) { showToast('Error saving profile!', 'error'); return }
    localStorage.setItem('userName', username.trim())
    localStorage.setItem('userEmail', email.trim())
    setUserInfo(prev => ({ ...prev, name: username.trim(), initials: username.trim().charAt(0).toUpperCase() }))
    // ← This triggers DoctorTopbar to re-fetch name from DB
    window.dispatchEvent(new Event('profileUpdated'))
    showToast('Profile saved successfully!', 'success')
  }

  const handleChangePassword = async () => {
    if (!currentPassword)  { showToast('Please enter your current password.', 'error'); return }
    if (!req.length)        { showToast('Password must be at least 8 characters.', 'error'); return }
    if (!req.special)       { showToast('Password must include a special character.', 'error'); return }
    if (!req.number)        { showToast('Password must include a number.', 'error'); return }
    if (!req.match)         { showToast('Passwords do not match.', 'error'); return }
    if (newPassword === currentPassword) { showToast('New password must differ from current.', 'error'); return }

    const userEmail = liveEmail || localStorage.getItem('userEmail') || email
    setChangingPw(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword })
    if (signInError) { showToast('Current password is incorrect.', 'error'); setChangingPw(false); return }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setChangingPw(false)
    if (updateError) { showToast('Error changing password!', 'error'); return }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    showToast('Password changed successfully!', 'success')
  }

  // Live email for password change
  const [liveEmail, setLiveEmail] = useState('')
  useEffect(() => { if (email) setLiveEmail(email) }, [email])

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: '1.5px solid #e5e7eb', fontSize: 14, color: '#111827',
    fontFamily: "'DM Sans', sans-serif", outline: 'none',
    boxSizing: 'border-box', background: '#fff', transition: 'border-color 0.2s',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6,
  }

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'DM Sans, sans-serif', color:'#4b6557' }}>Loading…</div>
  )
  if (!authUser) return null

  const roleLabel = authUser.role ? authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1) : 'Doctor'

  return (
    <div ref={rootRef} className={styles.root}>
      <DoctorSidebar />

      <div className={styles.mainArea}>
        <DoctorTopbar
          rootRef={rootRef}
          user={{ name: userInfo.name || authUser.name || 'Doctor', initials: userInfo.initials || authUser.initials || 'D', role: roleLabel }}
          search={search}
          onSearchChange={setSearch}
          onViewLabResults={() => {}}
          onLogout={async () => { router.push('/login') }}
        />

        <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'28px 32px', overflowY:'auto', minHeight:0, background:'#f0f7f2' }}>

          {/* Page heading */}
          <div style={{ marginBottom:28, flexShrink:0 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.08em', margin:0 }}>Doctor</p>
            <h1 style={{ fontSize:32, fontWeight:800, color:'#16a34a', fontFamily:"'Syne', sans-serif", margin:'4px 0 0', lineHeight:1 }}>Settings</h1>
            <p style={{ fontSize:12, color:'#9ca3af', marginTop:6, marginBottom:0 }}>
              {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>

          {/* Two-column layout */}
          <div style={{ display:'flex', gap:24, alignItems:'flex-start', flex:1 }}>

            {/* ── Left nav ── */}
            <div style={{ width:240, background:'#fff', borderRadius:16, padding:'20px 16px', boxShadow:'0 1px 8px rgba(0,0,0,.07)', flexShrink:0 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:14, paddingLeft:4, marginTop:0 }}>Settings</p>

              {/* User card */}
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f0fdf4', borderRadius:10, padding:'10px 12px', marginBottom:20, border:'1px solid #dcfce7' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', overflow:'hidden', background:'#dcfce7', flexShrink:0, border:'2px solid #16a34a' }}>
                  {photo
                    ? <img src={photo} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={()=>setPhoto(null)}/>
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#16a34a' }}>{userInfo.initials}</div>
                  }
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0a2912', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{username || authUser.name || 'Doctor'}</div>
                  <div style={{ fontSize:11, color:'#6b7280' }}>{role || authUser.role || 'doctor'}</div>
                </div>
              </div>

              {/* Nav tabs */}
              {([
                { key:'profile'  as const, label:'User Profile', icon:'👤' },
                { key:'password' as const, label:'Password',     icon:'🔒' },
              ]).map(({ key, label, icon }) => (
                <button key={key} type="button" onClick={() => setActiveTab(key)} style={{
                  width:'100%', display:'flex', alignItems:'center', gap:9,
                  padding:'10px 12px', borderRadius:9, border:'none', cursor:'pointer',
                  fontSize:13, fontWeight:activeTab===key?700:500,
                  background:activeTab===key?'#16a34a':'transparent',
                  color:activeTab===key?'#fff':'#374151',
                  marginBottom:4, transition:'all .15s',
                  fontFamily:"'DM Sans', sans-serif", textAlign:'left',
                }}>
                  <span style={{ fontSize:15 }}>{icon}</span> {label}
                </button>
              ))}
            </div>

            {/* ── Right content ── */}
            <div style={{ flex:1, minWidth:0 }}>

              {/* ══ PROFILE TAB ══ */}
              {activeTab === 'profile' && (
                <div style={{ background:'#fff', borderRadius:16, padding:'36px 40px', boxShadow:'0 1px 8px rgba(0,0,0,.07)' }}>
                  <h2 style={{ fontSize:22, fontWeight:700, color:'#0a2912', margin:'0 0 4px', fontFamily:"'Syne', sans-serif" }}>User Profile</h2>
                  <p style={{ fontSize:13, color:'#9ca3af', marginBottom:32, marginTop:4 }}>Update your display name, email, and profile photo.</p>

                  {/* Photo */}
                  <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:36 }}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <div style={{ width:90, height:90, borderRadius:'50%', overflow:'hidden', border:'3px solid #16a34a', background:'#dcfce7' }}>
                        {photo
                          ? <img src={photo} alt="Profile" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={()=>setPhoto(null)}/>
                          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, fontWeight:700, color:'#16a34a' }}>{userInfo.initials}</div>
                        }
                      </div>
                      {uploading && (
                        <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <div style={{ width:24, height:24, borderRadius:'50%', border:'3px solid #fff', borderTopColor:'transparent', animation:'spin 0.7s linear infinite' }}/>
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize:14, fontWeight:600, color:'#111827', marginBottom:12, marginTop:0 }}>Profile Photo</p>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                          style={{ display:'flex', alignItems:'center', gap:6, background:'#16a34a', color:'#fff', border:'none', borderRadius:20, padding:'8px 20px', fontSize:13, fontWeight:600, cursor:uploading?'not-allowed':'pointer', fontFamily:"'DM Sans', sans-serif", opacity:uploading?0.7:1 }}>
                          📤 {uploading ? 'Uploading…' : 'Change Photo'}
                        </button>
                        <button type="button" onClick={openCamera} disabled={uploading}
                          style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', color:'#16a34a', border:'1.5px solid #16a34a', borderRadius:20, padding:'8px 20px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>
                          📷 Camera
                        </button>
                      </div>
                      <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>JPG, PNG, GIF or WEBP · Max 5 MB</p>
                      <input key={photo ?? 'no-photo'} ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display:'none' }}/>
                    </div>
                  </div>

                  {/* Fields */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px 24px', marginBottom:20 }}>
                    <div>
                      <label style={labelStyle}>Username</label>
                      <input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" style={inputStyle}
                        onFocus={e=>(e.currentTarget.style.borderColor='#16a34a')}
                        onBlur={e=>(e.currentTarget.style.borderColor='#e5e7eb')}/>
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter email" style={inputStyle}
                        onFocus={e=>(e.currentTarget.style.borderColor='#16a34a')}
                        onBlur={e=>(e.currentTarget.style.borderColor='#e5e7eb')}/>
                    </div>
                  </div>
                  <div style={{ marginBottom:32 }}>
                    <label style={labelStyle}>Role</label>
                    <input type="text" value={role || authUser.role || 'doctor'} readOnly
                      style={{ ...inputStyle, background:'#f9fafb', color:'#9ca3af', cursor:'not-allowed' }}/>
                  </div>

                  <button type="button" onClick={handleSaveProfile} disabled={saving}
                    style={{ display:'flex', alignItems:'center', gap:7, background:saving?'#86efac':'#16a34a', color:'#fff', border:'none', borderRadius:22, padding:'11px 30px', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:"'DM Sans', sans-serif", transition:'background 0.2s' }}>
                    {saving ? '⏳ Saving…' : '✓ Save Changes'}
                  </button>
                </div>
              )}

              {/* ══ PASSWORD TAB ══ */}
              {activeTab === 'password' && (
                <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
                  <div style={{ flex:1, background:'#fff', borderRadius:16, padding:'36px 40px', boxShadow:'0 1px 8px rgba(0,0,0,.07)' }}>
                    <h2 style={{ fontSize:22, fontWeight:700, color:'#0a2912', margin:'0 0 4px', fontFamily:"'Syne', sans-serif" }}>Change Password</h2>
                    <p style={{ fontSize:13, color:'#9ca3af', marginBottom:28, marginTop:4 }}>Your new password must meet all the requirements on the right.</p>

                    {[
                      { label:'Current Password',    value:currentPassword, setter:setCurrentPassword, show:showCurrent, toggle:()=>setShowCurrent(!showCurrent), placeholder:'Enter current password' },
                      { label:'New Password',         value:newPassword,     setter:setNewPassword,     show:showNew,     toggle:()=>setShowNew(!showNew),         placeholder:'Enter new password' },
                      { label:'Confirm New Password', value:confirmPassword, setter:setConfirmPassword, show:showConfirm, toggle:()=>setShowConfirm(!showConfirm), placeholder:'Confirm new password' },
                    ].map(({ label, value, setter, show, toggle, placeholder }, i) => (
                      <div key={label} style={{ marginBottom:i<2?18:32 }}>
                        <label style={labelStyle}>{label}</label>
                        <div style={{ position:'relative' }}>
                          <input type={show?'text':'password'} value={value} onChange={e=>setter(e.target.value)} placeholder={placeholder}
                            style={{ ...inputStyle, paddingRight:44 }}
                            onFocus={e=>(e.currentTarget.style.borderColor='#16a34a')}
                            onBlur={e=>(e.currentTarget.style.borderColor='#e5e7eb')}/>
                          <button type="button" onClick={toggle}
                            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'#9ca3af', padding:0, display:'flex' }}>
                            {show ? <EyeOff size={17}/> : <Eye size={17}/>}
                          </button>
                        </div>
                      </div>
                    ))}

                    <button type="button" onClick={handleChangePassword} disabled={changingPw}
                      style={{ display:'flex', alignItems:'center', gap:7, background:changingPw?'#86efac':'#16a34a', color:'#fff', border:'none', borderRadius:22, padding:'11px 30px', fontSize:13, fontWeight:700, cursor:changingPw?'not-allowed':'pointer', fontFamily:"'DM Sans', sans-serif", transition:'background 0.2s' }}>
                      {changingPw ? '⏳ Changing…' : '🔒 Change Password'}
                    </button>
                  </div>

                  {/* Requirements panel */}
                  <div style={{ width:220, background:'#f0fdf4', borderRadius:16, padding:'24px 20px', boxShadow:'0 1px 6px rgba(0,0,0,.06)', flexShrink:0, border:'1px solid #dcfce7' }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:16, marginTop:0 }}>Requirements</p>
                    {([
                      { met:req.length,  label:'At least 8 characters' },
                      { met:req.special, label:'One special char (!@#$%^&*?)' },
                      { met:req.number,  label:'One number' },
                      { met:req.match,   label:'Passwords match' },
                    ]).map(({ met, label }) => (
                      <div key={label} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:14 }}>
                        <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, marginTop:1, border:`2px solid ${met?'#16a34a':'#d1d5db'}`, background:met?'#16a34a':'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                          {met && <svg width="8" height="8" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ fontSize:12, color:met?'#16a34a':'#6b7280', fontWeight:met?700:400, fontFamily:"'DM Sans', sans-serif", lineHeight:1.4 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Camera modal */}
      {showCamera && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:480, overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.28)' }}>
            <div style={{ background:'linear-gradient(90deg, #0d3b1f, #16a34a)', padding:'16px 22px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ color:'#fff', fontWeight:700, fontSize:16, fontFamily:"'Syne', sans-serif" }}>📷 Take Photo</span>
              <button type="button" onClick={stopCamera} style={{ border:'none', background:'rgba(255,255,255,.2)', color:'#fff', width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:14 }}>✕</button>
            </div>
            <div style={{ padding:16 }}>
              <video ref={videoRef} autoPlay playsInline style={{ width:'100%', borderRadius:10, background:'#000', display:'block' }}/>
              <canvas ref={canvasRef} style={{ display:'none' }}/>
            </div>
            <div style={{ padding:'12px 22px', display:'flex', justifyContent:'flex-end', gap:10, borderTop:'1px solid #f0fdf4' }}>
              <button type="button" onClick={stopCamera} style={{ background:'#f3f4f6', color:'#374151', border:'none', borderRadius:20, padding:'8px 20px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>Cancel</button>
              <button type="button" onClick={capturePhoto} disabled={uploading} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:20, padding:'8px 22px', fontSize:13, fontWeight:600, cursor:uploading?'not-allowed':'pointer', fontFamily:"'DM Sans', sans-serif", opacity:uploading?0.7:1 }}>
                {uploading ? '⏳ Saving…' : '📷 Capture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:28, right:28, zIndex:2000, background:toastType==='success'?'#16a34a':'#ef4444', color:'#fff', borderRadius:12, padding:'12px 20px', fontSize:13, fontWeight:600, fontFamily:"'DM Sans', sans-serif", boxShadow:'0 8px 24px rgba(0,0,0,.18)', display:'flex', alignItems:'center', gap:8, animation:'slideUp 0.25s ease' }}>
          {toastType==='success'?'✓':'✕'} {toast}
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}