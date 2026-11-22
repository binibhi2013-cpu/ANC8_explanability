"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/studio/ui";
import { useJSON } from "@/lib/data";
import { REGIONS } from "@/lib/regions";
import { REACH_OF, cohortRungs, type RegionsData } from "@/lib/regionsData";
import { COHORTS, RUNGS, useStudio, type Cohort, type Rung } from "@/lib/studio";

/**
 * The scope switcher: the whole country or one region, the rung and the cohort. It opens from
 * the sidebar's scope block, the scope chip in the content header and the status bar,
 * so the scope can be changed from any screen, on a phone as on a desktop.
 */
const ScopeContext = createContext<() => void>(() => {});
export const useOpenScope = () => useContext(ScopeContext);

// Screens that follow the region; the rest describe the whole country.
const FOLLOWS_REGION = ["/map", "/explore/ladder", "/explore/cohorts"];

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <ScopeContext.Provider value={() => setOpen(true)}>
      {children}
      <Dialog open={open} onClose={() => setOpen(false)} aria-label="Choose the scope" className="max-w-420">
        {open && <ScopeBody onDone={() => setOpen(false)} />}
      </Dialog>
    </ScopeContext.Provider>
  );
}

const pct = (v: number | undefined) => (v == null || !Number.isFinite(v) ? "–" : `${Math.round(v * 100)}%`);

function ScopeBody({ onDone }: { onDone: () => void }) {
  const studio = useStudio();
  const pathname = usePathname();
  const data = useJSON<RegionsData>("/data/regions.json").data;
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const rung = cohortRungs(studio.cohort).includes(studio.rung) ? studio.rung : "anc8";
  const rungLabel = RUNGS.find((r) => r.key === rung)!.label;
  const block = data?.cohorts[studio.cohort];

  const rows = useMemo(() => {
    const all = [
      { key: "", name: "Ethiopia", sub: "all 14 regions", c: block?.national },
      ...REGIONS.map((r) => ({ key: r.name, name: r.name, sub: "", c: block?.regions[r.name] })),
    ];
    const s = q.trim().toLowerCase();
    return s ? all.filter((r) => r.name.toLowerCase().includes(s)) : all;
  }, [block, q]);

  const current = rows.findIndex((r) => r.key === studio.region);
  const [hi, setHi] = useState(Math.max(0, current));
  useEffect(() => setHi(Math.max(0, rows.findIndex((r) => r.key === studio.region))), [rows, studio.region]);
  useEffect(() => {
    // on a touch screen the keyboard would cover the list
    if (window.matchMedia("(pointer: fine)").matches) input.current?.focus();
  }, []);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-row="${hi}"]`)?.scrollIntoView({ block: "nearest" });
  }, [hi]);

  const pick = (region: string) => {
    studio.set({ region });
    onDone();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(rows.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter" && rows[hi]) { e.preventDefault(); pick(rows[hi].key); }
  };

  const follows = FOLLOWS_REGION.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const max = Math.max(0.01, ...rows.map((r) => r.c?.[REACH_OF[rung]] ?? 0));

  return (
    <div className="flex flex-col gap-10 min-w-0" onKeyDown={onKey}>
      <div className="flex flex-wrap items-center gap-8">
        <div className="text-9.5 uppercase tracking-label text-faint font-semibold flex-1">Scope</div>
        <Segmented
          label="Rung"
          options={RUNGS.filter((r) => cohortRungs(studio.cohort).includes(r.key)).map((r) => ({ key: r.key, label: r.label }))}
          value={rung}
          onChange={(k: Rung) => studio.set({ rung: k })}
        />
        <Segmented
          label="Cohort"
          options={COHORTS.map((c) => ({ key: c.key, label: c.short, title: c.blurb }))}
          value={studio.cohort}
          onChange={(k: Cohort) => studio.set({ cohort: k })}
        />
      </div>

      <label className="flex items-center gap-6 h-30 px-8 border border-border2 rounded-2 bg-panel2">
        <Search className="size-12 text-faint flex-none" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a region…"
          aria-label="Find a region"
          className="flex-1 min-w-0 bg-transparent outline-none text-11.5 text-text"
        />
      </label>

      <div className="flex items-center text-9.5 uppercase tracking-label text-faint font-semibold px-8">
        <span className="flex-1">Region</span>
        <span>Reach {rungLabel}</span>
      </div>

      <div ref={list} role="listbox" aria-label="Regions" className="overflow-y-auto -mx-2 border-t border-border" style={{ maxHeight: "min(52vh, 440px)" }}>
        {rows.map((r, i) => {
          const on = r.key === studio.region;
          const v = r.c?.[REACH_OF[rung]];
          return (
            <button
              key={r.key || "national"}
              data-row={i}
              role="option"
              aria-selected={on}
              onClick={() => pick(r.key)}
              onMouseMove={() => setHi(i)}
              className={`w-full flex items-center gap-8 px-8 py-6 border-b border-border text-left ${
                i === hi ? "bg-panel3" : ""
              } ${on ? "text-text" : "text-dim"}`}
            >
              <span className="w-12 flex-none">{on && <Check className="size-12 text-accent" />}</span>
              <span className="flex-1 min-w-0">
                <span className={`block text-11.5 truncate ${on ? "font-semibold" : ""} ${r.key ? "" : "text-text font-semibold"}`}>{r.name}</span>
                <span className="block text-9.5 text-faint font-mono">
                  {r.sub ? `${r.sub} · ` : ""}{r.c ? `${r.c.n.toLocaleString("en-US")} women` : ""}
                </span>
              </span>
              <span className="w-60 h-6 bg-panel2 rounded-1 overflow-hidden flex-none" aria-hidden="true">
                <span className="block h-full bg-accent" style={{ width: `${((v ?? 0) / max) * 100}%` }} />
              </span>
              <span className="w-36 text-right font-mono text-11 flex-none">{pct(v)}</span>
            </button>
          );
        })}
        {!rows.length && <div className="px-8 py-10 text-11 text-faint">No region matches.</div>}
      </div>

      <div className="text-10 text-faint leading-normal">
        {follows
          ? "Every panel on this screen follows the scope."
          : "This screen describes the whole country; the scope applies on the map, the ladder and cohorts. The model screens are ANC8+ only."}
      </div>
    </div>
  );
}
