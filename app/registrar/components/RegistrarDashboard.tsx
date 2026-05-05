'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const PIE_COLORS = ['#0b6b2e','#82ca9d','#d1e7dd','#f0f0f0']
const pieData    = [{ name:'A', value:400 },{ name:'B', value:300 },{ name:'C', value:300 }]

function MiniDonut({ title, darkMode = false }: { title: string; darkMode?: boolean }) {
  return (
    <div style={{
      background: darkMode ? '#0f2a18' : '#d1e7dd', borderRadius:16, padding:12,
      display:'flex', flexDirection:'column', alignItems:'center',
    }}>
      <p style={{ fontSize:10, fontWeight:700, color: darkMode ? '#4db86a' : '#0b6b2e', marginBottom:6, textTransform:'uppercase', textAlign:'center' }}>
        {title}
      </p>
      <ResponsiveContainer width="100%" height={80}>
        <PieChart>
          <Pie data={pieData} innerRadius={25} outerRadius={35} paddingAngle={5} dataKey="value">
            {pieData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

interface Props {
  onAddPatient: () => void
  darkMode: boolean
}

export default function RegistrarDashboard({ onAddPatient, darkMode }: Props) {
  const [totalPatients, setTotalPatients] = useState(0)

  useEffect(() => {
    supabase
      .from('patients')
      .select('id', { count:'exact', head:true })
      .then(({ count }) => { if (count !== null) setTotalPatients(count) })
  }, [])

  return (
    <main style={{ flex:1, padding:24, overflowY:'auto', background: darkMode ? '#0d1a0f' : '#f0f4f1' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28 }}>
        <div>
          <p style={{ color: darkMode ? '#3a6b48' : '#aaa', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Registrar</p>
          <h1 style={{ fontSize:36, fontWeight:900, color: darkMode ? '#4db86a' : '#0b6b2e', margin:0 }}>Dashboard</h1>
        </div>
        <button onClick={onAddPatient} style={{ background:'#0b6b2e', color:'#fff', border:'none', borderRadius:50, padding:'10px 24px', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:14, boxShadow:'0 4px 12px rgba(11,107,46,0.3)' }}>
          <Plus size={18} /> Add Patient
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, marginBottom:24 }}>
        <div style={{ background:'#147a3a', borderRadius:24, padding:'28px 32px', color:'#fff', position:'relative', overflow:'hidden', boxShadow:'0 4px 16px rgba(20,122,58,0.25)' }}>
          <p style={{ fontSize:13, fontWeight:500, opacity:0.9, margin:'0 0 6px' }}>Total Patient of the day</p>
          <h2 style={{ fontSize:64, fontWeight:900, margin:'0 0 4px', lineHeight:1 }}>{totalPatients}</h2>
          <p style={{ fontSize:11, opacity:0.65, margin:0 }}>Today, {new Date().toLocaleDateString('en-US')}</p>
          <svg style={{ position:'absolute', right:-10, bottom:-10, opacity:0.08 }} width="100" height="100" viewBox="0 0 24 24" fill="white">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>

        <div style={{ background: darkMode ? '#0f2a18' : '#d1e7dd', borderRadius:24, padding:20, display:'flex', flexDirection:'column', alignItems:'center' }}>
          <p style={{ fontSize:11, fontWeight:700, color: darkMode ? '#4db86a' : '#0b6b2e', textTransform:'uppercase', alignSelf:'flex-start', margin:'0 0 8px' }}>Monthly Patient</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: darkMode ? '#0f2a18' : '#d1e7dd', borderRadius:24, padding:20, display:'flex', flexDirection:'column', alignItems:'center' }}>
          <p style={{ fontSize:11, fontWeight:700, color: darkMode ? '#4db86a' : '#0b6b2e', textTransform:'uppercase', alignSelf:'flex-start', margin:'0 0 8px' }}>Yearly Patient</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
        <div style={{ background: darkMode ? '#0f2014' : '#fff', borderRadius:24, padding:24, boxShadow:'0 2px 8px rgba(0,0,0,0.12)' }}>
          <h3 style={{ textAlign:'center', fontWeight:700, color: darkMode ? '#4db86a' : '#2d3748', marginBottom:20, letterSpacing:2, textTransform:'uppercase', fontSize:13 }}>Schedule</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', border: darkMode ? '1px solid #1a3320' : '1px solid #f0f0f0', borderRadius:16, overflow:'hidden' }}>
            {[
              { day:'Monday',    consult:'General Consultation'           },
              { day:'Tuesday',   consult:'Pediatric Consultation'         },
              { day:'Wednesday', consult:'Pregnancy Consultation'         },
              { day:'Thursday',  consult:'Teenage Pregnancy Consultation' },
              { day:'Friday',    consult:'Mental Health Consultation'     },
            ].map(({ day, consult }, i) => (
              <div key={day} style={{ borderRight: i < 4 ? (darkMode ? '1px solid #1a3320' : '1px solid #f0f0f0') : 'none' }}>
                <div style={{ background: darkMode ? '#0a1a0d' : '#f9fafb', padding:'10px 4px', textAlign:'center', fontSize:10, fontWeight:700, borderBottom: darkMode ? '1px solid #1a3320' : '1px solid #f0f0f0', color: darkMode ? '#4db86a' : '#555' }}>
                  {day}
                </div>
                <div style={{ padding:'16px 8px', minHeight:120, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', fontSize:11, color: darkMode ? '#7ab88a' : '#666', lineHeight:1.5 }}>
                  {consult}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <MiniDonut title="Pediatric Patient (Monthly)"     darkMode={darkMode} />
          <MiniDonut title="Pregnant Patient (Monthly)"      darkMode={darkMode} />
          <MiniDonut title="Teenage Pregnancy (Monthly)"     darkMode={darkMode} />
          <MiniDonut title="Mental Health patient (Monthly)" darkMode={darkMode} />
        </div>
      </div>
    </main>
  )
}