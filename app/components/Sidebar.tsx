"use client";
import { CSSProperties } from "react";
import { useTheme } from "@/lib/theme";
import MiniCalendar from "@/components/MiniCalendar";

type Props = {
  active: string;
  setActive: (page: string) => void;
};

export default function Sidebar({ active, setActive }: Props) {
  const { t } = useTheme();

  const btn = (on: boolean): CSSProperties => ({
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    padding: "7px 10px", borderRadius: 8, border: "none",
    background: on ? t.navActiveBg : "transparent",
    color: on ? t.navActiveText : t.navText,
    fontWeight: on ? 700 : 500,
    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    marginBottom: 2, textAlign: "left",
    transition: "background 0.15s, color 0.15s",
  });

  return (
    <aside style={{
      width: 205, minWidth: 205, background: t.sidebarBg,
      display: "flex", flexDirection: "column",
      boxShadow: "2px 0 10px rgba(0,0,0,0.12)", zIndex: 10,
      height: "100vh", overflow: "hidden",
      borderRight: `1px solid ${t.sidebarBorder}`,
      transition: "background 0.2s",
    }}>
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        padding: "18px 0 14px", borderBottom: `1px solid ${t.sidebarBorder}`, flexShrink: 0,
      }}>
        <img src="/logo.jfif" alt="Municipal Health Office Lopez, Quezon"
          style={{
            width: 90, height: 90, borderRadius: "50%",
            objectFit: "cover", border: `3px solid ${t.green}`,
          }} />
      </div>

      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        <span style={{
          display: "block", fontSize: 9.5, fontWeight: 800, color: t.navLabel,
          textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 8px 5px",
        }}>
          Menu
        </span>

        <button style={btn(active === "dashboard")} onClick={() => setActive("dashboard")}>
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill={active === "dashboard" ? "#fff" : t.green}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Dashboard
        </button>

        <button style={btn(active === "stock")} onClick={() => setActive("stock")}>
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill={active === "stock" ? "#fff" : t.navText}>
            <circle cx="12" cy="12" r="9" fillOpacity=".15" />
            <path d="M12 7v5l3 3"
              stroke={active === "stock" ? "#fff" : t.navText}
              strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          Medicine Stock
        </button>

        <span style={{
          display: "block", fontSize: 9.5, fontWeight: 800, color: t.navLabel,
          textTransform: "uppercase", letterSpacing: "0.07em", padding: "14px 8px 5px",
        }}>
          General
        </span>

        {[
          { id: "settings", label: "Settings", icon: "⚙" },
          { id: "help",     label: "Help",     icon: "ℹ" },
          { id: "logout",   label: "Logout",   icon: "⇥" },
        ].map(item => (
          <button key={item.id} style={btn(false)}>
            <span style={{ width: 14, textAlign: "center", fontSize: 13 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ flexShrink: 0 }}>
        <MiniCalendar />
      </div>
    </aside>
  );
}
