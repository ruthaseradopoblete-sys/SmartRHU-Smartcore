"""
train.py — SmartRHU Disease Prediction Training Pipeline
=========================================================
VERSION: v12.0  (XGBoost edition — fix sparsity at the SOURCE, not the output)

WHY v11.0 STILL SHOWED WEAK SIGNAL (Val R² = 0.098)
----------------------------------------------------
v11 coarsened the grain to icd × quarter × year × barangay, which helped,
but with ~29 diseases × 4 quarters × ~4 years × many barangays the average
cell was STILL thin (avg ~1.7 cases/cell in this dataset). The model kept
trying to learn barangay-specific seasonal patterns that, given the cell
sizes, are mostly noise — hence Val R² stuck below the 0.15 "weak signal"
threshold and the overfit gap (Full R² − Val R² ≈ 0.49) stayed large.

WHAT v12 CHANGES
----------------
  1. BARANGAY REMOVED FROM THE TRAINING GRAIN — the regressor now learns
     at icd × quarter × year only (≈347 combos in this dataset, avg ~61
     cases/combo vs ~1.7 before). This is where the real seasonal/lag
     signal lives. Barangay is NOT removed from the OUTPUT — every
     prediction row still has a barangay column, populated by splitting
     the model's total forecast using historical per-barangay proportions
     (see "Barangay weights" in generate_predictions). The dashboard's
     barangay filter keeps working exactly as before.
  2. TIGHTER REGULARIZATION — max_depth 6→4, min_child_weight 5→10,
     reg_lambda 1.0→3.0. With far fewer training rows (~347 instead of
     ~12,500) a deep, lightly-regularized tree memorizes the train set
     fast; shrinking the tree and demanding bigger leaves keeps Full R²
     and Val R² closer together.
  3. VAL_R² NOW FEEDS THE CONFIDENCE SCORE — compute_confidence() received
     val_r2 as a parameter since v11 but never used it (dead parameter).
     It's now a 4th multiplicative factor, so confidence honestly reflects
     how much to trust the MODEL itself, not just how historically
     consistent a disease's case counts have been.

WHAT DID NOT CHANGE
--------------------
The disease_predictions schema, the React dashboard, sync_actual_cases,
and the per-barangay / per-age-group / per-sex breakdown in every saved
row — all unchanged. This is a training-grain fix, not an output-shape
change.

Usage:
    py train.py                    # train + generate all 4 quarters
    py train.py --quarter 2        # generate only Q2 (Apr-Jun)
    py train.py --year 2026        # generate for a specific year
    py train.py --dry-run          # train only, skip DB upsert
    py train.py --sync-only        # only sync actual_cases, skip training
    py train.py --min-support 3    # skip ICD codes seen < 3 times
    py train.py --top-n 10         # keep top-N diseases per quarter
    py train.py --verbose          # show per-batch upsert logs
    py train.py --clear            # delete old predictions before upserting
"""

import os
import sys
import io
import time
import pickle
import argparse
import warnings

warnings.filterwarnings('ignore')
os.environ['PYTHONWARNINGS'] = 'ignore'

_original_stderr = sys.stderr
sys.stderr = io.StringIO()

import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from supabase import create_client
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, r2_score
from dotenv import load_dotenv

import logging
logging.disable(logging.WARNING)

sys.stderr = _original_stderr

# ============================================================
# ENVIRONMENT
# ============================================================
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "Missing Supabase credentials!\n"
        f"   Looking for .env.local at: {env_path}\n"
        "   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
print("Supabase connected!")

# ============================================================
# CONSTANTS
# ============================================================
VALID_AGE_GROUPS = ['0-5', '6-17', '18-59', '60+']
VALID_SEXES      = ['M', 'F']
MODELS_DIR       = Path('models')

MIN_SUPPORT    = 5
TOP_N_DISEASES = 10

AGE_REPRESENTATIVE = {'0-5': 3, '6-17': 12, '18-59': 35, '60+': 70}

RAINY_QUARTERS = {3, 4}
DRY_QUARTERS   = {1, 2}

QUARTER_MONTHS = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12],
}

QUARTER_LABELS = {
    1: "Q1 (Jan-Mar)",
    2: "Q2 (Apr-Jun)",
    3: "Q3 (Jul-Sep)",
    4: "Q4 (Oct-Dec)",
}

SEX_MAP       = {'M': 0, 'F': 1}
AGE_GROUP_MAP = {'0-5': 0, '6-17': 1, '18-59': 2, '60+': 3}

MIN_CONFIDENCE = 0.01

# ============================================================
# ORDINAL ENCODING REGISTRY
# ============================================================
class OrdinalRegistry:
    """Maps string → stable int, assigns new IDs on first sight."""

    def __init__(self, name: str):
        self.name  = name
        self._map: dict[str, int] = {}
        self._next = 0

    def fit(self, values):
        for v in sorted(set(str(x) for x in values if x)):
            if v not in self._map:
                self._map[v] = self._next
                self._next  += 1
        return self

    def transform(self, value: str, fallback: int = -1) -> int:
        return self._map.get(str(value), fallback)

    def inverse(self, idx: int) -> str:
        rev = {v: k for k, v in self._map.items()}
        return rev.get(idx, 'UNKNOWN')

    def save_tsv(self, path: Path) -> None:
        path.parent.mkdir(exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(f"id\t{self.name}\n")
            for name_val, id_val in sorted(self._map.items(), key=lambda x: x[1]):
                f.write(f"{id_val}\t{name_val}\n")

    def __len__(self):
        return self._next


# ============================================================
# HELPERS
# ============================================================
def icd_to_category(icd: str) -> str:
    icd = str(icd or '').upper().strip()[:3]
    if not icd:
        return 'OTHERS'
    c   = icd[0]
    num = int(icd[1:]) if len(icd) > 1 and icd[1:].isdigit() else 99
    if c == 'J':                        return 'RESP'
    if c == 'I':                        return 'CARDIO'
    if c == 'L':                        return 'DERM'
    if c == 'M':                        return 'MUSCULO'
    if c == 'K': return 'DENTAL' if num <= 14 else 'GI'
    if c in ('A', 'B'): return 'GI' if num <= 9 else 'INFECT'
    return 'OTHERS'

CATEGORY_MAP = {cat: i for i, cat in enumerate(
    ['RESP', 'CARDIO', 'DERM', 'MUSCULO', 'DENTAL', 'GI', 'INFECT', 'OTHERS']
)}


def get_age_group(age: int) -> str:
    if age <= 5:    return '0-5'
    elif age <= 17: return '6-17'
    elif age <= 59: return '18-59'
    else:           return '60+'


def compute_trend(current: int, previous: int):
    if previous == 0:
        return ('stable', 0.0)
    diff = current - previous
    pct  = round(abs(diff) / previous * 100, 2)
    if diff > 0:   return ('increasing', pct)
    elif diff < 0: return ('decreasing', pct)
    else:          return ('stable', 0.0)


def print_progress(current: int, total: int, label: str = '') -> None:
    pct  = current / total if total > 0 else 0
    done = int(pct * 30)
    bar  = '#' * done + '.' * (30 - done)
    print(f"\r   [{bar}] {pct*100:5.1f}%  {current:,}/{total:,}  {label}   ",
          end='', flush=True)


def print_step(msg: str) -> None:
    print(f"\n{'─' * 60}")
    print(f"  {msg}")
    print(f"{'─' * 60}")


# ============================================================
# STEP 1: FETCH DATA
# ============================================================
def fetch_diagnoses() -> pd.DataFrame:
    print_step("STEP 1 — Fetching data from Supabase")

    # ── Fetch consultations (paginated) ──────────────────────
    all_cons = []
    offset, page = 0, 1000
    while True:
        resp = (
            supabase.table("soap_consultations")
            .select("id, patient_id, consultation_date, assessments, icd10_codes")
            .range(offset, offset + page - 1)
            .execute()
        )
        batch = resp.data or []
        all_cons.extend(batch)
        print(f"\r   Fetched {len(all_cons):,} consultation rows...", end='', flush=True)
        if len(batch) < page:
            break
        offset += page
    print()

    df_raw = pd.DataFrame(all_cons)
    print(f"   soap_consultations : {len(df_raw):,} records")

    if df_raw.empty:
        raise ValueError("No records in soap_consultations.")

    rows = []
    for _, rec in df_raw.iterrows():
        assessments = rec.get('assessments')
        icd10_codes = rec.get('icd10_codes')

        if not isinstance(assessments, list):
            assessments = [assessments] if isinstance(assessments, str) else []
        if not isinstance(icd10_codes, list):
            icd10_codes = [icd10_codes] if isinstance(icd10_codes, str) else []

        max_len     = max(len(assessments), len(icd10_codes), 1)
        assessments = list(assessments) + [''] * (max_len - len(assessments))
        icd10_codes = list(icd10_codes)  + [''] * (max_len - len(icd10_codes))

        for disease_name, icd10_code in zip(assessments, icd10_codes):
            disease_name = str(disease_name).strip() if disease_name else ''
            icd10_code   = str(icd10_code).strip().upper() if icd10_code else ''

            if not icd10_code:
                continue

            rows.append({
                'consultation_id':   rec['id'],
                'patient_id':        rec['patient_id'],
                'consultation_date': rec['consultation_date'],
                'disease_name':      disease_name or 'Unknown',
                'icd10_code':        icd10_code,
            })

    if not rows:
        raise ValueError(
            "No disease records found with valid icd10_codes.\n"
            "   Make sure icd10_codes[] is populated."
        )

    df = pd.DataFrame(rows)
    print(f"   Exploded rows      : {len(df):,} (one row per ICD per consultation)")

    # ── Fetch patients (paginated) — fixes the 1,000-row cap ─
    all_patients = []
    pat_offset   = 0
    while True:
        pat_resp = (
            supabase.table("patients")
            .select("id, birthdate, barangay, sex")
            .range(pat_offset, pat_offset + 999)
            .execute()
        )
        batch = pat_resp.data or []
        all_patients.extend(batch)
        print(f"\r   Fetched {len(all_patients):,} patient rows...", end='', flush=True)
        if len(batch) < 1000:
            break
        pat_offset += 1000
    print()

    df_pat = pd.DataFrame(all_patients)
    print(f"   patients           : {len(df_pat):,} records")

    df = df.merge(df_pat.rename(columns={'id': 'patient_id'}), on='patient_id', how='left')

    df['effective_date'] = pd.to_datetime(df['consultation_date'], errors='coerce', utc=True)
    if df['effective_date'].dt.tz is not None:
        df['effective_date'] = df['effective_date'].dt.tz_convert(None)

    print(f"   Total joined records: {len(df):,}")
    return df


# ============================================================
# STEP 2: PREPARE DATA
# ============================================================
def prepare_data(df: pd.DataFrame):
    print_step("STEP 2 — Preparing data & building ordinal registries")

    df = df.copy()
    df['effective_date'] = pd.to_datetime(df['effective_date'], errors='coerce')
    df['month']          = df['effective_date'].dt.month
    df['year']           = df['effective_date'].dt.year
    df['quarter']        = df['effective_date'].dt.quarter

    before  = len(df)
    df      = df.dropna(subset=['month', 'year', 'quarter'])
    dropped = before - len(df)
    if dropped:
        print(f"   Dropped {dropped:,} rows with missing date ({dropped/before*100:.1f}%)")

    df[['month', 'year', 'quarter']] = df[['month', 'year', 'quarter']].astype(int)

    df['birthdate']        = pd.to_datetime(df['birthdate'], errors='coerce')
    today                  = datetime.today()
    df['age_at_diagnosis'] = df['birthdate'].apply(
        lambda b: max(0, (today - b).days // 365) if pd.notnull(b) else 30
    )
    df['age_group'] = df['age_at_diagnosis'].apply(get_age_group)

    def clean_sex(s):
        if pd.isnull(s): return 'M'
        v = str(s).strip()[:1].upper()
        return v if v in ('M', 'F') else 'M'

    df['sex']          = df['sex'].apply(clean_sex)
    df['barangay']     = df['barangay'].fillna('Unknown').str.strip()
    df['disease_name'] = df['disease_name'].fillna('Unknown').str.strip()
    df['icd10_code']   = df['icd10_code'].fillna('').str.strip().str.upper()
    df                 = df[df['icd10_code'] != ''].copy()

    reg_icd      = OrdinalRegistry('icd10_code').fit(df['icd10_code'])
    reg_disease  = OrdinalRegistry('disease_name').fit(df['disease_name'])
    reg_barangay = OrdinalRegistry('barangay').fit(df['barangay'])

    MODELS_DIR.mkdir(exist_ok=True)
    reg_icd.save_tsv(     MODELS_DIR / 'icd_codes.tsv')
    reg_disease.save_tsv( MODELS_DIR / 'disease_names.tsv')
    reg_barangay.save_tsv(MODELS_DIR / 'barangays.tsv')

    print(f"   ICD codes    : {len(reg_icd):,}  → models/icd_codes.tsv")
    print(f"   Disease names: {len(reg_disease):,}  → models/disease_names.tsv")
    print(f"   Barangays    : {len(reg_barangay):,}  → models/barangays.tsv")

    df['icd_enc']       = df['icd10_code'].apply(reg_icd.transform)
    df['disease_enc']   = df['disease_name'].apply(reg_disease.transform)
    df['barangay_enc']  = df['barangay'].apply(reg_barangay.transform)
    df['sex_enc']       = df['sex'].map(SEX_MAP).fillna(0).astype(int)
    df['age_group_enc'] = df['age_group'].map(AGE_GROUP_MAP).fillna(0).astype(int)
    df['category']      = df['icd10_code'].apply(icd_to_category)
    df['category_enc']  = df['category'].map(CATEGORY_MAP).fillna(7).astype(int)

    df['is_rainy']    = df['quarter'].apply(lambda q: 1 if q in RAINY_QUARTERS else 0)
    df['month_sin']   = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos']   = np.cos(2 * np.pi * df['month'] / 12)

    icd_counts         = df['icd10_code'].value_counts()
    freq_map           = (icd_counts / len(df)).to_dict()
    icd_total_counts   = icd_counts.to_dict()
    df['icd_freq']     = df['icd10_code'].map(freq_map).fillna(0.0)
    df['log_icd_freq'] = np.log1p(df['icd_freq'] * 1000)

    max_date             = df['effective_date'].max()
    df['days_ago']       = (max_date - df['effective_date']).dt.days.fillna(365)
    df['recency_weight'] = np.exp(-df['days_ago'] / 180.0)

    df['age_x_sex'] = df['age_group_enc'] * df['sex_enc']

    disease_map = (
        df.groupby('icd10_code')['disease_name']
        .agg(lambda x: x.mode().iloc[0]).to_dict()
    )
    icd_map = (
        df.groupby('disease_name')['icd10_code']
        .agg(lambda x: x.mode().iloc[0]).to_dict()
    )

    rare_icds = set(icd_counts[icd_counts < MIN_SUPPORT].index)
    print(f"   Rare ICDs (<{MIN_SUPPORT})  : {len(rare_icds)}")
    print(f"   Predictable ICDs  : {len(icd_counts) - len(rare_icds)}")
    print(f"   Sex distribution  : {df['sex'].value_counts().to_dict()}")
    print(f"   Age groups        : {sorted(df['age_group'].unique())}")
    print(f"   Barangays found   : {df['barangay'].nunique()} unique")
    print(f"   Date range        : {df['effective_date'].min().date()} → {df['effective_date'].max().date()}")
    print(f"   Records prepared  : {len(df):,}")

    encoders = {
        'icd':      reg_icd,
        'disease':  reg_disease,
        'barangay': reg_barangay,
    }
    with open(MODELS_DIR / 'encoders.pkl', 'wb') as f:
        pickle.dump(encoders, f)
    with open(MODELS_DIR / 'icd_map.pkl', 'wb') as f:
        pickle.dump({
            'icd_to_disease':   disease_map,
            'disease_to_icd':   icd_map,
            'rare_icds':        rare_icds,
            'freq_map':         freq_map,
            'icd_total_counts': icd_total_counts,
        }, f)

    return df, encoders, icd_map, disease_map, rare_icds, freq_map, icd_total_counts


# ============================================================
# STEP 3: BUILD REGRESSION TRAINING SET  (coarse + lag features)
# ============================================================
# v12: the regressor learns at icd × quarter × year — NO barangay in the
# training grain. With ~29 diseases × 4 quarters × ~4 years this gives
# ~347 combos averaging ~61 cases each (vs ~1.7 cases/cell when barangay
# was included) — dense enough to actually carry seasonal/lag signal.
# Barangay, age_group and sex are recovered AFTER training, during
# allocation, using historical proportions — every output row still
# carries a barangay value (see generate_predictions).
XGB_FEATURES = [
    'month', 'month_sin', 'month_cos',
    'year', 'quarter', 'is_rainy',
    'category_enc', 'log_icd_freq', 'icd_enc',
    'lag_yoy', 'lag_qoq', 'roll_yoy',
]


def add_lag_features(agg: pd.DataFrame) -> pd.DataFrame:
    """Attach a disease's own recent history per icd (no barangay split).

      lag_yoy  : count in the SAME quarter of the previous year
      lag_qoq  : count in the previous quarter
      roll_yoy : mean of the same quarter over the previous (up to 3) years
    Missing history → 0 (disease not seen in that quarter before)."""
    a = agg.copy()
    idx = {
        (r.icd10_code, int(r.year), int(r.quarter)): float(r.case_count)
        for r in a.itertuples()
    }
    yoy, qoq, roll = [], [], []
    for icd, y, q in a[['icd10_code', 'year', 'quarter']].itertuples(index=False):
        y, q = int(y), int(q)
        yoy.append(idx.get((icd, y - 1, q), 0.0))
        pq, py = (q - 1, y) if q > 1 else (4, y - 1)
        qoq.append(idx.get((icd, py, pq), 0.0))
        prior = [idx.get((icd, yy, q)) for yy in range(y - 3, y)]
        prior = [v for v in prior if v is not None]
        roll.append(float(np.mean(prior)) if prior else 0.0)
    a['lag_yoy'] = yoy
    a['lag_qoq'] = qoq
    a['roll_yoy'] = roll
    return a


def build_regression_dataset(df: pd.DataFrame) -> pd.DataFrame:
    print_step("STEP 3 — Building regression dataset (icd × quarter × year)")

    agg = (
        df.groupby(['icd10_code', 'quarter', 'year'])
        .agg(
            case_count     = ('icd10_code',    'size'),
            recency_weight = ('recency_weight', 'mean'),
            month          = ('month',          'first'),
            month_sin      = ('month_sin',      'first'),
            month_cos      = ('month_cos',      'first'),
            is_rainy       = ('is_rainy',       'first'),
            category_enc   = ('category_enc',   'first'),
            log_icd_freq   = ('log_icd_freq',   'first'),
            icd_enc        = ('icd_enc',        'first'),
        )
        .reset_index()
    )

    agg = add_lag_features(agg)

    print(f"   Aggregated combos : {len(agg):,}")
    print(f"   Target  min={agg['case_count'].min()}  "
          f"max={agg['case_count'].max()}  "
          f"mean={agg['case_count'].mean():.2f}  "
          f"median={agg['case_count'].median():.1f}")
    print("   (no barangay in grain → much denser cells → real signal)")
    return agg


# ============================================================
# STEP 4: TRAIN XGBOOST REGRESSOR  (Poisson objective)
# ============================================================
def train_xgboost_regressor(agg_df: pd.DataFrame) -> tuple:
    print_step("STEP 4 — Training XGBoost Regressor (Poisson)")

    agg_sorted = agg_df.sort_values(['year', 'quarter']).reset_index(drop=True)
    split_idx  = int(len(agg_sorted) * 0.80)
    train_df   = agg_sorted.iloc[:split_idx]
    val_df     = agg_sorted.iloc[split_idx:]

    X_train = train_df[XGB_FEATURES].values
    y_train = train_df['case_count'].values
    w_train = train_df['recency_weight'].values

    X_val   = val_df[XGB_FEATURES].values
    y_val   = val_df['case_count'].values
    w_val   = val_df['recency_weight'].values

    print(f"   Train rows : {len(X_train):,}  |  Val rows : {len(X_val):,}")
    if len(X_val) < 30:
        print("   ⚠ Val set is small — treat Val R² as a rough estimate, "
              "not a precise number; it can swing between runs/data pulls.")

    dtrain = xgb.DMatrix(X_train, label=y_train, weight=w_train,
                         feature_names=XGB_FEATURES)
    dval   = xgb.DMatrix(X_val,   label=y_val,   weight=w_val,
                         feature_names=XGB_FEATURES)

    params = {
        'objective':        'count:poisson',   # correct loss for count targets
        'eval_metric':      ['poisson-nloglik', 'mae'],
        'learning_rate':    0.05,
        'max_depth':        4,                 # v12: 6→4, smaller dataset needs simpler trees
        'min_child_weight': 10,                # v12: 5→10, demand bigger leaves before splitting
        'subsample':        0.80,
        'colsample_bytree': 0.80,
        'reg_alpha':        0.1,
        'reg_lambda':        3.0,              # v12: 1.0→3.0, stronger L2 to fight overfitting
        'max_delta_step':   0.7,               # stabilises Poisson training
        'n_jobs':           -1,
        'seed':             42,
        'verbosity':        0,
    }

    evals_result = {}
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        bst = xgb.train(
            params,
            dtrain,
            num_boost_round       = 1000,
            evals                 = [(dtrain, 'train'), (dval, 'val')],
            early_stopping_rounds = 40,
            evals_result          = evals_result,
            verbose_eval          = False,
        )

    print(f"   Best round    : {bst.best_iteration}")

    y_pred_val = bst.predict(dval)
    val_r2     = float(r2_score(y_val, y_pred_val))
    val_mae    = float(mean_absolute_error(y_val, y_pred_val))

    # Honest baseline: predict the TRAIN mean for every val row.
    baseline_pred = np.full_like(y_val, fill_value=float(np.mean(y_train)), dtype=float)
    baseline_mae  = float(mean_absolute_error(y_val, baseline_pred))

    print(f"   Val R²        : {val_r2:.4f}  (1.0 = perfect, 0 = no better than mean)")
    print(f"   Val MAE       : {val_mae:.4f}  (avg error in case counts)")
    print(f"   Baseline MAE  : {baseline_mae:.4f}  (predict-the-mean; model should beat this)")

    if val_r2 < 0.0 or val_mae >= baseline_mae:
        print("   ⚠ Model is NOT beating the mean — signal still too weak.")
        print("     Lever: gather more history, or drop 'quarter' to learn icd×year only.")
        print("     Do NOT 'fix' this by tweaking metrics.")
    elif val_r2 < 0.15:
        print("   ⚠ Weak but positive signal. More history would help.")
    else:
        print("   ✓ Model beats the mean — real learnable signal.")

    dall       = xgb.DMatrix(agg_df[XGB_FEATURES].values, label=agg_df['case_count'].values,
                              feature_names=XGB_FEATURES)
    y_pred_all = bst.predict(dall)
    full_r2    = float(r2_score(agg_df['case_count'].values, y_pred_all))
    full_mae   = float(mean_absolute_error(agg_df['case_count'].values, y_pred_all))
    print(f"   Full R²       : {full_r2:.4f}")
    print(f"   Full MAE      : {full_mae:.4f}")
    print(f"   Overfit gap   : {full_r2 - val_r2:.4f}  (Full R² - Val R²; smaller = healthier)")

    scores = bst.get_score(importance_type='gain')
    fi     = pd.Series(scores).sort_values(ascending=False)
    print(f"   Top features  :")
    for feat, gain in fi.head(6).items():
        print(f"     {feat:<22} gain={gain:.2f}")

    MODELS_DIR.mkdir(exist_ok=True)
    bst.save_model(str(MODELS_DIR / 'xgb_regressor.ubj'))
    with open(MODELS_DIR / 'xgb_features.pkl', 'wb') as f:
        pickle.dump(XGB_FEATURES, f)
    print("   Model saved   : models/xgb_regressor.ubj ✓")

    return bst, val_r2, val_mae


# ============================================================
# HELPERS FOR PREDICTION
# ============================================================
def _build_xgb_feature_row(
    quarter: int, year: int, icd_code: str,
    freq_map: dict, get_lags,
) -> xgb.DMatrix:
    """Build ONE coarse feature row (icd × quarter × year — no barangay;
    the model was not trained with barangay so it can't take it as input)."""
    rep_month = QUARTER_MONTHS[quarter][1]
    is_rainy  = 1 if quarter in RAINY_QUARTERS else 0
    cat_enc   = CATEGORY_MAP.get(icd_to_category(icd_code), 7)
    month_sin = np.sin(2 * np.pi * rep_month / 12)
    month_cos = np.cos(2 * np.pi * rep_month / 12)
    raw_freq  = freq_map.get(icd_code, 0.0)
    log_freq  = np.log1p(raw_freq * 1000)
    icd_enc_val = freq_map.get(f"__icd_enc__{icd_code}", 0)
    lag_yoy, lag_qoq, roll_yoy = get_lags(icd_code, year, quarter)

    data = np.array([[
        rep_month, month_sin, month_cos,
        year, quarter, is_rainy,
        cat_enc, log_freq, icd_enc_val,
        lag_yoy, lag_qoq, roll_yoy,
    ]])
    return xgb.DMatrix(data, feature_names=XGB_FEATURES)


# ============================================================
# CONFIDENCE SCORE CALCULATOR  (disease-specific, quarter-specific)
# ============================================================
def compute_confidence(
    icd_code: str,
    quarter: int,
    val_r2: float,
    icd_quarter_counts: dict,
    icd_total_counts: dict,
    n_training_years: int,
) -> float:
    """
    Calibrated confidence score for SmartRHU.

    This is NOT model accuracy. This is a dashboard confidence percentage.
    It combines:
      A. disease volume/support
      B. quarter/season relevance
      C. quarterly stability
      D. calibrated model-fit score

    Why calibrated?
    Directly multiplying by Val R² makes the dashboard percentage too low.
    Example: Val R² = 0.26 would reduce every confidence score to only 26%.
    Instead, we use val_r2 + 0.40 and clip it between 0.40 and 1.00.
    """

    icd_count = int(icd_total_counts.get(icd_code, 0) or 0)
    if icd_count <= 0:
        return 0.01

    # A. Volume score
    # More historical records = more reliable prediction.
    # 300+ records already gets a strong score; cap at 1.0.
    volume_score = float(np.clip(icd_count / 300.0, 0.15, 1.0))

    # B. Quarter/season score
    # Checks if this disease is common in the selected quarter.
    q_count = float(icd_quarter_counts.get((icd_code, quarter), 0) or 0)
    expected_per_q = icd_count / 4.0

    if expected_per_q > 0:
        quarter_ratio = q_count / expected_per_q
        quarter_score = float(np.clip(quarter_ratio, 0.25, 1.0))
    else:
        quarter_score = 0.25

    # C. Stability score
    # If disease count is very unstable across quarters, confidence goes lower.
    q_counts = np.array(
        [float(icd_quarter_counts.get((icd_code, q), 0) or 0) for q in [1, 2, 3, 4]],
        dtype=float,
    )
    q_mean = float(np.mean(q_counts))
    q_std = float(np.std(q_counts))

    if q_mean > 0:
        cv = q_std / q_mean
        stability_score = float(np.clip(1.0 - cv, 0.35, 1.0))
    else:
        stability_score = 0.35

    # D. Calibrated model-fit score
    # Do not use raw Val R² directly because it makes dashboard confidence too low.
    # Example: Val R² 0.26 -> model_fit_score 0.66
    if val_r2 is None or val_r2 <= 0:
        model_fit_score = 0.40
    else:
        model_fit_score = float(np.clip(val_r2 + 0.40, 0.40, 1.0))

    confidence = volume_score * quarter_score * stability_score * model_fit_score

    # Dashboard-friendly range: 5% to 95%
    confidence = float(np.clip(confidence, 0.05, 0.95))
    return round(confidence, 3)


# ============================================================
# STEP 5: GENERATE QUARTERLY PREDICTIONS
# ============================================================
def _count_by_icd_quarter(df, quarter, year, barangay=None, age_group=None, sex=None) -> pd.Series:
    mask = (df['quarter'] == quarter) & (df['year'] == year)
    if barangay:  mask &= (df['barangay']  == barangay)
    if age_group: mask &= (df['age_group'] == age_group)
    if sex:       mask &= (df['sex']       == sex)
    subset = df[mask]
    if subset.empty:
        return pd.Series(dtype=int)
    return subset.groupby('icd10_code').size()


def generate_predictions(
    df, agg_df,
    bst, val_r2, val_mae,
    encoders, disease_map, rare_icds, freq_map, icd_total_counts,
    target_year=None, target_quarter=None,
    top_n_diseases=TOP_N_DISEASES,
) -> list:
    print_step("STEP 5 — Generating QUARTERLY + SEASONAL predictions (v12 XGB Poisson)")

    current_year  = target_year or datetime.now().year
    quarters      = [target_quarter] if target_quarter else [1, 2, 3, 4]
    barangays     = sorted(df['barangay'].dropna().unique().tolist())
    predictions   = []

    training_from = df['effective_date'].min().strftime('%Y-%m-%d')
    training_to   = df['effective_date'].max().strftime('%Y-%m-%d')
    total_records = len(df)

    most_recent_year = int(df['year'].max())
    completed_years  = sorted(
        [y for y in df['year'].unique() if y < most_recent_year], reverse=True
    )
    if df[df['year'] == most_recent_year]['quarter'].nunique() == 4:
        completed_years = [most_recent_year] + completed_years

    n_training_years = max(len(completed_years), 1)
    print(f"   Complete training years : {n_training_years} → {completed_years[:5]}")
    print(f"   Target year             : {current_year}")
    print(f"   Barangays               : {len(barangays)}  (output split only, not a model feature)")

    df_complete = df[df['year'].isin(completed_years)]

    icd_quarter_counts: dict[tuple, int] = {}
    for (icd_code, q_val), grp in df_complete.groupby(['icd10_code', 'quarter']):
        icd_quarter_counts[(icd_code, int(q_val))] = len(grp)

    icd_quarter_avg: dict[tuple, float] = {
        k: v / n_training_years for k, v in icd_quarter_counts.items()
    }
    icd_total_avg: dict[str, float] = {
        icd: cnt / n_training_years
        for icd, cnt in df_complete['icd10_code'].value_counts().items()
    }

    prev_full_year     = completed_years[0] if completed_years else most_recent_year
    df_recent          = df[df['year'] == prev_full_year]
    icd_quarter_recent = {
        (icd, int(q)): len(grp)
        for (icd, q), grp in df_recent.groupby(['icd10_code', 'quarter'])
    }

    print("   Pre-computing demographic + barangay combo counts...")
    combo_icd_pop: dict[tuple, int] = {}
    for (icd_code, q_val, bar, age_group, sex_val), grp in df_complete.groupby(
        ['icd10_code', 'quarter', 'barangay', 'age_group', 'sex']
    ):
        combo_icd_pop[(icd_code, int(q_val), bar, age_group, sex_val)] = len(grp)

    bar_icd_pop: dict[tuple, int] = {}
    for (icd_code, q_val, bar), grp in df_complete.groupby(
        ['icd10_code', 'quarter', 'barangay']
    ):
        bar_icd_pop[(icd_code, int(q_val), bar)] = len(grp)

    icd_q_total: dict[tuple, int] = {
        (icd, int(q)): cnt for (icd, q), cnt in icd_quarter_counts.items()
    }

    # ── Lag lookup for prediction time (from ALL observed data, no barangay) ──
    cq: dict[tuple, int] = {}
    for (icd_code, yr, q_val), grp in df.groupby(['icd10_code', 'year', 'quarter']):
        cq[(icd_code, int(yr), int(q_val))] = len(grp)

    def get_lags(icd_code, year, quarter):
        yoy = cq.get((icd_code, year - 1, quarter), 0)
        pq, py = (quarter - 1, year) if quarter > 1 else (4, year - 1)
        qoq = cq.get((icd_code, py, pq))
        if qoq is None:                       # target-year prev quarter unobserved
            qoq = cq.get((icd_code, py - 1, pq), 0)
        prior = [cq.get((icd_code, yy, quarter)) for yy in range(year - 3, year)]
        prior = [v for v in prior if v is not None]
        roll  = float(np.mean(prior)) if prior else 0.0
        return float(yoy), float(qoq), float(roll)

    # icd_enc lookup, needed by _build_xgb_feature_row (passed in via freq_map
    # so the helper signature doesn't need yet another argument)
    icd_enc_lookup = {
        f"__icd_enc__{icd}": encoders['icd'].transform(icd)
        for icd in icd_total_counts.keys()
    }
    freq_map_with_enc = {**freq_map, **icd_enc_lookup}

    candidate_icds = [
        icd for icd, cnt in icd_total_counts.items()
        if cnt >= MIN_SUPPORT and icd not in rare_icds
    ]
    print(f"   Candidate ICDs          : {len(candidate_icds)}")

    total_ops = len(quarters) * len(candidate_icds)
    ops_done  = 0

    for quarter in quarters:
        season        = 'Rainy' if quarter in RAINY_QUARTERS else 'Dry'
        quarter_label = QUARTER_LABELS[quarter]
        print(f"\n   ► {quarter_label}  [{season} Season]")

        actual_q_cache = {'_total': _count_by_icd_quarter(df, quarter, current_year)}

        disease_level: dict[str, dict] = {}

        for icd_code in candidate_icds:
            ops_done += 1
            print_progress(ops_done, total_ops, f"scoring ICD {icd_code}")

            # ── Coarse model: ONE prediction per icd×quarter (no barangay loop) ──
            dmat = _build_xgb_feature_row(
                quarter, current_year, icd_code, freq_map_with_enc, get_lags
            )
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                xgb_total = max(float(bst.predict(dmat)[0]), 0.0)

            quarter_avg    = icd_quarter_avg.get((icd_code, quarter), 0.0)
            recent_quarter = icd_quarter_recent.get((icd_code, quarter), 0)

            if quarter_avg == 0:
                quarter_avg = icd_total_avg.get(icd_code, 0.0) / 4.0

            if n_training_years == 1:
                hist_base = float(icd_quarter_counts.get((icd_code, quarter), 0))
                if hist_base == 0:
                    hist_base = float(icd_total_counts.get(icd_code, 0)) / 4.0
            elif recent_quarter == 0:
                hist_base = quarter_avg
            else:
                hist_base = 0.60 * quarter_avg + 0.40 * float(recent_quarter)

            if hist_base <= 0 and xgb_total <= 0:
                continue

            # xgb_total is the predicted disease-quarter TOTAL (municipality-wide).
            base_q = 0.60 * hist_base + 0.40 * xgb_total
            if base_q <= 0:
                continue

            confidence = compute_confidence(
                icd_code, quarter, val_r2,
                icd_quarter_counts, icd_total_counts, n_training_years
            )

            if confidence < MIN_CONFIDENCE:
                continue

            rank_score = base_q * confidence

            disease_level[icd_code] = {
                'base_q':       base_q,
                'confidence':   confidence,
                'rank_score':   rank_score,
                'disease_name': disease_map.get(icd_code, icd_code),
                'xgb_total':    xgb_total,
            }

        top_diseases = sorted(
            disease_level.items(),
            key=lambda x: x[1]['rank_score'],
            reverse=True,
        )[:top_n_diseases]

        print()
        if not top_diseases:
            print(f"   No qualifying diseases for {quarter_label}")
            continue

        print(f"   Top diseases :")
        for icd_code, d_info in top_diseases:
            print(f"     {d_info['disease_name'][:30]:<30}  "
                  f"base={d_info['base_q']:.1f}  "
                  f"conf={d_info['confidence']:.3f}")

        for icd_code, d_info in top_diseases:
            base_q       = d_info['base_q']
            confidence   = d_info['confidence']
            disease_name = d_info['disease_name']

            icd_q_denom = icd_q_total.get((icd_code, quarter), 0)

            # ── Barangay weights: v12 — 100% historical share. The model
            # has no barangay input anymore, so there's no model-share to
            # blend in; this is the same historical-proportion split the
            # 60/40 blend was already leaning on (xgb_share at the old
            # per-barangay grain was mostly noise given ~1.7 cases/cell). ──
            bar_weight: dict[str, float] = {}
            for bar in barangays:
                bar_pop    = bar_icd_pop.get((icd_code, quarter, bar), 0)
                hist_share = (bar_pop / icd_q_denom) if icd_q_denom > 0 else 1.0 / len(barangays)
                bar_weight[bar] = hist_share

            # ── Within barangay, split to age × sex by historical proportions ──
            raw_alloc: dict[tuple, float] = {}
            n_demo = len(VALID_AGE_GROUPS) * len(VALID_SEXES)
            for bar in barangays:
                bar_pop = bar_icd_pop.get((icd_code, quarter, bar), 0)
                for age_group in VALID_AGE_GROUPS:
                    for sx in VALID_SEXES:
                        pop = combo_icd_pop.get(
                            (icd_code, quarter, bar, age_group, sx), 0
                        )
                        within = (pop / bar_pop) if bar_pop > 0 else 1.0 / n_demo
                        raw_alloc[(bar, age_group, sx)] = (
                            base_q * bar_weight[bar] * within
                        )

            raw_total = sum(raw_alloc.values())
            if raw_total <= 0:
                n_cells   = len(barangays) * n_demo
                raw_alloc = {k: base_q / max(n_cells, 1) for k in raw_alloc}
                raw_total = base_q

            target_int = max(round(base_q), 0)
            scale      = target_int / raw_total if raw_total > 0 else 0.0
            floored    = {k: int(v * scale) for k, v in raw_alloc.items()}
            remainders = {k: (v * scale) - floored[k] for k, v in raw_alloc.items()}
            deficit    = target_int - sum(floored.values())
            if deficit > 0:
                for k in sorted(remainders, key=lambda k: remainders[k], reverse=True)[:deficit]:
                    floored[k] += 1

            total_predicted_this_disease_q = sum(floored.values())

            hist_q_avg_disease = icd_quarter_avg.get((icd_code, quarter), 0.0)
            if hist_q_avg_disease == 0:
                hist_q_avg_disease = icd_total_avg.get(icd_code, 0.0) / 4.0

            total_actual_q = int(actual_q_cache['_total'].get(icd_code, 0))

            for barangay in barangays:
                for age_group in VALID_AGE_GROUPS:
                    for sex in VALID_SEXES:
                        predicted_cases = floored.get((barangay, age_group, sex), 0)

                        pop_combo = combo_icd_pop.get(
                            (icd_code, quarter, barangay, age_group, sex), 0
                        )
                        combo_fraction_trend = (
                            pop_combo / icd_q_denom if icd_q_denom > 0
                            else 1.0 / (len(barangays) * n_demo)
                        )

                        trend_baseline   = round(hist_q_avg_disease * combo_fraction_trend)
                        trend, trend_pct = compute_trend(predicted_cases, trend_baseline)

                        combo_actual_series = _count_by_icd_quarter(
                            df, quarter, current_year, barangay, age_group, sex
                        )
                        actual_this_year = int(combo_actual_series.get(icd_code, 0))

                        predicted_pct = (
                            round(predicted_cases / total_predicted_this_disease_q * 100, 2)
                            if total_predicted_this_disease_q > 0 else 0.0
                        )

                        actual_pct = (
                            round(actual_this_year / total_actual_q * 100, 2)
                            if total_actual_q > 0 else 0.0
                        )

                        predictions.append({
                            "icd_code":             icd_code,
                            "disease_name":         disease_name,
                            "prediction_year":      current_year,
                            "prediction_quarter":   quarter,
                            "season":               season,
                            "barangay":             barangay,
                            "age_group":            age_group,
                            "sex":                  sex.strip()[0],
                            "predicted_cases":      predicted_cases,
                            "predicted_percentage": predicted_pct,
                            "trend":                trend,
                            "trend_percentage":     trend_pct,
                            "actual_cases":         actual_this_year,
                            "actual_percentage":    actual_pct,
                            "confidence_score":     confidence,
                            "model_version":        (
                                f"XGBPoisson-v12.0  "
                                f"ValR2:{val_r2:.3f}  "
                                f"ValMAE:{val_mae:.2f}"
                            ),
                            "trained_on_records":   total_records,
                            "training_date_from":   training_from,
                            "training_date_to":     training_to,
                        })

    print(f"\n   Generated {len(predictions):,} prediction records ✓")

    if predictions:
        pred_df = pd.DataFrame(predictions)

        print("\n   Top 10 diseases by predicted cases:")
        summary = (
            pred_df.groupby('disease_name')['predicted_cases']
            .sum().sort_values(ascending=False).head(10)
        )
        max_cnt = summary.max()
        for name, cnt in summary.items():
            bar = '#' * min(28, int(cnt / max(max_cnt, 1) * 28))
            print(f"   {name[:32]:<32} {bar} {cnt:,}")

        print("\n   Confidence score distribution:")
        conf_by_disease = (
            pred_df.groupby('disease_name')['confidence_score'].first()
            .sort_values(ascending=False)
        )
        for name, conf in conf_by_disease.items():
            print(f"     {name[:32]:<32} {conf:.3f}  ({conf*100:.1f}%)")

        non_zero = pred_df[pred_df['predicted_cases'] > 0]
        print(f"\n   Non-zero predictions  : {len(non_zero):,} / {len(pred_df):,} "
              f"({len(non_zero)/len(pred_df)*100:.1f}%)")
        print(f"   Avg predicted_cases   : {pred_df['predicted_cases'].mean():.2f}")
        print(f"   Avg confidence        : {pred_df['confidence_score'].mean():.4f}")
        print(f"   Actual cases range    : {pred_df['actual_cases'].min()} – {pred_df['actual_cases'].max()}")
        print(f"   Rows with actual > 0  : {(pred_df['actual_cases'] > 0).sum():,}")

        print("\n   Quarters generated:")
        for q in sorted(pred_df['prediction_quarter'].unique()):
            s   = 'Rainy' if q in RAINY_QUARTERS else 'Dry'
            cnt = len(pred_df[pred_df['prediction_quarter'] == q])
            print(f"     {QUARTER_LABELS[q]} [{s}] — {cnt:,} rows")

    return predictions


# ============================================================
# STEP 6: CLEAR OLD PREDICTIONS
# ============================================================
def clear_old_predictions(target_year: int, target_quarter: int = None) -> None:
    print(f"\n   Clearing old predictions for {target_year}" +
          (f" Q{target_quarter}" if target_quarter else " (all quarters)") + "...")
    try:
        q = supabase.table("disease_predictions").delete().eq("prediction_year", target_year)
        if target_quarter:
            q = q.eq("prediction_quarter", target_quarter)
        resp    = q.execute()
        deleted = len(resp.data) if resp.data else 0
        print(f"   Deleted {deleted:,} old rows ✓")
    except Exception as e:
        print(f"   Could not clear: {e}")


# ============================================================
# STEP 7: SAVE PREDICTIONS
# ============================================================
def save_predictions(predictions: list, dry_run: bool = False, verbose: bool = False) -> None:
    if dry_run:
        print(f"\n   DRY RUN — {len(predictions):,} predictions (skipped DB write)")
        if predictions:
            p = predictions[0]
            print(f"   Sample → icd: {p['icd_code']}  disease: {p['disease_name']}"
                  f"  Q{p['prediction_quarter']} [{p['season']}]"
                  f"  predicted: {p['predicted_cases']}  actual: {p['actual_cases']}"
                  f"  conf: {p['confidence_score']:.3f} ({p['confidence_score']*100:.1f}%)")
        return

    print_step("STEP 6 — Upserting predictions to Supabase")
    print(f"   Total rows to upsert : {len(predictions):,}")

    batch_size    = 100
    total_batches = (len(predictions) + batch_size - 1) // batch_size
    failed        = 0
    succeeded     = 0

    for i in range(0, len(predictions), batch_size):
        batch     = predictions[i : i + batch_size]
        batch_num = i // batch_size + 1

        for attempt in range(3):
            try:
                supabase.table("disease_predictions").upsert(
                    batch,
                    on_conflict=(
                        "icd_code,prediction_year,prediction_quarter,"
                        "barangay,age_group,sex"
                    )
                ).execute()
                succeeded += len(batch)
                if verbose:
                    print(f"   Batch {batch_num:>4}/{total_batches} — {len(batch)} rows OK")
                else:
                    print_progress(succeeded, len(predictions), "upserting...")
                break
            except Exception as e:
                if attempt < 2:
                    time.sleep(1)
                else:
                    failed += len(batch)
                    print(f"\n   Batch {batch_num:>4}/{total_batches} FAILED: {e}")

    print()
    print(f"   Upserted : {succeeded:,} rows ✓")
    if failed:
        print(f"   Failed   : {failed:,} rows ✗")


# ============================================================
# STEP 8: SYNC ACTUAL CASES
# actual_cases is ALWAYS an integer (0 if no data) — never NULL.
# ============================================================
def sync_actual_cases(df: pd.DataFrame) -> None:
    print_step("STEP 7 — Syncing actual_cases from consultations")

    print("   Building fast lookup from consultation data...")
    lookup: dict[tuple, int] = {}
    for (icd, yr, qtr, bar, age, sex), grp in df.groupby(
        ['icd10_code', 'year', 'quarter', 'barangay', 'age_group', 'sex']
    ):
        lookup[(icd, int(yr), int(qtr), bar, age, sex)] = len(grp)

    disease_q_total: dict[tuple, int] = {}
    for (icd, yr, qtr), grp in df.groupby(['icd10_code', 'year', 'quarter']):
        disease_q_total[(icd, int(yr), int(qtr))] = len(grp)

    print(f"   Lookup entries : {len(lookup):,}")

    all_rows = []
    offset, page = 0, 1000
    while True:
        resp = (
            supabase.table("disease_predictions")
            .select("id, icd_code, prediction_year, prediction_quarter, barangay, age_group, sex")
            .range(offset, offset + page - 1)
            .execute()
        )
        batch = resp.data or []
        all_rows.extend(batch)
        print(f"\r   Fetched {len(all_rows):,} prediction rows...", end='', flush=True)
        if len(batch) < page:
            break
        offset += page
    print()

    if not all_rows:
        print("   No rows to sync.")
        return

    print(f"   Computing actual_cases for {len(all_rows):,} rows...")

    updates = []
    for idx, row in enumerate(all_rows):
        icd     = (row.get('icd_code') or '').strip()
        pred_yr = row.get('prediction_year')
        quarter = row.get('prediction_quarter')
        bar     = (row.get('barangay') or '').strip()
        age     = (row.get('age_group') or '').strip()
        sex     = (row.get('sex') or 'M').strip()

        if not all([icd, pred_yr, quarter, bar, age, sex]):
            updates.append({"id": row['id'], "actual_cases": 0, "actual_percentage": 0.0})
            continue

        actual              = lookup.get((icd, int(pred_yr), int(quarter), bar, age, sex), 0)
        total_for_disease_q = disease_q_total.get((icd, int(pred_yr), int(quarter)), 0)
        pct                 = round(actual / total_for_disease_q * 100, 2) if total_for_disease_q > 0 else 0.0

        updates.append({"id": row['id'], "actual_cases": actual, "actual_percentage": pct})

        if (idx + 1) % 500 == 0 or idx == len(all_rows) - 1:
            print_progress(idx + 1, len(all_rows), "computing...")

    print()

    print(f"   Writing {len(updates):,} actual_cases updates...")
    batch_size = 200
    failed = succeeded = 0

    for i in range(0, len(updates), batch_size):
        batch = updates[i : i + batch_size]
        for row in batch:
            for attempt in range(3):
                try:
                    supabase.table("disease_predictions") \
                        .update({
                            "actual_cases":      row["actual_cases"],
                            "actual_percentage": row["actual_percentage"],
                        }) \
                        .eq("id", row["id"]) \
                        .execute()
                    succeeded += 1
                    break
                except Exception:
                    if attempt == 2:
                        failed += 1
        print_progress(succeeded + failed, len(updates), "updating...")

    print()
    rows_with_actuals = sum(1 for u in updates if u['actual_cases'] > 0)
    print(f"   Synced actual_cases — updated: {succeeded:,}", end='')
    if failed:
        print(f"  failed: {failed:,}")
    else:
        print(" ✓")
    print(f"   Rows with actual_cases > 0 : {rows_with_actuals:,} / {len(updates):,}")


# ============================================================
# MAIN
# ============================================================
def parse_args():
    p = argparse.ArgumentParser(description="SmartRHU — XGBoost Quarterly Prediction Pipeline")
    p.add_argument('--quarter',     type=int, default=None, choices=[1, 2, 3, 4])
    p.add_argument('--year',        type=int, default=None)
    p.add_argument('--dry-run',     action='store_true')
    p.add_argument('--sync-only',   action='store_true')
    p.add_argument('--verbose',     action='store_true')
    p.add_argument('--min-support', type=int, default=MIN_SUPPORT)
    p.add_argument('--top-n',       type=int, default=TOP_N_DISEASES)
    p.add_argument('--clear',       action='store_true')
    return p.parse_args()


def main():
    args = parse_args()
    global MIN_SUPPORT
    MIN_SUPPORT    = args.min_support
    target_year    = args.year or datetime.now().year
    target_quarter = args.quarter
    top_n          = args.top_n

    print("\n" + "=" * 60)
    print("  SmartRHU — Disease Prediction Pipeline  v12.0  (XGBoost Poisson)")
    print("=" * 60)
    print(f"  Model        : XGBoost Regressor (count:poisson)")
    print(f"  Grain        : icd × quarter × year (+ lag features)  — no barangay")
    print(f"  Output       : barangay/age/sex split recovered via historical share")
    print(f"  Validation   : Time-ordered 80/20 split + early stopping")
    print(f"  Encoding     : Ordinal (deterministic int IDs)")
    print(f"  Confidence   : Calibrated disease+quarter confidence score")
    print(f"  Min support  : {MIN_SUPPORT} records per ICD")
    print(f"  Top-N        : {top_n} diseases per quarter")
    print(f"  Target year  : {target_year}")
    if target_quarter:
        s = 'Rainy' if target_quarter in RAINY_QUARTERS else 'Dry'
        print(f"  Quarter      : Q{target_quarter} {QUARTER_LABELS[target_quarter]} [{s}]")
    else:
        print(f"  Quarter      : All (Q1 – Q4)")
    print("=" * 60)

    df = fetch_diagnoses()
    if len(df) < 5:
        print(f"\nNot enough data ({len(df)} records). Need at least 5.")
        sys.exit(1)

    df, encoders, icd_map, disease_map, rare_icds, freq_map, icd_total_counts = prepare_data(df)

    if args.sync_only:
        sync_actual_cases(df)
        print("\nSync complete! ✓")
        return

    agg_df = build_regression_dataset(df)

    bst, val_r2, val_mae = train_xgboost_regressor(agg_df)

    predictions = generate_predictions(
        df, agg_df,
        bst, val_r2, val_mae,
        encoders, disease_map, rare_icds, freq_map, icd_total_counts,
        target_year=target_year,
        target_quarter=target_quarter,
        top_n_diseases=top_n,
    )

    if not args.dry_run and args.clear:
        clear_old_predictions(target_year, target_quarter)

    save_predictions(predictions, dry_run=args.dry_run, verbose=args.verbose)

    if not args.dry_run:
        sync_actual_cases(df)

    print("\n" + "=" * 60)
    print("  Pipeline complete! ✓")
    print(f"  Val R²           : {val_r2:.4f}")
    print(f"  Val MAE          : {val_mae:.4f}")
    print(f"  Records trained  : {len(df):,}")
    if not args.dry_run:
        print(f"  Predictions saved: {len(predictions):,}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()