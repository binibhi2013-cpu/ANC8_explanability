"""Vercel serverless function: score one woman with every deployed model.

POST /api/predict
    {"answers": {...}, "generations": ["v1"]}

    {"answers": {...}, "models": {"v1": ["XGBoost"]}}   one model

Bundles (the keys are file identifiers):
    v1             the study's own full-cohort ANC8+ models: logistic regression,
                   random forest and XGBoost on the 21 predictors, at one rung
    v1_anc_entry   the 21-predictor models of ANC8+ at ANC entry -- six models
                   for women who have already started ANC, with and without
                   early_anc

`models` limits scoring to the named models of each bundle; without it every
model of every bundle in `generations` is scored.

Returns every model's probability, its operating threshold and the resulting
classification.

Dependencies are numpy only (see app/api/_lib/scorer.py for why).
"""

from __future__ import annotations

import gzip
import json
import os
from http.server import BaseHTTPRequestHandler
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent / "_lib"))

import scorer  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"

# Heavy models are evaluated in the notebooks but may be excluded from the
# deployed bundle; this flag lets a build ship only what fits.
ENABLE_HEAVY = os.environ.get("ENABLE_HEAVY_MODELS", "0") == "1"

_CACHE: dict = {}

# Only these files are ever opened: the bundle key arrives in the request.
BUNDLES = ("v1", "v1_anc_entry")


def load_bundle(generation: str):
    """Load and cache a model bundle across warm invocations."""
    if generation not in BUNDLES:
        return None
    if generation in _CACHE:
        return _CACHE[generation]
    path = MODELS / f"{generation}_bundle.json.gz"
    if not path.exists():
        return None
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        _CACHE[generation] = json.load(fh)
    return _CACHE[generation]


def score_generation(generation: str, answers: dict, only=None) -> dict:
    bundle = load_bundle(generation)
    if bundle is None:
        return {"available": False, "reason": f"{generation} bundle not deployed"}

    names = [n for n in bundle["models"] if only is None or n in only]
    if only is not None:
        # The questions the chosen models ask, not the whole bundle's.
        expected = set()
        for n in names:
            pre = bundle["preprocessors"][bundle["models"][n]["preprocessor"]]
            expected |= set(pre["numeric"] + pre.get("binary", [])
                            + pre["categorical"] + pre.get("extra", []))
    else:
        expected = set(bundle["predictors"])
    supplied = {k for k, v in answers.items() if v not in (None, "")}
    imputed = sorted(expected - supplied)

    results = []
    for name in names:
        try:
            results.append(scorer.predict(bundle, name, answers))
        except Exception as exc:  # one bad model must not sink the response
            results.append({"model": name, "error": f"{type(exc).__name__}: {exc}"})

    return {
        "available": True,
        "models": results,
        "n_expected": len(expected),
        "n_supplied": len(supplied & expected),
        # Named explicitly so the UI can say which answers were filled in from
        # training medians rather than provided -- silently imputing and then
        # presenting a confident number would be misleading.
        "imputed": imputed,
        "champion": bundle.get("champion"),
    }


def build_response(payload: dict) -> dict:
    answers = payload.get("answers", {}) or {}
    only = payload.get("models") or {}
    generations = payload.get("generations") or list(only) or ["v1", "v1_anc_entry"]
    return {"result": {gen: score_generation(gen, answers, only.get(gen)) for gen in generations}}


class handler(BaseHTTPRequestHandler):
    def _send(self, code, body):
        raw = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        """Health check: which bundles this deployment actually has."""
        self._send(200, {
            "status": "ok",
            "bundles": {
                g: (MODELS / f"{g}_bundle.json.gz").exists()
                for g in BUNDLES
            },
            "heavy_models_enabled": ENABLE_HEAVY,
        })

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length") or 0)
            payload = json.loads(self.rfile.read(n) or b"{}")
        except Exception as exc:
            self._send(400, {"error": f"invalid JSON: {exc}"})
            return

        try:
            self._send(200, build_response(payload))
        except Exception as exc:
            self._send(500, {"error": f"{type(exc).__name__}: {exc}"})
