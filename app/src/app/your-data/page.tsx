"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileUp, Filter, ShieldCheck, Users } from "lucide-react";
import { Bar, Card, Insight, Seg } from "@/components/dash/kit";
import { InlineError, PanelLoading } from "@/components/studio/ui";
import { useJSON } from "@/lib/data";
import { score, type Answers, type Bundle } from "@/lib/ebm";
import { parseCSV } from "@/lib/forecast";
import { versioned } from "@/lib/offline";
import type { CatalogModel, Schema } from "@/lib/types";

/**
 * Facility list: a facility uploads its list of ANC attendees and each woman is scored
 * for ANC8+ by the study's own fitted models (the same files the Predict screen uses),
 * in this browser. Nothing is uploaded anywhere.
 *
 * A facility list is women already attending ANC, so every woman is scored with the
 * study's ANC-entry models (trained on the 5,001 women who started ANC):
 *   early_anc empty for a woman   -> ANC-entry baseline model (the 21 predictors)
 *   early_anc filled (0 or 1)     -> ANC-entry extended model (21 + early ANC)
 *
 * Blank answers are filled by the model's own imputation (the development women's
 * median or most common value), exactly as in the study pipeline, and are flagged.
 */

const ALGS = ["XGBoost", "Logistic regression", "Random Forest"] as const;
type Alg = (typeof ALGS)[number];
const ID_COLS = ["woman_id", "id", "name", "card_no", "mrn"];

type Field = Schema["fields"][number];
interface Scored {
  i: number; id: string; p: number; flag: boolean; model: "baseline" | "extended"; blanks: string[];
  region: string; wealth: string; travel: string; band: string;
}

async function loadTrees(path: string): Promise<Bundle> {
  const res = await fetch(versioned(path));
  if (!res.ok) throw new Error(`could not load ${path}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const text = buf[0] === 0x1f && buf[1] === 0x8b
    ? await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text()
    : new TextDecoder().decode(buf);
  return JSON.parse(text) as Bundle;
}

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

/** Travel-time bands for the slicer and chart (minutes to the nearest hospital or health centre). */
const BANDS = ["30 min or less", "31–60 min", "1–2 hours", "Over 2 hours", "Not given"] as const;
function travelBand(m: number | undefined): string {
  if (m == null || !Number.isFinite(m)) return "Not given";
  return m <= 30 ? BANDS[0] : m <= 60 ? BANDS[1] : m <= 120 ? BANDS[2] : BANDS[3];
}
type Status = "all" | "follow" | "below" | "above";

export default function FacilityList() {
  const schema = useJSON<Schema>("/form_schema.json");
  const browser = useJSON<Bundle>("/browser_models.json");
  const [alg, setAlg] = useState<Alg>("XGBoost");
  const [file, setFile] = useState<{ name: string; table: string[][] } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const input = useRef<HTMLInputElement>(null);

  const fields = useMemo(() => schema.data?.fields ?? [], [schema.data]);
  const byName = useMemo(() => Object.fromEntries(fields.map((f) => [f.name, f])) as Record<string, Field>, [fields]);

  function template() {
    const cols = ["woman_id", ...fields.map((f) => f.name)];
    const example = ["W001", ...fields.map((f) => (f.name === "early_anc" ? "" : f.default == null ? "" : String(f.default)))];
    const csv = `${cols.join(",")}\n${example.map((v) => (v.includes(",") ? `"${v}"` : v)).join(",")}\n`;
    download("anc8_facility_template.csv", csv);
  }

  async function run(table: string[][], which: Alg) {
    if (!schema.data) return;
    setBusy(true); setErr(null);
    try {
      const head = table[0].map((h) => h.trim());
      const idCol = head.findIndex((h) => ID_COLS.includes(h.toLowerCase()));
      const problems: string[] = [];
      const known = new Set(fields.map((f) => f.name));
      const unknown = head.filter((h, k) => k !== idCol && h && !known.has(h));
      if (unknown.length) problems.push(`Columns not used by the model (ignored): ${unknown.join(", ")}.`);
      const missingCols = fields.filter((f) => f.name !== "early_anc" && !head.includes(f.name)).map((f) => f.name);
      if (missingCols.length) problems.push(`Columns missing from the file, filled by the model's imputation for every woman: ${missingCols.join(", ")}.`);

      const models = schema.data.models as CatalogModel[];
      const base = models.find((m) => m.horizon === "entry" && m.algorithm === which && m.id.includes("(Baseline)"))!;
      const ext = models.find((m) => m.horizon === "entry" && m.algorithm === which && m.id.includes("(Extended)"))!;
      // Baseline and extended share one bundle (browser file for logistic, one tree file otherwise).
      const bundle = base.browser ? browser.data! : await loadTrees(base.trees!);

      const rows: Scored[] = [];
      let bad = 0;
      table.slice(1).forEach((r, k) => {
        const a: Answers = {};
        const blanks: string[] = [];
        for (const f of fields) {
          const c = head.indexOf(f.name);
          const raw = c >= 0 ? (r[c] ?? "").trim() : "";
          if (raw === "") { if (f.name !== "early_anc") blanks.push(f.name); continue; }
          if (f.type === "number") {
            const v = Number(raw);
            if (!Number.isFinite(v)) { bad++; if (bad <= 15) problems.push(`Row ${k + 2}: ${f.name} "${raw}" is not a number; treated as blank.`); blanks.push(f.name); continue; }
            a[f.name] = v;
          } else {
            const ok = (f.options ?? []).find((o) => o.value.toLowerCase() === raw.toLowerCase());
            if (!ok) { bad++; if (bad <= 15) problems.push(`Row ${k + 2}: ${f.name} "${raw}" is not one of the allowed values; treated as blank.`); blanks.push(f.name); continue; }
            a[f.name] = ok.value;
          }
        }
        const useExt = a.early_anc === "0" || a.early_anc === "1";
        const m = useExt ? ext : base;
        const s = score(bundle, m.id, a);
        const th = m.threshold ?? 0.2;
        rows.push({
          i: k, id: idCol >= 0 ? (r[idCol] ?? "").trim() || `Row ${k + 2}` : `Row ${k + 2}`, p: s.probability, flag: s.probability < th,
          model: useExt ? "extended" : "baseline", blanks,
          region: String(a.region ?? "–"), wealth: String(a.wealth_quintile ?? "–"),
          travel: a.travel_time_min != null ? `${a.travel_time_min} min` : "–",
          band: travelBand(a.travel_time_min as number | undefined),
        });
      });
      if (bad > 15) problems.push(`…and ${bad - 15} more values treated as blank.`);
      setResult({ rows, problems, alg: which, threshold: { baseline: base.threshold ?? 0.2, extended: ext.threshold ?? 0.2 } });
      setView((v) => (v === "list" || v === "columns" ? "summary" : v));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSample() {
    try {
      const res = await fetch(versioned("/samples/anc8_facility_sample_MADE_UP.csv"));
      if (!res.ok) throw new Error("could not load the sample list");
      const table = parseCSV(await res.text());
      setFile({ name: "Made-up sample list (40 women, not real data)", table });
      run(table, alg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function onFile(f: File) {
    const text = await f.text();
    const table = parseCSV(text);
    if (table.length < 2) { setErr("The file has no rows of women. Use the template: one row per woman, one column per question."); return; }
    setFile({ name: f.name, table });
    run(table, alg);
  }

  if (schema.state === "error") return <div className="p-24"><InlineError message={schema.error} /></div>;
  if (!schema.data) return <div className="p-24"><PanelLoading rows={6} /></div>;

  const VIEWS: { key: View; label: string; needs?: boolean }[] = [
    { key: "list", label: "1 · Your list" },
    { key: "summary", label: "2 · Summary", needs: true },
    { key: "groups", label: "3 · By group", needs: true },
    { key: "women", label: "4 · The women", needs: true },
    { key: "columns", label: "The questions" },
  ];

  return (
    <div className="lg:flex-1 lg:min-h-0 max-w-[1440px] w-full mx-auto px-12 md:px-20 py-12 flex flex-col gap-12">
      <div className="flex items-end gap-x-20 gap-y-6 flex-wrap flex-none">
        <div className="flex-1 min-w-[300px]">
          <h1 className="text-21 font-semibold leading-tight">Score a facility&apos;s list of women</h1>
          <p className="text-13 text-dim mt-2">
            Each woman&apos;s predicted chance of reaching eight contacts (ANC8+), from the study&apos;s models, to decide whom to follow up first. A prediction describes women like her in the survey, not what will happen to her.
          </p>
        </div>
        <p className="flex items-center gap-6 text-12.5 text-good"><ShieldCheck className="size-15" /> The file is read in this browser and never sent anywhere.</p>
      </div>
      <div className="flex items-center gap-12 flex-wrap flex-none">
        <Seg label="Facility list view" value={view} onChange={setView}
          options={VIEWS.map((v) => ({ key: v.key, label: v.label, disabled: v.needs && !result }))} />
        {!result && <span className="text-12.5 text-faint">Upload a list, or try the made-up sample, to open the other views.</span>}
        {result && <span className="text-12.5 text-dim">{file?.name} · {result.rows.length} women · {result.alg}</span>}
      </div>

      {err && <InlineError message={err} />}
      {busy && <PanelLoading rows={4} />}

      {view === "list" && (
      <div className="grid gap-14 md:grid-cols-3 lg:flex-1 lg:min-h-0 lg:max-h-[420px]">
        <Card title="1 · Download the template" sub="One row per woman, one column per question">
          <p className="text-13 text-dim">The 21 questions the models use, plus <code>woman_id</code>. Add <code>early_anc</code> (1 = first visit by 12 weeks, 0 = later) when known: the model that also uses the first visit is then used for that woman.</p>
          <p className="text-13 text-dim">The <b className="text-text">The questions</b> button above lists every column and its allowed values.</p>
          <button type="button" onClick={template} className="mt-auto self-start flex items-center gap-8 rounded-[6px] bg-accent text-white px-14 py-8 text-13 font-semibold">
            <Download className="size-15" /> Template (CSV)
          </button>
        </Card>
        <Card title="2 · Upload your list" sub="CSV; from Excel use Save as → CSV">
          <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <button type="button" onClick={() => input.current?.click()}
            className="flex-1 min-h-[96px] rounded-[6px] border-2 border-dashed border-border2 hover:border-accent hover:bg-soft flex flex-col items-center justify-center gap-6 text-13 text-dim px-8">
            <FileUp className="size-24 text-accent" />
            {file ? <span><b className="text-text">{file.name}</b> · {file.table.length - 1} {file.table.length === 2 ? "woman" : "women"} · choose another</span> : "Choose a file"}
          </button>
          <div className="flex items-center gap-8 flex-wrap text-12.5">
            <button type="button" onClick={onSample} className="text-accent font-semibold hover:underline">Try a made-up sample list</button>
            <span className="text-faint">·</span>
            <a href={versioned("/samples/anc8_facility_sample_MADE_UP.csv")} download="anc8_facility_sample_MADE_UP.csv" className="text-accent hover:underline">download it</a>
            <span className="text-faint">40 invented women, not survey or patient data</span>
          </div>
        </Card>
        <Card title="3 · Choose the model" sub="All three are the study's own; XGBoost scored highest">
          <Seg label="Model" value={alg} onChange={(k) => { setAlg(k); if (file) run(file.table, k); }}
            options={ALGS.map((a) => ({ key: a, label: a === "Logistic regression" ? "Logistic" : a === "Random Forest" ? "Random forest" : a }))} />
          <p className="text-12.5 text-dim">These are the study&apos;s ANC-entry models, trained on the 5,001 women who started ANC, the same kind of women a facility sees.</p>
          {result && <button type="button" onClick={() => setView("summary")} className="mt-auto self-start rounded-[6px] border border-accent text-accent px-12 py-6 text-13 font-semibold hover:bg-soft">See the summary →</button>}
        </Card>
      </div>
      )}

      {view === "columns" && (
        <Card title="The questions and their allowed values" sub="Write the values exactly as listed; a blank is filled with the most common value and flagged"
          className="lg:flex-1 lg:min-h-0">
          <div className="grid gap-x-16 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((f) => (
              <div key={f.name} className="text-12 leading-snug">
                <code className="text-text font-semibold">{f.name}</code> <span className="text-dim">· {f.label}</span>
                <div className="text-faint">{f.type === "number" ? `a number${f.unit ? ` (${f.unit})` : ""}` : (f.options ?? []).map((o) => o.value).join(" · ")}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {result && !busy && (view === "summary" || view === "groups" || view === "women") && <Results res={result} byName={byName} view={view} />}
    </div>
  );
}

type View = "list" | "summary" | "groups" | "women" | "columns";

interface Result { rows: Scored[]; problems: string[]; alg: Alg; threshold: { baseline: number; extended: number } }

function Results({ res, byName, view }: { res: Result; byName: Record<string, Field>; view: "summary" | "groups" | "women" }) {
  const { rows } = res;
  const n = rows.length;
  const [cap, setCap] = useState(() => Math.min(10, n));
  const k = Math.max(0, Math.min(cap || 0, n));
  const flagged = rows.filter((r) => r.flag).length;
  const mean = rows.reduce((a, r) => a + r.p, 0) / Math.max(n, 1);
  const withBlanks = rows.filter((r) => r.blanks.length).length;
  const sorted = [...rows].sort((a, b) => a.p - b.p);
  // Priority is ranked on the whole list; the slicers only choose which women are shown.
  const rank = new Map(sorted.map((r, j) => [r.i, j]));
  const [fRegion, setFRegion] = useState("");
  const [fWealth, setFWealth] = useState("");
  const [fBand, setFBand] = useState("");
  const [fStatus, setFStatus] = useState<Status>("all");
  const [page, setPage] = useState(0);
  const levels = (key: "region" | "wealth", order: string[]) => {
    const have = new Set(rows.map((r) => r[key]));
    return [...order.filter((o) => have.has(o)), ...[...have].filter((h) => !order.includes(h)).sort()];
  };
  const regionLevels = levels("region", (byName.region?.options ?? []).map((o) => o.value));
  const wealthLevels = levels("wealth", ["Poorest", "Poorer", "Middle", "Richer", "Richest"]);
  const bandLevels = BANDS.filter((b) => rows.some((r) => r.band === b));
  const view_ = sorted.filter((r) => {
    const j = rank.get(r.i)!;
    return (!fRegion || r.region === fRegion) && (!fWealth || r.wealth === fWealth) && (!fBand || r.band === fBand)
      && (fStatus === "all" || (fStatus === "follow" ? j < k : fStatus === "below" ? r.flag : !r.flag));
  });
  const filtered = view_.length !== n;
  const vMean = view_.reduce((a, r) => a + r.p, 0) / Math.max(view_.length, 1);
  const vFollow = view_.filter((r) => rank.get(r.i)! < k).length;
  const vFlag = view_.filter((r) => r.flag).length;
  const group = (key: "region" | "wealth" | "band", order: readonly string[]) => {
    const m = new Map<string, Scored[]>();
    view_.forEach((r) => m.set(r[key], [...(m.get(r[key]) ?? []), r]));
    return order.filter((o) => m.has(o)).map((o) => { const v = m.get(o)!; return { k: o, n: v.length, mean: v.reduce((a, r) => a + r.p, 0) / v.length, flagged: v.filter((r) => r.flag).length / v.length }; });
  };
  const exportCsv = () => {
    const head = "priority,woman_id,predicted_anc8_chance,follow_up_first,below_model_threshold,model,region,wealth_quintile,travel_time,blank_answers";
    const body = view_.map((r) => { const j = rank.get(r.i)!; return [j + 1, r.id, r.p.toFixed(4), j < k ? "yes" : "no", r.flag ? "yes" : "no", `${res.alg} ANC-entry ${r.model}`, r.region, r.wealth, r.travel, r.blanks.join(" ")].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","); });
    download(filtered ? "anc8_facility_scores_filtered.csv" : "anc8_facility_scores.csv", [head, ...body].join("\n"));
  };
  const PER = 12;
  const pages = Math.max(1, Math.ceil(view_.length / PER));
  const pg = Math.min(page, pages - 1);
  const slicers = (
    <div className="flex flex-wrap items-end gap-x-14 gap-y-8 flex-none">
      <Pick label="Region" value={fRegion} onChange={(v) => { setFRegion(v); setPage(0); }} options={regionLevels} />
      <Pick label="Household wealth" value={fWealth} onChange={(v) => { setFWealth(v); setPage(0); }} options={wealthLevels} />
      <Pick label="Travel time" value={fBand} onChange={(v) => { setFBand(v); setPage(0); }} options={bandLevels} />
      <div className="flex flex-col gap-4">
        <span className="text-11.5 font-semibold text-dim uppercase tracking-wide">Show</span>
        <Seg label="Show" size="sm" value={fStatus} onChange={(v) => { setFStatus(v); setPage(0); }}
          options={[{ key: "all", label: "Everyone" }, { key: "follow", label: "Follow up" }, { key: "below", label: "Below threshold" }, { key: "above", label: "Above threshold" }]} />
      </div>
      {filtered && <button type="button" onClick={() => { setFRegion(""); setFWealth(""); setFBand(""); setFStatus("all"); setPage(0); }} className="text-13 text-accent hover:underline pb-6">Clear all</button>}
      <span className="flex items-center gap-6 text-12.5 text-dim pb-6"><Filter className="size-14 text-accent" />
        {view_.length ? <>Showing <b className="text-text">{view_.length}</b> of {n}: average {pct(vMean)}, {vFollow} follow up, {vFlag} below threshold</> : <>No woman matches these choices.</>}
      </span>
    </div>
  );

  if (view === "summary") return (
    <div className="flex flex-col gap-12 lg:flex-1 lg:min-h-0">
      <div className="grid gap-12 grid-cols-2 xl:grid-cols-4 flex-none">
        <Tile label="Women scored" value={n.toLocaleString("en-US")} sub={`${rows.filter((r) => r.model === "extended").length} with first-visit timing`} />
        <Tile label="Average predicted chance of ANC8+" value={pct(mean)} sub={`${res.alg}`} />
        <Tile label="Below the model's threshold" value={`${flagged.toLocaleString("en-US")}`} sub={`${pct(flagged / Math.max(n, 1))} of the list`} tone="bad" />
        <Tile label="Women with blank answers" value={withBlanks.toLocaleString("en-US")} sub="filled by the model's imputation" tone={withBlanks ? "warn" : undefined} />
      </div>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:flex-1 lg:min-h-0">
        <Card title="How many women can you follow up?" sub="The women with the lowest predicted chance are marked to follow up first">
          <div className="flex items-center gap-12 flex-wrap">
            <label className="flex items-center gap-8 text-13">
              Follow up the lowest
              <input type="number" min={0} max={n} value={cap} aria-label="Number of women to follow up"
                onChange={(e) => setCap(Math.max(0, Math.min(n, Number(e.target.value) || 0)))}
                className="w-[80px] h-32 rounded-[6px] border border-border2 bg-panel px-8 text-14 font-mono" />
              of {n.toLocaleString("en-US")} women
            </label>
            <input type="range" min={0} max={n} value={k} onChange={(e) => setCap(Number(e.target.value))} aria-label="Follow-up slider" className="flex-1 min-w-[160px] accent-[var(--accent)]" />
          </div>
          <Insight icon={Users} tone="bad">
            {k > 0
              ? <>The {k.toLocaleString("en-US")} women marked <b>follow up</b> have predicted chances of ANC8+ of {pct(sorted[k - 1].p, 1)} or less. {flagged.toLocaleString("en-US")} of {n.toLocaleString("en-US")} ({pct(flagged / Math.max(n, 1))}) are below the model&apos;s threshold ({pct(res.threshold.baseline, 1)}, or {pct(res.threshold.extended, 1)} when first-visit timing is given).</>
              : <>Set how many women your team can follow up; the list is already ordered from the lowest predicted chance.</>}
          </Insight>
          <p className="text-12.5 text-dim">Use the order to decide whom to contact first, never to refuse care. The models were trained on survey women&apos;s recall of their visits, predict slightly more ANC8+ than observed, and have not yet been validated on facility registers.</p>
        </Card>
        <Card title="Checks on your file" sub={res.problems.length ? `${res.problems.length} note${res.problems.length > 1 ? "s" : ""}` : "Nothing to fix"}>
          {res.problems.length
            ? <ul className="text-12.5 text-warn flex flex-col gap-4">{res.problems.slice(0, 8).map((p, j) => <li key={j} className="flex gap-6"><AlertTriangle className="size-14 flex-none mt-2" />{p}</li>)}
                {res.problems.length > 8 && <li className="text-dim">…and {res.problems.length - 8} more.</li>}</ul>
            : <p className="flex items-center gap-6 text-13 text-good"><CheckCircle2 className="size-16" /> Every column and value was recognised.</p>}
          <p className="text-12.5 text-dim mt-auto">Next: <b className="text-text">3 · By group</b> shows who the low chances concentrate in; <b className="text-text">4 · The women</b> lists each woman.</p>
        </Card>
      </div>
    </div>
  );

  if (view === "groups") return (
    <div className="flex flex-col gap-12 lg:flex-1 lg:min-h-0">
      {slicers}
      <div className="grid gap-12 xl:grid-cols-3 lg:flex-1 lg:min-h-0">
        <Card title="By region" sub="Average predicted chance · click a bar to filter">
          {group("region", regionLevels).map((g) => <PickBar key={g.k} g={g} on={fRegion === g.k} onClick={() => setFRegion(fRegion === g.k ? "" : g.k)} />)}
        </Card>
        <Card title="By household wealth" sub="Average predicted chance · click a bar to filter">
          {group("wealth", wealthLevels).map((g) => <PickBar key={g.k} g={g} on={fWealth === g.k} onClick={() => setFWealth(fWealth === g.k ? "" : g.k)} />)}
        </Card>
        <Card title="By travel time" sub="Average predicted chance · click a bar to filter">
          {group("band", bandLevels).map((g) => <PickBar key={g.k} g={g} on={fBand === g.k} onClick={() => setFBand(fBand === g.k ? "" : g.k)} />)}
        </Card>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-12 lg:flex-1 lg:min-h-0">
      {slicers}
      <Card title={filtered ? `The women shown, lowest predicted chance first` : "Every woman, lowest predicted chance first"} className="lg:flex-1 lg:min-h-0"
        actions={<button type="button" onClick={exportCsv} className="flex items-center gap-6 rounded-[6px] border border-accent text-accent px-12 py-6 text-13 font-semibold hover:bg-soft"><Download className="size-15" /> {filtered ? "Download shown (CSV)" : "Download results (CSV)"}</button>}>
        <table className="w-full text-12.5">
          <thead>
            <tr className="text-12 text-dim text-left border-b border-border">
              <th className="py-4 px-6 font-medium w-[40px]">#</th><th className="py-4 px-6 font-medium">Woman</th><th className="py-4 px-6 font-medium">Predicted chance of ANC8+</th>
              <th className="py-4 px-6 font-medium">Region</th><th className="py-4 px-6 font-medium">Wealth</th>
              <th className="py-4 px-6 font-medium">Travel</th><th className="py-4 px-6 font-medium">Blank answers</th>
            </tr>
          </thead>
          <tbody>
            {view_.slice(pg * PER, pg * PER + PER).map((r) => { const j = rank.get(r.i)!; return (
              <tr key={r.i} className={`border-b border-border ${j < k ? "bg-badbg/40" : ""}`}>
                <td className="py-3 px-6 font-mono text-dim">{j + 1}</td>
                <td className="py-3 px-6"><span className="font-mono">{r.id}</span>{r.model === "extended" && <span className="text-11 text-faint"> · first-visit timing</span>}</td>
                <td className="py-3 px-6">
                  <span className="inline-flex items-center gap-8">
                    <span className="w-[100px] h-8 bg-panel3 rounded-[2px] inline-block relative">
                      <span className="absolute inset-y-0 left-0 rounded-[2px]" style={{ width: `${r.p * 100}%`, background: r.flag ? "var(--bad)" : "var(--accent)" }} />
                    </span>
                    <b className={`font-mono ${r.flag ? "text-bad" : ""}`}>{pct(r.p, 1)}</b>
                    {j < k && <span className="text-11 text-white bg-bad rounded-[3px] px-5">follow up</span>}
                    {r.flag && j >= k && <span className="text-11 text-bad border border-bad rounded-[3px] px-4">below threshold</span>}
                  </span>
                </td>
                <td className="py-3 px-6">{r.region}</td>
                <td className="py-3 px-6">{r.wealth}</td>
                <td className="py-3 px-6">{r.travel}</td>
                <td className="py-3 px-6 text-12 text-warn">{r.blanks.map((b) => byName[b]?.label ?? b).join(", ")}</td>
              </tr>
            ); })}
          </tbody>
        </table>
        <div className="flex items-center gap-10 mt-auto pt-6 text-13">
          <button type="button" onClick={() => setPage(Math.max(0, pg - 1))} disabled={pg === 0}
            className="h-30 px-12 rounded-[6px] border border-border2 flex items-center gap-4 disabled:opacity-40"><ChevronLeft className="size-15" /> Previous</button>
          <span className="text-dim">Page <b className="text-text">{pg + 1}</b> of {pages} · women {view_.length ? pg * PER + 1 : 0}–{Math.min(view_.length, pg * PER + PER)} of {view_.length}</span>
          <button type="button" onClick={() => setPage(Math.min(pages - 1, pg + 1))} disabled={pg >= pages - 1}
            className="h-30 px-12 rounded-[6px] border border-accent bg-accent text-white flex items-center gap-4 disabled:opacity-40">Next <ChevronRight className="size-15" /></button>
        </div>
      </Card>
    </div>
  );
}

function Pick({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="flex flex-col gap-4">
      <span className="text-11.5 font-semibold text-dim uppercase tracking-wide">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        className={`h-32 min-w-[160px] rounded-[6px] border px-8 text-13 bg-panel ${value ? "border-accent text-accent font-semibold" : "border-border2"}`}>
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function PickBar({ g, on, onClick }: { g: { k: string; n: number; mean: number; flagged: number }; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="block w-full text-left rounded-[4px] hover:bg-soft">
      <Bar label={<>{g.k} <span className="text-11 text-faint">· {g.n}</span></>} value={g.mean} max={1} display={pct(g.mean)} highlight={on} labelWidth={150} />
    </button>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "bad" | "warn" }) {
  return (
    <div className="rounded-[6px] border border-border bg-panel px-16 py-14">
      <div className="text-13 font-semibold text-dim">{label}</div>
      <div className={`font-mono text-30 font-semibold mt-4 ${tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : ""}`}>{value}</div>
      {sub && <div className="text-12.5 text-dim mt-2">{sub}</div>}
    </div>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
