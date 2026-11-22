"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The studio's one shared state, kept in the address bar (the house pattern: every
 * tile, chart mark, map region and heatmap cell reads and writes the same URL-backed
 * state). A view configured in a planning meeting can be sent as a link, and the
 * browser's back button undoes the last click.
 *
 *   region   a region name, or empty for the whole country
 *   rung     anc1 | anc4 | anc8
 *   cohort   full | entry | recent
 *   metric   the map's current layer (see lib/metrics.ts)
 */

export type Rung = "anc1" | "anc4" | "anc8";
export type Cohort = "full" | "entry" | "recent";

export const RUNGS: { key: Rung; label: string; outcome: string }[] = [
  { key: "anc1", label: "ANC1+", outcome: "anc1plus" },
  { key: "anc4", label: "ANC4+", outcome: "anc4plus" },
  { key: "anc8", label: "ANC8+", outcome: "anc8plus" },
];

/**
 * Every cohort the data files carry. The 24-month cohort is kept in the data for a
 * later decision, but the study (and so every picker) uses only the full cohort and
 * ANC entry: see COHORTS below.
 */
export const ALL_COHORTS: { key: Cohort; label: string; short: string; n: number; blurb: string }[] = [
  { key: "full", label: "Full cohort", short: "Full", n: 6893,
    blurb: "Every woman whose most recent pregnancy has a recorded number of ANC contacts" },
  { key: "entry", label: "ANC entry", short: "Entry", n: 5001,
    blurb: "Women who started ANC, predicted from their first visit onward" },
  { key: "recent", label: "Last 24 months", short: "24 mo", n: 5037,
    blurb: "The official DHS-8 window: births in the two years before interview" },
];

/** The cohorts the study analyses, and the only ones the pickers offer. */
export const COHORTS = ALL_COHORTS.filter((c) => c.key !== "recent");

export interface StudioState {
  region: string;
  rung: Rung;
  cohort: Cohort;
  metric: string;
}

const DEFAULTS: StudioState = { region: "", rung: "anc8", cohort: "full", metric: "anc8" };

export function useStudio() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = useMemo<StudioState>(() => {
    const rung = params.get("rung") as Rung | null;
    const cohort = params.get("cohort") as Cohort | null;
    return {
      region: params.get("region") ?? DEFAULTS.region,
      rung: rung && RUNGS.some((r) => r.key === rung) ? rung : DEFAULTS.rung,
      cohort: cohort && COHORTS.some((c) => c.key === cohort) ? cohort : DEFAULTS.cohort,
      metric: params.get("metric") ?? DEFAULTS.metric,
    };
  }, [params]);

  /** Change part of the state. Defaults are left out of the URL to keep links short. */
  const set = useCallback(
    (patch: Partial<StudioState> & Record<string, string | undefined>, opts?: { push?: boolean }) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        const dflt = (DEFAULTS as unknown as Record<string, string>)[k];
        if (v === undefined || v === "" || v === dflt) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (opts?.push) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [params, pathname, router],
  );

  /** A link to another screen that carries the shared state with it. */
  const href = useCallback(
    (path: string) => {
      const [base, own] = path.split("?");
      const next = new URLSearchParams(params.toString());
      new URLSearchParams(own ?? "").forEach((v, k) => next.set(k, v));
      const qs = next.toString();
      return qs ? `${base}?${qs}` : base;
    },
    [params],
  );

  return { ...state, set, href, params };
}
