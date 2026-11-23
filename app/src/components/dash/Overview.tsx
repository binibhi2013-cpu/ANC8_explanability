"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import { MapPin, TrendingDown, Users } from "lucide-react";
import { useRenderTheme } from "@/components/shell/theme-provider";
import { classify, colorOf, inkOn } from "@/lib/colors";
import { useJSON } from "@/lib/data";
import { INDICATORS, pct, rate, type Ind, type RegionsJSON, type StudyJSON, useDash } from "@/lib/dash";
import { REGION_NAMES } from "@/lib/regions";
import { Card, Insight, Section } from "./kit";

const RegionMap = dynamic(() => import("@/components/map/RegionMap"), {
  ssr: false,
  loading: () => <div className="h-[460px] bg-panel2 rounded-[6px]" />,
});

export default function Overview({ reg, study }: { reg: RegionsJSON; study: StudyJSON }) {
  const d = useDash();
  const nb4 = study.nb4;
  const theme = useRenderTheme();
  const geo = useJSON<FeatureCollection>("/geo/regions.geojson");
  const indLabel = INDICATORS.find((i) => i.key === d.ind)!;

  const tiles = INDICATORS.map((i) => ({ i, r: rate(reg, nb4, d.cohort, i.key, d.region), nat: rate(reg, nb4, d.cohort, i.key, "") }));

  const map = useMemo(() => {
    const vals = REGION_NAMES.map((r) => rate(reg, nb4, d.cohort, d.ind, r)?.value ?? null);
    const classes = classify(vals, "good", theme);
    const data = Object.fromEntries(REGION_NAMES.map((r, k) => {
      const fill = colorOf(vals[k], classes, theme);
      return [r, { value: pct(vals[k]), fill, ink: inkOn(fill, theme) }];
    }));
    const ranked = REGION_NAMES.map((r, k) => ({ r, v: vals[k] ?? -1 })).sort((a, b) => b.v - a.v);
    return { data, classes, best: ranked[0], worst: ranked[ranked.length - 1] };
  }, [reg, nb4, d.cohort, d.ind, theme]);

  const place = d.region ? reg.cohorts[d.cohort].regions[d.region] : reg.cohorts[d.cohort].national;
  const nat = reg.cohorts[d.cohort].national;
  const entry = d.cohort === "entry";
  const steps = entry
    ? [
        { key: "anc1", label: "Started ANC", value: 1 },
        { key: "anc4", label: "Reached ANC4+", value: place.reach4 },
        { key: "anc8", label: "Reached ANC8+", value: place.reach8 },
      ]
    : [
        { key: "all", label: "All women", value: 1 },
        { key: "anc1", label: "Started ANC", value: place.reach1 },
        { key: "anc4", label: "Reached ANC4+", value: place.reach4 },
        { key: "anc8", label: "Reached ANC8+", value: place.reach8 },
      ];
  const losses = [
    ...(entry ? [] : [{ k: "never", label: "never started ANC", v: place.never }]),
    { k: "start_lt4", label: entry ? "stopped before four contacts" : "started but stopped before four", v: entry ? 1 - place.reach4 : place.start_lt4 },
    { k: "four_lt8", label: "reached four but not eight", v: entry ? place.reach4 - place.reach8 : place.four_lt8 },
  ].sort((a, b) => b.v - a.v);
  const biggest = losses[0];
  const r8 = place.reach8;
  const oneIn = Math.round(1 / Math.max(r8, 0.01));

  return (
    <Section id="overview" n={1} title={d.region ? `Antenatal care in ${d.region}` : "Antenatal care in Ethiopia"}
      lead={<>Survey-weighted shares among {entry ? "the 5,001 women who started ANC" : "6,893 women with a recent pregnancy"}, EDHS 2024–25.
        Click a tile to colour the map by it; click a region to see the whole page for that region.</>}>

      <div data-help="dash.tiles" className="grid gap-12 grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ i, r, nat: n }) => {
          const on = d.ind === i.key;
          const trivial = entry && i.key === "anc1";
          return (
            <button key={i.key} type="button" disabled={trivial} onClick={() => d.set({ ind: i.key as Ind })} aria-pressed={on}
              className={`text-left rounded-[6px] border px-16 py-14 transition-colors ${on ? "border-accent bg-soft ring-1 ring-accent" : trivial ? "border-border bg-panel cursor-default" : "border-border bg-panel hover:border-accent"}`}>
              <div className="text-13 font-semibold text-dim">{i.label} <span className="font-normal text-faint">· {i.long}</span></div>
              <div className={`font-mono text-30 font-semibold mt-4 ${i.key === "anc8" ? "text-bad" : "text-text"}`}>
                {trivial ? "5,001" : pct(r?.value)}
              </div>
              <div className="text-12.5 text-dim mt-2">
                {trivial ? "all started ANC, by definition"
                  : i.key === "early" ? "of women who started ANC"
                  : r?.ci ? `95% CI ${pct(r.ci[0])}–${pct(r.ci[1])}` : ""}
                {d.region && !trivial && n ? <> · Ethiopia {pct(n.value)}</> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-10">
        <Insight icon={TrendingDown} tone="bad">
          {d.region ? `In ${d.region}, ` : ""}{pct(r8)} of {entry ? "women who started ANC" : "women"} reached eight contacts
          {oneIn >= 2 && r8 < 0.5 ? ` (about one in ${oneIn})` : ""}{d.region ? `, against ${pct(nat.reach8)} nationally` : ""}.
          The largest loss: {pct(biggest.v)} {biggest.label}.
        </Insight>
      </div>

      <div className="grid gap-14 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card help="dash.map" title={`${indLabel.label} by region`}
          sub={d.region ? `${d.region} selected · click it again to return to Ethiopia` : "Click a region to filter the whole page"}
          info="Each region shows its survey-weighted share. Colours are five equal-count classes of the 14 regions; darker is better. Early first visit is among women who started ANC.">
          <div className="rounded-[6px] overflow-hidden border border-border">
            {geo.data && (
              <RegionMap geo={geo.data} data={map.data} selected={d.region}
                onSelect={(r) => d.set({ region: r === d.region ? "" : r })}
                basemap={false} theme={theme} labels height={460} />
            )}
          </div>
          <div className="flex items-center gap-6 flex-wrap text-12.5 text-dim">
            <span>Lower</span>
            {map.classes.colors.map((c, k) => (
              <span key={k} className="h-12 w-40 rounded-[2px]" style={{ background: c }} />
            ))}
            <span>Higher</span>
            <span className="ml-auto">Highest: <b className="text-text">{map.best.r} {pct(map.best.v)}</b> · Lowest: <b className="text-text">{map.worst.r} {pct(map.worst.v)}</b></span>
          </div>
        </Card>

        <Card help="dash.ladder" title={`Where women are lost · ${d.place}`}
          sub="The antenatal care ladder, from first contact to eight"
          info="Each bar is the share of the cohort that reached the rung; the gap between bars is the share lost at that step. Click a rung to colour the map by it.">
          <div className="flex flex-col gap-8">
            {steps.map((s, k) => {
              const prev = k > 0 ? steps[k - 1].value : null;
              const clickable = s.key !== "all" && !(entry && s.key === "anc1");
              return (
                <div key={s.key}>
                  {prev != null && (
                    <div className="text-12 text-bad pl-4 pb-3">▼ {pct(prev - s.value)} lost{prev > 0 ? ` · ${pct(s.value / prev)} continued` : ""}</div>
                  )}
                  <button type="button" disabled={!clickable}
                    onClick={() => clickable && d.set({ ind: s.key as Ind })}
                    className={`w-full text-left rounded-[4px] ${clickable ? "hover:ring-1 hover:ring-accent" : ""}`}>
                    <div className="flex items-center justify-between text-13 mb-3">
                      <span className={d.ind === s.key ? "font-semibold text-accent" : "text-text"}>{s.label}</span>
                      <span className="font-mono font-semibold">{pct(s.value)}</span>
                    </div>
                    <div className="h-22 bg-badbg rounded-[3px]">
                      <div className="h-full rounded-[3px] transition-all duration-500"
                        style={{ width: `${s.value * 100}%`, background: d.ind === s.key ? "var(--accent)" : "var(--accent2)" }} />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-auto flex flex-col gap-8 pt-6 border-t border-border">
            <Insight icon={Users}>
              Of women who reached four contacts, {pct(1 - place.continue_4_to_8)} did not reach eight
              {d.region ? ` (Ethiopia ${pct(1 - nat.continue_4_to_8)})` : ""}.
            </Insight>
            {!entry && (
              <Insight icon={MapPin} tone="warn">
                {pct(place.never)} never started ANC{d.region ? ` (Ethiopia ${pct(nat.never)})` : ""}.
              </Insight>
            )}
          </div>
        </Card>
      </div>
    </Section>
  );
}
