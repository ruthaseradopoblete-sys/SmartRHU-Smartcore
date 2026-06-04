'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const GLOBAL_FONT = {
  family: "'Arial', sans-serif",
  size: "11pt",
  color: "#000000"
};

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
        pedia:    pedia.data,findings: pfps.data, ncd:       ncd.data,
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

  /* ── atoms ── */
  const CB = ({ on }: { on?: boolean | null }) => (
    <span style={{
      display:'inline-block', width:7, height:7, flexShrink:0,
      border:'1px solid #333', background: on ? '#1a6b2e' : '#fff',
      marginRight:2, verticalAlign:'middle',
    }}/>
  )

  const Chk = ({ on, children }: { on?: boolean|null; children: React.ReactNode }) => (
    <div style={{ display:'flex', alignItems:'center', fontSize:5.8, lineHeight:1.15, marginBottom:.8 }}>
      <CB on={!!on}/><span>{children}</span>
    </div>
  )

  const R = ({ lbl, val='', unit='' }: { lbl:string; val?:string; unit?:string }) => (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginBottom:1, fontSize:6 }}>
      <span style={{ whiteSpace:'nowrap', color:'#111' }}>{lbl}</span>
      <span style={{ flex:1, borderBottom:'1px solid #666', minWidth:12, fontSize:6, lineHeight:1 }}>{val}</span>
      {unit && <span style={{ fontSize:5.5, whiteSpace:'nowrap' }}>{unit}</span>}
    </div>
  )

  const Box = ({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) => (
    <div style={{ border:'1px solid #333', padding:'2px 3px', marginBottom:2, ...style }}>{children}</div>
  )

  const BT = ({ children }: { children:React.ReactNode }) => (
    <div style={{ fontWeight:700, fontSize:6.3, textDecoration:'underline', marginBottom:1.5 }}>{children}</div>
  )

  const GH = ({ children }: { children:React.ReactNode }) => (
    <div style={{ background:'#1a6b2e', color:'#fff', fontWeight:700, fontSize:6.3,
                  padding:'1px 3px', marginBottom:2 }}>{children}</div>
  )

  const TC2 = ({ children }: { children:React.ReactNode }) => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 3px' }}>{children}</div>
  )
  const TC3 = ({ children }: { children:React.ReactNode }) => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 2px' }}>{children}</div>
  )

  const DISEASES_PM = [
    { k:'allergy',                 l:'Allergy',                   sp: pm.allergy_specify },
    { k:'asthma',                  l:'Asthma' },
    { k:'cancer',                  l:'Cancer',                    sp: pm.cancer_specify },
    { k:'cerebrovascular_disease', l:'Cerebrovascular Disease' },
    { k:'coronary_artery_disease', l:'Coronary Artery Disease' },
    { k:'diabetes_mellitus',       l:'Diabetes Mellitus' },
    { k:'emphysema',               l:'Emphysema' },
    { k:'epilepsy_seizure',        l:'Epilepsy / Seizure Disorder' },
    { k:'hepatitis',               l:'Hepatitis',                 sp: pm.hepatitis_specify },
    { k:'hyperlipidemia',          l:'Hyperlipidemia' },
    { k:'hypertension',            l:'Hypertension',              sp: pm.hypertension_highest_bp ? `(Highest BP: ${pm.hypertension_highest_bp} mmHg)` : '' },
    { k:'peptic_ulcer',            l:'Peptic Ulcer' },
    { k:'pneumonia',               l:'Pneumonia' },
    { k:'thyroid_disease',         l:'Thyroid Disease' },
    { k:'ptb',                     l:'PTB',                       sp: pm.ptb_specify_extra },
    { k:'urinary_tract_infection', l:'Urinary Tract Infection' },
    { k:'mental_illness',          l:'Mental Illnesses' },
    { k:'others',                  l:'Others' },
  ]
  const DISEASES_FH = DISEASES_PM.map(d => ({
    ...d, sp: undefined,
    ...(d.k==='allergy'           ? { sp: fh.allergy_specify } : {}),
    ...(d.k==='cancer'            ? { sp: fh.cancer_specify  } : {}),
    ...(d.k==='hepatitis'         ? { sp: fh.hepatitis_specify } : {}),
    ...(d.k==='hypertension'      ? { sp: fh.hypertension_highest_bp ? `(Highest BP: ${fh.hypertension_highest_bp} mmHg)` : '' } : {}),
    ...(d.k==='ptb'               ? { sp: fh.ptb_specify_extra } : {}),
    ...(d.k==='diabetes_mellitus' ? { l:'Diabetes Mellitus (If yes, perform FBS:)' } : {}),
  }))

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
    { title:'B. Chest / Breast / Lungs', ok:'chest_other', items:[
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
    { title:'E. Genitourinary', ok:'gu_others', items:[
      ['gu_essentially_normal','Essentially Normal'],
      ['gu_blood_stained_internal_exam','Blood Stained in Internal Exam'],
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
    { title:'G. Skin / Extremities', ok:'skin_others', items:[
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
    @media print {
      @page { size: 13in 8.5in landscape; margin: 0; }
      .no-print { display:none !important; }
      .pa {
        width: 330.2mm;
        height: 215.9mm;
        padding: 4mm 6mm;
        margin: 0;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        font-family: ${GLOBAL_FONT.family} !important;
        font-size: ${GLOBAL_FONT.size} !important;
        color: ${GLOBAL_FONT.color};
      }
    }
  `

  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
                  display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000 }}>
      <div style={{ background:'#fff', padding:32, borderRadius:8, color:'#1a6b2e',
                    fontFamily:'Arial,sans-serif' }}>Loading records…</div>
    </div>
  )

  /* ── PhilHealth slip content (reused in the vertical strip) ── */
  const philhealthFullName = [v(patient.last_name), v(patient.first_name), v(patient.middle_name)].filter(Boolean).join(', ')
  const philhealthAddress  = [v(patient.purok), v(patient.barangay), v(patient.municipality)].filter(Boolean).join(', ')

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)',
                  display:'flex', alignItems:'flex-start', justifyContent:'center',
                  zIndex:3000, padding:12, overflowY:'auto' }}>
      <style>{printCSS}</style>

      <div style={{ background:'#fff', width:'100%', maxWidth:1260,
                    borderRadius:6, fontFamily:'Arial,Helvetica,sans-serif' }}>

        {/* toolbar */}
        <div className="no-print" style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'6px 14px', borderBottom:'2px solid #1a6b2e', background:'#f0faf0',
        }}>
          <span style={{ fontWeight:700, color:'#1a6b2e', fontSize:13 }}>
            Patient Health Record — PAHS Form 5
          </span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>window.print()} style={{
              background:'#1a6b2e', color:'#fff', border:'none',
              padding:'5px 14px', borderRadius:4, fontWeight:700, cursor:'pointer', fontSize:12,
            }}>🖨️ Print</button>
            <button onClick={onClose} style={{
              background:'#8B1A1A', color:'#fff', border:'none',
              padding:'5px 14px', borderRadius:4, fontWeight:700, cursor:'pointer', fontSize:12,
            }}>✕ Close</button>
          </div>
        </div>

        {/* ═══════════ PRINT AREA ═══════════ */}
        <div className="pa" style={{
          padding:'2mm 2.5mm',
          fontFamily: GLOBAL_FONT.family,
          fontSize: GLOBAL_FONT.size,
          lineHeight:1.18,
          color: GLOBAL_FONT.color,
          display:'flex',
          flexDirection:'column',
          height:'100%',
          width:'100%',
          boxSizing:'border-box',
          overflow:'hidden',
        }}>

          {/* global header */}
          <div style={{
            display:'flex', alignItems:'center', gap:7,
            borderBottom:'2px solid #1a6b2e', paddingBottom:2, marginBottom:2, flexShrink:0,
          }}>
            <img src="/logo.jpg" alt="" style={{ width:28, height:28, objectFit:'contain', flexShrink:0 }}/>
            <div>
              <div style={{ fontWeight:900, fontSize:7.5, color:'#1a6b2e' }}>
                PAHS FORM 5. KONSULTA HEALTH ASSESSMENT TOOL v5
              </div>
              <div style={{ fontWeight:700, fontSize:6.8, color:'#1a6b2e' }}>
                GENERAL DATA AND KONSULTA REGISTRATION
              </div>
              <div style={{ fontSize:5.5, color:'#555' }}>Province of Quezon — Province-Wide Health System</div>
            </div>
          </div>

          {/* two halves */}
          <div style={{ display:'flex', flex:1, gap:0, minHeight:0 }}>

            {/* ══════════  LEFT HALF  ══════════ */}
            <div style={{
              flex:1, borderRight:'2px solid #1a6b2e', paddingRight:'2mm',
              display:'flex', flexDirection:'column', minHeight:0,
            }}>
              <Box style={{ flexShrink:0 }}>
                <div style={{ display:'flex', gap:3, alignItems:'flex-end', marginBottom:1.5 }}>
                  <span style={{ fontWeight:700, fontSize:6.3, whiteSpace:'nowrap' }}>FULL NAME</span>
                  {[['LAST',patient.last_name],['FIRST',patient.first_name],['MIDDLE',patient.middle_name]].map(([l,val])=>(
                    <div key={String(l)} style={{ flex:1 }}>
                      <div style={{ borderBottom:'1px solid #555', fontSize:6.3, paddingBottom:.5 }}>{v(val)}</div>
                      <div style={{ fontSize:4.8, textAlign:'center', color:'#555' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:1, fontSize:6 }}>
                  <b>AGE</b>
                  <span style={{ borderBottom:'1px solid #555', minWidth:18, paddingBottom:.5 }}>{v(patient.age)}</span>
                  <b style={{ marginLeft:4 }}>SEX</b>
                  <CB on={patient.sex==='F'}/>F &nbsp;<CB on={patient.sex==='M'}/>M
                  <b style={{ marginLeft:6 }}>BIRTHDATE</b>
                  <span style={{ borderBottom:'1px solid #555', minWidth:52, paddingBottom:.5 }}>{v(patient.birthdate)}</span>
                  <span style={{ fontSize:5, color:'#555' }}>(MM/DD/YYYY)</span>
                </div>
                <div style={{ display:'flex', gap:3, alignItems:'flex-end', marginBottom:1, fontSize:6 }}>
                  <b>ADDRESS</b>
                  {[['PUROK',patient.purok],['BARANGAY',patient.barangay],['MUNICIPALITY',patient.municipality]].map(([l,val])=>(
                    <div key={String(l)} style={{ flex:1 }}>
                      <div style={{ borderBottom:'1px solid #555', paddingBottom:.5 }}>{v(val)}</div>
                      <div style={{ fontSize:4.8, color:'#555' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:5, alignItems:'flex-end', marginBottom:1, fontSize:6 }}>
                  <b style={{ whiteSpace:'nowrap' }}>CONTACT #</b>
                  <span style={{ flex:1, borderBottom:'1px solid #555', paddingBottom:.5 }}>{v(patient.contact_number)}</span>
                  <b style={{ marginLeft:4 }}>E-MAIL</b>
                  <span style={{ flex:1.5, borderBottom:'1px solid #555', paddingBottom:.5 }}>{v(patient.email)}</span>
                </div>
                <div style={{ display:'flex', gap:4, alignItems:'flex-end', marginBottom:1, fontSize:6 }}>
                  <b style={{ whiteSpace:'nowrap' }}>PHILHEALTH PIN</b>
                  <span style={{ flex:1, borderBottom:'1px solid #555', paddingBottom:.5 }}>{v(patient.philhealth_pin)}</span>
                </div>
                <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:1, fontSize:6 }}>
                  <b>MEMBER TYPE</b>
                  <CB on={patient.member_type==='Member'}/>MEMBER &nbsp;
                  <CB on={patient.member_type==='Dependent'}/>DEPENDENT
                  <span style={{ marginLeft:4 }}>Specify:</span>
                  <span style={{ borderBottom:'1px solid #555', minWidth:50, paddingBottom:.5 }}>{v(patient.member_type_specify)}</span>
                </div>
                <div style={{ borderTop:'1.5px solid #1a6b2e', margin:'1.5px 0' }}/>
                <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:1, fontSize:6 }}>
                  <b style={{ whiteSpace:'nowrap' }}>KONSULTA REGISTRATION</b>
                  <span>Registration Date:</span>
                  <span style={{ borderBottom:'1px solid #555', minWidth:46, paddingBottom:.5 }}>{v(kr.registration_date)}</span>
                  <span style={{ fontSize:5, color:'#555' }}>(MM/DD/YYYY)</span>
                  <span style={{ marginLeft:5 }}>KKP Sign</span><CB on={kr.kkp_sign}/>
                </div>
                <div style={{ fontWeight:700, fontSize:6, marginBottom:.5 }}>PREFERRED FACILITY AND ADDRESS</div>
                {[['CHOICE 1:',kr.facility_choice_1,kr.facility_kkp_1],
                  ['CHOICE 2:',kr.facility_choice_2,kr.facility_kkp_2],
                  ['CHOICE 3:',kr.facility_choice_3,kr.facility_kkp_3]].map(([l,val,kkp])=>(
                  <div key={String(l)} style={{ display:'flex', alignItems:'center', gap:3, marginBottom:.5, fontSize:6 }}>
                    <span style={{ minWidth:40 }}>{l}</span>
                    <span style={{ flex:1, borderBottom:'1px solid #555', paddingBottom:.5 }}>{v(val)}</span>
                    <CB on={!!kkp}/>
                  </div>
                ))}
                <div style={{ display:'flex', gap:3, alignItems:'center', fontSize:5.8, marginTop:.5 }}>
                  <b style={{ whiteSpace:'nowrap' }}>AUTHORIZATION TRANSACTION</b>
                  <CB on={kr.has_at_code}/>AT CODE:
                  <span style={{ borderBottom:'1px solid #555', minWidth:46, paddingBottom:.5 }}>{v(kr.at_code)}</span>
                  &nbsp;Date of Appointment:
                  <span style={{ borderBottom:'1px solid #555', minWidth:46, paddingBottom:.5 }}>{v(kr.date_of_appointment)}</span>
                  &nbsp;If no ATC, <CB on={kr.face_capture}/>Face Capture
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:2 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ borderBottom:'1px solid #333', width:110, marginBottom:.5 }}/>
                    <div style={{ fontSize:5.3 }}>MEMBER / GUARDIAN'S SIGNATURE</div>
                  </div>
                </div>
              </Box>

              <GH><span style={{ fontSize:6.8 }}>HEALTH ASSESSMENT TOOL</span></GH>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, flex:1, minHeight:0 }}>
                {/* SUB-A */}
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <Box>
                    <BT>PAST MEDICAL HISTORY</BT>
                    {DISEASES_PM.map(d=>(
                      <Chk key={d.k} on={!!pm[d.k]}>
                        {d.l}{d.sp && <span style={{ marginLeft:2, borderBottom:'1px solid #555', minWidth:22, display:'inline-block', fontSize:5.3 }}>{d.sp}</span>}
                      </Chk>
                    ))}
                    <R lbl="Past Surgeries Done:" val={v(pm.past_surgeries_done)}/>
                    <R lbl="Date Done:" val={v(pm.date_surgery_done)}/>
                  </Box>
                  <Box>
                    <BT>FAMILY HISTORY</BT>
                    {DISEASES_FH.map(d=>(
                      <Chk key={d.k} on={!!fh[d.k]}>
                        {d.l}{d.sp && <span style={{ marginLeft:2, borderBottom:'1px solid #555', minWidth:22, display:'inline-block', fontSize:5.3 }}>{d.sp}</span>}
                      </Chk>
                    ))}
                  </Box>
                  <Box style={{ flex:1 }}>
                    <BT>PERSONAL / SOCIAL HISTORY</BT>
                    {[
                      ['Smoking',        so.smoking,        'No. of pack-years:',   so.smoking_packs_per_year],
                      ['Alcohol',        so.alcohol,        'No. of servings/day:', so.alcohol_servings_day],
                      ['Illicit Drugs',  so.illicit_drugs,  null, null],
                      ['Sexually Active',so.sexually_active,null, null],
                    ].map(([lbl,val,subLbl,subVal])=>(
                      <div key={String(lbl)} style={{ marginBottom:2 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:5.8 }}>
                          <span style={{ minWidth:52 }}>{lbl}</span>
                          {['Yes','No','Quit'].map(o=>(
                            <span key={o} style={{ display:'flex', alignItems:'center', gap:1 }}>
                              <CB on={val===o}/>{o}
                            </span>
                          ))}
                        </div>
                        {subLbl && (
                          <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginLeft:4, fontSize:5.5 }}>
                            <span>{subLbl}</span>
                            <span style={{ borderBottom:'1px solid #555', minWidth:26, paddingBottom:.5 }}>{v(subVal)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </Box>
                </div>

                {/* SUB-B */}
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <Box>
                    <BT>IMMUNIZATION</BT>
                    <div style={{ fontWeight:700, fontSize:5.8, marginBottom:.5 }}>Children</div>
                    <TC3>
                      {[['ECG',null],['OPV1',im.opv1],['OPV2',im.opv2],['OPV3',im.opv3],
                        ['DPT1',im.dpt1],['DPT2',im.dpt2],['DPT3',im.dpt3],
                        ['Hepa1',im.hapa1],['Hepa2',im.hapa2],['Hepa3',im.hapa3],
                        ['Measles',im.measles],['Varicella',im.varicella],['BCG',im.bcg],
                      ].map(([l,val])=>(
                        <Chk key={String(l)} on={!!val}><span style={{ fontSize:5.5 }}>{l}</span></Chk>
                      ))}
                    </TC3>
                    <div style={{ fontWeight:700, fontSize:5.8, marginTop:1, marginBottom:.5 }}>Adult</div>
                    <div style={{ display:'flex', gap:5 }}>
                      {[['HPV',im.hpv],['MMR',im.mmr],['None',im.none_adult]].map(([l,val])=>(
                        <Chk key={String(l)} on={!!val}><span style={{ fontSize:5.5 }}>{l}</span></Chk>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, fontSize:5.8, marginTop:1, marginBottom:.5 }}>Elderly and Immunocompromised</div>
                    <Chk on={!!im.pneumococcal_vaccine}><span style={{ fontSize:5.5 }}>Pneumococcal Vaccine</span></Chk>
                    <Chk on={!!im.flu_vaccine}><span style={{ fontSize:5.5 }}>Flu Vaccine</span></Chk>
                    <R lbl="Others:" val={v(im.others)}/>
                  </Box>
                  <Box>
                    <BT>FAMILY PLANNING</BT>
                    <Chk on={fp.has_fp_counseling}>With access to family planning counseling</Chk>
                    <R lbl="Provider:" val={v(fp.provider)}/>
                    <R lbl="Birth Control Method used:" val={v(fp.birth_control_method)}/>
                  </Box>
                  <Box>
                    <BT>MENSTRUAL HISTORY</BT>
                    <R lbl="Menarche:" val={mh.menarche_age?`${mh.menarche_age}`:''} unit="yrs old"/>
                    <R lbl="Onset of sexual intercourse:" val={mh.onset_sexual_intercourse_age?`${mh.onset_sexual_intercourse_age}`:''} unit="yrs old"/>
                    <R lbl="Last Menstrual Period:" val={v(mh.last_menstrual_period)}/>
                    <R lbl="Period Duration:" val={mh.period_duration_days?`${mh.period_duration_days}`:''} unit="days"/>
                    <R lbl="No. of pads/day:" val={v(mh.pads_per_day)}/>
                    <R lbl="Interval cycle:" val={mh.interval_cycle_days?`${mh.interval_cycle_days}`:''} unit="days"/>
                    <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:5.8, marginBottom:1 }}>
                      <span>Menopause:</span><CB on={mh.menopause===true}/>Yes <CB on={mh.menopause===false}/>No
                    </div>
                    <R lbl="Age at Menopause:" val={mh.age_at_menopause?`${mh.age_at_menopause}`:''} unit="years"/>
                  </Box>
                  <Box>
                    <BT>PREGNANCY HISTORY</BT>
                    <div style={{ display:'flex', gap:2, fontSize:5.8, marginBottom:1, flexWrap:'wrap' }}>
                      {[['G',pr.gravida],['P',pr.para],['(T',pr.term],['P',pr.preterm],['A',pr.abortion],['L',pr.living]].map(([l,val],i)=>(
                        <span key={i} style={{ display:'flex', alignItems:'flex-end', gap:1 }}>
                          <b>{l}</b>
                          <span style={{ borderBottom:'1px solid #555', minWidth:11, paddingBottom:.5 }}>{v(val)}</span>
                        </span>
                      ))}
                      <b>)</b>
                    </div>
                    <R lbl="Type of Delivery:" val={v(pr.type_of_delivery)}/>
                    <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:5.8 }}>
                      <span>Pregnancy Induced Hypertension:</span>
                      <CB on={pr.pregnancy_include_hypertension===true}/>Yes
                      <CB on={pr.pregnancy_include_hypertension===false}/>No
                    </div>
                  </Box>
                  <Box>
                    <BT>PERTINENT PHYSICAL EXAMINATION FINDINGS</BT>
                    <TC2>
                      <R lbl="Height:" val={ph.height_cm?`${ph.height_cm}`:''} unit="cm"/>
                      <R lbl="BP:" val={v(ph.blood_pressure_mmhg)} unit="mmHg"/>
                      <R lbl="Weight:" val={ph.weight_kg?`${ph.weight_kg}`:''} unit="kg"/>
                      <R lbl="HR:" val={ph.heart_rate_bpm?`${ph.heart_rate_bpm}`:''} unit="bpm"/>
                      <R lbl="Temp:" val={ph.temperature_c?`${ph.temperature_c}`:''} unit="°C"/>
                      <R lbl="RR:" val={ph.respiratory_rate_cpm?`${ph.respiratory_rate_cpm}`:''} unit="cpm"/>
                    </TC2>
                    <div style={{ fontSize:5.8, marginTop:1 }}>
                      Blood Type:&nbsp;
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=>(
                        <span key={t} style={{ marginRight:2, fontSize:5.5 }}><CB on={ph.blood_type===t}/>{t}</span>
                      ))}
                    </div>
                    <div style={{ fontSize:5.8, marginTop:.5 }}>
                      Visual Acuity: Right Eye:
                      <span style={{ borderBottom:'1px solid #555', display:'inline-block', minWidth:20 }}>{v(ph.visual_acuity_right_eye)}</span>
                      &nbsp;Left Eye:
                      <span style={{ borderBottom:'1px solid #555', display:'inline-block', minWidth:20 }}>{v(ph.visual_acuity_left_eye)}</span>
                    </div>
                  </Box>
                  <Box style={{ flex:1 }}>
                    <BT>PEDIA CLIENT AGED 0-24 MOS</BT>
                    {[
                      ['Body Length:',             pe.body_length_cm],
                      ['Head Circumference:',      pe.head_circumference_cm],
                      ['Chest Circumference:',     pe.chest_circumference_cm],
                      ['Abdominal Circumference:', pe.abdominal_circumference_cm],
                      ['Hip Circumference:',       pe.hip_circumference_cm],
                      ['Mid-Upper Arm Circ:',      pe.mid_upper_arm_circ_cm],
                      ['Limbs Circumference:',     pe.limbs_circumference_cm],
                    ].map(([l,val])=>( <R key={String(l)} lbl={String(l)} val={v(val)} unit="cm"/> ))}
                  </Box>
                </div>
              </div>
            </div>{/* end LEFT */}

            {/* ══════════  RIGHT HALF  ══════════ */}
            <div style={{ flex:1, paddingLeft:'2mm', display:'flex', gap:2, minHeight:0 }}>

              {/* inner 2-col */}
              <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, minHeight:0, alignContent:'start' }}>

                {/* COL-C: Systems */}
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <GH>PERTINENT FINDINGS PER SYSTEM — PHYSICAL EXAMINATION</GH>
                  <Box>
                    <div style={{ fontWeight:700, fontSize:10, marginBottom:.5 }}>GENERAL SURVEY</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <Chk on={fi.awake_and_alert}>Awake and alert</Chk>
                      <Chk on={fi.altered_sensorium}>Altered sensorium</Chk>
                    </div>
                  </Box>
                  {SYSTEMS.map(s=>(
                    <Box key={s.title}>
                      <div style={{ fontWeight:700, fontSize:10, marginBottom:.20 }}>{s.title}</div>
                      <TC2>{s.items.map(([k,l])=>( <Chk key={k} on={!!fi[k]}>{l}</Chk> ))}</TC2>
                      {fi[s.ok] && <R lbl="Others:" val={fi[s.ok]}/>}
                    </Box>
                  ))}
                  <Box>
                    <div style={{ fontWeight:700, fontSize:8, marginBottom:1.10 }}>FIRST PATIENT ENCOUNTER ASSESSMENT:</div>
                    {[
                      ['encounter_generally_well',       'GENERALLY WELL',              '(fill out and sign eKAS)'],
                      ['encounter_primary_care_consult', 'FOR PRIMARY CARE CONSULTATION','(fill out KONSULTA Referral Slip)'],
                      ['encounter_diagnostic_exam',      'FOR DIAGNOSTIC EXAMINATION',  '(fill out Diagnostic Request Form)'],
                    ].map(([k,lbl,note])=>(
                      <div key={k} style={{ display:'flex', alignItems:'center', gap:2, fontSize:7, marginBottom:1 }}>
                        <CB on={!!fi[k]}/><b>{lbl}</b> <i style={{ color:'#555', fontSize:5.3 }}>{note}</i>
                      </div>
                    ))}
                  </Box>
                  <div style={{
                    border:'1px solid #333',
                    padding:'3px',
                    marginTop:'auto',
                    display:'inline-flex',
                    alignItems:'center',
                    gap:'4px',
                    width:'fit-content',
                    alignSelf:'flex-start'
                  }}>
                    <img src="/logo.jpg" alt="" style={{ width:32, height:32, objectFit:'contain' }}/>
                    <div style={{ fontSize:'5.5pt', lineHeight:1.1 }}>
                      Province of Quezon<br/>
                      <b>PROVINCE-WIDE HEALTH SYSTEM</b><br/>
                      PAHS FORM 5. Version 5
                    </div>
                  </div>
                </div>

                {/* COL-D: NCD + Signature only (PhilHealth slip moved to the strip) */}
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <div style={{ border:'2px solid #1a6b2e', padding:'2px 3px', marginBottom:2, flex:1, display:'flex', flexDirection:'column' }}>
                    <div style={{ fontWeight:900, fontSize:6.3, color:'#1a6b2e', textAlign:'center', marginBottom:1.5 }}>
                      NCD HIGH-RISK ASSESSMENT<br/>(FOR 20 YRS OLD AND ABOVE)
                    </div>
                    {[
                      ['eats_processed_food_weekly',  '1. Eats processed food (ex. Instant Noodles, Burgers, Fries, Fried Chicken Sign, etc) and ihaw-ihaw Weekly?'],
                      ['eats_fruits_vegetables_daily','2. Eats 3 servings of fruits and vegetable Daily?'],
                      ['does_physical_activity_weekly','3. Does at least 2.5 hours of moderate-intensity physical activity every week?'],
                    ].map(([k,q])=>(
                      <div key={k} style={{ marginBottom:2, fontSize:5.8 }}>
                        <div style={{ lineHeight:1.25, marginBottom:.5 }}>{q}</div>
                        <div style={{ display:'flex', gap:10, marginLeft:5 }}>
                          <Chk on={nd[k]===true}>Yes</Chk>
                          <Chk on={nd[k]===false}>No</Chk>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginBottom:2, fontSize:5.8 }}>
                      <div style={{ marginBottom:.5 }}>4. Was patient diagnosed as having Diabetes?</div>
                      <div style={{ display:'flex', gap:6, marginLeft:5, flexWrap:'wrap', fontSize:5.5, marginBottom:.5 }}>
                        <Chk on={nd.diagnosed_with_diabetes}>Yes</Chk>
                        <Chk on={nd.diabetes_do_not_know}>No / "Do not know"</Chk>
                      </div>
                      <div style={{ fontSize:5.5, marginLeft:5 }}>
                        If YES: <CB on={nd.diabetes_with_medication}/>With Medication &nbsp;
                        <CB on={nd.diabetes_without_medication}/>Without Medication
                      </div>
                    </div>
                    <div style={{ marginBottom:2, fontSize:5.8 }}>
                      <div style={{ marginBottom:.5 }}>5. Does the patient have any of the following symptoms?</div>
                      <div style={{ display:'flex', gap:5, marginLeft:5, fontSize:5.5 }}>
                        <Chk on={nd.symptom_polyphagia}>Polyphagia</Chk>
                        <Chk on={nd.symptom_polydipsia}>Polydipsia</Chk>
                        <Chk on={nd.symptom_polyuria}>Polyuria</Chk>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, fontSize:5.5, marginBottom:2 }}>
                      {[
                        ['FBS/RBS:',          nd.fbs_rbs_value,          nd.fbs_rbs_date],
                        ['Total Cholesterol:',nd.total_cholesterol_value, nd.total_cholesterol_date],
                        ['Urine Ketone:',     nd.urine_ketone_value,      nd.urine_ketone_date],
                        ['Urine Protein:',    nd.urine_protein_value,     nd.urine_protein_date],
                      ].map(([l,val,dt])=>(
                        <div key={String(l)}>
                          <R lbl={String(l)} val={v(val)}/><R lbl="Date taken:" val={v(dt)}/>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, fontSize:5.8, marginBottom:.5 }}>
                      Angina or Heart Attack &nbsp;<CB on={nd.angina_yes}/>Yes &nbsp;<CB on={nd.angina_no}/>No
                    </div>
                    <div style={{ fontSize:5.3 }}>
                      {[
                        ['angina_has_chest_pain',        '1. Have had any pain/discomfort pressure/heaviness in your chest?'],
                        ['angina_center_left_chest',      '2. Do you get the pain in the center/left chest or left arm?'],
                        ['angina_on_walking',             '3. Do you get it when you walk uphill or hurry?'],
                        ['angina_slows_down_walking',     '4. Do you slowdown if you get the pain while walking?'],
                        ['angina_pain_goes_away_standing','5. Does the pain go away if you stand still or get medication?'],
                        ['angina_pain_gone_10_minutes',   '6. Does the pain go away in <10 minutes?'],
                        ['angina_severe_30min_or_more',   '7. Have you ever had severe chest pain lasting half an hour or more?'],
                      ].map(([k,q])=>(
                        <div key={k} style={{ marginBottom:1.5 }}>
                          <div style={{ lineHeight:1.25, marginBottom:.3 }}>{q}</div>
                          <div style={{ display:'flex', gap:8, marginLeft:5 }}>
                            <Chk on={nd[k]===true}>Yes</Chk>
                            <Chk on={nd[k]===false}>No</Chk>
                          </div>
                        </div>
                      ))}
                      <div style={{ fontSize:5, fontStyle:'italic', marginBottom:1.5 }}>
                        * If YES to number 3, 4 &amp; 5 or 7, the patient have ANGINA/HEART ATTACK, must see a doctor.
                      </div>
                    </div>
                    <div style={{ fontWeight:700, fontSize:5.8, marginBottom:.5 }}>Stroke and TIA</div>
                    <div style={{ fontSize:5.3, lineHeight:1.25, marginBottom:.5 }}>
                      8. Have you ever had difficulty in talking, weakness of arms or legs on the one side of the body?
                    </div>
                    <div style={{ display:'flex', gap:8, marginLeft:5, marginBottom:1, fontSize:5.3 }}>
                      <Chk on={nd.stroke_tia_difficulty_talking===true}>Yes</Chk>
                      <Chk on={nd.stroke_tia_difficulty_talking===false}>No</Chk>
                    </div>
                    <div style={{ fontSize:5, fontStyle:'italic', marginBottom:2 }}>
                      * If YES to number 8, you may have TIA/Stroke, must seek a doctor.
                    </div>
                    <div style={{ border:'1px solid #333', padding:2 }}>
                      <div style={{ fontWeight:700, fontSize:5.8, marginBottom:.5 }}>RISK LEVEL</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:3, fontSize:5.3 }}>
                        {['<10%','10% to <20%','20% to <30%','30% to <40%','>40%'].map(r=>(
                          <Chk key={r} on={nd.risk_level===r}>{r}</Chk>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Signature */}
                  <Box style={{ flexShrink:0 }}>
                    <div style={{ fontWeight:700, fontSize:6, marginBottom:1.5 }}>FIRST PATIENT ENCOUNTER</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
                      {['SIGNATURE','NAME','POSITION','DATE'].map(l=>(
                        <div key={l}>
                          <div style={{ borderBottom:'1px solid #333', height:11, marginBottom:.5 }}/>
                          <div style={{ fontSize:4.8, color:'#555' }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </Box>
                  {/* PhilHealth slip removed from here — moved to far-right strip */}
                </div>
              </div>

{/* ══════════  FAR-RIGHT STRIP — PhilHealth Slip vertical ══════════ */}
<div style={{
  width: 60,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  border: '2px solid #333',
  overflow: 'hidden',
}}>

  {/* TOP HALF — Confirmation Slip */}
  <div style={{
    flex: 1,
    borderBottom: '2px dashed #666',
    display: 'flex',
    alignItems: 'stretch',
    overflow: 'hidden',
    minHeight: 0,
  }}>
    {/* Green title rotated */}
    <div style={{
      writingMode: 'vertical-lr',
      transform: 'rotate(180deg)',
      background: '#1a6b2e',
      color: '#fff',
      fontWeight: 900,
      fontSize: 5.5,
      padding: '3px 2px',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      borderRight: '1px solid #aaa',
    }}>
      PHILHEALTH KONSULTA REGISTRATION CONFIRMATION SLIP
    </div>

    {/* Logo */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2px',
      flexShrink: 0,
      borderRight: '1px solid #ccc',
    }}>
      <img src="/logo.jpg" alt="" style={{ width:12, height:12, objectFit:'contain' }}/>
    </div>

    {/* Fields */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minWidth: 0 }}>

      {/* FULL NAME */}
      <div style={{ flex: 2, borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.3, fontWeight: 700, background: '#f0f0f0',
          padding: '1px 1px', textAlign: 'center', flexShrink: 0,
          borderBottom: '1px solid #ccc', whiteSpace: 'nowrap',
        }}>FULL NAME</div>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.8, flex: 1, padding: '1px 1px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {[v(patient.last_name), v(patient.first_name), v(patient.middle_name)].filter(Boolean).join(', ') || '—'}
        </div>
      </div>

      {/* PIN */}
      <div style={{ flex: 1, borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.3, fontWeight: 700, background: '#f0f0f0',
          padding: '1px 1px', textAlign: 'center', flexShrink: 0,
          borderBottom: '1px solid #ccc', whiteSpace: 'nowrap',
        }}>PIN</div>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.8, flex: 1, padding: '1px 1px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {v(patient.philhealth_pin) || '—'}
        </div>
      </div>

      {/* PROVIDER */}
      <div style={{ flex: 1, borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.3, fontWeight: 700, background: '#f0f0f0',
          padding: '1px 1px', textAlign: 'center', flexShrink: 0,
          borderBottom: '1px solid #ccc', whiteSpace: 'nowrap',
        }}>PROVIDER</div>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.8, flex: 1, padding: '1px 1px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {v(fp.provider) || '—'}
        </div>
      </div>

      {/* ADDRESS */}
      <div style={{ flex: 1, borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.3, fontWeight: 700, background: '#f0f0f0',
          padding: '1px 1px', textAlign: 'center', flexShrink: 0,
          borderBottom: '1px solid #ccc', whiteSpace: 'nowrap',
        }}>ADDRESS</div>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.8, flex: 1, padding: '1px 1px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {[v(patient.purok), v(patient.barangay), v(patient.municipality)].filter(Boolean).join(', ') || '—'}
        </div>
      </div>

      {/* AUTHORIZED PERSONNEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4, fontWeight: 700, background: '#f0f0f0',
          padding: '1px 1px', textAlign: 'center', flexShrink: 0,
          borderBottom: '1px solid #ccc', whiteSpace: 'nowrap',
        }}>AUTHORIZED PERSONNEL</div>
        <div style={{ flex: 1 }}/>
      </div>

    </div>
  </div>

  {/* BOTTOM HALF — Authorization Transaction Code */}
  <div style={{
    flex: 1,
    display: 'flex',
    alignItems: 'stretch',
    overflow: 'hidden',
    minHeight: 0,
  }}>
    {/* Green title rotated */}
    <div style={{
      writingMode: 'vertical-lr',
      transform: 'rotate(180deg)',
      background: '#1a6b2e',
      color: '#fff',
      fontWeight: 900,
      fontSize: 5.5,
      padding: '3px 2px',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      borderRight: '1px solid #aaa',
    }}>
      AUTHORIZATION TRANSACTION CODE
    </div>

    {/* Logo */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2px',
      flexShrink: 0,
      borderRight: '1px solid #ccc',
    }}>
      <img src="/logo.jpg" alt="" style={{ width:12, height:12, objectFit:'contain' }}/>
    </div>

    {/* Fields */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minWidth: 0 }}>

      {/* AT CODE */}
      <div style={{ flex: 2, borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.3, fontWeight: 700, background: '#f0f0f0',
          padding: '1px 1px', textAlign: 'center', flexShrink: 0,
          borderBottom: '1px solid #ccc', whiteSpace: 'nowrap',
        }}>AT CODE</div>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.8, flex: 1, padding: '1px 1px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {v(kr.at_code) || '—'}
        </div>
      </div>

      {/* DATE OF APPOINTMENT */}
      <div style={{ flex: 2, borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.3, fontWeight: 700, background: '#f0f0f0',
          padding: '1px 1px', textAlign: 'center', flexShrink: 0,
          borderBottom: '1px solid #ccc', whiteSpace: 'nowrap',
        }}>DATE OF APPOINTMENT</div>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4.8, flex: 1, padding: '1px 1px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {v(kr.date_of_appointment) || '—'}
        </div>
      </div>

      {/* AUTHORIZED PERSONNEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
          fontSize: 4, fontWeight: 700, background: '#f0f0f0',
          padding: '1px 1px', textAlign: 'center', flexShrink: 0,
          borderBottom: '1px solid #ccc', whiteSpace: 'nowrap',
        }}>AUTHORIZED PERSONNEL</div>
        <div style={{ flex: 1 }}/>
      </div>

    </div>
  </div>

</div>{/* end far-right strip */}
</div>
</div>

        </div>{/* end pa */}
      </div>
    </div>
  )
}