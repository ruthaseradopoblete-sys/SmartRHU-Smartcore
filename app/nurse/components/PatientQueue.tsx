'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

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

export default function PatientQueue() {
  const [activeTab, setActiveTab] = useState<'consultation' | 'vaccine'>('consultation')

  // ── Consultation (registrar → nurse) ──────────────────────────────────────
  const [consultEntries,  setConsultEntries]  = useState<ConsultEntry[]>([])
  const [consultSubTab,   setConsultSubTab]   = useState<'pending' | 'done'>('pending')
  const [consultLoading,  setConsultLoading]  = useState(true)

  // ── Vaccine (doctor → nurse) ───────────────────────────────────────────────
  const [vaccineOrders,   setVaccineOrders]   = useState<VaccineOrder[]>([])
  const [vaccineSubTab,   setVaccineSubTab]   = useState<'pending' | 'done'>('pending')
  const [vaccineLoading,  setVaccineLoading]  = useState(true)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // ── Fetch: Consultation queue ──────────────────────────────────────────────
  const fetchConsultations = useCallback(async () => {
    setConsultLoading(true)
    try {
      const { startUTC, endUTC } = getTodayRangePHT()
      const { data, error } = await supabase
        .from('nurse_consultation_queue')
        .select('id, patient_id, patient_name, patient_age, patient_gender, notes, status, created_at')
        .eq('status', consultSubTab)
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
  }, [consultSubTab])

  // ── Fetch: Vaccine queue ───────────────────────────────────────────────────
  const fetchVaccines = useCallback(async () => {
    setVaccineLoading(true)
    try {
      const { startUTC, endUTC } = getTodayRangePHT()
      const { data, error } = await supabase
        .from('patient_vaccine_orders')
        .select('id, patient_id, consultation_id, patient_name, patient_age, patient_gender, vaccines, notes, status, created_at')
        .eq('status', vaccineSubTab)
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
  }, [vaccineSubTab])

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

  async function markConsultDone(id: string) {
    const { error } = await supabase
      .from('nurse_consultation_queue')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) console.error('[markConsultDone]', error.message)
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

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const consultCount = consultEntries.length
  const vaccineCount = vaccineOrders.length

  return (
    <div className={styles.pendingCard}>
      <div className={styles.pendingHeader}>
        <span className={styles.pendingTitle}>PATIENT QUEUE</span>
        <span className={styles.pendingCount}>
          {activeTab === 'consultation' ? consultCount : vaccineCount}
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
        <>
          <div className={styles.queueTabs} style={{ marginTop: 6 }}>
            {(['pending', 'done'] as const).map(sub => (
              <button
                key={sub}
                onClick={() => setConsultSubTab(sub)}
                className={`${styles.queueTab} ${consultSubTab === sub ? styles.queueTabActive : ''}`}
                style={{ fontSize: 11, opacity: 0.9 }}
              >
                {sub === 'pending' ? 'Waiting' : 'Done'}
              </button>
            ))}
          </div>

          <div className={styles.pendingList}>
            {consultLoading ? (
              <p className={styles.emptyState}>Loading…</p>
            ) : consultEntries.length === 0 ? (
              <p className={styles.emptyState}>
                {consultSubTab === 'pending'
                  ? '🎉 No patients waiting for consultation.'
                  : 'No completed consultations today.'}
              </p>
            ) : (
              consultEntries.map(c => {
                const name       = c.patient_name ?? 'Unknown'
                const isExpanded = expanded.has(c.id)
                const isDone     = c.status === 'done'
                const initials   = getInitials(name)

                return (
                  <div
                    key={c.id}
                    className={`${styles.pendingItem} ${isDone ? styles.pendingDone : ''}`}
                    style={{
                      outline:       !isDone ? '2px solid #86efac' : undefined,
                      outlineOffset: '0px',
                    }}
                  >
                    <div className={styles.pendingItemTop}>
                      <div className={styles.pendingAvatar}>
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

                      <button
                        onClick={() => toggleExpand(c.id)}
                        style={{
                          display:    'flex',
                          alignItems: 'center',
                          gap:        4,
                          padding:    '2px 9px',
                          borderRadius: 99,
                          border:     'none',
                          cursor:     'pointer',
                          fontSize:   10,
                          fontWeight: 700,
                          flexShrink: 0,
                          background: isDone ? '#dcfce7' : '#f0fdf4',
                          color:      isDone ? '#15803d' : '#166534',
                          boxShadow:  isDone ? 'none' : '0 0 0 1.5px #86efac',
                          transition: 'all .12s',
                        }}
                      >
                        🩺 {isDone ? 'Seen' : 'Consultation'}
                        <svg
                          width="10" height="10" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2.5"
                          style={{
                            transition: 'transform .15s',
                            transform:  isExpanded ? 'rotate(180deg)' : 'none',
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{
                        margin:       '8px 0 4px',
                        background:   isDone ? '#f0fdf4' : '#f7fefb',
                        border:       `1.5px solid ${isDone ? '#86efac' : '#86efac'}`,
                        borderRadius: 10,
                        padding:      '10px 14px',
                      }}>
                        <div style={{
                          fontSize:        10,
                          fontWeight:      800,
                          letterSpacing:   0.6,
                          color:           '#166534',
                          textTransform:   'uppercase',
                          marginBottom:    6,
                        }}>
                          🩺 Sent by Registrar — Nurse Consultation
                        </div>

                        {c.notes && (
                          <div style={{ fontSize: 11, color: '#374151', marginTop: 6, fontStyle: 'italic' }}>
                            📝 {c.notes}
                          </div>
                        )}

                        {!isDone && (
                          <button
                            onClick={() => markConsultDone(c.id)}
                            style={{
                              marginTop:    10,
                              padding:      '7px 16px',
                              borderRadius: 99,
                              background:   'linear-gradient(135deg,#064e3b,#16a34a)',
                              color:        '#fff',
                              border:       'none',
                              fontSize:     11,
                              fontWeight:   700,
                              cursor:       'pointer',
                              display:      'flex',
                              alignItems:   'center',
                              gap:          6,
                              boxShadow:    '0 2px 8px rgba(22,163,74,0.25)',
                            }}
                          >
                            ✓ Mark Consultation as Done
                          </button>
                        )}

                        {isDone && (
                          <div style={{ marginTop: 6, fontSize: 11, color: '#15803d', fontWeight: 700 }}>
                            ✅ Consultation completed
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* ══ VACCINE TAB — doctor → nurse ══ */}
      {activeTab === 'vaccine' && (
        <>
          <div className={styles.queueTabs} style={{ marginTop: 6 }}>
            {(['pending', 'done'] as const).map(sub => (
              <button
                key={sub}
                onClick={() => setVaccineSubTab(sub)}
                className={`${styles.queueTab} ${vaccineSubTab === sub ? styles.queueTabActive : ''}`}
                style={{ fontSize: 11, opacity: 0.9 }}
              >
                {sub === 'pending' ? 'Waiting' : 'Done'}
              </button>
            ))}
          </div>

          <div className={styles.pendingList}>
            {vaccineLoading ? (
              <p className={styles.emptyState}>Loading…</p>
            ) : vaccineOrders.length === 0 ? (
              <p className={styles.emptyState}>
                {vaccineSubTab === 'pending'
                  ? '🎉 No pending vaccine orders.'
                  : 'No completed orders today.'}
              </p>
            ) : (
              vaccineOrders.map(o => {
                const name       = o.patient_name ?? 'Unknown'
                const isExpanded = expanded.has(o.id)
                const isDone     = o.status === 'done'
                const initials   = getInitials(name)

                return (
                  <div
                    key={o.id}
                    className={`${styles.pendingItem} ${isDone ? styles.pendingDone : ''}`}
                    style={{
                      outline:       !isDone ? '2px solid #7dd3fc' : undefined,
                      outlineOffset: '0px',
                    }}
                  >
                    <div className={styles.pendingItemTop}>
                      <div className={styles.pendingAvatar}>
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

                      <button
                        onClick={() => toggleExpand(o.id)}
                        style={{
                          display:    'flex',
                          alignItems: 'center',
                          gap:        4,
                          padding:    '2px 9px',
                          borderRadius: 99,
                          border:     'none',
                          cursor:     'pointer',
                          fontSize:   10,
                          fontWeight: 700,
                          flexShrink: 0,
                          background: isDone ? '#dcfce7' : '#e0f2fe',
                          color:      isDone ? '#15803d' : '#0369a1',
                          boxShadow:  isDone ? 'none' : '0 0 0 1.5px #7dd3fc',
                          transition: 'all .12s',
                        }}
                      >
                        💉 {isDone ? 'Vaccinated' : `Vaccine (${o.vaccines.length})`}
                        <svg
                          width="10" height="10" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2.5"
                          style={{
                            transition: 'transform .15s',
                            transform:  isExpanded ? 'rotate(180deg)' : 'none',
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>

                    {/* Expanded vaccine panel */}
                    {isExpanded && (
                      <div style={{
                        margin:       '8px 0 4px',
                        background:   isDone ? '#f0fdf4' : '#f0f9ff',
                        border:       `1.5px solid ${isDone ? '#86efac' : '#7dd3fc'}`,
                        borderRadius: 10,
                        padding:      '10px 14px',
                      }}>
                        <div style={{
                          fontSize:        10,
                          fontWeight:      800,
                          letterSpacing:   0.6,
                          color:           isDone ? '#15803d' : '#0369a1',
                          textTransform:   'uppercase',
                          marginBottom:    6,
                        }}>
                          💉 Vaccine Order from Doctor
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: o.notes ? 8 : 0 }}>
                          {o.vaccines.map(v => (
                            <span key={v} style={{
                              background:   isDone ? '#dcfce7' : '#e0f2fe',
                              color:        isDone ? '#15803d' : '#0c4a6e',
                              border:       `1px solid ${isDone ? '#86efac' : '#bae6fd'}`,
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
                          <div style={{ fontSize: 11, color: '#374151', marginTop: 6, fontStyle: 'italic' }}>
                            📝 {o.notes}
                          </div>
                        )}

                        {!isDone && (
                          <button
                            onClick={() => markVaccineDone(o.id)}
                            style={{
                              marginTop:    10,
                              padding:      '7px 16px',
                              borderRadius: 99,
                              background:   'linear-gradient(135deg,#0c4a6e,#0369a1)',
                              color:        '#fff',
                              border:       'none',
                              fontSize:     11,
                              fontWeight:   700,
                              cursor:       'pointer',
                              display:      'flex',
                              alignItems:   'center',
                              gap:          6,
                              boxShadow:    '0 2px 8px rgba(3,105,161,0.25)',
                            }}
                          >
                            ✓ Mark Vaccine as Done
                          </button>
                        )}

                        {isDone && (
                          <div style={{ marginTop: 6, fontSize: 11, color: '#15803d', fontWeight: 700 }}>
                            ✅ Vaccine administered
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}