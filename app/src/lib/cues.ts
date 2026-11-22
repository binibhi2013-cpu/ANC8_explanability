/**
 * Every decision cue in the app, in one place so the wording can be reviewed and
 * edited together.
 *
 * Rules for a cue:
 *  - it is tied to the number shown on its card;
 *  - it agrees with the manuscript's discussion and the notebook 4 programme review;
 *  - it is worded as a suggestion ("suggests", "worth reviewing"), never as a cause or
 *    as a predicted effect of an intervention.
 */

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

export const CUES = {
  /** Overview tile: Reach any ANC. */
  anyAnc: (reach1: number) =>
    `${pct(1 - reach1)} of women had no antenatal contact at all. Reaching women who never start care remains part of the ANC8+ gap.`,

  /** Overview tile: Lost between 4 and 8. */
  lost48: (lost: number) =>
    `${pct(lost)} of women who reached four contacts did not reach eight. Follow-up between the fourth and eighth contact is worth reviewing.`,

  /** Overview: Key finding from our model (entry cohort, notebook 3 T8). */
  earlyVisit:
    "Consistent with the WHO and national guideline, supporting a first contact within 12 weeks fits these findings. The difference is a model contrast, not a measured effect of an intervention.",

  /** Region panel: the region's largest loss on the ladder. */
  regionLoss: (region: string, loss: "never" | "start_lt4" | "four_lt8", share: number) =>
    loss === "never"
      ? `${pct(share)} of women in ${region} had no ANC. Suggests priority for outreach so that women start care.`
      : loss === "start_lt4"
        ? `${pct(share)} of women in ${region} started ANC but did not reach four contacts. Suggests reviewing why women do not continue after the first visits.`
        : `${pct(share)} of women in ${region} reached four contacts but did not reach eight. Suggests reviewing follow-up between the fourth and eighth contact.`,

  /** Region panel, Who is left behind: wealth. */
  wealthGap: (region: string, poorest: number, richest: number, rung: string) =>
    `In ${region}, ${rung} is ${pct(poorest)} among the poorest and ${pct(richest)} among the richest. Suggests checking that services reach the poorest households.`,

  /** Model analysis: SHAP and permutation ranking. */
  leadingPredictors:
    "Wealth, travel time and region lead the model. They can help decide where to look first, but they are markers of circumstances, not causes or direct targets for intervention.",

  /** Model analysis: held-out performance. */
  performance: (apLo: number, apHi: number) =>
    `Average precision ${apLo.toFixed(2)} to ${apHi.toFixed(2)} and overall overprediction. The models are not yet ready to flag individual women: external validation and recalibration come first.`,

  /** Cohorts: what the first visit adds (Table 3 of the manuscript). */
  firstVisitAdds: (lo: number, hi: number) =>
    `Adding early initiation raised average precision by ${lo.toFixed(3)} to ${hi.toFixed(3)}, with intervals that include zero. Recording first-visit timing is worth keeping, but its added predictive value is uncertain.`,
} as const;
