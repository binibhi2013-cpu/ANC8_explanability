"""Build app/public/data/study.json from the study's own saved outputs.

Every number in the file is copied from a table the study already produced; nothing
is re-estimated here. The sources (copied unchanged from the study folder):

    outputs/publication_results/main_tables/
        Table_1_full_cohort_heldout_performance.csv     manuscript Table 2
        Table_2_anc_entry_probability_performance.csv   manuscript Table 3
        Table_3_anc_entry_calibration_threshold_performance.csv
    outputs/notebook3_explainability_final/tables/
        T1_full_cohort_permutation.csv                   manuscript Figure 4
        T2_full_cohort_global_shap.csv                   manuscript Table 4 (full cohort)
        T3_full_cohort_category_direction.csv            SHAP direction by category
        T5_anc_entry_global_shap.csv                     manuscript Table 4 (ANC entry)
        T8_initiation_what_if_contrasts.csv              early vs later first visit
    outputs/notebook4_programme_review/programme_review/
        regional_review_cues.csv                         notebook 4 regional patterns

Run from the repository root:
    python scripts/build_study_data.py
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "public" / "data" / "study.json"

PUB = ROOT / "outputs" / "publication_results" / "main_tables"
NB3 = ROOT / "outputs" / "notebook3_explainability_final" / "tables"
NB4 = ROOT / "outputs" / "notebook4_programme_review" / "programme_review"

ALGORITHMS = ["Logistic regression", "Random Forest", "XGBoost"]


def read(path: Path) -> list[dict]:
    """Read a CSV (the study's files carry a byte-order mark) and fail loudly if absent."""
    if not path.exists():
        raise SystemExit(f"missing source table: {path}")
    with open(path, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        raise SystemExit(f"empty source table: {path}")
    return rows


def f(x: str) -> float:
    return float(x)


def full_cohort_performance() -> list[dict]:
    rows = {r["Model"]: r for r in read(PUB / "Table_1_full_cohort_heldout_performance.csv")}
    assert set(rows) == set(ALGORITHMS), f"unexpected models in Table 1: {sorted(rows)}"
    return [
        {
            "model": m,
            "ap": f(r["Weighted_AP"]), "ap_ci": [f(r["AP_CI_low"]), f(r["AP_CI_high"])],
            "auroc": f(r["Weighted_AUROC"]), "auroc_ci": [f(r["AUROC_CI_low"]), f(r["AUROC_CI_high"])],
            "brier": f(r["Weighted_Brier"]), "brier_ci": [f(r["Brier_CI_low"]), f(r["Brier_CI_high"])],
            "citl": f(r["CITL"]), "slope": f(r["Calibration_slope"]),
            "threshold": f(r["Threshold"]),
            "sensitivity": f(r["Sensitivity"]), "specificity": f(r["Specificity"]),
            "ppv": f(r["PPV"]), "npv": f(r["NPV"]),
        }
        for m, r in ((m, rows[m]) for m in ALGORITHMS)
    ]


def entry_performance() -> list[dict]:
    rows = {r["Algorithm"]: r for r in read(PUB / "Table_2_anc_entry_probability_performance.csv")}
    out = []
    for m in ALGORITHMS:
        r = rows[m]
        out.append({
            "model": m,
            "baseline": {"ap": f(r["Baseline_Weighted_AP"]), "auroc": f(r["Baseline_Weighted_AUROC"]),
                         "brier": f(r["Baseline_Weighted_Brier"])},
            "extended": {"ap": f(r["Extended_Weighted_AP"]), "auroc": f(r["Extended_Weighted_AUROC"]),
                         "brier": f(r["Extended_Weighted_Brier"])},
            "delta_ap": f(r["Delta_AP"]), "delta_ap_ci": [f(r["Delta_AP_CI_lower"]), f(r["Delta_AP_CI_upper"])],
            "delta_auroc": f(r["Delta_AUROC"]),
            "delta_auroc_ci": [f(r["Delta_AUROC_CI_lower"]), f(r["Delta_AUROC_CI_upper"])],
            "brier_gain": f(r["Brier_improvement"]),
            "brier_gain_ci": [f(r["Brier_improvement_CI_lower"]), f(r["Brier_improvement_CI_upper"])],
        })
    return out


def shap(path: Path) -> list[dict]:
    rows = read(path)
    return sorted(
        ({"rank": int(r["rank"]), "predictor": r["predictor"], "label": r["predictor_label"],
          "value": f(r["weighted_mean_absolute_shap"]), "algorithm": r["algorithm"],
          "specification": r.get("specification", "")}
         for r in rows),
        key=lambda r: (r["algorithm"], r["rank"]),
    )


def permutation() -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {m: [] for m in ALGORITHMS}
    for r in read(NB3 / "T1_full_cohort_permutation.csv"):
        out[r["algorithm"]].append({
            "rank": int(r["rank"]), "predictor": r["predictor"], "label": r["predictor_label"],
            "value": f(r["mean_ap_decrease"]), "sd": f(r["sd_ap_decrease"]),
        })
    for m in out:
        out[m].sort(key=lambda r: r["rank"])
        assert len(out[m]) == 21, f"{m}: expected 21 predictors, got {len(out[m])}"
    return out


def direction() -> list[dict]:
    return [
        {"predictor": r["predictor"], "label": r["predictor_label"], "category": r["category"],
         "n": int(r["n_women"]), "value": f(r["weighted_mean_signed_shap"])}
        for r in read(NB3 / "T3_full_cohort_category_direction.csv")
    ]


def what_if() -> list[dict]:
    return [
        {"model": r["algorithm"], "later": f(r["weighted_mean_p_later"]), "early": f(r["weighted_mean_p_early"]),
         "difference_pp": f(r["weighted_mean_difference_pp"])}
        for r in read(NB3 / "T8_initiation_what_if_contrasts.csv")
    ]


def regional_cues() -> dict[str, dict]:
    return {
        r["Region"]: {"pattern": r["Observed pattern"], "question": r["Programme-review question"]}
        for r in read(NB4 / "regional_review_cues.csv")
    }


def main() -> None:
    full_shap = [r for r in shap(NB3 / "T2_full_cohort_global_shap.csv") if r["algorithm"] == "XGBoost"]
    assert len(full_shap) == 21, "T2 should rank all 21 predictors"
    data = {
        "source": "The study's own saved outputs (notebooks 2-4); copied, not re-estimated.",
        "cohorts": {"full": {"n": 6893, "heldout": 1375, "development": 5518},
                    "entry": {"n": 5001, "heldout": 984, "development": 4017}},
        "prevalence": {"full_heldout": 0.160, "entry_heldout": 0.209, "full": 0.192},
        "full_performance": full_cohort_performance(),
        "entry_performance": entry_performance(),
        "full_shap": full_shap,
        "entry_shap": [r for r in shap(NB3 / "T5_anc_entry_global_shap.csv")
                       if r["algorithm"] == "XGBoost" and r["specification"] == "Extended"],
        "full_permutation": permutation(),
        "direction": direction(),
        "what_if": what_if(),
        "regional_cues": regional_cues(),
    }
    OUT.write_text(json.dumps(data, indent=1), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    for p in data["full_performance"]:
        print(f"  {p['model']:20s} AP {p['ap']:.3f}  AUROC {p['auroc']:.3f}  Brier {p['brier']:.3f}")


if __name__ == "__main__":
    main()
