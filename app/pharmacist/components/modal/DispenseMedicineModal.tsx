"use client";
import { CSSProperties, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";

type Props = {
  medicine: Medicine;
  onClose: () => void;
  onSaved: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

export default function DispenseMedicineModal({ medicine, onClose, onSaved, onToast }: Props) {
  const { t } = useTheme();
  const [quantity, setQuantity] = useState(1);
  const [patient,  setPatient]  = useState("");
  const [saving,   setSaving]   = useState(false);

  const handleDispense = async () => {
    if (quantity <= 0) {
      onToast("Quantity must be at least 1.", "error");
      return;
    }
    if (quantity > medicine.quantity) {
      onToast(`Only ${medicine.quantity} units available.`, "error");
      return;
    }

    setSaving(true);
    try {
      // 1. Insert dispense record
      const { error: dispErr } = await supabase
        .from("pharma_dispense")
        .insert([{
          medicine_id:  medicine.id,
          med_name:     medicine.med_name,
          quantity,
          dispensed_at: new Date().toISOString(),
        }]);
      if (dispErr) throw dispErr;

      // 2. Deduct from stock
      const { error: stockErr } = await supabase
        .from("pharma_medicines")
        .update({ quantity: medicine.quantity - quantity })
        .eq("id", medicine.id);
      if (stockErr) throw stockErr;

      onToast(`Dispensed ${quantity} unit(s) of ${medicine.med_name}.`, "success");
      onSaved();
      onClose();
    } catch (err: any) {
      onToast(err.message || "Failed to dispense medicine.", "error");
    } finally {
      setSaving(false);
    }
  };

  const inp: CSSProperties = {
    border: `1.5px solid ${t.inputBorder}`, borderRadius: 8,
    padding: "8px 10px", fontSize: 12.5, fontFamily: "inherit",
    outline: "none", background: t.modalBg, color: t.modalText,
    width: "100%", height: 36, boxSizing: "border-box",
  };
  const lbl: CSSProperties = {
    fontSize: 11, fontWeight: 700, color: t.text3,
    textTransform: "uppercase", letterSpacing: "0.06em",
    marginBottom: 5, display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: t.modalBg, borderRadius: 16, width: 400,
        padding: "28px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: t.green, margin: "0 0 4px" }}>
            Dispense Medicine
          </h2>
          <p style={{ fontSize: 12, color: t.text3, margin: 0 }}>
            Record medicine given out to patient
          </p>
        </div>

        {/* Medicine info card */}
        <div style={{
          background: t.surface2, borderRadius: 10,
          border: `1px solid ${t.border}`, padding: "12px 14px", marginBottom: 18,
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 4 }}>
            💊 {medicine.med_name}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: t.text3 }}>
            <span>Dosage: <strong style={{ color: t.text2 }}>{medicine.med_dosage}</strong></span>
            <span>Type: <strong style={{ color: t.text2 }}>{medicine.med_type}</strong></span>
            <span>Available: <strong style={{
              color: medicine.quantity <= 10 ? "#d63031" : t.green
            }}>{medicine.quantity} {medicine.unit}</strong></span>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          <div>
            <label style={lbl}>Patient Name (optional)</label>
            <input
              value={patient}
              onChange={e => setPatient(e.target.value)}
              placeholder="e.g. Juan dela Cruz"
              style={inp}
            />
          </div>

          <div>
            <label style={lbl}>Quantity to Dispense</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setQuantity(v => Math.max(1, v - 1))}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${t.inputBorder}`,
                  background: t.modalBg, color: t.text, fontSize: 18, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>−</button>
              <input
                type="number" min={1} max={medicine.quantity}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, Math.min(medicine.quantity, parseInt(e.target.value) || 1)))}
                style={{ ...inp, textAlign: "center", fontWeight: 700, fontSize: 16 }}
              />
              <button
                onClick={() => setQuantity(v => Math.min(medicine.quantity, v + 1))}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${t.inputBorder}`,
                  background: t.modalBg, color: t.text, fontSize: 18, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>+</button>
            </div>
            <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>
              Stock after: <strong style={{ color: t.text }}>
                {medicine.quantity - quantity} {medicine.unit}
              </strong>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 8, border: `1.5px solid ${t.border2}`,
            background: "transparent", color: t.text2, fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            CANCEL
          </button>
          <button onClick={handleDispense} disabled={saving} style={{
            flex: 2, padding: "11px 0", borderRadius: 8, border: "none",
            background: t.green, color: "#fff", fontSize: 13, fontWeight: 900,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
            opacity: saving ? 0.6 : 1, boxShadow: `0 3px 10px ${t.green}55`,
          }}>
            {saving ? "DISPENSING…" : "CONFIRM DISPENSE"}
          </button>
        </div>
      </div>
    </div>
  );
}
