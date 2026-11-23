"use client";

import type { ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";

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

export function Card({ title, sub, info, actions, children, className = "", help }: {
  title: ReactNode; sub?: ReactNode; info?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; help?: string;
}) {
  return (
    <div data-help={help} className={`bg-panel border border-border rounded-[6px] min-w-0 flex flex-col ${className}`}>
      <div className="flex items-start gap-10 px-16 pt-14 pb-10 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <h3 className="text-15 font-semibold text-text leading-snug">{title}</h3>
          {sub && <div className="text-13 text-dim mt-2">{sub}</div>}
        </div>
        {actions}
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
      <div className="px-16 pb-16 flex-1 flex flex-col gap-12">{children}</div>
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
