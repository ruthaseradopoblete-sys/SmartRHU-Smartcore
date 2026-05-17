'use client'
import { useState, useEffect, useRef } from "react"
import { fetchLabResults } from "./labService"
import { supabase } from '@/lib/supabase'

const GREEN = '#1a7a1a'

/* Read-only field display */
const RO = ({ label, value, minW = 80, width }) => (
  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
    <label style={{ fontSize:12, fontWeight:500, minWidth:minW, flexShrink:0, color:'#555' }}>{label}:</label>
    <div style={{ width:width||undefined, flex:width?undefined:1, border:'1px solid #d1d5db', borderRadius:2, padding:'3px 8px', fontSize:12, background:'#fafafa', color:'#111', minHeight:22 }}>
      {value || <span style={{ color:'#ccc', fontSize:11 }}>—</span>}
    </div>
  </div>
)

/* Read-only Fecalysis */
function ROFecalysis({ data }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 70px', gap:'4px 10px', marginBottom:6 }}>
        <div style={{ fontWeight:700, fontSize:11, color:'#444' }}>MACROSCOPIC EXAM</div>
        <div style={{ fontWeight:700, fontSize:11, color:'#444' }}>MACROSCOPIC EXAM</div>
        <div style={{ fontWeight:700, fontSize:10, color:'#888', textAlign:'center' }}>Normal Value</div>
      </div>
      {[
        [['Color','color'],['WBC/PUS Cell','wbc'],'0-2/HPF'],
        [['Consistency','consist'],['Red Blood Cell','rbc'],'0-2/HPF'],
      ].map(([L,R,nv],i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 70px', gap:'4px 10px', alignItems:'center', marginBottom:5 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <label style={{ fontSize:11, minWidth:72, flexShrink:0 }}>{L[0]}:</label>
            <div style={{ flex:1, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 6px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data[L[1]]||''}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <label style={{ fontSize:11, minWidth:90, flexShrink:0 }}>{R[0]}:</label>
            <div style={{ flex:1, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 6px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data[R[1]]||''}</div>
          </div>
          <div style={{ fontSize:10, color:'#777', textAlign:'center' }}>{nv}</div>
        </div>
      ))}
      <div style={{ height:1, background:'#eee', margin:'8px 0' }}/>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
        <label style={{ fontSize:11, minWidth:60, fontWeight:600 }}>PARASITE:</label>
        <div style={{ flex:1, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 6px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data.parasite||''}</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <label style={{ fontSize:11, minWidth:60 }}>Others:</label>
        <div style={{ width:200, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 6px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data.others||''}</div>
      </div>
    </div>
  )
}

/* Read-only Urinalysis */
function ROUrinalysis({ data }) {
  const rows=[
    [['Color','color'],null,['WBC/PUS Cell','wbc'],'0-2/HPF'],
    [['Consistency','consist'],null,['Red Blood Cell','rbc'],'0-2/HPF'],
    [['Specific Gravity','spg'],null,['Epithelial Cell','epi'],null],
    [['pH Reaction','ph'],null,['Amorphous Subs.','amorph'],null],
    [['Protein','protein'],'Negative',['Mucus Thread','mucus'],null],
    [['Sugar','sugar'],'Negative',['Bacteria','bacteria'],null],
  ]
  const F = (k) => <div style={{ flex:1, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 5px', fontSize:11, background:'#fafafa', minHeight:22, minWidth:0 }}>{data[k]||''}</div>
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 55px 1fr 55px', gap:4, marginBottom:5 }}>
        <div style={{ fontWeight:700, fontSize:11 }}>MACROSCOPIC EXAM</div>
        <div style={{ fontWeight:700, fontSize:10, color:'#888', textAlign:'center' }}>Normal Value</div>
        <div style={{ fontWeight:700, fontSize:11 }}>MACROSCOPIC EXAM</div>
        <div style={{ fontWeight:700, fontSize:10, color:'#888', textAlign:'center' }}>Normal Value</div>
      </div>
      {rows.map(([l,ln,r,rn],i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 55px 1fr 55px', gap:4, alignItems:'center', marginBottom:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}><label style={{ fontSize:11, minWidth:88, flexShrink:0 }}>{l[0]}:</label>{F(l[1])}</div>
          <div style={{ fontSize:10, color:'#777', textAlign:'center' }}>{ln||''}</div>
          {r ? <div style={{ display:'flex', alignItems:'center', gap:4 }}><label style={{ fontSize:11, minWidth:92, flexShrink:0 }}>{r[0]}:</label>{F(r[1])}</div> : <div/>}
          <div style={{ fontSize:10, color:'#777', textAlign:'center' }}>{rn||''}</div>
        </div>
      ))}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
        <label style={{ fontSize:11, minWidth:48 }}>Others:</label>
        <div style={{ flex:1, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 6px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data.others||''}</div>
      </div>
    </div>
  )
}

/* Read-only Hematology */
function ROHematology({ data }) {
  const fields=[['Hemoglobin','hgb','g/dL','120–160'],['Hematocrit','hct','%','37–47'],['WBC','wbc','×10³/µL','5–10'],['RBC','rbc','×10⁶/µL','4.5–5.5'],['Platelets','plt','×10³/µL','150–400'],['MCV','mcv','fL','80–100'],['MCH','mch','pg','27–33'],['MCHC','mchc','g/dL','32–36']]
  const diff=[['Neutrophils','neut','50–70%'],['Lymphocytes','lymp','20–40%'],['Monocytes','mono','2–8%'],['Eosinophils','eos','1–4%'],['Basophils','baso','0–1%']]
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 20px', marginBottom:10 }}>
        {fields.map(([lbl,k,unit,nv]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <label style={{ fontSize:11, minWidth:82, flexShrink:0 }}>{lbl}:</label>
            <div style={{ width:68, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 5px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data[k]||''}</div>
            <span style={{ fontSize:9, color:'#888' }}>{unit}</span>
            <span style={{ fontSize:9, color:'#bbb', marginLeft:2 }}>{nv}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop:'1px solid #eee', paddingTop:7, marginBottom:7 }}>
        <div style={{ fontWeight:700, fontSize:11, marginBottom:5 }}>Differential Count</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:5 }}>
          {diff.map(([lbl,k,nv]) => (
            <div key={k} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, fontWeight:600, marginBottom:2 }}>{lbl}</div>
              <div style={{ border:'1px solid #d1d5db', borderRadius:2, padding:'2px 4px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data[k]||''}</div>
              <div style={{ fontSize:9, color:'#bbb', marginTop:1 }}>{nv}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <label style={{ fontSize:11, minWidth:58 }}>Remarks:</label>
        <div style={{ flex:1, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 6px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data.remarks||''}</div>
      </div>
    </div>
  )
}

/* Read-only Clinical Chemistry */
function ROClinChem({ data }) {
  const F=(k)=> <div style={{ width:68, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 5px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data[k]||''}</div>
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px', marginBottom:8 }}>
        <div>
          <div style={{ display:'flex', gap:4, marginBottom:4, fontSize:10, fontWeight:700, color:'#666' }}>
            <span style={{ minWidth:65 }}>TEST</span><span style={{ flex:1 }}>RESULT</span><span>Normal Values</span>
          </div>
          {[['RBS','rbs','mg/dL','<160'],['FBS','fbs','mg/dL','70-105'],['URIC ACID','uric','mg/dL','M:3.5-7.7\nF:2.6-6']].map(([lbl,k,u,nv]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:5 }}>
              <label style={{ fontSize:11, minWidth:65, flexShrink:0 }}>{lbl}</label>{F(k)}
              <span style={{ fontSize:10, color:'#888' }}>{u}</span><span style={{ fontSize:9, color:'#bbb', whiteSpace:'pre' }}>{nv}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ display:'flex', gap:4, marginBottom:4, fontSize:10, fontWeight:700, color:'#666' }}>
            <span style={{ minWidth:92 }}>TEST</span><span style={{ flex:1 }}>RESULT</span><span>Normal Value</span>
          </div>
          {[['Total Cholesterol','chol','mg/dL','<200'],['Triglycerides','trig','mg/dL','<150'],['HDL','hdl','mg/dL','≥60'],['LDL','ldl','mg/dL','<130']].map(([lbl,k,u,nv]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:5 }}>
              <label style={{ fontSize:11, minWidth:92, flexShrink:0 }}>{lbl}</label>{F(k)}
              <span style={{ fontSize:10, color:'#888' }}>{u}</span><span style={{ fontSize:9, color:'#bbb' }}>{nv}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ borderTop:'1px solid #eee', paddingTop:7 }}>
        {[['Remarks','remarks'],['Last Meal','lastMeal'],['Time of Extraction','timeEx']].map(([lbl,k]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
            <label style={{ fontSize:11, minWidth:118, flexShrink:0 }}>{lbl}:</label>
            <div style={{ flex:1, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 6px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data[k]||''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Read-only Serology */
function ROSerology({ data }) {
  const rows=[['HbsAg Screening Test','hbsag'],['DENGUE NS1 Ag','dengue_ns1'],['DENGUE DUO IgG/IgM','dengue_igg_igm'],['HIV 1/2 3.0 Antigen','hiv'],['SYPHILIS','syphilis']]
  return (
    <div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
        <thead>
          <tr style={{ background:'#f5f5f5' }}>
            {['TEST','TEST KIT','LOT NO.','EXP DATE','TYPE OF TEST','RESULT'].map(h => (
              <th key={h} style={{ padding:'5px 7px', border:'1px solid #d1d5db', fontWeight:700, textAlign:'center', fontSize:10 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([lbl,key]) => {
            const r = data[key] || {}
            return (
              <tr key={key}>
                <td style={{ padding:'4px 7px', border:'1px solid #d1d5db', fontWeight:600, whiteSpace:'nowrap', fontSize:10 }}>{lbl}</td>
                {['kit','lot','exp','type','result'].map(f => (
                  <td key={f} style={{ padding:'4px 7px', border:'1px solid #d1d5db', fontSize:11, background:'#fafafa' }}>{r[f]||''}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {data.remarks && (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
          <label style={{ fontSize:11, minWidth:55 }}>Remarks:</label>
          <div style={{ flex:1, border:'1px solid #d1d5db', borderRadius:2, padding:'2px 6px', fontSize:11, background:'#fafafa', minHeight:22 }}>{data.remarks}</div>
        </div>
      )}
    </div>
  )
}

/*
  Props:
  - isOpen    boolean
  - onClose   () => void
  - request   object from PatientLabRecords (same as labService shape)
*/
export default function ViewResultModal({ isOpen, onClose, request }) {
  const [results,  setResults]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [selTest,  setSelTest]  = useState('Fecalysis')
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [sigs,     setSigs]     = useState({ 'Medical Technologist':'', 'Req. Physician':'', 'Pathologist':'' })
  const printRef = useRef()

  const TESTS = ['Fecalysis','Urinalysis','Hematology','Clinical Chemistry','Serology']

  useEffect(() => {
    if (!request || !isOpen) return
    setSent(false)
    setSigs({ 'Medical Technologist':'', 'Req. Physician':'', 'Pathologist':'' })
    setLoading(true)
    fetchLabResults(request.id).then(async res => {
      // Load signatures saved by the medtech in LabFormModal
      const { data: sigData } = await supabase
        .from('lab_signatures')
        .select('*')
        .eq('request_id', request.id)
        .maybeSingle()
      if (sigData) {
        setSigs({
          'Medical Technologist': sigData.med_technologist || '',
          'Req. Physician':       sigData.req_physician    || '',
          'Pathologist':          sigData.pathologist      || '',
        })
      }
      // Map DB → form field keys (same as LabFormModal)
      const mapped = {
        fecalysis: res.fecalysis?.request_id ? {
          color:res.fecalysis.color||'', consist:res.fecalysis.consistency||'',
          wbc:res.fecalysis.wbc_pus_cell||'', rbc:res.fecalysis.rbc||'',
          parasite:res.fecalysis.parasite||'', others:res.fecalysis.others||'', remarks:res.fecalysis.remarks||''
        } : {},
        urinalysis: res.urinalysis?.request_id ? {
          color:res.urinalysis.color||'', consist:res.urinalysis.consistency||'',
          spg:res.urinalysis.specific_gravity||'', ph:res.urinalysis.ph_reaction||'',
          protein:res.urinalysis.protein||'', sugar:res.urinalysis.sugar||'',
          wbc:res.urinalysis.wbc_pus_cell||'', rbc:res.urinalysis.rbc||'',
          epi:res.urinalysis.epithelial_cell||'', amorph:res.urinalysis.amorphous_subs||'',
          mucus:res.urinalysis.mucus_thread||'', bacteria:res.urinalysis.bacteria||'',
          others:res.urinalysis.others||'', remarks:res.urinalysis.remarks||''
        } : {},
        hematology: res.hematology?.request_id ? {
          hgb:res.hematology.hgb||'', hct:res.hematology.hct||'',
          wbc:res.hematology.wbc||'', rbc:res.hematology.rbc||'',
          plt:res.hematology.platelet_count||'',
          neut:res.hematology.neutrophils||'', lymp:res.hematology.lymphocytes||'',
          mono:res.hematology.monocytes||'', eos:res.hematology.eosinophils||'',
          baso:res.hematology.basophils||'', remarks:res.hematology.remarks||''
        } : {},
        chemistry: res.chemistry?.request_id ? {
          rbs:res.chemistry.rbs||'', fbs:res.chemistry.fbs||'',
          chol:res.chemistry.cholesterol||'', trig:res.chemistry.triglycerides||'',
          lipid:res.chemistry.lipid_profile||'',
          hdl:res.chemistry.hdl||'', ldl:res.chemistry.ldl||'',
          uric:res.chemistry.blood_uric_acid||'', lastMeal:res.chemistry.last_meal||'',
          timeEx:res.chemistry.time_of_extraction||'', remarks:res.chemistry.remarks||''
        } : {},
        serology: {},
      }
      // Serology: array → keyed object
      if (res.serology?.length > 0) {
        res.serology.forEach(r => {
          mapped.serology[r.test_name] = { kit:r.test_kit||'', lot:r.lot_number||'', exp:r.expiry_date||'', type:r.type_of_test||'', result:r.result||'' }
        })
      }
      setResults(mapped)

      // Auto-select first test that has data
      const hasData = {
        Fecalysis:           mapped.fecalysis?.color || mapped.fecalysis?.wbc,
        Urinalysis:          mapped.urinalysis?.color || mapped.urinalysis?.wbc,
        Hematology:          mapped.hematology?.hgb,
        'Clinical Chemistry':mapped.chemistry?.rbs || mapped.chemistry?.fbs,
        Serology:            Object.keys(mapped.serology).length > 0,
      }
      const first = TESTS.find(t => hasData[t]) || 'Fecalysis'
      setSelTest(first)
      setLoading(false)
    })
  }, [request, isOpen])

  if (!isOpen) return null

  const handlePrint = () => {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Lab Result — ${request?.name}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 7px;font-size:11px}th{background:#f0faf0;font-weight:700;text-align:center}</style></head><body>
    <div style="text-align:center;border-bottom:3px solid #1a7a1a;padding-bottom:10px;margin-bottom:16px">
    <div style="font-weight:900;font-size:18px;color:#1a7a1a">MUNICIPAL HEALTH OFFICE</div>
    <div style="font-size:13px;color:#555">Lopez, Quezon — RHU Laboratory Result</div>
    <div style="font-size:10px;color:#999">Printed: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</div>
    </div>
    <div style="margin-bottom:10px;font-size:12px">
    <strong>Patient:</strong> ${request?.name||'—'} &nbsp;|&nbsp;
    <strong>Age:</strong> ${request?.age||'—'} &nbsp;|&nbsp;
    <strong>Sex:</strong> ${request?.gender||'—'} &nbsp;|&nbsp;
    <strong>Date:</strong> ${request?.request_date||'—'}
    </div>
    ${printRef.current?.innerHTML||''}
    </body></html>`)
    w.document.close(); w.print()
  }

  // Simulate "Send to Doctor" — in real app this would call an API or update a DB flag
  const handleSendToDoctor = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 800)) // simulated delay
    setSent(true)
    setSending(false)
  }

  // Tests that have saved results
  const hasResults = (t) => {
    if (!results) return false
    if (t === 'Fecalysis')          return !!(results.fecalysis?.color || results.fecalysis?.wbc || results.fecalysis?.parasite)
    if (t === 'Urinalysis')         return !!(results.urinalysis?.color || results.urinalysis?.wbc)
    if (t === 'Hematology')         return !!(results.hematology?.hgb)
    if (t === 'Clinical Chemistry') return !!(results.chemistry?.rbs || results.chemistry?.fbs)
    if (t === 'Serology')           return Object.keys(results.serology||{}).length > 0
    return false
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
              {sent ? '✓ Sent to Doctor' : sending ? 'Sending…' : '📤 Send to Doctor'}
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

        {/* Body */}
        <div style={{ padding:'14px 18px' }}>
          {/* Lab Department section — Image 2 style */}
          <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', background:'#fff', marginBottom:14 }}>
            <div style={{ background:'#fff', padding:'8px 16px', fontWeight:700, fontSize:13, textAlign:'center', borderBottom:`2px solid ${GREEN}` }}>
              Laboratory Department
            </div>
            <div style={{ padding:'10px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px 20px', borderBottom:`2px solid ${GREEN}` }}>
              <RO label="Name"           value={request?.name}         minW={90}/>
              <RO label="Date"           value={request?.request_date} minW={40} width="140px"/>
              <RO label="Address"        value={request?.address}      minW={90}/>
              <RO label="Age"            value={request?.age}          minW={40} width="60px"/>
              <RO label="Req. Physician" value=""                      minW={100}/>
              <RO label="Sex"            value={request?.gender}       minW={40} width="70px"/>
            </div>

            {/* Test tabs */}
            <div style={{ display:'flex', gap:0, borderBottom:'1px solid #e5e7eb', overflowX:'auto' }}>
              {TESTS.map(t => (
                <div key={t} onClick={() => setSelTest(t)} style={{
                  padding:'8px 14px', fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
                  fontWeight: selTest===t ? 700 : 400,
                  color: selTest===t ? GREEN : '#6b7280',
                  borderBottom: selTest===t ? `3px solid ${GREEN}` : '3px solid transparent',
                  background: 'transparent',
                  display:'flex', alignItems:'center', gap:5,
                  transition:'all 0.12s',
                }}>
                  {t}
                  {hasResults(t) && <span style={{ width:7, height:7, borderRadius:'50%', background:GREEN, display:'inline-block' }}/>}
                </div>
              ))}
            </div>

            {/* Selected form name */}
            <div style={{ padding:'6px 16px', fontWeight:700, fontSize:13, textAlign:'center', borderBottom:'1px solid #f0f0f0', color:'#222' }}>
              {selTest}
            </div>

            {/* Read-only form body */}
            {loading
              ? <div style={{ padding:28, textAlign:'center', color:'#aaa', fontSize:12 }}>Loading results…</div>
              : <div ref={printRef} style={{ padding:'12px 16px' }}>
                  {selTest==='Fecalysis'          && <ROFecalysis  data={results?.fecalysis  || {}}/>}
                  {selTest==='Urinalysis'          && <ROUrinalysis data={results?.urinalysis || {}}/>}
                  {selTest==='Hematology'          && <ROHematology data={results?.hematology || {}}/>}
                  {selTest==='Clinical Chemistry'  && <ROClinChem   data={results?.chemistry  || {}}/>}
                  {selTest==='Serology'            && <ROSerology   data={results?.serology   || {}}/>}

                  {/* Signature footer — reads from lab_signatures saved by medtech */}
                  <div style={{ marginTop:20, paddingTop:12, borderTop:'1px solid #e5e7eb', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, textAlign:'center' }}>
                    {['Medical Technologist','Req. Physician','Pathologist'].map(role => (
                      <div key={role}>
                        <div style={{ borderBottom:'1px solid #555', minHeight:32, marginBottom:5, display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:3 }}>
                          {sigs[role]
                            ? <span style={{ fontSize:11, fontWeight:700, color:'#1a2e20' }}>{sigs[role]}</span>
                            : <span style={{ fontSize:10, color:'#ccc', fontStyle:'italic' }}>—</span>}
                        </div>
                        <div style={{ fontSize:11, color:'#555', fontWeight:600 }}>{role}</div>
                      </div>
                    ))}
                  </div>
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}