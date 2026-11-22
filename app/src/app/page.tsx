"use client";

import Link from "next/link";
import { ArrowRight, Layers, Map as MapIcon, Microscope, Upload } from "lucide-react";
import Funnel from "@/components/charts/Funnel";
import { Cue, Panel, PanelLoading, Screen, StatTile, InlineError } from "@/components/studio/ui";
import { useJSON } from "@/lib/data";
import { useStudio } from "@/lib/studio";
import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { useRouter } from "next/navigation";
import MiniMap, { useRegionPaths } from "@/components/map/MiniMap";
import { useRenderTheme } from "@/components/shell/theme-provider";
import { NO_DATA, classify, colorOf } from "@/lib/colors";
import { CUES } from "@/lib/cues";
import { useNb4 } from "@/lib/nb4";
import { REGION_NAMES } from "@/lib/regions";
import type { RegionsData } from "@/lib/regionsData";

type Cascade = {
  reach1: number; reach4: number; reach8: number; never: number;
  start_lt4: number; four_lt8: number; continue_1_to_4: number; continue_4_to_8: number; n: number;
};

type Study = { what_if: { model: string; later: number; early: number; difference_pp: number }[] };

const pct = (v: number) => `${Math.round(v * 100)}%`;

const SCREENS = [
  { path: "/map", icon: MapIcon, title: "Map & regions",
    body: "Every region shaded by ANC1+, ANC4+ or ANC8+. Click one for its ladder and where women are lost." },
  { path: "/explore/ladder", icon: Layers, title: "The ANC ladder",
    body: "How many contacts women had, and who reaches each rung, by group and region." },
  { path: "/models", icon: Microscope, title: "Model analysis",
    body: "How well our three models predict ANC8+ on held-out women, and which predictors they lean on." },
  { path: "/your-data", icon: Upload, title: "Your data",
    body: "A tool, not a study finding: load routine ANC counts and see the trend and a forecast." },
];

export default function Overview() {
  const studio = useStudio();
  const policy = useJSON<{ cascade: Cascade }>("/policy.json");

  return (
    <Screen>
      {policy.state === "error" && <InlineError message={policy.error} />}
      {policy.state === "ready" && (
        <>
          <div data-help="overview.tiles" className="grid gap-10 grid-cols-2 lg:grid-cols-4">
            <StatTile label="Reach any ANC" value={pct(policy.data.cascade.reach1)} sub="at least one contact (ANC1+)" />
            <StatTile label="Reach four contacts" value={pct(policy.data.cascade.reach4)} sub="the earlier standard (ANC4+)" />
            <StatTile label="Reach eight contacts" value={pct(policy.data.cascade.reach8)}
                      sub="the WHO recommendation (ANC8+)" tone="bad" />
            <StatTile label="Lost between 4 and 8" value={pct(1 - policy.data.cascade.continue_4_to_8)}
                      sub="of women who reach four never reach eight" tone="warn" />
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <Cue>{CUES.anyAnc(policy.data.cascade.reach1)}</Cue>
            <Cue>{CUES.lost48(1 - policy.data.cascade.continue_4_to_8)}</Cue>
          </div>
        </>
      )}

      <KeyFindingAndMap />

      <div className="grid gap-10 md:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel help="overview.ladder"
          title="The antenatal care ladder"
          how="Each bar is the share of all women with a recent pregnancy who reached that rung. Between the bars: of the women on the rung above, how many continued and how many did not."
        >
          {policy.state === "ready" ? (
            <div className="p-14">
              <Funnel
                steps={[
                  { key: "all", label: "All women", value: 1 },
                  { key: "anc1", label: "ANC1+", value: policy.data.cascade.reach1 },
                  { key: "anc4", label: "ANC4+", value: policy.data.cascade.reach4 },
                  { key: "anc8", label: "ANC8+", value: policy.data.cascade.reach8 },
                ]}
              />
            </div>
          ) : (
            <PanelLoading rows={4} />
          )}
        </Panel>

        <Panel help="overview.tools" title="Where to look next">
          <div className="grid sm:grid-cols-2">
            {SCREENS.map((t, i) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.path}
                  href={studio.href(t.path)}
                  className={`group block px-14 py-12 border-border hover:bg-panel2 hover:no-underline text-text ${
                    i % 2 === 0 ? "sm:border-r" : ""
                  } ${i < 2 ? "border-b" : "border-b sm:border-b-0"} last:border-b-0`}
                >
                  <div className="flex items-center gap-7">
                    <Icon className="size-14 text-accent" />
                    <span className="text-12 font-semibold flex-1">{t.title}</span>
                    <ArrowRight className="size-12 text-faint group-hover:text-accent" />
                  </div>
                  <div className="text-11 text-dim mt-5 leading-relaxed">{t.body}</div>
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>
      <Link href={studio.href("/about")} className="text-10.5 text-accent hover:underline self-start">
        About the study
      </Link>
    </Screen>
  );
}

/**
 * The key finding from our model (notebook 3, table T8, ANC entry cohort) beside the
 * ANC8+ map of the full cohort, with its legend and every region's value.
 */
function KeyFindingAndMap() {
  const nb4 = useNb4();
  const studio = useStudio();
  const router = useRouter();
  const theme = useRenderTheme();
  const reg = useJSON<RegionsData>("/data/regions.json");
  const study = useJSON<Study>("/data/study.json");
  const geo = useJSON<FeatureCollection>("/geo/regions.geojson");
  const paths = useRegionPaths(geo.data);

  const map = useMemo(() => {
    if (!reg.data) return null;
    const vals = REGION_NAMES.map((r) => reg.data!.cohorts.full.regions[r]?.reach8 ?? null);
    const cls = classify(vals, "good", theme);
    const fills = Object.fromEntries(REGION_NAMES.map((r, i) => [r, colorOf(vals[i], cls, theme)]));
    const edges = [cls.min, ...cls.breaks, cls.max];
    const legend = cls.colors.map((c, i) => ({ c, label: `${pct(edges[i])}–${pct(edges[i + 1])}` }));
    const rows = REGION_NAMES.map((r, i) => ({ r, v: vals[i], fill: fills[r] }))
      .sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
    return { fills, legend, rows, national: reg.data.cohorts.full.national.reach8 };
  }, [reg.data, theme]);

  const wi = study.data?.what_if ?? [];
  const lr = wi.find((w) => w.model === "Logistic regression");
  const diffs = wi.map((w) => w.difference_pp);

  return (
    <div className="grid gap-10 md:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Panel help="overview.act-on" title="Key finding from our model"
        how="Notebook 3, table T8. Each of the 984 held-out women who started ANC was scored twice by the same model: once with her first visit set to early (by 12 weeks) and once set to later, with everything else unchanged.">
        {lr ? (
          <div className="px-14 py-12 flex flex-col gap-10">
            <div className="text-12.5 leading-relaxed">
              Among women who started ANC, the model predicts{" "}
              <b className="font-mono">{pct(lr.early)}</b> reach eight contacts with an early first visit, against{" "}
              <b className="font-mono">{pct(lr.later)}</b> with a later one.
            </div>
            <div className="grid grid-cols-3 gap-8">
              {wi.map((w) => (
                <div key={w.model} className="border border-border rounded-2 px-8 py-6">
                  <div className="text-9.5 uppercase tracking-label text-faint font-semibold truncate">{w.model}</div>
                  <div className="font-mono text-14 font-semibold mt-2">+{w.difference_pp.toFixed(1)} pts</div>
                  <div className="font-mono text-9.5 text-dim">{pct(w.later)} → {pct(w.early)}</div>
                </div>
              ))}
            </div>
            <div className="text-10.5 text-dim leading-relaxed">
              {Math.round(Math.min(...diffs))} to {Math.round(Math.max(...diffs))} points across the three models.
              This is a model contrast, not the effect of an intervention: an early first visit may also reflect better
              access and care-seeking.
            </div>
            {nb4.data && (
              <div className="text-10.5 leading-relaxed border-l-2 border-good pl-8">
                <span className="font-semibold">What women actually did:</span>{" "}
                <b className="font-mono">{pct(nb4.data.timing["Early initiation"].anc8)}</b> of early starters reached ANC8+, against{" "}
                <b className="font-mono">{pct(nb4.data.timing["Later initiation"].anc8)}</b> of later starters; but{" "}
                <b className="font-mono">{pct(1 - nb4.data.timing["Early initiation"].anc8)}</b> of early starters still did not reach eight (notebook 4).
              </div>
            )}
            <Cue>{CUES.earlyVisit}</Cue>
          </div>
        ) : (
          <PanelLoading rows={4} />
        )}
      </Panel>
      <Panel help="overview.minimap" title="ANC8+ by region"
        how="The share of women reaching eight contacts (full cohort, 6,893 women), in five classes; the legend gives each class's range. Click a region to open it on the map.">
        {paths.length && map ? (
          <div className="px-14 py-10 grid gap-12 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
            <div>
              <MiniMap paths={paths} fills={map.fills} noData={NO_DATA[theme]} title="ANC8+ by region"
                onSelect={(r) => router.push(studio.href(`/map?region=${encodeURIComponent(r)}&metric=anc8`))} />
              <div className="flex mt-6 gap-1" aria-label="Legend">
                {map.legend.map((l) => (
                  <div key={l.c} className="flex-1 min-w-0">
                    <div className="h-8 rounded-1" style={{ background: l.c }} />
                    <div className="text-8.5 font-mono text-faint mt-2 leading-tight truncate" title={l.label}>{l.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between text-9.5 uppercase tracking-label text-faint font-semibold pb-3 border-b border-border">
                <span>Region</span><span>ANC8+</span>
              </div>
              {map.rows.map((row) => (
                <button key={row.r} type="button"
                  onClick={() => router.push(studio.href(`/map?region=${encodeURIComponent(row.r)}&metric=anc8`))}
                  className="flex items-center gap-6 py-2 text-10.5 text-left hover:text-accent">
                  <span className="w-8 h-8 rounded-1 flex-none" style={{ background: row.fill }} />
                  <span className="flex-1 truncate">{row.r}</span>
                  <span className="font-mono">{row.v == null ? "–" : pct(row.v)}</span>
                </button>
              ))}
              <div className="flex items-center gap-6 pt-3 mt-2 border-t border-border text-10.5 font-semibold">
                <span className="w-8 flex-none" />
                <span className="flex-1">Ethiopia</span>
                <span className="font-mono">{pct(map.national)}</span>
              </div>
            </div>
          </div>
        ) : (
          <PanelLoading rows={4} />
        )}
      </Panel>
    </div>
  );
}
