'use client'
import { useState, useEffect, useRef } from "react"
import { FecalysisForm, UrinalysisForm, HematologyForm, ClinChemForm, SerologyForm, LF } from "./LabForms"
import {
  fetchLabResults,
  saveFecalysis, saveUrinalysis, saveHematology,
  saveChemistry, saveSerology, markRequestCompleted,
} from "./labService"
import { supabase } from "@/lib/supabase"

const GREEN = '#1a7a1a'
const TESTS  = ['Fecalysis','Urinalysis','Hematology','Clinical Chemistry','Serology']

const TEST_FLAGS = {
  Fecalysis:            ['fecalysis'],
  Urinalysis:           ['urinalysis'],
  Hematology:           ['hgb_hct','cbc_with_platelet'],
  'Clinical Chemistry': ['random_blood_sugar','fasting_blood_sugar','cholesterol','triglycerides','lipid_profile','blood_uric_acid'],
  Serology:             ['dengue_ns1','dengue_igg_igm','hbsag','pregnancy_test','abo_rh_blood_typing'],
}

/*
  Props:
  - isOpen       boolean
  - onClose      () => void
  - request      object from labService (id = request_id, tests, name, age, gender, address, status, request_date)
  - onSaved      () => void  — refresh parent after save
  - currentUser  { user_id }
*/
export default function LabFormModal({ isOpen, onClose, request, onSaved, currentUser }) {
  const [selTest,    setSelTest]    = useState('Fecalysis')
  const [showTestDD, setShowTestDD] = useState(false)
  const [showPtDD,   setShowPtDD]   = useState(false)
  const [confirm,    setConfirm]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saved' | 'sent' | 'err'
  const [loading,    setLoading]    = useState(false)

  const [labInfo, setLabInfo] = useState({ name:'', date:'', address:'', age:'', reqPhys:'', sex:'' })
  const [pInfo,   setPInfo]   = useState({ name:'', age:'', gender:'', civil:'', address:'' })
  const [fec,  setFec]  = useState({})
  const [uri,  setUri]  = useState({})
  const [hem,  setHem]  = useState({})
  const [chem, setChem] = useState({})
  const [ser,  setSer]  = useState({})

  const ptDDRef   = useRef()
  const testDDRef = useRef()

  const requestedTests = TESTS.filter(t => TEST_FLAGS[t]?.some(flag => request?.tests?.[flag]))
  const availableTests = requestedTests.length > 0 ? requestedTests : TESTS

  /* Load patient + existing results */
  useEffect(() => {
    if (!request || !isOpen) return
    setPInfo({ name:request.name||'', age:request.age||'', gender:request.gender||'', civil:'', address:request.address||'' })
    setLabInfo(p => ({ ...p, name:request.name||'', age:request.age||'', sex:request.gender||'', address:request.address||'', date:new Date().toISOString().split('T')[0] }))
    setSelTest(requestedTests[0] || 'Fecalysis')
    setSaveStatus(null)

    if (request.id) {
      setLoading(true)
      fetchLabResults(request.id).then(res => {
        if (res.fecalysis?.request_id)  setFec({ color:res.fecalysis.color||'', consist:res.fecalysis.consistency||'', wbc:res.fecalysis.wbc_pus_cell||'', rbc:res.fecalysis.rbc||'', parasite:res.fecalysis.parasite||'', others:res.fecalysis.others||'', remarks:res.fecalysis.remarks||'' })
        if (res.urinalysis?.request_id) setUri({ color:res.urinalysis.color||'', consist:res.urinalysis.consistency||'', spg:res.urinalysis.specific_gravity||'', ph:res.urinalysis.ph_reaction||'', protein:res.urinalysis.protein||'', sugar:res.urinalysis.sugar||'', wbc:res.urinalysis.wbc_pus_cell||'', rbc:res.urinalysis.rbc||'', epi:res.urinalysis.epithelial_cell||'', amorph:res.urinalysis.amorphous_subs||'', mucus:res.urinalysis.mucus_thread||'', bacteria:res.urinalysis.bacteria||'', others:res.urinalysis.others||'', remarks:res.urinalysis.remarks||'' })
        if (res.hematology?.request_id) setHem({ hgb:res.hematology.hgb||'', hct:res.hematology.hct||'', wbc:res.hematology.wbc||'', rbc:res.hematology.rbc||'', plt:res.hematology.platelet_count||'', neut:res.hematology.neutrophils||'', lymp:res.hematology.lymphocytes||'', mono:res.hematology.monocytes||'', eos:res.hematology.eosinophils||'', baso:res.hematology.basophils||'', remarks:res.hematology.remarks||'' })
        if (res.chemistry?.request_id)  setChem({ rbs:res.chemistry.rbs||'', fbs:res.chemistry.fbs||'', chol:res.chemistry.cholesterol||'', trig:res.chemistry.triglycerides||'', hdl:res.chemistry.hdl||'', ldl:res.chemistry.ldl||'', uric:res.chemistry.blood_uric_acid||'', lastMeal:res.chemistry.last_meal||'', timeEx:res.chemistry.time_of_extraction||'', remarks:res.chemistry.remarks||'' })
        if (res.serology?.length > 0) {
          const s = {}
          res.serology.forEach(r => { s[r.test_name] = { kit:r.test_kit||'', lot:r.lot_number||'', exp:r.expiry_date||'', type:r.type_of_test||'', result:r.result||'' } })
          setSer(s)
        }
        setLoading(false)
      })
    }
  }, [request, isOpen])

  /* Close dropdowns on outside click */
  useEffect(() => {
    const h = e => {
      if (ptDDRef.current   && !ptDDRef.current.contains(e.target))   setShowPtDD(false)
      if (testDDRef.current && !testDDRef.current.contains(e.target)) setShowTestDD(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!isOpen) return null

  /* Save current form to DB */
  const saveCurrentTest = async () => {
    if (!request?.id) return false
    const uid = currentUser?.user_id || null
    if (selTest === 'Fecalysis')          return saveFecalysis(request.id, fec,  uid)
    if (selTest === 'Urinalysis')          return saveUrinalysis(request.id, uri,  uid)
    if (selTest === 'Hematology')          return saveHematology(request.id, hem,  uid)
    if (selTest === 'Clinical Chemistry')  return saveChemistry( request.id, chem, uid)
    if (selTest === 'Serology') {
      const rows = Object.entries(ser).map(([test_name,v]) => ({ test_name, ...v }))
      return saveSerology(request.id, rows, uid)
    }
    return false
  }

  /* Notify doctor via Supabase — insert into a notifications table or update a flag */
  const notifyDoctor = async () => {
    // Option A: update laboratory_requests with a "result_ready" flag (simple)
    await supabase
      .from('laboratory_requests')
      .update({ status:'completed', updated_at: new Date().toISOString() })
      .eq('id', request.id)

    // Option B: if you have a notifications table for the doctor, insert here:
    // await supabase.from('notifications').insert({
    //   recipient_role: 'doctor',
    //   type: 'lab_result_ready',
    //   reference_id: request.id,
    //   patient_name: request.name,
    //   message: `Lab result for ${request.name} (${selTest}) is ready.`,
    // })
  }

  /* ── Save only (no send) ── */
  const handleSaveOnly = async () => {
    setSaving(true); setSaveStatus(null)
    const ok = await saveCurrentTest()
    setSaveStatus(ok ? 'saved' : 'err')
    setSaving(false)
    if (ok) onSaved?.()
  }

  /* ── Save + mark complete + notify doctor ── */
  const handleSaveAndSend = async () => {
    setSaving(true); setSaveStatus(null)
    const ok = await saveCurrentTest()
    if (!ok) { setSaveStatus('err'); setSaving(false); return }
    await notifyDoctor()
    setSaveStatus('sent')
    setSaving(false)
    onSaved?.()
    // Auto-close after 1.2s so user sees the "Sent!" state
    setTimeout(onClose, 1200)
  }

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'14px 16px', overflowY:'auto' }}>
        <div style={{ background:'#f5f7f5', width:'100%', maxWidth:1000, borderRadius:10, marginTop:6, marginBottom:6, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', fontFamily:"'Segoe UI',Tahoma,sans-serif" }}>

          {/* ── Top row: dropdowns + status + close ── */}
          <div style={{ display:'flex', gap:10, padding:'12px 16px 8px', background:'#f5f7f5', borderRadius:'10px 10px 0 0', alignItems:'center' }}>

            {/* Patient dropdown */}
            <div ref={ptDDRef} style={{ position:'relative', flex:1 }}>
              <div onClick={() => { setShowPtDD(p=>!p); setShowTestDD(false) }}
                style={{ border:'1px solid #d1d5db', borderRadius:6, padding:'7px 12px', fontSize:12, background:'#fff', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                <span style={{ color:'#555', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{request?.name||'Other Patient'}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {showPtDD && request && (
                <div style={{ position:'absolute', top:'110%', left:0, right:0, background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, zIndex:20, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', padding:'4px 0' }}>
                  <div style={{ padding:'8px 14px', fontSize:12, color:'#111', fontWeight:600 }}>{request.name}</div>
                  <div style={{ padding:'2px 14px 8px', fontSize:11, color:'#6b7280' }}>{request.age} yrs · {request.gender} · {request.address}</div>
                </div>
              )}
            </div>

            {/* Test dropdown */}
            <div ref={testDDRef} style={{ position:'relative', flex:1 }}>
              <div onClick={() => { setShowTestDD(p=>!p); setShowPtDD(false) }}
                style={{ border:'1px solid #d1d5db', borderRadius:6, padding:'7px 12px', fontSize:12, background:'#fff', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                <span style={{ color:'#6b7280' }}>Laboratory Test</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {showTestDD && (
                <div style={{ position:'absolute', top:'110%', left:0, right:0, background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, zIndex:20, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', overflow:'hidden' }}>
                  {availableTests.map(t => (
                    <div key={t} onClick={() => { setSelTest(t); setShowTestDD(false) }}
                      style={{ padding:'9px 14px', fontSize:12, cursor:'pointer', color:selTest===t?GREEN:'#374151', fontWeight:selTest===t?700:400, background:selTest===t?'#f0fdf4':'transparent', borderBottom:'1px solid #f9fafb', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                      onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'}
                      onMouseLeave={e => e.currentTarget.style.background=selTest===t?'#f0fdf4':'transparent'}>
                      {t}
                      {requestedTests.includes(t) && <span style={{ fontSize:9, color:GREEN, fontWeight:700, background:'#dcfce7', padding:'1px 7px', borderRadius:10 }}>REQUESTED</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status badge */}
            {saveStatus && (
              <div style={{
                fontSize:11, fontWeight:700, whiteSpace:'nowrap', padding:'5px 12px', borderRadius:20,
                background: saveStatus==='sent'?'#dcfce7':saveStatus==='saved'?'#eff6ff':'#fee2e2',
                color:      saveStatus==='sent'?GREEN:saveStatus==='saved'?'#2563eb':'#dc2626',
              }}>
                {saveStatus==='sent'  ? '✓ Sent to Doctor!'  :
                 saveStatus==='saved' ? '✓ Saved'            : '✗ Error saving'}
              </div>
            )}

            <button onClick={() => setConfirm(true)}
              style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:6, padding:'7px 18px', fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
              ✕ Close
            </button>
          </div>

          {/* ── Two-panel body ── */}
          <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:10, padding:'0 16px 14px' }}>

            {/* LEFT: Patient Info */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', background:'#fff', alignSelf:'start' }}>
              <div style={{ background:'#fff', padding:'8px 14px', fontWeight:700, fontSize:13, textAlign:'center', borderBottom:`2px solid ${GREEN}` }}>
                Patient Info
              </div>
              <div style={{ padding:'12px 14px' }}>
                <LF label="Name"    value={pInfo.name}    onChange={v=>setPInfo(p=>({...p,name:v}))}    minW={50}/>
                <div style={{ display:'flex', gap:5, marginBottom:5 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <label style={{ fontSize:12, flexShrink:0 }}>Age:</label>
                    <input value={pInfo.age} onChange={e=>setPInfo(p=>({...p,age:e.target.value}))} style={{ width:38, border:'1px solid #d1d5db', borderRadius:2, padding:'3px 4px', fontSize:12, outline:'none' }}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <label style={{ fontSize:12, flexShrink:0 }}>Gender:</label>
                    <input value={pInfo.gender} onChange={e=>setPInfo(p=>({...p,gender:e.target.value}))} style={{ width:42, border:'1px solid #d1d5db', borderRadius:2, padding:'3px 4px', fontSize:12, outline:'none' }}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <label style={{ fontSize:12, flexShrink:0 }}>Civil:</label>
                    <input value={pInfo.civil} onChange={e=>setPInfo(p=>({...p,civil:e.target.value}))} style={{ width:44, border:'1px solid #d1d5db', borderRadius:2, padding:'3px 4px', fontSize:12, outline:'none' }}/>
                  </div>
                </div>
                <LF label="Address" value={pInfo.address} onChange={v=>setPInfo(p=>({...p,address:v}))} minW={50}/>

                <div style={{ height:2, background:GREEN, margin:'10px 0 8px', borderRadius:1 }}/>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:6, color:'#374151' }}>Laboratory Test Request:</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {availableTests.map(t => (
                    <div key={t} onClick={() => setSelTest(t)} style={{
                      padding:'5px 10px', borderRadius:6, fontSize:11, cursor:'pointer',
                      fontWeight: selTest===t ? 700 : 400,
                      background: selTest===t ? GREEN : (requestedTests.includes(t)?'#f0fdf4':'#f9fafb'),
                      color: selTest===t ? '#fff' : (requestedTests.includes(t)?GREEN:'#9ca3af'),
                      border:`1px solid ${selTest===t?GREEN:(requestedTests.includes(t)?'#bbf7d0':'#e5e7eb')}`,
                      transition:'all 0.12s',
                    }}>
                      {t}
                      {requestedTests.includes(t) && selTest!==t && <span style={{ float:'right', fontSize:9, color:GREEN }}>✓</span>}
                    </div>
                  ))}
                </div>

                {/* Request meta */}
                <div style={{ marginTop:10, padding:'8px 10px', background:'#f9fafb', borderRadius:6, border:'1px solid #e5e7eb', fontSize:10 }}>
                  <div style={{ color:'#6b7280', marginBottom:1 }}>Status</div>
                  <div style={{ fontWeight:700, color:request?.status==='completed'?GREEN:'#d97706', textTransform:'uppercase', marginBottom:5 }}>{request?.status||'—'}</div>
                  <div style={{ color:'#6b7280', marginBottom:1 }}>Request Date</div>
                  <div style={{ fontWeight:700, color:'#555' }}>{request?.request_date||'—'}</div>
                </div>
              </div>
            </div>

            {/* RIGHT: Lab Department + form */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', background:'#fff' }}>
              <div style={{ background:'#fff', padding:'8px 14px', fontWeight:700, fontSize:13, textAlign:'center', borderBottom:`2px solid ${GREEN}` }}>
                Laboratory Department
              </div>
              <div style={{ padding:'8px 16px', borderBottom:`2px solid ${GREEN}`, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px 16px' }}>
                <LF label="Name"          value={labInfo.name}    onChange={v=>setLabInfo(p=>({...p,name:v}))}    minW={60}/>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                  <label style={{ fontSize:12, minWidth:34, flexShrink:0 }}>Date:</label>
                  <input type="date" value={labInfo.date} onChange={e=>setLabInfo(p=>({...p,date:e.target.value}))} style={{ border:'1px solid #d1d5db', borderRadius:2, padding:'3px 5px', fontSize:11, outline:'none', flex:1 }}/>
                </div>
                <LF label="Address"       value={labInfo.address} onChange={v=>setLabInfo(p=>({...p,address:v}))} minW={60}/>
                <LF label="Age"           value={labInfo.age}     onChange={v=>setLabInfo(p=>({...p,age:v}))}     width="60px" minW={34}/>
                <LF label="Req. Physician"value={labInfo.reqPhys} onChange={v=>setLabInfo(p=>({...p,reqPhys:v}))} minW={90}/>
                <LF label="Sex"           value={labInfo.sex}     onChange={v=>setLabInfo(p=>({...p,sex:v}))}     width="70px" minW={34}/>
              </div>

              <div style={{ padding:'6px 16px', fontWeight:700, fontSize:14, textAlign:'center', borderBottom:'1px solid #f0f0f0', color:'#111' }}>
                {selTest}
              </div>

              {/* Form body */}
              {loading
                ? <div style={{ padding:28, textAlign:'center', color:'#aaa', fontSize:12 }}>Loading existing results…</div>
                : <div style={{ padding:'10px 16px' }}>
                    {selTest==='Fecalysis'          && <FecalysisForm  data={fec}  setData={setFec}/>}
                    {selTest==='Urinalysis'          && <UrinalysisForm data={uri}  setData={setUri}/>}
                    {selTest==='Hematology'          && <HematologyForm data={hem}  setData={setHem}/>}
                    {selTest==='Clinical Chemistry'  && <ClinChemForm   data={chem} setData={setChem}/>}
                    {selTest==='Serology'            && <SerologyForm   data={ser}  setData={setSer}/>}

                    {/* Signature footer */}
                    <div style={{ marginTop:16, paddingTop:10, borderTop:'1px solid #e5e7eb', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, textAlign:'center' }}>
                      {['Medical Technologist','Req. Physician','Pathologist'].map(r => (
                        <div key={r}>
                          <div style={{ borderBottom:'1px solid #444', height:30, marginBottom:4 }}/>
                          <div style={{ fontSize:10, color:'#6b7280' }}>{r}</div>
                        </div>
                      ))}
                    </div>
                  </div>
              }

              {/* ── Action Buttons — no Print here ── */}
              <div style={{ padding:'12px 16px', borderTop:'1px solid #f0f0f0', display:'flex', gap:8, justifyContent:'flex-end', alignItems:'center' }}>

                {/* Draft save — keeps modal open */}
                <button onClick={handleSaveOnly} disabled={saving || request?.status==='completed'}
                  style={{
                    background:'#f0fdf4', color:GREEN,
                    border:`1.5px solid ${GREEN}`,
                    borderRadius:8, padding:'8px 20px',
                    fontWeight:700, fontSize:12, cursor: (saving||request?.status==='completed') ? 'not-allowed':'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}>
                  {saving ? 'Saving…' : '💾 Save Draft'}
                </button>

                {/* Save + mark complete + notify doctor → closes modal */}
                <button onClick={handleSaveAndSend} disabled={saving || request?.status==='completed'}
                  style={{
                    background: request?.status==='completed'
                      ? '#9ca3af'
                      : `linear-gradient(135deg,${GREEN},#0d9488)`,
                    color:'#fff', border:'none',
                    borderRadius:8, padding:'8px 22px',
                    fontWeight:800, fontSize:12,
                    cursor: (saving||request?.status==='completed') ? 'not-allowed':'pointer',
                    opacity: saving ? 0.7 : 1,
                    boxShadow: request?.status!=='completed' ? '0 4px 14px rgba(26,122,26,0.35)' : 'none',
                    display:'flex', alignItems:'center', gap:6,
                  }}>
                  {request?.status==='completed'
                    ? '✓ Already Sent'
                    : saving
                      ? 'Sending…'
                      : '📤 Save & Send to Doctor'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm close */}
      {confirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:'28px 40px', textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.25)' }}>
            <p style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Close without saving?</p>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:24 }}>Unsaved changes will be lost.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button style={{ background:'#f3f4f6', color:'#374151', border:'none', padding:'9px 24px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }} onClick={() => setConfirm(false)}>Cancel</button>
              <button style={{ background:'#dc2626', color:'#fff', border:'none', padding:'9px 24px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }} onClick={() => { setConfirm(false); onClose() }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
