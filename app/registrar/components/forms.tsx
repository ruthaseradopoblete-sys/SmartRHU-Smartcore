'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const COLOR = {
  green:       '#1a6b2e',
  greenLight:  '#e8f5ec',
  greenBorder: '#5aad6e',
  red:         '#8B1A1A',
  white:       '#ffffff',
  bg:          '#f4f7f5',
  border:      '#b0c4b8',
  labelText:   '#2d4a35',
  inputBg:     '#ffffff',
  disabledBg:  '#eef2f0',
  text:        '#1a2e20',
  muted:       '#607a6a',
}

// ─── BASE STYLES ──────────────────────────────────────────────────────────────
const MS: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    zIndex: 1000, padding: '20px', overflowY: 'auto',
  },
  modal: {
    background: COLOR.white, width: '100%', maxWidth: '860px',
    borderRadius: '10px', position: 'relative', fontFamily: "'Segoe UI', Arial, sans-serif",
    marginTop: '10px', marginBottom: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  },
  header: {
    background: COLOR.green, color: COLOR.white, textAlign: 'center',
    padding: '13px 50px', fontSize: '15px', fontWeight: '700',
    borderRadius: '10px 10px 0 0', letterSpacing: '0.3px',
  },
  body: { padding: '20px 28px', background: COLOR.bg },
  closeBtn: {
    position: 'absolute', top: '8px', right: '16px',
    background: 'none', border: 'none', fontSize: '26px',
    color: '#fff', cursor: 'pointer', fontWeight: 'bold', lineHeight: 1, zIndex: 10,
    opacity: 0.85,
  },

  // ── FIELD LAYOUT ──
  row: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' as const },
  col: { display: 'flex', flexDirection: 'column' as const, gap: '2px' },

  // ── LABELS ──
  label: {
    fontSize: '12px', fontWeight: '700', color: COLOR.labelText,
    whiteSpace: 'nowrap' as const, textTransform: 'uppercase' as const, letterSpacing: '0.4px',
  },
  subLabel: {
    fontSize: '11px', color: COLOR.muted, textAlign: 'center' as const,
  },
  sectionTitle: {
    fontSize: '14px', fontWeight: '700', color: COLOR.green,
    borderBottom: `2px solid ${COLOR.greenBorder}`,
    paddingBottom: '4px', marginBottom: '12px', marginTop: '4px',
  },

  // ── INPUTS ──
  input: {
    border: `1.5px solid ${COLOR.border}`,
    padding: '6px 10px',
    fontSize: '13px',
    borderRadius: '5px',
    outline: 'none',
    background: COLOR.inputBg,
    color: COLOR.text,
    transition: 'border-color 0.15s',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  inputSm: {
    border: `1.5px solid ${COLOR.border}`,
    padding: '6px 8px',
    fontSize: '13px',
    borderRadius: '5px',
    outline: 'none',
    background: COLOR.inputBg,
    color: COLOR.text,
    fontFamily: "'Segoe UI', Arial, sans-serif",
    boxSizing: 'border-box' as const,
  },

  // ── CHECKBOX / RADIO ──
  checkLabel: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', cursor: 'pointer', color: COLOR.text,
    padding: '3px 0',
  },
  radioLabel: {
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '13px', cursor: 'pointer', color: COLOR.text,
  },

  // ── DIVIDER ──
  greenDivider: { height: '3px', background: COLOR.green, margin: '14px -28px' },

  // ── BUTTONS ──
  btnRow: {
    display: 'flex', justifyContent: 'flex-end', gap: '10px',
    marginTop: '18px', paddingTop: '14px', borderTop: `2px solid ${COLOR.green}`,
  },
  btnBack: {
    background: COLOR.red, color: COLOR.white, border: 'none',
    padding: '9px 32px', borderRadius: '5px', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', letterSpacing: '0.3px',
  },
  btnNext: {
    background: COLOR.green, color: COLOR.white, border: 'none',
    padding: '9px 32px', borderRadius: '5px', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', letterSpacing: '0.3px',
  },

  // ── CONFIRM MODAL ──
  confirmOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000,
  },
  confirmBox: {
    background: COLOR.white, borderRadius: '12px', padding: '36px 52px',
    textAlign: 'center' as const, minWidth: '320px',
    boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
  },
  confirmCancel: {
    background: COLOR.red, color: COLOR.white, border: 'none',
    padding: '10px 30px', borderRadius: '6px', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', marginRight: '12px',
  },
  confirmSave: {
    background: COLOR.white, color: COLOR.green,
    border: `2px solid ${COLOR.green}`,
    padding: '10px 30px', borderRadius: '6px', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer',
  },

  // ── FIELD WRAPPER (card-like) ──
  fieldGroup: {
    background: COLOR.white, border: `1px solid ${COLOR.border}`,
    borderRadius: '7px', padding: '14px 16px', marginBottom: '14px',
  },
}

// ─── FIELD CARD WRAPPER ───────────────────────────────────────────────────────
function FieldCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...MS.fieldGroup, ...style }}>{children}</div>
}

// ─── LABELED INPUT ────────────────────────────────────────────────────────────
function LabeledInput({
  label, sublabel, value, onChange, type = 'text', width, flex, placeholder,
}: {
  label: string; sublabel?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; width?: string; flex?: number; placeholder?: string;
}) {
  return (
    <div style={{ ...MS.col, width: width || (flex ? undefined : 'auto'), flex: flex }}>
      <span style={MS.label}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ''}
        style={{ ...MS.inputSm, width: width || '100%' }}
      />
      {sublabel && <span style={MS.subLabel}>{sublabel}</span>}
    </div>
  )
}

// ─── INLINE INPUT (fixed width, no label) ─────────────────────────────────────
function IInput({
  width = '80px', type = 'text', value, onChange, placeholder,
}: {
  width?: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder || ''}
      style={{ ...MS.inputSm, width }}
    />
  )
}

// ─── CHECKBOX ─────────────────────────────────────────────────────────────────
function CB({
  label, checked, onChange, children,
}: { label?: string; checked: boolean; onChange: () => void; children?: React.ReactNode }) {
  return (
    <label style={MS.checkLabel}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer' }} />
      {label}{children}
    </label>
  )
}

// ─── RADIO BUTTON ─────────────────────────────────────────────────────────────
function RB({
  label, name, value, checked, onChange,
}: { label: string; name: string; value: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={MS.radioLabel}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange}
        style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer' }} />
      {label}
    </label>
  )
}

// ─── YES / NO ROW ─────────────────────────────────────────────────────────────
function YesNo({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '6px' }}>
      <RB label="Yes" name={name} value="Yes" checked={value === 'Yes'} onChange={() => onChange('Yes')} />
      <RB label="No"  name={name} value="No"  checked={value === 'No'}  onChange={() => onChange('No')} />
    </div>
  )
}

// ─── SECTION DIVIDER ──────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={MS.sectionTitle}>{children}</div>
}

// ─── ADD PATIENT MODAL ────────────────────────────────────────────────────────
function AddPatientModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const [step,    setStep]    = useState(1)
  const [confirm, setConfirm] = useState<null | 'close' | 'save' | 'send'>(null)
  const [saving,  setSaving]  = useState(false)

  // Step 1
  const [s1, setS1] = useState({
    lastName: '', firstName: '', middleName: '',
    age: '', sexF: false, sexM: false, birthdate: '',
    purok: '', barangay: '', municipality: '',
    contact: '', email: '', philhealth: '',
    memberMember: false, memberDependent: false, memberSpecify: '',
    regDate: '', kkpSign: false,
    fac1: '', fac1chk: false, fac2: '', fac2chk: false, fac3: '', fac3chk: false,
    atCode: '', atNoAtc: false, apptDate: '', faceCapture: false,
  })

  // Step 2
  const DISEASES = ['Allergy','Asthma','Cancer','Cerebrovascular Disease','Coronary Artery Disease','Diabetes Mellitus','Emphysema','Epilepsy / Seizure Disorder','Hepatitis','Hyperlipidemia','Hypertension','Peptic Ulcer','Pneumonia','Thyroid Disease','PTB','Urinary Tract Infection','Mental Illness','Others']
  const [pastMed,     setPastMed]     = useState<Record<string, boolean>>({})
  const [pastMedSpec, setPastMedSpec] = useState<Record<string, string>>({})
  const [famHist,     setFamHist]     = useState<Record<string, boolean>>({})
  const [famHistSpec, setFamHistSpec] = useState<Record<string, string>>({})
  const [surgery,     setSurgery]     = useState('')
  const [surgDate,    setSurgDate]    = useState('')

  // Step 3
  const [smoking,     setSmoking]     = useState('')
  const [packsYear,   setPacksYear]   = useState('')
  const [alcohol,     setAlcohol]     = useState('')
  const [servingsDay, setServingsDay] = useState('')
  const [illicit,     setIllicit]     = useState('')
  const [sexually,    setSexually]    = useState('')
  const [immun,       setImmun]       = useState<Record<string, boolean>>({})
  const [immunOther,  setImmunOther]  = useState('')

  // Step 4
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
  const [pedia,     setPedia]     = useState<Record<string, string>>({})

  // Step 6
  const [genSurvey,    setGenSurvey]    = useState<Record<string, boolean>>({})
  const [heent,        setHeent]        = useState<Record<string, boolean>>({})
  const [chest,        setChest]        = useState<Record<string, boolean>>({})
  const [heart,        setHeart]        = useState<Record<string, boolean>>({})
  const [abdomen,      setAbdomen]      = useState<Record<string, boolean>>({})
  const [heentOther,   setHeentOther]   = useState('')
  const [chestOther,   setChestOther]   = useState('')
  const [heartOther,   setHeartOther]   = useState('')
  const [abdomenOther, setAbdomenOther] = useState('')

  // Step 7
  const [genito,      setGenito]      = useState<Record<string, boolean>>({})
  const [rectal,      setRectal]      = useState<Record<string, boolean>>({})
  const [skin,        setSkin]        = useState<Record<string, boolean>>({})
  const [neuro,       setNeuro]       = useState<Record<string, boolean>>({})
  const [genitOther,  setGenitOther]  = useState('')
  const [rectalOther, setRectalOther] = useState('')
  const [skinOther,   setSkinOther]   = useState('')
  const [neuroOther,  setNeuroOther]  = useState('')
  const [assessment,  setAssessment]  = useState<Record<string, boolean>>({})

  // Step 8
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

  // Step 9
  const [anginaOverall, setAnginaOverall] = useState('')
  const [angina,        setAngina]        = useState<Record<string, string>>({})

  // Step 10
  const [stroke,    setStroke]    = useState<Record<string, string>>({})
  const [strokeTia, setStrokeTia] = useState('')
  const [riskLevel, setRiskLevel] = useState('')

  if (!isOpen) return null

  const togCB = (state: Record<string, boolean>, setState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, key: string) =>
    setState(p => ({ ...p, [key]: !p[key] }))

  const tryInsert = async (table: string, row: Record<string, any>) => {
    const { error } = await supabase.from(table).insert([row])
    if (error) console.warn(`${table} skipped:`, error.message)
  }

  const doSave = async () => {
    setSaving(true)
    try {
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

      await tryInsert('konsulta_registrations', {
        patient_id: pid, registration_date: s1.regDate || null,
        kkp_sign: s1.kkpSign, facility_choice_1: s1.fac1 || null,
        facility_kkp_1: s1.fac1chk, facility_choice_2: s1.fac2 || null,
        facility_kkp_2: s1.fac2chk, facility_choice_3: s1.fac3 || null,
        facility_kkp_3: s1.fac3chk, has_at_code: s1.atNoAtc,
        at_code: s1.atCode || null, date_of_appointment: s1.apptDate || null,
        face_capture: s1.faceCapture,
      })

      const pmSpec = pastMedSpec
      await tryInsert('past_medical_history', {
        patient_id: pid,
        allergy: !!pastMed['Allergy'], allergy_specify: pmSpec['Allergy'] || null,
        asthma: !!pastMed['Asthma'], cancer: !!pastMed['Cancer'], cancer_specify: pmSpec['Cancer'] || null,
        cerebrovascular_disease: !!pastMed['Cerebrovascular Disease'],
        coronary_artery_disease: !!pastMed['Coronary Artery Disease'],
        diabetes_mellitus: !!pastMed['Diabetes Mellitus'], emphysema: !!pastMed['Emphysema'],
        epilepsy_seizure: !!pastMed['Epilepsy / Seizure Disorder'],
        hepatitis: !!pastMed['Hepatitis'], hepatitis_specify: pmSpec['Hepatitis'] || null,
        hyperlipidemia: !!pastMed['Hyperlipidemia'], hypertension: !!pastMed['Hypertension'],
        hypertension_highest_bp: pmSpec['Hypertension'] || null,
        peptic_ulcer: !!pastMed['Peptic Ulcer'], pneumonia: !!pastMed['Pneumonia'],
        thyroid_disease: !!pastMed['Thyroid Disease'], ptb: !!pastMed['PTB'],
        ptb_specify_extra: pmSpec['PTB'] || null,
        urinary_tract_infection: !!pastMed['Urinary Tract Infection'],
        mental_illness: !!pastMed['Mental Illness'], others: !!pastMed['Others'],
        past_surgeries_done: surgery || null, date_surgery_done: surgDate || null,
      })

      const fhSpec = famHistSpec
      await tryInsert('family_history', {
        patient_id: pid,
        allergy: !!famHist['Allergy'], allergy_specify: fhSpec['Allergy'] || null,
        asthma: !!famHist['Asthma'], cancer: !!famHist['Cancer'], cancer_specify: fhSpec['Cancer'] || null,
        cerebrovascular_disease: !!famHist['Cerebrovascular Disease'],
        coronary_artery_disease: !!famHist['Coronary Artery Disease'],
        diabetes_mellitus: !!famHist['Diabetes Mellitus'], emphysema: !!famHist['Emphysema'],
        epilepsy_seizure: !!famHist['Epilepsy / Seizure Disorder'],
        hepatitis: !!famHist['Hepatitis'], hepatitis_specify: fhSpec['Hepatitis'] || null,
        hyperlipidemia: !!famHist['Hyperlipidemia'], hypertension: !!famHist['Hypertension'],
        hypertension_highest_bp: fhSpec['Hypertension'] || null,
        peptic_ulcer: !!famHist['Peptic Ulcer'], pneumonia: !!famHist['Pneumonia'],
        thyroid_disease: !!famHist['Thyroid Disease'], ptb: !!famHist['PTB'],
        ptb_specify_extra: fhSpec['PTB'] || null,
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
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        blood_pressure_mmhg: bp || null,
        heart_rate_bpm: hr ? parseInt(hr) : null,
        temperature_c: temp ? parseFloat(temp) : null,
        respiratory_rate_cpm: rr ? parseInt(rr) : null,
        blood_type: bloodType || null,
        visual_acuity_right_eye: visRight || null,
        visual_acuity_left_eye: visLeft || null,
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
        chest_wheeze: !!chest['Wheeze'],
        chest_crackle_rales: !!chest['Crackle / Rales'],
        chest_retractions: !!chest['Retractions'],
        chest_lumps_over_breast: !!chest['Lumps Over Breast'],
        chest_other: chestOther || null,
        heart_essentially_normal: !!heart['Essentially Normal'],
        heart_displaced_apex_beat: !!heart['Displaced Apex Beat'],
        heart_heave_trills: !!heart['Heave Trills'],
        heart_irregular_rhythm: !!heart['Irregular Rhythm'],
        heart_muffled_sounds: !!heart['Muffled Heart Sounds'],
        heart_murmurs: !!heart['Murmurs'],
        heart_pericardial_bulge: !!heart['Pericardial Bulge'],
        heart_others: heartOther || null,
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
        dre_crackle_rales: !!rectal['Crackle / Rales'],
        dre_enlarge_prostate: !!rectal['Enlarge Prostate'],
        dre_mass: !!rectal['Mass'],
        dre_hemorrhoids: !!rectal['Hemorrhoids'],
        dre_pus: !!rectal['Pus'],
        dre_not_applicable: !!rectal['Not Applicable'],
        dre_others: rectalOther || null,
        skin_essentially_normal: !!skin['Essentially Normal'],
        skin_clubbing: !!skin['Clubbing'],
        skin_cold_clammy: !!skin['Cold Clammy'],
        skin_cyanosis_mottled: !!skin['Cyanosis Mottled Skin'],
        skin_edema_swelling: !!skin['Edemal / Swelling'],
        skin_decreased_mobility: !!skin['Decreased Mobility'],
        skin_pale_nailbeds: !!skin['Pale Nailbeds'],
        skin_weak_pulses: !!skin['Weak Pulses'],
        skin_others: skinOther || null,
        neuro_essentially_normal: !!neuro['Essentially Normal'],
        neuro_abnormal_gait: !!neuro['Abnormal Gait'],
        neuro_abnormal_position_sense: !!neuro['Abnormal Position Sense'],
        neuro_abnormal_sensation: !!neuro['Abnormal Sensation'],
        neuro_abnormal_reflexes: !!neuro['Abnormal Reflex/es'],
        neuro_poor_altered_memory: !!neuro['Poor/ Altered Memory'],
        neuro_poor_muscle_tone: !!neuro['Poor Muscle Tone/ Strength'],
        neuro_poor_coordination: !!neuro['Poor Coordination'],
        neuro_others: neuroOther || null,
        encounter_generally_well: !!assessment['GENERALLY WELL'],
        encounter_primary_care_consult: !!assessment['FOR PRIMARY CARE CONSULTAION'],
        encounter_diagnostic_exam: !!assessment['FOR DIAGNOSTIC EXAMINATION'],
      })

      await tryInsert('ncd_high_risk_assessment', {
        patient_id: pid,
        eats_processed_food_weekly:    ncd8['q1'] === 'Yes' ? true : ncd8['q1'] === 'No' ? false : null,
        eats_fruits_vegetables_daily:  ncd8['q2'] === 'Yes' ? true : ncd8['q2'] === 'No' ? false : null,
        does_physical_activity_weekly: ncd8['q3'] === 'Yes' ? true : ncd8['q3'] === 'No' ? false : null,
        diagnosed_with_diabetes: diabetesYes ? true : null,
        diabetes_do_not_know: diabetesNo ? true : null,
        diabetes_with_medication:    diabetesMed === 'With Medication'    ? true : null,
        diabetes_without_medication: diabetesMed === 'Without Medication' ? true : null,
        symptom_polyphagia: !!symptoms['Polyphagia'],
        symptom_polydipsia: !!symptoms['Polydipsia'],
        symptom_polyuria:   !!symptoms['Polyuria'],
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

  // ── STEP INDICATOR ──
  const StepIndicator = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '10px 0 4px', background: '#e8f5ec' }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <div key={n} style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: n === step ? COLOR.green : n < step ? COLOR.greenBorder : '#c8dece',
          color: n <= step ? '#fff' : COLOR.muted,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: '700', cursor: n < step ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }} onClick={() => n < step && setStep(n)}>{n}</div>
      ))}
    </div>
  )

 const DiseaseRow = ({
  d, med, medSpec, setMed, setMedSpec,
          }: {
            d: string;
            med: Record<string, boolean>;
            medSpec: Record<string, string>;
            setMed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
            setMedSpec: React.Dispatch<React.SetStateAction<Record<string, string>>>;
          }) => (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <input type="checkbox" checked={!!med[d]} onChange={() => togCB(med, setMed, d)}
                  style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: COLOR.text }}>{d}</span>

                {/* Allergy — always show specify */}
                {d === 'Allergy' && (
                  <>
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>(Specify:</span>
                    <IInput width="100px" value={medSpec[d] || ''} onChange={e => setMedSpec(p => ({ ...p, [d]: e.target.value }))} />
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>)</span>
                  </>
                )}

                {/* Cancer — always show specify */}
                {d === 'Cancer' && (
                  <>
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>(Specify:</span>
                    <IInput width="100px" value={medSpec[d] || ''} onChange={e => setMedSpec(p => ({ ...p, [d]: e.target.value }))} />
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>)</span>
                  </>
                )}

                {/* Hepatitis — always show specify */}
                {d === 'Hepatitis' && (
                  <>
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>(Specify:</span>
                    <IInput width="100px" value={medSpec[d] || ''} onChange={e => setMedSpec(p => ({ ...p, [d]: e.target.value }))} />
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>)</span>
                  </>
                )}

                {/* Hypertension — always show Highest BP */}
                {d === 'Hypertension' && (
                  <>
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>(Highest BP:</span>
                    <IInput width="80px" value={medSpec[d] || ''} onChange={e => setMedSpec(p => ({ ...p, [d]: e.target.value }))} />
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>mmHg)</span>
                  </>
                )}

                {/* PTB — always show Specify Extra PTB */}
                {d === 'PTB' && (
                  <>
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>(Specify Extra PTB:</span>
                    <IInput width="100px" value={medSpec[d] || ''} onChange={e => setMedSpec(p => ({ ...p, [d]: e.target.value }))} />
                    <span style={{ fontSize: '12px', color: COLOR.muted }}>)</span>
                  </>
                )}
              </div>
            </div>
          )
  // ── SYSTEM FINDINGS PANEL (steps 6–7) ──
  const SystemPanel = ({
    title, state, setState, other, setOther, items,
  }: {
    title: string;
    state: Record<string, boolean>;
    setState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    other: string;
    setOther: React.Dispatch<React.SetStateAction<string>>;
    items: string[];
  }) => {
    const half = Math.ceil(items.length / 2)
    return (
      <FieldCard>
        <div style={{ fontSize: '13px', fontWeight: '700', color: COLOR.green, marginBottom: '8px', borderBottom: `1px solid ${COLOR.greenBorder}`, paddingBottom: '4px' }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
          {items.map(item => (
            <CB key={item} label={item} checked={!!state[item]} onChange={() => togCB(state, setState, item)} />
          ))}
          <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
            <label style={{ ...MS.checkLabel }}>
              <input type="checkbox" checked={!!state['Others']} onChange={() => togCB(state, setState, 'Others')}
                style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer' }} />
              <span style={{ fontSize: '13px' }}>Others:</span>
              <input style={{ ...MS.inputSm, flex: 1, minWidth: 0 }} value={other} onChange={e => setOther(e.target.value)} />
            </label>
          </div>
        </div>
      </FieldCard>
    )
  }

  return (
    <div style={MS.overlay}>
      <div style={MS.modal}>

        {/* ══════════════════════════════════════════════════════
            STEP 1 — General Data & Konsulta Registration
        ══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <>
            <div style={MS.header}>General Data and Konsulta Registration</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>

              <FieldCard>
                <SectionTitle>Patient Information</SectionTitle>

                {/* Full Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <LabeledInput label="Last Name" value={s1.lastName} onChange={e => setS1(p => ({ ...p, lastName: e.target.value }))} />
                  <LabeledInput label="First Name" value={s1.firstName} onChange={e => setS1(p => ({ ...p, firstName: e.target.value }))} />
                  <LabeledInput label="Middle Name" value={s1.middleName} onChange={e => setS1(p => ({ ...p, middleName: e.target.value }))} />
                </div>

                {/* Age / Sex / Birthdate */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'flex-end' }}>
                  <LabeledInput label="Age" width="70px" value={s1.age} onChange={e => setS1(p => ({ ...p, age: e.target.value }))} />
                  <div style={MS.col}>
                    <span style={MS.label}>Sex</span>
                    <div style={{ display: 'flex', gap: '16px', padding: '6px 0' }}>
                      <label style={MS.checkLabel}>
                        <input type="checkbox" checked={s1.sexF} onChange={() => setS1(p => ({ ...p, sexF: !p.sexF, sexM: false }))}
                          style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer' }} /> Female
                      </label>
                      <label style={MS.checkLabel}>
                        <input type="checkbox" checked={s1.sexM} onChange={() => setS1(p => ({ ...p, sexM: !p.sexM, sexF: false }))}
                          style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer' }} /> Male
                      </label>
                    </div>
                  </div>
                  <LabeledInput label="Birthdate" sublabel="" width="150px" type="date" value={s1.birthdate} onChange={e => {
                    const bd = e.target.value
                    const computed = bd ? Math.floor((new Date().getTime() - new Date(bd).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : ''
                    setS1(p => ({ ...p, birthdate: bd, age: computed === '' ? '' : String(computed) }))
                  }} />
                </div>

                {/* Address */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <LabeledInput label="Purok" value={s1.purok} onChange={e => setS1(p => ({ ...p, purok: e.target.value }))} />
                  <LabeledInput label="Barangay" value={s1.barangay} onChange={e => setS1(p => ({ ...p, barangay: e.target.value }))} />
                  <LabeledInput label="Municipality" value={s1.municipality} onChange={e => setS1(p => ({ ...p, municipality: e.target.value }))} />
                </div>

                {/* Contact / Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <LabeledInput label="Contact Number" value={s1.contact} onChange={e => setS1(p => ({ ...p, contact: e.target.value }))} />
                  <LabeledInput label="E-mail Address" type="email" value={s1.email} onChange={e => setS1(p => ({ ...p, email: e.target.value }))} />
                </div>

                {/* PhilHealth / Member */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '6px' }}>
                  <LabeledInput label="PhilHealth PIN" value={s1.philhealth} onChange={e => setS1(p => ({ ...p, philhealth: e.target.value }))} />
                  <div style={MS.col}>
                    <span style={MS.label}>Member Type</span>
                    <div style={{ display: 'flex', gap: '16px', padding: '6px 0', flexWrap: 'wrap', alignItems: 'center' }}>
                      <CB label="Member"    checked={s1.memberMember}    onChange={() => setS1(p => ({ ...p, memberMember:    !p.memberMember }))} />
                      <CB label="Dependent" checked={s1.memberDependent} onChange={() => setS1(p => ({ ...p, memberDependent: !p.memberDependent }))} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: COLOR.muted }}>Specify:</span>
                        <IInput width="110px" value={s1.memberSpecify} onChange={e => setS1(p => ({ ...p, memberSpecify: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>
              </FieldCard>

              <FieldCard>
                <SectionTitle>Konsulta Registration</SectionTitle>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'flex-end' }}>
                  <LabeledInput label="Registration Date" sublabel="" width="150px" type="date" value={s1.regDate} onChange={e => setS1(p => ({ ...p, regDate: e.target.value }))} />
                  <div style={MS.col}>
                    <span style={MS.label}>KKP Sign</span>
                    <div style={{ padding: '6px 0' }}><CB checked={s1.kkpSign} onChange={() => setS1(p => ({ ...p, kkpSign: !p.kkpSign }))} /></div>
                  </div>
                </div>

                <div style={MS.col}>
                  <span style={MS.label}>Preferred Facility and Address</span>
                  {(['fac1', 'fac2', 'fac3'] as const).map((k, i) => {
                    const chk = (['fac1chk', 'fac2chk', 'fac3chk'] as const)[i]
                    return (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '13px', color: COLOR.muted, width: '68px', flexShrink: 0 }}>Choice {i + 1}:</span>
                        <input style={{ ...MS.inputSm, flex: 1 }} value={s1[k]} onChange={e => setS1(p => ({ ...p, [k]: e.target.value }))} />
                        <CB checked={s1[chk]} onChange={() => setS1(p => ({ ...p, [chk]: !p[chk] }))} />
                      </div>
                    )
                  })}
                </div>
              </FieldCard>

              <FieldCard>
                <SectionTitle>Authorization Transaction</SectionTitle>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>

                  {/* Checkbox + AT Code grouped together */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={MS.label}>AT Code</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={s1.atNoAtc}
                        onChange={() => setS1(p => ({ ...p, atNoAtc: !p.atNoAtc }))}
                        style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <input
                        type="text"
                        value={s1.atCode}
                        onChange={e => setS1(p => ({ ...p, atCode: e.target.value }))}
                        style={{ ...MS.inputSm, width: '130px' }}
                      />
                    </div>
                  </div>

                  {/* Date of Appointment */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={MS.label}>Date of Appointment</span>
                    <input
                      type="date"
                      value={s1.apptDate}
                      onChange={e => setS1(p => ({ ...p, apptDate: e.target.value }))}
                      style={{ ...MS.inputSm, width: '160px' }}
                    />
                    <span style={MS.subLabel}></span>
                  </div>

                  {/* If No ATC — Face Capture */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={MS.label}>If No ATC</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
                      <input
                        type="checkbox"
                        checked={s1.faceCapture}
                        onChange={() => setS1(p => ({ ...p, faceCapture: !p.faceCapture }))}
                        style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px', color: COLOR.text }}>Face Capture</span>
                    </div>
                  </div>

                </div>
              </FieldCard>

              <div style={MS.btnRow}>
                <button style={MS.btnNext} onClick={() => setStep(2)}>Next →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2 — Past Medical & Family History
        ══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FieldCard>
                  <SectionTitle>Past Medical History</SectionTitle>
                  {DISEASES.map(d => (
                    <DiseaseRow key={d} d={d} med={pastMed} medSpec={pastMedSpec} setMed={setPastMed} setMedSpec={setPastMedSpec} />
                  ))}
                  <div style={{ borderTop: `1px solid ${COLOR.border}`, marginTop: '10px', paddingTop: '10px' }}>
                    <LabeledInput label="Past Surgery/ies Done" value={surgery} onChange={e => setSurgery(e.target.value)} />
                    <div style={{ marginTop: '8px' }}>
                      <LabeledInput label="Date Done" sublabel="" width="150px" type="date" value={surgDate} onChange={e => setSurgDate(e.target.value)} />
                    </div>
                  </div>
                </FieldCard>

                <FieldCard>
                  <SectionTitle>Family History</SectionTitle>
                  {DISEASES.map(d => (
                    <DiseaseRow key={d} d={d} med={famHist} medSpec={famHistSpec} setMed={setFamHist} setMedSpec={setFamHistSpec} />
                  ))}
                </FieldCard>
              </div>

              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(1)}>← Back</button>
                <button style={MS.btnNext} onClick={() => setStep(3)}>Next →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 3 — Personal/Social History & Immunization
        ══════════════════════════════════════════════════════ */}
        {step === 3 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FieldCard>
                  <SectionTitle>Personal / Social History</SectionTitle>
                  {([
                    ['Smoking',       smoking,  setSmoking],
                    ['Alcohol',       alcohol,  setAlcohol],
                    ['Illicit Drugs', illicit,  setIllicit],
                    ['Sexually Active', sexually, setSexually],
                  ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, setVal]) => (
                    <div key={label} style={{ marginBottom: '12px' }}>
                      <span style={MS.label}>{label}</span>
                      <div style={{ display: 'flex', gap: '16px', padding: '6px 0' }}>
                        {['Yes', 'No', 'Quit'].map(opt => (
                          <RB key={opt} label={opt} name={label} value={opt} checked={val === opt} onChange={() => setVal(opt)} />
                        ))}
                      </div>
                      {label === 'Smoking' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '12px', color: COLOR.muted }}>Packs-Year:</span>
                          <IInput width="100px" value={packsYear} onChange={e => setPacksYear(e.target.value)} />
                        </div>
                      )}
                      {label === 'Alcohol' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '12px', color: COLOR.muted }}>Servings/day:</span>
                          <IInput width="100px" value={servingsDay} onChange={e => setServingsDay(e.target.value)} />
                        </div>
                      )}
                    </div>
                  ))}
                </FieldCard>

                <FieldCard>
                  <SectionTitle>Immunization History</SectionTitle>

                  <div style={{ fontSize: '12px', fontWeight: '700', color: COLOR.muted, marginBottom: '6px', textTransform: 'uppercase' }}>Children</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '12px' }}>
                    {['BCG', 'OPV1', 'OPV2', 'OPV3', 'DPT1', 'DPT2', 'DPT3', 'Measles', 'Hapa1', 'Hapa2', 'Hapa3', 'Varicella'].map((v, i) => (
                      <CB key={v + i} label={v} checked={!!immun[v + i]} onChange={() => togCB(immun, setImmun, v + String(i))} />
                    ))}
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: '700', color: COLOR.muted, marginBottom: '6px', textTransform: 'uppercase' }}>Adult</div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                    {['HPV', 'MMR', 'None'].map(v => (
                      <CB key={v} label={v} checked={!!immun[v]} onChange={() => togCB(immun, setImmun, v)} />
                    ))}
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: '700', color: COLOR.muted, marginBottom: '6px', textTransform: 'uppercase' }}>Elderly & Immunocompromised</div>
                  <CB label="Pneumococcal Vaccine" checked={!!immun.pneumo} onChange={() => togCB(immun, setImmun, 'pneumo')} />
                  <CB label="Flu Vaccine"          checked={!!immun.flu}    onChange={() => togCB(immun, setImmun, 'flu')} />

                  <div style={{ marginTop: '10px' }}>
                    <LabeledInput label="Others" value={immunOther} onChange={e => setImmunOther(e.target.value)} />
                  </div>
                </FieldCard>
              </div>

              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(2)}>← Back</button>
                <button style={MS.btnNext} onClick={() => setStep(4)}>Next →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 4 — Family Planning, Menstrual & Pregnancy History
        ══════════════════════════════════════════════════════ */}
        {step === 4 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>

              <FieldCard>
                <SectionTitle>Family Planning</SectionTitle>
                <CB label="With access to family planning counseling" checked={fpAccess} onChange={() => setFpAccess(p => !p)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <LabeledInput label="Provider" value={fpProvider} onChange={e => setFpProvider(e.target.value)} />
                  <LabeledInput label="Birth Control Method Used" value={fpMethod} onChange={e => setFpMethod(e.target.value)} />
                </div>
              </FieldCard>

              <FieldCard>
                <SectionTitle>Menstrual History</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    <LabeledInput label="Menarche" width="80px" value={menarche} onChange={e => setMenarche(e.target.value)} />
                    <span style={{ fontSize: '12px', color: COLOR.muted, paddingBottom: '8px' }}>yrs old</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    <LabeledInput label="Onset of Sexual Intercourse" width="80px" value={onsetSex} onChange={e => setOnsetSex(e.target.value)} />
                    <span style={{ fontSize: '12px', color: COLOR.muted, paddingBottom: '8px' }}>yrs old</span>
                  </div>
                  <LabeledInput label="Last Menstrual Period" sublabel="" width="150px" type="date" value={lmp} onChange={e => setLmp(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    <LabeledInput label="Period Duration" width="70px" value={periodDur} onChange={e => setPeriodDur(e.target.value)} />
                    <span style={{ fontSize: '12px', color: COLOR.muted, paddingBottom: '8px' }}>days</span>
                  </div>
                  <LabeledInput label="No. of Pads/day" width="70px" value={padsDay} onChange={e => setPadsDay(e.target.value)} />
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    <LabeledInput label="Interval Cycle" width="70px" value={intervalCycle} onChange={e => setIntervalCycle(e.target.value)} />
                    <span style={{ fontSize: '12px', color: COLOR.muted, paddingBottom: '8px' }}>days</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={MS.label}>Menopause:</span>
                  <CB label="Yes" checked={menopauseYes} onChange={() => { setMenopauseYes(p => !p); setMenopauseNo(false) }} />
                  <CB label="No"  checked={menopauseNo}  onChange={() => { setMenopauseNo(p => !p);  setMenopauseYes(false) }} />
                  {menopauseYes && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                      <LabeledInput label="Age at Menopause" width="70px" value={ageMenopause} onChange={e => setAgeMenopause(e.target.value)} />
                      <span style={{ fontSize: '12px', color: COLOR.muted, paddingBottom: '8px' }}>years</span>
                    </div>
                  )}
                </div>
              </FieldCard>

              <FieldCard>
                <SectionTitle>Pregnancy History</SectionTitle>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px' }}>
                  {([['G', pregG, setPregG], ['P', pregP, setPregP], ['(T', pregT, setPregT], ['P', pregP2, setPregP2], ['A', pregA, setPregA], ['L', pregL, setPregL]] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([l, v, sv], i) => (
                    <div key={i} style={MS.col}>
                      <span style={MS.label}>{l}</span>
                      <IInput width="50px" value={v} onChange={e => sv(e.target.value)} />
                    </div>
                  ))}
                  <span style={{ fontSize: '18px', color: COLOR.muted, paddingBottom: '4px' }}>)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <LabeledInput label="Type of Delivery" value={delivery} onChange={e => setDelivery(e.target.value)} />
                  <div style={MS.col}>
                    <span style={MS.label}>Pregnancy Include Hypertension</span>
                    <div style={{ display: 'flex', gap: '16px', padding: '6px 0' }}>
                      <CB label="Yes" checked={pregHtnYes} onChange={() => { setPregHtnYes(p => !p); setPregHtnNo(false) }} />
                      <CB label="No"  checked={pregHtnNo}  onChange={() => { setPregHtnNo(p => !p);  setPregHtnYes(false) }} />
                    </div>
                  </div>
                </div>
              </FieldCard>

              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(3)}>← Back</button>
                <button style={MS.btnNext} onClick={() => setStep(5)}>Next →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 5 — Physical Examination Findings
        ══════════════════════════════════════════════════════ */}
        {step === 5 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>

              <FieldCard>
                <SectionTitle>Pertinent Physical Examination Findings</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                  {([
                    ['Height',     height, setHeight, 'cm'],
                    ['Weight',     weight, setWeight, 'kg'],
                    ['Blood Pressure', bp, setBp,     'mmHg'],
                    ['Heart Rate', hr,     setHr,     'bpm'],
                    ['Temperature', temp,  setTemp,   '°C'],
                    ['Respiratory Rate', rr, setRr,  'cpm'],
                  ] as [string, string, React.Dispatch<React.SetStateAction<string>>, string][]).map(([lbl, val, setVal, unit]) => (
                    <div key={lbl} style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                      <LabeledInput label={`${lbl}`} value={val} onChange={e => setVal(e.target.value)} />
                      <span style={{ fontSize: '12px', color: COLOR.muted, paddingBottom: '8px', flexShrink: 0 }}>{unit}</span>
                    </div>
                  ))}
                </div>

                <div style={MS.col}>
                  <span style={MS.label}>Blood Type</span>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '6px 0' }}>
                    {['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'].map(t => (
                      <label key={t} style={MS.checkLabel}>
                        <input type="checkbox" checked={bloodType === t} onChange={() => setBloodType(bloodType === t ? '' : t)}
                          style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer' }} /> {t}
                      </label>
                    ))}
                  </div>
                </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <span style={MS.label}>Visual Acuity:</span>
                <span style={{ fontSize: '13px', color: COLOR.muted }}>Right Eye</span>
                <input
                  type="text"
                  value={visRight}
                  onChange={e => setVisRight(e.target.value)}
                  style={{ ...MS.inputSm, width: '120px' }}
                />
                <span style={{ fontSize: '13px', color: COLOR.muted }}>Left Eye</span>
                <input
                  type="text"
                  value={visLeft}
                  onChange={e => setVisLeft(e.target.value)}
                  style={{ ...MS.inputSm, width: '120px' }}
                />
              </div>
              </FieldCard>

              <FieldCard>
                <SectionTitle>Pedia Client Aged 0–24 Months</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {['Body Length', 'Head Circumference', 'Chest Circumference', 'Abdominal Circumference', 'Hip Circumference', 'Mid-Upper Arm Circumference', 'Limbs Circumference'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                      <LabeledInput label={f} value={pedia[f] || ''} onChange={e => setPedia(p => ({ ...p, [f]: e.target.value }))} />
                      <span style={{ fontSize: '12px', color: COLOR.muted, paddingBottom: '8px', flexShrink: 0 }}>cm</span>
                    </div>
                  ))}
                </div>
              </FieldCard>

              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(4)}>← Back</button>
                <button style={MS.btnNext} onClick={() => setStep(6)}>Next →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 6 — Pertinent Findings Per System (A–D)
        ══════════════════════════════════════════════════════ */}
        {step === 6 && (
          <>
            <div style={MS.header}>Pertinent Findings Per System</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>

              <FieldCard>
                <SectionTitle>General Survey</SectionTitle>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <CB label="Awake and Alert"   checked={!!genSurvey.awake}   onChange={() => togCB(genSurvey, setGenSurvey, 'awake')} />
                  <CB label="Altered Sensorium" checked={!!genSurvey.altered} onChange={() => togCB(genSurvey, setGenSurvey, 'altered')} />
                </div>
              </FieldCard>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <SystemPanel title="A. HEENT" state={heent} setState={setHeent} other={heentOther} setOther={setHeentOther}
                  items={['Essentially Normal', 'Abnormal Papillary Reaction', 'Cervical Lymphadenopathy', 'Dry Mucus Membrane', 'Icteric Sclerae', 'Pale Conjunctiva', 'Sunken Eyeball', 'Sunken Fontanelle']} />
                <SystemPanel title="B. Chest / Breast / Lungs" state={chest} setState={setChest} other={chestOther} setOther={setChestOther}
                  items={['Essentially Normal', 'Asymmetrical Chest Expansion', 'Decreased Breath Sound', 'Wheeze', 'Crackle / Rales', 'Retractions', 'Lumps Over Breast']} />
                <SystemPanel title="C. Heart" state={heart} setState={setHeart} other={heartOther} setOther={setHeartOther}
                  items={['Essentially Normal', 'Displaced Apex Beat', 'Heave Trills', 'Irregular Rhythm', 'Muffled Heart Sounds', 'Murmurs', 'Pericardial Bulge']} />
                <SystemPanel title="D. Abdomen" state={abdomen} setState={setAbdomen} other={abdomenOther} setOther={setAbdomenOther}
                  items={['Essentially Normal', 'Abdominal Rigidity', 'Abdominal Tenderness', 'Hyperactive Bowel Sound', 'Palpable Mass/es', 'Tympanitic/Dull Abdomen', 'Uterine Contraction']} />
              </div>

              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(5)}>← Back</button>
                <button style={MS.btnNext} onClick={() => setStep(7)}>Next →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 7 — Pertinent Findings Per System (E–H) + Assessment
        ══════════════════════════════════════════════════════ */}
        {step === 7 && (
          <>
            <div style={MS.header}>Health Assessment Tool</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <SystemPanel title="E. Genitourinary" state={genito} setState={setGenito} other={genitOther} setOther={setGenitOther}
                  items={['Essentially Normal', 'Blood Stained in Internal Examination', 'Cervical Dilation', 'Presence of Abnormal Discharge']} />
                <SystemPanel title="F. Digital Rectal Examination" state={rectal} setState={setRectal} other={rectalOther} setOther={setRectalOther}
                  items={['Crackle / Rales', 'Enlarge Prostate', 'Mass', 'Hemorrhoids', 'Pus', 'Not Applicable']} />
                <SystemPanel title="G. Skin / Extremities" state={skin} setState={setSkin} other={skinOther} setOther={setSkinOther}
                  items={['Essentially Normal', 'Clubbing', 'Cold Clammy', 'Cyanosis Mottled Skin', 'Edemal / Swelling', 'Decreased Mobility', 'Pale Nailbeds', 'Weak Pulses']} />
                <SystemPanel title="H. Neurological Examination" state={neuro} setState={setNeuro} other={neuroOther} setOther={setNeuroOther}
                  items={['Essentially Normal', 'Abnormal Gait', 'Abnormal Position Sense', 'Abnormal Sensation', 'Abnormal Reflex/es', 'Poor/ Altered Memory', 'Poor Muscle Tone/ Strength', 'Poor Coordination']} />
              </div>

              <FieldCard style={{ marginTop: '12px' }}>
                <SectionTitle>First Patient Encounter Assessment</SectionTitle>
                {(['GENERALLY WELL', 'FOR PRIMARY CARE CONSULTAION', 'FOR DIAGNOSTIC EXAMINATION'] as string[]).map((lbl, i) => (
                  <div key={lbl} style={{ marginBottom: '8px' }}>
                    <CB checked={!!assessment[lbl]} onChange={() => togCB(assessment, setAssessment, lbl)}>
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>{lbl}</span>
                      <span style={{ fontSize: '12px', color: COLOR.muted, marginLeft: '6px', fontStyle: 'italic' }}>
                        {['(fill out and sign eKAS)', '(fill out KONSULTA Referral Slip)', '(fill out Diagnostic Request Form)'][i]}
                      </span>
                    </CB>
                  </div>
                ))}
              </FieldCard>

              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(6)}>← Back</button>
                <button style={MS.btnNext} onClick={() => setStep(8)}>Next →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 8 — NCD High-Risk Assessment
        ══════════════════════════════════════════════════════ */}
        {step === 8 && (
          <>
            <div style={MS.header}>NCD High-Risk Assessment (For 20 Years Old and Above)</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>

              <FieldCard>
                <SectionTitle>Lifestyle Questions</SectionTitle>
                {([
                  ['q1', '1. Eats processed food (e.g. Instant Noodles, Burgers, Fries, Fried Chicken, ihaw-ihaw) weekly?'],
                  ['q2', '2. Eats 3 servings of fruits and vegetables daily?'],
                  ['q3', '3. Does at least 2.5 hours of moderate-intensity physical activity every week?'],
                ] as [string, string][]).map(([key, q]) => (
                  <div key={key} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${COLOR.border}` }}>
                    <p style={{ fontSize: '13px', marginBottom: '6px', color: COLOR.text }}>{q}</p>
                    <YesNo name={key} value={ncd8[key] || ''} onChange={v => setNcd8(p => ({ ...p, [key]: v }))} />
                  </div>
                ))}

                <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${COLOR.border}` }}>
                  <p style={{ fontSize: '13px', marginBottom: '6px', color: COLOR.text }}>4. Was patient diagnosed as having Diabetes?</p>
                  <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '6px' }}>
                    <RB label="Yes"               name="diabetes" value="Yes" checked={diabetesYes} onChange={() => { setDiabetesYes(true);  setDiabetesNo(false) }} />
                    <RB label={'No / "Do not know"'} name="diabetes" value="No" checked={diabetesNo}  onChange={() => { setDiabetesNo(true);   setDiabetesYes(false) }} />
                  </div>
                  {diabetesYes && (
                    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '8px' }}>
                      <RB label="With Medication"    name="diabetesMed" value="With Medication"    checked={diabetesMed === 'With Medication'}    onChange={() => setDiabetesMed('With Medication')} />
                      <RB label="Without Medication" name="diabetesMed" value="Without Medication" checked={diabetesMed === 'Without Medication'} onChange={() => setDiabetesMed('Without Medication')} />
                    </div>
                  )}
                </div>

                <div>
                  <p style={{ fontSize: '13px', marginBottom: '8px', color: COLOR.text }}>5. Does the patient have any of the following symptoms?</p>
                  <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
                    {['Polyphagia', 'Polydipsia', 'Polyuria'].map(s => (
                      <CB key={s} label={s} checked={!!symptoms[s]} onChange={() => togCB(symptoms, setSymptoms, s)} />
                    ))}
                  </div>
                </div>
              </FieldCard>

              <FieldCard>
                <SectionTitle>Laboratory Results</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {([
                    ['FBS / RBS',       labFbs,     setLabFbs,     labFbsDate,     setLabFbsDate],
                    ['Total Cholesterol', labChol,   setLabChol,    labCholDate,    setLabCholDate],
                    ['Urine Ketone',    labKetone,  setLabKetone,  labKetoneDate,  setLabKetoneDate],
                    ['Urine Protein',   labProtein, setLabProtein, labProteinDate, setLabProteinDate],
                  ] as [string, string, React.Dispatch<React.SetStateAction<string>>, string, React.Dispatch<React.SetStateAction<string>>][]).map(([lbl, val, setVal, date, setDate]) => (
                    <div key={lbl} style={{ ...MS.col }}>
                      <LabeledInput label={lbl} value={val} onChange={e => setVal(e.target.value)} />
                      <div style={{ marginTop: '6px' }}>
                        <LabeledInput label="Date Taken" sublabel="" width="150px" type="date" value={date} onChange={e => setDate(e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </FieldCard>

              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(7)}>← Back</button>
                <button style={MS.btnNext} onClick={() => setStep(9)}>Next →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 9 — Angina / Heart Attack Questions
        ══════════════════════════════════════════════════════ */}
        {step === 9 && (
          <>
            <div style={MS.header}>NCD High-Risk Assessment (For 20 Years Old and Above)</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>

              <FieldCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '14px' }}>
                  <span style={{ ...MS.sectionTitle, margin: 0, border: 'none', paddingBottom: 0 }}>Angina or Heart Attack</span>
                  <RB label="Yes" name="anginaOverall" value="Yes" checked={anginaOverall === 'Yes'} onChange={() => setAnginaOverall('Yes')} />
                  <RB label="No"  name="anginaOverall" value="No"  checked={anginaOverall === 'No'}  onChange={() => setAnginaOverall('No')} />
                </div>

                {([
                  { k: 'a1', q: '1. Have you had any pain, discomfort, pressure, or heaviness in your chest?', t: '(Nakakaramdam ka ba ng pananakit o bigat sa iyong dibdib?)', note: 'If No → go to question 8' },
                  { k: 'a2', q: '2. Do you get the pain in the center/left chest or left arm?', t: '(Ang sakit ba ay nasa gitna ng dibdib, sa kaliwang bahagi ng dibdib o sa kaliwang braso?)' },
                  { k: 'a3', q: '3. Do you get it when you walk uphill or hurry?', t: '(Nararamdaman mo ba ito kung ikaw ay nagmamadali o naglalakad nang mabilis o paahon?)' },
                  { k: 'a4', q: '4. Do you slow down if you get the pain while walking?', t: '(Tumitigil ka ba sa paglalakad kapag sumasakit ang iyong dibdib?)' },
                  { k: 'a5', q: '5. Does the pain go away if you stand still or take medication?', t: '(Nawawala ba yung sakit sa dibdib kapag ikaw ay tumitigil o umiinom ng gamot sa ilalim ng dila?)' },
                ] as { k: string; q: string; t: string; note?: string }[]).map(({ k, q, t, note }) => (
                  <div key={k} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${COLOR.border}` }}>
                    <p style={{ fontSize: '13px', marginBottom: '2px', fontWeight: '600', color: COLOR.text }}>{q}</p>
                    <p style={{ fontSize: '12px', color: COLOR.muted, fontStyle: 'italic', marginBottom: '8px' }}>{t}</p>
                    <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', alignItems: 'center' }}>
                      <RB label="Yes" name={k} value="Yes" checked={angina[k] === 'Yes'} onChange={() => setAngina(p => ({ ...p, [k]: 'Yes' }))} />
                      <RB label="No"  name={k} value="No"  checked={angina[k] === 'No'}  onChange={() => setAngina(p => ({ ...p, [k]: 'No' }))} />
                      {note && <span style={{ fontSize: '12px', fontStyle: 'italic', color: COLOR.muted }}>{note}</span>}
                    </div>
                  </div>
                ))}
              </FieldCard>

              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(8)}>← Back</button>
                <button style={MS.btnNext} onClick={() => setStep(10)}>Next →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 10 — Stroke/TIA + Risk Level
        ══════════════════════════════════════════════════════ */}
        {step === 10 && (
          <>
            <div style={MS.header}>NCD High-Risk Assessment (For 20 Years Old and Above)</div>
            <button style={MS.closeBtn} onClick={() => setConfirm('close')}>×</button>
            <StepIndicator />
            <div style={MS.body}>

              <FieldCard>
                <SectionTitle>Continued — Chest Pain Assessment</SectionTitle>
                {([
                  { k: 's6', q: '6. Does the pain go away in less than 10 minutes?', t: '(Nawawala ba ang sakit sa loob ng 10 minuto?)' },
                  { k: 's7', q: '7. Have you ever had severe chest pain across the front of your chest lasting half an hour or more?', t: '(Nakaramdam ka na ba ng pananakit ng dibdib na tumatagal ng kalahating oras o higit pa?)' },
                ] as { k: string; q: string; t: string }[]).map(({ k, q, t }) => (
                  <div key={k} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${COLOR.border}` }}>
                    <p style={{ fontSize: '13px', marginBottom: '2px', fontWeight: '600', color: COLOR.text }}>{q}</p>
                    <p style={{ fontSize: '12px', color: COLOR.muted, fontStyle: 'italic', marginBottom: '8px' }}>{t}</p>
                    <div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
                      <RB label="Yes" name={k} value="Yes" checked={stroke[k] === 'Yes'} onChange={() => setStroke(p => ({ ...p, [k]: 'Yes' }))} />
                      <RB label="No"  name={k} value="No"  checked={stroke[k] === 'No'}  onChange={() => setStroke(p => ({ ...p, [k]: 'No' }))} />
                    </div>
                  </div>
                ))}
              </FieldCard>

              <FieldCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '14px' }}>
                  <span style={{ ...MS.sectionTitle, margin: 0, border: 'none', paddingBottom: 0 }}>Stroke and TIA</span>
                  <RB label="Yes" name="strokeTia" value="Yes" checked={strokeTia === 'Yes'} onChange={() => setStrokeTia('Yes')} />
                  <RB label="No"  name="strokeTia" value="No"  checked={strokeTia === 'No'}  onChange={() => setStrokeTia('No')} />
                </div>
                <div style={{ paddingBottom: '12px', borderBottom: `1px solid ${COLOR.border}`, marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', marginBottom: '2px', fontWeight: '600', color: COLOR.text }}>
                    8. Have you ever had difficulty in talking, weakness of arms or legs on one side of the body?
                  </p>
                  <p style={{ fontSize: '12px', color: COLOR.muted, fontStyle: 'italic', marginBottom: '8px' }}>
                    (Nakaramdam ka na ba ng pagkautal, panghihina ng braso o binti, o pamamanhid ng kalahati ng katawan?)
                  </p>
                  <div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
                    <RB label="Yes" name="s8" value="Yes" checked={stroke.s8 === 'Yes'} onChange={() => setStroke(p => ({ ...p, s8: 'Yes' }))} />
                    <RB label="No"  name="s8" value="No"  checked={stroke.s8 === 'No'}  onChange={() => setStroke(p => ({ ...p, s8: 'No' }))} />
                  </div>
                  <p style={{ fontSize: '12px', fontStyle: 'italic', color: COLOR.muted, marginTop: '8px', textAlign: 'center' }}>
                    ● If YES to question 8, patient may have TIA/Stroke — must seek a doctor immediately.
                  </p>
                </div>
              </FieldCard>

              <FieldCard>
                <SectionTitle>Risk Level</SectionTitle>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {['<10%', '10% to <20%', '20% to <30%', '30% to <40%', '>40%'].map(r => (
                    <label key={r} style={{ ...MS.checkLabel, padding: '8px 14px', borderRadius: '5px', border: `1.5px solid ${riskLevel === r ? COLOR.green : COLOR.border}`, background: riskLevel === r ? COLOR.greenLight : COLOR.white, fontWeight: '700', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={riskLevel === r} onChange={() => setRiskLevel(riskLevel === r ? '' : r)}
                        style={{ accentColor: COLOR.green, width: '15px', height: '15px', cursor: 'pointer' }} />
                      {r}
                    </label>
                  ))}
                </div>
              </FieldCard>

              <div style={MS.btnRow}>
                <button style={MS.btnBack} onClick={() => setStep(9)}>← Back</button>
                <button style={{ ...MS.btnNext, opacity: saving ? 0.7 : 1 }} onClick={() => setConfirm('save')} disabled={saving}>
                  {saving ? 'Saving…' : 'Save ✓'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── CONFIRM: Are you sure? ── */}
        {confirm === 'save' && (
          <div style={MS.confirmOverlay}>
            <div style={MS.confirmBox}>
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: COLOR.text }}>Save Patient Record?</p>
              <p style={{ fontSize: '14px', color: COLOR.muted, marginBottom: '24px' }}>Please review all fields before saving.</p>
              <button style={MS.confirmCancel} onClick={() => setConfirm(null)}>CANCEL</button>
              <button style={MS.confirmSave}   onClick={() => setConfirm('send')}>CONFIRM</button>
            </div>
          </div>
        )}

        {/* ── CONFIRM: Send to Doctor? ── */}
        {confirm === 'send' && (
          <div style={MS.confirmOverlay}>
            <div style={MS.confirmBox}>
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: COLOR.text }}>Send to Doctor?</p>
              <p style={{ fontSize: '14px', color: COLOR.muted, marginBottom: '24px' }}>This will finalize and submit the patient record.</p>
              <button style={MS.confirmCancel} onClick={() => setConfirm(null)}>CANCEL</button>
              <button style={MS.confirmSave}   onClick={doSave}>{saving ? 'Saving…' : 'SEND'}</button>
            </div>
          </div>
        )}

        {/* ── CONFIRM: Close/discard ── */}
        {confirm === 'close' && (
          <div style={MS.confirmOverlay}>
            <div style={MS.confirmBox}>
              <p style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: COLOR.text }}>Discard Changes?</p>
              <p style={{ fontSize: '14px', color: COLOR.muted, marginBottom: '24px' }}>All unsaved information will be lost.</p>
              <button style={MS.confirmCancel} onClick={() => setConfirm(null)}>CANCEL</button>
              <button style={MS.confirmSave}   onClick={doClose}>DISCARD</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AddPatientModal
