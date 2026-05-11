'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Users, UserCheck, Archive, UserX, Download, X, ChevronRight } from 'lucide-react'
import AddPatientModal from './forms'
import PatientInfo from './PatientInfo'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Patient {
  id: string
  last_name: string
  first_name: string
  middle_name?: string
  age: number
  sex: string
  birthdate: string
  purok?: string
  barangay: string
  municipality: string
  contact_number: string
  email: string
  created_at: string
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const C = {
  green:  '#16a34a',
  teal:   '#0d9488',
  blue:   '#2563eb',
  purple: '#7c3aed',
  orange: '#ea580c',
  pink:   '#db2777',
  yellow: '#ca8a04',
  red:    '#dc2626',
}

const AGE_GROUPS = [
  { label: 'All Ages',            min: 0,  max: 999 },
  { label: '0–17 (Minor)',        min: 0,  max: 17  },
  { label: '18–35 (Young Adult)', min: 18, max: 35  },
  { label: '36–60 (Adult)',       min: 36, max: 60  },
  { label: '60+ (Senior)',        min: 61, max: 999 },
]

const PER_PAGE = 10

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

/** Filter pill button */
function FilterBtn({
  label, active, onClick, activeColor = C.green,
}: {
  label: string; active: boolean; onClick: () => void; activeColor?: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
        cursor: 'pointer', border: active ? 'none' : '1.5px solid rgba(22,163,74,0.25)',
        background: active ? activeColor : hov ? 'rgba(22,163,74,0.08)' : 'transparent',
        color: active ? '#fff' : C.green,
        transition: 'all 0.15s',
        boxShadow: active ? `0 4px 12px ${activeColor}44` : 'none',
        whiteSpace: 'nowrap',
      }}
    >{label}</button>
  )
}

/** Active filter chip */
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      fontSize: 11, borderRadius: 20, padding: '3px 10px 3px 12px', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'rgba(22,163,74,0.12)', color: C.green,
      border: '1px solid rgba(22,163,74,0.25)',
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.green, fontSize: 13, padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
        <X size={11} />
      </button>
    </span>
  )
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
interface Props {
  darkMode?: boolean
}

export default function RegistrarLogs({ darkMode = false }: Props) {
  const dk = darkMode

  /* ── theme tokens ── */
  const bg   = dk ? '#0d1a0f' : '#f0f4f1'
  const card = dk ? '#0f2014' : '#ffffff'
  const bdr  = dk ? '#1a3d24' : '#e5e7eb'
  const txt  = dk ? '#e2f5e9' : '#1f2937'
  const txt2 = dk ? '#6ee7b7' : '#6b7280'

  /* ── data ── */
  const [patients,    setPatients]    = useState<Patient[]>([])
  const [loading,     setLoading]     = useState(true)
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())

  /* ── ui ── */
  const [open,        setOpen]        = useState(false)
  const [viewPatient, setViewPatient] = useState<Patient | null>(null)
  const [selected,    setSelected]    = useState<string[]>([])
  const [showExport,  setShowExport]  = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  /* ── responsive ── */
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* ── filters ── */
  const [search,    setSearch]    = useState('')
  const [viewMode,  setViewMode]  = useState<'all' | 'active' | 'archived'>('active')
  const [sexFilter, setSexFilter] = useState<'All' | 'M' | 'F'>('All')
  const [ageGroup,  setAgeGroup]  = useState('All Ages')
  const [barangay,  setBarangay]  = useState('All Barangays')
  const [sortMode,  setSortMode]  = useState<'az' | 'asc' | 'desc' | 'none'>('desc')
  const [page,      setPage]      = useState(1)

  /* ── fetch ── */
  const fetchPatients = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setPatients((data as Patient[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchPatients() }, [])

  /* close export on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setShowExport(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── derived ── */
  const barangayOptions = useMemo(() => {
    const unique = Array.from(new Set(patients.map(p => p.barangay).filter(Boolean))).sort()
    return ['All Barangays', ...unique]
  }, [patients])

  const display = useMemo(() => {
    const ag = AGE_GROUPS.find(g => g.label === ageGroup) ?? AGE_GROUPS[0]
    let d = patients.filter(p => {
      const archived = archivedIds.has(p.id)
      if (viewMode === 'active'   && archived)  return false
      if (viewMode === 'archived' && !archived) return false
      if (sexFilter !== 'All' && p.sex !== sexFilter) return false
      if (p.age < ag.min || p.age > ag.max)    return false
      if (barangay !== 'All Barangays' && p.barangay !== barangay) return false
      if (search) {
        const q    = search.toLowerCase()
        const full = `${p.last_name} ${p.first_name} ${p.middle_name ?? ''} ${p.email} ${p.contact_number} ${p.barangay}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
    if (sortMode === 'az')   d = [...d].sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''))
    if (sortMode === 'asc')  d = [...d].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sortMode === 'desc') d = [...d].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return d
  }, [patients, archivedIds, viewMode, sexFilter, ageGroup, barangay, search, sortMode])

  const totalPages = Math.max(1, Math.ceil(display.length / PER_PAGE))
  const paginated  = display.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, viewMode, sexFilter, ageGroup, barangay, sortMode])

  /* ── selection ── */
  const allSel    = paginated.length > 0 && paginated.every(p => selected.includes(p.id))
  const toggleAll = () => setSelected(allSel ? [] : paginated.map(p => p.id))
  const toggleOne = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  /* ── archive ── */
  const archiveSelected = () => { setArchivedIds(prev => new Set([...prev, ...selected])); setSelected([]) }
  const archiveSingle   = (id: string) => {
    setArchivedIds(prev => new Set([...prev, id]))
    setSelected(s => s.filter(x => x !== id))
    if (viewPatient?.id === id) setViewPatient(null)
  }
  const unarchiveSingle = (id: string) =>
    setArchivedIds(prev => { const n = new Set(prev); n.delete(id); return n })

  /* ── export ── */
  const buildRows = () => display.map((p, i) => [
    i + 1, p.last_name, p.first_name, p.age, p.sex, p.birthdate,
    p.barangay, p.municipality, p.contact_number, p.email,
    archivedIds.has(p.id) ? 'Archived' : 'Active',
  ])
  const HEADERS = ['No.', 'Last Name', 'First Name', 'Age', 'Sex', 'Birthdate', 'Barangay', 'Municipality', 'Contact', 'Email', 'Status']

  const exportCSV = () => {
    const rows = buildRows().map(r => r.map(v => `"${v ?? ''}"`).join(','))
    const blob  = new Blob([[HEADERS.join(','), ...rows].join('\n')], { type: 'text/csv' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a'); a.href = url; a.download = 'patients.csv'; a.click()
    URL.revokeObjectURL(url); setShowExport(false)
  }
  const exportExcel = () => {
    const rows = buildRows().map(r => r.join('\t'))
    const blob  = new Blob([[HEADERS.join('\t'), ...rows].join('\n')], { type: 'application/vnd.ms-excel' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a'); a.href = url; a.download = 'patients.xls'; a.click()
    URL.revokeObjectURL(url); setShowExport(false)
  }
  const exportPDF = () => { window.print(); setShowExport(false) }

  /* ── clear filters ── */
  const hasActiveFilters = search || sexFilter !== 'All' || ageGroup !== 'All Ages' || barangay !== 'All Barangays'
  const clearFilters = () => { setSearch(''); setSexFilter('All'); setAgeGroup('All Ages'); setBarangay('All Barangays') }

  /* ─────────────────────────────────────────
     MOBILE CARD VIEW
  ───────────────────────────────────────── */
  const MobileCard = ({ p, i }: { p: Patient; i: number }) => {
    const sel        = selected.includes(p.id)
    const isArchived = archivedIds.has(p.id)
    return (
      <div
        onClick={() => toggleOne(p.id)}
        style={{
          background: sel ? 'rgba(22,163,74,0.06)' : card,
          border: `1px solid ${sel ? C.green : bdr}`,
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 10,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <input type="checkbox" checked={sel} onChange={() => toggleOne(p.id)}
            onClick={e => e.stopPropagation()}
            style={{ accentColor: C.green, width: 14, height: 14, flexShrink: 0 }} />
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: p.sex === 'F' ? `linear-gradient(135deg,${C.pink},${C.purple})` : `linear-gradient(135deg,${C.blue},${C.teal})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 13,
          }}>
            {p.first_name?.[0]}{p.last_name?.[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: txt, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.last_name}, {p.first_name}
            </div>
            {p.middle_name && <div style={{ fontSize: 11, color: txt2 }}>{p.middle_name}</div>}
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
            background: isArchived ? `${C.red}15` : `${C.green}18`,
            color: isArchived ? C.red : C.green,
            border: isArchived ? `1px solid ${C.red}33` : `1px solid ${C.green}33`,
            flexShrink: 0,
          }}>
            {isArchived ? 'Archived' : 'Active'}
          </span>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 10 }}>
          {[
            ['Age', `${p.age} yrs`],
            ['Sex', p.sex === 'F' ? '♀ Female' : '♂ Male'],
            ['Birthdate', p.birthdate || '—'],
            ['Address', [p.barangay, p.municipality].filter(Boolean).join(', ') || '—'],
            ['Contact', p.contact_number || '—'],
            ['Email', p.email || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <span style={{ color: txt2, fontWeight: 600 }}>{k}: </span>
              <span style={{ color: txt }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setViewPatient(p)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 800,
              color: '#fff', border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg,${C.green},${C.teal})`,
              boxShadow: `0 2px 8px ${C.green}44`,
            }}
          >View</button>
          {isArchived ? (
            <button
              onClick={() => unarchiveSingle(p.id)}
              title="Restore"
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 16, fontWeight: 800,
                color: C.green, border: `1.5px solid ${C.green}44`,
                background: 'transparent', cursor: 'pointer',
              }}
            >↩</button>
          ) : (
            <button
              onClick={() => archiveSingle(p.id)}
              title="Archive"
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 16,
                color: C.orange, border: 'none',
                background: `${C.orange}18`, cursor: 'pointer',
              }}
            >🗑️</button>
          )}
        </div>
      </div>
    )
  }

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <main style={{ flex: 1, padding: isMobile ? 14 : 24, overflowY: 'auto', background: bg }}>

      {/* ── responsive styles injected ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'flex-end',
        gap: isMobile ? 12 : 0,
        marginBottom: 20,
      }}>
        <div>
          <p style={{ color: dk ? '#4ade80' : txt2, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Registrar</p>
          <h1 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 900, color: dk ? '#4ade80' : C.green, margin: 0, lineHeight: 1 }}>Patient Records</h1>
          <p style={{ color: txt2, fontSize: 12, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: `linear-gradient(135deg,${C.green},${C.teal})`,
            color: '#fff', border: 'none', borderRadius: 14,
            padding: isMobile ? '10px 20px' : '12px 28px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            fontWeight: 800, fontSize: isMobile ? 13 : 14,
            boxShadow: '0 6px 20px rgba(22,163,74,0.4)', transition: 'all 0.2s',
            alignSelf: isMobile ? 'stretch' : 'auto',
            justifyContent: isMobile ? 'center' : 'flex-start',
          }}
        >
          <Plus size={18} /> Add Patient
        </button>
      </div>

      {/* ── Filter Panel ── */}
      <div style={{ background: card, borderRadius: 20, padding: isMobile ? '12px 14px' : '16px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: `1px solid ${bdr}` }}>

        {/* Row 1: Search + Export */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: txt2, fontSize: 14, pointerEvents: 'none' }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, contact, barangay..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 34px', borderRadius: 12, border: `1.5px solid ${bdr}`, fontSize: 12, outline: 'none', color: txt, background: bg, transition: 'border 0.15s' }}
              onFocus={e => (e.currentTarget.style.borderColor = C.green)}
              onBlur={e  => (e.currentTarget.style.borderColor = bdr)}
            />
          </div>
          <div ref={exportRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowExport(p => !p)}
              style={{
                padding: '7px 14px', borderRadius: 12, fontSize: 12, fontWeight: 800,
                border: `1.5px solid ${bdr}`, background: card, color: C.green,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              <Download size={13} /> {!isMobile && 'Export'} ▾
            </button>
            {showExport && (
              <div style={{ position: 'absolute', right: 0, top: '110%', background: card, border: `1px solid ${bdr}`, borderRadius: 14, zIndex: 99, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                {[
                  { label: '📊 Excel', fn: exportExcel },
                  { label: '📄 PDF',   fn: exportPDF   },
                  { label: '📋 CSV',   fn: exportCSV   },
                ].map(({ label, fn }) => (
                  <button key={label} onClick={fn}
                    style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: txt, display: 'block', fontWeight: 600, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: View mode */}
        <div style={{ display: 'flex', gap: 3, background: bg, borderRadius: 24, padding: 3, border: `1px solid ${bdr}`, marginBottom: 10, width: 'fit-content' }}>
          {(['all', 'active', 'archived'] as const).map(v => (
            <button key={v} onClick={() => { setViewMode(v); setSelected([]) }}
              style={{
                padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: viewMode === v ? `linear-gradient(135deg,${C.green},${C.teal})` : 'transparent',
                color: viewMode === v ? '#fff' : txt2,
                boxShadow: viewMode === v ? `0 2px 8px ${C.green}44` : 'none',
              }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Row 3: Sex + Age + Barangay + Sort — scrollable on mobile */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 4 : 0 }}>
          <FilterBtn label="All"      active={sexFilter === 'All'} onClick={() => setSexFilter('All')} />
          <FilterBtn label="♀ Female" active={sexFilter === 'F'}   onClick={() => setSexFilter('F')}   activeColor={C.pink} />
          <FilterBtn label="♂ Male"   active={sexFilter === 'M'}   onClick={() => setSexFilter('M')}   activeColor={C.blue} />

          <div style={{ width: 1, height: 24, background: bdr, flexShrink: 0 }} />

          <select
            value={ageGroup}
            onChange={e => setAgeGroup(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 12, border: `1.5px solid ${bdr}`, fontSize: 12, color: txt, background: bg, cursor: 'pointer', outline: 'none', fontWeight: 600, flexShrink: 0 }}
          >
            {AGE_GROUPS.map(g => <option key={g.label}>{g.label}</option>)}
          </select>

          <select
            value={barangay}
            onChange={e => setBarangay(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 12, border: `1.5px solid ${bdr}`, fontSize: 12, color: txt, background: bg, cursor: 'pointer', outline: 'none', fontWeight: 600, flexShrink: 0, maxWidth: isMobile ? 130 : 'none' }}
          >
            {barangayOptions.map(b => <option key={b}>{b}</option>)}
          </select>

          <div style={{ width: 1, height: 24, background: bdr, flexShrink: 0 }} />

          <FilterBtn label="A–Z"    active={sortMode === 'az'}   onClick={() => setSortMode(s => s === 'az'   ? 'none' : 'az')}   />
          <FilterBtn label="Oldest" active={sortMode === 'asc'}  onClick={() => setSortMode(s => s === 'asc'  ? 'none' : 'asc')}  />
          <FilterBtn label="Newest" active={sortMode === 'desc'} onClick={() => setSortMode(s => s === 'desc' ? 'none' : 'desc')} />
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.length > 0 && (
        <div style={{
          background: `linear-gradient(135deg,${C.orange}18,${C.yellow}18)`,
          border: `1.5px solid ${C.orange}44`, borderRadius: 14,
          padding: '12px 18px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          boxShadow: `0 4px 16px ${C.orange}22`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.orange }}>{selected.length} patient{selected.length > 1 ? 's' : ''} selected</span>
          <button onClick={() => setSelected([])} style={{ fontSize: 12, color: txt2, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Deselect</button>
          <div style={{ flex: 1 }} />
          <button
            onClick={archiveSelected}
            style={{ padding: '7px 18px', borderRadius: 12, fontSize: 12, fontWeight: 800, border: 'none', background: `linear-gradient(135deg,${C.orange},${C.yellow})`, color: '#fff', cursor: 'pointer', boxShadow: `0 4px 12px ${C.orange}44`, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Archive size={14} /> Archive ({selected.length})
          </button>
        </div>
      )}

      {/* ── MOBILE: Card view ── */}
      {isMobile ? (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: txt2 }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${C.green}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 8px', animation: 'spin 0.8s linear infinite' }} />
              Loading patients…
            </div>
          ) : paginated.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: txt2, fontSize: 13 }}>
              No patients found matching your filters.
            </div>
          ) : paginated.map((p, i) => <MobileCard key={p.id} p={p} i={i} />)}
        </div>
      ) : (
        /* ── DESKTOP: Table view ── */
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: bg, borderBottom: `2px solid ${bdr}` }}>
                  <th style={{ padding: '12px 16px' }}>
                    <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ accentColor: C.green, width: 14, height: 14 }} />
                  </th>
                  {['No.', 'Name', 'Age', 'Sex', 'Birthdate', 'Address', 'Contact No.', 'E-mail', 'Status', 'Actions'].map((h, i) => (
                    <th key={i} style={{ padding: '12px 12px', textAlign: 'left', fontWeight: 800, color: dk ? '#4ade80' : C.green, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: 48, color: txt2, fontSize: 13 }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, border: `3px solid ${C.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        Loading patients…
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: 48, color: txt2, fontSize: 13 }}>
                      No patients found matching your filters.
                    </td>
                  </tr>
                ) : paginated.map((p, i) => {
                  const sel        = selected.includes(p.id)
                  const isArchived = archivedIds.has(p.id)
                  const rowBg      = sel
                    ? (dk ? '#1a3d22' : 'rgba(22,163,74,0.06)')
                    : i % 2 === 0 ? card : (dk ? '#0d1c11' : '#fafff8')
                  return (
                    <tr key={p.id}
                      onClick={() => toggleOne(p.id)}
                      style={{ background: rowBg, borderBottom: `1px solid ${bdr}`, cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLTableRowElement).style.background = dk ? '#1a3d22' : 'rgba(22,163,74,0.04)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg }}
                    >
                      <td style={{ padding: '11px 16px' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={sel} onChange={() => toggleOne(p.id)} style={{ accentColor: C.green, width: 14, height: 14 }} />
                      </td>
                      <td style={{ padding: '11px 12px', color: txt2, fontWeight: 700 }}>{(page - 1) * PER_PAGE + i + 1}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: p.sex === 'F' ? `linear-gradient(135deg,${C.pink},${C.purple})` : `linear-gradient(135deg,${C.blue},${C.teal})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 11,
                          }}>
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: txt, fontSize: 12 }}>{p.last_name}, {p.first_name}</div>
                            {p.middle_name && <div style={{ fontSize: 10, color: txt2 }}>{p.middle_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 12px', color: txt, fontWeight: 600 }}>{p.age}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{
                          padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                          background: p.sex === 'F' ? `${C.pink}18` : `${C.blue}18`,
                          color: p.sex === 'F' ? C.pink : C.blue,
                        }}>
                          {p.sex === 'F' ? '♀ F' : '♂ M'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px', color: txt2, fontSize: 11 }}>{p.birthdate || '—'}</td>
                      <td style={{ padding: '11px 12px', color: txt, fontSize: 11 }}>{[p.barangay, p.municipality].filter(Boolean).join(', ') || '—'}</td>
                      <td style={{ padding: '11px 12px', color: p.contact_number ? txt : '#d1d5db', fontSize: 11 }}>{p.contact_number || '—'}</td>
                      <td style={{ padding: '11px 12px', color: p.email ? txt : '#d1d5db', fontSize: 11 }}>{p.email || '—'}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                          background: isArchived ? `${C.red}15`  : `${C.green}18`,
                          color:      isArchived ? C.red         : C.green,
                          border:     isArchived ? `1px solid ${C.red}33` : `1px solid ${C.green}33`,
                        }}>
                          {isArchived ? 'Archived' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => setViewPatient(p)}
                            style={{
                              padding: '4px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                              color: '#fff', border: 'none', cursor: 'pointer',
                              background: `linear-gradient(135deg,${C.green},${C.teal})`,
                              boxShadow: `0 2px 8px ${C.green}44`, whiteSpace: 'nowrap',
                            }}
                          >View</button>
                          {isArchived ? (
                            <button
                              onClick={() => unarchiveSingle(p.id)}
                              title="Restore"
                              style={{
                                padding: '4px 7px', borderRadius: 8, fontSize: 13, fontWeight: 800,
                                color: C.green, border: `1.5px solid ${C.green}44`,
                                background: 'transparent', cursor: 'pointer', lineHeight: 1,
                              }}
                            >↩</button>
                          ) : (
                            <button
                              onClick={() => archiveSingle(p.id)}
                              title="Archive"
                              style={{
                                padding: '4px 7px', borderRadius: 8, fontSize: 14, fontWeight: 800,
                                color: C.orange, border: 'none',
                                background: `${C.orange}18`, cursor: 'pointer', lineHeight: 1,
                              }}
                            >🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderTop: `1px solid ${bdr}`, background: bg, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: txt2, fontWeight: 600 }}>
              {display.length === 0
                ? 'No results'
                : `Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, display.length)} of ${display.length} patients`}
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: `1.5px solid ${bdr}`, background: card, color: page === 1 ? txt2 : C.green, cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >← Prev</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  style={{
                    padding: '5px 11px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: page === i + 1 ? `linear-gradient(135deg,${C.green},${C.teal})` : 'transparent',
                    color: page === i + 1 ? '#fff' : txt2,
                    boxShadow: page === i + 1 ? `0 2px 8px ${C.green}44` : 'none',
                  }}
                >{i + 1}</button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: `1.5px solid ${bdr}`, background: card, color: page === totalPages ? txt2 : C.green, cursor: page === totalPages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Pagination ── */}
      {isMobile && display.length > PER_PAGE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${bdr}`, background: card, color: page === 1 ? txt2 : C.green, cursor: page === 1 ? 'default' : 'pointer' }}
          >← Prev</button>
          <span style={{ padding: '8px 14px', fontSize: 13, color: txt2, fontWeight: 600 }}>{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${bdr}`, background: card, color: page === totalPages ? txt2 : C.green, cursor: page === totalPages ? 'default' : 'pointer' }}
          >Next →</button>
        </div>
      )}

      {/* ── Modals ── */}
      <AddPatientModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSaved={() => { setOpen(false); fetchPatients() }}
      />

      {viewPatient && (
        <PatientInfo
          patient={viewPatient}
          onClose={() => setViewPatient(null)}
        />
      )}
    </main>
  )
}