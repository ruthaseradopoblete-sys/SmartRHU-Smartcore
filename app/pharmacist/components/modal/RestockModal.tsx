"use client";
import { CSSProperties, useState, useMemo } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { RestockItem, UNITS } from "@/lib/types";

type Props = {
  onClose:      () => void;
  onToast:      (msg: string, type: "success" | "error") => void;
  onSaved?:     () => void;
  prefill?:     Partial<RestockItem>;
  medicineId?:  string;
  requestType?: "drugs" | "supplies";
};

// ── Type lists ─────────────────────────────────────────────────────────────────
const DRUG_TYPE_OPTIONS: string[] = [
  "Tablet","Capsule","Syrup","Suspension","Injectable","Drops",
  "Inhaler","Patch","Suppository","Solution","Ointment","Powder",
];

const SUPPLY_TYPE_OPTIONS: string[] = [
  "Bandage","Gauze","Gloves","Syringe","Cotton","Alcohol","Mask",
  "Dressing","IV Set","Catheter","Lab Supply","PPE","Insecticide",
  "Medical Tape","Medical Form","Reagent Kit","Medical Adhesive","Other Supply",
];

// ── SVG icons ──────────────────────────────────────────────────────────────────
const DrugIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="9" width="20" height="6" rx="3"/>
    <line x1="12" y1="9" x2="12" y2="15"/>
  </svg>
);
const SupplyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>
  </svg>
);

export default function RestockModal({ onClose, onToast, onSaved, prefill, medicineId, requestType }: Props) {
  const { t } = useTheme();
  const [items,  setItems]  = useState<RestockItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Determine which type options to show
  const typeOptions = useMemo(() => {
    if (requestType === "drugs")    return DRUG_TYPE_OPTIONS;
    if (requestType === "supplies") return SUPPLY_TYPE_OPTIONS;
    // If no requestType (e.g. opened from restock button), guess from prefill
    if (prefill?.type) {
      const t = prefill.type.toLowerCase();
      const isSupply = SUPPLY_TYPE_OPTIONS.some(s => s.toLowerCase() === t);
      return isSupply ? SUPPLY_TYPE_OPTIONS : DRUG_TYPE_OPTIONS;
    }
    return [...DRUG_TYPE_OPTIONS, ...SUPPLY_TYPE_OPTIONS];
  }, [requestType, prefill?.type]);

  const defaultType = useMemo(() => {
    if (prefill?.type) return prefill.type;
    if (requestType === "supplies") return "Bandage";
    return "Tablet";
  }, [requestType, prefill?.type]);

  const BLANK: RestockItem = useMemo(() => ({
    medicine: "", dosage: "", type: defaultType, unit: "Pieces", qty: 1,
  }), [defaultType]);

  const [form, setForm] = useState<RestockItem>(prefill ? { ...BLANK, ...prefill } : BLANK);
  const setF = (k: keyof RestockItem, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const isSupplyMode = requestType === "supplies" ||
    (!requestType && prefill?.type && SUPPLY_TYPE_OPTIONS.some(s => s.toLowerCase() === prefill.type!.toLowerCase()));

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
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      let pharmacistName = "Pharmacist";
      if (uid) {
        const { data: u } = await supabase.from("users").select("username").eq("user_id", uid).maybeSingle();
        if (u?.username) pharmacistName = u.username;
      }

      for (const item of items) {
        const { error } = await supabase
          .from("restock_requests")
          .insert([{
            pharmacist_name: pharmacistName,
            medicine_name:   item.medicine,
            dosage:          item.dosage,
            medicine_type:   item.type,
            // ── unit is now saved so the auto-add listener can use it
            //    when warehouse confirms the request ────────────────────
            unit:            item.unit,
            quantity:        item.qty,
            status:          "pending",
          }]);
        if (error) throw error;
      }

      if (medicineId) {
        await supabase.from("pharma_medicines")
          .update({ archived: true })
          .eq("id", medicineId);
      }

      onToast(`Restock request sent (${items.length} item${items.length > 1 ? "s" : ""}).`, "success");
      onSaved?.();
      onClose();
    } catch (err: any) {
      onToast(err.message || "Failed to send request.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Modal title ────────────────────────────────────────────────────────────
  const modalTitle = requestType === "drugs"
    ? "Restock — Medicine Drugs"
    : requestType === "supplies"
    ? "Restock — Supplies"
    : "Restock Request";

  const dosageLabel       = isSupplyMode ? "Specification"                   : "Mg / Dosage";
  const dosagePlaceholder = isSupplyMode ? "e.g. Standard, 1 inch x 10 yds" : "e.g. 500mg";

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
  const col: CSSProperties = { display: "flex", flexDirection: "column" };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: t.modalBg, borderRadius: 16, width: 420,
        padding: "32px 36px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          {requestType && (
            <span style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${t.green}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: t.green, flexShrink: 0,
            }}>
              {requestType === "drugs" ? <DrugIcon /> : <SupplyIcon />}
            </span>
          )}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: t.green, margin: 0 }}>
            {modalTitle}
          </h2>
        </div>

        {/* ── Input fields ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>

          {/* Medicine / Supply Name */}
          <div style={col}>
            <label style={lbl}>{isSupplyMode ? "Supply Name" : "Medicine Name"}</label>
            <input
              value={form.medicine}
              onChange={e => setF("medicine", e.target.value)}
              onKeyDown={e => e.key === "Enter" && addItem()}
              placeholder={isSupplyMode ? "e.g. Surgical Tape" : "e.g. Paracetamol"}
              style={inp}
            />
          </div>

          {/* Dosage / Specification */}
          <div style={col}>
            <label style={lbl}>{dosageLabel}</label>
            <input
              value={form.dosage}
              onChange={e => setF("dosage", e.target.value)}
              placeholder={dosagePlaceholder}
              style={inp}
            />
          </div>

          {/* Type */}
          <div style={col}>
            <label style={lbl}>Type</label>
            {prefill?.type ? (
              <div style={{
                ...inp, display: "flex", alignItems: "center",
                background: t.surface2, color: t.text2, cursor: "not-allowed",
                border: `1.5px solid ${t.border2}`,
              }}>
                <span style={{ flex: 1 }}>{form.type}</span>
                <span style={{ fontSize: 10, color: t.text3, fontWeight: 700,
                  background: t.tableRowBorder, borderRadius: 4, padding: "1px 6px" }}>
                  AUTO
                </span>
              </div>
            ) : (
              <select value={form.type} onChange={e => setF("type", e.target.value)} style={sel}>
                {typeOptions.map(o => <option key={o}>{o}</option>)}
              </select>
            )}
          </div>

          {/* Unit */}
          <div style={col}>
            <label style={lbl}>Unit</label>
            {prefill?.unit ? (
              <div style={{
                ...inp, display: "flex", alignItems: "center",
                background: t.surface2, color: t.text2, cursor: "not-allowed",
                border: `1.5px solid ${t.border2}`,
              }}>
                <span style={{ flex: 1 }}>{form.unit}</span>
                <span style={{ fontSize: 10, color: t.text3, fontWeight: 700,
                  background: t.tableRowBorder, borderRadius: 4, padding: "1px 6px" }}>
                  AUTO
                </span>
              </div>
            ) : (
              <select value={form.unit} onChange={e => setF("unit", e.target.value)} style={sel}>
                {UNITS.map(o => <option key={o}>{o}</option>)}
              </select>
            )}
          </div>

          {/* Qty */}
          <div style={col}>
            <label style={lbl}>Qty</label>
            <div style={{
              display: "flex", alignItems: "stretch",
              border: `1.5px solid ${t.inputBorder}`, borderRadius: 8,
              overflow: "hidden", background: t.modalBg, height: 36,
            }}>
              <span style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: t.modalText,
              }}>
                {form.qty}
              </span>
              <div style={{
                display: "flex", flexDirection: "column",
                borderLeft: `1px solid ${t.inputBorder}`, flexShrink: 0,
              }}>
                <button onClick={() => setF("qty", form.qty + 1)} style={{
                  border: "none", background: "none", cursor: "pointer",
                  padding: "0 12px", fontSize: 9, color: t.text2,
                  flex: 1, lineHeight: 1, borderBottom: `1px solid ${t.inputBorder}`,
                }}>▲</button>
                <button onClick={() => setF("qty", Math.max(1, form.qty - 1))} style={{
                  border: "none", background: "none", cursor: "pointer",
                  padding: "0 12px", fontSize: 9, color: t.text2,
                  flex: 1, lineHeight: 1,
                }}>▼</button>
              </div>
            </div>
          </div>
        </div>

        {/* Add to list */}
        <button onClick={addItem} style={{
          width: "100%", padding: "8px", borderRadius: 8,
          border: `1.5px dashed ${t.green}`, background: "transparent",
          color: t.green, fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", marginBottom: 14,
        }}>
          + Add to list
        </button>

        {/* ── Items list ── */}
        <div style={{
          minHeight: 60, maxHeight: 200, overflowY: "auto", marginBottom: 22,
          borderRadius: 10, border: `1.5px solid ${t.border2}`, background: t.surface2,
        }}>
          {items.length === 0 ? (
            <div style={{ padding: "18px 16px", textAlign: "center", color: t.text3, fontSize: 13 }}>
              No items added yet
            </div>
          ) : (
            <>
              <div style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 60px 28px",
                padding: "6px 14px", borderBottom: `1px solid ${t.border2}`,
                fontSize: 10, fontWeight: 800, color: t.text3,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                <span>Name</span>
                <span>{isSupplyMode ? "Spec" : "Dosage"}</span>
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

        {/* Action buttons */}
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