"""Save the region x travel-time results that notebook 4 printed but did not export.

Notebook 4 (4_ANC8_deployemet.ipynb), cells 4.25A-4.25H, prints these tables; they are not
in its export registry. This script reads the notebook's own saved cell output (no new
analysis, no access to the survey file) and writes them as CSV next to the exported tables:

    outputs/notebook4_programme_review/printed_from_notebook/
        region_travel_distribution.csv    4.25A  % of women in each travel band, by region
        region_travel_n.csv               4.25B  unweighted n in each band, by region
        region_travel_burden_pathway.csv  4.25C  % travelling >60 min against the pathway
        region_extreme_travel.csv         4.25E  % travelling >120 min (n, PSUs) and pathway
        region_extreme_travel_entry.csv   4.25G  any ANC at <=120 vs >120 min, with 95% CI

    python scripts/extract_nb4_printed.py "D:/.../ANC8/4_ANC8_deployemet.ipynb"
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "notebook4_programme_review" / "printed_from_notebook"
NUM = r"-?\d+(?:\.\d+)?"


def cell_text(nb: dict, title: str) -> str:
    """The printed output of the one code cell whose header names `title`."""
    hits = [c for c in nb["cells"] if c["cell_type"] == "code" and title in "".join(c["source"])[:400]]
    if len(hits) != 1:
        raise SystemExit(f"expected one cell titled {title!r}, found {len(hits)}")
    out = ""
    for o in hits[0].get("outputs", []):
        out += "".join(o.get("text", "")) or "".join(o.get("data", {}).get("text/plain", ""))
    return out


def rows(text: str, n_num: int, between: str | None = None) -> list[list[str]]:
    """Lines of the form '<region name> <n_num numbers>' (optionally a fixed label in between)."""
    mid = rf"\s+{re.escape(between)}" if between else ""
    pat = re.compile(rf"^\s*([A-Za-z][A-Za-z \-]*?){mid}" + rf"\s+({NUM})" * n_num + r"\s*$")
    return [[m.group(1).strip(), *m.groups()[1:]] for line in text.splitlines() if (m := pat.match(line))]


def write(name: str, header: list[str], data: list[list[str]], expect: int) -> None:
    if len(data) != expect:
        raise SystemExit(f"{name}: expected {expect} rows, parsed {len(data)}")
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerows(data)
    print(f"wrote {name} ({len(data)} rows)")


def main() -> None:
    nb = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    bands = ["0-30 min %", "31-60 min %", "61-120 min %", ">120 min %"]

    t = cell_text(nb, "4.25A REGION × TRAVEL-TIME DISTRIBUTION")
    write("region_travel_distribution.csv", ["Region", *bands], rows(t, 4), 14)

    t = cell_text(nb, "4.25B REGION × TRAVEL-TIME CELL SUPPORT").split("PSU SUPPORT")[0]
    write("region_travel_n.csv", ["Region", *[b.replace("%", "n") for b in bands]], rows(t, 4), 14)

    t = cell_text(nb, "4.25C REGIONAL TRAVEL BURDEN")
    write("region_travel_burden_pathway.csv",
          ["Region", "Travel >60 min %", "Any ANC %", "ANC4+ among ANC users %", "ANC8+ among ANC4+ %"], rows(t, 4), 14)

    t = cell_text(nb, "4.25E REGIONAL EXTREME TRAVEL BURDEN")
    write("region_extreme_travel.csv",
          ["Region", ">120 min %", ">120 min n", "PSUs", "Any ANC %", "ANC4+ among ANC users %", "ANC8+ among ANC4+ %"],
          rows(t, 6), 14)

    t = cell_text(nb, "4.25G EXTREME TRAVEL AND ANC ENTRY")
    data = [[r[0], g, *r[1:]] for g, part in (("<=120 min", rows(t, 5, "<=120 min")), (">120 min", rows(t, 5, ">120 min"))) for r in part]
    write("region_extreme_travel_entry.csv",
          ["Region", "Travel group", "Resolved n", "PSUs", "Any ANC %", "95% CI lower", "95% CI upper"], data, 8)


if __name__ == "__main__":
    main()
