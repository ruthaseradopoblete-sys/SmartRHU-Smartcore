'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './nurse.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

export default function VaccineRequestModal({ open, onClose }: Props) {
  const [vaccine,   setVaccine]   = useState('')
  const [dosage,    setDosage]    = useState('')
  const [quantity,  setQuantity]  = useState('')
  const [urgency,   setUrgency]   = useState('routine')
  const [notes,     setNotes]     = useState('')
  const [nurseName, setNurseName] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setNurseName(user.user_metadata?.full_name ?? user.email ?? 'Unknown Nurse')
      }
    }
    if (open) fetchUser()
  }, [open])

  function reset() {
    setVaccine('')
    setDosage('')
    setQuantity('')
    setUrgency('routine')
    setNotes('')
    setError(null)
  }

  async function handleSend() {
    setLoading(true)
    setError(null)

    const { error: insertError } = await supabase
      .from('nurse_vaccine_requests')
      .insert({
        nurse_name:   nurseName,
        vaccine_name: vaccine,
        dosage:       dosage || 'N/A',
        quantity:     parseInt(quantity, 10),
        urgency,
        notes:        notes || null,
        status:       'pending',
      })

    setLoading(false)

    if (insertError) {
      console.error(insertError)
      setError('Failed to send request. Please try again.')
      return
    }

    setSent(true)
    setTimeout(() => {
      setSent(false)
      onClose()
      reset()
    }, 1500)
  }

  if (!open) return null

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    color: '#111827',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  }

  const fieldStyle: React.CSSProperties = {
    marginBottom: 14,
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 460,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
            💉 Send Vaccine / Vial Request
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: '#6b7280',
              lineHeight: 1,
              padding: 4,
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <p style={{ fontWeight: 700, color: '#16a34a', marginTop: 12 }}>Request Sent!</p>
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 14,
                  color: '#dc2626',
                  fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              {/* Vaccine */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Vaccine / Vial</label>
                <select
                  style={inputStyle}
                  value={vaccine}
                  onChange={e => setVaccine(e.target.value)}
                >
                  <option value="">Select vaccine...</option>
                  <option>BCG</option>
                  <option>Hepatitis B</option>
                  <option>Pentavalent (DPT-HepB-Hib)</option>
                  <option>Oral Polio Vaccine (OPV)</option>
                  <option>Inactivated Polio Vaccine (IPV)</option>
                  <option>Measles-Rubella (MR)</option>
                  <option>Pneumococcal Conjugate (PCV)</option>
                  <option>Tetanus Toxoid (TT)</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Dosage + Quantity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Dosage / Form</label>
                  <input
                    style={inputStyle}
                    type="text"
                    value={dosage}
                    onChange={e => setDosage(e.target.value)}
                    placeholder="e.g. 0.5mL / vial"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Quantity (vials)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="e.g. 10"
                  />
                </div>
              </div>

              {/* Urgency */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Urgency</label>
                <select
                  style={inputStyle}
                  value={urgency}
                  onChange={e => setUrgency(e.target.value)}
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              {/* Notes */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Notes / Reason</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <div style={{
            display: 'flex',
            gap: 12,
            padding: '16px 24px',
            borderTop: '1px solid #f0f0f0',
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              CANCEL
            </button>
            <button
              onClick={handleSend}
              disabled={!vaccine || !quantity || loading}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                background: !vaccine || !quantity ? '#fca5a5' : '#ef4444',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: !vaccine || !quantity ? 'not-allowed' : 'pointer',
                opacity: !vaccine || !quantity ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Sending…' : 'SEND REQUEST'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}