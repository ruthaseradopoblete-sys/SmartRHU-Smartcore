'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Download, X } from 'lucide-react'
import AddPatientModal from './forms'
import PatientInfo from './PatientInfo'
import { generatePatientTemplate } from './generate-template'
import ImportPatientsModal from './ImportPatientModal'

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
  last_visit_date?: string
  visit_count?: number
}

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const T = {
  green:      '#16a34a',
  greenDark:  '#0d3b1f',
  greenMid:   '#166534',
  greenLight: '#dcfce7',
  mint:       '#4ade80',
  // surfaces (light)
  bg:         '#f0f7f2',
  surface:    '#ffffff',
  surface2:   '#f6faf7',
  border:     'rgba(22,163,74,0.15)',
  // text (light)
  text:       '#0a2912',
  text2:      '#4b6557',
  text3:      '#9ca3af',
  shadow:     '0 2px 16px rgba(13,59,31,0.08)',
  radius:     14,
  radiusSm:   8,
  // dark surfaces
  bgDk:       '#061a0d',
  surfDk:     '#0d2516',
  surf2Dk:    '#0f2e1a',
  borderDk:   'rgba(74,222,128,0.1)',
  textDk:     '#e2f5e9',
  text2Dk:    '#9abea6',
  text3Dk:    '#4b6557',
  shadowDk:   '0 2px 16px rgba(0,0,0,0.4)',
  // semantic (kept minimal — only for archived/error)
  red:        '#dc2626',
  redLight:   'rgba(220,38,38,0.10)',
  redBorder:  'rgba(220,38,38,0.20)',
} as const

const LOPEZ_BARANGAYS = [
  'Bacungan','Bagacay','Banabahin Ibaba','Banabahin Ilaya','Bayabas','Bebito','Bigajo',
  'Binahian A','Binahian B','Binahian C','Bocboc','Buenavista','Burgos (Poblacion)',
  'Buyacanin','Cagacag','Calantipayan','Canda Ibaba','Canda Ilaya','Cawayan','Cawayanin',
  'Cogorin Ibaba','Cogorin Ilaya','Concepcion','Danlagan (Poblacion)','De La Paz',
  'Del Pilar','Del Rosario','Esperanza Ibaba','Esperanza Ilaya','Gomez (Poblacion)',
  'Guihay','Guinuangan','Guites','Hondagua','Ilayang Ilog A','Ilayang Ilog B',
  'Inalusan','Jongo','Lalaguna','Lourdes','Mabanban','Mabini','Magallanes','Maguilayan',
  'Mahayod-Hayod','Mal-ay','Mandoog','Manguisian','Matinik','Magsaysay (Poblacion)',
  'Monteclaro','Pamampangin','Pansol','Penarancia','Pisipis','Rizal (Poblacion)',
  'Rizal (Rural)','Roma','Rosario','Samat','San Andres','San Antonio',
  'San Francisco A','San Francisco B','San Isidro','San Jose','San Lorenzo Ruiz (Poblacion)',
  'San Miguel (Dao)','San Pedro','San Rafael','San Roque','Silang','Sta. Catalina',
  'Sta. Elena','Sta. Jacobe','Sta. Lucia','Sta. Maria','Sta. Rosa','Sta. Teresa',
  'Sto. Nino Ibaba','Sto. Nino Ilaya','Sugod','Sumilang','Talolong (Poblacion)',
  'Tan-ag Ibaba','Tan-ag Ilaya','Tocalin','Vegaflor','Vergana','Veronica',
  'Villa Aurora','Villa Espina','Villageda','Villahermosa','Villamonte','Villanacaob',
]

const AGE_GROUPS = [
  { label: 'All Ages',            min: 0,  max: 999 },
  { label: '0-17 (Minor)',        min: 0,  max: 17  },
  { label: '18-35 (Young Adult)', min: 18, max: 35  },
  { label: '36-60 (Adult)',       min: 36, max: 60  },
  { label: '60+ (Senior)',        min: 61, max: 999 },
]

const PER_PAGE = 10

function formatDate(dateStr?: string) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '--'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
function isPatientArchived(p: Patient) {
  if (!p.created_at) return false
  const created = new Date(p.created_at).getTime()
  if (isNaN(created)) return false
  return Date.now() - created >= ONE_YEAR_MS
}

/* ── BarangaySelect ────────────────────────────────────────────────────────── */
function BarangaySelect({ value, onChange, bg, bdr, txt, txt2 }: {
  value: string; onChange: (v: string) => void
  bg: string; bdr: string; txt: string; txt2: string
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return LOPEZ_BARANGAYS.filter(b => b.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = value !== 'All Barangays'

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => { setOpen(p => !p); setQuery('') }}
        style={{
          padding: '5px 12px', borderRadius: 12,
          border: `1.5px solid ${isActive ? T.green : bdr}`,
          fontSize: 12, color: isActive ? T.green : txt,
          background: isActive ? `${T.green}12` : bg,
          cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
          whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'all 0.15s',
        }}
      >
        📍 {isActive ? value : 'All Barangays'}
        <span style={{ marginLeft: 'auto', fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: bg, border: `1.5px solid ${T.mint}`,
          borderRadius: T.radiusSm, boxShadow: T.shadow,
          width: 240, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${bdr}` }}>
            <input
              autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search barangay..."
              style={{
                width: '100%', boxSizing: 'border-box', padding: '6px 10px',
                borderRadius: T.radiusSm, border: `1.5px solid ${bdr}`,
                fontSize: 12, color: txt, background: bg, outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = T.green)}
              onBlur={e  => (e.currentTarget.style.borderColor = bdr)}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {['All Barangays', ...filtered].map((b, i) => {
              const selected = value === b
              return (
                <div key={b}
                  onClick={() => { onChange(b); setOpen(false) }}
                  style={{
                    padding: i === 0 ? '8px 14px' : '7px 14px',
                    fontSize: 12, cursor: 'pointer', fontWeight: i === 0 ? 700 : 600,
                    color: selected ? T.green : txt,
                    background: selected ? `${T.green}12` : 'transparent',
                    borderBottom: i === 0 ? `1px solid ${bdr}` : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${T.green}10`)}
                  onMouseLeave={e => (e.currentTarget.style.background = selected ? `${T.green}12` : 'transparent')}
                >{b}</div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '12px 14px', fontSize: 12, color: txt2, textAlign: 'center' }}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── FilterBtn ─────────────────────────────────────────────────────────────── */
function FilterBtn({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
        cursor: 'pointer',
        border: active ? 'none' : `1.5px solid ${T.border}`,
        background: active ? T.green : hov ? `${T.green}10` : 'transparent',
        color: active ? '#fff' : T.green,
        transition: 'all 0.15s',
        boxShadow: active ? `0 4px 12px ${T.green}44` : 'none',
        whiteSpace: 'nowrap',
      }}
    >{label}</button>
  )
}

/* ── Chip ──────────────────────────────────────────────────────────────────── */
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      fontSize: 11, borderRadius: 20, padding: '3px 10px 3px 12px', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: T.greenLight, color: T.greenDark,
      border: `1px solid ${T.green}33`,
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.green, fontSize: 13, padding: 0, lineHeight: 1,
          display: 'flex', alignItems: 'center',
        }}
      >
        <X size={11} />
      </button>
    </span>
  )
}

/* ── VisitDetailPanel ──────────────────────────────────────────────────────── */
function VisitDetailPanel({ visit, onClose, bg, bdr, txt, txt2 }: {
  visit: any; onClose: () => void; bg: string; bdr: string; txt: string; txt2: string
}) {
  const EMPTY = '--'
  const diagnosis = Array.isArray(visit.assessments) && visit.assessments.length > 0
    ? visit.assessments.join(', ')
    : (visit.assessment || visit.diagnosis || EMPTY)
  const icd10 = Array.isArray(visit.icd10_codes) && visit.icd10_codes.length > 0
    ? visit.icd10_codes.join(', ') : ''

  const vitalFields: [string, string][] = [
    ['Blood Pressure', visit.blood_pressure ?? visit.blood_pressure_mmhg ?? EMPTY],
    ['Weight',         visit.weight != null ? `${visit.weight} kg` : visit.weight_kg != null ? `${visit.weight_kg} kg` : EMPTY],
    ['Temperature',    visit.temperature != null ? `${visit.temperature} C` : visit.temperature_c != null ? `${visit.temperature_c} C` : EMPTY],
    ['Height',         visit.height != null ? `${visit.height} cm` : visit.height_cm != null ? `${visit.height_cm} cm` : EMPTY],
    ['Heart Rate',     visit.heart_rate != null ? `${visit.heart_rate} bpm` : visit.heart_rate_bpm != null ? `${visit.heart_rate_bpm} bpm` : EMPTY],
    ['Resp. Rate',     visit.respiratory_rate != null ? `${visit.respiratory_rate} cpm` : visit.respiratory_rate_cpm != null ? `${visit.respiratory_rate_cpm} cpm` : EMPTY],
  ]

  type SoapCfg = { bg: string; border: string; accent: string; tag: string }
  const soapFields: [string, string, SoapCfg, string][] = [
    ['Chief Complaint',       visit.subjective || EMPTY, { bg: T.surface2, border: T.border, accent: T.greenDark, tag: T.greenLight }, 'S'],
    ['Objective',             visit.objective  || EMPTY, { bg: T.surface2, border: T.border, accent: T.green,     tag: T.greenLight }, 'O'],
    ['Assessment / Diagnosis', diagnosis,                { bg: T.greenLight, border: `${T.green}33`, accent: T.greenDark, tag: `${T.mint}44` }, 'A'],
    ['Plan',                  visit.plan       || EMPTY, { bg: T.surface2, border: T.border, accent: T.greenMid,  tag: T.greenLight }, 'P'],
    ...(icd10 ? [['ICD-10 Codes', icd10, { bg: T.greenLight, border: `${T.green}33`, accent: T.greenDark, tag: `${T.mint}55` }, 'ICD'] as [string, string, SoapCfg, string]] : []),
  ]

  const hasVitals = vitalFields.some(([, v]) => v !== EMPTY)
  const hasSoap   = soapFields.some(([, v]) => v !== EMPTY)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{
        background: bg, borderRadius: T.radius, width: '100%', maxWidth: 540,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: T.shadow, border: `1px solid ${bdr}`,
      }}>
        {/* Header */}
        <div style={{
          background: T.greenDark, padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          borderBottom: `2px solid ${T.mint}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(74,222,128,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: T.mint, fontWeight: 800 }}>Cl</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Visit Details</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{ background: 'rgba(74,222,128,0.2)', borderRadius: 99, padding: '2px 10px', fontSize: 11, color: T.mint, fontWeight: 700 }}>
                  {formatDate(visit.consultation_date || visit.queue_date || visit.created_at)}
                </span>
                {visit.status === 'done' && (
                  <span style={{ background: `${T.green}33`, borderRadius: 99, padding: '2px 10px', fontSize: 10, color: T.mint, fontWeight: 700 }}>Completed</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(74,222,128,0.15)', border: 'none', color: T.mint, borderRadius: T.radiusSm, width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.15)')}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16, background: bg }}>
          {hasVitals && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: txt2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 12, background: T.green, borderRadius: 99, display: 'inline-block' }} />
                Vitals
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {vitalFields.map(([label, value]) => (
                  <div key={label} style={{
                    background: value === EMPTY ? bg : T.surface,
                    border: `1.5px solid ${value === EMPTY ? bdr : T.border}`,
                    borderRadius: 12, padding: '10px 12px', opacity: value === EMPTY ? 0.4 : 1,
                    boxShadow: value === EMPTY ? 'none' : T.shadow,
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: txt2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: value === EMPTY ? txt2 : T.green }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasSoap && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: txt2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 12, background: T.mint, borderRadius: 99, display: 'inline-block' }} />
                SOAP Notes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {soapFields.map(([label, value, cfg, short]) => (
                  <div key={label} style={{
                    background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                    borderRadius: 12, overflow: 'hidden',
                    opacity: value === EMPTY ? 0.5 : 1,
                    boxShadow: value === EMPTY ? 'none' : T.shadow,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${cfg.border}` }}>
                      <span style={{ background: cfg.tag, color: cfg.accent, borderRadius: 6, padding: '2px 9px', fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>{short}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.accent }}>{label}</span>
                    </div>
                    <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: value === EMPTY ? 400 : 500, color: value === EMPTY ? txt2 : txt, lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 36 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasVitals && !hasSoap && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: txt2, fontSize: 13 }}>No details recorded for this visit yet.</div>
          )}
        </div>

        <div style={{ padding: '10px 20px', borderTop: `1px solid ${bdr}`, background: T.surface2, flexShrink: 0 }} />
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────────────── */
export default function RegistrarLogs({ darkMode = false }: { darkMode?: boolean }) {
  const dk = darkMode
  const bg   = dk ? T.bgDk    : T.bg
  const card = dk ? T.surfDk  : T.surface
  const bdr  = dk ? T.borderDk : T.border
  const txt  = dk ? T.textDk  : T.text
  const txt2 = dk ? T.text2Dk : T.text2
  const shadow = dk ? T.shadowDk : T.shadow

  const [patients,          setPatients]          = useState<Patient[]>([])
  const [loading,           setLoading]           = useState(true)
  const [open,              setOpen]              = useState(false)
  const [showImport,        setShowImport]        = useState(false)
  const [viewPatient,       setViewPatient]       = useState<Patient | null>(null)
  const [selectedVisitDate, setSelectedVisitDate] = useState<string | null>(null)
  const [showExport,        setShowExport]        = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  const [search,    setSearch]    = useState('')
  const [viewMode,  setViewMode]  = useState<'all' | 'active' | 'archived'>('active')
  const [sexFilter, setSexFilter] = useState<'All' | 'M' | 'F'>('All')
  const [ageGroup,  setAgeGroup]  = useState('All Ages')
  const [barangay,  setBarangay]  = useState('All Barangays')
  const [sortMode,  setSortMode]  = useState<'az' | 'asc' | 'desc' | 'none'>('desc')
  const [page,      setPage]      = useState(1)

  const [visitPatient,  setVisitPatient]  = useState<Patient | null>(null)
  const [visits,        setVisits]        = useState<any[]>([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const val = (e as CustomEvent<string>).detail ?? ''
      setSearch(val)
    }
    window.addEventListener('topbar-search', handler as EventListener)
    return () => window.removeEventListener('topbar-search', handler as EventListener)
  }, [])

  const fetchPatients = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false })
    if (error || !data) { setLoading(false); return }

    const { data: consultData } = await supabase
      .from('soap_consultations')
      .select('patient_id, consultation_date, queue_date')
      .order('consultation_date', { ascending: false })

    const allPatientsRaw = data as Patient[]

    const nameToIds = new Map<string, string[]>()
    for (const p of allPatientsRaw) {
      const k = `${(p.last_name || '').toLowerCase().trim()}__${(p.first_name || '').toLowerCase().trim()}`
      if (!nameToIds.has(k)) nameToIds.set(k, [])
      nameToIds.get(k)!.push(p.id)
    }

    const nameVisitMap = new Map<string, { count: number; last_visit: string }>()
    if (consultData) {
      const idToName = new Map<string, string>()
      for (const p of allPatientsRaw) {
        idToName.set(p.id, `${(p.last_name || '').toLowerCase().trim()}__${(p.first_name || '').toLowerCase().trim()}`)
      }
      const seen = new Set<string>()
      for (const c of consultData) {
        const nameKey = idToName.get(c.patient_id)
        if (!nameKey) continue
        const dateKey = (c.consultation_date || c.queue_date || '').slice(0, 10)
        if (!dateKey) continue
        const uniq = `${nameKey}__${dateKey}`
        if (seen.has(uniq)) continue
        seen.add(uniq)
        if (!nameVisitMap.has(nameKey)) nameVisitMap.set(nameKey, { count: 0, last_visit: c.consultation_date })
        nameVisitMap.get(nameKey)!.count++
      }
    }

    const patientMap = new Map<string, Patient & { visit_count: number; last_visit_date?: string }>()
    for (const p of allPatientsRaw) {
      const k  = `${(p.last_name || '').toLowerCase().trim()}__${(p.first_name || '').toLowerCase().trim()}`
      const vi = nameVisitMap.get(k)
      if (!patientMap.has(k)) {
        patientMap.set(k, { ...p, visit_count: vi?.count ?? 0, last_visit_date: vi?.last_visit })
      } else {
        const ex    = patientMap.get(k)!
        const score = (x: Patient) => [x.contact_number, x.email, x.purok, x.barangay].filter(Boolean).length
        if (score(p) > score(ex)) patientMap.set(k, { ...p, visit_count: vi?.count ?? 0, last_visit_date: vi?.last_visit })
      }
    }

    setPatients(Array.from(patientMap.values()))
    setLoading(false)
  }

  useEffect(() => { fetchPatients() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const display = useMemo(() => {
    const ag = AGE_GROUPS.find(g => g.label === ageGroup) ?? AGE_GROUPS[0]
    let d = patients.filter(p => {
      const archived = isPatientArchived(p)
      if (viewMode === 'active'   && archived)  return false
      if (viewMode === 'archived' && !archived) return false
      if (sexFilter !== 'All' && p.sex !== sexFilter) return false
      if (p.age != null && p.age > 0 && (p.age < ag.min || p.age > ag.max)) return false
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
  }, [patients, viewMode, sexFilter, ageGroup, barangay, search, sortMode])

  const totalPages = Math.max(1, Math.ceil(display.length / PER_PAGE))
  const paginated  = display.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search, viewMode, sexFilter, ageGroup, barangay, sortMode])

  const buildRows = () => display.map((p, i) => [
    i + 1, p.last_name, p.first_name, p.age, p.sex, p.birthdate,
    p.barangay, p.municipality, p.contact_number, p.email,
    p.visit_count ?? 0, isPatientArchived(p) ? 'Archived' : 'Active',
  ])
  const HEADERS = ['No.', 'Last Name', 'First Name', 'Age', 'Sex', 'Status', 'Birthdate', 'Barangay', 'Municipality', 'Contact', 'Email', 'Visits']

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

  const hasActiveFilters = search || sexFilter !== 'All' || ageGroup !== 'All Ages' || barangay !== 'All Barangays'
  const clearFilters     = () => { setSearch(''); setSexFilter('All'); setAgeGroup('All Ages'); setBarangay('All Barangays') }

  const openVisitHistory = async (p: Patient) => {
    setVisitPatient(p)
    setSelectedVisit(null)
    setVisitsLoading(true)

    let patientIds: string[] = [p.id]
    if (p.last_name && p.first_name) {
      const { data: dupes } = await supabase
        .from('patients').select('id')
        .ilike('last_name', p.last_name.trim())
        .ilike('first_name', p.first_name.trim())
      if (dupes && dupes.length > 1) patientIds = dupes.map((d: any) => d.id)
    }

    const [{ data }, { data: examData }] = await Promise.all([
      supabase.from('soap_consultations').select('*').in('patient_id', patientIds).order('consultation_date', { ascending: false }),
      supabase.from('physical_exam_findings').select('*').in('patient_id', patientIds).order('created_at', { ascending: false }),
    ])

    const raw      = data || []
    const examRows = examData || []

    const sortedConsults = [...raw].sort((a, b) => {
      const da = a.consultation_date || a.queue_date || a.created_at || ''
      const db = b.consultation_date || b.queue_date || b.created_at || ''
      return da.localeCompare(db)
    })

    const examByDate = new Map<string, any>()
    for (const e of [...examRows].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))) {
      if (!e.created_at) continue
      const utcDate   = e.created_at.slice(0, 10)
      const localDate = new Date(new Date(e.created_at).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
      if (!examByDate.has(`${e.patient_id}__${utcDate}`))   examByDate.set(`${e.patient_id}__${utcDate}`, e)
      if (!examByDate.has(`${e.patient_id}__${localDate}`)) examByDate.set(`${e.patient_id}__${localDate}`, e)
      if (!examByDate.has(utcDate))   examByDate.set(utcDate, e)
      if (!examByDate.has(localDate)) examByDate.set(localDate, e)
    }

    const seen = new Map<string, any>()
    for (const v of sortedConsults) {
      const dateKey   = (v.consultation_date || v.queue_date || v.created_at || '').slice(0, 10)
      const examMatch = examByDate.get(`${v.patient_id}__${dateKey}`) ?? examByDate.get(dateKey) ?? null
      const enriched  = {
        ...v,
        blood_pressure:   v.blood_pressure   ?? examMatch?.blood_pressure_mmhg  ?? null,
        weight:           v.weight           ?? examMatch?.weight_kg             ?? null,
        temperature:      v.temperature      ?? examMatch?.temperature_c         ?? null,
        height:           v.height           ?? examMatch?.height_cm             ?? null,
        heart_rate:       v.heart_rate       ?? examMatch?.heart_rate_bpm        ?? null,
        respiratory_rate: v.respiratory_rate ?? examMatch?.respiratory_rate_cpm  ?? null,
      }
      if (!seen.has(dateKey)) {
        seen.set(dateKey, enriched)
      } else {
        const existing = seen.get(dateKey)
        const score    = (r: any) =>
          [r.blood_pressure, r.weight, r.temperature, r.height, r.heart_rate,
           r.subjective, r.assessments?.length ? r.assessments[0] : null, r.objective, r.plan]
            .filter(x => x != null && x !== '').length
        if (score(enriched) > score(existing)) seen.set(dateKey, enriched)
      }
    }

    setVisits(Array.from(seen.values()).sort((a, b) => {
      const da = a.consultation_date || a.queue_date || a.created_at || ''
      const db = b.consultation_date || b.queue_date || b.created_at || ''
      return db.localeCompare(da)
    }))
    setVisitsLoading(false)
  }

  /* Avatar initials circle */
 const Avatar = ({ p, size = 30 }: { p: Patient; size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: p.sex === 'F'
        ? 'linear-gradient(135deg, #9333ea, #db2777)'
        : 'linear-gradient(135deg, #2563eb, #0d9488)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.37,
    }}>
      {p.first_name?.[0]}{p.last_name?.[0]}
    </div>
  )

  /* Status badge */
  const StatusBadge = ({ archived }: { archived: boolean }) => (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
      background: archived ? T.redLight : T.greenLight,
      color:      archived ? T.red      : T.greenDark,
      border:     archived ? `1px solid ${T.redBorder}` : `1px solid ${T.green}33`,
      flexShrink: 0,
    }}>
      {archived ? 'Archived' : 'Active'}
    </span>
  )

  /* Sex badge */
 const SexBadge = ({ sex }: { sex: string }) => (
    <span style={{
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 800,
      background: sex === 'F' ? '#f5f3ff' : '#eff6ff',
      color:      sex === 'F' ? '#7c3aed' : '#2563eb',
    }}>
      {sex === 'F' ? 'F' : 'M'}
    </span>
  )

  const MobileCard = ({ p }: { p: Patient }) => {
    const isArchived = isPatientArchived(p)
    return (
      <div
        onClick={() => openVisitHistory(p)}
        style={{
          background: card, border: `1px solid ${bdr}`,
          borderRadius: T.radius, padding: '14px 16px', marginBottom: 10,
          cursor: 'pointer', transition: 'all 0.15s', boxShadow: shadow,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar p={p} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: txt, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.last_name}, {p.first_name}
            </div>
            {p.middle_name && <div style={{ fontSize: 11, color: txt2 }}>{p.middle_name}</div>}
          </div>
          <StatusBadge archived={isArchived} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12 }}>
          {[
            ['Age',      `${p.age} yrs`],
            ['Sex',      p.sex === 'F' ? 'Female' : 'Male'],
            ['Contact',  p.contact_number || '--'],
            ['Barangay', p.barangay       || '--'],
            ['Visits',   `${p.visit_count ?? 0} visit${(p.visit_count ?? 0) !== 1 ? 's' : ''}`],
          ].map(([k, v]) => (
            <div key={k}>
              <span style={{ color: txt2, fontWeight: 600 }}>{k}: </span>
              <span style={{ color: txt }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <main style={{ flex: 1, padding: isMobile ? 14 : 24, overflowY: 'auto', background: bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end',
        gap: isMobile ? 12 : 0, marginBottom: 20,
      }}>
        <div>
          <p style={{ color: T.mint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Registrar</p>
          <h1 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 900, color: dk ? T.mint : T.greenDark, margin: 0, lineHeight: 1 }}>PATIENT RECORDS</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignSelf: isMobile ? 'stretch' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
          <button
            onClick={() => setShowImport(true)}
            style={{
              background: 'transparent', color: T.green, border: `1.5px solid ${T.green}`,
              borderRadius: T.radius, padding: isMobile ? '10px 16px' : '11px 22px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontWeight: 800, fontSize: isMobile ? 12 : 13, transition: 'all 0.2s',
              justifyContent: 'center', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.greenLight }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {!isMobile && 'Import Patients'}
          </button>
          <button
            onClick={() => setOpen(true)}
            style={{
              background: T.greenMid, color: '#fff', border: 'none',
              borderRadius: T.radius, padding: isMobile ? '10px 20px' : '12px 28px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              fontWeight: 800, fontSize: isMobile ? 13 : 14,
              boxShadow: `0 6px 20px ${T.green}44`, transition: 'all 0.2s',
              justifyContent: 'center', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.greenMid; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = T.green;    e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <Plus size={18} /> Add Patient
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: card, borderRadius: T.radius,
        padding: isMobile ? '12px 14px' : '16px 20px',
        marginBottom: 16, boxShadow: shadow, border: `1px solid ${bdr}`,
      }}>
        {/* Search + export row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 36px 8px 34px',
                borderRadius: T.radiusSm, border: `1.5px solid ${bdr}`,
                fontSize: 12, outline: 'none', color: txt, background: bg, transition: 'border 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = T.green)}
              onBlur={e  => (e.currentTarget.style.borderColor = bdr)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: txt2, display: 'flex', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div ref={exportRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowExport(p => !p)}
              style={{
                padding: '7px 14px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 800,
                border: `1.5px solid ${bdr}`, background: card, color: T.green,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: shadow, whiteSpace: 'nowrap',
              }}
            >
              <Download size={13} /> {!isMobile && 'Export'}
            </button>
            {showExport && (
              <div style={{
                position: 'absolute', right: 0, top: '110%',
                background: card, border: `1px solid ${bdr}`,
                borderRadius: T.radiusSm, zIndex: 99, minWidth: 140,
                boxShadow: shadow, overflow: 'hidden',
              }}>
                {[{ label: 'Excel', fn: exportExcel }, { label: 'PDF', fn: exportPDF }].map(({ label, fn }) => (
                  <button
                    key={label} onClick={fn}
                    style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: txt, display: 'block', fontWeight: 600 }}
                    onMouseEnter={e => (e.currentTarget.style.background = bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* View mode toggle */}
        <div style={{
          display: 'flex', gap: 3, background: bg,
          borderRadius: 24, padding: 3, border: `1px solid ${bdr}`,
          marginBottom: 10, width: 'fit-content',
        }}>
          {(['all', 'active', 'archived'] as const).map(v => (
            <button
              key={v} onClick={() => setViewMode(v)}
              style={{
                padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: viewMode === v ? T.green : 'transparent',
                color:      viewMode === v ? '#fff'  : txt2,
                boxShadow:  viewMode === v ? `0 2px 8px ${T.green}44` : 'none',
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterBtn label="All"    active={sexFilter === 'All'} onClick={() => setSexFilter('All')} />
          <FilterBtn label="Female" active={sexFilter === 'F'}   onClick={() => setSexFilter('F')}   />
          <FilterBtn label="Male"   active={sexFilter === 'M'}   onClick={() => setSexFilter('M')}   />
          <div style={{ width: 1, height: 24, background: bdr, flexShrink: 0 }} />
          <select
            value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
            style={{
              padding: '5px 10px', borderRadius: 12, border: `1.5px solid ${bdr}`,
              fontSize: 12, color: txt, background: bg,
              cursor: 'pointer', outline: 'none', fontWeight: 600, flexShrink: 0,
            }}
          >
            {AGE_GROUPS.map(g => <option key={g.label}>{g.label}</option>)}
          </select>
          <BarangaySelect value={barangay} onChange={setBarangay} bg={bg} bdr={bdr} txt={txt} txt2={txt2} />
          <div style={{ width: 1, height: 24, background: bdr, flexShrink: 0 }} />
          <FilterBtn label="A-Z"    active={sortMode === 'az'}   onClick={() => setSortMode(s => s === 'az'   ? 'none' : 'az')}   />
          <FilterBtn label="Oldest" active={sortMode === 'asc'}  onClick={() => setSortMode(s => s === 'asc'  ? 'none' : 'asc')}  />
          <FilterBtn label="Newest" active={sortMode === 'desc'} onClick={() => setSortMode(s => s === 'desc' ? 'none' : 'desc')} />
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: txt2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Filters:</span>
            {search                        && <Chip label={`"${search}"`}                         onRemove={() => setSearch('')}               />}
            {sexFilter !== 'All'           && <Chip label={sexFilter === 'F' ? 'Female' : 'Male'} onRemove={() => setSexFilter('All')}         />}
            {ageGroup  !== 'All Ages'      && <Chip label={ageGroup}                               onRemove={() => setAgeGroup('All Ages')}     />}
            {barangay  !== 'All Barangays' && <Chip label={barangay}                               onRemove={() => setBarangay('All Barangays')}/>}
            <button
              onClick={clearFilters}
              style={{ fontSize: 11, background: T.redLight, border: 'none', color: T.red, cursor: 'pointer', fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}
            >Clear all</button>
          </div>
        )}
      </div>

      {/* ── Mobile list ── */}
      {isMobile ? (
        <div>
          {loading
            ? <div style={{ textAlign: 'center', padding: 48, color: txt2 }}>
                <div style={{ width: 32, height: 32, border: `3px solid ${T.green}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 8px', animation: 'spin 0.8s linear infinite' }} />
                Loading patients...
              </div>
            : paginated.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: txt2, fontSize: 13 }}>No patients found matching your filters.</div>
              : paginated.map(p => <MobileCard key={p.id} p={p} />)
          }
        </div>
      ) : (
        /* ── Desktop table ── */
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: T.radius, overflow: 'hidden', boxShadow: shadow }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: bg, borderBottom: `2px solid ${bdr}` }}>
                  {['No.', 'Name', 'Age', 'Sex', 'Status', 'Birthdate', 'Address', 'Contact No.', 'E-mail'].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 12px', textAlign: 'left', fontWeight: 800,
                      color: dk ? T.mint : T.green, fontSize: 10,
                      textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: txt2, fontSize: 13 }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, border: `3px solid ${T.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Loading patients...
                    </div>
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: txt2, fontSize: 13 }}>No patients found matching your filters.</td></tr>
                ) : paginated.map((p, i) => {
                  const isArchived = isPatientArchived(p)
                  const rowBg      = i % 2 === 0 ? card : (dk ? T.surf2Dk : T.surface2)
                  return (
                    <tr
                      key={p.id} onClick={() => openVisitHistory(p)}
                      style={{ background: rowBg, borderBottom: `1px solid ${bdr}`, cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = T.greenLight }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg }}
                    >
                      <td style={{ padding: '11px 12px', color: txt2, fontWeight: 700 }}>{(page - 1) * PER_PAGE + i + 1}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Avatar p={p} size={30} />
                          <div>
                            <div style={{ fontWeight: 700, color: txt, fontSize: 12 }}>{p.last_name}, {p.first_name}</div>
                            {p.middle_name && <div style={{ fontSize: 10, color: txt2 }}>{p.middle_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 12px', color: txt, fontWeight: 600 }}>{p.age}</td>
                      <td style={{ padding: '11px 12px' }}><SexBadge sex={p.sex} /></td>
                      <td style={{ padding: '11px 12px' }}><StatusBadge archived={isArchived} /></td>
                      <td style={{ padding: '11px 12px', color: txt2, fontSize: 11 }}>{p.birthdate || '--'}</td>
                      <td style={{ padding: '11px 12px', color: txt, fontSize: 11 }}>{[p.barangay, p.municipality].filter(Boolean).join(', ') || '--'}</td>
                      <td style={{ padding: '11px 12px', color: p.contact_number ? txt : txt2, fontSize: 11 }}>{p.contact_number || '--'}</td>
                      <td style={{ padding: '11px 12px', color: p.email ? txt : txt2, fontSize: 11 }}>{p.email || '--'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderTop: `1px solid ${bdr}`,
            background: bg, flexWrap: 'wrap', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: txt2, fontWeight: 600 }}>
              {display.length === 0
                ? 'No results'
                : `Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, display.length)} of ${display.length} patients`}
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: `1.5px solid ${bdr}`, background: card, color: page === 1 ? txt2 : T.green, cursor: page === 1 ? 'default' : 'pointer' }}
              >Prev</button>
              {(() => {
                const pages: (number | '...')[] = []
                if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
                else {
                  pages.push(1)
                  if (page > 4) pages.push('...')
                  for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) pages.push(i)
                  if (page < totalPages - 3) pages.push('...')
                  pages.push(totalPages)
                }
                return pages.map((pg, i) =>
                  pg === '...'
                    ? <span key={`e${i}`} style={{ padding: '5px 4px', fontSize: 12, color: txt2, userSelect: 'none' }}>...</span>
                    : <button
                        key={pg} onClick={() => setPage(pg as number)}
                        style={{
                          padding: '5px 11px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                          border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                          background: page === pg ? T.green : 'transparent',
                          color:      page === pg ? '#fff'  : txt2,
                          boxShadow:  page === pg ? `0 2px 8px ${T.green}44` : 'none',
                        }}
                      >{pg}</button>
                )
              })()}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: `1.5px solid ${bdr}`, background: card, color: page === totalPages ? txt2 : T.green, cursor: page === totalPages ? 'default' : 'pointer' }}
              >Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile pagination */}
      {isMobile && display.length > PER_PAGE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${bdr}`, background: card, color: page === 1 ? txt2 : T.green, cursor: page === 1 ? 'default' : 'pointer' }}
          >Prev</button>
          <span style={{ padding: '8px 14px', fontSize: 13, color: txt2, fontWeight: 600 }}>{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${bdr}`, background: card, color: page === totalPages ? txt2 : T.green, cursor: page === totalPages ? 'default' : 'pointer' }}
          >Next</button>
        </div>
      )}

      {/* ── Modals ── */}
      <AddPatientModal isOpen={open} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); fetchPatients() }} />
      {viewPatient && (
        <PatientInfo
          patient={viewPatient}
          visitDate={selectedVisitDate ?? undefined}
          onBack={selectedVisitDate ? () => {
            const p = viewPatient
            setViewPatient(null); setSelectedVisitDate(null); openVisitHistory(p)
          } : undefined}
          onClose={() => { setViewPatient(null); setSelectedVisitDate(null); fetchPatients() }}
        />
      )}
      <ImportPatientsModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => { setShowImport(false); fetchPatients() }}
        darkMode={darkMode}
      />

      {/* ── Visit history modal ── */}
      {visitPatient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 16 }}>
          <div style={{
            background: card, borderRadius: T.radius,
            width: '100%', maxWidth: 580, maxHeight: '88vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: shadow, position: 'relative', border: `1px solid ${bdr}`,
          }}>
            {selectedVisit && (
              <VisitDetailPanel visit={selectedVisit} onClose={() => setSelectedVisit(null)} bg={bg} bdr={bdr} txt={txt} txt2={txt2} />
            )}

            {/* Visit modal header */}
            <div style={{
              background: T.greenDark, padding: '18px 22px',
              display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
              borderBottom: `2px solid ${T.mint}`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(74,222,128,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.mint, fontWeight: 900, fontSize: 16, flexShrink: 0,
              }}>
                {visitPatient.first_name?.[0]}{visitPatient.last_name?.[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>
                  {visitPatient.last_name}, {visitPatient.first_name} {visitPatient.middle_name || ''}
                </div>
                <div style={{ color: T.mint, fontSize: 12, marginTop: 2, opacity: 0.85 }}>
                  {visitPatient.sex === 'F' ? 'Female' : 'Male'} · {visitPatient.age} yrs · {visitPatient.barangay || '--'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: 'rgba(74,222,128,0.15)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: T.mint, fontWeight: 800 }}>Visits</span>
                <button
                  onClick={() => { setVisitPatient(null); setVisits([]); setSelectedVisit(null) }}
                  style={{ background: 'rgba(74,222,128,0.15)', border: 'none', color: T.mint, borderRadius: T.radiusSm, width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.15)')}
                >×</button>
              </div>
            </div>

            <div style={{
              padding: '8px 22px',
              background: `${T.green}10`,
              borderBottom: `1px solid ${bdr}`,
              fontSize: 11, color: T.greenMid, fontWeight: 600,
            }}>
              Click on a visit date to view the consultation details for that specific visit.
            </div>

            {/* Visit list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', background: bg }}>
              {visitsLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: txt2 }}>
                  <div style={{ width: 28, height: 28, border: `3px solid ${T.green}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
                  Loading visits...
                </div>
              ) : visits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                  <div style={{ fontWeight: 700, color: txt, fontSize: 15, marginBottom: 6 }}>No visits recorded yet</div>
                  <div style={{ color: txt2, fontSize: 13 }}>This patient has not had any consultations yet.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {visits.map((v, i) => {
                    const isDone    = v.status === 'done'
                    const hasVitals = v.blood_pressure || v.blood_pressure_mmhg || v.weight || v.weight_kg || v.temperature || v.temperature_c
                    const hasSoap   = v.subjective || (Array.isArray(v.assessments) && v.assessments.length > 0)
                    return (
                      <div key={v.id ?? i} style={{ display: 'flex', gap: 0 }}>
                        {/* Timeline dot */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 16, flexShrink: 0, paddingTop: 2 }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                            background: isDone ? `linear-gradient(135deg,${T.green},${T.mint})` : T.greenLight,
                            border: `2px solid ${isDone ? T.green : T.border}`,
                            boxShadow: `0 0 0 3px ${T.green}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isDone && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                          </div>
                          {i < visits.length - 1 && <div style={{ width: 2, flex: 1, background: `${T.green}20`, marginTop: 5 }} />}
                        </div>

                        {/* Visit card */}
                        <div
                          onClick={() => setSelectedVisit(v)}
                          style={{
                            flex: 1, marginBottom: 14, cursor: 'pointer',
                            background: card,
                            border: `1.5px solid ${isDone ? `${T.green}33` : bdr}`,
                            borderRadius: T.radiusSm, overflow: 'hidden',
                            boxShadow: isDone ? `0 2px 12px ${T.green}15` : shadow,
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = T.green
                            ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${T.green}22`
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = isDone ? `${T.green}33` : bdr
                            ;(e.currentTarget as HTMLDivElement).style.boxShadow = isDone ? `0 2px 12px ${T.green}15` : shadow
                          }}
                        >
                          {/* Card header strip */}
                          <div style={{
                            padding: '9px 14px',
                            background: isDone ? `${T.greenLight}` : T.surface2,
                            borderBottom: `1px solid ${isDone ? `${T.green}20` : bdr}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedVisit(v) }}
                                style={{ fontSize: 13, fontWeight: 800, color: isDone ? T.green : T.greenMid, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                {formatDate(v.consultation_date || v.queue_date || v.created_at)}
                              </button>
                              {isDone && (
                                <span style={{ fontSize: 9, fontWeight: 800, color: T.green, background: `${T.green}15`, border: `1px solid ${T.green}30`, borderRadius: 99, padding: '2px 8px' }}>Completed</span>
                              )}
                            </div>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                const vDate = (v.consultation_date || v.queue_date || v.created_at || '').slice(0, 10)
                                setSelectedVisitDate(vDate)
                                setVisitPatient(null); setVisits([]); setSelectedVisit(null)
                                setViewPatient(visitPatient)
                              }}
                              style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                                border: 'none', cursor: 'pointer',
                                background: T.green, color: '#fff',
                                whiteSpace: 'nowrap', boxShadow: `0 2px 6px ${T.green}44`,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = T.greenMid)}
                              onMouseLeave={e => (e.currentTarget.style.background = T.green)}
                            >Pwhs Form</button>
                          </div>

                          {/* Card body */}
                          <div style={{ padding: '10px 14px' }}>
                            {hasVitals && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 8px', marginBottom: hasSoap ? 8 : 0 }}>
                                {[
                                  ['BP',     v.blood_pressure || v.blood_pressure_mmhg || '--'],
                                  ['Weight', v.weight != null ? `${v.weight} kg` : v.weight_kg != null ? `${v.weight_kg} kg` : '--'],
                                  ['Temp',   v.temperature != null ? `${v.temperature} C` : v.temperature_c != null ? `${v.temperature_c} C` : '--'],
                                ].map(([k, val]) => (
                                  <div key={k} style={{
                                    background: val === '--' ? bg : T.greenLight,
                                    border: `1px solid ${val === '--' ? bdr : `${T.green}33`}`,
                                    borderRadius: T.radiusSm, padding: '5px 8px', opacity: val === '--' ? 0.45 : 1,
                                  }}>
                                    <div style={{ fontSize: 9, color: txt2, fontWeight: 600, marginBottom: 2 }}>{k}</div>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: val === '--' ? txt2 : T.greenDark }}>{val}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {hasSoap && (
                              <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: T.radiusSm, padding: '6px 10px', fontSize: 11, lineHeight: 1.6 }}>
                                {v.subjective && (
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontWeight: 700, color: T.greenDark, fontSize: 9, background: T.greenLight, borderRadius: 4, padding: '1px 5px', marginRight: 5 }}>S</span>
                                    <span style={{ color: txt }}>{v.subjective}</span>
                                  </div>
                                )}
                                {Array.isArray(v.assessments) && v.assessments.length > 0 && (
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: v.subjective ? 3 : 0 }}>
                                    <span style={{ fontWeight: 700, color: T.greenMid, fontSize: 9, background: `${T.mint}33`, borderRadius: 4, padding: '1px 5px', marginRight: 5 }}>A</span>
                                    <span style={{ color: txt }}>{v.assessments[0]}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {!hasVitals && !hasSoap && (
                              <div style={{ fontSize: 11, color: txt2, fontStyle: 'italic', textAlign: 'center', padding: '4px 0' }}>
                                No details recorded yet.
                              </div>
                            )}

                            <div style={{ marginTop: 6, fontSize: 10, color: `${T.green}99`, fontWeight: 600, textAlign: 'right' }}>
                              View full details
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Visit modal footer */}
            <div style={{
              padding: '12px 22px', borderTop: `1px solid ${bdr}`,
              background: T.surface2, display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, color: txt2 }}>
                {visits.length > 0
                  ? `Last visit: ${formatDate(visits[0]?.consultation_date || visits[0]?.created_at)}`
                  : 'No visits yet'}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}