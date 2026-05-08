"""
main.py
───────
FastAPI server that exposes the ML prediction endpoint.

Endpoints:
  GET  /predict          → run full prediction pipeline
  GET  /health           → health check
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from predictor import run_predictions, sb_get
import os

app = FastAPI(title="MHO Lopez — Medicine Stock Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-production-domain.com"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/debug")
def debug():
    """Test Supabase connection and show raw data."""
    try:
        rows = sb_get("pharma_medicines", {
            "select": "id,med_name,exp_date,archived",
            "limit":  "5",
        })
        return {
            "supabase_url": os.getenv("SUPABASE_URL", "NOT SET"),
            "key_set":      bool(os.getenv("SUPABASE_KEY", "")),
            "rows_returned": len(rows),
            "sample":        rows[:3],
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/predict")
def predict():
    return run_predictions()
