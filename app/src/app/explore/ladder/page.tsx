"use client";

import { useMemo, useState } from "react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis,
} from "recharts";
import DotRows, { niceTicks } from "@/components/charts/DotRows";
import MatrixHeat from "@/components/charts/MatrixHeat";
import RankedBars from "@/components/charts/RankedBars";
import { AXIS, ChartBox, GRID, SeriesLegend, TipPanel, tip } from "@/components/charts/rc";
import { useRenderTheme } from "@/components/shell/theme-provider";
import { DataNote, InlineError, Note, Panel, PanelLoading, Picker, Screen, Segmented, StatTile, Tag } from "@/components/studio/ui";
import type { Analysis } from "@/lib/analysis";
import { useJSON } from "@/lib/data";
import { RUNG_COLOR, RUNG_LABEL, pct, type ExploreData } from "@/lib/explore";
import { DOMAIN_COLORS, label } from "@/lib/labels";
import { REGION_NAMES } from "@/lib/regions";
import { cohortRungs, REACH_OF, type RegionsData, type SubgroupRow } from "@/lib/regionsData";
import { COHORTS, useStudio, type Rung } from "@/lib/studio";
import { MODEL_ABBR, type Explained } from "@/lib/modelCards";
import { EquityPanel, RegionPathwayPanel, RegionTravelPanel } from "@/components/nb4/Nb4Panels";

const BAND = (k: number) => (k === 0 ? "var(--bad)" : k < 4 ? "var(--rung1)" : k < 8 ? "var(--rung4)" : "var(--rung8)");
const BANDS = [
  { key: "0", label: "No ANC", color: "var(--bad)" },
  { key: "1", label: "1–3 contacts (ANC1+)", color: "var(--rung1)" },
  { key: "4", label: "4–7 (ANC4+)", color: "var(--rung4)" },
  { key: "8", label: "8 or more (ANC8+)", color: "var(--rung8)" },
];

const reach = (r: SubgroupRow, k: Rung) => (k === "anc1" ? r.reach1 : k === "anc4" ? r.reach4 : r.reach8);

// A model's name (the domain's share of what it uses, on the 21), or drop-one.
type Method = string;
const DROP = "drop-one";

export default function LadderPage() {
  const studio = useStudio();
  const theme = useRenderTheme();
  const reg = useJSON<RegionsData>("/data/regions.json");
  const exp = useJSON<ExploreData>("/data/explore.json");
  const ana = useJSON<Analysis>("/analysis.json");
  const explained = useJSON<Explained>("/data/explain.json");
  const [dim, setDim] = useState("Wealth");
  const METHODS = [
    ...(explained.data?.models ?? []).map((m) => ({ key: m, label: MODEL_ABBR[m] ?? m, title: `The domain's share of what ${m} uses (the 21 predictors)` })),
    { key: DROP, label: "Drop-one", title: "Share of the accuracy lost when the domain is removed" },
  ];
  const [picked, setMethod] = useState<Method>("");
  const method = METHODS.some((m) => m.key === picked) ? picked : METHODS[0]?.key ?? DROP;
  const [focus, setFocus] = useState<string | null>(null);

  const place = studio.region || "Ethiopia";
  const cohort = studio.cohort;
  const cohortInfo = COHORTS.find((c) => c.key === cohort)!;

  const cascade = reg.data
    ? studio.region
      ? reg.data.cohorts[cohort].regions[studio.region]
      : reg.data.cohorts[cohort].national
    : null;

  // The contact count: the one distribution the three rungs cut.
  const contacts = useMemo(() => {
    const c = exp.data?.contacts?.[cohort];
    if (!c) return null;
    const here = c[place]?.share ?? [];
    const nat = c.Ethiopia?.share ?? [];
    const cap = exp.data?.contact_cap ?? 12;
    const hist = here.map((s, k) => ({ k: k === cap ? `${cap}+` : String(k), n: k, share: s, national: nat[k] }));
    const tail = (arr: number[], k: number) => arr.slice(k).reduce((a, b) => a + b, 0);
    const surv = Array.from({ length: cap + 1 }, (_, k) => ({
      k, here: tail(here, k), national: tail(nat, k),
    })).slice(1);
    return { hist, surv, n: c[place]?.n ?? 0 };
  }, [exp.data, cohort, place]);

  // Only groupings that are among the study's 21 predictors (not age at the birth or
  // health-post access), and only groups of at least 25 women.
  const STUDY_DIMS = ["Wealth", "Education", "Residence", "Pregnancy wanted", "Pregnancy number", "Health insurance"];
  const dims = reg.data ? Object.keys(reg.data.subgroups[cohort]?.[place] ?? {}).filter((d) => STUDY_DIMS.includes(d)) : [];
  const subRows = (reg.data?.subgroups[cohort]?.[place]?.[dims.includes(dim) ? dim : dims[0]] ?? []).filter((r) => !r.small);
  const rungs = cohortRungs(cohort);

  const domainData = useMemo(() => {
    const pool = explained.data?.rungs;
    const rows: Record<string, unknown>[] = method === DROP || !pool
      ? (ana.data?.ladder?.domain_rollup?.filter((r) => r.method === "drop-one") ?? [])
      : Object.keys(pool.anc8?.domains ?? {}).map((dmn) => ({
          domain: dmn,
          anc1plus: pool.anc1?.domains[dmn]?.[method] ?? 0,
          anc4plus: pool.anc4?.domains[dmn]?.[method] ?? 0,
          anc8plus: pool.anc8?.domains[dmn]?.[method] ?? 0,
        }));
    const domains = rows.map((r) => String(r.domain));
    const data = (["anc1plus", "anc4plus", "anc8plus"] as const).map((o) => ({
      rung: RUNG_LABEL[o],
      ...Object.fromEntries(rows.map((r) => [String(r.domain), Number(r[o])])),
    }));
    const top = Math.max(0.05, ...rows.flatMap((r) => [Number(r.anc1plus), Number(r.anc4plus), Number(r.anc8plus)]));
    const ticks = niceTicks(0, top, 4);
    if (ticks[ticks.length - 1] < top) ticks.push(+(ticks[ticks.length - 1] + (ticks[1] - ticks[0])).toFixed(10));
    return { domains, data, ticks };
  }, [ana.data, explained.data, method]);

  const err = reg.error ?? exp.error ?? ana.error;
  if (err) return <Screen><InlineError message={err} /></Screen>;

  return (
    <Screen>
      {/* The rungs, for the current place and cohort. */}
      {cascade ? (
        <div data-help="ladder.tiles" className="grid gap-10 grid-cols-2 lg:grid-cols-4">
          {rungs.map((r) => (
            <StatTile
              key={r}
              label={`Reach ${RUNG_LABEL[r]}`}
              value={pct(cascade[REACH_OF[r]])}
              sub={`95% CI ${pct(cascade[`${REACH_OF[r]}_ci`][0])}–${pct(cascade[`${REACH_OF[r]}_ci`][1])} · ${place}`}
              tone={r === "anc8" ? "bad" : undefined}
              active={studio.rung === r}
              onClick={() => studio.set({ rung: r })}
            />
          ))}
          <StatTile
            label="Lost between 4 and 8"
            value={pct(1 - cascade.continue_4_to_8)}
            sub="of women who reach four contacts never reach eight"
            tone="warn"
          />
        </div>
      ) : (
        <PanelLoading rows={2} />
      )}

      <div className="grid gap-10 md:gap-14 ">
        <Panel help="ladder.contacts"
          title={`How many contacts women had · ${place}`}
          how="Each bar is the share of women with that many antenatal contacts. The three rungs are cuts through this one distribution: ANC1+ is every bar after the red one, ANC4+ from 4, ANC8+ from 8. Note the peaks at 3–4 and at 8. When a region is selected, the dashed line is Ethiopia."
          actions={<Tag>{cohortInfo.short} · n {contacts?.n.toLocaleString() ?? "–"}</Tag>}
        >
          {contacts ? (
            <>
              <ChartBox height={230} className="pt-10 pr-10">
                <ComposedChart data={contacts.hist} margin={{ left: -8, right: 6, top: 6, bottom: 0 }}>
                  <CartesianGrid {...GRID} vertical={false} />
                  <XAxis {...AXIS} dataKey="k" interval={0} />
                  <YAxis {...AXIS} tickFormatter={(v) => pct(v)} width={44} />
                  <Tooltip
                    cursor={{ fill: "var(--panel3)", opacity: 0.6 }}
                    content={tip<(typeof contacts.hist)[number]>((d) => (
                      <TipPanel
                        title={`${d.k} contact${d.n === 1 ? "" : "s"}`}
                        rows={[
                          { label: place, value: pct(d.share, 1), color: BAND(d.n) },
                          ...(studio.region ? [{ label: "Ethiopia", value: pct(d.national, 1) }] : []),
                        ]}
                      />
                    ))}
                  />
                  <Bar dataKey="share" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={500}>
                    {contacts.hist.map((d) => (
                      <Cell key={d.k} fill={BAND(d.n)} />
                    ))}
                  </Bar>
                  {studio.region && (
                    <Line dataKey="national" stroke="var(--text)" strokeDasharray="4 3" strokeWidth={1.5} dot={false} type="monotone" />
                  )}
                </ComposedChart>
              </ChartBox>
              <SeriesLegend items={BANDS} />
            </>
          ) : (
            <PanelLoading />
          )}
        </Panel>

      </div>



      <EquityPanel />

      <div className="grid gap-10 md:gap-14 xl:grid-cols-2">
        <RegionPathwayPanel />
        <RegionTravelPanel />
      </div>

    </Screen>
  );
}
