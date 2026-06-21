'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './warehouse.module.css'

interface RestockItem {
  qty: number
  type: string
  unit: string
  dosage: string
  medicine: string
}

interface RestockRequest {
  id: string
  items: RestockItem[]
  status: string
  stock_deducted: boolean
}

interface Props {
  onStockChanged?: () => void
}

export default function RestockListener({ onStockChanged }: Props) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null)
  // Guards against double-processing the same request id within one session
  const processingIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Catch any requests that were already marked 'received' before this
    // listener mounted (e.g. it happened while the warehouse dashboard was closed).
    checkMissedRequests()

    const channel = supabase
      .channel('pharma_restock_listener')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pharma_restock_request' },
        (payload) => {
          const row = payload.new as RestockRequest
          if (row.status === 'received' && !row.stock_deducted) {
            handleReceived(row)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkMissedRequests() {
    const { data } = await supabase
      .from('pharma_restock_request')
      .select('id, items, status, stock_deducted')
      .eq('status', 'received')
      .eq('stock_deducted', false)

    if (data) {
      for (const row of data) {
        handleReceived(row as RestockRequest)
      }
    }
  }

  async function handleReceived(row: RestockRequest) {
    if (processingIds.current.has(row.id)) return
    processingIds.current.add(row.id)

    const results: { medicine: string; ok: boolean; reason?: string }[] = []

    for (const item of row.items || []) {
      const result = await deductStock(item)
      results.push(result)
    }

    // Mark this request as processed so it's never deducted twice
    await supabase
      .from('pharma_restock_request')
      .update({ stock_deducted: true })
      .eq('id', row.id)

    const failed = results.filter(r => !r.ok)
    if (failed.length === 0) {
      setToast({
        message: `Stock updated — pharmacist confirmed receipt of ${results.length} item${results.length !== 1 ? 's' : ''}.`,
        type: 'success',
      })
    } else {
      setToast({
        message: `Received confirmed, but ${failed.length} item${failed.length !== 1 ? 's' : ''} couldn't be matched to inventory. Please check manually.`,
        type: 'warning',
      })
    }

    setTimeout(() => setToast(null), 5000)
    onStockChanged?.()
  }

  // Deducts qty from the earliest-expiring batch(es) of a matching medicine (FEFO).
  // If one batch doesn't have enough, it spills over into the next-soonest-to-expire batch.
  async function deductStock(item: RestockItem): Promise<{ medicine: string; ok: boolean; reason?: string }> {
    const { data: batches, error } = await supabase
      .from('warehouse_medicines')
      .select('id, quantity, exp_date')
      .eq('archived', false)
      .ilike('med_name', item.medicine.trim())
      .gt('quantity', 0)
      .order('exp_date', { ascending: true })

    if (error || !batches || batches.length === 0) {
      return { medicine: item.medicine, ok: false, reason: 'No matching medicine found in warehouse' }
    }

    let remaining = item.qty
    for (const batch of batches) {
      if (remaining <= 0) break
      const deduct = Math.min(remaining, batch.quantity)
      await supabase
        .from('warehouse_medicines')
        .update({ quantity: batch.quantity - deduct })
        .eq('id', batch.id)
      remaining -= deduct
    }

    if (remaining > 0) {
      return { medicine: item.medicine, ok: false, reason: 'Insufficient stock across all batches' }
    }
    return { medicine: item.medicine, ok: true }
  }

  if (!toast) return null

  return (
    <div
      className={styles.toast}
      style={toast.type === 'warning' ? { background: '#f59e0b' } : undefined}
    >
      {toast.type === 'success' ? '✓' : '⚠'} {toast.message}
    </div>
  )
}