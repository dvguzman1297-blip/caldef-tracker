"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, Check, ChefHat, Clock, History, Minus, Plus, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { logMeal } from "@/app/actions/meals";
import { saveFood } from "@/app/actions/foods";
import { addPlanEntry } from "@/app/actions/plan";
import { SLOTS, MEAL_SHARE, mealTarget, targetFit, type Slot } from "@/lib/budget";
import { formatDate } from "@/lib/date";
import { useToast } from "@/components/toast";
import { Segmented } from "@/components/ui/segmented";
import { SelectField } from "@/components/ui/select-field";
import { TagInput } from "@/components/ui/tag-input";
import { useDefaultSlot } from "@/components/use-default-slot";

type Remaining = { calories: number; protein: number; fiber: number; netCarbs: number; fat: number };
type Recipe = {
  title: string; prepTimeMinutes: number; ingredients: string[]; steps: string[];
  ingredientMatchPct: number; macros: Remaining;
};

const SUGGESTIONS = ["Chicken breast", "Eggs", "Spinach", "Greek yogurt", "Black beans", "Salmon", "Broccoli", "Oats"];
const MAX_INGREDIENTS = 15;
const PANTRY_LIMIT = 500; // matches the /api/recipe input schema
const STORE_KEY = "caldef.pantry.v1";
const SLOT_OPTIONS = SLOTS.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));

const readStore = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, MAX_INGREDIENTS) : [];
  } catch { return []; }
};
const writeStore = (v: string[]) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* storage blocked: fine */ } };

export function PantryClient({ remaining, today }: { remaining: Remaining; today: string }) {
  const toast = useToast();
  const autoSlot = useDefaultSlot();
  const [chosen, setChosen] = useState<Slot | null>(null);
  const slot = chosen ?? autoSlot;

  const [pantry, setPantry] = useState<string[]>([]);
  const [override, setOverride] = useState<{ calories: number; protein: number } | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [servings, setServings] = useState(1);

  const [recipe, setRecipe] = useState<(Recipe & { makes: number }) | null>(null);
  const [screened, setScreened] = useState<string[]>([]);
  const [recent, setRecent] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [logged, setLogged] = useState(false);
  const [savedRecipe, setSavedRecipe] = useState(false);
  const [planDate, setPlanDate] = useState("");
  const [planned, setPlanned] = useState("");
  const [pending, start] = useTransition();

  // Remember the pantry between visits (device-local). Reading storage has to happen after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPantry(readStore()); }, []);
  const updatePantry = (next: string[]) => { setPantry(next); writeStore(next); };

  const suggested = mealTarget(remaining, slot);
  const target = override ?? suggested;
  const pantryText = pantry.join(", ");
  const blocker = pantry.length === 0 ? "Add at least one ingredient to generate a recipe."
    : pantryText.length < 3 ? "Ingredient names are too short."
    : pantryText.length > PANTRY_LIMIT ? "That's too much text. Remove an ingredient or shorten the names."
    : "";

  function show(r: Recipe & { makes: number }, w: string[] = []) {
    setRecipe(r); setWarnings(w); setLogged(false); setSavedRecipe(false); setReviewed(false); setPlanned(""); setError("");
  }

  async function generate() {
    if (blocker || loading) return;
    setLoading(true); setError(""); setRecipe(null); setLogged(false); setSavedRecipe(false); setWarnings([]); setReviewed(false); setPlanned("");
    try {
      const res = await fetch("/api/recipe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pantry: pantryText, target: { calories: target.calories, protein: target.protein },
          options: { servings, ...(timeMinutes && { timeMinutes: Number(timeMinutes) }), ...(cuisine.trim() && { cuisine: cuisine.trim() }) },
          remaining: {
            calories: Math.max(remaining.calories, 0), protein: Math.max(remaining.protein, 0),
            fiber: Math.max(remaining.fiber, 0), netCarbs: Math.max(remaining.netCarbs, 0), fat: Math.max(remaining.fat, 0),
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error || "Something went wrong. Try again.");
      const r = { ...(json.recipe as Recipe), makes: servings };
      show(r, json.warnings ?? []); setScreened(json.screened ?? []);
      setRecent((p) => [r, ...p.filter((x) => x.title !== r.title)].slice(0, 5));
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Try again."); }
    finally { setLoading(false); }
  }

  const stats: { label: string; value: string; fit?: ReturnType<typeof targetFit>; goal?: number }[] = recipe ? [
    { label: "kcal", value: String(recipe.macros.calories), fit: targetFit(recipe.macros.calories, target.calories), goal: target.calories },
    { label: "Protein", value: `${recipe.macros.protein}g`, fit: targetFit(recipe.macros.protein, target.protein), goal: target.protein },
    { label: "Fiber", value: `${recipe.macros.fiber}g` }, { label: "Net carbs", value: `${recipe.macros.netCarbs}g` },
    { label: "Fat", value: `${recipe.macros.fat}g` },
  ] : [];

  const macros = recipe && { calories: recipe.macros.calories, protein: recipe.macros.protein, fiber: recipe.macros.fiber, netCarbs: recipe.macros.netCarbs, fat: recipe.macros.fat };

  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
      {/* Left: inputs */}
      <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="glass space-y-4 p-4 sm:p-5 lg:sticky lg:top-24 lg:col-span-2" noValidate>
        <div>
          <TagInput label="What's in your pantry?" value={pantry} onChange={updatePantry} maxTags={MAX_INGREDIENTS}
            placeholder="Type an ingredient, press Enter" suggestions={SUGGESTIONS} maxTagLength={30} />
          <div className="mt-1 flex items-center justify-between text-xs text-muted">
            <span>Remembered on this device for next time.</span>
            {pantry.length > 0 && <button type="button" className="font-medium text-accent-fg underline" onClick={() => updatePantry([])}>Clear all</button>}
          </div>
        </div>

        <Segmented label="Meal" value={slot} onChange={(s) => { setChosen(s); setOverride(null); setEditingTarget(false); }} options={SLOT_OPTIONS} />

        <div className="rounded-xl bg-inset p-3 text-sm" aria-live="polite">
          <div className="flex items-start justify-between gap-2">
            <p>Target for this {slot}: <b>~{target.calories.toLocaleString("en-US")} kcal</b>, <b>~{target.protein}g protein</b></p>
            <button type="button" className="shrink-0 font-medium text-accent-fg underline"
              onClick={() => { if (editingTarget) setOverride(null); setEditingTarget((e) => !e); }}>
              {editingTarget ? "Reset" : "Edit"}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            {override ? "Custom target."
              : suggested.overBudget ? "You've used today's calories, so this is a minimum-size meal."
              : `${Math.round(MEAL_SHARE[slot] * 100)}% of what you have left today.`}
          </p>
          {editingTarget && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><label className="label" htmlFor="tkcal">Calories</label>
                <input id="tkcal" type="number" inputMode="numeric" min={50} max={2500} step={10} className="input !min-h-11"
                  value={target.calories} onChange={(e) => setOverride({ calories: Number(e.target.value), protein: target.protein })} /></div>
              <div><label className="label" htmlFor="tprot">Protein (g)</label>
                <input id="tprot" type="number" inputMode="numeric" min={0} max={200} className="input !min-h-11"
                  value={target.protein} onChange={(e) => setOverride({ calories: target.calories, protein: Number(e.target.value) })} /></div>
            </div>
          )}
        </div>

        <details className="rounded-xl border border-line">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">More options (time, cuisine, servings)</summary>
          <div className="grid gap-3 border-t border-line p-3">
            <div>
              <label className="label" htmlFor="time">Time available</label>
              <SelectField id="time" value={timeMinutes} onChange={(e) => setTimeMinutes(e.target.value)}>
                <option value="">Any</option><option value="15">15 minutes</option><option value="30">30 minutes</option>
                <option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">90 minutes</option>
              </SelectField>
            </div>
            <div>
              <label className="label" htmlFor="cuisine">Cuisine (optional)</label>
              <input id="cuisine" className="input !min-h-11" maxLength={40} placeholder="e.g. Filipino, Mexican" value={cuisine}
                onChange={(e) => setCuisine(e.target.value)} />
            </div>
            <div>
              <span className="label" id="servings-l">Servings</span>
              <div className="flex items-center gap-3" role="group" aria-labelledby="servings-l">
                <button type="button" className="btn btn-ghost !size-11 !p-0" aria-label="Fewer servings" disabled={servings <= 1}
                  onClick={() => setServings((s) => Math.max(1, s - 1))}><Minus className="size-4" aria-hidden="true" /></button>
                <output className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">{servings}</output>
                <button type="button" className="btn btn-ghost !size-11 !p-0" aria-label="More servings" disabled={servings >= 6}
                  onClick={() => setServings((s) => Math.min(6, s + 1))}><Plus className="size-4" aria-hidden="true" /></button>
                <span className="text-xs text-muted">Nutrition is always per serving.</span>
              </div>
            </div>
          </div>
        </details>

        <div>
          <button className="btn w-full !py-3" disabled={loading || !!blocker} aria-describedby={blocker ? "gen-hint" : undefined}>
            <Sparkles className="size-4" aria-hidden="true" />{loading ? "Cooking up ideas…" : "Generate recipe"}
          </button>
          {blocker && <p id="gen-hint" className="mt-2 text-center text-sm text-muted">{blocker}</p>}
        </div>
      </form>

      {/* Right: results */}
      <div className="space-y-4 lg:col-span-3">
        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger bg-danger-soft p-4">
            <div><p className="font-semibold">We couldn&apos;t make that recipe</p><p className="text-sm">{error}</p></div>
            <button type="button" className="btn" onClick={generate} disabled={loading || !!blocker}><RefreshCw className="size-4" aria-hidden="true" />Try again</button>
          </div>
        )}

        {loading && (
          <div className="glass animate-pulse space-y-3 p-5" aria-busy="true" aria-label="Generating recipe">
            <div className="h-6 w-2/3 rounded bg-track" />
            <div className="grid grid-cols-5 gap-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-track" />)}</div>
            <div className="h-4 w-full rounded bg-track" /><div className="h-4 w-5/6 rounded bg-track" /><div className="h-4 w-2/3 rounded bg-track" />
          </div>
        )}

        {!loading && !recipe && !error && (
          <div className="glass grid place-items-center gap-2 border-dashed p-10 text-center">
            <ChefHat className="size-10 text-fg-subtle" aria-hidden="true" />
            <p className="font-semibold">Your recipe will show up here</p>
            <p className="max-w-xs text-sm text-muted">
              Add what you have on hand and we&apos;ll build a meal that fits what&apos;s left of today&apos;s budget.
            </p>
          </div>
        )}

        {recipe && !loading && macros && (
          <motion.article key={recipe.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hero-card space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-xl font-bold">{recipe.title}</h2>
              <span className="flex items-center gap-1 text-sm text-muted">
                <Clock className="size-4" aria-hidden="true" />{recipe.prepTimeMinutes} min · {Math.round(recipe.ingredientMatchPct)}% pantry match
              </span>
            </div>
            {recipe.makes > 1 && <p className="text-sm text-muted">Makes {recipe.makes} servings. Nutrition below is per serving.</p>}
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-inset p-2 text-center">
                  <dd className="text-lg font-bold tabular-nums">{s.value}</dd>
                  <dt className="text-xs text-muted">{s.label}</dt>
                  {s.fit && (
                    <p className={`mt-0.5 text-xs ${s.fit.state === "over" ? "font-semibold text-warn" : "text-muted"}`}>
                      {s.fit.state === "on" ? "On target" : `${Math.abs(s.fit.delta)} ${s.fit.state === "over" ? "over" : "under"}`} <span className="sr-only">of ~{s.goal}</span>
                    </p>
                  )}
                </div>
              ))}
            </dl>
            <div className="grid gap-4 md:grid-cols-2">
              <div><h3 className="mb-1 font-semibold">Ingredients</h3><ul className="list-disc space-y-1 pl-5 text-sm">{recipe.ingredients.map((i, k) => <li key={k}>{i}</li>)}</ul></div>
              <div><h3 className="mb-1 font-semibold">Steps</h3><ol className="list-decimal space-y-1 pl-5 text-sm">{recipe.steps.map((s, k) => <li key={k}>{s}</li>)}</ol></div>
            </div>
            {warnings.length > 0 && (
              <ul role="alert" className="list-disc space-y-1 rounded-xl bg-warn/15 p-3 pl-7 text-sm">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}

            <p role="note" className="flex gap-2 rounded-xl bg-inset p-3 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-fg" aria-hidden="true" />
              <span>
                <b>Allergen screen:</b>{" "}
                {screened.length ? `checked against ${screened.join(", ")}` : "no allergens are listed in your profile"}.
                The screen is keyword-based and not a guarantee. Always check ingredients and labels yourself.{" "}
                <Link href="/profile" className="font-medium text-accent-fg underline">Edit allergens</Link>
              </span>
            </p>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 size-4" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              <span><b>AI-generated.</b> Nutrition values are estimates and can be inaccurate. Check ingredients against your allergies and restrictions. I&apos;ve reviewed this recipe.</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button className="btn" disabled={pending || logged || !reviewed} onClick={() => start(async () => {
                try {
                  await logMeal({ slot, title: recipe.title, ...macros });
                  setLogged(true); toast({ message: `Logged “${recipe.title}” to ${slot}.` });
                } catch (e) { toast({ tone: "error", message: e instanceof Error ? e.message : "Could not log that meal." }); }
              })}>
                {logged ? <><Check className="size-4" aria-hidden="true" />Logged to {slot}</> : pending ? "Working…" : `Log this to ${slot}`}
              </button>
              <button className="btn btn-ghost" disabled={pending || savedRecipe} onClick={() => start(async () => {
                try {
                  await saveFood({ name: recipe.title, serving: "1 serving", ...macros });
                  setSavedRecipe(true); toast({ message: "Saved to your favorites (nutrition only). Find it on the dashboard's Favorites." });
                } catch (e) { toast({ tone: "error", message: e instanceof Error ? e.message : "Could not save that recipe." }); }
              })}>
                {savedRecipe ? <><Check className="size-4" aria-hidden="true" />Saved</> : <><Bookmark className="size-4" aria-hidden="true" />Save recipe</>}
              </button>
              <button className="btn btn-ghost" disabled={loading} onClick={generate}>
                <RefreshCw className="size-4" aria-hidden="true" />Regenerate
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
              <div><label className="label" htmlFor="planDate">Or plan it for</label>
                <input id="planDate" type="date" className="input !min-h-11" value={planDate} onChange={(e) => setPlanDate(e.target.value)} /></div>
              <button className="btn btn-ghost" disabled={pending || !planDate || !reviewed} onClick={() => start(async () => {
                try {
                  await addPlanEntry({ date: planDate, slot, title: recipe.title, ...macros, ingredients: recipe.ingredients, source: "ai_recipe" });
                  setPlanned(`Added to your ${slot} plan for ${formatDate(planDate, today)}.`);
                } catch (e) { setPlanned(e instanceof Error ? e.message : "Could not add to plan."); }
              })}>Add to meal plan</button>
              {planned && <p className="text-sm" role="status">{planned}</p>}
            </div>
          </motion.article>
        )}

        {recent.length > 1 && (
          <section className="glass p-4" aria-label="Recent recipes">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <History className="size-3.5" aria-hidden="true" />Recent this session
            </h2>
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <li key={r.title}>
                  <button type="button" onClick={() => show({ ...r, makes: 1 })} aria-current={r.title === recipe?.title}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm hover:bg-surface-2">
                    <span className="font-medium">{r.title}</span>
                    <span className="shrink-0 text-muted">{r.macros.calories} kcal · {r.macros.protein}g P</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
