"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Hammer, Play } from "lucide-react";
import { useTheme } from "@/components/shell/theme-provider";
import { MOH_BLUE, MOH_LOGO, MOH_NAME, PROJECT } from "@/lib/project";

/**
 * The title screen: the study question, the headline numbers, the team, and the way
 * in (the presentation, the dashboard, how it was built). It covers the shell so it
 * can open a talk; every number on it is from the manuscript and notebook 4.
 */

const HEADLINES: [string, string][] = [
  ["19.2%", "of women reached eight antenatal contacts (ANC8+)"],
  ["63%", "of women who reached four contacts did not reach eight"],
  ["42% vs 11%", "reached ANC8+ after an early against a later first visit"],
  ["0.40–0.44", "held-out average precision of our three models, against 0.16 by chance"],
];

export default function Welcome() {
  const router = useRouter();
  const { present, togglePresent } = useTheme();
  const start = () => {
    if (!present) togglePresent();
    router.push("/?tab=overview");
  };
  return (
    <div className="fixed inset-0 z-[1250] bg-bg overflow-auto">
      <div className="h-6" style={{ background: MOH_BLUE }} />
      <div className="min-h-[calc(100dvh-6px)] max-w-[1080px] mx-auto px-16 md:px-28 py-24 md:py-40 flex flex-col gap-24 md:gap-32">
        <div className="flex items-center gap-12">
          {MOH_LOGO ? (
            // eslint-disable-next-line @next/next/no-img-element
            <div className="flex items-center gap-10 pr-12 mr-2 border-r border-border">
              <img src={MOH_LOGO} alt={MOH_NAME} className="h-52 w-auto" />
              <span className="text-11.5 font-semibold leading-tight" style={{ color: MOH_BLUE }}>Ministry of Health<br />Ethiopia</span>
            </div>
          ) : null}
          <div className="text-10.5 uppercase tracking-label text-dim font-semibold">{PROJECT.programme}</div>
        </div>

        <div className="flex flex-col gap-12">
          <h1 className="text-[clamp(24px,4vw,40px)] leading-tight font-semibold text-text max-w-[900px]">{PROJECT.title}</h1>
          <p className="text-[clamp(14px,1.6vw,18px)] leading-relaxed text-dim max-w-[820px]">{PROJECT.question}</p>
          <p className="text-11.5 text-faint">{PROJECT.data} · 6,893 women · 14 regions</p>
        </div>

        <div className="grid gap-10 grid-cols-2 lg:grid-cols-4">
          {HEADLINES.map(([v, t]) => (
            <div key={v} className="bg-panel border border-border rounded-3 px-14 py-12">
              <div className="font-mono text-[clamp(20px,2.4vw,28px)] font-semibold text-accent">{v}</div>
              <div className="text-11 text-dim leading-snug mt-4">{t}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-10">
          <button type="button" onClick={start}
            className="h-36 px-16 rounded-3 bg-accent text-white text-12.5 font-semibold flex items-center gap-8 hover:opacity-90">
            <Play className="size-14" /> Start the presentation
          </button>
          <Link href="/?tab=overview" className="h-36 px-16 rounded-3 border border-accent text-accent text-12.5 font-semibold flex items-center gap-8 hover:bg-soft hover:no-underline">
            Open the dashboard <ArrowRight className="size-14" />
          </Link>
          <Link href="/built" className="h-36 px-16 rounded-3 border border-border2 text-dim text-12.5 font-medium flex items-center gap-8 hover:text-text hover:no-underline">
            <Hammer className="size-14" /> How it was built
          </Link>
        </div>

        <div className="mt-auto pt-16 border-t border-border flex flex-wrap gap-x-20 gap-y-6 text-11 text-dim">
          <span><span className="font-semibold text-text">Team:</span> {PROJECT.team.join(", ")}</span>
          <span><span className="font-semibold text-text">Supervisor:</span> {PROJECT.supervisor}</span>
          <span>{PROJECT.date}</span>
          <span className="basis-full text-faint text-10.5">
            In the presentation, the arrow keys step through the story and Esc leaves. Associations, not causes.
          </span>
        </div>
      </div>
    </div>
  );
}
