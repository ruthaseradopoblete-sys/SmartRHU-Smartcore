'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PatientInfo({
  patient,
  onClose,
  visitDate,
  onBack,
}: {
  patient: any
  onClose: () => void
  visitDate?: string  // format: 'YYYY-MM-DD' — if provided, loads data for that specific visit date
  onBack?: () => void // optional — if provided, shows a Back to Visits button in toolbar
}) {
  const [data, setData]       = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const pid = patient.id

      // ── Find ALL patient IDs with the same name (handles duplicate patient records) ──
      let allPids: string[] = [pid]
      if (patient.last_name && patient.first_name) {
        const { data: dupes } = await supabase
          .from('patients')
          .select('id')
          .ilike('last_name', (patient.last_name || '').trim())
          .ilike('first_name', (patient.first_name || '').trim())
        if (dupes && dupes.length > 0) {
          allPids = dupes.map((d: any) => d.id)
        }
      }

      // ── Helper: fetch from a table trying all patient IDs until data is found ──
      // If visitDate is provided, filters to records created on that date.
      // Falls back to most recent record if no match found for that date.
      const fetchFirst = async (table: string) => {
        // Pass 1: try to find a record matching the specific visit date
        if (visitDate) {
          const startOfDay = `${visitDate}T00:00:00`
          const endOfDay   = `${visitDate}T23:59:59`

          for (const id of allPids) {
            const { data: row } = await supabase
              .from(table)
              .select('*')
              .eq('patient_id', id)
              .gte('created_at', startOfDay)
              .lte('created_at', endOfDay)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (row) return row
          }

          // Also try PH local time (UTC+8) in case of timezone offset
          const phStart = new Date(`${visitDate}T00:00:00+08:00`).toISOString()
          const phEnd   = new Date(`${visitDate}T23:59:59+08:00`).toISOString()

          for (const id of allPids) {
            const { data: row } = await supabase
              .from(table)
              .select('*')
              .eq('patient_id', id)
              .gte('created_at', phStart)
              .lte('created_at', phEnd)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (row) return row
          }
        }

        // Pass 2: fall back to most recent record (original behavior)
        for (const id of allPids) {
          const { data: row } = await supabase
            .from(table)
            .select('*')
            .eq('patient_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (row) return row
        }
        return null
      }

      // ── Fetch all related tables in parallel ──
      const [kr, pmh, fh, psh, fp, mh, preg, imm, pef, pedia, pfps, ncd] = await Promise.all([
        fetchFirst('konsulta_registrations'),
        fetchFirst('past_medical_history'),
        fetchFirst('family_history'),
        fetchFirst('personal_social_history'),
        fetchFirst('family_planning'),
        fetchFirst('menstrual_history'),
        fetchFirst('pregnancy_history'),
        fetchFirst('immunization_history'),
        fetchFirst('physical_exam_findings'),
        fetchFirst('pedia_measurements'),
        fetchFirst('pertinent_findings_per_system'),
        fetchFirst('ncd_high_risk_assessment'),
      ])

      setData({
        konsulta: kr,   pastMed: pmh,  famHist: fh,
        social:   psh,  fp:      fp,   menstrual: mh,
        preg:     preg, immun:   imm,  physical:  pef,
        pedia:    pedia, findings: pfps, ncd:     ncd,
      })
      setLoading(false)
    }
    load()
  }, [patient.id, visitDate])

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
    .pa {
      width: 1404px;
      height: 918px;
      min-height: 918px;
      max-height: 918px;
      aspect-ratio: 330 / 216;
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
      /* ─── RESPONSIVE (screen only — hindi apektado ang print/PDF) ─── */
    /* Discrete fallbacks para sa lumang browser na walang length-division sa calc */
    @media screen and (max-width: 1200px) { .pa { zoom: 0.82; } }
    @media screen and (max-width: 820px)  { .pa { zoom: 0.55; } }
    @media screen and (max-width: 520px)  { .pa { zoom: 0.34; } }
    /* Fluid scale — kasya ang fixed 1404px form sa kahit anong viewport (modern browsers) */
    @media screen and (max-width: 1430px) {
      .pa { zoom: min(1, calc((100vw - 28px) / 1404px)); }
    }
    /* Hayaang mag-wrap ang toolbar sa maliliit na phone */
    @media screen and (max-width: 560px) {
      .no-print { flex-wrap: wrap; row-gap: 6px; }
    }
@media print {
      @page { size: 330mm 216mm; margin: 0; }   /* long bondpaper landscape: 13in × 8.5in */
      html, body { margin:0 !important; padding:0 !important; background:#fff !important; height:auto !important; }
      .no-print { display:none !important; }

      /* Itago LAHAT ng nasa page... */
      body * { visibility: hidden !important; }
      /* ...tapos ipakita LANG ang form (.pa) at lahat ng nasa loob nito */
      .pa, .pa * { visibility: visible !important; }

      /* Ituon ang form sa kaliwang-itaas, alisin ang modal overlay/scroll */
      .print-root {
        position: static !important;
        inset: auto !important;
        background: transparent !important;
        padding: 0 !important;
        overflow: visible !important;
        display: block !important;
      }
      .pa {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
       width: 330mm !important;
        height: 216mm !important;
        min-height: 216mm !important;
        max-height: 216mm !important;
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

const FS_HEADER:     React.CSSProperties = { fontSize:'7pt'   }
const FS_SUBHEADER:  React.CSSProperties = { fontSize:'7pt'   }
const FS_PATIENT:    React.CSSProperties = { fontSize:'5.5pt' }
const FS_PMH:        React.CSSProperties = { fontSize:'6.8pt' }
const FS_FH:         React.CSSProperties = { fontSize:'6.8pt' }
const FS_SOCIAL:     React.CSSProperties = { fontSize:'5.5pt' }
const FS_IMMUN:      React.CSSProperties = { fontSize:'6.5pt' }
const FS_FP:         React.CSSProperties = { fontSize:'6.5pt' }
const FS_MENSTRUAL:  React.CSSProperties = { fontSize:'6.5pt' }
const FS_PREGNANCY:  React.CSSProperties = { fontSize:'5.5pt' }
const FS_PHYSICAL:   React.CSSProperties = { fontSize:'5.9pt' }
const FS_PEDIA:      React.CSSProperties = { fontSize:'5.8pt' }
const FS_SYSTEMS:    React.CSSProperties = { fontSize:'7.8pt' }   // GENERAL SURVEY (col 2 top)
const FS_ENCOUNTER:  React.CSSProperties = { fontSize:'6.5pt' }
const FS_NCD:        React.CSSProperties = { fontSize:'7.6pt' }
// ── Per-box font size for each system A–H (change any one independently) ──
const FS_HEENT:      React.CSSProperties = { fontSize:'7.5pt' }   // A. HEENT
const FS_CHEST:      React.CSSProperties = { fontSize:'7.5pt' }   // B. Chest/Breast/Lungs
const FS_HEART:      React.CSSProperties = { fontSize:'7.5pt' }   // C. Heart
const FS_ABDOMEN:    React.CSSProperties = { fontSize:'7.5pt' }   // D. Abdomen
const FS_GU:         React.CSSProperties = { fontSize:'7.5pt' }   // E. Genitourinary
const FS_DRE:        React.CSSProperties = { fontSize:'7.5pt' }   // F. Digital Rectal Examination
const FS_SKIN:       React.CSSProperties = { fontSize:'7.5pt' }   // G. Skin/Extremities
const FS_NEURO:      React.CSSProperties = { fontSize:'7.5pt' }   // H. Neurological Examination
// order matches the SYSTEMS array (A→H)
// order matches the SYSTEMS array (A→H)
const SYS_FS: React.CSSProperties[] = [
  FS_HEENT, FS_CHEST, FS_HEART, FS_ABDOMEN, FS_GU, FS_DRE, FS_SKIN, FS_NEURO,
]
// ── Per-box font size for the CHECKBOX ITEMS of each system A–H (separate from title) ──
const FS_HEENT_ITEM:   React.CSSProperties = { fontSize:'7.6pt' }   // A. HEENT items
const FS_CHEST_ITEM:   React.CSSProperties = { fontSize:'7.6pt' }   // B. Chest/Breast/Lungs items
const FS_HEART_ITEM:   React.CSSProperties = { fontSize:'7.6pt' }   // C. Heart items
const FS_ABDOMEN_ITEM: React.CSSProperties = { fontSize:'7.6pt' }   // D. Abdomen items
const FS_GU_ITEM:      React.CSSProperties = { fontSize:'7.6pt' }   // E. Genitourinary items
const FS_DRE_ITEM:     React.CSSProperties = { fontSize:'7.6pt' }   // F. Digital Rectal Examination items
const FS_SKIN_ITEM:    React.CSSProperties = { fontSize:'7.6pt' }   // G. Skin/Extremities items
const FS_NEURO_ITEM:   React.CSSProperties = { fontSize:'7.6pt' }   // H. Neurological Examination items
// order matches the SYSTEMS array (A→H)
const SYS_ITEM_FS: React.CSSProperties[] = [
  FS_HEENT_ITEM, FS_CHEST_ITEM, FS_HEART_ITEM, FS_ABDOMEN_ITEM, FS_GU_ITEM, FS_DRE_ITEM, FS_SKIN_ITEM, FS_NEURO_ITEM,
]
const FS:   React.CSSProperties = FS_PATIENT
const FS5:  React.CSSProperties = FS_PATIENT
const FS6:  React.CSSProperties = FS_SUBHEADER
const FS7:  React.CSSProperties = FS_HEADER
const BASE: React.CSSProperties = { fontFamily:'Arial, Helvetica, sans-serif', ...FS_PATIENT }

  return (
    <div className="print-root" style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:3000,padding:12,overflowY:'auto' }}>
      <style>{printCSS}</style>
      <div style={{ ...BASE, background:'#fff', width:'100%', maxWidth:1400, borderRadius:4 }}>

        {/* Toolbar */}
        <div className="no-print" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 14px',borderBottom:'2px solid #1a5c2e',background:'#f0faf2' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:'Arial',fontWeight:700,color:'#1a5c2e',fontSize:13 }}>
              PAHS Form 5 — Konsulta Health Assessment Tool v5
            </span>
            {/* Show which visit date is being viewed */}
            {visitDate && (
              <span style={{ fontFamily:'Arial', fontSize:11, color:'#024d11', fontWeight:700, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, padding:'2px 10px' }}>
                Visit: {new Date(visitDate + 'T00:00:00').toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}
              </span>
            )}
          </div>
          <div style={{ display:'flex',gap:8 }}>
            {onBack && (
              <button onClick={onBack} style={{ fontFamily:'Arial',background:'#025c1e',color:'#fff',border:'none',padding:'5px 14px',borderRadius:4,fontWeight:700,cursor:'pointer',fontSize:12 }}>← Back to Visits</button>
            )}
            <button onClick={()=>window.print()} style={{ fontFamily:'Arial',background:'#1a5c2e',color:'#fff',border:'none',padding:'5px 14px',borderRadius:4,fontWeight:700,cursor:'pointer',fontSize:12 }}>Print</button>
<button
  onClick={async () => {
    const { default: html2pdf } = await import('html2pdf.js')
    const el = document.querySelector('.pa') as HTMLElement
    if (!el) return
    const name = [patient.last_name, patient.first_name].filter(Boolean).join('_') || 'patient'
    const date = visitDate || new Date().toISOString().slice(0,10)

    // I-render muna ang element sa canvas, tapos i-fit sa buong long bondpaper page
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      windowWidth: 1404,
      width: 1404,
      height: 918,
    })

    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit:'mm', format:[330,216], orientation:'landscape' })
    const pw = pdf.internal.pageSize.getWidth()   // 330
    const ph = pdf.internal.pageSize.getHeight()  // 216
    const img = canvas.toDataURL('image/jpeg', 0.98)
    pdf.addImage(img, 'JPEG', 0, 0, pw, ph)        // i-fill ang BUONG page (0,0 → full width/height)
    pdf.save(`PAHS_Form5_${name}_${date}.pdf`)
  }}
  style={{ fontFamily:'Arial',background:'#016801',color:'#fff',border:'none',padding:'5px 14px',borderRadius:4,fontWeight:700,cursor:'pointer',fontSize:12 }}
>
  ⬇ Download
</button>
<button onClick={onClose} style={{ fontFamily:'Arial',background:'#7f1d1d',color:'#fff',border:'none',padding:'5px 14px',borderRadius:4,fontWeight:700,cursor:'pointer',fontSize:12 }}>Close</button>
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
          {/* grid changed: 1fr (col1) | 2.7fr (PE + NCD wrapper) | 95px (vertical strips) */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2.7fr 95px', gap:'0 5px', flex:1, minHeight:0 }}>

            {/* ══════════ COLUMN 1 ══════════ */}
            <div style={{ display:'flex', flexDirection:'column', borderRight:'1.5px solid #1a5c2e', paddingRight:5 }}>

              {/* Patient Info */}
              <Box>
                <div style={{ display:'flex', gap:2, alignItems:'flex-end', marginBottom:1, ...FS_PATIENT }}>
                  <span style={{ fontWeight:700, whiteSpace:'nowrap' }}>FULL NAME</span>
                  {[['LAST',patient.last_name],['FIRST',patient.first_name],['MIDDLE',patient.middle_name]].map(([l,val])=>(
                    <div key={String(l)} style={{ flex:1 }}>
                      <div style={{ borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(String(val??''))}</div>
                      <div style={{ ...FS_PATIENT, color:'#555', textAlign:'center' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:3, alignItems:'center', marginBottom:1, ...FS_PATIENT }}>
                  <b>AGE</b>
                  <span style={{ borderBottom:'0.6px solid #000', minWidth:16, paddingBottom:0.3 }}>{v(patient.age)}</span>
                  <b>SEX</b>
                  <CB on={patient.sex==='F'}/><span>F</span>
                  <CB on={patient.sex==='M'}/><span>M</span>
                  <b>BIRTHDATE</b>
                  <span style={{ borderBottom:'0.6px solid #000', minWidth:46, paddingBottom:0.3 }}>{v(patient.birthdate)}</span>
                  <span style={{ ...FS_PATIENT, color:'#555' }}>(MM/DD/YYYY)</span>
                </div>
                <div style={{ display:'flex', gap:2, alignItems:'flex-end', marginBottom:1, ...FS_PATIENT }}>
                  <b>ADDRESS</b>
                  <div style={{ flex:0.5 }}>
                    <div style={{ borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(patient.purok)}</div>
                    <div style={{ ...FS_PATIENT, color:'#555' }}>PUROK</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(patient.barangay)}</div>
                    <div style={{ ...FS_PATIENT, color:'#555' }}>BARANGAY</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(patient.municipality)}</div>
                    <div style={{ ...FS_PATIENT, color:'#555' }}>MUNICIPALITY</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:3, alignItems:'flex-end', marginBottom:1, ...FS_PATIENT }}>
                  <b>CONTACT #</b>
                  <span style={{ borderBottom:'0.6px solid #000', minWidth:55, paddingBottom:0.3 }}>{v(patient.contact_number)}</span>
                  <b>E-MAIL</b>
                  <span style={{ flex:1, borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(patient.email)}</span>
                </div>
                <div style={{ display:'flex', gap:3, alignItems:'flex-end', marginBottom:1, ...FS_PATIENT }}>
                  <b>PHILHEALTH PIN</b>
                  <span style={{ borderBottom:'0.6px solid #000', minWidth:65, paddingBottom:0.3 }}>{v(patient.philhealth_pin)}</span>
                </div>
                <div style={{ display:'flex', gap:3, alignItems:'center', marginBottom:1, ...FS_PATIENT }}>
                  <b>MEMBER TYPE</b>
                  <CB on={patient.member_type==='Member'}/><span>MEMBER</span>
                  <CB on={patient.member_type==='Dependent'}/><span>DEPENDENT</span>
                  <span>Specify:</span>
                  <span style={{ borderBottom:'0.6px solid #000', flex:1, paddingBottom:0.3 }}>{v(patient.member_type_specify)}</span>
                </div>
                <div style={{ borderTop:'1px solid #1a5c2e', marginTop:1, paddingTop:1 }}>
                  <div style={{ display:'flex', gap:3, alignItems:'center', marginBottom:1, ...FS_PATIENT }}>
                    <b>KONSULTA REGISTRATION</b>
                    <span>Registration Date:</span>
                    <span style={{ borderBottom:'0.6px solid #000', minWidth:42, paddingBottom:0.3 }}>{v(kr.registration_date)}</span>
                    <span style={{ ...FS_PATIENT }}>(MM/DD/YYYY)</span>
                    <b>KPP SIGN</b><CB on={kr.kkp_sign}/>
                  </div>
                  <div style={{ fontWeight:700, ...FS_PATIENT, marginBottom:0.5 }}>PREFERRED FACILITY AND ADDRESS</div>
                  {[['CHOICE 1:',kr.facility_choice_1,kr.facility_kkp_1],
                    ['CHOICE 2:',kr.facility_choice_2,kr.facility_kkp_2],
                    ['CHOICE 3:',kr.facility_choice_3,kr.facility_kkp_3]].map(([l,val,kkp])=>(
                    <div key={String(l)} style={{ display:'flex', gap:2, alignItems:'flex-end', marginBottom:0.8, ...FS_PATIENT }}>
                      <span style={{ minWidth:38, flexShrink:0 }}>{l}</span>
                      <span style={{ flex:1, borderBottom:'0.6px solid #000', paddingBottom:0.3 }}>{v(String(val??''))}</span>
                      <CB on={!!kkp}/>
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:2, alignItems:'flex-end', ...FS_PATIENT }}>
                    <b>AUTHORIZATION TRANSACTION</b>
                    <CB on={!!kr.at_code}/><span>AT CODE:</span>
                    <span style={{ borderBottom:'0.6px solid #000', minWidth:36, paddingBottom:0.3 }}>{v(kr.at_code)}</span>
                    <span>Date of Appt:</span>
                    <span style={{ borderBottom:'0.6px solid #000', minWidth:36, paddingBottom:0.3 }}>{v(kr.date_of_appointment)}</span>
                    <span>If no ATC,</span><CB on={kr.face_capture}/><span>Face Capture</span>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:2 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ borderBottom:'0.6px solid #000', width:100, marginBottom:0.5 }}/>
                    <div style={{ ...FS_PATIENT }}>MEMBER / GUARDIAN'S SIGNATURE</div>
                  </div>
                </div>
              </Box>

              <GH>HEALTH ASSESSMENT TOOL</GH>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 3px', flex:1 }}>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <Box>
                    <BT>PAST MEDICAL HISTORY</BT>
                    {DISEASES.map(d=>(
                      <Chk key={'pm_'+d.k} on={!!pm[d.k]}>
                        <span style={FS_PMH}>{d.l}{d.sp&&d.sp(pm)?<span> (<span style={{ borderBottom:'0.6px solid #000', display:'inline-block', minWidth:20 }}>{d.sp(pm)}</span>)</span>:null}</span>
                      </Chk>
                    ))}
                    <div style={{ marginTop:7 }}>
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
                          <span style={FS_FH}>{label}{sp?<span> (<span style={{ borderBottom:'0.6px solid #000', display:'inline-block', minWidth:20 }}>{sp}</span>)</span>:null}</span>
                        </Chk>
                      )
                    })}
                  </Box>
                  <Box style={{ flex:1 }}>
                    <BT>Personal / Social History</BT>
                    {([
                      ['Smoking',        so.smoking,        'No. of pack-years:',   so.smoking_packs_per_year],
                      ['Alcohol',        so.alcohol,        'No. of servings/day:', so.alcohol_servings_day],
                      ['Illicit Drugs',  so.illicit_drugs,  null,null],
                      ['Sexually Active',so.sexually_active,null,null],
                    ] as [string,string,string|null,any][]).map(([lbl,val,subLbl,subVal])=>(
                      <div key={lbl} style={{ marginBottom:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4, ...FS_SOCIAL }}>
                          <span style={{ minWidth:44, flexShrink:0 }}>{lbl}</span>
                          {['Yes','No','Quit'].map(o=>(
                            <span key={o} style={{ display:'flex', alignItems:'center', gap:1, marginRight:1 }}>
                              <CB on={val===o}/>{o}
                            </span>
                          ))}
                        </div>
                        {subLbl&&(
                          <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginLeft:4, ...FS_SOCIAL }}>
                            <span>{subLbl}</span>
                            <span style={{ borderBottom:'0.6px solid #000', minWidth:20, paddingBottom:0.3 }}>{v(subVal)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </Box>
                </div>

                <div>
                  <Box>
                    <BT>IMMUNIZATION</BT>
                    <div style={{ fontWeight:700, ...FS_IMMUN, marginBottom:0.5 }}>Children</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0 2px' }}>
                      {[['ECG',null],['OPV1',im.opv1],['OPV2',im.opv2],['OPV3',im.opv3],
                        ['DPT1',im.dpt1],['DPT2',im.dpt2],['DPT3',im.dpt3],
                        ['Hepa1',im.hapa1],['Hepa2',im.hapa2],['Hepa3',im.hapa3],
                        ['Measles',im.measles],['Varicella',im.varicella],['BCG',im.bcg],
                      ].map(([l,val])=>(
                        <Chk key={String(l)} on={!!val}><span style={FS_IMMUN}>{l}</span></Chk>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, ...FS_IMMUN, marginTop:1, marginBottom:0.5 }}>Adult</div>
                    <div style={{ display:'flex', gap:6 }}>
                      {[['HPV',im.hpv],['MMR',im.mmr],['None',im.none_adult]].map(([l,val])=>(
                        <Chk key={String(l)} on={!!val}><span style={FS_IMMUN}>{l}</span></Chk>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, ...FS_IMMUN, marginTop:1, marginBottom:0.5 }}>Elderly and Immunocompromised</div>
                    <Chk on={!!im.pneumococcal_vaccine}><span style={FS_IMMUN}>Pneumococcal Vaccine</span></Chk>
                    <Chk on={!!im.flu_vaccine}><span style={FS_IMMUN}>Flu Vaccine</span></Chk>
                    <R lbl="Others:" val={v(im.others)}/>
                  </Box>
                  <Box>
                    <BT>FAMILY PLANNING</BT>
                    <Chk on={fp.has_fp_counseling}><span style={FS_FP}>With access to family planning counseling</span></Chk>
                    <R lbl="Provider:" val={v(fp.provider)}/>
                    <R lbl="Birth Control Method used:" val={v(fp.birth_control_method)}/>
                  </Box>
                  <Box>
                    <BT>MENSTRUAL HISTORY</BT>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginBottom:0.8, ...FS_MENSTRUAL }}>
                      <span>Menarche:</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.menarche_age??''}</span>
                      <span>yrs old</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginBottom:0.8, ...FS_MENSTRUAL }}>
                      <span>Onset of sexual intercourse</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.onset_sexual_intercourse_age??''}</span>
                      <span>yrs old</span>
                    </div>
                    <R lbl="Last Menstrual Period:"/>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginBottom:0.8, ...FS_MENSTRUAL }}>
                      <span>Period Duration:</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.period_duration_days??''}</span>
                      <span>days</span>
                    </div>
                    <R lbl="No. of pads/day:" val={v(mh.pads_per_day)}/>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, marginBottom:0.8, ...FS_MENSTRUAL }}>
                      <span>Interval cycle:</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.interval_cycle_days??''}</span>
                      <span>days</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:3, marginBottom:0.8, ...FS_MENSTRUAL }}>
                      <span>Menopause:</span>
                      <CB on={mh.menopause===true}/><span>Yes</span>
                      <CB on={mh.menopause===false}/><span>No</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:2, ...FS_MENSTRUAL }}>
                      <span>Age at Menopause:</span>
                      <span style={{ borderBottom:'0.6px solid #000', minWidth:14 }}>{mh.age_at_menopause??''}</span>
                      <span>years</span>
                    </div>
                  </Box>
                  <Box>
                    <BT>PREGNANCY HISTORY</BT>
                    <div style={{ display:'flex', gap:2, alignItems:'flex-end', flexWrap:'wrap', marginBottom:0.8, ...FS_PREGNANCY }}>
                      {[['G',pr.gravida],['P',pr.para],['(T',pr.term],['P',pr.preterm],['A',pr.abortion],['L',pr.living]].map(([l,val],i)=>(
                        <span key={i} style={{ display:'flex', alignItems:'flex-end', gap:1 }}>
                          <b>{l}</b>
                          <span style={{ borderBottom:'0.6px solid #000', minWidth:10, paddingBottom:0.3 }}>{v(String(val??''))}</span>
                        </span>
                      ))}
                      <b>)</b>
                    </div>
                    <R lbl="Type of Delivery:" val={v(pr.type_of_delivery)}/>
                    <div style={{ display:'flex', alignItems:'center', gap:2, ...FS_PREGNANCY }}>
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
                        <div key={l} style={{ display:'flex', alignItems:'flex-end', gap:1.5, marginBottom:0.8, ...FS_PHYSICAL }}>
                          <span style={{ whiteSpace:'nowrap', flexShrink:0 }}>{l}</span>
                          <span style={{ flex:1, borderBottom:'0.6px solid #000' }}>{val}</span>
                          <span style={{ whiteSpace:'nowrap', flexShrink:0 }}>{u}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ ...FS_PHYSICAL, marginBottom:0.8 }}>
                      Blood Type:&nbsp;
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=>(
                        <span key={t} style={{ marginRight:2 }}><CB on={ph.blood_type===t}/>{t}</span>
                      ))}
                    </div>
                    <div style={{ ...FS_PHYSICAL }}>
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
                      <div key={String(l)} style={{ display:'flex', alignItems:'flex-end', gap:1.5, marginBottom:0.8, ...FS_PEDIA }}>
                        <span style={{ minWidth:78, flexShrink:0 }}>{l}</span>
                        <span style={{ flex:1, borderBottom:'0.6px solid #000' }}>{v(String(val??''))}</span>
                        <span>cm</span>
                      </div>
                    ))}
                  </Box>
                </div>
              </div>
            </div>

            {/* ══════════ WRAPPER: PE FINDINGS (col 2) + NCD (col 3) ══════════ */}
            {/* flex-column: top = PE + NCD side by side, bottom = FIRST PATIENT ENCOUNTER spanning both */}
            <div style={{ display:'flex', flexDirection:'column', minWidth:0 }}>

              {/* ── TOP: PE findings (left) + NCD assessment (right) ── */}
              <div style={{ display:'flex', gap:5, flex:1, minHeight:0 }}>

                {/* ───── PE FINDINGS (former COLUMN 2) ───── */}
                <div style={{ flex:1.1, borderRight:'1.5px solid #1a5c2e', paddingRight:5, minWidth:0 }}>
                  <GH>PERTINENT FINDINGS PER SYSTEM — PHYSICAL EXAMINATION</GH>
                  <Box>
                    <div style={{ fontWeight:900, ...FS_SYSTEMS, lineHeight:2.5, marginBottom:6 }}>GENERAL SURVEY</div>
                    <div style={{ display:'flex', gap:20, marginBottom:6 }}>
                      <Chk on={fi.awake_and_alert}><span style={FS_SYSTEMS}>Awake and alert</span></Chk>
                      <Chk on={fi.altered_sensorium}><span style={FS_SYSTEMS}>Altered sensorium</span></Chk>
                    </div>
                  </Box>
                  <div style={{ display:'grid', gridTemplateColumns:'5fr 5fr', gap:'4px' }}>
                    {SYSTEMS.map((sys,si)=>{
                      const sysFS = SYS_FS[si] || FS_SYSTEMS
                      const itemFS = SYS_ITEM_FS[si] || FS5
                      return (
                      <Box key={sys.title}>
                        <div style={{ fontWeight:1000, ...sysFS, lineHeight:2, marginBottom:8 }}>{sys.title}</div>
                        {sys.items.map(([k,l])=>(
                      <Chk key={k} on={!!fi[k]}><span style={{ ...itemFS }}>{l}</span></Chk>
                    ))}
                        {fi[sys.ok]&&<R lbl="Others:" val={String(fi[sys.ok])}/>}
                      </Box>
                      )
                    })}
                  </div>
                  <Box>
                    <div style={{ fontWeight:900, ...FS_SYSTEMS, lineHeight:2.5, marginBottom:6 }}>FIRST PATIENT ENCOUNTER ASSESSMENT:</div>
                    {[
                      ['encounter_generally_well',      'GENERALLY WELL',               '(fill out and sign eKAS)'],
                      ['encounter_primary_care_consult', 'FOR PRIMARY CARE CONSULTATION','(fill out KONSULTA Referral Slip)'],
                      ['encounter_diagnostic_exam',      'FOR DIAGNOSTIC EXAMINATION',   '(fill out Diagnostic Request Form)'],
                    ].map(([k,lbl,note])=>(
                      <div key={k} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:7, ...FS_ENCOUNTER }}>
                        <CB on={!!fi[k]}/><b>{lbl}</b>
                        <i style={{ color:'#555', fontSize:'7pt' }}>{note}</i>
                      </div>
                    ))}
                  </Box>
                </div>

                {/* ───── NCD ASSESSMENT (former COLUMN 3 left part) ───── */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ border:'1px solid #000', padding:'3px 3px', marginBottom:2 }}>
                    <div style={{ fontWeight:1000, textAlign:'center', ...FS6, marginBottom:10, textDecoration:'underline' }}>
                      NCD HIGH-RISK ASSESSMENT<br/>(FOR 20 YRS OLD AND ABOVE)
                    </div>
                    {[
                      ['eats_processed_food_weekly',   '1. Eats processed food (ex. Instant Noodles, Burgers, Fries, Fried Chicken Sign, etc) and ihaw-ihaw Weekly?'],
                      ['eats_fruits_vegetables_daily', '2. Eats 3 servings of fruits and vegetable Daily?'],
                      ['does_physical_activity_weekly','3. Does at least 2.5 hours of moderate-intensity physical activity every week?'],
                    ].map(([k,q])=>(
                      <div key={k} style={{ marginBottom:2 }}>
                        <div style={{ ...FS_NCD, lineHeight:1.5, marginBottom:1 }}>{q}</div>
                        <div style={{ display:'flex', gap:10, marginLeft:4 }}>
                          <Chk on={nd[k]===true}><span style={FS_NCD}>Yes</span></Chk>
                          <Chk on={nd[k]===false}><span style={FS_NCD}>No</span></Chk>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginBottom:6 }}>
                      <div style={{ ...FS_NCD, lineHeight:1.5, marginBottom:5 }}>4. Was patient diagnosed as having Diabetes?</div>
                      <div style={{ display:'flex', gap:6, marginLeft:4 }}>
                        <Chk on={nd.diagnosed_with_diabetes}><span style={FS_NCD}>Yes</span></Chk>
                        <Chk on={nd.diabetes_do_not_know}><span style={FS_NCD}>No / "Do not know"</span></Chk>
                      </div>
                      <div style={{ marginLeft:6, ...FS_NCD }}>
                        If YES:&nbsp;<CB on={nd.diabetes_with_medication}/>With Medication &nbsp;
                        <CB on={nd.diabetes_without_medication}/>Without Medication
                      </div>
                    </div>
                    <div style={{ marginBottom:6 }}>
                      <div style={{ ...FS_NCD, lineHeight:1.5, marginBottom:5 }}>5. Does the patient have any of the following symptoms?</div>
                      <div style={{ display:'flex', gap:8, marginLeft:4 }}>
                        <Chk on={nd.symptom_polyphagia}><span style={FS_NCD}>Polyphagia</span></Chk>
                        <Chk on={nd.symptom_polydipsia}><span style={FS_NCD}>Polydipsia</span></Chk>
                        <Chk on={nd.symptom_polyuria}><span style={FS_NCD}>Polyuria</span></Chk>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'4fr 4fr', gap:'0 3px', marginBottom:5 }}>
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
                    <div style={{ fontWeight:900, ...FS_NCD, marginBottom:5 }}>
                      Angina or Heart Attack &nbsp;<CB on={nd.angina_yes}/>Yes &nbsp;<CB on={nd.angina_no}/>No
                    </div>
                    {[
                      ['angina_has_chest_pain',        '1. Have had any pain/discomfort pressure/heaviness in your chest?'],
                      ['angina_center_left_chest',      '2. Do you get the pain in the center/left chest or left arm?'],
                      ['angina_on_walking',             '3. Do you get it when you walk uphill or hurry?'],
                      ['angina_slows_down_walking',     '4. Do you slowdown if you get the pain while walking?'],
                      ['angina_pain_goes_away_standing','5. Does the pain go away if you stand still or if you get medication?'],
                      ['angina_pain_gone_10_minutes',   '6. Does the pain go away in <10 minutes?'],
                      ['angina_severe_30min_or_more',   '7. Have you ever had severe chest pain lasting half an hour or more?'],
                    ].map(([k,q])=>(
                      <div key={k} style={{ marginBottom:7 }}>
                        <div style={{ ...FS_NCD, lineHeight:1.5, marginBottom:0.3 }}>{q}</div>
                        <div style={{ display:'flex', gap:8, marginLeft:4 }}>
                          <Chk on={nd[k]===true}><span style={FS_NCD}>Yes</span></Chk>
                          <Chk on={nd[k]===false}><span style={FS_NCD}>No</span></Chk>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontWeight:900, ...FS_NCD, lineHeight:1.5, marginBottom:5 }}>Stroke and TIA</div>
                    <div style={{ ...FS_NCD, lineHeight:2.5, marginBottom:5 }}>
                      8. Have you ever had difficulty in talking, weakness of arms or legs on one side of the body?
                    </div>
                    <div style={{ display:'flex', gap:10, marginLeft:4, marginBottom:8 }}>
                      <Chk on={nd.stroke_tia_difficulty_talking===true}><span style={FS_NCD}>Yes</span></Chk>
                      <Chk on={nd.stroke_tia_difficulty_talking===false}><span style={FS_NCD}>No</span></Chk>
                    </div>
                    <div style={{ border:'0.6px solid #000', padding:'2px 3px' }}>
                      <div style={{ fontWeight:900, ...FS_NCD, lineHeight:1.5, marginBottom:5 }}>RISK LEVEL</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                        {['<10%','10% to <20%','20% to <30%','30% to <40%','>40%'].map(r=>(
                          <Chk key={r} on={nd.risk_level===r}><span style={FS_NCD}>{r}</span></Chk>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── BOTTOM: Province seal square (left) + FIRST PATIENT ENCOUNTER (right) ── */}
              <div style={{ marginTop:5, display:'flex', gap:5, alignItems:'stretch' }}>

                {/* LEFT: Province seal square logo */}
                <div style={{
                  width: 140,
                  height:140,
                  border: '1px solid #000',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: 2,
                  background: '#fff',
                  flexShrink: 0
                }}>
                  <img
                    src="/logo.jpg"
                    alt=""
                    style={{ width: 40, height: 31, objectFit: 'contain', marginBottom: 5 }}
                  />
                  <div style={{
                    fontSize: '7pt',
                    lineHeight: 1.5,
                    fontFamily: 'Arial Narrow, Arial, sans-serif',
                    color: '#000',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5
                  }}>
                    <div>Province of Quezon</div>
                    <div style={{ fontWeight: 'bold', fontSize: '6pt' }}>PROVINCE-WIDE</div>
                    <div style={{ fontWeight: 'bold', fontSize: '5.8pt' }}>HEALTH SYSTEM</div>
                    <div style={{ marginTop: 1, fontSize: '5pt', fontWeight: 'bold' }}>
                      PWHS FORM 5: KONSULTA
                    </div>
                    <div style={{ fontSize: '4.8pt', fontWeight: 'bold' }}>
                      HEALTH ASSESSMENT TOOL
                    </div>
                    <div style={{ fontSize: '4pt', fontStyle: 'italic' }}>
                      version 5
                    </div>
                  </div>
                </div>

                {/* RIGHT: FIRST PATIENT ENCOUNTER — extends to end of NCD */}
                <div style={{ flex:1, border:'1px solid #000', padding:'3px 5px', display:'flex', flexDirection:'column', minWidth:0 }}>
                  <div style={{ fontWeight:900, fontSize:'6.5pt', marginBottom:1 }}>FIRST PATIENT ENCOUNTER</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px', flex:1 }}>
                    {['SIGNATURE','NAME','POSITION','DATE'].map(l=>(
                      <div key={l} style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                        <div style={{ borderBottom:'0.6px solid #000', minHeight:14, marginBottom:0.5 }}/>
                        <div style={{ fontSize:'6pt', fontWeight:'bold', color:'#000' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* ══════════ FAR-RIGHT VERTICAL STRIPS (3rd grid column = 95px) ══════════ */}
            <div style={{
              width: 95,
              borderLeft: '1.8px dashed #000',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              fontSize: '6pt',
              fontFamily: 'Arial Narrow, Arial, sans-serif',
              letterSpacing: '0.2pt',
              overflow: 'hidden',
              background: '#fff',
              color: '#000'
            }}>

              {/* SECTION 1: AUTHORIZATION TRANSACTION CODE */}
              <div style={{
                flex: 1,
                display: 'flex',
                writingMode: 'vertical-lr',
                transform: 'rotate(180deg)',
                padding: '10px 8px',
                gap: 6
              }}>

                {/* LEFT: RegLogo — rotate lang ang img, wala nang wrapper changes */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <img
                    src="/RegLogo.png"
                    alt=""
                    style={{ width: 40, height: 'auto', objectFit: 'contain', transform: 'rotate(90deg)' }}
                  />
                </div>

                {/* MIDDLE: Main Content Area — exactly same as Doc 3 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>

                  <div style={{ borderBottom: '0.5px solid #000', minHeight: 12, marginBottom: 2 }}>
                    {v(kr.at_code)}
                  </div>

                  {/* DATE OF APPOINTMENT */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                    <b style={{ whiteSpace: 'nowrap' }}>DATE OF APPOINTMENT:</b>
                    <span style={{ borderBottom: '0.5px solid #000', flex: 1, minHeight: 10 }}>{v(kr.date_of_appointment)}</span>
                  </div>

                  <div style={{
                    fontWeight: 1000,
                    textTransform: 'uppercase',
                    fontSize: '5.8pt',
                    borderTop: '0.6px solid #000',
                    paddingTop: 4,
                    marginTop: 2,
                    lineHeight: 1.1,
                    letterSpacing: '0.4pt'
                  }}>
                    AUTHORIZATION TRANSACTION CODE
                  </div>

                  {/* Logo circle */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      border: '1px solid #ccc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#fafafa'
                    }}>
                      <img src="/logo.jpg" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    </div>
                  </div>
                </div>

                {/* RIGHT: AUTHORIZED PERSONNEL — exactly same as Doc 3 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingLeft: 10,
                  gap: 4
                }}>
                  <b style={{ fontSize: '7pt', textAlign: 'center', lineHeight: 1.2 }}>AUTHORIZED<br/>PERSONNEL</b>
                </div>
              </div>

              {/* HORIZONTAL DIVIDER */}
              <div style={{ borderBottom: '1.2px solid #000', width: '100%' }} />

              {/* SECTION 2: REGISTRATION CONFIRMATION */}
              <div style={{
                flex: 1.3,
                display: 'flex',
                writingMode: 'vertical-lr',
                transform: 'rotate(180deg)',
                padding: '10px 8px',
                gap: 6
              }}>

                {/* LEFT: RegLogo — rotate lang ang img, wala nang wrapper changes */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <img
                    src="/RegLogo.png"
                    alt=""
                    style={{ width: 40, height: 'auto', objectFit: 'contain', transform: 'rotate(90deg)' }}
                  />
                </div>

                {/* MIDDLE: Main Content Area — exactly same as Doc 3 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>

                  {/* ADDRESS */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                    <b style={{ whiteSpace: 'nowrap' }}>ADDRESS:</b>
                    <span style={{ borderBottom: '0.5px solid #000', flex: 1, minHeight: 10 }}>{v(patient.barangay)}</span>
                  </div>

                  {/* PROVIDER */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                    <b style={{ whiteSpace: 'nowrap' }}>PROVIDER:</b>
                    <span style={{ borderBottom: '0.5px solid #000', flex: 1, minHeight: 10 }}>{v(kr.facility_choice_1)}</span>
                  </div>

                  {/* NAME & PIN */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flex: 2, gap: 3 }}>
                      <b style={{ whiteSpace: 'nowrap' }}>FULL NAME:</b>
                      <span style={{ borderBottom: '0.5px solid #000', flex: 1, minHeight: 10 }}>
                        {[v(patient.last_name), v(patient.first_name)].filter(Boolean).join(', ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flex: 1.2, gap: 3 }}>
                      <b style={{ whiteSpace: 'nowrap' }}>PIN:</b>
                      <span style={{ borderBottom: '0.5px solid #000', flex: 1, minHeight: 10 }}>{v(patient.philhealth_pin)}</span>
                    </div>
                  </div>

                  <div style={{
                    fontWeight: 1000,
                    textTransform: 'uppercase',
                    fontSize: '5.8pt',
                    borderTop: '0.6px solid #000',
                    paddingTop: 4,
                    marginTop: 2,
                    lineHeight: 1.1,
                    letterSpacing: '0.4pt'
                  }}>
                    PHILHEALTH KONSULTA REGISTRATION CONFIRMATION SLIP
                  </div>

                  {/* Logo circle */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      border: '1px solid #ccc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#fafafa'
                    }}>
                      <img src="/logo.jpg" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    </div>
                  </div>
                </div>

                {/* RIGHT: AUTHORIZED PERSONNEL — exactly same as Doc 3 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingLeft: 10,
                  gap: 4
                }}>
                  <b style={{ fontSize: '7pt', textAlign: 'center', lineHeight: 1.2 }}>AUTHORIZED<br/>PERSONNEL</b>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  )
}