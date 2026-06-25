'use client'
import React, { useState } from 'react'

const C = {
  green:      '#16a34a',
  greenDark:  '#0d3b1f',
  greenMid:   '#166534',
  greenLight: '#dcfce7',
  mint:       '#4ade80',
  bg:         '#f0f7f2',
  surface:    '#ffffff',
  surface2:   '#f6faf7',
  border:     'rgba(22,163,74,0.15)',
  text:       '#0a2912',
  text2:      '#4b6557',
  text3:      '#9ca3af',
  shadow:     '0 2px 16px rgba(13,59,31,0.08)',
  radius:     16,
  radiusSm:   8,
} as const

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
        background: C.surface,
        borderRadius: C.radius,
        width: '100%', maxWidth: 620,
        maxHeight: '94vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(13,59,31,0.25)',
        overflow: 'hidden',
        border: `1px solid ${C.border}`,
      }}>

        {/* ── Header ── */}
        <div style={{
          background: C.greenDark,
          padding: '22px 28px', textAlign: 'center', flexShrink: 0,
          borderBottom: `2px solid ${C.mint}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <img
              src="/logo.jpg"
              alt="MHO Lopez Logo"
              style={{
                width: 64, height: 64, objectFit: 'contain',
                borderRadius: '50%',
                border: `2px solid rgba(74,222,128,0.4)`,
              }}
            />
          </div>
          <p style={{
            color: C.mint, margin: '0 0 2px',
            fontSize: 11, letterSpacing: 1.5,
            textTransform: 'uppercase', fontWeight: 700,
          }}>
            Republic of the Philippines
          </p>
          <p style={{
            color: C.mint, margin: '0 0 10px',
            fontSize: 11, letterSpacing: 1.2,
            textTransform: 'uppercase', fontWeight: 700,
            opacity: 0.85,
          }}>
            Municipal Health Office — Lopez, Quezon
          </p>
          <h2 style={{
            color: '#ffffff', margin: '0 0 4px',
            fontSize: 19, fontWeight: 900, letterSpacing: 0.4,
          }}>
            DATA PRIVACY CONSENT FORM
          </h2>
          <p style={{
            color: C.greenLight, margin: 0,
            fontSize: 11.5, letterSpacing: 0.3, opacity: 0.9,
          }}>
            Pursuant to Republic Act No. 10173 — Data Privacy Act of 2012
          </p>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, background: C.bg }}>

          {/* Notice box */}
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: C.radiusSm,
            padding: '20px 22px', marginBottom: 20,
            boxShadow: C.shadow,
          }}>
            <p style={{
              margin: '0 0 14px', fontSize: 11, color: C.text2,
              textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: 700,
              borderBottom: `1px solid ${C.border}`, paddingBottom: 10,
            }}>
              Notice of Data Collection and Processing
            </p>

            <p style={{ margin: '0 0 12px', fontSize: 13, color: C.text, lineHeight: 1.75, textAlign: 'justify' }}>
              The Municipal Health Office of Lopez, Quezon collects and processes personal and health
              information to provide healthcare services, maintain medical records, support public health
              programs, and comply with applicable government requirements.
            </p>

            <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.75, textAlign: 'justify' }}>
              All information provided shall be treated with strict confidentiality and protected in
              accordance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012.
              Access to personal data is limited to authorized personnel and will only be disclosed when
              required by law or for legitimate public health purposes.
            </p>
          </div>

          {/* Consent checkbox */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer',
            background: checked ? C.greenLight : C.surface,
            border: `2px solid ${checked ? C.green : C.border}`,
            borderRadius: C.radiusSm, padding: '16px 18px',
            transition: 'all 0.2s',
            boxShadow: checked ? `0 0 0 3px rgba(22,163,74,0.12)` : C.shadow,
          }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              style={{
                marginTop: 3, accentColor: C.green,
                width: 17, height: 17, flexShrink: 0, cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: 12.5, color: C.text, lineHeight: 1.75 }}>
              I, the undersigned patient or authorized representative, have read and understood this
              Privacy Notice and voluntarily consent to the collection, use, storage, and processing
              of my personal and health information by the Municipal Health Office of Lopez, Quezon
              in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).
            </span>
          </label>

          {/* Helper note */}
          <p style={{
            margin: '12px 0 0', fontSize: 11.5, color: C.text3,
            textAlign: 'center', fontStyle: 'italic',
          }}>
            You must check the box above to proceed with patient registration.
          </p>
        </div>

        {/* ── Footer Buttons ── */}
        <div style={{
          padding: '16px 28px',
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
          display: 'flex', gap: 12,
          background: C.surface2,
          alignItems: 'center',
        }}>
          <button
            onClick={onDecline}
            style={{
              flex: 1, padding: '11px 0',
              borderRadius: C.radiusSm, fontSize: 13, fontWeight: 700,
              border: `1.5px solid ${C.border}`,
              background: C.surface, color: C.text2,
              cursor: 'pointer', transition: 'all 0.15s', letterSpacing: 0.2,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#fca5a5'
              e.currentTarget.style.color = '#dc2626'
              e.currentTarget.style.background = '#fff1f2'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.border
              e.currentTarget.style.color = C.text2
              e.currentTarget.style.background = C.surface
            }}
          >
            Decline
          </button>
          <button
            onClick={() => { if (checked) onAccept() }}
            disabled={!checked}
            style={{
              flex: 2, padding: '11px 0',
              borderRadius: C.radiusSm, fontSize: 13, fontWeight: 800,
              border: 'none', cursor: checked ? 'pointer' : 'not-allowed',
              background: checked ? C.green : C.border,
              color: checked ? '#ffffff' : C.text3,
              boxShadow: checked ? `0 4px 16px rgba(22,163,74,0.30)` : 'none',
              transition: 'all 0.2s', letterSpacing: 0.2,
            }}
            onMouseEnter={e => {
              if (checked) e.currentTarget.style.background = C.greenMid
            }}
            onMouseLeave={e => {
              if (checked) e.currentTarget.style.background = C.green
            }}
          >
            ✓ I Agree
          </button>
        </div>

      </div>
    </div>
  )
}