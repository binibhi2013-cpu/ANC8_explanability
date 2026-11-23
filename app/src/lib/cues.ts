/**
 * Every decision cue in the app, in one place so the wording can be reviewed and
 * edited together.
 *
 * Where the study's own notebook 4 programme review has wording for a signal, that
 * wording is used verbatim (marked "notebook 4" below, with its source file). The other
 * cues were drafted for the dashboard and follow the same rules.
 *
 * Rules for a cue:
 *  - it is tied to the number shown on its card;
 *  - it agrees with the manuscript's discussion and the notebook 4 programme review;
 *  - it is worded as a suggestion ("suggests", "worth reviewing"), never as a cause or
 *    as a predicted effect of an intervention.
 */

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

/** Notebook 4, core_programme_review.csv (Region), programme-review focus, verbatim. */
export const REGION_CUE = "Diagnose the pathway stage responsible for each regional pattern before considering a programme response.";

/** Notebook 4, programme_review_brief.csv (Timing and continuity), verbatim. */
export const TIMING_CUE = "Review timely initiation and continuity after initiation as related but distinct programme problems.";

/** Notebook 4 wording per signal, verbatim: the brief's cue for wealth and travel time
 *  (programme_review_brief.csv) and "How to use in programme review" for the contextual
 *  signals (contextual_overlays.csv). */
export const SIGNAL_CUE = {
  wealth: "Review whether barriers affecting poorer women persist beyond initial ANC access and continue through repeated contacts.",
  travel: "Review where geographic and repeated-travel burdens interfere with both ANC entry and sustained attendance.",
  occupation: "Use occupation to ask whether work schedules, livelihood demands, seasonality, clinic hours or opportunity costs help explain an identified access or continuity problem.",
  religion: "Use the signal to investigate whether geography, community context, communication, service organization or other correlated conditions help explain an observed pathway difference.",
  intention: "Use reproductive context as a secondary lens when examining early engagement and continued ANC participation.",
} as const;

export const CUES = {
  /** Overview tile: Reach any ANC. */
  anyAnc: (reach1: number) =>
    `${pct(1 - reach1)} of women had no antenatal contact at all. Reaching women who never start care remains part of the ANC8+ gap.`,

  /** Overview tile: Lost between 4 and 8. */
  lost48: (lost: number) =>
    `${pct(lost)} of women who reached four contacts did not reach eight. Follow-up between the fourth and eighth contact is worth reviewing.`,

  /** Overview key finding and Cohorts timing panel. Notebook 4, programme_review_brief.csv
   *  (Timing and continuity), cue and caution verbatim. */
  earlyVisit:
    "Review timely initiation and continuity after initiation as related but distinct programme problems. Neither the observed difference nor the model-response contrast is a causal estimate of the effect of initiating ANC early.",

  /** Region panel: the region's largest loss on the ladder. */
  regionLoss: (region: string, loss: "never" | "start_lt4" | "four_lt8", share: number) =>
    loss === "never"
      ? `${pct(share)} of women in ${region} had no ANC. ${REGION_CUE}`
      : loss === "start_lt4"
        ? `${pct(share)} of women in ${region} started ANC but did not reach four contacts. ${REGION_CUE}`
        : `${pct(share)} of women in ${region} reached four contacts but did not reach eight. ${REGION_CUE}`,

  /** Region panel, Who is left behind: wealth. Second sentence: notebook 4 wealth cue. */
  wealthGap: (region: string, poorest: number, richest: number, rung: string) =>
    `In ${region}, ${rung} is ${pct(poorest)} among the poorest and ${pct(richest)} among the richest. ${SIGNAL_CUE.wealth}`,

  /** ANC ladder, Regions through the five stages (notebook 4). */
  region: REGION_CUE,

  /** ANC ladder, Who moves through each stage: one cue per grouping (notebook 4). */
  signal: (key: keyof typeof SIGNAL_CUE) => SIGNAL_CUE[key],

  /** Region panel, travel time: notebook 4 travel cue. */
  travel: (region: string, over60: number) =>
    `${pct(over60)} of women in ${region} report more than an hour to the nearest hospital or health centre. ${SIGNAL_CUE.travel}`,

  /** Model analysis: SHAP and permutation ranking. */
  leadingPredictors:
    "Wealth, travel time and region lead the model. The study treats them as the core equity, access and contextual signals for programme review; none of them is a causal mechanism or an intervention target.",

  /** Model analysis: held-out performance. */
  performance: (apLo: number, apHi: number) =>
    `Average precision ${apLo.toFixed(2)} to ${apHi.toFixed(2)} and overall overprediction. As the study concludes, independent validation and calibration assessment are needed before programme application.`,

  /** Cohorts: what the first visit adds (Table 3 of the manuscript). */
  firstVisitAdds: (lo: number, hi: number) =>
    `Adding early initiation raised average precision by ${lo.toFixed(3)} to ${hi.toFixed(3)}, but all paired confidence intervals included zero. ${TIMING_CUE}`,
} as const;
