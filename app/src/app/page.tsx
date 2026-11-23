"use client";

import { RotateCcw } from "lucide-react";
import { DASH_COHORTS, INDICATORS, useDash, useDashData } from "@/lib/dash";
import { REGION_NAMES } from "@/lib/regions";
import { InlineError, PanelLoading } from "@/components/studio/ui";
import { Seg } from "@/components/dash/kit";
import Overview from "@/components/dash/Overview";
import LeftBehind from "@/components/dash/LeftBehind";
import Regions from "@/components/dash/Regions";
import { EarlyAnc, Models, Review, WhatIf } from "@/components/dash/Sections";

/**
 * The ANC8+ Ethiopia Dashboard: one tab at a time, each sized to fit the screen, under
 * one filter bar that every chart obeys. Every number comes from the study's own saved
 * outputs (lib/dash.ts).
 */
export default function Dashboard() {
  const { reg, study, error, ready } = useDashData();
  const d = useDash();
  return (
    <div className="min-h-full lg:h-full flex flex-col">
      <FilterBar />
      <div className="lg:flex-1 lg:min-h-0 max-w-[1440px] w-full mx-auto px-12 md:px-20 py-12 flex flex-col gap-12">
        {error && <InlineError message={error} />}
        {!ready && !error && <PanelLoading rows={10} />}
        {reg && study && (
          <>
            {d.tab === "overview" && <Overview reg={reg} study={study} />}
            {d.tab === "left-behind" && <LeftBehind reg={reg} study={study} />}
            {d.tab === "regions" && <Regions study={study} />}
            {d.tab === "early" && <EarlyAnc study={study} />}
            {d.tab === "models" && <Models study={study} />}
            {d.tab === "what-if" && <WhatIf study={study} />}
            {d.tab === "review" && <Review study={study} />}
          </>
        )}
      </div>
    </div>
  );
}

function FilterBar() {
  const d = useDash();
  const changed = d.cohort !== "full" || d.ind !== "anc8" || d.region !== "";
  return (
    <div data-help="dash.filters" className="sticky top-0 z-[1000] bg-panel/95 backdrop-blur border-b border-border shadow-sm flex-none">
      <div className="max-w-[1440px] mx-auto px-12 md:px-20 py-8 flex items-center gap-x-18 gap-y-6 flex-wrap">
        <label className="flex items-center gap-8">
          <span className="text-12.5 font-semibold text-dim uppercase tracking-wide">Cohort</span>
          <Seg label="Cohort" value={d.cohort} onChange={(k) => d.set(k === "entry" && d.ind === "anc1" ? { cohort: k, ind: "anc4" } : { cohort: k })}
            options={DASH_COHORTS.map((c) => ({ key: c.key, label: `${c.label} · ${c.n.toLocaleString("en-US")}` }))} />
        </label>
        <label className="flex items-center gap-8">
          <span className="text-12.5 font-semibold text-dim uppercase tracking-wide">Indicator</span>
          <Seg label="Indicator" value={d.ind} onChange={(k) => d.set({ ind: k })}
            options={INDICATORS.map((i) => ({ key: i.key, label: i.label, disabled: d.cohort === "entry" && i.key === "anc1" }))} />
        </label>
        <label className="flex items-center gap-8">
          <span className="text-12.5 font-semibold text-dim uppercase tracking-wide">Region</span>
          <select value={d.region} onChange={(e) => d.set({ region: e.target.value })} aria-label="Region"
            className="h-32 rounded-[6px] border border-border2 bg-panel px-10 text-13 text-text min-w-[180px]">
            <option value="">Ethiopia (all regions)</option>
            {[...REGION_NAMES].sort().map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        {changed && (
          <button type="button" onClick={() => d.set({ cohort: "full", ind: "anc8", region: "" })}
            className="flex items-center gap-6 text-13 text-accent hover:underline">
            <RotateCcw className="size-14" /> Reset
          </button>
        )}
      </div>
    </div>
  );
}
