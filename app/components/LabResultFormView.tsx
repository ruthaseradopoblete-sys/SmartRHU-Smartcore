'use client'
import { useEffect, useState, useRef } from 'react'
import { fetchLabResults } from '../Laboratory/components/labService'

interface Request {
  id: string
  name: string
  age: string | number
  gender: string
  address: string
  request_date: string
  status: string
  tests: Record<string, boolean>
}
interface Props {
  isOpen: boolean
  onClose: () => void
  request: Request | null
}

// ── Design tokens ─────────────────────────────────────────
const G     = '#16a34a'
const DARK  = '#064e3b'
const MID   = '#15803d'

// ── Shared table cell styles ──────────────────────────────
const TH: React.CSSProperties = {
  background: DARK, color: '#fff', fontWeight: 700,
  fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase',
  padding: '7px 10px', border: `1px solid ${DARK}`, textAlign: 'center',
}
const TD: React.CSSProperties = {
  border: '1px solid #d1fae5', padding: '6px 10px',
  fontSize: 12, verticalAlign: 'middle', background: '#fff',
}
const TDL: React.CSSProperties = {
  ...TD, fontWeight: 600, color: '#374151',
  whiteSpace: 'nowrap', background: '#f9fef9', width: 1,
}
const TDR: React.CSSProperties = { ...TD, minWidth: 90, color: '#111' }
const TDN: React.CSSProperties = {
  ...TD, fontSize: 10, color: '#6b7280',
  whiteSpace: 'pre-line', textAlign: 'center',
}

// ── Sub-section heading ───────────────────────────────────
function SubHead({ label }: { label: string }) {
  return (
    <div style={{
      background: '#f0fdf4', padding: '5px 12px',
      fontSize: 10, fontWeight: 800, color: DARK,
      borderBottom: '1px solid #bbf7d0',
      letterSpacing: 0.8, textTransform: 'uppercase',
    }}>{label}</div>
  )
}

// ── Generic table row ─────────────────────────────────────
function Row({ label, value, unit, normal }: {
  label: string; value: string; unit?: string; normal?: string
}) {
  const hasVal = !!value
  return (
    <tr>
      <td style={TDL}>{label}</td>
      <td style={{ ...TDR, fontWeight: hasVal ? 700 : 400, color: hasVal ? '#111' : '#bbb' }}>
        {value || '—'}
        {unit && hasVal && <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 4 }}>{unit}</span>}
      </td>
      <td style={TDN}>{normal || ''}</td>
    </tr>
  )
}

// ── Result status badge ───────────────────────────────────
function ResultBadge({ value }: { value: string }) {
  const isR  = value === 'Reactive'
  const isNR = value === 'Non-Reactive'
  return (
    <span style={{
      fontWeight: 800, fontSize: 11, padding: '2px 10px', borderRadius: 99,
      background: isR ? '#fee2e2' : isNR ? '#dcfce7' : value ? '#f1f5f9' : 'transparent',
      color: isR ? '#dc2626' : isNR ? '#16a34a' : value ? '#374151' : '#bbb',
      display: 'inline-block',
    }}>
      {value || '—'}
    </span>
  )
}

// ── Card wrapper for each section ─────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: '1.5px solid #d1fae5', borderRadius: 12,
      overflow: 'hidden', boxShadow: '0 1px 6px rgba(22,163,74,0.07)',
    }}>
      {children}
    </div>
  )
}

// ══ CLINICAL CHEMISTRY ════════════════════════════════════
function ClinChemView({ data }: { data: any }) {
  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <SubHead label="Blood Sugar & Uric Acid" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>
              <th style={TH}>Test</th><th style={TH}>Result</th><th style={TH}>Normal Values</th>
            </tr></thead>
            <tbody>
              <Row label="RBS"       value={data.rbs  || ''} unit="mg/dL" normal="< 160 mg/dL" />
              <Row label="FBS"       value={data.fbs  || ''} unit="mg/dL" normal="70–105 mg/dL" />
              <Row label="Uric Acid" value={data.uric || ''} unit="mg/dL" normal={'M: 3.5–7.7\nF: 2.6–6.0'} />
            </tbody>
          </table>
        </div>
        <div style={{ borderLeft: '2px solid #d1fae5' }}>
          <SubHead label="Lipid Profile" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>
              <th style={TH}>Test</th><th style={TH}>Result</th><th style={TH}>Normal Value</th>
            </tr></thead>
            <tbody>
              <Row label="Cholesterol"   value={data.chol || ''} unit="mg/dL" normal="< 200 mg/dL" />
              <Row label="Triglycerides" value={data.trig || ''} unit="mg/dL" normal="< 150 mg/dL" />
              <Row label="HDL"           value={data.hdl  || ''} unit="mg/dL" normal="≥ 60 mg/dL" />
              <Row label="LDL"           value={data.ldl  || ''} unit="mg/dL" normal="< 130 mg/dL" />
            </tbody>
          </table>
        </div>
      </div>
      {/* Remarks */}
      <div style={{
        borderTop: '1px solid #d1fae5', background: '#f9fef9',
        padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {([['Remarks', data.remarks], ['Last Meal', data.lastMeal], ['Time of Extraction', data.timeEx]] as [string,string][]).map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', gap: 10, fontSize: 12, alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, color: DARK, minWidth: 140, flexShrink: 0 }}>{lbl}:</span>
            <span style={{ color: val ? '#111' : '#bbb', fontStyle: val ? 'normal' : 'italic' }}>
              {val || '—'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ══ URINALYSIS ════════════════════════════════════════════
function UrinalysisView({ data }: { data: any }) {
  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <SubHead label="Macroscopic Examination" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr><th style={TH}>Field</th><th style={TH}>Result</th><th style={TH}>Normal</th></tr></thead>
            <tbody>
              <Row label="Color"            value={data.color   || ''} />
              <Row label="Consistency"      value={data.consist || ''} />
              <Row label="Specific Gravity" value={data.spg     || ''} />
              <Row label="pH Reaction"      value={data.ph      || ''} />
              <Row label="Protein"          value={data.protein || ''} normal="Negative" />
              <Row label="Sugar"            value={data.sugar   || ''} normal="Negative" />
            </tbody>
          </table>
        </div>
        <div style={{ borderLeft: '2px solid #d1fae5' }}>
          <SubHead label="Microscopic Examination" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr><th style={TH}>Field</th><th style={TH}>Result</th><th style={TH}>Normal</th></tr></thead>
            <tbody>
              <Row label="WBC / PUS Cell"    value={data.wbc      || ''} normal="0–2/HPF" />
              <Row label="Red Blood Cell"    value={data.rbc      || ''} normal="0–2/HPF" />
              <Row label="Epithelial Cell"   value={data.epi      || ''} />
              <Row label="Amorphous Subst."  value={data.amorph   || ''} />
              <Row label="Mucus Thread"      value={data.mucus    || ''} />
              <Row label="Bacteria"          value={data.bacteria || ''} />
            </tbody>
          </table>
        </div>
      </div>
      {data.others && (
        <div style={{ borderTop: '1px solid #d1fae5', padding: '8px 14px', fontSize: 12, background: '#f9fef9' }}>
          <span style={{ fontWeight: 700, color: DARK }}>Others: </span>{data.others}
        </div>
      )}
    </Card>
  )
}

// ══ FECALYSIS ════════════════════════════════════════════
function FecalysisView({ data }: { data: any }) {
  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <SubHead label="Macroscopic Examination" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <Row label="Color"       value={data.color   || ''} />
              <Row label="Consistency" value={data.consist || ''} />
            </tbody>
          </table>
        </div>
        <div style={{ borderLeft: '2px solid #d1fae5' }}>
          <SubHead label="Microscopic Examination" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr><th style={TH}>Field</th><th style={TH}>Result</th><th style={TH}>Normal</th></tr></thead>
            <tbody>
              <Row label="WBC / PUS Cell"  value={data.wbc || ''} normal="0–2/HPF" />
              <Row label="Red Blood Cell"  value={data.rbc || ''} normal="0–2/HPF" />
            </tbody>
          </table>
        </div>
      </div>
      <div style={{
        borderTop: '1px solid #d1fae5', background: '#f9fef9',
        padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {([['Parasite', data.parasite], ['Others', data.others]] as [string,string][]).map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', gap: 10, fontSize: 12, alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, color: DARK, minWidth: 90, flexShrink: 0 }}>{lbl}:</span>
            <span style={{ color: val ? '#111' : '#bbb', fontStyle: val ? 'normal' : 'italic' }}>{val || '—'}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ══ HEMATOLOGY ═══════════════════════════════════════════
function HematologyView({ data }: { data: any }) {
  const main = [
    ['Hemoglobin', data.hgb, 'g/dL',    '120–160'],
    ['Hematocrit', data.hct, '%',        '37–47'],
    ['WBC',        data.wbc, '×10³/µL', '5–10'],
    ['RBC',        data.rbc, '×10⁶/µL', '4.5–5.5'],
    ['Platelets',  data.plt, '×10³/µL', '150–400'],
  ]
  const diff = [
    ['Neutrophils',  data.neut, '50–70%'],
    ['Lymphocytes',  data.lymp, '20–40%'],
    ['Monocytes',    data.mono, '2–8%'],
    ['Eosinophils',  data.eos,  '1–4%'],
    ['Basophils',    data.baso, '0–1%'],
  ]
  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <SubHead label="Complete Blood Count" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>
              <th style={TH}>Test</th><th style={TH}>Result</th>
              <th style={TH}>Unit</th><th style={TH}>Normal</th>
            </tr></thead>
            <tbody>
              {main.map(([lbl, val, unit, norm]) => (
                <tr key={lbl as string}>
                  <td style={TDL}>{lbl as string}</td>
                  <td style={{ ...TDR, fontWeight: val ? 700 : 400, color: val ? '#111' : '#bbb' }}>
                    {(val as string) || '—'}
                  </td>
                  <td style={TDN}>{unit as string}</td>
                  <td style={TDN}>{norm as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ borderLeft: '2px solid #d1fae5' }}>
          <SubHead label="Differential Count" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr><th style={TH}>Cell Type</th><th style={TH}>%</th><th style={TH}>Normal</th></tr></thead>
            <tbody>
              {diff.map(([lbl, val, norm]) => (
                <tr key={lbl as string}>
                  <td style={TDL}>{lbl as string}</td>
                  <td style={{ ...TDR, fontWeight: val ? 700 : 400, color: val ? '#111' : '#bbb' }}>
                    {(val as string) || '—'}
                  </td>
                  <td style={TDN}>{norm as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {data.remarks && (
        <div style={{ borderTop: '1px solid #d1fae5', padding: '8px 14px', fontSize: 12, background: '#f9fef9' }}>
          <span style={{ fontWeight: 700, color: DARK }}>Remarks: </span>{data.remarks}
        </div>
      )}
    </Card>
  )
}

// ══ SEROLOGY ═════════════════════════════════════════════
function SerologyView({ data }: { data: any }) {
  const tests = [
    ['HbsAg Screening Test', 'hbsAg'],
    ['Dengue NS1 Ag',         'ns1'],
    ['Dengue DUO IgG',        'igG'],
    ['Dengue DUO IgM',        'igM'],
    ['HIV 1/2 3.0 Antigen',   'hiv'],
    ['Syphilis',               'syphilis'],
  ]
  return (
    <Card>
      <SubHead label="Serology Results" />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
          <thead>
            <tr>
              {['Test Name', 'Test Kit', 'Lot No.', 'Exp. Date', 'Type of Test', 'Result'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tests.map(([lbl, key], i) => {
              const row = (data as any)[key as string] || {}
              return (
                <tr key={key as string} style={{ background: i % 2 === 0 ? '#fff' : '#f9fef9' }}>
                  <td style={{ ...TDL, fontSize: 11 }}>{lbl as string}</td>
                  {(['kit', 'lot', 'exp', 'type'] as const).map(f => (
                    <td key={f} style={{ ...TD, textAlign: 'center', fontSize: 11, color: row[f] ? '#374151' : '#bbb' }}>
                      {row[f] || '—'}
                    </td>
                  ))}
                  <td style={{ ...TD, textAlign: 'center' }}>
                    <ResultBadge value={row.result || ''} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {(data as any).remarks && (
        <div style={{ borderTop: '1px solid #d1fae5', padding: '8px 14px', fontSize: 12, background: '#f9fef9' }}>
          <span style={{ fontWeight: 700, color: DARK }}>Remarks: </span>{(data as any).remarks}
        </div>
      )}
    </Card>
  )
}

// ══ MAIN MODAL ════════════════════════════════════════════
const TEST_FLAGS: Record<string, string[]> = {
  'Clinical Chemistry': ['random_blood_sugar', 'fasting_blood_sugar', 'cholesterol', 'triglycerides', 'lipid_profile', 'blood_uric_acid'],
  'Urinalysis':         ['urinalysis'],
  'Fecalysis':          ['fecalysis'],
  'Hematology':         ['hgb_hct', 'cbc_with_platelet'],
  'Serology':           ['dengue_ns1', 'dengue_igg_igm', 'hbsag', 'pregnancy_test', 'abo_rh_blood_typing'],
}

const TAB_ICONS: Record<string, string> = {
  'Clinical Chemistry': '🧪',
  'Urinalysis':         '🔬',
  'Fecalysis':          '🧫',
  'Hematology':         '🩸',
  'Serology':           '💉',
}

export default function LabResultsFormView({ isOpen, onClose, request }: Props) {
  const [results,   setResults]   = useState<any>(null)
  const [loading,   setLoading]   = useState(false)
  const [activeTab, setActiveTab] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const requestedTabs = request
    ? Object.keys(TEST_FLAGS).filter(t => TEST_FLAGS[t].some(flag => request.tests?.[flag]))
    : Object.keys(TEST_FLAGS)
  const tabs = requestedTabs.length > 0 ? requestedTabs : Object.keys(TEST_FLAGS)

  useEffect(() => {
    if (!isOpen || !request?.id) return
    setLoading(true)
    setResults(null)
    fetchLabResults(request.id).then(res => {
      setResults({
        chemistry: {
          rbs: res.chemistry?.rbs || '', fbs: res.chemistry?.fbs || '',
          uric: res.chemistry?.blood_uric_acid || '',
          chol: res.chemistry?.cholesterol || '', trig: res.chemistry?.triglycerides || '',
          hdl: res.chemistry?.hdl || '', ldl: res.chemistry?.ldl || '',
          remarks: res.chemistry?.remarks || '',
          lastMeal: res.chemistry?.last_meal || '',
          timeEx: res.chemistry?.time_of_extraction || '',
        },
        urinalysis: {
          color: res.urinalysis?.color || '', consist: res.urinalysis?.consistency || '',
          spg: res.urinalysis?.specific_gravity || '', ph: res.urinalysis?.ph_reaction || '',
          protein: res.urinalysis?.protein || '', sugar: res.urinalysis?.sugar || '',
          wbc: res.urinalysis?.wbc_pus_cell || '', rbc: res.urinalysis?.rbc || '',
          epi: res.urinalysis?.epithelial_cell || '', amorph: res.urinalysis?.amorphous_subs || '',
          mucus: res.urinalysis?.mucus_thread || '', bacteria: res.urinalysis?.bacteria || '',
          others: res.urinalysis?.others || '',
        },
        fecalysis: {
          color: res.fecalysis?.color || '', consist: res.fecalysis?.consistency || '',
          wbc: res.fecalysis?.wbc_pus_cell || '', rbc: res.fecalysis?.rbc || '',
          parasite: res.fecalysis?.parasite || '', others: res.fecalysis?.others || '',
        },
        hematology: {
          hgb: res.hematology?.hgb || '', hct: res.hematology?.hct || '',
          wbc: res.hematology?.wbc || '', rbc: res.hematology?.rbc || '',
          plt: res.hematology?.platelet_count || '',
          neut: res.hematology?.neutrophils || '', lymp: res.hematology?.lymphocytes || '',
          mono: res.hematology?.monocytes || '', eos: res.hematology?.eosinophils || '',
          baso: res.hematology?.basophils || '', remarks: res.hematology?.remarks || '',
        },
        serology: (() => {
          const s: any = {}
          const keyMap: Record<string, string> = {
            'HbsAg Screening Test': 'hbsAg', 'DENGUE NS1 Ag': 'ns1',
            'DENGUE DUO IgG': 'igG', 'DENGUE DUO IgM': 'igM',
            'HIV 1/2 3.0 Antigen': 'hiv', 'SYPHILIS': 'syphilis',
          }
          ;(res.serology || []).forEach((r: any) => {
            const k = keyMap[r.test_name]
            if (k) s[k] = { kit: r.test_kit || '', lot: r.lot_number || '', exp: r.expiry_date || '', type: r.type_of_test || '', result: r.result || '' }
          })
          return s
        })(),
      })
      setActiveTab(tabs[0] || 'Clinical Chemistry')
      setLoading(false)
    })
  }, [isOpen, request])

  if (!isOpen) return null

  const reqDate = request?.request_date
    ? new Date(request.request_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const statusMap: Record<string, { bg: string; color: string; icon: string }> = {
    completed: { bg: '#dcfce7', color: '#166534', icon: '✓' },
    pending:   { bg: '#fef9c3', color: '#854d0e', icon: '⏳' },
    cancelled: { bg: '#fee2e2', color: '#991b1b', icon: '✕' },
  }
  const st = statusMap[request?.status || ''] || { bg: '#f1f5f9', color: '#475569', icon: '•' }

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #lab-print-area { display: block !important; position: static !important; padding: 24px !important; }
          .no-print { display: none !important; }
        }
        .tab-btn:hover { background: #f0fdf4 !important; color: #166534 !important; }
        .close-btn:hover { background: rgba(255,255,255,0.25) !important; }
        .action-btn:hover { opacity: 0.88; }
      `}</style>

      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(3,24,12,0.55)',
          backdropFilter: 'blur(2px)',
          zIndex: 1100,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '20px 16px', overflowY: 'auto',
        }}
        onClick={onClose}
      >
        <div
          id="lab-print-area"
          ref={printRef}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 16,
            width: '100%', maxWidth: 860,
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >

          {/* ══ HEADER ══════════════════════════════════════ */}
          <div style={{
            background: `linear-gradient(135deg, ${DARK} 0%, ${MID} 60%, ${G} 100%)`,
            padding: '20px 28px 16px',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#86efac', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
                SmartRHU · RHU Lopez, Quezon
              </div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>
                Laboratory Result
              </h1>
              <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 3 }}>
                Clinical Laboratory Services — Official Record
              </div>
            </div>
            <button
              className="close-btn no-print"
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.15)',
                border: 'none', color: '#fff', fontSize: 18,
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s', flexShrink: 0,
              }}
            >✕</button>
          </div>

          {/* ══ PATIENT INFO STRIP ══════════════════════════ */}
          <div style={{
            background: '#f0fdf4',
            borderBottom: `2px solid #bbf7d0`,
            padding: '14px 28px',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px 32px',
          }}>
            {([
              ['Patient Name', request?.name || '—'],
              ['Date Requested', reqDate],
              ['Status', null],
              ['Age', request?.age ? `${request.age} years old` : '—'],
              ['Sex', request?.gender || '—'],
              ['Address', request?.address || '—'],
            ] as [string, string | null][]).map(([lbl, val]) => (
              <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {lbl}
                </span>
                {lbl === 'Status' ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: st.bg, color: st.color,
                    borderRadius: 99, padding: '3px 12px',
                    fontSize: 11, fontWeight: 800,
                    width: 'fit-content',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    <span>{st.icon}</span>
                    {request?.status || '—'}
                  </span>
                ) : (
                  <span style={{
                    fontSize: 13, fontWeight: val !== '—' ? 600 : 400,
                    color: val !== '—' ? '#111827' : '#9ca3af',
                  }}>
                    {val}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ══ TABS ════════════════════════════════════════ */}
          <div
            className="no-print"
            style={{
              display: 'flex', gap: 4, padding: '12px 16px 0',
              background: '#fff', borderBottom: '2px solid #f0fdf4',
              overflowX: 'auto',
            }}
          >
            {tabs.map(t => {
              const isActive = activeTab === t
              return (
                <button
                  key={t}
                  className="tab-btn"
                  onClick={() => setActiveTab(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    border: 'none',
                    background: isActive ? '#f0fdf4' : 'transparent',
                    borderBottom: isActive ? `3px solid ${G}` : '3px solid transparent',
                    color: isActive ? DARK : '#94a3b8',
                    fontWeight: isActive ? 800 : 500,
                    fontSize: 12, padding: '8px 16px 10px',
                    cursor: 'pointer', borderRadius: '8px 8px 0 0',
                    transition: 'all .15s', fontFamily: 'inherit',
                    whiteSpace: 'nowrap', marginBottom: -2,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{TAB_ICONS[t]}</span>
                  {t}
                </button>
              )
            })}
          </div>

          {/* ══ CONTENT ═════════════════════════════════════ */}
          <div style={{ padding: '20px 24px 24px', background: '#fafafa', minHeight: 300 }}>

            {/* Tab title */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 22 }}>{TAB_ICONS[activeTab]}</span>
              <div>
                <h2 style={{
                  margin: 0, fontSize: 16, fontWeight: 800,
                  color: DARK, fontFamily: 'inherit',
                }}>
                  {activeTab}
                </h2>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                  Laboratory result report
                </div>
              </div>
              <div style={{ flex: 1 }} />
              {/* Print active tab hint */}
              <div className="no-print" style={{
                fontSize: 10, color: '#94a3b8',
                border: '1px solid #e2e8f0',
                borderRadius: 8, padding: '4px 10px',
              }}>
                🖨️ Use Print to save as PDF
              </div>
            </div>

            {loading ? (
              <div style={{
                textAlign: 'center', padding: '60px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 48, height: 48, border: `4px solid #bbf7d0`,
                  borderTopColor: G, borderRadius: '50%',
                  animation: 'spin .8s linear infinite',
                }} />
                <div style={{ color: '#6b7280', fontSize: 13 }}>Loading results…</div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : !results ? (
              <div style={{
                textAlign: 'center', padding: '60px 0',
                color: '#9ca3af', fontSize: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <div style={{ fontSize: 40 }}>📋</div>
                <div style={{ fontWeight: 600 }}>No results found</div>
                <div style={{ fontSize: 12 }}>Results have not been entered yet.</div>
              </div>
            ) : (
              <>
                {activeTab === 'Clinical Chemistry' && <ClinChemView  data={results.chemistry}  />}
                {activeTab === 'Urinalysis'         && <UrinalysisView data={results.urinalysis} />}
                {activeTab === 'Fecalysis'          && <FecalysisView  data={results.fecalysis}  />}
                {activeTab === 'Hematology'         && <HematologyView data={results.hematology} />}
                {activeTab === 'Serology'           && <SerologyView   data={results.serology}   />}

                {/* Signature section */}
                <div style={{
                  marginTop: 28, paddingTop: 16,
                  borderTop: '1.5px dashed #d1fae5',
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24,
                }}>
                  {['Medical Technologist', 'Requesting Physician', 'Pathologist'].map(r => (
                    <div key={r} style={{ textAlign: 'center' }}>
                      <div style={{ borderBottom: `2px solid #bbf7d0`, height: 36, marginBottom: 6 }} />
                      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {r}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ══ FOOTER ══════════════════════════════════════ */}
          <div
            className="no-print"
            style={{
              borderTop: '1.5px solid #e2e8f0',
              padding: '12px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#fff',
            }}
          >
            <div style={{ fontSize: 10, color: '#94a3b8', maxWidth: 360, lineHeight: 1.5 }}>
              ⚠️ For clinical reference only. Results should be interpreted by a licensed physician.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="action-btn"
                onClick={onClose}
                style={{
                  padding: '9px 22px', borderRadius: 99,
                  border: '1.5px solid #d1d5db', background: '#fff',
                  color: '#374151', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .15s',
                }}
              >
                Close
              </button>
              <button
                className="action-btn"
                onClick={() => window.print()}
                style={{
                  padding: '9px 22px', borderRadius: 99,
                  border: 'none',
                  background: `linear-gradient(135deg, ${DARK}, ${G})`,
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 10px rgba(22,163,74,0.35)',
                  transition: 'opacity .15s',
                }}
              >
                🖨️ Print / Save PDF
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}