"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import HelpText from "@/components/help/HelpText";
import { Panel, Screen, SectionRule } from "@/components/studio/ui";
import { Input } from "@/components/ui/input";
import { HELP_GROUPS, TOPICS, helpHref, searchHelp } from "@/lib/help";

/**
 * The Help's front page: search everything, start with the basics, or find the tool
 * for the question you have. Every screen's (i) and Help button lead into it.
 */

const TASKS: { q: string; a: string; href: string }[] = [
  { q: "Where are women lost in each region?", a: "Map & regions", href: "/help/map" },
  { q: "Which region has the most women with no ANC?", a: "Map & regions, never start", href: "/help/map#layer" },
  { q: "Who reaches each rung, by wealth or education?", a: "The ANC ladder", href: "/help/ladder" },
  { q: "What does an early first visit add?", a: "Cohorts & horizons", href: "/help/cohorts" },
  { q: "How well do our models predict ANC8+?", a: "Model analysis", href: "/help/analysis" },
  { q: "Which predictors do the models lean on?", a: "Model analysis, SHAP", href: "/help/analysis#learned" },
  { q: "Why is one woman's chance high or low?", a: "Predict", href: "/help/predict" },
  { q: "What will next year look like at my facilities?", a: "Your data (a tool)", href: "/help/data" },
  { q: "What does average precision, or AUROC, mean?", a: "How models are judged", href: "/help/basics-models" },
  { q: "What is the difference between percent and points?", a: "Reading the numbers", href: "/help/basics-numbers#points" },
  { q: "How do I send a colleague exactly what I see?", a: "Controls and settings", href: "/help/controls#links" },
];

export default function HelpHome() {
  const [q, setQ] = useState("");
  const hits = useMemo(() => searchHelp(q, 16), [q]);
  const start = TOPICS.filter((t) => t.group === "start");

  return (
    <Screen>
      <Panel title="How to use the studio">
        <div className="px-14 py-12 flex flex-col gap-10 max-w-[820px]">
          <p className="text-12.5 leading-relaxed">
            <HelpText text="Every tool in the studio, explained in plain language with screenshots. Start with the basics if charts and models are new to you, or search for what you want to know. Every panel's (i) also has a **Read more** link that opens its explanation here." />
          </p>
          <label className="flex items-center gap-8 max-w-[520px]">
            <Search className="size-14 text-faint flex-none" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the Help, e.g. budget, AUROC, cohort, forecast…" aria-label="Search the Help" />
          </label>
        </div>
        {q.trim().length > 1 && (
          <div className="border-t border-border">
            {hits.length ? (
              hits.map((h) => (
                <Link key={h.key} href={h.href} className="group flex items-center gap-10 px-14 py-7 border-b border-border last:border-b-0 hover:bg-panel2 hover:no-underline text-text">
                  <span className="text-9.5 uppercase tracking-label text-faint font-semibold w-44 flex-none">
                    {h.kind === "term" ? "word" : h.kind === "card" ? "panel" : "topic"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-11.5 font-medium">{h.label}</span>
                    <span className="text-10.5 text-dim ml-8 truncate">{h.context}</span>
                  </span>
                  <ArrowRight className="size-12 text-faint group-hover:text-accent flex-none" />
                </Link>
              ))
            ) : (
              <p className="px-14 py-10 text-11.5 text-dim">Nothing matches “{q}”. Try a shorter word.</p>
            )}
          </div>
        )}
      </Panel>

      <div>
        <SectionRule label="Start here" />
        <div className="grid gap-10 mt-8 sm:grid-cols-2 xl:grid-cols-4">
          {start.map((t, i) => (
            <Link key={t.key} href={helpHref(t.key)} className="group border border-border bg-panel rounded-3 px-14 py-12 hover:border-accent hover:bg-panel2 hover:no-underline text-text min-w-0">
              <div className="flex items-center gap-8">
                <span className="font-mono text-10.5 text-accent font-semibold">{i + 1}</span>
                <span className="text-12 font-semibold flex-1">{t.label}</span>
                <ArrowRight className="size-12 text-faint group-hover:text-accent" />
              </div>
              <div className="text-10.5 text-dim mt-4 leading-relaxed">{t.blurb}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-10 md:gap-14 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel title="What do you want to do?">
          {TASKS.map((t) => (
            <Link key={t.q} href={t.href} className="group flex items-center gap-10 px-14 py-7 border-b border-border last:border-b-0 hover:bg-panel2 hover:no-underline text-text">
              <span className="flex-1 min-w-0 text-11.5 leading-snug">{t.q}</span>
              <span className="text-10.5 text-accent whitespace-nowrap hidden sm:inline">{t.a}</span>
              <ArrowRight className="size-12 text-faint group-hover:text-accent flex-none" />
            </Link>
          ))}
        </Panel>

        <div className="flex flex-col gap-10 md:gap-14 min-w-0">
          {HELP_GROUPS.filter((g) => g.key !== "start").map((g) => (
            <Panel key={g.key} title={g.label}>
              {TOPICS.filter((t) => t.group === g.key).map((t) => (
                <Link key={t.key} href={helpHref(t.key)} className="group flex items-center gap-10 px-14 py-7 border-b border-border last:border-b-0 hover:bg-panel2 hover:no-underline text-text">
                  <span className="text-11.5 font-medium w-150 flex-none truncate">{t.label}</span>
                  <span className="flex-1 min-w-0 text-10.5 text-dim truncate">{t.blurb}</span>
                  <ArrowRight className="size-12 text-faint group-hover:text-accent flex-none" />
                </Link>
              ))}
            </Panel>
          ))}
        </div>
      </div>
    </Screen>
  );
}
