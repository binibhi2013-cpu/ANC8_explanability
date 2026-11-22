"""Point the Predict screen at the study's own fitted ANC8+ models.

Inputs (both written by scripts/export_serving.py --v1 from the study's saved pipelines,
and both checked there against the study's published held-out predictions):

    app/models/v1_bundle.json.gz            full cohort: LR, RF, XGBoost on the 21 predictors
    app/models/v1_anc_entry_bundle.json.gz  ANC entry: the same three, without/with early_anc

Outputs (replacing the supervisor's refitted ANC1+/ANC4+/ANC8+ library):

    app/public/form_schema.json     questions and the model catalogue (ANC8+ only)
    app/public/browser_models.json  logistic models, scored in the browser
    app/public/data/trees/*.json.gz tree models, fetched by the browser when chosen

The question definitions (labels, options, defaults) are reused from the existing
form_schema.json; only the model list and the set of questions change. Performance
numbers come from the study's Table 1 and Table 2 files.

    python scripts/build_study_predict.py
"""

from __future__ import annotations

import csv
import gzip
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "app" / "models"
PUBLIC = ROOT / "app" / "public"
TREES = PUBLIC / "data" / "trees"
TABLES = ROOT / "outputs" / "publication_results" / "main_tables"

BROWSER_KINDS = {"logistic", "ebm"}
TREE_KINDS = {"forest", "xgboost"}


def load(path: Path) -> dict:
    if not path.exists():
        raise SystemExit(f"missing bundle: {path} (run scripts/export_serving.py --v1)")
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        return json.load(fh)


def table(name: str, key: str) -> dict[str, dict]:
    with open(TABLES / name, newline="", encoding="utf-8-sig") as fh:
        return {r[key]: r for r in csv.DictReader(fh)}


def fields_of(pre: dict) -> list[str]:
    return pre["numeric"] + pre.get("binary", []) + pre["categorical"] + pre.get("extra", [])


def main() -> None:
    old = json.loads((PUBLIC / "form_schema.json").read_text(encoding="utf-8"))
    old_fields = {f["name"]: f for f in old["fields"]}

    full = load(MODELS / "v1_bundle.json.gz")
    entry = load(MODELS / "v1_anc_entry_bundle.json.gz")
    t1 = table("Table_1_full_cohort_heldout_performance.csv", "Model")
    t2 = table("Table_2_anc_entry_probability_performance.csv", "Algorithm")

    models, used = [], set()
    browser = {"preprocessors": {}, "models": {}}
    trees: dict[str, dict] = {}

    def add(bundle_key, bundle, name, *, horizon, algorithm, set_label, ap, auroc, recommended):
        m = bundle["models"][name]
        pre = bundle["preprocessors"][m["preprocessor"]]
        asked = fields_of(pre)
        missing = [f for f in asked if f not in old_fields]
        if missing:
            raise SystemExit(f"{bundle_key}::{name} asks for questions with no definition: {missing}")
        used.update(asked)
        mid = f"{bundle_key}::{name}"
        in_browser = m["kind"] in BROWSER_KINDS
        tree_file = None
        if in_browser:
            browser["preprocessors"][mid] = pre
            browser["models"][mid] = {**m, "preprocessor": mid}
        elif m["kind"] in TREE_KINDS:
            t = trees.setdefault(bundle_key, {"preprocessors": {}, "models": {}})
            t["preprocessors"][mid] = pre
            t["models"][mid] = {**m, "preprocessor": mid}
            tree_file = f"/data/trees/{bundle_key}.json.gz"
        models.append({
            "id": mid, "bundle": bundle_key, "model": name, "outcome": "anc8plus", "horizon": horizon,
            "set": set_label, "algorithm": algorithm, "n_predictors": len(asked), "fields": asked,
            "heldout_AP": float(ap), "heldout_AUROC": float(auroc), "threshold": m.get("threshold"),
            "browser": in_browser, "trees": tree_file, "recommended": recommended,
            "headline": recommended, "note": "",
        })

    # Before ANC starts: the full-cohort models (manuscript Table 2 = file Table 1).
    for name in full["models"]:
        r = t1[name]
        add("v1", full, name, horizon="before", algorithm=name, set_label="21 predictors",
            ap=r["Weighted_AP"], auroc=r["Weighted_AUROC"], recommended=name == "Logistic regression")

    # At the first visit: the ANC-entry models (manuscript Table 3 = file Table 2).
    for name in entry["models"]:
        algo, spec = name.rsplit(" (", 1)
        spec = spec.rstrip(")")
        r = t2[algo]
        add("v1_anc_entry", entry, name, horizon="entry", algorithm=algo,
            set_label="21 predictors" + (" + early ANC" if spec == "Extended" else ""),
            ap=r[f"{spec}_Weighted_AP"], auroc=r[f"{spec}_Weighted_AUROC"],
            recommended=name == "Logistic regression (Extended)")

    schema = {
        "outcomes": {"anc8plus": "ANC8+"},
        "horizons": old["horizons"],
        "prevalence": {k: v for k, v in old.get("prevalence", {}).items() if k.startswith("anc8plus")},
        "fields": [f for f in old["fields"] if f["name"] in used],
        "models": models,
        "not_deployed": {},
    }
    (PUBLIC / "form_schema.json").write_text(json.dumps(schema, indent=1, ensure_ascii=False), encoding="utf-8")
    (PUBLIC / "browser_models.json").write_text(json.dumps(browser, ensure_ascii=False), encoding="utf-8")
    shutil.rmtree(TREES, ignore_errors=True)
    TREES.mkdir(parents=True)
    for key, t in trees.items():
        f = TREES / f"{key}.json.gz"
        f.write_bytes(gzip.compress(json.dumps(t, separators=(",", ":")).encode("utf-8"), mtime=0))
        print(f"wrote {f.relative_to(ROOT)} ({len(t['models'])} tree models, {f.stat().st_size / 1e6:.1f} MB)")
    print(f"form_schema.json: {len(schema['fields'])} questions, {len(models)} models (ANC8+ only)")
    for m in models:
        print(f"  {m['horizon']:6s} {m['model']:32s} AP {m['heldout_AP']:.3f}{'  browser' if m['browser'] else ''}")


if __name__ == "__main__":
    main()
