"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp, ShieldCheck, Users } from "lucide-react";
import { Bar, Card, Insight, Seg } from "@/components/dash/kit";
import { InlineError, PanelLoading, SiteFooter } from "@/components/studio/ui";
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
 *   No early_anc column, or it is empty  -> the full-cohort model (21 predictors)
 *   early_anc filled for a woman          -> the ANC-entry extended model (21 + early ANC)
 *
 * Blank answers are filled by the model's own imputation (the development women's
 * median or most common value), exactly as in the study pipeline, and are flagged.
 */

const ALGS = ["XGBoost", "Logistic regression", "Random Forest"] as const;
type Alg = (typeof ALGS)[number];
const ID_COLS = ["woman_id", "id", "name", "card_no", "mrn"];

type Field = Schema["fields"][number];
interface Scored {
  i: number; id: string; p: number; flag: boolean; model: "full" | "entry"; blanks: string[];
  region: string; wealth: string; travel: string;
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

export default function FacilityList() {
  const schema = useJSON<Schema>("/form_schema.json");
  const browser = useJSON<Bundle>("/browser_models.json");
  const [alg, setAlg] = useState<Alg>("XGBoost");
  const [file, setFile] = useState<{ name: string; table: string[][] } | null>(null);
  const [result, setResult] = useState<{ rows: Scored[]; problems: string[]; alg: Alg; threshold: Record<string, number> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
      const full = models.find((m) => m.horizon === "before" && m.algorithm === which)!;
      const entry = models.find((m) => m.horizon === "entry" && m.algorithm === which && m.id.includes("Extended"))!;
      const bundleFor = async (m: CatalogModel) => (m.browser ? browser.data! : await loadTrees(m.trees!));
      const fullB = await bundleFor(full);
      const entryB = entry.browser ? browser.data! : entry.trees === full.trees ? fullB : await loadTrees(entry.trees!);

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
        const useEntry = a.early_anc === "0" || a.early_anc === "1";
        const m = useEntry ? entry : full;
        const s = score(useEntry ? entryB : fullB, m.id, a);
        const th = m.threshold ?? 0.2;
        rows.push({
          i: k, id: idCol >= 0 ? (r[idCol] ?? "").trim() || `Row ${k + 2}` : `Row ${k + 2}`, p: s.probability, flag: s.probability < th,
          model: useEntry ? "entry" : "full", blanks,
          region: String(a.region ?? "–"), wealth: String(a.wealth_quintile ?? "–"),
          travel: a.travel_time_min != null ? `${a.travel_time_min} min` : "–",
        });
      });
      if (bad > 15) problems.push(`…and ${bad - 15} more values treated as blank.`);
      setResult({ rows, problems, alg: which, threshold: { full: full.threshold ?? 0.2, entry: entry.threshold ?? 0.2 } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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

  return (
    <div className="max-w-[1280px] mx-auto px-12 md:px-24 py-24 flex flex-col gap-20">
      <div>
        <h1 className="text-26 font-semibold">Score a facility&apos;s list of women</h1>
        <p className="text-15 text-dim mt-6 max-w-[900px] leading-relaxed">
          Upload the women attending ANC at your facility and see each woman&apos;s predicted chance of reaching eight contacts (ANC8+),
          from the study&apos;s trained models. Use it to decide whom to follow up first. A prediction describes women like her in the survey, not what will happen to her.
        </p>
        <p className="flex items-center gap-6 text-13 text-good mt-8"><ShieldCheck className="size-16" /> The file is read in this browser and never sent anywhere.</p>
      </div>

      <div className="grid gap-14 md:grid-cols-3">
        <Card title="1 · Download the template" sub="One row per woman, one column per question">
          <p className="text-13 text-dim">The 21 questions the models use, plus <code>woman_id</code>. Add <code>early_anc</code> (1 = first visit by 12 weeks, 0 = later) when known: the model that includes the first visit is then used for that woman.</p>
          <button type="button" onClick={template} className="mt-auto self-start flex items-center gap-8 rounded-[6px] bg-accent text-white px-14 py-8 text-13 font-semibold">
            <Download className="size-15" /> Template (CSV)
          </button>
        </Card>
        <Card title="2 · Upload your list" sub="CSV; from Excel use Save as → CSV">
          <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <button type="button" onClick={() => input.current?.click()}
            className="flex-1 min-h-[96px] rounded-[6px] border-2 border-dashed border-border2 hover:border-accent hover:bg-soft flex flex-col items-center justify-center gap-6 text-13 text-dim">
            <FileUp className="size-24 text-accent" />
            {file ? <span><b className="text-text">{file.name}</b> · {file.table.length - 1} {file.table.length === 2 ? "woman" : "women"} · choose another</span> : "Choose a file"}
          </button>
        </Card>
        <Card title="3 · Choose the model" sub="All three are the study's own; XGBoost scored highest">
          <Seg label="Model" value={alg} onChange={(k) => { setAlg(k); if (file) run(file.table, k); }}
            options={ALGS.map((a) => ({ key: a, label: a === "Logistic regression" ? "Logistic" : a === "Random Forest" ? "Random forest" : a }))} />
          <p className="text-12.5 text-dim">A woman is flagged when her predicted chance is below the model&apos;s threshold, chosen on the development women to balance sensitivity and specificity.</p>
        </Card>
      </div>

      <Card title="The questions and their allowed values" sub="Write the values exactly as listed; a blank is filled with the most common value and flagged"
        className="[&_details]:text-13">
        <details>
          <summary className="cursor-pointer text-13 text-accent">Show all {fields.length} columns</summary>
          <div className="grid gap-x-20 gap-y-8 md:grid-cols-2 mt-10">
            {fields.map((f) => (
              <div key={f.name} className="text-12.5">
                <code className="text-text font-semibold">{f.name}</code> <span className="text-dim">· {f.label}</span>
                <div className="text-faint">{f.type === "number" ? `a number${f.unit ? ` (${f.unit})` : ""}` : (f.options ?? []).map((o) => o.value).join(" · ")}</div>
              </div>
            ))}
          </div>
        </details>
      </Card>

      {err && <InlineError message={err} />}
      {busy && <PanelLoading rows={4} />}
      {result && !busy && <Results res={result} byName={byName} />}
      <SiteFooter />
    </div>
  );
}

function Results({ res, byName }: { res: { rows: Scored[]; problems: string[]; alg: Alg; threshold: Record<string, number> }; byName: Record<string, Field> }) {
  const { rows } = res;
  const n = rows.length;
  const flagged = rows.filter((r) => r.flag).length;
  const mean = rows.reduce((a, r) => a + r.p, 0) / Math.max(n, 1);
  const withBlanks = rows.filter((r) => r.blanks.length).length;
  const sorted = [...rows].sort((a, b) => a.p - b.p);
  const group = (key: "region" | "wealth") => {
    const m = new Map<string, Scored[]>();
    rows.forEach((r) => m.set(r[key], [...(m.get(r[key]) ?? []), r]));
    return [...m.entries()].map(([k, v]) => ({ k, n: v.length, mean: v.reduce((a, r) => a + r.p, 0) / v.length, flagged: v.filter((r) => r.flag).length / v.length }))
      .sort((a, b) => a.mean - b.mean);
  };
  const exportCsv = () => {
    const head = "woman_id,predicted_anc8_chance,flag_lower_chance,model,region,wealth_quintile,travel_time,blank_answers";
    const body = sorted.map((r) => [r.id, r.p.toFixed(4), r.flag ? "yes" : "no", r.model === "entry" ? `${res.alg} with first visit` : res.alg, r.region, r.wealth, r.travel, r.blanks.join(" ")].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    download("anc8_facility_scores.csv", [head, ...body].join("\n"));
  };
  return (
    <div className="flex flex-col gap-14">
      <div className="grid gap-12 grid-cols-2 xl:grid-cols-4">
        <Tile label="Women scored" value={n.toLocaleString("en-US")} sub={`${rows.filter((r) => r.model === "entry").length} with the first-visit model`} />
        <Tile label="Average predicted chance of ANC8+" value={pct(mean)} sub={`${res.alg}`} />
        <Tile label="Flagged: lower predicted chance" value={`${flagged.toLocaleString("en-US")}`} sub={`${pct(flagged / Math.max(n, 1))} of the list`} tone="bad" />
        <Tile label="Women with blank answers" value={withBlanks.toLocaleString("en-US")} sub="filled by the model's imputation" tone={withBlanks ? "warn" : undefined} />
      </div>
      <Insight icon={Users} tone="bad">
        {flagged.toLocaleString("en-US")} of {n.toLocaleString("en-US")} women ({pct(flagged / Math.max(n, 1))}) have a predicted chance of ANC8+ below the model&apos;s threshold ({pct(res.threshold.full, 1)} for the main model, {pct(res.threshold.entry, 1)} for the first-visit model, which applies to women who already started ANC). They are listed first below.
      </Insight>
      {res.problems.length > 0 && (
        <Card title="Checks on your file" sub={`${res.problems.length} note${res.problems.length > 1 ? "s" : ""}`}>
          <ul className="text-13 text-warn flex flex-col gap-4">
            {res.problems.map((p, k) => <li key={k} className="flex gap-6"><AlertTriangle className="size-15 flex-none mt-2" />{p}</li>)}
          </ul>
        </Card>
      )}
      {res.problems.length === 0 && <p className="flex items-center gap-6 text-13 text-good"><CheckCircle2 className="size-16" /> Every column and value was recognised.</p>}

      <div className="grid gap-14 xl:grid-cols-2">
        <Card title="By region" sub="Average predicted chance and share flagged">
          {group("region").map((g) => <Bar key={g.k} label={g.k} sub={`${g.n} ${g.n === 1 ? "woman" : "women"} · ${pct(g.flagged)} flagged`} value={g.mean} max={1} display={pct(g.mean)} />)}
        </Card>
        <Card title="By household wealth" sub="Average predicted chance and share flagged">
          {group("wealth").map((g) => <Bar key={g.k} label={g.k} sub={`${g.n} ${g.n === 1 ? "woman" : "women"} · ${pct(g.flagged)} flagged`} value={g.mean} max={1} display={pct(g.mean)} />)}
        </Card>
      </div>

      <Card title="Every woman, lowest predicted chance first"
        actions={<button type="button" onClick={exportCsv} className="flex items-center gap-6 rounded-[6px] border border-accent text-accent px-12 py-6 text-13 font-semibold hover:bg-soft"><Download className="size-15" /> Download results (CSV)</button>}>
        <div className="overflow-auto max-h-[520px]">
          <table className="w-full min-w-[720px] text-13">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-12 text-dim text-left border-b border-border">
                <th className="py-6 px-8 font-medium">Woman</th><th className="py-6 px-8 font-medium">Predicted chance of ANC8+</th>
                <th className="py-6 px-8 font-medium">Region</th><th className="py-6 px-8 font-medium">Wealth</th>
                <th className="py-6 px-8 font-medium">Travel</th><th className="py-6 px-8 font-medium">Blank answers</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 500).map((r) => (
                <tr key={r.i} className="border-b border-border">
                  <td className="py-5 px-8"><span className="font-mono">{r.id}</span>{r.model === "entry" && <div className="text-11 text-faint">first-visit model</div>}</td>
                  <td className="py-5 px-8">
                    <span className="inline-flex items-center gap-8">
                      <span className="w-[120px] h-10 bg-panel3 rounded-[2px] inline-block relative">
                        <span className="absolute inset-y-0 left-0 rounded-[2px]" style={{ width: `${r.p * 100}%`, background: r.flag ? "var(--bad)" : "var(--accent)" }} />
                      </span>
                      <b className={`font-mono ${r.flag ? "text-bad" : ""}`}>{pct(r.p, 1)}</b>
                      {r.flag && <span className="text-11 text-bad border border-bad rounded-[3px] px-4">lower chance</span>}
                    </span>
                  </td>
                  <td className="py-5 px-8">{r.region}</td>
                  <td className="py-5 px-8">{r.wealth}</td>
                  <td className="py-5 px-8">{r.travel}</td>
                  <td className="py-5 px-8 text-12 text-warn">{r.blanks.map((b) => byName[b]?.label ?? b).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length > 500 && <p className="text-12.5 text-dim py-8">Showing the first 500 of {sorted.length}; the download has every woman.</p>}
        </div>
      </Card>
    </div>
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
