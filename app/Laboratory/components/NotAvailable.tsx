'use client'
import React, { useEffect } from 'react'
import { generateLabRequestPDF } from '@/lib/Generatelabrequestpdf'

export default function NotAvailable({ patient = {}, onClose }) {
  const name    = patient.name    || ''
  const age     = patient.age     || ''
  const gender  = patient.gender  || ''
  const civil   = patient.civil   || ''
  const address = patient.address || ''
  const date    = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
  const tests   = patient.tests   || {}

  const handlePrint = () => {
    generateLabRequestPDF({
      patientName: name,
      age,
      gender,
      civilStatus: civil,
      address,
      date,

      hgb_hct: !!tests.hgb_hct,
      cbc_with_platelet: !!tests.cbc_with_platelet,
      pt_ptt: !!tests.pt_ptt,
      random_blood_sugar: !!tests.random_blood_sugar,
      fasting_blood_sugar: !!tests.fasting_blood_sugar,
      cholesterol: !!tests.cholesterol,
      triglycerides: !!tests.triglycerides,
      lipid_profile: !!tests.lipid_profile,
      blood_uric_acid: !!tests.blood_uric_acid,
      bun: !!tests.bun,
      creatinine: !!tests.creatinine,
      sgpt_alt: !!tests.sgpt_alt,
      sgot_ast: !!tests.sgot_ast,
      serum_na_k_cl: !!tests.serum_na_k_cl,

      urinalysis: !!tests.urinalysis,
      fecalysis: !!tests.fecalysis,
      pregnancy_test: !!tests.pregnancy_test,

      abo_rh_blood_typing: !!tests.abo_rh_blood_typing,
      dengue_ns1: !!tests.dengue_ns1,
      dengue_igg_igm: !!tests.dengue_igg_igm,
      typhidot_igg_igm: !!tests.typhidot_igg_igm,
      hbsag: !!tests.hbsag,
      ecg_12_lead: !!tests.ecg_12_lead,
      gene_xpert: !!tests.gene_xpert,

      afb_dssm: !!tests.afb_dssm,
      culture_and_sensitivity: !!tests.culture_and_sensitivity,

      ultrasound: tests.ultrasound || undefined,
      xray: tests.xray || undefined,
      others: tests.others || undefined,
    })
  }

  // Auto-generate as soon as this modal mounts
  useEffect(() => {
    handlePrint()
  }, [])

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:3000, padding:16,
    }}>
      <div style={{
        background:'#fff', borderRadius:16, overflow:'hidden',
        boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
        width:'100%', maxWidth:380,
      }}>
        <div style={{
          background:'linear-gradient(135deg,#064e3b,#15803d)',
          padding:'14px 20px',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:13 }}>Laboratory Request Form</div>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11, marginTop:2 }}>
              {name} — {date}
            </div>
          </div>
        </div>

        <div style={{ padding:'20px', textAlign:'center' }}>
          <div style={{ fontSize:13, color:'#374151', marginBottom:16 }}>
            Generating the laboratory request form for printing. If a print window did not open, allow pop-ups or click below.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={handlePrint} style={{
              background:'#1a6b3a', color:'#fff', border:'none',
              borderRadius:8, padding:'9px 18px', fontWeight:700,
              fontSize:13, cursor:'pointer',
            }}>
              🖨 Print Again
            </button>
            <button onClick={onClose} style={{
              background:'#fff', color:'#374151', border:'1px solid #d1d5db',
              borderRadius:8, padding:'9px 18px', fontWeight:700,
              fontSize:13, cursor:'pointer',
            }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}