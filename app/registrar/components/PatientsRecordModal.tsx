'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, FileText, Activity, Pill } from 'lucide-react'

const GREEN = '#16a34a'
const TEAL  = '#0d9488'

interface Patient {
  id: string
  last_name: string
  first_name: string
  middle_name?: string
  age: number
  sex: string
  birthdate?: string
  barangay?: string
  municipality?: string
  contact_number?: string
  email?: string
}

interface Consultation {
  id: string
  consultation_date: string
  queue_date?: string
  status: string
  chief_complaint?: string
  diagnosis?: string
  treatment?: string
  notes?: string
  created_at: string
}

interface LabRequest {
  id: string
  request_date: string
  status: string
  test?: string
}

interface FollowUp {
  id: string
  follow_up_date: string
  status: string
  notes?: string
}

interface Props {
  patient: Patient
  isOpen: boolean
  onClose: () => void
  onAddConsultation?: () => void  // triggers new consultation for this patient
}

export default function PatientRecordsModal({ patient, isOpen, onClose, onAddConsultation }: Props) {
  const [tab,          setTab]          = useState<'overview' | 'consultations' | 'lab' | 'followups'>('overview')
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [labRequests,   setLabRequests]   = useState<LabRequest[]>([])
  const [followUps,     setFollowUps]     = useState<FollowUp[]>([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    if (!isOpen || !patient?.id) return
    setLoading(true)

    Promise.all([
      // Try soap_consultations first, fallback to consultations
      supabase.from('soap_consultations')
        .select('*')
        .eq('patient_id', patient.id)
        .order('consultation_date', { ascending: false }),
      supabase.from('laboratory_requests')
        .select('id, request_date, status, urinalysis, fecalysis, hgb_hct, cbc_with_platelet, random_blood_sugar, fasting_blood_sugar, hbsag, dengue_ns1, dengue_igg_igm')
        .eq('patient_id', patient.id)
        .order('request_date', { ascending: false }),
      supabase.from('follow_up_schedules')
        .select('*')
        .eq('patient_id', patient.id)
        .order('follow_up_date', { ascending: false }),
    ]).then(([consult, lab, fu]) => {
      setConsultations(consult.data ?? [])
      // Map lab requests — derive test label
      setLabRequests((lab.data ?? []).map((r: any) => ({
        ...r,
        test: deriveTest(r),
      })))
      setFollowUps(fu.data ?? [])
      setLoading(false)
    })
  }, [isOpen, patient?.id])

  const deriveTest = (r: any) => {
    if (r.fecalysis)          return 'Fecalysis'
    if (r.urinalysis)         return 'Urinalysis'
    if (r.hgb_hct || r.cbc_with_platelet) return 'Hematology'
    if (r.random_blood_sugar || r.fasting_blood_sugar) return 'Clinical Chemistry'
    if (r.hbsag || r.dengue_ns1 || r.dengue_igg_igm)  return 'Serology'
    return 'Multiple Tests'
  }

  if (!isOpen) return null

  const statusColor = (s: string) => {
    if (!s) return { bg:'#f3f4f6', color:'#6b7280' }
    const sl = s.toLowerCase()
    if (sl === 'completed' || sl === 'done')    return { bg:'#dcfce7', color:GREEN }
    if (sl === 'pending'   || sl === 'waiting') return { bg:'#fef3c7', color:'#d97706' }
    if (sl === 'missed'    || sl === 'cancelled') return { bg:'#fee2e2', color:'#dc2626' }
    return { bg:'#eff6ff', color:'#2563eb' }
  }

  const fmt = (d?: string) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) }
    catch { return d }
  }

  const TABS = [
    { key:'overview',      label:'Overview',      icon: Activity },
    { key:'consultations', label:'Consultations', icon: FileText, count: consultations.length },
    { key:'lab',           label:'Lab Requests',  icon: Activity, count: labRequests.length   },
    { key:'followups',     label:'Follow-Ups',    icon: Calendar, count: followUps.length      },
  ]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2500, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'12px 16px', overflowY:'auto' }}>
      <div style={{ background:'#fff', width:'100%', maxWidth:700, borderRadius:20, marginTop:8, marginBottom:8, boxShadow:'0 24px 80px rgba(0,0,0,0.25)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${GREEN},${TEAL})`, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:'50%', background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', flexShrink:0 }}>
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </div>
            <div>
              <div style={{ color:'#fff', fontWeight:900, fontSize:16 }}>
                {patient.last_name}, {patient.first_name} {patient.middle_name || ''}
              </div>
              <div style={{ color:'rgba(255,255,255,0.75)', fontSize:11, marginTop:2 }}>
                {patient.age} yrs · {patient.sex === 'F' ? 'Female' : 'Male'} · {patient.barangay || '—'}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {onAddConsultation && (
              <button onClick={onAddConsultation} style={{ background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.4)', color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                + New Consultation
              </button>
            )}
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', background:'#f9fafb', overflowX:'auto' }}>
          {TABS.map(({ key, label, icon: Icon, count }) => (
            <div key={key} onClick={() => setTab(key as any)} style={{
              padding:'10px 18px', fontSize:12, fontWeight: tab===key ? 700 : 500,
              color: tab===key ? GREEN : '#6b7280',
              borderBottom: tab===key ? `3px solid ${GREEN}` : '3px solid transparent',
              cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5,
              background: tab===key ? '#fff' : 'transparent', transition:'all 0.12s',
            }}>
              <Icon size={13}/>
              {label}
              {count !== undefined && count > 0 && (
                <span style={{ background: tab===key ? GREEN : '#e5e7eb', color: tab===key ? '#fff' : '#6b7280', fontSize:10, fontWeight:800, borderRadius:20, padding:'1px 7px', marginLeft:2 }}>
                  {count}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding:'16px 20px', maxHeight:'65vh', overflowY:'auto' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#9ca3af' }}>Loading records…</div>
          ) : (

            /* ── OVERVIEW ── */
            tab === 'overview' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                  {[
                    ['Total Consultations', consultations.length, '#eff6ff', '#2563eb'],
                    ['Lab Requests',        labRequests.length,   '#f0fdf4', GREEN   ],
                    ['Follow-Ups',          followUps.length,     '#fef3c7', '#d97706'],
                    ['Last Visit',          fmt(consultations[0]?.consultation_date || consultations[0]?.created_at), '#fdf4ff', '#7c3aed'],
                  ].map(([label, value, bg, color]) => (
                    <div key={String(label)} style={{ background: String(bg), borderRadius:12, padding:'14px 16px', border:`1px solid ${String(color)}22` }}>
                      <div style={{ fontSize:11, color:'#6b7280', fontWeight:600, marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:22, fontWeight:900, color: String(color) }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Patient info */}
                <div style={{ background:'#f9fafb', borderRadius:12, padding:'14px 16px', border:'1px solid #e5e7eb' }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#374151', marginBottom:10 }}>Patient Information</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px', fontSize:12 }}>
                    {[
                      ['Birthdate',    patient.birthdate    || '—'],
                      ['Contact',      patient.contact_number || '—'],
                      ['Email',        patient.email        || '—'],
                      ['Barangay',     patient.barangay     || '—'],
                      ['Municipality', patient.municipality || '—'],
                    ].map(([k, v]) => (
                      <div key={k}><span style={{ color:'#9ca3af', fontWeight:600 }}>{k}: </span><span style={{ color:'#374151' }}>{v}</span></div>
                    ))}
                  </div>
                </div>

                {/* Recent consultations preview */}
                {consultations.length > 0 && (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontWeight:700, fontSize:12, color:'#374151', marginBottom:8, textTransform:'uppercase', letterSpacing:0.8 }}>Recent Visits</div>
                    {consultations.slice(0,3).map(c => {
                      const sc = statusColor(c.status)
                      return (
                        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', marginBottom:6 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:sc.color, flexShrink:0 }}/>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{fmt(c.consultation_date || c.created_at)}</div>
                            {c.chief_complaint && <div style={{ fontSize:11, color:'#6b7280' }}>{c.chief_complaint}</div>}
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:20, background:sc.bg, color:sc.color }}>{c.status}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {/* ── CONSULTATIONS ── */}
          {!loading && tab === 'consultations' && (
            consultations.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#9ca3af' }}>
                <FileText size={32} style={{ margin:'0 auto 8px', opacity:0.4 }}/>
                <div>No consultation records yet</div>
              </div>
            ) : consultations.map((c, i) => {
              const sc = statusColor(c.status)
              return (
                <div key={c.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:13, color:'#1f2937' }}>Visit #{consultations.length - i}</div>
                      <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>📅 {fmt(c.consultation_date || c.created_at)}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:sc.bg, color:sc.color }}>{c.status}</span>
                  </div>
                  {(c.chief_complaint || c.diagnosis || c.treatment || c.notes) && (
                    <div style={{ borderTop:'1px solid #f3f4f6', paddingTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 12px', fontSize:12 }}>
                      {c.chief_complaint && <div><span style={{ color:'#9ca3af', fontWeight:600 }}>Chief Complaint: </span><span style={{ color:'#374151' }}>{c.chief_complaint}</span></div>}
                      {c.diagnosis       && <div><span style={{ color:'#9ca3af', fontWeight:600 }}>Diagnosis: </span><span style={{ color:'#374151' }}>{c.diagnosis}</span></div>}
                      {c.treatment       && <div style={{ gridColumn:'1/-1' }}><span style={{ color:'#9ca3af', fontWeight:600 }}>Treatment: </span><span style={{ color:'#374151' }}>{c.treatment}</span></div>}
                      {c.notes           && <div style={{ gridColumn:'1/-1' }}><span style={{ color:'#9ca3af', fontWeight:600 }}>Notes: </span><span style={{ color:'#374151' }}>{c.notes}</span></div>}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* ── LAB REQUESTS ── */}
          {!loading && tab === 'lab' && (
            labRequests.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#9ca3af' }}>
                <Activity size={32} style={{ margin:'0 auto 8px', opacity:0.4 }}/>
                <div>No laboratory requests</div>
              </div>
            ) : labRequests.map(r => {
              const sc = statusColor(r.status)
              return (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'12px 16px', marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🧪</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#1f2937' }}>{r.test}</div>
                    <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>📅 {fmt(r.request_date)}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:sc.bg, color:sc.color }}>{r.status}</span>
                </div>
              )
            })
          )}

          {/* ── FOLLOW-UPS ── */}
          {!loading && tab === 'followups' && (
            followUps.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#9ca3af' }}>
                <Calendar size={32} style={{ margin:'0 auto 8px', opacity:0.4 }}/>
                <div>No follow-up schedules</div>
              </div>
            ) : followUps.map(f => {
              const sc = statusColor(f.status)
              const isToday = f.follow_up_date === new Date().toISOString().split('T')[0]
              return (
                <div key={f.id} style={{ background: isToday ? '#f0fdf4' : '#fff', border:`1px solid ${isToday ? '#86efac' : '#e5e7eb'}`, borderRadius:12, padding:'12px 16px', marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#1f2937', display:'flex', alignItems:'center', gap:6 }}>
                      📅 {fmt(f.follow_up_date)}
                      {isToday && <span style={{ background:GREEN, color:'#fff', fontSize:9, fontWeight:800, padding:'1px 7px', borderRadius:20 }}>TODAY</span>}
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:sc.bg, color:sc.color }}>{f.status}</span>
                  </div>
                  {f.notes && <div style={{ fontSize:12, color:'#6b7280' }}>📋 {f.notes}</div>}
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}