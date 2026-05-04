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

  const v = (x: any) => (x !== null && x !== undefined && x !== '') ? String(x) : ''

  const pm  = data.pastMed   || {}
  const fh  = data.famHist   || {}
  const so  = data.social    || {}
  const fp  = data.fp        || {}
  const mh  = data.menstrual || {}
  const pr  = data.preg      || {}
  const im  = data.immun     || {}
  const ph  = data.physical  || {}
  const pe  = data.pedia     || {}
  const fi  = data.findings  || {}
  const nd  = data.ncd       || {}
  const kr  = data.konsulta  || {}

  // ── Shared sub-components ──────────────────────────────────

  const CB = ({ checked }: { checked: boolean | null | undefined }) => (
    <span style={{
      display: 'inline-block', width: 7, height: 7,
      border: '1px solid #333', background: checked ? '#1a6b2e' : '#fff',
      marginRight: 2, verticalAlign: 'middle', flexShrink: 0,
    }} />
  )

  const CheckItem = ({ checked, children }: { checked?: boolean | null; children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', fontSize: 6, marginBottom: 1, lineHeight: 1.2 }}>
      <CB checked={!!checked} />
      <span>{children}</span>
    </div>
  )

  const Row = ({ label, value, unit }: { label: string; value?: string; unit?: string }) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 1.5, fontSize: 6.5 }}>
      <span style={{ whiteSpace: 'nowrap', color: '#333' }}>{label}</span>
      <span style={{ flex: 1, borderBottom: '1px solid #555', minWidth: 15, height: 8, fontSize: 6.5 }}>{value}</span>
      {unit && <span style={{ whiteSpace: 'nowrap', fontSize: 5.5 }}>{unit}</span>}
    </div>
  )

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontWeight: 700, fontSize: 6.5, textDecoration: 'underline', marginBottom: 2, color: '#000' }}>
      {children}
    </div>
  )

  const SectionBox = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ border: '1px solid #333', padding: '2px 3px', marginBottom: 2, ...style }}>
      {children}
    </div>
  )

  const SH = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background: '#1a6b2e', color: '#fff', fontWeight: 700, fontSize: 6.5, padding: '1px 3px', marginBottom: 2, marginTop: 2 }}>
      {children}
    </div>
  )

  const TwoCol = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 3px' }}>
      {children}
    </div>
  )

  const ThreeCol = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 2px' }}>
      {children}
    </div>
  )

  const Line = ({ width }: { width?: number }) => (
    <span style={{ borderBottom: '1px solid #555', display: 'inline-block', minWidth: width ?? 20 }}>&nbsp;</span>
  )

  // ── Disease lists ──────────────────────────────────────────

  const DISEASES_PM = [
    { key: 'allergy',                  label: 'Allergy',                    specVal: pm.allergy_specify },
    { key: 'asthma',                   label: 'Asthma' },
    { key: 'cancer',                   label: 'Cancer',                     specVal: pm.cancer_specify },
    { key: 'cerebrovascular_disease',  label: 'Cerebrovascular Disease' },
    { key: 'coronary_artery_disease',  label: 'Coronary Artery Disease' },
    { key: 'diabetes_mellitus',        label: 'Diabetes Mellitus' },
    { key: 'emphysema',                label: 'Emphysema' },
    { key: 'epilepsy_seizure',         label: 'Epilepsy / Seizure Disorder' },
    { key: 'hepatitis',                label: 'Hepatitis',                  specVal: pm.hepatitis_specify },
    { key: 'hyperlipidemia',           label: 'Hyperlipidemia' },
    { key: 'hypertension',             label: 'Hypertension',               specVal: pm.hypertension_highest_bp ? `(Highest BP: ${pm.hypertension_highest_bp} mmHg)` : '' },
    { key: 'peptic_ulcer',             label: 'Peptic Ulcer' },
    { key: 'pneumonia',                label: 'Pneumonia' },
    { key: 'thyroid_disease',          label: 'Thyroid Disease' },
    { key: 'ptb',                      label: 'PTB',                        specVal: pm.ptb_specify_extra },
    { key: 'urinary_tract_infection',  label: 'Urinary Tract Infection' },
    { key: 'mental_illness',           label: 'Mental Illnesses' },
    { key: 'others',                   label: 'Others' },
  ]

  const DISEASES_FH = DISEASES_PM.map(d => ({
    ...d,
    specVal: undefined,
    ...(d.key === 'allergy'       ? { specVal: fh.allergy_specify } : {}),
    ...(d.key === 'cancer'        ? { specVal: fh.cancer_specify } : {}),
    ...(d.key === 'hepatitis'     ? { specVal: fh.hepatitis_specify } : {}),
    ...(d.key === 'hypertension'  ? { specVal: fh.hypertension_highest_bp ? `(Highest BP: ${fh.hypertension_highest_bp} mmHg)` : '' } : {}),
    ...(d.key === 'ptb'           ? { specVal: fh.ptb_specify_extra } : {}),
    ...(d.key === 'diabetes_mellitus' ? { label: 'Diabetes Mellitus (If yes, perform FBS:)' } : {}),
  }))

  // ── Print styles injected via <style> ─────────────────────

  const printStyles = `
    @media print {
      @page { size: landscape; margin: 3mm; }
      .no-print { display: none !important; }
      body, html { margin: 0; padding: 0; background: #fff !important; }
      body * { visibility: hidden; }
      .print-area, .print-area * { visibility: visible; }
      .print-area {
        position: fixed;
        left: 0; top: 0;
        width: 100vw;
        font-size: 6pt !important;
        overflow: hidden;
      }
    }
  `

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 8, color: '#1a6b2e', fontFamily: 'Arial, sans-serif' }}>Loading records...</div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 3000, padding: 16, overflowY: 'auto' }}>
      <style>{printStyles}</style>

      <div style={{ background: '#fff', width: '100%', maxWidth: 1200, borderRadius: 6, fontFamily: 'Arial, Helvetica, sans-serif' }}>

        {/* ── Toolbar ── */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '2px solid #1a6b2e', background: '#f0faf0' }}>
          <span style={{ fontWeight: 700, color: '#1a6b2e', fontSize: 14 }}>Patient Health Record — PAHS Form 5</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} style={{ background: '#1a6b2e', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 5, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>🖨️ Print</button>
            <button onClick={onClose} style={{ background: '#8B1A1A', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 5, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            PRINT AREA — landscape, two-column bond paper
        ══════════════════════════════════════════════ */}
        <div className="print-area" style={{ padding: '2mm 3mm', fontSize: 6.5, lineHeight: 1.2, color: '#111', display: 'flex', flexDirection: 'column', height: '210mm' }}>

          {/* ── GLOBAL HEADER ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid #1a6b2e', paddingBottom: 3, marginBottom: 3 }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: 30, height: 30, objectFit: 'contain', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 8, color: '#1a6b2e' }}>PAHS FORM 5. KONSULTA HEALTH ASSESSMENT TOOL v5</div>
              <div style={{ fontWeight: 700, fontSize: 7.5, color: '#1a6b2e' }}>GENERAL DATA AND KONSULTA REGISTRATION</div>
              <div style={{ fontSize: 6, color: '#555' }}>Province of Quezon — Province-Wide Health System</div>
            </div>
          </div>

          {/* ══ BODY: LEFT HALF | RIGHT HALF ══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, gap: 0, overflow: 'hidden' }}>

            {/* ════════════════ LEFT HALF ════════════════ */}
            <div style={{ borderRight: '2px solid #1a6b2e', padding: '0 2mm 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* ── General Data box ── */}
              <div style={{ border: '1px solid #333', padding: 3, marginBottom: 2, fontSize: 6.5 }}>

                {/* Name */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>FULL NAME</span>
                  {[['LAST', patient.last_name], ['FIRST', patient.first_name], ['MIDDLE', patient.middle_name]].map(([lbl, val]) => (
                    <div key={String(lbl)} style={{ flex: 1 }}>
                      <div style={{ borderBottom: '1px solid #555', paddingBottom: 1, fontSize: 6.5 }}>{v(val)}</div>
                      <div style={{ fontSize: 5, textAlign: 'center', color: '#555' }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Age / Sex / Birthdate */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 1.5 }}>
                  <span style={{ fontWeight: 700 }}>AGE</span>
                  <span style={{ borderBottom: '1px solid #555', minWidth: 20, paddingBottom: 1 }}>{v(patient.age)}</span>
                  <span style={{ fontWeight: 700, marginLeft: 6 }}>SEX</span>
                  <CB checked={patient.sex === 'F'} />F &nbsp;<CB checked={patient.sex === 'M'} />M
                  <span style={{ fontWeight: 700, marginLeft: 8 }}>BIRTHDATE</span>
                  <span style={{ borderBottom: '1px solid #555', minWidth: 55, paddingBottom: 1 }}>{v(patient.birthdate)}</span>
                  <span style={{ fontSize: 5, color: '#555' }}>(MM/DD/YYYY)</span>
                </div>

                {/* Address */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', marginBottom: 1.5 }}>
                  <span style={{ fontWeight: 700 }}>ADDRESS</span>
                  {[['PUROK', patient.purok], ['BARANGAY', patient.barangay], ['MUNICIPALITY', patient.municipality]].map(([lbl, val]) => (
                    <div key={String(lbl)} style={{ flex: 1 }}>
                      <div style={{ borderBottom: '1px solid #555', paddingBottom: 1 }}>{v(val)}</div>
                      <div style={{ fontSize: 5, color: '#555' }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Contact / Email */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 1.5 }}>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>CONTACT #</span>
                  <span style={{ flex: 1, borderBottom: '1px solid #555', paddingBottom: 1 }}>{v(patient.contact_number)}</span>
                  <span style={{ fontWeight: 700, marginLeft: 8 }}>E-MAIL</span>
                  <span style={{ flex: 1.5, borderBottom: '1px solid #555', paddingBottom: 1 }}>{v(patient.email)}</span>
                </div>

                {/* PhilHealth PIN */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', marginBottom: 1.5 }}>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>PHILHEALTH PIN</span>
                  <span style={{ flex: 1, borderBottom: '1px solid #555', paddingBottom: 1 }}>{v(patient.philhealth_pin)}</span>
                </div>

                {/* Member Type */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 1.5 }}>
                  <span style={{ fontWeight: 700 }}>MEMBER TYPE</span>
                  <CB checked={patient.member_type === 'Member'} />MEMBER &nbsp;
                  <CB checked={patient.member_type === 'Dependent'} />DEPENDENT
                  <span style={{ marginLeft: 5 }}>Specify:</span>
                  <span style={{ borderBottom: '1px solid #555', minWidth: 55, paddingBottom: 1 }}>{v(patient.member_type_specify)}</span>
                </div>

                <div style={{ borderTop: '1.5px solid #1a6b2e', margin: '2px 0' }} />

                {/* Konsulta Registration */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 1.5 }}>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>KONSULTA REGISTRATION</span>
                  <span>Registration Date:</span>
                  <span style={{ borderBottom: '1px solid #555', minWidth: 50, paddingBottom: 1 }}>{v(kr.registration_date)}</span>
                  <span style={{ fontSize: 5, color: '#555' }}>(MM/DD/YYYY)</span>
                  <span style={{ marginLeft: 6 }}>KKP Sign</span><CB checked={kr.kkp_sign} />
                </div>

                {/* Preferred Facility */}
                <div style={{ fontWeight: 700, marginBottom: 1 }}>PREFERRED FACILITY AND ADDRESS</div>
                {[
                  ['CHOICE 1:', kr.facility_choice_1, kr.facility_kkp_1],
                  ['CHOICE 2:', kr.facility_choice_2, kr.facility_kkp_2],
                  ['CHOICE 3:', kr.facility_choice_3, kr.facility_kkp_3],
                ].map(([lbl, val, kkp]) => (
                  <div key={String(lbl)} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                    <span style={{ minWidth: 42 }}>{lbl}</span>
                    <span style={{ flex: 1, borderBottom: '1px solid #555', paddingBottom: 1 }}>{v(val)}</span>
                    <CB checked={!!kkp} />
                  </div>
                ))}

                {/* Authorization */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 6, marginTop: 1 }}>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>AUTHORIZATION TRANSACTION</span>
                  <CB checked={kr.has_at_code} />AT CODE:
                  <span style={{ borderBottom: '1px solid #555', minWidth: 50, paddingBottom: 1 }}>{v(kr.at_code)}</span>
                  Date of Appointment:
                  <span style={{ borderBottom: '1px solid #555', minWidth: 50, paddingBottom: 1 }}>{v(kr.date_of_appointment)}</span>
                  <span style={{ marginLeft: 6 }}>If no ATC,</span>
                  <CB checked={kr.face_capture} />Face Capture
                </div>

                {/* Signature */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #333', width: 120, marginBottom: 1 }} />
                    <div style={{ fontSize: 5.5 }}>MEMBER / GUARDIAN'S SIGNATURE</div>
                  </div>
                </div>
              </div>

              {/* ── HEALTH ASSESSMENT TOOL label ── */}
              <SH><span style={{ fontSize: 7 }}>HEALTH ASSESSMENT TOOL</span></SH>

              {/* ── Left 2-sub-column grid ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, flex: 1, overflow: 'hidden' }}>

                {/* SUB-COL A: Past Med + Family Hx + Personal/Social */}
                <div style={{ overflow: 'hidden' }}>

                  {/* Past Medical History */}
                  <SectionBox>
                    <SectionTitle>PAST MEDICAL HISTORY</SectionTitle>
                    {DISEASES_PM.map(d => (
                      <CheckItem key={d.key} checked={!!pm[d.key]}>
                        {d.label}
                        {d.specVal && <span style={{ marginLeft: 3, borderBottom: '1px solid #555', minWidth: 28, display: 'inline-block', fontSize: 5.5 }}>{d.specVal}</span>}
                      </CheckItem>
                    ))}
                    <Row label="Past Surgeries Done:" value={v(pm.past_surgeries_done)} />
                    <Row label="Date Done:" value={v(pm.date_surgery_done)} />
                  </SectionBox>

                  {/* Family History */}
                  <SectionBox>
                    <SectionTitle>FAMILY HISTORY</SectionTitle>
                    {DISEASES_FH.map(d => (
                      <CheckItem key={d.key} checked={!!fh[d.key]}>
                        {d.label}
                        {d.specVal && <span style={{ marginLeft: 3, borderBottom: '1px solid #555', minWidth: 28, display: 'inline-block', fontSize: 5.5 }}>{d.specVal}</span>}
                      </CheckItem>
                    ))}
                  </SectionBox>

                  {/* Personal / Social History */}
                  <SectionBox>
                    <SectionTitle>PERSONAL / SOCIAL HISTORY</SectionTitle>
                    {[
                      ['Smoking',        so.smoking,        'No. of pack-years:',    so.smoking_packs_per_year],
                      ['Alcohol',        so.alcohol,        'No. of servings/day:',  so.alcohol_servings_day],
                      ['Illicit Drugs',  so.illicit_drugs,  null, null],
                      ['Sexually Active', so.sexually_active, null, null],
                    ].map(([label, val, subLabel, subVal]) => (
                      <div key={String(label)} style={{ marginBottom: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 6 }}>
                          <span style={{ minWidth: 55 }}>{label}</span>
                          {['Yes', 'No', 'Quit'].map(opt => (
                            <span key={opt} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <CB checked={val === opt} />{opt}
                            </span>
                          ))}
                        </div>
                        {subLabel && (
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginLeft: 4, fontSize: 5.5 }}>
                            <span>{subLabel}</span>
                            <span style={{ borderBottom: '1px solid #555', minWidth: 28, paddingBottom: 1 }}>{v(subVal)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </SectionBox>
                </div>

                {/* SUB-COL B: Immunization + Family Planning + Menstrual + Pregnancy + Physical + Pedia */}
                <div style={{ overflow: 'hidden' }}>

                  {/* Immunization */}
                  <SectionBox>
                    <SectionTitle>IMMUNIZATION</SectionTitle>
                    <div style={{ fontWeight: 700, fontSize: 6, marginBottom: 1 }}>Children</div>
                    <ThreeCol>
                      {[['ECG', null], ['OPV1', im.opv1], ['OPV2', im.opv2], ['OPV3', im.opv3],
                        ['DPT1', im.dpt1], ['DPT2', im.dpt2], ['DPT3', im.dpt3],
                        ['Hepa1', im.hapa1], ['Hepa2', im.hapa2], ['Hepa3', im.hapa3],
                        ['Measles', im.measles], ['Varicella', im.varicella], ['BCG', im.bcg],
                      ].map(([lbl, val]) => (
                        <CheckItem key={String(lbl)} checked={!!val}><span style={{ fontSize: 5.5 }}>{lbl}</span></CheckItem>
                      ))}
                    </ThreeCol>
                    <div style={{ fontWeight: 700, fontSize: 6, marginTop: 2, marginBottom: 1 }}>Adult</div>
                    <div style={{ display: 'flex', gap: 6, fontSize: 5.5 }}>
                      {[['HPV', im.hpv], ['MMR', im.mmr], ['None', im.none_adult]].map(([lbl, val]) => (
                        <CheckItem key={String(lbl)} checked={!!val}><span style={{ fontSize: 5.5 }}>{lbl}</span></CheckItem>
                      ))}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 6, marginTop: 2, marginBottom: 1 }}>Elderly and Immunocompromised</div>
                    <CheckItem checked={!!im.pneumococcal_vaccine}><span style={{ fontSize: 5.5 }}>Pneumococcal Vaccine</span></CheckItem>
                    <CheckItem checked={!!im.flu_vaccine}><span style={{ fontSize: 5.5 }}>Flu Vaccine</span></CheckItem>
                    <Row label="Others:" value={v(im.others)} />
                  </SectionBox>

                  {/* Family Planning */}
                  <SectionBox>
                    <SectionTitle>FAMILY PLANNING</SectionTitle>
                    <CheckItem checked={fp.has_fp_counseling}>With access to family planning counseling</CheckItem>
                    <Row label="Provider:" value={v(fp.provider)} />
                    <Row label="Birth Control Method used:" value={v(fp.birth_control_method)} />
                  </SectionBox>

                  {/* Menstrual History */}
                  <SectionBox>
                    <SectionTitle>MENSTRUAL HISTORY</SectionTitle>
                    <Row label="Menarche:" value={mh.menarche_age ? `${mh.menarche_age}` : ''} unit="yrs old" />
                    <Row label="Onset of sexual intercourse:" value={mh.onset_sexual_intercourse_age ? `${mh.onset_sexual_intercourse_age}` : ''} unit="yrs old" />
                    <Row label="Last Menstrual Period:" value={v(mh.last_menstrual_period)} />
                    <Row label="Period Duration:" value={mh.period_duration_days ? `${mh.period_duration_days}` : ''} unit="days" />
                    <Row label="No. of pads/day:" value={v(mh.pads_per_day)} />
                    <Row label="Interval cycle:" value={mh.interval_cycle_days ? `${mh.interval_cycle_days}` : ''} unit="days" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 6, marginBottom: 1 }}>
                      <span>Menopause:</span><CB checked={mh.menopause === true} />Yes <CB checked={mh.menopause === false} />No
                    </div>
                    <Row label="Age at Menopause:" value={mh.age_at_menopause ? `${mh.age_at_menopause}` : ''} unit="years" />
                  </SectionBox>

                  {/* Pregnancy History */}
                  <SectionBox>
                    <SectionTitle>PREGNANCY HISTORY</SectionTitle>
                    <div style={{ display: 'flex', gap: 3, fontSize: 6, marginBottom: 1, flexWrap: 'wrap' }}>
                      {[['G', pr.gravida], ['P', pr.para], ['(T', pr.term], ['P', pr.preterm], ['A', pr.abortion], ['L', pr.living]].map(([l, val], i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontWeight: 700 }}>{l}</span>
                          <span style={{ borderBottom: '1px solid #555', minWidth: 12, paddingBottom: 1 }}>{v(val)}</span>
                        </span>
                      ))}
                      <span style={{ fontWeight: 700 }}>)</span>
                    </div>
                    <Row label="Type of Delivery:" value={v(pr.type_of_delivery)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 6 }}>
                      <span>Pregnancy Induced Hypertension:</span>
                      <CB checked={pr.pregnancy_include_hypertension === true} />Yes
                      <CB checked={pr.pregnancy_include_hypertension === false} />No
                    </div>
                  </SectionBox>

                  {/* Physical Exam Findings */}
                  <SectionBox>
                    <SectionTitle>PERTINENT PHYSICAL EXAMINATION FINDINGS</SectionTitle>
                    <TwoCol>
                      <Row label="Height:" value={ph.height_cm ? `${ph.height_cm}` : ''} unit="cm" />
                      <Row label="BP:" value={v(ph.blood_pressure_mmhg)} unit="mmHg" />
                      <Row label="Weight:" value={ph.weight_kg ? `${ph.weight_kg}` : ''} unit="kg" />
                      <Row label="HR:" value={ph.heart_rate_bpm ? `${ph.heart_rate_bpm}` : ''} unit="bpm" />
                      <Row label="Temp:" value={ph.temperature_c ? `${ph.temperature_c}` : ''} unit="°C" />
                      <Row label="RR:" value={ph.respiratory_rate_cpm ? `${ph.respiratory_rate_cpm}` : ''} unit="cpm" />
                    </TwoCol>
                    <div style={{ fontSize: 6, marginTop: 2 }}>
                      Blood Type: &nbsp;
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                        <span key={t} style={{ marginRight: 3, fontSize: 5.5 }}><CB checked={ph.blood_type === t} />{t}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 6, marginTop: 1 }}>
                      Visual Acuity: Right Eye: <Line width={22} />
                      {' '}Left Eye: <Line width={22} />
                    </div>
                  </SectionBox>

                  {/* Pedia Client */}
                  <SectionBox>
                    <SectionTitle>PEDIA CLIENT AGED 0-24 MOS</SectionTitle>
                    {[
                      ['Body Length:', pe.body_length_cm],
                      ['Head Circumference:', pe.head_circumference_cm],
                      ['Chest Circumference:', pe.chest_circumference_cm],
                      ['Abdominal Circumference:', pe.abdominal_circumference_cm],
                      ['Hip Circumference:', pe.hip_circumference_cm],
                      ['Mid-Upper Arm Circumference:', pe.mid_upper_arm_circ_cm],
                      ['Limbs Circumference:', pe.limbs_circumference_cm],
                    ].map(([lbl, val]) => (
                      <Row key={String(lbl)} label={String(lbl)} value={v(val)} unit="cm" />
                    ))}
                  </SectionBox>
                </div>
              </div>
            </div>

            {/* ════════════════ RIGHT HALF ════════════════ */}
            <div style={{ padding: '0 0 0 2mm', display: 'flex', gap: 2, overflow: 'hidden' }}>

              {/* Right inner 2-col grid */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, alignContent: 'start', overflow: 'hidden' }}>

                {/* ── Pertinent Findings Per System ── */}
                <div style={{ overflow: 'hidden' }}>
                  <SH>PERTINENT FINDINGS PER SYSTEM — PHYSICAL EXAMINATION</SH>

                  {/* General Survey */}
                  <SectionBox>
                    <div style={{ fontWeight: 700, fontSize: 6.5, marginBottom: 1 }}>GENERAL SURVEY</div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 6 }}>
                      <CheckItem checked={fi.awake_and_alert}>Awake and alert</CheckItem>
                      <CheckItem checked={fi.altered_sensorium}>Altered sensorium</CheckItem>
                    </div>
                  </SectionBox>

                  {/* A–H Systems */}
                  {[
                    { title: 'A. HEENT', items: [
                      ['heent_essentially_normal', 'Essentially Normal'],
                      ['heent_abnormal_papillary', 'Abnormal Papillary Reaction'],
                      ['heent_cervical_lymphadenopathy', 'Cervical Lymphadenopathy'],
                      ['heent_dry_mucus_membrane', 'Dry Mucus Membrane'],
                      ['heent_icteric_sclerae', 'Icteric Sclerae'],
                      ['heent_pale_conjunctiva', 'Pale Conjunctiva'],
                      ['heent_sunken_eyeball', 'Sunken Eyeball'],
                      ['heent_sunken_fontanelle', 'Sunken Fontanelle'],
                    ], otherKey: 'heent_others' },
                    { title: 'B. Chest / Breast / Lungs', items: [
                      ['chest_essentially_normal', 'Essentially Normal'],
                      ['chest_asymmetrical_expansion', 'Asymmetrical Chest Expansion'],
                      ['chest_decreased_breath_sound', 'Decreased Breath Sounds'],
                      ['chest_wheeze', 'Wheezes'],
                      ['chest_crackle_rales', 'Crackles/Rales'],
                      ['chest_retractions', 'Retractions'],
                      ['chest_lumps_over_breast', 'Lumos Over Breast'],
                    ], otherKey: 'chest_other' },
                    { title: 'C. Heart', items: [
                      ['heart_essentially_normal', 'Essentially Normal'],
                      ['heart_displaced_apex_beat', 'Displaced Apex Beat'],
                      ['heart_heave_trills', 'Heave/Trills'],
                      ['heart_irregular_rhythm', 'Irregular Heart Rhythm'],
                      ['heart_muffled_sounds', 'Muffled Heart Sounds'],
                      ['heart_murmurs', 'Murmurs'],
                      ['heart_pericardial_bulge', 'Pericardial Bulge'],
                    ], otherKey: 'heart_others' },
                    { title: 'D. Abdomen', items: [
                      ['abdomen_essentially_normal', 'Essentially Normal'],
                      ['abdomen_rigidity', 'Abdominal Rigidity'],
                      ['abdomen_tenderness', 'Abdominal Tenderness'],
                      ['abdomen_hyperactive_bowel', 'Hyperactive Bowel Sounds'],
                      ['abdomen_palpable_masses', 'Palpable Masses'],
                      ['abdomen_tympanitic_dull', 'Tympanitic/Dull Abdomen'],
                      ['abdomen_uterine_contraction', 'Uterine Contraction'],
                    ], otherKey: 'abdomen_others' },
                    { title: 'E. Genitourinary', items: [
                      ['gu_essentially_normal', 'Essentially Normal'],
                      ['gu_blood_stained_internal_exam', 'Blood Stained in Internal Exam'],
                      ['gu_cervical_dilation', 'Cervical Dilation'],
                      ['gu_abnormal_discharge', 'Presence of Abnormal Discharge'],
                    ], otherKey: 'gu_others' },
                    { title: 'F. Digital Rectal Examination', items: [
                      ['dre_crackle_rales', 'Crackle / Rales'],
                      ['dre_enlarge_prostate', 'Enlarge Prostate'],
                      ['dre_mass', 'Mass'],
                      ['dre_hemorrhoids', 'Hemorrhoids'],
                      ['dre_pus', 'Pus'],
                      ['dre_not_applicable', 'Not Applicable'],
                    ], otherKey: 'dre_others' },
                    { title: 'G. Skin / Extremities', items: [
                      ['skin_essentially_normal', 'Essentially Normal'],
                      ['skin_clubbing', 'Clubbing'],
                      ['skin_cold_clammy', 'Cold Clammy'],
                      ['skin_cyanosis_mottled', 'Cyanosis/Mottled Skin'],
                      ['skin_edema_swelling', 'Edema/Swelling'],
                      ['skin_decreased_mobility', 'Decreased Mobility'],
                      ['skin_pale_nailbeds', 'Pale Nailbeds'],
                      ['skin_weak_pulses', 'Weak Pulses'],
                    ], otherKey: 'skin_others' },
                    { title: 'H. Neurological Examination', items: [
                      ['neuro_essentially_normal', 'Essentially Normal'],
                      ['neuro_abnormal_gait', 'Abnormal Gait'],
                      ['neuro_abnormal_position_sense', 'Abnormal Position Sense'],
                      ['neuro_abnormal_sensation', 'Abnormal Sensation'],
                      ['neuro_abnormal_reflexes', 'Abnormal Reflex/es'],
                      ['neuro_poor_altered_memory', 'Poor/Altered Memory'],
                      ['neuro_poor_muscle_tone', 'Poor Muscle Tone/Strength'],
                      ['neuro_poor_coordination', 'Poor Coordination'],
                    ], otherKey: 'neuro_others' },
                  ].map(section => (
                    <SectionBox key={section.title}>
                      <div style={{ fontWeight: 700, fontSize: 6, marginBottom: 1 }}>{section.title}</div>
                      <TwoCol>
                        {section.items.map(([key, label]) => (
                          <CheckItem key={key} checked={!!fi[key]}>{label}</CheckItem>
                        ))}
                      </TwoCol>
                      {fi[section.otherKey] && (
                        <div style={{ fontSize: 6, marginTop: 1 }}>Others: <span style={{ borderBottom: '1px solid #555' }}>{fi[section.otherKey]}</span></div>
                      )}
                    </SectionBox>
                  ))}

                  {/* First Patient Encounter Assessment */}
                  <SectionBox>
                    <div style={{ fontWeight: 700, fontSize: 6.5, marginBottom: 2 }}>FIRST PATIENT ENCOUNTER ASSESSMENT:</div>
                    {[
                      ['encounter_generally_well', 'GENERALLY WELL', '(fill out and sign eKAS)'],
                      ['encounter_primary_care_consult', 'FOR PRIMARY CARE CONSULTATION', '(fill out KONSULTA Referral Slip)'],
                      ['encounter_diagnostic_exam', 'FOR DIAGNOSTIC EXAMINATION', '(fill out Diagnostic Request Form)'],
                    ].map(([key, label, note]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 6, marginBottom: 1 }}>
                        <CB checked={!!fi[key]} />
                        <span style={{ fontWeight: 700 }}>{label}</span>
                        <span style={{ color: '#555', fontStyle: 'italic', fontSize: 5.5 }}>{note}</span>
                      </div>
                    ))}
                  </SectionBox>
                </div>

                {/* ── NCD + Signature + Slip ── */}
                <div style={{ overflow: 'hidden' }}>

                  {/* NCD High-Risk Assessment */}
                  <div style={{ border: '2px solid #1a6b2e', padding: '2px 3px', marginBottom: 2 }}>
                    <div style={{ fontWeight: 900, fontSize: 6.5, color: '#1a6b2e', textAlign: 'center', marginBottom: 2 }}>
                      NCD HIGH-RISK ASSESSMENT<br />(FOR 20 YRS OLD AND ABOVE)
                    </div>

                    {[
                      ['eats_processed_food_weekly', '1. Eats processed food (ex. Instant Noodles, Burgers, Fries, Fried Chicken Sign, etc) and ihaw-ihaw Weekly?'],
                      ['eats_fruits_vegetables_daily', '2. Eats 3 servings of fruits and vegetable Daily?'],
                      ['does_physical_activity_weekly', '3. Does at least 2.5 hours of moderate-intensity physical activity every week?'],
                    ].map(([key, q]) => (
                      <div key={key} style={{ marginBottom: 3, fontSize: 6 }}>
                        <div style={{ marginBottom: 1, lineHeight: 1.3 }}>{q}</div>
                        <div style={{ display: 'flex', gap: 12, marginLeft: 6 }}>
                          <CheckItem checked={nd[key] === true}>Yes</CheckItem>
                          <CheckItem checked={nd[key] === false}>No</CheckItem>
                        </div>
                      </div>
                    ))}

                    <div style={{ marginBottom: 3, fontSize: 6 }}>
                      <div style={{ marginBottom: 1 }}>4. Was patient diagnosed as having Diabetes?</div>
                      <div style={{ display: 'flex', gap: 6, marginLeft: 6, marginBottom: 1, flexWrap: 'wrap', fontSize: 5.5 }}>
                        <CheckItem checked={nd.diagnosed_with_diabetes}>Yes</CheckItem>
                        <CheckItem checked={nd.diabetes_do_not_know}>No / "Do not know"</CheckItem>
                      </div>
                      <div style={{ fontSize: 5.5, marginLeft: 6 }}>
                        If YES: <CB checked={nd.diabetes_with_medication} />With Medication &nbsp;<CB checked={nd.diabetes_without_medication} />Without Medication
                      </div>
                    </div>

                    <div style={{ marginBottom: 3, fontSize: 6 }}>
                      <div style={{ marginBottom: 1 }}>5. Does the patient have any of the following symptoms?</div>
                      <div style={{ display: 'flex', gap: 6, marginLeft: 6, fontSize: 5.5 }}>
                        <CheckItem checked={nd.symptom_polyphagia}>Polyphagia</CheckItem>
                        <CheckItem checked={nd.symptom_polydipsia}>Polydipsia</CheckItem>
                        <CheckItem checked={nd.symptom_polyuria}>Polyuria</CheckItem>
                      </div>
                    </div>

                    {/* Lab Values */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, fontSize: 5.5, marginBottom: 3 }}>
                      {[
                        ['FBS/RBS:', nd.fbs_rbs_value, nd.fbs_rbs_date],
                        ['Total Cholesterol:', nd.total_cholesterol_value, nd.total_cholesterol_date],
                        ['Urine Ketone:', nd.urine_ketone_value, nd.urine_ketone_date],
                        ['Urine Protein:', nd.urine_protein_value, nd.urine_protein_date],
                      ].map(([lbl, val, dt]) => (
                        <div key={String(lbl)}>
                          <Row label={String(lbl)} value={v(val)} />
                          <Row label="Date taken:" value={v(dt)} />
                        </div>
                      ))}
                    </div>

                    {/* Angina */}
                    <div style={{ fontWeight: 700, fontSize: 6, marginBottom: 1 }}>
                      Angina or Heart Attack &nbsp;<CB checked={nd.angina_yes} />Yes &nbsp;<CB checked={nd.angina_no} />No
                    </div>
                    <div style={{ fontSize: 5.5 }}>
                      {[
                        ['angina_has_chest_pain',          '1. Have had any pain/discomfort pressure/heaviness in your chest? (Nakakaramdam ka ba ng pananakit o bigat sa iyong dibdib?)'],
                        ['angina_center_left_chest',        '2. Do you get the pain in the center/left chest or left arm? (Ang sakit ba ay nasa gitna ng dibdib, sa kaliwang bahagi ng dibdib o sa kaliwang braso?)'],
                        ['angina_on_walking',               '3. Do you get it when you walk uphill or hurry? (Nararamdaman mo ba ito kung ikaw ay nagmamadali o naglalakad nang mabilis o paahon?)'],
                        ['angina_slows_down_walking',       '4. Do you slowdown if you get the pain while walking? (Tumitigil ka ba sa paglalakad kapag sumasakit ang iyong dibdib?)'],
                        ['angina_pain_goes_away_standing',  '5. Does the pain go away if you stand still or get medication? (Nawawala ba yung sakit sa dibdib kapag ikaw ay tumitigil o umiinom ng gamot sa ilalim ng dila?)'],
                        ['angina_pain_gone_10_minutes',     '6. Does the pain go away in <10 minutes? (Nawawala ba ang sakit sa loob ng 10 minuto?)'],
                        ['angina_severe_30min_or_more',     '7. Have you ever had severe chest pain lasting half an hour or more? (Nakaramdam ka na ba ng pananakit ng dibdib na tumatagal ng kalahating oras o higit pa?)'],
                      ].map(([key, q]) => (
                        <div key={key} style={{ marginBottom: 2 }}>
                          <div style={{ lineHeight: 1.3, marginBottom: 0.5 }}>{q}</div>
                          <div style={{ display: 'flex', gap: 10, marginLeft: 6 }}>
                            <CheckItem checked={nd[key] === true}>Yes</CheckItem>
                            <CheckItem checked={nd[key] === false}>No</CheckItem>
                          </div>
                        </div>
                      ))}
                      <div style={{ fontSize: 5, fontStyle: 'italic', marginBottom: 2 }}>
                        * If YES to number 3, 4 &amp; 5 or 7, the patient have ANGINA/HEART ATTACK, must see a doctor.
                      </div>
                    </div>

                    {/* Stroke */}
                    <div style={{ fontWeight: 700, fontSize: 6, marginBottom: 1 }}>Stroke and TIA</div>
                    <div style={{ fontSize: 5.5, marginBottom: 1, lineHeight: 1.3 }}>
                      8. Have you ever had difficulty in talking, weakness of arms or legs on the one side of the body? (Nakaraman ka ma ba ng ano man sa mga sumusunod: pagkautal, panghihina ng braso o binti, o pamamanhid ng kalahati ng katawan?)
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginLeft: 6, marginBottom: 2, fontSize: 5.5 }}>
                      <CheckItem checked={nd.stroke_tia_difficulty_talking === true}>Yes</CheckItem>
                      <CheckItem checked={nd.stroke_tia_difficulty_talking === false}>No</CheckItem>
                    </div>
                    <div style={{ fontSize: 5, fontStyle: 'italic', marginBottom: 3 }}>
                      * If YES to number 8, you may have TIA/Stroke, must seek a doctor.
                    </div>

                    {/* Risk Level */}
                    <div style={{ border: '1px solid #333', padding: 2 }}>
                      <div style={{ fontWeight: 700, fontSize: 6, marginBottom: 1 }}>RISK LEVEL</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 5.5 }}>
                        {['<10%', '10% to <20%', '20% to <30%', '30% to <40%', '>40%'].map(r => (
                          <CheckItem key={r} checked={nd.risk_level === r}>{r}</CheckItem>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* First Patient Encounter Signature */}
                  <div style={{ border: '1px solid #333', padding: '2px 3px', marginBottom: 2 }}>
                    <div style={{ fontWeight: 700, fontSize: 6.5, marginBottom: 2 }}>FIRST PATIENT ENCOUNTER</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      {['SIGNATURE', 'NAME', 'POSITION', 'DATE'].map(lbl => (
                        <div key={lbl}>
                          <div style={{ borderBottom: '1px solid #333', height: 12, marginBottom: 1 }} />
                          <div style={{ fontSize: 5, color: '#555' }}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PhilHealth Konsulta Slip */}
                  <div style={{ border: '2px solid #333', padding: '2px 3px', fontSize: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 6.5, textAlign: 'center', marginBottom: 2 }}>
                      PHILHEALTH KONSULTA REGISTRATION CONFIRMATION SLIP
                    </div>
                    <Row label="FULL NAME:" value={`${v(patient.last_name)}, ${v(patient.first_name)} ${v(patient.middle_name)}`} />
                    <Row label="PIN:" value={v(patient.philhealth_pin)} />
                    <Row label="PROVIDER:" value={v(fp.provider)} />
                    <Row label="ADDRESS:" value={[v(patient.purok), v(patient.barangay), v(patient.municipality)].filter(Boolean).join(', ')} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginTop: 2 }}>
                      <div style={{ border: '1px solid #333', padding: 2, fontSize: 5.5 }}>
                        <div style={{ fontWeight: 700, marginBottom: 1 }}>AUTHORIZATION TRANSACTION CODE</div>
                        <Row label="AT CODE:" value={v(kr.at_code)} />
                        <Row label="DATE OF APPOINTMENT:" value={v(kr.date_of_appointment)} />
                      </div>
                      <div style={{ border: '1px solid #333', padding: 2, fontSize: 5.5 }}>
                        <div style={{ fontWeight: 700, marginBottom: 1 }}>CONSULTATION ENCODING</div>
                        <Row label="RISK LEVEL:" value={v(nd.risk_level)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, marginTop: 3 }}>
                      {['FULL NAME', 'PROVIDER', 'ADDRESS', 'PIN'].map(lbl => (
                        <div key={lbl}>
                          <div style={{ borderBottom: '1px solid #333', height: 10, marginBottom: 1 }} />
                          <div style={{ fontSize: 5, color: '#555' }}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Vertical auth strip on far right ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 14 }}>
                {[
                  ['AUTHORIZED PERSONNEL', 1],
                  ['AUTHORIZATION TRANSACTION CODE', 1],
                  ['DATE OF APPOINTMENT', 0.5],
                  ['PHILHEALTH KONSULTA REGISTRATION CONFIRMATION SLIP · PIN · FULL NAME · PROVIDER · ADDRESS', 1],
                ].map(([text, flexVal]) => (
                  <div key={String(text)} style={{
                    writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                    border: '1px solid #333', fontSize: 5.5, fontWeight: 700,
                    padding: 2, textAlign: 'center', whiteSpace: 'nowrap',
                    background: '#f5f5f5', minWidth: 14, flex: Number(flexVal),
                  }}>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
