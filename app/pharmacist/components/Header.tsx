"use client";
import { useState } from "react";
import { useTheme } from "@/lib/theme";

type Props = {
  onOpenPrescriptions: () => void;
};

export default function Header({ onOpenPrescriptions }: Props) {
  const { t, dark, toggle } = useTheme();
  const [showNotif, setShowNotif] = useState(false);

  return (
    <header style={{
      background: t.headerBg, height: 52, display: "flex",
      alignItems: "center", padding: "0 20px", gap: 14, position: "relative",
      zIndex: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.2)", flexShrink: 0,
      transition: "background 0.2s",
    }}>
      {/* Search */}
      <div style={{ position: "relative", maxWidth: 270, width: "100%" }}>
        <span style={{
          position: "absolute", left: 11, top: "50%",
          transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)",
          fontSize: 12, pointerEvents: "none",
        }}>🔍</span>
        <input placeholder="Search" style={{
          width: "100%", padding: "7px 12px 7px 34px", borderRadius: 20,
          border: "none", outline: "none", fontSize: 12.5, fontFamily: "inherit",
          background: "rgba(255,255,255,0.15)", color: "#fff",
        }} />
      </div>

      <div style={{
        marginLeft: "auto", display: "flex", alignItems: "center",
        gap: 10, position: "relative",
      }}>
        {/* Notification bell */}
        <button onClick={() => setShowNotif(v => !v)} style={{
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 18,
          padding: "5px 14px", fontSize: 12, fontWeight: 700, color: "#fff",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
        }}>
          Notification <span style={{ fontSize: 14 }}>🔔</span>
        </button>

        {showNotif && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 10px)",
            width: 260, background: t.notifBg, borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            border: `1px solid ${t.notifBorder}`, overflow: "hidden", zIndex: 200,
          }}>
            <div
              onClick={() => { setShowNotif(false); onOpenPrescriptions(); }}
              style={{
                padding: "11px 14px", display: "flex", alignItems: "center", gap: 8,
                borderBottom: `1px solid ${t.notifBorder}`, fontSize: 12.5,
                color: t.notifText, fontWeight: 600, cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = t.surface2)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: t.greenLight, flexShrink: 0,
              }} />
              <span>Prescription</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: t.text3 }}>View →</span>
            </div>
            <div
              style={{ padding: "11px 14px", fontSize: 12.5, color: t.notifText2, cursor: "pointer" }}
              onClick={() => setShowNotif(false)}>
              Confirmation REQ from Warehouse
            </div>
          </div>
        )}

        {/* Dark / light toggle */}
        <button onClick={toggle} title={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, flexShrink: 0,
          }}>
          {dark ? "☀️" : "🌙"}
        </button>

        {/* Profile chip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: t.profileBg, borderRadius: 18, padding: "4px 12px 4px 5px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)", flexShrink: 0,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "#c8e6c9", color: t.green, fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            PFP
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.profileText }}>Name</span>
        </div>
      </div>
    </header>
  );
}