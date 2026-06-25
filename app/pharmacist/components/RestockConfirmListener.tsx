"use client";
/**
 * RestockConfirmListener
 * ──────────────────────
 * Mounted once inside page.tsx (pharmacist layout). It does two things
 * whenever the warehouse confirms a restock request:
 *
 *  1. AUTO-ADD  — inserts a new row into pharma_medicines so the confirmed
 *                 medicine/supply appears in the pharmacist's inventory
 *                 immediately, without any manual data entry.
 *
 *  2. NOTIFY    — dispatches a custom DOM event ("restockAutoAdded") so
 *                 page.tsx can re-fetch the medicines list and update the
 *                 Dashboard stat cards in real time.
 *
 * It also guards against double-processing the same request within one
 * session using a ref-based Set, mirroring the pattern in RestockListener
 * on the warehouse side.
 *
 * Schema notes
 * ────────────
 * restock_requests columns used here:
 *   pharmacist_name, medicine_name, dosage, medicine_type, unit, quantity, status
 *
 * pharma_medicines columns written here:
 *   med_name, med_dosage, med_type, unit, quantity, exp_date, archived
 *
 * exp_date  — restock_requests has no expiry column (the pharmacist only
 *             requests a medicine; the actual batch expiry is known only
 *             when the physical stock arrives). We default to 1 year from
 *             today so the item is immediately usable in the inventory and
 *             won't be auto-archived on mount. The pharmacist can correct
 *             the date later via the Medicine Inventory page.
 *
 * unit      — added to the RestockModal insert (see RestockModal.tsx fix).
 *             Falls back to "Pieces" for any legacy rows that were saved
 *             before the unit column was included in the insert.
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type RestockRow = {
  id:              string;
  pharmacist_name: string;
  medicine_name:   string;
  dosage:          string;
  medicine_type:   string;
  unit?:           string;   // saved by the updated RestockModal; may be absent on legacy rows
  quantity:        number;
  status:          string;
  created_at:      string;
};

type Props = {
  /** Username of the currently logged-in pharmacist (from Topbar/profile). */
  pharmacistName: string;
  /** Called after a confirmed item is auto-added so the parent can refresh medicines. */
  onStockAdded?: () => void;
};

/** Default expiry: 1 year from today (PHT). */
function defaultExpDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

export default function RestockConfirmListener({ pharmacistName, onStockAdded }: Props) {
  // Guards against double-processing the same request id in one session.
  const processedIds = useRef<Set<string>>(new Set());

  // ── On mount: catch any confirmed-but-not-yet-added requests ─────────────
  // This handles the case where the warehouse confirmed while this component
  // was unmounted (e.g. pharmacist had the tab closed).
  useEffect(() => {
    if (!pharmacistName) return;
    catchMissedConfirmations(pharmacistName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacistName]);

  // ── Real-time: watch restock_requests for status → "confirmed" ────────────
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
          // Only rows belonging to this pharmacist
          filter: `pharmacist_name=eq.${pharmacistName}`,
        },
        (payload) => {
          const newRow = payload.new as RestockRow;
          const oldRow = payload.old as Partial<RestockRow>;

          // Only react when the status transitions TO "confirmed"
          if (newRow.status === "confirmed" && oldRow.status !== "confirmed") {
            handleConfirmed(newRow);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacistName]);

  // ── Fetch any already-confirmed rows that haven't been added yet ──────────
  // We detect "not yet added" by checking pharma_medicines for an exact
  // (med_name + med_type) match originating from restock — if none found,
  // we add it. This is a best-effort heuristic; duplicate prevention on the
  // DB side can be added via a unique partial index if needed later.
  async function catchMissedConfirmations(name: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // last 7 days
    const { data, error } = await supabase
      .from("restock_requests")
      .select("id, pharmacist_name, medicine_name, dosage, medicine_type, unit, quantity, status, created_at")
      .eq("pharmacist_name", name)
      .eq("status", "confirmed")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (error || !data) return;

    for (const row of data as RestockRow[]) {
      // Skip if already handled in this session
      if (processedIds.current.has(row.id)) continue;

      // Check if this request was already added to pharma_medicines.
      // We look for a row with the same name+type created AFTER the
      // restock request — if found, skip to avoid duplicates.
      const confirmedAt = new Date(row.created_at).getTime();
      const { data: existing } = await supabase
        .from("pharma_medicines")
        .select("id, created_at")
        .ilike("med_name", row.medicine_name.trim())
        .ilike("med_type", row.medicine_type.trim())
        .eq("archived", false)
        .limit(5);

      const alreadyAdded = (existing ?? []).some(m => {
        const addedAt = new Date(m.created_at).getTime();
        return addedAt >= confirmedAt; // added after/at the time of confirmation
      });

      if (!alreadyAdded) {
        await handleConfirmed(row);
      }
    }
  }

  // ── Core: insert the confirmed item into pharma_medicines ─────────────────
  async function handleConfirmed(row: RestockRow) {
    if (processedIds.current.has(row.id)) return;
    processedIds.current.add(row.id);

    try {
      const { error } = await supabase.from("pharma_medicines").insert([{
        med_name:   row.medicine_name.trim(),
        med_dosage: row.dosage?.trim()        || "N/A",
        med_type:   row.medicine_type.trim(),
        unit:       row.unit?.trim()          || "Pieces",
        quantity:   row.quantity,
        exp_date:   defaultExpDate(),  // pharmacist adjusts the real date later
        archived:   false,
      }]);

      if (error) {
        console.error("[RestockConfirmListener] insert failed:", error.message);
        processedIds.current.delete(row.id); // allow retry
        return;
      }

      // Let page.tsx refresh the medicines list + Dashboard stat cards
      onStockAdded?.();

      // Also fire a DOM event so any other component (e.g. Topbar toast)
      // can react without needing a prop chain.
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

  // This component renders nothing — it's a pure side-effect listener.
  return null;
}