/**
 * External evidence behind the recommendation cues. Every entry was opened and checked
 * on 2026-11-23: the title, authors, year and the finding quoted in `shows` come from
 * the source itself (abstract or guideline text). Add a source only after reading it.
 *
 * `cite`  short reference shown as the link text
 * `shows` one line: what the source found or recommends, in plain words
 * `url`   a stable link (DOI where there is one)
 */

export interface Evidence { cite: string; shows: string; url: string }

export const EV = {
  who2016: {
    cite: "WHO, 2016. ANC recommendations for a positive pregnancy experience",
    shows: "Recommends at least eight ANC contacts, the first in the first 12 weeks; also woman-held case notes and midwife-led continuity of care.",
    url: "https://www.who.int/publications/i/item/9789241549912",
  },
  ethGuideline: {
    cite: "Ethiopia Ministry of Health, 2022. National Antenatal Care Guideline",
    shows: "Ethiopia's national standard for ANC.",
    url: "https://moh.gov.et/sites/default/files/2024-07/National%20Antenatal%20Care%20Guideline_2022.pdf",
  },
  abebaw2025: {
    cite: "Abebaw et al., 2025. Frontiers in Reproductive Health",
    shows: "Ethiopia adopted the WHO eight-contact model, but implementation remains limited.",
    url: "https://doi.org/10.3389/frph.2025.1531380",
  },
  dowswell2015: {
    cite: "Dowswell et al., 2015. Cochrane review CD000934",
    shows: "In low- and middle-income countries, fewer-visit ANC packages raised perinatal mortality (RR 1.15).",
    url: "https://pubmed.ncbi.nlm.nih.gov/26184394/",
  },
  mbuagbaw2015: {
    cite: "Mbuagbaw et al., 2015. Cochrane review CD010994",
    shows: "Health-system and community interventions such as home visits and financial incentives may raise ANC coverage; gains for four or more visits were small.",
    url: "https://doi.org/10.1002/14651858.CD010994.pub2",
  },
  lassi2015: {
    cite: "Lassi & Bhutta, 2015. Cochrane review CD007754",
    shows: "Community-based intervention packages reduced neonatal mortality (RR 0.75) and raised facility births.",
    url: "https://doi.org/10.1002/14651858.CD007754.pub3",
  },
  prost2013: {
    cite: "Prost et al., 2013. The Lancet",
    shows: "Women's groups using participatory learning and action reduced neonatal mortality (OR 0.80), more so where at least 30% of pregnant women took part.",
    url: "https://pubmed.ncbi.nlm.nih.gov/23683640/",
  },
  afework2014: {
    cite: "Afework et al., 2014. Reproductive Health (Ethiopia)",
    shows: "Health extension worker visits during pregnancy were linked to more women attending ANC four or more times (adjusted OR 1.35), in two districts.",
    url: "https://doi.org/10.1186/1742-4755-11-28",
  },
  wagnew2018: {
    cite: "Wagnew et al., 2018. Reproductive Health (meta-analysis of trials)",
    shows: "SMS reminders increased focused ANC visits (OR 2.74), with wide variation between trials.",
    url: "https://doi.org/10.1186/s12978-018-0635-z",
  },
  muluneh2020: {
    cite: "Muluneh et al., 2020. PLoS ONE (Ethiopia DHS 2016)",
    shows: "45% of women who booked ANC dropped out before completing it; the poorest and women not told about danger signs dropped out more.",
    url: "https://doi.org/10.1371/journal.pone.0234741",
  },
  tesfaye2017: {
    cite: "Tesfaye et al., 2017. Reproductive Health (Ethiopia meta-analysis)",
    shows: "64% of women started ANC late; education, residence, income, occupation, pregnancy intention, parity and knowledge of ANC were associated.",
    url: "https://doi.org/10.1186/s12978-017-0412-4",
  },
  tekelab2019: {
    cite: "Tekelab et al., 2019. PLoS ONE (Ethiopia meta-analysis)",
    shows: "ANC use was higher with urban residence (OR 1.92), women's education (OR 1.90) and planned pregnancy (OR 2.08); access and income also mattered.",
    url: "https://doi.org/10.1371/journal.pone.0214848",
  },
  tolossa2020: {
    cite: "Tolossa et al., 2020. Systematic Reviews (Ethiopia meta-analysis)",
    shows: "Unintended pregnancy doubled the odds of starting ANC late (OR 2.16).",
    url: "https://doi.org/10.1186/s13643-020-01449-9",
  },
  merga2023: {
    cite: "Merga et al., 2023. Frontiers in Health Services (Ethiopia)",
    shows: "Women covered by health insurance were more likely to use ANC (adjusted OR 1.33).",
    url: "https://doi.org/10.3389/frhs.2023.1101164",
  },
  murray2014: {
    cite: "Murray et al., 2014. BMC Pregnancy and Childbirth (systematic review)",
    shows: "Demand-side financing such as vouchers and cash transfers can increase use of maternity services.",
    url: "https://doi.org/10.1186/1471-2393-14-30",
  },
  vancalster2019: {
    cite: "Van Calster et al., 2019. BMC Medicine",
    shows: "Poorly calibrated prediction models can mislead decisions; check calibration in each new setting and update the model.",
    url: "https://doi.org/10.1186/s12916-019-1466-7",
  },
  collins2024: {
    cite: "Collins et al., 2024. BMJ (TRIPOD+AI)",
    shows: "Reporting standard for prediction models built with regression or machine learning, including their validation.",
    url: "https://doi.org/10.1136/bmj-2023-078378",
  },
} satisfies Record<string, Evidence>;

export type EvKey = keyof typeof EV;
export const ev = (...k: EvKey[]): Evidence[] => k.map((x) => EV[x]);
