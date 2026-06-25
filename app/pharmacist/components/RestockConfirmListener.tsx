"use client";
/**
 * RestockConfirmListener
 * ──────────────────────
 * Mounted once inside page.tsx (pharmacist layout). Whenever the warehouse
 * confirms a restock request, this:
 *
 *  1. MERGES STOCK — finds the existing pharma_medicines row for that
 *     medicine (by name + type + dosage, with progressive fallbacks) and
 *     ADDS the requested boxes / partial_pieces into it. If no existing row
 *     is found at all, it inserts a new one (first-time stock).
 *
 *  2. NOTIFY — dispatches a custom DOM event ("restockAutoAdded") so
 *     page.tsx can re-fetch the medicines list and update the Dashboard
 *     stat cards in real time.
 *
 * MATCHING PRIORITY (most → least specific):
 *   1. med_name + med_dosage + med_type   ← primary: same name, same form, same variant
 *   2. med_name + med_type                ← dosage string differs slightly
 *   3. med_name + med_dosage              ← type string differs slightly
 *   4. med_name only                      ← last resort
 *
 *  All comparisons use ilike so casing never causes a miss.
 *  med_type is always included in priority 1 & 2 so e.g. Amoxicillin Syrup
 *  never merges into Amoxicillin Capsule.
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
  stock_applied?:            boolean;
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

const MEDICINE_SELECT = "id, med_name, med_dosage, med_type, unit, quantity, boxes, pieces_per_box, partial_pieces, category, archived";

/**
 * Finds the best-matching non-archived pharma_medicines row.
 *
 * Uses ilike on every field so casing differences (e.g. "Tablet" vs "tablet",
 * "Syrup" vs "syrup") never cause a false miss.
 *
 * med_type is in priority 1 & 2 so the same medicine in different forms
 * (syrup vs capsule vs tablet) always lands on the correct row.
 */
async function findExistingMedicine(
  medicineName: string,
  dosage: string,
  medicineType: string,
): Promise<PharmaMedicineRow | null> {
  const name = medicineName.trim();
  const dos  = (dosage        ?? "").trim();
  const typ  = (medicineType  ?? "").trim();

  // 1. Exact match: name + dosage + type
  if (name && dos && typ) {
    const { data } = await supabase
      .from("pharma_medicines")
      .select(MEDICINE_SELECT)
      .ilike("med_name",   name)
      .ilike("med_dosage", dos)
      .ilike("med_type",   typ)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return data[0] as PharmaMedicineRow;
  }

  // 2. Name + type (dosage string may differ slightly)
  if (name && typ) {
    const { data } = await supabase
      .from("pharma_medicines")
      .select(MEDICINE_SELECT)
      .ilike("med_name",  name)
      .ilike("med_type",  typ)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return data[0] as PharmaMedicineRow;
  }

  // 3. Name + dosage (type string may differ slightly)
  if (name && dos) {
    const { data } = await supabase
      .from("pharma_medicines")
      .select(MEDICINE_SELECT)
      .ilike("med_name",   name)
      .ilike("med_dosage", dos)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return data[0] as PharmaMedicineRow;
  }

  // 4. Name only — last resort
  if (name) {
    const { data } = await supabase
      .from("pharma_medicines")
      .select(MEDICINE_SELECT)
      .ilike("med_name", name)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return data[0] as PharmaMedicineRow;
  }

  return null;
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

    for (const row of data as RestockRow[]) {
      if (processedIds.current.has(row.id)) continue;
      await handleConfirmed(row);
    }
  }

  async function handleConfirmed(row: RestockRow) {
    if (processedIds.current.has(row.id)) return;
    processedIds.current.add(row.id);

    try {
      const unit  = row.unit?.trim() || "Pieces";
      const isBox = IS_BOX_UNIT(unit);

      // ── Find the existing pharma_medicines row ──────────────────────────
      // Pass medicine_type so syrup/capsule/tablet variants never cross-merge.
      const existing = await findExistingMedicine(
        row.medicine_name,
        row.dosage,
        row.medicine_type,
      );

      // ── Determine effective pieces_per_box ──────────────────────────────
      // Priority: live medicine row > snapshot from warehouse > 10
      const livePpb      = existing && existing.pieces_per_box > 0 ? existing.pieces_per_box : 0;
      const snapshotPpb  = (row.pieces_per_box_snapshot ?? 0) > 0 ? row.pieces_per_box_snapshot! : 0;
      const effectivePpb = livePpb > 0 ? livePpb : snapshotPpb > 0 ? snapshotPpb : 10;

      // ── Convert request to pieces ───────────────────────────────────────
      const reqBoxes       = isBox ? (row.requested_boxes          ?? 0) : 0;
      const reqPartial     = isBox ? (row.requested_partial_pieces  ?? 0) : row.quantity;
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
      console.error("[RestockConfirmListener] error:", err?.message ?? err);
      processedIds.current.delete(row.id);
    }
  }

  /**
   * Merges incoming pieces into an existing medicine row.
   *
   * Box-unit medicines:
   *   Re-derives total pieces from current (boxes × ppb + partial) + incoming,
   *   then re-splits so partial_pieces never exceeds pieces_per_box.
   *
   * Non-box-unit medicines:
   *   Flat addition to quantity only.
   */
  async function mergeIntoExisting(
    existing: PharmaMedicineRow,
    opts: { isBox: boolean; incomingPieces: number; effectivePpb: number }
  ) {
    const { isBox, incomingPieces, effectivePpb } = opts;

    let newBoxes:    number;
    let newPartial:  number;
    let newQuantity: number;

    if (isBox) {
      const currentTotal = (existing.boxes ?? 0) * effectivePpb + (existing.partial_pieces ?? 0);
      const grandTotal   = currentTotal + incomingPieces;
      newBoxes    = Math.floor(grandTotal / effectivePpb);
      newPartial  = grandTotal % effectivePpb;
      newQuantity = grandTotal;
    } else {
      newBoxes    = existing.boxes ?? 0;
      newPartial  = existing.partial_pieces ?? 0;
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
   * Only reached when no pharma_medicines row exists at all (first-time stock).
   */
  async function insertNew(
    row: RestockRow,
    opts: { isBox: boolean; reqBoxes: number; reqPartial: number; effectivePpb: number; unit: string }
  ) {
    const { isBox, reqBoxes, reqPartial, effectivePpb, unit } = opts;
    const boxes         = isBox ? reqBoxes   : 0;
    const partialPieces = isBox ? reqPartial : reqPartial;
    const quantity      = isBox
      ? boxes * effectivePpb + partialPieces
      : partialPieces;

    const { error } = await supabase.from("pharma_medicines").insert([{
      med_name:       row.medicine_name.trim(),
      med_dosage:     row.dosage?.trim() || "N/A",
      med_type:       row.medicine_type.trim(),
      unit,
      quantity,
      boxes,
      pieces_per_box: effectivePpb,
      partial_pieces: partialPieces,
      exp_date:       defaultExpDate(),
      archived:       false,
    }]);

    if (error) throw error;
  }

  return null;
}