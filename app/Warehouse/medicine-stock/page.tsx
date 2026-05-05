'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Sidebar from '@/app/Warehouse/Components/Sidebar'
import Topbar from '@/app/Warehouse/Components/TopBar'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '@/lib/supabase'

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
  const [form, setForm] = useState({
    name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '',
  })

  // Edit states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    id: '', name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '',
  })

  const selectedCount = medicines.filter(m => m.selected).length
  const selectedMedicines = medicines.filter(m => m.selected)

  const showToastMsg = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchMedicines = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('warehouse_medicines')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching medicines:', error)
      showToastMsg('Error loading medicines!')
    } else {
      setMedicines((data || []).map(m => ({ ...m, selected: false })))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMedicines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    setMedicines(prev => prev.map(m => ({ ...m, selected: checked })))
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, selected: checked } : m))
    setSelectAll(medicines.every(m => m.id === id ? checked : m.selected))
  }

  const handleAscending = (checked: boolean) => {
    setAscending(checked)
    if (checked) setDescending(false)
  }

  const handleDescending = (checked: boolean) => {
    setDescending(checked)
    if (checked) setAscending(false)
  }

  const handleArchiveClick = () => {
    if (selectedCount === 0) return
    setShowArchiveConfirm(true)
  }

  const handleArchiveConfirm = async () => {
    const selectedIds = selectedMedicines.map(m => m.id)
    const { error } = await supabase
      .from('warehouse_medicines')
      .update({ archived: true })
      .in('id', selectedIds)

    if (error) {
      showToastMsg('Error archiving medicines!')
    } else {
      showToastMsg('Medicines archived successfully!')
      setSelectAll(false)
      setShowArchiveConfirm(false)
      fetchMedicines()
    }
  }

  const handleAdd = async () => {
    if (!form.name) return

    const { error } = await supabase
      .from('warehouse_medicines')
      .insert({
        med_name: form.name,
        med_dosage: form.dosage,
        med_type: form.type,
        exp_date: form.expDate,
        quantity: Number(form.quantity),
        unit: form.unit,
        archived: false,
      })

    if (error) {
      console.error('Error adding medicine:', error)
      showToastMsg('Error adding medicine!')
    } else {
      setForm({ name: '', dosage: '', type: '', expDate: '', quantity: '', unit: '' })
      setShowModal(false)
      showToastMsg('Medicine added successfully!')
      fetchMedicines()
    }
  }

  // Open edit modal and pre-fill form
  const handleEditClick = (med: Medicine) => {
    setEditForm({
      id: med.id,
      name: med.med_name,
      dosage: med.med_dosage,
      type: med.med_type,
      expDate: med.exp_date,
      quantity: String(med.quantity),
      unit: med.unit || '',
    })
    setShowEditModal(true)
  }

  // Save edited medicine
  const handleEditSave = async () => {
    if (!editForm.name) return

    const { error } = await supabase
      .from('warehouse_medicines')
      .update({
        med_name: editForm.name,
        med_dosage: editForm.dosage,
        med_type: editForm.type,
        exp_date: editForm.expDate,
        quantity: Number(editForm.quantity),
        unit: editForm.unit,
      })
      .eq('id', editForm.id)

    if (error) {
      console.error('Error updating medicine:', error)
      showToastMsg('Error updating medicine!')
    } else {
      setShowEditModal(false)
      showToastMsg('Medicine updated successfully!')
      fetchMedicines()
    }
  }

  const sortedMedicines = useMemo(() => {
    const filtered = medicines.filter(m => (showArchived ? m.archived : !m.archived))
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
      'No.': i + 1,
      'Medicine Name': m.med_name,
      'Mg (Dosage)': m.med_dosage,
      'Medicine Type': m.med_type,
      'EXP Date': m.exp_date,
      'Stock Quantity': m.quantity,
      'Unit': m.unit,
    }))
  }

  const handleExportExcel = () => {
    const data = getExportData()
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Medicine Stock')
    ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 10 }]
    XLSX.writeFile(wb, 'medicine-stock.xlsx')
    setShowExport(false)
    showToastMsg('Exported as Excel successfully!')
  }

  const handleExportPDF = () => {
    const data = getExportData()
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Medicine Stock Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22)
    autoTable(doc, {
      startY: 28,
      head: [['No.', 'Medicine Name', 'Mg (Dosage)', 'Medicine Type', 'EXP Date', 'Stock Quantity', 'Unit']],
      body: data.map(d => Object.values(d).map(String)),
      headStyles: { fillColor: [26, 107, 47] },
      alternateRowStyles: { fillColor: [240, 248, 240] },
      styles: { fontSize: 9 },
    })
    doc.save('medicine-stock.pdf')
    setShowExport(false)
    showToastMsg('Exported as PDF successfully!')
  }

  const handleExportCSV = () => {
    const data = getExportData()
    const headers = Object.keys(data[0]).join(',')
    const csvRows = data.map(d => Object.values(d).join(',')).join('\n')
    const csv = `${headers}\n${csvRows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'medicine-stock.csv'
    a.click()
    URL.revokeObjectURL(url)
    setShowExport(false)
    showToastMsg('Exported as CSV successfully!')
  }

  const rows = 12
  const tdClass = "px-3 py-2.5 text-xs text-gray-700 dark:text-[#9ab89a] border-r border-green-100 dark:border-[#2a3a2a] last:border-r-0"
  const thClass = "text-xs font-medium px-3 py-2.5 text-left border-r border-green-700 dark:border-[#1a4a2a] last:border-r-0"

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f1410]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="p-5 overflow-y-auto bg-gray-50 dark:bg-[#0f1410] relative">

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-medium text-green-800 dark:text-[#7aba7a]">Medicine Stocks</h1>
            <div className="flex items-center gap-3">
              {selectedCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-[#7a9a7a]">{selectedCount} selected</span>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-green-800 dark:bg-[#0d3d1a] text-white text-sm px-5 py-2 rounded-full hover:bg-green-700 transition-colors">
                + Medicine
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161d17] border border-gray-200 dark:border-[#2a3a2a] rounded-xl overflow-hidden">

            <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 dark:border-[#2a3a2a] flex-wrap bg-white dark:bg-[#161d17]">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-[#9ab89a] cursor-pointer select-none">
                <input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} className="accent-green-700 w-3.5 h-3.5" />
                Select All
              </label>

              <div className="w-px h-4 bg-gray-200 dark:bg-[#2a3a2a]"></div>

              <button
                onClick={handleArchiveClick}
                disabled={selectedCount === 0}
                className={`flex items-center gap-1.5 text-xs transition-colors
                  ${selectedCount > 0 ? 'text-green-700 dark:text-[#7aba7a] cursor-pointer' : 'text-gray-300 dark:text-[#3a5a3a] cursor-not-allowed'}`}>
                <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors
                  ${selectedCount > 0 ? 'border-green-700 dark:border-[#7aba7a]' : 'border-gray-300 dark:border-[#3a5a3a]'}`}>
                  {selectedCount > 0 && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4L3 6L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                Archive
                {selectedCount > 0 && (
                  <span className="bg-green-700 text-white text-xs px-1.5 py-0.5 rounded-full leading-none ml-1">{selectedCount}</span>
                )}
              </button>

              <div className="w-px h-4 bg-gray-200 dark:bg-[#2a3a2a]"></div>

              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-[#9ab89a] cursor-pointer select-none">
                <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="accent-green-700 w-3.5 h-3.5" />
                Show Archived
              </label>

              <div className="w-px h-4 bg-gray-200 dark:bg-[#2a3a2a]"></div>

              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-[#9ab89a] cursor-pointer select-none">
                <input type="checkbox" checked={sortAZ} onChange={e => setSortAZ(e.target.checked)} className="accent-green-700 w-3.5 h-3.5" />
                A-Z
              </label>

              <div className="w-px h-4 bg-gray-200 dark:bg-[#2a3a2a]"></div>

              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-[#9ab89a] cursor-pointer select-none">
                <input type="checkbox" checked={ascending} onChange={e => handleAscending(e.target.checked)} className="accent-green-700 w-3.5 h-3.5" />
                Ascending
              </label>

              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-[#9ab89a] cursor-pointer select-none">
                <input type="checkbox" checked={descending} onChange={e => handleDescending(e.target.checked)} className="accent-green-700 w-3.5 h-3.5" />
                Descending
              </label>

              <div className="ml-auto relative" ref={exportRef}>
                <button
                  onClick={() => setShowExport(!showExport)}
                  className="flex items-center gap-2 text-xs px-5 py-1.5 bg-green-700 text-white rounded-md hover:bg-green-600 transition-colors font-medium tracking-wide">
                  EXPORT {selectedCount > 0 && `(${selectedCount})`}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {showExport && (
                  <div className="absolute right-0 top-9 bg-white dark:bg-[#1e2e1e] border border-gray-200 dark:border-[#2a3a2a] rounded-xl shadow-lg z-20 overflow-hidden w-48">
                    <p className="text-xs text-gray-400 dark:text-[#4a6a4a] px-3 pt-3 pb-1 font-medium uppercase tracking-wider">
                      {selectedCount > 0 ? `Export ${selectedCount} selected` : 'Export All'}
                    </p>
                    <button onClick={handleExportExcel} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs text-gray-700 dark:text-[#9ab89a] hover:bg-green-50 dark:hover:bg-[#1e301e] transition-colors text-left">
                      <span className="text-base">📊</span> Excel (.xlsx)
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs text-gray-700 dark:text-[#9ab89a] hover:bg-green-50 dark:hover:bg-[#1e301e] transition-colors text-left">
                      <span className="text-base">📄</span> PDF (.pdf)
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-3 w-full px-3 py-2.5 text-xs text-gray-700 dark:text-[#9ab89a] hover:bg-green-50 dark:hover:bg-[#1e301e] transition-colors text-left">
                      <span className="text-base">📋</span> CSV (.csv)
                    </button>
                  </div>
                )}
              </div>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-green-800 dark:bg-[#0d3d1a] text-white">
                  <th className="px-3 py-2.5 w-10 border-r border-green-700 dark:border-[#1a4a2a]"></th>
                  <th className={thClass}>No.</th>
                  <th className={thClass}>Medicine Name</th>
                  <th className={thClass}>Mg (Dosage)</th>
                  <th className={thClass}>Medicine Type</th>
                  <th className={thClass}>EXP Date</th>
                  <th className={thClass}>Stock Quantity</th>
                  <th className={thClass}>Unit</th>
                  <th className="text-xs font-medium px-3 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-xs text-gray-400 dark:text-[#4a6a4a]">
                      Loading medicines...
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: rows }).map((_, i) => {
                    const med = sortedMedicines[i]
                    return (
                      <tr key={i}
                        className={`border-b border-green-100 dark:border-[#2a3a2a] transition-colors
                          ${med?.selected ? 'bg-green-50 dark:bg-[#1e301e]' : 'hover:bg-green-50 dark:hover:bg-[#1e2e1e]'}`}>
                        <td className="px-3 py-2.5 text-center border-r border-green-100 dark:border-[#2a3a2a] w-10">
                          <input
                            type="checkbox"
                            checked={med?.selected || false}
                            onChange={e => med && handleSelectOne(med.id, e.target.checked)}
                            className="accent-green-700 w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                        <td className={`${tdClass} text-gray-400 dark:text-[#7a9a7a] w-10`}>{i + 1}</td>
                        <td className={`${tdClass} font-medium`}>{med?.med_name || ''}</td>
                        <td className={tdClass}>{med?.med_dosage || ''}</td>
                        <td className={tdClass}>{med?.med_type || ''}</td>
                        <td className={tdClass}>{med?.exp_date || ''}</td>
                        <td className={tdClass}>{med?.quantity ?? ''}</td>
                        <td className={tdClass}>{med?.unit || ''}</td>
                        <td className="px-3 py-2.5">
                          {med && (
                            <button
                              onClick={() => handleEditClick(med)}
                              className="flex items-center gap-1 text-xs text-green-700 dark:text-[#7aba7a] hover:text-green-500 transition-colors">
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30">
              <div className="bg-white dark:bg-[#161d17] rounded-2xl shadow-xl p-8 w-[380px] border border-gray-200 dark:border-[#2a3a2a]">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-50 dark:bg-yellow-900/20 mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-gray-800 dark:text-[#c0d8c0] text-center mb-2">Archive Medicine</h2>
                <p className="text-sm text-gray-500 dark:text-[#7a9a7a] text-center mb-2">Are you sure you want to archive</p>
                <p className="text-sm font-medium text-green-700 dark:text-[#7aba7a] text-center mb-4">
                  {selectedCount} selected {selectedCount === 1 ? 'medicine' : 'medicines'}?
                </p>
                <p className="text-xs text-gray-400 dark:text-[#4a6a4a] text-center mb-6">
                  Archived medicines will be hidden from the list. You can view them by enabling Show Archived.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setShowArchiveConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">
                    CANCEL
                  </button>
                  <button onClick={handleArchiveConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors">
                    CONFIRM
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Medicine Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30">
              <div className="bg-white dark:bg-[#161d17] rounded-2xl shadow-xl p-8 w-[420px] border border-gray-200 dark:border-[#2a3a2a]">
                <h2 className="text-xl font-medium text-gray-800 dark:text-[#c0d8c0] mb-6">Add Medicine</h2>
                <div className="flex flex-col gap-4">
                  {[
                    { label: 'Medicine Name', key: 'name', type: 'text' },
                    { label: 'Mg/Dosage', key: 'dosage', type: 'text' },
                    { label: 'Medicine Type', key: 'type', type: 'text' },
                    { label: 'EXP Date', key: 'expDate', type: 'date' },
                    { label: 'Quantity', key: 'quantity', type: 'number' },
                    { label: 'Unit', key: 'unit', type: 'text' },
                  ].map(({ label, key, type }) => (
                    <div key={key} className="flex items-center gap-4">
                      <label className="text-sm text-gray-600 dark:text-[#9ab89a] w-36 flex-shrink-0">{label}:</label>
                      <input
                        type={type}
                        value={form[key as keyof typeof form]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        className="flex-1 border border-gray-300 dark:border-[#2a3a2a] rounded-lg px-3 py-1.5 text-sm outline-none bg-white dark:bg-[#0f1410] text-gray-700 dark:text-[#9ab89a] focus:border-green-600 transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">
                    CANCEL
                  </button>
                  <button onClick={handleAdd}
                    className="flex-1 py-2.5 rounded-xl border-2 border-green-700 text-green-700 dark:text-green-400 dark:border-green-600 text-sm font-medium hover:bg-green-50 dark:hover:bg-[#1e2e1e] transition-colors">
                    CONFIRM
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Medicine Modal */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30">
              <div className="bg-white dark:bg-[#161d17] rounded-2xl shadow-xl p-8 w-[420px] border border-gray-200 dark:border-[#2a3a2a]">
                <h2 className="text-xl font-medium text-gray-800 dark:text-[#c0d8c0] mb-6">Edit Medicine</h2>
                <div className="flex flex-col gap-4">
                  {[
                    { label: 'Medicine Name', key: 'name', type: 'text' },
                    { label: 'Mg/Dosage', key: 'dosage', type: 'text' },
                    { label: 'Medicine Type', key: 'type', type: 'text' },
                    { label: 'EXP Date', key: 'expDate', type: 'date' },
                    { label: 'Quantity', key: 'quantity', type: 'number' },
                    { label: 'Unit', key: 'unit', type: 'text' },
                  ].map(({ label, key, type }) => (
                    <div key={key} className="flex items-center gap-4">
                      <label className="text-sm text-gray-600 dark:text-[#9ab89a] w-36 flex-shrink-0">{label}:</label>
                      <input
                        type={type}
                        value={editForm[key as keyof typeof editForm]}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                        className="flex-1 border border-gray-300 dark:border-[#2a3a2a] rounded-lg px-3 py-1.5 text-sm outline-none bg-white dark:bg-[#0f1410] text-gray-700 dark:text-[#9ab89a] focus:border-green-600 transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">
                    CANCEL
                  </button>
                  <button onClick={handleEditSave}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors">
                    SAVE CHANGES
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-700 text-white text-sm px-6 py-3 rounded-full shadow-lg z-50">
              ✓ {toast}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}