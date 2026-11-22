"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Panel, Screen, SectionRule, StatTile } from "@/components/studio/ui";
import { useStudio } from "@/lib/studio";

/**
 * The study on one page, written from the manuscript's abstract and results. Each
 * finding links to the screen that shows it. The Library (the supervisor's reports) is
 * replaced by the study's own documents.
 */

const TITLE = "Predicting attainment of eight antenatal care contacts and the added value of early initiation in Ethiopia";

const ABSTRACT = [
  "Population-level prediction of attainment of the WHO-recommended eight antenatal care contacts (ANC8+) remains understudied in Ethiopia. We evaluated prediction of eight-contact attainment and the incremental value of early initiation using the 2024-25 Ethiopia Demographic and Health Survey.",
  "Analyses included 6,893 women with a live birth or stillbirth within 36 months before interview, including women receiving no antenatal care. Logistic regression, random forest and extreme gradient boosting (XGBoost) used 21 background predictors, with sampling clusters preserved within survey strata during development and held-out evaluation. Performance was survey-weighted. Among 5,001 antenatal care users, paired comparisons assessed adding early initiation.",
  "Eight-contact attainment was 19.2%. Held-out average precision ranged from 0.397 to 0.438, and AUROC from 0.748 to 0.762. XGBoost outperformed random forest in average precision and Brier score, but its advantage over logistic regression remained uncertain. Wealth and region were leading predictors. Early initiation increased average precision by 0.022 to 0.034, although its incremental predictive benefit remained uncertain across models. All models showed overall overprediction.",
  "These findings support further investigation of population-level ANC8 prediction; independent validation and calibration assessment are needed before programme application.",
];

const TERMS: [string, string][] = [
  ["Rung", "One step of the ladder: ANC1+, ANC4+ or ANC8+ contacts."],
  ["Cohort", "Which women are counted: everyone (full cohort, 6,893) or women who started ANC (ANC entry, 5,001)."],
  ["Held-out women", "1,375 women (984 at ANC entry) from sampling clusters the models never saw until the final score."],
  ["Average precision", "How well a model ranks the women who reach ANC8+. Chance equals the share who reach it."],
  ["AUROC", "The chance that a woman who reached ANC8+ is scored above one who did not. 0.5 is a coin toss."],
  ["Brier score", "The average squared gap between predicted probability and what happened. Lower is better."],
  ["Calibration", "Whether a predicted 30% happens 30% of the time. Below zero in the large means overprediction."],
  ["PSU bootstrap", "Resampling whole survey clusters within strata to get 95% intervals."],
  ["SHAP", "How far each predictor moves a model's prediction, credited predictor by predictor."],
  ["Permutation importance", "The drop in average precision when one predictor's values are shuffled."],
];

/** The study's own documents. Download links are added once the authors decide to share the files publicly. */
const DOCUMENTS: [string, string][] = [
  ["Manuscript", "Main text, Tables 1-4 and Figures 1-4 (submitted)"],
  ["Supplementary material", "Tables S1-S9 and Figure S1: variable coding, grids, full results"],
];

function Row({ text, to, go }: { text: React.ReactNode; to: string; go: string }) {
  const studio = useStudio();
  return (
    <Link
      href={studio.href(to)}
      className="group flex items-center gap-10 px-14 py-8 border-b border-border last:border-b-0 hover:bg-panel2 hover:no-underline text-text"
    >
      <span className="flex-1 min-w-0 text-11.5 leading-snug">{text}</span>
      <span className="text-10.5 text-accent whitespace-nowrap">{go}</span>
      <ArrowRight className="size-12 text-faint group-hover:text-accent flex-none" />
    </Link>
  );
}

export default function AboutPage() {
  return (
    <Screen>
      <div className="grid gap-10 grid-cols-2 xl:grid-cols-4">
        <StatTile label="Survey" value="EDHS 2024–25" sub="Ethiopia Demographic and Health Survey, women's file" />
        <StatTile label="Women" value="6,893" sub="birth or stillbirth in the last 36 months" />
        <StatTile label="Outcome" value="ANC8+" sub="19.2% reached eight or more contacts" tone="bad" />
        <StatTile label="Models" value="3" sub="logistic regression, random forest, XGBoost · 21 predictors" />
      </div>

      <Panel help="about.findings" title="Abstract">
        <div className="px-14 py-12 flex flex-col gap-8 max-w-[860px]">
          <div className="text-13 font-semibold leading-snug">{TITLE}</div>
          {ABSTRACT.map((p, i) => (
            <p key={i} className="text-11.5 leading-relaxed text-dim">{p}</p>
          ))}
        </div>
      </Panel>

      <div className="grid gap-10 md:gap-14 xl:grid-cols-2">
        <Panel help="about.findings" title="Where to see each finding" how="Each line is a finding from the manuscript, and the screen that shows it.">
          <Row to="/" go="Overview" text={<>Of women who reached four contacts, <b className="font-mono">63%</b> did not reach eight.</>} />
          <Row to="/map?metric=anc8" go="Map & regions" text={<>ANC8+ ranges from <b className="font-mono">4%</b> in Somali to <b className="font-mono">66%</b> in Addis Ababa (full cohort).</>} />
          <Row to="/models" go="Model analysis" text={<>Held-out average precision <b className="font-mono">0.397–0.438</b>, AUROC <b className="font-mono">0.748–0.762</b>; all three models overpredict.</>} />
          <Row to="/models" go="Model analysis" text="Wealth and region lead permutation importance in all three models; wealth, travel time and region lead SHAP." />
          <Row to="/explore/cohorts" go="Cohorts" text={<>Adding early initiation raised average precision by <b className="font-mono">0.022–0.034</b>; every interval includes zero.</>} />
          <Row to="/" go="Overview" text={<>Model contrast: <b className="font-mono">34%</b> predicted ANC8+ with an early first visit against <b className="font-mono">13%</b> with a later one.</>} />
          <Row to="/help" go="Help" text="New to the dashboard? Every screen explained in plain language." />
        </Panel>

        <div className="flex flex-col gap-10 md:gap-14 min-w-0">
          <Panel help="about.limits" title="Limits" how="From the manuscript's discussion.">
            <Row to="/models" go="Model analysis" text="Internal validation in one survey round: accuracy in other periods or populations is untested." />
            <Row to="/models" go="Model analysis" text="All models overpredict: recalibration is needed before any programme use." />
            <Row to="/" go="Overview" text="Predictors are markers of circumstances, not causes; the early-visit contrast is not an intervention effect." />
            <Row to="/explore/ladder" go="The ANC ladder" text="Contact counts and first-visit timing are recalled by the women; ANC8+ counts contacts, not their quality." />
          </Panel>

          <Panel help="about.reports" title="Study documents" how="The study's own written outputs. They replace the earlier library of reports.">
            <div className="flex flex-col">
              {DOCUMENTS.map(([t, d]) => (
                <div key={t} className="flex items-start gap-8 px-14 py-8 border-b border-border last:border-b-0">
                  <FileText className="size-13 text-accent flex-none mt-1" />
                  <div className="min-w-0">
                    <div className="text-11.5 font-semibold">{t}</div>
                    <div className="text-10.5 text-dim">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div>
        <SectionRule label="Terms" />
        <div className="grid gap-x-14 sm:grid-cols-2 xl:grid-cols-3">
          {TERMS.map(([t, d]) => (
            <div key={t} className="py-6 border-b border-border">
              <div className="text-11 font-semibold">{t}</div>
              <div className="text-10.5 text-dim leading-snug">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}
