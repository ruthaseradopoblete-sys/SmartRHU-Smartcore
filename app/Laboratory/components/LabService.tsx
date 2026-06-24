// lib/labService.js
// All Supabase queries for the laboratory module
import { supabase } from '@/lib/supabase'

/* ══════════════════════════════════════════
   FETCH PENDING LAB REQUESTS
══════════════════════════════════════════ */
export async function fetchPendingRequests() {
  const { data, error } = await supabase
    .from('laboratory_requests')
    .select(`
  id,
  patient_id,
  request_date,
  status,
  created_at,
  hgb_hct,
  cbc_with_platelet,
  random_blood_sugar,
  fasting_blood_sugar,
  cholesterol,
  triglycerides,
  lipid_profile,
  blood_uric_acid,
  urinalysis,
  fecalysis,
  dengue_ns1,
  dengue_igg_igm,
  hbsag,
  pregnancy_test,
  abo_rh_blood_typing,
  afb_dssm,
  gene_xpert,
  pt_ptt,
  bun,
  creatinine,
  sgpt_alt,
  sgot_ast,
  serum_na_k_cl,
  typhidot_igg_igm,
  ecg_12_lead,
  culture_and_sensitivity,
  ultrasound,
  xray,
  others,
  patients (
    id,
    first_name,
    middle_name,
    last_name,
    age,
    sex,
    barangay,
    contact_number,
    email
  )
`)
    .eq('status', 'pending')
   .order('created_at', { ascending: true })

  if (error) { console.error('fetchPendingRequests:', error); return [] }

  return (data || []).map(r => ({
    id:           r.id,
    patient_id:   r.patient_id,
    request_date: r.request_date,
    created_at:   r.created_at,
    status:       r.status,
    name: [r.patients?.last_name, r.patients?.first_name, r.patients?.middle_name]
      .filter(Boolean).join(', '),
    age:     r.patients?.age            || '',
    gender:  r.patients?.sex            || '',
    address: r.patients?.barangay       || '',
    contact: r.patients?.contact_number || '',
    email:   r.patients?.email          || '',
     ultrasound: r.ultrasound || '',
    xray:       r.xray       || '',
    others:     r.others     || '',
    tests:   buildTestsObj(r),
    test:    deriveTestLabel(r),
  }))
}

/* ══════════════════════════════════════════
   FETCH ALL REQUESTS (for records table)
══════════════════════════════════════════ */
export async function fetchAllRequests() {
  const { data, error } = await supabase
    .from('laboratory_requests')
    .select(`
      id,
      patient_id,
      request_date,
      status,
      created_at,
      hgb_hct, cbc_with_platelet,
      random_blood_sugar, fasting_blood_sugar,
      cholesterol, triglycerides, lipid_profile, blood_uric_acid,
      urinalysis, fecalysis,
      dengue_ns1, dengue_igg_igm, hbsag,
      pregnancy_test, abo_rh_blood_typing,
      afb_dssm, gene_xpert, culture_and_sensitivity,
      patients (
        id, first_name, middle_name, last_name,
        age, sex, barangay, contact_number, email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) { console.error('fetchAllRequests:', error); return [] }

  return (data || []).map(r => ({
    id:           r.id,
    patient_id:   r.patient_id,
    request_date: r.request_date,
    created_at:   r.created_at,
    status:       r.status,
    name: [r.patients?.last_name, r.patients?.first_name, r.patients?.middle_name]
      .filter(Boolean).join(', '),
    age:     r.patients?.age            || '',
    gender:  r.patients?.sex            || '',
    address: r.patients?.barangay       || '',
    contact: r.patients?.contact_number || '',
    email:   r.patients?.email          || '',
    tests:   buildTestsObj(r),
    test:    deriveTestLabel(r),
  }))
}

/* ══════════════════════════════════════════
   FETCH DASHBOARD ANALYTICS
══════════════════════════════════════════ */
export async function fetchDashboardStats() {
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalToday },
    { count: totalPending },
    { count: totalCompleted },
    { data: monthly },
    { data: allRequests },
  ] = await Promise.all([
    supabase.from('laboratory_requests').select('id', { count:'exact', head:true }).gte('created_at', today),
    supabase.from('laboratory_requests').select('id', { count:'exact', head:true }).eq('status', 'pending'),
    supabase.from('laboratory_requests').select('id', { count:'exact', head:true }).eq('status', 'completed'),
    supabase.from('laboratory_requests').select('created_at').gte('created_at',
      new Date(new Date().setFullYear(new Date().getFullYear()-1)).toISOString()
    ),
    supabase.from('laboratory_requests').select(
      'status, urinalysis, fecalysis, hgb_hct, cbc_with_platelet, ' +
      'random_blood_sugar, fasting_blood_sugar, cholesterol, triglycerides, lipid_profile, blood_uric_acid, ' +
      'hbsag, dengue_ns1, dengue_igg_igm, pregnancy_test, abo_rh_blood_typing'
    ),
  ])

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyCounts = Array(12).fill(0)
  ;(monthly || []).forEach(r => { monthlyCounts[new Date(r.created_at).getMonth()]++ })
  const barData = monthNames.map((month, i) => ({ month, count: monthlyCounts[i] }))

  const pieCounts = { Urinalysis:0, Fecalysis:0, Hematology:0, Chemistry:0, Serology:0 }

  const chemKeys  = ['random_blood_sugar','fasting_blood_sugar','cholesterol','triglycerides','lipid_profile','blood_uric_acid']
  const seroKeys  = ['hbsag','dengue_ns1','dengue_igg_igm','pregnancy_test','abo_rh_blood_typing']
  const chemStats = Object.fromEntries(chemKeys.map(k => [k, { pending:0, completed:0 }]))
  const seroStats = Object.fromEntries(seroKeys.map(k => [k, { pending:0, completed:0 }]))

  ;(allRequests || []).forEach(r => {
    const done = r.status === 'completed'
    if (r.urinalysis)                     pieCounts.Urinalysis++
    if (r.fecalysis)                      pieCounts.Fecalysis++
    if (r.hgb_hct || r.cbc_with_platelet) pieCounts.Hematology++
    if (chemKeys.some(k => r[k]))         pieCounts.Chemistry++
    if (seroKeys.some(k => r[k]))         pieCounts.Serology++

    chemKeys.forEach(k => { if (r[k]) done ? chemStats[k].completed++ : chemStats[k].pending++ })
    seroKeys.forEach(k => { if (r[k]) done ? seroStats[k].completed++ : seroStats[k].pending++ })
  })

  return {
    totalToday:    totalToday     || 0,
    totalPending:  totalPending   || 0,
    totalCompleted:totalCompleted || 0,
    barData,
    pieData:   Object.entries(pieCounts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0),
    chemStats,
    seroStats,
  }
}

/* ══════════════════════════════════════════
   FETCH EXISTING RESULTS for a request
══════════════════════════════════════════ */
export async function fetchLabResults(requestId) {
  const [fec, uri, hem, chem, ser] = await Promise.all([
    supabase.from('laboratory_results_fecalysis').select('*').eq('request_id', requestId).maybeSingle(),
    supabase.from('laboratory_results_urinalysis').select('*').eq('request_id', requestId).maybeSingle(),
    supabase.from('laboratory_results_hematology').select('*').eq('request_id', requestId).maybeSingle(),
    supabase.from('laboratory_results_chemistry').select('*').eq('request_id', requestId).maybeSingle(),
    supabase.from('laboratory_results_serology').select('*').eq('request_id', requestId),
  ])
  return {
    fecalysis:  fec.data  || {},
    urinalysis: uri.data  || {},
    hematology: hem.data  || {},
    chemistry:  chem.data || {},
    serology:   ser.data  || [],
  }
}

/* ══════════════════════════════════════════
   SAVE LAB RESULTS (upsert per test type)
══════════════════════════════════════════ */
export async function saveFecalysis(requestId, data, performedBy) {
  const { error } = await supabase
    .from('laboratory_results_fecalysis')
    .upsert({
      request_id:   requestId,
      color:        data.color    || null,
      consistency:  data.consist  || null,
      wbc_pus_cell: data.wbc      || null,
      rbc:          data.rbc      || null,
      parasite:     data.parasite || null,
      others:       data.others   || null,
      remarks:      data.remarks  || null,
    }, { onConflict: 'request_id' })
  if (error) console.error('[saveFecalysis]', error.message, error.details)
  return !error
}

export async function saveUrinalysis(requestId, data, performedBy) {
  const { error } = await supabase
    .from('laboratory_results_urinalysis')
    .upsert({
      request_id:       requestId,
      color:            data.color    || null,
      consistency:      data.consist  || null,
      specific_gravity: data.spg      || null,
      ph_reaction:      data.ph       || null,
      protein:          data.protein  || null,
      sugar:            data.sugar    || null,
      wbc_pus_cell:     data.wbc      || null,
      rbc:              data.rbc      || null,
      epithelial_cell:  data.epi      || null,
      amorphous_subs:   data.amorph   || null,
      mucus_thread:     data.mucus    || null,
      bacteria:         data.bacteria || null,
      others:           data.others   || null,
      remarks:          data.remarks  || null,
    }, { onConflict: 'request_id' })
  if (error) console.error('[saveUrinalysis]', error.message, error.details)
  return !error
}

export async function saveHematology(requestId, data, performedBy) {
  const { error } = await supabase
    .from('laboratory_results_hematology')
    .upsert({
      request_id:     requestId,
      hgb:            data.hgb     || null,
      hct:            data.hct     || null,
      wbc:            data.wbc     || null,
      rbc:            data.rbc     || null,
      platelet_count: data.plt     || null,
      neutrophils:    data.neut    || null,
      lymphocytes:    data.lymp    || null,
      monocytes:      data.mono    || null,
      eosinophils:    data.eos     || null,
      basophils:      data.baso    || null,
      remarks:        data.remarks || null,
    }, { onConflict: 'request_id' })
  if (error) console.error('[saveHematology]', error.message, error.details)
  return !error
}

export async function saveChemistry(requestId, data, performedBy) {
  const { error } = await supabase
    .from('laboratory_results_chemistry')
    .upsert({
      request_id:         requestId,
      rbs:                data.rbs      || null,
      fbs:                data.fbs      || null,
      cholesterol:        data.chol     || null,
      triglycerides:      data.trig     || null,
      hdl:                data.hdl      || null,
      ldl:                data.ldl      || null,
      blood_uric_acid:    data.uric     || null,
      last_meal:          data.lastMeal || null,
      // FIX: time_of_extraction is a Postgres TIME column. A free-typed value
      // that isn't HH:MM(:SS) used to fail the whole upsert — meaning RBS,
      // FBS, cholesterol etc. ALL silently failed to save together with it.
      // Only pass it through if it's a valid time string, else null.
      time_of_extraction: /^\d{1,2}:\d{2}(:\d{2})?$/.test(data.timeEx || '') ? data.timeEx : null,
      remarks:            data.remarks  || null,
    }, { onConflict: 'request_id' })
  if (error) console.error('[saveChemistry]', error.message, error.details)
  return !error
}

export async function saveSerology(requestId, rows, performedBy) {
  await supabase.from('laboratory_results_serology').delete().eq('request_id', requestId)

  const inserts = rows
    .filter(r => r.result || r.kit || r.lot || r.remarks)
    .map(r => ({
      request_id:   requestId,
      test_name:    r.test_name,
      test_kit:     r.kit     || null,
      lot_number:   r.lot     || null,
      expiry_date:  r.exp     || null,
      type_of_test: r.type    || null,
      result:       r.result  || null,
      remarks:      r.remarks || null,
    }))
  if (inserts.length === 0) return true

  // FIX: insert rows ONE AT A TIME instead of one bulk insert.
  // The DB has a CHECK constraint on test_name that (until you run the SQL
  // migration) doesn't allow 'hiv' or 'syphilis'. A single bulk insert call
  // is all-or-nothing — one disallowed test_name used to silently kill the
  // ENTIRE serology save (HBsAg, Dengue NS1, everything). Looping means
  // valid rows always save even if one specific row is rejected.
  let allOk = true
  for (const row of inserts) {
    const { error } = await supabase.from('laboratory_results_serology').insert([row])
    if (error) {
      console.error('[saveSerology]', row.test_name, error.message, error.details)
      allOk = false
    }
  }
  return allOk
}

/* ══════════════════════════════════════════
   MARK REQUEST AS COMPLETED
══════════════════════════════════════════ */
export async function markRequestCompleted(requestId) {
  const { error } = await supabase
    .from('laboratory_requests')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) console.error('[markRequestCompleted]', error.message, error.details)
  return !error
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function buildTestsObj(r) {
  return {
    hgb_hct:                 r.hgb_hct,
    cbc_with_platelet:       r.cbc_with_platelet,
    random_blood_sugar:      r.random_blood_sugar,
    fasting_blood_sugar:     r.fasting_blood_sugar,
    cholesterol:             r.cholesterol,
    triglycerides:           r.triglycerides,
    lipid_profile:           r.lipid_profile,
    blood_uric_acid:         r.blood_uric_acid,
    urinalysis:              r.urinalysis,
    fecalysis:               r.fecalysis,
    dengue_ns1:              r.dengue_ns1,
    dengue_igg_igm:          r.dengue_igg_igm,
    hbsag:                   r.hbsag,
    pregnancy_test:          r.pregnancy_test,
    abo_rh_blood_typing:     r.abo_rh_blood_typing,
    afb_dssm:                r.afb_dssm,
    gene_xpert:              r.gene_xpert,
    culture_and_sensitivity: r.culture_and_sensitivity,
     pt_ptt:              r.pt_ptt,
    bun:                 r.bun,
    creatinine:          r.creatinine,
    sgpt_alt:            r.sgpt_alt,
    sgot_ast:            r.sgot_ast,
    serum_na_k_cl:       r.serum_na_k_cl,
    typhidot_igg_igm:    r.typhidot_igg_igm,
    ecg_12_lead:         r.ecg_12_lead,
  }
}

function deriveTestLabel(r) {
  if (r.fecalysis)                                               return 'Fecalysis'
  if (r.urinalysis)                                              return 'Urinalysis'
  if (r.hgb_hct || r.cbc_with_platelet)                         return 'Hematology'
  if (r.random_blood_sugar || r.fasting_blood_sugar || r.cholesterol || r.triglycerides || r.lipid_profile || r.blood_uric_acid)
                                                                 return 'Clinical Chemistry'
  if (r.hbsag || r.dengue_ns1 || r.dengue_igg_igm || r.pregnancy_test || r.abo_rh_blood_typing)
                                                                 return 'Serology'
  return 'Multiple Tests'
}