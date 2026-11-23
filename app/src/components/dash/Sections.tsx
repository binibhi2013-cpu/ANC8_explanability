"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Scale, Sparkles, Timer, TrendingUp } from "lucide-react";
import { asset } from "@/lib/paths";
import { pct, type StudyJSON, useDash } from "@/lib/dash";
import { MODEL_CUE, SHAP_CUE, earlyCue, whatIfCue } from "@/lib/recs";
import { Bar, Card, Insight, Seg, TabHead } from "./kit";

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
    <>
      <TabHead title="Early ANC: does an early first visit help?"
        lead={<>Among the 5,001 women who started ANC, {pct(study.nb4.national.early_anc)} had their first visit by 12 weeks, as the national guideline recommends. They are compared here with women who started later.</>} />
      <div className="grid gap-14 lg:grid-cols-2 lg:flex-1 lg:min-h-0">
        <Card help="dash.early-observed" title="What women actually did"
          sub={`Early starters (${E.n.toLocaleString("en-US")} women) against later starters (${L.n.toLocaleString("en-US")})`}
          cue={earlyCue({ e8: E.anc8, l8: L.anc8 })}
          info="Survey-weighted shares with 95% confidence intervals, notebook 4. An observed difference: early starters may also differ in wealth, distance and care-seeking.">
          <div className="flex items-center gap-14 text-12.5 text-dim">
            <span className="flex items-center gap-6"><span className="size-12 rounded-[2px] bg-accent" /> First visit by 12 weeks</span>
            <span className="flex items-center gap-6"><span className="size-12 rounded-[2px] bg-border2" /> Later first visit</span>
          </div>
          {rows.map((r) => (
            <div key={r.k} className="flex flex-col gap-0">
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
          cue={whatIfCue({ label: "Every first visit early instead of later (XGBoost)", diff: xgb.difference_pp })}
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
              The other two models agree in direction (see What if).</p>
          </div>
          <div className="flex flex-col gap-6 mt-auto pt-8 border-t border-border">
            <div className="text-13 font-semibold">All three models, later → early</div>
            {study.what_if.map((w) => (
              <Bar key={w.model} label={SHORT[w.model]} value={w.early} max={0.5} display={`+${w.difference_pp.toFixed(0)}`}
                sub={`${pct(w.later)} → ${pct(w.early)}`} color={w.model === "XGBoost" ? "var(--accent)" : "var(--accent2)"} />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

// ---- 5 · Models -------------------------------------------------------------------------

type ModelView = "performance" | "predictors" | "calibration";

export function Models({ study }: { study: StudyJSON }) {
  const d = useDash();
  const [view, setView] = useState<ModelView>("performance");
  const [permModel, setPermModel] = useState<(typeof MODELS)[number]>("XGBoost");
  const perf = study.full_performance;
  const chance = study.prevalence.full_heldout;
  const shap = (d.cohort === "entry" ? study.entry_shap : study.full_shap).slice(0, 10);
  const perm = (study.full_permutation[permModel] ?? []).slice(0, 10);
  const best = perf.reduce((a, b) => (b.ap > a.ap ? b : a));
  const th = "text-12 font-medium text-dim text-right px-8 py-6 whitespace-nowrap";
  const td = "font-mono text-13 text-right px-8 py-6 whitespace-nowrap";
  return (
    <>
      <TabHead title="Our three models"
        lead={<>Logistic regression, random forest and XGBoost on the same 21 predictors, trained on {study.cohorts.full.development.toLocaleString("en-US")} women and tested on {study.cohorts.full.heldout.toLocaleString("en-US")} held-out women from survey clusters the models never saw.</>}>
        <Seg label="Model view" value={view} onChange={setView}
          options={[{ key: "performance", label: "Performance" }, { key: "predictors", label: "Predictors" }, { key: "calibration", label: "Calibration and first visit" }]} />
      </TabHead>
      {view === "performance" && (
        <div className="flex flex-col gap-14 lg:flex-1 lg:min-h-0">
      <Card help="dash.performance" title="How well each model predicts ANC8+ · held-out women, full cohort"
            sub={`Average precision: chance is ${pct(chance)}, the share of held-out women who reached ANC8+`}
            cue={MODEL_CUE}
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

        </div>
      )}
      {view === "predictors" && (
        <div className="grid gap-14 lg:grid-cols-2 lg:flex-1 lg:min-h-0">
        <Card help="dash.shap" title={`What XGBoost leans on · ${d.cohort === "entry" ? "ANC-entry cohort" : "full cohort"}`}
          sub="Top 10 predictors by mean absolute SHAP value · follows the cohort slicer"
          cue={SHAP_CUE}
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
      )}
      {view === "calibration" && (
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:flex-1 lg:min-h-0">
        <Card help="dash.calibration" title="Calibration · full cohort" sub="Predicted against observed ANC8+, by risk group"
          info="Manuscript Figure 2, as saved by the study. Points below the diagonal: the model predicted more ANC8+ than was observed.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="relative h-[300px] lg:h-auto lg:flex-1 lg:min-h-0">
            <img src={asset("/figures/study/Figure_1_full_cohort_calibration.png")}
              alt="Held-out calibration of logistic regression, random forest and XGBoost in the full cohort" className="absolute inset-0 h-full w-full object-contain bg-white rounded-[4px]" />
          </div>
        </Card>
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

        </div>
      )}
    </>
  );
}

// ---- 6 · What if ------------------------------------------------------------------------

const SHORTM: Record<string, string> = { "Logistic regression": "Logistic regression", "Random Forest": "Random forest", XGBoost: "XGBoost" };
const LEVEL: Record<string, string> = { "150": "150 minutes", "15": "15 minutes", "as observed": "Where they live now", "0": "None", "3": "Three a week", "Wanted no more": "Not wanted" };
const lv = (x: string) => LEVEL[x] ?? x;

export function WhatIf({ study }: { study: StudyJSON }) {
  const top = study.what_if_top ?? [];
  const preds = ["early_anc", ...Array.from(new Set(top.map((r) => r.predictor)))];
  const [pick, setPick] = useState<string>("wealth_quintile");
  const label = (p: string) => (p === "early_anc" ? "Early first visit" : top.find((r) => r.predictor === p)?.label ?? p);

  // One row per model for the chosen contrast: from A to B.
  const rows = pick === "early_anc"
    ? study.what_if.map((w) => ({ model: w.model, a: "Later first visit", b: "Early first visit", pa: w.later, pb: w.early, diff: w.difference_pp, ci: null as [number, number] | null, observed: null as number | null }))
    : top.filter((r) => r.predictor === pick).map((r) => ({ model: r.model, a: lv(r.a), b: lv(r.b), pa: r.pa, pb: r.pb, diff: r.diff_pp, ci: r.ci, observed: r.observed }));
  const xgb = rows.find((r) => r.model === "XGBoost");
  const scale = 0.4;
  const pos = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;

  // The overview: every contrast, XGBoost.
  const all = preds.map((p) => {
    if (p === "early_anc") { const w = study.what_if.find((x) => x.model === "XGBoost")!; return { p, diff: w.difference_pp, spread: study.what_if.map((x) => x.difference_pp) }; }
    const rs = top.filter((r) => r.predictor === p);
    return { p, diff: rs.find((r) => r.model === "XGBoost")?.diff_pp ?? 0, spread: rs.map((r) => r.diff_pp) };
  }).sort((a, b) => b.diff - a.diff);
  const maxDiff = Math.max(...all.map((a) => Math.max(...a.spread)), 1);
  const cohort = pick === "early_anc" ? "ANC-entry cohort (984 held-out women who started ANC)" : `Full cohort (${(top[0]?.n ?? 1375).toLocaleString("en-US")} held-out women)`;

  return (
    <>
      <TabHead title="What if"
        lead="Change one predictor for every held-out woman, keep everything else as it is, and ask each of the three models what share would reach ANC8+. A model contrast, not the effect of a programme.">
        <label className="flex items-center gap-8 text-13">
          <span className="text-12.5 font-semibold text-dim uppercase tracking-wide">Predictor</span>
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Predictor"
            className="h-32 rounded-[6px] border border-border2 bg-panel px-10 text-13 text-text min-w-[200px]">
            {preds.map((p) => <option key={p} value={p}>{label(p)}</option>)}
          </select>
        </label>
      </TabHead>
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:flex-1 lg:min-h-0">
        <Card help="dash.whatif" title={rows[0] ? `What if every woman were “${rows[0].b}” instead of “${rows[0].a}”?` : label(pick)}
          sub={`${label(pick)} · ${cohort} · predicted share reaching ANC8+`}
          cue={xgb ? whatIfCue({ label: `${label(pick)}, ${rows[0].a} → ${rows[0].b} (XGBoost)`, diff: xgb.diff }) : null}
          info={pick === "early_anc"
            ? "Notebook 3 table T8: each woman scored with her first visit set to later, then to early; survey-weighted means."
            : "Script what_if_top_predictors.py on the study's saved models (T8 method): each held-out woman scored with the predictor set to each level, survey-weighted means. 95% intervals: cluster bootstrap of the women (1,000 replicates); they leave out uncertainty in the fitted models, so the spread across the three models is the better guide."}>
          <div className="flex flex-col gap-14 lg:flex-1 justify-center">
            {rows.map((w) => (
              <div key={w.model} className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-10">
                  <span className={`text-14 ${w.model === "XGBoost" ? "font-semibold" : "text-dim"}`}>{SHORTM[w.model]}</span>
                  <span className="font-mono text-14"><span className="text-dim">{pct(w.pa)} → </span><b>{pct(w.pb)}</b>
                    <span className={`ml-10 font-semibold ${w.diff >= 0 ? "text-good" : "text-bad"}`}>{w.diff >= 0 ? "+" : ""}{w.diff.toFixed(1)} pts</span>
                    {w.ci && <span className="text-12 text-faint ml-6">({w.ci[0].toFixed(1)} to {w.ci[1].toFixed(1)})</span>}</span>
                </div>
                <div className="relative h-24 bg-panel3 rounded-full">
                  <div className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-good opacity-50" style={{ left: pos(Math.min(w.pa, w.pb)), width: `calc(${pos(Math.max(w.pa, w.pb))} - ${pos(Math.min(w.pa, w.pb))})` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-16 rounded-full bg-border2 border-2 border-panel" style={{ left: pos(w.pa) }} title={`${w.a}: ${pct(w.pa)}`} />
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-18 rounded-full bg-accent border-2 border-panel" style={{ left: pos(w.pb) }} title={`${w.b}: ${pct(w.pb)}`} />
                  {w.observed != null && pick !== "region" && (
                    <div className="absolute -top-3 -bottom-3 w-0 border-l-2 border-dashed border-text opacity-50" style={{ left: pos(w.observed) }} title={`As observed: ${pct(w.observed)}`} />
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-between text-12 text-faint"><span>0%</span><span>10%</span><span>20%</span><span>30%</span><span>40%</span></div>
            <div className="flex items-center gap-14 text-12.5 text-dim flex-wrap">
              <span className="flex items-center gap-6"><span className="size-12 rounded-full bg-border2" />{rows[0]?.a}</span>
              <span className="flex items-center gap-6"><span className="size-12 rounded-full bg-accent" />{rows[0]?.b}</span>
              {pick !== "early_anc" && pick !== "region" && <span className="flex items-center gap-6"><span className="h-12 border-l-2 border-dashed border-text opacity-60" />As observed</span>}
            </div>
          </div>
          {xgb && (
            <Insight icon={Sparkles} tone="good">
              With every woman “{rows[0].b}”, XGBoost predicts {pct(xgb.pb)} reaching ANC8+, against {pct(xgb.pa)} with every woman “{rows[0].a}”: {xgb.diff.toFixed(1)} points.
            </Insight>
          )}
        </Card>

        <Card help="dash.whatif-all" title="All contrasts at a glance" sub="Change in predicted ANC8+, percentage points · bar XGBoost, ticks the other two models · click to open">
          <div className="flex flex-col gap-6 lg:flex-1 justify-center">
            {all.map((a) => (
              <button key={a.p} type="button" onClick={() => setPick(a.p)}
                className={`grid items-center gap-10 text-left rounded-[4px] px-4 py-3 ${a.p === pick ? "bg-soft ring-1 ring-accent" : "hover:bg-soft"}`}
                style={{ gridTemplateColumns: "minmax(110px,160px) 1fr 52px" }}>
                <span className="text-13 truncate">{label(a.p)}</span>
                <span className="relative h-18 bg-panel3 rounded-[3px]">
                  <span className="absolute inset-y-0 left-0 rounded-[3px] bg-accent" style={{ width: `${(a.diff / maxDiff) * 100}%` }} />
                  {a.spread.map((v, k) => <span key={k} className="absolute -top-2 -bottom-2 w-[2px] bg-text opacity-50" style={{ left: `${(v / maxDiff) * 100}%` }} />)}
                </span>
                <span className="font-mono text-13 font-semibold text-right">+{a.diff.toFixed(1)}</span>
              </button>
            ))}
          </div>
          <Insight icon={Scale}>
            The models agree most on wealth and the first visit; they disagree on intention, occupation and media, so read those with care. Early first visit is in the ANC-entry cohort; the rest in the full cohort.
          </Insight>
        </Card>
      </div>
    </>
  );
}

// ---- 7 · Programme review ----------------------------------------------------------------

export function Review({ study }: { study: StudyJSON }) {
  const brief = study.nb4.review.brief;
  const cols = [
    { k: "Observed evidence", label: "What was observed" },
    { k: "Model evidence", label: "What the models show" },
    { k: "Programme-review cue", label: "Review cue" },
    { k: "Key caution", label: "Caution" },
  ];
  return (
    <>
      <TabHead title="Programme review"
        lead={<>The study&apos;s own programme-review brief from notebook 4, verbatim. Each finding card in the other tabs also has a <b className="text-warn">Cue</b> button with a suggested action.</>} />
      <Card help="dash.review" title="Four core signals" sub="Source: outputs/notebook4_programme_review/programme_review/programme_review_brief.csv"
        className="lg:flex-1 lg:min-h-0" info="Copied unchanged from the study's notebook 4 output. The cues are prompts for programme review, not tested interventions.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-12.5 leading-snug border-separate border-spacing-0">
            <thead>
              <tr className="text-12 text-dim text-left">
                <th className="font-semibold py-6 pr-12 w-[150px] border-b border-border">Signal</th>
                {cols.map((c) => <th key={c.k} className={`font-semibold py-6 pr-12 border-b border-border ${c.k === "Programme-review cue" ? "text-warn" : ""}`}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {brief.map((b) => (
                <tr key={b["Review domain"]} className="align-top">
                  <td className="py-8 pr-12 border-b border-border">
                    <div className="font-semibold text-13">{b["Review domain"]}</div>
                    <div className="text-11.5 text-faint mt-2">Also consider: {b["Contextual lenses"]}</div>
                  </td>
                  {cols.map((c) => (
                    <td key={c.k} className={`py-8 pr-12 border-b border-border ${c.k === "Programme-review cue" ? "font-semibold bg-warnbg/40" : c.k === "Key caution" ? "text-dim" : ""}`}>{b[c.k]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
