'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw, Clock, AlertCircle } from 'lucide-react'

/*
  ══════════════════════════════════════════════════════════════
  SYSTEM ACTIVITIES — What you need in Supabase:
  ══════════════════════════════════════════════════════════════

  Create this table in your Supabase SQL editor:

  CREATE TABLE audit_logs (
    id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       uuid REFERENCES auth.users(id),
    user_name     text,
    user_role     text,
    action        text NOT NULL,        -- e.g. 'LOGIN', 'REGISTER_PATIENT', 'VIEW_LAB_RESULT'
    module        text,                 -- e.g. 'Auth', 'Patient Records', 'Lab Records'
    description   text,                -- e.g. 'Registered patient: Juan Dela Cruz'
    status        text DEFAULT 'success', -- 'success' | 'warning' | 'error'
    ip_address    text,
    created_at    timestamptz DEFAULT now()
  );

  Then in your other components, call this helper whenever an action happens:

  // utils/auditLog.ts
  export async function logAction(params: {
    user_name: string; user_role: string; action: string;
    module: string; description?: string; status?: string
  }) {
    await supabase.from('audit_logs').insert({
      ...params,
      status: params.status || 'success',
    })
  }

  Example usage in Registrar (RegisterPatient):
    await logAction({ user_name:'Maria Santos', user_role:'Registrar',
      action:'REGISTER_PATIENT', module:'Patient Records',
      description:`Registered: ${firstName} ${lastName}` })

  Example usage in Auth (login):
    await logAction({ user_name: email, user_role: role,
      action:'LOGIN', module:'Auth', description:`${role} logged in` })
  ══════════════════════════════════════════════════════════════
*/

interface SystemLog {
  id: string; user_name: string; user_role: string
  action: string; module: string; description?: string
  timestamp: string; status: 'success'|'warning'|'error'; ip_address: string
}

const G = '#1a7a1a'
const PER_PAGE = 20

const ACTION_LABELS: Record<string, string> = {
  // General
  LOGIN:               'Logged in',
  LOGOUT:              'Logged out',
  FAILED_LOGIN:        'Failed login attempt',
  CHANGE_PASSWORD:     'Changed password',
  // Registrar
  REGISTER_PATIENT:    'Registered patient',
  VIEW_PATIENT:        'Viewed patient record',
  EDIT_PATIENT:        'Edited patient record',
  // Doctor / Nurse — consultations & requests
  CONSULTATION:        'Conducted consultation',
  SEND_PRESCRIPTION:   'Sent prescription',
  SEND_LAB_REQUEST:    'Sent lab request',
  SEND_VACCINE_REQUEST:'Sent vaccine request',
  VACCINATE:           'Administered vaccine',
  // Laboratory / Medtech
  UPLOAD_LAB:          'Uploaded lab result',
  SEND_LAB_RESULT:     'Sent lab result to doctor',
  SEND_LAB:            'Sent lab result to doctor',
  // Pharmacy
  DISPENSE_MEDICINE:   'Dispensed medicine',
  REQUEST_WAREHOUSE:   'Requested stock from warehouse',
  // Warehouse
  SEND_TO_PHARMACY:    'Sent medicine to pharmacy',
  // Nurse → pharmacy
  REQUEST_PHARMACY:    'Requested medicine from pharmacy',
  // Inventory (general)
  ADD_MEDICINE:        'Added medicine to inventory',
  UPDATE_STOCK:        'Updated stock level',
  // Admin
  ADD_USER:            'Created user account',
  EDIT_USER:           'Updated user account',
  DELETE_USER:         'Deleted user account',
  SUSPEND_USER:        'Suspended user account',
  ACTIVATE_USER:       'Activated user account',
  BACKUP:              'Performed system backup',
  RESTORE:             'Restored system data',
  GENERATE_REPORT:     'Generated report',
}

export default function SystemActivities({ darkMode }: { darkMode: boolean }) {
  const dk   = darkMode
  const bg   = dk ? '#0d1a0f' : '#f0f4f1'
  const card = dk ? '#0f2014' : '#ffffff'
  const bdr  = dk ? '#1a3d24' : '#e5e7eb'
  const txt  = dk ? '#e2f5e9' : '#1f2937'
  const txt2 = dk ? '#6ee7b7' : '#6b7280'

  const [logs,         setLogs]         = useState<SystemLog[]>([])
  const [loading,      setLoading]      = useState(true)
  const [noTable,      setNoTable]      = useState(false)
  const [roleFilter,   setRoleFilter]   = useState('All')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)

  const roles = ['All','Admin','Doctor','Nurse','Registrar','Pharmacist','Warehouse Staff','Medical Technologist']

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error || !data) {
      setNoTable(true)
      // Fallback mock data
      setLogs([
        { id:'1', user_name:'Admin',          user_role:'Admin',             action:'LOGIN',            module:'Auth',           description:'Admin logged in',                    timestamp:new Date(Date.now()-60000).toISOString(),    status:'success', ip_address:'192.168.1.1' },
        { id:'2', user_name:'Maria Santos',   user_role:'Registrar',         action:'REGISTER_PATIENT', module:'Patient Records', description:'Registered patient: Juan Dela Cruz', timestamp:new Date(Date.now()-300000).toISOString(),   status:'success', ip_address:'192.168.1.3' },
        { id:'3', user_name:'Dr. Reyes',      user_role:'Doctor',            action:'LOGIN',            module:'Auth',           description:'Doctor logged in',                   timestamp:new Date(Date.now()-600000).toISOString(),   status:'success', ip_address:'192.168.1.5' },
        { id:'4', user_name:'Unknown',        user_role:'—',                 action:'FAILED_LOGIN',     module:'Auth',           description:'Failed login: admin@rhu.gov.ph',     timestamp:new Date(Date.now()-900000).toISOString(),   status:'error',   ip_address:'203.0.113.42' },
        { id:'5', user_name:'Med. Tech Cruz', user_role:'Medical Technologist', action:'UPLOAD_LAB',   module:'Lab Records',    description:'Uploaded CBC result for patient #101',timestamp:new Date(Date.now()-1800000).toISOString(),  status:'success', ip_address:'192.168.1.8' },
        { id:'6', user_name:'System',         user_role:'System',            action:'BACKUP',           module:'Backup',         description:'Automatic backup completed (12.4MB)', timestamp:new Date(Date.now()-3600000).toISOString(),  status:'success', ip_address:'localhost'   },
        { id:'7', user_name:'Nurse Bautista', user_role:'Nurse',             action:'VIEW_PATIENT',     module:'Patient Records', description:'Viewed patient: Ana Reyes',          timestamp:new Date(Date.now()-7200000).toISOString(),  status:'success', ip_address:'192.168.1.9' },
        { id:'8', user_name:'Pharmacist Go',  user_role:'Pharmacist',        action:'UPDATE_STOCK',     module:'Inventory',      description:'Updated stock: Amoxicillin +50 pcs', timestamp:new Date(Date.now()-10800000).toISOString(), status:'success', ip_address:'192.168.1.6' },
      ])
      setLoading(false)
      return
    }

    setLogs(data.map((l: any) => ({
      id:          l.id,
      user_name:   l.user_name    || 'System',
      user_role:   l.user_role    || '—',
      action:      l.action       || '',
      module:      l.module       || '',
      description: l.description  || '',
      timestamp:   l.created_at   || '',
      status:      l.status       || 'success',
      ip_address:  l.ip_address   || '—',
    })))
    setNoTable(false)
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  const display = logs.filter(l => {
    if (roleFilter !== 'All' && l.user_role !== roleFilter) return false
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const full = `${l.user_name} ${l.action} ${l.module} ${l.description||''} ${l.ip_address}`.toLowerCase()
      if (!full.includes(q)) return false
    }
    return true
  })

  useEffect(() => { setPage(1) }, [roleFilter, statusFilter, search])
  const totalPages = Math.max(1, Math.ceil(display.length / PER_PAGE))
  const paginated  = display.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const roleMeta: Record<string, { color:string; bg:string }> = {
    Admin:                  { color:'#7c3aed', bg:'#ede9fe' },
    Doctor:                 { color:'#059669', bg:'#d1fae5' },
    Nurse:                  { color:'#db2777', bg:'#fce7f3' },
    Registrar:              { color:'#d97706', bg:'#fef3c7' },
    Pharmacist:             { color:'#2563eb', bg:'#dbeafe' },
    'Warehouse Staff':      { color:'#b45309', bg:'#fef9c3' },
    'Medical Technologist': { color:'#0891b2', bg:'#cffafe' },
    System:                 { color:'#6b7280', bg:'#f3f4f6' },
  }

  return (
    <div className="sys-thin-scroll" style={{ display:'flex', flexDirection:'column', gap:16, height:'100%', minHeight:0 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexShrink:0 }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:dk?'#4ade80':G }}>SYSTEM ACTIVITY MONITOR</h2>
        </div>
        <button onClick={fetchLogs}
          style={{ background:card, border:`1.5px solid ${bdr}`, borderRadius:10, padding:'8px 16px',
            display:'flex', alignItems:'center', gap:7, cursor:'pointer', color:txt2, fontSize:13, fontWeight:700 }}>
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      {/* Setup notice if table missing */}
      {noTable && (
        <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:12, padding:'12px 16px', display:'flex', gap:10, alignItems:'flex-start' }}>
          <AlertCircle size={16} color="#d97706" style={{ flexShrink:0, marginTop:1 }}/>
          <div style={{ fontSize:12, color:'#92400e', lineHeight:1.6 }}>
            <strong>audit_logs table not found.</strong> Showing sample data.<br/>
            Create the <code>audit_logs</code> table in Supabase and call <code>logAction()</code> from your components to see real activity here. See the code comments in <code>SystemActivities.tsx</code> for the SQL and helper function.
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', flexShrink:0 }}>
        {[
          { label:'Total Events', count:logs.length,                                color:G        },
          { label:'Success',      count:logs.filter(l=>l.status==='success').length, color:'#059669'},
          { label:'Warnings',     count:logs.filter(l=>l.status==='warning').length, color:'#d97706'},
          { label:'Errors',       count:logs.filter(l=>l.status==='error').length,   color:'#dc2626'},
        ].map(s=>(
          <div key={s.label} style={{ background:card, border:`1px solid ${bdr}`, borderRadius:12, padding:'12px 20px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:s.color }}/>
            <span style={{ fontSize:22, fontWeight:800, color:txt }}>{s.count}</span>
            <span style={{ fontSize:12, color:txt2 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:card, borderRadius:18, padding:'14px 18px', border:`1px solid ${bdr}`, display:'flex', flexDirection:'column', gap:10, flexShrink:0 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search user, action, module, IP..."
          style={{ width:'100%', boxSizing:'border-box', padding:'8px 14px', borderRadius:12, border:`1.5px solid ${bdr}`, fontSize:12, outline:'none', color:txt, background:bg }}
          onFocus={e=>(e.currentTarget.style.borderColor=G)} onBlur={e=>(e.currentTarget.style.borderColor=bdr)}/>

        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          {/* Status filter */}
          <div style={{ display:'flex', gap:3, background:bg, borderRadius:24, padding:3, border:`1px solid ${bdr}`, width:'fit-content' }}>
            {(['all','success','warning','error'] as const).map(v=>(
              <button key={v} onClick={()=>setStatusFilter(v)}
                style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:700, border:'none', cursor:'pointer',
                  background: statusFilter===v?`linear-gradient(135deg,${G},#0d9488)`:'transparent',
                  color: statusFilter===v?'#fff':txt2, transition:'all 0.15s' }}>
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>

          {/* Role filter */}
          <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}
            style={{ padding:'6px 12px', borderRadius:12, border:`1.5px solid ${bdr}`, fontSize:12, color:txt, background:bg, cursor:'pointer', outline:'none', fontWeight:600 }}>
            {roles.map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:18, overflow:'hidden', flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
        <div className="sys-thin-scroll" style={{ flex:1, minHeight:0, overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:bg, borderBottom:`2px solid ${bdr}` }}>
              {['Status','User','Role','Action','Description','Module','IP','Time'].map(h=>(
                <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontWeight:800, color:dk?'#4ade80':G, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, whiteSpace:'nowrap', position:'sticky', top:0, background:bg, zIndex:1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:txt2 }}>
                <div style={{ width:28, height:28, border:`3px solid ${G}`, borderTopColor:'transparent', borderRadius:'50%', margin:'0 auto 8px', animation:'spin 0.8s linear infinite' }}/>
                Loading activity logs…
              </td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:txt2 }}>No events found.</td></tr>
            ) : paginated.map((log,i) => {
              const rm = roleMeta[log.user_role] || { color:'#6b7280', bg:'#f3f4f6' }
              const actionLabel = ACTION_LABELS[log.action] || log.action
              return (
                <tr key={log.id} style={{ borderBottom:`1px solid ${bdr}`, transition:'background 0.1s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=dk?'rgba(26,122,26,0.05)':'rgba(26,122,26,0.02)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%',
                      background: log.status==='success'?'#22c55e':log.status==='error'?'#ef4444':'#f59e0b' }}/>
                  </td>
                  <td style={{ padding:'10px 14px', fontWeight:700, color:txt, whiteSpace:'nowrap' }}>{log.user_name}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:rm.bg, color:rm.color, border:`1px solid ${rm.color}30`, whiteSpace:'nowrap' }}>
                      {log.user_role}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', color:txt, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{actionLabel}</td>
                  <td style={{ padding:'10px 14px', color:txt2, fontSize:11, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {log.description||'—'}
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:8, fontSize:10, fontWeight:600, background:dk?'rgba(26,122,26,0.2)':'#dcfce7', color:G }}>
                      {log.module}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:txt2, fontFamily:'monospace' }}>{log.ip_address}</td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:txt2, whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <Clock size={10}/>
                      {new Date(log.timestamp).toLocaleString('en-PH',{hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderTop:`1px solid ${bdr}`, background:bg, flexWrap:'wrap', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:12, color:txt2 }}>
            Showing {Math.min((page-1)*PER_PAGE+1,display.length)}–{Math.min(page*PER_PAGE,display.length)} of {display.length} events
          </span>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===1?txt2:G, cursor:page===1?'default':'pointer' }}>← Prev</button>
            {Array.from({length:Math.min(totalPages,7)}).map((_,i)=>(
              <button key={i} onClick={()=>setPage(i+1)}
                style={{ padding:'5px 11px', borderRadius:10, fontSize:12, fontWeight:800, border:'none', cursor:'pointer',
                  background:page===i+1?`linear-gradient(135deg,${G},#0d9488)`:'transparent',
                  color:page===i+1?'#fff':txt2 }}>
                {i+1}
              </button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ padding:'5px 14px', borderRadius:10, fontSize:12, fontWeight:700, border:`1.5px solid ${bdr}`, background:card, color:page===totalPages?txt2:G, cursor:page===totalPages?'default':'pointer' }}>Next →</button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .sys-thin-scroll{ scrollbar-width: thin; scrollbar-color: ${G}66 transparent; }
        .sys-thin-scroll::-webkit-scrollbar{ width:8px; height:8px; }
        .sys-thin-scroll::-webkit-scrollbar-track{ background: transparent; }
        .sys-thin-scroll::-webkit-scrollbar-thumb{ background:${G}66; border-radius:8px; border:2px solid transparent; background-clip:content-box; }
        .sys-thin-scroll::-webkit-scrollbar-thumb:hover{ background:${G}; background-clip:content-box; }
      `}</style>
    </div>
  )
}