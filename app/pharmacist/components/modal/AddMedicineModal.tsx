"use client";
import { CSSProperties, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { MEDICINE_TYPES, UNITS } from "@/lib/types";

type Props = {
  onClose: () => void;
  onSaved: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

export default function AddMedicineModal({ onClose, onSaved, onToast }: Props) {
  const { t } = useTheme();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    medicineName: "", mgDosage: "", expDate: "", medicineType: "", unit: "Pieces", quantity: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleConfirm = async () => {
    if (!form.medicineName.trim() || !form.expDate || !form.medicineType || !form.quantity) {
      onToast("Please fill in all required fields.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pharma_medicines")
        .insert([{
          med_name:   form.medicineName.trim(),
          med_dosage: form.mgDosage.trim() || "N/A",
          med_type:   form.medicineType,
          exp_date:   form.expDate,
          unit:       form.unit,
          quantity:   parseInt(form.quantity, 10),
          archived:   false,
        }]);
      if (error) throw error;
      onToast("Medicine added successfully.", "success");
      onSaved();   // ← this triggers fetchDashboardMedicines in page.tsx
      onClose();
    } catch (err: any) {
      onToast(err.message || "Failed to add medicine.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inp: CSSProperties = {
    border: `1.5px solid ${t.inputBorder}`, borderRadius: 8,
    padding: "8px 10px", fontSize: 12.5, fontFamily: "inherit",
    outline: "none", background: t.modalBg, color: t.modalText,
    width: "100%", height: 36, boxSizing: "border-box",
  };
  const sel: CSSProperties = {
    ...inp, appearance: "none", WebkitAppearance: "none", cursor: "pointer",
  };
  const lbl: CSSProperties = {
    fontSize: 11, fontWeight: 700, color: t.text3,
    textTransform: "uppercase", letterSpacing: "0.06em",
    marginBottom: 5, display: "block", whiteSpace: "nowrap",
  };
  const col: CSSProperties = {
    display: "flex", flexDirection: "column",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: t.modalBg, borderRadius: 16, width: 420,
        padding: "32px 36px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }} onClick={e => e.stopPropagation()}>

        <h2 style={{ fontSize: 26, fontWeight: 900, color: t.green, margin: "0 0 20px" }}>
          Add Medicine
        </h2>

        {/* ── Fields stacked top to bottom ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>

          <div style={col}>
            <label style={lbl}>Medicine Name</label>
            <input value={form.medicineName} onChange={e => set("medicineName", e.target.value)}
              placeholder="e.g. Paracetamol" style={inp} />
          </div>

          <div style={col}>
            <label style={lbl}>Mg / Dosage</label>
            <input value={form.mgDosage} onChange={e => set("mgDosage", e.target.value)}
              placeholder="e.g. 500mg" style={inp} />
          </div>

          <div style={col}>
            <label style={lbl}>EXP Date</label>
            <input type="date" value={form.expDate} onChange={e => set("expDate", e.target.value)}
              style={inp} />
          </div>

          <div style={col}>
            <label style={lbl}>Type</label>
            <select value={form.medicineType} onChange={e => set("medicineType", e.target.value)}
              style={sel}>
              <option value="">— select —</option>
              {MEDICINE_TYPES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div style={col}>
            <label style={lbl}>Unit</label>
            <select value={form.unit} onChange={e => set("unit", e.target.value)} style={sel}>
              {UNITS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div style={col}>
            <label style={lbl}>Quantity</label>
            <input type="number" min={1} value={form.quantity}
              onChange={e => set("quantity", e.target.value)}
              placeholder="e.g. 100" style={inp} />
          </div>

        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 8, border: "none",
            background: "#d63031", color: "#fff", fontSize: 14, fontWeight: 900,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
          }}>
            CANCEL
          </button>
          <button onClick={handleConfirm} disabled={saving} style={{
            flex: 1, padding: "11px 0", borderRadius: 8,
            border: `2.5px solid ${t.green}`, background: "transparent",
            color: t.green, fontSize: 14, fontWeight: 900, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: "0.06em",
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "SAVING…" : "CONFIRM"}
          </button>
        </div>

      </div>
    </div>
  );
}
