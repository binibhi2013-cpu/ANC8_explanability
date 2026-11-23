"use client";

import { Scale, TrendingDown } from "lucide-react";
import { GROUPS, INDICATORS, levelLabel, pathwayBy, pct, rate, type GroupKey, type PathRow, type RegionsJSON, type StudyJSON, useDash } from "@/lib/dash";
import { groupCue } from "@/lib/recs";
import { Card, Insight, Seg, TabHead } from "./kit";
import { useState } from "react";

/**
 * Who is left behind: one stacked chart of the care pathway, split by the grouping the
 * Group by slicer picks. Every bar is 100% of the group's women: never started, started
 * but stopped before four, reached four but not eight, reached eight. The chosen
 * indicator is the bright part of each bar and the number at its end.
 */

const SEG = [
  { k: "never", label: "Never started ANC", color: "var(--seg-never)" },
  { k: "lt4", label: "Started, stopped before 4", color: "var(--seg-lt4)" },
  { k: "four8", label: "Reached 4, not 8", color: "var(--seg-48)" },
  { k: "r8", label: "Reached 8+", color: "var(--seg-8)" },
] as const;
type SegK = (typeof SEG)[number]["k"];

/** The parts of the bar that make up each indicator. */
const LIT: Record<string, SegK[]> = { anc1: ["lt4", "four8", "r8"], anc4: ["four8", "r8"], anc8: ["r8"] };
const VALUE: Record<string, keyof PathRow> = { anc1: "reach1", anc4: "reach4", anc8: "reach8" };

export default function LeftBehind({ reg, study }: { reg: RegionsJSON; study: StudyJSON }) {
  const d = useDash();
  const [group, setGroup] = useState<GroupKey>("wealth");
  const ind = INDICATORS.find((i) => i.key === d.ind)!;
  const entry = d.cohort === "entry";
  const early = d.ind === "early";
  const res = pathwayBy(reg, study.nb4, group, d.cohort, d.region);
  const g = GROUPS.find((x) => x.key === group)!;
  const who = early || entry ? "women who started ANC" : "all women";

  const val = (r: PathRow) => (early ? r.early ?? 0 : (r[VALUE[d.ind]] as number));
  const rows = (res?.rows.filter((r) => !early || r.early != null) ?? []).slice();
  if (group === "region") rows.sort((a, b) => val(b) - val(a));
  const reliable = rows.filter((r) => !r.small);
  const hi = reliable.reduce<PathRow | null>((a, b) => (!a || val(b) > val(a) ? b : a), null);
  const lo = reliable.reduce<PathRow | null>((a, b) => (!a || val(b) < val(a) ? b : a), null);
  const nat = rate(reg, study.nb4, d.cohort, d.ind, res?.scope === "Ethiopia" ? "" : d.region)?.value;

  // Where along the pathway the highest and lowest groups part: the segment with the largest gap.
  const part = hi && lo && !early
    ? (SEG.filter((s) => s.k !== "r8" && !(entry && s.k === "never"))
        .map((s) => ({ s, gap: (lo[s.k] as number) - (hi[s.k] as number) }))
        .sort((a, b) => b.gap - a.gap)[0])
    : null;

  const cue = hi && lo && hi !== lo
    ? groupCue({ group, hi: levelLabel(hi.level), hiV: val(hi), lo: levelLabel(lo.level), loV: val(lo), label: `${ind.label} by ${g.label.toLowerCase()}` })
    : null;

  const regionNote = res && d.region && res.scope === "Ethiopia" && group !== "region";

  return (
    <>
      <TabHead title="Who is left behind"
        lead={<>Each bar is 100% of a group&apos;s women ({who}), split along the care pathway. The bright part and the number are <b className="text-text">{ind.label}</b>. Associations, not causes.</>} />
      <div className="flex items-center gap-10 flex-none flex-wrap">
        <span className="text-12.5 font-semibold text-dim uppercase tracking-wide">Group by</span>
        <Seg label="Group by" size="sm" value={group} onChange={setGroup}
          options={GROUPS.map((x) => ({ key: x.key, label: x.label }))} />
      </div>

      <div className="grid gap-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:flex-1 lg:min-h-0">
        <Card help="dash.stacked" title={`${ind.label} by ${g.label.toLowerCase()}`}
          sub={regionNote ? "Ethiopia · this grouping is not available by region" : res?.scope ?? ""}
          info={<>Survey-weighted shares. Wealth, intention, education, residence, insurance and pregnancy order come from the study&apos;s saved subgroup tables (also by region); travel time, occupation and religion from the study's programme review (national only). The dashed mark is the {res?.scope === "Ethiopia" ? "national" : res?.scope} share.</>}>
          {!rows.length ? (
            <p className="text-13 text-dim">The study&apos;s saved outputs do not break {ind.label.toLowerCase()} down by {g.label.toLowerCase()}. Choose another grouping or indicator.</p>
          ) : (
            <>
              <Legend early={early} entry={entry} />
              <div className={`flex flex-col ${rows.length > 8 ? "gap-[3px]" : "gap-12"} lg:flex-1 lg:min-h-0 justify-center`}>
                {rows.map((r) => (
                  <StackRow key={r.level} r={r} early={early} lit={LIT[d.ind] ?? []} value={val(r)} nat={nat}
                    dense={rows.length > 8} tall={rows.length <= 5} selected={group === "region" && r.level === d.region}
                    onClick={group === "region" ? () => d.set({ region: r.level === d.region ? "" : r.level }) : undefined} />
                ))}
              </div>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-14 min-h-0">
          <Card help="dash.gap" title="The gap" sub={`${ind.label} · highest and lowest ${g.label.toLowerCase()} group`} cue={cue}>
            {hi && lo && hi !== lo ? (
              <>
                <div className="grid grid-cols-2 gap-10">
                  <Big label={levelLabel(hi.level)} value={val(hi)} tone="good" />
                  <Big label={levelLabel(lo.level)} value={val(lo)} tone="bad" />
                </div>
                <Insight icon={Scale} tone={val(lo) > 0 && val(hi) / val(lo) >= 2 ? "bad" : "accent"}>
                  {levelLabel(hi.level)}: {pct(val(hi))} against {pct(val(lo))} for {levelLabel(lo.level)}
                  {val(lo) > 0 ? <> ({val(hi) / val(lo) >= 10 ? "over ten" : (val(hi) / val(lo)).toFixed(1)} times higher)</> : null}.
                </Insight>
                {part && part.gap > 0.02 && (
                  <Insight icon={TrendingDown} tone="warn">
                    The groups part most at “{part.s.label}”: {pct(lo[part.s.k] as number)} of {levelLabel(lo.level)} against {pct(hi[part.s.k] as number)} of {levelLabel(hi.level)}.
                  </Insight>
                )}
                {rows.some((r) => r.small) && <p className="text-12 text-faint">Grey bars: few women, not reliable; left out of the comparison.</p>}
              </>
            ) : (
              <p className="text-13 text-dim">No comparison for this choice.</p>
            )}
          </Card>
          <Card title="How to read it" sub="Click Cue on a card for a suggested action">
            <ul className="text-13 text-dim flex flex-col gap-4 list-disc pl-16">
              <li>Change <b className="text-text">Indicator</b> above to move the bright part along the bars.</li>
              <li><b className="text-text">Group by</b> switches the predictor; region rows filter every tab when clicked.</li>
              <li>{entry ? "ANC-entry cohort: every woman started ANC, so there is no grey part." : "Switch Cohort to women who started ANC to drop the never-started part."}</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function Legend({ early, entry }: { early: boolean; entry: boolean }) {
  const items = early
    ? [{ label: "First visit by 12 weeks", color: "var(--seg-8)" }, { label: "Later first visit", color: "var(--seg-48)" }]
    : SEG.filter((s) => !(entry && s.k === "never"));
  return (
    <div className="flex items-center gap-x-14 gap-y-4 flex-wrap text-12.5 text-dim flex-none">
      {items.map((s) => (
        <span key={s.label} className="flex items-center gap-6"><span className="size-12 rounded-[2px]" style={{ background: s.color }} />{s.label}</span>
      ))}
    </div>
  );
}

function StackRow({ r, early, lit, value, nat, dense, tall, selected, onClick }: {
  r: PathRow; early: boolean; lit: SegK[]; value: number; nat?: number; dense: boolean; tall?: boolean; selected?: boolean; onClick?: () => void;
}) {
  const parts = early
    ? [{ k: "e", w: r.early ?? 0, color: "var(--seg-8)", on: true, label: "First visit by 12 weeks" }, { k: "l", w: 1 - (r.early ?? 0), color: "var(--seg-48)", on: false, label: "Later first visit" }]
    : SEG.map((s) => ({ k: s.k, w: r[s.k] as number, color: s.color, on: lit.includes(s.k), label: s.label }));
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      className={`grid items-center gap-10 text-left w-full rounded-[4px] ${onClick ? "hover:bg-soft" : ""} ${selected ? "bg-soft ring-1 ring-accent" : ""} ${r.small ? "opacity-50" : ""}`}
      style={{ gridTemplateColumns: "minmax(110px, 170px) 1fr 52px" }}>
      <div className="min-w-0 px-2">
        <div className="text-13 text-text truncate leading-tight">{levelLabel(r.level)}</div>
        {!dense && <div className="text-11 text-faint">{r.n.toLocaleString("en-US")} women{r.small ? " · not reliable" : ""}</div>}
      </div>
      <div className={`relative flex ${dense ? "h-[22px]" : tall ? "h-[44px]" : "h-[32px]"} rounded-[3px] overflow-hidden bg-panel3`}>
        {parts.map((p) => p.w > 0.0005 && (
          <div key={p.k} title={`${p.label}: ${pct(p.w)}`}
            className={`h-full flex items-center justify-center ${tall ? "text-[13px]" : "text-[11px]"} font-semibold transition-all duration-500 overflow-hidden`}
            style={{ width: `${p.w * 100}%`, background: p.color, opacity: p.on ? 1 : 0.42, color: !p.on ? "var(--text)" : p.k === "four8" || p.k === "l" ? "#3b2c05" : "white" }}>
            {p.w >= 0.09 ? pct(p.w) : ""}
          </div>
        ))}
        {nat != null && !early && (
          <div className="absolute -top-2 -bottom-2 w-0 border-l-2 border-dashed border-text opacity-60" style={{ left: `${(1 - nat) * 100}%` }} title="Average" />
        )}
      </div>
      <div className={`font-mono ${tall ? "text-17" : "text-14"} font-semibold text-right`}>{pct(value)}</div>
    </Tag>
  );
}

function Big({ label, value, tone }: { label: string; value: number; tone: "good" | "bad" }) {
  return (
    <div className={`rounded-[6px] p-10 ${tone === "good" ? "bg-goodbg" : "bg-badbg"}`}>
      <div className="text-12.5 text-dim truncate">{label}</div>
      <div className={`font-mono text-26 font-semibold ${tone === "good" ? "text-good" : "text-bad"}`}>{pct(value)}</div>
    </div>
  );
}
