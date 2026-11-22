import {
  BookA,
  BookOpen,
  Calculator,
  ChartColumnBig,
  ChartNetwork,
  CircleHelp,
  Compass,
  Gauge,
  Info,
  Layers,
  LifeBuoy,
  Microscope,
  ListTree,
  Map as MapIcon,
  Split,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { HELP_GROUPS, TOPIC_LIST } from "@/lib/help/topics";

/**
 * Navigation, organised the house way: by what the reader is DOING, not by which
 * analysis produced a result. Planning comes first because the studio exists for the
 * people who allocate effort across regions; the exploratory analysis and the models
 * follow for anyone who wants to check the ground under a plan.
 */

export type Mode = "plan" | "explore" | "models" | "help";

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  /** The content header for this screen: crumb, title, subtitle. */
  meta: [string, string, string];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const MODES: { key: Mode; label: string }[] = [
  { key: "plan", label: "Plan" },
  { key: "explore", label: "Explore" },
  { key: "models", label: "Models" },
  { key: "help", label: "Help" },
];

export const NAV: Record<Mode, NavGroup[]> = {
  plan: [
    {
      label: "Start",
      items: [
        { key: "overview", label: "Overview", icon: Gauge, path: "/",
          meta: ["Plan", "Antenatal care in Ethiopia at a glance", "EDHS 2024–25"] },
      ],
    },
    {
      label: "Screens",
      items: [
        { key: "map", label: "Map & regions", icon: MapIcon, path: "/map",
          meta: ["Plan", "Where women are lost, region by region", "click a region for its analysis"] },
        { key: "data", label: "Your data", icon: Upload, path: "/your-data",
          meta: ["Plan", "Trends and forecasts from your own records", "a tool, not a study finding"] },
      ],
    },
  ],
  explore: [
    {
      label: "Exploratory analysis",
      items: [
        { key: "ladder", label: "The ANC ladder", icon: Layers, path: "/explore/ladder",
          meta: ["Explore", "ANC1+, ANC4+ and ANC8+", "who reaches each rung"] },
        { key: "cohorts", label: "Cohorts & horizons", icon: Split, path: "/explore/cohorts",
          meta: ["Explore", "Full cohort and ANC entry", "what the first visit adds"] },
      ],
    },
  ],
  models: [
    {
      label: "Models",
      items: [
        { key: "predict", label: "Predict", icon: Calculator, path: "/predict",
          meta: ["Models", "Score one woman for ANC8+", "our three models, 21 predictors"] },
        { key: "analysis", label: "Model analysis", icon: Microscope, path: "/models",
          meta: ["Models", "How well our models predict ANC8+", "Table 1, Table 2, Figure 1 and SHAP"] },
      ],
    },
  ],
  help: [],
};

/**
 * The Help mode's sidebar: every help topic, grouped as the Help groups them. A topic
 * that explains a screen borrows that screen's icon, so the two read as one.
 */
const BASICS_ICON: Record<string, LucideIcon> = {
  start: Compass, controls: LifeBuoy, "basics-ladder": Layers, "basics-numbers": BookOpen,
  "basics-charts": ChartColumnBig, "basics-models": ChartNetwork, terms: BookA, about: Info,
};
const SCREEN_ITEMS = (["plan", "explore", "models"] as const).flatMap((m) => NAV[m].flatMap((g) => g.items));
NAV.help = [
  {
    label: "Help",
    items: [
      { key: "help-home", label: "Help home", icon: CircleHelp, path: "/help",
        meta: ["Help", "How to use the studio", "every tool, in plain language"] },
    ],
  },
  ...HELP_GROUPS.map((g) => ({
    label: g.label,
    items: TOPIC_LIST.filter((t) => t.group === g.key).map((t) => ({
      key: `help-${t.key}`,
      label: t.label,
      icon: BASICS_ICON[t.key] ?? SCREEN_ITEMS.find((i) => i.key === t.key)?.icon ?? CircleHelp,
      path: `/help/${t.key}`,
      meta: ["Help", t.label, t.blurb] as [string, string, string],
    })),
  })),
];

/** Reachable from the finder and the status bar, not from the sidebar. */
const ABOUT: NavItem = {
  key: "about", label: "About the study", icon: Info, path: "/about",
  meta: ["About", "The study on one page", "where to see each finding"],
};

const ALL: (NavItem & { mode: Mode })[] = [
  ...(Object.keys(NAV) as Mode[]).flatMap((mode) =>
    NAV[mode].flatMap((g) => g.items.map((i) => ({ ...i, mode }))),
  ),
  { ...ABOUT, mode: "plan" as Mode },
];

/** The nav item a pathname belongs to: the longest matching path wins. */
export function itemForPath(pathname: string): (NavItem & { mode: Mode }) | undefined {
  const clean = pathname.replace(/\/+$/, "") || "/";
  let best: (NavItem & { mode: Mode }) | undefined;
  for (const item of ALL) {
    const p = item.path.split("?")[0];
    const hit = p === "/" ? clean === "/" : clean === p || clean.startsWith(p + "/");
    if (hit && (!best || p.length > best.path.split("?")[0].length)) best = item;
  }
  return best;
}

export function modeForPath(pathname: string): Mode {
  return itemForPath(pathname)?.mode ?? "plan";
}

export function allNavItems() {
  return ALL;
}

/** Links from before the studio (#reports, #predict/…) and where they live now. */
export const LEGACY_HASH: Record<string, string> = {
  reports: "/about",
  brief: "/",
  findings: "/map",
  predictors: "/explore/ladder",
  ladder: "/explore/ladder",
  horizons: "/explore/cohorts",
  wartime: "/",
  predict: "/predict",
  whatif: "/predict",
  evidence: "/models",
  record: "/about",
  journey: "/about",
};
