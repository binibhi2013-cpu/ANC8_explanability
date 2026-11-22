"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Funnel from "@/components/charts/Funnel";
import { Cue, Hint, Segmented, Tag } from "@/components/studio/ui";
import { Select } from "@/components/ui/select";
import { CUES } from "@/lib/cues";
import { useJSON } from "@/lib/data";
import { helpHref } from "@/lib/help/href";
import { STUDY_CIRCUMSTANCES } from "@/lib/metrics";
import { REACH_OF, cohortRungs, type RegionsData } from "@/lib/regionsData";
import { RUNGS, type Cohort, type Rung } from "@/lib/studio";

/**
 * One region, from the study's own descriptive results: how far women get, where
 * they are lost, what the pattern suggests for programmes, who is left behind (by
 * wealth) and how common the study's predictors are in the region.
 *
 * Docked beside the map (a full-screen sheet on a phone) so the map stays in view.
 * Every number is survey-weighted; intervals are 95% from the cluster bootstrap.
 */

const pct = (v: number | null | undefined, d = 0) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);

const ACTION_TONE: Record<string, "bad" | "warn" | "accent"> = {
  Outreach: "bad",
  "Early engagement": "warn",
  Retention: "accent",
};
// Who is left behind: only groupings that are among the study's 21 predictors, with the
// study's own categories. Left out: "Health post" (travel to a health post, not the study's
// travel time to the nearest hospital or health centre) and "Age at birth" (the study uses
// age at interview). The study's travel-time grouping exists only nationally (notebook 4),
// not region by region, so it cannot be shown here.
const STUDY_DIMS = ["Wealth", "Education", "Residence", "Pregnancy wanted", "Pregnancy number", "Health insurance"];
const DIM_LABEL: Record<string, string> = {
  Wealth: "wealth", Education: "education", Residence: "residence",
  "Pregnancy wanted": "pregnancy intention", "Pregnancy number": "pregnancy order", "Health insurance": "health insurance",
};

function Section({ title, how, help, children, right }: {
  title: string; how?: string; help?: string; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <section data-help={help} className="px-14 py-10 border-b border-border">
      <div className="flex items-center gap-8 mb-7">
        <div className="text-9.5 uppercase tracking-label text-faint font-semibold flex-1">{title}</div>
        {right}
        {how && <Hint more={help ? helpHref(help) : undefined}>{how}</Hint>}
      </div>
      {children}
    </section>
  );
}

function LossBar({ label, c }: { label: string; c: { never: number; start_lt4: number; four_lt8: number; reach8: number } }) {
  const parts = [
    { k: "never", v: c.never, bg: "var(--bad)", name: "never start" },
    { k: "start_lt4", v: c.start_lt4, bg: "var(--warn)", name: "started, did not reach 4" },
    { k: "four_lt8", v: c.four_lt8, bg: "var(--cross)", name: "reached 4, did not reach 8" },
    { k: "reach8", v: c.reach8, bg: "var(--good)", name: "reach 8" },
  ];
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-8">
      <span className="text-10.5 text-dim truncate">{label}</span>
      <div className="flex h-18 rounded-2 overflow-hidden">
        {parts.map((p) => (
          <div
            key={p.k}
            title={`${p.name}: ${pct(p.v)}`}
            className="h-full flex items-center justify-center font-mono text-9.5 text-white transition-all duration-500"
            style={{ width: `${Math.max(p.v, 0) * 100}%`, background: p.bg }}
          >
            {p.v >= 0.08 ? pct(p.v) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RegionPanel({
  data,
  region,
  cohort,
  rung,
  onRung,
  onClose,
}: {
  data: RegionsData;
  region: string;
  cohort: Cohort;
  rung: Rung;
  onRung: (r: Rung) => void;
  onClose: () => void;
}) {
  const cues = useJSON<{ regional_cues: Record<string, { pattern: string; question: string }> }>("/data/study.json").data?.regional_cues;
  const [dim, setDim] = useState("Wealth");
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const rungs = cohortRungs(cohort);
  const r = rungs.includes(rung) ? rung : "anc8";
  const rungLabel = RUNGS.find((x) => x.key === r)!.label;
  const c = data.cohorts[cohort].regions[region];
  const nat = data.cohorts[cohort].national;
  if (!c) return null;
  const reachKey = REACH_OF[r] as "reach1" | "reach4" | "reach8";

  // groups with fewer than min_n women are hidden, not just faded
  const dims = STUDY_DIMS.filter((d) => data.subgroups[cohort]?.[region]?.[d]);
  const DIM = dims.includes(dim) ? dim : dims[0] ?? "Wealth";
  const sub = (data.subgroups[cohort]?.[region]?.[DIM] ?? []).filter((s) => !s.small);
  const subNat = data.subgroups[cohort]?.["Ethiopia"]?.[DIM] ?? [];
  const hiddenSmall = (data.subgroups[cohort]?.[region]?.[DIM] ?? []).length - sub.length;
  const poorest = sub.find((s) => s.level === "Poorest");
  const richest = sub.find((s) => s.level === "Richest");
  const prof = data.profile[cohort]?.[region] ?? {};
  const profNat = data.profile[cohort]?.["Ethiopia"] ?? {};

  const lossShare = c.loss === "never" ? c.never : c.loss === "start_lt4" ? c.start_lt4 : c.four_lt8;
  const nb4 = cues?.[region === "Gambela" ? "Gambella" : region];

  return (
    <aside
      data-help="map.region"
      aria-label={`${region}: region analysis`}
      className="bg-panel border-l border-border flex flex-col min-h-0 h-full overflow-hidden"
    >
      <div className="flex items-center gap-8 px-14 h-36 border-b border-border flex-none">
        <div className="text-13 font-semibold flex-1 truncate">{region}</div>
        <Tag tone={ACTION_TONE[c.action] ?? "neutral"}>{c.action}</Tag>
        <button onClick={onClose} aria-label="Close region panel" className="text-faint hover:text-text">
          <X className="size-14" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-14 pt-9 pb-8 border-b border-border flex items-center gap-10 flex-wrap">
          <span className="text-10 font-mono text-dim">
            {c.n.toLocaleString()} women · {c.clusters} clusters
          </span>
          <div className="flex-1" />
          <Segmented
            label="Rung"
            options={rungs.map((k) => ({ key: k, label: RUNGS.find((x) => x.key === k)!.label }))}
            value={r}
            onChange={onRung}
          />
        </div>

        <Section help="map.region-far" title="How far women get" how="Bars: share of all women in the region who reached each rung, with how many continued between rungs. On the right: Ethiopia's value and its 95% interval, for comparison.">
          <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-x-8">
            <Funnel
              compact
              steps={rungs.map((k) => ({ key: k, label: RUNGS.find((x) => x.key === k)!.label, value: c[REACH_OF[k]] }))}
              active={r}
              onSelect={(k) => onRung(k as Rung)}
            />
            <div className="flex flex-col justify-around text-right">
              {rungs.map((k) => (
                <div key={k} className="font-mono text-10 text-faint leading-tight">
                  <div>ETH {pct(nat[REACH_OF[k]])}</div>
                  <div className="text-9.5" title="95% interval of Ethiopia's value">
                    [{pct(nat[`${REACH_OF[k]}_ci`][0])}–{pct(nat[`${REACH_OF[k]}_ci`][1])}]
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {cohort !== "entry" && (
          <Section help="map.region-lost" title="Where women are lost" how="Every woman falls in exactly one of these four groups; the widest red, orange or purple block is where the region loses most women.">
            <div className="flex flex-col gap-5">
              <LossBar label={region.length > 10 ? region.slice(0, 9) + "…" : region} c={c} />
              <LossBar label="Ethiopia" c={nat} />
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-2 mt-6 text-9.5 text-dim">
              {[["var(--bad)", "no ANC"], ["var(--warn)", "did not reach 4"], ["var(--cross)", "reached 4, not 8"], ["var(--good)", "reached 8"]].map(([bg, l]) => (
                <span key={l} className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-1" style={{ background: bg }} />
                  {l}
                </span>
              ))}
            </div>
          </Section>
        )}

        {cohort !== "entry" && (
          <Section help="map.region-work" title="What this suggests for programmes"
            how="The region's largest loss on the ladder, from the study's descriptive results, and the review question from the study's notebook 4 programme review. A suggestion for review, not a cause.">
            <div className="flex flex-col gap-6">
              <Cue>{CUES.regionLoss(region, c.loss as "never" | "start_lt4" | "four_lt8", lossShare)}</Cue>
              {nb4 && (
                <div className="text-10.5 text-dim leading-relaxed">
                  <span className="text-text font-semibold">Notebook 4 pattern:</span> {nb4.pattern}.{" "}
                  <span className="text-text font-semibold">Review question:</span> {nb4.question}
                </div>
              )}
            </div>
          </Section>
        )}

        <Section
          help="map.region-behind"
          title={`Who is left behind: ${rungLabel} by ${DIM_LABEL[DIM] ?? DIM}`}
          right={
            <Select aria-label="Group by" value={DIM} onChange={(e) => setDim(e.target.value)} className="w-auto h-22 text-10.5">
              {dims.map((d) => <option key={d} value={d}>{d === "Pregnancy number" ? "Pregnancy order" : d === "Pregnancy wanted" ? "Pregnancy intention" : d}</option>)}
            </Select>
          }
          how={`${rungLabel} for women in each group, in this region. Choose the grouping: only groupings that are among the study's 21 predictors are offered. The dashed mark is the same group nationally. Groups with fewer than ${data.min_n} women are not shown. No intervals: read small differences with care.`}
        >
          <div className="flex flex-col gap-4">
            {sub.map((s) => {
              const v = s[reachKey];
              const nv = subNat.find((x) => x.level === s.level)?.[reachKey];
              return (
                <div key={s.level} className="grid grid-cols-[112px_minmax(0,1fr)_44px] items-center gap-8">
                  <span className="text-10.5 truncate" title={s.level}>{s.level}</span>
                  <span className="relative block h-11 bg-panel3 rounded-full">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{ width: `${v * 100}%`, background: "var(--accent)" }}
                    />
                    {nv != null && (
                      <span className="absolute -inset-y-2 border-l border-dashed border-text opacity-60" style={{ left: `${nv * 100}%` }} />
                    )}
                  </span>
                  <span className="text-right font-mono text-10" title={`${s.n} women`}>
                    {pct(v)}
                  </span>
                </div>
              );
            })}
          </div>
          {hiddenSmall > 0 && (
            <div className="text-9.5 text-faint mt-5">{hiddenSmall} group{hiddenSmall > 1 ? "s" : ""} with fewer than {data.min_n} women not shown.</div>
          )}
          {DIM === "Wealth" && poorest && richest && <Cue className="mt-8">{CUES.wealthGap(region, poorest[reachKey], richest[reachKey], rungLabel)}</Cue>}
        </Section>

        <Section help="map.region-circumstances" title="The region's circumstances" how="How common each circumstance is among women in this region (dot) against Ethiopia (tick). Only circumstances that are among the study's 21 predictors are shown.">
          <div className="flex flex-col gap-4">
            {data.profile_meta
              .filter((m) => STUDY_CIRCUMSTANCES.includes(m.key))
              .map((m) => {
                const v = prof[m.key];
                const n = profNat[m.key];
                if (v == null) return null;
                return (
                  <div key={m.key} className="grid grid-cols-[150px_minmax(0,1fr)_36px] items-center gap-8">
                    <span className="text-10.5 truncate" title={m.label}>{m.label}</span>
                    <span className="relative block h-11">
                      <span className="absolute top-1/2 left-0 right-0 h-px bg-border2" />
                      {n != null && <span className="absolute top-0 bottom-0 w-px bg-text opacity-60" style={{ left: `${n * 100}%` }} />}
                      <span
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full border border-panel transition-all duration-500"
                        style={{ left: `${v * 100}%`, background: "var(--accent)" }}
                      />
                    </span>
                    <span className="text-right font-mono text-10">{pct(v)}</span>
                  </div>
                );
              })}
          </div>
        </Section>

        <div className="px-14 py-10 text-9.5 text-faint leading-relaxed">
          Survey-weighted, Ethiopia DHS 2024–25; intervals are 95% from a cluster bootstrap within the region. Associations, not causes.
        </div>
      </div>
    </aside>
  );
}
