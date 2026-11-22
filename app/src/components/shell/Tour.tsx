"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTheme } from "./theme-provider";

/**
 * The guided tour for a demonstration: in presentation mode a small panel walks
 * through the studio, one screen per step, each opened in the state that tells its
 * story. The arrow keys step forward and back, Escape leaves. The words are short on
 * purpose: they are prompts for the presenter, not a script to read.
 */

/** The 10-minute story: problem → ladder → where → who → models → first visit →
 *  what to act on → how it was built. `focus` is the panel the step scrolls to and
 *  outlines (its data-help id). About 50 seconds a step. */
const STEPS: { path: string; focus?: string; title: string; say: string }[] = [
  { path: "/", focus: "overview.tiles", title: "1 · The problem",
    say: "78% of women had at least one ANC contact, 52% reached four, and only 19% reached the eight the WHO recommends." },
  { path: "/", focus: "overview.ladder", title: "2 · Where women are lost",
    say: "The biggest loss is not starting care but staying in it: of women who reached four contacts, 63% did not reach eight." },
  { path: "/map?metric=anc8", focus: "map.map", title: "3 · Where in Ethiopia",
    say: "ANC8+ ranges from 4% in Somali to 66% in Addis Ababa. Press Play to move the map from ANC1+ to ANC8+ and watch the country empty." },
  { path: "/map?region=Somali&metric=never", title: "4 · One region",
    say: "Somali: most women never start ANC. Each region panel shows its five stages against Ethiopia, its travel times and the study's review question." },
  { path: "/explore/ladder", focus: "ladder.equity", title: "5 · Who is left behind",
    say: "After four contacts, 20% of the poorest reach eight against 52% of the richest. Switch to travel time: the same gradient." },
  { path: "/explore/ladder", focus: "ladder.region-travel", title: "6 · Distance",
    say: "In Afar, 79% of women within two hours of care start ANC, against 39% of those further away." },
  { path: "/models", focus: "analysis.vs-chance", title: "7 · Our models",
    say: "Three models on 21 predictors, tested on 1,375 held-out women: average precision 0.40 to 0.44 against 0.16 by chance. All three overpredict." },
  { path: "/models", focus: "analysis.learned", title: "8 · What the models lean on",
    say: "Wealth, travel time and region lead. They are markers of circumstances, not causes." },
  { path: "/explore/cohorts", focus: "cohorts.timing", title: "9 · The first visit",
    say: "42% of early starters reached ANC8+ against 11% of later starters, yet 58% of early starters still did not. Adding early ANC to the models raised AP by 0.022 to 0.034, with intervals that include zero." },
  { path: "/", focus: "overview.key-finding", title: "10 · Key finding",
    say: "The models predict 34% against 13% with an early first visit: a model contrast, not an intervention effect." },
  { path: "/", focus: "overview.act-on", title: "11 · Four things to act on",
    say: "Retention after four contacts, women who never start, the wealth gap and distance: questions for programme review, from notebook 4." },
  { path: "/built", title: "12 · How it was built",
    say: "Survey file → four notebooks → exported models checked against the published results → this dashboard. Next: external validation and recalibration." },
];

export default function Tour() {
  const { present, togglePresent } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [i, setI] = useState(0);

  const go = useCallback(
    (k: number) => {
      const n = Math.max(0, Math.min(STEPS.length - 1, k));
      setI(n);
      router.push(STEPS[n].path, { scroll: true });
      const focus = STEPS[n].focus;
      if (focus) {
        // wait for the screen to render its panel, then bring it into view and outline it
        let tries = 0;
        const t = setInterval(() => {
          const el = document.querySelector<HTMLElement>(`[data-help="${focus}"]`);
          if (el || ++tries > 30) {
            clearInterval(t);
            if (!el) return;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.setAttribute("data-tour-focus", "on");
            setTimeout(() => el.removeAttribute("data-tour-focus"), 2600);
          }
        }, 120);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(i + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(i - 1); }
      else if (e.key === "Escape") togglePresent();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, i, go, togglePresent]);

  if (!present) return null;
  const s = STEPS[i];
  const here = pathname === s.path.split("?")[0];
  return (
    <div role="dialog" aria-label="Guided tour"
      className="fixed right-14 bottom-36 z-[1200] w-[min(360px,calc(100vw-28px))] bg-panel border border-accent rounded-3">
      <div className="flex items-center gap-8 px-12 py-7 border-b border-border">
        <span className="text-9.5 font-semibold uppercase tracking-label text-accent flex-1">
          Presentation · {i + 1} of {STEPS.length}
        </span>
        <button type="button" onClick={togglePresent} className="text-faint hover:text-text" aria-label="Leave the tour" title="Leave (Esc)">
          <X className="size-13" />
        </button>
      </div>
      <div className="px-12 py-10">
        <div className="text-13 font-semibold">{s.title}</div>
        <div className="text-11 text-dim leading-relaxed mt-4">{s.say}</div>
        {!here && (
          <button type="button" onClick={() => go(i)} className="text-10.5 text-accent hover:underline mt-6">Open this screen</button>
        )}
      </div>
      <div className="flex items-center gap-8 px-12 py-8 border-t border-border">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0}
          className="h-24 px-8 rounded-2 border border-border2 bg-panel2 text-10.5 flex items-center gap-3 disabled:opacity-40">
          <ChevronLeft className="size-12" /> Back
        </button>
        <div className="flex-1 flex justify-center gap-3">
          {STEPS.map((_, k) => (
            <button key={k} type="button" onClick={() => go(k)} aria-label={`Step ${k + 1}`}
              className={`size-6 rounded-full ${k === i ? "bg-accent" : "bg-border2"}`} />
          ))}
        </div>
        <button type="button" onClick={() => go(i + 1)} disabled={i === STEPS.length - 1}
          className="h-24 px-8 rounded-2 border border-accent bg-accent text-white text-10.5 flex items-center gap-3 disabled:opacity-40">
          Next <ChevronRight className="size-12" />
        </button>
      </div>
    </div>
  );
}
