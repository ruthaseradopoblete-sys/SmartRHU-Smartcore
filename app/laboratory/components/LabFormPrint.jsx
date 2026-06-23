'use client'
import React from 'react'

const PRINT_CSS = `
  @media print {
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; }
    .lab-form {
      width: 210mm;
      height: 148.5mm;
      max-height: 148.5mm;
      overflow: hidden;
      page-break-after: always;
      box-sizing: border-box;
    }
  }
`

// ── Header: logo LEFT, center text, logo RIGHT — exactly like the physical forms ──
function FormHeader({ title, name='', address='', reqPhysician='', date='', age='', sex='', note='' }) {
  return (
    <div>
      {note && (
        <div style={{ fontSize:8, fontStyle:'italic', marginBottom:6, color:'#444' }}>{note}</div>
      )}
      {/* Top: logo | facility text | logo */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10, gap:0 }}>
        {/* Left logo — tight next to center text */}
        <img src="/logo.jpg" alt="logo"
          style={{ width:56, height:56, objectFit:'contain', flexShrink:0 }}
          onError={e => { e.target.style.display='none' }}/>

        {/* Center facility — matches image exactly */}
        <div style={{ textAlign:'center', lineHeight:1.6, padding:'0 14px' }}>
          <div style={{ fontSize:9 }}>Republic of the Philippines</div>
          <div style={{ fontSize:9 }}>Department of Health</div>
          <div style={{ fontSize:9 }}>Lopez, Quezon</div>
          <div style={{ fontSize:9 }}>Municipal Health Office</div>
          <div style={{ fontSize:11, fontWeight:900, letterSpacing:0.3 }}>LABORATORY DEPARTMENT</div>
        </div>

        {/* Right logo — tight next to center text */}
        <img src="/logo.jpg" alt="seal"
          style={{ width:56, height:56, objectFit:'contain', flexShrink:0 }}
          onError={e => { e.target.style.display='none' }}/>
      </div>

      {/* Patient info: Name/Address/ReqPhys left | Date/Age/Sex right */}
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:10 }}>
        {/* Left: patient fields */}
        <div style={{ flex:1, paddingRight:30 }}>
          <div style={{ display:'flex', alignItems:'flex-end', marginBottom:4 }}>
            <span style={{ minWidth:90, fontWeight:600 }}>Name</span>
            <span style={{ flex:1, borderBottom:'1px solid #000', paddingBottom:1, paddingLeft:4 }}>{name}</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', marginBottom:4 }}>
            <span style={{ minWidth:90, fontWeight:600 }}>Address</span>
            <span style={{ flex:1, borderBottom:'1px solid #000', paddingBottom:1, paddingLeft:4 }}>{address}</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end' }}>
            <span style={{ minWidth:90, fontWeight:600 }}>Req. Physician</span>
            <span style={{ flex:1, borderBottom:'1px solid #000', paddingBottom:1, paddingLeft:4 }}>{reqPhysician}</span>
          </div>
        </div>

        {/* Right: date/age/sex */}
        <div style={{ minWidth:160 }}>
          <div style={{ display:'flex', alignItems:'flex-end', marginBottom:4 }}>
            <span style={{ minWidth:35, fontWeight:600 }}>Date</span>
            <span style={{ flex:1, borderBottom:'1px solid #000', paddingBottom:1, paddingLeft:4 }}>{date}</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', marginBottom:4 }}>
            <span style={{ minWidth:35, fontWeight:600 }}>Age</span>
            <span style={{ flex:1, borderBottom:'1px solid #000', paddingBottom:1, paddingLeft:4 }}>{age}</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end' }}>
            <span style={{ minWidth:35, fontWeight:600 }}>Sex</span>
            <span style={{ flex:1, borderBottom:'1px solid #000', paddingBottom:1, paddingLeft:4 }}>{sex}</span>
          </div>
        </div>
      </div>

      {/* Form title */}
      <div style={{ textAlign:'center', fontWeight:900, fontSize:15, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
        {title}
      </div>
    </div>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function FormFooter({ medtech='', medtechLic='', mho='', mhoLic='' }) {
  const medtechName  = medtech  || 'SHEKINAH GLARE O. DEGALA, RMT'
  const medtechLicNo = medtechLic || 'Lic. No. 0102571'
  const mhoName      = mho      || 'PAOLO GAYLORD S. VILLAFAÑE, MD, FPPS'
  const mhoLicNo     = mhoLic   || 'Lic. No. 89594'

  return (
    <div style={{ marginTop:30, fontSize:9, display:'flex', justifyContent:'center', gap:80, alignItems:'flex-end' }}>
      {/* Medical Technologist — left of center */}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontWeight:700, fontSize:10 }}>{medtechName}</div>
        <div>Medical Technologist</div>
        <div>{medtechLicNo}</div>
      </div>
      {/* Municipal Health Officer — right of center */}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontWeight:700, fontSize:10 }}>{mhoName}</div>
        <div>Municipal Health Officer</div>
        <div>{mhoLicNo}</div>
      </div>
    </div>
  )
}

// ── Table helpers ───────────────────────────────────────────────────────────────
const B = '1px solid #000'
const cs = { border:B, padding:'5px 8px', fontSize:10 }
const TH = ({ children, style={} }) => <th style={{ ...cs, fontWeight:700, textAlign:'center', background:'#fff', ...style }}>{children}</th>
const TD = ({ children, style={} }) => <td style={{ ...cs, ...style }}>{children}</td>

// ── Wrapper ────────────────────────────────────────────────────────────────────
const Wrap = ({ children }) => (
  <div className="lab-form" style={{ width:'210mm', minHeight:'148.5mm', maxHeight:'148.5mm', margin:'0 auto', fontFamily:'Arial, sans-serif', background:'#fff', padding:'10mm 12mm', boxSizing:'border-box', overflow:'hidden' }}>
    <style>{PRINT_CSS}</style>
    {children}
  </div>
)

// ══════════════════════════════════════════════════════════════════════════════
// 1. CLINICAL CHEMISTRY — exact match to physical form
// ══════════════════════════════════════════════════════════════════════════════
export function PrintClinicalChemistry({ data={}, medtech='', medtechLic='', mho='', mhoLic='' }) {
  // shared cell style — no outer border on individual cells, outer border on wrapper
  const h = { padding:'5px 8px', fontSize:10, fontWeight:700, textAlign:'center', borderBottom:B }
  const c = { padding:'6px 8px', fontSize:10, textAlign:'center', borderBottom:B }

  return (
    <Wrap>
      <FormHeader title="Clinical Chemistry"
        name={data.name} address={data.address} reqPhysician={data.reqPhysician}
        date={data.date} age={data.age} sex={data.sex}/>

      {/* One outer border containing both sub-tables side by side */}
      <table style={{ width:'100%', borderCollapse:'collapse', border:B, fontSize:10 }}>
        <thead>
          <tr>
            {/* Left side headers */}
            <th style={{ ...h, borderRight:B, width:'14%' }}>TEST</th>
            <th style={{ ...h, borderRight:B, width:'12%' }}>RESULT</th>
            <th style={{ ...h, borderRight:'2px solid #000', width:'18%' }}>NORMAL VALUES</th>
            {/* Right side headers — LIPID PROFILE */}
            <th style={{ ...h, borderRight:B, width:'18%' }}>
              TEST<br/>
              <span style={{ fontWeight:400, fontSize:8, fontStyle:'italic' }}>LIPID PROFILE</span>
            </th>
            <th style={{ ...h, borderRight:B, width:'12%' }}>RESULT</th>
            <th style={{ ...h, width:'18%' }}>NORMAL VALUES</th>
          </tr>
        </thead>
        <tbody>
          {/* Row 1: RBS | Total Cholesterol */}
          <tr>
            <td style={{ ...c, borderRight:B, fontWeight:700 }}>RBS</td>
            <td style={{ ...c, borderRight:B }}>
              <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:36, marginRight:3 }}>{data.rbs||''}</span>
              <span style={{ fontSize:9 }}>mg/dL</span>
            </td>
            <td style={{ ...c, borderRight:'2px solid #000', fontSize:9 }}>&lt;160 mg/dL</td>
            <td style={{ ...c, borderRight:B, fontWeight:700, textAlign:'left', paddingLeft:8 }}>Total Cholesterol</td>
            <td style={{ ...c, borderRight:B }}>
              <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:36, marginRight:3 }}>{data.totalCholesterol||''}</span>
              <span style={{ fontSize:9 }}>mg/dL</span>
            </td>
            <td style={{ ...c, fontSize:9 }}>&lt;200mg/dL</td>
          </tr>
          {/* Row 2: FBS | Triglycerides */}
          <tr>
            <td style={{ ...c, borderRight:B, fontWeight:700 }}>FBS</td>
            <td style={{ ...c, borderRight:B }}>
              <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:36, marginRight:3 }}>{data.fbs||''}</span>
              <span style={{ fontSize:9 }}>mg/dL</span>
            </td>
            <td style={{ ...c, borderRight:'2px solid #000', fontSize:9 }}>70-105 mg/dL</td>
            <td style={{ ...c, borderRight:B, fontWeight:700, textAlign:'left', paddingLeft:8 }}>Triglycerides</td>
            <td style={{ ...c, borderRight:B }}>
              <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:36, marginRight:3 }}>{data.triglycerides||''}</span>
              <span style={{ fontSize:9 }}>mg/dL</span>
            </td>
            <td style={{ ...c, fontSize:9 }}>&lt; 150mg/dL</td>
          </tr>
          {/* Row 3: URIC ACID | HDL */}
          <tr>
            <td style={{ ...c, borderRight:B, fontWeight:700 }}>URIC ACID</td>
            <td style={{ ...c, borderRight:B }}>
              <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:36, marginRight:3 }}>{data.uricAcid||''}</span>
              <span style={{ fontSize:9 }}>mg/dL</span>
            </td>
            <td style={{ ...c, borderRight:'2px solid #000', fontSize:8, lineHeight:1.5 }}>
              M: 3.5 - 7.7 mg/dL<br/>F: 2.0 - 6.0 mgdL
            </td>
            <td style={{ ...c, borderRight:B, fontWeight:700, textAlign:'left', paddingLeft:8 }}>HDL</td>
            <td style={{ ...c, borderRight:B }}>
              <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:36, marginRight:3 }}>{data.hdl||''}</span>
              <span style={{ fontSize:9 }}>mg/dL</span>
            </td>
            <td style={{ ...c, fontSize:9 }}>≥ 60mg/dL</td>
          </tr>
          {/* Row 4: empty left | LDL */}
          <tr>
            <td style={{ ...c, borderRight:B }}>&nbsp;</td>
            <td style={{ ...c, borderRight:B }}>&nbsp;</td>
            <td style={{ ...c, borderRight:'2px solid #000' }}>&nbsp;</td>
            <td style={{ ...c, borderRight:B, fontWeight:700, textAlign:'left', paddingLeft:8 }}>LDL</td>
            <td style={{ ...c, borderRight:B }}>
              <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:36, marginRight:3 }}>{data.ldl||''}</span>
              <span style={{ fontSize:9 }}>mg/dL</span>
            </td>
            <td style={{ ...c, fontSize:9 }}>&lt; 130mg/dL</td>
          </tr>
        </tbody>
      </table>

      {/* REMARKS / Last Meal / Time of Extraction */}
      <div style={{ marginTop:12, fontSize:10 }}>
        <div style={{ display:'flex', alignItems:'flex-end', gap:24, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
            <span style={{ fontWeight:700, whiteSpace:'nowrap' }}>REMARKS:</span>
            <span style={{ borderBottom:'1px solid #000', minWidth:130, display:'inline-block', paddingLeft:4 }}>{data.remarks||''}</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
            <span style={{ fontWeight:700, whiteSpace:'nowrap' }}>Last Meal:</span>
            <span style={{ borderBottom:'1px solid #000', minWidth:110, display:'inline-block', paddingLeft:4 }}>{data.lastMeal||''}</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
            <span style={{ fontWeight:700, whiteSpace:'nowrap' }}>Time of Extraction:</span>
            <span style={{ borderBottom:'1px solid #000', minWidth:100, display:'inline-block', paddingLeft:4 }}>{data.timeOfExtraction||''}</span>
          </div>
        </div>
      </div>

      <FormFooter medtech={medtech} medtechLic={medtechLic} mho={mho} mhoLic={mhoLic}/>
    </Wrap>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. FECALYSIS — Image 1 (exact match)
// ══════════════════════════════════════════════════════════════════════════════
export function PrintFecalysis({ data={}, medtech='', medtechLic='', mho='', mhoLic='' }) {
  return (
    <Wrap>
      <FormHeader title="Fecalysis"
        name={data.name} address={data.address} reqPhysician={data.reqPhysician}
        date={data.date} age={data.age} sex={data.sex}
        note="*Note: For RHU-Lopez use only."/>

      {/* Single outer border box — exactly like the physical form */}
      <div style={{ border:B }}>
        {/* Header row: MACROSCOPIC | MICROSCOPIC | NORMAL VALUE */}
        <div style={{ display:'flex', borderBottom:B }}>
          <div style={{ flex:'0 0 48%', fontWeight:700, fontSize:11, padding:'5px 10px', borderRight:B }}>MACROSCOPIC EXAM</div>
          <div style={{ flex:1, fontWeight:700, fontSize:11, padding:'5px 10px', borderRight:B }}>MICROSCOPIC EXAM</div>
          <div style={{ flex:'0 0 70px', fontWeight:700, fontSize:9, textAlign:'center', padding:'5px 4px' }}>NORMAL<br/>VALUE</div>
        </div>

        {/* Content area */}
        <div style={{ display:'flex', padding:'10px 10px 6px' }}>

          {/* Left: MACRO — COLOR + CONSISTENCY */}
          <div style={{ flex:'0 0 48%', paddingRight:16 }}>
            {/* COLOR row */}
            <div style={{ display:'flex', alignItems:'flex-end', marginBottom:10 }}>
              <span style={{ fontWeight:700, minWidth:90, fontSize:10 }}>COLOR</span>
              <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:18, paddingLeft:4, fontSize:10 }}>{data.color||''}</span>
            </div>
            {/* CONSISTENCY row */}
            <div style={{ display:'flex', alignItems:'flex-end', marginBottom:10 }}>
              <span style={{ fontWeight:700, minWidth:90, fontSize:10 }}>CONSISTENCY</span>
              <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:18, paddingLeft:4, fontSize:10 }}>{data.consistency||''}</span>
            </div>
          </div>

          {/* Right: MICRO — WBC + RED BLOOD CELL */}
          <div style={{ flex:1, paddingRight:4 }}>
            {/* WBC/PUS CELL */}
            <div style={{ display:'flex', alignItems:'flex-end', marginBottom:10 }}>
              <span style={{ fontWeight:700, minWidth:110, fontSize:10 }}>WBC/PUS CELL</span>
              <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:18, paddingLeft:4, fontSize:10 }}>{data.wbcPusCell||''}</span>
            </div>
            {/* RED BLOOD CELL */}
            <div style={{ display:'flex', alignItems:'flex-end', marginBottom:10 }}>
              <span style={{ fontWeight:700, minWidth:110, fontSize:10 }}>RED BLOOD CELL</span>
              <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:18, paddingLeft:4, fontSize:10 }}>{data.redBloodCell||''}</span>
            </div>
          </div>

          {/* Normal values column */}
          <div style={{ flex:'0 0 70px', textAlign:'center', fontSize:9, paddingTop:2 }}>
            <div style={{ marginBottom:22 }}>0-2/HPF</div>
            <div>0-2/HPF</div>
          </div>
        </div>

        {/* PARASITE row — full width inside border */}
        <div style={{ borderTop:B, padding:'10px 10px 4px' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
            <span style={{ fontWeight:900, fontSize:11, whiteSpace:'nowrap' }}>PARASITE:</span>
            <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:20, paddingLeft:4, fontSize:10 }}>{data.parasite||''}</span>
          </div>
        </div>

        {/* OTHERS row — full width inside border */}
        <div style={{ padding:'8px 10px 12px' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
            <span style={{ fontWeight:700, fontSize:10, whiteSpace:'nowrap' }}>OTHERS:</span>
            <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:20, paddingLeft:4, fontSize:10 }}>{data.others||''}</span>
          </div>
        </div>
      </div>

      <FormFooter medtech={medtech} medtechLic={medtechLic} mho={mho} mhoLic={mhoLic}/>
    </Wrap>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. SEROLOGY — Image 3
// ══════════════════════════════════════════════════════════════════════════════
export function PrintSerology({ data={}, medtech='', medtechLic='', mho='', mhoLic='' }) {
  const rows = [
    ['HbsAg\nScreening Test', 'hbsag'        ],
    ['DENGUE NS1\nAg',        'dengueNs1'    ],
    ['DENGUE DUO\nIgG',       'dengueDuoIgG' ],
    ['IgM',                   'dengueDuoIgM' ],
    ['HIV 1/2 3.0\nAntigen',  'hiv'          ],
    ['SYPHILIS',              'syphilis'     ],
  ]
  return (
    <Wrap>
      <FormHeader title="Serology"
        name={data.name} address={data.address} reqPhysician={data.reqPhysician}
        date={data.date} age={data.age} sex={data.sex}/>

      <table style={{ width:'100%', borderCollapse:'collapse', border:B }}>
        <thead>
          <tr>
            <TH style={{ borderRight:B, borderBottom:B, width:'22%', textAlign:'left' }}>TEST</TH>
            <TH style={{ borderRight:B, borderBottom:B, width:'16%' }}>TEST KIT</TH>
            <TH style={{ borderRight:B, borderBottom:B, width:'12%' }}>LOT No.</TH>
            <TH style={{ borderRight:B, borderBottom:B, width:'14%' }}>EXP DATE</TH>
            <TH style={{ borderRight:B, borderBottom:B, width:'20%' }}>TYPE OF TEST</TH>
            <TH style={{ borderBottom:B, width:'16%' }}>RESULT</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, key]) => {
            const row = data[key] || {}
            return (
              <tr key={key}>
                <TD style={{ fontWeight:700, borderRight:B, whiteSpace:'pre-line', fontSize:9.5 }}>{label}</TD>
                <TD style={{ borderRight:B }}>{row.kit||''}</TD>
                <TD style={{ borderRight:B }}>{row.lot||''}</TD>
                <TD style={{ borderRight:B }}>{row.exp||''}</TD>
                <TD style={{ borderRight:B }}>{row.type||''}</TD>
                <TD>{row.result||''}</TD>
              </tr>
            )
          })}
          {/* REMARKS row */}
          <tr>
            <TD colSpan={6} style={{ borderTop:B }}>
              <span style={{ fontWeight:700 }}>REMARKS:</span>
              <span style={{ marginLeft:8 }}>{data.remarks||''}</span>
            </TD>
          </tr>
        </tbody>
      </table>

      <FormFooter medtech={medtech} medtechLic={medtechLic} mho={mho} mhoLic={mhoLic}/>
    </Wrap>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. URINALYSIS — Image 3 (exact match)
// ══════════════════════════════════════════════════════════════════════════════
export function PrintUrinalysis({ data={}, medtech='', medtechLic='', mho='', mhoLic='' }) {
  const macro = [
    ['COLOR',            data.color||'',           ''],
    ['CONSISTENCY',      data.consistency||'',     ''],
    ['SPECIFIC GRAVITY', data.specificGravity||'', ''],
    ['pH REACTION',      data.phReaction||'',      ''],
    ['PROTEIN',          data.protein||'',         'NEGATIVE'],
    ['SUGAR',            data.sugar||'',           'NEGATIVE'],
  ]
  const micro = [
    ['WBC/PUS CELL',    data.wbcPusCell||'',    '0-2 /HPF'],
    ['RED BLOOD CELL',  data.redBloodCell||'',  '0-2 /HPF'],
    ['EPITHELIAL CELL', data.epithelialCell||'',''],
    ['AMORPHOUS SUBS.', data.amorphousSubs||'', ''],
    ['MUCUS THREAD',    data.mucusThread||'',   ''],
    ['BACTERIA',        data.bacteria||'',      ''],
  ]
  return (
    <Wrap>
      <FormHeader title="Urinalysis"
        name={data.name} address={data.address} reqPhysician={data.reqPhysician}
        date={data.date} age={data.age} sex={data.sex}/>

      <div style={{ border:B }}>
        {/* Column headers */}
        <div style={{ display:'flex', borderBottom:B }}>
          <div style={{ flex:'0 0 38%', fontWeight:700, fontSize:11, padding:'5px 10px', borderRight:B }}>MACROSCOPIC EXAM</div>
          <div style={{ flex:'0 0 70px', fontWeight:700, fontSize:9, textAlign:'center', padding:'5px 4px', borderRight:B }}>NORMAL<br/>VALUE</div>
          <div style={{ flex:1, fontWeight:700, fontSize:11, padding:'5px 10px', borderRight:B }}>MICROSCOPIC EXAM</div>
          <div style={{ flex:'0 0 70px', fontWeight:700, fontSize:9, textAlign:'center', padding:'5px 4px' }}>NORMAL<br/>VALUE</div>
        </div>

        {/* Data rows */}
        <div style={{ display:'flex', padding:'8px 10px 6px' }}>
          {/* Left: Macro labels + underline values */}
          <div style={{ flex:'0 0 38%', paddingRight:8 }}>
            {macro.map(([lbl, val]) => (
              <div key={lbl} style={{ display:'flex', alignItems:'flex-end', marginBottom:8 }}>
                <span style={{ fontWeight:700, minWidth:106, fontSize:10 }}>{lbl}</span>
                <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:18, paddingLeft:4, fontSize:10 }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Normal value col for macro */}
          <div style={{ flex:'0 0 70px', textAlign:'center', fontSize:9, paddingTop:2 }}>
            {macro.map(([lbl,, norm]) => (
              <div key={lbl} style={{ height:26, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {norm}
              </div>
            ))}
          </div>

          {/* Right: Micro labels + underline values */}
          <div style={{ flex:1, paddingLeft:8, paddingRight:8, borderLeft:B }}>
            {micro.map(([lbl, val]) => (
              <div key={lbl} style={{ display:'flex', alignItems:'flex-end', marginBottom:8 }}>
                <span style={{ fontWeight:700, minWidth:118, fontSize:10 }}>{lbl}</span>
                <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:18, paddingLeft:4, fontSize:10 }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Normal value col for micro */}
          <div style={{ flex:'0 0 70px', textAlign:'center', fontSize:9, paddingTop:2 }}>
            {micro.map(([lbl,, norm]) => (
              <div key={lbl} style={{ height:26, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {norm}
              </div>
            ))}
          </div>
        </div>

        {/* OTHERS — full width at bottom */}
        <div style={{ borderTop:B, padding:'8px 10px 12px' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
            <span style={{ fontWeight:700, fontSize:10 }}>OTHERS</span>
            <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:18, paddingLeft:4, fontSize:10 }}>{data.others||''}</span>
          </div>
        </div>
      </div>

      <FormFooter medtech={medtech} medtechLic={medtechLic} mho={mho} mhoLic={mhoLic}/>
    </Wrap>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. HEMATOLOGY — Image 2 (exact match)
// ══════════════════════════════════════════════════════════════════════════════
export function PrintHematology({ data={}, medtech='', medtechLic='', mho='', mhoLic='' }) {
  const cbc = [
    ['HEMOGLOBIN',    'g/dL',    data.hemoglobin||'',    '13.5 - 17.5','12.0 - 16.0'],
    ['HEMATOCRIT',    '%',       data.hematocrit||'',    '41 - 53',     '36 - 46'   ],
    ['RBC Count',     'x10^9/L', data.rbcCount||'',      '4.5 - 5.9',   '4.1 - 8.1' ],
    ['WBC Count',     'x10^9/L', data.wbcCount||'',      '4.5 - 11.0',  ''          ],
    ['PLATELET Count','x10^9/L', data.plateletCount||'', '150 - 450',   ''          ],
  ]
  const diff = [
    ['NEUTROPHIL',  data.neutrophil||'',  '55 - 65 %'],
    ['LYMPHOCYTES', data.lymphocytes||'', '25 - 35 %'],
    ['MONOCYTES',   data.monocytes||'',   '2 - 6 %'  ],
    ['EOSINOPHIL',  data.eosinophil||'',  '2 - 4 %'  ],
    ['BASOPHIL',    data.basophil||'',    '0 - 0.5%' ],
  ]
  return (
    <Wrap>
      <FormHeader title="Hematology"
        name={data.name} address={data.address} reqPhysician={data.reqPhysician}
        date={data.date} age={data.age} sex={data.sex}/>

      <table style={{ width:'100%', borderCollapse:'collapse', border:B, fontSize:10 }}>
        <thead>
          {/* Row 1: main column headers */}
          <tr>
            <th style={{ ...cs, borderRight:B, borderBottom:B, width:'18%', textAlign:'center' }}>TEST</th>
            <th style={{ ...cs, borderRight:B, borderBottom:B, width:'10%', textAlign:'center' }}>UNIT</th>
            <th colSpan={2} style={{ ...cs, borderRight:B, borderBottom:B, width:'22%', textAlign:'center' }}>NORMAL VALUE</th>
            <th colSpan={2} style={{ ...cs, borderRight:B, borderBottom:B, textAlign:'center' }}>DIFFERENTIAL COUNT</th>
            <th style={{ ...cs, borderBottom:B, width:'12%', textAlign:'center' }}>NORMAL VALUE</th>
          </tr>
          {/* Row 2: MALE / FEMALE sub-headers */}
          <tr>
            <th style={{ ...cs, borderRight:B, borderBottom:B }}>&nbsp;</th>
            <th style={{ ...cs, borderRight:B, borderBottom:B }}>&nbsp;</th>
            <th style={{ ...cs, borderRight:B, borderBottom:B, width:'11%', textAlign:'center', fontSize:9 }}>MALE</th>
            <th style={{ ...cs, borderRight:B, borderBottom:B, width:'11%', textAlign:'center', fontSize:9 }}>FEMALE</th>
            <th style={{ ...cs, borderRight:B, borderBottom:B, width:'16%', textAlign:'center', fontSize:9 }}>&nbsp;</th>
            <th style={{ ...cs, borderRight:B, borderBottom:B, width:'10%', textAlign:'center', fontSize:9 }}>{/* result */}&nbsp;</th>
            <th style={{ ...cs, borderBottom:B }}>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {/* CBC rows + Differential side by side */}
          {cbc.map(([test, unit, result, male, female], i) => {
            const d = diff[i] || ['','','']
            return (
              <tr key={test}>
                <td style={{ ...cs, borderRight:B, fontWeight:600 }}>{test}</td>
                <td style={{ ...cs, borderRight:B, textAlign:'center', fontSize:9 }}>{unit}</td>
                <td style={{ ...cs, borderRight:B, textAlign:'center', fontSize:9 }}>{male}</td>
                <td style={{ ...cs, borderRight:B, textAlign:'center', fontSize:9 }}>{female}</td>
                <td style={{ ...cs, borderRight:B, fontWeight:700, fontSize:9.5 }}>{d[0]}</td>
                <td style={{ ...cs, borderRight:B, textAlign:'center' }}>{d[1]}</td>
                <td style={{ ...cs, textAlign:'center', fontSize:9 }}>{d[2]}</td>
              </tr>
            )
          })}
          {/* TOTAL + BLOOD TYPE row */}
          <tr>
            <td colSpan={4} style={{ ...cs, borderRight:B, verticalAlign:'top', paddingTop:8 }}>
              {/* empty left side — OTHERS/REMARKS below */}
            </td>
            <td colSpan={3} style={{ ...cs, paddingTop:6, verticalAlign:'top' }}>
              <div style={{ fontWeight:700, marginBottom:8 }}>
                TOTAL = <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:60, marginLeft:4 }}>{data.total||''}</span>
              </div>
              <div style={{ fontWeight:700 }}>
                BLOOD TYPE: <span style={{ borderBottom:'1px solid #000', display:'inline-block', minWidth:60, marginLeft:4 }}>{data.bloodType||''}</span>
              </div>
            </td>
          </tr>
          {/* OTHERS and REMARKS full width */}
          <tr>
            <td colSpan={7} style={{ ...cs, paddingTop:6, paddingBottom:10 }}>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:6 }}>
                <span style={{ fontWeight:700, minWidth:60 }}>OTHERS:</span>
                <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:18, paddingLeft:4 }}>{data.others||''}</span>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                <span style={{ fontWeight:700, minWidth:60 }}>REMARKS:</span>
                <span style={{ flex:1, borderBottom:'1px solid #000', minHeight:18, paddingLeft:4 }}>{data.remarks||''}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <FormFooter medtech={medtech} medtechLic={medtechLic} mho={mho} mhoLic={mhoLic}/>
    </Wrap>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Unified — renders selected form with mapped DB data
// ══════════════════════════════════════════════════════════════════════════════
export function PrintLabForms({ request={}, results={}, selTest='Fecalysis', medtech='', medtechLic='', mho='', mhoLic='', mhoRole='Municipal Health Officer' }) {
  const base = {
    name:         request.name         || '',
    address:      request.address      || '',
    reqPhysician: request.reqPhysician || '',  // normal-case physician name
    date:         request.request_date || '',
    age:          request.age          || '',
    sex:          request.gender       || '',
  }
  // Footer signature props
  const footerMedtech    = medtech    || ''
  const footerMedtechLic = medtechLic || ''
  const footerMho        = mho        || ''
  const footerMhoLic     = mhoLic     || ''

  // Results already pre-mapped to correct keys by ViewResultModal
  // Just spread them directly — no double-mapping needed
  const fp = { medtech:footerMedtech, medtechLic:footerMedtechLic, mho:footerMho, mhoLic:footerMhoLic }

  if (selTest === 'Clinical Chemistry')
    return <PrintClinicalChemistry {...fp} data={{ ...base, ...(results.chemistry || results) }}/>

  if (selTest === 'Fecalysis')
    return <PrintFecalysis {...fp} data={{ ...base, ...(results.fecalysis || results) }}/>

  if (selTest === 'Serology') {
    // Serology is keyed by test_name — map to component keys
    const serKeyMap = { hbsag:'hbsag', dengue_ns1:'dengueNs1', dengue_igg_igm:'dengueDuoIgG', hiv:'hiv', syphilis:'syphilis' }
    const ser = { ...base }
    const src = results.serology || results

    // FIX: the previous version naively did
    //   Object.entries(src).forEach(([k, v]) => { ser[serKeyMap[k] || k] = v })
    // — this also tried to remap the *top-level* `remarks` string the same
    // way as a test-result object, and it NEVER duplicated the single
    // combined "DENGUE DUO IgG/IgM" input into the print template's two
    // separate rows (IgG row got it, IgM row stayed permanently blank even
    // though the user only ever has ONE field to fill for both).
    if (Array.isArray(src)) {
      src.forEach(r => {
        const mappedKey = serKeyMap[r.test_name] || r.test_name
        const entry = { kit:r.test_kit||'', lot:r.lot_number||'', exp:r.expiry_date||'', type:r.type_of_test||'', result:r.result||'' }
        ser[mappedKey] = entry
        if (r.test_name === 'dengue_igg_igm') ser.dengueDuoIgM = entry // same combined result shown on both rows
        if (r.remarks && !ser.remarks) ser.remarks = r.remarks
      })
    } else {
      Object.entries(src).forEach(([k, v]) => {
        if (k === 'remarks') { ser.remarks = v; return }
        const mappedKey = serKeyMap[k] || k
        ser[mappedKey] = v
        if (k === 'dengue_igg_igm') ser.dengueDuoIgM = v
      })
    }
    return <PrintSerology {...fp} data={ser}/>
  }

  if (selTest === 'Urinalysis')
    return <PrintUrinalysis {...fp} data={{ ...base, ...(results.urinalysis || results) }}/>

  if (selTest === 'Hematology')
    return <PrintHematology {...fp} data={{ ...base, ...(results.hematology || results) }}/>

  return null
}

export default PrintLabForms