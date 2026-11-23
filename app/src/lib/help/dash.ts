import type { HelpTopic } from "./types";

/**
 * Help for the ANC8+ Ethiopia Dashboard: one topic per section of the page and per tool.
 * Plain language; every number quoted here is on the dashboard and comes from the study's
 * saved outputs. No screenshots (shot: false), so the text never goes stale against a
 * changed layout.
 */

export const DASH_HELP: HelpTopic[] = [
  {
    key: "start",
    label: "Using the dashboard",
    group: "start",
    blurb: "What the dashboard shows and how the filter bar works",
    purpose:
      "The ANC8+ Ethiopia Dashboard shows how many pregnant women in Ethiopia reach eight antenatal care contacts (ANC8+), where they are lost on the way, which groups are left behind, and how well the study's three models predict ANC8+. Every number comes from the study's own analysis of the Ethiopia Demographic and Health Survey 2024–25.",
    plain: [
      "The dashboard has seven tabs, in the order you would tell the story: **Overview**, **Left behind**, **Regions**, **Early ANC**, **Models**, **What if** and **Review**. Each tab fits one screen, so nothing is hidden below.",
      "The **filter bar** under the top bar has three controls, and every chart on the page follows them. **Cohort** chooses who is counted: all 6,893 women with a recent pregnancy, or the 5,001 who started ANC. **Indicator** chooses what is counted: ANC1+, ANC4+, ANC8+ or an early first visit. **Region** shows the page for one region; clicking a region on the map or in a ranked list does the same.",
      "The filters are kept in the address bar, so a link you copy opens exactly what you see, and the browser's back button undoes the last change. **Reset** returns to all women, ANC8+, Ethiopia.",
      "Every card has a small (i): hover over it for what the card shows and where the numbers come from. Finding cards also have a **Cue** button: click it for a suggested action, the number it rests on, and the study's own wording where there is some. Cues are suggestions from the findings, not tested effects.",
    ],
    cards: [
      {
        id: "cohorts", title: "The two cohorts", shot: false,
        shows: "Who each share is out of.",
        read: [
          "**All women** (6,893): every woman with a recent pregnancy in the survey. ANC8+ here is the share of all of them who reached eight contacts.",
          "**Women who started ANC** (5,001): only women who had at least one contact. ANC1+ is 100% here by definition, so it cannot be chosen with this cohort.",
          "An early first visit is always counted among women who started ANC, whichever cohort is chosen.",
        ],
        terms: ["cohort", "contact"],
      },
      {
        id: "cues", title: "Recommendation cues", shot: false,
        shows: "The **Cue** button on a finding card opens a short suggested action for programmes.",
        read: [
          "**Suggested action**: what a programme could consider, drafted for the dashboard from the card's finding.",
          "**Based on**: the number on the card, which changes with the filters (choose Somali and the cue turns to Somali's weakest stage).",
          "**Study finding**: the study's own programme-review wording, verbatim, where it exists.",
        ],
        watch: "A cue is a suggestion to review, not a tested intervention or a predicted effect.",
      },
      {
        id: "present", title: "Presenting", shot: false,
        shows: "The **Present** button runs a guided walk through the dashboard, one card at a time.",
        read: ["Use the arrow keys or the buttons to move; Esc ends it.", "The sun or moon button switches between light and dark colours."],
      },
    ],
  },
  {
    key: "reading",
    label: "Reading the numbers",
    group: "start",
    blurb: "Shares, intervals, points and how the models are judged",
    purpose: "The few ideas needed to read every card on the dashboard.",
    cards: [
      {
        id: "shares", title: "Shares and intervals", shot: false,
        shows: "Every share is survey-weighted, so it describes all women in Ethiopia, not only those interviewed.",
        read: [
          "A thin line across a bar is the 95% confidence interval: the range the true share is likely to be in.",
          "A dashed mark on a bar chart is the average for the place chosen (Ethiopia or the region).",
          "Groups with few women are greyed and marked “few women; not reliable”.",
        ],
        terms: ["weight", "ci"],
      },
      {
        id: "points", title: "Percent and points", shot: false,
        shows: "A change from 13% to 34% is 21 **percentage points**, not 21 percent.",
        read: ["The dashboard writes differences between two shares in points."],
        terms: ["points"],
      },
      {
        id: "models", title: "How the models are judged", shot: false,
        shows: "Each model was trained on 5,518 women and tested on 1,375 held-out women from survey clusters it never saw.",
        read: [
          "**Average precision** (AP): how well the model ranks women who reached ANC8+ above those who did not. Chance is the share who reached ANC8+ (0.160 for the full cohort); higher is better.",
          "**AUROC**: the chance that a random woman who reached ANC8+ is ranked above one who did not; 0.5 is a coin toss.",
          "**Brier score**: the average squared gap between predicted chance and what happened; lower is better.",
          "**Calibration**: whether predicted chances match observed shares. Calibration in the large near 0 and slope near 1 are ideal.",
        ],
        terms: ["ap", "auroc", "brier", "calibration", "heldout"],
      },
      {
        id: "association", title: "Associations, not causes", shot: false,
        shows: "A gap between groups, or a large SHAP value, shows what goes with ANC8+, not what causes it.",
        read: ["Richer women reach ANC8+ more often, but wealth also travels with education, residence and distance. The dashboard never claims that changing one factor would change ANC8+."],
        terms: ["association"],
      },
    ],
  },
  {
    key: "overview",
    label: "1 · Overview",
    group: "plan",
    blurb: "The four indicators, the map and the care ladder",
    screen: "/",
    purpose: "The national or regional picture at a glance: how many women reach each indicator, how it varies across the 14 regions, and at which step of the care ladder women are lost.",
    cards: [
      {
        id: "tiles", title: "Indicator tiles", shot: false,
        shows: "ANC1+, ANC4+, ANC8+ and early first visit for the chosen cohort and place, with 95% intervals.",
        read: ["Click a tile to make it the indicator for the whole page.", "With a region chosen, the national value is shown beside it."],
      },
      {
        id: "map", title: "Map by region", shot: false,
        shows: "The chosen indicator in each region; darker is higher.",
        read: ["Click a region to show every tab for that region; click it again to return to Ethiopia.", "The line under the map names the highest and lowest region."],
        terms: ["regional-gap"],
      },
      {
        id: "ladder", title: "Where women are lost", shot: false,
        shows: "The care ladder from all women (or women who started ANC) to ANC4+ and ANC8+, with the share lost and the share who continued at each step.",
        read: ["The largest loss in Ethiopia is between four and eight contacts: of women who reached four, 63% did not reach eight.", "Click a rung to make it the page's indicator."],
        terms: ["rung", "continuation"],
      },
    ],
  },
  {
    key: "left-behind",
    label: "2 · Who is left behind",
    group: "plan",
    blurb: "The whole care pathway, stacked, for each group of a predictor",
    screen: "/?tab=left-behind",
    purpose: "One stacked chart: each bar is 100% of a group's women, split into never started, stopped before four, reached four but not eight, and reached eight. **Group by** switches the predictor: wealth, travel time, pregnancy intention, occupation, religion, education, residence, health insurance, pregnancy order or region.",
    cards: [
      {
        id: "stacked", title: "The stacked pathway", shot: false,
        shows: "The bright part of each bar, and the number at its end, is the indicator chosen in the filter bar; the faded parts are the rest of the pathway.",
        read: [
          "Choose ANC4+ and the last two parts light up; choose ANC8+ and only the last one does.",
          "The dashed mark is the average for the place chosen.",
          "Wealth, intention, education, residence, insurance and pregnancy order are also available by region; travel time, occupation and religion are national only, and the card says so.",
          "With the ANC-entry cohort there is no grey part, because every woman started ANC.",
        ],
        watch: "Within a region some groups are small; grey bars marked “not reliable” are left out of the comparison.",
      },
      {
        id: "gap", title: "The gap", shot: false,
        shows: "The highest and lowest group for the chosen indicator, how many times higher, and the step of the pathway where the two groups part most.",
        read: ["Its Cue suggests an action for that predictor, with the study's own wording."],
      },
    ],
  },
  {
    key: "regions",
    label: "3 · Regions",
    group: "plan",
    blurb: "Each region through five stages of care, and its weakest stage",
    screen: "/?tab=regions",
    purpose: "Each region through the study's five pathway stages, each among women who reached the stage before it. Red cells are below Ethiopia, blue above, and the last column names the stage where the region falls furthest behind.",
    cards: [
      {
        id: "stages", title: "Five stages by region", shot: false,
        shows: "Started ANC, ANC4+ of those who started, ANC8+ of those with four, early first visit, and ANC8+ of early starters.",
        read: ["Click a row to show every tab for that region; the Cue then gives an action for that region's weakest stage.", "The side card groups the regions by weakest stage."],
      },
    ],
  },
  {
    key: "early",
    label: "4 · Early ANC",
    group: "plan",
    blurb: "Does a first visit by 12 weeks go with reaching eight contacts?",
    screen: "/?tab=early",
    purpose: "Among the 5,001 women who started ANC, 43% had their first visit by 12 weeks. This section compares them with women who started later, first as observed and then as the XGBoost model predicts.",
    cards: [
      {
        id: "observed", title: "What women actually did", shot: false,
        shows: "ANC4+, ANC8+ and ANC8+ among women with four contacts, for early and later starters, with 95% intervals.",
        read: ["42% of early starters reached eight contacts against 11% of later starters.", "58% of early starters still did not reach eight: an early start alone is not enough."],
      },
      {
        id: "model", title: "What our model predicts", shot: false,
        shows: "XGBoost scores the same held-out women twice: once with every first visit set to early, once set to later.",
        read: ["13% predicted to reach ANC8+ with every first visit later, 34% with every first visit early: 20.8 points."],
        watch: "A model contrast, not an effect: an early first visit may also mark better access and care-seeking.",
      },
    ],
  },
  {
    key: "models",
    label: "5 · Our three models",
    group: "plan",
    blurb: "Logistic regression, random forest and XGBoost: performance, calibration, predictors",
    screen: "/?tab=models",
    purpose: "The study trained three models for ANC8+ on the same 21 predictors. This section reports how well each predicts on held-out women and which predictors each relies on. XGBoost scored highest and is the model used for findings elsewhere on the dashboard.",
    cards: [
      {
        id: "performance", title: "How well each model predicts", shot: false,
        shows: "Average precision against chance for each model, and a table with AP, AUROC and Brier (95% intervals), calibration, and sensitivity, specificity, PPV and NPV at the model's threshold.",
        read: ["All three are well above chance; the differences between them are within their intervals.", "All three predict more ANC8+ than observed, so they would need recalibration before use."],
        terms: ["ap", "auroc", "brier", "operating-threshold", "sensitivity", "ppv"],
      },
      {
        id: "entry", title: "What the first visit adds", shot: false,
        shows: "In the ANC-entry cohort, each model without and with early ANC as a predictor, on the same women.",
        read: ["Adding early ANC raised average precision a little for every model, but every interval includes zero."],
      },
      {
        id: "shap", title: "What XGBoost leans on", shot: false,
        shows: "The ten predictors with the largest mean absolute SHAP value. It follows the cohort filter.",
        read: ["In the full cohort: household wealth, travel time, region, religion, pregnancy intention and occupation lead.", "In the ANC-entry cohort, early ANC comes first."],
        terms: ["shap", "predictor"],
      },
      {
        id: "permutation", title: "Which predictors each model needs most", shot: false,
        shows: "The drop in average precision when one predictor is shuffled, for the model you choose.",
        read: ["A large drop means the model relies on that predictor."],
      },
    ],
  },
  {
    key: "whatif",
    label: "6 · What if",
    group: "plan",
    blurb: "Change one thing for every woman and ask the models what they predict",
    screen: "/?tab=what-if",
    purpose: "A what-if changes one predictor for every woman, keeps everything else as it is, and asks each model what share would reach ANC8+. It is a model contrast, not the effect of a programme.",
    cards: [
      {
        id: "contrast", title: "One contrast, three models", shot: false,
        shows: "Choose a predictor: early first visit, household wealth, travel time, region, pregnancy intention, mother's occupation, partner's education or weekly traditional media. Each model's predicted share reaching ANC8+ is shown with every woman at one level and then at the other.",
        read: [
          "Early first visit (ANC-entry cohort): XGBoost 13% → 34%.",
          "The others use the full cohort's 1,375 held-out women, from the study's saved models with the same method: for example, all poorest → all richest moves XGBoost from 9% to 25%.",
          "The bracket after each change is a 95% interval from resampling survey clusters. It leaves out uncertainty in the fitted models, so the spread between the three models is the better guide.",
        ],
        watch: "Model contrast, not effect. Only 10 held-out women had three weekly media exposures, so that contrast rests on very little data.",
      },
      {
        id: "all", title: "All contrasts at a glance", shot: false,
        shows: "The change for every predictor, XGBoost as the bar and the other two models as ticks. Click a row to open it.",
        read: ["The models agree most on wealth and the first visit; they disagree on intention, occupation and media."],
      },
    ],
  },
  {
    key: "review",
    label: "7 · Programme review",
    group: "plan",
    blurb: "The study's programme-review brief: observed, models, review cue, caution",
    screen: "/?tab=review",
    purpose: "The study's own programme-review brief, in its own words: for each core signal (wealth, travel time, region, early ANC) what was observed, what the models show, the review cue, and the caution that goes with it.",
    cards: [],
  },
  {
    key: "predict",
    label: "Score one woman",
    group: "models",
    blurb: "Answer the 21 questions and see one woman's predicted chance of ANC8+",
    screen: "/predict",
    purpose: "Answer the 21 questions the models use for one woman and see her predicted chance of reaching eight contacts, from the model you choose (XGBoost by default), and which answers move it up or down.",
    cards: [
      {
        id: "result", title: "Her predicted chance", shot: false,
        shows: "The predicted chance of ANC8+ for women with the same answers, and the model's held-out performance.",
        read: ["“What moves her chance” lists the answers that raise or lower the prediction most."],
        watch: "A prediction describes women like her in the survey, not what will happen to her.",
        terms: ["probability"],
      },
    ],
  },
  {
    key: "your-data",
    label: "Score a facility's list",
    group: "models",
    blurb: "Upload a list of women attending ANC and get each one's predicted chance of ANC8+",
    screen: "/your-data",
    purpose: "A decision aid for a facility: download the template, fill in one row per woman attending ANC, upload it, and see each woman's predicted chance of reaching eight contacts from the study's trained ANC-entry models. Women are ranked from the lowest chance, and you set how many your team can follow up.",
    plain: [
      "The file is read in your browser and is never sent anywhere.",
      "The models are the study's **ANC-entry** models, trained on the 5,001 women who started ANC, because a facility list is women already in care. The template has the 21 questions they use plus a woman_id. If you also fill **early_anc** (1 = first visit by 12 weeks, 0 = later), that woman is scored with the version that also uses the first visit.",
      "A blank or unrecognised answer is filled with the model's usual value and listed under “Checks on your file”, so you can correct it and upload again.",
    ],
    cards: [
      {
        id: "results", title: "The results", shot: false,
        shows: "Totals, the share flagged, averages by region and by wealth, and every woman sorted from lowest predicted chance.",
        read: ["**Download results (CSV)** saves the list with each woman's predicted chance and flag."],
        watch: "The models were tested on survey data, not on facility registers, and need local validation and recalibration before routine use.",
      },
    ],
  },
];
