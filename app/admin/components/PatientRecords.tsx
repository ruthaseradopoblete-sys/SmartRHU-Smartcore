'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useAdmin, RecordPage, StatStrip, Toolbar, SearchInput, Segmented,
  Pill, DataView, Drawer, Field, Section, downloadCSV, ExportBtn, type Column,
} from './adminUI'

interface Patient {
  id: string
  last_name: string; first_name: string; middle_name?: string
  age: number; sex: string; birthdate: string
  purok?: string; barangay: string; municipality: string
  contact_number: string; email: string; created_at: string
}

const AGE_GROUPS = [
  { label: 'All Ages', min: 0, max: 999 },
  { label: '0–17', min: 0, max: 17 },
  { label: '18–35', min: 18, max: 35 },
  { label: '36–60', min: 36, max: 60 },
  { label: '60+', min: 61, max: 999 },
]

export default function PatientRecords({ darkMode }: { darkMode: boolean }) {
  const t = useAdmin(darkMode)

  const [patients, setPatients] = useState<Patient[]>([])
  const [counts, setCounts] = useState({ total: 0, female: 0, male: 0, seniors: 0, minors: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sex, setSex] = useState<'All' | 'M' | 'F'>('All')
  const [ageGroup, setAgeGroup] = useState('All Ages')
  const [view, setView] = useState<Patient | null>(null)

  // SOAP diagnosis for the opened patient
  const [dx, setDx] = useState<string[]>([])
  const [dxLoading, setDxLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    // Exact counts straight from the DB (NOT capped at 1000)
    const [cAll, cF, cM, cSr, cMin, listRes] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('sex', 'F'),
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('sex', 'M'),
      supabase.from('patients').select('id', { count: 'exact', head: true }).gte('age', 60),
      supabase.from('patients').select('id', { count: 'exact', head: true }).lte('age', 17),
      supabase.from('patients').select('*').order('created_at', { ascending: false }).range(0, 9999),
    ])
    setCounts({
      total: cAll.count || 0, female: cF.count || 0, male: cM.count || 0,
      seniors: cSr.count || 0, minors: cMin.count || 0,
    })
    setPatients((listRes.data as Patient[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Fetch the patient's diagnoses from SOAP consultations when a row is opened
  useEffect(() => {
    if (!view) { setDx([]); return }
    let cancelled = false
    ;(async () => {
      setDxLoading(true)
      const { data } = await supabase
        .from('soap_consultations')
        .select('assessment, assessments, created_at')
        .eq('patient_id', view.id)
        .order('created_at', { ascending: false })
      const list: string[] = []
      ;(data || []).forEach((r: any) => {
        if (Array.isArray(r.assessments)) list.push(...r.assessments.filter(Boolean))
        else if (r.assessment) list.push(String(r.assessment))
      })
      if (!cancelled) { setDx(Array.from(new Set(list.map(s => s.trim()).filter(Boolean)))); setDxLoading(false) }
    })()
    return () => { cancelled = true }
  }, [view])

  const rows = useMemo(() => {
    const ag = AGE_GROUPS.find(g => g.label === ageGroup) ?? AGE_GROUPS[0]
    return patients.filter(p => {
      if (sex !== 'All' && p.sex !== sex) return false
      if (p.age != null && (p.age < ag.min || p.age > ag.max)) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${p.last_name} ${p.first_name} ${p.middle_name ?? ''} ${p.email} ${p.contact_number} ${p.barangay}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [patients, sex, ageGroup, search])

  const avatar = (p: Patient) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: p.sex === 'F' ? 'linear-gradient(135deg,#db2777,#7c3aed)' : 'linear-gradient(135deg,#2563eb,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11 }}>
        {p.first_name?.[0]}{p.last_name?.[0]}
      </div>
      <div>
        <div style={{ fontWeight: 700, color: t.txt, fontSize: 12.5 }}>{p.last_name}, {p.first_name}</div>
        {p.middle_name && <div style={{ fontSize: 10, color: t.txt2 }}>{p.middle_name}</div>}
      </div>
    </div>
  )

  // Columns: No., Name, Age, Sex, Birthdate, Barangay, Contact, Email
  const columns: Column<Patient>[] = [
    { key: 'no', header: '#', width: 44, cell: (_p, i) => <span style={{ color: t.txt2, fontWeight: 700 }}>{i + 1}</span> },
    { key: 'name', header: 'Name', cell: avatar },
    { key: 'age', header: 'Age', cell: p => <span style={{ fontWeight: 600 }}>{p.age}</span> },
    { key: 'sex', header: 'Sex', cell: p => <Pill tone={p.sex === 'F' ? 'violet' : 'blue'}>{p.sex === 'F' ? 'Female' : 'Male'}</Pill> },
    { key: 'bday', header: 'Birthdate', cell: p => <span style={{ fontSize: 11.5, color: t.txt2 }}>{p.birthdate || '—'}</span> },
    { key: 'brgy', header: 'Barangay', cell: p => <span style={{ fontSize: 11.5 }}>{p.barangay || '—'}</span> },
    { key: 'contact', header: 'Contact', cell: p => <span style={{ fontSize: 11.5 }}>{p.contact_number || '—'}</span> },
    { key: 'email', header: 'Email', cell: p => <span style={{ fontSize: 11.5 }}>{p.email || '—'}</span> },
  ]

  const exportCsv = () => downloadCSV(
    'patient-records.csv',
    ['No.', 'Last Name', 'First Name', 'Middle', 'Age', 'Sex', 'Birthdate', 'Barangay', 'Municipality', 'Contact', 'Email'],
    rows.map((p, i) => [i + 1, p.last_name, p.first_name, p.middle_name || '', p.age, p.sex, p.birthdate, p.barangay, p.municipality, p.contact_number, p.email]),
  )

  return (
    <RecordPage t={t} title="Patient Records" subtitle="Read-only directory of all registered patients" onRefresh={load} fit>
      <div style={{ flexShrink: 0 }}>
        <StatStrip t={t} items={[
          { label: 'Total Patients', value: counts.total, color: '#1a7a1a' },
          { label: 'Female', value: counts.female, color: '#db2777' },
          { label: 'Male', value: counts.male, color: '#2563eb' },
          { label: 'Seniors (60+)', value: counts.seniors, color: '#d97706' },
          { label: 'Minors (0–17)', value: counts.minors, color: '#0891b2' },
        ]} />
      </div>

      <div style={{ flexShrink: 0 }}>
        <Toolbar t={t}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SearchInput t={t} value={search} onChange={setSearch} placeholder="Search name, contact, email, barangay…" />
            <ExportBtn t={t} onClick={exportCsv} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Segmented t={t} value={sex} onChange={setSex} options={[{ value: 'All', label: 'All' }, { value: 'F', label: 'Female' }, { value: 'M', label: 'Male' }]} />
            <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 11, border: `1.5px solid ${t.bdr}`, fontSize: 12.5, color: t.txt, background: t.pageBg, cursor: 'pointer', outline: 'none', fontWeight: 600 }}>
              {AGE_GROUPS.map(g => <option key={g.label}>{g.label}</option>)}
            </select>
          </div>
        </Toolbar>
      </div>

      <DataView t={t} columns={columns} rows={rows} loading={loading}
        keyOf={p => p.id} resetKey={`${search}|${sex}|${ageGroup}`}
        emptyText="No patients match your filters." onRowClick={setView} fill />

      <Drawer t={t} open={!!view} onClose={() => setView(null)}
        title={view ? `${view.last_name}, ${view.first_name}` : ''}
        subtitle={view ? `${view.sex === 'F' ? 'Female' : 'Male'} · ${view.age} yrs` : ''}
        accent={view?.sex === 'F' ? '#db2777' : '#2563eb'}>
        {view && (
          <>
            <Section t={t} title="Personal">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field t={t} label="Full name" value={`${view.last_name}, ${view.first_name} ${view.middle_name || ''}`} />
                <Field t={t} label="Age" value={view.age} />
                <Field t={t} label="Sex" value={view.sex === 'F' ? 'Female' : 'Male'} />
                <Field t={t} label="Birthdate" value={view.birthdate} />
              </div>
            </Section>

            <Section t={t} title="Diagnosis (from SOAP)">
              {dxLoading ? (
                <div style={{ fontSize: 12.5, color: t.txt2 }}>Loading diagnoses…</div>
              ) : dx.length === 0 ? (
                <div style={{ fontSize: 12.5, color: t.txt2 }}>No recorded diagnosis from SOAP consultations.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {dx.map((d, i) => <Pill key={i} tone="green">{d}</Pill>)}
                </div>
              )}
            </Section>

            <Section t={t} title="Location">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field t={t} label="Purok" value={view.purok} />
                <Field t={t} label="Barangay" value={view.barangay} />
                <Field t={t} label="Municipality" value={view.municipality} />
              </div>
            </Section>

            <Section t={t} title="Contact">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field t={t} label="Contact number" value={view.contact_number} />
                <Field t={t} label="Email" value={view.email} />
                <Field t={t} label="Registered" value={new Date(view.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
              </div>
            </Section>
          </>
        )}
      </Drawer>
    </RecordPage>
  )
}