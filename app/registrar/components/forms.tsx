'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import './forms.css'
import DataPrivacyModal from './DataPrivacyModal'
import PatientInfo from './PatientInfo'

// ─── LOPEZ BARANGAYS ──────────────────────────────────────────────────────────
const LOPEZ_BARANGAYS = [
  'Bacungan','Bagacay','Banabahin Ibaba','Banabahin Ilaya','Bayabas','Bebito','Bigajo',
  'Binahian A','Binahian B','Binahian C','Bocboc','Buenavista','Burgos (Poblacion)',
  'Buyacanin','Cagacag','Calantipayan','Canda Ibaba','Canda Ilaya','Cawayan','Cawayanin',
  'Cogorin Ibaba','Cogorin Ilaya','Concepcion','Danlagan (Poblacion)','De La Paz',
  'Del Pilar','Del Rosario','Esperanza Ibaba','Esperanza Ilaya','Gomez (Poblacion)',
  'Guihay','Guinuangan','Guites','Hondagua','Ilayang Ilog A','Ilayang Ilog B',
  'Inalusan','Jongo','Lalaguna','Lourdes','Mabanban','Mabini','Magallanes','Maguilayan',
  'Mahayod-Hayod','Mal-ay','Mandoog','Manguisian','Matinik','Magsaysay (Poblacion)',
  'Monteclaro','Pamampangin','Pansol','Peñafrancia','Pisipis','Rizal (Poblacion)',
  'Rizal (Rural)','Roma','Rosario','Samat','San Andres','San Antonio',
  'San Francisco A','San Francisco B','San Isidro','San Jose',
  'San Lorenzo Ruiz (Poblacion)','San Miguel (Dao)','San Pedro','San Rafael',
  'San Roque','Silang','Sta. Catalina','Sta. Elena','Sta. Jacobe','Sta. Lucia',
  'Sta. Maria','Sta. Rosa','Sta. Teresa','Sto. Niño Ibaba','Sto. Niño Ilaya',
  'Sugod','Sumilang','Talolong (Poblacion)','Tan-ag Ibaba','Tan-ag Ilaya','Tocalin',
  'Vegaflor','Vergaña','Veronica','Villa Aurora','Villa Espina','Villageda',
  'Villahermosa','Villamonte','Villanacaob',
]

// ─── FIX: Use Philippine Time (UTC+8) for today's date ───────────────────────
// new Date().toISOString() is UTC — in PH this can be the wrong date after 4PM PHT
// (which is midnight UTC), causing queue_date mismatches between registrar and doctor.
function getTodayPHT(): string {
  const d = new Date()
  d.setUTCHours(d.getUTCHours() + 8)
  return d.toISOString().slice(0, 10)
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function FieldCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="fm-card" style={style}>{children}</div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="fm-section-title">{children}</div>
}

function ClearableInput({
  value, onChange, onClear, type = 'text', width, style, placeholder,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
  type?: string
  width?: string
  style?: React.CSSProperties
  placeholder?: string
}) {
  return (
    <div className="fm-input-wrap" style={{ width: width || '100%' }}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ''}
        className="fm-input-sm"
        style={{ width: '100%', ...style }}
      />
      {value && (
        <button type="button" className="fm-clear-btn" onClick={onClear} tabIndex={-1}>×</button>
      )}
    </div>
  )
}

function LabeledInput({
  label, sublabel, value, onChange, onClear, type = 'text', width, flex, placeholder,
}: {
  label: string; sublabel?: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  type?: string; width?: string; flex?: number; placeholder?: string
}) {
  const handleClear = onClear ?? (() =>
    onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
  )
  return (
    <div className="fm-col" style={{ width: width || (flex ? undefined : 'auto'), flex }}>
      <span className="fm-label">{label}</span>
      <ClearableInput
        value={value} onChange={onChange} onClear={handleClear}
        type={type} width={width} placeholder={placeholder}
      />
      {sublabel && <span className="fm-sublabel">{sublabel}</span>}
    </div>
  )
}

function IInput({
  width = '80px', type = 'text', value, onChange, onClear, placeholder,
}: {
  width?: string; type?: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  placeholder?: string
}) {
  const handleClear = onClear ?? (() =>
    onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
  )
  return (
    <ClearableInput
      value={value} onChange={onChange} onClear={handleClear}
      type={type} width={width} placeholder={placeholder}
    />
  )
}

function CB({ label, checked, onChange, children }: {
  label?: string; checked: boolean; onChange: () => void; children?: React.ReactNode
}) {
  return (
    <label className="fm-check-label">
      <input type="checkbox" checked={checked} onChange={onChange} className="fm-cb" />
      {label}{children}
    </label>
  )
}

function RB({ label, name, value, checked, onChange }: {
  label: string; name: string; value: string; checked: boolean; onChange: () => void
}) {
  return (
    <label className="fm-radio-label">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="fm-rb" />
      {label}
    </label>
  )
}

function YesNo({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '6px' }}>
      <RB label="Yes" name={name} value="Yes" checked={value === 'Yes'} onChange={() => onChange('Yes')} />
      <RB label="No"  name={name} value="No"  checked={value === 'No'}  onChange={() => onChange('No')} />
    </div>
  )
}

// ─── SEARCHABLE BARANGAY DROPDOWN ─────────────────────────────────────────────
function BarangayInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  const filtered = LOPEZ_BARANGAYS.filter(b => b.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const clear = () => { onChange(''); setQuery(''); setOpen(false) }

  return (
    <div ref={ref} className="fm-col" style={{ width: '100%', position: 'relative' }}>
      <span className="fm-label">Barangay</span>
      <div className="fm-input-wrap">
        <input
          type="text"
          value={query}
          placeholder="Type or select barangay..."
          className="fm-input-sm"
          style={{ width: '100%' }}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button type="button" className="fm-clear-btn" onClick={clear} tabIndex={-1}>×</button>
        )}
      </div>
      {open && (
        <div className="fm-bgy-dropdown">
          {filtered.length === 0 ? (
            <div className="fm-bgy-item fm-bgy-item--no-match">No match — will save as typed</div>
          ) : filtered.map(b => (
            <div key={b}
              className={`fm-bgy-item${value === b ? ' fm-bgy-item--selected' : ''}`}
              onClick={() => { onChange(b); setQuery(b); setOpen(false) }}
            >{b}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── PATIENT NAME AUTOCOMPLETE ────────────────────────────────────────────────
interface PatientHint {
  id: string; last_name: string; first_name: string; middle_name: string
  age: string; sex: string; birthdate: string; purok: string
  barangay: string; municipality: string; contact_number: string
  email: string; philhealth_pin: string; member_type: string; member_type_specify: string
}

function PatientAutocomplete({
  field, value, onChange, onSelect, placeholder,
}: {
  field: 'last_name' | 'first_name'; value: string
  onChange: (v: string) => void; onSelect: (p: PatientHint) => void; placeholder?: string
}) {
  const [results, setResults] = useState<PatientHint[]>([])
  const [open,    setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = async (q: string) => {
    if (!q || q.length < 2) { setResults([]); setOpen(false); return }
    const { data } = await supabase
      .from('patients')
      .select('id,last_name,first_name,middle_name,age,sex,birthdate,purok,barangay,municipality,contact_number,email,philhealth_pin,member_type,member_type_specify')
      .ilike(field, `${q}%`)
      .limit(8)
    // Dedup by name — same person may have multiple IDs in DB
    const seenNames = new Set<string>()
    const unique = (data || []).filter((p: any) => {
      const nk = `${(p.last_name||'').toLowerCase().trim()}__${(p.first_name||'').toLowerCase().trim()}`
      if (seenNames.has(nk)) return false
      seenNames.add(nk)
      return true
    })
    setResults(unique as PatientHint[])
    setOpen(true)
  }

  const clear = () => { onChange(''); setResults([]); setOpen(false) }

  return (
    <div ref={ref} className="fm-col" style={{ flex: 1, position: 'relative' }}>
      <span className="fm-label">{field === 'last_name' ? 'Last Name' : 'First Name'}</span>
      <div className="fm-input-wrap">
        <input
          type="text" value={value} placeholder={placeholder || ''}
          className="fm-input-sm" style={{ width: '100%' }}
          onChange={e => { onChange(e.target.value); search(e.target.value) }}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
        />
        {value && (
          <button type="button" className="fm-clear-btn" onClick={clear} tabIndex={-1}>×</button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="fm-ac-dropdown">
          <div className="fm-ac-header">Existing patients — click to fill</div>
          {results.map(p => (
            <div key={p.id} className="fm-ac-item" onClick={() => { onSelect(p); setOpen(false) }}>
              <div className="fm-ac-name">{p.last_name}, {p.first_name} {p.middle_name || ''}</div>
              <div className="fm-ac-sub">{p.barangay} · {p.sex === 'F' ? 'Female' : 'Male'} · {p.age} yrs · {p.contact_number || 'No contact'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── EXISTING PATIENT SEARCH ──────────────────────────────────────────────────
// NOTE: Selecting an existing patient only fills Step 1 (general/registration)
// fields. It does NOT create a visit record. Only doSave() creates a visit.
function ExistingPatientSearch({ onSelect }: { onSelect: (p: PatientHint) => void }) {
  const [query,    setQuery]    = React.useState('')
  const [results,  setResults]  = React.useState<PatientHint[]>([])
  const [loading,  setLoading]  = React.useState(false)
  const [searched, setSearched] = React.useState(false)

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    const [r1, r2, r3] = await Promise.all([
      supabase.from('patients').select('id,last_name,first_name,middle_name,age,sex,birthdate,purok,barangay,municipality,contact_number,email,philhealth_pin,member_type,member_type_specify').ilike('last_name', `%${q.trim()}%`).limit(6),
      supabase.from('patients').select('id,last_name,first_name,middle_name,age,sex,birthdate,purok,barangay,municipality,contact_number,email,philhealth_pin,member_type,member_type_specify').ilike('first_name', `%${q.trim()}%`).limit(6),
      supabase.from('patients').select('id,last_name,first_name,middle_name,age,sex,birthdate,purok,barangay,municipality,contact_number,email,philhealth_pin,member_type,member_type_specify').ilike('middle_name', `%${q.trim()}%`).limit(6),
    ])
    const all = [...(r1.data || []), ...(r2.data || []), ...(r3.data || [])]
    // Dedup by name (not id) — same person may have multiple patient IDs in DB
    const seenNames = new Set<string>()
    const unique = all.filter(p => {
      const nameKey = `${(p.last_name||'').toLowerCase().trim()}__${(p.first_name||'').toLowerCase().trim()}`
      if (seenNames.has(nameKey)) return false
      seenNames.add(nameKey)
      return true
    })
    setResults(unique as PatientHint[])
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (timer.current) clearTimeout(timer.current)
    if (!val.trim() || val.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    timer.current = setTimeout(() => doSearch(val), 300)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { if (timer.current) clearTimeout(timer.current); doSearch(query) }
  }

  const handleSelect = (p: PatientHint) => {
    onSelect(p)
    setQuery('')
    setResults([])
    setSearched(false)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setSearched(false)
    if (timer.current) clearTimeout(timer.current)
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* ── Search bar ── */}
      <div style={{ position: 'relative', borderRadius: '10px', border: '2px solid #16a34a', background: '#fff', boxShadow: '0 2px 8px rgba(22,163,74,0.10)' }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKey}
          placeholder="Search..."
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '11px 36px 11px 14px',
            border: 'none', outline: 'none', borderRadius: '10px',
            fontSize: '13px', color: '#1a2e20',
            background: 'transparent',
            fontWeight: '500',
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, border: '2px solid #16a34a', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: '18px', lineHeight: 1, padding: 0,
              display: 'flex', alignItems: 'center',
            }}>×</button>
        )}
      </div>

      {/* ── Results ── */}
      {searched && !loading && (
        <div style={{ marginTop: '8px' }}>
          {results.length === 0 ? (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: '#fff7ed', border: '1px solid #fed7aa',
              fontSize: '12px', color: '#92400e', fontWeight: '600',
            }}>
                No existing patient found.
            </div>
          ) : (
            <>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {results.length} patient{results.length > 1 ? 's' : ''} found — click to use existing record
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {results.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px', borderRadius: '8px',
                      background: '#fff', border: '1.5px solid #d1fae5',
                      cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#16a34a' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff';    e.currentTarget.style.borderColor = '#d1fae5' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: p.sex === 'F'
                        ? 'linear-gradient(135deg,#db2777,#7c3aed)'
                        : 'linear-gradient(135deg,#2563eb,#0d9488)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: '800', fontSize: '13px',
                    }}>
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#1a2e20' }}>
                        {p.last_name}, {p.first_name} {p.middle_name || ''}
                      </div>
                      <div style={{ fontSize: '11px', color: '#607a6a', marginTop: '1px' }}>
                        {p.sex === 'F' ? '♀ Female' : '♂ Male'} · {p.age} yrs · {p.birthdate || '—'} · {p.barangay || '—'}
                      </div>
                      {p.contact_number && (
                        <div style={{ fontSize: '11px', color: '#607a6a' }}>📞 {p.contact_number}</div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
// ─── ADD PATIENT MODAL ────────────────────────────────────────────────────────
function AddPatientModal({ isOpen, onClose, onSaved }: {
  isOpen: boolean; onClose: () => void; onSaved: () => void
}) {
  const [step,            setStep]            = useState(1)
  const [confirm,         setConfirm]         = useState<null | 'close' | 'save' | 'send'>(null)
  const [saving,          setSaving]          = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  // ── Send target: 'doctor' (default) routes to soap_consultations,
  //    'nurse' routes to nurse_consultation_queue. Real React state — this
  //    is the actual fix for the "Nurse button does nothing" bug. The old
  //    version used (window as any).__sendTarget set via onChange on a
  //    visually-hidden <input type="radio"> wrapped in a <label> — in this
  //    environment that native label→input click forwarding wasn't firing
  //    reliably, so the radio's onChange (and therefore __sendTarget) never
  //    actually updated, and doSave() always fell through to the doctor
  //    branch no matter what was clicked. Using real React state with a
  //    visible, directly-clickable element removes that whole indirection. ──
  const [sendTarget, setSendTarget] = useState<'doctor' | 'nurse'>('doctor')

  const [savedPatient,    setSavedPatient]    = useState<any | null>(null)
  const [showPatientInfo, setShowPatientInfo] = useState(false)

  const EMPTY_S1 = {
    lastName: '', firstName: '', middleName: '',
    age: '', sexF: false, sexM: false, birthdate: '',
    purok: '', barangay: '', municipality: '',
    contact: '', email: '', philhealth: '',
    memberMember: false, memberDependent: false, memberSpecify: '',
    regDate: '', kkpSign: false,
    fac1: '', fac1chk: false, fac2: '', fac2chk: false, fac3: '', fac3chk: false,
    atCode: '', atNoAtc: false, apptDate: '', faceCapture: false,
  }

  const [s1, setS1] = useState({ ...EMPTY_S1 })

  // ── Step 2 ──
  const DISEASES = ['Allergy','Asthma','Cancer','Cerebrovascular Disease','Coronary Artery Disease','Diabetes Mellitus','Emphysema','Epilepsy / Seizure Disorder','Hepatitis','Hyperlipidemia','Hypertension','Peptic Ulcer','Pneumonia','Thyroid Disease','PTB','Urinary Tract Infection','Mental Illness','Others']
  const [pastMed,     setPastMed]     = useState<Record<string, boolean>>({})
  const [pastMedSpec, setPastMedSpec] = useState<Record<string, string>>({})
  const [famHist,     setFamHist]     = useState<Record<string, boolean>>({})
  const [famHistSpec, setFamHistSpec] = useState<Record<string, string>>({})
  const [surgery,     setSurgery]     = useState('')
  const [surgDate,    setSurgDate]    = useState('')

  // ── Step 3 ──
  const [smoking,     setSmoking]     = useState('')
  const [packsYear,   setPacksYear]   = useState('')
  const [alcohol,     setAlcohol]     = useState('')
  const [servingsDay, setServingsDay] = useState('')
  const [illicit,     setIllicit]     = useState('')
  const [sexually,    setSexually]    = useState('')
  const [immun,       setImmun]       = useState<Record<string, boolean>>({})
  const [immunOther,  setImmunOther]  = useState('')

  // ── Step 4 ──
  const [fpAccess,      setFpAccess]      = useState(false)
  const [fpProvider,    setFpProvider]    = useState('')
  const [fpMethod,      setFpMethod]      = useState('')
  const [menarche,      setMenarche]      = useState('')
  const [onsetSex,      setOnsetSex]      = useState('')
  const [lmp,           setLmp]           = useState('')
  const [periodDur,     setPeriodDur]     = useState('')
  const [padsDay,       setPadsDay]       = useState('')
  const [intervalCycle, setIntervalCycle] = useState('')
  const [menopauseYes,  setMenopauseYes]  = useState(false)
  const [menopauseNo,   setMenopauseNo]   = useState(false)
  const [ageMenopause,  setAgeMenopause]  = useState('')
  const [pregG, setPregG] = useState(''); const [pregP,  setPregP]  = useState('')
  const [pregT, setPregT] = useState(''); const [pregP2, setPregP2] = useState('')
  const [pregA, setPregA] = useState(''); const [pregL,  setPregL]  = useState('')
  const [delivery,   setDelivery]   = useState('')
  const [pregHtnYes, setPregHtnYes] = useState(false)
  const [pregHtnNo,  setPregHtnNo]  = useState(false)

  // ── Step 5 ──
  const [height,    setHeight]    = useState('')
  const [bp,        setBp]        = useState('')
  const [weight,    setWeight]    = useState('')
  const [hr,        setHr]        = useState('')
  const [temp,      setTemp]      = useState('')
  const [rr,        setRr]        = useState('')
  const [bloodType, setBloodType] = useState('')
  const [visRight,  setVisRight]  = useState('')
  const [visLeft,   setVisLeft]   = useState('')
  const [pedia,     setPedia]     = useState<Record<string, string>>({})

  // ── Step 6 ──
  const [genSurvey,    setGenSurvey]    = useState<Record<string, boolean>>({})
  const [heent,        setHeent]        = useState<Record<string, boolean>>({})
  const [chest,        setChest]        = useState<Record<string, boolean>>({})
  const [heart,        setHeart]        = useState<Record<string, boolean>>({})
  const [abdomen,      setAbdomen]      = useState<Record<string, boolean>>({})
  const [heentOther,   setHeentOther]   = useState('')
  const [chestOther,   setChestOther]   = useState('')
  const [heartOther,   setHeartOther]   = useState('')
  const [abdomenOther, setAbdomenOther] = useState('')

  // ── Step 7 ──
  const [genito,      setGenito]      = useState<Record<string, boolean>>({})
  const [rectal,      setRectal]      = useState<Record<string, boolean>>({})
  const [skin,        setSkin]        = useState<Record<string, boolean>>({})
  const [neuro,       setNeuro]       = useState<Record<string, boolean>>({})
  const [genitOther,  setGenitOther]  = useState('')
  const [rectalOther, setRectalOther] = useState('')
  const [skinOther,   setSkinOther]   = useState('')
  const [neuroOther,  setNeuroOther]  = useState('')
  const [assessment,  setAssessment]  = useState<Record<string, boolean>>({})

  // ── Step 8 ──
  const [ncd8,           setNcd8]           = useState<Record<string, string>>({})
  const [diabetesYes,    setDiabetesYes]    = useState(false)
  const [diabetesNo,     setDiabetesNo]     = useState(false)
  const [diabetesMed,    setDiabetesMed]    = useState('')
  const [symptoms,       setSymptoms]       = useState<Record<string, boolean>>({})
  const [labFbs,         setLabFbs]         = useState('')
  const [labFbsDate,     setLabFbsDate]     = useState('')
  const [labChol,        setLabChol]        = useState('')
  const [labCholDate,    setLabCholDate]    = useState('')
  const [labKetone,      setLabKetone]      = useState('')
  const [labKetoneDate,  setLabKetoneDate]  = useState('')
  const [labProtein,     setLabProtein]     = useState('')
  const [labProteinDate, setLabProteinDate] = useState('')

  // ── Step 9 ──
  const [anginaOverall, setAnginaOverall] = useState('')
  const [angina,        setAngina]        = useState<Record<string, string>>({})

  // ── Step 10 ──
  const [stroke,    setStroke]    = useState<Record<string, string>>({})
  const [strokeTia, setStrokeTia] = useState('')
  const [riskLevel, setRiskLevel] = useState('')

  // ── FULL RESET every time the modal opens ────────────────────────────────
  // Ensures no leftover data from a previous session shows on next open.
  useEffect(() => {
    if (!isOpen) return
    setStep(1)
    setConfirm(null)
    setSaving(false)
    setPrivacyAccepted(false)
    setSendTarget('doctor')
    setSavedPatient(null)
    setShowPatientInfo(false)
    setS1({ lastName: '', firstName: '', middleName: '', age: '', sexF: false, sexM: false, birthdate: '', purok: '', barangay: '', municipality: '', contact: '', email: '', philhealth: '', memberMember: false, memberDependent: false, memberSpecify: '', regDate: '', kkpSign: false, fac1: '', fac1chk: false, fac2: '', fac2chk: false, fac3: '', fac3chk: false, atCode: '', atNoAtc: false, apptDate: '', faceCapture: false })
    setPastMed({}); setPastMedSpec({}); setFamHist({}); setFamHistSpec({})
    setSurgery(''); setSurgDate('')
    setSmoking(''); setPacksYear(''); setAlcohol(''); setServingsDay('')
    setIllicit(''); setSexually(''); setImmun({}); setImmunOther('')
    setFpAccess(false); setFpProvider(''); setFpMethod('')
    setMenarche(''); setOnsetSex(''); setLmp(''); setPeriodDur('')
    setPadsDay(''); setIntervalCycle(''); setMenopauseYes(false); setMenopauseNo(false)
    setAgeMenopause(''); setPregG(''); setPregP(''); setPregT(''); setPregP2('')
    setPregA(''); setPregL(''); setDelivery(''); setPregHtnYes(false); setPregHtnNo(false)
    setHeight(''); setBp(''); setWeight(''); setHr(''); setTemp(''); setRr('')
    setBloodType(''); setVisRight(''); setVisLeft(''); setPedia({})
    setGenSurvey({}); setHeent({}); setChest({}); setHeart({}); setAbdomen({})
    setHeentOther(''); setChestOther(''); setHeartOther(''); setAbdomenOther('')
    setGenito({}); setRectal({}); setSkin({}); setNeuro({})
    setGenitOther(''); setRectalOther(''); setSkinOther(''); setNeuroOther('')
    setAssessment({})
    setNcd8({}); setDiabetesYes(false); setDiabetesNo(false); setDiabetesMed('')
    setSymptoms({})
    setLabFbs(''); setLabFbsDate(''); setLabChol(''); setLabCholDate('')
    setLabKetone(''); setLabKetoneDate(''); setLabProtein(''); setLabProteinDate('')
    setAnginaOverall(''); setAngina({})
    setStroke({}); setStrokeTia(''); setRiskLevel('')
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── fillFromPatient: ONLY fills Step 1 (registration) fields ─────────────
  // Selecting a patient from search does NOT create a visit record.
  // Medical history, family history, vitals, etc. are always blank for new entry.
  const fillFromPatient = (p: PatientHint) => {
    setS1(prev => ({
      ...prev,
      lastName:        p.last_name           || '',
      firstName:       p.first_name          || '',
      middleName:      p.middle_name         || '',
      age:             p.age                 || '',
      sexF:            p.sex === 'F',
      sexM:            p.sex === 'M',
      birthdate:       p.birthdate           || '',
      purok:           p.purok               || '',
      barangay:        p.barangay            || '',
      municipality:    p.municipality        || '',
      contact:         p.contact_number      || '',
      email:           p.email               || '',
      philhealth:      p.philhealth_pin      || '',
      memberMember:    p.member_type === 'Member',
      memberDependent: p.member_type === 'Dependent',
      memberSpecify:   p.member_type_specify || '',
    }))
    // Steps 2-10 are intentionally NOT filled — fresh medical data every visit.
  }

  const hasPatientData = !!(
    s1.lastName || s1.firstName || s1.middleName || s1.age || s1.birthdate ||
    s1.purok || s1.barangay || s1.municipality || s1.contact || s1.email || s1.philhealth
  )

  if (!isOpen) return null

  if (!privacyAccepted) {
    return (
      <DataPrivacyModal
        isOpen={true}
        onAccept={() => setPrivacyAccepted(true)}
        onDecline={() => { setPrivacyAccepted(false); onClose() }}
      />
    )
  }

  if (showPatientInfo && savedPatient) {
    return (
      <PatientInfo
        patient={savedPatient}
        onClose={() => {
          setShowPatientInfo(false)
          setSavedPatient(null)
          onClose()
        }}
      />
    )
  }

  const togCB = (
    state: Record<string, boolean>,
    setState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    key: string
  ) => setState(p => ({ ...p, [key]: !p[key] }))

  const tryInsert = async (table: string, row: Record<string, any>) => {
    const { data, error } = await supabase.from(table).insert([row]).select('id')
    if (error) {
      console.error(`❌ ${table} FAILED:`, error.message, error.details, error.hint)
      alert(`Save error in ${table}: ${error.message}`)
    } else {
      console.log(`✅ ${table} saved:`, data)
    }
  }

  const doSave = async () => {
    setSaving(true)
    try {
      let pid: string | null = null

      // ── FIX: Use PHT date consistently so queue_date matches fetchQueue() ──
      // Previously used new Date().toISOString().split('T')[0] which is UTC.
      // After 4 PM PHT (= midnight UTC), that gives tomorrow's date in UTC,
      // so the row's queue_date wouldn't match today's PHT date in the queue.
      const today = getTodayPHT()

      if (s1.philhealth) {
        const { data: existing } = await supabase
          .from('patients').select('id').eq('philhealth_pin', s1.philhealth).maybeSingle()
        if (existing) { pid = existing.id }
      }

      // Match by name + birthdate (if birthdate provided)
      if (!pid && s1.lastName && s1.firstName && s1.birthdate) {
        const { data: existing } = await supabase
          .from('patients').select('id')
          .ilike('last_name', s1.lastName.trim())
          .ilike('first_name', s1.firstName.trim())
          .eq('birthdate', s1.birthdate).maybeSingle()
        if (existing) { pid = existing.id }
      }

      // Match by name only (no birthdate) — catches cases where birthdate wasn't filled
      if (!pid && s1.lastName && s1.firstName) {
        const { data: existing } = await supabase
          .from('patients').select('id')
          .ilike('last_name', s1.lastName.trim())
          .ilike('first_name', s1.firstName.trim())
          .limit(1).maybeSingle()
        if (existing) { pid = existing.id }
      }

      if (pid) {
        // Update existing patient's general info only
        await supabase.from('patients').update({
          age: parseInt(s1.age) || null,
          contact_number: s1.contact || null,
          email: s1.email || null,
          philhealth_pin: s1.philhealth || null,
          member_type: s1.memberMember ? 'Member' : s1.memberDependent ? 'Dependent' : null,
          member_type_specify: s1.memberSpecify || null,
          purok: s1.purok || null,
          barangay: s1.barangay || null,
          municipality: s1.municipality || null,
        }).eq('id', pid)
      } else {
        // Insert brand-new patient
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .insert([{
            last_name: s1.lastName || null, first_name: s1.firstName || null,
            middle_name: s1.middleName || null, age: parseInt(s1.age) || null,
            sex: s1.sexF ? 'F' : s1.sexM ? 'M' : null,
            birthdate: s1.birthdate || null, purok: s1.purok || null,
            barangay: s1.barangay || null, municipality: s1.municipality || null,
            contact_number: s1.contact || null, email: s1.email || null,
            philhealth_pin: s1.philhealth || null,
            member_type: s1.memberMember ? 'Member' : s1.memberDependent ? 'Dependent' : null,
            member_type_specify: s1.memberSpecify || null,
          }])
          .select('id').single()

        if (patientError) throw patientError
        pid = patientData.id
      }

      await tryInsert('konsulta_registrations', {
        patient_id: pid, registration_date: s1.regDate || null, kkp_sign: s1.kkpSign,
        facility_choice_1: s1.fac1 || null, facility_kkp_1: s1.fac1chk,
        facility_choice_2: s1.fac2 || null, facility_kkp_2: s1.fac2chk,
        facility_choice_3: s1.fac3 || null, facility_kkp_3: s1.fac3chk,
        has_at_code: s1.atNoAtc, at_code: s1.atCode || null,
        date_of_appointment: s1.apptDate || null, face_capture: s1.faceCapture,
      })

      await tryInsert('past_medical_history', {
        patient_id: pid,
        allergy: !!pastMed['Allergy'], allergy_specify: pastMedSpec['Allergy'] || null,
        asthma: !!pastMed['Asthma'], cancer: !!pastMed['Cancer'], cancer_specify: pastMedSpec['Cancer'] || null,
        cerebrovascular_disease: !!pastMed['Cerebrovascular Disease'],
        coronary_artery_disease: !!pastMed['Coronary Artery Disease'],
        diabetes_mellitus: !!pastMed['Diabetes Mellitus'], emphysema: !!pastMed['Emphysema'],
        epilepsy_seizure: !!pastMed['Epilepsy / Seizure Disorder'],
        hepatitis: !!pastMed['Hepatitis'], hepatitis_specify: pastMedSpec['Hepatitis'] || null,
        hyperlipidemia: !!pastMed['Hyperlipidemia'], hypertension: !!pastMed['Hypertension'],
        hypertension_highest_bp: pastMedSpec['Hypertension'] || null,
        peptic_ulcer: !!pastMed['Peptic Ulcer'], pneumonia: !!pastMed['Pneumonia'],
        thyroid_disease: !!pastMed['Thyroid Disease'], ptb: !!pastMed['PTB'],
        ptb_specify_extra: pastMedSpec['PTB'] || null,
        urinary_tract_infection: !!pastMed['Urinary Tract Infection'],
        mental_illness: !!pastMed['Mental Illness'], others: !!pastMed['Others'],
        past_surgeries_done: surgery || null, date_surgery_done: surgDate || null,
      })

      await tryInsert('family_history', {
        patient_id: pid,
        allergy: !!famHist['Allergy'], allergy_specify: famHistSpec['Allergy'] || null,
        asthma: !!famHist['Asthma'], cancer: !!famHist['Cancer'], cancer_specify: famHistSpec['Cancer'] || null,
        cerebrovascular_disease: !!famHist['Cerebrovascular Disease'],
        coronary_artery_disease: !!famHist['Coronary Artery Disease'],
        diabetes_mellitus: !!famHist['Diabetes Mellitus'], emphysema: !!famHist['Emphysema'],
        epilepsy_seizure: !!famHist['Epilepsy / Seizure Disorder'],
        hepatitis: !!famHist['Hepatitis'], hepatitis_specify: famHistSpec['Hepatitis'] || null,
        hyperlipidemia: !!famHist['Hyperlipidemia'], hypertension: !!famHist['Hypertension'],
        hypertension_highest_bp: famHistSpec['Hypertension'] || null,
        peptic_ulcer: !!famHist['Peptic Ulcer'], pneumonia: !!famHist['Pneumonia'],
        thyroid_disease: !!famHist['Thyroid Disease'], ptb: !!famHist['PTB'],
        ptb_specify_extra: famHistSpec['PTB'] || null,
        urinary_tract_infection: !!famHist['Urinary Tract Infection'],
        mental_illness: !!famHist['Mental Illness'], others: !!famHist['Others'],
      })

      await tryInsert('personal_social_history', {
        patient_id: pid, smoking: smoking || null,
        smoking_packs_per_year: packsYear ? parseFloat(packsYear) : null,
        alcohol: alcohol || null,
        alcohol_servings_day: servingsDay ? parseFloat(servingsDay) : null,
        illicit_drugs: illicit || null, sexually_active: sexually || null,
      })

      await tryInsert('immunization_history', {
        patient_id: pid,
        bcg: !!immun['BCG0'], opv1: !!immun['OPV11'], opv2: !!immun['OPV22'], opv3: !!immun['OPV33'],
        dpt1: !!immun['DPT14'], dpt2: !!immun['DPT25'], dpt3: !!immun['DPT36'],
        measles: !!immun['Measles7'], hapa1: !!immun['Hapa18'], hapa2: !!immun['Hapa29'],
        hapa3: !!immun['Hapa310'], varicella: !!immun['Varicella11'],
        hpv: !!immun['HPV'], mmr: !!immun['MMR'], none_adult: !!immun['None'],
        pneumococcal_vaccine: !!immun['pneumo'], flu_vaccine: !!immun['flu'],
        others: immunOther || null,
      })

      await tryInsert('family_planning', {
        patient_id: pid, has_fp_counseling: fpAccess,
        provider: fpProvider || null, birth_control_method: fpMethod || null,
      })

      await tryInsert('menstrual_history', {
        patient_id: pid,
        menarche_age: menarche ? parseInt(menarche) : null,
        onset_sexual_intercourse_age: onsetSex ? parseInt(onsetSex) : null,
        last_menstrual_period: lmp || null,
        period_duration_days: periodDur ? parseInt(periodDur) : null,
        pads_per_day: padsDay ? parseInt(padsDay) : null,
        interval_cycle_days: intervalCycle ? parseInt(intervalCycle) : null,
        menopause: menopauseYes ? true : menopauseNo ? false : null,
        age_at_menopause: ageMenopause ? parseInt(ageMenopause) : null,
      })

      await tryInsert('pregnancy_history', {
        patient_id: pid,
        gravida: pregG ? parseInt(pregG) : null, para: pregP ? parseInt(pregP) : null,
        term: pregT ? parseInt(pregT) : null, preterm: pregP2 ? parseInt(pregP2) : null,
        abortion: pregA ? parseInt(pregA) : null, living: pregL ? parseInt(pregL) : null,
        type_of_delivery: delivery || null,
        pregnancy_include_hypertension: pregHtnYes ? true : pregHtnNo ? false : null,
      })

      await tryInsert('physical_exam_findings', {
        patient_id: pid,
        height_cm: height ? parseFloat(height) : null, weight_kg: weight ? parseFloat(weight) : null,
        blood_pressure_mmhg: bp || null, heart_rate_bpm: hr ? parseInt(hr) : null,
        temperature_c: temp ? parseFloat(temp) : null, respiratory_rate_cpm: rr ? parseInt(rr) : null,
        blood_type: bloodType || null,
        visual_acuity_right_eye: visRight || null, visual_acuity_left_eye: visLeft || null,
      })

      await tryInsert('pedia_measurements', {
        patient_id: pid,
        body_length_cm:             pedia['Body Length']                 ? parseFloat(pedia['Body Length'])                 : null,
        head_circumference_cm:      pedia['Head Circumference']          ? parseFloat(pedia['Head Circumference'])          : null,
        chest_circumference_cm:     pedia['Chest Circumference']         ? parseFloat(pedia['Chest Circumference'])         : null,
        abdominal_circumference_cm: pedia['Abdominal Circumference']     ? parseFloat(pedia['Abdominal Circumference'])     : null,
        hip_circumference_cm:       pedia['Hip Circumference']           ? parseFloat(pedia['Hip Circumference'])           : null,
        mid_upper_arm_circ_cm:      pedia['Mid-Upper Arm Circumference'] ? parseFloat(pedia['Mid-Upper Arm Circumference']) : null,
        limbs_circumference_cm:     pedia['Limbs Circumference']         ? parseFloat(pedia['Limbs Circumference'])         : null,
      })

      await tryInsert('pertinent_findings_per_system', {
        patient_id: pid,
        awake_and_alert: !!genSurvey['awake'], altered_sensorium: !!genSurvey['altered'],
        heent_essentially_normal: !!heent['Essentially Normal'],
        heent_abnormal_papillary: !!heent['Abnormal Papillary Reaction'],
        heent_cervical_lymphadenopathy: !!heent['Cervical Lymphadenopathy'],
        heent_dry_mucus_membrane: !!heent['Dry Mucus Membrane'],
        heent_icteric_sclerae: !!heent['Icteric Sclerae'],
        heent_pale_conjunctiva: !!heent['Pale Conjunctiva'],
        heent_sunken_eyeball: !!heent['Sunken Eyeball'],
        heent_sunken_fontanelle: !!heent['Sunken Fontanelle'],
        heent_others: heentOther || null,
        chest_essentially_normal: !!chest['Essentially Normal'],
        chest_asymmetrical_expansion: !!chest['Asymmetrical Chest Expansion'],
        chest_decreased_breath_sound: !!chest['Decreased Breath Sound'],
        chest_wheeze: !!chest['Wheeze'], chest_crackle_rales: !!chest['Crackle / Rales'],
        chest_retractions: !!chest['Retractions'], chest_lumps_over_breast: !!chest['Lumps Over Breast'],
        chest_other: chestOther || null,
        heart_essentially_normal: !!heart['Essentially Normal'],
        heart_displaced_apex_beat: !!heart['Displaced Apex Beat'],
        heart_heave_trills: !!heart['Heave Trills'], heart_irregular_rhythm: !!heart['Irregular Rhythm'],
        heart_muffled_sounds: !!heart['Muffled Heart Sounds'], heart_murmurs: !!heart['Murmurs'],
        heart_pericardial_bulge: !!heart['Pericardial Bulge'], heart_others: heartOther || null,
        abdomen_essentially_normal: !!abdomen['Essentially Normal'],
        abdomen_rigidity: !!abdomen['Abdominal Rigidity'],
        abdomen_tenderness: !!abdomen['Abdominal Tenderness'],
        abdomen_hyperactive_bowel: !!abdomen['Hyperactive Bowel Sound'],
        abdomen_palpable_masses: !!abdomen['Palpable Mass/es'],
        abdomen_tympanitic_dull: !!abdomen['Tympanitic/Dull Abdomen'],
        abdomen_uterine_contraction: !!abdomen['Uterine Contraction'],
        abdomen_others: abdomenOther || null,
        gu_essentially_normal: !!genito['Essentially Normal'],
        gu_blood_stained_internal_exam: !!genito['Blood Stained in Internal Examination'],
        gu_cervical_dilation: !!genito['Cervical Dilation'],
        gu_abnormal_discharge: !!genito['Presence of Abnormal Discharge'],
        gu_others: genitOther || null,
        dre_crackle_rales: !!rectal['Crackle / Rales'], dre_enlarge_prostate: !!rectal['Enlarge Prostate'],
        dre_mass: !!rectal['Mass'], dre_hemorrhoids: !!rectal['Hemorrhoids'],
        dre_pus: !!rectal['Pus'], dre_not_applicable: !!rectal['Not Applicable'],
        dre_others: rectalOther || null,
        skin_essentially_normal: !!skin['Essentially Normal'], skin_clubbing: !!skin['Clubbing'],
        skin_cold_clammy: !!skin['Cold Clammy'], skin_cyanosis_mottled: !!skin['Cyanosis Mottled Skin'],
        skin_edema_swelling: !!skin['Edemal / Swelling'], skin_decreased_mobility: !!skin['Decreased Mobility'],
        skin_pale_nailbeds: !!skin['Pale Nailbeds'], skin_weak_pulses: !!skin['Weak Pulses'],
        skin_others: skinOther || null,
        neuro_essentially_normal: !!neuro['Essentially Normal'], neuro_abnormal_gait: !!neuro['Abnormal Gait'],
        neuro_abnormal_position_sense: !!neuro['Abnormal Position Sense'],
        neuro_abnormal_sensation: !!neuro['Abnormal Sensation'],
        neuro_abnormal_reflexes: !!neuro['Abnormal Reflex/es'],
        neuro_poor_altered_memory: !!neuro['Poor/ Altered Memory'],
        neuro_poor_muscle_tone: !!neuro['Poor Muscle Tone/ Strength'],
        neuro_poor_coordination: !!neuro['Poor Coordination'], neuro_others: neuroOther || null,
        encounter_generally_well: !!assessment['GENERALLY WELL'],
        encounter_primary_care_consult: !!assessment['FOR PRIMARY CARE CONSULTAION'],
        encounter_diagnostic_exam: !!assessment['FOR DIAGNOSTIC EXAMINATION'],
      })

      await tryInsert('ncd_high_risk_assessment', {
        patient_id: pid,
        eats_processed_food_weekly:    ncd8['q1'] === 'Yes' ? true : ncd8['q1'] === 'No' ? false : null,
        eats_fruits_vegetables_daily:  ncd8['q2'] === 'Yes' ? true : ncd8['q2'] === 'No' ? false : null,
        does_physical_activity_weekly: ncd8['q3'] === 'Yes' ? true : ncd8['q3'] === 'No' ? false : null,
        diagnosed_with_diabetes: diabetesYes ? true : null, diabetes_do_not_know: diabetesNo ? true : null,
        diabetes_with_medication: diabetesMed === 'With Medication' ? true : null,
        diabetes_without_medication: diabetesMed === 'Without Medication' ? true : null,
        symptom_polyphagia: !!symptoms['Polyphagia'], symptom_polydipsia: !!symptoms['Polydipsia'],
        symptom_polyuria: !!symptoms['Polyuria'],
        fbs_rbs_value: labFbs || null, fbs_rbs_date: labFbsDate || null,
        total_cholesterol_value: labChol || null, total_cholesterol_date: labCholDate || null,
        urine_ketone_value: labKetone || null, urine_ketone_date: labKetoneDate || null,
        urine_protein_value: labProtein || null, urine_protein_date: labProteinDate || null,
        angina_has_chest_pain:          angina['a1'] === 'Yes' ? true : angina['a1'] === 'No' ? false : null,
        angina_center_left_chest:       angina['a2'] === 'Yes' ? true : angina['a2'] === 'No' ? false : null,
        angina_on_walking:              angina['a3'] === 'Yes' ? true : angina['a3'] === 'No' ? false : null,
        angina_slows_down_walking:      angina['a4'] === 'Yes' ? true : angina['a4'] === 'No' ? false : null,
        angina_pain_goes_away_standing: angina['a5'] === 'Yes' ? true : angina['a5'] === 'No' ? false : null,
        angina_pain_gone_10_minutes:    stroke['s6'] === 'Yes' ? true : stroke['s6'] === 'No' ? false : null,
        angina_severe_30min_or_more:    stroke['s7'] === 'Yes' ? true : stroke['s7'] === 'No' ? false : null,
        stroke_tia_difficulty_talking:  stroke['s8'] === 'Yes' ? true : stroke['s8'] === 'No' ? false : null,
        risk_level: riskLevel || null,
      })

      // ══ ROUTE TO DOCTOR OR NURSE BASED ON sendTarget (real state, see above) ══
      // 'doctor' → soap_consultations (existing behavior, doctor's queue)
      // 'nurse'  → nurse_consultation_queue (nurse's "Consultation" tab in
      //            PatientQueue.tsx). soap_consultations is skipped entirely
      //            for nurse-only visits — the doctor never sees these.
      if (sendTarget === 'nurse') {
        const patientName = `${s1.firstName ?? ''} ${s1.lastName ?? ''}`.trim()
        const { error: nurseErr } = await supabase
          .from('nurse_consultation_queue')
          .insert([{
            patient_id:      pid,
            patient_name:    patientName || null,
            patient_age:     parseInt(s1.age) || null,
            patient_gender:  s1.sexF ? 'Female' : s1.sexM ? 'Male' : null,
            status:          'pending',
            queue_date:      today,
          }])

        if (nurseErr) {
          console.error('nurse_consultation_queue insert FAILED:', nurseErr.message, nurseErr.details)
          alert(`Failed to send patient to nurse: ${nurseErr.message}`)
        } else {
          console.log('✅ Sent to nurse consultation queue for PHT date:', today)
        }
      } else {
        // ── CREATE ONE VISIT RECORD per form submission (doctor route) ──────
        // Uses PHT date (today) so queue_date matches what fetchQueue() looks for.
        // This is the ONLY place a soap_consultation row is created from this modal.
        // ── Iwas-doble: kung may "waiting" na ang patient na ito ngayong araw,
        //    huwag nang gumawa ng panibago (para hindi dumoble sa queue) ──
        const { data: existingToday } = await supabase
          .from('soap_consultations')
          .select('id, queue_number')
          .eq('patient_id', pid)
          .eq('queue_date', today)
          .maybeSingle()

        let consultErr: any = null

        if (!existingToday) {
          // FIX: read-max-then-insert used to be a single, unretried attempt.
          // If the doctor's own PendingPatients "Consult" button (or another
          // registrar submission) inserted a row for the same queue_date at
          // nearly the same moment, both could compute the same
          // nextQueueNumber. With a unique (queue_date, queue_number)
          // constraint, the second insert then fails — and since this just
          // alert()ed instead of retrying, that patient could end up with NO
          // soap_consultations row at all, silently absent from the doctor's
          // Today's Queue. Now retries with a fresh max-read on conflict.
          let attempt = 0
          const maxAttempts = 5
          while (attempt < maxAttempts) {
            const { data: maxRow } = await supabase
              .from('soap_consultations')
              .select('queue_number')
              .eq('queue_date', today)
              .order('queue_number', { ascending: false })
              .limit(1)
              .maybeSingle()
            const nextQueueNumber = (maxRow?.queue_number ?? 0) + 1

            const res = await supabase
              .from('soap_consultations')
              .insert([{
                patient_id:        pid,
                consultation_date: today,  // PHT date
                queue_date:        today,  // PHT date — MUST match getTodayPHT() sa PendingPatients
                status:            'waiting',
                queue_number:      nextQueueNumber,
              }])
              .select('id')
              .single()

            if (!res.error) { consultErr = null; break }

            const isConflict = res.error.code === '23505' || /duplicate key/i.test(res.error.message ?? '')
            if (isConflict && attempt < maxAttempts - 1) {
              console.warn(`[doSave] queue_number collision, retrying (attempt ${attempt + 1})`)
              attempt++
              continue
            }

            consultErr = res.error
            break
          }
        }

        if (consultErr) {
          console.error('soap_consultations insert FAILED:', consultErr.message, consultErr.details)
          alert(`Failed to create visit record: ${consultErr.message}`)
        } else {
          console.log('✅ New visit created for PHT date:', today)
        }
      }

      const { data: fullPatient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', pid)
        .single()

      setSavedPatient(fullPatient)
      setSaving(false)
      onSaved()          // triggers fetchPatients() in RegistrarLogs — list refreshes
      setConfirm(null)
      doClose()          // close the modal cleanly
      return

    } catch (err: any) {
      console.error('FULL ERROR:', JSON.stringify(err, null, 2))
      alert(`Error: ${err?.message}\nCode: ${err?.code}\nDetails: ${err?.details}`)
      setSaving(false)
      return
    }
  }

  const doClose = () => { setConfirm(null); setStep(1); setPrivacyAccepted(false); onClose() }

  const StepIndicator = () => (
    <div className="fm-step-bar">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <div key={n}
          className={`fm-step-dot ${n === step ? 'fm-step-dot--current' : n < step ? 'fm-step-dot--done' : 'fm-step-dot--future'}`}
          onClick={() => n < step && setStep(n)}
        >{n}</div>
      ))}
    </div>
  )

  const DiseaseRow = ({ d, med, medSpec, setMed, setMedSpec }: {
    d: string; med: Record<string, boolean>; medSpec: Record<string, string>
    setMed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    setMedSpec: React.Dispatch<React.SetStateAction<Record<string, string>>>
  }) => (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <input type="checkbox" checked={!!med[d]} onChange={() => togCB(med, setMed, d)} className="fm-cb" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: '#1a2e20' }}>{d}</span>
        {['Allergy','Cancer','Hepatitis'].includes(d) && (
          <><span className="fm-muted">(Specify:</span>
          <IInput width="100px" value={medSpec[d] || ''} onChange={e => setMedSpec(p => ({ ...p, [d]: e.target.value }))} />
          <span className="fm-muted">)</span></>
        )}
        {d === 'Hypertension' && (
          <><span className="fm-muted">(Highest BP:</span>
          <IInput width="80px" value={medSpec[d] || ''} onChange={e => setMedSpec(p => ({ ...p, [d]: e.target.value }))} />
          <span className="fm-muted">mmHg)</span></>
        )}
        {d === 'PTB' && (
          <><span className="fm-muted">(Specify Extra PTB:</span>
          <IInput width="100px" value={medSpec[d] || ''} onChange={e => setMedSpec(p => ({ ...p, [d]: e.target.value }))} />
          <span className="fm-muted">)</span></>
        )}
      </div>
    </div>
  )

  const SystemPanel = ({ title, state, setState, other, setOther, items }: {
    title: string; state: Record<string, boolean>
    setState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    other: string; setOther: React.Dispatch<React.SetStateAction<string>>; items: string[]
  }) => (
    <FieldCard>
      <div className="fm-sys-title">{title}</div>
      <div className="fm-sys-grid">
        {items.map(item => <CB key={item} label={item} checked={!!state[item]} onChange={() => togCB(state, setState, item)} />)}
        <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
          <label className="fm-check-label">
            <input type="checkbox" checked={!!state['Others']} onChange={() => togCB(state, setState, 'Others')} className="fm-cb" />
            <span style={{ fontSize: '13px' }}>Others:</span>
            <ClearableInput value={other} onChange={e => setOther(e.target.value)} onClear={() => setOther('')} style={{ flex: 1 }} />
          </label>
        </div>
      </div>
    </FieldCard>
  )

  return (
    <div className="fm-overlay">
      <div className="fm-modal">

        {/* ══ STEP 1 ══ */}
        {step === 1 && (<>
          <div className="fm-header">General Data and Konsulta Registration</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">

            <ExistingPatientSearch onSelect={fillFromPatient} />

            <FieldCard>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div className="fm-section-title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  Patient Information
                </div>
                {hasPatientData && (
                  <button type="button" onClick={() => setS1({ ...EMPTY_S1 })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%)', border: '1.5px solid #e8a0a0', color: '#8B1A1A', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.03em', boxShadow: '0 1px 3px rgba(139,26,26,0.12)', transition: 'all 0.15s ease', flexShrink: 0, whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'linear-gradient(135deg, #ffe8e8 0%, #ffd5d5 100%)'; b.style.borderColor = '#c0443a' }}
                    onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%)'; b.style.borderColor = '#e8a0a0' }}
                  >
                    <span style={{ fontSize: '11px', lineHeight: 1 }}>✕</span> Clear all Patient Fields
                  </button>
                )}
              </div>
              <div style={{ borderBottom: '1.5px solid #d4e4d8', marginBottom: '14px' }} />
              <div className="fm-grid-3">
                <PatientAutocomplete field="last_name"  value={s1.lastName}  onChange={v => setS1(p => ({ ...p, lastName: v }))}  onSelect={fillFromPatient} placeholder="Type last name..." />
                <PatientAutocomplete field="first_name" value={s1.firstName} onChange={v => setS1(p => ({ ...p, firstName: v }))} onSelect={fillFromPatient} placeholder="Type first name..." />
                <LabeledInput label="Middle Name" value={s1.middleName} onChange={e => setS1(p => ({ ...p, middleName: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'flex-end' }}>
                <LabeledInput label="Age" width="70px" value={s1.age} onChange={e => setS1(p => ({ ...p, age: e.target.value }))} />
                <div className="fm-col">
                  <span className="fm-label">Sex</span>
                  <div style={{ display: 'flex', gap: '16px', padding: '6px 0' }}>
                    <label className="fm-check-label"><input type="checkbox" checked={s1.sexF} onChange={() => setS1(p => ({ ...p, sexF: !p.sexF, sexM: false }))} className="fm-cb" /> Female</label>
                    <label className="fm-check-label"><input type="checkbox" checked={s1.sexM} onChange={() => setS1(p => ({ ...p, sexM: !p.sexM, sexF: false }))} className="fm-cb" /> Male</label>
                  </div>
                </div>
                <LabeledInput label="Birthdate" width="150px" type="date" value={s1.birthdate} onChange={e => {
                  const bd = e.target.value
                  const computed = bd ? Math.floor((new Date().getTime() - new Date(bd).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : ''
                  setS1(p => ({ ...p, birthdate: bd, age: computed === '' ? '' : String(computed) }))
                }} />
              </div>
              <div className="fm-grid-3">
                <LabeledInput label="Purok" value={s1.purok} onChange={e => setS1(p => ({ ...p, purok: e.target.value }))} />
                <BarangayInput value={s1.barangay} onChange={v => setS1(p => ({ ...p, barangay: v }))} />
                <LabeledInput label="Municipality" value={s1.municipality} onChange={e => setS1(p => ({ ...p, municipality: e.target.value }))} />
              </div>
              <div className="fm-grid-2">
                <LabeledInput label="Contact Number" value={s1.contact} onChange={e => setS1(p => ({ ...p, contact: e.target.value }))} />
                <LabeledInput label="E-mail Address" type="email" value={s1.email} onChange={e => setS1(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="fm-grid-2">
                <LabeledInput label="PhilHealth PIN" value={s1.philhealth} onChange={e => setS1(p => ({ ...p, philhealth: e.target.value }))} />
                <div className="fm-col">
                  <span className="fm-label">Member Type</span>
                  <div style={{ display: 'flex', gap: '16px', padding: '6px 0', flexWrap: 'wrap', alignItems: 'center' }}>
                    <CB label="Member"    checked={s1.memberMember}    onChange={() => setS1(p => ({ ...p, memberMember: !p.memberMember }))} />
                    <CB label="Dependent" checked={s1.memberDependent} onChange={() => setS1(p => ({ ...p, memberDependent: !p.memberDependent }))} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="fm-muted">Specify:</span>
                      <IInput width="110px" value={s1.memberSpecify} onChange={e => setS1(p => ({ ...p, memberSpecify: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
            </FieldCard>

            <FieldCard>
              <SectionTitle>Konsulta Registration</SectionTitle>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'flex-end' }}>
                <LabeledInput label="Registration Date" width="150px" type="date" value={s1.regDate} onChange={e => setS1(p => ({ ...p, regDate: e.target.value }))} />
                <div className="fm-col">
                  <span className="fm-label">KKP Sign</span>
                  <div style={{ padding: '6px 0' }}><CB checked={s1.kkpSign} onChange={() => setS1(p => ({ ...p, kkpSign: !p.kkpSign }))} /></div>
                </div>
              </div>
              <div className="fm-col">
                <span className="fm-label">Preferred Facility and Address</span>
                {(['fac1', 'fac2', 'fac3'] as const).map((k, i) => {
                  const chk = (['fac1chk', 'fac2chk', 'fac3chk'] as const)[i]
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span className="fm-muted" style={{ width: '68px', flexShrink: 0 }}>Choice {i + 1}:</span>
                      <ClearableInput value={s1[k]} onChange={e => setS1(p => ({ ...p, [k]: e.target.value }))} onClear={() => setS1(p => ({ ...p, [k]: '' }))} style={{ flex: 1 }} />
                      <CB checked={s1[chk]} onChange={() => setS1(p => ({ ...p, [chk]: !p[chk] }))} />
                    </div>
                  )
                })}
              </div>
            </FieldCard>

            <FieldCard>
              <SectionTitle>Authorization Transaction</SectionTitle>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="fm-col">
                  <span className="fm-label">AT Code</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="checkbox" checked={s1.atNoAtc} onChange={() => setS1(p => ({ ...p, atNoAtc: !p.atNoAtc }))} className="fm-cb" style={{ flexShrink: 0 }} />
                    <ClearableInput value={s1.atCode} onChange={e => setS1(p => ({ ...p, atCode: e.target.value }))} onClear={() => setS1(p => ({ ...p, atCode: '' }))} width="130px" />
                  </div>
                </div>
                <div className="fm-col">
                  <span className="fm-label">Date of Appointment</span>
                  <ClearableInput type="date" value={s1.apptDate} onChange={e => setS1(p => ({ ...p, apptDate: e.target.value }))} onClear={() => setS1(p => ({ ...p, apptDate: '' }))} width="160px" />
                </div>
                <div className="fm-col">
                  <span className="fm-label">If No ATC</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
                    <input type="checkbox" checked={s1.faceCapture} onChange={() => setS1(p => ({ ...p, faceCapture: !p.faceCapture }))} className="fm-cb" />
                    <span style={{ fontSize: '13px' }}>Face Capture</span>
                  </div>
                </div>
              </div>
            </FieldCard>

            <div className="fm-btn-row">
              <button className="fm-btn-next" onClick={() => setStep(2)}>Next →</button>
            </div>
          </div>
        </>)}

        {/* ══ STEP 2 ══ */}
        {step === 2 && (<>
          <div className="fm-header">Health Assessment Tool</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">
            <div className="fm-grid-2" style={{ gap: '16px' }}>
              <FieldCard>
                <SectionTitle>Past Medical History</SectionTitle>
                {DISEASES.map(d => <DiseaseRow key={d} d={d} med={pastMed} medSpec={pastMedSpec} setMed={setPastMed} setMedSpec={setPastMedSpec} />)}
                <div style={{ borderTop: '1px solid #b0c4b8', marginTop: '10px', paddingTop: '10px' }}>
                  <LabeledInput label="Past Surgery/ies Done" value={surgery} onChange={e => setSurgery(e.target.value)} />
                  <div style={{ marginTop: '8px' }}>
                    <LabeledInput label="Date Done" width="150px" type="date" value={surgDate} onChange={e => setSurgDate(e.target.value)} />
                  </div>
                </div>
              </FieldCard>
              <FieldCard>
                <SectionTitle>Family History</SectionTitle>
                {DISEASES.map(d => <DiseaseRow key={d} d={d} med={famHist} medSpec={famHistSpec} setMed={setFamHist} setMedSpec={setFamHistSpec} />)}
              </FieldCard>
            </div>
            <div className="fm-btn-row">
              <button className="fm-btn-back" onClick={() => setStep(1)}>← Back</button>
              <button className="fm-btn-next" onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        </>)}

        {/* ══ STEP 3 ══ */}
        {step === 3 && (<>
          <div className="fm-header">Health Assessment Tool</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">
            <div className="fm-grid-2" style={{ gap: '16px' }}>
              <FieldCard>
                <SectionTitle>Personal / Social History</SectionTitle>
                {([
                  ['Smoking', smoking, setSmoking],
                  ['Alcohol', alcohol, setAlcohol],
                  ['Illicit Drugs', illicit, setIllicit],
                  ['Sexually Active', sexually, setSexually],
                ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, setVal]) => (
                  <div key={label} style={{ marginBottom: '12px' }}>
                    <span className="fm-label">{label}</span>
                    <div style={{ display: 'flex', gap: '16px', padding: '6px 0' }}>
                      {['Yes', 'No', 'Quit'].map(opt => <RB key={opt} label={opt} name={label} value={opt} checked={val === opt} onChange={() => setVal(opt)} />)}
                    </div>
                    {label === 'Smoking' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span className="fm-muted">Packs-Year:</span>
                        <IInput width="100px" value={packsYear} onChange={e => setPacksYear(e.target.value)} />
                      </div>
                    )}
                    {label === 'Alcohol' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span className="fm-muted">Servings/day:</span>
                        <IInput width="100px" value={servingsDay} onChange={e => setServingsDay(e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}
              </FieldCard>
              <FieldCard>
                <SectionTitle>Immunization History</SectionTitle>
                <div className="fm-label" style={{ marginBottom: '6px' }}>Children</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '12px' }}>
                  {['BCG', 'OPV1', 'OPV2', 'OPV3', 'DPT1', 'DPT2', 'DPT3', 'Measles', 'Hapa1', 'Hapa2', 'Hapa3', 'Varicella'].map((v, i) => (
                    <CB key={v + i} label={v} checked={!!immun[v + i]} onChange={() => togCB(immun, setImmun, v + String(i))} />
                  ))}
                </div>
                <div className="fm-label" style={{ marginBottom: '6px' }}>Adult</div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  {['HPV', 'MMR', 'None'].map(v => <CB key={v} label={v} checked={!!immun[v]} onChange={() => togCB(immun, setImmun, v)} />)}
                </div>
                <div className="fm-label" style={{ marginBottom: '6px' }}>Elderly & Immunocompromised</div>
                <CB label="Pneumococcal Vaccine" checked={!!immun.pneumo} onChange={() => togCB(immun, setImmun, 'pneumo')} />
                <CB label="Flu Vaccine"          checked={!!immun.flu}    onChange={() => togCB(immun, setImmun, 'flu')} />
                <div style={{ marginTop: '10px' }}>
                  <LabeledInput label="Others" value={immunOther} onChange={e => setImmunOther(e.target.value)} />
                </div>
              </FieldCard>
            </div>
            <div className="fm-btn-row">
              <button className="fm-btn-back" onClick={() => setStep(2)}>← Back</button>
              <button className="fm-btn-next" onClick={() => setStep(4)}>Next →</button>
            </div>
          </div>
        </>)}

        {/* ══ STEP 4 ══ */}
        {step === 4 && (<>
          <div className="fm-header">Health Assessment Tool</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">
            <FieldCard>
              <SectionTitle>Family Planning</SectionTitle>
              <CB label="With access to family planning counseling" checked={fpAccess} onChange={() => setFpAccess(p => !p)} />
              <div className="fm-grid-2" style={{ marginTop: '10px' }}>
                <LabeledInput label="Provider" value={fpProvider} onChange={e => setFpProvider(e.target.value)} />
                <LabeledInput label="Birth Control Method Used" value={fpMethod} onChange={e => setFpMethod(e.target.value)} />
              </div>
            </FieldCard>
            <FieldCard>
              <SectionTitle>Menstrual History</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                  <LabeledInput label="Menarche" width="80px" value={menarche} onChange={e => setMenarche(e.target.value)} />
                  <span className="fm-muted" style={{ paddingBottom: '8px' }}>yrs old</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                  <LabeledInput label="Onset of Sexual Intercourse" width="80px" value={onsetSex} onChange={e => setOnsetSex(e.target.value)} />
                  <span className="fm-muted" style={{ paddingBottom: '8px' }}>yrs old</span>
                </div>
                <LabeledInput label="Last Menstrual Period" width="150px" type="date" value={lmp} onChange={e => setLmp(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                  <LabeledInput label="Period Duration" width="70px" value={periodDur} onChange={e => setPeriodDur(e.target.value)} />
                  <span className="fm-muted" style={{ paddingBottom: '8px' }}>days</span>
                </div>
                <LabeledInput label="No. of Pads/day" width="70px" value={padsDay} onChange={e => setPadsDay(e.target.value)} />
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                  <LabeledInput label="Interval Cycle" width="70px" value={intervalCycle} onChange={e => setIntervalCycle(e.target.value)} />
                  <span className="fm-muted" style={{ paddingBottom: '8px' }}>days</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="fm-label">Menopause:</span>
                <CB label="Yes" checked={menopauseYes} onChange={() => { setMenopauseYes(p => !p); setMenopauseNo(false) }} />
                <CB label="No"  checked={menopauseNo}  onChange={() => { setMenopauseNo(p => !p);  setMenopauseYes(false) }} />
                {menopauseYes && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    <LabeledInput label="Age at Menopause" width="70px" value={ageMenopause} onChange={e => setAgeMenopause(e.target.value)} />
                    <span className="fm-muted" style={{ paddingBottom: '8px' }}>years</span>
                  </div>
                )}
              </div>
            </FieldCard>
            <FieldCard>
              <SectionTitle>Pregnancy History</SectionTitle>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px' }}>
                {([['G', pregG, setPregG], ['P', pregP, setPregP], ['(T', pregT, setPregT], ['P', pregP2, setPregP2], ['A', pregA, setPregA], ['L', pregL, setPregL]] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([l, v, sv], i) => (
                  <div key={i} className="fm-col">
                    <span className="fm-label">{l}</span>
                    <IInput width="50px" value={v} onChange={e => sv(e.target.value)} />
                  </div>
                ))}
                <span style={{ fontSize: '18px', color: '#607a6a', paddingBottom: '4px' }}>)</span>
              </div>
              <div className="fm-grid-2">
                <LabeledInput label="Type of Delivery" value={delivery} onChange={e => setDelivery(e.target.value)} />
                <div className="fm-col">
                  <span className="fm-label">Pregnancy Include Hypertension</span>
                  <div style={{ display: 'flex', gap: '16px', padding: '6px 0' }}>
                    <CB label="Yes" checked={pregHtnYes} onChange={() => { setPregHtnYes(p => !p); setPregHtnNo(false) }} />
                    <CB label="No"  checked={pregHtnNo}  onChange={() => { setPregHtnNo(p => !p);  setPregHtnYes(false) }} />
                  </div>
                </div>
              </div>
            </FieldCard>
            <div className="fm-btn-row">
              <button className="fm-btn-back" onClick={() => setStep(3)}>← Back</button>
              <button className="fm-btn-next" onClick={() => setStep(5)}>Next →</button>
            </div>
          </div>
        </>)}

        {/* ══ STEP 5 ══ */}
        {step === 5 && (<>
          <div className="fm-header">Health Assessment Tool</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">
            <FieldCard>
              <SectionTitle>Pertinent Physical Examination Findings</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                {([
                  ['Height', height, setHeight, 'cm'], ['Weight', weight, setWeight, 'kg'],
                  ['Blood Pressure', bp, setBp, 'mmHg'], ['Heart Rate', hr, setHr, 'bpm'],
                  ['Temperature', temp, setTemp, '°C'], ['Respiratory Rate', rr, setRr, 'cpm'],
                ] as [string, string, React.Dispatch<React.SetStateAction<string>>, string][]).map(([lbl, val, setVal, unit]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    <LabeledInput label={lbl} value={val} onChange={e => setVal(e.target.value)} />
                    <span className="fm-muted" style={{ paddingBottom: '8px', flexShrink: 0 }}>{unit}</span>
                  </div>
                ))}
              </div>
              <div className="fm-col">
                <span className="fm-label">Blood Type</span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '6px 0' }}>
                  {['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'].map(t => (
                    <label key={t} className="fm-check-label">
                      <input type="checkbox" checked={bloodType === t} onChange={() => setBloodType(bloodType === t ? '' : t)} className="fm-cb" /> {t}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <span className="fm-label">Visual Acuity:</span>
                <span style={{ fontSize: '13px', color: '#607a6a' }}>Right Eye</span>
                <ClearableInput value={visRight} onChange={e => setVisRight(e.target.value)} onClear={() => setVisRight('')} width="120px" />
                <span style={{ fontSize: '13px', color: '#607a6a' }}>Left Eye</span>
                <ClearableInput value={visLeft}  onChange={e => setVisLeft(e.target.value)}  onClear={() => setVisLeft('')}  width="120px" />
              </div>
            </FieldCard>
            <FieldCard>
              <SectionTitle>Pedia Client Aged 0–24 Months</SectionTitle>
              <div className="fm-grid-2">
                {['Body Length', 'Head Circumference', 'Chest Circumference', 'Abdominal Circumference', 'Hip Circumference', 'Mid-Upper Arm Circumference', 'Limbs Circumference'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    <LabeledInput label={f} value={pedia[f] || ''} onChange={e => setPedia(p => ({ ...p, [f]: e.target.value }))} />
                    <span className="fm-muted" style={{ paddingBottom: '8px', flexShrink: 0 }}>cm</span>
                  </div>
                ))}
              </div>
            </FieldCard>
            <div className="fm-btn-row">
              <button className="fm-btn-back" onClick={() => setStep(4)}>← Back</button>
              <button className="fm-btn-next" onClick={() => setStep(6)}>Next →</button>
            </div>
          </div>
        </>)}

        {/* ══ STEP 6 ══ */}
        {step === 6 && (<>
          <div className="fm-header">Pertinent Findings Per System</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">
            <FieldCard>
              <SectionTitle>General Survey</SectionTitle>
              <div style={{ display: 'flex', gap: '24px' }}>
                <CB label="Awake and Alert"   checked={!!genSurvey.awake}   onChange={() => togCB(genSurvey, setGenSurvey, 'awake')} />
                <CB label="Altered Sensorium" checked={!!genSurvey.altered} onChange={() => togCB(genSurvey, setGenSurvey, 'altered')} />
              </div>
            </FieldCard>
            <div className="fm-grid-2" style={{ gap: '12px' }}>
              <SystemPanel title="A. HEENT" state={heent} setState={setHeent} other={heentOther} setOther={setHeentOther}
                items={['Essentially Normal','Abnormal Papillary Reaction','Cervical Lymphadenopathy','Dry Mucus Membrane','Icteric Sclerae','Pale Conjunctiva','Sunken Eyeball','Sunken Fontanelle']} />
              <SystemPanel title="B. Chest / Breast / Lungs" state={chest} setState={setChest} other={chestOther} setOther={setChestOther}
                items={['Essentially Normal','Asymmetrical Chest Expansion','Decreased Breath Sound','Wheeze','Crackle / Rales','Retractions','Lumps Over Breast']} />
              <SystemPanel title="C. Heart" state={heart} setState={setHeart} other={heartOther} setOther={setHeartOther}
                items={['Essentially Normal','Displaced Apex Beat','Heave Trills','Irregular Rhythm','Muffled Heart Sounds','Murmurs','Pericardial Bulge']} />
              <SystemPanel title="D. Abdomen" state={abdomen} setState={setAbdomen} other={abdomenOther} setOther={setAbdomenOther}
                items={['Essentially Normal','Abdominal Rigidity','Abdominal Tenderness','Hyperactive Bowel Sound','Palpable Mass/es','Tympanitic/Dull Abdomen','Uterine Contraction']} />
            </div>
            <div className="fm-btn-row">
              <button className="fm-btn-back" onClick={() => setStep(5)}>← Back</button>
              <button className="fm-btn-next" onClick={() => setStep(7)}>Next →</button>
            </div>
          </div>
        </>)}

        {/* ══ STEP 7 ══ */}
        {step === 7 && (<>
          <div className="fm-header">Health Assessment Tool</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">
            <div className="fm-grid-2" style={{ gap: '12px' }}>
              <SystemPanel title="E. Genitourinary" state={genito} setState={setGenito} other={genitOther} setOther={setGenitOther}
                items={['Essentially Normal','Blood Stained in Internal Examination','Cervical Dilation','Presence of Abnormal Discharge']} />
              <SystemPanel title="F. Digital Rectal Examination" state={rectal} setState={setRectal} other={rectalOther} setOther={setRectalOther}
                items={['Crackle / Rales','Enlarge Prostate','Mass','Hemorrhoids','Pus','Not Applicable']} />
              <SystemPanel title="G. Skin / Extremities" state={skin} setState={setSkin} other={skinOther} setOther={setSkinOther}
                items={['Essentially Normal','Clubbing','Cold Clammy','Cyanosis Mottled Skin','Edemal / Swelling','Decreased Mobility','Pale Nailbeds','Weak Pulses']} />
              <SystemPanel title="H. Neurological Examination" state={neuro} setState={setNeuro} other={neuroOther} setOther={setNeuroOther}
                items={['Essentially Normal','Abnormal Gait','Abnormal Position Sense','Abnormal Sensation','Abnormal Reflex/es','Poor/ Altered Memory','Poor Muscle Tone/ Strength','Poor Coordination']} />
            </div>
            <FieldCard style={{ marginTop: '12px' }}>
              <SectionTitle>First Patient Encounter Assessment</SectionTitle>
              {(['GENERALLY WELL', 'FOR PRIMARY CARE CONSULTAION', 'FOR DIAGNOSTIC EXAMINATION'] as string[]).map((lbl, i) => (
                <div key={lbl} style={{ marginBottom: '8px' }}>
                  <CB checked={!!assessment[lbl]} onChange={() => togCB(assessment, setAssessment, lbl)}>
                    <span style={{ fontWeight: '700', fontSize: '13px' }}>{lbl}</span>
                    <span className="fm-muted" style={{ marginLeft: '6px', fontStyle: 'italic' }}>
                      {['(fill out and sign eKAS)', '(fill out KONSULTA Referral Slip)', '(fill out Diagnostic Request Form)'][i]}
                    </span>
                  </CB>
                </div>
              ))}
            </FieldCard>
            <div className="fm-btn-row">
              <button className="fm-btn-back" onClick={() => setStep(6)}>← Back</button>
              <button className="fm-btn-next" onClick={() => setStep(8)}>Next →</button>
            </div>
          </div>
        </>)}

        {/* ══ STEP 8 ══ */}
        {step === 8 && (<>
          <div className="fm-header">NCD High-Risk Assessment (For 20 Years Old and Above)</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">
            <FieldCard>
              <SectionTitle>Lifestyle Questions</SectionTitle>
              {([
                ['q1', '1. Eats processed food (e.g. Instant Noodles, Burgers, Fries, Fried Chicken, ihaw-ihaw) weekly?'],
                ['q2', '2. Eats 3 servings of fruits and vegetables daily?'],
                ['q3', '3. Does at least 2.5 hours of moderate-intensity physical activity every week?'],
              ] as [string, string][]).map(([key, q]) => (
                <div key={key} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #b0c4b8' }}>
                  <p style={{ fontSize: '13px', marginBottom: '6px', color: '#1a2e20' }}>{q}</p>
                  <YesNo name={key} value={ncd8[key] || ''} onChange={v => setNcd8(p => ({ ...p, [key]: v }))} />
                </div>
              ))}
              <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #b0c4b8' }}>
                <p style={{ fontSize: '13px', marginBottom: '6px', color: '#1a2e20' }}>4. Was patient diagnosed as having Diabetes?</p>
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '6px' }}>
                  <RB label="Yes" name="diabetes" value="Yes" checked={diabetesYes} onChange={() => { setDiabetesYes(true); setDiabetesNo(false) }} />
                  <RB label='No / "Do not know"' name="diabetes" value="No" checked={diabetesNo} onChange={() => { setDiabetesNo(true); setDiabetesYes(false) }} />
                </div>
                {diabetesYes && (
                  <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '8px' }}>
                    <RB label="With Medication"    name="diabetesMed" value="With Medication"    checked={diabetesMed === 'With Medication'}    onChange={() => setDiabetesMed('With Medication')} />
                    <RB label="Without Medication" name="diabetesMed" value="Without Medication" checked={diabetesMed === 'Without Medication'} onChange={() => setDiabetesMed('Without Medication')} />
                  </div>
                )}
              </div>
              <div>
                <p style={{ fontSize: '13px', marginBottom: '8px', color: '#1a2e20' }}>5. Does the patient have any of the following symptoms?</p>
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
                  {['Polyphagia', 'Polydipsia', 'Polyuria'].map(s => (
                    <CB key={s} label={s} checked={!!symptoms[s]} onChange={() => togCB(symptoms, setSymptoms, s)} />
                  ))}
                </div>
              </div>
            </FieldCard>
            <FieldCard>
              <SectionTitle>Laboratory Results</SectionTitle>
              <div className="fm-grid-2" style={{ gap: '14px' }}>
                {([
                  ['FBS / RBS', labFbs, setLabFbs, labFbsDate, setLabFbsDate],
                  ['Total Cholesterol', labChol, setLabChol, labCholDate, setLabCholDate],
                  ['Urine Ketone', labKetone, setLabKetone, labKetoneDate, setLabKetoneDate],
                  ['Urine Protein', labProtein, setLabProtein, labProteinDate, setLabProteinDate],
                ] as [string, string, React.Dispatch<React.SetStateAction<string>>, string, React.Dispatch<React.SetStateAction<string>>][]).map(([lbl, val, setVal, date, setDate]) => (
                  <div key={lbl} className="fm-col">
                    <LabeledInput label={lbl} value={val} onChange={e => setVal(e.target.value)} />
                    <div style={{ marginTop: '6px' }}>
                      <LabeledInput label="Date Taken" width="150px" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </FieldCard>
            <div className="fm-btn-row">
              <button className="fm-btn-back" onClick={() => setStep(7)}>← Back</button>
              <button className="fm-btn-next" onClick={() => setStep(9)}>Next →</button>
            </div>
          </div>
        </>)}

        {/* ══ STEP 9 ══ */}
        {step === 9 && (<>
          <div className="fm-header">NCD High-Risk Assessment (For 20 Years Old and Above)</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">
            <FieldCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '14px' }}>
                <div className="fm-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>Angina or Heart Attack</div>
                <RB label="Yes" name="anginaOverall" value="Yes" checked={anginaOverall === 'Yes'} onChange={() => setAnginaOverall('Yes')} />
                <RB label="No"  name="anginaOverall" value="No"  checked={anginaOverall === 'No'}  onChange={() => setAnginaOverall('No')} />
              </div>
              {([
                { k:'a1', q:'1. Have you had any pain, discomfort, pressure, or heaviness in your chest?', t:'(Nakakaramdam ka ba ng pananakit o bigat sa iyong dibdib?)', note:'If No → go to question 8' },
                { k:'a2', q:'2. Do you get the pain in the center/left chest or left arm?',                 t:'(Ang sakit ba ay nasa gitna ng dibdib, sa kaliwang bahagi ng dibdib o sa kaliwang braso?)' },
                { k:'a3', q:'3. Do you get it when you walk uphill or hurry?',                              t:'(Nararamdaman mo ba ito kung ikaw ay nagmamadali o naglalakad nang mabilis o paahon?)' },
                { k:'a4', q:'4. Do you slow down if you get the pain while walking?',                       t:'(Tumitigil ka ba sa paglalakad kapag sumasakit ang iyong dibdib?)' },
                { k:'a5', q:'5. Does the pain go away if you stand still or take medication?',              t:'(Nawawala ba yung sakit sa dibdib kapag ikaw ay tumitigil o umiinom ng gamot sa ilalim ng dila?)' },
              ] as { k: string; q: string; t: string; note?: string }[]).map(({ k, q, t, note }) => (
                <div key={k} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #b0c4b8' }}>
                  <p style={{ fontSize: '13px', marginBottom: '2px', fontWeight: '600', color: '#1a2e20' }}>{q}</p>
                  <p style={{ fontSize: '12px', color: '#607a6a', fontStyle: 'italic', marginBottom: '8px' }}>{t}</p>
                  <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', alignItems: 'center' }}>
                    <RB label="Yes" name={k} value="Yes" checked={angina[k] === 'Yes'} onChange={() => setAngina(p => ({ ...p, [k]: 'Yes' }))} />
                    <RB label="No"  name={k} value="No"  checked={angina[k] === 'No'}  onChange={() => setAngina(p => ({ ...p, [k]: 'No' }))} />
                    {note && <span style={{ fontSize: '12px', fontStyle: 'italic', color: '#607a6a' }}>{note}</span>}
                  </div>
                </div>
              ))}
            </FieldCard>
            <div className="fm-btn-row">
              <button className="fm-btn-back" onClick={() => setStep(8)}>← Back</button>
              <button className="fm-btn-next" onClick={() => setStep(10)}>Next →</button>
            </div>
          </div>
        </>)}

        {/* ══ STEP 10 ══ */}
        {step === 10 && (<>
          <div className="fm-header">NCD High-Risk Assessment (For 20 Years Old and Above)</div>
          <button className="fm-close-btn" onClick={() => setConfirm('close')}>×</button>
          <StepIndicator />
          <div className="fm-body">
            <FieldCard>
              <SectionTitle>Continued — Chest Pain Assessment</SectionTitle>
              {([
                { k:'s6', q:'6. Does the pain go away in less than 10 minutes?',                                                             t:'(Nawawala ba ang sakit sa loob ng 10 minuto?)' },
                { k:'s7', q:'7. Have you ever had severe chest pain across the front of your chest lasting half an hour or more?',            t:'(Nakaramdam ka na ba ng pananakit ng dibdib na tumatagal ng kalahating oras o higit pa?)' },
              ] as { k: string; q: string; t: string }[]).map(({ k, q, t }) => (
                <div key={k} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #b0c4b8' }}>
                  <p style={{ fontSize: '13px', marginBottom: '2px', fontWeight: '600', color: '#1a2e20' }}>{q}</p>
                  <p style={{ fontSize: '12px', color: '#607a6a', fontStyle: 'italic', marginBottom: '8px' }}>{t}</p>
                  <div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
                    <RB label="Yes" name={k} value="Yes" checked={stroke[k] === 'Yes'} onChange={() => setStroke(p => ({ ...p, [k]: 'Yes' }))} />
                    <RB label="No"  name={k} value="No"  checked={stroke[k] === 'No'}  onChange={() => setStroke(p => ({ ...p, [k]: 'No' }))} />
                  </div>
                </div>
              ))}
            </FieldCard>
            <FieldCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '14px' }}>
                <div className="fm-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>Stroke and TIA</div>
                <RB label="Yes" name="strokeTia" value="Yes" checked={strokeTia === 'Yes'} onChange={() => setStrokeTia('Yes')} />
                <RB label="No"  name="strokeTia" value="No"  checked={strokeTia === 'No'}  onChange={() => setStrokeTia('No')} />
              </div>
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid #b0c4b8', marginBottom: '12px' }}>
                <p style={{ fontSize: '13px', marginBottom: '2px', fontWeight: '600', color: '#1a2e20' }}>
                  8. Have you ever had difficulty in talking, weakness of arms or legs on one side of the body?
                </p>
                <p style={{ fontSize: '12px', color: '#607a6a', fontStyle: 'italic', marginBottom: '8px' }}>
                  (Nakaramdam ka na ba ng pagkautal, panghihina ng braso o binti, o pamamanhid ng kalahati ng katawan?)
                </p>
                <div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
                  <RB label="Yes" name="s8" value="Yes" checked={stroke.s8 === 'Yes'} onChange={() => setStroke(p => ({ ...p, s8: 'Yes' }))} />
                  <RB label="No"  name="s8" value="No"  checked={stroke.s8 === 'No'}  onChange={() => setStroke(p => ({ ...p, s8: 'No' }))} />
                </div>
                <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#607a6a', marginTop: '8px', textAlign: 'center' }}>
                  ● If YES to question 8, patient may have TIA/Stroke — must seek a doctor immediately.
                </p>
              </div>
            </FieldCard>
            <FieldCard>
              <SectionTitle>Risk Level</SectionTitle>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {['<10%', '10% to <20%', '20% to <30%', '30% to <40%', '>40%'].map(r => (
                  <label key={r} className={`fm-risk-chip${riskLevel === r ? ' fm-risk-chip--selected' : ''}`}>
                    <input type="checkbox" checked={riskLevel === r} onChange={() => setRiskLevel(riskLevel === r ? '' : r)} className="fm-cb" />
                    {r}
                  </label>
                ))}
              </div>
            </FieldCard>
            <div className="fm-btn-row">
              <button className="fm-btn-back" onClick={() => setStep(9)}>← Back</button>
              <button className="fm-btn-next" onClick={() => setConfirm('save')} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save ✓'}
              </button>
            </div>
          </div>
        </>)}

        {/* ── Confirm: Save ── */}
        {confirm === 'save' && (
          <div className="fm-confirm-overlay">
            <div className="fm-confirm-box">
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#1a2e20' }}>Save Patient Record?</p>
              <p style={{ fontSize: '14px', color: '#607a6a', marginBottom: '24px' }}>Please review all fields before saving.</p>
              <button className="fm-confirm-cancel" onClick={() => setConfirm(null)}>CANCEL</button>
              <button className="fm-confirm-save"   onClick={() => setConfirm('send')}>CONFIRM</button>
            </div>
          </div>
        )}

        {/* ── Confirm: Send to Doctor / Nurse ──
             FIX: replaced the old hidden <input type="radio"> wrapped in a
             <label> with plain clickable <div>s. setSendTarget(...) fires
             directly on the div's own onClick — no native label→input click
             forwarding involved at all, so there's nothing for a global CSS
             reset / extension / stray event listener to interfere with. ── */}
        {confirm === 'send' && (
          <div className="fm-confirm-overlay">
            <div className="fm-confirm-box">
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#1a2e20' }}>Send Patient To?</p>
              <p style={{ fontSize: '14px', color: '#607a6a', marginBottom: '16px' }}>
                This will save the patient record and add them to the queue.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
                <div
                  onClick={() => setSendTarget('doctor')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSendTarget('doctor') }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '14px 22px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${sendTarget === 'doctor' ? '#16a34a' : '#e5e7eb'}`,
                    background: sendTarget === 'doctor' ? '#f0fdf4' : '#f9fafb',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '28px', pointerEvents: 'none' }}>👨‍⚕️</span>
                  <span style={{ fontWeight: '800', fontSize: '13px', color: '#16a34a', pointerEvents: 'none' }}>Doctor</span>
                </div>

                <div
                  onClick={() => setSendTarget('nurse')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSendTarget('nurse') }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '14px 22px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${sendTarget === 'nurse' ? '#0d9488' : '#e5e7eb'}`,
                    background: sendTarget === 'nurse' ? '#f0fdfa' : '#f9fafb',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '28px', pointerEvents: 'none' }}>👩‍⚕️</span>
                  <span style={{ fontWeight: '800', fontSize: '13px', color: '#0d9488', pointerEvents: 'none' }}>Nurse</span>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#1a6b2e', marginBottom: '24px', fontWeight: '600', textAlign: 'center' }}>
                Sending to <strong>{sendTarget === 'nurse' ? 'Nurse' : 'Doctor'}</strong> · Status will be set to: <strong>Waiting</strong>
              </p>
              <button className="fm-confirm-cancel" onClick={() => setConfirm(null)}>CANCEL</button>
              <button className="fm-confirm-save" onClick={doSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'SEND'}
              </button>
            </div>
          </div>
        )}

        {/* ── Confirm: Discard ── */}
        {confirm === 'close' && (
          <div className="fm-confirm-overlay">
            <div className="fm-confirm-box">
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#1a2e20' }}>Discard Changes?</p>
              <p style={{ fontSize: '14px', color: '#607a6a', marginBottom: '24px' }}>All unsaved information will be lost.</p>
              <button className="fm-confirm-cancel" onClick={() => setConfirm(null)}>CANCEL</button>
              <button className="fm-confirm-save"   onClick={doClose}>DISCARD</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AddPatientModal