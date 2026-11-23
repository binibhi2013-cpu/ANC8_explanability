"use client";

import Link from "next/link";
import { ArrowDown, Database, FileCode2, Globe, NotebookPen, Package, ShieldCheck } from "lucide-react";
import { Panel, Screen, SectionRule } from "@/components/studio/ui";
import { PROJECT } from "@/lib/project";

/**
 * How the dashboard was built, for the audience's "where do these numbers come from?":
 * the survey file, the four notebooks, the export step with its fidelity check, and
 * the app. File names are kept out of the public page.
 */

const STEPS: { icon: typeof Database; title: string; what: string; out: string }[] = [
  { icon: Database, title: "1 · The survey",
    what: "Ethiopia Demographic and Health Survey 2024–25, women's file. Survey weights (v005), clusters (v021) and strata (v022) are kept throughout.",
    out: "6,893 women with a birth or stillbirth in the 36 months before interview and a recorded number of ANC contacts." },
  { icon: NotebookPen, title: "2 · Outcome and predictors",
    what: "Defines ANC8+ (eight or more contacts) and builds the 21 background predictors, each documented in a predictor register.",
    out: "The analysis cohort, the ANC-entry cohort (5,001 women who started ANC) and the registers." },
  { icon: NotebookPen, title: "3 · Models",
    what: "Logistic regression, random forest and XGBoost. Development and held-out women are split by sampling cluster within strata; tuning uses only the development women; performance is survey-weighted with cluster bootstrap intervals.",
    out: "Held-out average precision, AUROC, Brier score and calibration." },
  { icon: NotebookPen, title: "4 · Explainability",
    what: "Permutation importance, SHAP values and the early-versus-later first-visit model contrast.",
    out: "Predictor rankings, SHAP direction by category, the 34% against 13% contrast." },
  { icon: NotebookPen, title: "5 · Programme review",
    what: "The observed ANC pathway in five stages, by wealth, travel time, occupation, religion, pregnancy intention and region, with the study's programme-review questions and cues.",
    out: "51 aggregate tables plus the evidence-to-review matrix; no individual records leave the analysis." },
  { icon: ShieldCheck, title: "6 · Export, with a fidelity check",
    what: "The fitted models are exported to a portable format, and every exported model is checked against the fitted pipeline and the published held-out predictions before it is used. The study's tables are copied unchanged into one data file.",
    out: "Model files (all passed the check), one data file of the study's tables, and the questions for the scoring tools." },
  { icon: Globe, title: "7 · The dashboard",
    what: "A tabbed dashboard (Next.js and React), each tab sized to one screen, under one filter bar for cohort, indicator and region: overview, who is left behind, regions, early ANC, the three models, what-if and the programme review, with a recommendation cue on each finding, plus tools to score one woman or a facility's list. Logistic models are scored in the browser; tree models from their exported files. It works offline once opened.",
    out: "Every screen reads the files above; nothing is re-estimated in the app." },
];

const STACK: [string, string][] = [
  ["Analysis", "Python: pandas, scikit-learn, XGBoost, SHAP; survey-weighted estimators with cluster bootstrap"],
  ["App", "Next.js 16, React, TypeScript, Tailwind CSS, Recharts, Leaflet"],
  ["Map", "Region boundaries: UN OCHA COD-AB 2025 (CC BY-IGO)"],
  ["Hosting", "GitHub (code and review) and Vercel (website); offline copy through a service worker"],
];

export default function Built() {
  return (
    <Screen>
      <Panel title="From the survey file to the dashboard" how="Each step and what it hands to the next one.">
        <div className="px-14 py-12 flex flex-col items-stretch">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="flex flex-col items-center">
                <div className="w-full grid grid-cols-[32px_minmax(0,1fr)] gap-10 border border-border rounded-3 bg-panel2 px-12 py-10">
                  <div className="size-28 rounded-full bg-accent text-white flex items-center justify-center"><Icon className="size-14" /></div>
                  <div className="min-w-0">
                    <div className="text-12.5 font-semibold">{s.title}</div>
                    <div className="text-11 text-dim leading-relaxed mt-3">{s.what}</div>
                    <div className="text-11 leading-relaxed mt-3"><span className="font-semibold">Hands on:</span> {s.out}</div>
                                      </div>
                </div>
                {i < STEPS.length - 1 && <ArrowDown className="size-16 text-faint my-4" />}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-10 md:gap-14 lg:grid-cols-2">
        <Panel title="Tools">
          <div className="flex flex-col">
            {STACK.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[90px_minmax(0,1fr)] gap-10 px-14 py-8 border-b border-border last:border-b-0">
                <span className="text-11 font-semibold flex items-center gap-5"><Package className="size-12 text-accent" />{k}</span>
                <span className="text-11 text-dim leading-relaxed">{v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Rules the dashboard follows">
          <div className="px-14 py-10 flex flex-col gap-6 text-11 text-dim leading-relaxed">
            <p>Every number comes from the study's own saved outputs: the two cohorts (6,893 and 5,001 women) and the 21 predictors. No new samples or variables.</p>
            <p>Programme cues use the study's own programme-review wording and are questions for review, not effects of an intervention.</p>
            <p>Predictions describe women with similar answers, not an individual woman; the models need external validation and recalibration before programme use.</p>
            <p className="flex items-center gap-6">
              <FileCode2 className="size-12 text-accent" />
              <a href={PROJECT.github} target="_blank" rel="noreferrer" className="text-accent hover:underline">The code and its history on GitHub</a>
            </p>
          </div>
        </Panel>
      </div>

      <SectionRule label="Next" />
      <div className="flex flex-wrap gap-14 text-11">
        <Link href="/" className="text-accent hover:underline">Dashboard</Link>
        <Link href="/welcome" className="text-accent hover:underline">Title screen</Link>
      </div>
    </Screen>
  );
}
