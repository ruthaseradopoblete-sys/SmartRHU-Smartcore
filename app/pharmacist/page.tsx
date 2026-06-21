"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeCtx, LIGHT, DARK } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";

import Sidebar           from "./components/Sidebar";
import Topbar            from "./components/Topbar";
import Toast             from "./components/Toast";
import RestockModal      from "./components/modal/RestockModal";
import ViewRequestsModal from "./components/modal/ViewRequestModal";
import Dashboard         from "./components/pages/Dashboard";
import MedicineStockPage from "./components/pages/MedicineStockPage";
import PharmacistSettings from "./components/pages/PharmacistSettings";

export default function Home() {
  const router        = useRouter();
  const searchParams  = useSearchParams();

  const [dark, setDark]                         = useState(false);
  const [activePage, setActivePage]             = useState("dashboard");
  const [settingsTab, setSettingsTab]           = useState<"profile" | "password">("profile");
  const [restockType, setRestockType] = useState<"drugs" | "supplies" | null>(null);
  const [showViewRequests, setShowViewRequests] = useState(false);
  const [toast, setToast]                       = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [medicines, setMedicines]               = useState<Medicine[]>([]);
  const [totalCount, setTotalCount]             = useState(0);

  const t = dark ? DARK : LIGHT;

  // ── Read ?page= and ?tab= from URL — ONLY on initial mount ─────────────────
  // This used to re-run on every searchParams change, which meant a stale
  // URL (e.g. left over from clicking a prescription notification earlier)
  // would silently override activePage on every reload, even after the
  // pharmacist had since navigated elsewhere. Now it only seeds the initial
  // page; ongoing navigation is synced the other way (state → URL) below.
  //
  // The standalone "prescriptions" page no longer exists — Dashboard owns
  // its own Prescriptions panel now — so a stale ?page=prescriptions URL
  // (e.g. from an old bookmark or browser history) falls back to dashboard
  // instead of matching nothing.
  useEffect(() => {
    const page = searchParams?.get("page");
    const tab  = searchParams?.get("tab");
    if (page === "settings") {
      setActivePage("settings");
      setSettingsTab(tab === "password" ? "password" : "profile");
    } else if (page === "medicine-stock") {
      // Topbar links to "medicine-stock", but this page's internal key for
      // the same screen is "stock" — map it so the URL-driven navigation
      // actually renders MedicineStockPage instead of matching nothing.
      setActivePage("stock");
    } else if (page === "dashboard" || page === "prescriptions") {
      setActivePage("dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — initial load only

  // ── Keep the URL in sync with activePage ────────────────────────────────
  // Sidebar and Dashboard navigate by calling setActivePage directly (not
  // through handleNavigate), so without this, the address bar can drift out
  // of sync with what's actually on screen — and a reload would then jump
  // back to whatever page was last in the URL instead of where the
  // pharmacist actually was. router.replace avoids piling these into
  // browser history on every click.
  useEffect(() => {
    const urlPage = activePage === "stock" ? "medicine-stock" : activePage;
    const qs = activePage === "settings" ? `?page=settings&tab=${settingsTab}` : `?page=${urlPage}`;
    router.replace(`/pharmacist${qs}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, settingsTab]);

  // ── Listen for Topbar's restock-notification click ───────────────────────
  // Topbar dispatches this event (and navigates to the dashboard) when the
  // pharmacist clicks a restock notification — we just need to open the
  // modal here, since this is the component that owns its visibility.
  useEffect(() => {
    const open = () => setShowViewRequests(true);
    window.addEventListener("openViewRequests", open);
    return () => window.removeEventListener("openViewRequests", open);
  }, []);

  // ── Handle onNavigate from Topbar (for non-URL navigation) ───────────────
  const handleNavigate = (page: string) => {
    if (page === "settings") {
      setActivePage("settings");
      setSettingsTab("profile");
    } else if (page === "medicine-stock") {
      // Same key mismatch as above, but for the non-URL onNavigate path.
      setActivePage("stock");
    } else if (page === "prescriptions") {
      // Prescriptions notifications now route here too — Dashboard has its
      // own Prescriptions panel, so just land on dashboard.
      setActivePage("dashboard");
    } else {
      setActivePage(page);
    }
  };

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
  }, []);

  const fetchDashboardMedicines = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pharma_medicines")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMedicines((data as Medicine[]) ?? []);
      setTotalCount((data as Medicine[])?.length ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => { fetchDashboardMedicines(); }, [fetchDashboardMedicines]);

  return (
    <ThemeCtx.Provider value={{ t, dark, toggle: () => setDark(d => !d) }}>
      <div style={{
        display: "flex", height: "100vh", overflow: "hidden",
        fontFamily: "'Nunito', sans-serif", background: t.appBg,
        transition: "background 0.2s",
      }}>
        <Sidebar active={activePage} setActive={setActivePage} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

          {/* Topbar — no darkMode/setDarkMode props needed, uses useTheme() internally */}
          <Topbar onNavigate={handleNavigate} />

          <main style={{
            flex: 1, overflowY: "auto", padding: "18px 20px",
            background: t.appBg, boxSizing: "border-box", transition: "background 0.2s",
          }}>
            {activePage === "dashboard" && (
              <Dashboard
                medicines={medicines}
                totalCount={totalCount}
                onSendRequest={(type) => setRestockType(type)}
                onOpenPrescriptions={() => setActivePage("dashboard")}
                onViewRequests={() => setShowViewRequests(true)}
              />
            )}
            {activePage === "stock" && (
              <MedicineStockPage onToast={showToast} onMedicineAdded={fetchDashboardMedicines} />
            )}
            {activePage === "settings" && (
              <PharmacistSettings initialTab={settingsTab} />
            )}
          </main>
        </div>

        {restockType && (
          <RestockModal
            requestType={restockType}
            onClose={() => setRestockType(null)}
            onToast={showToast}
          />
        )}
        {showViewRequests && (
          <ViewRequestsModal onClose={() => setShowViewRequests(false)} />
        )}
        {toast && (
          <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />
        )}
      </div>
    </ThemeCtx.Provider>
  );
}