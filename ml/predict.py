"""
predict.py — SmartRHU Disease Prediction Query & Patient Prediction
====================================================================
Reads predictions from Supabase disease_predictions and runs
patient-specific forecasts using the trained RF model.

Usage:
    py predict.py                          # monthly + quarterly + seasonal summary
    py predict.py --month 5 --year 2026    # specific month
    py predict.py --quarter 2              # quarterly summary
    py predict.py --barangay "Burgos (Poblacion)"
    py predict.py --patient                # run interactive patient prediction
    py predict.py --summary all            # all summaries
"""

import os
import sys
import pickle
import argparse
import warnings
import pandas as pd
from datetime import datetime
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

warnings.filterwarnings('ignore')

# ============================================================
# ENVIRONMENT
# ============================================================
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Missing Supabase credentials in .env.local")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

MODELS_DIR = Path('models')

# ============================================================
# CONSTANTS
# ============================================================
MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December',
]

QUARTER_MONTHS = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12],
}

QUARTER_LABELS = {
    1: 'Q1 (Jan–Mar)',
    2: 'Q2 (Apr–Jun)',
    3: 'Q3 (Jul–Sep)',
    4: 'Q4 (Oct–Dec)',
}

FEATURES = [
    'month', 'year', 'quarter', 'age_at_diagnosis',
    'sex_encoded', 'barangay_encoded',
    'age_group_encoded', 'category_encoded',
]

AGE_REPRESENTATIVE = {'0-5': 3, '6-17': 12, '18-59': 35, '60+': 70}

TREND_ICON = {
    'increasing': '↑',
    'decreasing': '↓',
    'stable':     '→',
}


# ============================================================
# LOAD MODEL & ENCODERS
# ============================================================
def load_model():
    """Load the best available trained model and encoders."""
    rf_path   = MODELS_DIR / 'rf_model.pkl'
    enc_path  = MODELS_DIR / 'encoders.pkl'
    best_path = MODELS_DIR / 'best_model.pkl'

    if not enc_path.exists():
        raise FileNotFoundError(
            "❌ Encoders not found! Run train.py first.\n"
            "   py train.py"
        )

    # Prefer best_model if available, fall back to rf
    if best_path.exists():
        with open(best_path, 'rb') as f:
            best = pickle.load(f)
        model      = best['model']
        model_name = best['name']
        accuracy   = best.get('accuracy', 0.0)
    elif rf_path.exists():
        with open(rf_path, 'rb') as f:
            model = pickle.load(f)
        model_name = 'Random Forest'
        accuracy   = 0.0
    else:
        raise FileNotFoundError(
            "❌ No trained model found! Run train.py first.\n"
            "   py train.py"
        )

    with open(enc_path, 'rb') as f:
        encoders = pickle.load(f)

    print(f"✅ Loaded model: {model_name} (accuracy: {accuracy * 100:.1f}%)")
    return model, encoders, model_name, accuracy


def safe_encode(encoder, value: str, fallback: int = 0) -> int:
    try:
        return int(encoder.transform([value])[0])
    except (ValueError, KeyError):
        return fallback


def get_age_group(age: int) -> str:
    if age <= 5:    return '0-5'
    elif age <= 17: return '6-17'
    elif age <= 59: return '18-59'
    else:           return '60+'


def season_for_month(month: int) -> str:
    return 'Rainy' if 6 <= month <= 11 else 'Dry'


# ============================================================
# QUERY HELPERS
# ============================================================
def _fetch_predictions(
    *,
    year: int,
    months: list[int] | None = None,
    barangay: str | None = None,
    sex: str = 'A',
    top_n: int = 10,
    order_by: str = 'predicted_percentage',
) -> list[dict]:
    """
    Fetch prediction rows from Supabase with common filters.
    barangay=None  → all-barangay rows (barangay IS NULL)
    """
    q = (
        supabase.table("disease_predictions")
        .select(
            "icd_code, disease_name, season, barangay, age_group, sex, "
            "predicted_cases, predicted_percentage, "
            "trend, trend_percentage, "
            "actual_cases, actual_percentage, "
            "confidence_score, prediction_month, prediction_year"
        )
        .eq("prediction_year", year)
        .eq("sex", sex)
    )

    if months:
        q = q.in_("prediction_month", months)

    if barangay is None:
        q = q.is_("barangay", "null")
    else:
        q = q.eq("barangay", barangay)

    q = q.order(order_by, desc=True).limit(top_n)
    resp = q.execute()
    return resp.data or []


# ============================================================
# 1. MONTHLY SUMMARY
# ============================================================
def get_monthly_summary(month: int | None = None, year: int | None = None, top_n: int = 10) -> list[dict]:
    if month is None: month = datetime.now().month
    if year  is None: year  = datetime.now().year

    season = season_for_month(month)
    print(f"\n{'=' * 65}")
    print(f"📊  Monthly Summary — {MONTH_NAMES[month]} {year}  |  {season} Season")
    print(f"{'=' * 65}")

    results = _fetch_predictions(year=year, months=[month], sex='A', top_n=top_n)

    if not results:
        print("  ⚠️  No predictions found for this month/year.")
        print("      Run train.py first, then retry.")
        return []

    total_pred   = sum(r.get('predicted_cases') or 0 for r in results)
    total_actual = sum(r.get('actual_cases')    or 0 for r in results)

    print(f"\n  {'#':>3}  {'Disease':<38}  {'Pred%':>6}  {'Pred Cases':>10}  {'Actual':>7}  {'Trend':>10}  {'Confidence':>10}")
    print(f"  {'-' * 95}")

    for i, r in enumerate(results, 1):
        t_icon   = TREND_ICON.get(r.get('trend') or 'stable', '→')
        t_pct    = r.get('trend_percentage') or 0
        conf     = r.get('confidence_score') or 0
        actual   = r.get('actual_cases')
        actual_s = f"{actual}" if actual is not None else "—"

        print(
            f"  {i:>3}. {r['disease_name']:<38}  "
            f"{r.get('predicted_percentage', 0):>5.1f}%  "
            f"{r.get('predicted_cases', 0):>10}  "
            f"{actual_s:>7}  "
            f"{t_icon} {t_pct:>5.1f}%  "
            f"{conf * 100:>9.1f}%"
        )

    print(f"\n  Predicted total : {total_pred:,}")
    print(f"  Actual total    : {total_actual:,}  ({'—' if total_pred == 0 else f'{total_actual/total_pred*100:.1f}% of predicted'})")
    print(f"  Season          : {season}")
    return results


# ============================================================
# 2. QUARTERLY SUMMARY
# ============================================================
def get_quarterly_summary(quarter: int | None = None, year: int | None = None) -> list[dict]:
    if quarter is None: quarter = (datetime.now().month - 1) // 3 + 1
    if year    is None: year    = datetime.now().year

    months = QUARTER_MONTHS[quarter]
    season = 'Rainy' if quarter in (2, 3) else 'Dry'

    print(f"\n{'=' * 65}")
    print(f"📊  Quarterly Summary — {QUARTER_LABELS[quarter]} {year}  |  {season} Season")
    print(f"{'=' * 65}")

    results = _fetch_predictions(year=year, months=months, sex='A', top_n=200)

    if not results:
        print("  ⚠️  No quarterly predictions found. Run train.py first.")
        return []

    df = pd.DataFrame(results)
    agg = (
        df.groupby(['icd_code', 'disease_name'])
        .agg(
            total_predicted=('predicted_cases',   'sum'),
            total_actual   =('actual_cases',       'sum'),
            avg_pct        =('predicted_percentage','mean'),
            avg_conf       =('confidence_score',   'mean'),
        )
        .reset_index()
        .sort_values('avg_pct', ascending=False)
    )

    total_pred   = int(agg['total_predicted'].sum())
    total_actual = int(agg['total_actual'].sum())

    print(f"\n  {'#':>3}  {'Disease':<38}  {'Avg%':>6}  {'Total Pred':>10}  {'Total Actual':>12}  {'Conf':>6}")
    print(f"  {'-' * 85}")

    for i, (_, row) in enumerate(agg.iterrows(), 1):
        act = int(row['total_actual']) if pd.notnull(row['total_actual']) else 0
        print(
            f"  {i:>3}. {row['disease_name']:<38}  "
            f"{row['avg_pct']:>5.1f}%  "
            f"{int(row['total_predicted']):>10,}  "
            f"{act:>12,}  "
            f"{row['avg_conf'] * 100:>5.1f}%"
        )

    print(f"\n  Predicted total : {total_pred:,}")
    print(f"  Actual total    : {total_actual:,}")
    return agg.to_dict('records')


# ============================================================
# 3. SEASONAL SUMMARY
# ============================================================
def get_seasonal_summary(year: int | None = None) -> None:
    if year is None: year = datetime.now().year

    print(f"\n{'=' * 65}")
    print(f"🌦️   Seasonal Summary — {year}")
    print(f"{'=' * 65}")

    rainy_months = [6, 7, 8, 9, 10, 11]
    dry_months   = [1, 2, 3, 4, 5, 12]

    for label, months, icon in [
        ('Rainy', rainy_months, '🌧️ '),
        ('Dry',   dry_months,   '☀️ '),
    ]:
        results = _fetch_predictions(year=year, months=months, sex='A', top_n=200)

        print(f"\n  {icon} {label} Season — Top 8 Diseases:")
        print(f"  {'-' * 60}")

        if not results:
            print("    No data available.")
            continue

        df = pd.DataFrame(results)
        agg = (
            df.groupby(['icd_code', 'disease_name'])
            .agg(
                total_cases=('predicted_cases', 'sum'),
                avg_pct    =('predicted_percentage', 'mean'),
            )
            .reset_index()
            .sort_values('avg_pct', ascending=False)
            .head(8)
        )

        for i, (_, row) in enumerate(agg.iterrows(), 1):
            print(
                f"    {i}. {row['disease_name']:<40}  "
                f"{row['avg_pct']:>5.1f}%  "
                f"({int(row['total_cases']):,} cases)"
            )


# ============================================================
# 4. BARANGAY SUMMARY
# ============================================================
def get_barangay_summary(
    barangay: str,
    month: int | None = None,
    year: int | None = None,
    top_n: int = 8,
) -> list[dict]:
    if month is None: month = datetime.now().month
    if year  is None: year  = datetime.now().year

    print(f"\n{'=' * 65}")
    print(f"🏘️   Barangay Summary — {barangay}")
    print(f"    {MONTH_NAMES[month]} {year}  |  {season_for_month(month)} Season")
    print(f"{'=' * 65}")

    results = _fetch_predictions(
        year=year, months=[month],
        barangay=barangay, sex='A', top_n=top_n
    )

    if not results:
        print(f"  ⚠️  No predictions for barangay '{barangay}'.")
        print(f"      Either train.py hasn't run yet, or '{barangay}' has no patient data.")
        return []

    print(f"\n  {'#':>3}  {'Disease':<38}  {'Pred%':>6}  {'Cases':>6}  {'Trend':>10}")
    print(f"  {'-' * 70}")

    for i, r in enumerate(results, 1):
        t_icon = TREND_ICON.get(r.get('trend') or 'stable', '→')
        t_pct  = r.get('trend_percentage') or 0
        print(
            f"  {i:>3}. {r['disease_name']:<38}  "
            f"{r.get('predicted_percentage', 0):>5.1f}%  "
            f"{r.get('predicted_cases', 0):>6}  "
            f"{t_icon} {t_pct:>5.1f}%"
        )

    return results


# ============================================================
# 5. AGE GROUP BREAKDOWN
# ============================================================
def get_age_group_summary(
    month: int | None = None,
    year:  int | None = None,
) -> None:
    if month is None: month = datetime.now().month
    if year  is None: year  = datetime.now().year

    print(f"\n{'=' * 65}")
    print(f"👥  Age Group Breakdown — {MONTH_NAMES[month]} {year}")
    print(f"{'=' * 65}")

    for age_group in ['0-5', '6-17', '18-59', '60+']:
        resp = (
            supabase.table("disease_predictions")
            .select("disease_name, predicted_cases, predicted_percentage, confidence_score")
            .eq("prediction_year",  year)
            .eq("prediction_month", month)
            .eq("age_group",        age_group)
            .eq("sex",              "A")
            .is_("barangay",        "null")
            .order("predicted_percentage", desc=True)
            .limit(3)
            .execute()
        )
        data = resp.data or []
        print(f"\n  🔹 Age {age_group}:")
        if not data:
            print("     No data.")
            continue
        for r in data:
            conf = r.get('confidence_score') or 0
            print(
                f"     • {r['disease_name']:<38}  "
                f"{r.get('predicted_percentage', 0):>5.1f}%  "
                f"({r.get('predicted_cases', 0)} cases)  "
                f"conf: {conf * 100:.0f}%"
            )


# ============================================================
# 6. PATIENT-SPECIFIC PREDICTION (uses model directly)
# ============================================================
def predict_for_patient(
    *,
    month:         int,
    year:          int,
    birthdate_str: str,
    sex:           str,
    barangay:      str,
    top_n:         int = 5,
) -> dict:
    """
    Run a multi-disease probability prediction for a specific patient.

    Returns a dict with the top predicted diseases and their probabilities.
    """
    model, encoders, model_name, accuracy = load_model()

    # ── Derive age & group ───────────────────────────────────
    try:
        birthdate = datetime.strptime(birthdate_str, '%Y-%m-%d')
    except ValueError:
        raise ValueError(f"❌ Invalid birthdate format: '{birthdate_str}'. Use YYYY-MM-DD.")

    age       = max(0, (datetime.today() - birthdate).days // 365)
    age_group = get_age_group(age)
    quarter   = (month - 1) // 3 + 1
    season    = season_for_month(month)

    sex_val = sex if sex in ('M', 'F') else 'M'

    features = pd.DataFrame([[
        month, year, quarter, age,
        safe_encode(encoders['sex'],       sex_val),
        safe_encode(encoders['barangay'],  barangay),
        safe_encode(encoders['age_group'], age_group),
        0,
    ]], columns=FEATURES)

    # ── Predict all class probabilities ─────────────────────
    probabilities  = model.predict_proba(features)[0]
    disease_labels = encoders['disease'].inverse_transform(range(len(probabilities)))

    # Sort by probability descending
    ranked = sorted(
        zip(disease_labels, probabilities),
        key=lambda x: x[1], reverse=True
    )[:top_n]

    top_disease = ranked[0][0]
    confidence  = round(float(ranked[0][1]) * 100, 2)

    result = {
        "top_disease":    top_disease,
        "confidence":     confidence,
        "model":          model_name,
        "month":          month,
        "year":           year,
        "season":         season,
        "age":            age,
        "age_group":      age_group,
        "sex":            sex,
        "barangay":       barangay,
        "top_predictions": [
            {"disease": d, "probability": round(float(p) * 100, 2)}
            for d, p in ranked
        ],
    }

    # Also check Supabase for pre-computed prediction for this slice
    db_resp = (
        supabase.table("disease_predictions")
        .select("disease_name, predicted_cases, predicted_percentage, trend, confidence_score")
        .eq("prediction_year",  year)
        .eq("prediction_month", month)
        .eq("barangay",         barangay)
        .eq("age_group",        age_group)
        .eq("sex",              sex if sex in ('M', 'F') else 'A')
        .order("predicted_percentage", desc=True)
        .limit(5)
        .execute()
    )
    result["db_predictions"] = db_resp.data or []

    return result


def print_patient_result(result: dict) -> None:
    print(f"\n{'=' * 65}")
    print(f"🧑‍⚕️  Patient-Specific Prediction")
    print(f"{'=' * 65}")
    print(f"  Barangay  : {result['barangay']}")
    print(f"  Age       : {result['age']} ({result['age_group']})")
    print(f"  Sex       : {result['sex']}")
    print(f"  Period    : {MONTH_NAMES[result['month']]} {result['year']}  ({result['season']} Season)")
    print(f"  Model     : {result['model']}")
    print(f"\n  Top predicted diseases (model):")
    for i, p in enumerate(result['top_predictions'], 1):
        bar = '█' * int(p['probability'] / 5)
        print(f"    {i}. {p['disease']:<40}  {p['probability']:>6.2f}%  {bar}")

    if result['db_predictions']:
        print(f"\n  Pre-computed DB predictions for this slice:")
        for r in result['db_predictions']:
            t_icon = TREND_ICON.get(r.get('trend') or 'stable', '→')
            print(
                f"    • {r['disease_name']:<40}  "
                f"{r.get('predicted_percentage', 0):>5.1f}%  "
                f"({r.get('predicted_cases', 0)} cases)  {t_icon}"
            )
    else:
        print(f"\n  ℹ️  No DB predictions for this exact slice yet. Run train.py first.")


# ============================================================
# 7. DATA QUALITY REPORT
# ============================================================
def get_data_quality_report() -> None:
    """Show counts and NULL stats from disease_predictions."""
    print(f"\n{'=' * 65}")
    print(f"🔍  Data Quality Report — disease_predictions")
    print(f"{'=' * 65}")

    resp = supabase.table("disease_predictions").select(
        "id, predicted_cases, predicted_percentage, trend, "
        "confidence_score, actual_cases, model_version"
    ).execute()

    data = resp.data or []
    if not data:
        print("  ⚠️  Table is empty. Run train.py first.")
        return

    df = pd.DataFrame(data)
    total = len(df)

    def pct_null(col): return f"{df[col].isna().sum()} NULL ({df[col].isna().mean() * 100:.1f}%)"
    def pct_zero(col): return f"{(df[col] == 0).sum()} zeros" if col in df else ''

    print(f"\n  Total rows             : {total:,}")
    print(f"  predicted_cases        : {pct_null('predicted_cases')}  {pct_zero('predicted_cases')}")
    print(f"  predicted_percentage   : {pct_null('predicted_percentage')}")
    print(f"  confidence_score       : {pct_null('confidence_score')}  {pct_zero('confidence_score')}")
    print(f"  trend                  : {pct_null('trend')}")
    print(f"  actual_cases           : {pct_null('actual_cases')}")
    print(f"\n  Model versions present : {df['model_version'].dropna().unique().tolist()}")

    if 'confidence_score' in df and df['confidence_score'].notna().any():
        conf = df['confidence_score'].dropna()
        print(f"\n  Confidence score stats :")
        print(f"    Min  : {conf.min():.3f}")
        print(f"    Mean : {conf.mean():.3f}")
        print(f"    Max  : {conf.max():.3f}")


# ============================================================
# INTERACTIVE PATIENT INPUT
# ============================================================
def interactive_patient_prediction() -> None:
    print(f"\n{'=' * 65}")
    print(f"🧑‍⚕️  Patient Prediction — Interactive Mode")
    print(f"{'=' * 65}")

    now = datetime.now()

    try:
        birthdate  = input("  Birthdate (YYYY-MM-DD)  : ").strip()
        sex_input  = input("  Sex (M/F)               : ").strip().upper()
        barangay   = input("  Barangay                : ").strip()
        month_inp  = input(f"  Month (1-12) [{now.month}]      : ").strip()
        year_inp   = input(f"  Year [{now.year}]             : ").strip()

        month = int(month_inp) if month_inp else now.month
        year  = int(year_inp)  if year_inp  else now.year
        sex   = sex_input if sex_input in ('M', 'F') else 'A'

        if not (1 <= month <= 12):
            raise ValueError("Month must be 1–12")

        result = predict_for_patient(
            month=month, year=year,
            birthdate_str=birthdate,
            sex=sex,
            barangay=barangay,
        )
        print_patient_result(result)

    except KeyboardInterrupt:
        print("\n  Cancelled.")
    except Exception as e:
        print(f"\n  ❌ Error: {e}")


# ============================================================
# ARGUMENT PARSER
# ============================================================
def parse_args():
    parser = argparse.ArgumentParser(description="SmartRHU — Prediction Queries")
    parser.add_argument('--month',     type=int,   default=None)
    parser.add_argument('--year',      type=int,   default=None)
    parser.add_argument('--quarter',   type=int,   default=None, choices=[1, 2, 3, 4])
    parser.add_argument('--barangay',  type=str,   default=None)
    parser.add_argument('--top',       type=int,   default=10)
    parser.add_argument('--patient',   action='store_true', help='Run interactive patient prediction')
    parser.add_argument('--quality',   action='store_true', help='Show data quality report')
    parser.add_argument('--summary',   type=str,   default='monthly',
                        choices=['monthly', 'quarterly', 'seasonal', 'age', 'all'],
                        help='Which summary to show')
    return parser.parse_args()


# ============================================================
# MAIN
# ============================================================
def main():
    args = parse_args()
    now  = datetime.now()

    month   = args.month   or now.month
    year    = args.year    or now.year
    quarter = args.quarter or ((now.month - 1) // 3 + 1)

    print("\n" + "=" * 65)
    print("🔮  SmartRHU — Disease Prediction Dashboard")
    print("=" * 65)

    if args.quality:
        get_data_quality_report()
        return

    if args.patient:
        interactive_patient_prediction()
        return

    if args.barangay:
        get_barangay_summary(args.barangay, month=month, year=year, top_n=args.top)
        return

    summary = args.summary

    if summary in ('monthly', 'all'):
        get_monthly_summary(month=month, year=year, top_n=args.top)

    if summary in ('quarterly', 'all'):
        get_quarterly_summary(quarter=quarter, year=year)

    if summary in ('seasonal', 'all'):
        get_seasonal_summary(year=year)

    if summary in ('age', 'all'):
        get_age_group_summary(month=month, year=year)

    # ── Sample patient prediction ────────────────────────────
    if summary == 'all':
        print(f"\n{'=' * 65}")
        print(f"🧑‍⚕️  Sample Patient Prediction")
        print(f"{'=' * 65}")
        try:
            result = predict_for_patient(
                month=month, year=year,
                birthdate_str='1985-06-15',
                sex='F',
                barangay='Poblacion',
            )
            print_patient_result(result)
        except FileNotFoundError as e:
            print(f"  {e}")
        except Exception as e:
            print(f"  ❌ Could not run patient prediction: {e}")

    print(f"\n{'=' * 65}")
    print(f"✅  Done! Run with --help to see all options.")
    print(f"{'=' * 65}\n")


if __name__ == "__main__":
    main()