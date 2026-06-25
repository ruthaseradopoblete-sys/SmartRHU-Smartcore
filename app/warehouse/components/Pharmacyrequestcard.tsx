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
  unit: string
  status: ReqStatus
  created_at: string
}

interface PendingAction {
  reqId: string
  status: ReqStatus
  medicineName: string
  quantity: number
  requestUnit: string
  displayQty: string
  top: number
  left: number
}

/** Warehouse medicine row — used to pull pieces_per_box for snapshot */
interface WarehouseMedRow {
  id:          string
  pcs_per_box: number | null
}

/** pharma_medicines row — used as fallback for pieces_per_box if warehouse has no match */
interface PharmaMedRow {
  id:             string
  pieces_per_box: number | null
}

const TAB_CONFIG: { key: ReqTab; label: string }[] = [
  { key: 'pending',   label: 'Pending'   },
  { key: 'alerted',   label: 'Alerted'   },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected',  label: 'Rejected'  },
  { key: 'all',       label: 'All'       },
]

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

function resolveDisplayQty(qty: number, unit: string): string {
  const u = (unit ?? '').toLowerCase().trim()
  if (u === 'box' || u === 'boxes')        return `${qty} box${qty !== 1 ? 'es' : ''}`
  if (u === 'blister' || u === 'blisters') return `${qty} blister${qty !== 1 ? 's' : ''}`
  return `${qty} pcs`
}

function resolveUnitBucket(unit: string): 'box' | 'piece' {
  const u = (unit ?? '').toLowerCase().trim()
  if (u === 'box' || u === 'boxes') return 'box'
  return 'piece'
}

/**
 * Looks up the accurate pieces_per_box for a medicine.
 *
 * Priority:
 *   1. pharma_medicines table (most accurate — matches what the Excel imported)
 *   2. warehouse_medicines table (fallback)
 *   3. 10 (last resort; should rarely be needed)
 *
 * This value is stored as pieces_per_box_snapshot in restock_requests so the
 * pharmacist-side RestockConfirmListener can use the EXACT per-box count for
 * that medicine (e.g. COC pill = 1, standard tablet = 10, etc.) when adding
 * the stock to pharma_medicines.
 */
async function fetchPiecesPerBox(medicineName: string): Promise<number> {
  // 1. Try pharma_medicines first (the Excel-imported truth)
  const { data: pharmaRows } = await supabase
    .from('pharma_medicines')
    .select('id, pieces_per_box')
    .ilike('med_name', medicineName.trim())
    .eq('archived', false)
    .limit(1)

  const pharmaMed = (pharmaRows as PharmaMedRow[] | null)?.[0] ?? null
  if (pharmaMed && pharmaMed.pieces_per_box && pharmaMed.pieces_per_box > 0) {
    return pharmaMed.pieces_per_box
  }

  // 2. Try warehouse_medicines
  const { data: wRows } = await supabase
    .from('warehouse_medicines')
    .select('id, pcs_per_box')
    .ilike('med_name', medicineName.trim())
    .eq('archived', false)
    .limit(1)

  const wMed = (wRows as WarehouseMedRow[] | null)?.[0] ?? null
  if (wMed && wMed.pcs_per_box && wMed.pcs_per_box > 0) {
    return wMed.pcs_per_box
  }

  // 3. Default
  return 10
}

export default function PharmacyRequestsCard() {
  const [requests,      setRequests]      = useState<RestockRequest[]>([])
  const [reqTab,        setReqTab]        = useState<ReqTab>('pending')
  const [loading,       setLoading]       = useState(true)
  const [toast,         setToast]         = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchRequests() }, [])

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
      .select('id, pharmacist_name, medicine_name, dosage, medicine_type, quantity, unit, status, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) setRequests(data as RestockRequest[])
    setLoading(false)
  }

  const filteredReqs  = reqTab === 'all' ? requests : requests.filter(r => r.status === reqTab)
  const pendingCount  = requests.filter(r => r.status === 'pending').length

  const counts: Record<ReqTab, number> = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    alerted:   requests.filter(r => r.status === 'alerted').length,
    confirmed: requests.filter(r => r.status === 'confirmed').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
  }

  /**
   * Confirms a restock request.
   *
   * Before writing status = 'confirmed', this looks up the accurate
   * pieces_per_box for the medicine and stores it as pieces_per_box_snapshot
   * in restock_requests. The pharmacist-side RestockConfirmListener reads this
   * snapshot to correctly convert requested boxes → pieces.
   *
   * Also writes requested_boxes and requested_partial_pieces so the listener
   * knows how many full boxes + loose pieces were approved (relevant for
   * box-unit medicines).
   */
  async function confirmRequest(req: RestockRequest) {
    const unitBucket  = resolveUnitBucket(req.unit)
    const isBox       = unitBucket === 'box'

    // Fetch the accurate pieces_per_box for this medicine
    const piecesPerBox = await fetchPiecesPerBox(req.medicine_name)

    // For box-unit medicines: qty = number of boxes requested
    // For piece-unit medicines: qty = individual pieces
    const requestedBoxes   = isBox ? req.quantity : 0
    const requestedPartial = isBox ? 0 : req.quantity   // partial = 0 when requesting whole boxes
    // Note: if the pharmacist requests partial boxes (e.g. "3" of a box medicine
    // but only wants partial), the RestockModal sends qty = boxes. The partial
    // column here is reserved for future granularity. For now it stays 0 for
    // box requests since the modal requests whole box counts.

    const { error } = await supabase
      .from('restock_requests')
      .update({
        status:                   'confirmed',
        requested_boxes:          requestedBoxes,
        requested_partial_pieces: requestedPartial,
        pieces_per_box_snapshot:  piecesPerBox,
      })
      .eq('id', req.id)

    if (!error) {
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'confirmed' } : r))
      showToast(`✓ ${req.medicine_name} confirmed!`)
    }
  }

  async function actRequest(id: string, status: Exclude<ReqStatus, 'confirmed'>) {
    const req = requests.find(r => r.id === id)
    const { error } = await supabase
      .from('restock_requests')
      .update({ status })
      .eq('id', id)
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      const name = req?.medicine_name ?? ''
      const msgs: Record<string, string> = {
        alerted:  `⚠ ${name} marked as alerted.`,
        rejected: `✗ ${name} rejected.`,
        pending:  `${name} set back to pending.`,
      }
      showToast(msgs[status] ?? '')
    }
  }

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }

  const requestAction = (
    e: React.MouseEvent<HTMLButtonElement>,
    req: RestockRequest,
    status: ReqStatus,
  ) => {
    const rect       = e.currentTarget.getBoundingClientRect()
    const displayQty = resolveDisplayQty(req.quantity, req.unit ?? '')
    setPendingAction({
      reqId:       req.id,
      status,
      medicineName: req.medicine_name,
      quantity:     req.quantity,
      requestUnit:  req.unit ?? 'pcs',
      displayQty,
      top:  rect.bottom + window.scrollY + 6,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 240),
    })
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return
    const req = requests.find(r => r.id === pendingAction.reqId)
    if (!req) { setPendingAction(null); return }

    if (pendingAction.status === 'confirmed') {
      await confirmRequest(req)
    } else {
      await actRequest(req.id, pendingAction.status as Exclude<ReqStatus, 'confirmed'>)
    }
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
                  marginLeft: 3, fontSize: 9,
                  background: reqTab === t.key ? 'var(--green)' : 'var(--border)',
                  color: reqTab === t.key ? '#fff' : 'var(--text3)',
                  borderRadius: 10, padding: '0 4px',
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
              const s          = statusStyle(r.status)
              const displayQty = resolveDisplayQty(r.quantity, r.unit ?? '')
              return (
                <div
                  key={r.id}
                  style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-light)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
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
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
                        {displayQty}
                      </span>
                      <span style={{ display: 'block', fontSize: 9, color: 'var(--text3)' }}>{formatDate(r.created_at)}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>
                    By: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{r.pharmacist_name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 500, fontFamily: 'monospace' }}>
                      {r.id.slice(0, 8)}…
                    </span>

                    {r.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          onClick={e => requestAction(e, r, 'confirmed')}
                          style={{ background: 'var(--green)', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}
                        >Confirm</button>
                        <button
                          onClick={e => requestAction(e, r, 'alerted')}
                          style={{ background: '#fef9c3', color: '#ca8a04', border: 'none', fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}
                        >Alert</button>
                        <button
                          onClick={e => requestAction(e, r, 'rejected')}
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
      {pendingAction && pendingAction.status === 'confirmed' && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top:  pendingAction.top,
            left: pendingAction.left,
            zIndex: 2000,
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,.18)',
            padding: '14px 16px',
            width: 250,
            animation: 'fadeIn .15s ease',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
            Confirm Release
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 4, lineHeight: 1.5 }}>
            <strong>{pendingAction.medicineName}</strong>
          </div>
          <div style={{
            background: 'var(--green-light)', borderRadius: 8, padding: '8px 10px',
            marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>
              {(pendingAction.requestUnit ?? '').toLowerCase().includes('box') ? '📦'
                : (pendingAction.requestUnit ?? '').toLowerCase().includes('blister') ? '💊'
                : '🔢'}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>
                {pendingAction.displayQty}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>will be given to pharmacist</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 10 }}>
            The accurate pieces/box for this medicine will be looked up and stored with the confirmation so stock is calculated correctly.
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
                flex: 2, background: '#16a34a', color: '#fff',
                border: 'none', fontSize: 11, fontWeight: 700,
                padding: '6px 0', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Yes, Confirm</button>
          </div>
        </div>
      )}

      {/* Alert / Reject floating panel */}
      {pendingAction && pendingAction.status !== 'confirmed' && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top:  pendingAction.top,
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
            {pendingAction.status === 'alerted' ? 'Alert' : 'Reject'}{' '}
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
