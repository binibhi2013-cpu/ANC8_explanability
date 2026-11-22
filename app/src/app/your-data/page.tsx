"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileUp, ShieldCheck } from "lucide-react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis,
} from "recharts";
import RankedBars from "@/components/charts/RankedBars";
import { AXIS, ChartBox, GRID, SeriesLegend, TipPanel, tip } from "@/components/charts/rc";
import { DataNote,
  EmptyState, InlineError, Note, Panel, PanelLoading, Screen, Segmented, StatTile,
} from "@/components/studio/ui";
import { Select } from "@/components/ui/select";
import { RUNG_LABEL, pct } from "@/lib/explore";
import {
  aggregate, backtest, forecast, nextPeriods, parseAggregate, parseCSV, type Parsed,
} from "@/lib/forecast";
import { asset } from "@/lib/paths";

const SAMPLES = {
  survey: { file: "/samples/survey_regions_quarterly.csv", label: "Survey regions, by quarter",
    note: "Built from the survey: each region's share reaching each rung by quarter of birth, times its births. Real, but survey-sized: about 30–70 women per region and quarter, so it is noisy." },
} as const;
const TEMPLATE = "period,org_unit,expected_pregnancies,anc1,anc4,anc8\n2023-01,Health centre A,95,74,48,15\n2023-02,Health centre A,95,70,45,16\n";

type Measure = "anc1" | "anc4" | "anc8";

export default function YourDataPage() {
  return (
    <Screen>
      <div data-help="data.mode" className="flex flex-col gap-8">
        <Note tone="warn">
          <span className="text-text font-semibold">A tool, not a study finding.</span> This page forecasts routine ANC
          counts (for example a DHIS2 export) with simple time-series methods. It is not part of the study&apos;s analysis and
          uses none of the study&apos;s models.
        </Note>
        <span className="flex items-center gap-5 text-10.5 text-dim">
          <ShieldCheck className="size-13 text-good" />
          Files are read in this browser and never uploaded anywhere.
        </span>
      </div>
      <AggregateMode />
    </Screen>
  );
}

// --------------------------------------------------------------- aggregate counts

function AggregateMode() {
  const [source, setSource] = useState<keyof typeof SAMPLES | "upload">("survey");
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState("");
  const [measure, setMeasure] = useState<Measure>("anc4");
  const [asRate, setAsRate] = useState(false);
  const [horizon, setHorizon] = useState(12);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (source === "upload") return;
    setError(null);
    fetch(asset(SAMPLES[source].file))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status}`))))
      .then((t) => { setText(t); setFileName(SAMPLES[source].label); setUnit(""); })
      .catch((e) => setError(`Could not load the sample (${e.message}).`));
  }, [source]);

  const parsed: Parsed | null = useMemo(() => (text ? parseAggregate(text) : null), [text]);
  const hasExpected = !!parsed?.rows.some((r) => r.expected != null);
  const rate = asRate && hasExpected;
  const m = parsed?.season ?? 12;
  const h = Math.min(horizon, m === 4 ? 8 : 24);

  const series = useMemo(() => {
    if (!parsed || !parsed.periods.length) return null;
    const units = unit ? [unit] : null;
    const num = aggregate(parsed, units, measure);
    const den = aggregate(parsed, units, "expected");
    const y = num.map((v, i) => (v == null ? null : rate ? (den[i] ? v / (den[i] as number) : null) : v));
    const clean = y.filter((v): v is number => v != null);
    if (clean.length < 4) return null;
    const first = y.findIndex((v) => v != null);
    const ys = y.slice(first) as number[];
    const periods = parsed.periods.slice(first);
    const ranking = backtest(ys, m, h);
    const fc = forecast(ys, m, h, ranking);
    const lastDen = (den.filter((v) => v != null).slice(-1)[0] as number | undefined) ?? null;
    return { ys, periods, ranking, fc, lastDen };
  }, [parsed, unit, measure, rate, m, h]);


  if (error) return <InlineError message={error} />;

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setError("That file is over 20 MB; export a smaller period or fewer units."); return; }
    const r = new FileReader();
    r.onload = () => { setSource("upload"); setText(String(r.result)); setFileName(f.name); setUnit(""); setError(null); };
    r.readAsText(f);
  };

  const fmt = (v: number) => (rate ? pct(v, 1) : Math.round(v).toLocaleString());
  const chart = series && series.fc
    ? [
        ...series.ys.map((v, i) => ({ period: series.periods[i], actual: v })),
        ...nextPeriods(series.periods[series.periods.length - 1], h).map((p, i) => ({
          period: p,
          point: series.fc!.point[i],
          b80: [series.fc!.lo80[i], series.fc!.hi80[i]],
          b95: [series.fc!.lo95[i], series.fc!.hi95[i]],
        })),
      ]
    : [];
  const bridge = chart.length && series ? { ...chart[series.ys.length - 1], point: series.ys[series.ys.length - 1] } : null;
  if (bridge && series) chart[series.ys.length - 1] = bridge;

  const last = series?.ys[series.ys.length - 1];
  const yearAgo = series && series.ys.length > m ? series.ys[series.ys.length - 1 - m] : null;
  const end = series?.fc?.point[h - 1];

  return (
    <>
      <Panel help="data.source"
        title="Data"
        how="A CSV with one row per period and (optionally) per facility or area. Columns: period (2023-01 or 2023Q1), org_unit, expected_pregnancies (optional), anc1, anc4, anc8. DHIS2 exports with these names work; other names for the same things are recognised."
      >
        <div className="px-14 py-10 flex flex-wrap items-center gap-8">
          <Segmented
            label="Source"
            options={[
              { key: "survey", label: "Sample: survey regions" },
              { key: "upload", label: "Your file" },
            ]}
            value={source}
            onChange={(k) => (k === "upload" ? document.getElementById("agg-file")?.click() : setSource(k))}
          />
          <label className="h-24 px-10 rounded-2 border border-accent bg-accent text-white text-10.5 font-medium flex items-center gap-5 cursor-pointer">
            <FileUp className="size-12" /> Load a CSV
            <input id="agg-file" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="anc_counts_template.csv"
            className="h-24 px-10 rounded-2 border border-border2 bg-panel2 text-dim text-10.5 flex items-center gap-5 hover:text-text">
            <Download className="size-12" /> Template
          </a>
          <span className="text-10.5 text-dim">{fileName}</span>
        </div>
        {source !== "upload" && (
          <div className="px-14 pb-10">
            <Note tone="accent">{SAMPLES[source].note}</Note>
          </div>
        )}
        {parsed?.problems.length ? (
          <div className="px-14 pb-10 flex flex-col gap-4">
            {parsed.problems.map((p) => <Note key={p} tone="warn">{p}</Note>)}
          </div>
        ) : null}
      </Panel>

      {!parsed ? (
        <PanelLoading rows={6} />
      ) : !series ? (
        <EmptyState title="Not enough to forecast" body="The file needs at least four periods with ANC counts for the chosen measure." />
      ) : (
        <>
          <div data-help="data.tiles" className="grid gap-10 grid-cols-2 lg:grid-cols-4">
            <StatTile label={`Latest · ${series.periods[series.periods.length - 1]}`} value={fmt(last!)}
              sub={`${RUNG_LABEL[measure]}${rate ? " coverage" : " count"} · ${unit || "all units"}`} />
            <StatTile label="Against a year earlier" value={yearAgo != null ? `${last! >= yearAgo ? "+" : "−"}${rate ? `${Math.abs((last! - yearAgo) * 100).toFixed(1)} pt` : Math.abs(Math.round(last! - yearAgo)).toLocaleString()}` : "–"}
              sub={yearAgo != null ? `from ${fmt(yearAgo)}` : "less than a year of data"} tone={yearAgo != null && last! < yearAgo ? "bad" : "good"} />
            <StatTile label={`Forecast · ${h} ${m === 4 ? "quarters" : "months"} ahead`} value={end != null ? fmt(end) : "–"}
              sub={series.fc ? `80%: ${fmt(series.fc.lo80[h - 1])}–${fmt(series.fc.hi80[h - 1])}` : ""} tone="accent" />
            <StatTile label="Forecaster chosen" value={<span className="text-15">{series.ranking[0]?.label ?? "–"}</span>}
              sub={`smallest error in a backtest over ${series.ranking[0]?.origins ?? 0} forecast origins`} />
          </div>

          <Panel help="data.trend"
            title={`Trend and forecast · ${RUNG_LABEL[measure]} ${rate ? "coverage" : "count"}`}
            how="Solid: the data. Dashed: the forecast, from whichever forecaster made the smallest errors when it was tested on this same series (fit on the past, forecast the next periods, compare, repeat). The bands are 80% and 95% ranges built from those real errors."
            actions={
              <div className="flex items-center gap-8 flex-wrap">
                <Segmented label="Measure" options={(["anc1", "anc4", "anc8"] as Measure[]).map((k) => ({ key: k, label: RUNG_LABEL[k] }))}
                  value={measure} onChange={setMeasure} />
                {hasExpected && (
                  <Segmented label="Scale" options={[{ key: "count", label: "Count" }, { key: "rate", label: "Coverage" }]}
                    value={rate ? "rate" : "count"} onChange={(k) => setAsRate(k === "rate")} />
                )}
                {parsed.units.length > 1 && (
                  <Select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-auto min-w-[150px] h-22 text-10.5" aria-label="Unit">
                    <option value="">All {parsed.units.length} units</option>
                    {parsed.units.map((u) => <option key={u} value={u}>{u}</option>)}
                  </Select>
                )}
                <Segmented label="Horizon" options={(m === 4 ? [4, 8] : [6, 12, 24]).map((n) => ({ key: String(n), label: `${n} ${m === 4 ? "qtr" : "mo"}` }))}
                  value={String(Math.min(horizon, m === 4 ? 8 : 24))} onChange={(k) => setHorizon(Number(k))} />
              </div>
            }
          >
            <ChartBox height={300} className="pt-12 pr-14">
              <ComposedChart data={chart} margin={{ left: 4, right: 6, top: 8, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis {...AXIS} dataKey="period" interval="preserveStartEnd" minTickGap={24} />
                <YAxis {...AXIS} tickFormatter={(v) => (rate ? pct(v) : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)))} width={48} domain={[0, "auto"]} />
                <ReferenceLine x={series.periods[series.periods.length - 1]} stroke="var(--faint)" strokeDasharray="3 3" />
                <Tooltip
                  content={tip<Record<string, number | number[] | string | undefined>>((d) => (
                    <TipPanel title={String(d.period)} rows={[
                      ...(d.actual != null ? [{ label: "Data", value: fmt(d.actual as number), color: "var(--text)" }] : []),
                      ...(d.point != null && d.actual == null ? [{ label: "Forecast", value: fmt(d.point as number), color: "var(--accent)" }] : []),
                      ...(Array.isArray(d.b80) ? [{ label: "80% range", value: `${fmt(d.b80[0])}–${fmt(d.b80[1])}` }] : []),
                    ]} />
                  ))}
                />
                <Area dataKey="b95" stroke="none" fill="var(--accent)" fillOpacity={0.1} isAnimationActive={false} />
                <Area dataKey="b80" stroke="none" fill="var(--accent)" fillOpacity={0.18} isAnimationActive={false} />
                <Line dataKey="actual" stroke="var(--text)" strokeWidth={1.75} dot={{ r: 1.5 }} isAnimationActive={false} />
                <Line dataKey="point" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ChartBox>
            <SeriesLegend items={[
              { key: "a", label: "Data", color: "var(--text)" },
              { key: "f", label: `Forecast: ${series.ranking[0]?.label}`, color: "var(--accent)", dashed: true },
            ]} />
            <DataNote>Five or more years of monthly facility reports would let the seasonal forecasters show their strength; with a few years, simple methods usually win.</DataNote>
          </Panel>

          {!more ? (
            <button type="button" onClick={() => setMore(true)} className="text-10.5 text-accent hover:underline self-start">
              More: how each forecaster did, and the seasonal pattern
            </button>
          ) : (
          <div className="grid gap-10 md:gap-14 xl:grid-cols-2">
            <Panel help="data.forecasters"
              title="How each forecaster did on this series"
              how="Each forecaster was fitted on the start of the series and asked to forecast the next periods, over and over, moving forward one period at a time. The bar is its average miss. The shortest bar is used. When a simple method wins, the series has little pattern to learn."
            >
              <RankedBars
                labelWidth={210}
                valueWidth={70}
                rows={series.ranking.map((b, i) => ({
                  key: b.key,
                  label: b.label,
                  sub: `${b.origins} origins`,
                  value: b.mae,
                  display: fmt(b.mae),
                  color: i === 0 ? "var(--accent)" : "var(--faint)",
                }))}
              />
            </Panel>
            {m === 12 && series.ys.length >= 24 ? (
              <Seasonality ys={series.ys} periods={series.periods} />
            ) : (
              <Panel help="data.season" title="By season">
                <div className="px-14 py-12 text-11 text-dim">Seasonal patterns need at least two years of monthly data.</div>
              </Panel>
            )}
          </div>
          )}
        </>
      )}
    </>
  );
}

function Seasonality({ ys, periods }: { ys: number[]; periods: string[] }) {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // month effect: the average ratio of each month to its centred 12-month mean
  const ratios: number[][] = Array.from({ length: 12 }, () => []);
  for (let i = 6; i < ys.length - 6; i++) {
    const w = ys.slice(i - 6, i + 6);
    const avg = w.reduce((a, b) => a + b, 0) / 12;
    if (avg > 0) ratios[Number(periods[i].slice(5)) - 1].push(ys[i] / avg - 1);
  }
  const data = names.map((n, k) => ({ month: n, v: ratios[k].length ? ratios[k].reduce((a, b) => a + b, 0) / ratios[k].length : 0 }));
  return (
    <Panel help="data.season"
      title="By season"
      how="How much each calendar month runs above or below the year around it, averaged over the years in the file."
    >
      <ChartBox height={200} className="pt-10 pr-14">
        <BarChart data={data} margin={{ left: -4, right: 6, top: 6, bottom: 0 }}>
          <CartesianGrid {...GRID} vertical={false} />
          <XAxis {...AXIS} dataKey="month" interval={0} />
          <YAxis {...AXIS} tickFormatter={(v) => `${Math.round(v * 100)}%`} width={44} />
          <ReferenceLine y={0} stroke="var(--border2)" />
          <Tooltip content={tip<{ month: string; v: number }>((d) => <TipPanel title={d.month} rows={[{ label: "Against its year", value: `${d.v >= 0 ? "+" : "−"}${Math.abs(d.v * 100).toFixed(1)}%` }]} />)} />
          <Bar dataKey="v" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.month} fill={d.v >= 0 ? "var(--accent)" : "var(--bad)"} />)}
          </Bar>
        </BarChart>
      </ChartBox>
    </Panel>
  );
}

// ------------------------------------------------------------------ register mode
