"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

const ROLE = "Pharmacist";

type Props = {
  onNavigate: (page: string) => void;
  profilePhoto: string | null;
  profileUsername: string;
};

export default function ProfileDropdown({ onNavigate, profilePhoto, profileUsername }: Props) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Initials fallback from the actual username
  const initials = profileUsername
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const Avatar = ({ size, border }: { size: number; border: string }) =>
    profilePhoto ? (
      <img
        src={profilePhoto}
        alt="Profile"
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", objectPosition: "center top",
          border, flexShrink: 0,
        }}
      />
    ) : (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "rgba(255,255,255,0.25)",
        border,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.3, fontWeight: 800, color: "#fff", flexShrink: 0,
      }}>
        {initials}
      </div>
    );

  const menuItem = (icon: string, label: string, onClick: () => void, danger = false) => (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        width: "100%", padding: "13px 20px",
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "inherit", fontSize: 14, fontWeight: 500,
        color: danger ? "#d94040" : t.text,
        textAlign: "left", transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = t.hoverBg ?? "rgba(0,0,0,0.04)")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      <span style={{ fontSize: 20, width: 24, textAlign: "center" }}>{icon}</span>
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>

      {/* Trigger chip */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          background: t.profileBg, border: "none", cursor: "pointer",
          padding: "4px 12px 4px 5px", borderRadius: 18,
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)", flexShrink: 0,
        }}
      >
        {profilePhoto ? (
          <img
            src={profilePhoto}
            alt="Profile"
            style={{
              width: 26, height: 26, borderRadius: "50%",
              objectFit: "cover", objectPosition: "center top",
              border: `2px solid ${t.green}`,
            }}
          />
        ) : (
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "#c8e6c9", color: t.green,
            fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {initials}
          </div>
        )}
        <span style={{ fontSize: 13, fontWeight: 700, color: t.profileText }}>{profileUsername}</span>
        <span style={{ fontSize: 10, color: t.profileText, opacity: 0.6, marginLeft: 2 }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 260, background: t.cardBg,
          borderRadius: 14, overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          border: `1px solid ${t.cardBorder}`,
          zIndex: 9999,
          animation: "fadeDown 0.15s ease",
        }}>
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg,${t.green} 0%,${t.greenLight} 100%)`,
            padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <Avatar size={46} border="2.5px solid rgba(255,255,255,0.7)" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{profileUsername}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{ROLE}</div>
            </div>
          </div>

          <div style={{ height: 1, background: t.cardBorder }} />

          {menuItem("👤", "My Profile",      () => { setOpen(false); onNavigate("settings"); })}
          {menuItem("🔒", "Change Password", () => { setOpen(false); onNavigate("settings?tab=password"); })}
          {menuItem("⚙️", "Settings",        () => { setOpen(false); onNavigate("settings"); })}

          <div style={{ height: 1, background: t.cardBorder }} />

          {menuItem("🚪", "Logout", () => { setOpen(false); handleLogout(); }, true)}
        </div>
      )}

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
