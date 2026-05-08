// lib/usePredictions.ts
import { useEffect, useState, useCallback } from "react";

export type Prediction = {
  med_name:             string;
  med_dosage:           string;
  current_stock:        number;
  exp_date:             string;
  days_until_expiry:    number;
  daily_rate:           number;
  projected_remaining:  number;
  risk_label:           string;
  urgency:              "critical" | "warning" | "ok";
  model_used:           string;
  rf_mae:               number | null;
  xgb_mae:              number | null;
};

type PredictionResult = {
  predictions: Prediction[];
  model_used:  string | null;
  rf_mae:      number | null;
  xgb_mae:     number | null;
  trained_on:  number;
  error:       string | null;
  message?:    string;
};

const ML_URL       = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000";
const REFRESH_MS   = 30_000; // re-fetch every 30 seconds

export function usePredictions() {
  const [data, setData]       = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ML_URL}/predict`, { cache: "no-store" });
      if (!res.ok) throw new Error(`ML service error: ${res.status}`);
      const json: PredictionResult = await res.json();
      setData(json);
      if (json.error) setError(json.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(); // fetch immediately on mount

    const interval = setInterval(load, REFRESH_MS); // re-fetch every 30s
    return () => clearInterval(interval);            // cleanup on unmount
  }, [load]);

  return {
    predictions: data?.predictions ?? [],
    model_used:  data?.model_used  ?? null,
    rf_mae:      data?.rf_mae      ?? null,
    xgb_mae:     data?.xgb_mae     ?? null,
    trained_on:  data?.trained_on  ?? 0,
    message:     data?.message     ?? null,
    loading,
    error,
    refetch: load, // expose manual refetch if needed
  };
}
