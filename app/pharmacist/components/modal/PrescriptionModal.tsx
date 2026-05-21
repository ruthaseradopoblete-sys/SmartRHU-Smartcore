"use client";
import { CSSProperties, useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { logAction } from '@/utils/auditLogs'
import { useAuth } from "@/context/AuthContext";


type Prescription = {
  id: string;
  patient_id: string;
  prescription_date: string;
  medicine: string;
  quantity: string | null;
  dosage_frequency: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
  patient_name?: string;
};

type Props = {
  onClose: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

export default function PrescriptionModal({ onClose, onToast }: Props) {
  const { user } = useAuth() 
  const { t } = useTheme();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading]           = useState(true);
  const [confirming, setConfirming]     = useState(false);

  useEffect(() => {
    const fetchLatest = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select(`
            id,
            patient_id,
            prescription_date,
            medicine,
            quantity,
            dosage_frequency,
            notes,
            status,
            created_at,
            patients ( first_name, last_name )
          `)
          .eq("status", "sent")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        const p = data.patients as any;
        const fullName = p
          ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
          : "Unknown";

        setPrescription({
          ...data,
          patient_name: fullName || "Unknown",
        });
      } catch (err: any) {
        onToast(err.message || "Failed to load prescription.", "error");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();
  }, []);

  const handleConfirm = async () => {
    if (!prescription) return;
    setConfirming(true);
    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({ status: "dispensed" })
        .eq("id", prescription.id);

      if (error) throw error;

          await logAction({
        user_name:   user?.name || 'Pharmacist', // Default sa Pharmacist kung walang pangalan ang user object
        user_role:   'Pharmacist',                // Binago sa Pharmacist dahil nasa Pharmacist Modal ka
        action:      'Dispense Prescription',     // Action ng kasalukuyang button
        module:      'Pharmacy',
        description: `Dispensed medicine (${prescription.medicine}) to patient ${prescription.patient_name}`,
        status:      'success',
      });

      onToast("Prescription marked as dispensed.", "success");
      onClose();
    } catch (err: any) {
      onToast(err.message || "Failed to update prescription.", "error");
    } finally {
      setConfirming(false);
    }
  };

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

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "32px 0", color: t.modalText2, fontSize: 13 }}>
            Loading prescription…
          </div>
        )}

        {/* Empty */}
        {!loading && !prescription && (
          <div style={{ textAlign: "center", padding: "32px 0", color: t.modalText2, fontSize: 13 }}>
            No pending prescriptions.
          </div>
        )}

        {/* Data */}
        {!loading && prescription && (
          <>
            <div style={{
              fontSize: 11, color: t.text3, fontStyle: "italic",
              marginBottom: 12, background: t.readonlyBg, borderRadius: 6, padding: "5px 10px",
            }}>
              Sent by doctor — view only
            </div>

            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 14, gap: 12,
            }}>
              <div style={{ fontSize: 12.5, color: t.modalText2, fontWeight: 600 }}>
                Date: {new Date(prescription.prescription_date).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </div>
              <div style={{ fontSize: 12.5, color: t.modalText2, fontWeight: 600, whiteSpace: "nowrap" }}>
                {dateTimeStr}
              </div>
            </div>

            {/* All fields */}
            {[
              { label: "Patient Name:",  value: prescription.patient_name ?? "—" },
              { label: "Medicine Name:", value: prescription.medicine },
              { label: "Mg/Dosage:",     value: prescription.dosage_frequency ?? "—" },
              { label: "Quantity:",      value: prescription.quantity ?? "—" },
              { label: "Notes:",         value: prescription.notes ?? "—" },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{ ...fieldWrap, marginBottom: i === arr.length - 1 ? 24 : 14 }}>
                <div style={fieldLabel}>{label}</div>
                <div style={fieldValue}>{value}</div>
              </div>
            ))}
          </>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 8, border: "none",
            background: "#d63031", color: "#fff", fontSize: 14, fontWeight: 900,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
          }}>
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !prescription || confirming}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 8,
              border: `2.5px solid ${t.green}`, background: "transparent",
              color: t.green, fontSize: 14, fontWeight: 900,
              cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
              opacity: loading || !prescription || confirming ? 0.5 : 1,
            }}>              
            {confirming ? "SAVING…" : "CONFIRM"}
          </button>
        </div>
        

      </div>
    </div>
  );
}