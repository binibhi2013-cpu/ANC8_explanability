import { useJSON } from "@/lib/data";

/**
 * Notebook 4 (programme review) as it appears in /data/study.json under `nb4`.
 * Built by scripts/build_study_data.py from outputs/notebook4_programme_review; every
 * number is copied from the notebook's own tables, nothing is re-estimated.
 * Proportions are 0-1; gaps are percentage points.
 */

export type StageKey = "any_anc" | "anc4" | "anc8" | "early_anc" | "early_anc8";

export interface StageRow {
  level: string;
  n: number;
  k: number;
  pct: number;
  ci: [number, number];
  psus?: number;
}

export type Row = Record<string, string>;

export interface Nb4 {
  stages: { key: StageKey; label: string; of: string }[];
  national: Record<StageKey, number>;
  pathway: { stage: string; eligible: string; n: number; k: number; pct: number; ci: [number, number] }[];
  timing: Record<"Early initiation" | "Later initiation", {
    n: number; anc8: number; anc8_ci: [number, number]; anc4: number; anc4_ci: [number, number];
    anc8_after4: number; anc8_after4_ci: [number, number];
  }>;
  equity: Record<string, { label: string; stages: Partial<Record<StageKey, StageRow[]>> }>;
  regions: Record<string, Partial<Record<StageKey, Omit<StageRow, "level">>> & { gap_pp: Record<StageKey, number> }>;
  region_travel: {
    distribution: Record<string, number[]>;
    n: Record<string, number[]>;
    over60: Record<string, number>;
    entry: Record<string, Record<"<=120 min" | ">120 min", { n: number; psus: number; pct: number; ci: [number, number] }>>;
  };
  paired: Record<string, Record<"Delta_AP" | "Delta_AUROC" | "Brier_improvement", [number, number, number]>>;
  direction: { population: string; label: string; category: string; n: number; value: number }[];
  review: { brief: Row[]; matrix: Row[]; core: Row[]; overlays: Row[]; guidance: Row[]; roles: Row[] };
}

export function useNb4() {
  const q = useJSON<{ nb4: Nb4 }>("/data/study.json");
  return { ...q, data: q.data?.nb4 };
}

export const TRAVEL_BANDS = ["0–30 min", "31–60 min", "61–120 min", "Over 120 min"];

/** The equity groupings, in the order notebook 4 treats them: core signals, then context. */
export const EQUITY_KEYS = [
  { key: "wealth", label: "Wealth", review: "Household wealth" },
  { key: "travel", label: "Travel time", review: "Travel time" },
  { key: "occupation", label: "Occupation", review: "Maternal occupation" },
  { key: "religion", label: "Religion", review: "Religion" },
  { key: "intention", label: "Pregnancy intention", review: "Pregnancy intention" },
] as const;

/** The review texts for one signal, from the study's own programme-review tables. */
export function reviewFor(nb4: Nb4, signal: string) {
  const find = (rows: Row[], col: string) => rows.find((r) => r[col] === signal);
  const matrix = find(nb4.review.matrix, "Signal");
  const role = find(nb4.review.roles, "Signal");
  const core = find(nb4.review.core, "Core signal");
  const overlay = find(nb4.review.overlays, "Contextual signal");
  return {
    role: role?.["Dashboard role"],
    caution: role?.["Interpretation caution"],
    observed: matrix?.["Observed pathway pattern"],
    model: matrix?.["Model evidence"],
    question: matrix?.["Programme-review question"],
    focus: core?.["Programme-review focus"] ?? overlay?.["How to use in programme review"],
    options: core?.["Options/issues to examine"],
    needed: core?.["Local verification needed"] ?? overlay?.["Evidence needed before interpretation"] ?? matrix?.["Additional evidence needed"],
  };
}

/** A brief domain's programme-review cue (programme_review_brief.csv). */
export function briefCue(nb4: Nb4, domainStartsWith: string): string | undefined {
  return nb4.review.brief.find((r) => r["Review domain"].startsWith(domainStartsWith))?.["Programme-review cue"];
}

export const pp = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(0)} pts`;
