"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import DotRows from "@/components/charts/DotRows";
import { AXIS, ChartBox, GRID, SeriesLegend, TipPanel, tip } from "@/components/charts/rc";
import { Cue, DataNote, InlineError, Note, Panel, PanelLoading, Screen, Segmented, StatTile, Tag } from "@/components/studio/ui";
import { CUES } from "@/lib/cues";
import { useJSON } from "@/lib/data";
import { COHORT_COLOR, RUNG_LABEL, pct, signed, type ExploreData } from "@/lib/explore";
import { REGION_NAMES } from "@/lib/regions";
import { REACH_OF, type RegionsData } from "@/lib/regionsData";
import { COHORTS, RUNGS, useStudio, type Cohort, type Rung } from "@/lib/studio";

/** The 24-month cohort and its EDHS-report check are parked until the study decides on
 *  that cohort. Set to true to show the check again. */
const SHOW_24_MONTH = false;

type EntryRow = {
  model: string; baseline: { ap: number }; extended: { ap: number };
  delta_ap: number; delta_ap_ci: [number, number];
};
type Study = { prevalence: { entry_heldout: number }; entry_performance: EntryRow[] };

export default function CohortsPage() {
  const studio = useStudio();
  const reg = useJSON<RegionsData>("/data/regions.json");
  const exp = useJSON<ExploreData>("/data/explore.json");
  const study = useJSON<Study>("/data/study.json");

  const rung = studio.rung;
  const place = studio.region || "Ethiopia";

  const reach = (c: Cohort, r: Rung, region: string | null) => {
    if (!reg.data || (c === "entry" && r === "anc1")) return null;
    const x = region ? reg.data.cohorts[c].regions[region] : reg.data.cohorts[c].national;
    return x ? x[REACH_OF[r]] : null;
  };
  const ci = (c: Cohort, r: Rung, region: string | null, i: 0 | 1) => {
    if (!reg.data || (c === "entry" && r === "anc1")) return null;
    const x = region ? reg.data.cohorts[c].regions[region] : reg.data.cohorts[c].national;
    return x ? x[`${REACH_OF[r]}_ci`][i] : null;
  };

  const contactLines = useMemo(() => {
    const c = exp.data?.contacts;
    if (!c) return null;
    const cap = exp.data?.contact_cap ?? 12;
    return Array.from({ length: cap + 1 }, (_, k) => ({
      k: k === cap ? `${cap}+` : String(k),
      ...Object.fromEntries(COHORTS.map((co) => [co.key, c[co.key]?.[place]?.share[k] ?? null])),
    }));
  }, [exp.data, place]);

  const edhs = useMemo(() => {
    if (!reg.data || !exp.data) return null;
    const rows = REGION_NAMES.map((r) => ({
      region: r,
      ours: reg.data!.cohorts.recent.regions[r]?.reach4 ?? null,
      report: exp.data!.edhs_anc4.regions[r] ?? null,
    }));
    const diffs = rows.filter((r) => r.ours != null && r.report != null).map((r) => Math.abs(r.ours! - r.report!));
    return {
      rows: rows.sort((a, b) => (b.report ?? 0) - (a.report ?? 0)),
      mad: diffs.reduce((a, b) => a + b, 0) / diffs.length,
      worst: Math.max(...diffs),
      national: reg.data.cohorts.recent.national.reach4,
      reportNational: exp.data.edhs_anc4.national,
    };
  }, [reg.data, exp.data]);

  const err = reg.error ?? exp.error ?? study.error;
  if (err) return <Screen><InlineError message={err} /></Screen>;


  return (
    <Screen>
      <div data-help="cohorts.tiles" className="grid gap-10 grid-cols-1 md:grid-cols-2">
        {COHORTS.map((c) => (
          <StatTile
            key={c.key}
            label={c.label}
            value={c.n.toLocaleString()}
            sub={c.blurb}
            active={studio.cohort === c.key}
            onClick={() => studio.set({ cohort: c.key })}
          >
            <div className="mt-8 flex gap-10 font-mono text-10.5">
              {RUNGS.map((r) => (
                <span key={r.key} className="text-dim">
                  {r.label} <span className="text-text font-semibold">{pct(reach(c.key, r.key, null))}</span>
                </span>
              ))}
            </div>
          </StatTile>
        ))}
      </div>

      <div className="grid gap-10 md:gap-14 xl:grid-cols-2">
        <Panel help="cohorts.ladder"
          title={`The ladder in each cohort · ${place}`}
          how="Each row is a rung; each dot is one cohort's share reaching it, with its 95% interval. The ANC-entry cohort starts at ANC1+ by definition (every woman in it had a first visit), so its ANC4+ and ANC8+ are higher: they are shares of women who started."
        >
          {reg.data ? (
            <DotRows
              rows={RUNGS.map((r) => ({
                key: r.key,
                label: r.label,
                values: Object.fromEntries(COHORTS.map((c) => [c.key, reach(c.key, r.key, studio.region || null)])),
                lo: Object.fromEntries(COHORTS.map((c) => [c.key, ci(c.key, r.key, studio.region || null, 0)])),
                hi: Object.fromEntries(COHORTS.map((c) => [c.key, ci(c.key, r.key, studio.region || null, 1)])),
                display: pct(reach(studio.cohort, r.key, studio.region || null)),
              }))}
              series={COHORTS.map((c) => ({ key: c.key, label: c.label, color: COHORT_COLOR[c.key] }))}
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              format={(v) => pct(v)}
              connect={false}
              active={rung}
              onSelect={(k) => studio.set({ rung: k as Rung })}
              labelWidth={90}
            />
          ) : (
            <PanelLoading rows={3} />
          )}
        </Panel>

        <Panel help="cohorts.contacts"
          title={`Contact counts in each cohort · ${place}`}
          how="The share of women with each number of contacts, one line per cohort. The ANC-entry line has no zero (every woman in it started ANC) and so sits higher everywhere else."
        >
          {contactLines ? (
            <>
              <ChartBox height={210} className="pt-10 pr-14">
                <LineChart data={contactLines} margin={{ left: -8, right: 6, top: 6, bottom: 0 }}>
                  <CartesianGrid {...GRID} vertical={false} />
                  <XAxis {...AXIS} dataKey="k" interval={0} />
                  <YAxis {...AXIS} tickFormatter={(v) => pct(v)} width={44} />
                  <Tooltip
                    content={tip<Record<string, number | string>>((d) => (
                      <TipPanel
                        title={`${d.k} contacts`}
                        rows={COHORTS.map((c) => ({ label: c.label, value: pct(d[c.key] as number, 1), color: COHORT_COLOR[c.key] }))}
                      />
                    ))}
                  />
                  {COHORTS.map((c) => (
                    <Line key={c.key} dataKey={c.key} stroke={COHORT_COLOR[c.key]} strokeWidth={studio.cohort === c.key ? 2.5 : 1.5}
                      dot={{ r: 2, strokeWidth: 0, fill: COHORT_COLOR[c.key] }} isAnimationActive={false} connectNulls />
                  ))}
                </LineChart>
              </ChartBox>
              <SeriesLegend items={COHORTS.map((c) => ({ key: c.key, label: c.label, color: COHORT_COLOR[c.key] }))} />
            </>
          ) : (
            <PanelLoading rows={5} />
          )}
        </Panel>
      </div>

      <div className="grid gap-10 md:gap-14 xl:grid-cols-2">
        <Panel help="cohorts.regions"
          title={`Region by region, both cohorts · ${RUNG_LABEL[rung]}`}
          how="Each region's share reaching the rung in the full cohort and among women who started ANC. The ANC-entry share is higher because women with no ANC are not in it."
          actions={
            <Segmented label="Rung" options={RUNGS.map((r) => ({ key: r.key, label: r.label }))} value={rung}
              onChange={(k) => studio.set({ rung: k })} />
          }
        >
          {reg.data ? (
            <DotRows
              rows={[...REGION_NAMES]
                .sort((a, b) => (reach("full", rung, b) ?? 0) - (reach("full", rung, a) ?? 0))
                .map((r) => ({
                  key: r,
                  label: r,
                  values: Object.fromEntries(COHORTS.map((c) => [c.key, reach(c.key, rung, r)])),
                  display: pct(reach("full", rung, r)),
                }))}
              series={COHORTS.map((c) => ({ key: c.key, label: c.label, color: COHORT_COLOR[c.key] }))}
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              format={(v) => pct(v)}
              active={studio.region}
              onSelect={(k) => studio.set({ region: k === studio.region ? "" : k })}
              labelWidth={150}
              valueWidth={48}
            />
          ) : (
            <PanelLoading rows={10} />
          )}
          <div className="px-14 pb-12">
            <Note tone="accent">The number at the right is the full cohort&apos;s value.</Note>
          </div>
          <DataNote>Earlier EDHS rounds would give a trend across surveys rather than one reconstructed from birth dates.</DataNote>
        </Panel>

        {SHOW_24_MONTH && <Panel help="cohorts.edhs"
          title="The 24-month cohort reproduces the EDHS report"
          how="ANC4+ by region: rings are the EDHS 2024–25 report's table (women with a live birth in the two years before the survey), dots are this study's 24-month cohort computed from the raw data. Matching them is the check that the cohort, the weights and the contact count are built the way DHS builds them."
          actions={edhs ? <Tag tone="good">mean gap {(edhs.mad * 100).toFixed(1)} pt</Tag> : undefined}
        >
          {edhs ? (
            <>
              <DotRows
                rows={[
                  {
                    key: "Ethiopia",
                    label: <span className="font-semibold">Ethiopia</span>,
                    values: { report: edhs.reportNational, ours: edhs.national },
                    display: signed((edhs.national - edhs.reportNational) * 100, 1),
                  },
                  ...edhs.rows.map((r) => ({
                    key: r.region,
                    label: r.region,
                    values: { report: r.report, ours: r.ours },
                    display: r.ours != null && r.report != null ? signed((r.ours - r.report) * 100, 1) : "–",
                  })),
                ]}
                series={[
                  { key: "report", label: "EDHS report", color: "var(--dim)", hollow: true },
                  { key: "ours", label: "This study, 24-month cohort", color: "var(--good)" },
                ]}
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                format={(v) => pct(v)}
                active={studio.region}
                onSelect={(k) => k !== "Ethiopia" && studio.set({ region: k === studio.region ? "" : k })}
                labelWidth={150}
                valueWidth={48}
              />
              <div className="px-14 pb-12">
                <Note tone="good">
                  Largest regional gap {(edhs.worst * 100).toFixed(1)} points; national {pct(edhs.national, 1)} against the report&apos;s{" "}
                  {pct(edhs.reportNational, 1)}.
                </Note>
              </div>
            </>
          ) : (
            <PanelLoading rows={10} />
          )}
        </Panel>}
      </div>

      <div className="grid gap-10 md:gap-14 xl:grid-cols-2">
        <Panel help="cohorts.first-visit"
          title="What the first visit adds · ANC8+"
          how="Manuscript Table 3 (study file Table_2_anc_entry_probability_performance.csv). The 984 held-out women who started ANC, scored by each model without (ring) and with (dot) whether the first visit came by 12 weeks. Under each model: the gain in average precision and its 95% interval from the paired bootstrap."
        >
          {study.data ? (
            <>
              <DotRows
                rows={study.data.entry_performance.map((m) => ({
                  key: m.model,
                  label: m.model,
                  sub: `gain ${signed(m.delta_ap, 3)} (${signed(m.delta_ap_ci[0], 3)} to ${signed(m.delta_ap_ci[1], 3)})`,
                  values: { without: m.baseline.ap, with: m.extended.ap },
                  display: signed(m.delta_ap, 3),
                }))}
                series={[
                  { key: "without", label: "21 predictors", color: "var(--dim)", hollow: true },
                  { key: "with", label: "21 + early first visit", color: "var(--cross)" },
                ]}
                reference={{ value: study.data.prevalence.entry_heldout, label: "Chance" }}
                format={(v) => v.toFixed(2)}
                labelWidth={190}
              />
              <div className="px-14 pb-12 flex flex-col gap-8">
                <Note tone="accent">Every interval includes zero: the point estimates favour adding early initiation, but its added predictive value is uncertain.</Note>
                <Cue>{CUES.firstVisitAdds(Math.min(...study.data.entry_performance.map((m) => m.delta_ap)), Math.max(...study.data.entry_performance.map((m) => m.delta_ap)))}</Cue>
              </div>
            </>
          ) : (
            <PanelLoading rows={3} />
          )}
        </Panel>
      </div>
    </Screen>
  );
}
