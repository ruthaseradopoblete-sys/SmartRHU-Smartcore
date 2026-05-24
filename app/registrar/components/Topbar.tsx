'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Upload, X, Check, AlertCircle, ChevronLeft, UserCircle, KeyRound, Settings } from 'lucide-react'

interface TopbarProps {
  darkMode: boolean
  setDarkMode: (v: (d: boolean) => boolean) => void
  onNavigate?: (menu: string) => void
}

interface FollowUpNotif {
  id: string
  patient_name: string
  follow_up_date: string
  notes: string | null
  status: string
}

export default function Topbar({ darkMode, setDarkMode, onNavigate }: TopbarProps) {
  const { user } = useAuth()

  const [profileName,   setProfileName]   = useState('')
  const [profileRole,   setProfileRole]   = useState('Registrar')
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)
  const [profileEmail,  setProfileEmail]  = useState('')
  const [time,          setTime]          = useState('')
  const [showProfile,   setShowProfile]   = useState(false)
  const [showNotif,     setShowNotif]     = useState(false)

  // ── Dropdown view: 'menu' | 'profile' | 'password' ──────────────────────
  const [dropView, setDropView] = useState<'menu'|'profile'|'password'>('menu')

  // profile display (read from DB)
  const [profileFirstName, setProfileFirstName] = useState('')
  const [profileLastName,  setProfileLastName]  = useState('')
  const [profileMiddle,    setProfileMiddle]     = useState('')
  const [profileStatus,    setProfileStatus]     = useState('')
  const [profileLicense,   setProfileLicense]   = useState('')

  // profile edit
  const [editUsername,   setEditUsername]   = useState('')
  const [editEmail,      setEditEmail]      = useState('')
  const [editPhoto,      setEditPhoto]      = useState<string|null>(null)
  const [savingProfile,  setSavingProfile]  = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurPw, setShowCurPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConPw, setShowConPw] = useState(false)
  const [savingPw,  setSavingPw]  = useState(false)

  // toast
  const [toast,   setToast]   = useState('')
  const [toastOk, setToastOk] = useState(true)
  const [uid,     setUid]     = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // notifications
  const [notifList,  setNotifList]  = useState<FollowUpNotif[]>([])
  const [notifCount, setNotifCount] = useState(0)

  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef   = useRef<HTMLDivElement>(null)

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const id = session?.user?.id
    if (!id) return
    setUid(id)
    const { data } = await supabase.from('users')
      .select('username, email, avatar_url, role, first_name, middle_name, last_name, status, user_license')
      .eq('user_id', id).single()
    if (data) {
      setProfileName(data.username   || data.first_name || '')
      setProfileEmail(data.email     || '')
      setProfileRole(data.role       || 'Registrar')
      setProfileFirstName(data.first_name  || '')
      setProfileLastName(data.last_name    || '')
      setProfileMiddle(data.middle_name    || '')
      setProfileStatus(data.status         || 'active')
      setProfileLicense(data.user_license  || '')
      if (data.avatar_url) setProfileAvatar(data.avatar_url)
      setEditUsername(data.username  || '')
      setEditEmail(data.email        || '')
      setEditPhoto(data.avatar_url   || null)
    }
  }

  const fetchNotifs = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('follow_up_schedules')
      .select('id, patient_name, follow_up_date, notes, status')
      .eq('follow_up_date', today).eq('status', 'pending')
      .order('follow_up_date', { ascending: true })
    const rows = (data ?? []) as FollowUpNotif[]
    setNotifList(rows); setNotifCount(rows.length)
  }

  useEffect(() => { fetchProfile(); fetchNotifs() }, [])

  useEffect(() => {
    const fn = () => fetchProfile()
    window.addEventListener('profileUpdated', fn)
    window.addEventListener('avatarUpdated',  fn)
    return () => { window.removeEventListener('profileUpdated', fn); window.removeEventListener('avatarUpdated', fn) }
  }, [])

  useEffect(() => {
    const ch = supabase.channel('topbar_notif')
      .on('postgres_changes', { event:'*', schema:'public', table:'follow_up_schedules' }, () => fetchNotifs())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => {
    const fn = () => fetchNotifs()
    window.addEventListener('followUpUpdated', fn)
    return () => window.removeEventListener('followUpUpdated', fn)
  }, [])

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit' }))
    tick(); const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false); setDropView('menu')
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fullName      = [profileFirstName, profileLastName].filter(Boolean).join(' ')
  const displayName   = fullName || profileName || user?.name || 'Registrar'
  const displayRole   = profileRole   || user?.role  || 'Registrar'
  const displayEmail  = profileEmail  || user?.email || ''
  const displayAvatar = profileAvatar || null
  const initials = displayName.split(' ').map((w:string) => w[0]).join('').toUpperCase().slice(0,2) || 'R'

  const showToast = (msg: string, ok: boolean) => {
    setToast(msg); setToastOk(ok)
    setTimeout(() => setToast(''), 3000)
  }

  const openDrop = (view: 'menu'|'profile'|'password') => {
    if (view === 'profile') {
      setEditUsername(profileName); setEditEmail(profileEmail); setEditPhoto(profileAvatar)
    }
    if (view === 'password') {
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    }
    setDropView(view); setShowProfile(true)
  }

  const handleSaveProfile = async () => {
    if (!editUsername.trim() || !editEmail.trim()) { showToast('Fill in all fields.', false); return }
    if (!uid) { showToast('Not logged in.', false); return }
    setSavingProfile(true)
    const { error } = await supabase.from('users')
      .update({ username: editUsername.trim(), email: editEmail.trim() })
      .eq('user_id', uid)
    setSavingProfile(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    setProfileName(editUsername.trim()); setProfileEmail(editEmail.trim())
    window.dispatchEvent(new Event('profileUpdated'))
    showToast('Profile saved!', true)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? uid
    if (!userId) { showToast('Not logged in.', false); return }
    if (file.size > 5*1024*1024) { showToast('Max 5 MB.', false); return }
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/avatar_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert:true, contentType:file.type })
    if (upErr) { showToast('Upload failed.', false); setUploadingPhoto(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData?.publicUrl
    if (!url) { showToast('Could not get URL.', false); setUploadingPhoto(false); return }
    await supabase.from('users').update({ avatar_url: url }).eq('user_id', userId)
    const busted = url + '?t=' + Date.now()
    setEditPhoto(busted); setProfileAvatar(busted)
    window.dispatchEvent(new Event('avatarUpdated'))
    showToast('Photo updated!', true)
    setUploadingPhoto(false); e.target.value = ''
  }

  const pwConds = {
    length:  newPw.length >= 8,
    special: /[!@#$%^&*?]/.test(newPw),
    number:  /[0-9]/.test(newPw),
    match:   newPw === confirmPw && confirmPw.length > 0,
  }

  const handleChangePassword = async () => {
    if (!currentPw)       { showToast('Enter current password.', false); return }
    if (!pwConds.length)  { showToast('Min 8 characters.', false); return }
    if (!pwConds.special) { showToast('Add a special character.', false); return }
    if (!pwConds.number)  { showToast('Add a number.', false); return }
    if (!pwConds.match)   { showToast('Passwords do not match.', false); return }
    setSavingPw(true)
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: displayEmail, password: currentPw })
    if (signErr) { showToast('Current password is incorrect.', false); setSavingPw(false); return }
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (updErr) { showToast('Error: ' + updErr.message, false); return }
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    showToast('Password changed!', true)
  }

  const iconBtn: React.CSSProperties = {
    background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%',
    width:38, height:38, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
    position:'relative', flexShrink:0, transition:'background 0.15s',
  }

  const AvatarCircle = ({ size=32, fontSize=13, src=displayAvatar }: { size?:number; fontSize?:number; src?:string|null }) => (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0, overflow:'hidden',
      background:'linear-gradient(135deg,#2ea82e,#0d9488)',
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:800, fontSize,
      border:'2px solid rgba(255,255,255,0.25)',
    }}>
      {src ? <img src={src} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials}
    </div>
  )

  function notifTimeLabel(iso: string) {
    const d = new Date(iso); const today = new Date(); today.setHours(0,0,0,0)
    const diff = Math.round((d.setHours(0,0,0,0) - today.getTime()) / 86400000)
    if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow'
    if (diff === -1) return 'Yesterday'; if (diff > 1) return `In ${diff} days`
    return `${Math.abs(diff)}d ago`
  }

  // ── Shared input style ─────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width:'100%', boxSizing:'border-box', padding:'9px 12px',
    borderRadius:9, border:'1.5px solid #e5e7eb',
    background:'#f9fafb', color:'#1f2937', fontSize:12, outline:'none',
  }
  const lbl: React.CSSProperties = {
    display:'block', fontSize:10, fontWeight:700, color:'#9ca3af',
    textTransform:'uppercase', letterSpacing:0.6, marginBottom:4,
  }
  const saveBtn: React.CSSProperties = {
    width:'100%', padding:'10px', borderRadius:10, border:'none',
    background:'linear-gradient(135deg,#16a34a,#0d9488)',
    color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
    boxShadow:'0 4px 12px #16a34a33',
  }

  return (
    <>
    <header style={{
      background:'#1b3a1b', height:64,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 24px', position:'sticky', top:0, zIndex:40,
      boxShadow:'0 1px 6px rgba(0,0,0,0.25)', gap:16,
    }}>
      <div style={{flex:1}}/>

      <div style={{display:'flex', alignItems:'center', gap:10, flexShrink:0}}>

        {/* Clock */}
        <div style={{
          color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:600,
          letterSpacing:0.5, whiteSpace:'nowrap',
          background:'rgba(255,255,255,0.07)', borderRadius:20, padding:'5px 14px',
          fontVariantNumeric:'tabular-nums',
        }}>{time}</div>

        {/* Notification bell */}
        <div ref={notifRef} style={{position:'relative'}}>
          <button onClick={() => setShowNotif(p => !p)} style={iconBtn}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.18)')}
            onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.1)')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span style={{
                position:'absolute', top:4, right:4, width:16, height:16, borderRadius:'50%',
                background:'#dc2626', color:'#fff', fontSize:9, fontWeight:800,
                display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #1b3a1b',
              }}>{notifCount > 9 ? '9+' : notifCount}</span>
            )}
          </button>
          {showNotif && (
            <div style={{position:'absolute',right:0,top:'calc(100% + 10px)',background:'#fff',borderRadius:16,width:320,boxShadow:'0 8px 32px rgba(0,0,0,0.18)',overflow:'hidden',zIndex:100}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid #f0fdf4',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f0fdf4'}}>
                <div>
                  <span style={{fontWeight:800,fontSize:13,color:'#1b3a1b'}}>Follow-up Alerts</span>
                  <span style={{marginLeft:8,fontSize:10,color:'#16a34a',fontWeight:700}}>Today</span>
                </div>
                {notifCount > 0 && <span style={{background:'#dcfce7',color:'#166534',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{notifCount} pending</span>}
              </div>
              <div style={{maxHeight:300,overflowY:'auto'}}>
                {notifList.length === 0 ? (
                  <div style={{padding:'28px 16px',textAlign:'center'}}>
                    <div style={{fontSize:28,marginBottom:8}}>✅</div>
                    <div style={{fontSize:13,fontWeight:600,color:'#166534'}}>No follow-ups today</div>
                    <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>All caught up!</div>
                  </div>
                ) : notifList.map((n, i) => (
                  <div key={n.id}
                    style={{padding:'11px 16px',display:'flex',gap:10,alignItems:'flex-start',borderBottom:i<notifList.length-1?'1px solid #f9fafb':'none',cursor:'pointer',transition:'background 0.1s'}}
                    onClick={()=>{setShowNotif(false);onNavigate?.('FollowUp')}}
                    onMouseEnter={e=>(e.currentTarget.style.background='#f0fdf4')}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                    <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,#16a34a,#0d9488)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:11}}>
                      {n.patient_name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#1f2937',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{n.patient_name}</div>
                      <div style={{fontSize:11,color:'#6b7280',marginTop:1}}>Follow-up · {notifTimeLabel(n.follow_up_date)}</div>
                      {n.notes && <div style={{fontSize:10,color:'#854d0e',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:4,padding:'2px 6px',marginTop:3,display:'inline-block'}}>{n.notes}</div>}
                    </div>
                    <div style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,background:'#fef9c3',color:'#854d0e',flexShrink:0,textTransform:'uppercase'}}>Pending</div>
                  </div>
                ))}
              </div>
              <div style={{padding:'10px 16px',textAlign:'center',borderTop:'1px solid #f0fdf4',background:'#fafafa'}}>
                <span onClick={()=>{setShowNotif(false);onNavigate?.('FollowUp')}} style={{fontSize:12,color:'#16a34a',fontWeight:700,cursor:'pointer'}}>View all follow-ups →</span>
              </div>
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button onClick={() => setDarkMode(d => !d)} style={iconBtn}
          onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.18)')}
          onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.1)')}>
          {darkMode
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          }
        </button>

        {/* ── User pill ── */}
        <div ref={profileRef} style={{position:'relative'}}>
          <div onClick={() => { setShowProfile(p => !p); setDropView('menu') }}
            style={{
              display:'flex', alignItems:'center', gap:9,
              background:'rgba(255,255,255,0.12)', borderRadius:50,
              padding:'5px 16px 5px 5px', cursor:'pointer',
              border: showProfile ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              transition:'all 0.15s',
            }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.18)')}
            onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.12)')}
          >
            <AvatarCircle size={32} fontSize={13}/>
            <div>
              <div style={{color:'#fff',fontWeight:600,fontSize:13,lineHeight:1.2,whiteSpace:'nowrap',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>{displayName}</div>
              <div style={{color:'rgba(255,255,255,0.55)',fontSize:10,textTransform:'uppercase',letterSpacing:0.5}}>{displayRole}</div>
            </div>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
              style={{marginLeft:2,transform:showProfile?'rotate(180deg)':'rotate(0)',transition:'transform 0.2s'}}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {/* ── Dropdown panel ── */}
          {showProfile && (
            <div style={{
              position:'absolute', right:0, top:'calc(100% + 10px)',
              background:'#fff', borderRadius:16, width:280,
              boxShadow:'0 8px 32px rgba(0,0,0,0.18)', overflow:'hidden', zIndex:100,
            }}>

              {/* ── VIEW: menu ── */}
              {dropView === 'menu' && (
                <>
                  {/* Profile header card */}
                  <div style={{padding:'16px',background:'linear-gradient(135deg,#1b3a1b,#2d5a2d)',display:'flex',alignItems:'center',gap:12}}>
                    <AvatarCircle size={44} fontSize={16}/>
                    <div style={{minWidth:0}}>
                      <div style={{color:'#fff',fontWeight:700,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{displayName}</div>
                      <div style={{color:'rgba(255,255,255,0.55)',fontSize:10,textTransform:'uppercase',letterSpacing:0.5,marginTop:1}}>{displayRole}</div>
                      {displayEmail && <div style={{color:'rgba(255,255,255,0.4)',fontSize:10,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{displayEmail}</div>}
                    </div>
                  </div>
                  {/* Menu items */}
                  <div style={{padding:'6px 0'}}>
                    {[
                      { icon: UserCircle, label:'My Profile',      sub:'View and edit profile',   action: ()=>openDrop('profile')  },
                      { icon: KeyRound,   label:'Change Password', sub:'Update your password',    action: ()=>openDrop('password') },
                      { icon: Settings,   label:'Settings',        sub:'App preferences',         action: ()=>{ setShowProfile(false); onNavigate?.('Settings') } },
                    ].map((item, i) => (
                      <div key={i} onClick={item.action}
                        style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',cursor:'pointer',transition:'background 0.12s'}}
                        onMouseEnter={e=>(e.currentTarget.style.background='#f0fdf4')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <div style={{width:34,height:34,borderRadius:10,background:'#f0fdf4',border:'1px solid #dcfce7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <item.icon size={16} color="#16a34a" strokeWidth={2}/>
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:'#1f2937'}}>{item.label}</div>
                          <div style={{fontSize:11,color:'#9ca3af',marginTop:1}}>{item.sub}</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{flexShrink:0,marginLeft:'auto'}}><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── VIEW: profile ── */}
              {dropView === 'profile' && (
                <>
                  {/* Back header */}
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px',borderBottom:'1px solid #f3f4f6',background:'#fafafa',flexShrink:0}}>
                    <button onClick={()=>setDropView('menu')} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',display:'flex',padding:4,borderRadius:6}}>
                      <ChevronLeft size={16}/>
                    </button>
                    <span style={{fontWeight:700,fontSize:13,color:'#1f2937'}}>My Profile</span>
                  </div>

                  <div style={{maxHeight:480,overflowY:'auto'}}>
                    <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:12}}>

                      {/* ── Avatar + name banner ── */}
                      <div style={{display:'flex',alignItems:'center',gap:12,background:'linear-gradient(135deg,#f0fdf4,#ecfdf5)',borderRadius:12,padding:'12px'}}>
                        <div style={{position:'relative',flexShrink:0}}>
                          <div style={{width:60,height:60,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#16a34a,#0d9488)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:20,border:'3px solid #fff',boxShadow:'0 2px 8px #16a34a33'}}>
                            {editPhoto
                              ? <img src={editPhoto} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                              : initials}
                          </div>
                          <button onClick={()=>fileRef.current?.click()} disabled={uploadingPhoto}
                            title="Change photo"
                            style={{position:'absolute',bottom:-2,right:-2,width:20,height:20,borderRadius:'50%',border:'2px solid #fff',background:'#16a34a',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:uploadingPhoto?0.6:1}}>
                            <Upload size={10} color="#fff"/>
                          </button>
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:800,color:'#1f2937',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {[profileFirstName, profileMiddle, profileLastName].filter(Boolean).join(' ') || displayName}
                          </div>
                          <div style={{fontSize:10,color:'#16a34a',fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,marginTop:1}}>{displayRole}</div>
                          {/* Status badge */}
                          <div style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:4,background:profileStatus==='active'?'#dcfce7':'#fee2e2',borderRadius:20,padding:'2px 8px'}}>
                            <div style={{width:5,height:5,borderRadius:'50%',background:profileStatus==='active'?'#16a34a':'#dc2626'}}/>
                            <span style={{fontSize:9,fontWeight:700,color:profileStatus==='active'?'#166534':'#991b1b',textTransform:'uppercase',letterSpacing:0.4}}>
                              {profileStatus || 'active'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Read-only info fields ── */}
                      <div style={{background:'#f9fafb',borderRadius:10,padding:'10px 12px',display:'flex',flexDirection:'column',gap:8}}>
                        <div style={{fontSize:10,fontWeight:800,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.8,marginBottom:2}}>Account Info</div>
                        {[
                          ['Full Name', [profileFirstName, profileMiddle, profileLastName].filter(Boolean).join(' ') || '—'],
                          ['Email',     displayEmail || '—'],
                          ['Role',      displayRole  || '—'],
                          ...(profileLicense ? [['License No.', profileLicense]] : []),
                        ].map(([label, value]) => (
                          <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                            <span style={{fontSize:11,color:'#9ca3af',fontWeight:600,flexShrink:0}}>{label}</span>
                            <span style={{fontSize:11,color:'#1f2937',fontWeight:600,textAlign:'right',wordBreak:'break-all'}}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* ── Editable fields ── */}
                      <div style={{fontSize:10,fontWeight:800,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.8}}>Edit Profile</div>
                      <div>
                        <label style={lbl}>Username</label>
                        <input type="text" value={editUsername} onChange={e=>setEditUsername(e.target.value)} style={inp}
                          onFocus={e=>(e.currentTarget.style.borderColor='#16a34a')}
                          onBlur={e=>(e.currentTarget.style.borderColor='#e5e7eb')}/>
                      </div>
                      <div>
                        <label style={lbl}>Email</label>
                        <input type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} style={inp}
                          onFocus={e=>(e.currentTarget.style.borderColor='#16a34a')}
                          onBlur={e=>(e.currentTarget.style.borderColor='#e5e7eb')}/>
                      </div>

                      <button onClick={handleSaveProfile} disabled={savingProfile}
                        style={{...saveBtn,opacity:savingProfile?0.7:1}}>
                        <Check size={13}/> {savingProfile?'Saving…':'Save Changes'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ── VIEW: password ── */}
              {dropView === 'password' && (
                <>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px',borderBottom:'1px solid #f3f4f6',background:'#fafafa'}}>
                    <button onClick={()=>setDropView('menu')} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',display:'flex',padding:4,borderRadius:6}}>
                      <ChevronLeft size={16}/>
                    </button>
                    <span style={{fontWeight:700,fontSize:13,color:'#1f2937'}}>Change Password</span>
                  </div>
                  <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:12}}>
                    {/* Password fields */}
                    {[
                      {lbl:'Current Password', val:currentPw, set:setCurrentPw, show:showCurPw, tog:()=>setShowCurPw(p=>!p)},
                      {lbl:'New Password',     val:newPw,     set:setNewPw,     show:showNewPw, tog:()=>setShowNewPw(p=>!p)},
                      {lbl:'Confirm Password', val:confirmPw, set:setConfirmPw, show:showConPw, tog:()=>setShowConPw(p=>!p)},
                    ].map(({lbl:l,val,set,show,tog})=>(
                      <div key={l}>
                        <label style={lbl}>{l}</label>
                        <div style={{position:'relative'}}>
                          <input type={show?'text':'password'} value={val} onChange={e=>set(e.target.value)}
                            style={{...inp,paddingRight:36}}
                            onFocus={e=>(e.currentTarget.style.borderColor='#16a34a')}
                            onBlur={e=>(e.currentTarget.style.borderColor='#e5e7eb')}/>
                          <button onClick={tog} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#9ca3af',display:'flex',padding:0}}>
                            {show ? <EyeOff size={14}/> : <Eye size={14}/>}
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Mini requirements */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 8px'}}>
                      {[
                        [pwConds.length,  '8+ chars'],
                        [pwConds.special, 'Special char'],
                        [pwConds.number,  'Number'],
                        [pwConds.match,   'Match'],
                      ].map(([met,label])=>(
                        <div key={String(label)} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:met?'#16a34a':'#9ca3af',fontWeight:600}}>
                          <div style={{width:14,height:14,borderRadius:'50%',background:met?'#16a34a':'transparent',border:`1.5px solid ${met?'#16a34a':'#d1d5db'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {met && <Check size={8} color="#fff" strokeWidth={3}/>}
                          </div>
                          {label}
                        </div>
                      ))}
                    </div>
                    <button onClick={handleChangePassword} disabled={savingPw}
                      style={{...saveBtn,opacity:savingPw?0.7:1}}>
                      🔒 {savingPw?'Saving…':'Change Password'}
                    </button>
                  </div>
                </>
              )}

            </div>
          )}
        </div>

      </div>
    </header>

    {/* hidden file input */}
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handlePhotoUpload} style={{display:'none'}}/>

    {/* Toast */}
    {toast && (
      <div style={{
        position:'fixed',bottom:24,right:24,zIndex:9999,
        background:toastOk?'linear-gradient(135deg,#16a34a,#0d9488)':'linear-gradient(135deg,#dc2626,#b91c1c)',
        color:'#fff',borderRadius:12,padding:'12px 18px',
        display:'flex',alignItems:'center',gap:8,fontWeight:700,fontSize:13,
        boxShadow:`0 8px 24px ${toastOk?'#16a34a':'#dc2626'}55`,
      }}>
        {toastOk ? <Check size={15}/> : <AlertCircle size={15}/>}
        {toast}
      </div>
    )}
    </>
  )
}