import { REGION_CUE, SIGNAL_CUE, TIMING_CUE } from "@/lib/cues";
import { ev, type Evidence } from "@/lib/evidence";

/**
 * Recommendation cues: one per findings card, shown behind the 💡 button.
 *
 * Each cue has
 *   action  what a programme could consider, in one or two sentences (a suggestion drafted
 *           for the dashboard from the card's own finding);
 *   basis   the number on the card it rests on, built from the live data and filters;
 *   study   the study's own programme-review wording, verbatim, where it has wording
 *           for that signal;
 *   evidence  published guidance and studies that support the suggested action (lib/evidence.ts).
 *
 * Rules: tied to the card's number; worded as a suggestion; never a cause or a
 * predicted effect; never targets a group for less care.
 */

export interface Cue { action: string; basis: string; study?: string; evidence?: Evidence[] }

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Where women are lost: the ladder for the chosen place. */
export function ladderCue(o: { place: string; never: number; lt4: number; four8: number; cont48: number; entry: boolean }): Cue {
  const losses = [
    ...(o.entry ? [] : [{ k: "never", v: o.never }]),
    { k: "lt4", v: o.lt4 },
    { k: "four8", v: o.four8 },
  ].sort((a, b) => b.v - a.v);
  const top = losses[0].k;
  if (top === "never") {
    return {
      action: "Bring the first contact to women who are not reached: outreach and mobile ANC teams, community mobilisation through health extension workers and community volunteers, and engagement of clan, religious and community leaders.",
      basis: `In ${o.place}, ${pct(o.never)} of women never started ANC, the largest loss on the ladder.`,
      study: REGION_CUE,
      evidence: ev("mbuagbaw2015", "afework2014", "lassi2015", "prost2013"),
    };
  }
  if (top === "lt4") {
    return {
      action: "Strengthen follow-up after the first contact: book the next visit before she leaves, remind by phone or SMS, and trace missed visits through health extension workers.",
      basis: `In ${o.place}, ${pct(o.lt4)} of ${o.entry ? "women who started ANC" : "women"} started but did not reach four contacts, the largest loss on the ladder.`,
      study: TIMING_CUE,
      evidence: ev("wagnew2018", "muluneh2020", "who2016", "dowswell2015"),
    };
  }
  return {
    action: "Retention strategies for the later contacts: schedule contacts 5 to 8 at booking, give a written visit plan, send reminders, trace missed visits through health extension workers, and use each visit to explain why late-pregnancy contacts matter.",
    basis: `In ${o.place}, of women who reached four contacts, ${pct(1 - o.cont48)} did not reach eight, the largest loss on the ladder.`,
    study: TIMING_CUE,
    evidence: ev("who2016", "dowswell2015", "wagnew2018", "muluneh2020"),
  };
}

/** The four indicator tiles: the headline. */
export function tilesCue(o: { place: string; r8: number; nat8: number; region: boolean }): Cue {
  return {
    action: o.region && o.r8 < o.nat8
      ? `Prioritise ${o.place} in ANC8+ review: it is below the national level. Open the Regions tab to see at which stage it loses women before choosing a response.`
      : "Track ANC8+, not only ANC4+, in routine reporting (DHIS2), since most of the gap opens after the fourth contact.",
    basis: `${pct(o.r8)} reached eight contacts in ${o.place}${o.region ? ` (Ethiopia ${pct(o.nat8)})` : ""}.`,
    study: REGION_CUE,
    evidence: ev("who2016", "ethGuideline", "abebaw2025"),
  };
}

/** The map. */
export function mapCue(o: { best: string; bestV: number; worst: string; worstV: number; label: string }): Cue {
  return {
    action: `Focus support on the lowest regions and learn from the highest: compare how ${o.best} organises repeat contacts with how ${o.worst} does. Click a region to see its full picture.`,
    basis: `${o.label} ranges from ${pct(o.worstV)} in ${o.worst} to ${pct(o.bestV)} in ${o.best}.`,
    study: REGION_CUE,
    evidence: ev("abebaw2025", "mbuagbaw2015"),
  };
}

/** Stacked pathway by a grouping. */
export function groupCue(o: { group: string; hi: string; hiV: number; lo: string; loV: number; label: string }): Cue | null {
  const basis = `${o.label}: ${pct(o.hiV)} for ${o.hi} against ${pct(o.loV)} for ${o.lo.toLowerCase()}.`;
  const C: Record<string, Omit<Cue, "basis">> = {
    wealth: {
      action: "Lower the cost of every repeat visit for the poorest women, not only the first: fee waivers, enrolment in community-based health insurance, and transport support for later contacts.",
      study: SIGNAL_CUE.wealth,
      evidence: ev("merga2023", "murray2014", "muluneh2020"),
    },
    travel: {
      action: "Bring contacts closer to women who live far away: outreach ANC sessions at health posts, transport or ambulance links, and visit days matched to market days.",
      study: SIGNAL_CUE.travel,
      evidence: ev("afework2014", "tekelab2019", "mbuagbaw2015"),
    },
    intention: {
      action: "Give extra counselling and early follow-up to women whose pregnancy was not wanted or wanted later, and link ANC with family planning services.",
      study: SIGNAL_CUE.intention,
      evidence: ev("tolossa2020", "tekelab2019", "tesfaye2017"),
    },
    occupation: {
      action: "Offer ANC hours that fit working women, such as early morning, weekend or market-day sessions, and keep waiting times short.",
      study: SIGNAL_CUE.occupation,
      evidence: ev("tesfaye2017"),
    },
    religion: {
      action: "Involve religious and community leaders of all faiths in promoting the full eight contacts; treat the gap as an access and context question, never as a reason to target a faith group.",
      study: SIGNAL_CUE.religion,
      evidence: ev("prost2013", "lassi2015"),
    },
    education: {
      action: "Use simple, visual counselling at the first contact so that women with little schooling know the eight-contact schedule and when to return.",
      evidence: ev("tekelab2019", "tesfaye2017", "muluneh2020"),
    },
    residence: {
      action: "Strengthen rural outreach and the health post to health centre referral, so that rural women can complete the later contacts.",
      study: SIGNAL_CUE.travel,
      evidence: ev("tekelab2019", "afework2014"),
    },
    insurance: {
      action: "Expand community-based health insurance enrolment among pregnant women, and check that ANC is free at the point of use.",
      study: SIGNAL_CUE.wealth,
      evidence: ev("merga2023", "murray2014"),
    },
    order: {
      action: "Do not assume experienced mothers need fewer contacts: counsel women in later pregnancies on the full schedule and help with childcare or time barriers.",
      evidence: ev("tesfaye2017", "who2016"),
    },
    region: {
      action: "Diagnose each region's weak stage before choosing a response (see the Regions tab), and share what works in the highest regions.",
      study: REGION_CUE,
      evidence: ev("abebaw2025", "mbuagbaw2015"),
    },
  };
  const c = C[o.group];
  return c ? { ...c, basis } : null;
}

const STAGE_EV: Record<string, Evidence[]> = {
  any_anc: ev("mbuagbaw2015", "afework2014", "prost2013"),
  anc4: ev("wagnew2018", "muluneh2020"),
  anc8: ev("who2016", "dowswell2015", "wagnew2018"),
  early_anc: ev("who2016", "tesfaye2017", "tolossa2020"),
  early_anc8: ev("muluneh2020", "who2016"),
};

/** One region's weakest stage in the Regions tab. */
export function stageCue(o: { region: string; stage: string; value: number; nat: number }): Cue {
  const A: Record<string, string> = {
    any_anc: "Increase first contact: community outreach and mobile teams, pregnancy identification by health extension workers, and mobilisation with community and religious leaders.",
    anc4: "Keep women in care after the first visit: book the next visit, send reminders, and trace missed visits.",
    anc8: "Retention for contacts 5 to 8: plan the late-pregnancy visits at booking and trace women who miss them.",
    early_anc: "Promote booking by 12 weeks: early pregnancy identification and referral by health extension workers, and community messages on when to start ANC.",
    early_anc8: "Early starters are still lost later: pair early booking with continuity support through to the eighth contact.",
  };
  return {
    action: A[o.stage] ?? REGION_CUE,
    basis: `${o.region} is furthest below Ethiopia here: ${pct(o.value)} against ${pct(o.nat)}.`,
    study: REGION_CUE,
    evidence: STAGE_EV[o.stage] ?? ev("mbuagbaw2015"),
  };
}

export const REGIONS_CUE_ALL: Cue = {
  action: "Regions lose women at different stages, so a single national response will not fit all. Match the response to each region's weakest stage: first contact, staying to four, or staying to eight.",
  basis: "The last column of the table names each region's weakest stage.",
  study: REGION_CUE,
  evidence: ev("mbuagbaw2015", "abebaw2025"),
};

export function earlyCue(o: { e8: number; l8: number }): Cue {
  return {
    action: "Promote booking by 12 weeks through early pregnancy identification by health extension workers, and pair it with retention support, because an early start alone does not complete the schedule.",
    basis: `${pct(o.e8)} of early starters reached eight against ${pct(o.l8)} of later starters; ${pct(1 - o.e8)} of early starters still did not.`,
    study: TIMING_CUE,
    evidence: ev("who2016", "tesfaye2017", "tolossa2020", "afework2014"),
  };
}

export const MODEL_CUE: Cue = {
  action: "Use the models to rank women for follow-up, not to decide care. Before routine use, validate them on local facility data and recalibrate, because all three predict slightly more ANC8+ than observed.",
  basis: "Average precision 0.40 to 0.44 against 0.16 by chance; calibration in the large below zero for all three models.",
  evidence: ev("vancalster2019", "collins2024"),
};

export const SHAP_CUE: Cue = {
  action: "Read the leading predictors as markers of who needs support (poorer, far, in low-coverage regions), not as levers that change ANC8+ on their own.",
  basis: "Wealth, travel time and region lead the XGBoost SHAP ranking in the full cohort.",
  study: "Wealth, travel time and region are the core equity, access and contextual signals for programme review; none of them is a causal mechanism or an intervention target.",
  evidence: ev("tekelab2019", "merga2023"),
};

export function whatIfCue(o: { label: string; diff: number }): Cue {
  return {
    action: "Use the size of each contrast to decide which barrier to review first, then look for programme evidence on how to address it. The numbers are not forecasts of a programme's effect.",
    evidence: ev("mbuagbaw2015", "murray2014"),
    basis: `${o.label}: the model's prediction changes by ${o.diff >= 0 ? "+" : ""}${o.diff.toFixed(1)} percentage points.`,
  };
}

export const FACILITY_CUE: Cue = {
  action: "Use the ranked list to plan who to contact first (reminders, home visits by health extension workers), within the follow-up capacity you set; never use it to refuse or reduce care.",
  basis: "Women with the lowest predicted chance of ANC8+ are listed first.",
  evidence: ev("vancalster2019", "afework2014", "wagnew2018"),
};
