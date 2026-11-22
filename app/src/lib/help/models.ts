import type { HelpTopic } from "./types";

/** The models: Model analysis, Predict, About. */

export const MODELS: HelpTopic[] = [
  {
    key: "analysis",
    label: "Model analysis",
    group: "models",
    blurb: "Our three models for ANC8+: performance, calibration, SHAP",
    screen: "/models",
    purpose:
      "The study's own model results for ANC8+, copied from its saved tables: held-out performance (manuscript Table 2), calibration (Figure 2), what early initiation adds (Table 3), and which predictors the models lean on (SHAP and permutation importance).",
    plain: [
      "Every number is measured on held-out women from sampling clusters no model saw while it was built: 1,375 women in the full cohort and 984 at ANC entry, weighted to stand for all women.",
      "**Average precision**: of the women a model ranks near the top, how many really reached ANC8+. Chance is the share who reached it, 16% in the held-out sample, so 0.40 to 0.44 is between two and three times chance. **AUROC**: pick one woman who reached ANC8+ and one who did not; how often does the model score the first higher? 0.5 is a coin toss. **Brier score**: the average squared gap between predicted probability and outcome; lower is better.",
      "**Calibration**: whether a predicted 30% happens 30% of the time. All three models predicted more ANC8+ than was observed (calibration-in-the-large below zero), so their percentages should not be taken at face value without recalibration.",
    ],
    before: ["basics-models"],
    cards: [
      {
        id: "tiles",
        title: "One tile per model",
        shows: "Each model's held-out average precision, with its 95% interval, AUROC and Brier score.",
        read: [
          "The three models are close; XGBoost is highest on average precision, but its difference from logistic regression is uncertain.",
          "The **For programmes** note under the tiles says what this level of performance supports.",
        ],
        terms: ["ap", "auroc"],
        shot: false,
      },
      {
        id: "vs-chance",
        title: "Held-out performance",
        shows: "Manuscript Table 2: average precision, AUROC and Brier score with 95% intervals, calibration, and classification at each model's threshold. Under it, average precision with its interval against chance.",
        read: [
          "Intervals come from 2,000 stratified PSU-bootstrap resamples of the held-out women.",
          "Calibration-in-the-large below zero: overprediction. Calibration slope: 1 is ideal; below 1, predictions too extreme.",
          "Sensitivity, specificity, PPV and NPV are at the threshold chosen on the development women (Youden index).",
        ],
        terms: ["ci", "calibration"],
        shot: false,
      },
      {
        id: "calibration",
        title: "Calibration",
        shows: "Manuscript Figure 2 as saved by the study: observed against predicted ANC8+ in up to ten groups, with a smooth curve, for each model.",
        read: ["Points on the diagonal: honest percentages. Below the diagonal: the model predicted more ANC8+ than happened."],
        terms: ["calibration"],
        shot: false,
      },
      {
        id: "first-visit",
        title: "What early initiation adds",
        shows: "Manuscript Table 3: among the 984 held-out women who started ANC, each model with and without whether the first visit was by 12 weeks.",
        read: ["The gains are positive for all three models, but every 95% interval includes zero."],
        terms: ["paired"],
        shot: false,
      },
      {
        id: "learned",
        title: "What the model leans on (SHAP)",
        shows: "Notebook 3 tables T2 and T5: XGBoost's survey-weighted mean absolute SHAP value per predictor, in the full cohort or at ANC entry.",
        read: [
          "Longer bars: the predictor moves the model's predictions more. It is not a measure of cause.",
          "Full cohort: wealth, travel time and region lead. At ANC entry: early initiation leads.",
        ],
        terms: ["shap"],
        shot: false,
      },
      {
        id: "permutation",
        title: "Permutation importance",
        shows: "Notebook 3 table T1 (manuscript Figure 4): the mean drop in average precision when one predictor's values are shuffled 20 times, for each model.",
        read: ["Region and wealth lead in all three models. A bar near zero: the model loses little without that predictor."],
        shot: false,
      },
    ],
  },
  {
    key: "predict",
    label: "Predict",
    group: "models",
    blurb: "Score one woman and see why",
    screen: "/predict",
    purpose:
      "Choose what to predict, when, and with which model, then change a woman's answers and watch her chance respond, with an exact breakdown of what each answer adds. It is for understanding the models, not for judging a real person.",
    plain: [
      "Pick a model, a rung and a moment, then change the answers. The starting woman is a made-up profile close to the survey's typical woman. Her chance is what the model gives women with exactly these answers.",
      "All three models run in your browser, so Predict works offline. Logistic regression is a short list of numbers and responds at once. Random forest and XGBoost are hundreds of decision trees: their file (0.5 to 2.6 MB) downloads the first time you choose one, and after that they respond at once too. Each gives exactly the chance the fitted model gives: checked on all 1,375 held-out women.",
      "It is for understanding the models, not for judging a real woman: a chance describes women with these answers, not what would happen to one woman if her circumstances changed.",
    ],
    before: ["basics-models"],
    recipes: [
      {
        title: "See what one answer is worth",
        steps: [
          "Keep logistic regression and the starting woman.",
          "Change one answer, for example travel time to a health facility.",
          "Read the change in points under her chance, and the new bar in **Why, exactly**.",
          "Press **Reset** to go back to the starting woman.",
        ],
      },
      {
        title: "Do the models agree?",
        steps: ["Read **Every … model**: the same answers scored by every model for the question, updated as you change them."],
      },
    ],
    cards: [
      {
        id: "questions",
        title: "The questions",
        shows: "The outcome, the moment, the model, and the answers it asks for.",
        read: [
          "**Model**: logistic regression, random forest or XGBoost. All three run in your browser; the tree models load their file the first time you pick them.",
          "**ANC1+ | ANC4+ | ANC8+**: the rung.",
          "**When**: before antenatal care starts, or at the first visit (adds whether the first visit was early). The first-visit models exist for ANC8+ only; elsewhere the choice is greyed out.",
          "The tags under it: its accuracy, number of predictors, where it runs, and **How it was built** (its Model analysis).",
          "The questions are grouped by theme, most influential first. A blue edge marks an answer you changed. **Show more** reveals the rest.",
          "The starting woman is a synthetic profile close to the survey's typical woman.",
        ],
        terms: ["predictor", "horizon"],
      },
      {
        id: "chance",
        title: "Chance of reaching the rung",
        shows: "The chosen model's chance for women with these answers.",
        read: [
          "The large number is her chance; under it, the change from the starting woman.",
          "The dashed line is the rate for all women; the ring is the model's working threshold.",
          "Any unanswered questions are filled with typical values, and it says how many.",
        ],
        watch: "It describes women with these recorded answers, not what would happen if a woman's circumstances changed.",
        terms: ["probability", "operating-threshold"],
      },
      {
        id: "why",
        plain: [
          "Logistic regression keeps a running score for her. It starts from a base value, and each answer adds or takes away a fixed amount; the bars are those amounts. The final score becomes her chance through a fixed S-shaped curve: a score of 0 is 50%, −2 is about 12%, +2 about 88%.",
          "So the bars add up exactly to her score, and the same bar moves her chance most when she is near 50%, and least when she is near 5% or 95%.",
        ],
        title: "Why, exactly",
        shows: "What each answer adds to her score, largest first. Only for models that run in your browser.",
        read: [
          "Green bars raise her chance; red bars lower it.",
          "The numbers are on the log-odds scale: with the model's starting value they add up exactly to the number behind the percentage.",
        ],
        terms: ["log-odds", "logistic"],
      },
      {
        id: "compare",
        plain: [
          "The three models are built very differently, so when they give her similar chances the answer does not depend on the kind of model. When they disagree, her combination of answers is unusual, and any single model's chance for her should be read with care.",
        ],
        title: "Every model for the question",
        shows: "The same answers scored by every model for this outcome and moment.",
        read: [
          "It updates as you change the answers.",
          "Models that roughly agree make the answer more believable.",
          "Click a model to switch to it.",
        ],
      },
    ],
    faq: [
      { q: "Why is there no \"Why, exactly\" for random forest or XGBoost?", a: "Their chance comes from hundreds of trees voting, which does not split exactly into one part per answer the way logistic regression's score does. What XGBoost leans on overall is in Model analysis, under SHAP." },
    ],
  },
  {
    key: "about",
    label: "About the study",
    group: "models",
    blurb: "The study on one page, from the manuscript abstract",
    screen: "/about",
    purpose:
      "A one-page summary of the study from the manuscript: the abstract, each finding with a link to the screen that shows it, the limits, and the study's own documents. Open it from the status bar or the finder.",
    cards: [
      {
        id: "findings",
        title: "Abstract and findings",
        shows: "The manuscript's abstract, then one line per finding and the screen that shows it. Click a line to open it.",
        read: ["The numbers are the manuscript's."],
        shot: false,
      },
      {
        id: "limits",
        title: "Limits",
        shows: "What the study cannot support, from the manuscript's discussion.",
        read: [
          "Internal validation in one survey round.",
          "All models overpredict.",
          "Predictors are markers, not causes; the early-visit contrast is not an intervention effect.",
          "Contact counts and first-visit timing are recalled.",
        ],
        shot: false,
      },
      {
        id: "reports",
        title: "Study documents",
        shows: "The manuscript and its supplementary material.",
        read: ["These replace the earlier library of reports."],
        shot: false,
      },
    ],
  },
];
