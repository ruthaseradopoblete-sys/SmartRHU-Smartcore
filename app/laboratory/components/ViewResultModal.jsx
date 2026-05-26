'use client'
import { useState, useEffect } from "react"
import { fetchLabResults } from "./labService"
import { supabase } from '@/lib/supabase'
import { PrintLabForms } from './LabFormPrint'

const GREEN = '#1a7a1a'
const TESTS = ['Fecalysis','Urinalysis','Hematology','Clinical Chemistry','Serology']

const MEDTECHS = [
  { name:'SHEKINAH GLARE O. DEGALA, RMT', lic:'Lic. No. 0102571' },
  { name:'MARIA SANTOS, RMT',             lic:'Lic. No. 0044556' },
]

const MHOS = [
  { name:'PAOLO GAYLORD S. VILLAFAÑE, MD, FPPS', role:'Municipal Health Officer', lic:'Lic. No. 89594' },
  { name:'ROSARIO B. DELA CRUZ, MD',             role:'Municipal Health Officer', lic:'Lic. No. 55123' },
  { name:'JOSE ANTONIO C. REYES, MD',            role:'Municipal Health Officer', lic:'Lic. No. 67890' },
]

export default function ViewResultModal({ isOpen, onClose, request }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selTest, setSelTest] = useState('Fecalysis')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  const [sigs, setSigs] = useState({
    medtech:    '',
    medtechLic: '',
    mho:        '',
    mhoLic:     '',
    mhoRole:    'Municipal Health Officer',
    reqPhys:    '', // normal-case physician name for print header
  })

  useEffect(() => {
    if (!request || !isOpen) return
    setSent(false)
    setSigs({ medtech:'', medtechLic:'', mho:'', mhoLic:'', mhoRole:'Municipal Health Officer', reqPhys:'' })
    setLoading(true)

    fetchLabResults(request.id).then(async res => {
      // Load signatures saved by LabFormModal
      const { data: sigData } = await supabase
        .from('lab_signatures')
        .select('*')
        .eq('request_id', request.id)
        .maybeSingle()

      if (sigData) {
        const mt       = sigData.med_technologist || ''
        const mhoNm    = sigData.req_physician    || ''  // MHO caps name
        const reqPhys  = sigData.pathologist      || ''  // normal-case physician name
        const foundMt  = MEDTECHS.find(m => m.name === mt)
        const foundMho = MHOS.find(m => m.name === mhoNm)
        setSigs({
          medtech:    mt,
          medtechLic: foundMt  ? foundMt.lic   : '',
          mho:        mhoNm,
          mhoLic:     foundMho ? foundMho.lic  : '',
          mhoRole:    foundMho ? foundMho.role : 'Municipal Health Officer',
          // Use saved reqPhys if available, else fall back to MHO display name
          reqPhys:    reqPhys || (foundMho ? (foundMho.display || mhoNm) : mhoNm),
        })
      }

      // Map results
      // ── Unified key mapping: DB column → exact key name LabFormPrint expects ──
      const mapped = {
        // FECALYSIS — print uses: color, consistency, wbcPusCell, redBloodCell, parasite, others
        fecalysis: res.fecalysis?.request_id ? {
          color:        res.fecalysis.color        || '',
          consistency:  res.fecalysis.consistency  || '',
          wbcPusCell:   res.fecalysis.wbc_pus_cell || '',
          redBloodCell: res.fecalysis.rbc          || '',
          parasite:     res.fecalysis.parasite     || '',
          others:       res.fecalysis.others       || '',
          remarks:      res.fecalysis.remarks      || '',
        } : {},

        // URINALYSIS — print uses: color, consistency, specificGravity, phReaction,
        //              protein, sugar, wbcPusCell, redBloodCell, epithelialCell,
        //              amorphousSubs, mucusThread, bacteria, others
        urinalysis: res.urinalysis?.request_id ? {
          color:          res.urinalysis.color            || '',
          consistency:    res.urinalysis.consistency      || '',
          specificGravity:res.urinalysis.specific_gravity || '',
          phReaction:     res.urinalysis.ph_reaction      || '',
          protein:        res.urinalysis.protein          || '',
          sugar:          res.urinalysis.sugar            || '',
          wbcPusCell:     res.urinalysis.wbc_pus_cell     || '',
          redBloodCell:   res.urinalysis.rbc              || '',
          epithelialCell: res.urinalysis.epithelial_cell  || '',
          amorphousSubs:  res.urinalysis.amorphous_subs   || '',
          mucusThread:    res.urinalysis.mucus_thread     || '',
          bacteria:       res.urinalysis.bacteria         || '',
          others:         res.urinalysis.others           || '',
          remarks:        res.urinalysis.remarks          || '',
        } : {},

        // HEMATOLOGY — print uses: hemoglobin, hematocrit, rbcCount, wbcCount,
        //              plateletCount, neutrophil, lymphocytes, monocytes,
        //              eosinophil, basophil, total, bloodType, others, remarks
        hematology: res.hematology?.request_id ? {
          hemoglobin:    res.hematology.hgb            || '',
          hematocrit:    res.hematology.hct            || '',
          rbcCount:      res.hematology.rbc            || '',
          wbcCount:      res.hematology.wbc            || '',
          plateletCount: res.hematology.platelet_count || '',
          neutrophil:    res.hematology.neutrophils    || '',
          lymphocytes:   res.hematology.lymphocytes    || '',
          monocytes:     res.hematology.monocytes      || '',
          eosinophil:    res.hematology.eosinophils    || '',
          basophil:      res.hematology.basophils      || '',
          total:         res.hematology.total          || '',
          bloodType:     res.hematology.blood_type     || '',
          others:        res.hematology.others         || '',
          remarks:       res.hematology.remarks        || '',
        } : {},

        // CHEMISTRY — print uses: rbs, fbs, uricAcid, totalCholesterol,
        //             triglycerides, hdl, ldl, lastMeal, timeOfExtraction, remarks
        chemistry: res.chemistry?.request_id ? {
          rbs:              res.chemistry.rbs                || '',
          fbs:              res.chemistry.fbs                || '',
          uricAcid:         res.chemistry.blood_uric_acid    || '',
          totalCholesterol: res.chemistry.cholesterol        || '',
          triglycerides:    res.chemistry.triglycerides      || '',
          hdl:              res.chemistry.hdl                || '',
          ldl:              res.chemistry.ldl                || '',
          lastMeal:         res.chemistry.last_meal          || '',
          timeOfExtraction: res.chemistry.time_of_extraction || '',
          remarks:          res.chemistry.remarks            || '',
        } : {},

        // SEROLOGY — keyed by test_name
        serology: {},
      }

      if (res.serology?.length > 0) {
        res.serology.forEach(r => {
          mapped.serology[r.test_name] = {
            kit:    r.test_kit     || '',
            lot:    r.lot_number   || '',
            exp:    r.expiry_date  || '',
            type:   r.type_of_test || '',
            result: r.result       || '',
          }
        })
      }

      setResults(mapped)

      const hasData = {
        Fecalysis:            !!(mapped.fecalysis?.color  || mapped.fecalysis?.wbc),
        Urinalysis:           !!(mapped.urinalysis?.color || mapped.urinalysis?.wbc),
        Hematology:           !!(mapped.hematology?.hgb),
        'Clinical Chemistry': !!(mapped.chemistry?.rbs   || mapped.chemistry?.fbs),
        Serology:             Object.keys(mapped.serology).length > 0,
      }
      setSelTest(TESTS.find(t => hasData[t]) || 'Fecalysis')
      setLoading(false)
    })
  }, [request, isOpen])

  if (!isOpen) return null

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const printContent = document.getElementById('lab-print-area')?.innerHTML || ''
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Lab Result — ${request?.name} — ${selTest}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9px; background: #fff; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000; padding: 3px 6px; font-size: 9px; }
    th { font-weight: 700; text-align: center; background: #fff; }
    img { max-width: 100%; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${printContent}</body>
</html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 400)
  }

  const handleSendToDoctor = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setSending(false)
  }

  const hasResults = (t) => {
    if (!results) return false
    if (t === 'Fecalysis')          return !!(results.fecalysis?.color  || results.fecalysis?.wbc  || results.fecalysis?.parasite)
    if (t === 'Urinalysis')         return !!(results.urinalysis?.color || results.urinalysis?.wbc)
    if (t === 'Hematology')         return !!(results.hematology?.hgb)
    if (t === 'Clinical Chemistry') return !!(results.chemistry?.rbs   || results.chemistry?.fbs)
    if (t === 'Serology')           return Object.keys(results?.serology || {}).length > 0
    return false
  }

  // Build the request object with saved reqPhysician for print header
  const requestWithPhysician = {
    ...request,
    reqPhysician: sigs.reqPhys || request?.reqPhysician || '',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'14px 16px', overflowY:'auto' }}>
      <div style={{ background:'#f5f7f5', width:'100%', maxWidth:900, borderRadius:10, marginTop:6, marginBottom:6, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', fontFamily:"'Segoe UI',Tahoma,sans-serif", overflow:'hidden' }}>

        {/* Title bar */}
        <div style={{ background:GREEN, padding:'10px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:14 }}>Patient Laboratory Record</div>
            <div style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>{request?.name} · {request?.request_date}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint}
              style={{ background:'#fff', color:GREEN, border:'none', borderRadius:6, padding:'6px 16px', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              🖨 Print
            </button>
            <button onClick={handleSendToDoctor} disabled={sending || sent}
              style={{ background:sent?'#dcfce7':'#065f46', color:sent?GREEN:'#fff', border:'none', borderRadius:6, padding:'6px 16px', fontWeight:700, fontSize:12, cursor:sent?'default':'pointer', opacity:sending?0.7:1, transition:'all 0.2s' }}>
              {sent ? '✓ Sent to Doctor' : sending ? 'Sending…' : 'Send to Doctor'}
            </button>
            <button onClick={onClose}
              style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div style={{ background: request?.status==='completed' ? '#dcfce7' : '#fef3c7', padding:'6px 18px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #e5e7eb' }}>
          <span style={{ fontSize:11, fontWeight:700, color: request?.status==='completed'?GREEN:'#92400e', textTransform:'uppercase' }}>
            {request?.status==='completed' ? '✅ Completed' : '⏳ Pending'}
          </span>
          <span style={{ fontSize:11, color:'#6b7280' }}>Request ID: {request?.id}</span>
        </div>

        {/* Test tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid #e5e7eb', overflowX:'auto', background:'#fff' }}>
          {TESTS.map(t => (
            <div key={t} onClick={() => setSelTest(t)} style={{
              padding:'9px 16px', fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
              fontWeight: selTest===t ? 700 : 400,
              color: selTest===t ? GREEN : '#6b7280',
              borderBottom: selTest===t ? `3px solid ${GREEN}` : '3px solid transparent',
              display:'flex', alignItems:'center', gap:5, transition:'all 0.12s',
              background: selTest===t ? '#f0fdf4' : 'transparent',
            }}>
              {t}
              {hasResults(t) && <span style={{ width:7, height:7, borderRadius:'50%', background:GREEN, display:'inline-block' }}/>}
            </div>
          ))}
        </div>

        {/* Form body */}
        <div style={{ background:'#f5f7f5', padding:'14px 18px' }}>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'#aaa', fontSize:13 }}>Loading results…</div>
          ) : (
            <div id="lab-print-area" style={{ background:'#fff', borderRadius:8, boxShadow:'0 2px 8px rgba(0,0,0,0.08)', overflow:'hidden' }}>
              <PrintLabForms
                request={requestWithPhysician}
                results={results || {}}
                selTest={selTest}
                medtech={sigs.medtech}
                medtechLic={sigs.medtechLic}
                mho={sigs.mho}
                mhoLic={sigs.mhoLic}
                mhoRole={sigs.mhoRole}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}