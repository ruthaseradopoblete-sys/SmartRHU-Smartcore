'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useAdmin, RecordPage, StatStrip, Toolbar, SearchInput, Segmented,
  Pill, DataView, Drawer, Field, Section, downloadCSV, ExportBtn, type Column,
} from './adminUI'

interface LabRequest {
  id: string
  status?: string
  request_date?: string
  created_at?: string
  requested_by?: string
  patient_id?: string
  name: string
  age?: string | number
  gender?: string
  address?: string
  raw: any
}

export default function LabRecords({ darkMode }: { darkMode: boolean }) {
  const t = useAdmin(darkMode)

  const [requests, setRequests] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'pending' | 'completed'>('all')
  const [view, setView] = useState<LabRequest | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('laboratory_requests')
      .select(`*, patients ( id, first_name, last_name, age, sex, purok, barangay, municipality, contact_number, email )`)
      .order('created_at', { ascending: false })
    if (data) {
      setRequests(data.map((r: any) => ({
        ...r,
        name: r.patients ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim() : r.name || '—',
        age: r.patients?.age ?? r.age ?? '—',
        gender: r.patients?.sex === 'F' ? 'Female' : r.patients?.sex === 'M' ? 'Male' : r.gender || '—',
        address: r.patients ? [r.patients.purok, r.patients.barangay, r.patients.municipality].filter(Boolean).join(', ') : r.address || '—',
        raw: r,
      })))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const rows = useMemo(() => requests.filter(r => {
    if (status !== 'all' && (r.status || 'pending') !== status) return false
    if (search) {
      const q = search.toLowerCase()
      if (!`${r.name} ${r.id} ${r.request_date ?? ''}`.toLowerCase().includes(q)) return false
    }
    return true
  }), [requests, status, search])

  const completed = requests.filter(r => r.status === 'completed').length
  const pending = requests.length - completed

  const columns: Column<LabRequest>[] = [
    { key: 'no', header: '#', width: 44, cell: (_r, i) => <span style={{ color: t.txt2, fontWeight: 700 }}>{i + 1}</span> },
    { key: 'name', header: 'Patient', cell: r => (
      <div>
        <div style={{ fontWeight: 700, color: t.txt }}>{r.name || '—'}</div>
        <div style={{ fontSize: 10, color: t.txt2 }}>ID: {String(r.id).slice(0, 8)}</div>
      </div>
    ) },
    { key: 'age', header: 'Age', cell: r => r.age ?? '—' },
    { key: 'sex', header: 'Sex', cell: r => r.gender ?? '—' },
    { key: 'date', header: 'Request Date', cell: r => <span style={{ fontSize: 11.5, color: t.txt2 }}>{r.request_date || (r.created_at ? new Date(r.created_at).toLocaleDateString('en-PH') : '—')}</span> },
    { key: 'status', header: 'Status', cell: r => <Pill tone={r.status === 'completed' ? 'green' : 'amber'}>{r.status === 'completed' ? 'Completed' : 'Pending'}</Pill> },
  ]

  const exportCsv = () => downloadCSV(
    'lab-records.csv',
    ['No.', 'Patient', 'Age', 'Sex', 'Request Date', 'Status'],
    rows.map((r, i) => [i + 1, r.name, r.age ?? '', r.gender ?? '', r.request_date ?? '', r.status ?? 'pending']),
  )

  // Render the raw lab row as read-only key/value fields, skipping the joined object & internals
  const detailFields = (raw: any) =>
    Object.entries(raw)
      .filter(([k, v]) => k !== 'patients' && k !== 'raw' && typeof v !== 'object')
      .map(([k, v]) => ({ k, v }))

  return (
    <RecordPage t={t} title="Lab Records" subtitle="Read-only view of all laboratory requests and results" onRefresh={load}>
      <StatStrip t={t} items={[
        { label: 'Total Requests', value: requests.length, color: '#1a7a1a' },
        { label: 'Completed', value: completed, color: '#15803d' },
        { label: 'Pending', value: pending, color: '#d97706', alert: pending > 0 },
      ]} />

      <Toolbar t={t}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SearchInput t={t} value={search} onChange={setSearch} placeholder="Search patient, ID, date…" />
          <ExportBtn t={t} onClick={exportCsv} />
        </div>
        <Segmented t={t} value={status} onChange={setStatus} options={[
          { value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' },
        ]} />
      </Toolbar>

      <DataView t={t} columns={columns} rows={rows} loading={loading}
        keyOf={r => r.id} resetKey={`${search}|${status}`}
        emptyText="No lab requests found." onRowClick={setView} />

      <Drawer t={t} open={!!view} onClose={() => setView(null)}
        title={view?.name || 'Lab Request'}
        subtitle={view ? `${view.gender} · ${view.age} yrs` : ''} accent="#0891b2">
        {view && (
          <>
            <Section t={t} title="Patient">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field t={t} label="Name" value={view.name} />
                <Field t={t} label="Age" value={view.age} />
                <Field t={t} label="Sex" value={view.gender} />
                <Field t={t} label="Address" value={view.address} />
              </div>
            </Section>
            <Section t={t} title="Request">
              <div style={{ marginBottom: 8 }}>
                <Pill tone={view.status === 'completed' ? 'green' : 'amber'}>{view.status === 'completed' ? 'Completed' : 'Pending'}</Pill>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {detailFields(view.raw).map(({ k, v }) => (
                  <Field key={k} t={t} label={k.replace(/_/g, ' ')} value={String(v ?? '—')} />
                ))}
              </div>
            </Section>
          </>
        )}
      </Drawer>
    </RecordPage>
  )
}