// lib/labService.js
// All Supabase queries for the laboratory module
import { supabase } from '@/lib/supabase'

/* ══════════════════════════════════════════
   FETCH PENDING LAB REQUESTS
   - Joins laboratory_requests → patients
   - Only status = 'pending'
   Returns array of { request_id, patient_id, patient_name, age, gender, address, tests[], created_at }
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
    .order('created_at', { ascending: false })

  if (error) { console.error('fetchPendingRequests:', error); return [] }

  return (data || []).map(r => ({
    id:         r.id,
    patient_id: r.patient_id,
    request_date: r.request_date,
    created_at: r.created_at,
    status:     r.status,
    // Full name
    name: [r.patients?.last_name, r.patients?.first_name, r.patients?.middle_name]
      .filter(Boolean).join(', '),
    age:     r.patients?.age     || '',
    gender:  r.patients?.sex     || '',
    address: r.patients?.barangay || '',
    contact: r.patients?.contact_number || '',
    email:   r.patients?.email   || '',
    // Which tests were requested (true = requested)
    tests: {
      hgb_hct:            r.hgb_hct,
      cbc_with_platelet:  r.cbc_with_platelet,
      random_blood_sugar: r.random_blood_sugar,
      fasting_blood_sugar:r.fasting_blood_sugar,
      cholesterol:        r.cholesterol,
      triglycerides:      r.triglycerides,
      lipid_profile:      r.lipid_profile,
      blood_uric_acid:    r.blood_uric_acid,
      urinalysis:         r.urinalysis,
      fecalysis:          r.fecalysis,
      dengue_ns1:         r.dengue_ns1,
      dengue_igg_igm:     r.dengue_igg_igm,
      hbsag:              r.hbsag,
      pregnancy_test:     r.pregnancy_test,
      abo_rh_blood_typing:r.abo_rh_blood_typing,
    },
    // Derive primary test label for display
    test: deriveTestLabel(r),
  }))
}

/* ══════════════════════════════════════════
   FETCH ALL REQUESTS (for records table)
   Includes all statuses
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
      patients (
        id, first_name, middle_name, last_name,
        age, sex, barangay, contact_number, email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) { console.error('fetchAllRequests:', error); return [] }

  return (data || []).map(r => ({
    id:         r.id,
    patient_id: r.patient_id,
    request_date: r.request_date,
    created_at: r.created_at,
    status:     r.status,
    name: [r.patients?.last_name, r.patients?.first_name, r.patients?.middle_name]
      .filter(Boolean).join(', '),
    age:     r.patients?.age     || '',
    gender:  r.patients?.sex     || '',
    address: r.patients?.barangay || '',
    contact: r.patients?.contact_number || '',
    email:   r.patients?.email   || '',
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
    { data: testBreakdown },
  ] = await Promise.all([
    // Today's requests
    supabase.from('laboratory_requests').select('id', { count:'exact', head:true }).gte('created_at', today),
    // Pending
    supabase.from('laboratory_requests').select('id', { count:'exact', head:true }).eq('status', 'pending'),
    // Completed
    supabase.from('laboratory_requests').select('id', { count:'exact', head:true }).eq('status', 'completed'),
    // Monthly counts (last 12 months)
    supabase.from('laboratory_requests').select('created_at').gte('created_at', new Date(new Date().setFullYear(new Date().getFullYear()-1)).toISOString()),
    // All to count test types
    supabase.from('laboratory_requests').select('urinalysis, fecalysis, hgb_hct, cbc_with_platelet, random_blood_sugar, fasting_blood_sugar, cholesterol, hbsag, dengue_ns1, dengue_igg_igm'),
  ])

  // Build monthly bar data
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyCounts = Array(12).fill(0)
  ;(monthly || []).forEach(r => {
    const m = new Date(r.created_at).getMonth()
    monthlyCounts[m]++
  })
  const barData = monthNames.map((month, i) => ({ month, count: monthlyCounts[i] }))

  // Test type breakdown for pie
  const counts = { Urinalysis:0, Fecalysis:0, Hematology:0, Chemistry:0, Serology:0 }
  ;(testBreakdown || []).forEach(r => {
    if (r.urinalysis)           counts.Urinalysis++
    if (r.fecalysis)            counts.Fecalysis++
    if (r.hgb_hct || r.cbc_with_platelet) counts.Hematology++
    if (r.random_blood_sugar || r.fasting_blood_sugar || r.cholesterol) counts.Chemistry++
    if (r.hbsag || r.dengue_ns1 || r.dengue_igg_igm) counts.Serology++
  })

  return {
    totalToday:    totalToday    || 0,
    totalPending:  totalPending  || 0,
    totalCompleted:totalCompleted|| 0,
    barData,
    pieData: Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0),
  }
}

/* ══════════════════════════════════════════
   FETCH EXISTING RESULTS for a request
   Returns { fecalysis, urinalysis, hematology, chemistry, serology[] }
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
   SAVE LAB RESULTS (upsert)
══════════════════════════════════════════ */
export async function saveFecalysis(requestId, data, performedBy) {
  const { error } = await supabase.from('laboratory_results_fecalysis').upsert({
    request_id:    requestId,
    color:         data.color         || null,
    consistency:   data.consist       || null,
    wbc_pus_cell:  data.wbc           || null,
    rbc:           data.rbc           || null,
    parasite:      data.parasite      || null,
    others:        data.others        || null,
    remarks:       data.remarks       || null,
    performed_by:  performedBy        || null,
  }, { onConflict: 'request_id' })
  return !error
}

export async function saveUrinalysis(requestId, data, performedBy) {
  const { error } = await supabase.from('laboratory_results_urinalysis').upsert({
    request_id:      requestId,
    color:           data.color    || null,
    consistency:     data.consist  || null,
    specific_gravity:data.spg      || null,
    ph_reaction:     data.ph       || null,
    protein:         data.protein  || null,
    sugar:           data.sugar    || null,
    wbc_pus_cell:    data.wbc      || null,
    rbc:             data.rbc      || null,
    epithelial_cell: data.epi      || null,
    amorphous_subs:  data.amorph   || null,
    mucus_thread:    data.mucus    || null,
    bacteria:        data.bacteria || null,
    others:          data.others   || null,
    remarks:         data.remarks  || null,
    performed_by:    performedBy   || null,
  }, { onConflict: 'request_id' })
  return !error
}

export async function saveHematology(requestId, data, performedBy) {
  const { error } = await supabase.from('laboratory_results_hematology').upsert({
    request_id:    requestId,
    hgb:           data.hgb    || null,
    hct:           data.hct    || null,
    wbc:           data.wbc    || null,
    rbc:           data.rbc    || null,
    platelet_count:data.plt    || null,
    neutrophils:   data.neut   || null,
    lymphocytes:   data.lymp   || null,
    monocytes:     data.mono   || null,
    eosinophils:   data.eos    || null,
    basophils:     data.baso   || null,
    remarks:       data.remarks|| null,
    performed_by:  performedBy || null,
  }, { onConflict: 'request_id' })
  return !error
}

export async function saveChemistry(requestId, data, performedBy) {
  const { error } = await supabase.from('laboratory_results_chemistry').upsert({
    request_id:       requestId,
    rbs:              data.rbs      || null,
    fbs:              data.fbs      || null,
    cholesterol:      data.chol     || null,
    triglycerides:    data.trig     || null,
    hdl:              data.hdl      || null,
    ldl:              data.ldl      || null,
    blood_uric_acid:  data.uric     || null,
    last_meal:        data.lastMeal || null,
    time_of_extraction: data.timeEx || null,
    remarks:          data.remarks  || null,
    performed_by:     performedBy   || null,
  }, { onConflict: 'request_id' })
  return !error
}

export async function saveSerology(requestId, rows, performedBy) {
  // Delete existing then re-insert (serology has multiple rows per request)
  await supabase.from('laboratory_results_serology').delete().eq('request_id', requestId)
  const inserts = rows
    .filter(r => r.result || r.test_kit || r.lot_number)
    .map(r => ({
      request_id:   requestId,
      test_name:    r.test_name,
      test_kit:     r.kit         || null,
      lot_number:   r.lot         || null,
      expiry_date:  r.exp         || null,
      type_of_test: r.type        || null,
      result:       r.result      || null,
      remarks:      r.remarks     || null,
      performed_by: performedBy   || null,
    }))
  if (inserts.length === 0) return true
  const { error } = await supabase.from('laboratory_results_serology').insert(inserts)
  return !error
}

/* ══════════════════════════════════════════
   MARK REQUEST AS COMPLETED
══════════════════════════════════════════ */
export async function markRequestCompleted(requestId) {
  const { error } = await supabase
    .from('laboratory_requests')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', requestId)
  return !error
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function buildTestsObj(r) {
  return {
    hgb_hct: r.hgb_hct, cbc_with_platelet: r.cbc_with_platelet,
    random_blood_sugar: r.random_blood_sugar, fasting_blood_sugar: r.fasting_blood_sugar,
    cholesterol: r.cholesterol, triglycerides: r.triglycerides,
    lipid_profile: r.lipid_profile, blood_uric_acid: r.blood_uric_acid,
    urinalysis: r.urinalysis, fecalysis: r.fecalysis,
    dengue_ns1: r.dengue_ns1, dengue_igg_igm: r.dengue_igg_igm,
    hbsag: r.hbsag, pregnancy_test: r.pregnancy_test,
    abo_rh_blood_typing: r.abo_rh_blood_typing,
  }
}

// Map DB booleans → display label
function deriveTestLabel(r) {
  if (r.fecalysis)            return 'Fecalysis'
  if (r.urinalysis)           return 'Urinalysis'
  if (r.hgb_hct || r.cbc_with_platelet) return 'Hematology'
  if (r.random_blood_sugar || r.fasting_blood_sugar || r.cholesterol) return 'Clinical Chemistry'
  if (r.hbsag || r.dengue_ns1 || r.dengue_igg_igm) return 'Serology'
  return 'Multiple Tests'
}
