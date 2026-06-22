'use client'
import React from 'react'

const PRINT_CSS = `
  @media print {
    @page { size: 105mm 148.5mm; margin: 0; }
    body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .lrf-no-print   { display: none !important; }
.lrf-print-only {
      display: block !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 105mm !important;
      height: 148.5mm !important;
      z-index: 99999 !important;
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
    }
    .lrf-form {
      width: 105mm !important;
      height: 148.5mm !important;
      max-height: 148.5mm !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 4mm 5mm !important;
    }
  }
`

function CB({ checked }) {
  return (
    <div style={{ width:8, height:8, border:'1px solid #000', borderRadius:1, flexShrink:0, display:'inline-flex', alignItems:'center', justifyContent:'center', background: checked ? '#000' : '#fff' }}>
      {checked && <span style={{ color:'#fff', fontSize:6, fontWeight:900, lineHeight:1 }}>✓</span>}
    </div>
  )
}

function Row({ label, checked }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
      <CB checked={!!checked}/>
      <span style={{ fontSize:9 }}>{label}</span>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:0.2, marginBottom:2, marginTop:4 }}>{children}</div>
  )
}

function FormBody({ name, age, gender, civil, address, date, tests }) {
  const B = '1px solid #000'
  return (
    <div className="lrf-form" style={{
      width:'115mm', height:'155mm', maxHeight:'148.5mm',
      background:'#fff', padding:'4mm 5mm',
      boxSizing:'border-box', fontFamily:'Nunito, sans-serif', overflow:'hidden',
      color:'#000', opacity:1, filter:'none',
    }}>

      {/* Header — matches PrintLabForms */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4, gap:0 }}>
        <img src="/logo.jpg" alt="logo"
          style={{ width:45, height:45, objectFit:'contain', flexShrink:0 }}
          onError={e=>{ e.target.style.display='none' }}/>
        <div style={{ textAlign:'center', lineHeight:1.5, padding:'0 8px' }}>
          <div style={{ fontSize:7.5 }}>Republic of the Philippines</div>
          <div style={{ fontSize:7.5 }}>Department of Health</div>
          <div style={{ fontSize:7.5 }}>Lopez, Quezon</div>
          <div style={{ fontSize:7.5 }}>Municipal Health Office</div>
          <div style={{ fontSize:9, fontWeight:900, letterSpacing:0.3 }}>LABORATORY DEPARTMENT</div>
        </div>
        <img src="/logo.jpg" alt="seal"
          style={{ width:45, height:45, objectFit:'contain', flexShrink:0 }}
          onError={e=>{ e.target.style.display='none' }}/>
      </div>

      <div style={{ borderTop:B, marginBottom:4 }}/>

      {/* Patient info */}
      <div style={{ fontSize:9, marginBottom:3 }}>
        <div style={{ display:'flex', alignItems:'flex-end', gap:3, marginBottom:3 }}>
          <span style={{ fontWeight:700, minWidth:28, flexShrink:0 }}>Name:</span>
          <span style={{ flex:1, borderBottom:B, paddingBottom:1, paddingLeft:2, minHeight:11 }}>{name}</span>
          <span style={{ fontWeight:700, marginLeft:6, flexShrink:0 }}>Date:</span>
          <span style={{ borderBottom:B, minWidth:70, paddingLeft:2, minHeight:11 }}>{date}</span>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:4, marginBottom:3 }}>
          <span style={{ fontWeight:700, flexShrink:0 }}>Age:</span>
          <span style={{ borderBottom:B, minWidth:22, paddingLeft:2, minHeight:11 }}>{age}</span>
          <span style={{ fontWeight:700, marginLeft:4, flexShrink:0 }}>Gender:</span>
          <span style={{ borderBottom:B, minWidth:28, paddingLeft:2, minHeight:11 }}>{gender}</span>
          <span style={{ fontWeight:700, marginLeft:4, flexShrink:0 }}>Civil Status:</span>
          <span style={{ borderBottom:B, flex:1, paddingLeft:2, minHeight:11 }}>{civil}</span>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:3 }}>
          <span style={{ fontWeight:700, minWidth:36, flexShrink:0 }}>Address:</span>
          <span style={{ flex:1, borderBottom:B, paddingBottom:1, paddingLeft:2, minHeight:11 }}>{address}</span>
        </div>
      </div>

      <div style={{ borderTop:B, margin:'3px 0' }}/>

      {/* Rx + two columns */}
      <div style={{ display:'flex', gap:0 }}>

        {/* Rx symbol */}
        <div style={{ width:22, flexShrink:0, paddingTop:1 }}>
          <div style={{ fontSize:18, fontWeight:900, lineHeight:1 }}>R</div>
          <div style={{ fontSize:10, fontWeight:900, marginLeft:9, marginTop:-3 }}>x</div>
        </div>

        {/* Left column */}
        <div style={{ flex:1,fontSize:9, paddingRight:5, borderRight:B }}>
          <SectionTitle>Hematology</SectionTitle>
          <Row label="Hgb/Hct"                checked={tests.hgb_hct}/>
          <Row label="CBC with Platelet Count" checked={tests.cbc_with_platelet}/>
          <Row label="PT, PTT"/>

          <SectionTitle>Blood Chemistry</SectionTitle>
          <Row label="Random Blood Sugar"  checked={tests.random_blood_sugar}/>
          <Row label="Fasting Blood Sugar" checked={tests.fasting_blood_sugar}/>
          <Row label="Cholesterol"         checked={tests.cholesterol}/>
          <Row label="Triglycerides"       checked={tests.triglycerides}/>
          <Row label="Lipid Profile"       checked={tests.lipid_profile}/>
          <Row label="Blood Uric Acid"     checked={tests.blood_uric_acid}/>
          <Row label="BUN"/>
          <Row label="Creatinine"/>
          <Row label="SGPT (ALT)"/>
          <Row label="SGOT (AST)"/>
          <Row label="Serum Na, K, CI"/>

          <div style={{ marginTop:5, fontSize:9, fontStyle:'italic', color:'#000', lineHeight:1.4 }}>
            Fasting: 8-10 hours no food/water<br/>
            *Last meal: 10:30PM – 12AM*
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex:1, paddingLeft:5 }}>
          <SectionTitle>Microscopy / Parasitology</SectionTitle>
          <Row label="Urinalysis"     checked={tests.urinalysis}/>
          <Row label="Fecalysis"      checked={tests.fecalysis}/>
          <Row label="Pregnancy Test" checked={tests.pregnancy_test}/>

          <SectionTitle>Serology</SectionTitle>
          <Row label="ABO, Rh Blood Typing" checked={tests.abo_rh_blood_typing}/>
          <Row label="Dengue NS1"           checked={tests.dengue_ns1}/>
          <Row label="Dengue IgG, IgM"      checked={tests.dengue_igg_igm}/>
          <Row label="Typhidot IgG/IgM"/>
          <Row label="HbsAg"                checked={tests.hbsag}/>
          <Row label="12 Lead ECG"/>
          <Row label="Gene Xpert"           checked={tests.gene_xpert}/>

          <SectionTitle>Microbiology</SectionTitle>
          <Row label="AFB/DSSM"                checked={tests.afb_dssm}/>
          <Row label="Culture and Sensitivity" checked={tests.culture_and_sensitivity}/>

          <SectionTitle>Others</SectionTitle>
          <div style={{ fontSize:9 }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:3, marginBottom:3 }}>
              <span style={{ minWidth:44, flexShrink:0 }}>Ultrasound:</span>
              <span style={{ flex:1, borderBottom:B, minHeight:10 }}/>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:3, marginBottom:3 }}>
              <span style={{ minWidth:44, flexShrink:0 }}>X-ray:</span>
              <span style={{ flex:1, borderBottom:B, minHeight:10 }}/>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:3 }}>
              <span style={{ minWidth:44, flexShrink:0 }}>Others:</span>
              <span style={{ flex:1, borderBottom:B, minHeight:10 }}/>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:B, marginTop:6, paddingTop:4, textAlign:'center' }}>
        <div style={{ height:14 }}/>
        <div style={{ fontWeight:900, fontSize:9 }}>PAOLO GAYLORD S. VILLAFAÑE, MD, FPPS</div>
        <div style={{ fontSize:7 }}>Municipal Health Officer</div>
        <div style={{ fontSize:7 }}>Lic No. 89594</div>
      </div>

    </div>
  )
}

export default function NotAvailable({ patient = {}, onClose }) {
  const handlePrint = () => window.print()

  const name    = patient.name    || ''
  const age     = patient.age     || ''
  const gender  = patient.gender  || ''
  const civil   = patient.civil   || ''
  const address = patient.address || ''
  const date    = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
  const tests   = patient.tests   || {}

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* SCREEN: overlay */}
      <div className="lrf-no-print" style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:3000, padding:16,
      }}>

        {/* Modal container */}
        <div style={{
          background:'#fff', borderRadius:16, overflow:'hidden',
          boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
          display:'flex', flexDirection:'column',
          maxHeight:'95vh', minWidth:480,
          opacity:1, filter:'none',
        }}>

          {/* Green header bar — hindi mapiprint */}
          <div className="lrf-no-print" style={{
            background:'linear-gradient(135deg,#064e3b,#15803d)',
            padding:'14px 20px',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            flexShrink:0,
          }}>
            <div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:13 }}>Laboratory Request Form</div>
              <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11, marginTop:2 }}>
                {name} — {date}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handlePrint} style={{
                background:'rgba(255,255,255,0.18)', color:'#fff',
                border:'1px solid rgba(255,255,255,0.3)', borderRadius:8,
                padding:'7px 18px', fontWeight:800, fontSize:12, cursor:'pointer',
                display:'flex', alignItems:'center', gap:6,
                transition:'background 0.15s',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.28)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.18)'}
              >
                🖨 Print
              </button>
              <button onClick={e=>{ e.stopPropagation(); onClose() }} style={{
                background:'rgba(255,255,255,0.18)', color:'#fff',
                border:'1px solid rgba(255,255,255,0.3)', borderRadius:8,
                padding:'7px 14px', fontWeight:800, fontSize:12, cursor:'pointer',
                transition:'background 0.15s',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(220,38,38,0.5)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.18)'}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Form preview */}
          <div style={{ overflowY:'auto', flex:1, display:'flex', justifyContent:'center', padding:'20px 0', background:'#f3f4f6', opacity:1, filter:'none' }}>
            <FormBody name={name} age={age} gender={gender} civil={civil} address={address} date={date} tests={tests}/>
          </div>

        </div>
      </div>

      {/* PRINT ONLY */}
      <div className="lrf-print-only" style={{ display:'none' }}>
        <FormBody name={name} age={age} gender={gender} civil={civil} address={address} date={date} tests={tests}/>
      </div>
    </>
  )
}