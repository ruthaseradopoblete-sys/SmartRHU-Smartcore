'use client'
import { useState, useEffect, useRef } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts"

/* ── MiniCalendar ── */
function MiniCalendar({ darkMode }) {
  const [offset, setOffset] = useState(0)
  const base = new Date()
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const month = d.toLocaleString('default', { month: 'long' }).toUpperCase()
  const year = d.getFullYear()
  const firstDay = d.getDay()
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const days = ['S','M','T','W','T','F','S']
  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, color:'#1a7a1a', marginBottom:6 }}>
        <span style={{ cursor:'pointer' }} onClick={() => setOffset(o => o-1)}>◀</span>
        <span>{month} {year}</span>
        <span style={{ cursor:'pointer' }} onClick={() => setOffset(o => o+1)}>▶</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, textAlign:'center' }}>
        {days.map((d,i) => <div key={i} style={{ fontWeight:700, color:'#999', fontSize:10, padding:'2px 0' }}>{d}</div>)}
        {Array.from({ length: firstDay }).map((_,i) => <div key={'b'+i} />)}
        {Array.from({ length: daysInMonth }).map((_,i) => {
          const day = i + 1
          const isToday = offset === 0 && day === base.getDate()
          return (
            <div key={day} style={{ padding:'3px 0', borderRadius:4, cursor:'pointer', background: isToday ? '#1a7a1a' : 'transparent', color: isToday ? '#fff' : (darkMode ? '#a5d6a7' : '#444'), fontWeight: isToday ? 700 : 400 }}>
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Sidebar ── */
const MENU_ITEMS = [
  { label: 'Dashboard', section: 'Menu' },
  { label: 'Patient Laboratory Records', section: 'Menu' },
  { label: 'Settings', section: 'General' },
  { label: 'Help', section: 'General' },
]

const Icons = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  flask: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3h6M9 3v8l-4 9h14l-4-9V3"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93L4.93 19.07M4.93 4.93l14.14 14.14"/><circle cx="12" cy="12" r="10"/>
    </svg>
  ),
  help: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

const ICON_MAP = {
  'Dashboard': Icons.grid,
  'Patient Laboratory Records': Icons.flask,
  'Settings': Icons.settings,
  'Help': Icons.help,
}

function LabSidebar({ activeMenu, setActiveMenu, sidebarOpen, onLogout, darkMode }) {
  const bg = darkMode ? '#0a1a0d' : '#ffffff'
  const bdr = darkMode ? '1px solid #1a3320' : '1px solid #dceadc'

  const NavBtn = ({ label, active }) => (
    <button
      onClick={() => setActiveMenu(label)}
      style={{
        width:'100%', display:'flex', alignItems:'center',
        gap: sidebarOpen ? 10 : 0, justifyContent: sidebarOpen ? 'flex-start' : 'center',
        padding:'10px 12px', borderRadius:10, marginBottom:4,
        background: active ? '#1a7a1a' : 'transparent',
        color: active ? '#fff' : (darkMode ? '#a5d6a7' : '#555'),
        border:'none', cursor:'pointer', fontSize: label.length > 22 ? 11 : 13,
        fontWeight: active ? 600 : 400, transition:'all 0.15s', textAlign:'left', lineHeight:1.2,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = darkMode ? '#1a3320' : '#f2faf2' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {ICON_MAP[label]}
      {sidebarOpen && <span>{label}</span>}
    </button>
  )

  return (
    <aside style={{ width: sidebarOpen ? 220 : 72, minHeight:'100vh', background: bg, display:'flex', flexDirection:'column', borderRight: bdr, transition:'width 0.25s ease', flexShrink:0 }}>
      {/* Logo */}
      <div style={{ padding:'18px 14px 16px', borderBottom: bdr, display:'flex', alignItems:'center', gap:10, overflow:'hidden' }}>
        <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#1a7a1a,#2ea82e)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(26,122,26,.35)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3"  y="3"  width="7" height="7" rx="1.5" fill="white"/>
            <rect x="14" y="3"  width="7" height="7" rx="1.5" fill="white" opacity="0.75"/>
            <rect x="3"  y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.75"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.45"/>
          </svg>
        </div>
        {sidebarOpen && (
          <div style={{ overflow:'hidden' }}>
            <div style={{ fontWeight:800, color: darkMode ? '#4db86a' : '#1a7a1a', fontSize:15, whiteSpace:'nowrap' }}>SMARTRHU</div>
            <div style={{ fontSize:10, color:'#999', marginTop:1, whiteSpace:'nowrap' }}>RHU Lopez, Quezon</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding:'14px 10px 0', flex:1 }}>
        {sidebarOpen && <div style={{ fontSize:10, fontWeight:700, color: darkMode?'#3a6b48':'#bbb', letterSpacing:1.2, marginBottom:8, paddingLeft:10 }}>MENU</div>}
        {MENU_ITEMS.filter(i => i.section === 'Menu').map(({ label }) => (
          <NavBtn key={label} label={label} active={activeMenu === label} />
        ))}
        <div style={{ marginTop:12 }}>
          {sidebarOpen && <div style={{ fontSize:10, fontWeight:700, color: darkMode?'#3a6b48':'#bbb', letterSpacing:1.2, marginBottom:8, paddingLeft:10 }}>GENERAL</div>}
          {MENU_ITEMS.filter(i => i.section === 'General').map(({ label }) => (
            <NavBtn key={label} label={label} active={activeMenu === label} />
          ))}
          <button
            onClick={onLogout}
            style={{ width:'100%', display:'flex', alignItems:'center', gap: sidebarOpen?10:0, justifyContent: sidebarOpen?'flex-start':'center', padding:'10px 12px', borderRadius:10, background:'transparent', color:'#e53e3e', border:'none', cursor:'pointer', fontSize:13, transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = darkMode ? '#2d0f0f' : '#fff5f5' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {Icons.logout}
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </nav>

      {sidebarOpen && (
        <div style={{ margin:'0 10px 12px', padding:'10px', background: darkMode?'#0d2010':'#f8fdf8', borderRadius:12, border: darkMode?'1px solid #1a3320':'1px solid #dceadc' }}>
          <MiniCalendar darkMode={darkMode} />
        </div>
      )}
    </aside>
  )
}

/* ── Shared field input ── */
const F = ({ label, value, onChange, width = '100%', type = 'text', minLabelW = 100 }) => (
  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
    <label style={{ fontSize:12, fontWeight:600, minWidth: minLabelW, whiteSpace:'nowrap' }}>{label}:</label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      style={{ width, border:'1px solid #bbb', borderRadius:3, padding:'2px 6px', fontSize:12, outline:'none', flex: width === '100%' ? 1 : undefined }}
    />
  </div>
)

/* ── All 5 lab form bodies ── */
function FecalysisForm({ data, setData }) {
  const S = (k) => <input value={data[k]||''} onChange={e => setData(p=>({...p,[k]:e.target.value}))} style={{ width:'100%', border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:11, outline:'none' }} />
  return (
    <div style={{ border:'1px solid #ccc', borderRadius:4 }}>
      <div style={{ background:'#1a6b2e', color:'#fff', padding:'5px 12px', fontWeight:700, fontSize:13, textAlign:'center' }}>Fecalysis</div>
      <div style={{ padding:'10px 14px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 70px', gap:4, marginBottom:4 }}>
          <div style={{ fontWeight:700, fontSize:11 }}>MACROSCOPIC EXAM</div>
          <div style={{ fontWeight:700, fontSize:11 }}>MICROSCOPIC EXAM</div>
          <div style={{ fontWeight:700, fontSize:10, color:'#666', textAlign:'center' }}>Normal Value</div>
        </div>
        {[
          [['Color','color'],['WBC/PUS Cell','wbc'],'0-2/HPF'],
          [['Consistency','consist'],['Red Blood Cell','rbc'],'0-2/HPF'],
        ].map(([left, right, nv], idx) => (
          <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 70px', gap:6, alignItems:'center', marginBottom:5 }}>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <label style={{ fontSize:11, minWidth:70 }}>{left[0]}:</label>{S(left[1])}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <label style={{ fontSize:11, minWidth:90 }}>{right[0]}:</label>{S(right[1])}
            </div>
            <div style={{ fontSize:10, color:'#666', textAlign:'center' }}>{nv}</div>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
          <label style={{ fontSize:11, minWidth:60 }}>PARASITE:</label>
          <input value={data.parasite||''} onChange={e=>setData(p=>({...p,parasite:e.target.value}))} style={{ flex:1, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:11, outline:'none' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5 }}>
          <label style={{ fontSize:11, minWidth:60 }}>Others:</label>
          <input value={data.others||''} onChange={e=>setData(p=>({...p,others:e.target.value}))} style={{ width:220, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:11, outline:'none' }} />
        </div>
      </div>
    </div>
  )
}

function UrinalysisForm({ data, setData }) {
  const rows = [
    [['Color','color'],null,['WBC/PUS Cell','wbc'],'0-2/HPF'],
    [['Consistency','consist'],null,['Red Blood Cell','rbc'],'0-2/HPF'],
    [['Specific Gravity','spg'],null,['Epithelial Cell','epi'],null],
    [['pH Reaction','ph'],null,['Amorphous Subs.','amorph'],null],
    [['Protein','protein'],'Negative',['Mucus Thread','mucus'],null],
    [['Sugar','sugar'],'Negative',['Bacteria','bacteria'],null],
  ]
  const S = (k) => <input value={data[k]||''} onChange={e=>setData(p=>({...p,[k]:e.target.value}))} style={{ flex:1, border:'1px solid #bbb', borderRadius:3, padding:'2px 4px', fontSize:11, outline:'none', minWidth:0 }} />
  return (
    <div style={{ border:'1px solid #ccc', borderRadius:4 }}>
      <div style={{ background:'#1a6b2e', color:'#fff', padding:'5px 12px', fontWeight:700, fontSize:13, textAlign:'center' }}>Urinalysis</div>
      <div style={{ padding:'10px 14px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 1fr 70px', gap:4, marginBottom:4 }}>
          <div style={{ fontWeight:700, fontSize:11 }}>MACROSCOPIC EXAM</div>
          <div style={{ fontWeight:700, fontSize:10, color:'#666' }}>Normal Value</div>
          <div style={{ fontWeight:700, fontSize:11 }}>MICROSCOPIC EXAM</div>
          <div style={{ fontWeight:700, fontSize:10, color:'#666' }}>Normal Value</div>
        </div>
        {rows.map(([l, ln, r, rn], idx) => (
          <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 70px 1fr 70px', gap:4, alignItems:'center', marginBottom:3 }}>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <label style={{ fontSize:11, minWidth:90, flexShrink:0 }}>{l[0]}:</label>{S(l[1])}
            </div>
            <div style={{ fontSize:10, color:'#777', textAlign:'center' }}>{ln||''}</div>
            {r ? <div style={{ display:'flex', alignItems:'center', gap:4 }}><label style={{ fontSize:11, minWidth:90, flexShrink:0 }}>{r[0]}:</label>{S(r[1])}</div> : <div/>}
            <div style={{ fontSize:10, color:'#777', textAlign:'center' }}>{rn||''}</div>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
          <label style={{ fontSize:11, minWidth:55 }}>Others:</label>
          <input value={data.others||''} onChange={e=>setData(p=>({...p,others:e.target.value}))} style={{ flex:1, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:11, outline:'none' }} />
        </div>
      </div>
    </div>
  )
}

function HematologyForm({ data, setData }) {
  const S = (k, w='70px') => <input value={data[k]||''} onChange={e=>setData(p=>({...p,[k]:e.target.value}))} style={{ width:w, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:11, outline:'none' }} />
  const fields = [
    ['Hemoglobin','hgb','g/dL','120–160'],['Hematocrit','hct','%','37–47'],
    ['WBC','wbc','×10³/µL','5–10'],['RBC','rbc','×10⁶/µL','4.5–5.5'],
    ['Platelets','plt','×10³/µL','150–400'],['MCV','mcv','fL','80–100'],
    ['MCH','mch','pg','27–33'],['MCHC','mchc','g/dL','32–36'],
  ]
  const diff = [['Neutrophils','neut','50–70%'],['Lymphocytes','lymp','20–40%'],['Monocytes','mono','2–8%'],['Eosinophils','eos','1–4%'],['Basophils','baso','0–1%']]
  return (
    <div style={{ border:'1px solid #ccc', borderRadius:4 }}>
      <div style={{ background:'#1a6b2e', color:'#fff', padding:'5px 12px', fontWeight:700, fontSize:13, textAlign:'center' }}>Hematology</div>
      <div style={{ padding:'10px 14px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 24px', marginBottom:10 }}>
          {fields.map(([lbl,k,unit,nv]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <label style={{ fontSize:11, minWidth:90 }}>{lbl}:</label>
              {S(k)}
              <span style={{ fontSize:10, color:'#777', marginLeft:3 }}>{unit}</span>
              <span style={{ fontSize:9, color:'#aaa', marginLeft:4 }}>{nv}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid #ddd', paddingTop:8, marginBottom:8 }}>
          <div style={{ fontWeight:700, fontSize:11, marginBottom:5 }}>Differential Count:</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
            {diff.map(([lbl,k,nv]) => (
              <div key={k} style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:600, marginBottom:2 }}>{lbl}</div>
                {S(k,'100%')}
                <div style={{ fontSize:9, color:'#aaa', marginTop:2 }}>{nv}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <label style={{ fontSize:11, minWidth:60 }}>Remarks:</label>
          <input value={data.remarks||''} onChange={e=>setData(p=>({...p,remarks:e.target.value}))} style={{ flex:1, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:11, outline:'none' }} />
        </div>
      </div>
    </div>
  )
}

function ClinicalChemForm({ data, setData }) {
  const S = (k, w='70px') => <input value={data[k]||''} onChange={e=>setData(p=>({...p,[k]:e.target.value}))} style={{ width:w, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:11, outline:'none' }} />
  const pairs = [
    [['RBS','rbs','mg/dL','<160'],['Total Cholesterol','chol','mg/dL','<200']],
    [['FBS','fbs','mg/dL','70–105'],['Triglycerides','trig','mg/dL','<150']],
    [['Uric Acid','uric','mg/dL','M:3.5-7.7 F:2.6-6'],['HDL','hdl','mg/dL','≥60']],
    [null,['LDL','ldl','mg/dL','<130']],
  ]
  return (
    <div style={{ border:'1px solid #ccc', borderRadius:4 }}>
      <div style={{ background:'#1a6b2e', color:'#fff', padding:'5px 12px', fontWeight:700, fontSize:13, textAlign:'center' }}>Clinical Chemistry</div>
      <div style={{ padding:'10px 14px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 20px', marginBottom:10 }}>
          {pairs.flatMap((pair, ri) =>
            pair.map((cell, ci) => cell ? (
              <div key={ri+'-'+ci} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <label style={{ fontSize:11, minWidth:110 }}>{cell[0]}:</label>
                {S(cell[1])}
                <span style={{ fontSize:10, color:'#777', marginLeft:3 }}>{cell[2]}</span>
                <span style={{ fontSize:9, color:'#aaa', marginLeft:4 }}>{cell[3]}</span>
              </div>
            ) : <div key={ri+'-'+ci} />)
          )}
        </div>
        <div style={{ borderTop:'1px solid #ddd', paddingTop:8, display:'flex', flexDirection:'column', gap:5 }}>
          {[['Remarks','remarks'],['Last Meal','lastMeal'],['Time of Extraction','timeEx']].map(([lbl,k]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <label style={{ fontSize:11, minWidth:130 }}>{lbl}:</label>
              <input value={data[k]||''} onChange={e=>setData(p=>({...p,[k]:e.target.value}))} style={{ flex:1, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:11, outline:'none' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SerologyForm({ data, setData }) {
  const rows = [
    ['HbsAg Screening Test','hbsAg'],
    ['DENGUE NS1 Ag','ns1'],
    ['DENGUE DUO IgG','igG'],
    ['DENGUE DUO IgM','igM'],
    ['HIV 1/2 3.0 Antigen','hiv'],
    ['SYPHILIS','syphilis'],
  ]
  return (
    <div style={{ border:'1px solid #ccc', borderRadius:4 }}>
      <div style={{ background:'#1a6b2e', color:'#fff', padding:'5px 12px', fontWeight:700, fontSize:13, textAlign:'center' }}>SEROLOGY</div>
      <div style={{ padding:'10px 14px' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
          <thead>
            <tr style={{ background:'#f0faf0' }}>
              {['TEST','TEST KIT','LOT NO.','EXP DATE','TYPE OF TEST','RESULT'].map(h => (
                <th key={h} style={{ padding:'5px 6px', border:'1px solid #ccc', fontWeight:700, textAlign:'center' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([lbl, key]) => (
              <tr key={key}>
                <td style={{ padding:'3px 6px', border:'1px solid #ccc', fontWeight:600, whiteSpace:'nowrap' }}>{lbl}</td>
                {['kit','lot','exp','type','result'].map(f => (
                  <td key={f} style={{ padding:'2px 4px', border:'1px solid #ccc' }}>
                    <input
                      value={(data[key]||{})[f]||''}
                      onChange={e => setData(p => ({ ...p, [key]: { ...(p[key]||{}), [f]: e.target.value } }))}
                      style={{ width:'100%', border:'none', outline:'none', fontSize:11, padding:'1px 3px' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
          <label style={{ fontSize:11, minWidth:60 }}>Remarks:</label>
          <input value={data.remarks||''} onChange={e=>setData(p=>({...p,remarks:e.target.value}))} style={{ flex:1, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:11, outline:'none' }} />
        </div>
      </div>
    </div>
  )
}

/* ── Lab Form Modal ── */
const TESTS = ['Fecalysis','Urinalysis','Hematology','Clinical Chemistry','Serology']

function LabFormModal({ isOpen, onClose, patient, initialTest }) {
  const [selTest, setSelTest] = useState(initialTest || 'Fecalysis')
  const [pInfo, setPInfo] = useState({ name:'', age:'', gender:'', civil:'', address:'' })
  const [labInfo, setLabInfo] = useState({ name:'', date:'', address:'', age:'', reqPhys:'', sex:'' })
  const [fec, setFec] = useState({})
  const [uri, setUri] = useState({})
  const [hem, setHem] = useState({})
  const [chem, setChem] = useState({})
  const [ser, setSer] = useState({})
  const [confirm, setConfirm] = useState(false)
  const printRef = useRef()

  useEffect(() => { if (initialTest) setSelTest(initialTest) }, [initialTest])
  useEffect(() => {
    if (patient) {
      setPInfo({ name: patient.name||'', age: patient.age||'', gender: patient.gender||'', civil:'', address: patient.address||'' })
      setLabInfo(p => ({ ...p, name: patient.name||'', age: patient.age||'', sex: patient.gender||'', address: patient.address||'' }))
    }
  }, [patient])

  if (!isOpen) return null

  const handlePrint = () => {
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Lab Result</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        .green-hdr { background: #1a6b2e; color: #fff; text-align: center; font-weight: 700; padding: 6px 12px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 7px; font-size: 11px; }
        th { background: #f0faf0; font-weight: 700; text-align: center; }
        .no-print { display: none; }
        .sig { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin-top: 24px; border-top: 1px solid #1a6b2e; padding-top: 12px; }
        .sig-line { border-bottom: 1px solid #333; height: 36px; margin-bottom: 4px; }
        .field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 12px; }
        .field-row label { font-weight: 600; min-width: 100px; }
        input { border: 1px solid #bbb; border-radius: 3px; padding: 2px 5px; font-size: 11px; }
        .lab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
      </style></head><body>
      <div style="text-align:center;border-bottom:3px solid #1a6b2e;padding-bottom:10px;margin-bottom:12px">
        <div style="font-weight:900;font-size:16px;color:#1a6b2e">MUNICIPAL HEALTH OFFICE</div>
        <div style="font-size:11px;color:#555">Lopez, Quezon — RHU Laboratory Result</div>
        <div style="font-size:10px;color:#888">Printed: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      ${printRef.current?.innerHTML || ''}
      </body></html>
    `)
    w.document.close()
    w.print()
  }

  const LabHeader = () => (
    <div style={{ border:'2px solid #1a6b2e', borderRadius:4, marginBottom:12 }}>
      <div style={{ background:'#1a6b2e', color:'#fff', padding:'5px 12px', fontWeight:700, fontSize:13, textAlign:'center' }}>Laboratory Department</div>
      <div style={{ padding:'10px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 18px' }}>
        <F label="Name" value={labInfo.name} onChange={v=>setLabInfo(p=>({...p,name:v}))} minLabelW={55}/>
        <F label="Date" value={labInfo.date} onChange={v=>setLabInfo(p=>({...p,date:v}))} type="date" width="130px" minLabelW={40}/>
        <F label="Address" value={labInfo.address} onChange={v=>setLabInfo(p=>({...p,address:v}))} minLabelW={55}/>
        <F label="Age" value={labInfo.age} onChange={v=>setLabInfo(p=>({...p,age:v}))} width="60px" minLabelW={40}/>
        <F label="Req. Physician" value={labInfo.reqPhys} onChange={v=>setLabInfo(p=>({...p,reqPhys:v}))} minLabelW={95}/>
        <F label="Sex" value={labInfo.sex} onChange={v=>setLabInfo(p=>({...p,sex:v}))} width="80px" minLabelW={40}/>
      </div>
    </div>
  )

  const SigFooter = () => (
    <div style={{ marginTop:16, borderTop:'1px solid #1a6b2e', paddingTop:10, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, textAlign:'center' }}>
      {['Medical Technologist','Req. Physician','Pathologist'].map(r => (
        <div key={r}><div style={{ borderBottom:'1px solid #333', height:36, marginBottom:4 }}/><div style={{ fontSize:11, color:'#555' }}>{r}</div></div>
      ))}
    </div>
  )

  const MS = {
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', justifyContent:'center', alignItems:'flex-start', zIndex:1000, padding:16, overflowY:'auto' },
    modal: { background:'#fff', width:'100%', maxWidth:880, borderRadius:8, fontFamily:'Arial,sans-serif', marginTop:8, marginBottom:8 },
    header: { background:'#1a6b2e', color:'#fff', padding:'9px 16px', fontWeight:700, fontSize:14, borderRadius:'8px 8px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' },
  }

  return (
    <div style={MS.overlay}>
      <div style={MS.modal}>
        {/* Header */}
        <div style={MS.header}>
          <span>Laboratory Result — {selTest}</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint} style={{ background:'#fff', color:'#1a6b2e', border:'none', borderRadius:5, padding:'5px 16px', fontWeight:700, fontSize:12, cursor:'pointer' }}>🖨 Print</button>
            <button onClick={() => setConfirm(true)} style={{ background:'#8B1A1A', color:'#fff', border:'none', borderRadius:5, padding:'5px 16px', fontWeight:700, fontSize:12, cursor:'pointer' }}>✕ Close</button>
          </div>
        </div>

        {/* Patient info + test selector */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:'2px solid #1a6b2e' }}>
          <div style={{ padding:'12px 16px', borderRight:'1px solid #ddd' }}>
            <div style={{ background:'#f0faf0', padding:'5px', textAlign:'center', fontWeight:700, fontSize:13, color:'#1a6b2e', borderRadius:4, marginBottom:8 }}>Patient Info</div>
            <F label="Name" value={pInfo.name} onChange={v=>setPInfo(p=>({...p,name:v}))} minLabelW={55}/>
            <div style={{ display:'flex', gap:10, marginBottom:5 }}>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <label style={{ fontSize:12, fontWeight:600 }}>Age:</label>
                <input value={pInfo.age} onChange={e=>setPInfo(p=>({...p,age:e.target.value}))} style={{ width:50, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:12, outline:'none' }}/>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <label style={{ fontSize:12, fontWeight:600 }}>Gender:</label>
                <input value={pInfo.gender} onChange={e=>setPInfo(p=>({...p,gender:e.target.value}))} style={{ width:55, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:12, outline:'none' }}/>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <label style={{ fontSize:12, fontWeight:600 }}>Civil:</label>
                <input value={pInfo.civil} onChange={e=>setPInfo(p=>({...p,civil:e.target.value}))} style={{ width:70, border:'1px solid #bbb', borderRadius:3, padding:'2px 5px', fontSize:12, outline:'none' }}/>
              </div>
            </div>
            <F label="Address" value={pInfo.address} onChange={v=>setPInfo(p=>({...p,address:v}))} minLabelW={55}/>
            <div style={{ marginTop:10 }}>
              <div style={{ fontWeight:600, fontSize:12, marginBottom:5 }}>Laboratory Test Request:</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {TESTS.map(t => (
                  <div key={t} onClick={() => setSelTest(t)} style={{ padding:'3px 10px', borderRadius:5, fontSize:11, cursor:'pointer', fontWeight:600, background: selTest===t ? '#1a6b2e' : '#f0f0f0', color: selTest===t ? '#fff' : '#333' }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding:'12px 16px' }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Laboratory Test</div>
            {TESTS.map(t => (
              <div key={t} onClick={() => setSelTest(t)} style={{ padding:'7px 10px', cursor:'pointer', borderRadius:5, marginBottom:3, background: selTest===t ? '#e8f5e9' : 'transparent', color: selTest===t ? '#1a6b2e' : '#333', fontWeight: selTest===t ? 700 : 400, fontSize:13, border: selTest===t ? '1px solid #1a6b2e' : '1px solid transparent' }}>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Printable form area */}
        <div ref={printRef} style={{ padding:'14px 22px', background:'#f5f7f5' }}>
          <LabHeader />
          {selTest === 'Fecalysis'          && <FecalysisForm data={fec} setData={setFec} />}
          {selTest === 'Urinalysis'          && <UrinalysisForm data={uri} setData={setUri} />}
          {selTest === 'Hematology'          && <HematologyForm data={hem} setData={setHem} />}
          {selTest === 'Clinical Chemistry'  && <ClinicalChemForm data={chem} setData={setChem} />}
          {selTest === 'Serology'            && <SerologyForm data={ser} setData={setSer} />}
          <SigFooter />
        </div>
      </div>

      {/* Confirm close */}
      {confirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:'28px 44px', textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,.25)' }}>
            <p style={{ fontSize:20, fontWeight:'bold', marginBottom:22 }}>Close without saving?</p>
            <button style={{ background:'#8B1A1A', color:'#fff', border:'none', padding:'8px 24px', borderRadius:6, fontSize:13, fontWeight:700, cursor:'pointer', marginRight:12 }} onClick={() => setConfirm(false)}>CANCEL</button>
            <button style={{ background:'#1a6b2e', color:'#fff', border:'none', padding:'8px 24px', borderRadius:6, fontSize:13, fontWeight:700, cursor:'pointer' }} onClick={() => { setConfirm(false); onClose() }}>DISCARD</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Add Patient Modal ── */
function AddPatientModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({ name:'', age:'', gender:'', address:'', contact:'', email:'', test:'Fecalysis' })
  const [saving, setSaving] = useState(false)
  if (!isOpen) return null

  const handleSave = () => {
    if (!form.name.trim()) { alert('Please enter a name.'); return }
    setSaving(true)
    setTimeout(() => { onSaved(form); setSaving(false); onClose() }, 400)
  }

  const inp = (label, key, type='text') => (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
      <label style={{ fontSize:13, fontWeight:600, minWidth:100 }}>{label}:</label>
      <input type={type} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={{ flex:1, border:'1px solid #aaa', borderRadius:3, padding:'4px 8px', fontSize:13, outline:'none' }}/>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', width:480, borderRadius:8, fontFamily:'Arial,sans-serif', overflow:'hidden' }}>
        <div style={{ background:'#1a6b2e', color:'#fff', padding:'10px 20px', fontSize:15, fontWeight:'bold', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Add Laboratory Patient</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:20, background:'#f5f7f5' }}>
          {inp('Full Name','name')}
          <div style={{ display:'flex', gap:12, marginBottom:7 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
              <label style={{ fontSize:13, fontWeight:600 }}>Age:</label>
              <input type="number" value={form.age} onChange={e=>setForm(p=>({...p,age:e.target.value}))} style={{ width:65, border:'1px solid #aaa', borderRadius:3, padding:'4px 6px', fontSize:13, outline:'none' }}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
              <label style={{ fontSize:13, fontWeight:600 }}>Gender:</label>
              <select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))} style={{ border:'1px solid #aaa', borderRadius:3, padding:'4px 6px', fontSize:13, outline:'none' }}>
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
          </div>
          {inp('Address','address')}
          {inp('Contact #','contact')}
          {inp('Email','email','email')}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Requested Test:</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {TESTS.map(t => (
                <div key={t} onClick={() => setForm(p=>({...p,test:t}))} style={{ padding:'4px 12px', borderRadius:5, fontSize:12, cursor:'pointer', fontWeight:600, background: form.test===t ? '#1a6b2e' : '#f0f0f0', color: form.test===t ? '#fff' : '#333' }}>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:14, paddingTop:12, borderTop:'2px solid #1a6b2e' }}>
            <button onClick={onClose} style={{ background:'#8B1A1A', color:'#fff', border:'none', padding:'8px 28px', borderRadius:4, fontSize:13, fontWeight:'bold', cursor:'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ background:'#1a6b2e', color:'#fff', border:'none', padding:'8px 28px', borderRadius:4, fontSize:13, fontWeight:'bold', cursor:'pointer', opacity: saving?0.7:1 }}>
              {saving ? 'Saving…' : 'Add Patient'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Dashboard ── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov']
const BAR_DATA = MONTHS.map((m,i) => ({ month:m, count:[12,18,8,24,31,19,42,37,28,53,61][i] }))
const PIE_COLORS = ['#0b6b2e','#82ca9d','#d1e7dd']
const PIE_DATA = [{ name:'Fecalysis', value:40 },{ name:'Urinalysis', value:35 },{ name:'Others', value:25 }]

function LabDashboard({ patients, onAddTest, onAddPatient, darkMode }) {
  const [labFilter, setLabFilter] = useState('Serology')
  const [showNotif, setShowNotif] = useState(false)
  const bg = darkMode ? '#0d1a0f' : '#f0f4f1'
  const cardBg = darkMode ? '#0f2014' : '#fff'

  return (
    <main style={{ padding:22, background:bg, minHeight:'100%' }}>
      <div style={{ marginBottom:22 }}>
        <p style={{ color: darkMode?'#3a6b48':'#aaa', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Laboratorian</p>
        <h1 style={{ fontSize:34, fontWeight:900, color: darkMode?'#4db86a':'#0b6b2e', margin:0 }}>Dashboard</h1>
      </div>

      {/* Analytics row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        <div style={{ background:'#147a3a', borderRadius:18, padding:'22px 26px', color:'#fff', position:'relative', overflow:'hidden', boxShadow:'0 4px 16px rgba(20,122,58,.25)' }}>
          <p style={{ fontSize:13, opacity:.9, margin:'0 0 4px' }}>Total Patient of the day</p>
          <h2 style={{ fontSize:60, fontWeight:900, margin:'0 0 4px', lineHeight:1 }}>{patients.length}</h2>
          <p style={{ fontSize:11, opacity:.65, margin:0 }}>Today, {new Date().toLocaleDateString('en-US')}</p>
          <svg style={{ position:'absolute', right:-10, bottom:-10, opacity:.08 }} width={100} height={100} viewBox="0 0 24 24" fill="white">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <div style={{ background: darkMode?'#0f2a18':'#d1e7dd', borderRadius:18, padding:14, display:'flex', flexDirection:'column', alignItems:'center' }}>
          <p style={{ fontSize:11, fontWeight:700, color: darkMode?'#4db86a':'#0b6b2e', textTransform:'uppercase', alignSelf:'flex-start', margin:'0 0 4px' }}>Other Analytics</p>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={PIE_DATA} innerRadius={32} outerRadius={48} paddingAngle={5} dataKey="value">
                {PIE_DATA.map((_,i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', gap:12 }}>
            {PIE_DATA.map((d,i) => (
              <div key={d.name} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:PIE_COLORS[i] }}/>
                <span style={{ color: darkMode?'#7ab88a':'#555' }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart + Pending */}
      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:18 }}>
        <div style={{ background:cardBg, borderRadius:16, padding:18, boxShadow:'0 2px 8px rgba(0,0,0,.07)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, color: darkMode?'#3a6b48':'#999', textTransform:'uppercase', letterSpacing:1 }}>PATIENT COUNT</div>
              <div style={{ fontWeight:800, fontSize:13, color: darkMode?'#4db86a':'#0b6b2e', letterSpacing:2 }}>{labFilter.toUpperCase()}</div>
            </div>
            <select value={labFilter} onChange={e=>setLabFilter(e.target.value)} style={{ border:'1px solid #ddd', borderRadius:5, padding:'3px 8px', fontSize:11, outline:'none', background: darkMode?'#0d2010':'#fff', color: darkMode?'#7ab88a':'#333' }}>
              {TESTS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={BAR_DATA} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#1a3320':'#f0f0f0'}/>
              <XAxis dataKey="month" tick={{ fontSize:10, fill: darkMode?'#7ab88a':'#999' }}/>
              <YAxis tick={{ fontSize:10, fill: darkMode?'#7ab88a':'#999' }}/>
              <Tooltip />
              <Bar dataKey="count" fill="#cc0000" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:cardBg, borderRadius:16, padding:18, boxShadow:'0 2px 8px rgba(0,0,0,.07)', display:'flex', flexDirection:'column', maxHeight:310 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontWeight:700, fontSize:13, color: darkMode?'#4db86a':'#0b6b2e' }}>Pending Patient</div>
            <button onClick={onAddPatient} style={{ background:'#1a7a1a', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>+ Add Test</button>
          </div>
          {patients.length === 0 ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc', fontSize:12 }}>No pending patients</div>
          ) : (
            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
              {patients.slice(0,8).map((p,i) => (
                <div key={p.id} onClick={() => onAddTest(p)} style={{ background: darkMode?'#0d2010':'#f8fdf8', border: darkMode?'1px solid #1a3320':'1px solid #e8f0e8', borderRadius:7, padding:'7px 10px', cursor:'pointer' }}>
                  <div style={{ fontWeight:600, fontSize:12, color: darkMode?'#c8e6c9':'#1a2e1a' }}>{p.name}</div>
                  <div style={{ fontSize:10, color: darkMode?'#7ab88a':'#888', marginTop:2 }}>{p.test} • {p.age ? p.age+' yrs' : '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

/* ── Patient Lab Records ── */
function PatientLabRecords({ patients, onAddPatient, onViewPatient, darkMode }) {
  const [selected, setSelected] = useState([])
  const [sortMode, setSortMode] = useState('none')
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [archivedIds, setArchivedIds] = useState([])

  let display = patients.filter(p => {
    const isArch = archivedIds.includes(p.id)
    if (showArchived && !isArch) return false
    if (!showArchived && isArch) return false
    if (!search) return true
    return (p.name||'').toLowerCase().includes(search.toLowerCase())
  })
  if (sortMode === 'az')   display = [...display].sort((a,b) => (a.name||'').localeCompare(b.name||''))
  if (sortMode === 'asc')  display = [...display].sort((a,b) => new Date(a.created) - new Date(b.created))
  if (sortMode === 'desc') display = [...display].sort((a,b) => new Date(b.created) - new Date(a.created))

  const allSel = display.length > 0 && display.every(p => selected.includes(p.id))
  const toggleAll = () => setSelected(allSel ? [] : display.map(p => p.id))
  const toggleOne = id => setSelected(s => s.includes(id) ? s.filter(x => x!==id) : [...s, id])
  const archiveSel = () => { setArchivedIds(p => [...new Set([...p, ...selected])]); setSelected([]) }

  const exportCSV = () => {
    const rows = display.map((p,i) => [i+1,p.name,p.age,p.gender,p.address,p.contact,p.email,p.test].join(','))
    const blob = new Blob([['No.,Name,Age,Sex,Address,Contact,Email,Test',...rows].join('\n')], { type:'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lab-patients.csv'; a.click()
  }

  const ROWS = 12
  const empties = Math.max(0, ROWS - display.length)

  const TBBtn = ({ label, active, fn }) => (
    <button onClick={fn} style={{ padding:'4px 11px', borderRadius:5, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', background: active?'#fff':'rgba(255,255,255,.2)', color: active?'#1a7a1a':'#fff', transition:'all .15s' }}>
      {label}
    </button>
  )

  return (
    <main style={{ padding:22, overflowY:'auto', background: darkMode?'#0d1a0f':'#f0f4f1', minHeight:'100%' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <p style={{ color: darkMode?'#3a6b48':'#aaa', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Laboratorian</p>
          <h1 style={{ fontSize:30, fontWeight:900, color: darkMode?'#4db86a':'#0b6b2e', margin:0 }}>Patient Laboratory Record</h1>
        </div>
        <button onClick={onAddPatient} style={{ background:'#1a7a1a', color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:5, boxShadow:'0 2px 8px rgba(26,122,26,.25)' }}>
          + Add Patient
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ background:'#1a7a1a', borderRadius:'10px 10px 0 0', padding:'9px 12px', display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
        <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer' }}>
          <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ width:13, height:13, accentColor:'#fff' }}/>
          <span style={{ color:'#fff', fontSize:11, fontWeight:600 }}>Select All</span>
        </label>
        <div style={{ width:1, height:14, background:'rgba(255,255,255,.3)', margin:'0 3px' }}/>
        <TBBtn label="Archive"            active={showArchived}  fn={() => { setShowArchived(p=>!p); setSelected([]) }}/>
        <TBBtn label="A-Z"                active={sortMode==='az'}   fn={() => setSortMode(s => s==='az'   ?'none':'az')}/>
        <TBBtn label="Ascending by Date"  active={sortMode==='asc'}  fn={() => setSortMode(s => s==='asc'  ?'none':'asc')}/>
        <TBBtn label="Descending by Date" active={sortMode==='desc'} fn={() => setSortMode(s => s==='desc' ?'none':'desc')}/>

        {/* Search */}
        <div style={{ position:'relative' }}>
          <svg style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)', borderRadius:5, padding:'4px 10px 4px 24px', color:'#fff', fontSize:11, outline:'none', width:150 }}/>
        </div>

        {selected.length > 0 && (
          <button onClick={archiveSel} style={{ padding:'4px 12px', borderRadius:5, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', background:'#facc15', color:'#713f12' }}>
            Archive ({selected.length})
          </button>
        )}

        <div style={{ flex:1 }}/>

        {/* Export */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowExport(p=>!p)} style={{ background:'#fff', color:'#1a7a1a', border:'none', borderRadius:5, padding:'5px 13px', fontWeight:700, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            ⬇ EXPORT ▾
          </button>
          {showExport && (
            <div style={{ position:'absolute', right:0, top:'110%', background:'#fff', border:'1px solid #e0e0e0', borderRadius:8, zIndex:99, minWidth:110, boxShadow:'0 4px 16px rgba(0,0,0,.12)', overflow:'hidden' }}>
              {[
                { label:'📊 Excel', fn: () => setShowExport(false) },
                { label:'📄 PDF',   fn: () => { window.print(); setShowExport(false) } },
                { label:'📋 CSV',   fn: () => { exportCSV(); setShowExport(false) } },
              ].map(({ label, fn }) => (
                <button key={label} onClick={fn} style={{ width:'100%', padding:'8px 14px', textAlign:'left', border:'none', background:'#fff', cursor:'pointer', fontSize:12, color:'#333', display:'block' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0faf0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: darkMode?'#0f2014':'#fff', borderRadius:'0 0 12px 12px', overflow:'auto', border:'2px solid #1a7a1a', borderTop:'none', boxShadow:'0 4px 12px rgba(0,0,0,.06)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background: darkMode?'#0a1a0d':'#f0faf0' }}>
              {['No.','Name','Age','Sex','Address','Contact No.','E-mail','Test',''].map((h,i) => (
                <th key={i} style={{ padding:'9px 10px', textAlign:'left', fontWeight:700, color: darkMode?'#4db86a':'#1a7a1a', borderBottom:'2px solid #1a5c1a', fontSize:11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((p,i) => (
              <tr key={p.id} onClick={() => toggleOne(p.id)}
                style={{ background: selected.includes(p.id) ? (darkMode?'#1a3d22':'#e8f5e9') : i%2===0 ? (darkMode?'#0f2014':'#fff') : (darkMode?'#0d1c11':'#fafff8'), borderBottom: darkMode?'1px solid #1a3320':'1px solid #e8f0e8', cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e => { if (!selected.includes(p.id)) e.currentTarget.style.background = darkMode?'#1a3d22':'#f5fff5' }}
                onMouseLeave={e => { e.currentTarget.style.background = selected.includes(p.id) ? (darkMode?'#1a3d22':'#e8f5e9') : i%2===0 ? (darkMode?'#0f2014':'#fff') : (darkMode?'#0d1c11':'#fafff8') }}
              >
                <td style={{ padding:'8px 10px', color: darkMode?'#3a6b48':'#999' }}>{i+1}</td>
                <td style={{ padding:'8px 10px', fontWeight:600, color: darkMode?'#c8e6c9':'#1a2e1a' }}>{p.name}</td>
                <td style={{ padding:'8px 10px', color: darkMode?'#a5d6a7':'#333' }}>{p.age||'—'}</td>
                <td style={{ padding:'8px 10px', color: darkMode?'#a5d6a7':'#333' }}>{p.gender||'—'}</td>
                <td style={{ padding:'8px 10px', color: darkMode?'#a5d6a7':'#333' }}>{p.address||'—'}</td>
                <td style={{ padding:'8px 10px', color: darkMode?'#a5d6a7':'#333' }}>{p.contact||'—'}</td>
                <td style={{ padding:'8px 10px', color: darkMode?'#a5d6a7':'#333' }}>{p.email||'—'}</td>
                <td style={{ padding:'8px 10px' }}>
                  <span style={{ padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600, background:'#e8f5e9', color:'#0b6b2e' }}>{p.test}</span>
                </td>
                <td style={{ padding:'8px 10px' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => onViewPatient(p)} style={{ padding:'3px 12px', borderRadius:5, fontSize:11, fontWeight:600, color:'#fff', border:'none', background:'#1a7a1a', cursor:'pointer' }}>View</button>
                </td>
              </tr>
            ))}
            {Array.from({ length: empties }).map((_,i) => (
              <tr key={'e'+i} style={{ background: (display.length+i)%2===0 ? (darkMode?'#0f2014':'#fff') : (darkMode?'#0d1c11':'#fafff8'), borderBottom: darkMode?'1px solid #1a3320':'1px solid #e8f0e8' }}>
                <td style={{ padding:'8px 10px', color: darkMode?'#1a3320':'#ddd' }}>{display.length+i+1}</td>
                {Array(8).fill(null).map((_,j) => <td key={j} style={{ padding:'8px 10px' }}/>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

/* ── Main Page ── */
let _nextId = 2

export default function LaboratoryPage() {
  const [activeMenu,  setActiveMenu]  = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode,    setDarkMode]    = useState(false)
  const [patients,    setPatients]    = useState([
    { id:1, name:'Rivera, Lovely Gift R.', age:'22', gender:'F', address:'Lam Ong Villa Rota, Gumaca Quezon', contact:'09876543210', email:'youremail@gmail.com', test:'Serology', created: new Date().toISOString() }
  ])
  const [addOpen, setAddOpen] = useState(false)
  const [labForm, setLabForm] = useState({ open:false, patient:null, test:'Fecalysis' })
  const [showNotif, setShowNotif] = useState(false)

  const openLab = (p, t) => setLabForm({ open:true, patient: p||null, test: t || 'Fecalysis' })

  const addPatient = (f) => {
    setPatients(p => [...p, {
      id: _nextId++,
      name: f.name, age: f.age, gender: f.gender,
      address: f.address, contact: f.contact, email: f.email,
      test: f.test, created: new Date().toISOString()
    }])
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) window.location.href = '/login'
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: darkMode?'#0d1a0f':'#f0f4f1', fontFamily:"'Segoe UI',sans-serif" }}>
      <LabSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} sidebarOpen={sidebarOpen} onLogout={handleLogout} darkMode={darkMode}/>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>
        {/* TOPBAR */}
        <header style={{ background:'#1b3a1b', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px', position:'sticky', top:0, zIndex:40, boxShadow:'0 1px 6px rgba(0,0,0,.25)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setSidebarOpen(o=>!o)} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:8, width:38, height:38, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={{ position:'relative' }}>
              <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input placeholder="Search patients, lab tests..." style={{ width:280, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', borderRadius:50, padding:'9px 18px 9px 38px', color:'#fff', fontSize:13, outline:'none' }}/>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Bell */}
            <div style={{ position:'relative' }}>
              <button onClick={() => setShowNotif(p=>!p)} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:'50%', width:38, height:38, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <span style={{ position:'absolute', top:7, right:7, width:8, height:8, background:'#ff4444', borderRadius:'50%', border:'2px solid #1b3a1b' }}/>
              </button>
              {showNotif && (
                <div style={{ position:'absolute', right:0, top:'115%', background:'#fff', border:'1px solid #e0e0e0', borderRadius:8, minWidth:200, boxShadow:'0 4px 16px rgba(0,0,0,.15)', zIndex:100 }}>
                  <div style={{ padding:'8px 14px', fontWeight:700, fontSize:13, borderBottom:'1px solid #eee' }}>Notification</div>
                  <div style={{ padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                    <span>Lab Request</span>
                    <span style={{ background:'#e8f5e9', color:'#0b6b2e', padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700 }}>1 new</span>
                  </div>
                  <div style={{ padding:'4px 14px 10px', fontSize:11, color:'#888' }}>No other notifications</div>
                </div>
              )}
            </div>

            {/* Dark mode */}
            <button onClick={() => setDarkMode(d=>!d)} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:'50%', width:38, height:38, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {darkMode
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              }
            </button>

            {/* User pill */}
            <div style={{ display:'flex', alignItems:'center', gap:9, background:'rgba(255,255,255,.12)', borderRadius:50, padding:'5px 16px 5px 5px' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#2ea82e,#1a7a1a)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>L</div>
              <div>
                <div style={{ color:'#fff', fontWeight:600, fontSize:13, lineHeight:1.2 }}>Name</div>
                <div style={{ color:'rgba(255,255,255,.55)', fontSize:10, textTransform:'uppercase', letterSpacing:.5 }}>Laboratorian</div>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {activeMenu === 'Dashboard' && (
            <LabDashboard
              patients={patients}
              onAddTest={p => openLab(p, p?.test)}
              onAddPatient={() => setAddOpen(true)}
              darkMode={darkMode}
            />
          )}
          {activeMenu === 'Patient Laboratory Records' && (
            <PatientLabRecords
              patients={patients}
              onAddPatient={() => setAddOpen(true)}
              onViewPatient={p => openLab(p, p.test)}
              darkMode={darkMode}
            />
          )}
          {activeMenu === 'Settings' && (
            <div style={{ padding:32, background: darkMode?'#0d1a0f':'#f0f4f1', minHeight:'100%' }}>
              <p style={{ color: darkMode?'#3a6b48':'#aaa', fontSize:12, textTransform:'uppercase', marginBottom:4 }}>Laboratorian</p>
              <h1 style={{ fontSize:32, fontWeight:800, color: darkMode?'#4db86a':'#1a7a1a' }}>Settings</h1>
              <p style={{ color: darkMode?'#7ab88a':'#666', marginTop:12 }}>Settings page coming soon.</p>
            </div>
          )}
          {activeMenu === 'Help' && (
            <div style={{ padding:32, background: darkMode?'#0d1a0f':'#f0f4f1', minHeight:'100%' }}>
              <p style={{ color: darkMode?'#3a6b48':'#aaa', fontSize:12, textTransform:'uppercase', marginBottom:4 }}>Laboratorian</p>
              <h1 style={{ fontSize:32, fontWeight:800, color: darkMode?'#4db86a':'#1a7a1a' }}>Help</h1>
              <p style={{ color: darkMode?'#7ab88a':'#666', marginTop:12 }}>Help & documentation coming soon.</p>
            </div>
          )}
        </div>
      </div>

      <AddPatientModal isOpen={addOpen} onClose={() => setAddOpen(false)} onSaved={f => { addPatient(f); setAddOpen(false) }}/>
      <LabFormModal isOpen={labForm.open} onClose={() => setLabForm(p=>({...p,open:false}))} patient={labForm.patient} initialTest={labForm.test}/>
    </div>
  )
}
