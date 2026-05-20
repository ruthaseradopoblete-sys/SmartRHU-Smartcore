"use client";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/dashboard.module.css";

interface Medicine {
  id: string;
  med_name: string;
  med_dosage: string;
  med_type: string;
  exp_date: string;
  quantity: number;
  unit: string;
  description?: string;
}

type MessageRole = "user" | "ai";

interface ChatMessage {
  from: MessageRole;
  text: string;
  medicines?: Medicine[];
  loading?: boolean;
}

function MedicineCard({ med }: { med: Medicine }) {
  const expDate = new Date(med.exp_date);
  const isExpiringSoon = expDate < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const isExpired = expDate < new Date();

  return (
    <div className={styles.medCard}>
      <div className={styles.medCardHeader}>
        <span className={styles.medName}>{med.med_name}</span>
        <span className={styles.medType}>{med.med_type}</span>
      </div>
      <div className={styles.medDetails}>
        <span className={styles.medDetail}>{med.med_dosage} {med.unit}</span>
        <span className={`${styles.medDetail} ${isExpired ? styles.medExpired : isExpiringSoon ? styles.medExpiringSoon : ""}`}>
          Exp: {expDate.toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
          {isExpired ? " ⚠ EXPIRED" : isExpiringSoon ? " ⚠ Soon" : ""}
        </span>
        <span className={styles.medDetail}>Stock: {med.quantity}</span>
      </div>
      {med.description && (
        <p className={styles.medDesc}>{med.description}</p>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className={styles.typingDots}>
      <span className={styles.dot} style={{ animationDelay: "0s" }} />
      <span className={styles.dot} style={{ animationDelay: "0.18s" }} />
      <span className={styles.dot} style={{ animationDelay: "0.36s" }} />
    </div>
  );
}


export default function AiDictionary() {
  const [msg, setMsg] = useState("");
  const [log, setLog] = useState<ChatMessage[]>([
    {
      from: "ai",
      text: "Hello, Doctor! I'm your AI Medical Dictionary powered by SmartRHU's live medicine inventory. Describe your patient's symptoms, age, and condition — I'll search our database and suggest compatible medicines.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  async function send(query?: string) {
    const m = (query ?? msg).trim();
    if (!m || loading) return;

    setLog((l) => [...l, { from: "user", text: m }]);
    setMsg("");
    setLoading(true);
    setLog((l) => [...l, { from: "ai", text: "", loading: true }]);

    try {
      const res = await fetch("/api/ai_dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: m }),
      });

      // Catch non-200 responses and surface the real error
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setLog((l) => {
        const filtered = l.filter((msg) => !msg.loading);
        return [
          ...filtered,
          {
            from: "ai" as MessageRole,
            text: data.recommendation ?? "No recommendation available.",
            medicines: data.medicines ?? [],
          },
        ];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLog((l) => {
        const filtered = l.filter((msg) => !msg.loading);
        return [
          ...filtered,
          {
            from: "ai" as MessageRole,
            text: `⚠ ${message}`,
          },
        ];
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className={`${styles.card} ${styles.aiCard}`}>
      <div className={styles.aiHeader}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <span className={styles.aiTitle}>AI Dictionary</span>
        <span className={styles.aiBadge}>AI</span>
      </div>

      <div className={styles.chatLog}>
        {log.map((m, i) => (
          <div key={i}>
            {m.loading ? (
              <div className={`${styles.chatBubble} ${styles.chatAi}`}>
                <TypingDots />
              </div>
            ) : (
              <div className={`${styles.chatBubble} ${m.from === "ai" ? styles.chatAi : styles.chatUser}`}>
                {m.text}
              </div>
            )}

            {m.medicines && m.medicines.length > 0 && (
              <div className={styles.medicineSection}>
                <p className={styles.medicineSectionLabel}>
                  {m.medicines.length} medicine{m.medicines.length > 1 ? "s" : ""} found in inventory
                </p>
                <div className={styles.medicineGrid}>
                  {m.medicines.map((med) => (
                    <MedicineCard key={med.id} med={med} />
                  ))}
                </div>
              </div>
            )}

            {m.medicines && m.medicines.length === 0 && m.from === "ai" && !m.loading && (
              <div className={styles.noMeds}>
                No matching medicines in current inventory. Consider checking with PhilHealth formulary.
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>


      <div className={styles.chatInputRow}>
        <input
          ref={inputRef}
          className={styles.chatInput}
          placeholder="e.g. 2-year-old with high fever and asthma…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button
          className={styles.chatSend}
          onClick={() => send()}
          disabled={loading || !msg.trim()}
          aria-label="Send"
        >
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}