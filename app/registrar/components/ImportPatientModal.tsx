'use client'
import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

const C = { green: '#16a34a', teal: '#0d9488', red: '#dc2626', orange: '#ea580c' }

// ─── Types ────────────────────────────────────────────────────────────────────
interface SheetData {
  sheet1: any[]   // Patient Info (required)
  sheet2: any[]   // Medical & Family History
  sheet3: any[]   // Social & Immunization
  sheet4: any[]   // Family Planning & Menstrual
  sheet5: any[]   // Pregnancy History
  sheet6: any[]   // Physical Exam
  sheet7: any[]   // Findings Part 1
  sheet8: any[]   // Findings Part 2
  sheet9: any[]   // NCD Assessment
  sheet10: any[]  // Angina & Stroke
}

interface ParseResult {
  data: SheetData
  validCount: number
  errors: { row: number; sheet: string; msg: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toBool = (v: any): boolean | null => {
  if (v === true || v === 'TRUE' || v === 'true' || v === 1) return true
  if (v === false || v === 'FALSE' || v === 'false' || v === 0) return false
  return null
}
const toNum = (v: any): number | null => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return isNaN(n) ? null : n
}
const toInt = (v: any): number | null => {
  const n = parseInt(String(v ?? ''))
  return isNaN(n) ? null : n
}
const toStr = (v: any): string | null => {
  const s = String(v ?? '').trim()
  return s === '' || s === 'undefined' ? null : s
}
const toDate = (v: any): string | null => {
  if (!v) return null
  // Excel serial date
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return d.toISOString().split('T')[0]
  }
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Try parsing
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}
const toYesNo = (v: any): boolean | null => {
  const s = String(v ?? '').toLowerCase().trim()
  if (s === 'yes') return true
  if (s === 'no') return false
  return null
}

// Skip header rows (row 1 = sheet title, row 2 = col headers in template)
// XLSX.utils.sheet_to_json skips empty rows automatically; we just need rows with data
function parseSheet(wb: XLSX.WorkBook, name: string): any[] {
  // Try to find by partial name
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes(name.toLowerCase()))
  if (!sheetName) return []
  const ws = wb.Sheets[sheetName]
  // header:1 gives array of arrays; first row of data after headers = row index 2 (0-based)
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
  // Filter out sample row (lime colored) — we identify it by checking if patient_row === '1' AND it looks like sample
  // Instead, just return all rows and let the caller decide
  return rows as any[]
}

// ─── Main parser ──────────────────────────────────────────────────────────────
function parseWorkbook(wb: XLSX.WorkBook): ParseResult {
  const errors: ParseResult['errors'] = []

  // Sheet names use numbered prefixes.
  // Excel template layout:
  //   Row 1 = green title banner   (skip)
  //   Row 2 = teal column headers  (display labels, NOT field names)
  //   Row 3+ = actual data rows
  //
  // We map display labels → JS field names using the lookup below.
  // This is resilient to column reordering and header text changes.
  const LABEL_MAP: Record<string, string> = {
    // Sheet 1
    'last name':                  'last_name',
    'first name':                 'first_name',
    'middle name':                'middle_name',
    'age':                        'age',
    'sex':                        'sex',
    'sex (f/m)':                  'sex',
    'birthdate':                  'birthdate',
    'purok':                      'purok',
    'barangay':                   'barangay',
    'municipality':               'municipality',
    'contact number':             'contact_number',
    'email':                      'email',
    'philhealth pin':             'philhealth_pin',
    'member type':                'member_type',
    'member type specify':        'member_type_specify',
    'reg. date':                  'registration_date',
    'registration date':          'registration_date',
    'at code':                    'at_code',
    'appt. date':                 'appointment_date',
    'appointment date':           'appointment_date',
    // Sheet 2
    'patient row #':              'patient_row',
    'patient row # (from sheet 1)': 'patient_row',
    'history type':               'history_type',
    'allergy':                    'allergy',
    'asthma':                     'asthma',
    'cancer':                     'cancer',
    'cerebrovascular disease':    'cerebrovascular_disease',
    'coronary artery disease':    'coronary_artery_disease',
    'diabetes mellitus':          'diabetes_mellitus',
    'emphysema':                  'emphysema',
    'epilepsy seizure':           'epilepsy_seizure',
    'hepatitis':                  'hepatitis',
    'hyperlipidemia':             'hyperlipidemia',
    'hypertension':               'hypertension',
    'peptic ulcer':               'peptic_ulcer',
    'pneumonia':                  'pneumonia',
    'thyroid disease':            'thyroid_disease',
    'ptb':                        'ptb',
    'urinary tract infection':    'urinary_tract_infection',
    'mental illness':             'mental_illness',
    'others':                     'others',
    'allergy specify':            'allergy_specify',
    'cancer specify':             'cancer_specify',
    'hepatitis specify':          'hepatitis_specify',
    'highest bp':                 'hypertension_highest_bp',
    'ptb specify':                'ptb_specify_extra',
    'past surgeries done':        'past_surgeries_done',
    'surgery date':               'date_surgery_done',
    // Sheet 3
    'smoking':                    'smoking',
    'packs-year':                 'smoking_packs_per_year',
    'alcohol':                    'alcohol',
    'servings/day':               'alcohol_servings_day',
    'illicit drugs':              'illicit_drugs',
    'sexually active':            'sexually_active',
    'bcg':                        'bcg',
    'opv1':                       'opv1',
    'opv2':                       'opv2',
    'opv3':                       'opv3',
    'dpt1':                       'dpt1',
    'dpt2':                       'dpt2',
    'dpt3':                       'dpt3',
    'measles':                    'measles',
    'hapa1':                      'hapa1',
    'hapa2':                      'hapa2',
    'hapa3':                      'hapa3',
    'varicella':                  'varicella',
    'hpv':                        'hpv',
    'mmr':                        'mmr',
    'none adult':                 'none_adult',
    'pneumococcal vaccine':       'pneumococcal_vaccine',
    'flu vaccine':                'flu_vaccine',
    'immunization others':        'immunization_others',
    // Sheet 4
    'fp counseling':              'has_fp_counseling',
    'fp provider':                'fp_provider',
    'birth control method':       'birth_control_method',
    'menarche age':               'menarche_age',
    'onset sexual':               'onset_sexual_age',
    'onset sexual intercourse age': 'onset_sexual_age',
    'lmp':                        'last_menstrual_period',
    'period duration':            'period_duration_days',
    'pads/day':                   'pads_per_day',
    'interval cycle':             'interval_cycle_days',
    'menopause':                  'menopause',
    'age at menopause':           'age_at_menopause',
    // Sheet 5
    'g (gravida)':                'gravida',
    'p (para)':                   'para',
    't (term)':                   'term',
    'p2 (preterm)':               'preterm',
    'a (abortion)':               'abortion',
    'l (living)':                 'living',
    'type of delivery':           'type_of_delivery',
    'preg. hypertension':         'preg_hypertension',
    // Sheet 6
    'height (cm)':                'height_cm',
    'weight (kg)':                'weight_kg',
    'blood pressure':             'blood_pressure',
    'heart rate':                 'heart_rate_bpm',
    'temp (°c)':                  'temperature_c',
    'temperature':                'temperature_c',
    'resp. rate':                 'respiratory_rate',
    'respiratory rate':           'respiratory_rate',
    'blood type':                 'blood_type',
    'visual acuity':              'visual_acuity_right',
    'visual acuity right eye':    'visual_acuity_right',
    'visual acuity left eye':     'visual_acuity_left',
    'body length':                'body_length_cm',
    'head circ.':                 'head_circumference',
    'chest circ.':                'chest_circumference',
    'abdominal circ.':            'abdominal_circ',
    'hip circ.':                  'hip_circumference',
    'mid-upper arm':              'mid_upper_arm_circ',
    'limbs circ.':                'limbs_circumference',
    // Sheet 7
    'gen awake alert':            'gen_awake_alert',
    'gen altered sensorium':      'gen_altered_sensorium',
    'heent essentially normal':   'heent_essentially_normal',
    'heent abnormal papillary':   'heent_abnormal_papillary',
    'heent cervical lymph':       'heent_cervical_lymph',
    'heent dry mucus':            'heent_dry_mucus',
    'heent icteric sclerae':      'heent_icteric_sclerae',
    'heent pale conjunctiva':     'heent_pale_conjunctiva',
    'heent sunken eyeball':       'heent_sunken_eyeball',
    'heent sunken fontanelle':    'heent_sunken_fontanelle',
    'chest essentially normal':   'chest_essentially_normal',
    'chest asymm expansion':      'chest_asymm_expansion',
    'chest decreased breath':     'chest_decreased_breath',
    'chest wheeze':               'chest_wheeze',
    'chest crackle':              'chest_crackle',
    'chest retractions':          'chest_retractions',
    'chest lumps breast':         'chest_lumps_breast',
    'heart essentially normal':   'heart_essentially_normal',
    'heart displaced apex':       'heart_displaced_apex',
    'heart heave trills':         'heart_heave_trills',
    'heart irregular rhythm':     'heart_irregular_rhythm',
    'heart muffled sounds':       'heart_muffled_sounds',
    'heart murmurs':              'heart_murmurs',
    'heart pericardial bulge':    'heart_pericardial_bulge',
    'abdomen essentially normal': 'abdomen_essentially_normal',
    'abdomen rigidity':           'abdomen_rigidity',
    'abdomen tenderness':         'abdomen_tenderness',
    'abdomen hyperactive bowel':  'abdomen_hyperactive_bowel',
    'abdomen palpable mass':      'abdomen_palpable_mass',
    'abdomen tympanitic':         'abdomen_tympanitic',
    'abdomen uterine contraction':'abdomen_uterine_contraction',
    // Sheet 8
    'gu essentially normal':      'gu_essentially_normal',
    'gu blood stained':           'gu_blood_stained',
    'gu cervical dilation':       'gu_cervical_dilation',
    'gu abnormal discharge':      'gu_abnormal_discharge',
    'dre crackle':                'dre_crackle',
    'dre enlarge prostate':       'dre_enlarge_prostate',
    'dre mass':                   'dre_mass',
    'dre hemorrhoids':            'dre_hemorrhoids',
    'dre pus':                    'dre_pus',
    'dre not applicable':         'dre_not_applicable',
    'skin essentially normal':    'skin_essentially_normal',
    'skin clubbing':              'skin_clubbing',
    'skin cold clammy':           'skin_cold_clammy',
    'skin cyanosis':              'skin_cyanosis',
    'skin edema':                 'skin_edema',
    'skin decreased mobility':    'skin_decreased_mobility',
    'skin pale nailbeds':         'skin_pale_nailbeds',
    'skin weak pulses':           'skin_weak_pulses',
    'neuro essentially normal':   'neuro_essentially_normal',
    'neuro abnormal gait':        'neuro_abnormal_gait',
    'neuro abnormal position':    'neuro_abnormal_position',
    'neuro abnormal sensation':   'neuro_abnormal_sensation',
    'neuro abnormal reflexes':    'neuro_abnormal_reflexes',
    'neuro poor memory':          'neuro_poor_memory',
    'neuro poor muscle tone':     'neuro_poor_muscle_tone',
    'neuro poor coordination':    'neuro_poor_coordination',
    'encounter generally well':   'encounter_generally_well',
    'encounter primary care':     'encounter_primary_care',
    'encounter diagnostic':       'encounter_diagnostic',
    'heent others':               'heent_others',
    'chest other':                'chest_other',
    'heart others':               'heart_others',
    'abdomen others':             'abdomen_others',
    'gu others':                  'gu_others',
    'dre others':                 'dre_others',
    'skin others':                'skin_others',
    'neuro others':               'neuro_others',
    // Sheet 9
    'eats processed food':        'eats_processed_food',
    'eats fruits/veg':            'eats_fruits_vegetables',
    'physical activity':          'does_physical_activity',
    'diagnosed diabetes':         'diagnosed_diabetes',
    'diabetes medication':        'diabetes_medication',
    'polyphagia':                 'symptom_polyphagia',
    'polydipsia':                 'symptom_polydipsia',
    'polyuria':                   'symptom_polyuria',
    'fbs/rbs value':              'fbs_rbs_value',
    'fbs/rbs date':               'fbs_rbs_date',
    'cholesterol value':          'total_cholesterol_value',
    'cholesterol date':           'total_cholesterol_date',
    'urine ketone value':         'urine_ketone_value',
    'urine ketone date':          'urine_ketone_date',
    'urine protein value':        'urine_protein_value',
    'urine protein date':         'urine_protein_date',
    // Sheet 10
    'angina/heart attack':        'angina_overall',
    'q1: chest pain':             'angina_chest_pain',
    'q2: center/left':            'angina_center_left',
    'q3: on walking':             'angina_on_walking',
    'q4: slows down':             'angina_slows_walking',
    'q5: goes away':              'angina_goes_away',
    'q6: gone <10min':            'angina_gone_10min',
    'q7: severe 30min+':          'angina_severe_30min',
    'q8: difficulty talking/':    'stroke_difficulty',
    'stroke/tia':                 'stroke_tia_overall',
    'risk level':                 'risk_level',
  }

  // Normalize a raw header label to a JS field name
  const labelToKey = (raw: any): string => {
    const normalized = String(raw ?? '')
      .replace(/^\* /, '')      // strip required marker
      .replace(/\n/g, ' ')      // collapse newlines
      .replace(/\s+/g, ' ')     // collapse spaces
      .toLowerCase()
      .trim()
      .split('\n')[0]           // first line only
      .split('(')[0]             // drop parenthetical suffix (e.g. "(YYYY-MM-DD)")
      .trim()
    return LABEL_MAP[normalized] ?? normalized.replace(/ /g, '_')
  }

  const getRows = (prefix: string) => {
    const name = wb.SheetNames.find(n => n.startsWith(prefix))
    if (!name) return []
    const ws = wb.Sheets[name]

    // Read all cells as raw arrays — no automatic header inference
    const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false }) as any[][]
    if (raw.length < 3) return []   // need title + headers + at least 1 data row

    // Row index 1 (0-based) = Excel row 2 = teal column headers
    const keys: string[] = (raw[1] as any[]).map(labelToKey)

    // Row index 2+ = data rows; skip fully-empty rows
    return raw.slice(2)
      .filter(row => row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined))
      .map(row => {
        const obj: Record<string, any> = {}
        keys.forEach((key, i) => { if (key) obj[key] = row[i] ?? '' })
        return obj
      })
  }

  const s1  = getRows('1_')
  const s2  = getRows('2_')
  const s3  = getRows('3_')
  const s4  = getRows('4_')
  const s5  = getRows('5_')
  const s6  = getRows('6_')
  const s7  = getRows('7_')
  const s8  = getRows('8_')
  const s9  = getRows('9_')
  const s10 = getRows('10_')

  // Validate Sheet 1
  s1.forEach((row, i) => {
    if (!row.last_name)  errors.push({ row: i + 1, sheet: 'Sheet1', msg: 'last_name is required' })
    if (!row.first_name) errors.push({ row: i + 1, sheet: 'Sheet1', msg: 'first_name is required' })
    if (row.sex && !['F','M','f','m'].includes(row.sex))
      errors.push({ row: i + 1, sheet: 'Sheet1', msg: `sex must be F or M (got "${row.sex}")` })
    if (row.age && isNaN(Number(row.age)))
      errors.push({ row: i + 1, sheet: 'Sheet1', msg: `age must be a number (got "${row.age}")` })
  })

  return {
    data: { sheet1: s1, sheet2: s2, sheet3: s3, sheet4: s4, sheet5: s5,
            sheet6: s6, sheet7: s7, sheet8: s8, sheet9: s9, sheet10: s10 },
    validCount: s1.filter((_, i) => !errors.find(e => e.row === i + 1 && e.sheet === 'Sheet1')).length,
    errors,
  }
}

// ─── Supabase inserter ────────────────────────────────────────────────────────
async function insertAll(data: SheetData): Promise<{ ok: number; fail: number; messages: string[] }> {
  let ok = 0, fail = 0
  const messages: string[] = []

  const tryInsert = async (table: string, row: Record<string, any>) => {
    const { error } = await supabase.from(table).insert([row])
    if (error) { console.warn(`${table}:`, error.message); return false }
    return true
  }

  for (let i = 0; i < data.sheet1.length; i++) {
    const r1 = data.sheet1[i]
    const rowNum = i + 1 // 1-based index for linking

    // ── patients ──
    const { data: patientData, error: pErr } = await supabase.from('patients').insert([{
      last_name:           toStr(r1.last_name),
      first_name:          toStr(r1.first_name),
      middle_name:         toStr(r1.middle_name),
      age:                 toInt(r1.age),
      sex:                 toStr(r1.sex)?.toUpperCase() ?? null,
      birthdate:           toDate(r1.birthdate),
      purok:               toStr(r1.purok),
      barangay:            toStr(r1.barangay),
      municipality:        toStr(r1.municipality),
      contact_number:      toStr(r1.contact_number),
      email:               toStr(r1.email),
      philhealth_pin:      toStr(r1.philhealth_pin),
      member_type:         toStr(r1.member_type),
      member_type_specify: toStr(r1.member_type_specify),
    }]).select('id').single()

    if (pErr || !patientData) {
      fail++
      messages.push(`Row ${rowNum} (${r1.last_name}): patient insert failed — ${pErr?.message}`)
      continue
    }
    const pid = patientData.id

    // ── konsulta_registrations ──
    await tryInsert('konsulta_registrations', {
      patient_id:         pid,
      registration_date:  toDate(r1.registration_date),
      at_code:            toStr(r1.at_code),
      date_of_appointment: toDate(r1.appointment_date),
    })

    // Queue the patient for the doctor
    const today = new Date().toISOString().split('T')[0]
    await tryInsert('soap_consultations', {
      patient_id: pid, consultation_date: today, queue_date: today, status: 'waiting',
    })

    // ── Sheet 2: Medical & Family History ──
    const medRows = data.sheet2.filter(r => String(r.patient_row).trim() === String(rowNum))
    for (const r2 of medRows) {
      const isPast   = String(r2.history_type).toLowerCase().includes('past')
      const isFam    = String(r2.history_type).toLowerCase().includes('fam')
      const table    = isPast ? 'past_medical_history' : isFam ? 'family_history' : null
      if (!table) continue
      const row: any = {
        patient_id:             pid,
        allergy:                toBool(r2.allergy),
        allergy_specify:        toStr(r2.allergy_specify),
        asthma:                 toBool(r2.asthma),
        cancer:                 toBool(r2.cancer),
        cancer_specify:         toStr(r2.cancer_specify),
        cerebrovascular_disease: toBool(r2.cerebrovascular_disease),
        coronary_artery_disease: toBool(r2.coronary_artery_disease),
        diabetes_mellitus:       toBool(r2.diabetes_mellitus),
        emphysema:               toBool(r2.emphysema),
        epilepsy_seizure:        toBool(r2.epilepsy_seizure),
        hepatitis:               toBool(r2.hepatitis),
        hepatitis_specify:       toStr(r2.hepatitis_specify),
        hyperlipidemia:          toBool(r2.hyperlipidemia),
        hypertension:            toBool(r2.hypertension),
        hypertension_highest_bp: toStr(r2.hypertension_highest_bp),
        peptic_ulcer:            toBool(r2.peptic_ulcer),
        pneumonia:               toBool(r2.pneumonia),
        thyroid_disease:         toBool(r2.thyroid_disease),
        ptb:                     toBool(r2.ptb),
        ptb_specify_extra:       toStr(r2.ptb_specify_extra),
        urinary_tract_infection: toBool(r2.urinary_tract_infection),
        mental_illness:          toBool(r2.mental_illness),
        others:                  toBool(r2.others),
      }
      if (isPast) {
        row.past_surgeries_done = toStr(r2.past_surgeries_done)
        row.date_surgery_done   = toDate(r2.date_surgery_done)
      }
      await tryInsert(table, row)
    }

    // ── Sheet 3: Social & Immunization ──
    const r3 = data.sheet3.find(r => String(r.patient_row).trim() === String(rowNum))
    if (r3) {
      await tryInsert('personal_social_history', {
        patient_id:           pid,
        smoking:              toStr(r3.smoking),
        smoking_packs_per_year: toNum(r3.smoking_packs_per_year),
        alcohol:              toStr(r3.alcohol),
        alcohol_servings_day: toNum(r3.alcohol_servings_day),
        illicit_drugs:        toStr(r3.illicit_drugs),
        sexually_active:      toStr(r3.sexually_active),
      })
      await tryInsert('immunization_history', {
        patient_id:           pid,
        bcg:                  toBool(r3.bcg),
        opv1:                 toBool(r3.opv1),
        opv2:                 toBool(r3.opv2),
        opv3:                 toBool(r3.opv3),
        dpt1:                 toBool(r3.dpt1),
        dpt2:                 toBool(r3.dpt2),
        dpt3:                 toBool(r3.dpt3),
        measles:              toBool(r3.measles),
        hapa1:                toBool(r3.hapa1),
        hapa2:                toBool(r3.hapa2),
        hapa3:                toBool(r3.hapa3),
        varicella:            toBool(r3.varicella),
        hpv:                  toBool(r3.hpv),
        mmr:                  toBool(r3.mmr),
        none_adult:           toBool(r3.none_adult),
        pneumococcal_vaccine: toBool(r3.pneumococcal_vaccine),
        flu_vaccine:          toBool(r3.flu_vaccine),
        others:               toStr(r3.immunization_others),
      })
    }

    // ── Sheet 4: Family Planning & Menstrual ──
    const r4 = data.sheet4.find(r => String(r.patient_row).trim() === String(rowNum))
    if (r4) {
      await tryInsert('family_planning', {
        patient_id:          pid,
        has_fp_counseling:   toBool(r4.has_fp_counseling),
        provider:            toStr(r4.fp_provider),
        birth_control_method: toStr(r4.birth_control_method),
      })
      await tryInsert('menstrual_history', {
        patient_id:                     pid,
        menarche_age:                   toInt(r4.menarche_age),
        onset_sexual_intercourse_age:   toInt(r4.onset_sexual_age),
        last_menstrual_period:          toDate(r4.last_menstrual_period),
        period_duration_days:           toInt(r4.period_duration_days),
        pads_per_day:                   toInt(r4.pads_per_day),
        interval_cycle_days:            toInt(r4.interval_cycle_days),
        menopause:                      toBool(r4.menopause),
        age_at_menopause:               toInt(r4.age_at_menopause),
      })
    }

    // ── Sheet 5: Pregnancy History ──
    const r5 = data.sheet5.find(r => String(r.patient_row).trim() === String(rowNum))
    if (r5) {
      await tryInsert('pregnancy_history', {
        patient_id:   pid,
        gravida:      toInt(r5.gravida),
        para:         toInt(r5.para),
        term:         toInt(r5.term),
        preterm:      toInt(r5.preterm),
        abortion:     toInt(r5.abortion),
        living:       toInt(r5.living),
        type_of_delivery: toStr(r5.type_of_delivery),
        pregnancy_include_hypertension: toBool(r5.preg_hypertension),
      })
    }

    // ── Sheet 6: Physical Exam ──
    const r6 = data.sheet6.find(r => String(r.patient_row).trim() === String(rowNum))
    if (r6) {
      await tryInsert('physical_exam_findings', {
        patient_id:             pid,
        height_cm:              toNum(r6.height_cm),
        weight_kg:              toNum(r6.weight_kg),
        blood_pressure_mmhg:    toStr(r6.blood_pressure),
        heart_rate_bpm:         toInt(r6.heart_rate_bpm),
        temperature_c:          toNum(r6.temperature_c),
        respiratory_rate_cpm:   toInt(r6.respiratory_rate),
        blood_type:             toStr(r6.blood_type),
        visual_acuity_right_eye: toStr(r6.visual_acuity_right),
        visual_acuity_left_eye:  toStr(r6.visual_acuity_left),
      })
      await tryInsert('pedia_measurements', {
        patient_id:                 pid,
        body_length_cm:             toNum(r6.body_length_cm),
        head_circumference_cm:      toNum(r6.head_circumference),
        chest_circumference_cm:     toNum(r6.chest_circumference),
        abdominal_circumference_cm: toNum(r6.abdominal_circ),
        hip_circumference_cm:       toNum(r6.hip_circumference),
        mid_upper_arm_circ_cm:      toNum(r6.mid_upper_arm_circ),
        limbs_circumference_cm:     toNum(r6.limbs_circumference),
      })
    }

    // ── Sheet 7 + 8: Pertinent Findings ──
    const r7 = data.sheet7.find(r => String(r.patient_row).trim() === String(rowNum))
    const r8 = data.sheet8.find(r => String(r.patient_row).trim() === String(rowNum))
    if (r7 || r8) {
      await tryInsert('pertinent_findings_per_system', {
        patient_id: pid,
        awake_and_alert:                toBool(r7?.gen_awake_alert),
        altered_sensorium:              toBool(r7?.gen_altered_sensorium),
        heent_essentially_normal:       toBool(r7?.heent_essentially_normal),
        heent_abnormal_papillary:       toBool(r7?.heent_abnormal_papillary),
        heent_cervical_lymphadenopathy: toBool(r7?.heent_cervical_lymph),
        heent_dry_mucus_membrane:       toBool(r7?.heent_dry_mucus),
        heent_icteric_sclerae:          toBool(r7?.heent_icteric_sclerae),
        heent_pale_conjunctiva:         toBool(r7?.heent_pale_conjunctiva),
        heent_sunken_eyeball:           toBool(r7?.heent_sunken_eyeball),
        heent_sunken_fontanelle:        toBool(r7?.heent_sunken_fontanelle),
        heent_others:                   toStr(r8?.heent_others),
        chest_essentially_normal:       toBool(r7?.chest_essentially_normal),
        chest_asymmetrical_expansion:   toBool(r7?.chest_asymm_expansion),
        chest_decreased_breath_sound:   toBool(r7?.chest_decreased_breath),
        chest_wheeze:                   toBool(r7?.chest_wheeze),
        chest_crackle_rales:            toBool(r7?.chest_crackle),
        chest_retractions:              toBool(r7?.chest_retractions),
        chest_lumps_over_breast:        toBool(r7?.chest_lumps_breast),
        chest_other:                    toStr(r8?.chest_other),
        heart_essentially_normal:       toBool(r7?.heart_essentially_normal),
        heart_displaced_apex_beat:      toBool(r7?.heart_displaced_apex),
        heart_heave_trills:             toBool(r7?.heart_heave_trills),
        heart_irregular_rhythm:         toBool(r7?.heart_irregular_rhythm),
        heart_muffled_sounds:           toBool(r7?.heart_muffled_sounds),
        heart_murmurs:                  toBool(r7?.heart_murmurs),
        heart_pericardial_bulge:        toBool(r7?.heart_pericardial_bulge),
        heart_others:                   toStr(r8?.heart_others),
        abdomen_essentially_normal:     toBool(r7?.abdomen_essentially_normal),
        abdomen_rigidity:               toBool(r7?.abdomen_rigidity),
        abdomen_tenderness:             toBool(r7?.abdomen_tenderness),
        abdomen_hyperactive_bowel:      toBool(r7?.abdomen_hyperactive_bowel),
        abdomen_palpable_masses:        toBool(r7?.abdomen_palpable_mass),
        abdomen_tympanitic_dull:        toBool(r7?.abdomen_tympanitic),
        abdomen_uterine_contraction:    toBool(r7?.abdomen_uterine_contraction),
        abdomen_others:                 toStr(r8?.abdomen_others),
        gu_essentially_normal:          toBool(r8?.gu_essentially_normal),
        gu_blood_stained_internal_exam: toBool(r8?.gu_blood_stained),
        gu_cervical_dilation:           toBool(r8?.gu_cervical_dilation),
        gu_abnormal_discharge:          toBool(r8?.gu_abnormal_discharge),
        gu_others:                      toStr(r8?.gu_others),
        dre_crackle_rales:              toBool(r8?.dre_crackle),
        dre_enlarge_prostate:           toBool(r8?.dre_enlarge_prostate),
        dre_mass:                       toBool(r8?.dre_mass),
        dre_hemorrhoids:                toBool(r8?.dre_hemorrhoids),
        dre_pus:                        toBool(r8?.dre_pus),
        dre_not_applicable:             toBool(r8?.dre_not_applicable),
        dre_others:                     toStr(r8?.dre_others),
        skin_essentially_normal:        toBool(r8?.skin_essentially_normal),
        skin_clubbing:                  toBool(r8?.skin_clubbing),
        skin_cold_clammy:               toBool(r8?.skin_cold_clammy),
        skin_cyanosis_mottled:          toBool(r8?.skin_cyanosis),
        skin_edema_swelling:            toBool(r8?.skin_edema),
        skin_decreased_mobility:        toBool(r8?.skin_decreased_mobility),
        skin_pale_nailbeds:             toBool(r8?.skin_pale_nailbeds),
        skin_weak_pulses:               toBool(r8?.skin_weak_pulses),
        skin_others:                    toStr(r8?.skin_others),
        neuro_essentially_normal:       toBool(r8?.neuro_essentially_normal),
        neuro_abnormal_gait:            toBool(r8?.neuro_abnormal_gait),
        neuro_abnormal_position_sense:  toBool(r8?.neuro_abnormal_position),
        neuro_abnormal_sensation:       toBool(r8?.neuro_abnormal_sensation),
        neuro_abnormal_reflexes:        toBool(r8?.neuro_abnormal_reflexes),
        neuro_poor_altered_memory:      toBool(r8?.neuro_poor_memory),
        neuro_poor_muscle_tone:         toBool(r8?.neuro_poor_muscle_tone),
        neuro_poor_coordination:        toBool(r8?.neuro_poor_coordination),
        neuro_others:                   toStr(r8?.neuro_others),
        encounter_generally_well:       toBool(r8?.encounter_generally_well),
        encounter_primary_care_consult: toBool(r8?.encounter_primary_care),
        encounter_diagnostic_exam:      toBool(r8?.encounter_diagnostic),
      })
    }

    // ── Sheet 9: NCD Assessment ──
    const r9 = data.sheet9.find(r => String(r.patient_row).trim() === String(rowNum))
    if (r9) {
      await tryInsert('ncd_high_risk_assessment', {
        patient_id:                    pid,
        eats_processed_food_weekly:    toYesNo(r9.eats_processed_food),
        eats_fruits_vegetables_daily:  toYesNo(r9.eats_fruits_vegetables),
        does_physical_activity_weekly: toYesNo(r9.does_physical_activity),
        diagnosed_with_diabetes:       String(r9.diagnosed_diabetes).toLowerCase() === 'yes' ? true : null,
        diabetes_do_not_know:          String(r9.diagnosed_diabetes).toLowerCase().includes('know') ? true : null,
        diabetes_with_medication:      String(r9.diabetes_medication).toLowerCase().includes('with') ? true : null,
        diabetes_without_medication:   String(r9.diabetes_medication).toLowerCase().includes('without') ? true : null,
        symptom_polyphagia:            toBool(r9.symptom_polyphagia),
        symptom_polydipsia:            toBool(r9.symptom_polydipsia),
        symptom_polyuria:              toBool(r9.symptom_polyuria),
        fbs_rbs_value:                 toStr(r9.fbs_rbs_value),
        fbs_rbs_date:                  toDate(r9.fbs_rbs_date),
        total_cholesterol_value:       toStr(r9.total_cholesterol_value),
        total_cholesterol_date:        toDate(r9.total_cholesterol_date),
        urine_ketone_value:            toStr(r9.urine_ketone_value),
        urine_ketone_date:             toDate(r9.urine_ketone_date),
        urine_protein_value:           toStr(r9.urine_protein_value),
        urine_protein_date:            toDate(r9.urine_protein_date),
      })
    }

    // ── Sheet 10: Angina & Stroke ──
    const r10 = data.sheet10.find(r => String(r.patient_row).trim() === String(rowNum))
    if (r10) {
      await tryInsert('ncd_high_risk_assessment', {
        patient_id:                     pid,
        angina_has_chest_pain:          toYesNo(r10.angina_chest_pain),
        angina_center_left_chest:       toYesNo(r10.angina_center_left),
        angina_on_walking:              toYesNo(r10.angina_on_walking),
        angina_slows_down_walking:      toYesNo(r10.angina_slows_walking),
        angina_pain_goes_away_standing: toYesNo(r10.angina_goes_away),
        angina_pain_gone_10_minutes:    toYesNo(r10.angina_gone_10min),
        angina_severe_30min_or_more:    toYesNo(r10.angina_severe_30min),
        stroke_tia_difficulty_talking:  toYesNo(r10.stroke_difficulty),
        risk_level:                     toStr(r10.risk_level),
      }).catch(() => {
        // ncd row may already exist from sheet9 — update instead
        supabase.from('ncd_high_risk_assessment')
          .update({
            angina_has_chest_pain:          toYesNo(r10.angina_chest_pain),
            angina_center_left_chest:       toYesNo(r10.angina_center_left),
            angina_on_walking:              toYesNo(r10.angina_on_walking),
            angina_slows_down_walking:      toYesNo(r10.angina_slows_walking),
            angina_pain_goes_away_standing: toYesNo(r10.angina_goes_away),
            angina_pain_gone_10_minutes:    toYesNo(r10.angina_gone_10min),
            angina_severe_30min_or_more:    toYesNo(r10.angina_severe_30min),
            stroke_tia_difficulty_talking:  toYesNo(r10.stroke_difficulty),
            risk_level:                     toStr(r10.risk_level),
          })
          .eq('patient_id', pid)
      })
    }

    ok++
  }

  return { ok, fail, messages }
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
  darkMode?: boolean
}

export default function ImportPatientsModal({ isOpen, onClose, onImported, darkMode = false }: Props) {
  const dk   = darkMode
  const card = dk ? '#0f2014' : '#fff'
  const bg   = dk ? '#0d1a0f' : '#f4f7f5'
  const txt  = dk ? '#e2f5e9' : '#1a2e20'
  const txt2 = dk ? '#6ee7b7' : '#607a6a'
  const bdr  = dk ? '#1a3d24' : '#b0c4b8'

  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [fileName,    setFileName]    = useState('')
  const [importing,   setImporting]   = useState(false)
  const [done,        setDone]        = useState<{ ok: number; fail: number; messages: string[] } | null>(null)
  const [parseErr,    setParseErr]    = useState('')
  const [showErrors,  setShowErrors]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setDone(null); setParseErr(''); setParseResult(null)
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array', cellDates: false })
      const result = parseWorkbook(wb)
      setParseResult(result)
    } catch (err: any) {
      setParseErr(err.message ?? 'Could not read file')
    }
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.validCount === 0) return
    setImporting(true)
    const result = await insertAll(parseResult.data)
    setImporting(false)
    setDone(result)
    if (result.ok > 0) onImported()
  }

  const reset = () => { setParseResult(null); setFileName(''); setDone(null); setParseErr('') }

  if (!isOpen) return null

  const sheetCounts = parseResult ? [
    { label: '1. Patient Info',        count: parseResult.data.sheet1.length,  required: true  },
    { label: '2. Medical History',     count: parseResult.data.sheet2.length,  required: false },
    { label: '3. Social & Immuniz.',   count: parseResult.data.sheet3.length,  required: false },
    { label: '4. Family Plan/Mens.',   count: parseResult.data.sheet4.length,  required: false },
    { label: '5. Pregnancy',           count: parseResult.data.sheet5.length,  required: false },
    { label: '6. Physical Exam',       count: parseResult.data.sheet6.length,  required: false },
    { label: '7. Findings Part 1',     count: parseResult.data.sheet7.length,  required: false },
    { label: '8. Findings Part 2',     count: parseResult.data.sheet8.length,  required: false },
    { label: '9. NCD Assessment',      count: parseResult.data.sheet9.length,  required: false },
    { label: '10. Angina & Stroke',    count: parseResult.data.sheet10.length, required: false },
  ] : []

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }} onClick={onClose}>
      <div style={{ background:card, borderRadius:20, width:'100%', maxWidth:700, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${C.green},${C.teal})`, padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <h2 style={{ color:'#fff', margin:0, fontSize:17, fontWeight:800 }}>Import Patients</h2>
            <p style={{ color:'rgba(255,255,255,0.8)', margin:'3px 0 0', fontSize:12 }}>Upload the 10-sheet Excel template to bulk-import all health assessment data</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, padding:'5px 11px', cursor:'pointer', color:'#fff', fontSize:18 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1, background:bg }}>

          {/* Step 1 — Download template */}
          <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:12, padding:'14px 18px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:txt }}>Step 1 — Download the template</p>
              <p style={{ margin:'3px 0 0', fontSize:12, color:txt2 }}>10-sheet Excel file — one sheet per form step. Fill in the data and re-upload.</p>
            </div>
            <a
              href="/RHU_Lopez_Patient_Import_Template.xlsx"
              download
              style={{ padding:'8px 18px', borderRadius:10, border:`1.5px solid ${C.green}`, background:'transparent', color:C.green, fontWeight:800, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}
            >
              ⬇ Download Template
            </a>
          </div>

          {/* Step 2 — Upload */}
          <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:12, padding:'14px 18px', marginBottom:14 }}>
            <p style={{ margin:'0 0 10px', fontSize:13, fontWeight:700, color:txt }}>Step 2 — Upload your filled Excel file (.xlsx)</p>
            <div
              style={{ border:`2px dashed ${bdr}`, borderRadius:10, padding:'24px', textAlign:'center', cursor:'pointer', background:bg }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.green }}
              onDragLeave={e => { e.currentTarget.style.borderColor = bdr }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = bdr; const f = e.dataTransfer.files[0]; if (f) { const ev = { target: { files: [f], value: '' } } as any; handleFile(ev) } }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display:'none' }} />
              <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:txt }}>{fileName || 'Click to browse or drag & drop'}</p>
              <p style={{ margin:'4px 0 0', fontSize:11, color:txt2 }}>Supports .xlsx files (the downloaded template)</p>
            </div>
          </div>

          {/* Parse error */}
          {parseErr && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
              <p style={{ margin:0, fontSize:13, color:C.red, fontWeight:700 }}>⚠ Could not read file: {parseErr}</p>
            </div>
          )}

          {/* Preview */}
          {parseResult && !done && (
            <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:12, padding:'14px 18px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:txt }}>Step 3 — Review before importing</p>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.green, background:`${C.green}15`, padding:'3px 10px', borderRadius:20 }}>
                    ✓ {parseResult.validCount} patient{parseResult.validCount !== 1 ? 's' : ''} ready
                  </span>
                  {parseResult.errors.length > 0 && (
                    <button onClick={() => setShowErrors(p => !p)} style={{ fontSize:12, fontWeight:700, color:C.red, background:`${C.red}12`, padding:'3px 10px', borderRadius:20, border:'none', cursor:'pointer' }}>
                      ✗ {parseResult.errors.length} error{parseResult.errors.length > 1 ? 's' : ''} {showErrors ? '▲' : '▼'}
                    </button>
                  )}
                </div>
              </div>

              {/* Sheet summary */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:12 }}>
                {sheetCounts.map(s => (
                  <div key={s.label} style={{ background:bg, borderRadius:8, padding:'8px 10px', border:`1px solid ${s.count > 0 ? C.green+'44' : bdr}` }}>
                    <div style={{ fontSize:10, color:txt2, fontWeight:700, marginBottom:2 }}>{s.label}</div>
                    <div style={{ fontSize:18, fontWeight:900, color: s.count > 0 ? C.green : (s.required ? C.red : '#d1d5db') }}>
                      {s.count}
                    </div>
                    <div style={{ fontSize:10, color: s.count > 0 ? txt2 : '#d1d5db' }}>
                      {s.required ? 'required' : 'optional'} row{s.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* Errors */}
              {showErrors && parseResult.errors.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  {parseResult.errors.slice(0, 20).map((e, i) => (
                    <div key={i} style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:7, padding:'7px 12px', marginBottom:5, fontSize:12 }}>
                      <span style={{ fontWeight:700, color:C.red }}>{e.sheet} Row {e.row}:</span>
                      <span style={{ color:txt, marginLeft:8 }}>{e.msg}</span>
                    </div>
                  ))}
                  {parseResult.errors.length > 20 && (
                    <p style={{ fontSize:11, color:txt2, textAlign:'center' }}>…and {parseResult.errors.length - 20} more errors</p>
                  )}
                </div>
              )}

              {/* Patient preview table */}
              {parseResult.data.sheet1.length > 0 && (
                <div style={{ overflowX:'auto', maxHeight:180, border:`1px solid ${bdr}`, borderRadius:8 }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead>
                      <tr style={{ background:`${C.green}12`, position:'sticky', top:0 }}>
                        {['#','Last Name','First Name','Age','Sex','Barangay','Contact'].map(h => (
                          <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontWeight:800, color:C.green, whiteSpace:'nowrap', borderBottom:`1px solid ${bdr}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.data.sheet1.slice(0,50).map((r, i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${bdr}` }}>
                          <td style={{ padding:'6px 10px', color:txt2 }}>{i+1}</td>
                          <td style={{ padding:'6px 10px', fontWeight:600, color:txt }}>{r.last_name}</td>
                          <td style={{ padding:'6px 10px', color:txt }}>{r.first_name}</td>
                          <td style={{ padding:'6px 10px', color:txt }}>{r.age}</td>
                          <td style={{ padding:'6px 10px' }}>
                            <span style={{ padding:'1px 7px', borderRadius:20, fontSize:10, fontWeight:700, background: String(r.sex).toUpperCase()==='F' ? '#fdf2f8' : '#ecfdf5', color: String(r.sex).toUpperCase()==='F' ? '#db2777' : C.green }}>
                              {String(r.sex).toUpperCase() || '—'}
                            </span>
                          </td>
                          <td style={{ padding:'6px 10px', color:txt }}>{r.barangay||'—'}</td>
                          <td style={{ padding:'6px 10px', color:txt2 }}>{r.contact_number||'—'}</td>
                        </tr>
                      ))}
                      {parseResult.data.sheet1.length > 50 && (
                        <tr><td colSpan={7} style={{ padding:'8px', textAlign:'center', color:txt2, fontSize:11 }}>…and {parseResult.data.sheet1.length - 50} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Done result */}
          {done && (
            <div style={{ background: done.fail === 0 ? `${C.green}12` : '#fef2f2', border:`1px solid ${done.fail === 0 ? C.green : C.red}33`, borderRadius:12, padding:'20px', textAlign:'center', marginBottom:16 }}>
              <div style={{ fontSize:36, marginBottom:8 }}>{done.fail === 0 ? '🎉' : '⚠️'}</div>
              <p style={{ margin:0, fontSize:16, fontWeight:800, color:txt }}>Import Complete</p>
              <p style={{ margin:'6px 0 0', fontSize:13, color:txt2 }}>
                <span style={{ color:C.green, fontWeight:700 }}>{done.ok} patient{done.ok !== 1 ? 's' : ''} imported</span>
                {done.fail > 0 && <span style={{ color:C.red, fontWeight:700 }}> · {done.fail} failed</span>}
              </p>
              {done.messages.length > 0 && (
                <div style={{ marginTop:10, textAlign:'left', maxHeight:120, overflowY:'auto' }}>
                  {done.messages.map((m, i) => (
                    <div key={i} style={{ fontSize:11, color:C.red, padding:'3px 0' }}>• {m}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${bdr}`, background:card, display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0 }}>
          {done ? (
            <>
              <button onClick={reset} style={{ padding:'9px 22px', borderRadius:10, border:`1.5px solid ${bdr}`, background:'transparent', color:txt, fontWeight:700, fontSize:13, cursor:'pointer' }}>Import Another</button>
              <button onClick={onClose} style={{ padding:'9px 28px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${C.green},${C.teal})`, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:`0 4px 12px ${C.green}44` }}>Done</button>
            </>
          ) : (
            <>
              <button onClick={onClose} style={{ padding:'9px 22px', borderRadius:10, border:`1.5px solid ${bdr}`, background:'transparent', color:txt, fontWeight:700, fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button
                onClick={handleImport}
                disabled={!parseResult || parseResult.validCount === 0 || importing}
                style={{
                  padding:'9px 28px', borderRadius:10, border:'none', fontWeight:800, fontSize:13, cursor: (!parseResult || parseResult.validCount === 0) ? 'default' : 'pointer',
                  background: (!parseResult || parseResult.validCount === 0) ? '#d1d5db' : `linear-gradient(135deg,${C.green},${C.teal})`,
                  color:'#fff', opacity: importing ? 0.7 : 1,
                  boxShadow: (!parseResult || parseResult.validCount === 0) ? 'none' : `0 4px 12px ${C.green}44`,
                }}
              >
                {importing
                  ? `Importing… (${parseResult?.validCount})`
                  : `Import ${parseResult?.validCount ?? 0} Patient${(parseResult?.validCount ?? 0) !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}