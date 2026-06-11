'use client'
import { useState } from 'react'
import styles from './nurse.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

export default function PrescriptionModal({ open, onClose }: Props) {
  const [patient,  setPatient]  = useState('')
  const [medicine, setMedicine] = useState('')
  const [dosage,   setDosage]   = useState('')
  const [freq,     setFreq]     = useState('')
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
      setPatient('')
      setMedicine('')
      setDosage('')
      setFreq('')
      setNotes('')
    }, 1500)
  }

  if (!open) return null

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>✉ Send Prescription</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <p style={{ fontWeight: 700, color: '#16a34a', marginTop: 12 }}>Prescription Sent!</p>
            </div>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Patient Name</label>
                <input
                  className={styles.modalInput}
                  type="text"
                  value={patient}
                  onChange={e => setPatient(e.target.value)}
                  placeholder="e.g. Maria Santos"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Medicine / Drug Name</label>
                <input
                  className={styles.modalInput}
                  type="text"
                  value={medicine}
                  onChange={e => setMedicine(e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg"
                />
              </div>

              <div className={styles.formRow2}>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Dosage</label>
                  <input
                    className={styles.modalInput}
                    type="text"
                    value={dosage}
                    onChange={e => setDosage(e.target.value)}
                    placeholder="e.g. 1 tablet"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Frequency</label>
                  <input
                    className={styles.modalInput}
                    type="text"
                    value={freq}
                    onChange={e => setFreq(e.target.value)}
                    placeholder="e.g. 3x a day"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Notes / Instructions</label>
                <textarea
                  className={`${styles.modalInput} ${styles.modalTextarea}`}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional instructions..."
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
              disabled={!patient || !medicine || loading}
              style={{ opacity: !patient || !medicine ? 0.5 : 1 }}
            >
              {loading ? 'Sending…' : 'SEND PRESCRIPTION'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
