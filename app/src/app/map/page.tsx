"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import { Layers, Pause, Play, Tag as TagIcon } from "lucide-react";
import Heatmap from "@/components/charts/Heatmap";
import RankedBars from "@/components/charts/RankedBars";
import Legend from "@/components/map/Legend";
import MiniMap, { useRegionPaths } from "@/components/map/MiniMap";
import RegionPanel from "@/components/map/RegionPanel";
import { useRenderTheme } from "@/components/shell/theme-provider";
import { DataNote, InlineError, Panel, PanelLoading, Screen, Segmented } from "@/components/studio/ui";
import { Select } from "@/components/ui/select";
import { classify, colorOf, inkOn } from "@/lib/colors";
import { useJSON } from "@/lib/data";
import { LADDER_KEYS, allMetrics, formatValue, type Metric } from "@/lib/metrics";
import { REGION_NAMES } from "@/lib/regions";
import type { RegionsData } from "@/lib/regionsData";
import { useStudio, type Rung } from "@/lib/studio";

// Leaflet reads `window` when it loads, so the map is browser-only.
const RegionMap = dynamic(() => import("@/components/map/RegionMap"), {
  ssr: false,
  loading: () => <div className="h-[460px] bg-panel2" />,
});

const HEATMAP_SETS = {
  ladder: { label: "Ladder & losses", groups: ["The ladder", "Where women are lost"] },
  circumstances: { label: "Circumstances", groups: ["Circumstances"] },
  all: { label: "Everything", groups: ["The ladder", "Where women are lost", "Circumstances"] },
} as const;

// A fixed 0-100% scale for the three ladder maps, so they can be compared with each
// other: the country visibly empties from ANC1+ to ANC8+.
const LADDER_BREAKS = { breaks: [0.2, 0.4, 0.6, 0.8], min: 0, max: 1 };

export default function MapPage() {
  const studio = useStudio();
  const theme = useRenderTheme();
  const geo = useJSON<FeatureCollection>("/geo/regions.geojson");
  const reg = useJSON<RegionsData>("/data/regions.json");
  const paths = useRegionPaths(geo.data);
  const [basemap, setBasemap] = useState(true);
  const [labels, setLabels] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [heatSet, setHeatSet] = useState<keyof typeof HEATMAP_SETS>("ladder");

  const data = reg.data;
  const metrics = useMemo(() => (data ? allMetrics(data) : []), [data]);
  const usable = useMemo(
    () => (data ? metrics.filter((m) => REGION_NAMES.some((r) => m.value(data, studio.cohort, r) != null)) : []),
    [data, metrics, studio.cohort],
  );
  const metric: Metric | undefined = usable.find((m) => m.key === studio.metric) ?? usable.find((m) => m.key === "anc8");

  // "Play the ladder": step the map through ANC1+ -> ANC4+ -> ANC8+.
  useEffect(() => {
    if (!playing) return;
    const seq = LADDER_KEYS.filter((k) => usable.some((m) => m.key === k));
    let i = Math.max(0, seq.indexOf(studio.metric));
    const t = setInterval(() => {
      i = (i + 1) % seq.length;
      studio.set({ metric: seq[i] });
    }, 1700);
    return () => clearInterval(t);
  }, [playing, usable, studio]);

  const view = useMemo(() => {
    if (!data || !metric) return null;
    const vals = REGION_NAMES.map((r) => metric.value(data, studio.cohort, r));
    const classes = classify(vals, metric.scale, theme);
    const mapData = Object.fromEntries(
      REGION_NAMES.map((r, i) => {
        const fill = colorOf(vals[i], classes, theme);
        return [r, { value: formatValue(metric, vals[i]), fill, ink: inkOn(fill, theme) }];
      }),
    );
    const rows = REGION_NAMES.map((r, i) => ({
      key: r,
      label: r,
      value: vals[i],
      display: formatValue(metric, vals[i]),
      color: colorOf(vals[i], classes, theme),
    })).sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
    return { classes, mapData, rows, national: metric.value(data, studio.cohort, null) };
  }, [data, metric, studio.cohort, theme]);

  const ladderFills = useMemo(() => {
    if (!data) return [];
    const colors = classify([0, 1], "good", theme).colors;
    return LADDER_KEYS.map((k) => {
      const m = metrics.find((x) => x.key === k)!;
      const cls = { ...LADDER_BREAKS, colors };
      const fills = Object.fromEntries(REGION_NAMES.map((r) => [r, colorOf(m.value(data, studio.cohort, r), cls, theme)]));
      return { m, fills, national: m.value(data, studio.cohort, null) };
    });
  }, [data, metrics, studio.cohort, theme]);

  const select = (region: string) => studio.set({ region: region === studio.region ? "" : region });

  if (geo.state === "error" || reg.state === "error") {
    return (
      <Screen>
        <InlineError message={geo.error ?? reg.error ?? ""} />
      </Screen>
    );
  }

  const grouped = usable.reduce<Record<string, Metric[]>>((acc, m) => {
    (acc[m.group] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className={`min-h-full grid ${studio.region && data ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
      <Screen className="min-w-0">
        <Panel help="map.layer"
          title="Map layer"
          actions={
            <div className="flex items-center gap-8 flex-wrap">
              <Segmented
                label="Rung"
                options={LADDER_KEYS.filter((k) => usable.some((m) => m.key === k)).map((k) => ({
                  key: k,
                  label: k === "anc1" ? "ANC1+" : k === "anc4" ? "ANC4+" : "ANC8+",
                }))}
                value={(LADDER_KEYS.includes(studio.metric) ? studio.metric : "") as string}
                onChange={(k) => {
                  setPlaying(false);
                  studio.set({ metric: k });
                }}
              />
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className={`h-22 px-8 rounded-2 border text-9.5 font-medium flex items-center gap-4 ${
                  playing ? "bg-accent text-white border-accent" : "bg-panel2 border-border2 text-dim hover:text-text"
                }`}
                title="Step the map through ANC1+, ANC4+ and ANC8+"
              >
                {playing ? <Pause className="size-11" /> : <Play className="size-11" />}
                {playing ? "Pause" : "Play the ladder"}
              </button>
            </div>
          }
        >
          <div className="px-14 py-9 flex flex-wrap items-center gap-10">
            <label className="flex items-center gap-8 min-w-[220px] flex-1 basis-[260px] max-w-[440px]">
              <span className="text-9.5 uppercase tracking-label text-faint font-semibold whitespace-nowrap">Show</span>
              <Select
                value={metric?.key ?? ""}
                onChange={(e) => {
                  setPlaying(false);
                  studio.set({ metric: e.target.value });
                }}
                aria-label="Map layer"
              >
                {Object.entries(grouped).map(([g, ms]) => (
                  <optgroup key={g} label={g}>
                    {ms.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </label>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setBasemap((b) => !b)}
              aria-pressed={basemap}
              className={`h-22 px-8 rounded-2 border text-9.5 font-medium flex items-center gap-4 ${
                basemap ? "bg-soft border-accent text-accent" : "bg-panel2 border-border2 text-dim"
              }`}
              title="Show or hide the background map (hide it where there is no internet)"
            >
              <Layers className="size-11" /> Background map
            </button>
            <button
              type="button"
              onClick={() => setLabels((b) => !b)}
              aria-pressed={labels}
              className={`h-22 px-8 rounded-2 border text-9.5 font-medium flex items-center gap-4 ${
                labels ? "bg-soft border-accent text-accent" : "bg-panel2 border-border2 text-dim"
              }`}
            >
              <TagIcon className="size-11" /> Values on map
            </button>
          </div>
        </Panel>

        <div className="grid gap-10 md:gap-14 xl:grid-cols-[minmax(0,1fr)_330px]">
          <Panel help="map.map"
            title={metric ? metric.label : "Map"}
            how="Each region is shaded by the layer chosen above; the legend gives the ranges. Click a region for its full analysis. The hatched area is contested and has no survey region."
            bodyClassName="relative"
          >
            {geo.data && view && metric ? (
              <>
                <RegionMap
                  geo={geo.data}
                  data={view.mapData}
                  selected={studio.region}
                  onSelect={select}
                  basemap={basemap}
                  theme={theme}
                  labels={labels}
                />
                <div className="absolute right-10 bottom-22 z-[500] pointer-events-auto max-w-[calc(100%-20px)]">
                  <Legend metric={metric} classes={view.classes} theme={theme} />
                </div>
              </>
            ) : (
              <PanelLoading rows={8} />
            )}
            <DataNote>With the survey&apos;s cluster coordinates (the DHS GPS file), this map could show zones and clusters instead of fourteen regions, and follow roads and health facilities.</DataNote>
          </Panel>

          <Panel help="map.ranked"
            title="Regions, ranked"
            how="The same values as the map, highest first. The dashed tick is Ethiopia. Click a region to open its analysis."
            actions={
              metric && view ? (
                <span className="font-mono text-9.5 text-dim">ETH {formatValue(metric, view.national)}</span>
              ) : null
            }
          >
            {view && metric ? (
              <RankedBars
                rows={view.rows}
                active={studio.region}
                onSelect={select}
                reference={metric.kind === "gap" ? null : view.national}
                signed={metric.kind === "gap"}
              />
            ) : (
              <PanelLoading rows={10} />
            )}
          </Panel>
        </div>

        <Panel help="map.ladder-maps"
          title="The ladder, region by region"
          how="The same map three times, on one fixed scale from 0 to 100%. Read left to right: the country empties from reaching care to completing it. Click a region to open it."
        >
          {paths.length && data ? (
            <div className="grid sm:grid-cols-3">
              {ladderFills.map(({ m, fills, national }, i) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => studio.set({ metric: m.key })}
                  className={`p-10 text-left hover:bg-panel2 ${i < 2 ? "sm:border-r border-b sm:border-b-0 border-border" : ""} ${
                    studio.metric === m.key ? "bg-soft" : ""
                  }`}
                  disabled={m.value(data, studio.cohort, null) == null}
                >
                  <div className="flex items-baseline gap-8 mb-4">
                    <span className="text-12 font-semibold">{m.short}</span>
                    <span className="font-mono text-10.5 text-dim">Ethiopia {formatValue(m, national)}</span>
                  </div>
                  <MiniMap
                    paths={paths}
                    fills={fills}
                    selected={studio.region}
                    onSelect={select}
                    title={`${m.label} by region`}
                    noData={theme === "dark" ? "#1f2830" : "#dfe5ec"}
                  />
                </button>
              ))}
            </div>
          ) : (
            <PanelLoading rows={4} />
          )}
          <div className="px-14 py-7 border-t border-border flex items-center gap-6 text-9.5 text-faint flex-wrap">
            <span>share of women:</span>
            {classify([0, 1], "good", theme).colors.map((c, i) => (
              <span key={c} className="flex items-center gap-3">
                <span className="w-10 h-8 rounded-1" style={{ background: c }} />
                {["0–20%", "20–40%", "40–60%", "60–80%", "80–100%"][i]}
              </span>
            ))}
          </div>
        </Panel>

        <Panel help="map.heatmap"
          title="Every region, every measure"
          how="Regions down, measures across. Each column is shaded on its own scale, so compare regions within a column. Click a cell to put that measure on the map and open the region; click a column title to change the map only."
          actions={
            <Segmented
              label="Measures"
              options={Object.entries(HEATMAP_SETS).map(([k, v]) => ({ key: k as keyof typeof HEATMAP_SETS, label: v.label }))}
              value={heatSet}
              onChange={setHeatSet}
            />
          }
          bodyClassName="px-10 py-10"
        >
          {data && metric ? (
            <Heatmap
              data={data}
              cohort={studio.cohort}
              regions={[...REGION_NAMES].sort(
                (a, b) => (metric.value(data, studio.cohort, b) ?? -Infinity) - (metric.value(data, studio.cohort, a) ?? -Infinity),
              )}
              metrics={usable.filter((m) => (HEATMAP_SETS[heatSet].groups as readonly string[]).includes(m.group))}
              activeMetric={metric.key}
              activeRegion={studio.region}
              onCell={(r, m) => studio.set({ region: r, metric: m })}
              onHeader={(m) => studio.set({ metric: m })}
              theme={theme}
            />
          ) : (
            <PanelLoading rows={10} />
          )}
          <DataNote>Each region rests on a few hundred women; pooling earlier survey rounds would narrow the intervals and let the smaller regions be read with more confidence.</DataNote>
        </Panel>
      </Screen>

      {studio.region && data && (
        <div className="fixed inset-0 top-38 bottom-24 z-[1250] lg:static lg:z-auto lg:h-[calc(100dvh-98px)] lg:sticky lg:top-0">
          <RegionPanel
            data={data}
            region={studio.region}
            cohort={studio.cohort}
            rung={studio.rung as Rung}
            onRung={(r) => studio.set({ rung: r })}
            onClose={() => studio.set({ region: "" })}
          />
        </div>
      )}
    </div>
  );
}
