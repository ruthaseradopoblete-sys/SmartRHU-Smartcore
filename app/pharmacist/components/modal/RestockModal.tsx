"use client";
import { CSSProperties, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { RestockItem, MEDICINE_TYPES, UNITS } from "@/lib/types";

type Props = {
  onClose: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

const BLANK: RestockItem = { medicine: "", dosage: "", type: "Tablet", unit: "Pieces", qty: 1 };

export default function RestockModal({ onClose, onToast }: Props) {
  const { t } = useTheme();
  const [items, setItems] = useState<RestockItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);
  const setF = (k: keyof RestockItem, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const addItem = () => {
    if (!form.medicine.trim()) return;
    setItems(prev => [...prev, { ...form, medicine: form.medicine.trim() }]);
    setForm(BLANK);
  };
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleSendRequest = async () => {
    if (items.length === 0) {
      onToast("Add at least one medicine to the list.", "error");
      return;
    }
    setSaving(true);
    try {
      for (const item of items) {
        const { error } = await supabase
          .from("pharma_addmedicines")
          .insert([{
            med_name:   item.medicine,
            med_dosage: item.dosage || "N/A",
            med_type:   item.type,
            unit:       item.unit,
            quantity:   item.qty,
            exp_date:   new Date().toISOString().split("T")[0],
            archived:   false,
          }]);
        if (error) throw error;
      }
      onToast(`Restock request sent (${items.length} item${items.length > 1 ? "s" : ""}).`, "success");
      onClose();
    } catch (err: any) {
      onToast(err.message || "Failed to send request.", "error");
    } finally {
      setSaving(false);
    }
  };

  const inp: CSSProperties = {
    border: `1.5px solid ${t.inputBorder}`, borderRadius: 8, padding: "7px 10px",
    fontSize: 12.5, fontFamily: "inherit", outline: "none",
    background: t.modalBg, color: t.modalText, width: "100%",
  };
  const sel: CSSProperties = { ...inp, appearance: "none", WebkitAppearance: "none", cursor: "pointer" };
  const lbl: CSSProperties = {
    fontSize: 11, fontWeight: 700, color: t.text3,
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: t.modalBg, borderRadius: 16, width: 580,
        padding: "32px 36px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }} onClick={e => e.stopPropagation()}>

        <h2 style={{ fontSize: 26, fontWeight: 900, color: t.green, margin: "0 0 20px" }}>
          Restock Request
        </h2>

        {/* Input grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Medicine Name</label>
            <input value={form.medicine} onChange={e => setF("medicine", e.target.value)}
              onKeyDown={e => e.key === "Enter" && addItem()}
              placeholder="e.g. Paracetamol" style={inp} />
          </div>
          <div>
            <label style={lbl}>Mg / Dosage</label>
            <input value={form.dosage} onChange={e => setF("dosage", e.target.value)}
              placeholder="e.g. 500mg" style={inp} />
          </div>
          <div>
            <label style={lbl}>Type</label>
            <select value={form.type} onChange={e => setF("type", e.target.value)} style={sel}>
              {MEDICINE_TYPES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Unit</label>
            <select value={form.unit} onChange={e => setF("unit", e.target.value)} style={sel}>
              {UNITS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Qty</label>
            <div style={{
              display: "flex", alignItems: "center",
              border: `1.5px solid ${t.inputBorder}`, borderRadius: 8,
              overflow: "hidden", background: t.modalBg, height: 34,
            }}>
              <span style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: t.modalText }}>
                {form.qty}
              </span>
              <div style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${t.inputBorder}` }}>
                <button onClick={() => setF("qty", form.qty + 1)} style={{
                  border: "none", background: "none", cursor: "pointer",
                  padding: "2px 7px", fontSize: 9, color: t.text2,
                  lineHeight: 1, borderBottom: `1px solid ${t.inputBorder}`,
                }}>▲</button>
                <button onClick={() => setF("qty", Math.max(1, form.qty - 1))} style={{
                  border: "none", background: "none", cursor: "pointer",
                  padding: "2px 7px", fontSize: 9, color: t.text2, lineHeight: 1,
                }}>▼</button>
              </div>
            </div>
          </div>
        </div>

        <button onClick={addItem} style={{
          width: "100%", padding: "8px", borderRadius: 8, border: `1.5px dashed ${t.green}`,
          background: "transparent", color: t.green, fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", marginBottom: 14,
        }}>
          + Add to list
        </button>

        {/* Items list */}
        <div style={{
          minHeight: 60, maxHeight: 200, overflowY: "auto", marginBottom: 22,
          borderRadius: 10, border: `1.5px solid ${t.border2}`, background: t.surface2,
        }}>
          {items.length === 0 ? (
            <div style={{ padding: "18px 16px", textAlign: "center", color: t.text3, fontSize: 13 }}>
              No medicines added yet
            </div>
          ) : (
            <>
              <div style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 60px 28px",
                padding: "6px 14px", borderBottom: `1px solid ${t.border2}`,
                fontSize: 10, fontWeight: 800, color: t.text3,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                <span>Medicine</span><span>Dosage</span>
                <span>Type</span><span>Unit</span><span>Qty</span><span />
              </div>
              {items.map((item, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 60px 28px",
                  alignItems: "center", padding: "8px 14px",
                  borderBottom: i < items.length - 1 ? `1px solid ${t.border2}` : "none",
                  fontSize: 12.5,
                }}>
                  <span style={{ fontWeight: 600, color: t.modalText }}>{item.medicine}</span>
                  <span style={{ color: t.text2 }}>{item.dosage || "—"}</span>
                  <span style={{ color: t.text2 }}>{item.type}</span>
                  <span style={{ color: t.text2 }}>{item.unit}</span>
                  <span style={{ color: t.modalText, fontWeight: 700 }}>{item.qty}</span>
                  <button onClick={() => removeItem(i)} style={{
                    border: "none", background: "none", cursor: "pointer",
                    color: "#d63031", fontSize: 16, lineHeight: 1, padding: 0,
                  }}>×</button>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 8, border: "none",
            background: "#d63031", color: "#fff", fontSize: 14, fontWeight: 900,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
          }}>
            CANCEL
          </button>
          <button onClick={handleSendRequest} disabled={saving} style={{
            flex: 1, padding: "11px 0", borderRadius: 8,
            border: `2.5px solid ${t.green}`, background: "transparent",
            color: t.green, fontSize: 14, fontWeight: 900, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: "0.06em",
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "SENDING…" : "SEND REQUEST"}
          </button>
        </div>
      </div>
    </div>
  );
}