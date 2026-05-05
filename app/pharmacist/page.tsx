"use client";
import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { ThemeCtx, LIGHT, DARK } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { Medicine } from "@/lib/types";

import Sidebar           from "./components/Sidebar";
import Header            from "./components/Header";
import Toast             from "./components/Toast";
import RestockModal      from "./components/modal/RestockModal";
import Dashboard         from "./components/pages/Dashboard";
import MedicineStockPage from "./components/pages/MedicineStockPage";
import PrescriptionsPage from "./components/pages/PrescriptionPage";

export default function Home() {
  const [dark, setDark]               = useState(false);
  const [activePage, setActivePage]   = useState("dashboard");
  const [showRestock, setShowRestock] = useState(false);
  const [toast, setToast]             = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [medicines, setMedicines]     = useState<Medicine[]>([]);

  const t = dark ? DARK : LIGHT;

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
  }, []);

  const fetchDashboardMedicines = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pharma_medicines")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      setMedicines((data as Medicine[]) ?? []);
    } catch {
      // silently fail on dashboard
    }
  }, []);

  useEffect(() => { fetchDashboardMedicines(); }, [fetchDashboardMedicines]);

  const goToPrescriptions = () => setActivePage("prescriptions");

 return (
    <ThemeCtx.Provider value={{ t, dark, toggle: () => setDark(d => !d) }}>
      <div style={{
        display: "flex", height: "100vh", overflow: "hidden",
        fontFamily: "'Nunito', sans-serif", background: t.appBg,
        transition: "background 0.2s",
      }}>
        <Sidebar active={activePage} setActive={setActivePage} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <Header onOpenPrescriptions={goToPrescriptions} />

          <main style={{
            flex: 1, overflowY: "auto", padding: "18px 20px",
            background: t.appBg, boxSizing: "border-box", transition: "background 0.2s",
          }}>
            {activePage === "dashboard" && (
              <Dashboard
                medicines={medicines}
                onSendRequest={() => setShowRestock(true)}
                onOpenPrescriptions={goToPrescriptions}
              />
            )}
            {activePage === "stock" && (
              <MedicineStockPage onToast={showToast} />
            )}
            {activePage === "prescriptions" && (
              <PrescriptionsPage />
            )}
          </main>
        </div>

        {showRestock && (
          <RestockModal
            onClose={() => setShowRestock(false)}
            onToast={showToast}
          />
        )}

        {toast && (
          <Toast
            message={toast.msg}
            type={toast.type}
            onDone={() => setToast(null)}
          />
        )}
      </div>
    </ThemeCtx.Provider>
  );
}