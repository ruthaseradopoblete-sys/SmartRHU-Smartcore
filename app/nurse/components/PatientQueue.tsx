'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'
import type { QueueEntry } from '../../components/PendingPatients'

// ── Vaccine order — sent by DOCTOR via SOAP modal ─────────────────────────────
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

// ── Consultation queue entry — sent by REGISTRAR ("Send to Nurse") ───────────
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

// ── Maps a ConsultEntry (nurse_consultation_queue row) to the shared
//    QueueEntry shape SoapModal expects. source: "nurse" tells SoapModal
//    to read/write nurse_consultation_queue instead of soap_consultations.
//    queueNumber has no nurse-side equivalent (nurse rows use initials, not
//    a numbered badge) so it's set to 0 — SoapModal/QueueItem never render
//    it for nurse entries.
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

export default function PatientQueue({ onConsult }: Props) {
  const [activeTab, setActiveTab] = useState<'consultation' | 'vaccine'>('consultation')

  // ── Consultation (registrar → nurse) ──────────────────────────────────────
  // NOTE: sub-tabs (Waiting/Done) removed — both statuses now render in one
  // continuous list, separated by a "COMPLETED" divider, matching the
  // Today's Queue / PendingPatients look.
  const [consultEntries,  setConsultEntries]  = useState<ConsultEntry[]>([])
  const [consultLoading,  setConsultLoading]  = useState(true)

  // ── Vaccine (doctor → nurse) ───────────────────────────────────────────────
  const [vaccineOrders,   setVaccineOrders]   = useState<VaccineOrder[]>([])
  const [vaccineLoading,  setVaccineLoading]  = useState(true)

  // ── Fetch: Consultation queue (both pending + done, today only) ───────────
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

  // ── Fetch: Vaccine queue (both pending + done, today only) ────────────────
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

  // ── Realtime: nurse_consultation_queue ─────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('nurse-consultation-queue')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'nurse_consultation_queue',
      }, fetchConsultations)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchConsultations])

  // ── Realtime: patient_vaccine_orders ───────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('nurse-vaccine-queue')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'patient_vaccine_orders',
      }, fetchVaccines)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchVaccines])

  // NOTE: markConsultDone is no longer called from the CONSULT button.
  // Completion now happens inside SoapModal.handleSave, which sets
  // status: "done" on the nurse_consultation_queue row once SOAP notes
  // are actually saved — mirroring how the doctor flow works. Kept here
  // unused-but-available in case a "mark done without notes" affordance
  // is wanted later; remove if not needed.
  async function markConsultDone(id: string) {
    const { error } = await supabase
      .from('nurse_consultation_queue')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) console.error('[markConsultDone]', error.message)
    else fetchConsultations()
  }

  async function cancelConsult(id: string) {
    const { error } = await supabase
      .from('nurse_consultation_queue')
      .delete()
      .eq('id', id)
    if (error) alert(`❌ Failed to remove: ${error.message}`)
    else fetchConsultations()
  }

  async function markVaccineDone(id: string) {
    const { error } = await supabase
      .from('patient_vaccine_orders')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) console.error('[markVaccineDone]', error.message)
    else fetchVaccines()
  }

  async function cancelVaccine(id: string) {
    const { error } = await supabase
      .from('patient_vaccine_orders')
      .delete()
      .eq('id', id)
    if (error) alert(`❌ Failed to remove: ${error.message}`)
    else fetchVaccines()
  }

  // Pending (waiting) first in original order, then done, also in original
  // (chronological) order — mirrors the sort used in PendingPatients.
  const sortConsult = (entries: ConsultEntry[]) => [
    ...entries.filter(e => e.status === 'pending'),
    ...entries.filter(e => e.status === 'done'),
  ]
  const sortedConsult = sortConsult(consultEntries)
  const firstDoneConsultIndex = sortedConsult.findIndex(e => e.status === 'done')

  const sortVaccine = (entries: VaccineOrder[]) => [
    ...entries.filter(e => e.status === 'pending'),
    ...entries.filter(e => e.status === 'done'),
  ]
  const sortedVaccine = sortVaccine(vaccineOrders)
  const firstDoneVaccineIndex = sortedVaccine.findIndex(e => e.status === 'done')

  const consultWaitingCount = consultEntries.filter(e => e.status === 'pending').length
  const vaccineWaitingCount = vaccineOrders.filter(o => o.status === 'pending').length

  return (
    <div className={styles.pendingCard}>
      <div className={styles.pendingHeader}>
        <span className={styles.pendingTitle}>PATIENT QUEUE</span>
        <span className={styles.pendingCount}>
          {activeTab === 'consultation' ? consultWaitingCount : vaccineWaitingCount}
        </span>
      </div>

      {/* ══ Top-level: Consultation vs Vaccine ══ */}
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

      {/* ══ CONSULTATION TAB — registrar → nurse ══ */}
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
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', margin: '4px 0',
                    }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                        letterSpacing: '.08em', textTransform: 'uppercase',
                      }}>
                        Completed
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  )}

                  <div className={`${styles.pendingItem}${isDone ? ' ' + styles.pendingDone : ''}`}>
                    <div className={styles.pendingItemTop}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isDone ? '#9ca3af' : '#16a34a',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
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
                      <div style={{ fontSize: 11, color: '#374151', margin: '6px 0 0 38px', fontStyle: 'italic' }}>
                        📝 {c.notes}
                      </div>
                    )}

                    {!isDone && (
                      <div className={styles.pendingBtns}>
                        <button
                          className={`${styles.pBtn} ${styles.pBtnCancel}`}
                          onClick={() => cancelConsult(c.id)}
                        >
                          ✕ CANCEL
                        </button>
                        <button
                          className={`${styles.pBtn} ${styles.pBtnConsult}`}
                          onClick={() => onConsult(toQueueEntry(c))}
                        >
                          ✓ CONSULT
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ══ VACCINE TAB — doctor → nurse ══ */}
      {activeTab === 'vaccine' && (
        <div className={styles.pendingList}>
          {vaccineLoading ? (
            <p className={styles.emptyState}>Loading…</p>
          ) : sortedVaccine.length === 0 ? (
            <p className={styles.emptyState}>🎉 No vaccine orders today.</p>
          ) : (
            sortedVaccine.map((o, idx) => {
              const name     = o.patient_name ?? 'Unknown'
              const isDone   = o.status === 'done'
              const initials = getInitials(name)

              return (
                <div key={o.id}>
                  {idx === firstDoneVaccineIndex && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', margin: '4px 0',
                    }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                        letterSpacing: '.08em', textTransform: 'uppercase',
                      }}>
                        Completed
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  )}

                  <div className={`${styles.pendingItem}${isDone ? ' ' + styles.pendingDone : ''}`}>
                    <div className={styles.pendingItemTop}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isDone ? '#9ca3af' : '#0369a1',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {initials}
                      </div>

                      <div className={styles.pendingInfo}>
                        <div className={styles.pendingName}>{name}</div>
                        <div className={styles.pendingTime}>
                          {fmtTime(o.created_at)}
                          {o.patient_age    ? ` · ${o.patient_age} yrs` : ''}
                          {o.patient_gender ? ` · ${o.patient_gender}`  : ''}
                        </div>
                      </div>

                      <span className={`${styles.statusPill} ${isDone ? styles.statusDone : styles.statusWaiting}`}>
                        {isDone ? 'Done' : 'Waiting'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '6px 0 0 38px' }}>
                      {o.vaccines.map(v => (
                        <span key={v} style={{
                          background:   isDone ? '#e5e7eb' : '#e0f2fe',
                          color:        isDone ? '#4b5563' : '#0c4a6e',
                          border:       `1px solid ${isDone ? '#d1d5db' : '#bae6fd'}`,
                          borderRadius: 99,
                          padding:      '2px 10px',
                          fontSize:     11,
                          fontWeight:   600,
                        }}>
                          {v}
                        </span>
                      ))}
                    </div>

                    {o.notes && (
                      <div style={{ fontSize: 11, color: '#374151', margin: '6px 0 0 38px', fontStyle: 'italic' }}>
                        📝 {o.notes}
                      </div>
                    )}

                    {!isDone && (
                      <div className={styles.pendingBtns}>
                        <button
                          className={`${styles.pBtn} ${styles.pBtnCancel}`}
                          onClick={() => cancelVaccine(o.id)}
                        >
                          ✕ CANCEL
                        </button>
                        <button
                          className={`${styles.pBtn} ${styles.pBtnConsult}`}
                          onClick={() => markVaccineDone(o.id)}
                        >
                          ✓ MARK DONE
                        </button>
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
  )
}