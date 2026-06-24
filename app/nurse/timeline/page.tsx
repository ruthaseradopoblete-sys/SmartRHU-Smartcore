'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import Sidebar from '../components/Sidebar'
import Topbar  from '../components/Topbar'
import styles from '../components/nurse.module.css'

// ── Age threshold matching ChildImmunizationCardModal / PatientQueue's
// CHILD_AGE_THRESHOLD — keep these in sync if either changes. ──
const CHILD_AGE_THRESHOLD = 12

interface PatientRow {
  id: string
  name: string
  age: string
  gender: string
  addr: string
  _lastActivity?: string
  _hasConsult?: boolean
  _hasVaccine?: boolean
}

interface ConsultVisit {
  id: string
  date: string
  status: 'pending' | 'done'
  notes: string | null
}

interface AdultVaxRecord {
  id: string
  vaccine_name: string
  dose_number: number | null
  date_administered: string
  vaccinator_name: string | null
  notes: string | null
}

interface ChildVaxSummary {
  hasRecord: boolean
  status: string | null
  updated_at: string | null
  child_name: string | null
  birth_date: string | null
  bcg_given: boolean
  dpt_doses_given: number
  opv_doses_given: number
  hepb_doses_given: number
  measles_given: boolean
}

function toDateOnly(s: string | null | undefined): string {
  if (!s) return ''
  const str = String(s)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'))
  if (isNaN(d.getTime())) return str.slice(0, 10)
  return new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function fmtDate(iso: string | null | undefined) {
  const d = toDateOnly(iso)
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function initials(n: string) {
  return n.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
}

function countNonNullDates(arr: (string | null)[] | null | undefined): number {
  if (!Array.isArray(arr)) return 0
  return arr.filter(Boolean).length
}

export default function NurseTimelinePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const rootRef = useRef<HTMLDivElement>(null!)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [patients,     setPatients]     = useState<PatientRow[]>([])
  const [loadingList,  setLoadingList]  = useState(true)
  const [search,       setSearch]       = useState('')
  const [selected,      setSelected]     = useState<PatientRow | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [consultVisits,  setConsultVisits]  = useState<ConsultVisit[]>([])
  const [adultVax,       setAdultVax]       = useState<AdultVaxRecord[]>([])
  const [childVaxSummary, setChildVaxSummary] = useState<ChildVaxSummary | null>(null)

  const [vaxTab, setVaxTab] = useState<'adult' | 'child'>('adult')

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) router.replace('/')
  }, [user, isLoading, router])

  // ── Fetch the patient list — anyone who has EITHER a nurse consultation
  // queue entry OR a vaccine order/record, so this list mirrors exactly the
  // population a nurse actually deals with (not the full clinic-wide
  // patient roster, which is the doctor timeline's broader scope). ──
  const fetchPatients = useCallback(async () => {
    setLoadingList(true)
    try {
      const [consultRes, vaxOrderRes, adultVaxRes, childVaxRes] = await Promise.all([
        supabase.from('nurse_consultation_queue').select('patient_id, created_at'),
        supabase.from('patient_vaccine_orders').select('patient_id, created_at'),
        supabase.from('adult_vaccination_records').select('patient_id, date_administered'),
        supabase.from('child_vaccination_records').select('patient_id, updated_at'),
      ])

      const patientIds = new Set<string>()
      const lastActivity: Record<string, string> = {}
      const hasConsult = new Set<string>()
      const hasVaccine = new Set<string>()

      ;(consultRes.data ?? []).forEach((r: any) => {
        patientIds.add(r.patient_id)
        hasConsult.add(r.patient_id)
        const d = toDateOnly(r.created_at)
        if (d && (!lastActivity[r.patient_id] || d > lastActivity[r.patient_id])) lastActivity[r.patient_id] = d
      })
      ;(vaxOrderRes.data ?? []).forEach((r: any) => {
        patientIds.add(r.patient_id)
        hasVaccine.add(r.patient_id)
        const d = toDateOnly(r.created_at)
        if (d && (!lastActivity[r.patient_id] || d > lastActivity[r.patient_id])) lastActivity[r.patient_id] = d
      })
      ;(adultVaxRes.data ?? []).forEach((r: any) => {
        patientIds.add(r.patient_id)
        hasVaccine.add(r.patient_id)
        const d = toDateOnly(r.date_administered)
        if (d && (!lastActivity[r.patient_id] || d > lastActivity[r.patient_id])) lastActivity[r.patient_id] = d
      })
      ;(childVaxRes.data ?? []).forEach((r: any) => {
        patientIds.add(r.patient_id)
        hasVaccine.add(r.patient_id)
        const d = toDateOnly(r.updated_at)
        if (d && (!lastActivity[r.patient_id] || d > lastActivity[r.patient_id])) lastActivity[r.patient_id] = d
      })

      if (patientIds.size === 0) { setPatients([]); setLoadingList(false); return }

      const { data: pRows } = await supabase
        .from('patients')
        .select('id, first_name, last_name, age, sex, purok, barangay, municipality')
        .in('id', [...patientIds])

      const built: PatientRow[] = (pRows ?? []).map((p: any) => ({
        id: p.id,
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        age: p.age != null ? String(p.age) : '',
        gender: p.sex === 'F' ? 'Female' : p.sex === 'M' ? 'Male' : '',
        addr: [p.purok, p.barangay, p.municipality].filter(Boolean).join(', '),
        _lastActivity: lastActivity[p.id] ?? '',
        _hasConsult: hasConsult.has(p.id),
        _hasVaccine: hasVaccine.has(p.id),
      })).sort((a, b) => (b._lastActivity ?? '').localeCompare(a._lastActivity ?? ''))

      setPatients(built)
    } catch (e: any) {
      console.error('[NurseTimeline:fetchPatients]', e?.message ?? e)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { fetchPatients() }, [fetchPatients])

  // ── Fetch detail for selected patient ──────────────────────────────────
  const fetchDetail = useCallback(async (patientId: string) => {
    setLoadingDetail(true)
    try {
      const [consultRes, adultVaxRes, childVaxRes] = await Promise.all([
        supabase
          .from('nurse_consultation_queue')
          .select('id, created_at, status, notes')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('adult_vaccination_records')
          .select('id, vaccine_name, dose_number, date_administered, vaccinator_name, notes')
          .eq('patient_id', patientId)
          .order('date_administered', { ascending: false }),
        supabase
          .from('child_vaccination_records')
          .select('*')
          .eq('patient_id', patientId)
          .maybeSingle(),
      ])

      setConsultVisits(
        (consultRes.data ?? []).map((r: any) => ({
          id: r.id,
          date: toDateOnly(r.created_at),
          status: r.status === 'done' ? 'done' : 'pending',
          notes: r.notes,
        }))
      )

      setAdultVax((adultVaxRes.data ?? []) as AdultVaxRecord[])

      const cv = childVaxRes.data
      setChildVaxSummary(
        cv
          ? {
              hasRecord: true,
              status: cv.status ?? null,
              updated_at: cv.updated_at ?? null,
              child_name: cv.child_name ?? null,
              birth_date: cv.birth_date ?? null,
              bcg_given: countNonNullDates(cv.immunization_bcg_dates) > 0,
              dpt_doses_given: countNonNullDates(cv.immunization_dpt_dates),
              opv_doses_given: countNonNullDates(cv.immunization_opv_dates),
              hepb_doses_given: countNonNullDates(cv.immunization_hepb_dates),
              measles_given: countNonNullDates(cv.immunization_measles_dates) > 0,
            }
          : { hasRecord: false, status: null, updated_at: null, child_name: null, birth_date: null, bcg_given: false, dpt_doses_given: 0, opv_doses_given: 0, hepb_doses_given: 0, measles_given: false }
      )
    } catch (e: any) {
      console.error('[NurseTimeline:fetchDetail]', e?.message ?? e)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  function handleSelect(p: PatientRow) {
    setSelected(p)
    setVaxTab(p.age && Number(p.age) <= CHILD_AGE_THRESHOLD ? 'child' : 'adult')
    fetchDetail(p.id)
  }

  // ── Realtime — refresh list + detail when underlying tables change ──────
  useEffect(() => {
    const ch = supabase
      .channel('nurse-timeline-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nurse_consultation_queue' }, () => {
        fetchPatients()
        if (selected) fetchDetail(selected.id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'adult_vaccination_records' }, () => {
        fetchPatients()
        if (selected) fetchDetail(selected.id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'child_vaccination_records' }, () => {
        fetchPatients()
        if (selected) fetchDetail(selected.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, fetchPatients, fetchDetail])

  const filteredPatients = useMemo(() =>
    patients.filter(p => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.addr.toLowerCase().includes(q)
    }),
  [patients, search])

  if (isLoading || !user) return null

  const isChildPatient = selected ? (selected.age !== '' && Number(selected.age) <= CHILD_AGE_THRESHOLD) : false

  return (
    <div ref={rootRef} className={styles.root}>
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed(c => !c)} />

      <div
        className={styles.mainArea}
        style={{ marginLeft: sidebarCollapsed ? 64 : 240, transition: 'margin-left .2s ease' }}
      >
        <Topbar />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── LEFT: Patient list ── */}
          <div style={{ width: 320, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, background: '#fff' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Patient Timeline</div>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or address…"
                  style={{ width: '100%', boxSizing: 'border-box', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '8px 12px 8px 30px', fontSize: 12, color: '#111827', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {loadingList && <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Loading patients…</div>}
              {!loadingList && filteredPatients.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                  {search ? `No patients found for "${search}"` : 'No nurse-handled patients yet.'}
                </div>
              )}
              {filteredPatients.map(p => {
                const isChild = p.age !== '' && Number(p.age) <= CHILD_AGE_THRESHOLD
                const isActive = selected?.id === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px',
                      borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                      background: isActive ? '#f0fdf4' : 'transparent',
                      border: `1.5px solid ${isActive ? '#86efac' : 'transparent'}`,
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: p.gender === 'Female' ? '#ec4899' : '#3b82f6',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {initials(p.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {p.age ? `${p.age}y` : ''}{p.gender ? ` · ${p.gender[0]}` : ''}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: isChild ? '#fef3c7' : '#dbeafe',
                      color: isChild ? '#92400e' : '#1e40af',
                      flexShrink: 0,
                    }}>
                      {isChild ? 'CHILD' : 'ADULT'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT: Timeline detail ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#fafafa' }}>
            {!selected && !loadingDetail && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', gap: 10 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Select a patient</div>
                <div style={{ fontSize: 12 }}>Choose someone from the list to view their consultation and vaccine history</div>
              </div>
            )}

            {loadingDetail && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 13 }}>Loading records…</div>
            )}

            {selected && !loadingDetail && (
              <>
                {/* Patient header */}
                <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                    background: selected.gender === 'Female' ? '#ec4899' : '#3b82f6',
                    color: '#fff', fontSize: 16, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {initials(selected.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>{selected.name}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {selected.age    && <span style={{ fontSize: 11, color: '#6b7280', background: '#f1f5f9', borderRadius: 99, padding: '2px 10px' }}>🕐 {selected.age} yrs</span>}
                      {selected.gender && <span style={{ fontSize: 11, color: '#6b7280', background: '#f1f5f9', borderRadius: 99, padding: '2px 10px' }}>👤 {selected.gender}</span>}
                      {selected.addr   && <span style={{ fontSize: 11, color: '#6b7280', background: '#f1f5f9', borderRadius: 99, padding: '2px 10px' }}>📍 {selected.addr}</span>}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 99,
                    background: isChildPatient ? '#fef3c7' : '#dbeafe',
                    color: isChildPatient ? '#92400e' : '#1e40af',
                  }}>
                    {isChildPatient ? '👶 CHILD' : '🧑 ADULT'}
                  </span>
                </div>

                {/* ══ CONSULTATION HISTORY ══ */}
                <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ background: 'linear-gradient(90deg,#14532d,#16a34a)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🩺</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>Consultation History</span>
                    <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 9px' }}>
                      {consultVisits.length}
                    </span>
                  </div>
                  <div style={{ padding: consultVisits.length ? '12px 18px' : '24px 18px' }}>
                    {consultVisits.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No consultation records yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {consultVisits.map(v => (
                          <div key={v.id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            padding: '10px 12px', borderRadius: 10,
                            background: v.status === 'done' ? '#f9fafb' : '#f0fdf4',
                            border: `1px solid ${v.status === 'done' ? '#e5e7eb' : '#bbf7d0'}`,
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', minWidth: 110 }}>{fmtDate(v.date)}</div>
                            <div style={{ flex: 1 }}>
                              {v.notes && <div style={{ fontSize: 12, color: '#374151' }}>{v.notes}</div>}
                            </div>
                            <span style={{
                              fontSize: 9, fontWeight: 800, padding: '2px 9px', borderRadius: 99, flexShrink: 0,
                              background: v.status === 'done' ? '#dcfce7' : '#fef9c3',
                              color: v.status === 'done' ? '#166534' : '#92400e',
                            }}>
                              {v.status === 'done' ? 'DONE' : 'WAITING'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ══ VACCINE RECORDS — split Adult / Child ══ */}
                <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(90deg,#0c4a6e,#0369a1)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>💉</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>Vaccine Records</span>
                  </div>

                  {/* Sub-tabs: Adult / Child — independent of the patient's
                      actual age so a nurse can check either history if
                      needed, but defaults to the patient's age bracket on
                      selection (see handleSelect). */}
                  <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                    {(['adult', 'child'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setVaxTab(t)}
                        style={{
                          flex: 1, padding: '10px 0', border: 'none', background: 'transparent',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          color: vaxTab === t ? '#0369a1' : '#9ca3af',
                          borderBottom: vaxTab === t ? '2.5px solid #0369a1' : '2.5px solid transparent',
                        }}
                      >
                        {t === 'adult' ? '🧑 Adult Vaccination' : '👶 Child Immunization'}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: '16px 18px' }}>
                    {/* ── ADULT TAB ── */}
                    {vaxTab === 'adult' && (
                      adultVax.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
                          No adult vaccination records yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {adultVax.map(v => (
                            <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', minWidth: 110 }}>{fmtDate(v.date_administered)}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0c4a6e' }}>
                                  {v.vaccine_name}{v.dose_number ? ` — Dose ${v.dose_number}` : ''}
                                </div>
                                {v.vaccinator_name && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Administered by {v.vaccinator_name}</div>}
                                {v.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontStyle: 'italic' }}>{v.notes}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* ── CHILD TAB ── */}
                    {vaxTab === 'child' && (
                      !childVaxSummary?.hasRecord ? (
                        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
                          No child immunization card on file yet.
                          <div style={{ fontSize: 11, marginTop: 4 }}>
                            Use "Child Immunization Card" from the vaccine queue to start one.
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 99, padding: '3px 10px' }}>
                              Status: {childVaxSummary.status === 'completed' ? 'Completed' : 'Draft'}
                            </span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>Last updated {fmtDate(childVaxSummary.updated_at)}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[
                              { label: 'BCG', done: childVaxSummary.bcg_given },
                              { label: `DPT (${childVaxSummary.dpt_doses_given}/3)`, done: childVaxSummary.dpt_doses_given > 0 },
                              { label: `OPV (${childVaxSummary.opv_doses_given}/3)`, done: childVaxSummary.opv_doses_given > 0 },
                              { label: `Hep B (${childVaxSummary.hepb_doses_given}/3)`, done: childVaxSummary.hepb_doses_given > 0 },
                              { label: 'Measles', done: childVaxSummary.measles_given },
                            ].map(item => (
                              <div key={item.label} style={{
                                padding: '8px 10px', borderRadius: 8, textAlign: 'center',
                                background: item.done ? '#f0fdf4' : '#fafafa',
                                border: `1px solid ${item.done ? '#bbf7d0' : '#e5e7eb'}`,
                              }}>
                                <div style={{ fontSize: 14 }}>{item.done ? '✅' : '⬜'}</div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: item.done ? '#166534' : '#9ca3af', marginTop: 2 }}>{item.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}