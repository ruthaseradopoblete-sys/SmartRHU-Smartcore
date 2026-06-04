import os
import pickle
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from supabase import create_client
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier
from dotenv import load_dotenv

# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("=" * 60)
print("🔍 Checking environment variables...")
print(f"   URL: {SUPABASE_URL}")
print(f"   KEY: {SUPABASE_KEY[:20] + '...' if SUPABASE_KEY else 'None ❌'}")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "❌ Missing Supabase credentials!\n"
        f"   Looking for .env.local at: {env_path}\n"
        "   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
print("✅ Supabase connected!")


# ============================================================
# CATEGORY CODE → FULL NAME MAPPING
# ============================================================
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


# ============================================================
# STEP 1: FETCH DATA FROM SUPABASE
# Joins diagnosesml + patients to get all ML features
# ============================================================
def fetch_diagnoses():
    print("\n📦 Fetching diagnoses from Supabase...")

    # Fetch diagnosesml
    diag_resp = supabase.table("diagnosesml").select(
        "id, consultation_id, patient_id, diagnosis_name, "
        "disease_category, icd10_code, category_code, created_at"
    ).execute()
    df_diag = pd.DataFrame(diag_resp.data)
    print(f"   diagnosesml: {len(df_diag)} records")

    if df_diag.empty:
        raise ValueError("❌ No records in diagnosesml. Add diagnoses first.")

    # Fetch patients (only needed columns)
    pat_resp = supabase.table("patients").select(
        "id, birthdate, barangay, sex"
    ).execute()
    df_pat = pd.DataFrame(pat_resp.data)
    print(f"   patients: {len(df_pat)} records")

    # Join diagnosesml → patients
    df = df_diag.merge(
        df_pat.rename(columns={'id': 'patient_id'}),
        on='patient_id',
        how='left'
    )

    print(f"✅ Total joined records: {len(df)}")
    return df


# ============================================================
# STEP 2: PREPARE / CLEAN DATA
# ============================================================
def prepare_data(df):
    print("\n🔧 Preparing data...")

    # Parse dates
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['month']      = df['created_at'].dt.month
    df['year']       = df['created_at'].dt.year
    df['quarter']    = df['created_at'].dt.quarter

    # Season from month
    df['season'] = df['month'].apply(
        lambda m: 'Rainy' if 6 <= m <= 11 else 'Dry'
    )

    # Age from birthdate
    df['birthdate'] = pd.to_datetime(df['birthdate'], errors='coerce')
    today = datetime.today()
    df['age_at_diagnosis'] = df['birthdate'].apply(
        lambda b: (today - b).days // 365 if pd.notnull(b) else 0
    )

    # Age group — matches disease_predictions constraint
    def get_age_group(age):
        if age <= 5:   return '0-5'
        elif age <= 17: return '6-17'
        elif age <= 59: return '18-59'
        else:           return '60+'

    df['age_group'] = df['age_at_diagnosis'].apply(get_age_group)

    # Fill nulls
    df['sex']           = df['sex'].fillna('M').astype(str).str.strip().str[0]
    df['barangay']      = df['barangay'].fillna('Unknown')
    df['category_code'] = df['category_code'].fillna('OTHERS')
    df['disease_category'] = df['disease_category'].fillna('Others')
    df['diagnosis_name']   = df['diagnosis_name'].fillna('Unknown')

    # Encode categorical features
    le_sex        = LabelEncoder()
    le_barangay   = LabelEncoder()
    le_disease    = LabelEncoder()
    le_age_group  = LabelEncoder()
    le_category   = LabelEncoder()

    df['sex_encoded']       = le_sex.fit_transform(df['sex'])
    df['barangay_encoded']  = le_barangay.fit_transform(df['barangay'])
    df['disease_encoded']   = le_disease.fit_transform(df['diagnosis_name'])
    df['age_group_encoded'] = le_age_group.fit_transform(df['age_group'])
    df['category_encoded']  = le_category.fit_transform(df['category_code'])

    # Save encoders
    os.makedirs('models', exist_ok=True)
    with open('models/encoders.pkl', 'wb') as f:
        pickle.dump({
            'sex':        le_sex,
            'barangay':   le_barangay,
            'disease':    le_disease,
            'age_group':  le_age_group,
            'category':   le_category,
        }, f)

    print(f"   Age groups   : {sorted(df['age_group'].unique())}")
    print(f"   Seasons      : {sorted(df['season'].unique())}")
    print(f"   Barangays    : {df['barangay'].nunique()} unique")
    print(f"   Categories   : {sorted(df['category_code'].unique())}")
    print(f"   Diseases     : {sorted(df['diagnosis_name'].unique())}")
    print(f"✅ Total records prepared: {len(df)}")
    return df


# ============================================================
# STEP 3: TRAIN RANDOM FOREST MODEL
# ============================================================
def train_random_forest(df):
    print("\n🤖 Training Random Forest model...")

    features = [
        'month', 'year', 'quarter',
        'age_at_diagnosis', 'sex_encoded',
        'barangay_encoded', 'age_group_encoded',
        'category_encoded',
    ]

    X = df[features]
    y = df['disease_encoded']

    if len(df) >= 10:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    else:
        X_train, X_test, y_train, y_test = X, X, y, y

    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced'
    )
    rf_model.fit(X_train, y_train)

    accuracy = accuracy_score(y_test, rf_model.predict(X_test))
    print(f"✅ Random Forest Accuracy: {accuracy * 100:.2f}%")

    with open('models/rf_model.pkl', 'wb') as f:
        pickle.dump(rf_model, f)
    with open('models/features.pkl', 'wb') as f:
        pickle.dump(features, f)

    print("✅ Random Forest model saved → models/rf_model.pkl")
    return rf_model, accuracy, features


# ============================================================
# STEP 4: TRAIN XGBOOST MODEL
# ============================================================
def train_xgboost(df):
    print("\n🤖 Training XGBoost model...")

    features = [
        'month', 'year', 'quarter',
        'age_at_diagnosis', 'sex_encoded',
        'barangay_encoded', 'age_group_encoded',
        'category_encoded',
    ]

    X = df[features]
    y = df['disease_encoded']

    if len(df) >= 10:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    else:
        X_train, X_test, y_train, y_test = X, X, y, y

    xgb_model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric='mlogloss',
        verbosity=0
    )
    xgb_model.fit(X_train, y_train)

    accuracy = accuracy_score(y_test, xgb_model.predict(X_test))
    print(f"✅ XGBoost Accuracy: {accuracy * 100:.2f}%")

    with open('models/xgb_model.pkl', 'wb') as f:
        pickle.dump(xgb_model, f)

    print("✅ XGBoost model saved → models/xgb_model.pkl")
    return xgb_model, accuracy


# ============================================================
# STEP 5: GENERATE PREDICTIONS PER MONTH + QUARTERLY
# Matches disease_predictions table columns exactly
# ============================================================
def generate_predictions(df, rf_model, rf_accuracy):
    print("\n📊 Generating predictions...")

    current_year = datetime.now().year
    predictions  = []

    # ── Monthly predictions ──────────────────────────────────
    for month in range(1, 13):
        season     = 'Rainy' if 6 <= month <= 11 else 'Dry'
        month_data = df[df['month'] == month]
        total      = len(month_data)

        for cat_code, disease_name in CATEGORY_CODE_MAP.items():
            cat_data      = month_data[month_data['category_code'] == cat_code]
            disease_cases = len(cat_data)
            pct           = round((disease_cases / total * 100) if total > 0 else 0, 2)

            # Most common age_group and sex for this category+month
            age_group = cat_data['age_group'].mode()[0] if len(cat_data) > 0 else None
            sex_val   = cat_data['sex'].mode()[0].strip()[0] if len(cat_data) > 0 else 'A'
            # Normalize sex to M/F/A
            if sex_val not in ('M', 'F'):
                sex_val = 'A'

            # Trend vs same month last year
            last_year_data  = df[(df['month'] == month) & (df['year'] == current_year - 1)]
            last_year_cases = len(last_year_data[last_year_data['category_code'] == cat_code])
            if last_year_cases == 0:
                trend     = 'stable'
                trend_pct = 0.0
            else:
                change    = disease_cases - last_year_cases
                trend_pct = round(abs(change) / last_year_cases * 100, 2)
                trend     = 'increasing' if change > 0 else ('decreasing' if change < 0 else 'stable')

            predictions.append({
                "icd_code":             cat_code,
                "disease_name":         disease_name,
                "category":             cat_code,
                "prediction_year":      current_year,
                "prediction_month":     month,
                "prediction_quarter":   None,           # NULL for monthly
                "granularity":          "monthly",
                # season is auto-set by DB trigger — but we pass it anyway
                "barangay":             None,           # NULL = all barangays
                "age_group":            age_group,
                "sex":                  sex_val,
                "predicted_cases":      disease_cases,
                "predicted_percentage": pct,
                "trend":                trend,
                "trend_percentage":     trend_pct,
                "actual_cases":         disease_cases,
                "actual_percentage":    pct,
                "confidence_score":     round(rf_accuracy, 3),
                "model_version":        "RandomForest-v1.0",
                "trained_on_records":   len(df),
                "training_date_from":   df['created_at'].min().strftime('%Y-%m-%d'),
                "training_date_to":     df['created_at'].max().strftime('%Y-%m-%d'),
            })

    # ── Quarterly predictions ────────────────────────────────
    for quarter in range(1, 5):
        season      = 'Rainy' if quarter in (2, 3) else 'Dry'
        qtr_data    = df[df['quarter'] == quarter]
        total       = len(qtr_data)

        for cat_code, disease_name in CATEGORY_CODE_MAP.items():
            cat_data      = qtr_data[qtr_data['category_code'] == cat_code]
            disease_cases = len(cat_data)
            pct           = round((disease_cases / total * 100) if total > 0 else 0, 2)

            age_group = cat_data['age_group'].mode()[0] if len(cat_data) > 0 else None
            sex_val   = cat_data['sex'].mode()[0].strip()[0] if len(cat_data) > 0 else 'A'
            if sex_val not in ('M', 'F'):
                sex_val = 'A'

            last_year_qtr   = df[(df['quarter'] == quarter) & (df['year'] == current_year - 1)]
            last_year_cases = len(last_year_qtr[last_year_qtr['category_code'] == cat_code])
            if last_year_cases == 0:
                trend     = 'stable'
                trend_pct = 0.0
            else:
                change    = disease_cases - last_year_cases
                trend_pct = round(abs(change) / last_year_cases * 100, 2)
                trend     = 'increasing' if change > 0 else ('decreasing' if change < 0 else 'stable')

            predictions.append({
                "icd_code":             cat_code,
                "disease_name":         disease_name,
                "category":             cat_code,
                "prediction_year":      current_year,
                "prediction_month":     None,           # NULL for quarterly
                "prediction_quarter":   quarter,
                "granularity":          "quarterly",
                "barangay":             None,
                "age_group":            age_group,
                "sex":                  sex_val,
                "predicted_cases":      disease_cases,
                "predicted_percentage": pct,
                "trend":                trend,
                "trend_percentage":     trend_pct,
                "actual_cases":         disease_cases,
                "actual_percentage":    pct,
                "confidence_score":     round(rf_accuracy, 3),
                "model_version":        "RandomForest-v1.0",
                "trained_on_records":   len(df),
                "training_date_from":   df['created_at'].min().strftime('%Y-%m-%d'),
                "training_date_to":     df['created_at'].max().strftime('%Y-%m-%d'),
            })

    print(f"✅ Generated {len(predictions)} prediction records "
          f"({12 * len(CATEGORY_CODE_MAP)} monthly + "
          f"{4 * len(CATEGORY_CODE_MAP)} quarterly)")
    return predictions


# ============================================================
# STEP 6: SAVE PREDICTIONS TO SUPABASE
# Uses UPSERT to match the unique index on disease_predictions
# ============================================================
def save_predictions(predictions):
    print("\n💾 Saving predictions to Supabase...")

    # Upsert — unique index handles duplicates automatically
    batch_size    = 50
    total_batches = (len(predictions) + batch_size - 1) // batch_size

    for i in range(0, len(predictions), batch_size):
        batch = predictions[i:i + batch_size]
        supabase.table("disease_predictions").upsert(
            batch,
            on_conflict="icd_code,granularity,prediction_year,"
                        "prediction_month,prediction_quarter,"
                        "barangay,age_group,sex"
        ).execute()
        print(f"   ✅ Upserted batch {i // batch_size + 1} of {total_batches}")

    print(f"✅ Total predictions saved: {len(predictions)}")


# ============================================================
# MAIN
# ============================================================
def main():
    print("\n" + "=" * 60)
    print("🚀 SMARTRHU — Disease Prediction Training")
    print("=" * 60)

    df = fetch_diagnoses()

    if len(df) < 5:
        print("❌ Not enough data. Need at least 5 diagnosis records.")
        return

    df = prepare_data(df)
    rf_model, rf_accuracy, features = train_random_forest(df)
    xgb_model, xgb_accuracy         = train_xgboost(df)

    print(f"\n📈 Model Comparison:")
    print(f"   Random Forest : {rf_accuracy * 100:.2f}%")
    print(f"   XGBoost       : {xgb_accuracy * 100:.2f}%")
    best = "Random Forest" if rf_accuracy >= xgb_accuracy else "XGBoost"
    print(f"   🏆 Best Model  : {best}")

    predictions = generate_predictions(df, rf_model, rf_accuracy)
    save_predictions(predictions)

    print("\n" + "=" * 60)
    print("🎉 Training complete!")
    print("   ✅ Models saved  → ml/models/")
    print("   ✅ Predictions   → Supabase disease_predictions")
    print("   ✅ Run predict.py to test")
    print("=" * 60)


if __name__ == "__main__":
    main()