"use client";
/**
 * RestockConfirmListener
 * ──────────────────────
 * FIX: Double-add was caused by a race between the realtime UPDATE handler
 * and catchMissedConfirmations both picking up the same row before
 * markMerged() finished writing stock_applied = true.
 *
 * Solution: Before doing any work, re-fetch the row from the DB and bail
 * out immediately if stock_applied is already true. The in-memory
 * processedIds ref handles same-session races; the DB check handles
 * cross-mount / realtime vs catch-up races.
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

const MEDICINE_SELECT =
  "id, med_name, med_dosage, med_type, unit, quantity, boxes, pieces_per_box, partial_pieces, category, archived";

async function findExistingMedicine(
  medicineName: string,
  dosage: string,
  medicineType: string,
): Promise<PharmaMedicineRow | null> {
  const name = medicineName.trim();
  const dos  = (dosage       ?? "").trim();
  const typ  = (medicineType ?? "").trim();

  // 1. name + dosage + type
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

  // 2. name + type
  if (name && typ) {
    const { data } = await supabase
      .from("pharma_medicines")
      .select(MEDICINE_SELECT)
      .ilike("med_name", name)
      .ilike("med_type", typ)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return data[0] as PharmaMedicineRow;
  }

  // 3. name + dosage
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

  // 4. name only
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
    // ── Guard 1: in-memory dedup (same session, same mount) ──────────────
    if (processedIds.current.has(row.id)) return;
    processedIds.current.add(row.id);

    // ── Guard 2: DB check — re-fetch to confirm stock_applied is still
    // false. This prevents the race between the realtime handler and
    // catchMissedConfirmations both processing the same row before
    // markMerged() has a chance to write stock_applied = true. ──────────
    const { data: fresh, error: fetchErr } = await supabase
      .from("restock_requests")
      .select("id, stock_applied")
      .eq("id", row.id)
      .single();

    if (fetchErr || !fresh) {
      processedIds.current.delete(row.id);
      return;
    }

    if (fresh.stock_applied === true) {
      // Already processed by another handler/mount — skip silently.
      return;
    }

    // ── Claim the row immediately so no other process touches it ────────
    // Write stock_applied = true BEFORE doing the merge. If the merge
    // fails we delete the flag so it can be retried, but we don't let
    // two processes merge concurrently.
    const { error: claimErr } = await supabase
      .from("restock_requests")
      .update({ stock_applied: true })
      .eq("id", row.id)
      .eq("stock_applied", false); // only succeeds if still false (optimistic lock)

    if (claimErr) {
      // Another process beat us to it — bail.
      processedIds.current.delete(row.id);
      return;
    }

    try {
      const unit  = row.unit?.trim() || "Pieces";
      const isBox = IS_BOX_UNIT(unit);

      const existing = await findExistingMedicine(
        row.medicine_name,
        row.dosage,
        row.medicine_type,
      );

      // Determine effective pieces_per_box
      const livePpb      = existing && existing.pieces_per_box > 0 ? existing.pieces_per_box : 0;
      const snapshotPpb  = (row.pieces_per_box_snapshot ?? 0) > 0 ? row.pieces_per_box_snapshot! : 0;
      const effectivePpb = livePpb > 0 ? livePpb : snapshotPpb > 0 ? snapshotPpb : 10;

      // Convert request to pieces — use the EXACT values stored on the row.
      // requested_boxes / requested_partial_pieces were written by the
      // warehouse at confirm time; quantity is the pre-calculated total.
      // For box units: boxes × ppb + partial. For piece units: quantity as-is.
      const reqBoxes   = isBox ? (row.requested_boxes           ?? 0) : 0;
      const reqPartial = isBox ? (row.requested_partial_pieces  ?? 0) : row.quantity;
      const incomingPieces = isBox
        ? reqBoxes * effectivePpb + reqPartial
        : reqPartial;

      if (existing) {
        await mergeIntoExisting(existing, { isBox, incomingPieces, effectivePpb });
      } else {
        await insertNew(row, { isBox, reqBoxes, reqPartial, effectivePpb, unit });
      }

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
      // Roll back the claim so it can be retried on next mount.
      await supabase
        .from("restock_requests")
        .update({ stock_applied: false })
        .eq("id", row.id);
      processedIds.current.delete(row.id);
    }
  }

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