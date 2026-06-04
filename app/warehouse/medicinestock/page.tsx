'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTheme } from 'next-themes'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '@/lib/supabase'
import styles from '../components/warehouse.module.css'

interface Medicine {
  id: string
  med_name: string
  med_dosage: string
  med_type: string
  exp_date: string
  quantity: number
  unit: string
  selected: boolean
  archived: boolean
}

export default function MedicineStockPage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [sortAZ, setSortAZ] = useState(false)
  const [ascending, setAscending] = useState(false)
  const [descending, setDescending] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [toast, setToast] = useState('')
  const exportRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({ name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '' })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ id: '', name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '' })

  const selectedCount = medicines.filter(m => m.selected).length
  const selectedMedicines = medicines.filter(m => m.selected)

  useEffect(() => { setMounted(true); fetchMedicines() }, [])

  const showToastMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchMedicines = async () => {
    setLoading(true)
    const { data } = await supabase.from('warehouse_medicines').select('*').order('created_at', { ascending: false })
    setMedicines((data || []).map(m => ({ ...m, selected: false })))
    setLoading(false)
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    setMedicines(prev => prev.map(m => ({ ...m, selected: checked })))
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, selected: checked } : m))
    setSelectAll(medicines.every(m => m.id === id ? checked : m.selected))
  }

  const handleAscending = (checked: boolean) => { setAscending(checked); if (checked) setDescending(false) }
  const handleDescending = (checked: boolean) => { setDescending(checked); if (checked) setAscending(false) }

  const handleArchiveConfirm = async () => {
    const ids = selectedMedicines.map(m => m.id)
    const { error } = await supabase.from('warehouse_medicines').update({ archived: true }).in('id', ids)
    if (!error) { showToastMsg('Medicines archived successfully!'); setSelectAll(false); setShowArchiveConfirm(false); fetchMedicines() }
    else showToastMsg('Error archiving medicines!')
  }

  const handleAdd = async () => {
    if (!form.name) return
    const { error } = await supabase.from('warehouse_medicines').insert({
      med_name: form.name, med_dosage: form.dosage, med_type: form.type,
      exp_date: form.expDate, quantity: Number(form.quantity), unit: form.unit, archived: false,
    })
    if (!error) {
      setForm({ name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '' })
      setShowModal(false)
      showToastMsg('Medicine added successfully!')
      fetchMedicines()
    } else showToastMsg('Error adding medicine!')
  }

  const handleEditClick = (med: Medicine) => {
    setEditForm({ id: med.id, name: med.med_name, dosage: med.med_dosage, type: med.med_type, expDate: med.exp_date, quantity: String(med.quantity), unit: med.unit || '' })
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!editForm.name) return
    const { error } = await supabase.from('warehouse_medicines').update({
      med_name: editForm.name, med_dosage: editForm.dosage, med_type: editForm.type,
      exp_date: editForm.expDate, quantity: Number(editForm.quantity), unit: editForm.unit,
    }).eq('id', editForm.id)
    if (!error) { setShowEditModal(false); showToastMsg('Medicine updated successfully!'); fetchMedicines() }
    else showToastMsg('Error updating medicine!')
  }

  const sortedMedicines = useMemo(() => {
    const filtered = medicines.filter(m => showArchived ? m.archived : !m.archived)
    return [...filtered].sort((a, b) => {
      if (sortAZ) return a.med_name.localeCompare(b.med_name)
      if (ascending) return new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime()
      if (descending) return new Date(b.exp_date).getTime() - new Date(a.exp_date).getTime()
      return 0
    })
  }, [medicines, sortAZ, ascending, descending, showArchived])

  const getExportData = () => {
    const data = selectedCount > 0 ? selectedMedicines : sortedMedicines
    return data.map((m, i) => ({
      'No.': i + 1, 'Medicine Name': m.med_name, 'Mg (Dosage)': m.med_dosage,
      'Medicine Type': m.med_type, 'EXP Date': m.exp_date, 'Stock Quantity': m.quantity, 'Unit': m.unit,
    }))
  }

  const handleExportExcel = () => {
    const data = getExportData()
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Medicine Stock')
    XLSX.writeFile(wb, 'medicine-stock.xlsx')
    setShowExport(false); showToastMsg('Exported as Excel!')
  }

  const handleExportPDF = () => {
    const data = getExportData()
    const doc = new jsPDF()
    doc.text('Medicine Stock Report', 14, 15)
    autoTable(doc, {
      startY: 22,
      head: [['No.', 'Medicine Name', 'Mg (Dosage)', 'Medicine Type', 'EXP Date', 'Stock Quantity', 'Unit']],
      body: data.map(d => Object.values(d).map(String)),
      headStyles: { fillColor: [13, 59, 31] },
      alternateRowStyles: { fillColor: [220, 252, 231] },
      styles: { fontSize: 9 },
    })
    doc.save('medicine-stock.pdf')
    setShowExport(false); showToastMsg('Exported as PDF!')
  }

  const handleExportCSV = () => {
    const data = getExportData()
    const headers = Object.keys(data[0]).join(',')
    const csvRows = data.map(d => Object.values(d).join(',')).join('\n')
    const blob = new Blob([`${headers}\n${csvRows}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'medicine-stock.csv'; a.click()
    URL.revokeObjectURL(url)
    setShowExport(false); showToastMsg('Exported as CSV!')
  }

  const rows = 12

  const formFields = [
    { label: 'Medicine Name', key: 'name', type: 'text' },
    { label: 'Mg/Dosage', key: 'dosage', type: 'text' },
    { label: 'Medicine Type', key: 'type', type: 'text' },
    { label: 'EXP Date', key: 'expDate', type: 'date' },
    { label: 'Quantity', key: 'quantity', type: 'number' },
    { label: 'Unit', key: 'unit', type: 'text' },
  ]

  return (
    <div className={`${styles.root} ${mounted && theme === 'dark' ? styles.dark : ''}`}>
      <Sidebar />
      <div className={styles.mainArea}>
        <Topbar />
        <div className={styles.content}>

          <div className={styles.pageHeader}>
            <div className={styles.pageTitleSection}>
              <p className={styles.pageEyebrow}>Warehouse</p>
              <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Medicine Stocks</h1>
              {selectedCount > 0 && (
                <span className={styles.selectedCount}>{selectedCount} selected</span>
              )}
            </div>
            <button className={styles.addBtn} onClick={() => setShowModal(true)}>
              + Medicine
            </button>
          </div>

          <div className={styles.tableCard}>

            {/* Action Bar */}
            <div className={styles.actionBar}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} />
                Select All
              </label>

              <div className={styles.actionBarDivider} />

              <button
                className={`${styles.archiveBtn} ${selectedCount > 0 ? styles.archiveBtnActive : styles.archiveBtnDisabled}`}
                disabled={selectedCount === 0}
                onClick={() => selectedCount > 0 && setShowArchiveConfirm(true)}>
                <div className={styles.archiveIcon}>
                  {selectedCount > 0 && <span>✓</span>}
                </div>
                Archive
                {selectedCount > 0 && <span className={styles.archiveBadge}>{selectedCount}</span>}
              </button>

              <div className={styles.actionBarDivider} />

              <label className={styles.checkLabel}>
                <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
                Show Archived
              </label>

              <div className={styles.actionBarDivider} />

              <label className={styles.checkLabel}>
                <input type="checkbox" checked={sortAZ} onChange={e => setSortAZ(e.target.checked)} />
                A-Z
              </label>

              <div className={styles.actionBarDivider} />

              <label className={styles.checkLabel}>
                <input type="checkbox" checked={ascending} onChange={e => handleAscending(e.target.checked)} />
                Ascending
              </label>

              <label className={styles.checkLabel}>
                <input type="checkbox" checked={descending} onChange={e => handleDescending(e.target.checked)} />
                Descending
              </label>

              <div className={styles.exportWrap} ref={exportRef}>
                <button className={styles.exportBtn} onClick={() => setShowExport(!showExport)}>
                  EXPORT {selectedCount > 0 && `(${selectedCount})`} ▾
                </button>
                {showExport && (
                  <div className={styles.exportDrop}>
                    <div className={styles.exportDropLabel}>
                      {selectedCount > 0 ? `Export ${selectedCount} selected` : 'Export All'}
                    </div>
                    <button className={styles.exportDropItem} onClick={handleExportExcel}>📊 Excel (.xlsx)</button>
                    <button className={styles.exportDropItem} onClick={handleExportPDF}>📄 PDF (.pdf)</button>
                    <button className={styles.exportDropItem} onClick={handleExportCSV}>📋 CSV (.csv)</button>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>No.</th>
                  <th>Medicine Name</th>
                  <th>Mg (Dosage)</th>
                  <th>Medicine Type</th>
                  <th>EXP Date</th>
                  <th>Stock Quantity</th>
                  <th>Unit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyState}>Loading medicines...</td>
                  </tr>
                ) : (
                  Array.from({ length: rows }).map((_, i) => {
                    const med = sortedMedicines[i]
                    return (
                      <tr
                        key={i}
                        className={`${styles.tableRow} ${med?.selected ? styles.tableRowSelected : ''}`}>
                        <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={med?.selected || false}
                            onChange={e => med && handleSelectOne(med.id, e.target.checked)}
                            style={{ accentColor: '#16a34a' }}
                          />
                        </td>
                        <td className={`${styles.tableCell} ${styles.tableCellNum}`}>{i + 1}</td>
                        <td className={`${styles.tableCell} ${styles.tableCellName}`}>{med?.med_name || ''}</td>
                        <td className={styles.tableCell}>{med?.med_dosage || ''}</td>
                        <td className={styles.tableCell}>{med?.med_type || ''}</td>
                        <td className={styles.tableCell}>{med?.exp_date || ''}</td>
                        <td className={styles.tableCell}>{med?.quantity ?? ''}</td>
                        <td className={styles.tableCell}>{med?.unit || ''}</td>
                        <td className={styles.tableCell}>
                          {med && (
                            <button className={styles.editBtn} onClick={() => handleEditClick(med)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Archive Confirm Modal */}
          {showArchiveConfirm && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modal} style={{ maxWidth: 380 }}>
                <div className={styles.modalHeader}>
                  <h2>Archive Medicine</h2>
                  <button className={styles.modalClose} onClick={() => setShowArchiveConfirm(false)}>✕</button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.warnIcon}>⚠️</div>
                  <p className={styles.warnTitle}>Are you sure?</p>
                  <p className={styles.warnText}>You are about to archive</p>
                  <p className={styles.warnHighlight}>
                    {selectedCount} selected {selectedCount === 1 ? 'medicine' : 'medicines'}
                  </p>
                  <p className={styles.warnNote}>You can view archived medicines by enabling Show Archived.</p>
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.btnCancel} onClick={() => setShowArchiveConfirm(false)}>CANCEL</button>
                  <button className={styles.btnConfirm} onClick={handleArchiveConfirm}>CONFIRM</button>
                </div>
              </div>
            </div>
          )}

          {/* Add Medicine Modal */}
          {showModal && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h2>Add Medicine</h2>
                  <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
                </div>
                <div className={styles.modalBody}>
                  {formFields.map(({ label, key, type }) => (
                    <div key={key}>
                      <label>{label}</label>
                      <input
                        type={type}
                        className={styles.modalInput}
                        value={form[key as keyof typeof form]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.btnCancel} onClick={() => setShowModal(false)}>CANCEL</button>
                  <button className={styles.btnConfirm} onClick={handleAdd}>CONFIRM</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Medicine Modal */}
          {showEditModal && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h2>Edit Medicine</h2>
                  <button className={styles.modalClose} onClick={() => setShowEditModal(false)}>✕</button>
                </div>
                <div className={styles.modalBody}>
                  {formFields.map(({ label, key, type }) => (
                    <div key={key}>
                      <label>{label}</label>
                      <input
                        type={type}
                        className={styles.modalInput}
                        value={editForm[key as keyof typeof editForm]}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.btnCancel} onClick={() => setShowEditModal(false)}>CANCEL</button>
                  <button className={styles.btnConfirm} onClick={handleEditSave}>SAVE CHANGES</button>
                </div>
              </div>
            </div>
          )}

          {toast && <div className={styles.toast}>✓ {toast}</div>}
        </div>
      </div>
    </div>
  )
}