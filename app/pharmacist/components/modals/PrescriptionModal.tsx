"use client";
import { CSSProperties } from "react";
import { useTheme } from "@/lib/theme";

type Props = { onClose: () => void };

export default function PrescriptionModal({ onClose }: Props) {
  const { t } = useTheme();
  const now = new Date();
  const dateTimeStr =
    `${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}  ` +
    `${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const fieldLabel: CSSProperties = { fontSize: 13, fontWeight: 700, color: t.modalText, marginBottom: 2 };
  const fieldValue: CSSProperties = {
    fontSize: 13, color: t.modalText2, padding: "3px 0",
    borderBottom: `2px solid ${t.green}`, minHeight: 22, width: "100%",
  };
  const fieldWrap: CSSProperties = { marginBottom: 14 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: t.modalBg, borderRadius: 16, width: 380,
        padding: "28px 32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }} onClick={e => e.stopPropagation()}>

        <h2 style={{ fontSize: 24, fontWeight: 900, color: t.green, margin: "0 0 16px" }}>
          Prescription
        </h2>

        <div style={{
          fontSize: 11, color: t.text3, fontStyle: "italic",
          marginBottom: 12, background: t.readonlyBg, borderRadius: 6, padding: "5px 10px",
        }}>
          Sent by doctor — view only
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 6, gap: 12,
        }}>
          <div style={{ fontSize: 12.5, color: t.modalText2, fontWeight: 600 }}>
            Requested by: (Name of the Doctor)
          </div>
          <div style={{ fontSize: 12.5, color: t.modalText2, fontWeight: 600, whiteSpace: "nowrap" }}>
            {dateTimeStr}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.modalText }}>Patient Name:</span>
          <div style={{ borderBottom: `2px solid ${t.green}`, marginTop: 4, minHeight: 20, width: "100%" }} />
        </div>

        {["Medicine Name:", "Mg/Dosage:", "Medicine Type:", "Quantity:"].map((lbl, i) => (
          <div key={lbl} style={{ ...fieldWrap, marginBottom: i === 3 ? 24 : 14 }}>
            <div style={fieldLabel}>{lbl}</div>
            <div style={fieldValue} />
          </div>
        ))}

        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 8, border: "none",
            background: "#d63031", color: "#fff", fontSize: 14, fontWeight: 900,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
          }}>
            CANCEL
          </button>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 8,
            border: `2.5px solid ${t.green}`, background: "transparent",
            color: t.green, fontSize: 14, fontWeight: 900,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
          }}>
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}