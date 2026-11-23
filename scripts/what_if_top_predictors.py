"""
What-if model contrasts for the top predictors (dashboard support).

Method (mirrors Notebook 3, T8 early-ANC contrast):
  For each contrast, set ONE predictor to a fixed level for every held-out woman,
  keep all other predictors as observed, predict P(ANC8+) with each frozen
  full-cohort pipeline, and take the survey-weighted mean predicted probability.
  Difference = mean(B) - mean(A), in percentage points.
  95% CI for the difference: cluster bootstrap (resample PSUs v021 with
  replacement within strata v022), 1,000 replicates, seed 2026.

This is a MODEL CONTRAST (how the fitted models respond), NOT a causal effect.

READ-ONLY on all existing inputs: no model is refitted or modified.
Writes only outputs/dashboard_what_if/what_if_top_predictors.csv and README.txt.

Run with: C:\\Users\\bini_\\anaconda3\\python.exe _app_export\\scripts\\what_if_top_predictors.py
(from the ANC8 project folder)
"""
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

SEED = 2026
N_BOOT = 1000

ROOT = Path(__file__).resolve().parents[2]
HANDOFF = ROOT / "outputs" / "notebook3_explainability_handoff"
OUT_DIR = ROOT / "outputs" / "dashboard_what_if"

MODELS_PATH = HANDOFF / "full_cohort_final_models.joblib"
HELDOUT_PATH = HANDOFF / "full_cohort_heldout.pkl"
LINEAGE_PATH = HANDOFF / "full_cohort_feature_lineage.csv"

OBSERVED = "__observed__"  # sentinel: leave the predictor as observed

# (predictor, level A, level B). Numeric levels are in the predictor's own units.
CONTRASTS = [
    ("wealth_quintile", "Poorest", "Richest"),
    ("travel_time_min", 150, 15),
    ("region", OBSERVED, "Addis Ababa"),
    ("pregnancy_intention", "Wanted no more", "Wanted then"),
    ("maternal_occupation_group", "Not working", "Professional/clerical"),
    ("partner_education", "No education", "Higher"),
    ("traditional_media_weekly_count", 0, 3),
]


def main():
    # ---- Inputs: stop if anything is missing -------------------------------
    for p in (MODELS_PATH, HELDOUT_PATH, LINEAGE_PATH):
        if not p.exists():
            raise FileNotFoundError(f"Missing input: {p}")

    models = joblib.load(MODELS_PATH)
    heldout = pd.read_pickle(HELDOUT_PATH)
    lineage = pd.read_csv(LINEAGE_PATH)

    # Survey design: weight = v005 / 1e6, PSU = v021, strata = v022
    weights = heldout["v005"].to_numpy() / 1e6
    psu = heldout["v021"].to_numpy()
    strata = heldout["v022"].to_numpy()
    n = len(heldout)
    print(f"Held-out women: {n}; sum of weights: {weights.sum():.3f}")
    assert np.all(weights > 0), "Non-positive survey weights found"
    if "survey_weight" in heldout:
        assert np.allclose(heldout["survey_weight"], weights), "survey_weight != v005/1e6"

    # ---- Level checks -------------------------------------------------------
    for predictor, level_a, level_b in CONTRASTS:
        rows = lineage[lineage["Original_predictor"] == predictor]
        if rows.empty:
            raise ValueError(f"{predictor} not in feature lineage")
        block = rows["Preprocessing_block"].iloc[0]
        for level in (level_a, level_b):
            if level == OBSERVED:
                continue
            if block == "categorical":
                # Category must exist in every fitted encoder's training categories
                for name, pipe in models.items():
                    pre = pipe.named_steps["preprocessor"]
                    enc = pre.named_transformers_["categorical"]
                    enc = enc[-1] if hasattr(enc, "steps") else enc
                    cols = list(pre.transformers_[[t[0] for t in pre.transformers_].index("categorical")][2])
                    cats = list(enc.categories_[cols.index(predictor)])
                    if level not in cats:
                        raise ValueError(f"[{name}] level '{level}' not in training categories of {predictor}: {cats}")
            else:
                lo, hi = heldout[predictor].min(), heldout[predictor].max()
                if not (lo <= level <= hi):
                    raise ValueError(f"{predictor}={level} outside observed range [{lo}, {hi}]")
                if predictor == "traditional_media_weekly_count" and level == level_b and hi != level_b:
                    raise ValueError(f"Observed max of {predictor} is {hi}, not {level_b}")

    # ---- Per-woman predictions (fixed; bootstrap only resamples women) ------
    def predict(pipe, X):
        p = pipe.predict_proba(X)[:, 1]
        assert np.all((p >= 0) & (p <= 1)) and not np.isnan(p).any(), "Predictions outside [0,1]"
        return p

    def set_level(predictor, level):
        X = heldout.copy()
        if level != OBSERVED:
            X[predictor] = pd.Series([level] * n, index=X.index).astype(heldout[predictor].dtype)
        return X

    # ---- Cluster bootstrap index sets (shared across contrasts/models) -----
    rng = np.random.default_rng(SEED)
    strata_psus = {s: np.unique(psu[strata == s]) for s in np.unique(strata)}
    psu_rows = {(s, c): np.where((strata == s) & (psu == c))[0] for s, cs in strata_psus.items() for c in cs}
    boot_idx = []
    for _ in range(N_BOOT):
        idx = []
        for s, cs in strata_psus.items():
            for c in rng.choice(cs, size=len(cs), replace=True):
                idx.append(psu_rows[(s, c)])
        boot_idx.append(np.concatenate(idx))

    def wmean(p, idx=None):
        if idx is None:
            return np.average(p, weights=weights)
        return np.average(p[idx], weights=weights[idx])

    rows = []
    for model_name, pipe in models.items():
        p_obs = predict(pipe, heldout)
        for predictor, level_a, level_b in CONTRASTS:
            p_a = p_obs if level_a == OBSERVED else predict(pipe, set_level(predictor, level_a))
            p_b = p_obs if level_b == OBSERVED else predict(pipe, set_level(predictor, level_b))
            diff = p_b - p_a
            boot = np.array([wmean(diff, i) for i in boot_idx]) * 100
            rows.append({
                "predictor": predictor,
                "level_a": "as observed" if level_a == OBSERVED else level_a,
                "level_b": "as observed" if level_b == OBSERVED else level_b,
                "model": model_name,
                "observed_pct": 100 * wmean(p_obs),
                "a_pct": 100 * wmean(p_a),
                "b_pct": 100 * wmean(p_b),
                "difference_pp": 100 * wmean(diff),
                "diff_ci_low": np.percentile(boot, 2.5),
                "diff_ci_high": np.percentile(boot, 97.5),
                "n_heldout": n,
            })

    out = pd.DataFrame(rows)
    # Order rows by contrast (as listed above), then model
    order = {c[0]: i for i, c in enumerate(CONTRASTS)}
    out = out.assign(_o=out["predictor"].map(order)).sort_values(["_o", "model"], kind="stable")
    out = out.drop(columns="_o").reset_index(drop=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUT_DIR / "what_if_top_predictors.csv", index=False)

    (OUT_DIR / "README.txt").write_text(
        f"""WHAT-IF MODEL CONTRASTS FOR TOP PREDICTORS
==========================================
Created: {date.today().isoformat()}
Script: _app_export/scripts/what_if_top_predictors.py (seed {SEED})

Inputs (read-only, not modified):
  outputs/notebook3_explainability_handoff/full_cohort_final_models.joblib
  outputs/notebook3_explainability_handoff/full_cohort_heldout.pkl ({n} held-out women)
  outputs/notebook3_explainability_handoff/full_cohort_feature_lineage.csv

Method (mirrors Notebook 3 table T8):
  For each contrast, one predictor is set to level A (then level B) for every
  held-out woman; all other predictors stay as observed. Each frozen pipeline
  (Logistic regression, Random Forest, XGBoost) predicts P(ANC8+), and the
  survey-weighted mean (weight = v005/1e6) is reported in percent.
  difference_pp = b_pct - a_pct (percentage points).
  95% CI: cluster bootstrap, PSUs (v021) resampled with replacement within
  strata (v022), {N_BOOT} replicates, seed {SEED}; predictions held fixed.
  observed_pct = weighted mean prediction with all predictors as observed.
  For region, level A is "as observed" (a_pct = observed_pct).

Interpretation:
  MODEL CONTRAST, NOT CAUSAL EFFECT. These numbers show how the fitted models
  respond when one input is changed, holding the others as observed. They do not
  estimate what would happen if the predictor were changed in reality.
""", encoding="utf-8")

    print(out.to_string())
    print(f"\nWrote {OUT_DIR / 'what_if_top_predictors.csv'} and README.txt")


if __name__ == "__main__":
    main()
