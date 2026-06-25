'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
  boxes: number
  pcs_per_box: number
  partial_pcs: number
  description: string | null
  unit: string
  category: 'drug' | 'supply'
  selected: boolean
  archived: boolean
}

type Tab = 'drug' | 'supply' | 'archived'

type ImportRow = {
  med_name: string
  med_dosage: string
  med_type: string
  unit: string
  exp_date: string
  boxes: number
  pcs_per_box: number
  partial_pcs: number
  quantity: number
  category: 'drug' | 'supply'
}

const DRUG_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Vaccine', 'Injection', 'Ointment', 'Suspension', 'Drops']
const SUPPLY_TYPES = ['Lab Supply', 'Medical Form', 'Medical Tape', 'Insecticide', 'PPE', 'Syringe', 'Other']

const IconDrug = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
    <circle cx="18" cy="18" r="4" />
    <path d="M18 14v8M14 18h8" />
  </svg>
)
const IconSupply = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
  </svg>
)
const IconArchive = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
)
const IconImport = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconExcelFile = () => (
  <svg width="28" height="32" viewBox="0 0 34 40" fill="none">
    <path d="M4 0h18l12 12v24a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#dcfce7" />
    <path d="M22 0l12 12H26a4 4 0 0 1-4-4V0z" fill="#86efac" />
    <text x="17" y="30" textAnchor="middle" fontSize="9" fontWeight="800" fill="#16a34a" fontFamily="inherit">XLS</text>
  </svg>
)
const IconPdfFile = () => (
  <svg width="28" height="32" viewBox="0 0 34 40" fill="none">
    <path d="M4 0h18l12 12v24a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#fee2e2" />
    <path d="M22 0l12 12H26a4 4 0 0 1-4-4V0z" fill="#fca5a5" />
    <text x="17" y="30" textAnchor="middle" fontSize="10" fontWeight="800" fill="#dc2626" fontFamily="inherit">PDF</text>
  </svg>
)
const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconCsvFile = () => (
  <svg width="28" height="32" viewBox="0 0 34 40" fill="none">
    <path d="M4 0h18l12 12v24a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#dbeafe" />
    <path d="M22 0l12 12H26a4 4 0 0 1-4-4V0z" fill="#93c5fd" />
    <text x="17" y="30" textAnchor="middle" fontSize="9" fontWeight="800" fill="#2563eb" fontFamily="inherit">CSV</text>
  </svg>
)

export default function MedicineStockPage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('drug')

  const [showModal, setShowModal] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const [selectAll, setSelectAll] = useState(false)
  const [sortAZ, setSortAZ] = useState(false)
  const [ascending, setAscending] = useState(false)
  const [descending, setDescending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState('')
  const exportRef = useRef<HTMLDivElement>(null)

  const blankForm = { name: '', dosage: '', type: '', expDate: '', boxes: '', pcsPerBox: '', partialPcs: '', unit: '', description: '' }
  const [form, setForm] = useState(blankForm)

  const [typeDropdownOpen, setTypeDropdownOpen] = useState<'add' | 'edit' | null>(null)

  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null)
  const [importing, setImporting] = useState(false)

  const selectedCount = medicines.filter(m => m.selected).length

  useEffect(() => { setMounted(true); fetchMedicines() }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showToastMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchMedicines = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('warehouse_medicines').select('*').order('created_at', { ascending: false })
    const all = (data || []) as Medicine[]

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const expired = all.filter(m => !m.archived && m.exp_date && new Date(m.exp_date) < today)

    if (expired.length > 0) {
      await Promise.all(expired.map(m =>
        supabase.from('warehouse_medicines').update({ archived: true }).eq('id', m.id)
      ))
      const { data: fresh } = await supabase.from('warehouse_medicines').select('*').order('created_at', { ascending: false })
      setMedicines((fresh || []).map((m: any) => ({ ...m, selected: false })))
      showToastMsg(`${expired.length} expired item(s) auto-archived.`)
    } else {
      setMedicines(all.map(m => ({ ...m, selected: false })))
    }
    setLoading(false)
  }, [])

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    setMedicines(prev => prev.map(m => (visibleIds.includes(m.id) ? { ...m, selected: checked } : m)))
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, selected: checked } : m))
  }

  const handleAscending = (checked: boolean) => { setAscending(checked); if (checked) setDescending(false) }
  const handleDescending = (checked: boolean) => { setDescending(checked); if (checked) setAscending(false) }

  const handleAdd = async () => {
    if (!form.name) return
    const boxes = Number(form.boxes) || 0
    const pcsPerBox = Number(form.pcsPerBox) || 0
    const partialPcs = Number(form.partialPcs) || 0
    const quantity = (boxes * pcsPerBox) + partialPcs
    const { error } = await supabase.from('warehouse_medicines').insert({
      med_name: form.name,
      med_dosage: form.dosage,
      med_type: form.type,
      exp_date: form.expDate,
      boxes,
      pcs_per_box: pcsPerBox,
      partial_pcs: partialPcs,
      quantity,
      description: form.description || null,
      unit: form.unit,
      category: activeTab === 'supply' ? 'supply' : 'drug',
      archived: false,
    })
    if (!error) {
      setForm(blankForm)
      setShowModal(false)
      showToastMsg(activeTab === 'supply' ? 'Supply added successfully!' : 'Medicine added successfully!')
      fetchMedicines()
    } else showToastMsg('Error adding item!')
  }

  const isExpired = (m: Medicine) => {
    if (!m.exp_date) return false
    const exp = new Date(m.exp_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return exp.getTime() < today.getTime()
  }
  const isArchivedEffective = (m: Medicine) => m.archived || isExpired(m)

  const tabFiltered = useMemo(() => {
    if (activeTab === 'archived') return medicines.filter(m => isArchivedEffective(m))
    return medicines.filter(m => !isArchivedEffective(m) && m.category === activeTab)
  }, [medicines, activeTab])

  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return tabFiltered
    return tabFiltered.filter(m =>
      m.med_name.toLowerCase().includes(q) ||
      (m.med_type || '').toLowerCase().includes(q) ||
      (m.med_dosage || '').toLowerCase().includes(q)
    )
  }, [tabFiltered, searchQuery])

  const sortedMedicines = useMemo(() => {
    return [...searchFiltered].sort((a, b) => {
      if (sortAZ) return a.med_name.localeCompare(b.med_name)
      if (ascending) return new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime()
      if (descending) return new Date(b.exp_date).getTime() - new Date(a.exp_date).getTime()
      return 0
    })
  }, [searchFiltered, sortAZ, ascending, descending])

  const visibleIds = sortedMedicines.map(m => m.id)

  const drugCount = medicines.filter(m => !isArchivedEffective(m) && m.category === 'drug').length
  const supplyCount = medicines.filter(m => !isArchivedEffective(m) && m.category === 'supply').length
  const archivedCount = medicines.filter(m => isArchivedEffective(m)).length

  const getExportData = () => {
    const data = selectedCount > 0 ? sortedMedicines.filter(m => m.selected) : sortedMedicines
    return data.map((m, i) => ({
      'No.': i + 1, 'Medicine Name': m.med_name,
      [activeTab === 'supply' ? 'Specification' : 'Dosage']: m.med_dosage,
      'Type': m.med_type, 'EXP Date': m.exp_date,
      'Stock Quantity': m.quantity, 'Unit': m.unit,
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
      head: [Object.keys(data[0] || {})],
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
    if (!data.length) { showToastMsg('Nothing to export!'); return }
    const headers = Object.keys(data[0]).join(',')
    const csvRows = data.map(d => Object.values(d).join(',')).join('\n')
    const blob = new Blob([`${headers}\n${csvRows}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'medicine-stock.csv'; a.click()
    URL.revokeObjectURL(url)
    setShowExport(false); showToastMsg('Exported as CSV!')
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

      const parsed: ImportRow[] = rows
        .map(row => {
          const name = String(row['Medicine Name'] ?? row['med_name'] ?? '').trim()
          if (!name) return null
          const boxes = parseInt(String(row['Boxes'] ?? row['boxes'] ?? '0'), 10)
          const partialPcs = parseInt(String(row['Partial Pcs'] ?? row['partial_pcs'] ?? '0'), 10)
          const totalQty = parseInt(String(row['Stock Quantity'] ?? row['quantity'] ?? '0'), 10)
          const quantity = totalQty > 0 ? totalQty : boxes + partialPcs

          const rawCategory = String(row['Category'] ?? row['category'] ?? '').trim().toLowerCase()
          const category: 'drug' | 'supply' = rawCategory.startsWith('supply') || rawCategory.includes('supply') ? 'supply' : 'drug'

          return {
            med_name: name,
            med_dosage: String(row['Dosage'] ?? row['Specification'] ?? row['med_dosage'] ?? '').trim(),
            med_type: String(row['Type'] ?? row['med_type'] ?? '').trim(),
            unit: String(row['Unit'] ?? row['unit'] ?? '').trim(),
            exp_date: String(row['EXP Date'] ?? row['exp_date'] ?? new Date().toISOString().split('T')[0]),
            boxes: isNaN(boxes) ? 0 : boxes,
            partial_pcs: isNaN(partialPcs) ? 0 : partialPcs,
            quantity: isNaN(quantity) ? 0 : quantity,
            category,
          } as ImportRow
        })
        .filter(Boolean) as ImportRow[]

      if (parsed.length === 0) { showToastMsg('No valid rows found in file.'); return }
      setImportPreview(parsed)
    } catch (err) {
      showToastMsg('Failed to read file.')
    }
  }

  const handleImportConfirm = async () => {
    if (!importPreview) return
    setImporting(true)
    let count = 0
    const importCategory: 'drug' | 'supply' = activeTab === 'supply' ? 'supply' : 'drug'
    for (const row of importPreview) {
      const { error } = await supabase.from('warehouse_medicines').insert({
        ...row,
        category: importCategory,
        description: null,
        archived: false,
      })
      if (!error) count++
    }
    setImporting(false)
    showToastMsg(`Imported ${count} item(s) successfully.`)
    setImportPreview(null)
    fetchMedicines()
  }

  const renderStock = (m: Medicine) => {
    const color = m.quantity === 0 ? '#dc2626' : m.quantity <= 10 ? '#d97706' : '#16a34a'
    if (m.boxes > 0) {
      return (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 900, fontSize: 15, color }}>{m.boxes} boxes</div>
          {m.partial_pcs > 0 && (
            <div style={{ fontSize: 10, color: '#e07a30', lineHeight: 1.4 }}>+{m.partial_pcs} loose pcs</div>
          )}
          <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4 }}>{m.quantity} pcs total</div>
        </div>
      )
    }
    return (
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 900, fontSize: 15, color }}>{m.quantity}</div>
        <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4 }}>{m.unit}</div>
      </div>
    )
  }

  const isSupplyTab = activeTab === 'supply'
  const typeOptions = isSupplyTab ? SUPPLY_TYPES : DRUG_TYPES

  const TabBtn = ({ tab }: { tab: 'drug' | 'supply' }) => {
    const count = tab === 'drug' ? drugCount : supplyCount
    const active = activeTab === tab
    return (
      <button onClick={() => { setActiveTab(tab); setSelectAll(false) }} className={`${styles.tabCard} ${active ? styles.tabCardActive : ''}`}>
        {tab === 'drug' ? <IconDrug /> : <IconSupply />}
        <span className={styles.tabLabel}>{tab === 'drug' ? 'Medicine Drugs' : 'Medicine Supplies'}</span>
        <span className={styles.tabCount}>{count}</span>
      </button>
    )
  }

  const ExportDropdown = () => (
    <div className={styles.exportWrap} ref={exportRef}>
      <button className={styles.exportBtn} onClick={() => setShowExport(!showExport)}>
        EXPORT {selectedCount > 0 && `(${selectedCount})`} ▾
      </button>
      {showExport && (
        <div className={styles.exportDrop}>
          <div className={styles.exportDropLabel}>
            {selectedCount > 0 ? `Export ${selectedCount} selected` : 'Export All'}
          </div>
          <button className={styles.exportDropItem} onClick={handleExportPDF}><IconPdfFile /> PDF (.pdf)</button>
          <button className={styles.exportDropItem} onClick={handleExportExcel}><IconExcelFile /> Excel (.xlsx)</button>
        </div>
      )}
    </div>
  )

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
            {activeTab !== 'archived' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <ExportDropdown />
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'transparent', color: 'var(--green)',
                  border: '2px solid var(--green)', borderRadius: 22,
                  padding: '8px 18px', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <IconImport />
                  Import
                  <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} style={{ display: 'none' }} />
                </label>
                <button className={styles.addBtn} onClick={() => { setForm(blankForm); setShowModal(true) }}>
                  <IconPlus /> {isSupplyTab ? 'Supply' : 'Medicine'}
                </button>
              </div>
            )}
          </div>

          <div className={styles.tabRow}>
            <TabBtn tab="drug" />
            <TabBtn tab="supply" />
            <button
              className={`${styles.tabCard} ${activeTab === 'archived' ? styles.tabCardActive : ''}`}
              onClick={() => { setActiveTab('archived'); setSelectAll(false) }}>
              <IconArchive />
              <span className={styles.tabLabel}>Archived</span>
              <span className={styles.tabCount}>{archivedCount}</span>
            </button>
          </div>

          <div className={styles.tableCard}>

            <div className={styles.actionBar}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} />
                Select All
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

              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search medicine, type, or dosage"
                  style={{
                    width: 260, padding: '8px 12px 8px 34px', borderRadius: 20,
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
            <table className={styles.table}>
              <thead className={styles.tableHead} style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>No.</th>
                  <th>Medicine Name</th>
                  <th>{isSupplyTab ? 'Specification' : 'Dosage'}</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>EXP Date</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className={styles.emptyState}>Loading...</td></tr>
                ) : sortedMedicines.length === 0 ? (
                  <tr><td colSpan={8} className={styles.emptyState}>No items yet.</td></tr>
                ) : (
                  sortedMedicines.map((med, i) => {
                    const expired = isExpired(med)
                    return (
                      <tr key={med.id} className={`${styles.tableRow} ${med.selected ? styles.tableRowSelected : ''}`}>
                        <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={med.selected || false}
                            onChange={e => handleSelectOne(med.id, e.target.checked)}
                            style={{ accentColor: '#16a34a' }}
                          />
                        </td>
                        <td className={`${styles.tableCell} ${styles.tableCellNum}`}>{i + 1}</td>
                        <td className={`${styles.tableCell} ${styles.tableCellName}`}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--text3)', flexShrink: 0 }}>
                              {activeTab === 'supply' ? <IconSupply /> : <IconDrug />}
                            </span>
                            {med.med_name}
                          </div>
                        </td>
                        <td className={styles.tableCell}>{med.med_dosage || ''}</td>
                        <td className={styles.tableCell}>{med.med_type || ''}</td>
                        <td className={styles.tableCell}>{med.unit || ''}</td>
                        <td className={styles.tableCell}>
                          {med.exp_date || ''}
                          {activeTab === 'archived' && expired && (
                            <span className={styles.expiredBadge}>Expired</span>
                          )}
                        </td>
                        <td className={styles.tableCell}>{renderStock(med)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>

          {showModal && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h2>Add {isSupplyTab ? 'Supply' : 'Medicine'}</h2>
                  <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
                </div>
                <div className={styles.modalBody}>
                  <div>
                    <label>{isSupplyTab ? 'Supply Name' : 'Medicine Name'}</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      placeholder={isSupplyTab ? 'e.g. Surgical Gloves' : 'e.g. Paracetamol'}
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>{isSupplyTab ? 'Specification' : 'Mg / Dosage'}</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      placeholder={isSupplyTab ? 'e.g. Large, 1 inch x 10 yards' : 'e.g. 500mg'}
                      value={form.dosage}
                      onChange={e => setForm({ ...form, dosage: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>EXP Date</label>
                    <input
                      type="date"
                      className={styles.modalInput}
                      value={form.expDate}
                      onChange={e => setForm({ ...form, expDate: e.target.value })}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label>Type</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      placeholder="Search or type a new type..."
                      value={form.type}
                      onFocus={() => setTypeDropdownOpen('add')}
                      onChange={e => { setForm({ ...form, type: e.target.value }); setTypeDropdownOpen('add') }}
                      onBlur={() => setTimeout(() => setTypeDropdownOpen(null), 120)}
                    />
                    {typeDropdownOpen === 'add' && (
                      <div className={styles.comboDrop}>
                        {typeOptions
                          .filter(t => t.toLowerCase().includes(form.type.toLowerCase()))
                          .map(t => (
                            <button
                              key={t}
                              type="button"
                              className={styles.comboDropItem}
                              onMouseDown={() => { setForm({ ...form, type: t }); setTypeDropdownOpen(null) }}>
                              {t}
                            </button>
                          ))}
                        {form.type && !typeOptions.some(t => t.toLowerCase() === form.type.toLowerCase()) && (
                          <button
                            type="button"
                            className={styles.comboDropItem}
                            onMouseDown={() => setTypeDropdownOpen(null)}>
                            Use "{form.type}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label>Unit</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      placeholder="e.g. Piece, Box, Bottle"
                      value={form.unit}
                      onChange={e => setForm({ ...form, unit: e.target.value })}
                    />
                  </div>
                  <div className={styles.fieldRow}>
                    <div>
                      <label>Boxes</label>
                      <input
                        type="number"
                        className={styles.modalInput}
                        placeholder="e.g. 12"
                        value={form.boxes}
                        onChange={e => setForm({ ...form, boxes: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Pcs per Box <span className={styles.optionalTag}>(required for box requests)</span></label>
                      <input
                        type="number"
                        className={styles.modalInput}
                        placeholder="e.g. 100"
                        value={form.pcsPerBox}
                        onChange={e => setForm({ ...form, pcsPerBox: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className={styles.fieldRow}>
                    <div>
                      <label>Partial / Loose Pcs</label>
                      <input
                        type="number"
                        className={styles.modalInput}
                        placeholder="e.g. 5"
                        value={form.partialPcs}
                        onChange={e => setForm({ ...form, partialPcs: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--green-light)', color: 'var(--green)', fontSize: 12, fontWeight: 700, width: '100%', textAlign: 'center' }}>
                        Total: {(Number(form.boxes) || 0) * (Number(form.pcsPerBox) || 0) + (Number(form.partialPcs) || 0)} pcs
                      </div>
                    </div>
                  </div>
                  <div>
                    <label>Description <span className={styles.optionalTag}>(optional)</span></label>
                    <textarea
                      className={styles.modalInput}
                      placeholder="Free-text notes about this item..."
                      rows={3}
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.btnCancel} onClick={() => setShowModal(false)}>CANCEL</button>
                  <button className={styles.btnConfirm} onClick={handleAdd}>CONFIRM</button>
                </div>
              </div>
            </div>
          )}

          {importPreview && (
            <div className={styles.modalBackdrop} onClick={() => !importing && setImportPreview(null)}>
              <div
                className={styles.modal}
                style={{ maxWidth: 860, width: 'min(860px, 100%)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                      Excel Import
                    </div>
                    <h2 style={{ margin: 0 }}>Confirm Import</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {importPreview.length} item{importPreview.length !== 1 ? 's' : ''}
                    </span>
                    <button className={styles.modalClose} onClick={() => setImportPreview(null)}>✕</button>
                  </div>
                </div>

                <div style={{ padding: '10px 22px', background: 'var(--green-light)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>
                  Please review the data below before confirming. You can edit values directly in the table.
                </div>

                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', maxHeight: '50vh' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 700 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr>
                        {['#', 'Medicine Name', isSupplyTab ? 'Specification' : 'Dosage', 'Type', 'Unit', 'EXP Date', 'Boxes', 'Partial Pcs', 'Total Qty'].map((h, i) => (
                          <th key={h} style={{
                            padding: '10px 12px', textAlign: i >= 6 ? 'right' : 'left',
                            fontSize: 10, fontWeight: 800, color: 'var(--text2)',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            borderBottom: '2px solid var(--border)',
                            background: 'var(--surface2)', whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                          <td style={{ padding: '9px 12px', color: 'var(--text3)', fontSize: 11, borderBottom: '1px solid var(--border)' }}>{i + 1}</td>
                          {(['med_name', 'med_dosage', 'med_type', 'unit', 'exp_date'] as (keyof ImportRow)[]).map(key => (
                            <td key={key} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                              <input
                                value={String(row[key])}
                                onChange={e => {
                                  const updated = [...importPreview]
                                  ;(updated[i] as any)[key] = e.target.value
                                  setImportPreview(updated)
                                }}
                                style={{
                                  border: '1px solid var(--border)', borderRadius: 6,
                                  padding: '5px 8px', fontSize: 12, width: '100%',
                                  background: 'var(--surface)', color: 'var(--text)',
                                  fontFamily: 'inherit', outline: 'none',
                                  minWidth: key === 'med_name' ? 160 : key === 'med_type' ? 110 : 80,
                                }}
                              />
                            </td>
                          ))}
                          {(['boxes', 'partial_pcs', 'quantity'] as (keyof ImportRow)[]).map(key => (
                            <td key={key} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                              <input
                                type="number"
                                value={row[key] as number}
                                onChange={e => {
                                  const updated = [...importPreview]
                                  const val = parseInt(e.target.value, 10)
                                  ;(updated[i] as any)[key] = isNaN(val) ? 0 : val
                                  if (key === 'boxes' || key === 'partial_pcs') {
                                    const b = key === 'boxes' ? (isNaN(val) ? 0 : val) : updated[i].boxes
                                    const p = key === 'partial_pcs' ? (isNaN(val) ? 0 : val) : updated[i].partial_pcs
                                    updated[i].quantity = b + p
                                  }
                                  setImportPreview(updated)
                                }}
                                style={{
                                  border: '1px solid var(--border)', borderRadius: 6,
                                  padding: '5px 8px', fontSize: 12, width: 70,
                                  background: key === 'quantity' ? 'var(--green-light)' : 'var(--surface)',
                                  color: key === 'quantity' ? 'var(--green)' : 'var(--text)',
                                  fontFamily: 'inherit', outline: 'none', textAlign: 'right',
                                  fontWeight: key === 'quantity' ? 700 : 400,
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.modalFooter}>
                  <button className={styles.btnCancel} onClick={() => setImportPreview(null)} disabled={importing}>
                    CANCEL
                  </button>
                  <button
                    className={styles.btnConfirm}
                    onClick={handleImportConfirm}
                    disabled={importing}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 2 }}
                  >
                    {importing ? `Importing ${importPreview.length} items…` : (
                      <>
                        <IconCheck /> CONFIRM IMPORT ({importPreview.length})
                      </>
                    )}
                  </button>
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
