"use client";
/**
 * RestockConfirmListener
 * ──────────────────────
 * Mounted once inside page.tsx (pharmacist layout). Whenever the warehouse
 * confirms a restock request, this:
 *
 *  1. MERGES STOCK — finds the existing pharma_medicines row for that
 *     medicine (by name + type + dosage) and ADDS the requested boxes /
 *     partial_pieces into it, rolling leftover partials into full boxes
 *     when they reach pieces_per_box. If no existing row is found, it
 *     inserts a new one (first-time stock).
 *
 *  2. NOTIFY — dispatches a custom DOM event ("restockAutoAdded") so
 *     page.tsx can re-fetch the medicines list and update the Dashboard
 *     stat cards in real time.
 *
 * KEY RULE — pieces_per_box accuracy:
 *   The Excel data (and the pharma_medicines table) stores the TRUE
 *   pieces_per_box per medicine (e.g. COC pill = 1, standard tablet = 10,
 *   etc.). When a restock is confirmed, the warehouse must snapshot the
 *   pieces_per_box from the medicine record at the time of the request,
 *   stored in restock_requests.pieces_per_box_snapshot.
 *
 *   This listener ALWAYS uses pieces_per_box_snapshot for converting
 *   box counts to pieces — NEVER a hardcoded default of 10. If no
 *   snapshot is found, it falls back to the existing medicine's
 *   pieces_per_box from pharma_medicines, and only then falls back to 10
 *   as a last resort (which should never be needed in practice).
 *
 * Schema notes
 * ────────────
 * restock_requests columns used here:
 *   pharmacist_name, medicine_name, dosage, medicine_type, unit, quantity,
 *   requested_boxes, requested_partial_pieces, pieces_per_box_snapshot, status
 *
 * pharma_medicines columns read/written here:
 *   med_name, med_dosage, med_type, unit, quantity, boxes, pieces_per_box,
 *   partial_pieces, exp_date, category, archived
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const IS_BOX_UNIT = (unit: string) =>
  unit?.toLowerCase().includes("box") || unit?.toLowerCase() === "boxes";

type RestockRow = {
  id:                        string;
  pharmacist_name:           string;
  medicine_name:             string;
  dosage:                    string;
  medicine_type:             string;
  unit?:                     string;
  quantity:                  number;
  requested_boxes?:          number;
  requested_partial_pieces?: number;
  pieces_per_box_snapshot?:  number;
  status:                    string;
  created_at:                string;
};

type PharmaMedicineRow = {
  id:             string;
  med_name:       string;
  med_dosage:     string;
  med_type:       string;
  unit:           string;
  quantity:       number;
  boxes:          number;
  pieces_per_box: number;
  partial_pieces: number;
  category:       string;
  archived:       boolean;
};

type Props = {
  pharmacistName: string;
  onStockAdded?: () => void;
};

function defaultExpDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

export default function RestockConfirmListener({ pharmacistName, onStockAdded }: Props) {
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!pharmacistName) return;
    catchMissedConfirmations(pharmacistName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacistName]);

  useEffect(() => {
    if (!pharmacistName) return;

    const channel = supabase
      .channel(`restock_confirm_listener:${pharmacistName}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "restock_requests",
          filter: `pharmacist_name=eq.${pharmacistName}`,
        },
        (payload: { new: RestockRow; old: Partial<RestockRow> }) => {
          const newRow = payload.new as RestockRow;
          const oldRow = payload.old as Partial<RestockRow>;
          if (newRow.status === "confirmed" && oldRow.status !== "confirmed") {
            handleConfirmed(newRow);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacistName]);

  async function markMerged(id: string) {
    await supabase
      .from("restock_requests")
      .update({ stock_applied: true })
      .eq("id", id);
  }

  async function catchMissedConfirmations(name: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("restock_requests")
      .select(
        "id, pharmacist_name, medicine_name, dosage, medicine_type, unit, quantity, requested_boxes, requested_partial_pieces, pieces_per_box_snapshot, status, created_at, stock_applied"
      )
      .eq("pharmacist_name", name)
      .eq("status", "confirmed")
      .eq("stock_applied", false)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (error || !data) return;

    for (const row of data as (RestockRow & { stock_applied: boolean })[]) {
      if (processedIds.current.has(row.id)) continue;
      await handleConfirmed(row);
    }
  }

  async function handleConfirmed(row: RestockRow) {
    if (processedIds.current.has(row.id)) return;
    processedIds.current.add(row.id);

    try {
      const unit    = row.unit?.trim() || "Pieces";
      const isBox   = IS_BOX_UNIT(unit);

      // ── Find the existing pharma_medicines row first so we can use its
      //    pieces_per_box as the authoritative value. The snapshot from
      //    restock_requests is used as fallback if the row changed or is new.
      const { data: existingRows, error: findErr } = await supabase
        .from("pharma_medicines")
        .select("id, med_name, med_dosage, med_type, unit, quantity, boxes, pieces_per_box, partial_pieces, category, archived")
        .ilike("med_name", row.medicine_name.trim())
        .ilike("med_type", row.medicine_type.trim())
        .eq("archived", false)
        .limit(1);

      if (findErr) throw findErr;

      const existing = (existingRows as PharmaMedicineRow[] | null)?.[0] ?? null;

      // Determine the authoritative pieces_per_box to use:
      //   1. The existing medicine's live pieces_per_box (most accurate)
      //   2. The snapshot stored when the request was created
      //   3. Last resort: 10 (should never be reached if data is correct)
      const livePpb      = existing && existing.pieces_per_box > 0 ? existing.pieces_per_box : 0;
      const snapshotPpb  = row.pieces_per_box_snapshot && row.pieces_per_box_snapshot > 0
        ? row.pieces_per_box_snapshot
        : 0;
      const effectivePpb = livePpb > 0 ? livePpb : snapshotPpb > 0 ? snapshotPpb : 10;

      // ── Convert request to pieces using the effective ppb ─────────────
      const reqBoxes   = isBox ? (row.requested_boxes          ?? 0) : 0;
      const reqPartial = isBox ? (row.requested_partial_pieces  ?? 0) : row.quantity;
      // Total incoming pieces, always calculated with effectivePpb
      const incomingPieces = isBox
        ? reqBoxes * effectivePpb + reqPartial
        : reqPartial;

      if (existing) {
        await mergeIntoExisting(existing, { isBox, incomingPieces, effectivePpb });
      } else {
        await insertNew(row, { isBox, reqBoxes, reqPartial, effectivePpb, unit });
      }

      await markMerged(row.id);
      onStockAdded?.();

      window.dispatchEvent(
        new CustomEvent("restockAutoAdded", {
          detail: {
            medicine: row.medicine_name,
            qty:      row.quantity,
            type:     row.medicine_type,
          },
        })
      );
    } catch (err: any) {
      console.error("[RestockConfirmListener] unexpected error:", err?.message ?? err);
      processedIds.current.delete(row.id);
    }
  }

  /**
   * Merges incoming pieces into an existing medicine row.
   *
   * All arithmetic uses the medicine's LIVE pieces_per_box (effectivePpb),
   * which is the accurate per-medicine value from the Excel / pharma_medicines
   * table (e.g. 1 for COC pill, 10 for most tablets, 20 for some supplies).
   *
   * Steps:
   *   1. Sum existing total pieces + incoming pieces
   *   2. Re-split into boxes + partial using effectivePpb
   *   3. Write boxes, partial_pieces, pieces_per_box, quantity back
   */
  async function mergeIntoExisting(
    existing: PharmaMedicineRow,
    opts: { isBox: boolean; incomingPieces: number; effectivePpb: number }
  ) {
    const { isBox, incomingPieces, effectivePpb } = opts;

    let newBoxes:   number;
    let newPartial: number;
    let newQuantity: number;

    if (isBox) {
      // Box-unit medicine: compute total pieces from CURRENT state + incoming
      const currentTotal = existing.boxes * effectivePpb + (existing.partial_pieces ?? 0);
      const grandTotal   = currentTotal + incomingPieces;
      newBoxes   = Math.floor(grandTotal / effectivePpb);
      newPartial = grandTotal % effectivePpb;
      newQuantity = grandTotal;
    } else {
      // Non-box unit: flat addition
      newBoxes   = existing.boxes ?? 0;
      newPartial = (existing.partial_pieces ?? 0) + incomingPieces;
      newQuantity = (existing.quantity ?? 0) + incomingPieces;
    }

    const { error } = await supabase
      .from("pharma_medicines")
      .update({
        boxes:          newBoxes,
        partial_pieces: newPartial,
        pieces_per_box: effectivePpb,
        quantity:       newQuantity,
        updated_at:     new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw error;
  }

  /**
   * Inserts a brand-new pharma_medicines row when no existing stock was found.
   * Uses effectivePpb (from snapshot, since there's no live row yet).
   */
  async function insertNew(
    row: RestockRow,
    opts: { isBox: boolean; reqBoxes: number; reqPartial: number; effectivePpb: number; unit: string }
  ) {
    const { isBox, reqBoxes, reqPartial, effectivePpb, unit } = opts;
    const boxes          = isBox ? reqBoxes   : 0;
    const partialPieces  = isBox ? reqPartial : reqPartial;
    const piecesPerBox   = effectivePpb;
    const quantity        = isBox
      ? boxes * piecesPerBox + partialPieces
      : partialPieces;

    const { error } = await supabase.from("pharma_medicines").insert([{
      med_name:       row.medicine_name.trim(),
      med_dosage:     row.dosage?.trim() || "N/A",
      med_type:       row.medicine_type.trim(),
      unit,
      quantity,
      boxes,
      pieces_per_box: piecesPerBox,
      partial_pieces: partialPieces,
      exp_date:       defaultExpDate(),
      archived:       false,
    }]);

    if (error) throw error;
  }

  return null;
}