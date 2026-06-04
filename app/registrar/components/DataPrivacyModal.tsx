'use client'
import React, { useState } from 'react'

const GREEN = '#16a34a'
const TEAL  = '#0d9488'

interface Props {
  isOpen:    boolean
  onAccept:  () => void
  onDecline: () => void
}

export default function DataPrivacyModal({ isOpen, onAccept, onDecline }: Props) {
  const [checked, setChecked] = useState(false)

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620,
        maxHeight: '94vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${GREEN}, ${TEAL})`,
          padding: '22px 28px', textAlign: 'center', flexShrink: 0,
        }}>
          {/* Seal-style icon row */}
         <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
  <img src="/logo.jpg" alt="MHO Lopez Logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)' }} />
</div>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: '0 0 4px', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>
            Republic of the Philippines
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: '0 0 10px', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>
            Municipal Health Office — Lopez, Quezon
          </p>
          <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: 19, fontWeight: 900, letterSpacing: 0.4 }}>
            DATA PRIVACY CONSENT FORM
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: 11.5, letterSpacing: 0.3 }}>
            Pursuant to Republic Act No. 10173 — Data Privacy Act of 2012
          </p>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, background: '#f9fafb' }}>

          {/* Notice box */}
          <div style={{
            background: '#fff', border: '1px solid #d1d5db',
            borderRadius: 10, padding: '20px 22px', marginBottom: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <p style={{
              margin: '0 0 14px', fontSize: 11, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: 700,
              borderBottom: '1px solid #e5e7eb', paddingBottom: 10,
            }}>
              Notice of Data Collection and Processing
            </p>

            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#111827', lineHeight: 1.75, textAlign: 'justify' }}>
              The Municipal Health Office of Lopez, Quezon collects and processes personal and health information to provide healthcare services, maintain medical records, support public health programs, and comply with applicable government requirements.
            </p>

            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#111827', lineHeight: 1.75, textAlign: 'justify' }}>
All information provided shall be treated with strict confidentiality and protected in accordance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012. Access to personal data is limited to authorized personnel and will only be disclosed when required by law or for legitimate public health purposes.
            </p>
          </div>

          {/* Consent checkbox */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer',
            background: checked ? '#f0fdf4' : '#fff',
            border: `2px solid ${checked ? GREEN : '#d1d5db'}`,
            borderRadius: 10, padding: '16px 18px',
            transition: 'all 0.2s',
            boxShadow: checked ? '0 0 0 3px rgba(22,163,74,0.12)' : 'none',
          }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              style={{ marginTop: 3, accentColor: GREEN, width: 17, height: 17, flexShrink: 0, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12.5, color: '#1f2937', lineHeight: 1.75 }}>
              I, the undersigned patient or authorized representative, have read and understood this Privacy Notice and voluntarily consent to the collection, use, storage, and processing of my personal and health information by the Municipal Health Office of Lopez, Quezon in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).

            </span>
          </label>

          {/* Helper note */}
          <p style={{ margin: '12px 0 0', fontSize: 11.5, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>
            You must check the box above to proceed with patient registration.
          </p>
        </div>

        {/* ── Footer Buttons ── */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid #e5e7eb', flexShrink: 0,
          display: 'flex', gap: 12, background: '#fff',
          alignItems: 'center',
        }}>
          <button
            onClick={onDecline}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: '1.5px solid #d1d5db', background: '#fff', color: '#6b7280',
              cursor: 'pointer', transition: 'all 0.15s', letterSpacing: 0.2,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280' }}
          >
            Decline
          </button>
          <button
            onClick={() => { if (checked) onAccept() }}
            disabled={!checked}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 8, fontSize: 13, fontWeight: 800,
              border: 'none', cursor: checked ? 'pointer' : 'not-allowed',
              background: checked ? `linear-gradient(135deg, ${GREEN}, ${TEAL})` : '#e5e7eb',
              color: checked ? '#fff' : '#9ca3af',
              boxShadow: checked ? '0 4px 16px rgba(22,163,74,0.35)' : 'none',
              transition: 'all 0.2s', letterSpacing: 0.2,
            }}
          >
            ✓ I Agree
          </button>
        </div>

      </div>
    </div>
  )
}