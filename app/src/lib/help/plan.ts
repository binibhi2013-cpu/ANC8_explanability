import type { HelpTopic } from "./types";

/** The main screens: Overview, Map & regions, Your data. */

export const PLAN: HelpTopic[] = [
  {
    key: "overview",
    label: "Overview",
    group: "plan",
    blurb: "The ladder at a glance and the key finding from our model",
    screen: "/",
    purpose:
      "The front page. It gives the national picture in four numbers and a funnel, the key finding from our model, ANC8+ by region, and doors to the other screens.",
    plain: [
      "Think of 100 women with a live birth or stillbirth in the three years before the survey. About 78 had at least one antenatal contact (**ANC1+**). About 52 had at least four (**ANC4+**). Only about 19 reached the eight contacts the WHO recommends (**ANC8+**).",
      "So women are lost at three steps: about 22 had no ANC, 25 started but did not reach four, and 33 reached four but did not reach eight. The last step is the biggest: of every 100 women who reached four contacts, only about 37 reached eight.",
      "The numbers are counted from the survey itself (the full cohort of 6,893 women), weighted so that the women interviewed stand for all women in the country. They agree with the EDHS 2024-25 report (Table 9.2) to within one point.",
    ],
    before: ["basics-ladder"],
    cards: [
      {
        id: "tiles",
        title: "The four headline numbers",
        shows: "The national share of women reaching each rung, and the share lost between four and eight contacts.",
        read: [
          "**Reach any ANC**: at least one antenatal contact (ANC1+).",
          "**Reach four contacts**: the earlier standard (ANC4+).",
          "**Reach eight contacts**, in red: the WHO recommendation (ANC8+), the study's outcome.",
          "**Lost between 4 and 8**, in orange: of the women who reached four contacts, the share who did not reach eight.",
        ],
        terms: ["rung", "continuation"],
      },
      {
        id: "key-finding",
        title: "Key finding from our model",
        shows: "The study's what-if for the first visit (notebook 3, table T8): among women who started ANC, the share the models predict reach eight contacts with an early first visit against a later one.",
        plain: [
          "Each of the 984 held-out women who started ANC was scored twice by the same model: once with her first visit set to early (by 12 weeks) and once set to later. Nothing else about her was changed. The averages are 34% and 13% for logistic regression (20.9 points apart); 15 to 21 points across the three models.",
          "This is a model contrast, not the effect of an intervention. Women who start early may also live closer to services or have other advantages that the model only partly captures.",
        ],
        read: [
          "The sentence gives the logistic regression result; the three boxes give each model.",
          "Read the gap as how strongly the model links an early first visit with reaching eight contacts.",
          "Under the boxes, **What women actually did** gives notebook 4's observed result: 42% of early starters reached ANC8+ against 11% of later starters.",
        ],
        terms: ["association"],
        shot: false,
      },
      {
        id: "minimap",
        title: "ANC8+ by region",
        shows: "A small map with each region shaded by the share of women reaching eight contacts (full cohort), with a legend and every region's value.",
        read: [
          "Five shades; the legend under the map gives each shade's range.",
          "The list beside the map gives each region's value, highest first, and Ethiopia's.",
          "Click a region to open it on the full map, with its analysis.",
        ],
        tryIt: [{ text: "The full map", href: "/map?metric=anc8" }],
        shot: false,
      },
      {
        id: "ladder",
        title: "The antenatal care ladder",
        shows: "A funnel: all women, then the share reaching ANC1+, ANC4+ and ANC8+.",
        read: [
          "Each bar is the share of all women with a recent pregnancy who reached that rung.",
          "Between the bars: of the women on the rung above, how many continued and how many did not.",
          "The widest drop is the step where the most women are lost.",
        ],
        terms: ["rung", "continuation"],
      },
      {
        id: "act-on",
        title: "Four things to act on",
        shows: "Four findings from the study, each with the study's own programme-review cue: retention between the fourth and eighth contact, women who never start ANC (Somali), the wealth gap after four contacts, and travel time in Afar.",
        read: [
          "The coloured edge marks the kind of finding. Click a card to open the screen that shows it.",
          "The cues are questions for programme review, not effects of an intervention.",
        ],
      },
    ],
  },
  {
    key: "map",
    label: "Map & regions",
    group: "plan",
    blurb: "Where women are lost, and one region's full analysis",
    screen: "/map?region=Somali&metric=never",
    purpose:
      "Shows every region on one measure at a time: how far women get, where they are lost, and how common the study's predictors are. Clicking a region opens its analysis beside the map.",
    plain: [
      "Every region's number is what that region's own women told the survey, weighted to stand for all its women. A region rests on a few hundred women, so two regions a point or two apart may differ only by chance; the region panel gives each number's 95% range, and ranges that overlap cannot be told apart.",
    ],
    before: ["basics-ladder", "basics-charts"],
    recipes: [
      {
        title: "Find where women never start",
        steps: [
          "In **Show**, choose **Never start ANC**. Dark regions have the largest share of women with no ANC.",
          "Click the region at the top of **Regions, ranked** to open its analysis. **What this suggests for programmes** names its largest loss.",
        ],
      },
      {
        title: "Show the country emptying out",
        steps: ["Press **Play the ladder**. The map steps from ANC1+ to ANC4+ to ANC8+ every couple of seconds. Press **Pause** to stop."],
      },
    ],
    cards: [
      {
        id: "layer",
        title: "Map layer: choosing what to show",
        shows: "The controls that choose the measure every panel on this screen shows.",
        read: [
          "**ANC1+ | ANC4+ | ANC8+**: the three rungs in one click.",
          "**Play the ladder**: steps through the three rungs automatically.",
          "**Show**: every measure, grouped. The ladder; where women are lost; and circumstances that are among the study's 21 predictors (for example \"No health insurance\").",
          "**Background map**: roads and towns under the regions. Switch it off where there is no internet.",
          "**Values on map**: the number printed on each region.",
        ],
      },
      {
        id: "map",
        title: "The map",
        shows: "Each region shaded by the chosen measure. The legend in the corner gives the range for each shade and says what darker means.",
        read: [
          "For the ladder, darker is better (more women reach the rung). For losses and circumstances, darker is worse.",
          "Click a region to open its analysis; click it again to close it.",
          "The hatched area is contested land with no survey region.",
        ],
        tryIt: [{ text: "Women with no ANC", href: "/map?metric=never" }],
        watch: "Each region rests on a few hundred women. Two regions a shade apart may not really differ: the region panel shows each value's interval.",
      },
      {
        id: "ranked",
        title: "Regions, ranked",
        shows: "The same values as the map, as bars, highest first.",
        read: [
          "The dashed tick is Ethiopia as a whole; the figure after **ETH** in the title is its value.",
          "Click a bar to open that region.",
        ],
      },
      {
        id: "heatmap",
        title: "Every region, every measure",
        shows: "A grid: regions down the side, measures across the top, each cell shaded.",
        read: [
          "**Each column is shaded on its own scale**, so compare regions down a column, not cells across a row.",
          "The switch in the title picks the set of measures: **Ladder & losses**, **Circumstances** or **Everything**.",
          "Click a cell to put that measure on the map and open that region. Click a column title to change the map only.",
          "Rows are sorted by the measure on the map.",
        ],
      },
      {
        id: "region",
        title: "A region's analysis",
        shows: "Clicking a region opens a panel beside the map (a full-screen sheet on a phone) with its ladder, where women are lost, what that suggests for programmes, who is left behind (by wealth, education and other study predictors) and its circumstances.",
        read: [
          "The coloured tag at the top names its main task. **Outreach** (red): the largest loss is women with no ANC. **Early engagement** (orange): women who started but did not reach four. **Retention** (purple): women who reached four but did not reach eight.",
          "Under the name: how many women and survey clusters the region's numbers rest on.",
          "The **ANC1+ | ANC4+ | ANC8+** switch changes the rung the sections below talk about.",
          "**Esc** or the × closes it.",
        ],
        tryIt: [{ text: "Open Somali", href: "/map?region=Somali&metric=never" }, { text: "Open Tigray", href: "/map?region=Tigray" }],
        terms: ["cluster"],
      },
      {
        id: "region-far",
        title: "How far women get, and where they are lost",
        shows: "The region's own ladder: the share reaching each rung.",
        read: [
          "The grey figures at the right are Ethiopia's values, and under them Ethiopia's 95% interval in brackets.",
          "Click a rung to switch the panel to it.",
        ],
        terms: ["ci"],
      },
      {
        id: "region-lost",
        title: "Where women are lost",
        shows: "Two bars, the region and Ethiopia, each split into four groups that add to 100%: no ANC (red), started but did not reach 4 (orange), reached 4 but not 8 (purple), reached 8 (green).",
        read: [
          "The widest red, orange or purple block is where the region loses most women.",
          "Compare with the Ethiopia bar under it.",
          "Not shown in the ANC-entry cohort, where every woman started.",
        ],
      },
      {
        id: "region-work",
        title: "What this suggests for programmes",
        shows: "The region's largest loss on the ladder as a suggestion for programmes, with the pattern and review question from the study's notebook 4 programme review.",
        read: [
          "The note names the step where the region loses the largest share of women, gives that share, and suggests what deserves review (outreach, continuation to four, or follow-up from four to eight).",
          "The notebook 4 pattern and review question come from the study's own programme review.",
          "These are suggestions for review, not findings about causes.",
        ],
        shot: false,
      },
      {
        id: "region-behind",
        title: "Who is left behind",
        shows: "The chosen rung for each group of women within the region: by wealth, education, residence, pregnancy intention, pregnancy order or health insurance.",
        read: [
          "Pick the grouping with the list. Only groupings that are among the study's 21 predictors are offered.",
          "The bar is the group's share; the dashed mark is the same group nationally.",
          "Travel time is not offered: the study's travel-time grouping was tabulated nationally, not region by region.",
          "Groups with fewer than 25 women are not shown. There are no intervals, so read small differences with care.",
        ],
      },
      {
        id: "region-stages",
        title: "Through the five stages",
        shows: "Notebook 4's regional pathway for the chosen region: any ANC, ANC4+ among users, ANC8+ among women at ANC4+, early ANC, and ANC8+ among early starters.",
        read: [
          "Each stage counts only the women who reached the stage before it, so the stages show where the region loses women.",
          "The dashed mark is Ethiopia; the number on the right is the gap to Ethiopia in percentage points (red more than 5 below, green more than 5 above).",
        ],
      },
      {
        id: "region-travel",
        title: "Travel time to the nearest hospital or health centre",
        shows: "The share of women in the region in each travel band (notebook 4, 4.25A), and for the four regions with many long trips, the share starting ANC at two hours or less against over two hours (4.25G).",
        read: ["Travel time is one of the 21 predictors; the bands are descriptive, not clinical thresholds."],
      },
      {
        id: "region-circumstances",
        title: "The region's circumstances",
        shows: "How common each circumstance is among the region's women (dot) against Ethiopia (tick). Only circumstances among the study's 21 predictors are shown.",
        read: [
          "A dot far right of the tick: much more common here than nationally.",
        ],
      },
    ],
    faq: [
      { q: "Why is a region grey?", a: "It has no value for the chosen measure in this cohort. ANC1+ and \"never start\" are blank in the ANC-entry cohort, because every woman in it started." },
      { q: "Why don't my region's numbers match the official report?", a: "Switch the cohort to 24 mo, the window the official report uses. The full cohort includes older births." },
    ],
  },
  {
    key: "data",
    label: "Your data",
    group: "plan",
    blurb: "A tool, not a study finding: trends and forecasts from ANC counts",
    screen: "/your-data",
    purpose:
      "A tool, not a study finding. Load your own monthly or quarterly ANC counts (a DHIS2 export works) and see the trend, a forecast tested on your own series, and seasonal patterns. It uses none of the study's models. Nothing leaves your computer.",
    plain: [
      "A forecast is only as good as the method's past record on your own numbers, so the studio tests before it trusts. It tries six simple forecasters: the last value, the same season last year, a moving average, a straight trend, a smoothed trend, and a trend with seasons.",
      "For each, it pretends to stand at an earlier point in your series, forecasts the next periods, and checks against what really happened. It repeats this moving forward one period at a time. The forecaster with the smallest average miss makes the forecast, and the shaded bands are built from its real misses on your series: the dark band holds 80% of them, the light band 95%.",
      "When a very simple forecaster wins, your series has little pattern beyond noise, and that is worth knowing too.",
    ],
    before: ["basics-charts"],
    recipes: [
      {
        title: "Forecast your facilities",
        steps: [
          "Click **Template** to download an example file, and fill it in (or export from DHIS2 with the same columns).",
          "Click **Load a CSV** and choose your file.",
          "Pick the **Measure** (ANC1+, ANC4+ or ANC8+), and **Coverage** if your file has expected pregnancies.",
          "Choose a facility in the unit list, or leave all units together.",
          "Pick how far ahead to forecast.",
        ],
      },
    ],
    cards: [
      {
        id: "mode",
        title: "A tool, not a study finding",
        shows: "The note at the top: this page forecasts routine counts with simple time-series methods and is not part of the study's analysis.",
        read: [
          "The green shield: files are read in this browser and never uploaded.",
        ],
        shot: false,
      },
      {
        id: "source",
        title: "Data",
        shows: "Where the numbers come from: a sample or your own file.",
        read: [
          "**Sample: survey regions**: each region's share reaching each rung by quarter of birth, from the survey. Real but noisy: 30–70 women per region and quarter.",
          "**Load a CSV**: your file. **Template**: an example with the right columns.",
          "Columns: **period** (2023-01 or 2023Q1), **org_unit** (facility or area), **expected_pregnancies** (optional), **anc1**, **anc4**, **anc8**. Other names for the same things are recognised.",
          "Any problems with the file are listed in orange under the buttons.",
        ],
      },
      {
        id: "tiles",
        title: "Latest, change, forecast, forecaster",
        shows: "Four tiles that sum up the series.",
        read: [
          "**Latest**: the last period's value.",
          "**Against a year earlier**: the change from the same period a year before (green up, red down).",
          "**Forecast**: the value at the end of the forecast, with its 80% range.",
          "**Forecaster chosen**: the method that made the smallest errors on your series.",
        ],
        terms: ["forecast"],
      },
      {
        id: "trend",
        title: "Trend and forecast",
        shows: "Your data (solid line) and the forecast (dashed) with its 80% and 95% bands.",
        read: [
          "**Measure**: ANC1+, ANC4+ or ANC8+. **Count | Coverage**: numbers of women, or the share of expected pregnancies (only if the file has them).",
          "The unit list picks one facility or area. **Horizon**: how far ahead.",
          "The dark band holds the next values 80% of the time, the light band 95%. Both are built from the forecaster's real misses on your own series.",
          "Hover for any period's values.",
        ],
        terms: ["forecast", "backtest"],
      },
      {
        id: "forecasters",
        title: "How each forecaster did on this series",
        shows: "Every forecasting method tried, ranked by its average miss when tested on your own series.",
        read: [
          "Each method was fitted on the start of the series and asked to forecast the next periods, over and over, moving forward one period at a time.",
          "The shortest bar (blue) is used for the forecast.",
          "When a simple method wins, the series has little pattern to learn.",
        ],
        terms: ["backtest"],
      },
      {
        id: "season",
        title: "By season",
        shows: "How much each calendar month runs above or below the year around it, averaged over the years in the file.",
        read: [
          "Blue bars: busier months; red: quieter.",
          "Needs at least two years of monthly data.",
        ],
        terms: ["seasonality"],
      },
    ],
  },
];
