/**
 * The project's own details, in one place: edit this file to change the names, links
 * and logo shown on the title screen, the footer and the "How it was built" page.
 *
 * The team names are from the team's own progress-update deck. siteUrl is a placeholder
 * until the website's name is chosen.
 * MOH_LOGO is the official Ministry of Health logo supplied by the team (public/brand/,
 * trimmed of its empty margin; the original file is kept beside it). Set it to null to
 * hide the logo everywhere.
 */

export const PROJECT = {
  title: "Predicting attainment of eight antenatal care contacts in Ethiopia",
  question:
    "Can survey-based prediction identify which women are unlikely to reach the eight antenatal care contacts the WHO recommends, and does an early first visit add to that prediction?",
  short: "ANC8+ Ethiopia",
  programme: "Data Science Capstone · ANC8+ prediction",
  team: ["Biniam Kefiyalew Taye, PhD", "Solomon Kasahun", "Hagere Mekonen", "Roman Gebreyes"],
  date: "November 2026",
  data: "Ethiopia Demographic and Health Survey 2024–25 (women's file), survey-weighted",
  citation:
    "[Authors]. Predicting attainment of eight antenatal care contacts and the added value of early initiation in Ethiopia. Manuscript submitted, 2026.",
  github: "https://github.com/binibhi2013-cpu/ANC8_explanability",
  siteUrl: "[link to be confirmed]",
} as const;

/** Path of the official Ministry of Health logo under public/, or null until provided. */
export const MOH_LOGO: string | null = "/brand/moh-logo.png";
/** The Ministry's blue, taken from the logo; used only as an accent beside the logo. */
export const MOH_BLUE = "#0374b8";
export const MOH_NAME = "Ministry of Health, Ethiopia";
