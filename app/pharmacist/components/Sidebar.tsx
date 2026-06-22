"use client";
import { CSSProperties, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "../../../lib/theme";
import MiniCalendar from "../components/pages/MiniCalendar";

type Props = {
  active: string;
  setActive: (page: string) => void;
};

export default function Sidebar({ active, setActive }: Props) {
  const { t } = useTheme();
  const router = useRouter();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/landing");
  }

  const navItem = (on: boolean, isLogout = false): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 9,
    width: "100%", padding: "9px 12px",
    border: "none", borderRadius: 10,
    background: on ? t.navActiveBg : "transparent",
    color: on ? t.navActiveText : isLogout ? "#ef4444" : t.navText,
    fontWeight: on ? 700 : 500,
    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    textAlign: "left", marginBottom: 2,
    transition: "background 0.15s, color 0.15s",
  });

  const sectionLabel: CSSProperties = {
    fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
    color: t.navLabel, padding: "0 8px", marginBottom: 6,
    display: "block",
  };

  return (
    <>
      <aside style={{
        width: 232, minWidth: 232,
        background: t.sidebarBg,
        borderRight: `1px solid ${t.sidebarBorder}`,
        display: "flex", flexDirection: "column",
        overflowY: "auto", overflowX: "hidden",
        zIndex: 10, height: "100vh",
        transition: "background 0.2s",
      }}>

        {/* ── Logo ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "18px 16px",
          borderBottom: `1px solid ${t.sidebarBorder}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: "#edf7f1",
            border: `1px solid ${t.sidebarBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, overflow: "hidden",
          }}>
            <img src="/logo.jpg" alt="MHO Logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 800, color: t.green,
              letterSpacing: "0.05em", lineHeight: 1.2,
            }}>MHO LOPEZ</div>
            <div style={{ fontSize: 10, color: t.navLabel, marginTop: 2 }}>
              Lopez, Quezon
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>

          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Menu</span>

            <button style={navItem(active === "dashboard")} onClick={() => setActive("dashboard")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              Dashboard
            </button>

            <button style={navItem(active === "stock")} onClick={() => setActive("stock")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Medicine Stock
            </button>
          </div>

          <div>
            <span style={sectionLabel}>General</span>

            <button style={navItem(active === "settings")} onClick={() => setActive("settings")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              Settings
            </button>

            <button style={navItem(false, true)} onClick={() => setShowLogoutModal(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </nav>

        {/* ── Mini Calendar ── */}
        <MiniCalendar />
      </aside>

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div
          onClick={() => setShowLogoutModal(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              width: 400,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            {/* Modal header */}
            <div style={{
              background: t.green,
              padding: "16px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Logout</span>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  background: "rgba(255,255,255,0.2)", border: "none",
                  borderRadius: 8, width: 28, height: 28,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div style={{
              padding: "36px 28px 28px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            }}>
              {/* Icon circle */}
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#fef2f2",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                  Are you sure?
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  You will be logged out of the system.
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 8 }}>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  style={{
                    flex: 1, padding: "12px 0",
                    border: "none", borderRadius: 10,
                    background: "#fef2f2", color: "#ef4444",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    fontFamily: "inherit", letterSpacing: "0.04em",
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    flex: 1, padding: "12px 0",
                    border: "none", borderRadius: 10,
                    background: t.green, color: "#fff",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    fontFamily: "inherit", letterSpacing: "0.04em",
                    boxShadow: `0 4px 14px ${t.green}55`,
                  }}
                >
                  LOGOUT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}