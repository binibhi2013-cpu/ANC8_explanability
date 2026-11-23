"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { Select } from "@/components/ui/select";
import { MOH_LOGO, MOH_NAME, PROJECT } from "@/lib/project";
import { helpHref } from "@/lib/help/href";

/**
 * The studio's screen vocabulary, taken from the house design
 * (lab_resource_v2/components/ui.tsx, states/ and the dashboard stat tiles).
 *
 * Flush panels divided by 1px rules: no floating cards, no shadows. IBM Plex Mono for
 * every quantity, Plex Sans for language. The one addition is `how` on a Panel: the
 * "how to read this" sentence lives behind an info icon, so a chart can speak for
 * itself and the explanation is one hover away rather than a paragraph on screen.
 */

export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`p-10 md:p-14 flex flex-col gap-10 md:gap-14 ${className}`}>
      {children}
      <SiteFooter />
    </div>
  );
}

/** The footer under every screen: data source, citation, code and team. */
export function SiteFooter() {
  return (
    <footer className="mt-6 pt-10 border-t border-border flex flex-wrap items-center gap-x-14 gap-y-6 text-9.5 text-faint leading-relaxed">
      {MOH_LOGO && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={MOH_LOGO} alt={MOH_NAME} className="h-22 w-auto" />
      )}
      <span><span className="font-semibold text-dim">Data:</span> {PROJECT.data}.</span>
      <span><span className="font-semibold text-dim">Team:</span> {PROJECT.team.join(", ")}.</span>
      <span><span className="font-semibold text-dim">Supervisor:</span> {PROJECT.supervisor}.</span>
      <a href={PROJECT.github} target="_blank" rel="noreferrer" className="text-accent hover:underline">Code on GitHub</a>
      <Link href="/built" className="text-accent hover:underline">How it was built</Link>
      <span className="basis-full"><span className="font-semibold text-dim">Cite as:</span> {PROJECT.citation}</span>
    </footer>
  );
}

/** The (i) hint. With `more`, the tooltip ends in a link to the Help's longer
 *  explanation; hovering stays open while the pointer moves onto the tooltip. */
export function Hint({ children, label = "How to read this", more }: { children: ReactNode; label?: string; more?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 180);
  };
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(e) => !ref.current?.contains(e.relatedTarget as Node) && hide()}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-faint hover:text-accent"
      >
        <Info className="size-12" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute right-0 top-14 pt-4 z-[1100] w-[min(300px,80vw)] normal-case tracking-normal font-normal"
        >
          <span className="block bg-panel border border-border2 rounded-3 px-10 py-8 text-11 leading-relaxed text-text">
            {children}
            {more && (
              <Link
                href={more}
                onClick={() => setOpen(false)}
                className="mt-6 flex items-center gap-4 text-10.5 font-medium text-accent hover:underline"
              >
                Read more in Help <ArrowRight className="size-11" />
              </Link>
            )}
          </span>
        </span>
      )}
    </span>
  );
}

export function Panel({
  title,
  actions,
  how,
  help,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  /** One or two sentences: how to read this panel. Shown on hover of the info icon. */
  how?: ReactNode;
  /** The panel's card in the Help ("map.ranked"): the hint links to it, and the
   *  screenshot script finds the panel by it. */
  help?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section data-help={help} className={`bg-panel border border-border rounded-3 min-w-0 ${className}`}>
      {(title || actions || how) && (
        <div className="flex items-center gap-8 px-14 py-8 border-b border-border min-h-36 flex-wrap">
          {title && (
            <div className="text-11 uppercase tracking-widest text-dim font-semibold flex-1 min-w-0 truncate">
              {title}
            </div>
          )}
          {actions}
          {how && <Hint more={help ? helpHref(help) : undefined}>{how}</Hint>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** A small segmented control, as in the house dashboard's breakdown switch. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
  size = "sm",
}: {
  options: { key: K; label: ReactNode; title?: string; disabled?: boolean }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap overflow-hidden rounded-2 border border-border2 flex-none">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            disabled={o.disabled}
            onClick={() => onChange(o.key)}
            className={`${size === "sm" ? "h-22 px-8 text-9.5" : "h-24 px-10 text-10.5"} border-r border-border2 font-medium last:border-r-0 whitespace-nowrap ${
              on ? "bg-accent text-white" : o.disabled ? "bg-panel2 text-faint opacity-50 cursor-not-allowed" : "bg-panel2 text-dim hover:text-text"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A segmented control on wide screens and a native select on a phone, for option
 *  lists too long to sit in one row at 375px. */
export function Picker<K extends string>(props: {
  options: { key: K; label: ReactNode; title?: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <>
      <div className="hidden md:block">
        <Segmented {...props} />
      </div>
      <Select
        aria-label={props.label}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as K)}
        className="md:hidden w-auto min-w-[150px] h-22 text-10.5"
      >
        {props.options.map((o) => (
          <option key={o.key} value={o.key}>
            {typeof o.label === "string" ? o.label : o.key}
          </option>
        ))}
      </Select>
    </>
  );
}

/** A labelled range slider in the house scale: the value in mono at the right. */
export function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => String(v),
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline gap-8">
        <span className="text-10.5 font-medium flex-1">{label}</span>
        <span className="font-mono text-11 font-semibold">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-16 mt-2 accent-[var(--accent)] cursor-pointer"
      />
      {hint && <span className="block text-9.5 text-faint leading-snug">{hint}</span>}
    </label>
  );
}

const TONE_TEXT = { good: "text-good", warn: "text-warn", bad: "text-bad", accent: "text-accent" } as const;

/** The house stat tile. Clickable tiles drill into the shared state. */
export function StatTile({
  label,
  value,
  sub,
  tone,
  active,
  onClick,
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: keyof typeof TONE_TEXT;
  active?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const content = (
    <>
      <div className="text-9.5 font-semibold uppercase tracking-label text-faint">{label}</div>
      <div className={`mt-4 font-mono text-21 font-semibold ${tone ? TONE_TEXT[tone] : ""}`}>{value}</div>
      {sub && <div className="mt-3 text-10 text-dim leading-snug">{sub}</div>}
      {children}
    </>
  );
  const className = `rounded-3 border bg-panel px-14 py-12 text-left min-w-0 ${
    active ? "border-accent bg-soft" : "border-border"
  } ${onClick ? "transition-colors hover:border-accent hover:bg-panel2" : ""}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={className} aria-pressed={active}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

/** A status/attribute token. Always mono: it is a value, not prose. */
export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "accent" | "cross";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-panel3 text-dim border-border2",
    good: "bg-goodbg text-good border-good",
    warn: "bg-warnbg text-warn border-warn",
    bad: "bg-badbg text-bad border-bad",
    accent: "bg-soft text-accent border-accent",
    cross: "bg-crossbg text-cross border-cross",
  };
  return (
    <span className={`inline-block border rounded-2 px-6 py-1 text-9.5 font-mono whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Right-align and use mono: for counts, rates and identifiers. */
  mono?: boolean;
  width?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isActive,
  minWidth = 560,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  isActive?: (row: T) => boolean;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.header}
                style={{ width: c.width }}
                className={`text-9.5 uppercase tracking-label text-faint font-semibold px-12 py-7 ${
                  c.mono ? "text-right" : "text-left"
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-border last:border-b-0 ${onRowClick ? "cursor-pointer hover:bg-panel2" : ""} ${
                isActive?.(row) ? "bg-sel" : ""
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.header}
                  className={`px-12 py-6 text-11.5 align-middle ${c.mono ? "text-right font-mono text-11" : ""}`}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Panel loading: keeps the frame and greys the rows. Never a full-page spinner. */
export function PanelLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-10 px-14 py-8 border-b border-border last:border-b-0">
          <div className="h-10 bg-panel3 rounded-2 flex-1" style={{ opacity: 1 - i * 0.12 }} />
          <div className="h-10 w-64 bg-panel3 rounded-2" style={{ opacity: 1 - i * 0.12 }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, body, action }: {
  title: string;
  body?: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="px-14 py-16 max-w-[560px]">
      <div className="text-13 font-semibold">{title}</div>
      {body && <div className="text-11.5 text-dim leading-loose mt-3">{body}</div>}
      {action && (
        <button
          onClick={action.onClick}
          className="border border-accent bg-accent text-white h-25 px-11 rounded-3 text-11.5 font-medium mt-10"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="px-14 py-12">
      <div className="flex gap-10">
        <div className="w-3 bg-bad rounded-2 flex-none" />
        <div className="min-w-0">
          <div className="text-12 font-semibold text-bad">Could not load this panel</div>
          <div className="text-11 text-dim leading-loose mt-2">{message}</div>
          {onRetry && (
            <button onClick={onRetry} className="border border-border2 bg-panel h-23 px-9 rounded-3 text-11 text-dim mt-8">
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A caveat that belongs next to a number: coloured bar, short sentence. */
export function Note({ children, tone = "warn" }: { children: ReactNode; tone?: "warn" | "accent" | "bad" | "good" }) {
  const bar = { warn: "bg-warn", accent: "bg-accent", bad: "bg-bad", good: "bg-good" }[tone];
  return (
    <div className="flex gap-10 text-11 text-dim leading-relaxed">
      <div className={`w-3 rounded-2 flex-none ${bar}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A small italic aside: what more data would let this panel do. Not text to read,
 *  a margin note for the reader who wonders how it could be better. */
export function DataNote({ children, className = "px-14 pb-10" }: { children: ReactNode; className?: string }) {
  return <p className={`text-9.5 italic text-faint leading-snug ${className}`}>{children}</p>;
}

export function SectionRule({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="pt-4 pb-2 flex items-center gap-10">
      <div className="text-11 font-semibold uppercase tracking-widest text-dim whitespace-nowrap">{label}</div>
      <div className="flex-1 border-t border-border" />
      {children}
    </div>
  );
}

/** The house placeholder for a screen that a later milestone builds. */
export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <div className="p-14 md:p-24">
      <div className="border border-border rounded-3 bg-panel2 px-16 py-20 max-w-[560px]">
        <div className="text-13 font-semibold">{title}</div>
        <div className="text-11.5 text-dim mt-6 leading-relaxed">
          {note ?? "This screen is being built in a later milestone of the studio."}
        </div>
      </div>
    </div>
  );
}

/**
 * A decision cue: what a card's number suggests for programmes. Always worded as a
 * suggestion tied to the number on the card, never as a cause (see lib/cues.ts).
 */
export function Cue({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-8 text-10.5 leading-relaxed text-dim bg-panel2 border border-border rounded-2 px-10 py-7 ${className}`}>
      <span className="text-9 uppercase tracking-label font-semibold text-good flex-none pt-1">For programmes</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
