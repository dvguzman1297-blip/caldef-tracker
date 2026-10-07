"use client";
import { useState } from "react";
import { Pencil, Sparkles } from "lucide-react";
import { addManualMeal, relogMeal } from "@/app/actions/meals";
import { SLOTS, type Slot } from "@/lib/budget";
import type { QuickPick } from "@/lib/quick-picks";
import { useDay } from "@/components/day-context";
import { openLogMeal } from "@/components/quick-fab";
import { Segmented } from "@/components/ui/segmented";
import { useDefaultSlot } from "@/components/use-default-slot";

const SLOT_OPTIONS = SLOTS.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));
const FIELDS = [
  ["calories", "Calories (kcal)"], ["protein", "Protein (g)"], ["fiber", "Fiber (g)"],
  ["netCarbs", "Net carbs (g)"], ["fat", "Fat (g)"],
] as const;
type FieldKey = (typeof FIELDS)[number][0];
type Draft = { title: string } & Record<FieldKey, string>;
type TabKey = "recent" | "frequent" | "favorites";
const TAB_LABEL: Record<TabKey, string> = { recent: "Recent", frequent: "Frequent", favorites: "Favorites" };

export function LogCard({ recent, frequent, favorites }: { recent: QuickPick[]; frequent: QuickPick[]; favorites: QuickPick[] }) {
  const day = useDay()!;
  const autoSlot = useDefaultSlot();
  const [chosen, setChosen] = useState<Slot | null>(null);
  const slot = chosen ?? autoSlot;
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adjusted, setAdjusted] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const tabs = ([["recent", recent], ["frequent", frequent], ["favorites", favorites]] as [TabKey, QuickPick[]][])
    .filter(([, list]) => list.length > 0);
  const [tab, setTab] = useState<TabKey | null>(null);
  const active = tabs.find(([k]) => k === tab) ?? tabs[0];

  async function estimate() {
    setBusy(true); setError(""); setDraft(null);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25_000);
    try {
      const res = await fetch("/api/estimate-meal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }), signal: ctrl.signal,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error || "The estimate failed.");
      const m = json.meal;
      setDraft({ title: m.title, calories: String(m.calories), protein: String(m.protein), fiber: String(m.fiber),
        netCarbs: String(m.netCarbs), fat: String(m.fat) });
      setAdjusted(!!json.adjusted); setReviewed(false);
    } catch (e) {
      setError(e instanceof DOMException && e.name === "AbortError"
        ? "The estimate is taking too long."
        : e instanceof Error ? e.message : "Something went wrong.");
    } finally { clearTimeout(timer); setBusy(false); }
  }

  const nums = draft && FIELDS.map(([k]) => Number(draft[k]));
  const valid = !!draft && draft.title.trim().length > 0 && nums!.every((v) => Number.isFinite(v) && v >= 0);

  function save() {
    if (!draft || !valid) return;
    const fd = new FormData();
    fd.set("slot", slot); fd.set("title", draft.title.trim()); fd.set("date", day.date); fd.set("source", "ai_estimate");
    for (const [k] of FIELDS) fd.set(k, draft[k]);
    day.log({
      slot, title: draft.title.trim(), calories: Number(draft.calories), protein: Number(draft.protein),
      fiber: Number(draft.fiber), netCarbs: Number(draft.netCarbs), fat: Number(draft.fat), source: "ai_estimate",
    }, () => addManualMeal(fd), `Added “${draft.title.trim()}” to ${slot}.`);
    setDraft(null); setDesc(""); setReviewed(false);
  }

  function relog(p: QuickPick) {
    day.log({ slot, title: p.title, calories: p.calories, protein: p.protein, fiber: p.fiber, netCarbs: p.netCarbs, fat: p.fat },
      () => relogMeal({ slot, title: p.title, calories: p.calories, protein: p.protein, fiber: p.fiber,
        netCarbs: p.netCarbs, fat: p.fat, date: day.date }),
      `Logged “${p.title}” to ${slot}.`);
  }

  return (
    <section className="glass space-y-4 p-4 sm:p-5" aria-label="Log a meal">
      <div>
        <h2 className="text-lg font-bold">Log a meal</h2>
        <p className="text-sm text-muted">Describe what you ate and we&apos;ll estimate it. You can edit the numbers before saving.</p>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (desc.trim().length >= 3 && !busy) estimate(); }}>
        <label htmlFor="describe-meal" className="sr-only">Describe what you ate</label>
        <input id="describe-meal" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300}
          className="input !min-h-12 !text-base" placeholder="e.g. 2 scrambled eggs, 2 slices whole wheat toast, half an avocado" />
        <button className="btn shrink-0 !min-h-12" disabled={busy || desc.trim().length < 3}>
          <Sparkles className="size-4" aria-hidden="true" />{busy ? "Estimating…" : "Estimate"}
        </button>
      </form>

      <Segmented label="Meal" value={slot} onChange={setChosen} options={SLOT_OPTIONS} />

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-danger-soft p-3 text-sm">
          <span><b className="text-danger">{error}</b> You can still log this meal yourself.</span>
          <button type="button" className="btn btn-ghost !py-1.5" onClick={openLogMeal}>
            <Pencil className="size-4" aria-hidden="true" />Enter it manually
          </button>
        </div>
      )}

      {draft && (
        <form className="space-y-3 rounded-xl border border-line-strong bg-inset p-3" onSubmit={(e) => { e.preventDefault(); save(); }}
          aria-label="Review estimate">
          <p className="text-sm font-semibold">Check and edit before adding to {slot}</p>
          <div>
            <label className="label" htmlFor="draft-title">Meal</label>
            <input id="draft-title" className="input" value={draft.title} maxLength={120}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {FIELDS.map(([k, l]) => (
              <div key={k}>
                <label className="label" htmlFor={`draft-${k}`}>{l}</label>
                <input id={`draft-${k}`} className="input" type="number" inputMode="decimal" min="0" step="0.1"
                  value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          {adjusted && <p className="text-sm text-muted">Calories were recalculated from the AI&apos;s macros because its figure didn&apos;t add up.</p>}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 size-4" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
            <span><b>AI estimate.</b> It can be off by 20–30% or more, especially for portions. I checked the numbers and edited anything that looks wrong.</span>
          </label>
          <div className="flex gap-2">
            <button className="btn" disabled={!valid || !reviewed}>Add to {slot}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>Discard</button>
          </div>
        </form>
      )}

      {active && (
        <div className="border-t border-line pt-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Tap to log to {slot}</span>
            <div className="flex gap-1" role="group" aria-label="Quick pick lists">
              {tabs.map(([k]) => (
                <button key={k} type="button" aria-pressed={active[0] === k} onClick={() => setTab(k)}
                  className={`min-h-9 rounded-full px-3 text-sm font-medium ${
                    active[0] === k ? "bg-surface-2 text-fg ring-1 ring-line-strong" : "text-fg-muted hover:bg-surface-2"}`}>
                  {TAB_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
            {active[1].map((p) => (
              <li key={p.title} className="shrink-0">
                <button type="button" onClick={() => relog(p)}
                  className="min-h-11 rounded-xl border border-line bg-inset px-3 py-1.5 text-left text-sm hover:border-accent hover:bg-surface-2">
                  <span className="block max-w-48 truncate font-medium">{p.title}</span>
                  <span className="text-xs text-muted">{p.calories} kcal · {Math.round(p.protein)}g protein</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
