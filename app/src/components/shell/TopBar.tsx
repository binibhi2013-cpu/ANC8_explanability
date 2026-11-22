"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, Map as MapIcon, Menu, Monitor, Moon, Search, Sun } from "lucide-react";
import type { HelpHit } from "@/lib/help";
import { MODES, NAV, allNavItems, modeForPath } from "@/lib/nav";
import { REGIONS } from "@/lib/regions";
import { useStudio } from "@/lib/studio";
import { useTheme } from "./theme-provider";
import { MOH_LOGO, MOH_NAME } from "@/lib/project";

type Hit = { key: string; label: string; hint: string; go: () => void };

export default function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const studio = useStudio();
  const { toggle, present, togglePresent } = useTheme();
  const active = modeForPath(pathname);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  // The Help's text is loaded the first time the finder is used, not on every screen.
  const [helpSearch, setHelpSearch] = useState<((q: string, n?: number) => HelpHit[]) | null>(null);
  const loadHelp = () => {
    if (!helpSearch) import("@/lib/help").then((m) => setHelpSearch(() => m.searchHelp)).catch(() => {});
  };

  // Ctrl/Cmd+K focuses the finder, as the box advertises.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setOpen(true);
        loadHelp();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const regions: Hit[] = REGIONS.filter((r) => r.name.toLowerCase().includes(q)).map((r) => ({
      key: `region-${r.name}`,
      label: r.name,
      hint: "region",
      go: () => router.push(studio.href(`/map?region=${encodeURIComponent(r.name)}`)),
    }));
    const pages: Hit[] = allNavItems()
      .filter((i) => i.label.toLowerCase().includes(q) || i.meta[1].toLowerCase().includes(q))
      .map((i) => ({ key: i.key, label: i.label, hint: i.meta[0], go: () => router.push(studio.href(i.path)) }));
    const help: Hit[] = (helpSearch?.(q, 4) ?? []).map((h) => ({
      key: `help-${h.key}`,
      label: h.kind === "card" ? `${h.label} · ${h.context}` : h.label,
      hint: h.kind === "term" ? "word" : h.kind === "topic" ? "guide" : "help",
      go: () => router.push(h.href),
    }));
    return [...regions, ...pages.slice(0, Math.max(0, 9 - help.length - regions.length)), ...help].slice(0, 10);
  }, [query, router, studio, helpSearch]);

  function choose(h: Hit | undefined) {
    if (!h) return;
    h.go();
    setQuery("");
    setOpen(false);
    searchRef.current?.blur();
  }

  return (
    <div className="bg-top text-topfg flex items-center gap-8 md:gap-12 px-8 md:px-10 flex-none min-w-0">
      <button
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="md:hidden border border-topline2 bg-topfill2 text-current w-30 h-26 rounded-3 flex items-center justify-center flex-none"
      >
        <Menu className="size-14" />
      </button>

      <div className="flex items-center gap-8 min-w-0 shrink overflow-hidden">
        {MOH_LOGO && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={MOH_LOGO} alt={MOH_NAME} title={MOH_NAME} className="h-24 w-auto bg-white rounded-2 p-1 flex-none" />
        )}
        <div className="w-18 h-18 bg-white text-top text-9.5 font-bold flex items-center justify-center tracking-tight rounded-2 flex-none">
          A8
        </div>
        <div className="text-12 font-semibold tracking-wide whitespace-nowrap">
          ANC <span className="font-normal hidden sm:inline">Planning Studio</span>
        </div>
      </div>

      <div data-mark="modes" className="hidden md:flex items-stretch gap-px bg-topline p-2 rounded-3 flex-none">
        {MODES.map((m) => {
          const on = active === m.key;
          return (
            <button
              key={m.key}
              onClick={() => router.push(studio.href(NAV[m.key][0].items[0].path))}
              style={{ background: on ? "var(--topsel)" : "transparent", color: on ? "var(--top)" : "var(--topdim)" }}
              className="border-0 text-11.5 font-medium px-11 py-3 rounded-2 tracking-wide whitespace-nowrap"
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-w-0 hidden md:flex justify-center px-8">
        <form
          data-mark="finder"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            choose(hits[cursor]);
          }}
          className="w-full min-w-0 max-w-[380px] relative flex items-center bg-topfill border border-topline rounded-3 h-24 px-8 gap-6"
        >
          <Search aria-hidden="true" className="size-12 flex-none" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setCursor(0);
            }}
            onFocus={() => {
              setOpen(true);
              loadHelp();
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, hits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Escape") {
                setOpen(false);
                searchRef.current?.blur();
              }
            }}
            aria-label="Find a region, screen or answer"
            placeholder="Find a region, screen or answer…"
            className="flex-1 bg-transparent border-0 outline-none text-11.5 text-current min-w-0 placeholder:text-topdim"
          />
          <span aria-hidden="true" className="text-9.5 font-mono border border-topline2 rounded-2 px-4 flex-none">
            Ctrl K
          </span>
          {open && hits.length > 0 && (
            <div className="absolute left-0 right-0 top-[27px] z-[1200] bg-panel text-text border border-border2 rounded-3 py-4">
              {hits.map((h, i) => (
                <button
                  key={h.key}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(h);
                  }}
                  onMouseEnter={() => setCursor(i)}
                  className={`w-full text-left flex items-center gap-8 px-10 py-5 text-11.5 ${
                    i === cursor ? "bg-sel" : ""
                  }`}
                >
                  {h.hint === "region" ? (
                    <MapIcon className="size-12 text-faint flex-none" />
                  ) : ["help", "word", "guide"].includes(h.hint) ? (
                    <CircleHelp className="size-12 text-faint flex-none" />
                  ) : (
                    <Search className="size-12 text-faint flex-none" />
                  )}
                  <span className="flex-1 truncate">{h.label}</span>
                  <span className="text-9.5 uppercase tracking-label text-faint">{h.hint}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      <div className="flex-1 md:hidden" />

      <button
        data-mark="present"
        onClick={togglePresent}
        title="Presentation mode: larger type and a guided tour (arrow keys step, Esc leaves)"
        aria-pressed={present}
        className="border border-topline2 h-26 md:h-24 px-8 md:px-9 rounded-3 text-11 flex items-center gap-5 flex-none"
        style={{ background: present ? "var(--topsel)" : "var(--topfill2)", color: present ? "var(--top)" : "inherit" }}
      >
        <Monitor className="size-12" />
        <span className="hidden lg:inline">Present</span>
      </button>

      <button
        data-mark="theme"
        onClick={toggle}
        title="Toggle theme"
        aria-label="Toggle theme"
        className="border border-topline2 bg-topfill2 text-current h-26 md:h-24 px-8 md:px-9 rounded-3 text-11 flex items-center gap-5 flex-none"
      >
        {/* Both are rendered and CSS picks one from <html data-theme>, so the server
            and the browser produce the same markup (the theme is only known in the
            browser). */}
        <Sun className="size-12 theme-light-only" />
        <Moon className="size-12 theme-dark-only" />
        <span className="hidden lg:inline theme-light-only">Light</span>
        <span className="hidden lg:inline theme-dark-only">Dark</span>
      </button>
    </div>
  );
}
