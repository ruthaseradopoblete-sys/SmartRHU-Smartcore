'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PatientInfo({ patient, onClose }: { patient: any; onClose: () => void }) {
  const [data, setData]       = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pid = patient.id
    Promise.all([
      supabase.from('konsulta_registrations').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('past_medical_history').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('family_history').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('personal_social_history').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('family_planning').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('menstrual_history').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('pregnancy_history').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('immunization_history').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('physical_exam_findings').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('pedia_measurements').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('pertinent_findings_per_system').select('*').eq('patient_id', pid).maybeSingle(),
      supabase.from('ncd_high_risk_assessment').select('*').eq('patient_id', pid).maybeSingle(),
    ]).then(([kr, pmh, fh, psh, fp, mh, preg, imm, pef, pedia, pfps, ncd]) => {
      setData({
        konsulta: kr.data,   pastMed: pmh.data,  famHist: fh.data,
        social:   psh.data,  fp:      fp.data,    menstrual: mh.data,
        preg:     preg.data, immun:   imm.data,   physical:  pef.data,
        pedia:    pedia.data, findings: pfps.data, ncd:      ncd.data,
      })
      setLoading(false)
    })
  }, [patient.id])

  const v = (x: any) => (x !== null && x !== undefined && x !== '') ? String(x) : ''

  const pm = data.pastMed   || {}
  const fh = data.famHist   || {}
  const so = data.social    || {}
  const fp = data.fp        || {}
  const mh = data.menstrual || {}
  const pr = data.preg      || {}
  const im = data.immun     || {}
  const ph = data.physical  || {}
  const pe = data.pedia     || {}
  const fi = data.findings  || {}
  const nd = data.ncd       || {}
  const kr = data.konsulta  || {}

  /* ── Checkbox square ── */
  const CB = ({ on }: { on?: boolean | null }) => (
    <span style={{
      display: 'inline-block', width: 5.5, height: 5.5, flexShrink: 0,
      border: '0.7px solid #000', background: on ? '#000' : '#fff',
      marginRight: 1.5, verticalAlign: 'middle',
    }}/>
  )

  /* ── Checkbox row ── */
  const Chk = ({ on, children }: { on?: boolean|null; children: React.ReactNode }) => (
    <div style={{ display:'flex', alignItems:'flex-start', gap:1.5, marginBottom:0.8, lineHeight:1.2 }}>
      <CB on={!!on}/><span style={{ flex:1 }}>{children}</span>
    </div>
  )

  /* ── Label: __val__ unit ── */
  const R = ({ lbl, val='', unit='' }: { lbl:string; val?:string; unit?:string }) => (
    <div style={{ display:'flex', alignItems:'flex-end', gap:1.5, marginBottom:0.8 }}>
      <span style={{ whiteSpace:'nowrap', flexShrink:0 }}>{lbl}</span>
      <span style={{ flex:1, borderBottom:'0.6px solid #000', minWidth:8, paddingBottom:0.3 }}>{val}</span>
      {unit && <span style={{ whiteSpace:'nowrap', flexShrink:0 }}>{unit}</span>}
    </div>
  )

  /* ── Bold underline title ── */
  const BT = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontWeight:700, textDecoration:'underline', marginBottom:1.5, fontSize:'5.8pt' }}>{children}</div>
  )

  /* ── Green header bar ── */
  const GH = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      background:'#1a5c2e', color:'#fff', fontWeight:700, fontSize:'5.8pt',
      padding:'1px 3px', marginBottom:1.5, textAlign:'center',
    }}>{children}</div>
  )

  /* ── Thin border box ── */
  const Box = ({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) => (
    <div style={{ border:'0.6px solid #000', padding:'1.5px 2.5px', marginBottom:1.5, ...style }}>{children}</div>
  )

  const DISEASES = [
    { k:'allergy',                 l:'Allergy',                   sp:(d:any)=>d.allergy_specify },
    { k:'asthma',                  l:'Asthma' },
    { k:'cancer',                  l:'Cancer',                    sp:(d:any)=>d.cancer_specify },
    { k:'cerebrovascular_disease', l:'Cerebrovascular Disease' },
    { k:'coronary_artery_disease', l:'Coronary Artery Disease' },
    { k:'diabetes_mellitus',       l:'Diabetes Mellitus' },
    { k:'emphysema',               l:'Emphysema' },
    { k:'epilepsy_seizure',        l:'Epilepsy / Seizure Disorder' },
    { k:'hepatitis',               l:'Hepatitis',                 sp:(d:any)=>d.hepatitis_specify },
    { k:'hyperlipidemia',          l:'Hyperlipidemia' },
    { k:'hypertension',            l:'Hypertension',              sp:(d:any)=>d.hypertension_highest_bp?`Highest BP: ${d.hypertension_highest_bp}`:'' },
    { k:'peptic_ulcer',            l:'Peptic Ulcer' },
    { k:'pneumonia',               l:'Pneumonia' },
    { k:'thyroid_disease',         l:'Thyroid Disease' },
    { k:'ptb',                     l:'PTB',                       sp:(d:any)=>d.ptb_specify_extra },
    { k:'urinary_tract_infection', l:'Urinary Tract Infection' },
    { k:'mental_illness',          l:'Mental Illnesses' },
    { k:'others',                  l:'Others' },
  ]

  const SYSTEMS = [
    { title:'A. HEENT', ok:'heent_others', items:[
      ['heent_essentially_normal','Essentially Normal'],
      ['heent_abnormal_papillary','Abnormal Papillary Reaction'],
      ['heent_cervical_lymphadenopathy','Cervical Lymphadenopathy'],
      ['heent_dry_mucus_membrane','Dry Mucus Membrane'],
      ['heent_icteric_sclerae','Icteric Sclerae'],
      ['heent_pale_conjunctiva','Pale Conjunctiva'],
      ['heent_sunken_eyeball','Sunken Eyeball'],
      ['heent_sunken_fontanelle','Sunken Fontanelle'],
    ]},
    { title:'B. Chest/Breast/ Lungs', ok:'chest_other', items:[
      ['chest_essentially_normal','Essentially Normal'],
      ['chest_asymmetrical_expansion','Asymmetrical Chest Expansion'],
      ['chest_decreased_breath_sound','Decreased Breath Sounds'],
      ['chest_wheeze','Wheezes'],
      ['chest_crackle_rales','Crackles/Rales'],
      ['chest_retractions','Retractions'],
      ['chest_lumps_over_breast','Lumos Over Breast'],
    ]},
    { title:'C. Heart', ok:'heart_others', items:[
      ['heart_essentially_normal','Essentially Normal'],
      ['heart_displaced_apex_beat','Displaced Apex Beat'],
      ['heart_heave_trills','Heave/Trills'],
      ['heart_irregular_rhythm','Irregular Heart Rhythm'],
      ['heart_muffled_sounds','Muffled Heart Sounds'],
      ['heart_murmurs','Murmurs'],
      ['heart_pericardial_bulge','Pericardial Bulge'],
    ]},
    { title:'D. Abdomen', ok:'abdomen_others', items:[
      ['abdomen_essentially_normal','Essentially Normal'],
      ['abdomen_rigidity','Abdominal Rigidity'],
      ['abdomen_tenderness','Abdominal Tenderness'],
      ['abdomen_hyperactive_bowel','Hyperactive Bowel Sounds'],
      ['abdomen_palpable_masses','Palpable Masses'],
      ['abdomen_tympanitic_dull','Tympanitic/Dull Abdomen'],
      ['abdomen_uterine_contraction','Uterine Contraction'],
    ]},
    { title:'E.. Genitourinary', ok:'gu_others', items:[
      ['gu_essentially_normal','Essentially Normal'],
      ['gu_blood_stained_internal_exam','Blood Stained in Internal Examination'],
      ['gu_cervical_dilation','Cervical Dilation'],
      ['gu_abnormal_discharge','Presence of Abnormal Discharge'],
    ]},
    { title:'F. Digital Rectal Examination', ok:'dre_others', items:[
      ['dre_crackle_rales','Crackle / Rales'],
      ['dre_enlarge_prostate','Enlarge Prostate'],
      ['dre_mass','Mass'],
      ['dre_hemorrhoids','Hemorrhoids'],
      ['dre_pus','Pus'],
      ['dre_not_applicable','Not Applicable'],
    ]},
    { title:'G. Skin/Extremities', ok:'skin_others', items:[
      ['skin_essentially_normal','Essentially Normal'],
      ['skin_clubbing','Clubbing'],
      ['skin_cold_clammy','Cold Clammy'],
      ['skin_cyanosis_mottled','Cyanosis/Mottled Skin'],
      ['skin_edema_swelling','Edema/Swelling'],
      ['skin_decreased_mobility','Decreased Mobility'],
      ['skin_pale_nailbeds','Pale Nailbeds'],
      ['skin_weak_pulses','Weak Pulses'],
    ]},
    { title:'H. Neurological Examination', ok:'neuro_others', items:[
      ['neuro_essentially_normal','Essentially Normal'],
      ['neuro_abnormal_gait','Abnormal Gait'],
      ['neuro_abnormal_position_sense','Abnormal Position Sense'],
      ['neuro_abnormal_sensation','Abnormal Sensation'],
      ['neuro_abnormal_reflexes','Abnormal Reflex/es'],
      ['neuro_poor_altered_memory','Poor/Altered Memory'],
      ['neuro_poor_muscle_tone','Poor Muscle Tone/Strength'],
      ['neuro_poor_coordination','Poor Coordination'],
    ]},
  ]

 const printCSS = `
    * { box-sizing: border-box; }

    /* ── Screen: simulate long bond landscape ── */
    .pa {
      width: 1404px;
      height: 918px;
      min-height: 918px;
      max-height: 918px;
      padding: 10px 14px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7pt;
      color: #000;
      background: #fff;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      margin: 8px auto;
    }

    /* ── Print: actual long bond landscape ── */
    @media print {
      @page { size: 13in 8.5in landscape; margin: 0; }
      html, body { margin:0; padding:0; background:#fff; }
      .no-print { display:none !important; }
      .pa {
        width: 13in !important;
        height: 8.5in !important;
        min-height: 8.5in !important;
        max-height: 8.5in !important;
        padding: 5mm 6mm !important;
        font-size: 6pt !important;
        box-shadow: none !important;
        margin: 0 !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `

  if (loading) return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:3000 }}>
      <div style={{ fontFamily:'Arial',background:'#fff',padding:32,borderRadius:8,color:'#1a5c2e',fontSize:14 }}>Loading records…</div>
    </div>
  )

  const FS:React.CSSProperties  = { fontSize:'5.5pt' }
  const FS5:React.CSSProperties = { fontSize:'5.5pt' }
  const FS6:React.CSSProperties = { fontSize:'6pt' }
  const FS7:React.CSSProperties = { fontSize:'7pt' }
  const BASE:React.CSSProperties = { fontFamily:'Arial, Helvetica, sans-serif', ...FS }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:3000,padding:12,overflowY:'auto' }}>
      <style>{printCSS}</style>
      <div style={{ ...BASE, background:'#fff', width:'100%', maxWidth:1400, borderRadius:4 }}>

        {/* Toolbar */}
        <div className="no-print" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 14px',borderBottom:'2px solid #1a5c2e',background:'#f0faf2' }}>
          <span style={{ fontFamily:'Arial',fontWeight:700,color:'#1a5c2e',fontSize:13 }}>
            PAHS Form 5 — Konsulta Health Assessment Tool v5 
          </span>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={()=>window.print()} style={{ fontFamily:'Arial',background:'#1a5c2e',color:'#fff',border:'none',padding:'5px 14px',borderRadius:4,fontWeight:700,cursor:'pointer',fontSize:12 }}>🖨 Print</button>
            <button onClick={onClose} style={{ fontFamily:'Arial',background:'#7f1d1d',color:'#fff',border:'none',padding:'5px 14px',borderRadius:4,fontWeight:700,cursor:'pointer',fontSize:12 }}>✕ Close</button>
          </div>
        </div>

        {/* ════════════ PRINT AREA ════════════ */}
        <div className="pa" style={{ ...BASE, padding:'4mm 5mm', display:'flex', flexDirection:'column', height:'auto', minHeight:0 }}>

          {/* ── TOP TITLE ── */}
          <div style={{ display:'flex', alignItems:'center', gap:6, borderBottom:'1px solid #000', paddingBottom:2, marginBottom:2, flexShrink:0 }}>
            <img src="/logo.jpg" alt="" style={{ width:22,height:22,objectFit:'contain',flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:900, ...FS7, color:'#1a5c2e' }}>PAHS FORM 5. KONSULTA HEALTH ASSESSMENT TOOL v5</div>
              <div style={{ fontWeight:700, ...FS6, color:'#1a5c2e' }}>GENERAL DATA AND KONSULTA REGISTRATION</div>
            </div>
            <div style={{ ...FS5, color:'#555' }}>Province of Quezon — Province-Wide Health System</div>
          </div>

          {/* ════ THREE-COLUMN BODY ════ */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.15fr', gap:'0 5px', flex:1, minHeight:0 }}>

            {/* ══════════ COLUMN 1: General Data + Left Health Assessment ══════════ */}
            <div style={{ display:'flex', flexDirection:'column', borderRight:'1.5px solid #1a5c2e', paddingRight:5 }}>

              {/* Patient Info */}
              <Box>
                <div style={{ display:'flex', gap:2, alignItems:'flex-end', marginBottom:1, ...FS }}>
                  <span style={{ fontWeight:700, whiteSpace:'nowrap' }}>FULL NAME</span>
                  {[['LAST',patient.last_name],['FIRST',patient.first_name],['MIDDLE',patient.middle_name]].map(([l,val])=>(
                    <div key={String(l)} style={{ flex:1 }}>
                      <div style={{ borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(String(val))}</div>
                      <div style={{ ...FS5, color:'#555', textAlign:'center' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:3, alignItems:'center', marginBottom:1, ...FS }}>
                  <b>AGE</b>
                  <span style={{ borderBottom:'0.6px solid #000', minWidth:16, paddingBottom:0.3 }}>{v(patient.age)}</span>
                  <b>SEX</b>
                  <CB on={patient.sex==='F'}/><span>F</span>
                  <CB on={patient.sex==='M'}/><span>M</span>
                  <b>BIRTHDATE</b>
                  <span style={{ borderBottom:'0.6px solid #000', minWidth:46, paddingBottom:0.3 }}>{v(patient.birthdate)}</span>
                  <span style={{ ...FS5, color:'#555' }}>(MM/DD/YYYY)</span>
                </div>
                <div style={{ display:'flex', gap:2, alignItems:'flex-end', marginBottom:1, ...FS }}>
                  <b>ADDRESS</b>
                  <div style={{ flex:0.5 }}>
                    <div style={{ borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(patient.purok)}</div>
                    <div style={{ ...FS5, color:'#555' }}>PUROK</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(patient.barangay)}</div>
                    <div style={{ ...FS5, color:'#555' }}>BARANGAY</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(patient.municipality)}</div>
                    <div style={{ ...FS5, color:'#555' }}>MUNICIPALITY</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:3, alignItems:'flex-end', marginBottom:1, ...FS }}>
                  <b>CONTACT #</b>
                  <span style={{ borderBottom:'0.6px solid #000', minWidth:55, paddingBottom:0.3 }}>{v(patient.contact_number)}</span>
                  <b>E-MAIL</b>
                  <span style={{ flex:1, borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(patient.email)}</span>
                </div>
                <div style={{ display:'flex', gap:3, alignItems:'flex-end', marginBottom:1, ...FS }}>
                  <b>PHILHEALTH PIN</b>
                  <span style={{ borderBottom:'0.6px solid #000', minWidth:65, paddingBottom:0.3 }}>{v(patient.philhealth_pin)}</span>
                </div>
                <div style={{ display:'flex', gap:3, alignItems:'center', marginBottom:1, ...FS }}>
                  <b>MEMBER TYPE</b>
                  <CB on={patient.member_type==='Member'}/><span>MEMBER</span>
                  <CB on={patient.member_type==='Dependent'}/><span>DEPENDENT</span>
                  <span>Specify:</span>
                  <span style={{ borderBottom:'0.6px solid #000', flex:1, paddingBottom:0.3 }}>{v(patient.member_type_specify)}</span>
                </div>
                {/* Konsulta Registration */}
                <div style={{ borderTop:'1px solid #1a5c2e', marginTop:1, paddingTop:1 }}>
                  <div style={{ display:'flex', gap:3, alignItems:'center', marginBottom:1, ...FS }}>
                    <b>KONSULTA REGISTRATION</b>
                    <span>Registration Date:</span>
                    <span style={{ borderBottom:'0.6px solid #000', minWidth:42, paddingBottom:0.3 }}>{v(kr.registration_date)}</span>
                    <span style={{ ...FS5 }}>(MM/DD/YYYY)</span>
                    <b>KPP SIGN</b><CB on={kr.kkp_sign}/>
                  </div>
                  <div style={{ fontWeight:700, ...FS, marginBottom:0.5 }}>PREFERRED FACILITY AND ADDRESS</div>
                  {[['CHOICE 1:',kr.facility_choice_1,kr.facility_kkp_1],
                    ['CHOICE 2:',kr.facility_choice_2,kr.facility_kkp_2],
                    ['CHOICE 3:',kr.facility_choice_3,kr.facility_kkp_3]].map(([l,val,kkp])=>(
                    <div key={String(l)} style={{ display:'flex', gap:2, alignItems:'flex-end', marginBottom:0.8, ...FS }}>
                      <span style={{ minWidth:38, flexShrink:0 }}>{l}</span>
                      <span style={{ flex:1, borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(String(val??''))}</span>
                      <CB on={!!kkp}/>
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:2, alignItems:'flex-end', ...FS }}>
                    <b>AUTHORIZATION TRANSACTION</b>
                    <CB on={!!kr.at_code}/><span>AT CODE:</span>
                    <span style={{ borderBottom:'0.6px solid #000', minWidth:36, paddingBottom:0.3 }}>{v(kr.at_code)}</span>
                    <span>Date of Appt:</span>
                    <span style={{ borderBottom:'0.6px solid #000', minWidth:36, paddingBottom:0.3 }}>{v(kr.date_of_appointment)}</span>
                    <span>If no ATC,</span><CB on={kr.face_capture}/><span>Face Capture</span>
                  </div>
                </div>
                {/* Signature */}
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:2 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ borderBottom:'0.6px solid #000', width:100, marginBottom:0.5 }}/>
                    <div style={{ ...FS5 }}>MEMBER / GUARDIAN'S SIGNATURE</div>
                  </div>
                </div>
              </Box>

              {/* Health Assessment Tool header */}
              <GH>HEALTH ASSESSMENT TOOL</GH>

              {/* Two sub-columns: Past Med + Family on left, Immunization etc on right */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 3px', flex:1 }}>

                {/* Sub-left: Past Medical + Family History + Social */}
                <div>
                  <Box>
                    <BT>PAST MEDICAL HISTORY</BT>
                    {DISEASES.map(d=>(
                      <Chk key={'pm_'+d.k} on={!!pm[d.k]}>
                        <span style={FS5}>{d.l}{d.sp&&d.sp(pm)?<span> (<span style={{ borderBottom:'0.6px solid #000', display:'inline-block', minWidth:20 }}>{d.sp(pm)}</span>)</span>:null}</span>
                      </Chk>
                    ))}
                    <div style={{ marginTop:1 }}>
                      <R lbl="Past Surgeries Done:" val={v(pm.past_surgeries_done)}/>
                      <R lbl="Date Done:" val={v(pm.date_surgery_done)}/>
                    </div>
                  </Box>
                  <Box>
                    <BT>FAMILY HISTORY</BT>
                    {DISEASES.map(d=>{
                      let label = d.l
                      let sp = ''
                      if(d.k==='allergy') sp=v(fh.allergy_specify)
                      if(d.k==='cancer') sp=v(fh.cancer_specify)
                      if(d.k==='hepatitis') sp=v(fh.hepatitis_specify)
                      if(d.k==='hypertension') sp=fh.hypertension_highest_bp?`Highest BP: ${fh.hypertension_highest_bp}`:''
                      if(d.k==='ptb') sp=v(fh.ptb_specify_extra)
                      if(d.k==='diabetes_mellitus') label='Diabetes Mellitus (If yes, perform FBS:)'
                      return (
                        <Chk key={'fh_'+d.k} on={!!fh[d.k]}>
                          <span style={FS5}>{label}{sp?<span> (<span style={{ borderBottom:'0.6px solid #000', display:'inline-block', minWidth:20 }}>{sp}</span>)</span>:null}</span>
                        </Chk>
                      )
                    })}
                  </Box>
                  <Box>
                    <BT>PERSONAL/ SOCIAL HISTORY</BT>
                    {([
                      ['Smoking',        so.smoking,        'No. of pack-years:',   so.smoking_packs_per_year],
                      ['Alcohol',        so.alcohol,        'No. of servings/day:', so.alcohol_servings_day],
                      ['Illicit Drugs',  so.illicit_drugs,  null,null],
                      ['Sexually Active',so.sexually_active,null,null],
                    ] as [string,string,string|null,any][]).map(([lbl,val,subLbl,subVal])=>(
                      <div key={lbl} style={{ marginBottom:1.5 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:2, ...FS5 }}>
                          <span style={{ minWidth:44, flexShrink:0 }}>{lbl}</span>
                          {['Yes','No','Quit'].map(o=>(
                            <span key={o} style={{ display:'flex', alignItems:'center', gap:1, marginRight:1 }}>
                              <CB on={val===o}/>{o}
                            </span>
                          ))}
                        </div>
                        {subLbl&&(
                          <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginLeft:4, ...FS5 }}>
                            <span>{subLbl}</span>
                            <span style={{ borderBottom:'0.6px solid #000', minWidth:20, paddingBottom:0.3 }}>{v(subVal)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </Box>
                </div>

                {/* Sub-right: Immunization + Family Planning + Menstrual + Pregnancy + Physical + Pedia */}
                <div>
                  <Box>
                    <BT>IMMUNIZATION</BT>
                    <div style={{ fontWeight:700, ...FS5, marginBottom:0.5 }}>Children</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0 2px' }}>
                      {[['ECG',null],['OPV1',im.opv1],['OPV2',im.opv2],['OPV3',im.opv3],
                        ['DPT1',im.dpt1],['DPT2',im.dpt2],['DPT3',im.dpt3],
                        ['Hepa1',im.hapa1],['Hepa2',im.hapa2],['Hepa3',im.hapa3],
                        ['Measles',im.measles],['Varicella',im.varicella],['BCG',im.bcg],
                      ].map(([l,val])=>(
                        <Chk key={String(l)} on={!!val}><span style={FS5}>{l}</span></Chk>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, ...FS5, marginTop:1, marginBottom:0.5 }}>Adult</div>
                    <div style={{ display:'flex', gap:6 }}>
                      {[['HPV',im.hpv],['MMR',im.mmr],['None',im.none_adult]].map(([l,val])=>(
                        <Chk key={String(l)} on={!!val}><span style={FS5}>{l}</span></Chk>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, ...FS5, marginTop:1, marginBottom:0.5 }}>Elderly and Immunocompromised</div>
                    <Chk on={!!im.pneumococcal_vaccine}><span style={FS5}>Pneumococcal Vaccine</span></Chk>
                    <Chk on={!!im.flu_vaccine}><span style={FS5}>Flu Vaccine</span></Chk>
                    <R lbl="Others:" val={v(im.others)}/>
                  </Box>
                  <Box>
                    <BT>FAMILY PLANNING</BT>
                    <Chk on={fp.has_fp_counseling}><span style={FS5}>With access to family planning counseling</span></Chk>
                    <R lbl="Provider:" val={v(fp.provider)}/>
                    <R lbl="Birth Control Method used:" val={v(fp.birth_control_method)}/>
                  </Box>
                  <Box>
                    <BT>MENSTRUAL HISTORY</BT>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginBottom:0.8, ...FS5 }}>
                      <span>Menarche:</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.menarche_age??''}</span>
                      <span>yrs old</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginBottom:0.8, ...FS5 }}>
                      <span>Onset of sexual intercourse</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.onset_sexual_intercourse_age??''}</span>
                      <span>yrs old</span>
                    </div>
                    <R lbl="Last Menstrual Period:"/>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginBottom:0.8, ...FS5 }}>
                      <span>Period Duration:</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.period_duration_days??''}</span>
                      <span>days</span>
                    </div>
                    <R lbl="No. of pads/day:" val={v(mh.pads_per_day)}/>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginBottom:0.8, ...FS5 }}>
                      <span>Interval cycle:</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.interval_cycle_days??''}</span>
                      <span>days</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:3, marginBottom:0.8, ...FS5 }}>
                      <span>Menopause:</span>
                      <CB on={mh.menopause===true}/><span>Yes</span>
                      <CB on={mh.menopause===false}/><span>No</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, ...FS5 }}>
                      <span>Age at Menopause:</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.age_at_menopause??''}</span>
                      <span>years</span>
                    </div>
                  </Box>
                  <Box>
                    <BT>PREGNANCY HISTORY</BT>
                    <div style={{ display:'flex', gap:2, alignItems:'flex-end', flexWrap:'wrap', marginBottom:0.8, ...FS5 }}>
                      {[['G',pr.gravida],['P',pr.para],['(T',pr.term],['P',pr.preterm],['A',pr.abortion],['L',pr.living]].map(([l,val],i)=>(
                        <span key={i} style={{ display:'flex', alignItems:'flex-end', gap:1 }}>
                          <b>{l}</b>
                          <span style={{ borderBottom:'0.6px solid #000', minWidth:10, paddingBottom:0.3 }}>{v(String(val??''))}</span>
                        </span>
                      ))}
                      <b>)</b>
                    </div>
                    <R lbl="Type of Delivery:" val={v(pr.type_of_delivery)}/>
                    <div style={{ display:'flex', alignItems:'center', gap:2, ...FS5 }}>
                      <span>Pregnancy Induced Hypertension:</span>
                      <CB on={pr.pregnancy_include_hypertension===true}/><span>Yes</span>
                      <CB on={pr.pregnancy_include_hypertension===false}/><span>No</span>
                    </div>
                  </Box>
                  <Box>
                    <BT>PERTINENT PHYSICAL EXAMINATION FINDINGS</BT>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 3px' }}>
                      {[
                        ['Height:',v(ph.height_cm),'cm'],
                        ['BP:',v(ph.blood_pressure_mmhg),'mmHg'],
                        ['Weight:',v(ph.weight_kg),'kg'],
                        ['HR:',v(ph.heart_rate_bpm),'bpm'],
                        ['Temp:',v(ph.temperature_c),'°C'],
                        ['RR:',v(ph.respiratory_rate_cpm),'cpm'],
                      ].map(([l,val,u])=>(
                        <div key={l} style={{ display:'flex', alignItems:'flex-end', gap:1.5, marginBottom:0.8, ...FS5 }}>
                          <span style={{ whiteSpace:'nowrap', flexShrink:0 }}>{l}</span>
                          <span style={{ flex:1, borderBottom:'0.6px solid #000' }}>{val}</span>
                          <span style={{ whiteSpace:'nowrap', flexShrink:0 }}>{u}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ ...FS5, marginBottom:0.8 }}>
                      Blood Type:&nbsp;
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=>(
                        <span key={t} style={{ marginRight:2 }}><CB on={ph.blood_type===t}/>{t}</span>
                      ))}
                    </div>
                    <div style={{ ...FS5 }}>
                      Visual Acuity: Right Eye:
                      <span style={{ borderBottom:'0.6px solid #000', display:'inline-block', minWidth:22, marginRight:3 }}>{v(ph.visual_acuity_right_eye)}</span>
                      Left Eye:
                      <span style={{ borderBottom:'0.6px solid #000', display:'inline-block', minWidth:22 }}>{v(ph.visual_acuity_left_eye)}</span>
                    </div>
                  </Box>
                  <Box>
                    <BT>PEDIA CLIENT AGED 0–24 MOS</BT>
                    {[
                      ['Body Length:',pe.body_length_cm],
                      ['Head Circumference:',pe.head_circumference_cm],
                      ['Chest Circumference:',pe.chest_circumference_cm],
                      ['Abdominal Circumference:',pe.abdominal_circumference_cm],
                      ['Hip Circumference:',pe.hip_circumference_cm],
                      ['Mid-Upper Arm Circ:',pe.mid_upper_arm_circ_cm],
                      ['Limbs Circumference:',pe.limbs_circumference_cm],
                    ].map(([l,val])=>(
                      <div key={String(l)} style={{ display:'flex', alignItems:'flex-end', gap:1.5, marginBottom:0.8, ...FS5 }}>
                        <span style={{ minWidth:78, flexShrink:0 }}>{l}</span>
                        <span style={{ flex:1, borderBottom:'0.6px solid #000' }}>{v(String(val??''))}</span>
                        <span>cm</span>
                      </div>
                    ))}
                  </Box>
                </div>
              </div>
            </div>
            {/* ══ END COLUMN 1 ══ */}

            {/* ══════════ COLUMN 2: Pertinent Findings Per System ══════════ */}
            <div style={{ borderRight:'1.5px solid #1a5c2e', paddingRight:5 }}>
              <GH>PERTINENT FINDINGS PER SYSTEM — PHYSICAL EXAMINATION</GH>

              {/* General Survey */}
              <Box>
                <div style={{ fontWeight:700, ...FS, marginBottom:1 }}>GENERAL SURVEY</div>
                <div style={{ display:'flex', gap:10 }}>
                  <Chk on={fi.awake_and_alert}><span style={FS5}>Awake and alert</span></Chk>
                  <Chk on={fi.altered_sensorium}><span style={FS5}>Altered sensorium</span></Chk>
                </div>
              </Box>

              {/* Systems in 2×4 grid */}
              <div style={{ display:'grid', gridTemplateColumns:'3fr 3fr', gap:'0 3px' }}>
                {SYSTEMS.map(sys=>(
                  <Box key={sys.title}>
                    <div style={{ fontWeight:900, ...FS5, marginBottom:0.1 }}>{sys.title}</div>
                    {sys.items.map(([k,l])=>(
                      <Chk key={k} on={!!fi[k]}><span style={FS5}>{l}</span></Chk>
                    ))}
                    {fi[sys.ok]&&<R lbl="Others:" val={String(fi[sys.ok])}/>}
                  </Box>
                ))}
              </div>

              {/* First Patient Encounter Assessment */}
              <Box>
                <div style={{ fontWeight:900, ...FS, marginBottom:1 }}>FIRST PATIENT ENCOUNTER ASSESSMENT:</div>
                {[
                  ['encounter_generally_well',      'GENERALLY WELL',               '(fill out and sign eKAS)'],
                  ['encounter_primary_care_consult', 'FOR PRIMARY CARE CONSULTATION','(fill out KONSULTA Referral Slip)'],
                  ['encounter_diagnostic_exam',      'FOR DIAGNOSTIC EXAMINATION',   '(fill out Diagnostic Request Form)'],
                ].map(([k,lbl,note])=>(
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:2, marginBottom:1.5, ...FS5 }}>
                    <CB on={!!fi[k]}/><b>{lbl}</b>
                    <i style={{ color:'#555', fontSize:'5.5pt' }}>{note}</i>
                  </div>
                ))}
              </Box>

              {/* First Patient Encounter signature */}
              <Box>
                <div style={{ fontWeight:700, ...FS, marginBottom:1 }}>FIRST PATIENT ENCOUNTER</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 4px' }}>
                  {['SIGNATURE','NAME','POSITION','DATE'].map(l=>(
                    <div key={l} style={{ marginBottom:3 }}>
                      <div style={{ borderBottom:'0.6px solid #000', height:10, marginBottom:0.5 }}/>
                      <div style={{ fontSize:'5.5pt', color:'#555' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </Box>

              {/* Province logo */}
              <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:'auto', paddingTop:4 }}>
                <img src="/logo.jpg" alt="" style={{ width:18,height:18,objectFit:'contain' }}/>
                <div style={{ fontSize:'4.5pt', lineHeight:1.2 }}>
                  Province of Quezon<br/>
                  <b>PROVINCE-WIDE HEALTH SYSTEM</b><br/>
                  PAHS FORM 5
                </div>
              </div>
            </div>
            {/* ══ END COLUMN 2 ══ */}

            {/* ══════════ COLUMN 3: NCD Assessment + vertical slips ══════════ */}
            <div style={{ display:'flex', gap:3 }}>

              {/* NCD main content */}
              <div style={{ flex:1 }}>
                <div style={{ border:'1px solid #000', padding:'2px 2px', marginBottom:2 }}>
                  <div style={{ fontWeight:900, textAlign:'center', ...FS6, marginBottom:1.5, textDecoration:'underline' }}>
                    NCD HIGH-RISK ASSESSMENT<br/>(FOR 20 YRS OLD AND ABOVE)
                  </div>

                  {[
                    ['eats_processed_food_weekly',   '1. Eats processed food (ex. Instant Noodles, Burgers, Fries, Fried Chicken Sign, etc) and ihaw-ihaw Weekly?'],
                    ['eats_fruits_vegetables_daily', '2. Eats 3 servings of fruits and vegetable Daily?'],
                    ['does_physical_activity_weekly','3. Does at least 2.5 hours of moderate-intensity physical activity every week?'],
                  ].map(([k,q])=>(
                    <div key={k} style={{ marginBottom:2 }}>
                      <div style={{ ...FS5, lineHeight:1.3, marginBottom:0.5 }}>{q}</div>
                      <div style={{ display:'flex', gap:10, marginLeft:4 }}>
                        <Chk on={nd[k]===true}><span style={FS5}>Yes</span></Chk>
                        <Chk on={nd[k]===false}><span style={FS5}>No</span></Chk>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginBottom:2 }}>
                    <div style={{ ...FS5, marginBottom:0.5 }}>4. Was patient diagnosed as having Diabetes?</div>
                    <div style={{ display:'flex', gap:6, marginLeft:4 }}>
                      <Chk on={nd.diagnosed_with_diabetes}><span style={FS5}>Yes</span></Chk>
                      <Chk on={nd.diabetes_do_not_know}><span style={FS5}>No / "Do not know"</span></Chk>
                    </div>
                    <div style={{ marginLeft:4, ...FS5 }}>
                      If YES:&nbsp;<CB on={nd.diabetes_with_medication}/>With Medication &nbsp;
                      <CB on={nd.diabetes_without_medication}/>Without Medication
                    </div>
                  </div>

                  <div style={{ marginBottom:2 }}>
                    <div style={{ ...FS5, marginBottom:0.5 }}>5. Does the patient have any of the following symptoms?</div>
                    <div style={{ display:'flex', gap:8, marginLeft:4 }}>
                      <Chk on={nd.symptom_polyphagia}><span style={FS5}>Polyphagia</span></Chk>
                      <Chk on={nd.symptom_polydipsia}><span style={FS5}>Polydipsia</span></Chk>
                      <Chk on={nd.symptom_polyuria}><span style={FS5}>Polyuria</span></Chk>
                    </div>
                  </div>

                  {/* Lab results 2-col */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 3px', marginBottom:2 }}>
                    {[
                      ['FBS/RBS:',nd.fbs_rbs_value,nd.fbs_rbs_date],
                      ['Total Cholesterol:',nd.total_cholesterol_value,nd.total_cholesterol_date],
                      ['Urine Ketone:',nd.urine_ketone_value,nd.urine_ketone_date],
                      ['Urine Protein:',nd.urine_protein_value,nd.urine_protein_date],
                    ].map(([l,val,dt])=>(
                      <div key={String(l)}>
                        <R lbl={String(l)} val={v(val)}/>
                        <R lbl="Date taken:" val={v(dt)}/>
                      </div>
                    ))}
                  </div>

                  {/* Angina */}
                  <div style={{ fontWeight:700, ...FS5, marginBottom:1 }}>
                    Angina or Heart Attack &nbsp;<CB on={nd.angina_yes}/>Yes &nbsp;<CB on={nd.angina_no}/>No
                  </div>
                  {[
                    ['angina_has_chest_pain',        '1. Have had any pain/discomfort pressure/heaviness in your chest? Nakararamdam ka ba ng pananakit o bigat sa iyong dibdib?'],
                    ['angina_center_left_chest',      '2. Do you get the pain in the center/left chest or left arm? Arg sakit ba ay nasa gitna ng dibdib, sa kaliwang bahagi ng dibdib o sa kaliwang braso?'],
                    ['angina_on_walking',             '3. Do you get it when you walk uphill or hurry? Nararamdaman mo ba ito kung ikaw ay nagmamadali o naglalakad nang mabilis o paahon?'],
                    ['angina_slows_down_walking',     '4. Do you slowdown if you get the pain while walking? Tumitigil ka ba sa paglalakad kapag sumasakit ang iyong dibdib?'],
                    ['angina_pain_goes_away_standing','5. Does the pain go away if you stand still or if you get medication? Nawawala ba ang sakit sa dibdib kapag ikaw ay tumitigil o umiinom ng gamot sa ilalim ng dila?'],
                    ['angina_pain_gone_10_minutes',   '6. Does the pain go away in <10 minutes? Nawawala ba ang sakit sa loob ng 10 minuto?'],
                    ['angina_severe_30min_or_more',   '7. Have you ever had severe chest pain across the front of your chest lasting half an hour or more? Nakaraman ka na ba ng pananakit ng dibdib na tumatagal ng kalahating oras o higit pa?'],
                  ].map(([k,q])=>(
                    <div key={k} style={{ marginBottom:1.5 }}>
                      <div style={{ ...FS5, lineHeight:1.25, marginBottom:0.3 }}>{q}</div>
                      <div style={{ display:'flex', gap:8, marginLeft:4 }}>
                        <Chk on={nd[k]===true}><span style={FS5}>Yes</span></Chk>
                        <Chk on={nd[k]===false}><span style={FS5}>No</span></Chk>
                      </div>
                    </div>
                  ))}
                  <div style={{ ...FS5, fontStyle:'italic', marginBottom:1.5 }}>
                    * If YES to number 3, 4 &amp; 5 or 7, the patient have ANGINA/HEART ATTACK, must see a doctor.
                  </div>

                  {/* Stroke */}
                  <div style={{ fontWeight:700, ...FS5, marginBottom:0.8 }}>Stroke and TIA</div>
                  <div style={{ ...FS5, lineHeight:1.25, marginBottom:0.5 }}>
                    8. Have you ever had difficulty in talking, weakness of arms or legs on one side of the body?
                    Nakaraman ka na ba ng pagkautal, panghihina ng braso o binti, o pamamanhid ng kalahati ng katawan?
                  </div>
                  <div style={{ display:'flex', gap:10, marginLeft:4, marginBottom:1 }}>
                    <Chk on={nd.stroke_tia_difficulty_talking===true}><span style={FS5}>Yes</span></Chk>
                    <Chk on={nd.stroke_tia_difficulty_talking===false}><span style={FS5}>No</span></Chk>
                  </div>
                  <div style={{ ...FS5, fontStyle:'italic', marginBottom:2 }}>
                    * If YES to number 8, you may have TIA/Stroke, must seek a doctor.
                  </div>

                  {/* Risk Level */}
                  <div style={{ border:'0.6px solid #000', padding:'2px 3px' }}>
                    <div style={{ fontWeight:700, ...FS5, marginBottom:0.8 }}>RISK LEVEL</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1 }}>
                      {['<10%','10% to <20%','20% to <30%','30% to <40%','>40%'].map(r=>(
                        <Chk key={r} on={nd.risk_level===r}><span style={FS5}>{r}</span></Chk>
                      ))}
                    </div>
                    <div style={{ marginTop:2 }}>
                      <div style={{ ...FS5, fontWeight:700, marginBottom:0.5 }}>CONSULTATION</div>
                      <div style={{ ...FS5, fontWeight:700 }}>ENCODING</div>
                    </div>
                  </div>
                </div>
              </div>

{/* ── FAR-RIGHT VERTICAL STRIPS ── */}
              <div style={{ width:52, display:'flex', flexDirection:'column', gap:0, border:'0.6px solid #000', overflow:'hidden', flexShrink:0 }}>

                {/* Top strip: PhilHealth Confirmation Slip */}
                <div style={{ flex:1, borderBottom:'1px dashed #666', overflow:'hidden', display:'flex', flexDirection:'row' }}>

                  {/* Green title — vertical, reads bottom-to-top */}
                  <div style={{
                    writingMode:'vertical-lr', transform:'rotate(180deg)',
                    background:'#1a5c2e', color:'#fff', fontWeight:900, fontSize:'4.5pt',
                    padding:'3px 2px', whiteSpace:'nowrap', display:'flex',
                    alignItems:'center', justifyContent:'center', flexShrink:0,
                    borderRight:'0.6px solid #aaa',
                  }}>
                    PHILHEALTH KONSULTA REGISTRATION CONFIRMATION SLIP
                  </div>

                  {/* Logo column */}
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'center',
                    padding:'2px', borderRight:'0.4px solid #ccc', flexShrink:0, width:12,
                  }}>
                    <img src="/logo.jpg" alt="" style={{ width:9, height:9, objectFit:'contain' }}/>
                  </div>

                  {/* Field columns — each field is a narrow vertical column */}
                  {([
                    { lbl:'FULL NAME',            val:[v(patient.last_name),v(patient.first_name),v(patient.middle_name)].filter(Boolean).join(', '), flex:2 },
                    { lbl:'PIN',                  val:v(patient.philhealth_pin), flex:1 },
                    { lbl:'PROVIDER',             val:v(fp.provider), flex:1 },
                    { lbl:'ADDRESS',              val:[v(patient.purok),v(patient.barangay),v(patient.municipality)].filter(Boolean).join(', '), flex:2 },
                    { lbl:'AUTHORIZED PERSONNEL', val:'', flex:1 },
                  ] as {lbl:string;val:string;flex:number}[]).map(({lbl,val,flex})=>(
                    <div key={lbl} style={{
                      flex, borderRight:'0.4px solid #ccc',
                      display:'flex', flexDirection:'column',
                      overflow:'hidden', minWidth:0,
                    }}>
                      {/* Label — vertical */}
                      <div style={{
                        writingMode:'vertical-lr', transform:'rotate(180deg)',
                        fontSize:'3.5pt', fontWeight:700,
                        background:'#efefef', padding:'2px 1px',
                        textAlign:'center', flexShrink:0,
                        borderBottom:'0.4px solid #ccc', whiteSpace:'nowrap',
                      }}>{lbl}</div>
                      {/* Value — vertical */}
                      <div style={{
                        writingMode:'vertical-lr', transform:'rotate(180deg)',
                        fontSize:'4pt', flex:1, padding:'1px',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        overflow:'hidden', whiteSpace:'nowrap',
                      }}>{val||'—'}</div>
                    </div>
                  ))}
                </div>

                {/* Bottom strip: Authorization Transaction Code */}
                <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'row' }}>

                  {/* Green title — vertical */}
                  <div style={{
                    writingMode:'vertical-lr', transform:'rotate(180deg)',
                    background:'#1a5c2e', color:'#fff', fontWeight:900, fontSize:'4.5pt',
                    padding:'3px 2px', whiteSpace:'nowrap', display:'flex',
                    alignItems:'center', justifyContent:'center', flexShrink:0,
                    borderRight:'0.6px solid #aaa',
                  }}>
                    AUTHORIZATION TRANSACTION CODE
                  </div>

                  {/* Logo column */}
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'center',
                    padding:'2px', borderRight:'0.4px solid #ccc', flexShrink:0, width:12,
                  }}>
                    <img src="/logo.jpg" alt="" style={{ width:9, height:9, objectFit:'contain' }}/>
                  </div>

                  {/* Field columns */}
                  {([
                    { lbl:'AT CODE',              val:v(kr.at_code), flex:1 },
                    { lbl:'DATE OF APPOINTMENT',  val:v(kr.date_of_appointment), flex:2 },
                    { lbl:'AUTHORIZED PERSONNEL', val:'', flex:1 },
                  ] as {lbl:string;val:string;flex:number}[]).map(({lbl,val,flex})=>(
                    <div key={lbl} style={{
                      flex, borderRight:'0.4px solid #ccc',
                      display:'flex', flexDirection:'column',
                      overflow:'hidden', minWidth:0,
                    }}>
                      {/* Label — vertical */}
                      <div style={{
                        writingMode:'vertical-lr', transform:'rotate(180deg)',
                        fontSize:'3.5pt', fontWeight:700,
                        background:'#efefef', padding:'2px 1px',
                        textAlign:'center', flexShrink:0,
                        borderBottom:'0.4px solid #ccc', whiteSpace:'nowrap',
                      }}>{lbl}</div>
                      {/* Value — vertical */}
                      <div style={{
                        writingMode:'vertical-lr', transform:'rotate(180deg)',
                        fontSize:'4pt', flex:1, padding:'1px',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        overflow:'hidden', whiteSpace:'nowrap',
                      }}>{val||'—'}</div>
                    </div>
                  ))}
                </div>

              </div>
              {/* ── END FAR-RIGHT STRIPS ── */}

            </div>
            {/* ══ END COLUMN 3 ══ */}

          </div>
          {/* ════ END THREE-COLUMN BODY ════ */}

        </div>
        {/* ════════════ END PRINT AREA ════════════ */}
      </div>
    </div>
  )
}