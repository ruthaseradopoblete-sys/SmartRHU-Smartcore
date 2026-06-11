'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

type ConsultStatus = 'WAITING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

interface QueueEntry {
  id: string
  patient_id: string
  registration_date: string
  created_at: string
  nurse_status: ConsultStatus
  first_name: string
  last_name: string
  age: number
  sex: string
}

export default function PatientQueue() {
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today')
  const [queue,     setQueue]     = useState<QueueEntry[]>([])
  const [loading,   setLoading]   = useState(true)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('konsulta_registrations')
        .select(`
          id, patient_id, registration_date, created_at, nurse_status,
          patients ( first_name, last_name, age, sex )
        `)
        .order('created_at', { ascending: true })

      if (activeTab === 'today') query = query.eq('registration_date', today)
      else query = query.limit(100)

      const { data, error } = await query
      if (error) throw error

      setQueue((data ?? []).map((r: any) => ({
        id:                r.id,
        patient_id:        r.patient_id,
        registration_date: r.registration_date,
        created_at:        r.created_at,
        nurse_status:      r.nurse_status ?? 'WAITING',
        first_name:        r.patients?.first_name ?? '',
        last_name:         r.patients?.last_name  ?? '',
        age:               r.patients?.age,
        sex:               r.patients?.sex?.trim(),
      })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel('nurse-queue-ch')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'konsulta_registrations',
      }, fetchQueue)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchQueue])

  async function update(id: string, status: ConsultStatus) {
    await supabase
      .from('konsulta_registrations')
      .update({ nurse_status: status })
      .eq('id', id)
    fetchQueue()
  }

  const waiting     = queue.filter(p => p.nurse_status === 'WAITING')
  const inProgress  = queue.filter(p => p.nurse_status === 'IN_PROGRESS')
  const activeCount = waiting.length + inProgress.length
  const displayList = activeTab === 'today'
    ? [...inProgress, ...waiting]
    : queue

  return (
    <div className={styles.pendingCard}>
      <div className={styles.pendingHeader}>
        <span className={styles.pendingTitle}>PATIENTS</span>
        <span className={styles.pendingCount}>{activeCount}</span>
      </div>

      <div className={styles.queueTabs}>
        {(['today', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${styles.queueTab} ${activeTab === tab ? styles.queueTabActive : ''}`}
          >
            {tab === 'today' ? "Today's Queue" : 'All Patients'}
          </button>
        ))}
      </div>

      <div className={styles.pendingList}>
        {loading ? (
          <p className={styles.emptyState}>Loading patients…</p>
        ) : displayList.length === 0 ? (
          <p className={styles.emptyState}>
            {activeTab === 'today' ? '🎉 No active patients right now.' : 'No records found.'}
          </p>
        ) : (
          displayList.map(p => (
            <div
              key={p.id}
              className={`${styles.pendingItem} ${
                p.nurse_status === 'DONE' || p.nurse_status === 'CANCELLED'
                  ? styles.pendingDone : ''
              }`}
            >
              <div className={styles.pendingItemTop}>
                <div className={styles.pendingAvatar}>
                  {p.first_name?.[0]}{p.last_name?.[0]}
                </div>
                <div className={styles.pendingInfo}>
                  <div className={styles.pendingName}>
                    {p.first_name} {p.last_name}
                  </div>
                  <div className={styles.pendingTime}>
                    {new Date(p.created_at).toLocaleTimeString('en-PH', {
                      hour: '2-digit', minute: '2-digit', hour12: true,
                    })}
                    {' · '}{p.age ?? '—'} yrs · {p.sex === 'M' ? 'Male' : 'Female'}
                  </div>
                </div>
                <span className={`${styles.statusPill} ${
                  p.nurse_status === 'WAITING'     ? styles.statusWaiting :
                  p.nurse_status === 'IN_PROGRESS' ? styles.statusInProgress :
                  p.nurse_status === 'DONE'        ? styles.statusDone :
                  styles.statusCancelled
                }`}>
                  {p.nurse_status.replace('_', ' ')}
                </span>
              </div>

              {p.nurse_status === 'WAITING' && (
                <div className={styles.pendingBtns}>
                  <button className={styles.pBtnCancel}  onClick={() => update(p.id, 'CANCELLED')}>
                    ✕ Cancel
                  </button>
                  <button className={styles.pBtnConsult} onClick={() => update(p.id, 'IN_PROGRESS')}>
                    ✓ Consult
                  </button>
                </div>
              )}

              {p.nurse_status === 'IN_PROGRESS' && (
                <div className={styles.pendingBtns}>
                  <button className={styles.pBtnDone} onClick={() => update(p.id, 'DONE')}>
                    ✓ Mark as Done
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
