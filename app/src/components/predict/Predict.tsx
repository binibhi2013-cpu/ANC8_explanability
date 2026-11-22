"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import DotRows from "@/components/charts/DotRows";
import RankedBars from "@/components/charts/RankedBars";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Note, Panel, Range, SectionRule, Segmented, Tag } from "@/components/studio/ui";
import { score, type Answers, type Bundle } from "@/lib/ebm";
import { label } from "@/lib/labels";
import { versioned } from "@/lib/offline";
import { PREDICT_API } from "@/lib/paths";
import type { ApiResponse, CatalogModel, Field, Insights, Schema } from "@/lib/types";

/**
 * Predict: choose the model, the rung and when, then change the answers and watch
 * the probability respond. Every model uses the 21 predictors; at the first visit,
 * the 21 and whether that visit came in the first trimester.
 *
 * The additive models (explainable boosting, logistic regression) are scored in the
 * browser, so they respond at once and show exactly how much each answer adds. Every
 * other model is scored by the prediction service.
 */

const pct = (p: number, d = 1) => `${(p * 100).toFixed(d)}%`;

type Scored = {
  probability: number;
  threshold?: number | null;
  classification?: string | null;
  contributions?: { predictor: string; contribution: number }[];
  imputed?: number;
  error?: string;
};

const RUNG_OF = { anc1plus: "anc1", anc4plus: "anc4", anc8plus: "anc8" } as const;

const ALGORITHMS = ["Logistic regression", "Random Forest", "XGBoost"] as const;
const SHORT: Record<string, string> = { "Logistic regression": "Logistic regression", "Random Forest": "Random forest", XGBoost: "XGBoost" };

function modelLabel(m: CatalogModel) {
  return SHORT[m.algorithm] ?? m.algorithm;
}

/** The Model analysis card that describes this model, where there is one. */
function cardKey(m: CatalogModel) {
  const slug = m.algorithm.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return m.horizon === "before" ? slug : "";
}

const SERVICE_DOWN = "The prediction service is not reachable from this copy of the site. Logistic regression scores in your browser.";

/** Is the prediction service there? Asked once: a site without Python (a local
 *  preview, a static copy) answers with a page, not with the service's status. */
async function serviceUp(): Promise<boolean> {
  if (!PREDICT_API) return false;
  try {
    const res = await fetch(PREDICT_API, { method: "GET" });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return false;
    const j = (await res.json()) as { status?: string };
    return j.status === "ok";
  } catch {
    return false;
  }
}

async function scoreRemote(answers: Answers, models: CatalogModel[]): Promise<Record<string, Scored>> {
  if (!PREDICT_API) throw new Error("no prediction service in this copy of the site");
  const byBundle: Record<string, string[]> = {};
  for (const m of models) (byBundle[m.bundle] ??= []).push(m.model);
  const res = await fetch(PREDICT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, models: byBundle }),
  });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) throw new Error(SERVICE_DOWN);
  const json = (await res.json()) as ApiResponse & { error?: string };
  if (json.error) throw new Error(json.error);
  const out: Record<string, Scored> = {};
  for (const [bundle, gen] of Object.entries(json.result)) {
    for (const r of gen.models ?? []) {
      out[`${bundle}::${r.model}`] = r.error
        ? { probability: NaN, error: r.error }
        : { probability: r.probability!, threshold: r.threshold, classification: r.classification,
            contributions: r.contributions, imputed: gen.imputed?.length ?? 0 };
    }
  }
  return out;
}

/** A tree model file (gzip JSON). The server may already have unpacked it in transit. */
async function loadTrees(path: string): Promise<Bundle> {
  const res = await fetch(versioned(path));
  if (!res.ok) throw new Error(`could not load ${path}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const text = buf[0] === 0x1f && buf[1] === 0x8b
    ? await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text()
    : new TextDecoder().decode(buf);
  return JSON.parse(text) as Bundle;
}

function scoreLocal(bundle: Bundle, m: CatalogModel, answers: Answers): Scored {
  const s = score(bundle, m.id, answers);
  return { probability: s.probability, threshold: m.threshold, contributions: s.contributions };
}

const btn = "border border-border2 bg-panel h-22 px-8 rounded-2 text-10.5 text-dim hover:text-text";

export default function Predict({
  schema, browser, insights, initial,
}: {
  schema: Schema;
  browser: Bundle | null;
  insights: Insights;
  initial: Answers;
}) {
  // Until the service answers, only the browser's models are offered.
  const [canRemote, setCanRemote] = useState(false);
  useEffect(() => { serviceUp().then(setCanRemote); }, []);
  // The tree models' files, fetched the first time one is needed.
  const [trees, setTrees] = useState<Record<string, Bundle | "failed">>({});
  const treeAsked = useRef(new Set<string>());
  const needTrees = (path: string) => {
    if (treeAsked.current.has(path)) return;
    treeAsked.current.add(path);
    loadTrees(path)
      .then((b) => setTrees((t) => ({ ...t, [path]: b })))
      .catch(() => setTrees((t) => ({ ...t, [path]: "failed" })));
  };
  /** The bundle that scores this model here, if it is in hand. */
  const localBundle = (m: CatalogModel): Bundle | null => {
    if (m.browser) return browser;
    const t = m.trees ? trees[m.trees] : undefined;
    return t && t !== "failed" ? t : null;
  };
  const usable = (m: CatalogModel) =>
    (m.browser && !!browser) || (!!m.trees && trees[m.trees] !== "failed") || canRemote;
  const fieldsByName = useMemo(
    () => Object.fromEntries(schema.fields.map((f) => [f.name, f])) as Record<string, Field>,
    [schema],
  );

  const start = useMemo<Answers>(() => {
    const a: Answers = {};
    for (const f of schema.fields) a[f.name] = f.default == null ? "" : String(f.default);
    for (const [k, v] of Object.entries(initial)) if (k in a && v != null) a[k] = String(v);
    return a;
  }, [schema, initial]);

  const [outcome, setOutcome] = useState<CatalogModel["outcome"]>("anc8plus");
  const [horizon, setHorizon] = useState<CatalogModel["horizon"]>("before");
  const [algorithm, setAlgorithm] = useState<string>("Logistic regression");
  // The recommended model (logistic regression) is shown first; the others on request.
  const [showModels, setShowModels] = useState(false);
  const [answers, setAnswers] = useState<Answers>(start);
  const [showAll, setShowAll] = useState(false);
  const [current, setCurrent] = useState<Scored | null>(null);
  const [baseline, setBaseline] = useState<Scored | null>(null);
  const [baselineFor, setBaselineFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState<Record<string, Scored> | null>(null);

  useEffect(() => setAnswers(start), [start]);

  // One model per algorithm for this rung and time: before ANC, the 21 predictors; at
  // the first visit, the 21 and the timing of that visit.
  const choices = useMemo(
    () =>
      ALGORITHMS.map((a) => schema.models.find((m) =>
        m.outcome === outcome && m.horizon === horizon && m.algorithm === a
        && (horizon === "before" || m.set.includes("early ANC")))).filter((m): m is CatalogModel => !!m),
    [schema, outcome, horizon],
  );
  const hasEntry = (o: string) => schema.models.some((m) => m.outcome === o && m.horizon === "entry");

  // Keep the chosen algorithm when this copy of the site can score it; otherwise the
  // first one it can.
  useEffect(() => {
    const now = choices.find((m) => m.algorithm === algorithm);
    if (now && usable(now)) return;
    const pick = choices.find(usable) ?? choices[0];
    if (pick) setAlgorithm(pick.algorithm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices, canRemote]);

  const model = choices.find((m) => m.algorithm === algorithm);
  const modelId = model?.id ?? "";
  const base = schema.prevalence[`${outcome}|${horizon}`];
  const outcomeLabel = schema.outcomes[outcome];

  // Score as the answers change: at once in the browser, after a short pause for the service.
  const seq = useRef(0);
  useEffect(() => {
    if (!model) return;
    const id = ++seq.current;
    const local = localBundle(model);
    if (local) {
      setBusy(false);
      try {
        setCurrent(scoreLocal(local, model, answers));
        setBaseline(scoreLocal(local, model, start));
        setBaselineFor(model.id);
      } catch (e) {
        setCurrent({ probability: NaN, error: String(e) });
      }
      return;
    }
    if (model.trees && trees[model.trees] !== "failed") {
      setBusy(true);
      setCurrent(null);
      needTrees(model.trees);
      return;
    }
    if (!canRemote) {
      setCurrent(null);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const [now, then] = await Promise.all([
          scoreRemote(answers, [model]),
          baseline && baselineFor === model.id ? Promise.resolve({ [model.id]: baseline }) : scoreRemote(start, [model]),
        ]);
        if (id !== seq.current) return;
        setCurrent(now[model.id] ?? null);
        setBaseline(then[model.id] ?? null);
        setBaselineFor(model.id);
      } catch (e) {
        if (id === seq.current) setCurrent({ probability: NaN, error: e instanceof Error ? e.message : String(e) });
      } finally {
        if (id === seq.current) setBusy(false);
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id, answers, browser, trees]);

  const cmpSeq = useRef(0);
  useEffect(() => {
    const id = ++cmpSeq.current;
    const local: Record<string, Scored> = {};
    const remote: CatalogModel[] = [];
    for (const m of choices) {
      const b = localBundle(m);
      if (b) local[m.id] = scoreLocal(b, m, answers);
      else if (m.trees && trees[m.trees] !== "failed") needTrees(m.trees);
      else if (canRemote) remote.push(m);
    }
    setCompare(local);
    if (!remote.length) return;
    const t = setTimeout(async () => {
      try {
        const r = await scoreRemote(answers, remote);
        if (id === cmpSeq.current) setCompare({ ...local, ...r });
      } catch (e) {
        if (id === cmpSeq.current) setCompare({ ...local, _error: { probability: NaN, error: e instanceof Error ? e.message : String(e) } });
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices, answers, browser, canRemote, trees]);

  // The questions the chosen model asks: the most influential first.
  const asked = useMemo(() => {
    if (!model) return { top: [] as Field[], rest: [] as Field[] };
    const rank = new Map(insights.top_predictors.map((p, i) => [p, i]));
    const list = model.fields.map((n) => fieldsByName[n]).filter(Boolean);
    if (list.length <= 24) return { top: list, rest: [] as Field[] };
    const sorted = [...list].sort((a, b) => (rank.get(a.name) ?? 999) - (rank.get(b.name) ?? 999));
    return { top: sorted.slice(0, 12), rest: sorted.slice(12) };
  }, [model, fieldsByName, insights]);

  const nameOf = (n: string) => label(n) !== n ? label(n) : fieldsByName[n]?.label ?? n;
  const changed = (n: string) => String(answers[n] ?? "") !== String(start[n] ?? "");
  const set = (n: string, v: string) => setAnswers((a) => ({ ...a, [n]: v }));

  const renderField = (f: Field) => {
    const range = insights.ranges[f.name];
    const value = String(answers[f.name] ?? "");
    const title = `${nameOf(f.name)}${f.unit ? ` (${f.unit})` : ""}`;
    if (f.type === "number" && range && range.kind === "continuous") {
      const n = Number(value || range.median);
      return (
        <div key={f.name} className={changed(f.name) ? "border-l-2 border-accent pl-6" : "pl-8"}>
          <Range
            label={title}
            value={n}
            min={range.p05}
            max={range.p95}
            step={(range.p95 - range.p05) / 100 || 1}
            onChange={(v) => set(f.name, String(v))}
            format={(v) => String(+v.toFixed(2))}
          />
        </div>
      );
    }
    return (
      <div key={f.name} className={changed(f.name) ? "border-l-2 border-accent pl-6" : "pl-8"}>
        <label htmlFor={`q-${f.name}`} className="block text-10.5 font-medium mb-2">{title}</label>
        {f.type === "number" ? (
          <Input id={`q-${f.name}`} type="number" step="any" value={value} onChange={(e) => set(f.name, e.target.value)} />
        ) : (
          <Select id={`q-${f.name}`} value={value} onChange={(e) => set(f.name, e.target.value)}>
            <option value="">Not answered</option>
            {f.options?.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>{String(o.label)}</option>
            ))}
          </Select>
        )}
      </div>
    );
  };

  const groups = (fields: Field[]) => {
    const by = new Map<string, Field[]>();
    for (const f of fields) by.set(f.domain, [...(by.get(f.domain) ?? []), f]);
    return [...by.entries()];
  };

  const ok = current && Number.isFinite(current.probability);
  const delta = ok && baseline && Number.isFinite(baseline.probability) ? current.probability - baseline.probability : null;
  const changedCount = model ? model.fields.filter(changed).length : 0;
  const contribs = (current?.contributions ?? []).slice(0, 12);
  const key = model ? cardKey(model) : "";
  const analysisHref = "/models";

  return (
    <div className="grid gap-10 md:gap-14 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Panel help="predict.questions"
        title={`${model?.fields.length ?? 0} questions${changedCount > 0 ? ` · ${changedCount} changed` : ""}`}
        actions={<button type="button" className={btn} onClick={() => setAnswers(start)}>Reset</button>}
        how="The starting woman is a synthetic profile close to the typical woman in the survey. Change an answer to see what the model predicts for someone with that recorded characteristic, not what would happen if her circumstances changed."
      >
        <div className="px-14 py-10 flex flex-wrap items-center gap-10 border-b border-border">
          {!showModels ? (
            <>
              <Tag>{SHORT[algorithm] ?? algorithm} · recommended</Tag>
              <button type="button" className={btn} onClick={() => setShowModels(true)}>Compare models</button>
            </>
          ) : (
          <Segmented
            label="Model"
            options={ALGORITHMS.map((a) => {
              const m = choices.find((c) => c.algorithm === a);
              return {
                key: a, label: SHORT[a], disabled: !m || !usable(m),
                title: !m ? "No such model for this rung" : !usable(m) ? "Needs the prediction service, which this copy of the site cannot reach"
                  : `Held-out AP ${m.heldout_AP?.toFixed(3) ?? "–"}${m.browser || m.trees ? " · scored in your browser" : ""}`,
              };
            })}
            value={algorithm}
            onChange={(a) => setAlgorithm(a)}
          />
          )}
          {Object.keys(schema.outcomes).length > 1 && <Segmented
            label="Outcome"
            options={(["anc1plus", "anc4plus", "anc8plus"] as const).filter((o) => schema.outcomes[o]).map((o) => ({ key: o, label: schema.outcomes[o] }))}
            value={outcome}
            onChange={(o) => { setOutcome(o); if (!hasEntry(o)) setHorizon("before"); }}
          />}
          {outcome !== "anc1plus" && (
            <Segmented
              label="When"
              options={[
                { key: "before", label: "Before ANC" },
                { key: "entry", label: "At first visit", disabled: !hasEntry(outcome),
                  title: hasEntry(outcome) ? "The 21 and whether the first visit was in the first trimester" : "No first-visit model for this rung" },
              ]}
              value={horizon}
              onChange={setHorizon}
            />
          )}
        </div>
        {model && (
          <div className="px-14 py-8 flex flex-wrap items-center gap-6 border-b border-border">
            <Tag>AP {model.heldout_AP?.toFixed(3) ?? "–"}</Tag>
            {model.heldout_AUROC != null && <Tag>AUROC {model.heldout_AUROC.toFixed(3)}</Tag>}
            <Tag>{model.n_predictors} predictors</Tag>
            <Tag tone={localBundle(model) || model.trees ? "accent" : "neutral"}>{model.browser || model.trees ? "in your browser" : "prediction service"}</Tag>
            <Link href={analysisHref} className="ml-auto text-10.5 text-accent hover:underline">How it was built</Link>
          </div>
        )}
        <div className="px-14 pt-6 pb-14">
          {groups(asked.top).map(([g, fs]) => (
            <div key={g}>
              <SectionRule label={g} />
              <div className="grid gap-x-14 gap-y-10 sm:grid-cols-2 pt-6">{fs.map(renderField)}</div>
            </div>
          ))}
          {asked.rest.length > 0 && (
            <>
              <button type="button" onClick={() => setShowAll((s) => !s)} className={`${btn} mt-12`}>
                {showAll ? "Hide" : "Show"} {asked.rest.length} more
              </button>
              {showAll && groups(asked.rest).map(([g, fs]) => (
                <div key={g}>
                  <SectionRule label={g} />
                  <div className="grid gap-x-14 gap-y-10 sm:grid-cols-2 pt-6">{fs.map(renderField)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </Panel>

      <aside className="flex flex-col gap-10 md:gap-14 lg:sticky lg:top-14 self-start min-w-0">
        <Panel help="predict.chance" title={`Chance of reaching ${outcomeLabel}`} how="The share of women like her who reach the rung, from the chosen model. The dashed line is the chance for all women; the dark tick is the model's working threshold.">
          <div className="px-14 py-12">
            {ok ? (
              <>
                <div className={`font-mono text-30 font-semibold ${busy ? "opacity-50" : ""}`}>{pct(current.probability)}</div>
                {delta != null && changedCount > 0 && (
                  <div className="font-mono text-10.5 text-dim mt-2">
                    {delta >= 0 ? "+" : "−"}{Math.abs(delta * 100).toFixed(1)} points from the starting woman ({pct(baseline!.probability)})
                  </div>
                )}
                <DotRows
                  rows={[{
                    key: "p",
                    label: "Her chance",
                    values: { p: current.probability, t: current.threshold ?? null },
                    display: pct(current.probability, 0),
                  }]}
                  series={[
                    { key: "p", label: "Her chance", color: "var(--accent)" },
                    { key: "t", label: "Threshold", color: "var(--text)", hollow: true },
                  ]}
                  connect={false}
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  reference={base != null ? { value: base, label: `All women ${pct(base, 0)}` } : null}
                  format={(v) => pct(v, 0)}
                  labelWidth={80}
                  valueWidth={44}
                />
                {current.classification && <div className="text-10.5 text-dim">{current.classification}</div>}
                {current.imputed ? <div className="text-9.5 text-faint">{current.imputed} unanswered questions filled with typical values.</div> : null}
              </>
            ) : (
              <div className={`text-11 ${current?.error ? "text-warn" : "text-dim"}`}>
                {current?.error ?? (model?.trees && !localBundle(model) && trees[model.trees] !== "failed" ? "Loading the model…"
                  : busy || canRemote || model?.browser ? "Scoring…" : SERVICE_DOWN)}
              </div>
            )}
          </div>
        </Panel>

        {contribs.length > 0 && (
          <Panel help="predict.why" title="Why, exactly" how="What each answer adds on the log-odds scale, largest first. With the intercept they sum to the number behind the percentage. Green raises her chance; red lowers it.">
            <RankedBars
              signed
              referenceLabel=""
              labelWidth={140}
              valueWidth={52}
              rows={contribs.map((c) => ({
                key: c.predictor,
                label: nameOf(c.predictor),
                value: c.contribution,
                display: `${c.contribution >= 0 ? "+" : "−"}${Math.abs(c.contribution).toFixed(2)}`,
                color: c.contribution >= 0 ? "var(--good)" : "var(--bad)",
              }))}
            />
          </Panel>
        )}

        {showModels && <Panel help="predict.compare"
          title={`Every ${outcomeLabel} model`}
          how="These answers scored by every model for this question, updated as they change, to see whether the models agree. Click one to switch to it."
        >
          {compare ? (
            <>
              <DotRows
                rows={choices.map((m) => {
                  const r = compare[m.id];
                  const good = r && Number.isFinite(r.probability);
                  return {
                    key: m.id,
                    label: modelLabel(m),
                    values: { p: good ? r.probability : null },
                    display: good ? pct(r.probability, 0) : "–",
                    sub: !good && !usable(m) ? "needs the prediction service" : undefined,
                  };
                })}
                series={[{ key: "p", label: "Chance", color: "var(--accent)" }]}
                domain={[0, 1]}
                ticks={[0, 0.5, 1]}
                reference={base != null ? { value: base, label: "All women" } : null}
                active={modelId}
                onSelect={(id) => { const m = choices.find((c) => c.id === id); if (m) setAlgorithm(m.algorithm); }}
                format={(v) => pct(v, 0)}
                labelWidth={130}
                valueWidth={40}
              />
              {compare._error && <div className="px-14 pb-10"><Note>{compare._error.error}</Note></div>}
            </>
          ) : (
            <p className="px-14 py-10 text-10.5 text-dim">Scoring…</p>
          )}
        </Panel>}
      </aside>
    </div>
  );
}
