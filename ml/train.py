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
# STEP 1: FETCH DATA FROM SUPABASE
# ============================================================
def fetch_diagnoses():
    print("\n📦 Fetching diagnoses from Supabase...")
    response = supabase.table("diagnoses").select("*").execute()
    df = pd.DataFrame(response.data)
    print(f"✅ Fetched {len(df)} records")
    return df


# ============================================================
# STEP 2: PREPARE / CLEAN DATA
# ============================================================
def prepare_data(df):
    print("\n🔧 Preparing data...")

    df['date_diagnosed'] = pd.to_datetime(df['date_diagnosed'])
    df['month'] = df['date_diagnosed'].dt.month
    df['year'] = df['date_diagnosed'].dt.year
    df['quarter'] = df['date_diagnosed'].dt.quarter

    df['age_at_diagnosis'] = df['age_at_diagnosis'].fillna(0).astype(int)
    df['sex'] = df['sex'].fillna('M').astype(str).str.strip()
    df['barangay'] = df['barangay'].fillna('Unknown')
    df['category'] = df['category'].fillna('Non-Communicable')

    def get_age_group(age):
        if age <= 12:
            return 'Child'
        elif age <= 17:
            return 'Adolescent'
        elif age <= 35:
            return 'Adult'
        elif age <= 60:
            return 'Middle-Aged'
        else:
            return 'Senior'

    df['age_group'] = df['age_at_diagnosis'].apply(get_age_group)

    le_sex = LabelEncoder()
    le_barangay = LabelEncoder()
    le_disease = LabelEncoder()
    le_age_group = LabelEncoder()

    df['sex_encoded'] = le_sex.fit_transform(df['sex'])
    df['barangay_encoded'] = le_barangay.fit_transform(df['barangay'])
    df['disease_encoded'] = le_disease.fit_transform(df['disease_name'])
    df['age_group_encoded'] = le_age_group.fit_transform(df['age_group'])

    os.makedirs('models', exist_ok=True)
    with open('models/encoders.pkl', 'wb') as f:
        pickle.dump({
            'sex': le_sex,
            'barangay': le_barangay,
            'disease': le_disease,
            'age_group': le_age_group
        }, f)

    print(f"✅ Diseases found: {list(df['disease_name'].unique())}")
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
        'barangay_encoded', 'age_group_encoded'
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

    y_pred = rf_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
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
        'barangay_encoded', 'age_group_encoded'
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

    y_pred = xgb_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"✅ XGBoost Accuracy: {accuracy * 100:.2f}%")

    with open('models/xgb_model.pkl', 'wb') as f:
        pickle.dump(xgb_model, f)

    print("✅ XGBoost model saved → models/xgb_model.pkl")
    return xgb_model, accuracy


# ============================================================
# STEP 5: GENERATE PREDICTIONS PER MONTH
# ============================================================
def generate_predictions(df, rf_model, rf_accuracy):
    print("\n📊 Generating predictions per month...")

    diseases = df['disease_name'].unique()
    current_year = datetime.now().year
    predictions_to_insert = []

    for month in range(1, 13):
        month_data = df[(df['month'] == month) & (df['year'] == current_year)]
        if len(month_data) == 0:
            month_data = df[df['month'] == month]

        total_cases = len(month_data)

        for disease in diseases:
            disease_data = month_data[month_data['disease_name'] == disease]
            disease_cases = len(disease_data)

            actual_percentage = round(
                (disease_cases / total_cases * 100) if total_cases > 0 else 0, 2
            )

            disease_info = df[df['disease_name'] == disease].iloc[0]
            icd_code = disease_info.get('icd_code', None)
            category = disease_info.get('category', 'Non-Communicable')

            if len(disease_data) > 0:
                age_group = disease_data['age_group'].mode()[0]
                sex = str(disease_data['sex'].mode()[0]).strip()[0]
            else:
                age_group = 'Adult'
                sex = 'M'

            predictions_to_insert.append({
                "disease_name": str(disease),
                "icd_code": str(icd_code) if icd_code else None,
                "category": str(category),
                "prediction_month": int(month),
                "prediction_year": int(current_year),
                "prediction_quarter": int((month - 1) // 3 + 1),
                "predicted_cases": int(disease_cases),
                "predicted_percentage": float(actual_percentage),
                "actual_cases": int(disease_cases),
                "actual_percentage": float(actual_percentage),
                "confidence_score": float(round(rf_accuracy * 100, 2)),
                "model_version": "RandomForest-v1.0",
                "trained_on_records": int(len(df)),
                "training_date_from": df['date_diagnosed'].min().strftime('%Y-%m-%d'),
                "training_date_to": df['date_diagnosed'].max().strftime('%Y-%m-%d'),
                "age_group": str(age_group),
                "sex": sex,
            })

    print(f"✅ Generated {len(predictions_to_insert)} prediction records")
    return predictions_to_insert


# ============================================================
# STEP 6: SAVE PREDICTIONS TO SUPABASE
# ============================================================
def save_predictions(predictions):
    print("\n💾 Saving predictions to Supabase...")

    supabase.table("disease_predictions") \
        .delete() \
        .neq("id", "00000000-0000-0000-0000-000000000000") \
        .execute()
    print("   🗑️  Cleared old predictions")

    batch_size = 50
    total_batches = (len(predictions) + batch_size - 1) // batch_size

    for i in range(0, len(predictions), batch_size):
        batch = predictions[i:i + batch_size]
        supabase.table("disease_predictions").insert(batch).execute()
        print(f"   ✅ Inserted batch {i // batch_size + 1} of {total_batches}")

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
    xgb_model, xgb_accuracy = train_xgboost(df)

    print(f"\n📈 Model Comparison:")
    print(f"   Random Forest : {rf_accuracy * 100:.2f}%")
    print(f"   XGBoost       : {xgb_accuracy * 100:.2f}%")
    best = "Random Forest" if rf_accuracy >= xgb_accuracy else "XGBoost"
    print(f"   🏆 Best Model  : {best}")

    predictions = generate_predictions(df, rf_model, rf_accuracy)
    save_predictions(predictions)

    print("\n" + "=" * 60)
    print("🎉 Training complete!")
    print("   ✅ Models saved in ml/models/")
    print("   ✅ Predictions saved in Supabase")
    print("   ✅ Run predict.py to test predictions")
    print("=" * 60)


if __name__ == "__main__":
    main()