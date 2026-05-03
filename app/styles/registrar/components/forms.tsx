'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── STYLES ───────────────────────────────────────────────────────────────────
const MS: Record<string, React.CSSProperties> = {
  overlay: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
    display:'flex', justifyContent:'center', alignItems:'flex-start',
    zIndex:1000, padding:'20px', overflowY:'auto',
  },
  modal: {
    background:'white', width:'100%', maxWidth:'820px',
    borderRadius:'8px', position:'relative', fontFamily:'Arial, sans-serif',
    marginTop:'10px', marginBottom:'10px',
  },
  header: {
    background:'#1a6b2e', color:'white', textAlign:'center',
    padding:'10px 40px', fontSize:'15px', fontWeight:'bold',
    borderRadius:'6px 6px 0 0',
  },
  body:    { padding:'16px 24px', background:'#f5f7f5' },
  closeBtn:{
    position:'absolute', top:'6px', right:'14px',
    background:'none', border:'none', fontSize:'28px',
    color:'#8B1A1A', cursor:'pointer', fontWeight:'bold', lineHeight:1, zIndex:10,
  },
  row:     { display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', flexWrap:'wrap' as const },
  label:   { fontSize:'13px', fontWeight:'bold', whiteSpace:'nowrap' as const },
  input:   { border:'1px solid #aaa', padding:'3px 6px', fontSize:'13px', borderRadius:'3px', outline:'none', background:'white' },
  inputFlex:{ border:'1px solid #aaa', padding:'3px 6px', fontSize:'13px', borderRadius:'3px', outline:'none', flex:1, background:'white', minWidth:0 },
  greenDivider: { height:'4px', background:'#1a6b2e', margin:'10px -24px' },
  btnRow:  { display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'16px', paddingTop:'12px', borderTop:'2px solid #1a6b2e' },
  btnBack: { background:'#8B1A1A', color:'white', border:'none', padding:'8px 28px', borderRadius:'4px', fontSize:'14px', fontWeight:'bold', cursor:'pointer' },
  btnNext: { background:'#1a6b2e', color:'white', border:'none', padding:'8px 28px', borderRadius:'4px', fontSize:'14px', fontWeight:'bold', cursor:'pointer' },
  confirmOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000 },
  confirmBox:     { background:'white', borderRadius:'12px', padding:'32px 48px', textAlign:'center' as const, minWidth:'320px', boxShadow:'0 4px 20px rgba(0,0,0,0.25)' },
  confirmCancel:  { background:'#8B1A1A', color:'white', border:'none', padding:'10px 28px', borderRadius:'6px', fontSize:'14px', fontWeight:'bold', cursor:'pointer', marginRight:'12px' },
  confirmSave:    { background:'white', color:'#1a6b2e', border:'2px solid #1a6b2e', padding:'10px 28px', borderRadius:'6px', fontSize:'14px', fontWeight:'bold', cursor:'pointer' },
}

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────
function CB({ label, checked, onChange, children }: { label?:string; checked:boolean; onChange:()=>void; children?: React.ReactNode }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', cursor:'pointer', marginBottom:'3px' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ cursor:'pointer' }} />
      {label}{children}
    </label>
  )
}

function RB({ label, name, value, checked, onChange }: { label:string; name:string; value:string; checked:boolean; onChange:()=>void }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', cursor:'pointer' }}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} style={{ cursor:'pointer' }} />
      {label}
    </label>
  )
}

function IInput({ width='80px', type='text', value, onChange }: { width?:string; type?:string; value:string; onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void }) {
  return <input type={type} value={value} onChange={onChange} style={{ ...MS.input, width }} />
}

// ─── ADD PATIENT MODAL ────────────────────────────────────────────────────────
function AddPatientModal({ isOpen, onClose, onSaved }: { isOpen:boolean; onClose:()=>void; onSaved:()=>void }) {
  const [step,    setStep]    = useState(1)
  const [confirm, setConfirm] = useState<null|'close'|'save'|'send'>(null)
  const [saving,  setSaving]  = useState(false)

  // Step 1
  const [s1, setS1] = useState({
    lastName:'', firstName:'', middleName:'',
    age:'', sexF:false, sexM:false, birthdate:'',
    purok:'', barangay:'', municipality:'',
    contact:'', email:'', philhealth:'',
    memberMember:false, memberDependent:false, memberSpecify:'',
    regDate:'', kkpSign:false,
    fac1:'', fac1chk:false, fac2:'', fac2chk:false, fac3:'', fac3chk:false,
    atCode:'', atNoAtc:false, apptDate:'', faceCapture:false,
  })

  // Step 2
  const DISEASES = ['Allergy','Asthma','Cancer','Cerebrovascular Disease','Coronary Artery Disease','Diabetes Mellitus','Emphysema','Epilepsy / Seizure Disorder','Hepatitis','Hyperlipidemia','Hypertension','Peptic Ulcer','Pneumonia','Thyroid Disease','PTB','Urinary Tract Infection','Mental Illness','Others']
  const [pastMed,      setPastMed]      = useState<Record<string,boolean>>({})
  const [pastMedSpec,  setPastMedSpec]  = useState<Record<string,string>>({})
  const [famHist,      setFamHist]      = useState<Record<string,boolean>>({})
  const [famHistSpec,  setFamHistSpec]  = useState<Record<string,string>>({})
  const [surgery,      setSurgery]      = useState('')
  const [surgDate,     setSurgDate]     = useState('')

  // Step 3
  const [smoking,      setSmoking]      = useState('')
  const [packsYear,    setPacksYear]    = useState('')
  const [alcohol,      setAlcohol]      = useState('')
  const [servingsDay,  setServingsDay]  = useState('')
  const [illicit,      setIllicit]      = useState('')
  const [sexually,     setSexually]     = useState('')
  const [immun,        setImmun]        = useState<Record<string,boolean>>({})
  const [immunOther,   setImmunOther]   = useState('')

  // Step 4
  const [fpAccess,     setFpAccess]     = useState(false)
  const [fpProvider,   setFpProvider]   = useState('')
  const [fpMethod,     setFpMethod]     = useState('')
  const [menarche,     setMenarche]     = useState('')
  const [onsetSex,     setOnsetSex]     = useState('')
  const [lmp,          setLmp]          = useState('')
  const [periodDur,    setPeriodDur]    = useState('')
  const [padsDay,      setPadsDay]      = useState('')
  const [intervalCycle,setIntervalCycle]= useState('')
  const [menopauseYes, setMenopauseYes] = useState(false)
  const [menopauseNo,  setMenopauseNo]  = useState(false)
  const [ageMenopause, setAgeMenopause] = useState('')
  const [pregG,setPregG]=useState(''); const [pregP,setPregP]=useState('')
  const [pregT,setPregT]=useState(''); const [pregP2,setPregP2]=useState('')
  const [pregA,setPregA]=useState(''); const [pregL,setPregL]=useState('')
  const [delivery,     setDelivery]     = useState('')
  const [pregHtnYes,   setPregHtnYes]   = useState(false)
  const [pregHtnNo,    setPregHtnNo]    = useState(false)

  // Step 5
  const [height,    setHeight]    = useState('')
  const [bp,        setBp]        = useState('')
  const [weight,    setWeight]    = useState('')
  const [hr,        setHr]        = useState('')
  const [temp,      setTemp]      = useState('')
  const [rr,        setRr]        = useState('')
  const [bloodType, setBloodType] = useState('')
  const [visRight,  setVisRight]  = useState('')
  const [visLeft,   setVisLeft]   = useState('')
  const [pedia,     setPedia]     = useState<Record<string,string>>({})

  // Step 6
  const [genSurvey,     setGenSurvey]     = useState<Record<string,boolean>>({})
  const [heent,         setHeent]         = useState<Record<string,boolean>>({})
  const [chest,         setChest]         = useState<Record<string,boolean>>({})
  const [heart,         setHeart]         = useState<Record<string,boolean>>({})
  const [abdomen,       setAbdomen]       = useState<Record<string,boolean>>({})
  const [heentOther,    setHeentOther]    = useState('')
  const [chestOther,    setChestOther]    = useState('')
  const [heartOther,    setHeartOther]    = useState('')
  const [abdomenOther,  setAbdomenOther]  = useState('')

  // Step 7
  const [genito,     setGenito]     = useState<Record<string,boolean>>({})
  const [rectal,     setRectal]     = useState<Record<string,boolean>>({})
  const [skin,       setSkin]       = useState<Record<string,boolean>>({})
  const [neuro,      setNeuro]      = useState<Record<string,boolean>>({})
  const [genitOther, setGenitOther] = useState('')
  const [rectalOther,setRectalOther]= useState('')
  const [skinOther,  setSkinOther]  = useState('')
  const [neuroOther, setNeuroOther] = useState('')
  const [assessment, setAssessment] = useState<Record<string,boolean>>({})

  // Step 8
  const [ncd8,           setNcd8]           = useState<Record<string,string>>({})
  const [diabetesYes,    setDiabetesYes]    = useState(false)
  const [diabetesNo,     setDiabetesNo]     = useState(false)
  const [diabetesMed,    setDiabetesMed]    = useState('')
  const [symptoms,       setSymptoms]       = useState<Record<string,boolean>>({})
  const [labFbs,         setLabFbs]         = useState('')
  const [labFbsDate,     setLabFbsDate]     = useState('')
  const [labChol,        setLabChol]        = useState('')
  const [labCholDate,    setLabCholDate]    = useState('')
  const [labKetone,      setLabKetone]      = useState('')
  const [labKetoneDate,  setLabKetoneDate]  = useState('')
  const [labProtein,     setLabProtein]     = useState('')
  const [labProteinDate, setLabProteinDate] = useState('')

  // Step 9
  const [anginaOverall, setAnginaOverall] = useState('')
  const [angina,        setAngina]        = useState<Record<string,string>>({})

  // Step 10
  const [stroke,    setStroke]    = useState<Record<string,string>>({})
  const [strokeTia, setStrokeTia] = useState('')
  const [riskLevel, setRiskLevel] = useState('')

  if (!isOpen) return null

  const togCB = (state: Record<string,boolean>, setState: React.Dispatch<React.SetStateAction<Record<string,boolean>>>, key: string) =>
    setState(p => ({ ...p, [key]: !p[key] }))

  const tryInsert = async (table: string, row: Record<string, any>) => {
    const { error } = await supabase.from(table).insert([row])
    if (error) console.warn(`${table} skipped:`, error.message)
  }

  const doSave = async () => {
    setSaving(true)

    try {
      // 1. PATIENTS
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert([{
          last_name:           s1.lastName      || null,
          first_name:          s1.firstName     || null,
          middle_name:         s1.middleName    || null,
          age:                 parseInt(s1.age) || null,
          sex:                 s1.sexF ? 'F' : s1.sexM ? 'M' : null,
          birthdate:           s1.birthdate     || null,
          purok:               s1.purok         || null,
          barangay:            s1.barangay      || null,
          municipality:        s1.municipality  || null,
          contact_number:      s1.contact       || null,
          email:               s1.email         || null,
          philhealth_pin:      s1.philhealth    || null,
          member_type:         s1.memberMember ? 'Member' : s1.memberDependent ? 'Dependent' : null,
          member_type_specify: s1.memberSpecify || null,
        }])
        .select('id')
        .single()

      if (patientError) throw patientError
      const pid = patientData.id

      // 2. KONSULTA REGISTRATIONS
      await tryInsert('konsulta_registrations', {
        patient_id:          pid,
        registration_date:   s1.regDate   || null,
        kkp_sign:            s1.kkpSign,
        facility_choice_1:   s1.fac1      || null,
        facility_kkp_1:      s1.fac1chk,
        facility_choice_2:   s1.fac2      || null,
        facility_kkp_2:      s1.fac2chk,
        facility_choice_3:   s1.fac3      || null,
        facility_kkp_3:      s1.fac3chk,
        has_at_code:         s1.atNoAtc,
        at_code:             s1.atCode    || null,
        date_of_appointment: s1.apptDate  || null,
        face_capture:        s1.faceCapture,
      })

      // 3. PAST MEDICAL HISTORY
      const pmSpec = pastMedSpec
      await tryInsert('past_medical_history', {
        patient_id:              pid,
        allergy:                 !!pastMed['Allergy'],
        allergy_specify:         pmSpec['Allergy']        || null,
        asthma:                  !!pastMed['Asthma'],
        cancer:                  !!pastMed['Cancer'],
        cancer_specify:          pmSpec['Cancer']         || null,
        cerebrovascular_disease: !!pastMed['Cerebrovascular Disease'],
        coronary_artery_disease: !!pastMed['Coronary Artery Disease'],
        diabetes_mellitus:       !!pastMed['Diabetes Mellitus'],
        emphysema:               !!pastMed['Emphysema'],
        epilepsy_seizure:        !!pastMed['Epilepsy / Seizure Disorder'],
        hepatitis:               !!pastMed['Hepatitis'],
        hepatitis_specify:       pmSpec['Hepatitis']      || null,
        hyperlipidemia:          !!pastMed['Hyperlipidemia'],
        hypertension:            !!pastMed['Hypertension'],
        hypertension_highest_bp: pmSpec['Hypertension']  || null,
        peptic_ulcer:            !!pastMed['Peptic Ulcer'],
        pneumonia:               !!pastMed['Pneumonia'],
        thyroid_disease:         !!pastMed['Thyroid Disease'],
        ptb:                     !!pastMed['PTB'],
        ptb_specify_extra:       pmSpec['PTB']            || null,
        urinary_tract_infection: !!pastMed['Urinary Tract Infection'],
        mental_illness:          !!pastMed['Mental Illness'],
        others:                  !!pastMed['Others'],
        past_surgeries_done:     surgery  || null,
        date_surgery_done:       surgDate || null,
      })

      // 4. FAMILY HISTORY
      const fhSpec = famHistSpec
      await tryInsert('family_history', {
        patient_id:              pid,
        allergy:                 !!famHist['Allergy'],
        allergy_specify:         fhSpec['Allergy']        || null,
        asthma:                  !!famHist['Asthma'],
        cancer:                  !!famHist['Cancer'],
        cancer_specify:          fhSpec['Cancer']         || null,
        cerebrovascular_disease: !!famHist['Cerebrovascular Disease'],
        coronary_artery_disease: !!famHist['Coronary Artery Disease'],
        diabetes_mellitus:       !!famHist['Diabetes Mellitus'],
        emphysema:               !!famHist['Emphysema'],
        epilepsy_seizure:        !!famHist['Epilepsy / Seizure Disorder'],
        hepatitis:               !!famHist['Hepatitis'],
        hepatitis_specify:       fhSpec['Hepatitis']      || null,
        hyperlipidemia:          !!famHist['Hyperlipidemia'],
        hypertension:            !!famHist['Hypertension'],
        hypertension_highest_bp: fhSpec['Hypertension']  || null,
        peptic_ulcer:            !!famHist['Peptic Ulcer'],
        pneumonia:               !!famHist['Pneumonia'],
        thyroid_disease:         !!famHist['Thyroid Disease'],
        ptb:                     !!famHist['PTB'],
        ptb_specify_extra:       fhSpec['PTB']            || null,
        urinary_tract_infection: !!famHist['Urinary Tract Infection'],
        mental_illness:          !!famHist['Mental Illness'],
        others:                  !!famHist['Others'],
      })

      // 5. PERSONAL SOCIAL HISTORY
      await tryInsert('personal_social_history', {
        patient_id:             pid,
        smoking:                smoking     || null,
        smoking_packs_per_year: packsYear   ? parseFloat(packsYear)   : null,
        alcohol:                alcohol     || null,
        alcohol_servings_day:   servingsDay ? parseFloat(servingsDay) : null,
        illicit_drugs:          illicit     || null,
        sexually_active:        sexually    || null,
      })

      // 6. IMMUNIZATION HISTORY
      await tryInsert('immunization_history', {
        patient_id:           pid,
        bcg:                  !!immun['BCG0'],
        opv1:                 !!immun['OPV11'],
        opv2:                 !!immun['OPV22'],
        opv3:                 !!immun['OPV33'],
        dpt1:                 !!immun['DPT14'],
        dpt2:                 !!immun['DPT25'],
        dpt3:                 !!immun['DPT36'],
        measles:              !!immun['Measles7'],
        hapa1:                !!immun['Hapa18'],
        hapa2:                !!immun['Hapa29'],
        hapa3:                !!immun['Hapa310'],
        varicella:            !!immun['Varicella11'],
        hpv:                  !!immun['HPV'],
        mmr:                  !!immun['MMR'],
        none_adult:           !!immun['None'],
        pneumococcal_vaccine: !!immun['pneumo'],
        flu_vaccine:          !!immun['flu'],
        others:               immunOther || null,
      })

      // 7. FAMILY PLANNING
      await tryInsert('family_planning', {
        patient_id:           pid,
        has_fp_counseling:    fpAccess,
        provider:             fpProvider || null,
        birth_control_method: fpMethod   || null,
      })

      // 8. MENSTRUAL HISTORY
      await tryInsert('menstrual_history', {
        patient_id:                   pid,
        menarche_age:                 menarche      ? parseInt(menarche)      : null,
        onset_sexual_intercourse_age: onsetSex      ? parseInt(onsetSex)      : null,
        last_menstrual_period:        lmp            || null,
        period_duration_days:         periodDur     ? parseInt(periodDur)     : null,
        pads_per_day:                 padsDay       ? parseInt(padsDay)       : null,
        interval_cycle_days:          intervalCycle ? parseInt(intervalCycle) : null,
        menopause:                    menopauseYes ? true : menopauseNo ? false : null,
        age_at_menopause:             ageMenopause  ? parseInt(ageMenopause)  : null,
      })

      // 9. PREGNANCY HISTORY
      await tryInsert('pregnancy_history', {
        patient_id:                     pid,
        gravida:                        pregG  ? parseInt(pregG)  : null,
        para:                           pregP  ? parseInt(pregP)  : null,
        term:                           pregT  ? parseInt(pregT)  : null,
        preterm:                        pregP2 ? parseInt(pregP2) : null,
        abortion:                       pregA  ? parseInt(pregA)  : null,
        living:                         pregL  ? parseInt(pregL)  : null,
        type_of_delivery:               delivery || null,
        pregnancy_include_hypertension: pregHtnYes ? true : pregHtnNo ? false : null,
      })

      // 10. PHYSICAL EXAM FINDINGS
      await tryInsert('physical_exam_findings', {
        patient_id:              pid,
        height_cm:               height    ? parseFloat(height)    : null,
        weight_kg:               weight    ? parseFloat(weight)    : null,
        blood_pressure_mmhg:     bp        || null,
        heart_rate_bpm:          hr        ? parseInt(hr)          : null,
        temperature_c:           temp      ? parseFloat(temp)      : null,
        respiratory_rate_cpm:    rr        ? parseInt(rr)          : null,
        blood_type:              bloodType || null,
        visual_acuity_right_eye: visRight  || null,
        visual_acuity_left_eye:  visLeft   || null,
      })

      // 11. PEDIA MEASUREMENTS
      await tryInsert('pedia_measurements', {
        patient_id:                 pid,
        body_length_cm:             pedia['Body Length']                  ? parseFloat(pedia['Body Length'])                  : null,
        head_circumference_cm:      pedia['Head Circumference']           ? parseFloat(pedia['Head Circumference'])           : null,
        chest_circumference_cm:     pedia['Chest Circumference']          ? parseFloat(pedia['Chest Circumference'])          : null,
        abdominal_circumference_cm: pedia['Abdominal Circumference']      ? parseFloat(pedia['Abdominal Circumference'])      : null,
        hip_circumference_cm:       pedia['Hip Circumference']            ? parseFloat(pedia['Hip Circumference'])            : null,
        mid_upper_arm_circ_cm:      pedia['Mid-Upper Arm Circumference']  ? parseFloat(pedia['Mid-Upper Arm Circumference'])  : null,
        limbs_circumference_cm:     pedia['Limbs Circumference']          ? parseFloat(pedia['Limbs Circumference'])          : null,
      })

      // 12. PERTINENT FINDINGS PER SYSTEM
      await tryInsert('pertinent_findings_per_system', {
        patient_id:                     pid,
        awake_and_alert:                !!genSurvey['awake'],
        altered_sensorium:              !!genSurvey['altered'],
        heent_essentially_normal:       !!heent['Essentially Normal'],
        heent_abnormal_papillary:       !!heent['Abnormal Papillary Reaction'],
        heent_cervical_lymphadenopathy: !!heent['Cervical Lymphadenopathy'],
        heent_dry_mucus_membrane:       !!heent['Dry Mucus Membrane'],
        heent_icteric_sclerae:          !!heent['Icteric Sclerae'],
        heent_pale_conjunctiva:         !!heent['Pale Conjunctiva'],
        heent_sunken_eyeball:           !!heent['Sunken Eyeball'],
        heent_sunken_fontanelle:        !!heent['Sunken Fontanelle'],
        heent_others:                   heentOther || null,
        chest_essentially_normal:       !!chest['Essentially Normal'],
        chest_asymmetrical_expansion:   !!chest['Asymmetrical Chest Expansion'],
        chest_decreased_breath_sound:   !!chest['Decreased Breath Sound'],
        chest_wheeze:                   !!chest['Wheeze'],
        chest_crackle_rales:            !!chest['Crackle / Rales'],
        chest_retractions:              !!chest['Retractions'],
        chest_lumps_over_breast:        !!chest['Lumps Over Breast'],
        chest_other:                    chestOther || null,
        heart_essentially_normal:       !!heart['Essentially Normal'],
        heart_displaced_apex_beat:      !!heart['Displaced Apex Beat'],
        heart_heave_trills:             !!heart['Heave Trills'],
        heart_irregular_rhythm:         !!heart['Irregular Rhythm'],
        heart_muffled_sounds:           !!heart['Muffled Heart Sounds'],
        heart_murmurs:                  !!heart['Murmurs'],
        heart_pericardial_bulge:        !!heart['Pericardial Bulge'],
        heart_others:                   heartOther || null,
        abdomen_essentially_normal:     !!abdomen['Essentially Normal'],
        abdomen_rigidity:               !!abdomen['Abdominal Rigidity'],
        abdomen_tenderness:             !!abdomen['Abdominal Tenderness'],
        abdomen_hyperactive_bowel:      !!abdomen['Hyperactive Bowel Sound'],
        abdomen_palpable_masses:        !!abdomen['Palpable Mass/es'],
        abdomen_tympanitic_dull:        !!abdomen['Tympanitic/Dull Abdomen'],
        abdomen_uterine_contraction:    !!abdomen['Uterine Contraction'],
        abdomen_others:                 abdomenOther || null,
        gu_essentially_normal:          !!genito['Essentially Normal'],
        gu_blood_stained_internal_exam: !!genito['Blood Stained in Internal Examination'],
        gu_cervical_dilation:           !!genito['Cervical Dilation'],
        gu_abnormal_discharge:          !!genito['Presence of Abnormal Discharge'],
        gu_others:                      genitOther || null,
        dre_crackle_rales:              !!rectal['Crackle / Rales'],
        dre_enlarge_prostate:           !!rectal['Enlarge Prostate'],
        dre_mass:                       !!rectal['Mass'],
        dre_hemorrhoids:                !!rectal['Hemorrhoids'],
        dre_pus:                        !!rectal['Pus'],
        dre_not_applicable:             !!rectal['Not Applicable'],
        dre_others:                     rectalOther || null,
        skin_essentially_normal:        !!skin['Essentially Normal'],
        skin_clubbing:                  !!skin['Clubbing'],
        skin_cold_clammy:               !!skin['Cold Clammy'],
        skin_cyanosis_mottled:          !!skin['Cyanosis Mottled Skin'],
        skin_edema_swelling:            !!skin['Edemal / Swelling'],
        skin_decreased_mobility:        !!skin['Decreased Mobility'],
        skin_pale_nailbeds:             !!skin['Pale Nailbeds'],
        skin_weak_pulses:               !!skin['Weak Pulses'],
        skin_others:                    skinOther || null,
        neuro_essentially_normal:       !!neuro['Essentially Normal'],
        neuro_abnormal_gait:            !!neuro['Abnormal Gait'],
        neuro_abnormal_position_sense:  !!neuro['Abnormal Position Sense'],
        neuro_abnormal_sensation:       !!neuro['Abnormal Sensation'],
        neuro_abnormal_reflexes:        !!neuro['Abnormal Reflex/es'],
        neuro_poor_altered_memory:      !!neuro['Poor/ Altered Memory'],
        neuro_poor_muscle_tone:         !!neuro['Poor Muscle Tone/ Strength'],
        neuro_poor_coordination:        !!neuro['Poor Coordination'],
        neuro_others:                   neuroOther || null,
        encounter_generally_well:       !!assessment['GENERALLY WELL'],
        encounter_primary_care_consult: !!assessment['FOR PRIMARY CARE CONSULTAION'],
        encounter_diagnostic_exam:      !!assessment['FOR DIAGNOSTIC EXAMINATION'],
      })

      // 13. NCD HIGH RISK ASSESSMENT
      await tryInsert('ncd_high_risk_assessment', {
        patient_id:                    pid,
        eats_processed_food_weekly:    ncd8['q1'] === 'Yes' ? true : ncd8['q1'] === 'No' ? false : null,
        eats_fruits_vegetables_daily:  ncd8['q2'] === 'Yes' ? true : ncd8['q2'] === 'No' ? false : null,
        does_physical_activity_weekly: ncd8['q3'] === 'Yes' ? true : ncd8['q3'] === 'No' ? false : null,
        diagnosed_with_diabetes:       diabetesYes ? true : null,
        diabetes_do_not_know:          diabetesNo  ? true : null,
        diabetes_with_medication:      diabetesMed === 'With Medication'    ? true : null,
        diabetes_without_medication:   diabetesMed === 'Without Medication' ? true : null,
        symptom_polyphagia:            !!symptoms['Polyphagia'],
        symptom_polydipsia:            !!symptoms['Polydipsia'],
        symptom_polyuria:              !!symptoms['Polyuria'],
        fbs_rbs_value:                 labFbs         || null,
        fbs_rbs_date:                  labFbsDate     || null,
        total_cholesterol_value:       labChol        || null,
        total_cholesterol_date:        labCholDate    || null,
        urine_ketone_value:            labKetone      || null,
        urine_ketone_date:             labKetoneDate  || null,
        urine_protein_value:           labProtein     || null,
        urine_protein_date:            labProteinDate || null,
        angina_has_chest_pain:         angina['a1'] === 'Yes' ? true : angina['a1'] === 'No' ? false : null,
        angina_center_left_chest:      angina['a2'] === 'Yes' ? true : angina['a2'] === 'No' ? false : null,
        angina_on_walking:             angina['a3'] === 'Yes' ? true : angina['a3'] === 'No' ? false : null,
        angina_slows_down_walking:     angina['a4'] === 'Yes' ? true : angina['a4'] === 'No' ? false : null,
        angina_pain_goes_away_standing:angina['a5'] === 'Yes' ? true : angina['a5'] === 'No' ? false : null,
        angina_pain_gone_10_minutes:   stroke['s6'] === 'Yes' ? true : stroke['s6'] === 'No' ? false : null,
        angina_severe_30min_or_more:   stroke['s7'] === 'Yes' ? true : stroke['s7'] === 'No' ? false : null,
        stroke_tia_difficulty_talking: stroke['s8'] === 'Yes' ? true : stroke['s8'] === 'No' ? false : null,
        risk_level:                    riskLevel || null,
      })

    } catch (err: any) {
      console.error('Patient save error:', err)
      alert(`Error saving patient: ${err?.message || 'Check console'}`)
      setSaving(false)
      return
    }

    setSaving(false)
    setConfirm(null)
    setStep(1)
    onSaved()
    onClose()
  }

  const doClose = () => { setConfirm(null); setStep(1); onClose() }

  return (
    <div style={MS.overlay}>
      <div style={MS.modal}>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            <div style={MS.header}>General Data and Konsulta Registration</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              <div style={MS.row}>
                <span style={MS.label}>Full Name:</span>
                <div style={{ flex:1, display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {(['lastName','firstName','middleName'] as const).map((k, i) => (
                    <div key={k} style={{ display:'flex', flexDirection:'column', flex:1 }}>
                      <input style={MS.inputFlex} value={s1[k]} onChange={e => setS1(p => ({ ...p, [k]: e.target.value }))} />
                      <span style={{ fontSize:'10px', color:'#555', textAlign:'center' }}>
                        {['Last','First','Middle'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={MS.row}>
                <span style={MS.label}>Age:</span>
                <IInput width="50px" value={s1.age} onChange={e => setS1(p => ({ ...p, age: e.target.value }))} />
                <span style={MS.label}>Sex:</span>
                <label style={{ display:'flex', alignItems:'center', gap:'3px', fontSize:'13px' }}>
                  <input type="checkbox" checked={s1.sexF} onChange={() => setS1(p => ({ ...p, sexF: !p.sexF, sexM: false }))} /> F
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:'3px', fontSize:'13px' }}>
                  <input type="checkbox" checked={s1.sexM} onChange={() => setS1(p => ({ ...p, sexM: !p.sexM, sexF: false }))} /> M
                </label>
                <span style={MS.label}>Birthdate:</span>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <IInput width="130px" type="date" value={s1.birthdate} onChange={e => setS1(p => ({ ...p, birthdate: e.target.value }))} />
                  <span style={{ fontSize:'10px', color:'#555', textAlign:'center' }}>MM/DD/YYYY</span>
                </div>
              </div>

              <div style={MS.row}>
                <span style={MS.label}>Address:</span>
                <div style={{ flex:1, display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {(['purok','barangay','municipality'] as const).map((k, i) => (
                    <div key={k} style={{ display:'flex', flexDirection:'column', flex:1 }}>
                      <input style={MS.inputFlex} value={s1[k]} onChange={e => setS1(p => ({ ...p, [k]: e.target.value }))} />
                      <span style={{ fontSize:'10px', color:'#555', textAlign:'center' }}>
                        {['Purok','Barangay','Municipality'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={MS.row}>
                <span style={MS.label}>Contact #:</span>
                <IInput width="160px" value={s1.contact} onChange={e => setS1(p => ({ ...p, contact: e.target.value }))} />
                <span style={MS.label}>E-mail:</span>
                <input type="email" style={{ ...MS.input, flex:1 }} value={s1.email} onChange={e => setS1(p => ({ ...p, email: e.target.value }))} />
              </div>

              <div style={MS.row}>
                <span style={MS.label}>Philhealth PIN:</span>
                <input style={{ ...MS.input, flex:1 }} value={s1.philhealth} onChange={e => setS1(p => ({ ...p, philhealth: e.target.value }))} />
              </div>

              <div style={MS.row}>
                <span style={MS.label}>Member type:</span>
                <CB label="Member"    checked={s1.memberMember}    onChange={() => setS1(p => ({ ...p, memberMember:    !p.memberMember }))} />
                <CB label="Dependent" checked={s1.memberDependent} onChange={() => setS1(p => ({ ...p, memberDependent: !p.memberDependent }))} />
                <span style={{ fontSize:'13px' }}>Specify:</span>
                <IInput width="120px" value={s1.memberSpecify} onChange={e => setS1(p => ({ ...p, memberSpecify: e.target.value }))} />
              </div>

              <div style={MS.greenDivider} />

              <div style={{ ...MS.row, alignItems:'flex-start', marginTop:'8px' }}>
                <span style={{ ...MS.label, minWidth:'160px' }}>Konsulta Registration</span>
                <div style={{ flex:1 }}>
                  <div style={MS.row}>
                    <span style={{ fontSize:'13px' }}>Registration Date:</span>
                    <div style={{ display:'flex', flexDirection:'column' }}>
                      <IInput width="120px" type="date" value={s1.regDate} onChange={e => setS1(p => ({ ...p, regDate: e.target.value }))} />
                      <span style={{ fontSize:'10px', color:'#555', textAlign:'center' }}>MM/DD/YYYY</span>
                    </div>
                    <span style={{ fontSize:'13px', marginLeft:'20px' }}>KKP <em>Sign</em></span>
                    <CB checked={s1.kkpSign} onChange={() => setS1(p => ({ ...p, kkpSign: !p.kkpSign }))} />
                  </div>
                  <div style={{ marginTop:'6px' }}>
                    <span style={MS.label}>Preferred Facility and Address</span>
                    {(['fac1','fac2','fac3'] as const).map((k, i) => {
                      const chk = (['fac1chk','fac2chk','fac3chk'] as const)[i]
                      return (
                        <div key={k} style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'4px' }}>
                          <span style={{ fontSize:'13px', width:'68px' }}>Choice {i+1}:</span>
                          <input style={{ ...MS.input, flex:1 }} value={s1[k]} onChange={e => setS1(p => ({ ...p, [k]: e.target.value }))} />
                          <CB checked={s1[chk]} onChange={() => setS1(p => ({ ...p, [chk]: !p[chk] }))} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div style={MS.greenDivider} />

              <div style={{ marginTop:'8px' }}>
                <span style={MS.label}>Authorization Transaction:</span>
                <div style={{ ...MS.row, marginTop:'6px' }}>
                  <CB checked={s1.atNoAtc} onChange={() => setS1(p => ({ ...p, atNoAtc: !p.atNoAtc }))} />
                  <span style={{ fontSize:'13px' }}>AT CODE:</span>
                  <IInput width="120px" value={s1.atCode} onChange={e => setS1(p => ({ ...p, atCode: e.target.value }))} />
                  <span style={{ fontSize:'13px' }}>Date of Appointment:</span>
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <IInput width="130px" type="date" value={s1.apptDate} onChange={e => setS1(p => ({ ...p, apptDate: e.target.value }))} />
                    <span style={{ fontSize:'10px', color:'#555', textAlign:'center' }}>MM/DD/YYYY</span>
                  </div>
                  <span style={{ fontSize:'13px' }}>If no ATC,</span>
                  <CB label="Face Capture" checked={s1.faceCapture} onChange={() => setS1(p => ({ ...p, faceCapture: !p.faceCapture }))} />
                </div>
              </div>

              <div style={{ ...MS.btnRow, justifyContent:'flex-end' }}>
                <button style={MS.btnNext} onClick={() => setStep(2)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              <div style={{ display:'flex', gap:'24px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'bold', fontSize:'14px', marginBottom:'8px' }}>Past Medical History</div>
                  {DISEASES.map(d => (
                    <div key={d} style={{ marginBottom:'3px' }}>
                      <label style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', cursor:'pointer' }}>
                        <input type="checkbox" checked={!!pastMed[d]} onChange={() => togCB(pastMed, setPastMed, d)} />
                        {d}
                        {(d==='Allergy'||d==='Cancer'||d==='Hepatitis') && (
                          <> (Specify: <IInput width="70px" value={pastMedSpec[d]||''} onChange={e => setPastMedSpec(p => ({ ...p, [d]: e.target.value }))} />)</>
                        )}
                        {d==='Hypertension' && (
                          <> (Highest BP: <IInput width="80px" value={pastMedSpec[d]||''} onChange={e => setPastMedSpec(p => ({ ...p, [d]: e.target.value }))} /> mmHg)</>
                        )}
                        {d==='PTB' && (
                          <> (Specify Extra PTB: <IInput width="70px" value={pastMedSpec[d]||''} onChange={e => setPastMedSpec(p => ({ ...p, [d]: e.target.value }))} />)</>
                        )}
                      </label>
                    </div>
                  ))}
                  <div style={{ ...MS.row, marginTop:'10px' }}>
                    <span style={{ fontSize:'13px' }}>Past Surgery/ies Done:</span>
                    <input style={{ ...MS.input, flex:1 }} value={surgery} onChange={e => setSurgery(e.target.value)} />
                  </div>
                  <div style={{ ...MS.row, marginTop:'4px' }}>
                    <span style={{ fontSize:'13px' }}>Date Done:</span>
                    <div style={{ display:'flex', flexDirection:'column' }}>
                      <IInput width="130px" type="date" value={surgDate} onChange={e => setSurgDate(e.target.value)} />
                      <span style={{ fontSize:'10px', color:'#555', textAlign:'center' }}>MM/DD/YYYY</span>
                    </div>
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'bold', fontSize:'14px', marginBottom:'8px' }}>Family History</div>
                  {DISEASES.map(d => (
                    <div key={d} style={{ marginBottom:'3px' }}>
                      <label style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', cursor:'pointer' }}>
                        <input type="checkbox" checked={!!famHist[d]} onChange={() => togCB(famHist, setFamHist, d)} />
                        {d}
                        {(d==='Allergy'||d==='Cancer'||d==='Hepatitis') && (
                          <> (Specify: <IInput width="70px" value={famHistSpec[d]||''} onChange={e => setFamHistSpec(p => ({ ...p, [d]: e.target.value }))} />)</>
                        )}
                        {d==='Hypertension' && (
                          <> (Highest BP: <IInput width="80px" value={famHistSpec[d]||''} onChange={e => setFamHistSpec(p => ({ ...p, [d]: e.target.value }))} /> mmHg)</>
                        )}
                        {d==='PTB' && (
                          <> (Specify Extra PTB: <IInput width="70px" value={famHistSpec[d]||''} onChange={e => setFamHistSpec(p => ({ ...p, [d]: e.target.value }))} />)</>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(1)}>Back</button>
                <button style={MS.btnNext} onClick={() => setStep(3)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              <div style={{ display:'flex', gap:'32px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'bold', fontSize:'14px', marginBottom:'10px' }}>Personal / Social History</div>
                  {([['Smoking',smoking,setSmoking],['Alcohol',alcohol,setAlcohol],['Illicit Drugs',illicit,setIllicit],['Sexuality Active',sexually,setSexually]] as [string,string,React.Dispatch<React.SetStateAction<string>>][]).map(([label,val,setVal]) => (
                    <div key={label} style={{ marginBottom:'8px' }}>
                      <div style={MS.row}>
                        <span style={{ ...MS.label, minWidth:'110px' }}>{label}</span>
                        {['Yes','No','Quit'].map(opt => (
                          <RB key={opt} label={opt} name={label} value={opt} checked={val===opt} onChange={() => setVal(opt)} />
                        ))}
                      </div>
                      {label==='Smoking' && (
                        <div style={{ ...MS.row, marginLeft:'110px' }}>
                          <span style={{ fontSize:'13px' }}>No. of Packs-Year:</span>
                          <IInput width="100px" value={packsYear} onChange={e => setPacksYear(e.target.value)} />
                        </div>
                      )}
                      {label==='Alcohol' && (
                        <div style={{ ...MS.row, marginLeft:'110px' }}>
                          <span style={{ fontSize:'13px' }}>No. of Servings/day:</span>
                          <IInput width="100px" value={servingsDay} onChange={e => setServingsDay(e.target.value)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'bold', fontSize:'14px', marginBottom:'10px' }}>Immunization</div>
                  <div style={{ fontWeight:'bold', fontSize:'13px', marginBottom:'4px' }}>Children</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'4px', marginBottom:'8px' }}>
                    {['BCG','OPV1','OPV2','OPV3','DPT1','DPT2','DPT3','Measles','Hapa1','Hapa2','Hapa3','Varicella'].map((v,i) => (
                      <CB key={v+i} label={v} checked={!!immun[v+i]} onChange={() => togCB(immun, setImmun, v+String(i))} />
                    ))}
                  </div>
                  <div style={{ fontWeight:'bold', fontSize:'13px', marginBottom:'4px' }}>Adult</div>
                  <div style={{ display:'flex', gap:'12px', marginBottom:'8px' }}>
                    {['HPV','MMR','None'].map(v => (
                      <CB key={v} label={v} checked={!!immun[v]} onChange={() => togCB(immun, setImmun, v)} />
                    ))}
                  </div>
                  <div style={{ fontWeight:'bold', fontSize:'13px', marginBottom:'4px' }}>Elderly and Immunocompromised</div>
                  <CB label="Pneumococcal Vaccine" checked={!!immun.pneumo} onChange={() => togCB(immun, setImmun, 'pneumo')} />
                  <CB label="Flu Vaccine"          checked={!!immun.flu}    onChange={() => togCB(immun, setImmun, 'flu')}    />
                  <div style={{ ...MS.row, marginTop:'8px' }}>
                    <span style={{ fontSize:'13px' }}>Others:</span>
                    <input style={{ ...MS.input, flex:1 }} value={immunOther} onChange={e => setImmunOther(e.target.value)} />
                  </div>
                </div>
              </div>
              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(2)}>Back</button>
                <button style={MS.btnNext} onClick={() => setStep(4)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              <div style={{ borderTop:'3px solid #1a6b2e', paddingTop:'8px', marginBottom:'10px' }}>
                <div style={{ fontWeight:'bold', fontSize:'14px', color:'#1a6b2e', marginBottom:'6px' }}>Family Planning</div>
                <CB label="With access to family planning counseling" checked={fpAccess} onChange={() => setFpAccess(p => !p)} />
                <div style={MS.row}><span style={{ fontSize:'13px', minWidth:'60px' }}>Provider:</span><input style={{ ...MS.input, width:'200px' }} value={fpProvider} onChange={e => setFpProvider(e.target.value)} /></div>
                <div style={MS.row}><span style={{ fontSize:'13px' }}>Birth Control Method used:</span><input style={{ ...MS.input, width:'180px' }} value={fpMethod} onChange={e => setFpMethod(e.target.value)} /></div>
              </div>
              <div style={{ borderTop:'3px solid #1a6b2e', paddingTop:'8px', marginBottom:'10px' }}>
                <div style={{ fontWeight:'bold', fontSize:'14px', color:'#1a6b2e', marginBottom:'6px' }}>Menstrual History</div>
                <div style={MS.row}><span style={{ fontSize:'13px' }}>Menarche:</span><IInput width="100px" value={menarche} onChange={e => setMenarche(e.target.value)} /><span style={{ fontSize:'13px' }}>yrs old</span></div>
                <div style={MS.row}><span style={{ fontSize:'13px' }}>Onset of sexual intercourse:</span><IInput width="100px" value={onsetSex} onChange={e => setOnsetSex(e.target.value)} /><span style={{ fontSize:'13px' }}>yrs old</span></div>
                <div style={MS.row}>
                  <span style={{ fontSize:'13px' }}>Last Menstrual Period:</span>
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <IInput width="130px" type="date" value={lmp} onChange={e => setLmp(e.target.value)} />
                    <span style={{ fontSize:'10px', color:'#555', textAlign:'center' }}>MM/DD/YYYY</span>
                  </div>
                </div>
                <div style={MS.row}><span style={{ fontSize:'13px' }}>Period Duration:</span><IInput width="80px" value={periodDur} onChange={e => setPeriodDur(e.target.value)} /><span style={{ fontSize:'13px' }}>days</span></div>
                <div style={MS.row}><span style={{ fontSize:'13px' }}>No. of pads/day:</span><IInput width="80px" value={padsDay} onChange={e => setPadsDay(e.target.value)} /></div>
                <div style={MS.row}><span style={{ fontSize:'13px' }}>Interval cycle:</span><IInput width="80px" value={intervalCycle} onChange={e => setIntervalCycle(e.target.value)} /><span style={{ fontSize:'13px' }}>days</span></div>
                <div style={MS.row}>
                  <span style={{ fontSize:'13px' }}>Menopause:</span>
                  <CB label="Yes" checked={menopauseYes} onChange={() => { setMenopauseYes(p=>!p); setMenopauseNo(false) }} />
                  <CB label="No"  checked={menopauseNo}  onChange={() => { setMenopauseNo(p=>!p);  setMenopauseYes(false) }} />
                </div>
                <div style={MS.row}><span style={{ fontSize:'13px' }}>Age at Menopause:</span><IInput width="80px" value={ageMenopause} onChange={e => setAgeMenopause(e.target.value)} /><span style={{ fontSize:'13px' }}>years</span></div>
              </div>
              <div style={{ borderTop:'3px solid #1a6b2e', paddingTop:'8px' }}>
                <div style={{ fontWeight:'bold', fontSize:'14px', color:'#1a6b2e', marginBottom:'6px' }}>Pregnancy History</div>
                <div style={MS.row}>
                  {([['G',pregG,setPregG],['P',pregP,setPregP],['(T',pregT,setPregT],['P',pregP2,setPregP2],['A',pregA,setPregA],['L',pregL,setPregL]] as [string,string,React.Dispatch<React.SetStateAction<string>>][]).map(([l,v,sv],i) => (
                    <span key={i} style={{ display:'flex', alignItems:'center', gap:'2px', fontSize:'13px', fontWeight:'bold' }}>
                      {l} <IInput width="36px" value={v} onChange={e => sv(e.target.value)} />
                    </span>
                  ))}
                  <span style={{ fontSize:'13px', fontWeight:'bold' }}>)</span>
                </div>
                <div style={MS.row}><span style={{ fontSize:'13px' }}>Type of Delivery:</span><input style={{ ...MS.input, width:'180px' }} value={delivery} onChange={e => setDelivery(e.target.value)} /></div>
                <div style={MS.row}>
                  <span style={{ fontSize:'13px' }}>Pregnancy Include Hypertension:</span>
                  <CB label="Yes" checked={pregHtnYes} onChange={() => { setPregHtnYes(p=>!p); setPregHtnNo(false) }} />
                  <CB label="No"  checked={pregHtnNo}  onChange={() => { setPregHtnNo(p=>!p);  setPregHtnYes(false) }} />
                </div>
              </div>
              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(3)}>Back</button>
                <button style={MS.btnNext} onClick={() => setStep(5)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 5 ── */}
        {step === 5 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              <div style={{ fontWeight:'bold', fontSize:'14px', marginBottom:'8px' }}>Pertinent Physical Examination Findings</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', maxWidth:'560px' }}>
                {([['Height:',height,setHeight,'cm'],['BP:',bp,setBp,'mm/Hg'],['Weight:',weight,setWeight,'kg'],['HR:',hr,setHr,'bpm'],['Temp:',temp,setTemp,'°C'],['RR:',rr,setRr,'cpm']] as [string,string,React.Dispatch<React.SetStateAction<string>>,string][]).map(([lbl,val,setVal,unit]) => (
                  <div key={lbl} style={MS.row}>
                    <span style={{ ...MS.label, minWidth:'58px' }}>{lbl}</span>
                    <IInput width="100px" value={val} onChange={e => setVal(e.target.value)} />
                    <span style={{ fontSize:'13px' }}>{unit}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'10px' }}>
                <span style={MS.label}>Blood Type:</span>
                <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginTop:'6px' }}>
                  {['A+','B+','AB+','O+','A-','B-','AB-','O-'].map(t => (
                    <label key={t} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', cursor:'pointer' }}>
                      <input type="checkbox" checked={bloodType===t} onChange={() => setBloodType(bloodType===t?'':t)} /> {t}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ ...MS.row, marginTop:'10px' }}>
                <span style={MS.label}>Visual Acuity:</span>
                <span style={{ fontSize:'13px' }}>Right Eye:</span>
                <IInput width="80px" value={visRight} onChange={e => setVisRight(e.target.value)} />
                <span style={{ fontSize:'13px' }}>Left Eye:</span>
                <IInput width="80px" value={visLeft}  onChange={e => setVisLeft(e.target.value)} />
              </div>
              <div style={{ ...MS.greenDivider, marginTop:'12px' }} />
              <div style={{ fontWeight:'bold', fontSize:'14px', margin:'10px 0 8px' }}>Pedia Client Aged 0-24 MOS</div>
              {['Body Length','Head Circumference','Chest Circumference','Abdominal Circumference','Hip Circumference','Mid-Upper Arm Circumference','Limbs Circumference'].map(f => (
                <div key={f} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
                  <span style={{ fontSize:'13px' }}>{f}:</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <IInput width="130px" value={pedia[f]||''} onChange={e => setPedia(p => ({ ...p, [f]: e.target.value }))} />
                    <span style={{ fontSize:'13px' }}>cm</span>
                  </div>
                </div>
              ))}
              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(4)}>Back</button>
                <button style={MS.btnNext} onClick={() => setStep(6)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 6 ── */}
        {step === 6 && (
          <>
            <div style={MS.header}>Pertinent Findings Per System</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              <div style={{ fontWeight:'bold', fontSize:'14px', marginBottom:'6px' }}>Physical Examination</div>
              <div style={{ marginBottom:'10px' }}>
                <span style={{ fontWeight:'bold', fontSize:'13px' }}>General Survey</span>
                <div style={{ ...MS.row, marginTop:'5px' }}>
                  <CB label="Awake and Alert"   checked={!!genSurvey.awake}   onChange={() => togCB(genSurvey, setGenSurvey, 'awake')} />
                  <CB label="Altered Sensorium" checked={!!genSurvey.altered} onChange={() => togCB(genSurvey, setGenSurvey, 'altered')} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                {([
                  { title:'A. Heent',                state:heent,   setState:setHeent,   other:heentOther,   setOther:setHeentOther,   items:['Essentially Normal','Abnormal Papillary Reaction','Cervical Lymphadenopathy','Dry Mucus Membrane','Icteric Sclerae','Pale Conjunctiva','Sunken Eyeball','Sunken Fontanelle'] },
                  { title:'B. Chest / Breast / Lungs',state:chest,  setState:setChest,   other:chestOther,   setOther:setChestOther,   items:['Essentially Normal','Asymmetrical Chest Expansion','Decreased Breath Sound','Wheeze','Crackle / Rales','Retractions','Lumps Over Breast'] },
                  { title:'C. Heart',                 state:heart,   setState:setHeart,   other:heartOther,   setOther:setHeartOther,   items:['Essentially Normal','Displaced Apex Beat','Heave Trills','Irregular Rhythm','Muffled Heart Sounds','Murmurs','Pericardial Bulge'] },
                  { title:'D. Abdomen',               state:abdomen, setState:setAbdomen, other:abdomenOther, setOther:setAbdomenOther, items:['Essentially Normal','Abdominal Rigidity','Abdominal Tenderness','Hyperactive Bowel Sound','Palpable Mass/es','Tympanitic/Dull Abdomen','Uterine Contraction'] },
                ] as { title:string; state:Record<string,boolean>; setState:React.Dispatch<React.SetStateAction<Record<string,boolean>>>; other:string; setOther:React.Dispatch<React.SetStateAction<string>>; items:string[] }[]).map(({ title, state, setState, other, setOther, items }) => (
                  <div key={title}>
                    <div style={{ fontWeight:'bold', fontSize:'13px', color:'#1a6b2e', marginBottom:'5px' }}>{title}</div>
                    <div style={{ display:'flex', gap:'12px' }}>
                      <div style={{ flex:1 }}>
                        {items.slice(0, Math.ceil(items.length/2)).map(item => (
                          <CB key={item} label={item} checked={!!state[item]} onChange={() => togCB(state, setState, item)} />
                        ))}
                      </div>
                      <div style={{ flex:1 }}>
                        {items.slice(Math.ceil(items.length/2)).map(item => (
                          <CB key={item} label={item} checked={!!state[item]} onChange={() => togCB(state, setState, item)} />
                        ))}
                        <label style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', marginTop:'2px', cursor:'pointer' }}>
                          <input type="checkbox" checked={!!state['Others']} onChange={() => togCB(state, setState, 'Others')} />
                          Others:
                          <input style={{ ...MS.input, width:'80px' }} value={other} onChange={e => setOther(e.target.value)} />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(5)}>Back</button>
                <button style={MS.btnNext} onClick={() => setStep(7)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 7 ── */}
        {step === 7 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                {([
                  { title:'E. Genitourinary',            state:genito, setState:setGenito, other:genitOther, setOther:setGenitOther, items:['Essentially Normal','Blood Stained in Internal Examination','Cervical Dilation','Presence of Abnormal Discharge'] },
                  { title:'F. Digital Rectal Examination',state:rectal, setState:setRectal, other:rectalOther,setOther:setRectalOther,items:['Crackle / Rales','Enlarge Prostate','Mass','Hemorrhoids','Pus','Not Applicable'] },
                  { title:'G. Skin / Extremities',        state:skin,   setState:setSkin,   other:skinOther,  setOther:setSkinOther,  items:['Essentially Normal','Clubbing','Cold Clammy','Cyanosis Mottled Skin','Edemal / Swelling','Decreased Mobility','Pale Nailbeds','Weak Pulses'] },
                  { title:'H. Neurological Examination',  state:neuro,  setState:setNeuro,  other:neuroOther, setOther:setNeuroOther, items:['Essentially Normal','Abnormal Gait','Abnormal Position Sense','Abnormal Sensation','Abnormal Reflex/es','Poor/ Altered Memory','Poor Muscle Tone/ Strength','Poor Coordination'] },
                ] as { title:string; state:Record<string,boolean>; setState:React.Dispatch<React.SetStateAction<Record<string,boolean>>>; other:string; setOther:React.Dispatch<React.SetStateAction<string>>; items:string[] }[]).map(({ title, state, setState, other, setOther, items }) => (
                  <div key={title}>
                    <div style={{ fontWeight:'bold', fontSize:'13px', color:'#1a6b2e', marginBottom:'5px' }}>{title}</div>
                    <div style={{ display:'flex', gap:'12px' }}>
                      <div style={{ flex:1 }}>
                        {items.slice(0, Math.ceil(items.length/2)).map(item => (
                          <CB key={item} label={item} checked={!!state[item]} onChange={() => togCB(state, setState, item)} />
                        ))}
                      </div>
                      <div style={{ flex:1 }}>
                        {items.slice(Math.ceil(items.length/2)).map(item => (
                          <CB key={item} label={item} checked={!!state[item]} onChange={() => togCB(state, setState, item)} />
                        ))}
                        <label style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', marginTop:'2px', cursor:'pointer' }}>
                          <input type="checkbox" checked={!!state['Others']} onChange={() => togCB(state, setState, 'Others')} />
                          Others:
                          <input style={{ ...MS.input, width:'80px' }} value={other} onChange={e => setOther(e.target.value)} />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'14px', borderTop:'2px solid #1a6b2e', paddingTop:'10px' }}>
                <div style={{ fontWeight:'bold', fontSize:'13px', marginBottom:'8px' }}>First Patient Encounter Assessment:</div>
                {(['GENERALLY WELL','FOR PRIMARY CARE CONSULTAION','FOR DIAGNOSTIC EXAMINATION'] as string[]).map((lbl, i) => (
                  <div key={lbl} style={{ ...MS.row, marginBottom:'6px' }}>
                    <CB checked={!!assessment[lbl]} onChange={() => togCB(assessment, setAssessment, lbl)}>
                      <span style={{ fontWeight:'bold', fontSize:'13px' }}>{lbl}</span>
                    </CB>
                    <span style={{ fontSize:'12px', color:'#555', fontStyle:'italic', marginLeft:'4px' }}>
                      {['(fill out and sign eKAS)','(fill out KONSULTA Referral Slip)','(fill out Diagnostic request Form)'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(6)}>Back</button>
                <button style={MS.btnNext} onClick={() => setStep(8)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 8 ── */}
        {step === 8 && (
          <>
            <div style={MS.header}>NCD HIGH-RISK ASSESSMENT (FOR 20 YRS OLD AND ABOVE)</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              {([
                ['q1','1. Eats processed food (ex. Instant Noodles, Burgers, Fries, Fried Chicken, etc) and ihaw-ihaw weekly?'],
                ['q2','2. Eats 3 serving of fruits and vegetable Daily?'],
                ['q3','3. Does at least 2.5 hours of moderate walking-intensity physical activity every week?'],
              ] as [string,string][]).map(([key,q]) => (
                <div key={key} style={{ marginBottom:'12px' }}>
                  <p style={{ fontSize:'14px', marginBottom:'6px' }}>{q}</p>
                  <div style={{ display:'flex', justifyContent:'center', gap:'80px' }}>
                    <RB label="Yes" name={key} value="Yes" checked={ncd8[key]==='Yes'} onChange={() => setNcd8(p => ({ ...p, [key]:'Yes' }))} />
                    <RB label="No"  name={key} value="No"  checked={ncd8[key]==='No'}  onChange={() => setNcd8(p => ({ ...p, [key]:'No' }))} />
                  </div>
                </div>
              ))}
              <div style={{ marginBottom:'12px' }}>
                <p style={{ fontSize:'14px', marginBottom:'6px' }}>4. Was patient diagnosed as having Diabetes?</p>
                <div style={{ display:'flex', justifyContent:'center', gap:'60px', marginBottom:'6px' }}>
                  <RB label="Yes"              name="diabetes" value="Yes" checked={diabetesYes} onChange={() => { setDiabetesYes(true);  setDiabetesNo(false) }} />
                  <RB label='No "Do not know"' name="diabetes" value="No"  checked={diabetesNo}  onChange={() => { setDiabetesNo(true);   setDiabetesYes(false) }} />
                </div>
                {diabetesYes && (
                  <div style={{ display:'flex', justifyContent:'center', gap:'20px' }}>
                    <span style={{ fontSize:'13px' }}>If YES:</span>
                    <RB label="With Medication"    name="diabetesMed" value="With Medication"    checked={diabetesMed==='With Medication'}    onChange={() => setDiabetesMed('With Medication')} />
                    <RB label="Without Medication" name="diabetesMed" value="Without Medication" checked={diabetesMed==='Without Medication'} onChange={() => setDiabetesMed('Without Medication')} />
                  </div>
                )}
              </div>
              <div style={{ marginBottom:'12px' }}>
                <p style={{ fontSize:'14px', marginBottom:'6px' }}>5. Does the patient have any of the following symptoms?</p>
                <div style={{ display:'flex', justifyContent:'center', gap:'40px' }}>
                  {['Polyphagia','Polydipsia','Polyuria'].map(s => (
                    <CB key={s} label={s} checked={!!symptoms[s]} onChange={() => togCB(symptoms, setSymptoms, s)} />
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', maxWidth:'600px', margin:'0 auto' }}>
                {([['FBS/RBS:',labFbs,setLabFbs,labFbsDate,setLabFbsDate],['Total Cholesterol:',labChol,setLabChol,labCholDate,setLabCholDate],['Urine Ketone:',labKetone,setLabKetone,labKetoneDate,setLabKetoneDate],['Urine Protein:',labProtein,setLabProtein,labProteinDate,setLabProteinDate]] as [string,string,React.Dispatch<React.SetStateAction<string>>,string,React.Dispatch<React.SetStateAction<string>>][]).map(([lbl,val,setVal,date,setDate]) => (
                  <div key={lbl}>
                    <div style={MS.row}><span style={{ fontSize:'13px', minWidth:'110px' }}>{lbl}</span><IInput width="100px" value={val} onChange={e => setVal(e.target.value)} /></div>
                    <div style={MS.row}><span style={{ fontSize:'13px', minWidth:'110px' }}>Date Taken:</span><IInput width="100px" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                  </div>
                ))}
              </div>
              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(7)}>Back</button>
                <button style={MS.btnNext} onClick={() => setStep(9)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 9 ── */}
        {step === 9 && (
          <>
            <div style={MS.header}>NCD HIGH-RISK ASSESSMENT (FOR 20 YRS OLD AND ABOVE)</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              <div style={{ ...MS.row, marginBottom:'12px' }}>
                <span style={{ fontWeight:'bold', fontSize:'14px' }}>Agina or Heart Attack</span>
                <RB label="Yes" name="anginaOverall" value="Yes" checked={anginaOverall==='Yes'} onChange={() => setAnginaOverall('Yes')} />
                <RB label="No"  name="anginaOverall" value="No"  checked={anginaOverall==='No'}  onChange={() => setAnginaOverall('No')} />
              </div>
              {([
                { k:'a1', q:'1. Have had any pain/discomfort pressure/ heaviness in your chest?', t:'(Nakakaramdam ka ba ng pananakit o bigat sa iyong dibdib?)',                                                            note:'if no, go to question 8' },
                { k:'a2', q:'2. Do you get the pain in the center/left chest or left arm?',        t:'(Ang sakit ba ay nasa gitna ng dibdib, sa kaliwang bahagi ng dibdib o sa kaliwang braso?)',                           note:'if no, go to question 8' },
                { k:'a3', q:'3. Do you get it when you walk uphill or hurry?',                     t:'(Nararamdaman mo ba ito kung ikaw ay nagmamadali o naglalakad nang mabilis o paahon?)' },
                { k:'a4', q:'4. Do you slowdown if you get the pain while walking?',               t:'(Tumitigil ka ba sa paglalakad kapag sumasakit ang iyong dibdib?)' },
                { k:'a5', q:'5. Does the pain go away if you stand still if you get medication?',  t:'(Nawawala ba yung sakit sa dibdib kapag ikaw ay tumitigil o umiinom ng gamot sa ilalim ng dila?)' },
              ] as { k:string; q:string; t:string; note?:string }[]).map(({ k, q, t, note }) => (
                <div key={k} style={{ marginBottom:'14px' }}>
                  <p style={{ fontSize:'14px', marginBottom:'6px' }}>{q} <em style={{ fontSize:'13px' }}>{t}</em></p>
                  <div style={{ display:'flex', justifyContent:'center', gap:'80px' }}>
                    <RB label="Yes" name={k} value="Yes" checked={angina[k]==='Yes'} onChange={() => setAngina(p => ({ ...p, [k]:'Yes' }))} />
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <RB label="No" name={k} value="No" checked={angina[k]==='No'} onChange={() => setAngina(p => ({ ...p, [k]:'No' }))} />
                      {note && <span style={{ fontSize:'12px', fontStyle:'italic', color:'#555' }}>{note}</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(8)}>Back</button>
                <button style={MS.btnNext} onClick={() => setStep(10)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 10 ── */}
        {step === 10 && (
          <>
            <div style={MS.header}>NCD HIGH-RISK ASSESSMENT (FOR 20 YRS OLD AND ABOVE)</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <div style={MS.body}>
              {([
                { k:'s6', q:'6. Does the pain go away in <10 minutes?',                                                                                t:'(Nawawala ba ang sakit sa loob ng 10 minuto?)' },
                { k:'s7', q:'7. Have you ever had severe chest pain across the front of your chest lasting for half an hour or more?',  t:'(Nakaramdam ka na ba ng pananakit ng dibdib na tumatagal ng kalahating oras o higit pa?)' },
              ] as { k:string; q:string; t:string }[]).map(({ k, q, t }) => (
                <div key={k} style={{ marginBottom:'14px' }}>
                  <p style={{ fontSize:'14px', marginBottom:'6px' }}>{q} <em style={{ fontStyle:'italic', fontSize:'13px' }}>{t}</em></p>
                  <div style={{ display:'flex', justifyContent:'center', gap:'80px' }}>
                    <RB label="Yes" name={k} value="Yes" checked={stroke[k]==='Yes'} onChange={() => setStroke(p => ({ ...p, [k]:'Yes' }))} />
                    <RB label="No"  name={k} value="No"  checked={stroke[k]==='No'}  onChange={() => setStroke(p => ({ ...p, [k]:'No' }))} />
                  </div>
                </div>
              ))}
              <div style={{ ...MS.row, marginBottom:'14px' }}>
                <span style={{ fontWeight:'bold', fontSize:'14px' }}>Stroke and TIA</span>
                <RB label="Yes" name="strokeTia" value="Yes" checked={strokeTia==='Yes'} onChange={() => setStrokeTia('Yes')} />
                <RB label="No"  name="strokeTia" value="No"  checked={strokeTia==='No'}  onChange={() => setStrokeTia('No')} />
              </div>
              <div style={{ marginBottom:'14px' }}>
                <p style={{ fontSize:'14px', marginBottom:'6px' }}>
                  8. have you ever had difficulty in talking, weakness of arms or legs on the one side of the body?{' '}
                  <em style={{ fontStyle:'italic', fontSize:'13px' }}>(Nakaramdam ka na ba ng ano man sa mga sumusunod: pagkautal, panghihina ng braso o binti, o pamamanhid ng kalahati ng katawan?)</em>
                </p>
                <div style={{ display:'flex', justifyContent:'center', gap:'80px', marginBottom:'6px' }}>
                  <RB label="Yes" name="s8" value="Yes" checked={stroke.s8==='Yes'} onChange={() => setStroke(p => ({ ...p, s8:'Yes' }))} />
                  <RB label="No"  name="s8" value="No"  checked={stroke.s8==='No'}  onChange={() => setStroke(p => ({ ...p, s8:'No' }))} />
                </div>
                <p style={{ fontSize:'12px', fontStyle:'italic', marginLeft:'20px', color:'#333' }}>
                  • If YES to number 8, you may have TIA/Stroke, must seek a doctor.
                </p>
              </div>
              <div style={{ marginBottom:'14px' }}>
                <p style={{ fontWeight:'bold', fontSize:'14px', marginBottom:'8px' }}>Risk Level</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', maxWidth:'400px' }}>
                  {['<10%','10% to <20%','20% to <30%','30% to <40%','>40%'].map(r => (
                    <label key={r} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'14px', fontWeight:'bold', cursor:'pointer' }}>
                      <input type="checkbox" checked={riskLevel===r} onChange={() => setRiskLevel(riskLevel===r?'':r)} /> {r}
                    </label>
                  ))}
                </div>
              </div>
              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(9)}>Back</button>
                <button style={{ ...MS.btnNext, opacity: saving ? 0.7 : 1 }} onClick={() => setConfirm('save')} disabled={saving}>Save</button>
              </div>
            </div>
          </>
        )}

        {/* ── Confirm: Are you sure? ── */}
        {confirm === 'save' && (
          <div style={MS.confirmOverlay}>
            <div style={MS.confirmBox}>
              <p style={{ fontSize:'22px', fontWeight:'bold', marginBottom:'24px', color:'#111' }}>Are you sure?</p>
              <div>
                <button style={MS.confirmCancel} onClick={() => setConfirm(null)}>CANCEL</button>
                <button style={MS.confirmSave}   onClick={() => setConfirm('send')}>SAVE</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Confirm: Send to Doctor? ── */}
        {confirm === 'send' && (
          <div style={MS.confirmOverlay}>
            <div style={MS.confirmBox}>
              <p style={{ fontSize:'22px', fontWeight:'bold', marginBottom:'24px', color:'#111' }}>Send It to Doctor?</p>
              <div>
                <button style={MS.confirmCancel} onClick={() => setConfirm(null)}>CANCEL</button>
                <button style={MS.confirmSave}   onClick={doSave}>{saving ? 'Saving…' : 'SEND'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Confirm: Close/discard ── */}
        {confirm === 'close' && (
          <div style={MS.confirmOverlay}>
            <div style={MS.confirmBox}>
              <p style={{ fontSize:'22px', fontWeight:'bold', marginBottom:'24px', color:'#111' }}>Are you sure?</p>
              <div>
                <button style={MS.confirmCancel} onClick={() => setConfirm(null)}>CANCEL</button>
                <button style={MS.confirmSave}   onClick={doClose}>DISCARD</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AddPatientModal