"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useJSON } from "@/lib/data";
import type { Nb4 } from "@/lib/nb4";
import { REGION_NAMES } from "@/lib/regions";

/**
 * The dashboard's one shared state and its numbers.
 *
 * State lives in the address bar (cohort, ind, region), so a view can be shared as a
 * link and the browser's back button undoes the last click. Every section reads the
 * same three slicers.
 *
 * Every number comes from the study's own saved outputs, nothing is re-estimated:
 *   regions.json  cohorts.*        ANC1+/ANC4+/ANC8+ by region, Full and ANC-entry cohorts
 *   regions.json  subgroups.*      the same by wealth and pregnancy intention, per region
 *   study.json    nb4.*            notebook 4: the five pathway stages by region and by
 *                                  wealth, travel time, occupation, religion, intention
 *   study.json    *_performance    notebook 2 held-out tables (all three models)
 *   study.json    *_shap, what_if  notebook 3 tables T2, T5, T8
 */

export type DashCohort = "full" | "entry";
export type Ind = "anc1" | "anc4" | "anc8" | "early";

export const INDICATORS: { key: Ind; label: string; long: string }[] = [
  { key: "anc1", label: "ANC1+", long: "at least one contact" },
  { key: "anc4", label: "ANC4+", long: "four or more contacts" },
  { key: "anc8", label: "ANC8+", long: "eight or more contacts" },
  { key: "early", label: "Early first visit", long: "first visit by 12 weeks" },
];

export const DASH_COHORTS: { key: DashCohort; label: string; n: number; who: string }[] = [
  { key: "full", label: "All women", n: 6893, who: "all women with a recent pregnancy" },
  { key: "entry", label: "Women who started ANC", n: 5001, who: "women who started ANC" },
];

export interface DashState {
  cohort: DashCohort;
  ind: Ind;
  region: string; // "" = Ethiopia
}

const DEFAULTS: DashState = { cohort: "full", ind: "anc8", region: "" };

export function useDash() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useMemo<DashState>(() => {
    const c = params.get("cohort");
    const i = params.get("ind");
    const r = params.get("region") ?? "";
    const cohort: DashCohort = c === "entry" ? "entry" : "full";
    let ind: Ind = INDICATORS.some((x) => x.key === i) ? (i as Ind) : DEFAULTS.ind;
    // Every woman in the ANC-entry cohort started ANC, so ANC1+ is 100% there by definition.
    if (cohort === "entry" && ind === "anc1") ind = "anc4";
    return {
      cohort,
      ind,
      region: REGION_NAMES.includes(r) ? r : "",
    };
  }, [params]);
  const set = useCallback(
    (patch: Partial<DashState>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        const d = (DEFAULTS as unknown as Record<string, string>)[k];
        if (v === undefined || v === "" || v === d) next.delete(k);
        else next.set(k, String(v));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return { ...state, set, place: state.region || "Ethiopia" };
}

// ---- data -------------------------------------------------------------------------

export interface Rates {
  n: number;
  reach1: number; reach1_ci: [number, number];
  reach4: number; reach4_ci: [number, number];
  reach8: number; reach8_ci: [number, number];
  never: number; start_lt4: number; four_lt8: number;
  continue_1_to_4: number; continue_4_to_8: number;
}
export interface Sub { level: string; n: number; small: boolean; reach1: number; reach4: number; reach8: number }
export interface RegionsJSON {
  cohorts: Record<DashCohort, { national: Rates; regions: Record<string, Rates> }>;
  subgroups: Record<DashCohort, Record<string, Record<string, Sub[]>>>;
}
export interface Perf {
  model: string; ap: number; ap_ci: [number, number]; auroc: number; auroc_ci: [number, number];
  brier: number; brier_ci: [number, number]; citl: number; slope: number; threshold: number;
  sensitivity: number; specificity: number; ppv: number; npv: number;
}
export interface EntryPerf {
  model: string;
  baseline: { ap: number; auroc: number; brier: number };
  extended: { ap: number; auroc: number; brier: number };
  delta_ap: number; delta_ap_ci: [number, number];
  delta_auroc: number; delta_auroc_ci: [number, number];
  brier_gain: number; brier_gain_ci: [number, number];
}
export interface Ranked { rank: number; predictor: string; label: string; value: number }
export interface StudyJSON {
  cohorts: Record<DashCohort, { n: number; heldout: number; development: number }>;
  prevalence: { full_heldout: number; entry_heldout: number; full: number };
  full_performance: Perf[];
  entry_performance: EntryPerf[];
  full_shap: Ranked[];
  entry_shap: Ranked[];
  full_permutation: Record<string, Ranked[]>;
  what_if: { model: string; later: number; early: number; difference_pp: number }[];
  nb4: Nb4;
}

export function useDashData() {
  const reg = useJSON<RegionsJSON>("/data/regions.json");
  const study = useJSON<StudyJSON>("/data/study.json");
  const error = reg.state === "error" ? reg.error : study.state === "error" ? study.error : null;
  return { reg: reg.data, study: study.data, error, ready: !!(reg.data && study.data) };
}

export const pct = (v: number | null | undefined, d = 0) => (v == null ? "–" : `${(v * 100).toFixed(d)}%`);

/** One indicator for a cohort and place. Early first visit is among women who started ANC. */
export function rate(
  reg: RegionsJSON, nb4: Nb4, cohort: DashCohort, ind: Ind, region: string,
): { value: number; ci?: [number, number]; n: number } | null {
  if (ind === "early") {
    const s = region ? nb4.regions[region]?.early_anc : null;
    if (region) return s ? { value: s.pct, ci: s.ci, n: s.n } : null;
    const t = nb4.timing;
    return { value: nb4.national.early_anc, n: t["Early initiation"].n + t["Later initiation"].n };
  }
  const r = region ? reg.cohorts[cohort].regions[region] : reg.cohorts[cohort].national;
  if (!r) return null;
  const k = ind === "anc1" ? "reach1" : ind === "anc4" ? "reach4" : "reach8";
  return { value: r[k], ci: r[`${k}_ci` as "reach1_ci"], n: r.n };
}

// ---- who is left behind ------------------------------------------------------------

export const FACTORS = [
  { key: "wealth", label: "Household wealth", sub: "Wealth", icon: "wallet" },
  { key: "travel", label: "Travel time to a health centre or hospital", sub: null, icon: "clock" },
  { key: "intention", label: "Pregnancy intention", sub: "Pregnancy wanted", icon: "heart" },
  { key: "occupation", label: "Mother's occupation", sub: null, icon: "briefcase" },
  { key: "religion", label: "Religion", sub: null, icon: "users" },
] as const;
export type FactorKey = (typeof FACTORS)[number]["key"];

export interface LevelRow { level: string; value: number; ci?: [number, number]; n: number; small?: boolean }

const LEVEL_LABEL: Record<string, string> = {
  "Wanted then": "Wanted then", "Wanted later": "Wanted later", "Wanted no more": "Not wanted",
  "0-30 min": "0–30 min", "31-60 min": "31–60 min", "61-120 min": "61–120 min", ">120 min": "Over 120 min",
};
export const levelLabel = (l: string) => LEVEL_LABEL[l] ?? l;

/**
 * An indicator by the levels of one factor. The region breakdown exists in the saved
 * outputs for wealth and pregnancy intention (ANC1+/4+/8+); the rest are national.
 * ANC4+ and ANC8+ by notebook 4 factor are the product of its stage shares within a
 * level (ANC1+ × ANC4+ among users × ANC8+ among ANC4+), which reproduces the saved
 * subgroup shares exactly; intervals are shown only where the share was estimated directly.
 */
export function byFactor(
  reg: RegionsJSON, nb4: Nb4, factor: FactorKey, cohort: DashCohort, ind: Ind, region: string,
): { rows: LevelRow[]; scope: string } | null {
  const f = FACTORS.find((x) => x.key === factor)!;
  if (f.sub && ind !== "early") {
    const subs = reg.subgroups[cohort]?.[region || "Ethiopia"]?.[f.sub];
    if (subs) {
      const k = ind === "anc1" ? "reach1" : ind === "anc4" ? "reach4" : "reach8";
      return { scope: region || "Ethiopia", rows: subs.map((s) => ({ level: s.level, value: s[k], n: s.n, small: s.small })) };
    }
  }
  const st = nb4.equity[factor]?.stages;
  if (!st?.any_anc) return null;
  const at = (key: "any_anc" | "anc4" | "anc8" | "early_anc", level: string) => st[key]?.find((r) => r.level === level);
  const rows: LevelRow[] = [];
  for (const a of st.any_anc) {
    const L = a.level;
    const u = at("anc4", L), e8 = at("anc8", L), ea = at("early_anc", L);
    let row: LevelRow | null = null;
    if (ind === "early") row = ea ? { level: L, value: ea.pct, ci: ea.ci, n: ea.n } : null;
    else if (cohort === "full") {
      if (ind === "anc1") row = { level: L, value: a.pct, ci: a.ci, n: a.n };
      else if (ind === "anc4" && u) row = { level: L, value: a.pct * u.pct, n: a.n };
      else if (ind === "anc8" && u && e8) row = { level: L, value: a.pct * u.pct * e8.pct, n: a.n };
    } else {
      if (ind === "anc1") row = { level: L, value: 1, n: u?.n ?? a.k };
      else if (ind === "anc4" && u) row = { level: L, value: u.pct, ci: u.ci, n: u.n };
      else if (ind === "anc8" && u && e8) row = { level: L, value: u.pct * e8.pct, n: u.n };
    }
    if (row) rows.push(row);
  }
  return { scope: "Ethiopia", rows };
}
