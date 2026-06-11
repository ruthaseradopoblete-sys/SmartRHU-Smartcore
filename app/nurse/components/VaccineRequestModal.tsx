'use client'
import { useState } from 'react'
import styles from './nurse.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

export default function VaccineRequestModal({ open, onClose }: Props) {
  const [vaccine,  setVaccine]  = useState('')
  const [quantity, setQuantity] = useState('')
  const [urgency,  setUrgency]  = useState('routine')
  const [notes,    setNotes]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)

  async function handleSend() {
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setLoading(false)
    setTimeout(() => {
      setSent(false)
      onClose()
      setVaccine('')
      setQuantity('')
      setNotes('')
    }, 1500)
  }

  if (!open) return null

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>💉 Send Vaccine / Vial Request</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <p style={{ fontWeight: 700, color: '#16a34a', marginTop: 12 }}>Request Sent!</p>
            </div>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Vaccine / Vial</label>
                <select
                  className={styles.modalInput}
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

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Quantity (vials)</label>
                  <input
                    className={styles.modalInput}
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Urgency</label>
                  <select
                    className={styles.modalInput}
                    value={urgency}
                    onChange={e => setUrgency(e.target.value)}
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Notes / Reason</label>
                <textarea
                  className={`${styles.modalInput} ${styles.modalTextarea}`}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>
            </>
          )}
        </div>

        {!sent && (
          <div className={styles.modalFooter}>
            <button className={styles.btnCancel} onClick={onClose}>
              CANCEL
            </button>
            <button
              className={styles.btnConfirm}
              onClick={handleSend}
              disabled={!vaccine || !quantity || loading}
              style={{ opacity: !vaccine || !quantity ? 0.5 : 1 }}
            >
              {loading ? 'Sending…' : 'SEND REQUEST'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
