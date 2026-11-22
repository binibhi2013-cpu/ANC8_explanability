/**
 * Every layer the map and the region heatmap can show, and what its colour means.
 *
 * A metric knows how to read its value for any region (or the whole country) in any
 * cohort, whether more is good or bad, and one plain sentence for its legend. The
 * map, the ranked bars, the ladder small multiples and the heatmap all read the
 * same definitions, so a colour means the same thing everywhere.
 */

import type { Cohort } from "@/lib/studio";
import type { RegionsData } from "@/lib/regionsData";

export type Scale = "good" | "bad" | "diverging";

export interface Metric {
  key: string;
  label: string;
  /** column header in the heatmap */
  short: string;
  group: "The ladder" | "Where women are lost" | "Timing" | "Women per year" | "Against circumstances" | "Circumstances";
  scale: Scale;
  kind: "share" | "count" | "gap";
  /** what a darker colour means, in one sentence */
  legend: string;
  /** a health system can move it (circumstance layers only) */
  modifiable?: boolean;
  value: (d: RegionsData, cohort: Cohort, region: string | null) => number | null;
}

function cascade(d: RegionsData, cohort: Cohort, region: string | null) {
  const c = d.cohorts[cohort];
  if (!c) return null;
  return region ? c.regions[region] ?? null : c.national;
}

const births = (d: RegionsData, region: string | null) =>
  region ? d.population.regions[region]?.births ?? null : d.population.births_per_year;

const LADDER: Metric[] = [
  { key: "anc1", label: "Reach any ANC (ANC1+)", short: "ANC1+", group: "The ladder", scale: "good", kind: "share",
    legend: "Darker: more women reach at least one antenatal contact.",
    value: (d, c, r) => (c === "entry" ? null : cascade(d, c, r)?.reach1 ?? null) },
  { key: "anc4", label: "Reach four contacts (ANC4+)", short: "ANC4+", group: "The ladder", scale: "good", kind: "share",
    legend: "Darker: more women reach four or more contacts.",
    value: (d, c, r) => cascade(d, c, r)?.reach4 ?? null },
  { key: "anc8", label: "Reach eight contacts (ANC8+)", short: "ANC8+", group: "The ladder", scale: "good", kind: "share",
    legend: "Darker: more women reach the eight contacts the WHO recommends.",
    value: (d, c, r) => cascade(d, c, r)?.reach8 ?? null },
];

const LOSSES: Metric[] = [
  { key: "never", label: "Never start ANC", short: "Never", group: "Where women are lost", scale: "bad", kind: "share",
    legend: "Darker: more women receive no antenatal care at all.",
    value: (d, c, r) => (c === "entry" ? null : cascade(d, c, r)?.never ?? null) },
  { key: "start_lt4", label: "Started, did not reach four", short: "No 4", group: "Where women are lost", scale: "bad", kind: "share",
    legend: "Darker: more women started antenatal care but did not reach four contacts.",
    value: (d, c, r) => cascade(d, c, r)?.start_lt4 ?? null },
  { key: "four_lt8", label: "Reached four, did not reach eight", short: "4, not 8", group: "Where women are lost", scale: "bad", kind: "share",
    legend: "Darker: more women reached four contacts but did not reach eight.",
    value: (d, c, r) => cascade(d, c, r)?.four_lt8 ?? null },
  { key: "drop48", label: "Of women at four, never reach eight", short: "Lost 4→8", group: "Where women are lost", scale: "bad", kind: "share",
    legend: "Darker: of the women who reached four contacts, more did not reach eight.",
    value: (d, c, r) => {
      const x = cascade(d, c, r)?.continue_4_to_8;
      return x == null ? null : 1 - x;
    } },
];

const PER_YEAR: Metric[] = [
  { key: "not8_year", label: "Women not reaching eight, per year", short: "Not 8 /yr", group: "Women per year", scale: "bad", kind: "count",
    legend: "Darker: more women each year do not complete eight contacts (births × share).",
    value: (d, c, r) => {
      const b = births(d, r);
      const x = cascade(d, c, r)?.reach8;
      return b == null || x == null ? null : b * (1 - x);
    } },
  { key: "never_year", label: "Women with no ANC, per year", short: "No ANC /yr", group: "Women per year", scale: "bad", kind: "count",
    legend: "Darker: more women each year receive no antenatal care (births × share).",
    value: (d, c, r) => {
      const b = births(d, r);
      const x = c === "entry" ? null : cascade(d, c, r)?.never;
      return b == null || x == null ? null : b * x;
    } },
];

const GAPS: Metric[] = (["anc8", "anc4", "anc1"] as const).map((rung) => ({
  key: `gap_${rung}`,
  label: `${rung === "anc8" ? "ANC8+" : rung === "anc4" ? "ANC4+" : "ANC1+"} against its circumstances`,
  short: `Gap ${rung === "anc8" ? "8" : rung === "anc4" ? "4" : "1"}`,
  group: "Against circumstances" as const,
  scale: "diverging" as const,
  kind: "gap" as const,
  legend: "Green: the region does better than its women's wealth, schooling and household profile predict. Red: worse.",
  value: (d: RegionsData, c: Cohort, r: string | null) => (r ? d.gap[c]?.[rung]?.[r]?.gap ?? null : null),
}));

export function circumstanceMetrics(d: RegionsData): Metric[] {
  return d.profile_meta.map((p) => ({
    key: `p_${p.key}`,
    label: p.label,
    short: p.label.length > 14 ? p.label.slice(0, 13) + "…" : p.label,
    group: "Circumstances" as const,
    scale: "bad" as const,
    kind: "share" as const,
    modifiable: p.modifiable,
    legend: `Darker: a larger share of women — ${p.label.toLowerCase()}.`,
    value: (dd: RegionsData, c: Cohort, r: string | null) => dd.profile[c]?.[r ?? "Ethiopia"]?.[p.key] ?? null,
  }));
}

/**
 * The circumstances that are among the study's 21 predictors. The data file carries more
 * (health post, distance and money problems, age at the birth, parity), but those are
 * not the study's variables, so they are not shown.
 */
export const STUDY_CIRCUMSTANCES = ["poorest40", "no_school", "rural", "unintended", "uninsured", "no_say", "no_media"];

/**
 * The layers the studio shows: the ladder, where women are lost, and the circumstances
 * that are study predictors. The "per year" layers (UN birth projections) and the
 * "against circumstances" gaps (a model that is not the study's) stay defined above
 * but are not offered.
 */
export function allMetrics(d: RegionsData): Metric[] {
  return [...LADDER, ...LOSSES, ...circumstanceMetrics(d).filter((m) => STUDY_CIRCUMSTANCES.includes(m.key.slice(2)))];
}

/** Kept for reference; not shown in the app. */
export const HIDDEN_METRICS = [...PER_YEAR, ...GAPS];

export const LADDER_KEYS = ["anc1", "anc4", "anc8"];

export function formatValue(m: Metric, v: number | null): string {
  if (v == null) return "—";
  if (m.kind === "count") return v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : `${Math.round(v)}`;
  if (m.kind === "gap") return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)} pts`;
  return `${Math.round(v * 100)}%`;
}
