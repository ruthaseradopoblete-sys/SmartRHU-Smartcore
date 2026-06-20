'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useAdmin, RecordPage, StatStrip, Toolbar, SearchInput, Segmented,
  Pill, DataView, downloadCSV, ExportMenu, type Column,
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
  const [dxMap, setDxMap] = useState<Record<string, string[]>>({})   // patient_id -> diagnoses (SOAP assessments[])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sex, setSex] = useState<'All' | 'M' | 'F'>('All')
  const [ageGroup, setAgeGroup] = useState('All Ages')

  const load = async () => {
    setLoading(true)
    // Exact counts straight from the DB (NOT capped at 1000)
    const [cAll, cF, cM, cSr, cMin, listRes, soapRes] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('sex', 'F'),
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('sex', 'M'),
      supabase.from('patients').select('id', { count: 'exact', head: true }).gte('age', 60),
      supabase.from('patients').select('id', { count: 'exact', head: true }).lte('age', 17),
      supabase.from('patients').select('*').order('created_at', { ascending: false }).range(0, 9999),
      supabase.from('soap_consultations').select('patient_id, assessments').range(0, 99999),
    ])
    setCounts({
      total: cAll.count || 0, female: cF.count || 0, male: cM.count || 0,
      seniors: cSr.count || 0, minors: cMin.count || 0,
    })
    setPatients((listRes.data as Patient[]) || [])

    // Build patient_id -> unique diagnoses map
    const map: Record<string, string[]> = {}
    ;(soapRes.data || []).forEach((r: any) => {
      if (!r.patient_id || !Array.isArray(r.assessments)) return
      const arr = map[r.patient_id] || (map[r.patient_id] = [])
      r.assessments.forEach((a: any) => { const s = String(a).trim(); if (s && !arr.includes(s)) arr.push(s) })
    })
    setDxMap(map)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const rows = useMemo(() => {
    const ag = AGE_GROUPS.find(g => g.label === ageGroup) ?? AGE_GROUPS[0]
    return patients.filter(p => {
      if (sex !== 'All' && p.sex !== sex) return false
      if (p.age != null && (p.age < ag.min || p.age > ag.max)) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${p.last_name} ${p.first_name} ${p.middle_name ?? ''} ${p.email} ${p.contact_number} ${p.barangay} ${(dxMap[p.id] || []).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [patients, sex, ageGroup, search, dxMap])

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

  // Columns: No., Name, Age, Sex, Birthdate, Barangay, Contact, Email, Diagnosis
  const columns: Column<Patient>[] = [
    { key: 'no', header: '#', width: 44, cell: (_p, i) => <span style={{ color: t.txt2, fontWeight: 700 }}>{i + 1}</span> },
    { key: 'name', header: 'Name', cell: avatar },
    { key: 'age', header: 'Age', cell: p => <span style={{ fontWeight: 600 }}>{p.age}</span> },
    { key: 'sex', header: 'Sex', cell: p => <Pill tone={p.sex === 'F' ? 'violet' : 'blue'}>{p.sex === 'F' ? 'Female' : 'Male'}</Pill> },
    { key: 'bday', header: 'Birthdate', cell: p => <span style={{ fontSize: 11.5, color: t.txt2 }}>{p.birthdate || '—'}</span> },
    { key: 'brgy', header: 'Barangay', cell: p => <span style={{ fontSize: 11.5 }}>{p.barangay || '—'}</span> },
    { key: 'contact', header: 'Contact', cell: p => <span style={{ fontSize: 11.5 }}>{p.contact_number || '—'}</span> },
    { key: 'email', header: 'Email', cell: p => <span style={{ fontSize: 11.5 }}>{p.email || '—'}</span> },
    { key: 'dx', header: 'Diagnosis', cell: p => {
      const list = dxMap[p.id] || []
      if (list.length === 0) return <span style={{ color: t.txt2 }}>—</span>
      const shown = list.slice(0, 2)
      return (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          {shown.map((d, i) => <Pill key={i} tone="green">{d}</Pill>)}
          {list.length > 2 && <span style={{ fontSize: 11, color: t.txt2, fontWeight: 700 }}>+{list.length - 2}</span>}
        </span>
      )
    } },
  ]

  /* ── Export (CSV / Excel / PDF) ─────────────────────────────────────────── */
  const exportData = () => {
    const headers = ['No.', 'Last Name', 'First Name', 'Middle', 'Age', 'Sex', 'Birthdate', 'Barangay', 'Municipality', 'Contact', 'Email', 'Diagnosis']
    const body = rows.map((p, i) => [
      i + 1, p.last_name, p.first_name, p.middle_name || '', p.age, p.sex, p.birthdate,
      p.barangay, p.municipality, p.contact_number, p.email, (dxMap[p.id] || []).join('; '),
    ])
    return { headers, body }
  }

  const exportCsv = () => {
    const { headers, body } = exportData()
    downloadCSV('patient-records.csv', headers, body)
  }

  const exportExcel = () => {
    const { headers, body } = exportData()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const html =
      `<table border="1"><thead><tr style="background:#1a7a1a;color:#fff">${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
      `<tbody>${body.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    const blob = new Blob([`\uFEFF<html><head><meta charset="utf-8"></head><body>${html}</body></html>`], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'patient-records.xls'; a.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    const { headers, body } = exportData()
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Patient Records</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;font-size:11px;color:#111}
        h1{color:#1a7a1a;font-size:18px;border-bottom:3px solid #1a7a1a;padding-bottom:8px;margin-bottom:4px}
        .meta{font-size:10px;color:#666;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:10px}
        th{background:#1a7a1a;color:#fff;padding:6px 8px;text-align:left}
        td{padding:5px 8px;border-bottom:1px solid #e5e7eb;word-break:break-word}
        tr:nth-child(even){background:#f9fafb}
        @media print{body{padding:0}}
      </style></head><body>
      <h1>Patient Records — SmartRHU</h1>
      <div class="meta">RHU Lopez, Quezon &nbsp;|&nbsp; Records: <b>${body.length}</b> &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${body.map(row => `<tr>${row.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  return (
    <RecordPage t={t} title="Patient Records" subtitle="" onRefresh={load} fit>
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
            <SearchInput t={t} value={search} onChange={setSearch} placeholder="Search…" />
            <ExportMenu t={t} items={[
              { label: 'CSV', onClick: exportCsv },
              { label: 'Excel', onClick: exportExcel },
              { label: 'PDF', onClick: exportPdf },
            ]} />
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
        emptyText="No patients match your filters." fill />
    </RecordPage>
  )
}