"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../styles/dashboard.module.css";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const COLORS = [
  "#e74c3c","#e67e22","#f1c40f","#2ecc71","#3498db",
  "#9b59b6","#1abc9c","#e91e63","#ff5722","#607d8b"
];

type DiseasePrediction = {
  disease_name: string;
  predicted_percentage: number;
  predicted_cases: number;
  category: string;
};

export default function DiseasePrediction() {
  const today = new Date();
  const [predictions, setPredictions] = useState<DiseasePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [year] = useState(today.getFullYear());

  useEffect(() => {
    fetchPredictions();
  }, [month]);

  async function fetchPredictions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("disease_predictions")
      .select("disease_name, predicted_percentage, predicted_cases, category")
      .eq("prediction_month", month)
      .eq("prediction_year", year)
      .order("predicted_percentage", { ascending: false })
      .limit(5);

    if (!error && data) setPredictions(data);
    setLoading(false);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>DISEASE PREDICTION</div>
      <div className={styles.cardBody}>

        {/* Month selector */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <p className={styles.cardSubTitle}>Month — {MONTHS[month - 1]} {year}</p>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setMonth(m => Math.max(1, m - 1))}
              style={{ background: "none", border: "1px solid #ddd", borderRadius: "6px", padding: "2px 8px", cursor: "pointer", fontSize: "12px" }}
            >‹</button>
            <button
              onClick={() => setMonth(m => Math.min(12, m + 1))}
              style={{ background: "none", border: "1px solid #ddd", borderRadius: "6px", padding: "2px 8px", cursor: "pointer", fontSize: "12px" }}
            >›</button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#aaa", fontSize: "13px" }}>
            Loading predictions…
          </div>
        ) : predictions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#aaa", fontSize: "13px" }}>
            No predictions for this month.<br/>
            <span style={{ fontSize: "11px" }}>Run <code>py train.py</code> to generate.</span>
          </div>
        ) : (
          <div className={styles.diseaseList}>
            {predictions.map((d, i) => (
              <div key={d.disease_name} className={styles.diseaseRow}>
                <span className={styles.diseaseDot} style={{ background: COLORS[i % COLORS.length] }} />
                <span className={styles.diseaseName}>{d.disease_name}</span>
                <div className={styles.diseaseBarWrap}>
                  <div
                    className={styles.diseaseBar}
                    style={{
                      width: `${d.predicted_percentage}%`,
                      background: COLORS[i % COLORS.length]
                    }}
                  />
                </div>
                <span className={styles.diseasePct}>{d.predicted_percentage}%</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}