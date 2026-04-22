"use client";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import MiniCalendar from "./MiniCalendar";
import styles from "../styles/dashboard.module.css";

export default function DoctorSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const onTimeline = pathname.startsWith("/doctor/timeline");
  const onDash = !onTimeline;

  // Fix 1: made async so logout() awaits properly
  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <div className={styles.logoSeal}>🏥</div>
        <div>
          <div className={styles.logoName}>SMARTRHU</div>
          <div className={styles.logoSub}>RHU Lopez, Quezon</div>
        </div>
      </div>
      <nav className={styles.sidebarNav}>
        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>Menu</span>
          <button className={`${styles.navItem}${onDash ? " "+styles.navItemActive : ""}`}
            onClick={() => router.push("/doctor")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Dashboard
          </button>

          {/* Fix 2: navigate to /doctor/timeline */}
          <button className={`${styles.navItem}${onTimeline ? " "+styles.navItemActive : ""}`}
            onClick={() => router.push("/doctor/timeline")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            Patient Timeline
          </button>
        </div>
        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>General</span>
          <button className={styles.navItem}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Settings
          </button>
          <button className={styles.navItem}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>
            </svg>
            Help
          </button>
          <button className={`${styles.navItem} ${styles.navItemLogout}`} onClick={handleLogout}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </nav>
      <MiniCalendar />
    </aside>
  );
}