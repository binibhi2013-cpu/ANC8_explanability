import type { HelpGroup } from "./types";

/**
 * The Help's table of contents, light enough for the navigation and the finder to load
 * on every screen. The full text lives in dash.ts;
 * lib/help/index.ts checks that the two agree.
 */

export interface TopicEntry {
  key: string;
  label: string;
  group: HelpGroup;
  blurb: string;
}

export const HELP_GROUPS: { key: HelpGroup; label: string }[] = [
  { key: "start", label: "Start here" },
  { key: "plan", label: "The dashboard, section by section" },
  { key: "models", label: "Tools" },
];

export const TOPIC_LIST: TopicEntry[] = [
  { key: "start", label: "Using the dashboard", group: "start", blurb: "What the dashboard shows and how the filter bar works" },
  { key: "reading", label: "Reading the numbers", group: "start", blurb: "Shares, intervals, points and how the models are judged" },
  { key: "terms", label: "Words, A to Z", group: "start", blurb: "Every term the dashboard uses, in plain language" },
  { key: "overview", label: "1 · Overview", group: "plan", blurb: "The four indicators, the map and the care ladder" },
  { key: "left-behind", label: "2 · Who is left behind", group: "plan", blurb: "The whole care pathway, stacked, for each group of a predictor" },
  { key: "regions", label: "3 · Regions", group: "plan", blurb: "Each region through five stages of care, and its weakest stage" },
  { key: "early", label: "4 · Early ANC", group: "plan", blurb: "Does a first visit by 12 weeks go with reaching eight contacts?" },
  { key: "models", label: "5 · Our three models", group: "plan", blurb: "Logistic regression, random forest and XGBoost: performance, calibration, predictors" },
  { key: "whatif", label: "6 · What if", group: "plan", blurb: "Change one thing for every woman and ask the models what they predict" },
  { key: "review", label: "7 · Programme review", group: "plan", blurb: "The study's notebook 4 brief: observed, models, review cue, caution" },
  { key: "predict", label: "Score one woman", group: "models", blurb: "Answer the 21 questions and see one woman's predicted chance of ANC8+" },
  { key: "your-data", label: "Score a facility's list", group: "models", blurb: "Upload a list of women attending ANC and get each one's predicted chance of ANC8+" },
];

export const TOPIC_KEYS = TOPIC_LIST.map((t) => t.key);

export function topicEntry(key: string): TopicEntry | undefined {
  return TOPIC_LIST.find((t) => t.key === key);
}
