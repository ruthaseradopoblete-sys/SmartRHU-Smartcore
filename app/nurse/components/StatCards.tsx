'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

function getTodayRangePHT() {
  const todayPHT = new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  const startUTC = new Date(todayPHT + 'T00:00:00+08:00').toISOString()
  const endUTC   = new Date(todayPHT + 'T23:59:59+08:00').toISOString()
  return { startUTC, endUTC }
}

interface Stats {
  consultations: number   // nurse_consultation_queue  status=done
  vaccinations:  number   // patient_vaccine_orders    status=done
  waiting:       number   // nurse_consultation_queue  status=pending
  vaccineStock:  number   // vaccine_stock             sum of vials
}

export default function StatCards() {
  const [stats, setStats]   = useState<Stats>({ consultations: 0, vaccinations: 0, waiting: 0, vaccineStock: 0 })
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const { startUTC, endUTC } = getTodayRangePHT()

    const [done, waiting, vacDone, stock] = await Promise.all([
      // ✅ consultations DONE today  (nurse_consultation_queue, status=done)
      supabase
        .from('nurse_consultation_queue')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .eq('status', 'done'),

      // ✅ patients still WAITING today  (nurse_consultation_queue, status=pending)
      supabase
        .from('nurse_consultation_queue')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .eq('status', 'pending'),

      // ✅ vaccinations DONE today  (patient_vaccine_orders, status=done)
      supabase
        .from('patient_vaccine_orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .eq('status', 'done'),

      // ✅ total vaccine vials in stock
      supabase.from('vaccine_stock').select('vials'),
    ])

    const totalStock = (stock.data ?? []).reduce(
      (sum, r) => sum + (Number(r.vials) || 0), 0
    )

    setStats({
      consultations: done.count    ?? 0,
      waiting:       waiting.count ?? 0,
      vaccinations:  vacDone.count ?? 0,
      vaccineStock:  totalStock,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()

    const consultSub = supabase
      .channel('statcards-consult')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nurse_consultation_queue' }, fetchAll)
      .subscribe()

    const vacOrderSub = supabase
      .channel('statcards-vacorders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_vaccine_orders' }, fetchAll)
      .subscribe()

    const stockSub = supabase
      .channel('statcards-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vaccine_stock' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(consultSub)
      supabase.removeChannel(vacOrderSub)
      supabase.removeChannel(stockSub)
    }
  }, [fetchAll])

  const cards = [
    { icon: '🩺', val: loading ? '—' : stats.consultations, label: 'Consultations Today', accent: '#16a34a' },
    { icon: '💉', val: loading ? '—' : stats.vaccinations,  label: 'Vaccinations Done',   accent: '#7c3aed' },
    { icon: '⏳', val: loading ? '—' : stats.waiting,        label: 'Waiting Patients',    accent: '#f59e0b' },
    { icon: '🏥', val: loading ? '—' : stats.vaccineStock,   label: 'Vaccine Stock',       accent: '#0369a1' },
  ]

  return (
    <div className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {cards.map(s => (
        <div
          key={s.label}
          className={styles.statCard}
          style={{ borderTop: `3px solid ${s.accent}` }}
        >
          <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 6 }}>{s.icon}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: s.accent, lineHeight: 1 }}>
            {s.val}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 600, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: 0.06, marginTop: 4,
          }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}