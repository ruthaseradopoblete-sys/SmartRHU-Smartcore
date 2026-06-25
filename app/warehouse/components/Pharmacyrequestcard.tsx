'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './warehouse.module.css'

type ReqStatus = 'pending' | 'alerted' | 'confirmed' | 'rejected'
type ReqTab    = ReqStatus | 'all'

interface RestockRequest {
  id: string
  pharmacist_name: string
  medicine_name: string
  dosage: string
  medicine_type: string
  quantity: number
  status: ReqStatus
  created_at: string
}

interface PendingAction {
  reqId: string
  status: ReqStatus
  medicineName: string
  top: number
  left: number
}

const TAB_CONFIG: { key: ReqTab; label: string }[] = [
  { key: 'pending',   label: 'Pending'   },
  { key: 'alerted',   label: 'Alerted'   },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected',  label: 'Rejected'  },
  { key: 'all',       label: 'All'       },
]

const ACTION_LABEL: Record<ReqStatus, string> = {
  confirmed: 'Confirm',
  alerted:   'Alert',
  rejected:  'Reject',
  pending:   'Reset',
}

const ACTION_COLOR: Record<ReqStatus, string> = {
  confirmed: '#16a34a',
  alerted:   '#ca8a04',
  rejected:  '#dc2626',
  pending:   '#6b7280',
}

function statusStyle(status: ReqStatus): { bg: string; color: string; label: string } {
  switch (status) {
    case 'confirmed': return { bg: '#dcfce7', color: '#16a34a', label: '✓ Confirmed' }
    case 'alerted':   return { bg: '#fef9c3', color: '#ca8a04', label: '⚠ Alerted'  }
    case 'rejected':  return { bg: '#fee2e2', color: '#dc2626', label: '✗ Rejected'  }
    default:          return { bg: '#f3f4f6', color: '#6b7280', label: '● Pending'   }
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: '2-digit', day: '2-digit', year: 'numeric',
  })
}

export default function PharmacyRequestsCard() {
  const [requests,      setRequests]      = useState<RestockRequest[]>([])
  const [reqTab,        setReqTab]        = useState<ReqTab>('pending')
  const [loading,       setLoading]       = useState(true)
  const [toast,         setToast]         = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef    = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchRequests() }, [])

  // Close floating panel on outside click
  useEffect(() => {
    if (!pendingAction) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPendingAction(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pendingAction])

  async function fetchRequests() {
    setLoading(true)
    const { data, error } = await supabase
      .from('restock_requests')
      .select('id, pharmacist_name, medicine_name, dosage, medicine_type, quantity, status, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) setRequests(data as RestockRequest[])
    setLoading(false)
  }

  const filteredReqs = reqTab === 'all'
    ? requests
    : requests.filter(r => r.status === reqTab)

  const pendingCount = requests.filter(r => r.status === 'pending').length

  const counts: Record<ReqTab, number> = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    alerted:   requests.filter(r => r.status === 'alerted').length,
    confirmed: requests.filter(r => r.status === 'confirmed').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
  }

  const actRequest = async (id: string, status: ReqStatus) => {
    const req = requests.find(r => r.id === id)
    const { error } = await supabase
      .from('restock_requests')
      .update({ status })
      .eq('id', id)
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      if (toastTimer.current) clearTimeout(toastTimer.current)
      const name = req?.medicine_name ?? ''
      const msgs: Record<ReqStatus, string> = {
        confirmed: `✓ ${name} confirmed!`,
        alerted:   `⚠ ${name} marked as alerted.`,
        rejected:  `✗ ${name} rejected.`,
        pending:   `${name} set back to pending.`,
      }
      setToast(msgs[status])
      toastTimer.current = setTimeout(() => setToast(''), 2600)
    }
  }

  // Called when user clicks Confirm/Alert/Reject — opens floating panel instead of acting immediately
  const requestAction = (e: React.MouseEvent<HTMLButtonElement>, reqId: string, status: ReqStatus, medicineName: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPendingAction({
      reqId,
      status,
      medicineName,
      top: rect.bottom + window.scrollY + 6,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 220),
    })
  }

  const confirmPendingAction = () => {
    if (!pendingAction) return
    actRequest(pendingAction.reqId, pendingAction.status)
    setPendingAction(null)
  }

  return (
    <>
      <div className={styles.card} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(90deg,#0d3b1f,#16a34a)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#fff' }}>
            Pharmacy Requests
          </span>
          {pendingCount > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
              {pendingCount} Pending
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
          {TAB_CONFIG.map(t => (
            <button
              key={t.key}
              onClick={() => setReqTab(t.key)}
              style={{
                flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: 600,
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'center', whiteSpace: 'nowrap',
                color: reqTab === t.key ? 'var(--green)' : 'var(--text3)',
                borderBottom: reqTab === t.key ? '2px solid var(--green)' : '2px solid transparent',
                transition: 'all .15s',
              }}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span style={{
                  marginLeft: 3,
                  fontSize: 9,
                  background: reqTab === t.key ? 'var(--green)' : 'var(--border)',
                  color: reqTab === t.key ? '#fff' : 'var(--text3)',
                  borderRadius: 10,
                  padding: '0 4px',
                }}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Request list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <p className={styles.emptyText} style={{ padding: '24px 16px' }}>Loading requests…</p>
          ) : filteredReqs.length === 0 ? (
            <p className={styles.emptyText} style={{ padding: '24px 16px' }}>No {reqTab} requests</p>
          ) : (
            filteredReqs.map(r => {
              const s = statusStyle(r.status)
              return (
                <div
                  key={r.id}
                  style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-light)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Top row: medicine + qty */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.medicine_name}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                        {r.dosage} · {r.medicine_type}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{r.quantity} pcs</span>
                      <span style={{ display: 'block', fontSize: 9, color: 'var(--text3)' }}>{formatDate(r.created_at)}</span>
                    </div>
                  </div>

                  {/* Pharmacist */}
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>
                    By: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{r.pharmacist_name}</span>
                  </div>

                  {/* Bottom row: id + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 500, fontFamily: 'monospace' }}>
                      {r.id.slice(0, 8)}…
                    </span>

                    {r.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          onClick={e => requestAction(e, r.id, 'confirmed', r.medicine_name)}
                          style={{ background: 'var(--green)', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}
                        >Confirm</button>
                        <button
                          onClick={e => requestAction(e, r.id, 'alerted', r.medicine_name)}
                          style={{ background: '#fef9c3', color: '#ca8a04', border: 'none', fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}
                        >Alert</button>
                        <button
                          onClick={e => requestAction(e, r.id, 'rejected', r.medicine_name)}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}
                        >Reject</button>
                      </div>
                    ) : (
                      <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>
                        {s.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 14px', borderTop: '1px solid var(--border)',
          background: 'var(--surface2)', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
            {filteredReqs.length} {reqTab === 'all' ? 'total' : reqTab} request{filteredReqs.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>
            {pendingCount} awaiting action
          </span>
        </div>

      </div>

      {/* Floating confirmation panel */}
      {pendingAction && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pendingAction.top,
            left: pendingAction.left,
            zIndex: 2000,
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,.18)',
            padding: '12px 14px',
            width: 210,
            animation: 'fadeIn .15s ease',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 10, lineHeight: 1.4 }}>
            {ACTION_LABEL[pendingAction.status]}{' '}
            <strong>{pendingAction.medicineName}</strong>?
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setPendingAction(null)}
              style={{
                flex: 1, background: 'var(--surface2)', color: 'var(--text2)',
                border: '1px solid var(--border)', fontSize: 11, fontWeight: 600,
                padding: '6px 0', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Cancel</button>
            <button
              onClick={confirmPendingAction}
              style={{
                flex: 1, background: ACTION_COLOR[pendingAction.status], color: '#fff',
                border: 'none', fontSize: 11, fontWeight: 700,
                padding: '6px 0', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Yes</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={styles.toast} style={{
          background: toast.startsWith('✓') ? 'var(--green-dark)'
            : toast.startsWith('⚠') ? '#ca8a04'
            : '#dc2626'
        }}>
          {toast}
        </div>
      )}
    </>
  )
}