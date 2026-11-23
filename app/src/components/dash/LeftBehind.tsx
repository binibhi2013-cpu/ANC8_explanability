"use client";

import { useState } from "react";
import { Briefcase, Clock, Heart, MapPinned, Users, Wallet, type LucideIcon } from "lucide-react";
import { FACTORS, INDICATORS, byFactor, levelLabel, pct, rate, type FactorKey, type RegionsJSON, type StudyJSON, useDash } from "@/lib/dash";
import { REGION_NAMES } from "@/lib/regions";
import { Bar, Card, Insight, Section } from "./kit";

const ICON: Record<FactorKey, LucideIcon> = { wealth: Wallet, travel: Clock, intention: Heart, occupation: Briefcase, religion: Users };

/** Low → high ramp for an ordered factor (wealth, travel time), so order reads as colour. */
const RAMP = ["#a83236", "#c4692f", "#b8962a", "#4d8f6e", "#12735c"];

export default function LeftBehind({ reg, study }: { reg: RegionsJSON; study: StudyJSON }) {
  const d = useDash();
  const nb4 = study.nb4;
  const ind = INDICATORS.find((i) => i.key === d.ind)!;
  const who = ind.key === "early" ? "women who started ANC" : d.cohort === "entry" ? "women who started ANC" : "all women";
  const entryAnc1 = d.cohort === "entry" && d.ind === "anc1";

  return (
    <Section id="left-behind" n={2} title="Who is left behind"
      lead={<>The predictors our models rank highest, shown as the share of {who} reaching <b className="text-text">{ind.label}</b> in each group.
        Change the indicator or cohort above and every chart follows. These are associations, not causes.</>}>
      {entryAnc1 && (
        <p className="text-13 text-warn">Every woman in the ANC-entry cohort started ANC, so ANC1+ is 100% in every group. Choose ANC4+, ANC8+ or early first visit.</p>
      )}
      <div className="grid gap-14 md:grid-cols-2 xl:grid-cols-3">
        <FactorCard factor="wealth" reg={reg} study={study} ordered />
        <TravelCard reg={reg} study={study} />
        <FactorCard factor="intention" reg={reg} study={study} />
        <FactorCard factor="occupation" reg={reg} study={study} />
        <FactorCard factor="religion" reg={reg} study={study} />
        <RegionGapCard reg={reg} study={study} />
      </div>
      <RegionStages study={study} />
    </Section>
  );
}

function FactorCard({ factor, ordered, reg, study }: { factor: FactorKey; reg: RegionsJSON; study: StudyJSON; ordered?: boolean }) {
  const d = useDash();
  const nb4 = study.nb4;
  const ind = INDICATORS.find((i) => i.key === d.ind)!;
  const who = ind.key === "early" || d.cohort === "entry" ? "women who started ANC" : "all women";
  const entryAnc1 = d.cohort === "entry" && d.ind === "anc1";

  const f = FACTORS.find((x) => x.key === factor)!;
  const res = byFactor(reg, nb4, factor, d.cohort, d.ind, d.region);
  const national = rate(reg, nb4, d.cohort, d.ind, res?.scope === "Ethiopia" ? "" : d.region)?.value;
  if (!res || !res.rows.length) {
    return (
      <Card help={`dash.factor-${factor}`} title={f.label} sub="Not available for this indicator">
        <p className="text-13 text-dim leading-relaxed">The study&apos;s saved outputs do not break {ind.label.toLowerCase()} down by {f.label.toLowerCase()}. Choose another indicator to see this factor.</p>
      </Card>
    );
  }
  const rows = res.rows;
  const shown = rows.filter((r) => !r.small);
  const hi = shown.reduce((a, b) => (b.value > a.value ? b : a), shown[0]);
  const lo = shown.reduce((a, b) => (b.value < a.value ? b : a), shown[0]);
  const ratio = lo && lo.value > 0 ? hi.value / lo.value : null;
  const max = Math.max(...rows.map((r) => r.ci?.[1] ?? r.value), national ?? 0, 0.25);
  return (
    <Card help={`dash.factor-${factor}`} title={f.label}
      sub={res.scope === "Ethiopia" && d.region ? `Ethiopia · not available by region for this factor` : res.scope}
      info={<>Survey-weighted share reaching {ind.label} in each group ({who}). Lines across bars are 95% confidence intervals where the share was estimated directly. The dashed mark is the {res.scope === "Ethiopia" ? "national" : res.scope} average. Source: the study&apos;s notebook 4 and saved subgroup tables.</>}>
      <div>
        {rows.map((r, k) => (
          <Bar key={r.level} label={levelLabel(r.level)} sub={r.small ? "few women; not reliable" : `${r.n.toLocaleString("en-US")} women`}
            value={r.value} ci={r.ci} max={max} display={pct(r.value)} reference={national}
            color={r.small ? "var(--border2)" : ordered ? RAMP[Math.round((k / Math.max(rows.length - 1, 1)) * 4)] : "var(--accent)"} />
        ))}
      </div>
      {hi && lo && hi !== lo && !entryAnc1 && (
        <div className="mt-auto">
          <Insight icon={ICON[factor]} tone={ratio && ratio >= 2 ? "bad" : "accent"}>
            {levelLabel(hi.level)}: {pct(hi.value)} against {pct(lo.value)} for {levelLabel(lo.level).toLowerCase()}
            {ratio && ratio >= 1.15 ? <> ({ratio >= 10 ? "over ten" : ratio.toFixed(1)} times higher)</> : null}.
          </Insight>
        </div>
      )}
    </Card>
  );
}

function TravelCard({ reg, study }: { reg: RegionsJSON; study: StudyJSON }) {
  const d = useDash();
  const nb4 = study.nb4;
  const ind = INDICATORS.find((i) => i.key === d.ind)!;
  const who = ind.key === "early" || d.cohort === "entry" ? "women who started ANC" : "all women";
  const entryAnc1 = d.cohort === "entry" && d.ind === "anc1";

  const res = byFactor(reg, nb4, "travel", d.cohort, d.ind, d.region);
  const [band, setBand] = useState(3);
  if (!res || !res.rows.length) return null;
  const rows = res.rows;
  const b = rows[Math.min(band, rows.length - 1)];
  const near = rows[0];
  return (
    <Card help="dash.factor-travel" title="Travel time to a health centre or hospital"
      sub={d.region ? "Ethiopia · not available by region for this factor" : "Ethiopia"}
      info={<>Slide to a travel time to read its share. Travel time is the woman&apos;s reported time to the nearest hospital or health centre, one of the strongest predictors in our models (SHAP rank 2). Source: notebook 4.</>}>
      <div className="flex items-end justify-between gap-12">
        <div>
          <div className="text-13 text-dim">Women {levelLabel(b.level).toLowerCase()} away</div>
          <div className="font-mono text-30 font-semibold" style={{ color: RAMP[4 - Math.round((band / Math.max(rows.length - 1, 1)) * 4)] }}>{pct(b.value)}</div>
          <div className="text-12.5 text-dim">reached {ind.label} · {b.n.toLocaleString("en-US")} women{b.ci ? ` · 95% CI ${pct(b.ci[0])}–${pct(b.ci[1])}` : ""}</div>
        </div>
        <Clock className="size-40 text-faint flex-none" aria-hidden="true" />
      </div>
      <div>
        <input type="range" min={0} max={rows.length - 1} step={1} value={band}
          onChange={(e) => setBand(Number(e.target.value))} aria-label="Travel time band"
          className="w-full accent-[var(--accent)] h-24 cursor-pointer" />
        <div className="grid text-12 text-dim" style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
          {rows.map((r, k) => (
            <button key={r.level} type="button" onClick={() => setBand(k)}
              className={`text-center ${k === band ? "text-accent font-semibold" : "hover:text-text"}`}>{levelLabel(r.level)}</button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-6 h-64">
        {rows.map((r, k) => (
          <button key={r.level} type="button" onClick={() => setBand(k)} title={`${levelLabel(r.level)}: ${pct(r.value)}`}
            className="flex-1 rounded-t-[3px] transition-all"
            style={{ height: `${Math.max(6, (r.value / Math.max(...rows.map((x) => x.value), 0.01)) * 100)}%`, background: RAMP[4 - Math.round((k / Math.max(rows.length - 1, 1)) * 4)], opacity: k === band ? 1 : 0.45 }} />
        ))}
      </div>
      {!entryAnc1 && (
        <div className="mt-auto">
          <Insight icon={Clock} tone="bad">
            {pct(near.value)} of women within 30 minutes reached {ind.label}, against {pct(rows[rows.length - 1].value)} of those over two hours away.
          </Insight>
        </div>
      )}
    </Card>
  );
}

function RegionGapCard({ reg, study }: { reg: RegionsJSON; study: StudyJSON }) {
  const d = useDash();
  const nb4 = study.nb4;
  const ind = INDICATORS.find((i) => i.key === d.ind)!;
  const who = ind.key === "early" || d.cohort === "entry" ? "women who started ANC" : "all women";
  const entryAnc1 = d.cohort === "entry" && d.ind === "anc1";

  const vals = REGION_NAMES.map((r) => ({ r, v: rate(reg, nb4, d.cohort, d.ind, r)?.value ?? 0 })).sort((a, b) => b.v - a.v);
  const nat = rate(reg, nb4, d.cohort, d.ind, "")?.value ?? 0;
  const top = vals[0], bottom = vals[vals.length - 1];
  return (
    <Card help="dash.factor-region" title="Region" sub="All 14 regions, highest first · click one to filter the page"
      info="Region is the third-ranked predictor in our models. The dashed mark is the national share.">
      <div className="[&_.h-20]:h-14 [&>button>div]:py-[3px]">
        {vals.map(({ r, v }) => (
          <button key={r} type="button" className="w-full text-left" onClick={() => d.set({ region: r === d.region ? "" : r })}>
            <Bar label={r} value={v} max={Math.max(top.v, 0.25)} display={pct(v)} reference={nat} highlight={r === d.region}
              color={v >= nat ? "var(--accent)" : "var(--bad)"} />
          </button>
        ))}
      </div>
      {!entryAnc1 && (
        <div className="mt-auto">
          <Insight icon={MapPinned} tone="bad">
            {top.r} {pct(top.v)} against {bottom.r} {pct(bottom.v)}: a {bottom.v > 0 ? `${Math.round(top.v / bottom.v)}-fold` : "wide"} gap between regions.
          </Insight>
        </div>
      )}
    </Card>
  );
}

const STAGES = [
  { key: "any_anc", label: "Started ANC", of: "all women" },
  { key: "anc4", label: "ANC4+", of: "of those who started" },
  { key: "anc8", label: "ANC8+", of: "of those with four" },
  { key: "early_anc", label: "Early first visit", of: "of those who started" },
  { key: "early_anc8", label: "ANC8+", of: "of early starters" },
] as const;

/** Each region through the five stages, with the stage where it falls furthest behind Ethiopia. */
function RegionStages({ study }: { study: StudyJSON }) {
  const d = useDash();
  const nb4 = study.nb4;
  const nat = nb4.national as Record<string, number>;
  const rows = REGION_NAMES.map((r) => {
    const s = nb4.regions[r] as unknown as Record<string, { pct: number } | undefined>;
    const cells = STAGES.map((st) => s?.[st.key]?.pct ?? null);
    let worst = -1, gap = 0;
    STAGES.forEach((st, k) => {
      const g = (cells[k] ?? nat[st.key]) - nat[st.key];
      if (g < gap) { gap = g; worst = k; }
    });
    return { r, cells, worst, gap };
  });
  const color = (v: number | null, k: number) => {
    if (v == null) return "var(--panel3)";
    const g = v - nat[STAGES[k].key];
    const a = Math.min(1, Math.abs(g) / 0.3);
    return g < 0 ? `rgba(168,50,54,${0.12 + a * 0.6})` : `rgba(11,105,176,${0.12 + a * 0.6})`;
  };
  const sel = rows.find((x) => x.r === d.region);
  return (
    <Card help="dash.stages" title="Where each region loses women"
      sub="Each stage among women who reached the stage before it · red is below Ethiopia, blue above"
      info="Notebook 4 pathway stages, survey-weighted. Each column is conditional on the one before it, so a region can start well and still lose women later. The last column names the stage where the region is furthest below the national share. Click a row to filter the page.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-13 border-separate border-spacing-y-2">
          <thead>
            <tr className="text-12 text-dim text-left">
              <th className="font-medium py-4 pr-10">Region</th>
              {STAGES.map((s) => (
                <th key={s.key + s.of} className="font-medium py-4 px-4 text-center">{s.label}<div className="font-normal text-11 text-faint">{s.of}</div></th>
              ))}
              <th className="font-medium py-4 pl-10">Furthest behind at</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-semibold">
              <td className="py-4 pr-10">Ethiopia</td>
              {STAGES.map((s) => <td key={s.key + s.of} className="text-center font-mono">{pct(nat[s.key])}</td>)}
              <td />
            </tr>
            {rows.map((x) => (
              <tr key={x.r} onClick={() => d.set({ region: x.r === d.region ? "" : x.r })}
                className={`cursor-pointer hover:outline hover:outline-1 hover:outline-accent ${x.r === d.region ? "outline outline-2 outline-accent" : ""}`}>
                <td className="py-4 pr-10 whitespace-nowrap">{x.r}</td>
                {x.cells.map((v, k) => (
                  <td key={k} className="text-center font-mono rounded-[3px]" style={{ background: color(v, k) }}>{pct(v)}</td>
                ))}
                <td className="pl-10 text-12.5 text-dim whitespace-nowrap">
                  {x.worst >= 0 ? <>{STAGES[x.worst].label}{x.worst > 0 ? <span className="text-faint"> {STAGES[x.worst].of}</span> : null} <b className="text-bad font-mono">{Math.round(x.gap * 100)} pts</b></> : <span className="text-good">at or above Ethiopia</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sel && sel.worst >= 0 && (
        <Insight icon={MapPinned} tone="bad">
          {sel.r} falls furthest behind Ethiopia at “{STAGES[sel.worst].label} {STAGES[sel.worst].of}”: {pct(sel.cells[sel.worst])} against {pct(nat[STAGES[sel.worst].key])}.
        </Insight>
      )}
    </Card>
  );
}
