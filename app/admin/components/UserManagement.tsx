'use client'
import React, { useState, useEffect } from 'react'
import { UserPlus, Edit, Trash2, Search, Lock, Unlock, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
const roleMeta: Record<string, { color: string; bg: string }> = {
  Admin:                  { color: '#7c3aed', bg: '#ede9fe' },
  Doctor:                 { color: '#059669', bg: '#d1fae5' },
  Nurse:                  { color: '#db2777', bg: '#fce7f3' },
  Registrar:              { color: '#d97706', bg: '#fef3c7' },
  Pharmacist:             { color: '#2563eb', bg: '#dbeafe' },
  'Warehouse Staff':      { color: '#b45309', bg: '#fef9c3' },
  'Medical Technologist': { color: '#0891b2', bg: '#cffafe' },
}

interface UserAccount {
  id: string; username: string; email: string; role: string
  status: 'active' | 'inactive' | 'suspended'
  last_login: string; created_at: string; avatar_url?: string
}

function RoleBadge({ role }: { role: string }) {
  const m = roleMeta[role] || { color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 20, border: `1px solid ${m.color}30` }}>{role}</span>
  )
}

export default function UserManagement({ darkMode }: { darkMode: boolean }) {
  const card   = darkMode ? 'rgba(10,26,13,0.9)' : '#fff'
  const border = darkMode ? 'rgba(77,184,106,0.12)' : 'rgba(26,122,26,0.1)'
  const txt    = darkMode ? '#d1fae5' : '#0d2e0d'
  const sub    = darkMode ? '#4db86a' : '#1a7a1a'

  const [users,       setUsers]       = useState<UserAccount[]>([])
  const [userSearch,  setUserSearch]  = useState('')
  const [roleFilter,  setRoleFilter]  = useState('All')
  const [showAdd,     setShowAdd]     = useState(false)
  const [editUser,    setEditUser]    = useState<UserAccount | null>(null)
  const [newUser,     setNewUser]     = useState({ username:'', email:'', role:'Nurse', password:'' })
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState<{ text:string; ok:boolean } | null>(null)

  const fetchUsers = async () => {
    const { data } = await supabase.from('users')
      .select('user_id, username, email, role, status, last_login, created_at, avatar_url')
      .order('created_at', { ascending: false })
    if (data) setUsers(data.map((u: any) => ({
      id: u.user_id||u.id, username: u.username||'', email: u.email||'',
      role: u.role||'Registrar', status: u.status||'active',
      last_login: u.last_login||'', created_at: u.created_at||'', avatar_url: u.avatar_url,
    })))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleAdd = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setMsg({ text:'Please fill all fields.', ok:false }); return
    }
    setSaving(true)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: newUser.email, password: newUser.password, email_confirm: true,
    })
    if (authErr) { setMsg({ text: authErr.message, ok:false }); setSaving(false); return }
    const { error: dbErr } = await supabase.from('users').insert({
      user_id: authData.user.id, username: newUser.username,
      email: newUser.email, role: newUser.role, status: 'active',
    })
    if (dbErr) { setMsg({ text: dbErr.message, ok:false }); setSaving(false); return }
    setMsg({ text:`User "${newUser.username}" created!`, ok:true })
    setNewUser({ username:'', email:'', role:'Nurse', password:'' })
    setShowAdd(false); setSaving(false); fetchUsers()
  }

  const handleUpdate = async () => {
    if (!editUser) return
    setSaving(true)
    const { error } = await supabase.from('users')
      .update({ username: editUser.username, role: editUser.role, status: editUser.status })
      .eq('user_id', editUser.id)
    if (error) setMsg({ text: error.message, ok:false })
    else { setMsg({ text:'User updated!', ok:true }); setEditUser(null); fetchUsers() }
    setSaving(false)
  }

  const handleToggleStatus = async (u: UserAccount) => {
    const s = u.status === 'active' ? 'suspended' : 'active'
    await supabase.from('users').update({ status: s }).eq('user_id', u.id)
    fetchUsers()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    await supabase.from('users').delete().eq('user_id', id)
    fetchUsers()
  }

  const filtered = users.filter(u => {
    const s = u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
    return s && (roleFilter === 'All' || u.role === roleFilter)
  })

  const inputStyle: React.CSSProperties = {
    width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:9,
    border:`1px solid ${border}`, background: darkMode?'rgba(255,255,255,0.05)':'#f4fbf4',
    color:txt, fontSize:13, outline:'none',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:txt }}>User Management</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:sub }}>Add, edit, and manage system user accounts</p>
        </div>
        <button onClick={() => { setShowAdd(true); setMsg(null) }}
          style={{ background:'linear-gradient(135deg,#1a7a1a,#26a326)', color:'#fff', border:'none',
            borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 14px rgba(26,122,26,0.35)' }}>
          <UserPlus size={15}/> Add User
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div style={{ background: msg.ok?'#f0fdf4':'#fef2f2', border:`1px solid ${msg.ok?'#86efac':'#fca5a5'}`,
          borderRadius:10, padding:'10px 16px', fontSize:13, color: msg.ok?'#15803d':'#dc2626',
          display:'flex', alignItems:'center', gap:8 }}>
          {msg.ok ? <CheckCircle size={15}/> : <XCircle size={15}/>} {msg.text}
        </div>
      )}

      {/* Add / Edit Form */}
      {(showAdd || editUser) && (
        <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:24,
          boxShadow: darkMode?'0 4px 24px rgba(0,0,0,0.4)':'0 4px 24px rgba(26,122,26,0.1)' }}>
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800, color:txt }}>
            {editUser ? 'Edit User' : 'Create New User Account'}
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { label:'Username', key:'username', type:'text',     placeholder:'e.g. juan.dela.cruz' },
              { label:'Email',    key:'email',    type:'email',    placeholder:'e.g. juan@rhu.gov.ph' },
              ...(!editUser ? [{ label:'Password', key:'password', type:'password', placeholder:'Temporary password' }] : []),
            ].map(f => (
              <div key={f.key}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:sub, marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={editUser ? (editUser as any)[f.key] : (newUser as any)[f.key]}
                  onChange={e => editUser ? setEditUser({ ...editUser, [f.key]: e.target.value }) : setNewUser({ ...newUser, [f.key]: e.target.value })}
                  style={inputStyle}/>
              </div>
            ))}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:sub, marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Role</label>
              <select value={editUser ? editUser.role : newUser.role}
                onChange={e => editUser ? setEditUser({ ...editUser, role: e.target.value }) : setNewUser({ ...newUser, role: e.target.value })}
                style={inputStyle}>
                {['Admin','Doctor','Nurse','Registrar','Pharmacist','Warehouse Staff','Medical Technologist'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {editUser && (
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:sub, marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Status</label>
                <select value={editUser.status} onChange={e => setEditUser({ ...editUser, status: e.target.value as any })} style={inputStyle}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button onClick={editUser ? handleUpdate : handleAdd} disabled={saving}
              style={{ background:'linear-gradient(135deg,#1a7a1a,#26a326)', color:'#fff', border:'none',
                borderRadius:9, padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer', opacity: saving?0.6:1 }}>
              {saving ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditUser(null); setMsg(null) }}
              style={{ background:'transparent', color:sub, border:`1px solid ${border}`, borderRadius:9, padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} color={sub} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}/>
          <input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft:34 }}/>
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={inputStyle}>
          {['All','Admin','Doctor','Nurse','Registrar','Pharmacist','Warehouse Staff','Medical Technologist'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, overflow:'hidden',
        boxShadow: darkMode?'0 4px 24px rgba(0,0,0,0.3)':'0 2px 16px rgba(26,122,26,0.06)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${border}` }}>
              {['User','Role','Status','Last Login','Actions'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:sub, textTransform:'uppercase', letterSpacing:0.8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:sub, fontSize:13 }}>No users found</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom:`1px solid ${border}`, transition:'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = darkMode?'rgba(26,122,26,0.05)':'rgba(26,122,26,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1a7a1a,#26a326)',
                      display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:800, flexShrink:0, overflow:'hidden' }}>
                      {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : u.username.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:txt }}>{u.username}</div>
                      <div style={{ fontSize:11, color:sub }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'12px 16px' }}><RoleBadge role={u.role}/></td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                    background: u.status==='active'?'#d1fae5':u.status==='suspended'?'#fee2e2':'#f3f4f6',
                    color: u.status==='active'?'#059669':u.status==='suspended'?'#dc2626':'#6b7280' }}>
                    {u.status}
                  </span>
                </td>
                <td style={{ padding:'12px 16px', fontSize:12, color:sub }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString('en-PH') : '—'}
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => { setEditUser(u); setShowAdd(false); setMsg(null) }}
                      title="Edit" style={{ background:'#dcfce7', color:'#15803d', border:'none', borderRadius:7, padding:'5px 8px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                      <Edit size={13}/>
                    </button>
                    <button onClick={() => handleToggleStatus(u)}
                      title={u.status==='active'?'Suspend':'Activate'}
                      style={{ background: u.status==='active'?'#fef3c7':'#dcfce7', color: u.status==='active'?'#d97706':'#15803d', border:'none', borderRadius:7, padding:'5px 8px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                      {u.status==='active' ? <Lock size={13}/> : <Unlock size={13}/>}
                    </button>
                    <button onClick={() => handleDelete(u.id)}
                      title="Delete" style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:7, padding:'5px 8px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}