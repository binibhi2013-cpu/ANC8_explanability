"use client";

import { useState } from "react";
import DotRows from "@/components/charts/DotRows";
import RankedBars from "@/components/charts/RankedBars";
import {
  Cue, DataNote, InlineError, Note, Panel, PanelLoading, Screen, Segmented, StatTile, Table,
} from "@/components/studio/ui";
import { CUES } from "@/lib/cues";
import { useJSON } from "@/lib/data";
import { asset } from "@/lib/paths";

/**
 * Model analysis: the study's own results for ANC8+, copied from its saved tables
 * (scripts/build_study_data.py writes data/study.json). Nothing here is re-estimated.
 *
 *   Held-out performance   manuscript Table 2 (file Table_1_full_cohort_heldout_performance.csv)
 *   Calibration            manuscript Figure 2 (file Figure_1_full_cohort_calibration.png)
 *   First visit adds       manuscript Table 3 (file Table_2_anc_entry_probability_performance.csv)
 *   SHAP                   notebook 3 T2 (full cohort) and T5 (ANC entry), XGBoost
 *   Permutation            notebook 3 T1, all three models
 */

type Perf = {
  model: string; ap: number; ap_ci: [number, number]; auroc: number; auroc_ci: [number, number];
  brier: number; brier_ci: [number, number]; citl: number; slope: number; threshold: number;
  sensitivity: number; specificity: number; ppv: number; npv: number;
};
type Entry = {
  model: string;
  baseline: { ap: number; auroc: number; brier: number };
  extended: { ap: number; auroc: number; brier: number };
  delta_ap: number; delta_ap_ci: [number, number];
  delta_auroc: number; delta_auroc_ci: [number, number];
  brier_gain: number; brier_gain_ci: [number, number];
};
type Ranked = { rank: number; predictor: string; label: string; value: number; sd?: number };
type Study = {
  cohorts: { full: { n: number; heldout: number; development: number }; entry: { n: number; heldout: number; development: number } };
  prevalence: { full_heldout: number; entry_heldout: number; full: number };
  full_performance: Perf[];
  entry_performance: Entry[];
  full_shap: Ranked[];
  entry_shap: Ranked[];
  full_permutation: Record<string, Ranked[]>;
};

const n3 = (v: number) => v.toFixed(3);
const n2 = (v: number) => v.toFixed(2);
const pc = (v: number) => `${(v * 100).toFixed(1)}%`;
const sgn = (v: number, d = 3) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;
const ci = (c: [number, number], d = 3) => `${c[0].toFixed(d)}–${c[1].toFixed(d)}`;
const MODELS = ["Logistic regression", "Random Forest", "XGBoost"] as const;

export default function ModelAnalysisPage() {
  const study = useJSON<Study>("/data/study.json");
  const [shapCohort, setShapCohort] = useState<"full" | "entry">("full");
  const [permModel, setPermModel] = useState<(typeof MODELS)[number]>("XGBoost");

  if (study.state === "error") return <Screen><InlineError message={study.error} /></Screen>;
  if (!study.data) return <Screen><PanelLoading rows={8} /></Screen>;
  const S = study.data;
  const perf = S.full_performance;
  const aps = perf.map((p) => p.ap);
  const shap = shapCohort === "full" ? S.full_shap : S.entry_shap;
  const perm = S.full_permutation[permModel] ?? [];

  return (
    <Screen>
      <Note tone="accent">
        <span className="text-text font-semibold">ANC8+ only, our three models, our 21 predictors.</span> Every number on this
        screen is copied from the study&apos;s saved tables: the full cohort ({S.cohorts.full.n.toLocaleString("en-US")} women;{" "}
        {S.cohorts.full.heldout.toLocaleString("en-US")} held out) and the ANC-entry cohort ({S.cohorts.entry.n.toLocaleString("en-US")};{" "}
        {S.cohorts.entry.heldout} held out). Held-out women come from sampling clusters the models never saw.
      </Note>

      <div data-help="analysis.tiles" className="grid gap-10 grid-cols-1 sm:grid-cols-3">
        {perf.map((p) => (
          <StatTile key={p.model} label={p.model} value={n3(p.ap)} tone="accent"
            sub={<>average precision · 95% {ci(p.ap_ci, 2)} · AUROC {n3(p.auroc)} · Brier {n3(p.brier)}</>} />
        ))}
      </div>
      <Cue>{CUES.performance(Math.min(...aps), Math.max(...aps))}</Cue>

      <Panel help="analysis.vs-chance"
        title="Held-out performance · full cohort · ANC8+"
        how={`Manuscript Table 2. Survey-weighted on the ${S.cohorts.full.heldout.toLocaleString("en-US")} held-out women. Average precision: chance is the share who reached ANC8+ (${pc(S.prevalence.full_heldout)} in the held-out sample). Calibration-in-the-large below 0 means the model predicts more ANC8+ than observed; a slope of 1 is ideal. Sensitivity to NPV are at the threshold chosen on the development women.`}
      >
        <Table<Perf>
          rows={perf}
          rowKey={(r) => r.model}
          minWidth={900}
          columns={[
            { header: "Model", cell: (r) => r.model },
            { header: "Avg precision (95% CI)", mono: true, cell: (r) => <>{n3(r.ap)} <span className="text-faint">({ci(r.ap_ci)})</span></> },
            { header: "AUROC (95% CI)", mono: true, cell: (r) => <>{n3(r.auroc)} <span className="text-faint">({ci(r.auroc_ci)})</span></> },
            { header: "Brier", mono: true, cell: (r) => n3(r.brier) },
            { header: "Cal. in the large", mono: true, cell: (r) => n3(r.citl) },
            { header: "Cal. slope", mono: true, cell: (r) => n3(r.slope) },
            { header: "Sens.", mono: true, cell: (r) => pc(r.sensitivity) },
            { header: "Spec.", mono: true, cell: (r) => pc(r.specificity) },
            { header: "PPV", mono: true, cell: (r) => pc(r.ppv) },
            { header: "NPV", mono: true, cell: (r) => pc(r.npv) },
          ]}
        />
        <DotRows
          rows={perf.map((p) => ({
            key: p.model, label: p.model, values: { ap: p.ap }, lo: { ap: p.ap_ci[0] }, hi: { ap: p.ap_ci[1] }, display: n3(p.ap),
          }))}
          series={[{ key: "ap", label: "Average precision, 95% CI", color: "var(--accent)" }]}
          reference={{ value: S.prevalence.full_heldout, label: "Chance" }}
          domain={[0, 0.7]}
          format={n2}
          labelWidth={170}
        />
        <DataNote>
          XGBoost beat random forest on average precision and Brier score; its difference from logistic regression was
          uncertain (intervals include zero; supplementary Table S4).
        </DataNote>
      </Panel>

      <div className="grid gap-10 md:gap-14 xl:grid-cols-2">
        <Panel help="analysis.calibration"
          title="Calibration · full cohort"
          how="Manuscript Figure 2, as saved by the study. Points below the diagonal: the model predicted more ANC8+ than was observed. All three models overpredict overall."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/figures/study/Figure_1_full_cohort_calibration.png")}
            alt="Held-out calibration of logistic regression, random forest and XGBoost in the full cohort"
            className="w-full h-auto bg-white" />
        </Panel>

        <Panel help="analysis.first-visit"
          title="What early initiation adds · ANC entry"
          how={`Manuscript Table 3. The ${S.cohorts.entry.heldout} held-out women who started ANC, each model without and with whether the first visit was by 12 weeks. Differences with 95% intervals from the paired bootstrap.`}
        >
          <Table<Entry>
            rows={S.entry_performance}
            rowKey={(r) => r.model}
            minWidth={560}
            columns={[
              { header: "Model", cell: (r) => r.model },
              { header: "AP without → with", mono: true, cell: (r) => `${n3(r.baseline.ap)} → ${n3(r.extended.ap)}` },
              { header: "Gain in AP (95% CI)", mono: true, cell: (r) => <>{sgn(r.delta_ap)} <span className="text-faint">({sgn(r.delta_ap_ci[0])} to {sgn(r.delta_ap_ci[1])})</span></> },
              { header: "Gain in AUROC", mono: true, cell: (r) => <>{sgn(r.delta_auroc)} <span className="text-faint">({sgn(r.delta_auroc_ci[0])} to {sgn(r.delta_auroc_ci[1])})</span></> },
            ]}
          />
          <div className="px-14 py-10">
            <Note tone="accent">Every interval includes zero. The gain is consistent in direction but uncertain in size.</Note>
          </div>
        </Panel>
      </div>

      <div className="grid gap-10 md:gap-14 xl:grid-cols-2">
        <Panel help="analysis.learned"
          title="What the model leans on · SHAP (XGBoost)"
          how="Notebook 3 tables T2 (full cohort) and T5 (ANC entry, with early initiation). The bar is the survey-weighted mean absolute SHAP value on held-out women: how far, on average, the predictor moves the model's prediction (log-odds). Larger is more influential; it says nothing about cause."
          actions={<Segmented label="Cohort" options={[{ key: "full", label: "Full" }, { key: "entry", label: "Entry" }]} value={shapCohort} onChange={setShapCohort} />}
        >
          <RankedBars
            rows={shap.map((r) => ({
              key: r.predictor, label: `${r.rank}. ${r.label}`, value: r.value, display: n3(r.value),
              color: r.predictor === "early_anc" ? "var(--cross)" : r.rank <= 3 ? "var(--accent)" : "var(--faint)",
            }))}
            labelWidth={250}
          />
          <div className="px-14 pb-12">
            <Cue>{CUES.leadingPredictors}</Cue>
          </div>
        </Panel>

        <Panel help="analysis.permutation"
          title="Permutation importance · full cohort"
          how="Notebook 3 table T1 (manuscript Figure 4). Each predictor was shuffled 20 times on the held-out women; the bar is the mean drop in average precision. Region and wealth lead in all three models."
          actions={<Segmented label="Model" options={MODELS.map((m) => ({ key: m, label: m === "Logistic regression" ? "Logistic" : m === "Random Forest" ? "Forest" : m }))} value={permModel} onChange={setPermModel} />}
        >
          <RankedBars
            rows={perm.map((r) => ({
              key: r.predictor, label: `${r.rank}. ${r.label}`, value: r.value, display: n3(r.value),
              color: r.rank <= 3 ? "var(--accent)" : "var(--faint)",
            }))}
            labelWidth={250}
            signed={perm.some((r) => r.value < 0)}
          />
        </Panel>
      </div>
    </Screen>
  );
}
