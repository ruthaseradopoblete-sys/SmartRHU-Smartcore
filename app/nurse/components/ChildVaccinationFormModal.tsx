'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import './childvaccform.css'

// ── Shape of the vaccine order row this form is attached to ──────────────
interface VaccineOrderLite {
  id:              string
  patient_id:      string
  patient_name:    string | null
  patient_age:     number | null
  patient_gender:  string | null
}

interface Props {
  open:      boolean
  order:     VaccineOrderLite | null
  nurseName: string
  onClose:   () => void
  onSaved?:  () => void
}

type DoseDates = (string | null)[]
interface OtherVaccineRow { name: string; dates: DoseDates }
interface OtherVaccineCardRow {
  vaccine_type: string
  dose1_date: string; dose1_vaccinator: string
  dose2_date: string; dose2_vaccinator: string
  dose3_date: string; dose3_vaccinator: string
}

const emptyDoseDates = (): DoseDates => [null, null, null, null, null, null]

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS — defined OUTSIDE the main component so React does NOT
// create a new component type on every render. Defining them inside caused
// inputs to unmount/remount on every keystroke, losing focus and making it
// impossible to type continuously.
// ══════════════════════════════════════════════════════════════════════════════

const Field = ({
  label, value, onChange, type = 'text', placeholder, className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
}) => (
  <div className={`eccd-field ${className ?? ''}`}>
    <label className="eccd-field-label">{label}</label>
    <input
      type={type}
      value={value}
      placeholder={placeholder ?? ''}
      onChange={e => onChange(e.target.value)}
      className="eccd-field-input"
    />
  </div>
)

const CheckBox = ({
  label, checked, onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) => (
  <label className="eccd-check-label">
    <input type="checkbox" checked={checked} onChange={onChange} className="eccd-cb" />
    {label}
  </label>
)

const DateCell = ({
  value, onChange, shaded,
}: {
  value: string | null
  onChange: (v: string | null) => void
  shaded?: boolean
}) => (
  <td className={shaded ? 'eccd-cell-shaded' : 'eccd-cell'}>
    {!shaded && (
      <input
        type="date"
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="eccd-date-input"
      />
    )}
  </td>
)

const ImmuRow = ({
  label, sublabel, dates, onChange, shadedFrom,
}: {
  label: string
  sublabel?: string
  dates: DoseDates
  onChange: (d: DoseDates) => void
  shadedFrom: number
}) => (
  <tr>
    <td className="eccd-row-label">
      <div className="eccd-row-label-main">{label}</div>
      {sublabel && <div className="eccd-row-label-sub">{sublabel}</div>}
    </td>
    {Array.from({ length: 6 }).map((_, i) => (
      <DateCell
        key={i}
        value={dates[i] ?? null}
        onChange={v => { const n = [...dates]; n[i] = v; onChange(n) }}
        shaded={i >= shadedFrom}
      />
    ))}
  </tr>
)

const ServiceRow = ({
  label, sublabel, dates, onChange,
}: {
  label: string
  sublabel?: string
  dates: DoseDates
  onChange: (d: DoseDates) => void
}) => (
  <tr>
    <td className="eccd-row-label">
      <div className="eccd-row-label-main">{label}</div>
      {sublabel && <div className="eccd-row-label-sub">{sublabel}</div>}
    </td>
    {Array.from({ length: 6 }).map((_, i) => (
      <DateCell
        key={i}
        value={dates[i] ?? null}
        onChange={v => { const n = [...dates]; n[i] = v; onChange(n) }}
      />
    ))}
  </tr>
)

// OtherVaccRow receives state + setter as props (no closure over parent state)
const OtherVaccRow = ({
  idx, rows, setRows,
}: {
  idx: number
  rows: OtherVaccineRow[]
  setRows: (r: OtherVaccineRow[]) => void
}) => {
  const row = rows[idx]
  return (
    <tr>
      <td className="eccd-cell">
        <input
          placeholder={`${idx + 1}.`}
          value={row.name}
          onChange={e => {
            const next = [...rows]
            next[idx] = { ...next[idx], name: e.target.value }
            setRows(next)
          }}
          className="eccd-text-input"
        />
      </td>
      {Array.from({ length: 6 }).map((_, i) => (
        <DateCell
          key={i}
          value={row.dates[i] ?? null}
          onChange={v => {
            const next = [...rows]
            const dates = [...next[idx].dates]
            dates[i] = v
            next[idx] = { ...next[idx], dates }
            setRows(next)
          }}
        />
      ))}
    </tr>
  )
}

// StepIndicator receives step + setter as props
const stepLabels = ['ECCD Card', 'Services', 'Vaccination Card']

const StepIndicator = ({
  step, setStep,
}: {
  step: 1 | 2 | 3
  setStep: (s: 1 | 2 | 3) => void
}) => (
  <div className="eccd-step-bar">
    {([1, 2, 3] as const).map(n => (
      <div
        key={n}
        className={`eccd-step-item ${
          n === step
            ? 'eccd-step-item--current'
            : n < step
            ? 'eccd-step-item--done'
            : 'eccd-step-item--future'
        }`}
        onClick={() => { if (n < step) setStep(n) }}
      >
        <div className="eccd-step-dot">{n < step ? '✓' : n}</div>
        <div className="eccd-step-label">{stepLabels[n - 1]}</div>
      </div>
    ))}
  </div>
)

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function ChildVaccinationFormModal({
  open, order, nurseName, onClose, onSaved,
}: Props) {
  const [step,    setStep]    = useState<1 | 2 | 3>(1)
  const [confirm, setConfirm] = useState<null | 'close' | 'save'>(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)

  // ── STEP 1 fields ────────────────────────────────────────────────────────
  const [childNo,              setChildNo]              = useState('')
  const [familyNo,             setFamilyNo]             = useState('')
  const [clinicHealthCenter,   setClinicHealthCenter]   = useState('')
  const [barangay,             setBarangay]             = useState('')
  const [purokSitio,           setPurokSitio]           = useState('')
  const [completeAddress,      setCompleteAddress]      = useState('')
  const [childName,            setChildName]            = useState('')
  const [childDOB,             setChildDOB]             = useState('')

  const [motherName,           setMotherName]           = useState('')
  const [motherEdLevel,        setMotherEdLevel]        = useState('')
  const [motherOccupation,     setMotherOccupation]     = useState('')
  const [noOfPregnancies,      setNoOfPregnancies]      = useState('')

  const [fatherName,           setFatherName]           = useState('')
  const [fatherEdLevel,        setFatherEdLevel]        = useState('')
  const [occupation,           setOccupation]           = useState('')

  const [birthOrder,           setBirthOrder]           = useState('')
  const [birthDate,            setBirthDate]            = useState('')
  const [gestAgeAtBirth,       setGestAgeAtBirth]       = useState('')
  const [typeOfBirth,          setTypeOfBirth]          = useState('')
  const [birthWeight,          setBirthWeight]          = useState('')
  const [birthLength,          setBirthLength]          = useState('')

  const [placeOfDelivery,      setPlaceOfDelivery]      = useState('')
  const [placeOfDeliveryOther, setPlaceOfDeliveryOther] = useState('')
  const [dobRegistration,      setDobRegistration]      = useState('')

  const [birthAttendant,       setBirthAttendant]       = useState('')
  const [birthAttendantOther,  setBirthAttendantOther]  = useState('')

  // ── STEP 2 fields ────────────────────────────────────────────────────────
  const [serviceProvider,        setServiceProvider]        = useState('Nurse')
  const [newbornScreeningDate,   setNewbornScreeningDate]   = useState('')

  const [bcgDates,         setBcgDates]         = useState<DoseDates>(emptyDoseDates())
  const [dptDates,         setDptDates]         = useState<DoseDates>(emptyDoseDates())
  const [opvDates,         setOpvDates]         = useState<DoseDates>(emptyDoseDates())
  const [hepbDates,        setHepbDates]        = useState<DoseDates>(emptyDoseDates())
  const [measlesDates,     setMeaslesDates]     = useState<DoseDates>(emptyDoseDates())
  const [otherVaccinesEccd, setOtherVaccinesEccd] = useState<OtherVaccineRow[]>([
    { name: '', dates: emptyDoseDates() },
    { name: '', dates: emptyDoseDates() },
    { name: '', dates: emptyDoseDates() },
  ])

  const [vitA100kDates,          setVitA100kDates]          = useState<DoseDates>(emptyDoseDates())
  const [vitA200kDates,          setVitA200kDates]          = useState<DoseDates>(emptyDoseDates())

  const [counselingDates,        setCounselingDates]        = useState<DoseDates>(emptyDoseDates())
  const [breastfeedingDates,     setBreastfeedingDates]     = useState<DoseDates>(emptyDoseDates())
  const [growthMonitoringDates,  setGrowthMonitoringDates]  = useState<DoseDates>(emptyDoseDates())
  const [devScreeningDates,      setDevScreeningDates]      = useState<DoseDates>(emptyDoseDates())
  const [dewormingDates,         setDewormingDates]         = useState<DoseDates>(emptyDoseDates())
  const [dentalDates,            setDentalDates]            = useState<DoseDates>(emptyDoseDates())

  // ── STEP 3 fields ────────────────────────────────────────────────────────
  const [vacccTdDate,  setVacccTdDate]  = useState('')
  const [vacccTdVacc,  setVacccTdVacc]  = useState('')
  const [vacccMrDate,  setVacccMrDate]  = useState('')
  const [vacccMrVacc,  setVacccMrVacc]  = useState('')
  const [vacccHpvDate, setVacccHpvDate] = useState('')
  const [vacccHpvVacc, setVacccHpvVacc] = useState('')
  const [vacccMcvDate, setVacccMcvDate] = useState('')
  const [vacccMcvVacc, setVacccMcvVacc] = useState('')

  const [otherVaccinesCard, setOtherVaccinesCard] = useState<OtherVaccineCardRow[]>([
    { vaccine_type: '', dose1_date: '', dose1_vaccinator: '', dose2_date: '', dose2_vaccinator: '', dose3_date: '', dose3_vaccinator: '' },
    { vaccine_type: '', dose1_date: '', dose1_vaccinator: '', dose2_date: '', dose2_vaccinator: '', dose3_date: '', dose3_vaccinator: '' },
    { vaccine_type: '', dose1_date: '', dose1_vaccinator: '', dose2_date: '', dose2_vaccinator: '', dose3_date: '', dose3_vaccinator: '' },
  ])

  // ── Reset + pre-fill on open ─────────────────────────────────────────────
  useEffect(() => {
    if (!open || !order) return
    setStep(1)
    setConfirm(null)
    setChildName(order.patient_name ?? '')
    setVacccTdVacc(nurseName)
    setVacccMrVacc(nurseName)
    setVacccHpvVacc(nurseName)
    setVacccMcvVacc(nurseName)
  }, [open, order, nurseName])

  // ── Load existing draft ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !order) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('child_vaccination_records')
          .select('*')
          .eq('vaccine_order_id', order!.id)
          .maybeSingle()
        if (error) throw error
        if (!data || cancelled) { setLoading(false); return }

        setChildNo(data.child_no ?? '')
        setFamilyNo(data.family_no ?? '')
        setClinicHealthCenter(data.clinic_health_center ?? '')
        setBarangay(data.barangay ?? '')
        setPurokSitio(data.purok_sitio ?? '')
        setCompleteAddress(data.complete_address ?? '')
        setChildName(data.child_name ?? order!.patient_name ?? '')
        setChildDOB(data.child_date_of_birth ?? '')

        setMotherName(data.mother_name ?? '')
        setMotherEdLevel(data.mother_educational_level ?? '')
        setMotherOccupation(data.mother_occupation ?? '')
        setNoOfPregnancies(data.no_of_pregnancies != null ? String(data.no_of_pregnancies) : '')

        setFatherName(data.father_name ?? '')
        setFatherEdLevel(data.father_educational_level ?? '')
        setOccupation(data.occupation ?? '')

        setBirthOrder(data.birth_order != null ? String(data.birth_order) : '')
        setBirthDate(data.birth_date ?? '')
        setGestAgeAtBirth(data.gestational_age_at_birth ?? '')
        setTypeOfBirth(data.type_of_birth ?? '')
        setBirthWeight(data.birth_weight_kg != null ? String(data.birth_weight_kg) : '')
        setBirthLength(data.birth_length_cm != null ? String(data.birth_length_cm) : '')

        setPlaceOfDelivery(data.place_of_delivery ?? '')
        setPlaceOfDeliveryOther(data.place_of_delivery_other ?? '')
        setDobRegistration(data.date_of_birth_registration ?? '')

        setBirthAttendant(data.birth_attendant ?? '')
        setBirthAttendantOther(data.birth_attendant_other ?? '')

        setServiceProvider(data.service_provider ?? 'Nurse')
        setNewbornScreeningDate(data.newborn_screening_date ?? '')

        setBcgDates(data.immunization_bcg_dates ?? emptyDoseDates())
        setDptDates(data.immunization_dpt_dates ?? emptyDoseDates())
        setOpvDates(data.immunization_opv_dates ?? emptyDoseDates())
        setHepbDates(data.immunization_hepb_dates ?? emptyDoseDates())
        setMeaslesDates(data.immunization_measles_dates ?? emptyDoseDates())
        if (Array.isArray(data.immunization_other_vaccines) && data.immunization_other_vaccines.length) {
          setOtherVaccinesEccd(data.immunization_other_vaccines)
        }

        setVitA100kDates(data.vitamin_a_100k_dates ?? emptyDoseDates())
        setVitA200kDates(data.vitamin_a_200k_dates ?? emptyDoseDates())

        setCounselingDates(data.counseling_dates ?? emptyDoseDates())
        setBreastfeedingDates(data.breastfeeding_dates ?? emptyDoseDates())
        setGrowthMonitoringDates(data.growth_monitoring_dates ?? emptyDoseDates())
        setDevScreeningDates(data.developmental_screening_dates ?? emptyDoseDates())
        setDewormingDates(data.deworming_dates ?? emptyDoseDates())
        setDentalDates(data.dental_checkup_dates ?? emptyDoseDates())

        setVacccTdDate(data.vaccc_td_date ?? '')
        setVacccTdVacc(data.vaccc_td_vaccinator ?? nurseName)
        setVacccMrDate(data.vaccc_mr_date ?? '')
        setVacccMrVacc(data.vaccc_mr_vaccinator ?? nurseName)
        setVacccHpvDate(data.vaccc_hpv_date ?? '')
        setVacccHpvVacc(data.vaccc_hpv_vaccinator ?? nurseName)
        setVacccMcvDate(data.vaccc_mcv_date ?? '')
        setVacccMcvVacc(data.vaccc_mcv_vaccinator ?? nurseName)

        if (Array.isArray(data.vaccc_other_vaccines) && data.vaccc_other_vaccines.length) {
          setOtherVaccinesCard(data.vaccc_other_vaccines)
        }
      } catch (e: any) {
        console.error('[ChildVaccinationFormModal:load]', e?.message ?? e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, order, nurseName])

  if (!open || !order) return null

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(markStatus: 'draft' | 'completed') {
    setSaving(true)
    try {
      const payload = {
        vaccine_order_id: order!.id,
        patient_id:       order!.patient_id,
        child_no:         childNo || null,
        family_no:        familyNo || null,
        clinic_health_center:      clinicHealthCenter || null,
        barangay:                  barangay || null,
        purok_sitio:               purokSitio || null,
        complete_address:          completeAddress || null,
        child_name:                childName || null,
        child_date_of_birth:       childDOB || null,
        mother_name:               motherName || null,
        mother_educational_level:  motherEdLevel || null,
        mother_occupation:         motherOccupation || null,
        no_of_pregnancies:         noOfPregnancies ? Number(noOfPregnancies) : null,
        father_name:               fatherName || null,
        father_educational_level:  fatherEdLevel || null,
        occupation:                occupation || null,
        birth_order:               birthOrder ? Number(birthOrder) : null,
        birth_date:                birthDate || null,
        gestational_age_at_birth:  gestAgeAtBirth || null,
        type_of_birth:             typeOfBirth || null,
        birth_weight_kg:           birthWeight ? Number(birthWeight) : null,
        birth_length_cm:           birthLength ? Number(birthLength) : null,
        place_of_delivery:         placeOfDelivery || null,
        place_of_delivery_other:   placeOfDeliveryOther || null,
        date_of_birth_registration: dobRegistration || null,
        birth_attendant:           birthAttendant || null,
        birth_attendant_other:     birthAttendantOther || null,
        service_provider:          serviceProvider || null,
        newborn_screening_date:    newbornScreeningDate || null,
        immunization_bcg_dates:    bcgDates,
        immunization_dpt_dates:    dptDates,
        immunization_opv_dates:    opvDates,
        immunization_hepb_dates:   hepbDates,
        immunization_measles_dates: measlesDates,
        immunization_other_vaccines: otherVaccinesEccd,
        vitamin_a_100k_dates:      vitA100kDates,
        vitamin_a_200k_dates:      vitA200kDates,
        counseling_dates:          counselingDates,
        breastfeeding_dates:       breastfeedingDates,
        growth_monitoring_dates:   growthMonitoringDates,
        developmental_screening_dates: devScreeningDates,
        deworming_dates:           dewormingDates,
        dental_checkup_dates:      dentalDates,
        vaccc_td_date:             vacccTdDate || null,
        vaccc_td_vaccinator:       vacccTdVacc || null,
        vaccc_mr_date:             vacccMrDate || null,
        vaccc_mr_vaccinator:       vacccMrVacc || null,
        vaccc_hpv_date:            vacccHpvDate || null,
        vaccc_hpv_vaccinator:      vacccHpvVacc || null,
        vaccc_mcv_date:            vacccMcvDate || null,
        vaccc_mcv_vaccinator:      vacccMcvVacc || null,
        vaccc_other_vaccines:      otherVaccinesCard,
        filled_by_name:            nurseName || null,
        status:                    markStatus,
        updated_at:                new Date().toISOString(),
      }
      const { error } = await supabase
        .from('child_vaccination_records')
        .upsert(payload, { onConflict: 'vaccine_order_id' })
      if (error) throw error
      onSaved?.()
      setConfirm(null)
      if (markStatus === 'completed') doClose()
    } catch (e: any) {
      alert(`❌ Failed to save form: ${e?.message ?? e}`)
    } finally {
      setSaving(false)
    }
  }

  const doClose = () => { setConfirm(null); setStep(1); onClose() }

  return (
    <div className="eccd-overlay">
      <div className="eccd-modal">

        {/* ── Header ── */}
        <div className="eccd-header">
          <div className="eccd-header-logo">🇵🇭</div>
          <div className="eccd-header-text">
            <div className="eccd-header-title">The Early Childhood Care and Development (ECCD) Card</div>
            <div className="eccd-header-sub">
              {order.patient_name ?? 'Patient'}
              {order.patient_age != null ? ` · ${order.patient_age} yrs` : ''}
              {order.patient_gender ? ` · ${order.patient_gender}` : ''}
            </div>
          </div>
        </div>
        <button className="eccd-close-btn" onClick={() => setConfirm('close')}>×</button>

        <StepIndicator step={step} setStep={setStep} />

        {loading ? (
          <div className="eccd-loading">Loading form…</div>
        ) : (
          <div className="eccd-body">

            {/* ══ STEP 1 — ECCD CARD FRONT ══════════════════════════════════ */}
            {step === 1 && (
              <>
                {/* ── Row 1: Clinic / Health Center ── */}
                <div className="eccd-card-section">
                  <div className="eccd-row-2col">
                    <Field label="Clinic / Health Center" value={clinicHealthCenter} onChange={setClinicHealthCenter} />
                    <div className="eccd-ids-pair">
                      <Field label="Child's No." value={childNo} onChange={setChildNo} />
                      <Field label="Family No." value={familyNo} onChange={setFamilyNo} />
                    </div>
                  </div>
                </div>

                {/* ── Row 2: Barangay / Purok/Sitio ── */}
                <div className="eccd-card-section">
                  <div className="eccd-row-2col">
                    <Field label="Barangay" value={barangay} onChange={setBarangay} />
                    <Field label="Purok / Sitio" value={purokSitio} onChange={setPurokSitio} />
                  </div>
                </div>

                {/* ── Row 3: Complete Address ── */}
                <div className="eccd-card-section">
                  <Field label="Complete Address of Family (House No., Street, City/Province)" value={completeAddress} onChange={setCompleteAddress} />
                </div>

                {/* ── Row 4: Child's Name ── */}
                <div className="eccd-card-section">
                  <Field label="Child's Name" value={childName} onChange={setChildName} />
                </div>

                {/* ── Row 5: Mother's info ── */}
                <div className="eccd-card-section">
                  <div className="eccd-row-4col">
                    <Field label="Mother's Name"       value={motherName}       onChange={setMotherName} />
                    <Field label="Educational Level"   value={motherEdLevel}    onChange={setMotherEdLevel} />
                    <Field label="Occupation"          value={motherOccupation} onChange={setMotherOccupation} />
                    <Field label="No. of Pregnancies"  value={noOfPregnancies}  onChange={setNoOfPregnancies} type="number" />
                  </div>
                </div>

                {/* ── Row 6: Father's info ── */}
                <div className="eccd-card-section">
                  <div className="eccd-row-3col">
                    <Field label="Father's Name"     value={fatherName}   onChange={setFatherName} />
                    <Field label="Educational Level" value={fatherEdLevel} onChange={setFatherEdLevel} />
                    <Field label="Occupation"        value={occupation}   onChange={setOccupation} />
                  </div>
                </div>

                {/* ── Row 7: Birth details ── */}
                <div className="eccd-card-section">
                  <div className="eccd-row-4col">
                    <Field label="Birth Order"             value={birthOrder}     onChange={setBirthOrder}     type="number" />
                    <Field label="Birth Date"              value={birthDate}      onChange={setBirthDate}      type="date" />
                    <Field label="Gestational Age at Birth" value={gestAgeAtBirth} onChange={setGestAgeAtBirth} />
                    <div className="eccd-field">
                      <label className="eccd-field-label">Type of Birth</label>
                      <div className="eccd-check-row">
                        <CheckBox label="Normal" checked={typeOfBirth === 'Normal'} onChange={() => setTypeOfBirth('Normal')} />
                        <CheckBox label="CS"     checked={typeOfBirth === 'CS'}     onChange={() => setTypeOfBirth('CS')} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Row 8: Weight / Length / DOB Registration ── */}
                <div className="eccd-card-section">
                  <div className="eccd-row-3col">
                    <Field label="Birth Weight (kg)"        value={birthWeight}     onChange={setBirthWeight}     type="number" />
                    <Field label="Birth Length (cm)"        value={birthLength}     onChange={setBirthLength}     type="number" />
                    <Field label="Date of Birth Registration" value={dobRegistration} onChange={setDobRegistration} type="date" />
                  </div>
                </div>

                {/* ── Row 9: Place of Delivery + Birth Attendant ── */}
                <div className="eccd-card-section">
                  <div className="eccd-row-2col">
                    <div>
                      <label className="eccd-field-label">Place of Delivery</label>
                      <div className="eccd-check-row eccd-check-row--spaced">
                        {['Home', 'Lying-in', 'Hospital', 'Others'].map(opt => (
                          <CheckBox key={opt} label={opt} checked={placeOfDelivery === opt} onChange={() => setPlaceOfDelivery(opt)} />
                        ))}
                      </div>
                      {placeOfDelivery === 'Others' && (
                        <Field label="Specify" value={placeOfDeliveryOther} onChange={setPlaceOfDeliveryOther} />
                      )}
                    </div>
                    <div>
                      <label className="eccd-field-label">Birth Attendant</label>
                      <div className="eccd-check-row eccd-check-row--spaced">
                        {['Doctor', 'Nurse', 'Hilot', 'Others'].map(opt => (
                          <CheckBox key={opt} label={opt} checked={birthAttendant === opt} onChange={() => setBirthAttendant(opt)} />
                        ))}
                      </div>
                      {birthAttendant === 'Others' && (
                        <Field label="Specify" value={birthAttendantOther} onChange={setBirthAttendantOther} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="eccd-btn-row">
                  <button className="eccd-btn-draft" onClick={() => handleSave('draft')} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Draft'}
                  </button>
                  <button className="eccd-btn-next" onClick={() => setStep(2)}>Next →</button>
                </div>
              </>
            )}

            {/* ══ STEP 2 — ESSENTIAL HEALTH AND NUTRITION SERVICES ══════════ */}
            {step === 2 && (
              <>
                <div className="eccd-card-section">
                  <div className="eccd-table-title">ESSENTIAL HEALTH AND NUTRITION SERVICES</div>

                  {/* ── Service Provider row — inside the card, above the table ── */}
                  <div className="eccd-sp-row" style={{ margin: '10px 0 8px' }}>
                    <span className="eccd-field-label" style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Service Provider:</span>
                    {['Doctor', 'Nurse', 'Midwife', 'Hilot', 'Others'].map(opt => (
                      <CheckBox key={opt} label={opt} checked={serviceProvider === opt} onChange={() => setServiceProvider(opt)} />
                    ))}
                  </div>

                  <table className="eccd-services-table">
                    <thead>
                      {/* Row 1: column headers */}
                      <tr>
                        <th className="eccd-th-service" rowSpan={2}>Services</th>
                        <th className="eccd-th-date">1<sup>st</sup></th>
                        <th className="eccd-th-date">2<sup>nd</sup></th>
                        <th className="eccd-th-date">3<sup>rd</sup></th>
                        <th className="eccd-th-date">4<sup>th</sup></th>
                        <th className="eccd-th-date">5<sup>th</sup></th>
                        <th className="eccd-th-date">6<sup>th</sup></th>
                      </tr>
                      {/* Row 2: "Date Administered" label */}
                      <tr>
                        <th className="eccd-th-dates-label" colSpan={6}>Date Administered</th>
                      </tr>
                    </thead>
                    <tbody>

                      {/* ── Newborn Screening — only 1st slot active ── */}
                      <tr>
                        <td className="eccd-row-label">
                          <div className="eccd-row-label-main">Newborn Screening after the first 24 hrs of life</div>
                        </td>
                        <DateCell value={newbornScreeningDate} onChange={v => setNewbornScreeningDate(v ?? '')} />
                        {[1,2,3,4,5].map(i => <td key={i} className="eccd-cell-shaded" />)}
                      </tr>

                      {/* ── Immunization subheader ── */}
                      <tr className="eccd-subheader-row">
                        <td colSpan={7} className="eccd-subheader">Immunization</td>
                      </tr>

                      {/* BCG — 1 dose only */}
                      <ImmuRow label="BCG (at birth)"
                        dates={bcgDates} onChange={setBcgDates} shadedFrom={1} />

                      {/* DPT — 3 doses */}
                      <ImmuRow label="DPT"
                        sublabel="(6 wks, 10 wks, 14 wks old)"
                        dates={dptDates} onChange={setDptDates} shadedFrom={3} />

                      {/* OPV — 3 doses */}
                      <ImmuRow label="OPV"
                        sublabel="(6 wks, 10 wks, 14 wks old)"
                        dates={opvDates} onChange={setOpvDates} shadedFrom={3} />

                      {/* Hepatitis B — 3 doses */}
                      <ImmuRow label="Hepatitis B"
                        sublabel="(w/in 24 hrs, 6 wks, 14 wks)"
                        dates={hepbDates} onChange={setHepbDates} shadedFrom={3} />

                      {/* Measles — 1 dose */}
                      <ImmuRow label="Measles (9 months)"
                        dates={measlesDates} onChange={setMeaslesDates} shadedFrom={2} />

                      {/* ── Other Vaccines header ── */}
                      <tr>
                        <td className="eccd-row-label eccd-row-label-indent">Other Vaccines</td>
                        <td colSpan={6} className="eccd-cell-shaded" />
                      </tr>
                      {[0, 1, 2].map(i => (
                        <OtherVaccRow key={i} idx={i} rows={otherVaccinesEccd} setRows={setOtherVaccinesEccd} />
                      ))}

                      {/* ── Vitamin A Supplementation — two sub-rows side by side
                           matching the real card: 100k IU (cols 1–3) left half,
                           200k IU (cols 4–6) right half within the same row ── */}
                      <tr className="eccd-subheader-row">
                        <td colSpan={7} className="eccd-subheader">Vitamin A Supplementation</td>
                      </tr>
                      <tr>
                        <td colSpan={7} style={{ padding: 0, border: '1px solid #d0e4d8' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <tbody>
                              <tr>
                                {/* ── 100k IU label ── */}
                                <td className="eccd-row-label" style={{ width: '22%' }}>
                                  <div className="eccd-row-label-main">100,000 I.U.</div>
                                  <div className="eccd-row-label-sub">(starting at 6 months)</div>
                                </td>
                                {[0,1,2].map(i => (
                                  <td key={i} className="eccd-cell" style={{ width: '9.3%' }}>
                                    <input type="date"
                                      value={vitA100kDates[i] ?? ''}
                                      onChange={e => { const n=[...vitA100kDates]; n[i]=e.target.value||null; setVitA100kDates(n) }}
                                      className="eccd-date-input" />
                                  </td>
                                ))}
                                {/* ── 200k IU label ── */}
                                <td className="eccd-row-label" style={{ width: '22%', borderLeft: '2px solid #a0c8b0' }}>
                                  <div className="eccd-row-label-main">200,000 I.U.</div>
                                  <div className="eccd-row-label-sub">(at 1 year and above)</div>
                                </td>
                                {[0,1,2].map(i => (
                                  <td key={i} className="eccd-cell" style={{ width: '9.3%' }}>
                                    <input type="date"
                                      value={vitA200kDates[i] ?? ''}
                                      onChange={e => { const n=[...vitA200kDates]; n[i]=e.target.value||null; setVitA200kDates(n) }}
                                      className="eccd-date-input" />
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>

                      {/* ── Other essential services ── */}
                      <ServiceRow label="Counseling"
                        dates={counselingDates} onChange={setCounselingDates} />
                      <ServiceRow label="Breastfeeding and Complementary feeding"
                        dates={breastfeedingDates} onChange={setBreastfeedingDates} />
                      <ServiceRow label="Growth Monitoring"
                        sublabel="(monthly for 0-24 months & bi-annually for 25-71 months)"
                        dates={growthMonitoringDates} onChange={setGrowthMonitoringDates} />
                      <ServiceRow label="Developmental Screening"
                        dates={devScreeningDates} onChange={setDevScreeningDates} />
                      <ServiceRow label="Deworming"
                        sublabel="(every 6 months starting at 1 year old)"
                        dates={dewormingDates} onChange={setDewormingDates} />
                      <ServiceRow label="Dental Check-up"
                        sublabel="(starting at 2-3 years)"
                        dates={dentalDates} onChange={setDentalDates} />

                    </tbody>
                  </table>
                  <div className="eccd-table-footer">
                    The ECCD Card was developed by the Interagency Technical Working Group on Child Growth Standards, NNC
                  </div>
                </div>

                <div className="eccd-btn-row">
                  <button className="eccd-btn-back"  onClick={() => setStep(1)}>← Back</button>
                  <button className="eccd-btn-draft" onClick={() => handleSave('draft')} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Draft'}
                  </button>
                  <button className="eccd-btn-next"  onClick={() => setStep(3)}>Next →</button>
                </div>
              </>
            )}

            {/* ══ STEP 3 — VACCINATION CARD ═════════════════════════════════ */}
            {step === 3 && (
              <>
                <div className="eccd-card-section">
                  <div className="eccd-section-title">Vaccination Card</div>
                  <div className="eccd-row-2col" style={{ marginBottom: 16 }}>
                    <Field label="Name"          value={childName} onChange={setChildName} />
                    <Field label="Date of Birth" value={childDOB}  onChange={setChildDOB}  type="date" />
                  </div>

                  <div className="eccd-vaccc-grid">
                    {[
                      { label: 'Td',  date: vacccTdDate,  setDate: setVacccTdDate,  vacc: vacccTdVacc,  setVacc: setVacccTdVacc,  color: '#fde68a' },
                      { label: 'MR',  date: vacccMrDate,  setDate: setVacccMrDate,  vacc: vacccMrVacc,  setVacc: setVacccMrVacc,  color: '#bbf7d0' },
                      { label: 'HPV', date: vacccHpvDate, setDate: setVacccHpvDate, vacc: vacccHpvVacc, setVacc: setVacccHpvVacc, color: '#d9f99d' },
                      { label: 'MCV', date: vacccMcvDate, setDate: setVacccMcvDate, vacc: vacccMcvVacc, setVacc: setVacccMcvVacc, color: '#fed7aa' },
                    ].map(item => (
                      <div key={item.label} className="eccd-vaccc-chip">
                        <div className="eccd-vaccc-chip-label" style={{ background: item.color }}>{item.label}</div>
                        <Field label="Date Given"              type="date" value={item.date} onChange={item.setDate} />
                        <Field label="Signature of Vaccinator"            value={item.vacc} onChange={item.setVacc} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="eccd-card-section">
                  <div className="eccd-section-title">Other Vaccines</div>
                  <div className="eccd-vaccc-table-wrap">
                    <table className="eccd-vaccc-table">
                      <thead>
                        <tr>
                          <th rowSpan={2}>Vaccine Type</th>
                          <th colSpan={2}>1st Dose</th>
                          <th colSpan={2}>2nd Dose</th>
                          <th colSpan={2}>3rd Dose</th>
                        </tr>
                        <tr>
                          <th>Date Given</th><th>Vaccinator</th>
                          <th>Date Given</th><th>Vaccinator</th>
                          <th>Date Given</th><th>Vaccinator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherVaccinesCard.map((row, idx) => (
                          <tr key={idx}>
                            {([
                              ['vaccine_type',      'text'],
                              ['dose1_date',        'date'], ['dose1_vaccinator', 'text'],
                              ['dose2_date',        'date'], ['dose2_vaccinator', 'text'],
                              ['dose3_date',        'date'], ['dose3_vaccinator', 'text'],
                            ] as [keyof OtherVaccineCardRow, string][]).map(([key, type]) => (
                              <td key={key} className="eccd-vaccc-td">
                                <input
                                  type={type}
                                  value={row[key]}
                                  onChange={e => {
                                    const next = [...otherVaccinesCard]
                                    next[idx] = { ...next[idx], [key]: e.target.value }
                                    setOtherVaccinesCard(next)
                                  }}
                                  className="eccd-vaccc-td-input"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="eccd-filled-by">
                  Filled out by: <strong>{nurseName || '—'}</strong>
                </p>

                <div className="eccd-btn-row">
                  <button className="eccd-btn-back"  onClick={() => setStep(2)}>← Back</button>
                  <button className="eccd-btn-draft" onClick={() => handleSave('draft')} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Draft'}
                  </button>
                  <button className="eccd-btn-next"  onClick={() => setConfirm('save')} disabled={saving}>
                    {saving ? 'Saving…' : 'Save & Complete ✓'}
                  </button>
                </div>
              </>
            )}

          </div>
        )}

        {/* ── Confirm: Save & Complete ── */}
        {confirm === 'save' && (
          <div className="eccd-confirm-overlay">
            <div className="eccd-confirm-box">
              <p className="eccd-confirm-title">Complete this record?</p>
              <p className="eccd-confirm-sub">This marks the ECCD &amp; Vaccination Card as done for this visit.</p>
              <button className="eccd-confirm-cancel" onClick={() => setConfirm(null)}>CANCEL</button>
              <button className="eccd-confirm-save"   onClick={() => handleSave('completed')} disabled={saving}>
                {saving ? 'Saving…' : 'CONFIRM'}
              </button>
            </div>
          </div>
        )}

        {/* ── Confirm: Close ── */}
        {confirm === 'close' && (
          <div className="eccd-confirm-overlay">
            <div className="eccd-confirm-box">
              <p className="eccd-confirm-title">Close this form?</p>
              <p className="eccd-confirm-sub">Unsaved changes will be lost. Use "Save Draft" first if you want to keep your progress.</p>
              <button className="eccd-confirm-cancel" onClick={() => setConfirm(null)}>CANCEL</button>
              <button className="eccd-confirm-save"   onClick={doClose}>CLOSE</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}