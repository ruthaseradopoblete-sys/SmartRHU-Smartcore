"use client";
import { CSSProperties, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { MEDICINE_TYPES, UNITS } from "@/lib/types";
import { logAction } from '@/utils/auditLog'
import { useAuth } from '@/context/AuthContext'  // ← DAGDAG

type Props = {
  onClose: () => void;
  onSaved: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

export default function AddMedicineModal({ onClose, onSaved, onToast }: Props) {
  const { user } = useAuth()
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

      // ── DAGDAG MO ITO ──────────────────────────────────────
      await logAction({
        user_name:   user?.name || `${user?.firstName} ${user?.lastName}` || '',
        user_role:   'Pharmacist',
        action:      'ADD_MEDICINE',
        module:      'Inventory',
        description: `Added medicine: ${form.medicineName.trim()} (${form.mgDosage || 'N/A'})`,
        status:      'success',
      })
      // ───────────────────────────────────────────────────────

      onSaved();
      onClose();
    } catch (err: any) {
      onToast(err.message || "Failed to add medicine.", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: CSSProperties = {
    border: `1px solid ${t.inputBorder}`, borderRadius: 6, padding: "6px 10px",
    fontSize: 12.5, fontFamily: "inherit", outline: "none",
    background: t.modalBg, color: t.modalText,
  };
  const selectStyle: CSSProperties = {
    ...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer",
  };
  const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 700, color: t.modalText, whiteSpace: "nowrap" };
  const fieldRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: t.modalBg, borderRadius: 16, width: 580,
        padding: "32px 36px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }} onClick={e => e.stopPropagation()}>

        <h2 style={{ fontSize: 26, fontWeight: 900, color: t.green, margin: "0 0 26px" }}>
          Add Medicine
        </h2>

        {/* Row 1 */}
        <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={fieldRow}>
            <span style={labelStyle}>Medicine Name:</span>
            <input value={form.medicineName} onChange={e => set("medicineName", e.target.value)}
              style={{ ...inputStyle, width: 180 }} />
          </div>
          <div style={fieldRow}>
            <span style={labelStyle}>Mg/Dosage:</span>
            <input value={form.mgDosage} onChange={e => set("mgDosage", e.target.value)}
              style={{ ...inputStyle, width: 110 }} />
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={fieldRow}>
            <span style={labelStyle}>EXP Date:</span>
            <input type="date" value={form.expDate} onChange={e => set("expDate", e.target.value)}
              style={{ ...inputStyle, width: 160 }} />
          </div>
          <div style={fieldRow}>
            <span style={labelStyle}>Type:</span>
            <select value={form.medicineType} onChange={e => set("medicineType", e.target.value)}
              style={{ ...selectStyle, width: 130 }}>
              <option value="">— select —</option>
              {MEDICINE_TYPES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3 */}
        <div style={{ display: "flex", gap: 24, marginBottom: 36, flexWrap: "wrap" }}>
          <div style={fieldRow}>
            <span style={labelStyle}>Unit:</span>
            <select value={form.unit} onChange={e => set("unit", e.target.value)}
              style={{ ...selectStyle, width: 130 }}>
              {UNITS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={fieldRow}>
            <span style={labelStyle}>Quantity:</span>
            <input type="number" min={1} value={form.quantity}
              onChange={e => set("quantity", e.target.value)}
              style={{ ...inputStyle, width: 80 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button onClick={onClose} style={{
            width: 160, padding: "11px 0", borderRadius: 8, border: "none",
            background: "#d63031", color: "#fff", fontSize: 14, fontWeight: 900,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
          }}>
            CANCEL
          </button>
          <button onClick={handleConfirm} disabled={saving} style={{
            width: 160, padding: "11px 0", borderRadius: 8,
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