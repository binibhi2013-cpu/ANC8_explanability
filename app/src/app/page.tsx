"use client";

import { RotateCcw } from "lucide-react";
import { DASH_COHORTS, INDICATORS, useDash, useDashData } from "@/lib/dash";
import { REGION_NAMES } from "@/lib/regions";
import { InlineError, PanelLoading, SiteFooter } from "@/components/studio/ui";
import { Seg } from "@/components/dash/kit";
import Overview from "@/components/dash/Overview";
import LeftBehind from "@/components/dash/LeftBehind";
import { EarlyAnc, Models, WhatIf } from "@/components/dash/Sections";

/**
 * The ANC8+ Ethiopia Dashboard: one page, five sections, one filter bar that every
 * chart obeys. Every number comes from the study's own saved outputs (lib/dash.ts).
 */
export default function Dashboard() {
  const { reg, study, error, ready } = useDashData();
  return (
    <div className="min-h-full">
      <FilterBar />
      <div className="max-w-[1440px] mx-auto px-12 md:px-24 py-20 flex flex-col gap-40">
        {error && <InlineError message={error} />}
        {!ready && !error && <PanelLoading rows={10} />}
        {reg && study && (
          <>
            <Overview reg={reg} study={study} />
            <LeftBehind reg={reg} study={study} />
            <EarlyAnc study={study} />
            <Models study={study} />
            <WhatIf study={study} />
          </>
        )}
      </div>
      <div className="max-w-[1440px] mx-auto px-12 md:px-24">
        <SiteFooter />
      </div>
    </div>
  );
}

function FilterBar() {
  const d = useDash();
  const changed = d.cohort !== "full" || d.ind !== "anc8" || d.region !== "";
  return (
    <div data-help="dash.filters" className="sticky top-0 z-[1000] bg-panel/95 backdrop-blur border-b border-border shadow-sm">
      <div className="max-w-[1440px] mx-auto px-12 md:px-24 py-10 flex items-center gap-x-20 gap-y-8 flex-wrap">
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
