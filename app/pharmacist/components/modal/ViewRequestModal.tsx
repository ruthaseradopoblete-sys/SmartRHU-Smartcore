"use client";
import { CSSProperties, useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Urgency = "routine" | "urgent" | "emergency";

type Props = {
  onClose: () => void;
  onToast?: (msg: string, type: "success" | "error") => void;
};

const URGENCY_MAP: Record<Urgency, { bg: string; color: string; label: string }> = {
  routine:   { bg: "#e0f2fe", color: "#075985", label: "Routine"   },
  urgent:    { bg: "#ffedd5", color: "#9a3412", label: "Urgent"    },
  emergency: { bg: "#fee2e2", color: "#991b1b", label: "Emergency" },
};

const MEDICINE_TYPES = ["Tablet", "Capsule", "Syrup", "Injection", "Drops", "Ointment", "Other"];

export default function VaccineRequestModal({ onClose, onToast }: Props) {
  const { t } = useTheme();

  /* ── Nurse identity ── */
  const [nurseName, setNurseName] = useState<string>("Unknown Nurse");

  useEffect(() => {
    async function fetchUser() {
      try {
        // getSession() reads from local storage — no network call, avoids "Failed to fetch"
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          setNurseName(
            user.user_metadata?.full_name ?? user.email ?? "Unknown Nurse"
          );
        }
      } catch (err) {
        console.warn("Could not fetch user session:", err);
        setNurseName("Unknown Nurse");
      }
    }
    fetchUser();
  }, []);

  /* ── Form state ── */
  const [vaccineName, setVaccineName] = useState("");
  const [dosage,      setDosage]      = useState("");
  const [quantity,    setQuantity]    = useState<number | "">("");
  const [urgency,     setUrgency]     = useState<Urgency>("routine");
  const [notes,       setNotes]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  /* ── Validation ── */
  function validate(): string | null {
    if (!vaccineName.trim()) return "Vaccine name is required.";
    if (!dosage.trim())      return "Dosage / form is required.";
    if (!quantity || Number(quantity) < 1) return "Quantity must be at least 1.";
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { onToast?.(err, "error"); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("nurse_vaccine_requests")
        .insert({
          nurse_name:   nurseName,
          vaccine_name: vaccineName.trim(),
          dosage:       dosage.trim(),
          quantity:     Number(quantity),
          urgency,
          notes:        notes.trim() || null,
          status:       "pending",
        });

      if (error) throw error;

      onToast?.(`Vaccine request for "${vaccineName.trim()}" submitted successfully.`, "success");
      onClose();
    } catch (err) {
      console.error(err);
      onToast?.("Failed to submit request. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Styles ── */
  const labelStyle: CSSProperties = {
    fontSize: 10, fontWeight: 800, color: t.text3,
    textTransform: "uppercase", letterSpacing: "0.06em",
    marginBottom: 5, display: "block",
  };

  const inputStyle: CSSProperties = {
    width: "100%", padding: "9px 12px",
    borderRadius: 8, border: `1.5px solid ${t.border2}`,
    background: t.surface2 ?? t.cardBg,
    color: t.text, fontSize: 13,
    fontFamily: "inherit", outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const fieldStyle: CSSProperties = { display: "flex", flexDirection: "column" };

  const SyringeIcon = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2l4 4"/><path d="M17 7l3-3"/>
      <path d="M19 9 9 19l-4 2 2-4L17 7l2 2z"/>
      <path d="M12 12l3 3"/><path d="M9 9l1.5 1.5"/>
      <path d="M6 12l1.5 1.5"/>
    </svg>
  );

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.modalBg, borderRadius: 18,
          width: 480, maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{
          background: t.green, padding: "18px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.65)",
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2,
            }}>
              Health Center
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 9 }}>
              <SyringeIcon size={18} color="#fff" />
              Vaccine Request
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)", border: "none",
              color: "#fff", width: 30, height: 30, borderRadius: 8,
              fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit",
            }}
          >✕</button>
        </div>

        {/* ── Nurse banner ── */}
        <div style={{
          padding: "10px 24px",
          background: `${t.green}12`,
          borderBottom: `1px solid ${t.border2}`,
          fontSize: 12, color: t.text2, flexShrink: 0,
        }}>
          Submitting as <span style={{ fontWeight: 700, color: t.text }}>{nurseName}</span>
        </div>

        {/* ── Form body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Vaccine name */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Vaccine Name *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Oral Polio Vaccine (OPV)"
              value={vaccineName}
              onChange={e => setVaccineName(e.target.value)}
            />
          </div>

          {/* Dosage + Quantity row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Dosage / Form *</label>
              <input
                style={inputStyle}
                placeholder="e.g. 0.5 mL / Vial"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Quantity *</label>
              <input
                style={inputStyle}
                type="number"
                min={1}
                placeholder="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          {/* Urgency */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Urgency</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["routine", "urgent", "emergency"] as Urgency[]).map(u => {
                const info = URGENCY_MAP[u];
                const active = urgency === u;
                return (
                  <button
                    key={u}
                    onClick={() => setUrgency(u)}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8,
                      border: `1.5px solid ${active ? info.color : t.border2}`,
                      background: active ? info.bg : "transparent",
                      color: active ? info.color : t.text3,
                      fontSize: 12, fontWeight: 800,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 80, lineHeight: 1.5 }}
              placeholder="Any special instructions or context…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "14px 24px", borderTop: `1px solid ${t.border2}`,
          display: "flex", gap: 10, flexShrink: 0,
          background: t.modalBg,
        }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8,
              border: `1.5px solid ${t.border2}`, background: "transparent",
              color: t.text2, fontSize: 13, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 2, padding: "10px 0", borderRadius: 8,
              border: "none", background: t.green,
              color: "#fff", fontSize: 13, fontWeight: 800,
              cursor: submitting ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: submitting ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}