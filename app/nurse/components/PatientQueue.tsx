'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

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

export default function PatientQueue() {
  const [activeTab, setActiveTab] = useState<'pending' | 'done'>('pending')
  const [orders, setOrders]       = useState<VaccineOrder[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const todayPHT = new Date(Date.now() + 8 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
      const startUTC = new Date(todayPHT + 'T00:00:00+08:00').toISOString()
      const endUTC   = new Date(todayPHT + 'T23:59:59+08:00').toISOString()

      const { data, error } = await supabase
        .from('patient_vaccine_orders')
        .select('id, patient_id, consultation_id, patient_name, patient_age, patient_gender, vaccines, notes, status, created_at')
        .eq('status', activeTab)
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .order('created_at', { ascending: true })

      if (error) throw error

      setOrders((data ?? []).map((r: any) => ({
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
      console.error('[PatientQueue]', e?.message ?? e)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel('nurse-vaccine-queue')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'patient_vaccine_orders',
      }, fetchOrders)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchOrders])

  async function markDone(id: string) {
    const { error } = await supabase
      .from('patient_vaccine_orders')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) console.error('[markDone]', error.message)
    else fetchOrders()
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className={styles.pendingCard}>
      <div className={styles.pendingHeader}>
        <span className={styles.pendingTitle}>VACCINE QUEUE</span>
        <span className={styles.pendingCount}>
          {activeTab === 'pending' ? orders.length : orders.length}
        </span>
      </div>

      <div className={styles.queueTabs}>
        {(['pending', 'done'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${styles.queueTab} ${activeTab === tab ? styles.queueTabActive : ''}`}
          >
            {tab === 'pending' ? "Today's Queue" : 'Completed'}
          </button>
        ))}
      </div>

      <div className={styles.pendingList}>
        {loading ? (
          <p className={styles.emptyState}>Loading…</p>
        ) : orders.length === 0 ? (
          <p className={styles.emptyState}>
            {activeTab === 'pending'
              ? '🎉 No pending vaccine orders.'
              : 'No completed orders today.'}
          </p>
        ) : (
          orders.map(o => {
            const name       = o.patient_name ?? 'Unknown'
            const isExpanded = expanded.has(o.id)
            const isDone     = o.status === 'done'
            const initials   = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')

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
                      {new Date(o.created_at).toLocaleTimeString('en-PH', {
                        hour: '2-digit', minute: '2-digit', hour12: true,
                      })}
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
                        onClick={() => markDone(o.id)}
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
    </div>
  )
}