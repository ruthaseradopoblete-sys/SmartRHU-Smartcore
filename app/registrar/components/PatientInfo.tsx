'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PatientInfo({ patient, onClose }: { patient: any; onClose: () => void }) {
  const [data, setData] = useState<any>({})
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
        konsulta: kr.data, pastMed: pmh.data, famHist: fh.data,
        social: psh.data, fp: fp.data, menstrual: mh.data,
        preg: preg.data, immun: imm.data, physical: pef.data,
        pedia: pedia.data, findings: pfps.data, ncd: ncd.data,
      })
      setLoading(false)
    })
  }, [patient.id])

  const GN = '#1a6b2e'
  const cell: React.CSSProperties = { border:'1px solid #aaa', padding:'2px 4px', fontSize:9, verticalAlign:'top' }
  const hdr:  React.CSSProperties = { ...cell, background:GN, color:'#fff', fontWeight:700, textAlign:'center' as const }
  const lbl:  React.CSSProperties = { ...cell, fontWeight:700, color:GN, whiteSpace:'nowrap' as const, background:'#f0faf0' }
  const val:  React.CSSProperties = { ...cell, color:'#111' }
  const cbSq = (checked: boolean | null) => (
    <span style={{ width:9, height:9, border:'1px solid #555', display:'inline-block', background: checked ? GN : '#fff' }} />
  )
  const cbLabel = (checked: boolean | null, label: string) => (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, marginRight:6 }}>
      <span style={{ width:9, height:9, border:'1px solid #555', display:'inline-block', background: checked ? GN : '#fff', flexShrink:0 }} />
      {label}
    </span>
  )
  const v = (val: any) => (val !== null && val !== undefined && val !== '') ? String(val) : '—'
  const yesno = (val: boolean | null) => val === true ? 'Yes' : val === false ? 'No' : '—'
  const SH = ({ title }: { title: string }) => (
    <div style={{ background:GN, color:'#fff', padding:'3px 6px', fontWeight:700, fontSize:9, margin:'4px 0 2px' }}>{title}</div>
  )

  const DISEASES = ['allergy','asthma','cancer','cerebrovascular_disease','coronary_artery_disease','diabetes_mellitus','emphysema','epilepsy_seizure','hepatitis','hyperlipidemia','hypertension','peptic_ulcer','pneumonia','thyroid_disease','ptb','urinary_tract_infection','mental_illness','others']
  const DIS_LABELS: Record<string,string> = {
    allergy:'Allergy', asthma:'Asthma', cancer:'Cancer', cerebrovascular_disease:'Cerebrovascular Dis.',
    coronary_artery_disease:'Coronary Artery Dis.', diabetes_mellitus:'Diabetes Mellitus', emphysema:'Emphysema',
    epilepsy_seizure:'Epilepsy/Seizure', hepatitis:'Hepatitis', hyperlipidemia:'Hyperlipidemia',
    hypertension:'Hypertension', peptic_ulcer:'Peptic Ulcer', pneumonia:'Pneumonia',
    thyroid_disease:'Thyroid Disease', ptb:'PTB', urinary_tract_infection:'UTI',
    mental_illness:'Mental Illness', others:'Others'
  }

  const pm = data.pastMed  || {}
  const fh = data.famHist  || {}
  const so = data.social   || {}
  const fp = data.fp       || {}
  const mh = data.menstrual|| {}
  const pr = data.preg     || {}
  const im = data.immun    || {}
  const ph = data.physical || {}
  const pe = data.pedia    || {}
  const fi = data.findings || {}
  const nd = data.ncd      || {}
  const kr = data.konsulta || {}

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:3000, padding:16, overflowY:'auto' }}>
      <div style={{ background:'#fff', width:'100%', maxWidth:1050, borderRadius:6, position:'relative' }}>

        <div className="no-print" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderBottom:`2px solid ${GN}`, background:'#f0faf0' }}>
          <h2 style={{ margin:0, color:GN, fontSize:15 }}>Patient Health Record</h2>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => window.print()} style={{ background:GN, color:'#fff', border:'none', padding:'7px 18px', borderRadius:5, fontWeight:700, cursor:'pointer', fontSize:12 }}>🖨️ Print</button>
            <button onClick={onClose} style={{ background:'#8B1A1A', color:'#fff', border:'none', padding:'7px 18px', borderRadius:5, fontWeight:700, cursor:'pointer', fontSize:12 }}>✕ Close</button>
          </div>
        </div>

        <style>{`
          @media print {
            .no-print { display: none !important; }
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: fixed; left:0; top:0; width:100%; }
          }
        `}</style>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:GN }}>Loading records...</div>
        ) : (
          <div className="print-area" style={{ padding:'10px 14px', fontFamily:'Arial, sans-serif', fontSize:9 }}>
            {/* HEADER */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, borderBottom:`2px solid ${GN}`, paddingBottom:6, marginBottom:6 }}>
              <img src="/logo.jpg" alt="Logo" style={{ width:50, height:50, objectFit:'contain' }} />
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:900, fontSize:14, color:GN }}>MUNICIPAL HEALTH OFFICE — LOPEZ, QUEZON</div>
                <div style={{ fontSize:10, color:'#555' }}>Patient Health Assessment Record</div>
                <div style={{ fontSize:9, color:'#888' }}>Printed: {new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</div>
              </div>
            </div>

            {/* 3-COLUMN LAYOUT */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>

              {/* COL 1 */}
              <div>
                <SH title="GENERAL DATA AND KONSULTA REGISTRATION" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    <tr><td style={lbl}>Full Name:</td><td colSpan={3} style={val}>{patient.last_name}, {patient.first_name} {patient.middle_name||''}</td></tr>
                    <tr><td style={lbl}>Age:</td><td style={val}>{v(patient.age)}</td><td style={lbl}>Sex:</td><td style={val}>{v(patient.sex)}</td></tr>
                    <tr><td style={lbl}>Birthdate:</td><td colSpan={3} style={val}>{v(patient.birthdate)}</td></tr>
                    <tr><td style={lbl}>Purok:</td><td colSpan={3} style={val}>{v(patient.purok)}</td></tr>
                    <tr><td style={lbl}>Barangay:</td><td colSpan={3} style={val}>{v(patient.barangay)}</td></tr>
                    <tr><td style={lbl}>Municipality:</td><td colSpan={3} style={val}>{v(patient.municipality)}</td></tr>
                    <tr><td style={lbl}>Contact #:</td><td colSpan={3} style={val}>{v(patient.contact_number)}</td></tr>
                    <tr><td style={lbl}>Email:</td><td colSpan={3} style={val}>{v(patient.email)}</td></tr>
                    <tr><td style={lbl}>PhilHealth PIN:</td><td colSpan={3} style={val}>{v(patient.philhealth_pin)}</td></tr>
                    <tr><td style={lbl}>Member Type:</td><td colSpan={3} style={val}>{v(patient.member_type)}{patient.member_type_specify?` (${patient.member_type_specify})`:''}</td></tr>
                    <tr><td style={lbl}>Reg. Date:</td><td style={val}>{v(kr.registration_date)}</td><td style={lbl}>KKP:</td><td style={val}>{cbLabel(kr.kkp_sign,'Yes')}</td></tr>
                    <tr><td style={lbl}>Facility 1:</td><td colSpan={3} style={val}>{v(kr.facility_choice_1)}</td></tr>
                    <tr><td style={lbl}>Facility 2:</td><td colSpan={3} style={val}>{v(kr.facility_choice_2)}</td></tr>
                    <tr><td style={lbl}>Facility 3:</td><td colSpan={3} style={val}>{v(kr.facility_choice_3)}</td></tr>
                    <tr><td style={lbl}>AT Code:</td><td style={val}>{v(kr.at_code)}</td><td style={lbl}>Appt:</td><td style={val}>{v(kr.date_of_appointment)}</td></tr>
                  </tbody>
                </table>

                <SH title="PAST MEDICAL HISTORY" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    {DISEASES.map(d => (
                      <tr key={d}>
                        <td style={{ ...cell, width:12 }}>{cbSq(pm[d])}</td>
                        <td style={val}>{DIS_LABELS[d]}
                          {d==='allergy'&&pm.allergy_specify?` (${pm.allergy_specify})`:''}
                          {d==='cancer'&&pm.cancer_specify?` (${pm.cancer_specify})`:''}
                          {d==='hepatitis'&&pm.hepatitis_specify?` (${pm.hepatitis_specify})`:''}
                          {d==='hypertension'&&pm.hypertension_highest_bp?` BP:${pm.hypertension_highest_bp}`:''}
                          {d==='ptb'&&pm.ptb_specify_extra?` (${pm.ptb_specify_extra})`:''}
                        </td>
                      </tr>
                    ))}
                    <tr><td style={lbl}>Surgery:</td><td style={val}>{v(pm.past_surgeries_done)}</td></tr>
                    <tr><td style={lbl}>Date Done:</td><td style={val}>{v(pm.date_surgery_done)}</td></tr>
                  </tbody>
                </table>

                <SH title="FAMILY HISTORY" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    {DISEASES.map(d => (
                      <tr key={d}>
                        <td style={{ ...cell, width:12 }}>{cbSq(fh[d])}</td>
                        <td style={val}>{DIS_LABELS[d]}
                          {d==='allergy'&&fh.allergy_specify?` (${fh.allergy_specify})`:''}
                          {d==='cancer'&&fh.cancer_specify?` (${fh.cancer_specify})`:''}
                          {d==='hepatitis'&&fh.hepatitis_specify?` (${fh.hepatitis_specify})`:''}
                          {d==='hypertension'&&fh.hypertension_highest_bp?` BP:${fh.hypertension_highest_bp}`:''}
                          {d==='ptb'&&fh.ptb_specify_extra?` (${fh.ptb_specify_extra})`:''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <SH title="PERSONAL / SOCIAL HISTORY" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    {[['Smoking','smoking'],['Alcohol','alcohol'],['Illicit Drugs','illicit_drugs'],['Sexually Active','sexually_active']].map(([label,key])=>(
                      <tr key={key}><td style={lbl}>{label}:</td>
                      <td style={val}>{v(so[key])}
                        {key==='smoking'&&so.smoking_packs_per_year?` | ${so.smoking_packs_per_year} pks/yr`:''}
                        {key==='alcohol'&&so.alcohol_servings_day?` | ${so.alcohol_servings_day} srv/day`:''}
                      </td></tr>
                    ))}
                  </tbody>
                </table>

                <SH title="IMMUNIZATION" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    <tr><td style={hdr} colSpan={4}>Children</td></tr>
                    <tr><td style={val}>{cbLabel(im.bcg,'BCG')}</td><td style={val}>{cbLabel(im.opv1,'OPV1')}</td><td style={val}>{cbLabel(im.opv2,'OPV2')}</td><td style={val}>{cbLabel(im.opv3,'OPV3')}</td></tr>
                    <tr><td style={val}>{cbLabel(im.dpt1,'DPT1')}</td><td style={val}>{cbLabel(im.dpt2,'DPT2')}</td><td style={val}>{cbLabel(im.dpt3,'DPT3')}</td><td style={val}>{cbLabel(im.measles,'Measles')}</td></tr>
                    <tr><td style={val}>{cbLabel(im.hapa1,'Hapa1')}</td><td style={val}>{cbLabel(im.hapa2,'Hapa2')}</td><td style={val}>{cbLabel(im.hapa3,'Hapa3')}</td><td style={val}>{cbLabel(im.varicella,'Varicella')}</td></tr>
                    <tr><td style={hdr} colSpan={4}>Adult</td></tr>
                    <tr><td style={val}>{cbLabel(im.hpv,'HPV')}</td><td style={val}>{cbLabel(im.mmr,'MMR')}</td><td colSpan={2} style={val}>{cbLabel(im.none_adult,'None')}</td></tr>
                    <tr><td style={hdr} colSpan={4}>Elderly/Immunocompromised</td></tr>
                    <tr><td colSpan={2} style={val}>{cbLabel(im.pneumococcal_vaccine,'Pneumococcal')}</td><td colSpan={2} style={val}>{cbLabel(im.flu_vaccine,'Flu Vaccine')}</td></tr>
                    {im.others&&<tr><td style={lbl}>Others:</td><td colSpan={3} style={val}>{im.others}</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* COL 2 */}
              <div>
                <SH title="PHYSICAL EXAMINATION" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    <tr><td style={lbl}>Height:</td><td style={val}>{ph.height_cm?`${ph.height_cm} cm`:'—'}</td><td style={lbl}>BP:</td><td style={val}>{v(ph.blood_pressure_mmhg)}</td></tr>
                    <tr><td style={lbl}>Weight:</td><td style={val}>{ph.weight_kg?`${ph.weight_kg} kg`:'—'}</td><td style={lbl}>HR:</td><td style={val}>{ph.heart_rate_bpm?`${ph.heart_rate_bpm} bpm`:'—'}</td></tr>
                    <tr><td style={lbl}>Temp:</td><td style={val}>{ph.temperature_c?`${ph.temperature_c}°C`:'—'}</td><td style={lbl}>RR:</td><td style={val}>{ph.respiratory_rate_cpm?`${ph.respiratory_rate_cpm} cpm`:'—'}</td></tr>
                    <tr><td style={lbl}>Blood Type:</td><td colSpan={3} style={val}>{v(ph.blood_type)}</td></tr>
                    <tr><td style={lbl}>Visual R:</td><td style={val}>{v(ph.visual_acuity_right_eye)}</td><td style={lbl}>Visual L:</td><td style={val}>{v(ph.visual_acuity_left_eye)}</td></tr>
                  </tbody>
                </table>

                <SH title="PEDIA (0-24 MOS)" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    {[['Body Length','body_length_cm'],['Head Circ.','head_circumference_cm'],['Chest Circ.','chest_circumference_cm'],['Abdominal Circ.','abdominal_circumference_cm'],['Hip Circ.','hip_circumference_cm'],['Mid-Upper Arm','mid_upper_arm_circ_cm'],['Limbs Circ.','limbs_circumference_cm']].map(([label,key])=>(
                      <tr key={key}><td style={lbl}>{label}:</td><td style={val}>{pe[key]?`${pe[key]} cm`:'—'}</td></tr>
                    ))}
                  </tbody>
                </table>

                <SH title="PERTINENT FINDINGS PER SYSTEM" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    <tr><td style={hdr} colSpan={2}>General Survey</td></tr>
                    <tr><td style={val}>{cbLabel(fi.awake_and_alert,'Awake & Alert')}</td><td style={val}>{cbLabel(fi.altered_sensorium,'Altered Sensorium')}</td></tr>
                    {[
                      ['A. HEENT',[['heent_essentially_normal','Essentially Normal'],['heent_abnormal_papillary','Abnormal Papillary'],['heent_cervical_lymphadenopathy','Cervical Lymphadenopathy'],['heent_dry_mucus_membrane','Dry Mucus Membrane'],['heent_icteric_sclerae','Icteric Sclerae'],['heent_pale_conjunctiva','Pale Conjunctiva'],['heent_sunken_eyeball','Sunken Eyeball'],['heent_sunken_fontanelle','Sunken Fontanelle']],fi.heent_others],
                      ['B. Chest/Breast/Lungs',[['chest_essentially_normal','Essentially Normal'],['chest_asymmetrical_expansion','Asymm. Expansion'],['chest_decreased_breath_sound','Decr. Breath Sound'],['chest_wheeze','Wheeze'],['chest_crackle_rales','Crackle/Rales'],['chest_retractions','Retractions'],['chest_lumps_over_breast','Lumps Over Breast']],fi.chest_other],
                      ['C. Heart',[['heart_essentially_normal','Essentially Normal'],['heart_displaced_apex_beat','Displaced Apex Beat'],['heart_heave_trills','Heave Trills'],['heart_irregular_rhythm','Irregular Rhythm'],['heart_muffled_sounds','Muffled Sounds'],['heart_murmurs','Murmurs'],['heart_pericardial_bulge','Pericardial Bulge']],fi.heart_others],
                      ['D. Abdomen',[['abdomen_essentially_normal','Essentially Normal'],['abdomen_rigidity','Rigidity'],['abdomen_tenderness','Tenderness'],['abdomen_hyperactive_bowel','Hyperactive Bowel'],['abdomen_palpable_masses','Palpable Mass/es'],['abdomen_tympanitic_dull','Tympanitic/Dull'],['abdomen_uterine_contraction','Uterine Contraction']],fi.abdomen_others],
                      ['E. Genitourinary',[['gu_essentially_normal','Essentially Normal'],['gu_blood_stained_internal_exam','Blood Stained IE'],['gu_cervical_dilation','Cervical Dilation'],['gu_abnormal_discharge','Abnormal Discharge']],fi.gu_others],
                      ['F. Digital Rectal Exam',[['dre_crackle_rales','Crackle/Rales'],['dre_enlarge_prostate','Enlarge Prostate'],['dre_mass','Mass'],['dre_hemorrhoids','Hemorrhoids'],['dre_pus','Pus'],['dre_not_applicable','Not Applicable']],fi.dre_others],
                      ['G. Skin/Extremities',[['skin_essentially_normal','Essentially Normal'],['skin_clubbing','Clubbing'],['skin_cold_clammy','Cold Clammy'],['skin_cyanosis_mottled','Cyanosis Mottled'],['skin_edema_swelling','Edema/Swelling'],['skin_decreased_mobility','Decr. Mobility'],['skin_pale_nailbeds','Pale Nailbeds'],['skin_weak_pulses','Weak Pulses']],fi.skin_others],
                      ['H. Neurological',[['neuro_essentially_normal','Essentially Normal'],['neuro_abnormal_gait','Abnormal Gait'],['neuro_abnormal_position_sense','Abnormal Pos. Sense'],['neuro_abnormal_sensation','Abnormal Sensation'],['neuro_abnormal_reflexes','Abnormal Reflexes'],['neuro_poor_altered_memory','Poor/Altered Memory'],['neuro_poor_muscle_tone','Poor Muscle Tone'],['neuro_poor_coordination','Poor Coordination']],fi.neuro_others],
                    ].map(([title, items, others]: any) => (
                      <React.Fragment key={title}>
                        <tr><td style={hdr} colSpan={2}>{title}</td></tr>
                        {(items as [string,string][]).reduce((rows: any[], [k,l], i, arr) => {
                          if (i%2===0) rows.push(<tr key={k}><td style={val}>{cbLabel(fi[k],l)}</td><td style={val}>{arr[i+1]?cbLabel(fi[arr[i+1][0]],arr[i+1][1]):''}</td></tr>)
                          return rows
                        }, [])}
                        {others&&<tr><td style={lbl}>Others:</td><td style={val}>{others}</td></tr>}
                      </React.Fragment>
                    ))}
                    <tr><td style={hdr} colSpan={2}>First Patient Encounter</td></tr>
                    <tr><td colSpan={2} style={val}>{cbLabel(fi.encounter_generally_well,'Generally Well')} {cbLabel(fi.encounter_primary_care_consult,'Primary Care')} {cbLabel(fi.encounter_diagnostic_exam,'Diagnostic Exam')}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* COL 3 */}
              <div>
                <SH title="FAMILY PLANNING" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    <tr><td style={lbl}>FP Counseling:</td><td style={val}>{cbLabel(fp.has_fp_counseling,'Yes')}</td></tr>
                    <tr><td style={lbl}>Provider:</td><td style={val}>{v(fp.provider)}</td></tr>
                    <tr><td style={lbl}>Birth Control:</td><td style={val}>{v(fp.birth_control_method)}</td></tr>
                  </tbody>
                </table>

                <SH title="MENSTRUAL HISTORY" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    <tr><td style={lbl}>Menarche:</td><td style={val}>{mh.menarche_age?`${mh.menarche_age} yrs`:'—'}</td></tr>
                    <tr><td style={lbl}>Onset Sex. Int.:</td><td style={val}>{mh.onset_sexual_intercourse_age?`${mh.onset_sexual_intercourse_age} yrs`:'—'}</td></tr>
                    <tr><td style={lbl}>LMP:</td><td style={val}>{v(mh.last_menstrual_period)}</td></tr>
                    <tr><td style={lbl}>Period Duration:</td><td style={val}>{mh.period_duration_days?`${mh.period_duration_days} days`:'—'}</td></tr>
                    <tr><td style={lbl}>Pads/Day:</td><td style={val}>{v(mh.pads_per_day)}</td></tr>
                    <tr><td style={lbl}>Interval Cycle:</td><td style={val}>{mh.interval_cycle_days?`${mh.interval_cycle_days} days`:'—'}</td></tr>
                    <tr><td style={lbl}>Menopause:</td><td style={val}>{yesno(mh.menopause)}{mh.age_at_menopause?` (${mh.age_at_menopause} yrs)`:''}</td></tr>
                  </tbody>
                </table>

                <SH title="PREGNANCY HISTORY" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    <tr><td style={lbl}>G:</td><td style={val}>{v(pr.gravida)}</td><td style={lbl}>P:</td><td style={val}>{v(pr.para)}</td></tr>
                    <tr><td style={lbl}>T:</td><td style={val}>{v(pr.term)}</td><td style={lbl}>PT:</td><td style={val}>{v(pr.preterm)}</td></tr>
                    <tr><td style={lbl}>A:</td><td style={val}>{v(pr.abortion)}</td><td style={lbl}>L:</td><td style={val}>{v(pr.living)}</td></tr>
                    <tr><td style={lbl}>Delivery:</td><td colSpan={3} style={val}>{v(pr.type_of_delivery)}</td></tr>
                    <tr><td style={lbl}>Preg. HTN:</td><td colSpan={3} style={val}>{yesno(pr.pregnancy_include_hypertension)}</td></tr>
                  </tbody>
                </table>

                <SH title="NCD HIGH-RISK ASSESSMENT (20 YRS & ABOVE)" />
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    {[['eats_processed_food_weekly','1. Eats processed food weekly?'],['eats_fruits_vegetables_daily','2. Eats fruits/veg daily?'],['does_physical_activity_weekly','3. 2.5hrs physical activity/week?']].map(([key,q])=>(
                      <React.Fragment key={key}>
                        <tr><td colSpan={2} style={lbl}>{q}</td></tr>
                        <tr><td colSpan={2} style={val}>{cbLabel(nd[key],'Yes')} {cbLabel(nd[key]===false,'No')}</td></tr>
                      </React.Fragment>
                    ))}
                    <tr><td colSpan={2} style={lbl}>4. Diagnosed with Diabetes?</td></tr>
                    <tr><td colSpan={2} style={val}>{cbLabel(nd.diagnosed_with_diabetes,'Yes')} {cbLabel(nd.diabetes_do_not_know,'Do Not Know')}</td></tr>
                    {nd.diagnosed_with_diabetes&&<tr><td colSpan={2} style={val}>{cbLabel(nd.diabetes_with_medication,'With Med')} {cbLabel(nd.diabetes_without_medication,'Without Med')}</td></tr>}
                    <tr><td colSpan={2} style={lbl}>5. Symptoms:</td></tr>
                    <tr><td colSpan={2} style={val}>{cbLabel(nd.symptom_polyphagia,'Polyphagia')} {cbLabel(nd.symptom_polydipsia,'Polydipsia')} {cbLabel(nd.symptom_polyuria,'Polyuria')}</td></tr>
                    <tr><td style={lbl}>FBS/RBS:</td><td style={val}>{v(nd.fbs_rbs_value)}{nd.fbs_rbs_date?` (${nd.fbs_rbs_date})`:''}</td></tr>
                    <tr><td style={lbl}>Cholesterol:</td><td style={val}>{v(nd.total_cholesterol_value)}{nd.total_cholesterol_date?` (${nd.total_cholesterol_date})`:''}</td></tr>
                    <tr><td style={lbl}>Urine Ketone:</td><td style={val}>{v(nd.urine_ketone_value)}{nd.urine_ketone_date?` (${nd.urine_ketone_date})`:''}</td></tr>
                    <tr><td style={lbl}>Urine Protein:</td><td style={val}>{v(nd.urine_protein_value)}{nd.urine_protein_date?` (${nd.urine_protein_date})`:''}</td></tr>
                    <tr><td colSpan={2} style={{ ...hdr, textAlign:'left' as const }}>Angina / Heart Attack</td></tr>
                    {[['angina_has_chest_pain','1. Chest pain/discomfort?'],['angina_center_left_chest','2. Center/left chest or arm?'],['angina_on_walking','3. When walking uphill/hurry?'],['angina_slows_down_walking','4. Slow down when pain?'],['angina_pain_goes_away_standing','5. Pain goes away standing/meds?'],['angina_pain_gone_10_minutes','6. Pain gone in <10 min?'],['angina_severe_30min_or_more','7. Severe chest pain ≥30 min?']].map(([key,q])=>(
                      <React.Fragment key={key}>
                        <tr><td colSpan={2} style={lbl}>{q}</td></tr>
                        <tr><td colSpan={2} style={val}>{cbLabel(nd[key],'Yes')} {cbLabel(nd[key]===false,'No')}</td></tr>
                      </React.Fragment>
                    ))}
                    <tr><td colSpan={2} style={{ ...hdr, textAlign:'left' as const }}>Stroke and TIA</td></tr>
                    <tr><td colSpan={2} style={lbl}>8. Difficulty talking/weakness one side?</td></tr>
                    <tr><td colSpan={2} style={val}>{cbLabel(nd.stroke_tia_difficulty_talking,'Yes')} {cbLabel(nd.stroke_tia_difficulty_talking===false,'No')}</td></tr>
                    <tr><td colSpan={2} style={{ ...hdr, textAlign:'left' as const }}>Risk Level</td></tr>
                    <tr><td colSpan={2} style={val}>
                      {['<10%','10% to <20%','20% to <30%','30% to <40%','>40%'].map(r=>(
                        <span key={r} style={{ marginRight:5 }}>{cbLabel(nd.risk_level===r,r)}</span>
                      ))}
                    </td></tr>
                  </tbody>
                </table>

                <div style={{ marginTop:10, borderTop:`2px solid ${GN}`, paddingTop:6, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center' }}>
                  {['Attending Physician','Nurse/Midwife','Registrar'].map(role=>(
                    <div key={role}>
                      <div style={{ borderBottom:'1px solid #333', height:28, marginBottom:3 }} />
                      <div style={{ fontSize:8, color:'#555' }}>{role}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}