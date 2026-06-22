"use client";
import { CSSProperties, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "../../../lib/theme";

type Props = {
  active: string;
  setActive: (page: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

// Fixed-date Philippine holidays (month is 0-indexed to match JS Date).
// Lunar/movable holidays (Holy Week, Eid, Chinese New Year) are intentionally
// excluded since they shift every year and need a separate lookup table.
const PH_HOLIDAYS: Record<string, string> = {
  '0-1':   "New Year's Day",
  '1-25':  'EDSA People Power Anniversary',
  '3-9':   'Araw ng Kagitingan',
  '4-1':   'Labor Day',
  '5-12':  'Independence Day',
  '7-21':  'Ninoy Aquino Day',
  '7-25':  'National Heroes Day',
  '9-31':  "All Saints' Day Eve",
  '10-1':  "All Saints' Day",
  '10-30': 'Bonifacio Day',
  '11-8':  'Feast of the Immaculate Conception',
  '11-24': 'Christmas Eve',
  '11-25': 'Christmas Day',
  '11-30': 'Rizal Day',
  '11-31': "New Year's Eve",
}

export default function Sidebar({ active, setActive, collapsed, onToggleCollapsed }: Props) {
  const { t } = useTheme();
  const router = useRouter();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── Mini calendar state — inlined directly (per request), mirroring the
  //    nurse Sidebar's month-nav + PH holidays behavior, re-themed with
  //    pharmacist's existing useTheme() tokens instead of nurse's CSS vars.
  const [today, setToday] = useState({ day: 0, month: 0, year: 0 });
  const [viewMonth, setViewMonth] = useState(0);
  const [viewYear, setViewYear] = useState(0);

  useEffect(() => {
    const now = new Date();
    setToday({ day: now.getDate(), month: now.getMonth(), year: now.getFullYear() });
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
  }, []);

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isHoliday = (month: number, day: number) => PH_HOLIDAYS[`${month}-${day}`];

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayLabels = ['S','M','T','W','T','F','S'];

  const getDates = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const dates: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) dates.push(i);
    return dates;
  };

  async function handleLogout() {
    await logout();
    router.push("/login");
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
    justifyContent: collapsed ? "center" : "flex-start",
  });

  const sectionLabel: CSSProperties = {
    fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
    color: t.navLabel, padding: "0 8px", marginBottom: 6,
    display: "block",
  };

  return (
    <>
      <aside style={{
        width: collapsed ? 64 : 232, minWidth: collapsed ? 64 : 232,
        background: t.sidebarBg,
        borderRight: `1px solid ${t.sidebarBorder}`,
        display: "flex", flexDirection: "column",
        overflowY: "auto", overflowX: "hidden",
        zIndex: 10, height: "100vh",
        transition: "width 0.2s ease, background 0.2s",
        position: "relative",
        flexShrink: 0,
      }}>

        {/* ── Logo ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: collapsed ? "18px 8px" : "18px 16px",
          justifyContent: collapsed ? "center" : "flex-start",
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
          {!collapsed && (
            <div>
              <div style={{
                fontSize: 13, fontWeight: 800, color: t.green,
                letterSpacing: "0.05em", lineHeight: 1.2,
              }}>MHO LOPEZ</div>
              <div style={{ fontSize: 10, color: t.navLabel, marginTop: 2 }}>
                Lopez, Quezon
              </div>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>

          <div style={{ marginBottom: 16 }}>
            {!collapsed && <span style={sectionLabel}>Menu</span>}

            <button
              style={navItem(active === "dashboard")}
              title={collapsed ? "Dashboard" : undefined}
              onClick={() => setActive("dashboard")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              {!collapsed && "Dashboard"}
            </button>

            <button
              style={navItem(active === "stock")}
              title={collapsed ? "Medicine Stock" : undefined}
              onClick={() => setActive("stock")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              {!collapsed && "Medicine Stock"}
            </button>
          </div>

          <div>
            {!collapsed && <span style={sectionLabel}>General</span>}

            <button
              style={navItem(active === "settings")}
              title={collapsed ? "Settings" : undefined}
              onClick={() => setActive("settings")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              {!collapsed && "Settings"}
            </button>

            <button
              style={navItem(false, true)}
              title={collapsed ? "Logout" : undefined}
              onClick={() => setShowLogoutModal(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {!collapsed && "Logout"}
            </button>
          </div>
        </nav>

        {/* ── Mini Calendar — inlined with month-nav + PH holidays, hidden
            when collapsed, re-themed with t.* tokens (no CSS module
            classes, matching pharmacist's inline-styles-only pattern). ── */}
        {!collapsed && (
          <div style={{
            margin: "0 10px 14px", padding: "12px 12px 14px",
            borderTop: `1px solid ${t.sidebarBorder}`,
            flexShrink: 0,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <button
                onClick={goPrevMonth}
                style={{
                  border: "none", background: "transparent", color: t.navLabel,
                  cursor: "pointer", padding: 4, display: "flex", alignItems: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.navText }}>
                {months[viewMonth]} {viewYear}
              </span>
              <button
                onClick={goNextMonth}
                style={{
                  border: "none", background: "transparent", color: t.navLabel,
                  cursor: "pointer", padding: 4, display: "flex", alignItems: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2, minHeight: 168,
            }}>
              {dayLabels.map((d, i) => (
                <div key={i} style={{
                  fontSize: 9, fontWeight: 700, textAlign: "center",
                  color: i === 0 ? "#ef4444" : t.navLabel, padding: "2px 0",
                }}>{d}</div>
              ))}
              {getDates().map((d, i) => {
                if (!d) return <div key={i} />;
                const dayOfWeek = i % 7;
                const isSunday = dayOfWeek === 0;
                const isToday = d === today.day && viewMonth === today.month && viewYear === today.year;
                const holidayName = isHoliday(viewMonth, d);
                return (
                  <div
                    key={i}
                    title={holidayName || undefined}
                    style={{
                      fontSize: 10, textAlign: "center", borderRadius: 6,
                      padding: "4px 0", cursor: holidayName ? "help" : "default",
                      background: isToday ? t.green : holidayName ? t.green + "22" : "transparent",
                      color: isToday ? "#fff" : holidayName ? t.green : isSunday ? "#ef4444" : t.navText,
                      fontWeight: isToday || holidayName ? 700 : 400,
                    }}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* ── Collapse / expand toggle — floating, viewport-fixed, positioned
          just past the sidebar's current right edge so it slides with the
          collapse animation. Mirrors the nurse Sidebar's floating button,
          re-themed with t.green / t.sidebarBg instead of CSS vars. ── */}
      <button
        onClick={onToggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          position: "fixed",
          top: 16,
          left: collapsed ? 64 - 12 : 232 - 12,
          width: 24, height: 24,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${t.green}, ${t.greenLight})`,
          border: `2px solid ${t.sidebarBg}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 3px 10px rgba(22,163,74,.4)",
          zIndex: 110,
          padding: 0,
          transition: "left .2s ease",
        }}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform .2s", display: "block" }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* ── Logout Confirmation Modal — unchanged ── */}
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