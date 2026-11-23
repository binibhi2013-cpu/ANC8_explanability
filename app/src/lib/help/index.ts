import { DASH_HELP } from "./dash";
import { TERMS } from "./terms";
import { TOPIC_LIST } from "./topics";
import type { HelpCard, HelpTerm, HelpTopic } from "./types";
import { helpHref, termHref } from "./href";

export { HELP_GROUPS, TOPIC_LIST } from "./topics";
export { helpHref, termHref } from "./href";
export { TERMS };
export type { HelpCard, HelpTerm, HelpTopic };

/** Every topic, in the order of the table of contents (lib/help/topics.ts). */
const BY_KEY = new Map(DASH_HELP.map((t) => [t.key, t]));

/** The glossary is a topic of its own, built from the terms. */
const TERMS_TOPIC: HelpTopic = {
  key: "terms",
  label: "Words, A to Z",
  group: "start",
  blurb: "Every term the dashboard uses, in plain language",
  purpose:
    "Every word the dashboard uses that might be new, in plain language and in alphabetical order. Chips on the other Help pages link straight to the word they name.",
  cards: [],
};
BY_KEY.set("terms", TERMS_TOPIC);

export const TOPICS: HelpTopic[] = TOPIC_LIST.map((e) => {
  const t = BY_KEY.get(e.key);
  if (!t) throw new Error(`Help topic "${e.key}" is listed but has no text`);
  return t;
});

export function getTopic(key: string): HelpTopic | undefined {
  return BY_KEY.get(key);
}

export function getTerm(id: string): HelpTerm | undefined {
  return TERMS.find((t) => t.id === id);
}

/** The screenshot crop a card shows: its own, a borrowed one, or none. */
export function shotOf(topic: HelpTopic, card: HelpCard): string | null {
  if (card.shot === false) return null;
  return card.shot ?? `${topic.key}.${card.id}`;
}

export interface HelpHit {
  key: string;
  label: string;
  context: string;
  href: string;
  kind: "topic" | "card" | "term";
}

const strip = (s: string) => s.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

/** Search the Help: topics, cards and terms whose words contain every word typed. */
export function searchHelp(query: string, limit = 12): HelpHit[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const score = (title: string, body: string) => {
    const t = title.toLowerCase();
    const b = body.toLowerCase();
    if (!words.every((w) => t.includes(w) || b.includes(w))) return 0;
    return words.reduce((s, w) => s + (t.includes(w) ? 3 : 1), 0);
  };
  const hits: (HelpHit & { s: number })[] = [];
  for (const t of TOPICS) {
    hits.push({ key: `t-${t.key}`, label: t.label, context: t.blurb, href: helpHref(t.key), kind: "topic",
      s: score(t.label, `${t.blurb} ${t.purpose}`) + 1 });
    for (const c of t.cards) {
      hits.push({ key: `c-${t.key}-${c.id}`, label: c.title, context: t.label, href: helpHref(`${t.key}.${c.id}`), kind: "card",
        s: score(c.title, `${c.shows} ${c.read.join(" ")}`) });
    }
  }
  for (const term of TERMS) {
    hits.push({ key: `w-${term.id}`, label: term.name, context: strip(term.plain).slice(0, 80), href: termHref(term.id), kind: "term",
      s: score(`${term.name} ${(term.aka ?? []).join(" ")}`, term.plain) + 0.5 });
  }
  return hits
    .filter((h) => h.s >= 1 && (h.kind !== "topic" || h.s > 1))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ s: _s, ...h }) => h);
}

/** Every help id a panel can carry ("map.ranked"), for checks. */
export function allHelpIds(): string[] {
  return TOPICS.flatMap((t) => t.cards.map((c) => `${t.key}.${c.id}`));
}
