WHAT-IF MODEL CONTRASTS FOR TOP PREDICTORS
==========================================
Created: 2026-11-23
Script: _app_export/scripts/what_if_top_predictors.py (seed 2026)

Inputs (read-only, not modified):
  outputs/notebook3_explainability_handoff/full_cohort_final_models.joblib
  outputs/notebook3_explainability_handoff/full_cohort_heldout.pkl (1375 held-out women)
  outputs/notebook3_explainability_handoff/full_cohort_feature_lineage.csv

Method (mirrors Notebook 3 table T8):
  For each contrast, one predictor is set to level A (then level B) for every
  held-out woman; all other predictors stay as observed. Each frozen pipeline
  (Logistic regression, Random Forest, XGBoost) predicts P(ANC8+), and the
  survey-weighted mean (weight = v005/1e6) is reported in percent.
  difference_pp = b_pct - a_pct (percentage points).
  95% CI: cluster bootstrap, PSUs (v021) resampled with replacement within
  strata (v022), 1000 replicates, seed 2026; predictions held fixed.
  observed_pct = weighted mean prediction with all predictors as observed.
  For region, level A is "as observed" (a_pct = observed_pct).

Interpretation:
  MODEL CONTRAST, NOT CAUSAL EFFECT. These numbers show how the fitted models
  respond when one input is changed, holding the others as observed. They do not
  estimate what would happen if the predictor were changed in reality.
