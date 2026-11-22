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
    outputs/notebook4_programme_review/                 notebook 4 (all copied unchanged)
        dashboard_attendance/*.csv                       pathway, timing, wealth, travel, region
        contextual_evidence/*.csv                        occupation, religion, pregnancy intention
        model_evidence/paired_performance.csv            paired gains from adding early ANC
        model_evidence/nb4_shap_direction_panel.csv      SHAP direction, selected predictors
        programme_review/*.csv                           the study's own programme-review wording
        support/national_reference.csv                   national value of each stage
        printed_from_notebook/*.csv                      region x travel (cells 4.25A-G), saved by
                                                         scripts/extract_nb4_printed.py

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
NB4_ROOT = ROOT / "outputs" / "notebook4_programme_review"
NB4 = NB4_ROOT / "programme_review"

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


# --- notebook 4 --------------------------------------------------------------------------

# The five pathway stages notebook 4 reports, in order, with the file suffix it uses.
STAGES = [
    ("any_anc", "Any ANC", "all women"),
    ("anc4", "ANC4+ among ANC users", "women with any ANC"),
    ("anc8", "ANC8+ among ANC4+ women", "women with four or more contacts"),
    ("early_anc", "Early ANC (first visit by 12 weeks)", "women who started ANC"),
    ("early_anc8", "ANC8+ among early starters", "women whose first visit was by 12 weeks"),
]
# Each grouping variable: its folder, file prefix, and the suffix used for stage 3 and 5
# (the contextual files name them anc8_after4 and anc8_early).
EQUITY = [
    ("wealth", "Wealth", "dashboard_attendance", "wealth", {}),
    ("travel", "Travel time to nearest hospital or health centre", "dashboard_attendance", "travel", {}),
    ("occupation", "Maternal occupation", "contextual_evidence", "occupation",
     {"anc8": "anc8_after4", "early_anc8": "anc8_early"}),
    ("religion", "Religion", "contextual_evidence", "religion",
     {"anc8": "anc8_after4", "early_anc8": "anc8_early"}),
    ("intention", "Pregnancy intention", "contextual_evidence", "intention", {}),
]


def stage_rows(path: Path, skip_psu: bool = False) -> list[dict]:
    """A notebook 4 stage table: group, denominator n, [PSUs], numerator n, %, 95% CI."""
    out = []
    for r in read(path):
        v = list(r.values())
        if skip_psu:
            g, n, psu, k, p, lo, hi = v[:7]
        else:
            (g, n, k, p, lo, hi), psu = v[:6], None
        out.append({"level": g, "n": int(n), "k": int(k), "pct": f(p) / 100,
                    "ci": [f(lo) / 100, f(hi) / 100], **({"psus": int(psu)} if psu else {})})
    return out


def nb4() -> dict:
    d = NB4_ROOT / "dashboard_attendance"
    pathway = [
        {"stage": r["transition"], "eligible": r["eligible_population"], "n": int(r["eligible_unweighted_n"]),
         "k": int(r["attained_unweighted_n"]), "pct": f(r["weighted_attainment_percent"]) / 100,
         "ci": [f(r["ci_lower_percent"]) / 100, f(r["ci_upper_percent"]) / 100]}
        for r in read(d / "anc_pathway_reporting.csv")
    ]
    t8 = {r["timing_group"]: r for r in read(d / "timing_anc8_reporting.csv")}
    tp = {r["timing_group"]: r for r in read(d / "timing_pathway_reporting.csv")}
    timing = {
        g: {"n": int(t8[g]["unweighted_n"]),
            "anc8": f(t8[g]["anc8plus_percent"]) / 100,
            "anc8_ci": [f(t8[g]["ci_lower_percent"]) / 100, f(t8[g]["ci_upper_percent"]) / 100],
            "anc4": f(tp[g]["anc4plus_percent"]) / 100,
            "anc4_ci": [f(tp[g]["anc4plus_ci_lower"]) / 100, f(tp[g]["anc4plus_ci_upper"]) / 100],
            "anc8_after4": f(tp[g]["anc8_given_anc4_percent"]) / 100,
            "anc8_after4_ci": [f(tp[g]["anc8_given_anc4_ci_lower"]) / 100, f(tp[g]["anc8_given_anc4_ci_upper"]) / 100]}
        for g in ("Early initiation", "Later initiation")
    }
    equity = {}
    for key, label, folder, prefix, rename in EQUITY:
        stages = {}
        for s, _, _ in STAGES:
            p = NB4_ROOT / folder / f"{prefix}_{rename.get(s, s)}.csv"
            if p.exists():
                stages[s] = stage_rows(p)
        equity[key] = {"label": label, "stages": stages}
    regions: dict[str, dict] = {}
    for s, _, _ in STAGES:
        for r in stage_rows(d / f"region_{s}.csv", skip_psu=True):
            regions.setdefault(r.pop("level"), {})[s] = r
    gap_cols = {"any_anc": "Any ANC gap pp", "anc4": "ANC4+ gap pp", "anc8": "ANC8+ after ANC4 gap pp",
                "early_anc": "Early ANC gap pp", "early_anc8": "ANC8+ after early ANC gap pp"}
    for r in read(d / "regional_diagnostic.csv"):
        regions[r["Region"]]["gap_pp"] = {s: f(r[c]) for s, c in gap_cols.items()}
    nat = {r["Indicator"]: f(r["National %"]) / 100 for r in read(NB4_ROOT / "support" / "national_reference.csv")}
    national = dict(zip([s for s, _, _ in STAGES], [nat["Any ANC"], nat["ANC4+ among ANC users"], nat["ANC8+ among ANC4+"],
                                                    nat["Early ANC among ANC users"], nat["ANC8+ among early initiators"]]))
    pr = NB4_ROOT / "printed_from_notebook"
    travel = {
        "distribution": {r["Region"]: [f(r[c]) / 100 for c in list(r)[1:]] for r in read(pr / "region_travel_distribution.csv")},
        "n": {r["Region"]: [int(r[c]) for c in list(r)[1:]] for r in read(pr / "region_travel_n.csv")},
        "over60": {r["Region"]: f(r["Travel >60 min %"]) / 100 for r in read(pr / "region_travel_burden_pathway.csv")},
        "entry": {},
    }
    for r in read(pr / "region_extreme_travel_entry.csv"):
        travel["entry"].setdefault(r["Region"], {})[r["Travel group"]] = {
            "n": int(r["Resolved n"]), "psus": int(r["PSUs"]), "pct": f(r["Any ANC %"]) / 100,
            "ci": [f(r["95% CI lower"]) / 100, f(r["95% CI upper"]) / 100]}
    paired = {}
    for r in read(NB4_ROOT / "model_evidence" / "paired_performance.csv"):
        paired.setdefault(r["Algorithm"], {})[r["Metric"]] = [f(r["Point_estimate"]), f(r["CI_lower"]), f(r["CI_upper"])]
    direction4 = [
        {"population": r["population"], "label": r["predictor_label"], "category": r["category"],
         "n": int(r["n_women"]), "value": f(r["weighted_mean_signed_shap"])}
        for r in read(NB4_ROOT / "model_evidence" / "nb4_shap_direction_panel.csv")
    ]
    review = {
        "brief": read(NB4 / "programme_review_brief.csv"),
        "matrix": read(NB4 / "evidence_review_matrix.csv"),
        "core": read(NB4 / "core_programme_review.csv"),
        "overlays": read(NB4 / "contextual_overlays.csv"),
        "guidance": read(NB4 / "programme_guidance_register.csv"),
        "roles": read(NB4 / "signal_roles.csv"),
    }
    return {"stages": [{"key": s, "label": l, "of": o} for s, l, o in STAGES], "national": national,
            "pathway": pathway, "timing": timing, "equity": equity, "regions": regions,
            "region_travel": travel, "paired": paired, "direction": direction4, "review": review}


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
        "nb4": nb4(),
    }
    OUT.write_text(json.dumps(data, indent=1), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    for p in data["full_performance"]:
        print(f"  {p['model']:20s} AP {p['ap']:.3f}  AUROC {p['auroc']:.3f}  Brier {p['brier']:.3f}")


if __name__ == "__main__":
    main()
