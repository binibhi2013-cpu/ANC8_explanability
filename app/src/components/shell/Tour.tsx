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
  { path: "/", focus: "dash.tiles", title: "1 · The problem",
    say: "78% of women had at least one ANC contact, 52% reached four, and only 19% reached the eight the national guideline recommends." },
  { path: "/", focus: "dash.ladder", title: "2 · Where women are lost",
    say: "The biggest loss is staying in care: of women who reached four contacts, 63% did not reach eight. Click Cue for retention ideas." },
  { path: "/", focus: "dash.map", title: "3 · Where in Ethiopia",
    say: "ANC8+ ranges from 4% in Somali to 66% in Addis Ababa. Click a region and every tab follows." },
  { path: "/?region=Somali", focus: "dash.ladder", title: "4 · One region",
    say: "Somali: two in three women never start ANC, so the cue turns to outreach and community mobilisation." },
  { path: "/?tab=left-behind", focus: "dash.stacked", title: "5 · Who is left behind",
    say: "Each bar is all the women in a group. 5% of the poorest reach eight against 43% of the richest; most of the gap opens at first contact. Group by switches the predictor." },
  { path: "/?tab=regions", focus: "dash.stages", title: "6 · Each region's weak stage",
    say: "Regions lose women at different stages: some never start, others stop after four. One national fix will not fit all." },
  { path: "/?tab=early", focus: "dash.early-observed", title: "7 · The first visit",
    say: "42% of early starters reached ANC8+ against 11% of later starters, yet 58% of early starters still did not." },
  { path: "/?tab=models", focus: "dash.performance", title: "8 · Our three models",
    say: "Tested on 1,375 held-out women: average precision 0.40 to 0.44 against 0.16 by chance. Wealth, travel time and region lead the predictors." },
  { path: "/?tab=what-if", focus: "dash.whatif", title: "9 · What if",
    say: "Change one predictor for every woman: all richest instead of poorest moves XGBoost from 9% to 25%; an early first visit adds 21 points. Model contrasts, not programme effects." },
  { path: "/?tab=review", focus: "dash.review", title: "10 · Programme review",
    say: "The study's four core signals, each with what was observed, what the models show, the review cue and its caution." },
  { path: "/your-data", title: "11 · A tool for facilities",
    say: "A facility uploads its list of women attending ANC; the ANC-entry models rank them so staff can follow up those least likely to reach eight." },
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
