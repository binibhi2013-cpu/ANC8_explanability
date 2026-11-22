ANC8 NOTEBOOK 4 PROGRAMME REVIEW HANDOFF
========================================

Purpose
-------
Notebook 4 translates frozen ANC8+ analytical evidence into a programme-facing
review package.

It combines:
1. observed ANC attendance and conditional attainment patterns;
2. selected equity and contextual deep dives;
3. frozen held-out predictive-model performance;
4. frozen permutation and SHAP explainability evidence;
5. structured programme-review questions and guidance anchors.

Primary outcome
---------------
ANC8+ = attainment of eight or more ANC contacts.

Attendance profile
------------------
Final reported ANC contacts are grouped as:
- 0 contacts
- 1–3 contacts
- 4–7 contacts
- 8+ contacts

These categories describe final reported attainment. They do not identify
longitudinal dropout, missed appointments or exact discontinuation timing.

Core programme-review signals
-----------------------------
- Household wealth
- Travel time
- Region
- Early ANC initiation

Contextual signals
------------------
- Maternal occupation
- Religion
- Pregnancy intention

Evidence boundaries
-------------------
Observed subgroup patterns are descriptive associations.

Permutation importance, SHAP values and frozen model-response contrasts
describe fitted prediction-model behavior. They do not establish causal effects.

Programme-review cues are questions and options for further investigation.
They are not estimates of intervention effectiveness, programme rankings or
resource-allocation priorities.

Early ANC
---------
Early ANC initiation is strongly associated with ANC8+ attainment and is highly
prominent within the extended prediction models. However, paired confidence
intervals for incremental predictive-performance improvement include zero.

Travel time
-----------
Travel-time bands are descriptive empirical categories:
0–30, 31–60, 61–120 and >120 minutes.
They are not clinical thresholds.

Survey estimation
-----------------
Weights: v005 / 1e6
PSU: v021
Stratum: v022

Domain estimates preserve the complete PSU design frame.
Confidence intervals use the survey-design variance estimator implemented in
Notebook 4.

Directory structure
-------------------
dashboard_attendance/
    Attendance, equity, timing and regional aggregate outputs.

model_evidence/
    Frozen model performance, predictor-importance and SHAP summaries.

contextual_evidence/
    Selected maternal occupation, religion and pregnancy-intention deep dives.

programme_review/
    Evidence-to-review synthesis, signal roles, programme guidance and briefs.

support/
    Denominator, estimator and support diagnostics.

metadata/
    Export registry, export log and provenance metadata.

Data governance
---------------
Only aggregate/support tables explicitly approved by the Notebook 4 export
registry are included.

No individual-level analytic dataset, case identifier, raw survey weight,
PSU, stratum or raw ANC-contact variable is exported in this package.

Reproducibility
---------------
FINAL_MANIFEST_SHA256.csv contains SHA-256 checksums for the frozen handoff
files. Upstream Notebook 1, Notebook 2 and Notebook 3 manifest hashes and the
current raw EDHS source-file hash are recorded in
metadata/notebook4_provenance.json.
