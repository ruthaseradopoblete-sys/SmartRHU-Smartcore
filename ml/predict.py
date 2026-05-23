import os
import pickle
import pandas as pd
from datetime import datetime
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Missing Supabase credentials in .env.local")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CATEGORY_CODE_MAP = {
    'RESP':    'Respiratory & Influenza-Like Illness',
    'CARDIO':  'Cardiovascular Diseases',
    'GI':      'Gastrointestinal & Water-borne',
    'DENTAL':  'Dental & Oral Health',
    'DERM':    'Dermatological & Skin',
    'INFECT':  'Infectious & Vector-borne',
    'MUSCULO': 'Musculoskeletal & Pain',
    'OTHERS':  'Others',
}

MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
]


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
# GET MONTHLY SUMMARY FROM disease_predictions TABLE
# ============================================================
def get_monthly_summary(month=None, year=None, top_n=10):
    if month is None: month = datetime.now().month
    if year  is None: year  = datetime.now().year

    print(f"\n📊 Monthly Disease Summary — {MONTH_NAMES[month]} {year}")
    print("-" * 55)

    response = supabase.table("disease_predictions") \
        .select("icd_code, disease_name, category, predicted_cases, "
                "predicted_percentage, confidence_score, age_group, sex, season, trend") \
        .eq("granularity", "monthly") \
        .eq("prediction_month", month) \
        .eq("prediction_year", year) \
        .order("predicted_percentage", desc=True) \
        .limit(top_n) \
        .execute()

    if not response.data:
        print("⚠️  No predictions found for this month. Run train.py first.")
        return []

    results = response.data
    total   = sum(r['predicted_cases'] or 0 for r in results)

    for i, r in enumerate(results, 1):
        trend_icon = "↑" if r['trend'] == 'increasing' else ("↓" if r['trend'] == 'decreasing' else "→")
        print(
            f"  {i:>2}. {r['disease_name']:<38} "
            f"{r['predicted_percentage']:>6.2f}%  "
            f"({r['predicted_cases']} cases)  "
            f"{trend_icon}  Season: {r['season']}"
        )

    print("-" * 55)
    print(f"  Total cases : {total}")
    print(f"  Season      : {'Rainy' if 6 <= month <= 11 else 'Dry'}")
    return results


# ============================================================
# GET QUARTERLY SUMMARY FROM disease_predictions TABLE
# ============================================================
def get_quarterly_summary(quarter=None, year=None):
    if quarter is None: quarter = (datetime.now().month - 1) // 3 + 1
    if year    is None: year    = datetime.now().year

    quarter_labels = {1: 'Q1 (Jan–Mar)', 2: 'Q2 (Apr–Jun)',
                      3: 'Q3 (Jul–Sep)', 4: 'Q4 (Oct–Dec)'}
    season = 'Rainy' if quarter in (2, 3) else 'Dry'

    print(f"\n📊 Quarterly Disease Summary — {quarter_labels[quarter]} {year} ({season} Season)")
    print("-" * 55)

    response = supabase.table("disease_predictions") \
        .select("icd_code, disease_name, predicted_cases, "
                "predicted_percentage, confidence_score, trend, season") \
        .eq("granularity", "quarterly") \
        .eq("prediction_quarter", quarter) \
        .eq("prediction_year", year) \
        .order("predicted_percentage", desc=True) \
        .execute()

    if not response.data:
        print("⚠️  No quarterly predictions found. Run train.py first.")
        return []

    results = response.data
    total   = sum(r['predicted_cases'] or 0 for r in results)

    for i, r in enumerate(results, 1):
        trend_icon = "↑" if r['trend'] == 'increasing' else ("↓" if r['trend'] == 'decreasing' else "→")
        print(
            f"  {i:>2}. {r['disease_name']:<38} "
            f"{r['predicted_percentage']:>6.2f}%  "
            f"({r['predicted_cases']} cases)  {trend_icon}"
        )

    print("-" * 55)
    print(f"  Total cases : {total}")
    return results


# ============================================================
# PREDICT FOR A SPECIFIC PATIENT using ML model directly
# ============================================================
def predict_for_patient(month, year, birthdate_str, sex, barangay):
    """
    Args:
        month         : int  1–12
        year          : int
        birthdate_str : str  'YYYY-MM-DD'
        sex           : str  'M' or 'F'
        barangay      : str  barangay name
    """
    model, encoders = load_model()

    # Compute age
    birthdate = datetime.strptime(birthdate_str, '%Y-%m-%d')
    age       = (datetime.today() - birthdate).days // 365

    # Age group — matches DB constraint
    if age <= 5:    age_group = '0-5'
    elif age <= 17: age_group = '6-17'
    elif age <= 59: age_group = '18-59'
    else:           age_group = '60+'

    quarter = (month - 1) // 3 + 1
    season  = 'Rainy' if 6 <= month <= 11 else 'Dry'

    # Encode
    def safe_encode(encoder, value, fallback=0):
        try:
            return encoder.transform([value])[0]
        except ValueError:
            return fallback

    sex_encoded       = safe_encode(encoders['sex'],       sex)
    barangay_encoded  = safe_encode(encoders['barangay'],  barangay)
    age_group_encoded = safe_encode(encoders['age_group'], age_group)
    category_encoded  = 0  # unknown for patient prediction

    features = pd.DataFrame([[
        month, year, quarter, age,
        sex_encoded, barangay_encoded,
        age_group_encoded, category_encoded
    ]], columns=[
        'month', 'year', 'quarter', 'age_at_diagnosis',
        'sex_encoded', 'barangay_encoded',
        'age_group_encoded', 'category_encoded'
    ])

    pred_encoded  = model.predict(features)[0]
    disease_name  = encoders['disease'].inverse_transform([pred_encoded])[0]
    probabilities = model.predict_proba(features)[0]
    confidence    = round(max(probabilities) * 100, 2)

    return {
        "predicted_disease": disease_name,
        "confidence":        confidence,
        "month":             month,
        "year":              year,
        "season":            season,
        "age":               age,
        "age_group":         age_group,
        "sex":               sex,
        "barangay":          barangay,
    }


# ============================================================
# SEASONAL SUMMARY — compare Rainy vs Dry
# ============================================================
def get_seasonal_summary(year=None):
    if year is None: year = datetime.now().year

    print(f"\n🌦️  Seasonal Disease Summary — {year}")
    print("-" * 55)

    for season in ('Rainy', 'Dry'):
        response = supabase.table("disease_predictions") \
            .select("disease_name, predicted_cases, predicted_percentage, trend") \
            .eq("granularity", "monthly") \
            .eq("prediction_year", year) \
            .eq("season", season) \
            .order("predicted_percentage", desc=True) \
            .limit(5) \
            .execute()

        print(f"\n  {'🌧️ ' if season == 'Rainy' else '☀️ '} {season} Season — Top 5:")
        if not response.data:
            print("    No data.")
            continue
        for i, r in enumerate(response.data, 1):
            print(f"    {i}. {r['disease_name']:<38} {r['predicted_percentage']:>6.2f}%")


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("🔮 SMARTRHU — Disease Prediction")
    print("=" * 60)

    now = datetime.now()

    # 1. Monthly summary
    get_monthly_summary(now.month, now.year)

    # 2. Quarterly summary
    get_quarterly_summary()

    # 3. Seasonal summary
    get_seasonal_summary(now.year)

    # 4. Patient-specific prediction
    print("\n" + "=" * 60)
    print("🧑‍⚕️  Patient-specific prediction (example):")
    result = predict_for_patient(
        month         = now.month,
        year          = now.year,
        birthdate_str = '1980-03-15',   # example birthdate
        sex           = 'M',
        barangay      = 'Poblacion'
    )
    print(f"  Birthdate : 1980-03-15  →  Age {result['age']} ({result['age_group']})")
    print(f"  Sex       : {result['sex']}")
    print(f"  Barangay  : {result['barangay']}")
    print(f"  Season    : {result['season']}")
    print(f"  Predicted : {result['predicted_disease']}")
    print(f"  Confidence: {result['confidence']}%")

    print("\n" + "=" * 60)
    print("✅ Prediction complete!")