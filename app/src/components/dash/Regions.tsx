"use client";

import { MapPinned } from "lucide-react";
import { pct, type StudyJSON, useDash } from "@/lib/dash";
import { REGION_NAMES } from "@/lib/regions";
import { REGIONS_CUE_ALL, stageCue } from "@/lib/recs";
import { Card, Insight, TabHead } from "./kit";

const STAGES = [
  { key: "any_anc", label: "Started ANC", of: "all women" },
  { key: "anc4", label: "ANC4+", of: "of those who started" },
  { key: "anc8", label: "ANC8+", of: "of those with four" },
  { key: "early_anc", label: "Early first visit", of: "of those who started" },
  { key: "early_anc8", label: "ANC8+", of: "of early starters" },
] as const;

/** Regions: each region through the five notebook 4 stages, with the stage where it falls furthest behind Ethiopia. */
export default function Regions({ study }: { study: StudyJSON }) {
  const d = useDash();
  const nb4 = study.nb4;
  const nat = nb4.national as Record<string, number>;
  const rows = REGION_NAMES.map((r) => {
    const s = nb4.regions[r] as unknown as Record<string, { pct: number } | undefined>;
    const cells = STAGES.map((st) => s?.[st.key]?.pct ?? null);
    let worst = -1, gap = 0;
    STAGES.forEach((st, k) => {
      const g = (cells[k] ?? nat[st.key]) - nat[st.key];
      if (g < gap) { gap = g; worst = k; }
    });
    return { r, cells, worst, gap };
  });
  const color = (v: number | null, k: number) => {
    if (v == null) return "var(--panel3)";
    const g = v - nat[STAGES[k].key];
    const a = Math.min(1, Math.abs(g) / 0.3);
    return g < 0 ? `rgba(168,50,54,${0.12 + a * 0.6})` : `rgba(11,105,176,${0.12 + a * 0.6})`;
  };
  const sel = rows.find((x) => x.r === d.region);
  const cue = sel && sel.worst >= 0
    ? stageCue({ region: sel.r, stage: STAGES[sel.worst].key, value: sel.cells[sel.worst] ?? 0, nat: nat[STAGES[sel.worst].key] })
    : REGIONS_CUE_ALL;
  const byStage = STAGES.map((st, k) => ({ st, regions: rows.filter((x) => x.worst === k).map((x) => x.r) })).filter((x) => x.regions.length);
  return (
    <>
      <TabHead title="Where each region loses women"
        lead="Each stage among women who reached the stage before it, so a region can start well and still lose women later. Red is below Ethiopia, blue above. Click a row to see every tab for that region." />
      <div className="grid gap-14 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] lg:flex-1 lg:min-h-0">
        <Card help="dash.stages" title="Five stages by region" sub="Notebook 4 pathway stages, survey-weighted" cue={cue}
          info="Each column is conditional on the one before it. The last column names the stage where the region is furthest below the national share.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-13 border-separate border-spacing-y-[2px]">
              <thead>
                <tr className="text-12 text-dim text-left">
                  <th className="font-medium py-2 pr-10">Region</th>
                  {STAGES.map((s) => (
                    <th key={s.key + s.of} className="font-medium py-2 px-4 text-center leading-tight">{s.label}<div className="font-normal text-11 text-faint">{s.of}</div></th>
                  ))}
                  <th className="font-medium py-2 pl-10">Furthest behind at</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-semibold">
                  <td className="py-[3px] pr-10">Ethiopia</td>
                  {STAGES.map((s) => <td key={s.key + s.of} className="text-center font-mono">{pct(nat[s.key])}</td>)}
                  <td />
                </tr>
                {rows.map((x) => (
                  <tr key={x.r} onClick={() => d.set({ region: x.r === d.region ? "" : x.r })}
                    className={`cursor-pointer hover:outline hover:outline-1 hover:outline-accent ${x.r === d.region ? "outline outline-2 outline-accent" : ""}`}>
                    <td className="py-[3px] pr-10 whitespace-nowrap">{x.r}</td>
                    {x.cells.map((v, k) => (
                      <td key={k} className="text-center font-mono rounded-[3px]" style={{ background: color(v, k) }}>{pct(v)}</td>
                    ))}
                    <td className="pl-10 text-12.5 text-dim whitespace-nowrap">
                      {x.worst >= 0 ? <>{STAGES[x.worst].label}{x.worst > 0 ? <span className="text-faint"> {STAGES[x.worst].of}</span> : null} <b className="text-bad font-mono">{Math.round(x.gap * 100)} pts</b></> : <span className="text-good">at or above Ethiopia</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card help="dash.stage-groups" title={sel ? sel.r : "Regions by weakest stage"} sub={sel ? "Its weakest stage" : "Regions grouped by where they fall furthest behind"}>
          {sel ? (
            sel.worst >= 0 ? (
              <Insight icon={MapPinned} tone="bad">
                {sel.r} falls furthest behind Ethiopia at “{STAGES[sel.worst].label} {STAGES[sel.worst].of}”: {pct(sel.cells[sel.worst])} against {pct(nat[STAGES[sel.worst].key])}.
              </Insight>
            ) : <Insight icon={MapPinned} tone="good">{sel.r} is at or above Ethiopia at every stage.</Insight>
          ) : null}
          <div className="flex flex-col gap-8">
            {byStage.map(({ st, regions }) => (
              <div key={st.key + st.of}>
                <div className="text-13 font-semibold">{st.label} <span className="font-normal text-faint">{st.of}</span></div>
                <div className="text-13 text-dim">{regions.join(", ")}</div>
              </div>
            ))}
            <div>
              <div className="text-13 font-semibold text-good">At or above Ethiopia</div>
              <div className="text-13 text-dim">{rows.filter((x) => x.worst < 0).map((x) => x.r).join(", ")}</div>
            </div>
          </div>
          <p className="text-12.5 text-faint mt-auto">A different weak stage calls for a different response: click Cue.</p>
        </Card>
      </div>
    </>
  );
}
