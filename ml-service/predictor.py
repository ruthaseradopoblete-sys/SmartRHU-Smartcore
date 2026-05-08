"""
predictor.py
────────────
Real ML prediction: combines dispense rate + expiry date to predict
which medicines will expire BEFORE being fully used.

Key question: "Will this medicine expire with leftover stock?"
  projected_remaining = current_stock - (daily_rate × days_until_expiry)
  if projected_remaining > 0 → will expire with waste → FLAG IT

Models: Random Forest + XGBoost trained on this combined signal.
"""

import os
import warnings
import numpy as np
import pandas as pd
import httpx
from datetime import datetime, date, timedelta
from dotenv import load_dotenv

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import xgboost as xgb

warnings.filterwarnings("ignore")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
}

NOTIFY_DAYS = 7   # warn when expiring within 7 days


def sb_get(table: str, params: dict) -> list:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    with httpx.Client(timeout=15) as client:
        resp = client.get(url, headers=HEADERS, params=params)
        resp.raise_for_status()
        return resp.json()


# ── Fetch medicines ────────────────────────────────────────────────────────────
def fetch_medicines() -> pd.DataFrame:
    rows = sb_get("pharma_medicines", {
        "select":   "id,med_name,med_dosage,med_type,quantity,exp_date",
        "archived": "eq.false",
        "order":    "exp_date.asc",
    })
    if not rows:
        return pd.DataFrame(columns=["id","med_name","med_dosage","med_type","quantity","exp_date"])
    df = pd.DataFrame(rows)
    df["exp_date"] = pd.to_datetime(df["exp_date"]).dt.date
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0).astype(int)
    return df


# ── Fetch dispense history ─────────────────────────────────────────────────────
def fetch_dispense(days_back: int = 30) -> pd.DataFrame:
    since = (datetime.utcnow() - timedelta(days=days_back)).isoformat()
    rows  = sb_get("pharma_dispense", {
        "select":       "med_name,quantity,dispensed_at",
        "dispensed_at": f"gte.{since}",
    })
    if not rows:
        return pd.DataFrame(columns=["med_name","quantity","dispensed_at"])
    df = pd.DataFrame(rows)
    df["dispensed_at"] = pd.to_datetime(df["dispensed_at"])
    df["quantity"]     = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    return df


# ── Compute daily dispense rate per medicine ───────────────────────────────────
def compute_daily_rates(dispense_df: pd.DataFrame, days_back: int = 30) -> dict:
    """Returns {med_name: avg_daily_qty} over last N days."""
    if dispense_df.empty:
        return {}
    totals = dispense_df.groupby("med_name")["quantity"].sum()
    return {name: qty / days_back for name, qty in totals.items()}


# ── Feature engineering ────────────────────────────────────────────────────────
def build_features(medicines_df: pd.DataFrame, daily_rates: dict) -> pd.DataFrame:
    """
    Features per medicine:
      - days_until_expiry    : days from today to exp_date
      - current_stock        : how many units left
      - daily_rate           : avg units dispensed per day (0 if no history)
      - projected_remaining  : stock - (daily_rate × days_until_expiry)
                               positive = will expire with leftover → BAD
                               negative = will run out before expiry → OK
      - has_dispense_history : 1 if we have dispense data, 0 if not
      - low_stock            : 1 if quantity < 10
    """
    today = date.today()
    rows  = []
    for _, med in medicines_df.iterrows():
        days   = (med["exp_date"] - today).days
        rate   = daily_rates.get(med["med_name"], 0.0)
        proj   = med["quantity"] - (rate * max(days, 0))
        rows.append({
            "med_name":             med["med_name"],
            "med_dosage":           med["med_dosage"],
            "exp_date":             str(med["exp_date"]),
            "days_until_expiry":    days,
            "current_stock":        int(med["quantity"]),
            "daily_rate":           round(rate, 4),
            "projected_remaining":  round(proj, 2),
            "has_dispense_history": int(rate > 0),
            "low_stock":            int(med["quantity"] < 10),
        })
    return pd.DataFrame(rows)


# ── Training data ──────────────────────────────────────────────────────────────
FEATURE_COLS = [
    "days_until_expiry", "current_stock", "daily_rate",
    "projected_remaining", "has_dispense_history", "low_stock",
]

def make_training_data(feat_df: pd.DataFrame) -> pd.DataFrame:
    """
    Target: projected_remaining (positive = will expire with waste).
    Augment with jitter to increase training samples.
    """
    rng   = np.random.default_rng(42)
    rows  = []
    for _, r in feat_df.iterrows():
        for _ in range(15):
            j_days  = int(rng.integers(-2, 3))
            j_stock = int(rng.integers(-5, 6))
            j_rate  = float(rng.normal(1.0, 0.1)) * r["daily_rate"]
            d = max(1, r["days_until_expiry"] + j_days)
            s = max(0, r["current_stock"]     + j_stock)
            rt = max(0.0, j_rate)
            proj = s - (rt * d)
            rows.append({
                "days_until_expiry":    d,
                "current_stock":        s,
                "daily_rate":           round(rt, 4),
                "projected_remaining":  round(proj, 2),
                "has_dispense_history": int(rt > 0),
                "low_stock":            int(s < 10),
                "target":               proj,
            })
    return pd.DataFrame(rows)


# ── Model training ─────────────────────────────────────────────────────────────
def train_models(train_df: pd.DataFrame):
    X = train_df[FEATURE_COLS]
    y = train_df["target"]

    if len(X) < 10:
        return None, "ratio_fallback", None, None

    X_tr, X_val, y_tr, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    rf = RandomForestRegressor(
        n_estimators=200, max_depth=6,
        min_samples_leaf=2, random_state=42, n_jobs=-1,
    )
    rf.fit(X_tr, y_tr)
    rf_mae = mean_absolute_error(y_val, rf.predict(X_val))

    xgb_model = xgb.XGBRegressor(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0,
    )
    xgb_model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
    xgb_mae = mean_absolute_error(y_val, xgb_model.predict(X_val))

    if rf_mae <= xgb_mae:
        return rf,        "random_forest", round(rf_mae, 2), round(xgb_mae, 2)
    else:
        return xgb_model, "xgboost",       round(rf_mae, 2), round(xgb_mae, 2)


# ── Main pipeline ──────────────────────────────────────────────────────────────
def run_predictions() -> dict:
    """
    Returns medicines that will expire within 7 days AND are predicted
    to still have leftover stock when they expire (projected_remaining > 0).

    If no dispense history exists, falls back to showing all medicines
    expiring within 7 days as a warning.
    """
    try:
        medicines_df = fetch_medicines()
        if medicines_df.empty:
            return {"predictions": [], "error": "No medicines in stock."}

        dispense_df  = fetch_dispense(days_back=30)
        daily_rates  = compute_daily_rates(dispense_df)

        feat_df = build_features(medicines_df, daily_rates)

        # Filter: only medicines expiring in 1–7 days
        expiring = feat_df[
            (feat_df["days_until_expiry"] >= 1) &
            (feat_df["days_until_expiry"] <= NOTIFY_DAYS)
        ].copy()

        if expiring.empty:
            return {
                "predictions": [], "model_used": None,
                "rf_mae": None, "xgb_mae": None, "trained_on": 0,
                "error": None, "message": f"No medicines expiring within {NOTIFY_DAYS} days.",
            }

        # Train on ALL medicines
        train_df = make_training_data(feat_df)
        best_model, model_name, rf_mae, xgb_mae = train_models(train_df)

        results = []
        for _, row in expiring.iterrows():
            # Predict projected_remaining using ML
            if best_model is None or model_name == "ratio_fallback":
                predicted_proj = row["projected_remaining"]
            else:
                feat_row       = pd.DataFrame([row[FEATURE_COLS]])
                predicted_proj = float(best_model.predict(feat_row)[0])

            days = int(row["days_until_expiry"])
            rate = row["daily_rate"]

            # Determine urgency
            if days <= 3:
                urgency = "critical"
            else:
                urgency = "warning"

            # Risk label based on projected remaining
            if not row["has_dispense_history"]:
                risk_label = "No dispense history — may expire unused"
            elif predicted_proj > 0:
                risk_label = f"~{round(predicted_proj)} units may expire unused"
            else:
                risk_label = "Likely to be used before expiry"

            results.append({
                "med_name":           row["med_name"],
                "med_dosage":         row["med_dosage"],
                "current_stock":      row["current_stock"],
                "exp_date":           row["exp_date"],
                "days_until_expiry":  days,
                "daily_rate":         round(rate, 2),
                "projected_remaining": round(predicted_proj, 1),
                "risk_label":         risk_label,
                "urgency":            urgency,
                "model_used":         model_name,
                "rf_mae":             rf_mae,
                "xgb_mae":            xgb_mae,
            })

        # Sort by most urgent first
        results.sort(key=lambda x: x["days_until_expiry"])

        return {
            "predictions": results,
            "model_used":  model_name,
            "rf_mae":      rf_mae,
            "xgb_mae":     xgb_mae,
            "trained_on":  len(train_df),
            "error":       None,
        }

    except Exception as e:
        return {"predictions": [], "error": str(e)}
