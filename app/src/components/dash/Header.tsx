"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CircleHelp, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/shell/theme-provider";
import { MOH_LOGO, MOH_NAME } from "@/lib/project";
import { TABS } from "@/lib/dash";

/** The dashboard's tabs, short labels for the header. */
const SHORT_TAB: Record<string, string> = { "left-behind": "Left behind", review: "Review" };
export const SECTIONS = TABS.map((t) => ({ id: t.id, label: SHORT_TAB[t.id] ?? t.label }));

const TOOLS = [
  { href: "/predict", label: "Score one woman" },
  { href: "/your-data", label: "Facility list" },
];

export default function Header() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { toggle, present, togglePresent } = useTheme();
  const home = (tab: string) => tabHref(search, tab);
  const current = pathname === "/" ? search.get("tab") ?? "overview" : null;
  const btn = "h-30 px-10 rounded-3 text-13 flex items-center gap-6 flex-none border border-topline2";

  return (
    <header className="bg-top text-topfg flex items-center gap-12 px-12 md:px-16 h-52 flex-none min-w-0">
      <Link href="/" title="Title page" className="flex items-center gap-10 min-w-0 flex-none">
        {MOH_LOGO && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={MOH_LOGO} alt={MOH_NAME} title={MOH_NAME} className="h-32 w-auto bg-white rounded-full p-1" />
        )}
        <span className="leading-tight">
          <span className="block text-15 font-semibold text-white whitespace-nowrap"><span className="xl:hidden">ANC8+ Ethiopia</span><span className="hidden xl:inline">ANC8+ Ethiopia Dashboard</span></span>
          <span className="hidden 2xl:block text-11 text-topdim whitespace-nowrap">EDHS 2024–25 · Ministry of Health</span>
        </span>
      </Link>

      <nav aria-label="Sections" className="hidden lg:flex items-center gap-2 ml-8 min-w-0 overflow-x-auto">
        {SECTIONS.map((s) => (
          <Link key={s.id} href={home(s.id)} scroll={false} aria-current={current === s.id ? "page" : undefined}
            className={`px-9 py-6 rounded-3 text-13 whitespace-nowrap ${current === s.id ? "bg-topsel text-top font-semibold" : "text-topdim hover:text-white hover:bg-topfill"}`}>
            {s.label}
          </Link>
        ))}
        <span className="w-px h-20 bg-topline2 mx-6" aria-hidden="true" />
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href}
            className={`px-10 py-6 rounded-3 text-13 whitespace-nowrap ${pathname === t.href ? "bg-topsel text-top font-semibold" : "text-topdim hover:text-white hover:bg-topfill"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      <Link href="/help" className={`${btn} ${pathname.startsWith("/help") ? "bg-topsel text-top" : "bg-topfill2 text-topfg"}`} title="Help">
        <CircleHelp className="size-15" />
        <span className="hidden xl:inline">Help</span>
      </Link>
      <button data-mark="present" onClick={togglePresent} aria-pressed={present}
        title="Presentation mode: a guided tour (arrow keys step, Esc leaves)"
        className={btn} style={{ background: present ? "var(--topsel)" : "var(--topfill2)", color: present ? "var(--top)" : "inherit" }}>
        <Monitor className="size-15" />
        <span className="hidden xl:inline">Present</span>
      </button>
      <button data-mark="theme" onClick={toggle} title="Light or dark" aria-label="Toggle light or dark"
        className={`${btn} bg-topfill2 text-topfg`}>
        <Sun className="size-15 theme-light-only" />
        <Moon className="size-15 theme-dark-only" />
      </button>
    </header>
  );
}

/** The sections and tools as a strip, for screens too narrow for the header menu. */
export function MobileNav() {
  const search = useSearchParams();
  return (
    <nav aria-label="Sections" className="lg:hidden flex gap-4 overflow-x-auto px-12 py-6 bg-panel border-b border-border">
      {SECTIONS.map((s) => (
        <Link key={s.id} href={tabHref(search, s.id)} scroll={false} className="px-10 py-5 rounded-3 text-13 text-dim whitespace-nowrap border border-border">
          {s.label}
        </Link>
      ))}
      {TOOLS.map((t) => (
        <Link key={t.href} href={t.href} className="px-10 py-5 rounded-3 text-13 text-accent whitespace-nowrap border border-border">
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** The dashboard with one tab open, keeping the cohort, indicator and region chosen. */
function tabHref(search: URLSearchParams | { get(k: string): string | null; toString(): string }, tab: string) {
  const next = new URLSearchParams(search.toString());
  next.set("tab", tab);
  for (const k of [...next.keys()]) if (!["tab", "cohort", "ind", "region"].includes(k)) next.delete(k);
  const qs = next.toString();
  return `/?${qs}`;
}
