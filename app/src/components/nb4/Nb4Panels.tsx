"use client";

import { useState } from "react";
import DotRows from "@/components/charts/DotRows";
import MatrixHeat from "@/components/charts/MatrixHeat";
import { useRenderTheme } from "@/components/shell/theme-provider";
import { Select } from "@/components/ui/select";
import { Cue, DataNote, Panel, PanelLoading, Picker, Segmented } from "@/components/studio/ui";
import { CUES } from "@/lib/cues";
import { EQUITY_KEYS, TRAVEL_BANDS, pp, reviewFor, useNb4, type Nb4, type StageKey } from "@/lib/nb4";
import { REGION_NAMES } from "@/lib/regions";
import { useStudio } from "@/lib/studio";

/**
 * The study's notebook 4 (programme review) on screen. Every number comes from
 * /data/study.json `nb4`, copied from the notebook's own tables; every cue and question
 * is the notebook's own wording. Survey-weighted, 95% intervals from the notebook's
 * survey-design estimator.
 */

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const SRC = "Source: notebook 4 (programme review), survey-weighted, EDHS 2024–25.";
const STAGE_SHORT: Record<StageKey, string> = {
  any_anc: "Any ANC",
  anc4: "ANC4+ | users",
  anc8: "ANC8+ | ANC4+",
  early_anc: "Early ANC",
  early_anc8: "ANC8+ | early",
};

/** A small block of the study's own review text: label, then the sentence. */
function Says({ label, children }: { label: string; children?: string }) {
  if (!children) return null;
  return (
    <div className="text-10.5 leading-relaxed text-dim">
      <span className="text-text font-semibold">{label}:</span> {children}
    </div>
  );
}

/* ------------------------------------------------------------------ 3, 4: timing */

export function TimingPanel() {
  const { data } = useNb4();
  return (
    <Panel
      help="cohorts.timing"
      title="Early and later first visit: what women actually did"
      how="Observed, not modelled: women who started ANC (5,001), split by whether the first visit was by 12 weeks. Dots are shares with their 95% intervals."
    >
      {data ? (
        <div className="px-14 py-10 flex flex-col gap-10">
          <DotRows
            rows={[
              { key: "anc4", label: "Reached ANC4+", values: { e: data.timing["Early initiation"].anc4, l: data.timing["Later initiation"].anc4 },
                lo: { e: data.timing["Early initiation"].anc4_ci[0], l: data.timing["Later initiation"].anc4_ci[0] },
                hi: { e: data.timing["Early initiation"].anc4_ci[1], l: data.timing["Later initiation"].anc4_ci[1] } },
              { key: "a84", label: "ANC8+ among those at ANC4+", values: { e: data.timing["Early initiation"].anc8_after4, l: data.timing["Later initiation"].anc8_after4 },
                lo: { e: data.timing["Early initiation"].anc8_after4_ci[0], l: data.timing["Later initiation"].anc8_after4_ci[0] },
                hi: { e: data.timing["Early initiation"].anc8_after4_ci[1], l: data.timing["Later initiation"].anc8_after4_ci[1] } },
              { key: "anc8", label: <span className="font-semibold">Reached ANC8+</span>, values: { e: data.timing["Early initiation"].anc8, l: data.timing["Later initiation"].anc8 },
                lo: { e: data.timing["Early initiation"].anc8_ci[0], l: data.timing["Later initiation"].anc8_ci[0] },
                hi: { e: data.timing["Early initiation"].anc8_ci[1], l: data.timing["Later initiation"].anc8_ci[1] } },
            ]}
            series={[
              { key: "e", label: `First visit by 12 weeks (n=${data.timing["Early initiation"].n.toLocaleString()})`, color: "var(--good)" },
              { key: "l", label: `Later first visit (n=${data.timing["Later initiation"].n.toLocaleString()})`, color: "var(--bad)" },
            ]}
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            format={(v) => pct(v)}
            labelWidth={190}
          />
          <div className="text-11 leading-relaxed">
            <b className="font-mono">{pct(data.timing["Early initiation"].anc8, 1)}</b> of early starters reached ANC8+, against{" "}
            <b className="font-mono">{pct(data.timing["Later initiation"].anc8, 1)}</b> of later starters. Even so,{" "}
            <b className="font-mono">{pct(1 - data.timing["Early initiation"].anc8, 1)}</b> of early starters did not reach eight.
          </div>
          <Cue>{CUES.earlyVisit}</Cue>
          <DataNote className="">{SRC} Tables timing_anc8_reporting and timing_pathway_reporting.</DataNote>
        </div>
      ) : (
        <PanelLoading rows={4} />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ 18: paired */

export function PairedTable({ data }: { data: Nb4 }) {
  const rows: [string, "Delta_AP" | "Delta_AUROC" | "Brier_improvement", number][] = [
    ["Average precision gain", "Delta_AP", 3],
    ["AUROC gain", "Delta_AUROC", 3],
    ["Brier score improvement", "Brier_improvement", 4],
  ];
  const models = Object.keys(data.paired);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-10.5">
        <thead>
          <tr className="text-9.5 uppercase tracking-label text-faint">
            <th className="text-left font-semibold px-14 py-6">Adding early ANC</th>
            {models.map((m) => <th key={m} className="text-right font-semibold px-10 py-6">{m === "Logistic regression" ? "Logistic" : m}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, k, d]) => (
            <tr key={k} className="border-t border-border">
              <td className="px-14 py-6">{label}</td>
              {models.map((m) => {
                const [v, lo, hi] = data.paired[m][k];
                return (
                  <td key={m} className="px-10 py-6 text-right font-mono whitespace-nowrap align-top">
                    <div>{v > 0 ? "+" : ""}{v.toFixed(d)}</div>
                    <div className="text-9.5 text-faint">{lo.toFixed(d)} to {hi.toFixed(d)}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ 5-9: equity */

export function EquityPanel() {
  const { data } = useNb4();
  const [sig, setSig] = useState<string>("wealth");
  const [stage, setStage] = useState<StageKey>("anc8");
  const g = data?.equity[sig];
  const stages = data ? data.stages.filter((s) => g?.stages[s.key]) : [];
  const st = stages.find((s) => s.key === stage) ?? stages[0];
  const rows = g && st ? g.stages[st.key] ?? [] : [];
  const meta = EQUITY_KEYS.find((e) => e.key === sig)!;
  const rv = data ? reviewFor(data, meta.review) : null;
  return (
    <Panel
      help="ladder.equity"
      title={`Who moves through each stage · ${meta.label}`}
      how="Notebook 4's equity tables: for each group, the share who pass one stage of the pathway, among women who reached the stage before it. Dots with 95% intervals; the line is Ethiopia."
      actions={
        <Picker
          label="Grouping"
          options={EQUITY_KEYS.map((e) => ({ key: e.key, label: e.label }))}
          value={sig}
          onChange={setSig}
        />
      }
    >
      {data && st ? (
        <div className="px-14 py-10 flex flex-col gap-10">
          <Segmented
            label="Stage"
            options={stages.map((s) => ({ key: s.key, label: STAGE_SHORT[s.key], title: `${s.label}, among ${s.of}` }))}
            value={st.key}
            onChange={setStage}
          />
          <div className="text-10.5 text-dim">
            <b className="text-text">{st.label}</b>, among {st.of}.
          </div>
          <DotRows
            rows={rows.map((r) => ({
              key: r.level,
              label: r.level,
              sub: `n=${r.n.toLocaleString()}`,
              values: { v: r.pct },
              lo: { v: r.ci[0] },
              hi: { v: r.ci[1] },
            }))}
            series={[{ key: "v", label: st.label, color: "var(--accent)" }]}
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            format={(v) => pct(v)}
            reference={{ value: data.national[st.key], label: `Ethiopia ${pct(data.national[st.key])}` }}
            showLegend={false}
            labelWidth={170}
          />
          {sig === "intention" && (
            <div className="text-9.5 text-faint">Notebook 4's pregnancy-intention deep dive covers the first two stages only.</div>
          )}
          {rv && (
            <div className="flex flex-col gap-5">
              <Says label="What notebook 4 shows">{rv.observed}</Says>
              <Says label="What the models say">{rv.model}</Says>
              <Says label="Review question">{rv.question}</Says>
            </div>
          )}
          <Cue>{CUES.signal(sig as "wealth")}</Cue>
          {rv?.caution && <div className="text-9.5 text-faint leading-relaxed">Caution: {rv.caution}</div>}
          <DataNote className="">{SRC}</DataNote>
        </div>
      ) : (
        <PanelLoading rows={6} />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ 10, 11: regions */

export function RegionPathwayPanel() {
  const { data } = useNb4();
  const theme = useRenderTheme();
  const studio = useStudio();
  const [mode, setMode] = useState<"value" | "gap">("value");
  return (
    <Panel
      help="ladder.region-stages"
      title="Regions through the five stages"
      how="Notebook 4's regional pathway: each column is one stage among the women who reached the stage before it. Switch to the gap to see each region against Ethiopia, in percentage points. Click a region to follow it."
      actions={
        <Segmented
          label="Show"
          options={[{ key: "value", label: "Share" }, { key: "gap", label: "Gap to Ethiopia" }]}
          value={mode}
          onChange={setMode}
        />
      }
    >
      {data ? (
        <div className="pb-10">
          <MatrixHeat
            theme={theme}
            perColumn
            rows={[
              ...(mode === "value"
                ? [{ key: "Ethiopia", label: <span className="font-semibold">Ethiopia</span>, values: { ...data.national } }]
                : []),
              ...[...REGION_NAMES].sort().filter((r) => data.regions[r]).map((r) => ({
                key: r,
                label: r,
                values: Object.fromEntries(
                  data.stages.map((s) => [s.key, mode === "value" ? data.regions[r][s.key]?.pct : data.regions[r].gap_pp[s.key]]),
                ),
              })),
            ]}
            cols={data.stages.map((s) => ({ key: s.key, label: STAGE_SHORT[s.key], title: `${s.label}, among ${s.of}` }))}
            format={(v) => (mode === "value" ? pct(v) : pp(v))}
            active={studio.region}
            onRow={(r) => r !== "Ethiopia" && studio.set({ region: r === studio.region ? "" : r })}
            onCell={(r) => r !== "Ethiopia" && studio.set({ region: r === studio.region ? "" : r })}
            labelWidth={140}
          />
          <div className="px-14 pt-8 flex flex-col gap-8">
            <Cue>{CUES.region}</Cue>
            <DataNote className="">{SRC} Tables region_any_anc … region_early_anc8 and regional_diagnostic.</DataNote>
          </div>
        </div>
      ) : (
        <PanelLoading rows={8} />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ 13-16: travel */

const BAND_COLORS = ["var(--good)", "var(--rung4)", "var(--warn)", "var(--bad)"];

export function TravelBar({ shares }: { shares: number[] }) {
  return (
    <span className="flex h-11 rounded-full overflow-hidden bg-panel3 w-full">
      {shares.map((s, i) => (
        <span key={i} title={`${TRAVEL_BANDS[i]}: ${pct(s, 1)}`} style={{ width: `${s * 100}%`, background: BAND_COLORS[i] }} />
      ))}
    </span>
  );
}

export function TravelLegend() {
  return (
    <div className="flex flex-wrap gap-x-12 gap-y-4 text-9.5 text-dim">
      {TRAVEL_BANDS.map((b, i) => (
        <span key={b} className="flex items-center gap-4">
          <span className="size-8 rounded-full" style={{ background: BAND_COLORS[i] }} /> {b}
        </span>
      ))}
    </div>
  );
}

export function RegionTravelPanel() {
  const { data } = useNb4();
  const studio = useStudio();
  if (!data) return <Panel title="Travel time to care, region by region"><PanelLoading rows={8} /></Panel>;
  const t = data.region_travel;
  const order = Object.keys(t.distribution).sort((a, b) => t.over60[b] - t.over60[a]);
  const entry = Object.entries(t.entry).sort((a, b) => (b[1]["<=120 min"].pct - b[1][">120 min"].pct) - (a[1]["<=120 min"].pct - a[1][">120 min"].pct));
  return (
    <Panel
      help="ladder.region-travel"
      title="Travel time to care, region by region"
      how="Reported travel time to the nearest hospital or health centre (one of the 21 predictors). Bars: the share of women in each travel band, sorted by the share travelling more than an hour. Notebook 4, cells 4.25A–C."
    >
      <div className="px-14 py-10 flex flex-col gap-10">
        <TravelLegend />
        <div className="flex flex-col gap-4">
          {order.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => studio.set({ region: r === studio.region ? "" : r })}
              className={`grid grid-cols-[min(140px,36%)_minmax(0,1fr)_48px] items-center gap-8 text-left rounded-1 ${r === studio.region ? "bg-panel2" : ""}`}
            >
              <span className="text-10.5 truncate">{r}</span>
              <TravelBar shares={t.distribution[r]} />
              <span className="text-right font-mono text-10" title="Share travelling more than an hour">{pct(t.over60[r])}</span>
            </button>
          ))}
        </div>
        <div className="text-9.5 text-faint">Right: share travelling more than 60 minutes.</div>

        <div className="border-t border-border pt-10 flex flex-col gap-8">
          <div className="text-10.5 font-semibold">Starting ANC when the trip is over two hours</div>
          <div className="text-10.5 text-dim">
            The four regions where many women travel more than two hours: the share who had any ANC, at two hours or less against over two hours (notebook 4, 4.25G–H).
          </div>
          <DotRows
            rows={entry.map(([r, e]) => ({
              key: r,
              label: r,
              values: { near: e["<=120 min"].pct, far: e[">120 min"].pct },
              lo: { near: e["<=120 min"].ci[0], far: e[">120 min"].ci[0] },
              hi: { near: e["<=120 min"].ci[1], far: e[">120 min"].ci[1] },
              display: pp((e[">120 min"].pct - e["<=120 min"].pct) * 100),
            }))}
            series={[
              { key: "near", label: "2 hours or less", color: "var(--good)" },
              { key: "far", label: "Over 2 hours", color: "var(--bad)" },
            ]}
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            format={(v) => pct(v)}
            active={studio.region}
            onSelect={(k) => studio.set({ region: k === studio.region ? "" : k })}
          />
          <div className="text-9.5 text-faint">Descriptive comparison within each region; notebook 4 performed no statistical test of the gap.</div>
        </div>
        <Cue>{CUES.signal("travel")}</Cue>
        <DataNote className="">{SRC} Printed in the notebook (cells 4.25A–H) and saved unchanged by scripts/extract_nb4_printed.py.</DataNote>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ 20: SHAP direction */

export function DirectionPanel() {
  const { data } = useNb4();
  const preds = data ? [...new Set(data.direction.map((d) => d.label))] : [];
  const [p, setP] = useState("Household wealth");
  const cur = preds.includes(p) ? p : preds[0];
  const rows = data ? data.direction.filter((d) => d.label === cur) : [];
  const max = Math.max(0.1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <Panel
      help="analysis.direction"
      title="Which way each answer pushes the prediction"
      how="XGBoost SHAP by category on the held-out women (notebook 4's selected panel). Right of the centre line raises the predicted chance of ANC8+, left lowers it. Log-odds scale; it describes the model, not a cause."
      actions={
        <Select aria-label="Predictor" value={cur ?? ""} onChange={(e) => setP(e.target.value)} className="w-auto h-22 text-10.5">
          {preds.map((x) => <option key={x} value={x}>{x}</option>)}
        </Select>
      }
    >
      {data ? (
        <div className="px-14 py-10 flex flex-col gap-4">
          {rows.map((r) => (
            <div key={r.category} className="grid grid-cols-[min(150px,36%)_minmax(0,1fr)_52px] items-center gap-8">
              <span className="text-10.5 truncate" title={`${r.category} (n=${r.n})`}>{r.category}</span>
              <span className="relative block h-11">
                <span className="absolute inset-y-0 left-1/2 w-px bg-border2" />
                <span
                  className="absolute inset-y-1 rounded-1"
                  style={{
                    left: r.value >= 0 ? "50%" : `${50 - (Math.abs(r.value) / max) * 50}%`,
                    width: `${(Math.abs(r.value) / max) * 50}%`,
                    background: r.value >= 0 ? "var(--good)" : "var(--bad)",
                  }}
                />
              </span>
              <span className="text-right font-mono text-10">{r.value > 0 ? "+" : ""}{r.value.toFixed(2)}</span>
            </div>
          ))}
          <div className="text-9.5 text-faint mt-4">
            {rows[0]?.population === "ANC-entry" ? "ANC-entry cohort, extended model." : "Full cohort."} Source: notebook 4, nb4_shap_direction_panel (from notebook 3).
          </div>
        </div>
      ) : (
        <PanelLoading rows={5} />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ 22: review matrix */

export function ReviewMatrixPanel() {
  const { data } = useNb4();
  const [open, setOpen] = useState<string>("Household wealth");
  return (
    <Panel
      help="analysis.review"
      title="From evidence to programme review"
      how="Notebook 4's evidence-to-review matrix: for each signal, what the models and the observed pathway show, and the question it raises for programmes. Questions for investigation, not intervention effects or rankings."
    >
      {data ? (
        <div className="flex flex-col">
          {data.review.matrix.map((m) => {
            const role = data.review.roles.find((r) => r.Signal === m.Signal)?.["Dashboard role"];
            const on = open === m.Signal;
            return (
              <div key={m.Signal} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpen(on ? "" : m.Signal)}
                  className="w-full flex items-center gap-8 px-14 py-8 text-left hover:bg-panel2"
                  aria-expanded={on}
                >
                  <span className="text-11.5 font-semibold flex-1">{m.Signal}</span>
                  {role && <span className="text-9.5 text-faint">{role}</span>}
                  <span className="text-faint text-10">{on ? "−" : "+"}</span>
                </button>
                {on && (
                  <div className="px-14 pb-10 flex flex-col gap-5">
                    <Says label="Model evidence">{m["Model evidence"]}</Says>
                    <Says label="Observed pathway">{m["Observed pathway pattern"]}</Says>
                    <Says label="Review question">{m["Programme-review question"]}</Says>
                    <Says label="Evidence needed">{m["Additional evidence needed"]}</Says>
                  </div>
                )}
              </div>
            );
          })}
          <div className="px-14 py-8 border-t border-border">
            <div className="text-9.5 uppercase tracking-label text-faint font-semibold mb-5">Guidance anchors</div>
            {data.review.guidance.map((g, i) => (
              <div key={i} className="text-10.5 text-dim leading-relaxed mb-4">
                <span className="text-text font-semibold">{g.Source}:</span> {g["Guidance anchor"]}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <PanelLoading rows={6} />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ region panel */

/** The region panel's notebook 4 sections: the five stages against Ethiopia, and travel. */
export function RegionNb4({ region, Section }: {
  region: string;
  Section: (p: { title: string; how?: string; help?: string; children: React.ReactNode }) => React.ReactElement;
}) {
  const { data } = useNb4();
  if (!data) return null;
  const r = data.regions[region];
  const t = data.region_travel;
  const entry = t.entry[region];
  return (
    <>
      {r && (
        <Section
          help="map.region-stages"
          title="Through the five stages (notebook 4)"
          how="Each stage among the women who reached the stage before it, with 95% intervals; on the right, the gap to Ethiopia in percentage points."
        >
          <div className="flex flex-col gap-4">
            {data.stages.map((s) => {
              const v = r[s.key];
              if (!v) return null;
              const gap = r.gap_pp[s.key];
              return (
                <div key={s.key} className="grid grid-cols-[112px_minmax(0,1fr)_40px_52px] items-center gap-8" title={`${s.label}, among ${s.of} (n=${v.n})`}>
                  <span className="text-10.5 truncate">{STAGE_SHORT[s.key]}</span>
                  <span className="relative block h-11 bg-panel3 rounded-full">
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${v.pct * 100}%`, background: "var(--accent)" }} />
                    <span className="absolute -inset-y-2 border-l border-dashed border-text opacity-60" style={{ left: `${data.national[s.key] * 100}%` }} />
                  </span>
                  <span className="text-right font-mono text-10">{pct(v.pct)}</span>
                  <span className={`text-right font-mono text-10 ${gap < -5 ? "text-bad" : gap > 5 ? "text-good" : "text-dim"}`}>{pp(gap)}</span>
                </div>
              );
            })}
          </div>
          <div className="text-9.5 text-faint mt-5">Dashed mark: Ethiopia. Gap in points against Ethiopia.</div>
        </Section>
      )}
      {t.distribution[region] && (
        <Section help="map.region-travel" title="Travel time to the nearest hospital or health centre" how="Share of women in each travel band (notebook 4, 4.25A), and where available the gap in starting ANC for women travelling over two hours (4.25G).">
          <div className="flex flex-col gap-6">
            <TravelBar shares={t.distribution[region]} />
            <TravelLegend />
            {entry && (
              <div className="text-10.5 leading-relaxed">
                Any ANC: <b className="font-mono">{pct(entry["<=120 min"].pct)}</b> at two hours or less against{" "}
                <b className="font-mono">{pct(entry[">120 min"].pct)}</b> over two hours (n={entry[">120 min"].n}).
              </div>
            )}
            <Cue>{CUES.travel(region, t.over60[region])}</Cue>
          </div>
        </Section>
      )}
    </>
  );
}
