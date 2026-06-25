'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'
import type { QueueEntry } from '../../components/PendingPatients'
import ChildVaccinationFormModal from './ChildVaccinationFormModal'

// ECCD card scope: 0–5 years (0–71 months)
const CHILD_AGE_THRESHOLD = 5

interface VaccineOrder {
  id: string
  patient_id: string
  consultation_id: string
  patient_name: string | null
  patient_age: number | null
  patient_gender: string | null
  vaccines: string[]
  notes: string | null
  status: 'pending' | 'done'
  created_at: string
}

interface GroupedVaccineOrder {
  patient_id:          string
  patient_name:        string | null
  patient_age:         number | null
  patient_gender:      string | null
  vaccines:            string[]
  notes:               string[]
  orderIds:            string[]   // all order IDs in this group
  firstOrderId:        string     // oldest — used as ECCD modal key
  status:              'pending' | 'done'
  earliest_created_at: string
}

interface ConsultEntry {
  id: string
  patient_id: string
  patient_name: string | null
  patient_age: number | null
  patient_gender: string | null
  notes: string | null
  status: 'pending' | 'done'
  created_at: string
}

interface Props {
  onConsult: (entry: QueueEntry) => void
  nurseName?: string
}

function getTodayRangePHT() {
  const todayPHT = new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  const startUTC = new Date(todayPHT + 'T00:00:00+08:00').toISOString()
  const endUTC   = new Date(todayPHT + 'T23:59:59+08:00').toISOString()
  return { startUTC, endUTC }
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function getInitials(name: string) {
  return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
}

function toQueueEntry(c: ConsultEntry): QueueEntry {
  return {
    queueId:     c.id,
    patientId:   c.patient_id,
    name:        c.patient_name ?? 'Unknown',
    age:         c.patient_age != null ? String(c.patient_age) : '',
    gender:      c.patient_gender ?? '',
    civil:       '',
    addr:        '',
    time:        fmtTime(c.created_at),
    status:      c.status === 'done' ? 'done' : 'waiting',
    queueNumber: 0,
    source:      'nurse',
  }
}

// Group multiple orders for same patient into one card.
// Status = pending if ANY order is pending; done only if ALL are done.
function groupVaccineOrders(orders: VaccineOrder[]): GroupedVaccineOrder[] {
  const map = new Map<string, GroupedVaccineOrder>()
  // Chronological so firstOrderId is always the oldest
  const sorted = [...orders].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  for (const o of sorted) {
    const existing = map.get(o.patient_id)
    if (existing) {
      existing.vaccines = Array.from(new Set([...existing.vaccines, ...o.vaccines]))
      if (o.notes) existing.notes = [...existing.notes, o.notes]
      existing.orderIds.push(o.id)
      if (o.status === 'pending') existing.status = 'pending' // pending wins
    } else {
      map.set(o.patient_id, {
        patient_id:          o.patient_id,
        patient_name:        o.patient_name,
        patient_age:         o.patient_age,
        patient_gender:      o.patient_gender,
        vaccines:            [...o.vaccines],
        notes:               o.notes ? [o.notes] : [],
        orderIds:            [o.id],
        firstOrderId:        o.id,
        status:              o.status,
        earliest_created_at: o.created_at,
      })
    }
  }
  // pending first, then done; within each group, chronological
  return Array.from(map.values()).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
    return new Date(a.earliest_created_at).getTime() - new Date(b.earliest_created_at).getTime()
  })
}

export default function PatientQueue({ onConsult, nurseName = '' }: Props) {
  const [activeTab, setActiveTab] = useState<'consultation' | 'vaccine'>('consultation')

  const [consultEntries, setConsultEntries] = useState<ConsultEntry[]>([])
  const [consultLoading, setConsultLoading] = useState(true)

  const [vaccineOrders, setVaccineOrders] = useState<VaccineOrder[]>([])
  const [vaccineLoading, setVaccineLoading] = useState(true)

  const [eccdTarget, setEccdTarget] = useState<GroupedVaccineOrder | null>(null)

  const fetchConsultations = useCallback(async () => {
    setConsultLoading(true)
    try {
      const { startUTC, endUTC } = getTodayRangePHT()
      const { data, error } = await supabase
        .from('nurse_consultation_queue')
        .select('id, patient_id, patient_name, patient_age, patient_gender, notes, status, created_at')
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .order('created_at', { ascending: true })
      if (error) throw error
      setConsultEntries((data ?? []) as ConsultEntry[])
    } catch (e: any) {
      console.error('[PatientQueue:consultation]', e?.message ?? e)
    } finally {
      setConsultLoading(false)
    }
  }, [])

  const fetchVaccines = useCallback(async () => {
    setVaccineLoading(true)
    try {
      const { startUTC, endUTC } = getTodayRangePHT()
      const { data, error } = await supabase
        .from('patient_vaccine_orders')
        .select('id, patient_id, consultation_id, patient_name, patient_age, patient_gender, vaccines, notes, status, created_at')
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .order('created_at', { ascending: true })
      if (error) throw error
      setVaccineOrders((data ?? []).map((r: any) => ({
        id:              r.id,
        patient_id:      r.patient_id,
        consultation_id: r.consultation_id,
        patient_name:    r.patient_name,
        patient_age:     r.patient_age,
        patient_gender:  r.patient_gender,
        vaccines:        r.vaccines ?? [],
        notes:           r.notes,
        status:          r.status,
        created_at:      r.created_at,
      })))
    } catch (e: any) {
      console.error('[PatientQueue:vaccine]', e?.message ?? e)
    } finally {
      setVaccineLoading(false)
    }
  }, [])

  useEffect(() => { fetchConsultations() }, [fetchConsultations])
  useEffect(() => { fetchVaccines() }, [fetchVaccines])

  useEffect(() => {
    const ch = supabase
      .channel('nurse-consultation-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nurse_consultation_queue' }, fetchConsultations)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchConsultations])

  useEffect(() => {
    const ch = supabase
      .channel('nurse-vaccine-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_vaccine_orders' }, fetchVaccines)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchVaccines])

  async function cancelConsult(id: string) {
    const { error } = await supabase
      .from('nurse_consultation_queue')
      .delete()
      .eq('id', id)
    if (error) alert(`❌ Failed to remove: ${error.message}`)
    else fetchConsultations()
  }

  // Mark ALL orders in this group as done
  async function markGroupDone(group: GroupedVaccineOrder) {
    for (const id of group.orderIds) {
      const { error } = await supabase
        .from('patient_vaccine_orders')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) { console.error('[markGroupDone]', error.message); return }
    }
    // Write to adult_vaccination_records if older than threshold
    const isAdult = group.patient_age != null && group.patient_age > CHILD_AGE_THRESHOLD
    if (isAdult && group.vaccines.length > 0) {
      const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0]
      const rows = group.vaccines.map((vaccineLabel) => {
        const doseMatch = vaccineLabel.match(/^(.*) — (\d+)\w{2} dose$/)
        return {
          patient_id:        group.patient_id,
          vaccine_order_id:  group.firstOrderId,
          vaccine_name:      doseMatch ? doseMatch[1] : vaccineLabel,
          dose_number:       doseMatch ? Number(doseMatch[2]) : null,
          date_administered: today,
          notes:             group.notes.join('; ') || null,
        }
      })
      const { error: vaxErr } = await supabase.from('adult_vaccination_records').insert(rows)
      if (vaxErr) console.error('[markGroupDone] adult_vaccination_records insert failed:', vaxErr.message)
    }
    fetchVaccines()
  }

  // Cancel ALL orders in this group
  async function cancelGroup(group: GroupedVaccineOrder) {
    for (const id of group.orderIds) {
      await supabase.from('patient_vaccine_orders').delete().eq('id', id)
    }
    fetchVaccines()
  }

  const sortConsult = (entries: ConsultEntry[]) => [
    ...entries.filter(e => e.status === 'pending'),
    ...entries.filter(e => e.status === 'done'),
  ]
  const sortedConsult = sortConsult(consultEntries)
  const firstDoneConsultIndex = sortedConsult.findIndex(e => e.status === 'done')

  const groupedVaccine = groupVaccineOrders(vaccineOrders)
  const firstDoneVaccineIndex = groupedVaccine.findIndex(g => g.status === 'done')

  const consultWaitingCount = consultEntries.filter(e => e.status === 'pending').length
  const vaccineWaitingCount = groupedVaccine.filter(g => g.status === 'pending').length

  return (
    <>
      <div className={styles.pendingCard}>
        <div className={styles.pendingHeader}>
          <span className={styles.pendingTitle}>PATIENT QUEUE</span>
          <span className={styles.pendingCount}>
            {activeTab === 'consultation' ? consultWaitingCount : vaccineWaitingCount}
          </span>
        </div>

        <div className={styles.queueTabs}>
          <button
            onClick={() => setActiveTab('consultation')}
            className={`${styles.queueTab} ${activeTab === 'consultation' ? styles.queueTabActive : ''}`}
          >
            🩺 Consultation
          </button>
          <button
            onClick={() => setActiveTab('vaccine')}
            className={`${styles.queueTab} ${activeTab === 'vaccine' ? styles.queueTabActive : ''}`}
          >
            💉 Vaccine
          </button>
        </div>

        {/* ══ CONSULTATION TAB ══ */}
        {activeTab === 'consultation' && (
          <div className={styles.pendingList}>
            {consultLoading ? (
              <p className={styles.emptyState}>Loading…</p>
            ) : sortedConsult.length === 0 ? (
              <p className={styles.emptyState}>🎉 No patients in the consultation queue today.</p>
            ) : (
              sortedConsult.map((c, idx) => {
                const name     = c.patient_name ?? 'Unknown'
                const isDone   = c.status === 'done'
                const initials = getInitials(name)
                return (
                  <div key={c.id}>
                    {idx === firstDoneConsultIndex && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', margin: '4px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Completed</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>
                    )}
                    <div className={`${styles.pendingItem}${isDone ? ' ' + styles.pendingDone : ''}`}>
                      <div className={styles.pendingItemTop}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? '#9ca3af' : '#16a34a', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div className={styles.pendingInfo}>
                          <div className={styles.pendingName}>{name}</div>
                          <div className={styles.pendingTime}>
                            {fmtTime(c.created_at)}
                            {c.patient_age    ? ` · ${c.patient_age} yrs` : ''}
                            {c.patient_gender ? ` · ${c.patient_gender}`  : ''}
                          </div>
                        </div>
                        <span className={`${styles.statusPill} ${isDone ? styles.statusDone : styles.statusWaiting}`}>
                          {isDone ? 'Done' : 'Waiting'}
                        </span>
                      </div>
                      {c.notes && (
                        <div style={{ fontSize: 11, color: '#374151', margin: '6px 0 0 38px', fontStyle: 'italic' }}>📝 {c.notes}</div>
                      )}
                      {!isDone && (
                        <div className={styles.pendingBtns}>
                          <button className={`${styles.pBtn} ${styles.pBtnCancel}`} onClick={() => cancelConsult(c.id)}>✕ CANCEL</button>
                          <button className={`${styles.pBtn} ${styles.pBtnConsult}`} onClick={() => onConsult(toQueueEntry(c))}>✓ CONSULT</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ══ VACCINE TAB — grouped by patient ══ */}
        {activeTab === 'vaccine' && (
          <div className={styles.pendingList}>
            {vaccineLoading ? (
              <p className={styles.emptyState}>Loading…</p>
            ) : groupedVaccine.length === 0 ? (
              <p className={styles.emptyState}>🎉 No vaccine orders today.</p>
            ) : (
              groupedVaccine.map((g, idx) => {
                const name     = g.patient_name ?? 'Unknown'
                const isDone   = g.status === 'done'
                const initials = getInitials(name)
                // ECCD card only for confirmed 0–5 yr olds
                const isChild  = g.patient_age != null && g.patient_age <= CHILD_AGE_THRESHOLD

                return (
                  <div key={g.patient_id}>
                    {idx === firstDoneVaccineIndex && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', margin: '4px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Completed</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>
                    )}
                    <div className={`${styles.pendingItem}${isDone ? ' ' + styles.pendingDone : ''}`}>
                      <div className={styles.pendingItemTop}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? '#9ca3af' : '#0369a1', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div className={styles.pendingInfo}>
                          <div className={styles.pendingName}>{name}</div>
                          <div className={styles.pendingTime}>
                            {fmtTime(g.earliest_created_at)}
                            {g.patient_age    ? ` · ${g.patient_age} yrs` : ''}
                            {g.patient_gender ? ` · ${g.patient_gender}`  : ''}
                          </div>
                        </div>
                        <span className={`${styles.statusPill} ${isDone ? styles.statusDone : styles.statusWaiting}`}>
                          {isDone ? 'Done' : 'Waiting'}
                        </span>
                      </div>

                      {/* All vaccines combined from all orders */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '6px 0 0 38px' }}>
                        {g.vaccines.map(v => (
                          <span key={v} style={{ background: isDone ? '#e5e7eb' : '#e0f2fe', color: isDone ? '#4b5563' : '#0c4a6e', border: `1px solid ${isDone ? '#d1d5db' : '#bae6fd'}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                            {v}
                          </span>
                        ))}
                      </div>

                      {/* Combined notes */}
                      {g.notes.length > 0 && (
                        <div style={{ fontSize: 11, color: '#374151', margin: '6px 0 0 38px', fontStyle: 'italic' }}>
                          📝 {g.notes.join(' · ')}
                        </div>
                      )}

                      {/* ECCD Card button — only for confirmed 0–5 yr olds */}
                      {isChild && (
                        <div style={{ margin: '8px 0 0 38px' }}>
                          <button
                            onClick={() => setEccdTarget(g)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 14px', borderRadius: 99,
                              background: '#f0fdf4', border: '1.5px solid #86efac',
                              color: '#166534', fontSize: 11, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            👶 Child Immunization Card
                          </button>
                        </div>
                      )}

                      {!isDone && (
                        <div className={styles.pendingBtns}>
                          <button className={`${styles.pBtn} ${styles.pBtnCancel}`} onClick={() => cancelGroup(g)}>✕ CANCEL</button>
                          <button className={`${styles.pBtn} ${styles.pBtnConsult}`} onClick={() => markGroupDone(g)}>✓ MARK DONE</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ── ChildVaccinationFormModal — opens only for the clicked grouped patient ── */}
      {eccdTarget && (
        <ChildVaccinationFormModal
          open={!!eccdTarget}
          order={{
            id:             eccdTarget.firstOrderId,
            patient_id:     eccdTarget.patient_id,
            patient_name:   eccdTarget.patient_name,
            patient_age:    eccdTarget.patient_age,
            patient_gender: eccdTarget.patient_gender,
          }}
          nurseName={nurseName}
          onClose={() => setEccdTarget(null)}
          onSaved={() => setEccdTarget(null)}
        />
      )}
    </>
  )
}