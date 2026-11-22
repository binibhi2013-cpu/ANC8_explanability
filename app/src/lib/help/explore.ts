import type { HelpTopic } from "./types";

/** The exploratory analysis: the ladder and the two cohorts. */

export const EXPLORE: HelpTopic[] = [
  {
    key: "ladder",
    label: "The ANC ladder (screen)",
    group: "explore",
    blurb: "Who reaches each rung, and where they stop",
    screen: "/explore/ladder",
    purpose:
      "The ladder in depth: the full spread of contact counts behind the three rungs, which groups of women climb further, and which regions keep women and which lose them.",
    plain: [
      "The three rungs are cuts through one number: how many antenatal visits each woman had. The ladder screen shows that number whole, so you can see where women stop, not just whether they passed a line.",
      "Women bunch at three or four visits, and again at eight: the first bunch sits at the old four-visit standard, the second at the new eight-visit one.",
      "Following a group of women up the ladder (the poorest fifth, say) shows where that group is lost. A group that starts care as often as others but falls away before eight needs help staying, not starting.",
    ],
    before: ["basics-ladder", "basics-charts"],
    recipes: [
      {
        title: "See one region's ladder",
        steps: [
          "Pick a region (on the map, or with the finder). Every chart here switches to it, with Ethiopia as a dashed line for comparison.",
          "Read **How many contacts women had**: where the bars bunch tells you where women stop.",
        ],
      },
      {
        title: "Find who is left behind",
        steps: ["In **The ladder, group by group**, pick **Wealth**, then **Education**. The longer a row's line, the more of that group is lost on the way up."],
      },
    ],
    cards: [
      {
        id: "tiles",
        title: "The rungs, with intervals",
        shows: "The share reaching each rung for the current scope and cohort, with its 95% interval, and the share lost between four and eight contacts.",
        read: [
          "Click a rung's tile to choose which rung's value is printed at the right of **The ladder, group by group**.",
          "The interval says how precisely the survey pins the value down.",
        ],
        terms: ["ci", "continuation"],
      },
      {
        id: "contacts",
        title: "How many contacts women had",
        shows: "The share of women with each number of antenatal contacts, from 0 to 12 or more.",
        read: [
          "The colours are the rungs: red is no care, then ANC1+ (1–3), ANC4+ (4–7) and ANC8+ (8 or more).",
          "The three rungs are just cuts through this one spread.",
          "Look for the peaks at three to four contacts and at eight.",
          "With a region chosen, the dashed line is Ethiopia. The tag says the cohort and how many women.",
        ],
      },
      {
        id: "survival",
        title: "Women with at least each number of contacts",
        shows: "The share of all women who had at least that many contacts. It comes from one count per woman, not from following women over time.",
        read: [
          "The first steep step is women with no ANC.",
          "The drop after four is the gap the eight-contact standard exposes.",
          "Dashed vertical lines mark the three rungs; hover for exact shares.",
        ],
      },
      {
        id: "groups",
        title: "The ladder, group by group",
        shows: "One row per group of women (for example each wealth fifth), with three dots: the share reaching ANC1+, ANC4+ and ANC8+.",
        read: [
          "The longer the line from the first dot to the last, the more of that group is lost on the way up.",
          "Pick the grouping with the switch (a list on a phone). Only groupings that are among the study's 21 predictors are offered.",
          "Groups with fewer than 25 women are not shown.",
        ],
      },
      {
        id: "regions",
        title: "Where each region keeps and loses women",
        shows: "A grid of regions against four steps: starting care, continuing from 1 to 4 contacts, continuing from 4 to 8, and reaching eight.",
        read: [
          "Each column is shaded on its own: darker is better on that step. Compare regions down a column.",
          "A region dark on **Start** but light on **Continue 4→8** gets women in but does not keep them.",
          "Click a region to follow it through the page.",
        ],
        terms: ["continuation"],
      },
    ],
  },
  {
    key: "cohorts",
    label: "Cohorts & horizons",
    group: "explore",
    blurb: "Full cohort and ANC entry, and what the first visit adds",
    screen: "/explore/cohorts",
    purpose:
      "The study's two cohorts side by side: every woman (full cohort) and women who started ANC (ANC entry), and what knowing whether the first visit was early adds to prediction among women who started.",
    plain: [
      "**Full cohort**: the 6,893 women with a live birth or stillbirth in the 36 months before the interview and a recorded number of contacts, including women with no ANC. **ANC entry**: the 5,001 of them who started ANC and whose first-visit timing is known.",
      "In the ANC-entry cohort the study asked whether an early first visit (by 12 weeks) adds predictive information to the 21 background predictors. The point estimates say yes for all three models, but every 95% interval includes zero (manuscript Table 3).",
    ],
    before: ["basics-ladder", "basics-models"],
    cards: [
      {
        id: "tiles",
        title: "The two cohorts",
        shows: "Each cohort's size, what it is, and its share reaching each rung.",
        read: ["Click a tile to switch the whole studio to that cohort (the same as the sidebar's Cohort switch)."],
        terms: ["cohort"],
      },
      {
        id: "ladder",
        title: "The ladder in each cohort",
        shows: "One row per rung; one dot per cohort, with its 95% interval.",
        read: [
          "The ANC-entry cohort starts at ANC1+ by definition, so its ANC4+ and ANC8+ are higher: they are shares of women who started.",
          "Click a rung to switch to it.",
        ],
        terms: ["ci"],
      },
      {
        id: "contacts",
        title: "Contact counts in each cohort",
        shows: "The share of women with each number of contacts, one line per cohort.",
        read: ["The ANC-entry line has no zero (every woman in it started) and so sits higher everywhere else."],
      },
      {
        id: "regions",
        title: "Region by region, both cohorts",
        shows: "Each region's share reaching the rung in the two cohorts.",
        read: [
          "The number at the right is the full cohort's value.",
          "The ANC-entry share is higher because women with no ANC are not in it.",
          "Click a region to select it.",
        ],
      },
      {
        id: "first-visit",
        title: "What the first visit adds",
        shows: "Manuscript Table 3: average precision of each model on the 984 held-out women who started ANC, without (ring) and with (dot) whether the first visit was by 12 weeks.",
        read: ["Under each model: the gain and its 95% interval from the paired bootstrap. Every interval includes zero, so the gain is uncertain."],
        shot: false,
        terms: ["horizon"],
      },
    ],
  },
];
