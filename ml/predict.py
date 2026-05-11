import os
import pickle
import pandas as pd
import numpy as np
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================
load_dotenv('../.env.local')

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ============================================================
# LOAD MODEL AND ENCODERS
# ============================================================
def load_model():
    print("📦 Loading trained model...")

    if not os.path.exists('models/rf_model.pkl'):
        raise FileNotFoundError(
            "❌ Model not found! Run train.py first.\n"
            "   py train.py"
        )

    with open('models/rf_model.pkl', 'rb') as f:
        model = pickle.load(f)

    with open('models/encoders.pkl', 'rb') as f:
        encoders = pickle.load(f)

    print("✅ Model loaded!")
    return model, encoders


# ============================================================
# PREDICT TOP DISEASES FOR A GIVEN MONTH
# ============================================================
def predict_top_diseases(month=None, year=None, top_n=5):
    """
    Predict top diseases for a given month and year.
    
    Args:
        month (int): Month number (1-12). Defaults to current month.
        year (int): Year. Defaults to current year.
        top_n (int): Number of top diseases to return.
    
    Returns:
        list: Top N diseases with predicted percentages.
    """
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year

    print(f"\n🔮 Predicting top {top_n} diseases for {month}/{year}...")

    # Fetch predictions from Supabase
    response = supabase.table("disease_predictions") \
        .select("*") \
        .eq("prediction_month", month) \
        .eq("prediction_year", year) \
        .order("predicted_percentage", desc=True) \
        .limit(top_n) \
        .execute()

    if not response.data:
        print("⚠️  No predictions found. Run train.py first.")
        return []

    results = []
    for row in response.data:
        results.append({
            "disease_name": row["disease_name"],
            "icd_code": row["icd_code"],
            "category": row["category"],
            "predicted_cases": row["predicted_cases"],
            "predicted_percentage": row["predicted_percentage"],
            "confidence_score": row["confidence_score"],
            "age_group": row["age_group"],
            "sex": row["sex"],
        })

    return results


# ============================================================
# PREDICT USING ML MODEL DIRECTLY (without Supabase lookup)
# ============================================================
def predict_with_model(month, year, age, sex, barangay):
    """
    Predict disease using the trained ML model directly.
    
    Args:
        month (int): Month (1-12)
        year (int): Year
        age (int): Patient age
        sex (str): 'M' or 'F'
        barangay (str): Barangay name
    
    Returns:
        str: Predicted disease name
    """
    model, encoders = load_model()

    # Encode inputs
    try:
        sex_encoded = encoders['sex'].transform([sex])[0]
    except ValueError:
        sex_encoded = 0

    try:
        barangay_encoded = encoders['barangay'].transform([barangay])[0]
    except ValueError:
        barangay_encoded = 0

    # Age group
    if age <= 12:
        age_group = 'Child'
    elif age <= 17:
        age_group = 'Adolescent'
    elif age <= 35:
        age_group = 'Adult'
    elif age <= 60:
        age_group = 'Middle-Aged'
    else:
        age_group = 'Senior'

    try:
        age_group_encoded = encoders['age_group'].transform([age_group])[0]
    except ValueError:
        age_group_encoded = 0

    quarter = (month - 1) // 3 + 1

    # Build feature array
    features = pd.DataFrame([[
        month, year, quarter, age, sex_encoded,
        barangay_encoded, age_group_encoded
    ]], columns=[
        'month', 'year', 'quarter', 'age_at_diagnosis',
        'sex_encoded', 'barangay_encoded', 'age_group_encoded'
    ])

    # Predict
    prediction_encoded = model.predict(features)[0]
    disease_name = encoders['disease'].inverse_transform([prediction_encoded])[0]

    # Get probabilities
    probabilities = model.predict_proba(features)[0]
    confidence = round(max(probabilities) * 100, 2)

    return {
        "predicted_disease": disease_name,
        "confidence": confidence,
        "month": month,
        "year": year,
        "age_group": age_group,
        "sex": sex,
        "barangay": barangay
    }


# ============================================================
# GET MONTHLY SUMMARY (for chart display)
# ============================================================
def get_monthly_summary(month=None, year=None):
    """
    Get disease summary for the chart in the frontend.
    Returns diseases sorted by percentage (highest first).
    """
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year

    month_names = [
        '', 'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December'
    ]

    print(f"\n📊 Monthly Disease Summary — {month_names[month]} {year}")
    print("-" * 50)

    results = predict_top_diseases(month, year, top_n=10)

    if not results:
        print("No data available.")
        return []

    total = sum(r['predicted_cases'] for r in results)

    for i, r in enumerate(results, 1):
        print(
            f"  {i}. {r['disease_name']:<20} "
            f"{r['predicted_percentage']:>6.2f}%  "
            f"({r['predicted_cases']} cases)"
        )

    print("-" * 50)
    print(f"  Total cases: {total}")

    return results


# ============================================================
# MAIN — Test the prediction
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("🔮 SMARTRHU — Disease Prediction")
    print("=" * 60)

    # Test 1: Get monthly summary (for chart)
    current_month = datetime.now().month
    current_year = datetime.now().year
    summary = get_monthly_summary(current_month, current_year)

    print("\n" + "=" * 60)

    # Test 2: Predict for a specific patient
    print("\n🧑‍⚕️  Patient-specific prediction:")
    result = predict_with_model(
        month=current_month,
        year=current_year,
        age=45,
        sex='M',
        barangay='Poblacion'
    )
    print(f"  Patient: Age {result['age_group']}, {result['sex']}, {result['barangay']}")
    print(f"  Predicted Disease: {result['predicted_disease']}")
    print(f"  Confidence: {result['confidence']}%")

    print("\n" + "=" * 60)
    print("✅ Prediction complete!")