"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Info, Lightbulb, X, type LucideIcon } from "lucide-react";
import type { Cue } from "@/lib/recs";

/**
 * The dashboard's small kit: a section with its headline, a card, an insight line and
 * a segmented control. Type is sized for a projector: 13px labels, 15px card titles,
 * 30px headline numbers.
 */

export function Section({ id, n, title, lead, children }: {
  id: string; n: number; title: string; lead?: ReactNode; children: ReactNode;
}) {
  return (
    <section id={id} data-help={`dash.${id}`} className="scroll-mt-[72px] flex flex-col gap-14">
      <div className="flex items-baseline gap-10 pt-8">
        <span className="font-mono text-13 text-accent font-semibold">{n}</span>
        <h2 className="text-21 font-semibold text-text">{title}</h2>
      </div>
      {lead && <p className="text-15 text-dim -mt-6 max-w-[900px] leading-relaxed">{lead}</p>}
      {children}
    </section>
  );
}

export function Card({ title, sub, info, actions, children, className = "", help, cue, body = "" }: {
  title: ReactNode; sub?: ReactNode; info?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; help?: string;
  cue?: Cue | null; body?: string;
}) {
  return (
    <div data-help={help} className={`bg-panel border border-border rounded-[6px] min-w-0 flex flex-col ${className}`}>
      <div className="flex items-start gap-10 px-16 pt-12 pb-8 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <h3 className="text-15 font-semibold text-text leading-snug">{title}</h3>
          {sub && <div className="text-13 text-dim mt-2">{sub}</div>}
        </div>
        {actions}
        {cue && <CueButton cue={cue} />}
        {info && (
          <span className="relative group flex-none">
            <button type="button" aria-label="About this card" className="text-faint hover:text-accent mt-2">
              <Info className="size-16" />
            </button>
            <span role="tooltip"
              className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity absolute right-0 top-22 z-[1100] w-[300px] bg-panel border border-border2 rounded-[6px] p-12 text-12.5 text-dim leading-relaxed shadow-lg">
              {info}
            </span>
          </span>
        )}
      </div>
      <div className={`px-16 pb-14 flex-1 min-h-0 flex flex-col gap-10 ${body}`}>{children}</div>
    </div>
  );
}

/** One plain sentence that says what the numbers show, with an icon. */
export function Insight({ icon: Icon, children, tone = "accent" }: { icon: LucideIcon; children: ReactNode; tone?: "accent" | "bad" | "good" | "warn" }) {
  const c = { accent: "text-accent bg-soft", bad: "text-bad bg-badbg", good: "text-good bg-goodbg", warn: "text-warn bg-warnbg" }[tone];
  return (
    <div className="flex items-start gap-10">
      <span className={`flex-none size-28 rounded-full flex items-center justify-center ${c}`}>
        <Icon className="size-15" />
      </span>
      <p className="text-14 text-text leading-snug pt-4">{children}</p>
    </div>
  );
}

export function Seg<K extends string>({ options, value, onChange, label, size = "md" }: {
  options: { key: K; label: ReactNode; disabled?: boolean }[]; value: K; onChange: (k: K) => void; label: string; size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex bg-panel3 rounded-[6px] p-3 gap-2 flex-wrap">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key} type="button" role="radio" aria-checked={on} disabled={o.disabled}
            onClick={() => onChange(o.key)}
            className={`rounded-[4px] ${size === "sm" ? "px-10 py-4 text-12.5" : "px-12 py-6 text-13"} font-medium whitespace-nowrap transition-colors disabled:opacity-40 ${
              on ? "bg-accent text-white shadow-sm" : "text-dim hover:text-text hover:bg-panel"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A labelled horizontal bar with its value, optional CI whisker and reference mark. */
export function Bar({ label, sub, value, ci, max = 1, color = "var(--accent)", reference, display, highlight, labelWidth = 170 }: {
  label: ReactNode; sub?: ReactNode; value: number; ci?: [number, number]; max?: number; color?: string;
  reference?: number; display: string; highlight?: boolean; labelWidth?: number;
}) {
  const w = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div className={`grid items-center gap-10 py-4 ${highlight ? "bg-soft -mx-6 px-6 rounded-[4px]" : ""}`}
      style={{ gridTemplateColumns: `minmax(100px, ${labelWidth}px) 1fr 56px` }}>
      <div className="min-w-0">
        <div className="text-13 text-text truncate">{label}</div>
        {sub && <div className="text-11 text-faint">{sub}</div>}
      </div>
      <div className="relative h-20 bg-panel3 rounded-[3px]">
        <div className="absolute inset-y-0 left-0 rounded-[3px] transition-all duration-500" style={{ width: w(value), background: color }} />
        {ci && (
          <div className="absolute top-1/2 h-px bg-text opacity-60" style={{ left: w(ci[0]), width: `calc(${w(ci[1])} - ${w(ci[0])})` }} />
        )}
        {reference != null && (
          <div className="absolute -top-3 -bottom-3 w-0 border-l-2 border-dashed border-text opacity-50" style={{ left: w(reference) }} title="Ethiopia" />
        )}
      </div>
      <div className="font-mono text-14 font-semibold text-right">{display}</div>
    </div>
  );
}

/**
 * The recommendation cue behind a 💡 button: what a programme could consider, the number
 * it rests on, and the study's own notebook 4 wording where there is some. Click to open,
 * click again, outside, or press Escape to close.
 */
export function CueButton({ cue }: { cue: Cue }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <span ref={box} className="relative flex-none" data-cue>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Recommendation for this finding"
        title="What could a programme do?"
        className={`flex items-center gap-4 h-24 px-7 rounded-full text-12 font-semibold transition-colors ${open ? "bg-warn text-white" : "bg-warnbg text-warn hover:bg-warn hover:text-white"}`}>
        <Lightbulb className="size-14" /> Cue
      </button>
      {open && (
        <span role="dialog" aria-label="Recommendation cue"
          className="absolute right-0 top-30 z-[1100] w-[340px] max-w-[85vw] bg-panel border border-border2 rounded-[8px] shadow-xl p-14 flex flex-col gap-8 text-left">
          <span className="flex items-center gap-6 text-12 font-semibold uppercase tracking-wide text-warn">
            <Lightbulb className="size-14" /> Suggested action
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="ml-auto text-faint hover:text-text"><X className="size-14" /></button>
          </span>
          <span className="text-14 text-text leading-snug">{cue.action}</span>
          <span className="text-12.5 text-dim leading-snug"><b className="text-text font-semibold">Based on: </b>{cue.basis}</span>
          {cue.study && (
            <span className="text-12.5 text-dim leading-snug border-l-2 border-accent pl-8"><b className="text-text font-semibold">Study finding: </b>“{cue.study}”</span>
          )}
          <span className="text-11.5 text-faint">A suggestion from the findings, not a tested effect.</span>
        </span>
      )}
    </span>
  );
}

/** A tab's heading: title and one line of context, kept short so the tab fits the screen. */
export function TabHead({ title, lead, children }: { title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-end gap-x-16 gap-y-6 flex-wrap flex-none">
      <div className="min-w-0 flex-1">
        <h2 className="text-19 font-semibold text-text leading-tight">{title}</h2>
        {lead && <p className="text-13 text-dim mt-2 leading-snug max-w-[1000px]">{lead}</p>}
      </div>
      {children}
    </div>
  );
}

/** The pixel height of an element, kept current, so a chart can fill the space it is given. */
export function useBoxHeight<T extends HTMLElement>(fallback = 400) {
  const ref = useRef<T>(null);
  const [h, setH] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setH(Math.max(240, Math.floor(e.contentRect.height))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, h] as const;
}
