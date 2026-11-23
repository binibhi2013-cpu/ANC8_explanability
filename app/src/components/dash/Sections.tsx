"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, FlaskConical, Sparkles, Timer, TrendingUp, Upload } from "lucide-react";
import { asset } from "@/lib/paths";
import { pct, type StudyJSON, useDash } from "@/lib/dash";
import { Bar, Card, Insight, Section, Seg } from "./kit";

const n3 = (v: number) => v.toFixed(3);
const ci3 = (c: [number, number]) => `${c[0].toFixed(3)} to ${c[1].toFixed(3)}`;
const MODELS = ["Logistic regression", "Random Forest", "XGBoost"] as const;
const SHORT: Record<string, string> = { "Logistic regression": "Logistic regression", "Random Forest": "Random forest", XGBoost: "XGBoost" };

// ---- 3 · Early ANC ---------------------------------------------------------------------

export function EarlyAnc({ study }: { study: StudyJSON }) {
  const d = useDash();
  const t = study.nb4.timing;
  const E = t["Early initiation"], L = t["Later initiation"];
  const xgb = study.what_if.find((w) => w.model === "XGBoost")!;
  const rows = [
    { k: "anc4", label: "Reached ANC4+", e: E.anc4, eci: E.anc4_ci, l: L.anc4, lci: L.anc4_ci },
    { k: "anc8", label: "Reached ANC8+", e: E.anc8, eci: E.anc8_ci, l: L.anc8, lci: L.anc8_ci },
    { k: "after4", label: "ANC8+ among those with four", e: E.anc8_after4, eci: E.anc8_after4_ci, l: L.anc8_after4, lci: L.anc8_after4_ci },
  ];
  const reg = d.region ? study.nb4.regions[d.region] : null;
  return (
    <Section id="early" n={3} title="Early ANC: does an early first visit help?"
      lead={<>Among the 5,001 women who started ANC, {pct(study.nb4.national.early_anc)} had their first visit by 12 weeks, as the WHO recommends.
        This section compares them with women who started later.</>}>
      <div className="grid gap-14 xl:grid-cols-2">
        <Card help="dash.early-observed" title="What women actually did"
          sub={`Early starters (${E.n.toLocaleString("en-US")} women) against later starters (${L.n.toLocaleString("en-US")})`}
          info="Survey-weighted shares with 95% confidence intervals, notebook 4. An observed difference: early starters may also differ in wealth, distance and care-seeking.">
          <div className="flex items-center gap-14 text-12.5 text-dim">
            <span className="flex items-center gap-6"><span className="size-12 rounded-[2px] bg-accent" /> First visit by 12 weeks</span>
            <span className="flex items-center gap-6"><span className="size-12 rounded-[2px] bg-border2" /> Later first visit</span>
          </div>
          {rows.map((r) => (
            <div key={r.k} className="flex flex-col gap-2">
              <div className="text-13 font-semibold">{r.label}</div>
              <Bar label="Early" value={r.e} ci={r.eci} display={pct(r.e)} />
              <Bar label="Later" value={r.l} ci={r.lci} display={pct(r.l)} color="var(--border2)" />
            </div>
          ))}
          <div className="mt-auto flex flex-col gap-8">
            <Insight icon={TrendingUp} tone="good">
              {pct(E.anc8)} of early starters reached eight contacts, against {pct(L.anc8)} of later starters: about {(E.anc8 / L.anc8).toFixed(1)} times as many.
            </Insight>
            <Insight icon={Timer} tone="warn">
              Yet {pct(1 - E.anc8)} of early starters still did not reach eight, so an early start alone is not enough.
            </Insight>
            {reg?.early_anc && (
              <Insight icon={Timer}>
                In {d.region}, {pct(reg.early_anc.pct)} of women who started ANC started early
                {reg.early_anc8 ? <>, and {pct(reg.early_anc8.pct)} of them reached ANC8+</> : null}.
              </Insight>
            )}
          </div>
        </Card>

        <Card help="dash.early-model" title="What our model predicts"
          sub="XGBoost, ANC-entry cohort: the same women, first visit set to early and then to later"
          info="Notebook 3 table T8. Each held-out woman is scored twice with only the timing of her first visit changed; the bars are the survey-weighted mean predictions. This is how the model responds, not the effect of an intervention.">
          <div className="grid grid-cols-2 gap-12">
            <div className="rounded-[6px] bg-panel2 border border-border p-14">
              <div className="text-13 text-dim">All set to a later first visit</div>
              <div className="font-mono text-30 font-semibold">{pct(xgb.later)}</div>
              <div className="text-12.5 text-dim">predicted to reach ANC8+</div>
            </div>
            <div className="rounded-[6px] bg-soft border border-accent p-14">
              <div className="text-13 text-dim">All set to an early first visit</div>
              <div className="font-mono text-30 font-semibold text-accent">{pct(xgb.early)}</div>
              <div className="text-12.5 text-dim">predicted to reach ANC8+</div>
            </div>
          </div>
          <div className="text-center font-mono text-21 font-semibold text-good">+{xgb.difference_pp.toFixed(1)} percentage points</div>
          <div className="flex flex-col gap-8">
            <Insight icon={Sparkles}>
              Of all 22 predictors in the entry model, early ANC carries the most weight (SHAP rank 1), ahead of wealth and travel time.
            </Insight>
            <p className="text-12.5 text-dim">Model contrast, not an effect: an early first visit may also mark better access and care-seeking.
              Logistic regression and random forest give +{study.what_if[0].difference_pp.toFixed(0)} and +{study.what_if[1].difference_pp.toFixed(0)} points (see Models).</p>
          </div>
        </Card>
      </div>
    </Section>
  );
}

// ---- 4 · Models -------------------------------------------------------------------------

export function Models({ study }: { study: StudyJSON }) {
  const d = useDash();
  const [permModel, setPermModel] = useState<(typeof MODELS)[number]>("XGBoost");
  const perf = study.full_performance;
  const chance = study.prevalence.full_heldout;
  const shap = (d.cohort === "entry" ? study.entry_shap : study.full_shap).slice(0, 10);
  const perm = (study.full_permutation[permModel] ?? []).slice(0, 10);
  const best = perf.reduce((a, b) => (b.ap > a.ap ? b : a));
  const th = "text-12 font-medium text-dim text-right px-8 py-6 whitespace-nowrap";
  const td = "font-mono text-13 text-right px-8 py-6 whitespace-nowrap";
  return (
    <Section id="models" n={4} title="Our three models"
      lead={<>Logistic regression, random forest and XGBoost, each on the same 21 predictors, trained on {study.cohorts.full.development.toLocaleString("en-US")} women
        and tested on {study.cohorts.full.heldout.toLocaleString("en-US")} held-out women from survey clusters the models never saw.</>}>
      <Card help="dash.performance" title="How well each model predicts ANC8+ · held-out women, full cohort"
        sub={`Average precision: chance is ${pct(chance)}, the share of held-out women who reached ANC8+`}
        info="Manuscript Table 2. Survey-weighted, 95% confidence intervals by cluster bootstrap. Calibration in the large below 0 means the model predicts more ANC8+ than observed; a slope of 1 is ideal. Sensitivity to NPV are at the threshold chosen on the development women.">
        <div className="flex flex-col gap-4">
          {perf.map((p) => (
            <Bar key={p.model} label={SHORT[p.model]} value={p.ap} ci={p.ap_ci} max={0.7} reference={chance}
              display={n3(p.ap)} color={p.model === best.model ? "var(--accent)" : "var(--accent2)"} />
          ))}
          <div className="text-12 text-dim pl-[180px]">Dashed line: chance ({n3(chance)}). Lines across bars: 95% CI.</div>
        </div>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-border">
                <th className={`${th} text-left`}>Model</th>
                <th className={th}>Avg precision (95% CI)</th>
                <th className={th}>AUROC (95% CI)</th>
                <th className={th}>Brier (95% CI)</th>
                <th className={th}>Calibration in the large</th>
                <th className={th}>Slope</th>
                <th className={th}>Sensitivity</th>
                <th className={th}>Specificity</th>
                <th className={th}>PPV</th>
                <th className={th}>NPV</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((p) => (
                <tr key={p.model} className={`border-b border-border ${p.model === best.model ? "bg-soft" : ""}`}>
                  <td className="text-13 px-8 py-6 font-semibold whitespace-nowrap">{SHORT[p.model]}</td>
                  <td className={td}>{n3(p.ap)} <span className="text-faint text-12">({ci3(p.ap_ci)})</span></td>
                  <td className={td}>{n3(p.auroc)} <span className="text-faint text-12">({ci3(p.auroc_ci)})</span></td>
                  <td className={td}>{n3(p.brier)} <span className="text-faint text-12">({ci3(p.brier_ci)})</span></td>
                  <td className={td}>{n3(p.citl)}</td>
                  <td className={td}>{n3(p.slope)}</td>
                  <td className={td}>{pct(p.sensitivity, 1)}</td>
                  <td className={td}>{pct(p.specificity, 1)}</td>
                  <td className={td}>{pct(p.ppv, 1)}</td>
                  <td className={td}>{pct(p.npv, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Insight icon={FlaskConical}>
          All three models find women who reach ANC8+ well above chance (average precision {n3(Math.min(...perf.map((p) => p.ap)))} to {n3(best.ap)} against {n3(chance)}).
          XGBoost scored highest; its difference from logistic regression is uncertain. All three predict more ANC8+ than observed, so they need recalibration before use.
        </Insight>
      </Card>

      <div className="grid gap-14 xl:grid-cols-2">
        <Card help="dash.entry-gain" title="What the first visit adds · ANC-entry cohort"
          sub="Each model without and with early ANC, same women, same predictors otherwise"
          info="Manuscript Table 3 and notebook 4 paired comparison: differences with 95% confidence intervals from paired cluster bootstrap on the held-out ANC-entry women.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border">
                  <th className={`${th} text-left`}>Model</th>
                  <th className={th}>AP without</th>
                  <th className={th}>AP with</th>
                  <th className={th}>Change in AP (95% CI)</th>
                  <th className={th}>Change in AUROC (95% CI)</th>
                </tr>
              </thead>
              <tbody>
                {study.entry_performance.map((e) => (
                  <tr key={e.model} className="border-b border-border">
                    <td className="text-13 px-8 py-6 font-semibold whitespace-nowrap">{SHORT[e.model]}</td>
                    <td className={td}>{n3(e.baseline.ap)}</td>
                    <td className={td}>{n3(e.extended.ap)}</td>
                    <td className={td}>+{n3(e.delta_ap)} <span className="text-faint text-12">({ci3(e.delta_ap_ci)})</span></td>
                    <td className={td}>+{n3(e.delta_auroc)} <span className="text-faint text-12">({ci3(e.delta_auroc_ci)})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Insight icon={TrendingUp}>
            Adding early ANC raised every model&apos;s average precision a little, but every interval includes zero: the first visit adds modestly to prediction.
          </Insight>
        </Card>

        <Card help="dash.calibration" title="Calibration · full cohort" sub="Predicted against observed ANC8+, by risk group"
          info="Manuscript Figure 2, as saved by the study. Points below the diagonal: the model predicted more ANC8+ than was observed.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/figures/study/Figure_1_full_cohort_calibration.png")}
            alt="Held-out calibration of logistic regression, random forest and XGBoost in the full cohort" className="max-h-[360px] w-auto max-w-full mx-auto bg-white rounded-[4px]" />
        </Card>
      </div>

      <div className="grid gap-14 xl:grid-cols-2">
        <Card help="dash.shap" title={`What XGBoost leans on · ${d.cohort === "entry" ? "ANC-entry cohort" : "full cohort"}`}
          sub="Top 10 predictors by mean absolute SHAP value · follows the cohort slicer"
          info="Notebook 3 tables T2 and T5. How far, on average, each predictor moves the prediction for a held-out woman (log-odds). Larger is more influential; it says nothing about cause.">
          <div>
            {shap.map((r) => (
              <Bar key={r.predictor} label={`${r.rank}. ${r.label.replace(" to nearest hospital/health centre", "")}`} value={r.value}
                max={shap[0].value} display={r.value.toFixed(2)} labelWidth={230}
                color={r.predictor === "early_anc" ? "var(--good)" : r.rank <= 3 ? "var(--accent)" : "var(--accent2)"} />
            ))}
          </div>
        </Card>

        <Card help="dash.permutation" title="Which predictors each model needs most"
          sub="Top 10 by drop in average precision when the predictor is shuffled · full cohort"
          actions={<Seg label="Model" size="sm" value={permModel} onChange={setPermModel}
            options={MODELS.map((m) => ({ key: m, label: SHORT[m] }))} />}
          info="Notebook 3 table T1 (manuscript Figure 4): each predictor shuffled 20 times on the held-out women; the bar is the mean loss of average precision.">
          <div>
            {perm.map((r) => (
              <Bar key={r.predictor} label={`${r.rank}. ${r.label.replace(" to nearest hospital/health centre", "")}`} value={Math.max(r.value, 0)}
                max={Math.max(perm[0]?.value ?? 0.01, 0.001)} display={r.value.toFixed(3)} labelWidth={230} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-14 md:grid-cols-2">
        <ToolLink href="/predict" icon={Calculator} title="Score one woman"
          body="Answer the 21 questions for one woman and see her predicted chance of reaching ANC8+, and which answers move it." />
        <ToolLink href="/your-data" icon={Upload} title="Score a facility's list"
          body="Upload a list of ANC attendees and get each woman's predicted chance of ANC8+, scored in your browser." />
      </div>
    </Section>
  );
}

function ToolLink({ href, icon: Icon, title, body }: { href: string; icon: typeof Calculator; title: string; body: string }) {
  return (
    <Link href={href} className="flex items-start gap-14 rounded-[6px] border border-border bg-panel p-16 hover:border-accent hover:bg-soft transition-colors">
      <span className="size-40 rounded-full bg-soft text-accent flex items-center justify-center flex-none"><Icon className="size-20" /></span>
      <span>
        <span className="block text-15 font-semibold text-accent">{title} →</span>
        <span className="block text-13 text-dim mt-2">{body}</span>
      </span>
    </Link>
  );
}

// ---- 5 · What if ------------------------------------------------------------------------

export function WhatIf({ study }: { study: StudyJSON }) {
  const rows = study.what_if;
  return (
    <Section id="what-if" n={5} title="What if"
      lead="Change one thing for every woman, keep everything else as it is, and ask the model what it predicts. A model contrast, not the effect of a programme.">
      <Card help="dash.whatif" title="What if every woman who started ANC had an early first visit?"
        sub="ANC-entry cohort, held-out women · predicted share reaching ANC8+"
        info="Notebook 3 table T8. Each woman is scored with her first visit set to later, then to early, all else unchanged; the survey-weighted means are compared.">
        <div className="flex flex-col gap-10">
          {rows.map((w) => (
            <div key={w.model} className={`grid grid-cols-[150px_1fr_110px] items-center gap-12 ${w.model === "XGBoost" ? "" : "opacity-80"}`}>
              <div className={`text-13 ${w.model === "XGBoost" ? "font-semibold" : "text-dim"}`}>{SHORT[w.model]}</div>
              <div className="relative h-28">
                <div className="absolute top-1/2 h-2 -translate-y-1/2 bg-good opacity-40" style={{ left: `${w.later * 200}%`, width: `${(w.early - w.later) * 200}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-14 rounded-full bg-border2 border-2 border-panel" style={{ left: `${w.later * 200}%` }} title={`Later: ${pct(w.later)}`} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-16 rounded-full bg-accent border-2 border-panel" style={{ left: `${w.early * 200}%` }} title={`Early: ${pct(w.early)}`} />
              </div>
              <div className="font-mono text-14 text-right"><span className="text-dim">{pct(w.later)} → </span><b>{pct(w.early)}</b></div>
            </div>
          ))}
          <div className="grid grid-cols-[150px_1fr_110px] gap-12 text-12 text-faint">
            <span />
            <span className="flex justify-between"><span>0%</span><span>25%</span><span>50%</span></span>
            <span />
          </div>
        </div>
        <Insight icon={Sparkles} tone="good">
          With every first visit early, XGBoost predicts {pct(rows[2].early)} reaching ANC8+, against {pct(rows[2].later)} with every first visit later: {rows[2].difference_pp.toFixed(0)} points more.
        </Insight>
      </Card>
    </Section>
  );
}
