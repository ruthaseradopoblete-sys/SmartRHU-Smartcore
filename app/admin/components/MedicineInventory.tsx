'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Pill as RxIcon, Warehouse as WhIcon } from 'lucide-react'
import {
  useAdmin, RecordPage, StatStrip, Toolbar, SearchInput, Segmented,
  Pill, DataView, downloadCSV, ExportMenu, type Column, type Tone,
} from './adminUI'

/* ── Types ─────────────────────────────────────────────────────────────────*/
interface PharmaItem {
  id: string
  med_name?: string; medicine_name?: string; generic_name?: string; brand_name?: string
  med_dosage?: string; med_type?: string; category?: string
  quantity?: number; unit?: string; exp_date?: string; expiry_date?: string
  reorder_level?: number; created_at?: string
}
interface WhMed {
  id: string
  med_name: string; med_dosage: string; med_type: string
  exp_date: string; quantity: number; unit: string
  archived?: boolean; created_at?: string
}

type TabId = 'pharmacy' | 'warehouse'

export default function MedicineInventory({ darkMode }: { darkMode: boolean }) {
  const t = useAdmin(darkMode)
  const [tab, setTab] = useState<TabId>('pharmacy')

  /* ── Pharmacy state ──────────────────────────────────────────────────────*/
  const [pItems, setPItems] = useState<PharmaItem[]>([])
  const [pLoading, setPLoading] = useState(true)
  const [pSource, setPSource] = useState('')
  const [pSearch, setPSearch] = useState('')
  const [pFilter, setPFilter] = useState<'all' | 'low' | 'out' | 'expiring'>('all')

  /* ── Warehouse state ─────────────────────────────────────────────────────*/
  const [wMeds, setWMeds] = useState<WhMed[]>([])
  const [wLoading, setWLoading] = useState(true)
  const [wSearch, setWSearch] = useState('')
  const [wFilter, setWFilter] = useState<'active' | 'archived' | 'expiring'>('active')

  /* ── Loaders ─────────────────────────────────────────────────────────────*/
  const loadPharmacy = async () => {
    setPLoading(true)
    const tries: [string, any][] = [
      ['pharma_medicines', supabase.from('pharma_medicines').select('*').eq('archived', false).order('created_at', { ascending: false })],
      ['inventory', supabase.from('inventory').select('*').order('created_at', { ascending: false })],
      ['medicine_inventory', supabase.from('medicine_inventory').select('*').order('created_at', { ascending: false })],
    ]
    for (const [nm, q] of tries) {
      const { data } = await q
      if (data && data.length > 0) { setPItems(data); setPSource(nm); setPLoading(false); return }
    }
    setPItems([]); setPSource('pharma_medicines'); setPLoading(false)
  }

  const loadWarehouse = async () => {
    setWLoading(true)
    const { data } = await supabase.from('warehouse_medicines').select('*').order('created_at', { ascending: false })
    setWMeds((data as WhMed[]) || [])
    setWLoading(false)
  }

  useEffect(() => { loadPharmacy(); loadWarehouse() }, [])

  /* ── Pharmacy helpers ────────────────────────────────────────────────────*/
  const pName = (i: PharmaItem) => i.med_name || i.medicine_name || i.generic_name || '—'
  const pDose = (i: PharmaItem) => i.med_dosage || '—'
  const pType = (i: PharmaItem) => i.med_type || i.category || '—'
  const pQty = (i: PharmaItem) => Number(i.quantity ?? 0)
  const pReorder = (i: PharmaItem) => Number(i.reorder_level ?? 10)
  const pExpiry = (i: PharmaItem) => i.exp_date || i.expiry_date || ''
  const pExpired = (i: PharmaItem) => { const d = pExpiry(i); return !!d && new Date(d) < new Date() }
  const pExpiringSoon = (i: PharmaItem) => { const d = pExpiry(i); if (!d) return false; const diff = (new Date(d).getTime() - Date.now()) / 86400000; return diff >= 0 && diff <= 90 }
  const pStock = (i: PharmaItem): { label: string; tone: Tone } =>
    pQty(i) === 0 ? { label: 'Out of Stock', tone: 'red' }
    : pQty(i) <= pReorder(i) ? { label: 'Low Stock', tone: 'amber' }
    : { label: 'In Stock', tone: 'green' }

  const pRows = useMemo(() => pItems.filter(i => {
    if (pFilter === 'low' && !(pQty(i) > 0 && pQty(i) <= pReorder(i))) return false
    if (pFilter === 'out' && pQty(i) !== 0) return false
    if (pFilter === 'expiring' && !pExpiringSoon(i)) return false
    if (pSearch && !`${pName(i)} ${pDose(i)} ${pType(i)}`.toLowerCase().includes(pSearch.toLowerCase())) return false
    return true
  }), [pItems, pFilter, pSearch])

  const pOut = pItems.filter(i => pQty(i) === 0).length
  const pLow = pItems.filter(i => pQty(i) > 0 && pQty(i) <= pReorder(i)).length
  const pExpSoon = pItems.filter(i => pExpiringSoon(i) && !pExpired(i)).length
  const pExpired2 = pItems.filter(i => pExpired(i)).length

  const pColumns: Column<PharmaItem>[] = [
    { key: 'no', header: '#', width: 44, cell: (_i, idx) => <span style={{ color: t.txt2, fontWeight: 700 }}>{idx + 1}</span> },
    { key: 'name', header: 'Medicine', cell: i => (
      <div>
        <div style={{ fontWeight: 700, color: t.txt }}>{pName(i)}</div>
        {i.brand_name && <div style={{ fontSize: 10, color: t.txt2, fontStyle: 'italic' }}>{i.brand_name}</div>}
      </div>
    ) },
    { key: 'dose', header: 'Dosage', cell: i => <span style={{ fontSize: 11.5, color: t.txt2 }}>{pDose(i)}</span> },
    { key: 'type', header: 'Type', cell: i => <span style={{ fontSize: 11.5, color: t.txt2 }}>{pType(i)}</span> },
    { key: 'qty', header: 'Qty', align: 'right', cell: i => (
      <span style={{ fontWeight: 800, fontSize: 14, color: pQty(i) === 0 ? '#dc2626' : pQty(i) <= pReorder(i) ? '#d97706' : t.txt }}>{pQty(i)}</span>
    ) },
    { key: 'unit', header: 'Unit', cell: i => <span style={{ fontSize: 11.5, color: t.txt2 }}>{i.unit || '—'}</span> },
    { key: 'exp', header: 'Expiry', cell: i => (
      <span style={{ fontSize: 11.5, fontWeight: 600, color: pExpired(i) ? '#dc2626' : pExpiringSoon(i) ? '#d97706' : t.txt2 }}>{pExpiry(i) || '—'}</span>
    ) },
    { key: 'stock', header: 'Status', cell: i => { const s = pStock(i); return <Pill tone={s.tone}>{s.label}</Pill> } },
  ]

  const pData = () => ({
    headers: ['No.', 'Medicine', 'Dosage', 'Type', 'Quantity', 'Unit', 'Expiry', 'Status'],
    body: pRows.map((i, idx) => [idx + 1, pName(i), pDose(i), pType(i), pQty(i), i.unit || '', pExpiry(i), pStock(i).label]),
  })

  /* ── Warehouse helpers ───────────────────────────────────────────────────*/
  const wExpired = (m: WhMed) => !!m.exp_date && new Date(m.exp_date) < new Date()
  const wExpiringSoon = (m: WhMed) => { if (!m.exp_date) return false; const d = (new Date(m.exp_date).getTime() - Date.now()) / 86400000; return d >= 0 && d <= 90 }
  const wTone = (m: WhMed): Tone => wExpired(m) ? 'red' : wExpiringSoon(m) ? 'amber' : 'green'

  const wRows = useMemo(() => wMeds.filter(m => {
    if (wFilter === 'active' && m.archived) return false
    if (wFilter === 'archived' && !m.archived) return false
    if (wFilter === 'expiring' && !wExpiringSoon(m) && !wExpired(m)) return false
    if (wSearch && !`${m.med_name} ${m.med_dosage} ${m.med_type}`.toLowerCase().includes(wSearch.toLowerCase())) return false
    return true
  }), [wMeds, wFilter, wSearch])

  const wActive = wMeds.filter(m => !m.archived).length
  const wArchived = wMeds.filter(m => m.archived).length
  const wExpSoon = wMeds.filter(m => wExpiringSoon(m)).length
  const wExpired2 = wMeds.filter(m => wExpired(m)).length
  const wUnits = wMeds.filter(m => !m.archived).reduce((s, m) => s + Number(m.quantity || 0), 0)

  const wColumns: Column<WhMed>[] = [
    { key: 'no', header: '#', width: 44, cell: (_m, i) => <span style={{ color: t.txt2, fontWeight: 700 }}>{i + 1}</span> },
    { key: 'name', header: 'Medicine', cell: m => <span style={{ fontWeight: 700, color: t.txt }}>{m.med_name || '—'}</span> },
    { key: 'dose', header: 'Dosage', cell: m => <span style={{ fontSize: 11.5, color: t.txt2 }}>{m.med_dosage || '—'}</span> },
    { key: 'type', header: 'Type', cell: m => <span style={{ fontSize: 11.5, color: t.txt2 }}>{m.med_type || '—'}</span> },
    { key: 'qty', header: 'Stock', align: 'right', cell: m => <span style={{ fontWeight: 800, fontSize: 14, color: t.txt }}>{m.quantity ?? 0}</span> },
    { key: 'unit', header: 'Unit', cell: m => <span style={{ fontSize: 11.5, color: t.txt2 }}>{m.unit || '—'}</span> },
    { key: 'exp', header: 'Expiry', cell: m => <Pill tone={wTone(m)}>{m.exp_date || '—'}</Pill> },
  ]

  const wData = () => ({
    headers: ['No.', 'Medicine', 'Dosage', 'Type', 'Stock', 'Unit', 'Expiry', 'State'],
    body: wRows.map((m, i) => [i + 1, m.med_name, m.med_dosage, m.med_type, m.quantity, m.unit, m.exp_date, m.archived ? 'Archived' : 'Active']),
  })

  /* ── Export: CSV / Excel / PDF (shared) ─────────────────────────────────── */
  const exportAs = (format: 'csv' | 'excel' | 'pdf', filename: string, title: string, headers: string[], body: any[][]) => {
    if (format === 'csv') { downloadCSV(`${filename}.csv`, headers, body); return }
    if (format === 'excel') {
      const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const html =
        `<table border="1"><thead><tr style="background:#1a7a1a;color:#fff">${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
        `<tbody>${body.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      const blob = new Blob([`\uFEFF<html><head><meta charset="utf-8"></head><body>${html}</body></html>`], { type: 'application/vnd.ms-excel' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${filename}.xls`; a.click()
      URL.revokeObjectURL(url)
      return
    }
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;font-size:11px;color:#111}
        h1{color:#1a7a1a;font-size:18px;border-bottom:3px solid #1a7a1a;padding-bottom:8px;margin-bottom:4px}
        .meta{font-size:10px;color:#666;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:10px}
        th{background:#1a7a1a;color:#fff;padding:6px 8px;text-align:left}
        td{padding:5px 8px;border-bottom:1px solid #e5e7eb;word-break:break-word}
        tr:nth-child(even){background:#f9fafb}
        @media print{body{padding:0}}
      </style></head><body>
      <h1>${title} — SmartRHU</h1>
      <div class="meta">RHU Lopez, Quezon &nbsp;|&nbsp; Records: <b>${body.length}</b> &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${body.map(row => `<tr>${row.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const pMenu = [
    { label: 'Export CSV',   onClick: () => { const d = pData(); exportAs('csv',   'pharmacy-inventory', 'Pharmacy Inventory', d.headers, d.body) } },
    { label: 'Export Excel', onClick: () => { const d = pData(); exportAs('excel', 'pharmacy-inventory', 'Pharmacy Inventory', d.headers, d.body) } },
    { label: 'Export PDF',   onClick: () => { const d = pData(); exportAs('pdf',   'pharmacy-inventory', 'Pharmacy Inventory', d.headers, d.body) } },
  ]
  const wMenu = [
    { label: 'Export CSV',   onClick: () => { const d = wData(); exportAs('csv',   'warehouse-inventory', 'Warehouse Inventory', d.headers, d.body) } },
    { label: 'Export Excel', onClick: () => { const d = wData(); exportAs('excel', 'warehouse-inventory', 'Warehouse Inventory', d.headers, d.body) } },
    { label: 'Export PDF',   onClick: () => { const d = wData(); exportAs('pdf',   'warehouse-inventory', 'Warehouse Inventory', d.headers, d.body) } },
  ]

  /* ── Tab button ──────────────────────────────────────────────────────────*/
  const TabBtn = ({ id, label, Icon }: { id: TabId; label: string; Icon: React.ElementType }) => {
    const on = tab === id
    return (
      <button onClick={() => setTab(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 12, cursor: 'pointer',
          border: `1.5px solid ${on ? '#1a7a1a' : t.bdr}`,
          background: on ? 'linear-gradient(135deg,#1a7a1a,#0d9488)' : t.card,
          color: on ? '#fff' : t.txt, fontSize: 13, fontWeight: 800, transition: 'all .15s',
          boxShadow: on ? '0 6px 16px rgba(26,122,26,0.28)' : 'none',
        }}>
        <Icon size={16} strokeWidth={2.4} />
        {label}
      </button>
    )
  }

  const subtitle = tab === 'pharmacy'
    ? `${pSource ? ` · ` : ''}`
    : ''

  return (
    <RecordPage t={t} title="Medicine Inventory" subtitle={subtitle}
      onRefresh={tab === 'pharmacy' ? loadPharmacy : loadWarehouse} fit>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        <TabBtn id="pharmacy" label="Pharmacy" Icon={RxIcon} />
        <TabBtn id="warehouse" label="Warehouse" Icon={WhIcon} />
      </div>

      {tab === 'pharmacy' ? (
        <>
          <div style={{ flexShrink: 0 }}>
            <StatStrip t={t} items={[
              { label: 'Total Items', value: pItems.length, color: '#1a7a1a', active: pFilter === 'all', onClick: () => setPFilter('all') },
              { label: 'Out of Stock', value: pOut, color: '#dc2626', active: pFilter === 'out', alert: pOut > 0, onClick: () => setPFilter('out') },
              { label: 'Low Stock', value: pLow, color: '#d97706', active: pFilter === 'low', alert: pLow > 0, onClick: () => setPFilter('low') },
              { label: 'Expiring Soon', value: pExpSoon, color: '#7c3aed', active: pFilter === 'expiring', onClick: () => setPFilter('expiring') },
              { label: 'Expired', value: pExpired2, color: '#64748b', alert: pExpired2 > 0 },
            ]} />
          </div>

          <div style={{ flexShrink: 0 }}>
            <Toolbar t={t}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SearchInput t={t} value={pSearch} onChange={setPSearch} placeholder="Search medicine, dosage, type…" />
                <ExportMenu t={t} items={pMenu} />
              </div>
              <Segmented t={t} value={pFilter} onChange={setPFilter} options={[
                { value: 'all', label: 'All' }, { value: 'low', label: 'Low' }, { value: 'out', label: 'Out' }, { value: 'expiring', label: 'Expiring' },
              ]} />
            </Toolbar>
          </div>

          <DataView t={t} columns={pColumns} rows={pRows} loading={pLoading}
            keyOf={i => i.id} resetKey={`p|${pSearch}|${pFilter}`}
            emptyText="No medicines match your filters." fill />
        </>
      ) : (
        <>
          <div style={{ flexShrink: 0 }}>
            <StatStrip t={t} items={[
              { label: 'Active Items', value: wActive, color: '#1a7a1a' },
              { label: 'Total Units', value: wUnits, color: '#0d9488' },
              { label: 'Expiring Soon', value: wExpSoon, color: '#d97706', alert: wExpSoon > 0 },
              { label: 'Expired', value: wExpired2, color: '#dc2626', alert: wExpired2 > 0 },
              { label: 'Archived', value: wArchived, color: '#64748b' },
            ]} />
          </div>

          <div style={{ flexShrink: 0 }}>
            <Toolbar t={t}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SearchInput t={t} value={wSearch} onChange={setWSearch} placeholder="Search medicine, dosage, type…" />
                <ExportMenu t={t} items={wMenu} />
              </div>
              <Segmented t={t} value={wFilter} onChange={setWFilter} options={[
                { value: 'active', label: 'Active' }, { value: 'expiring', label: 'Expiring' }, { value: 'archived', label: 'Archived' },
              ]} />
            </Toolbar>
          </div>

          <DataView t={t} columns={wColumns} rows={wRows} loading={wLoading}
            keyOf={m => m.id} resetKey={`w|${wSearch}|${wFilter}`}
            emptyText="No warehouse medicines match your filters." fill />
        </>
      )}
    </RecordPage>
  )
}