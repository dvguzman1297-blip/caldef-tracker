"use client";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ChefHat, Clock, Sparkles, Check, History } from "lucide-react";
import { logMeal } from "@/app/actions/meals";
import { addPlanEntry } from "@/app/actions/plan";
import { TagInput } from "@/components/ui/tag-input";

type Remaining = { calories: number; protein: number; fiber: number; netCarbs: number; fat: number };
type Recipe = {
  title: string; prepTimeMinutes: number; ingredients: string[]; steps: string[];
  ingredientMatchPct: number; macros: Remaining;
};

const SUGGESTIONS = ["Chicken breast", "Eggs", "Spinach", "Greek yogurt", "Black beans", "Salmon", "Broccoli", "Oats"];
const PANTRY_LIMIT = 500; // matches the /api/recipe input schema

const Schema = z.object({
  pantry: z.array(z.string()).min(1, "Add at least one ingredient")
    .refine((a) => a.join(", ").length >= 3, "Ingredient names are too short")
    .refine((a) => a.join(", ").length <= PANTRY_LIMIT, "That's too many ingredients. Remove a few."),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
});
type Form = z.infer<typeof Schema>;

export function PantryClient({ remaining }: { remaining: Remaining }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recent, setRecent] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logged, setLogged] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [planDate, setPlanDate] = useState("");
  const [planned, setPlanned] = useState("");
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, watch, formState: { errors } } =
    useForm<Form>({ resolver: zodResolver(Schema), defaultValues: { slot: "lunch", pantry: [] } });
  const slot = watch("slot");

  function show(r: Recipe, w: string[] = []) {
    setRecipe(r); setWarnings(w); setLogged(false); setReviewed(false); setPlanned(""); setError("");
  }

  async function generate(v: Form) {
    setLoading(true); setError(""); setRecipe(null); setLogged(false); setWarnings([]); setReviewed(false); setPlanned("");
    try {
      const res = await fetch("/api/recipe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantry: v.pantry.join(", "), remaining: {
          calories: Math.max(remaining.calories, 0), protein: Math.max(remaining.protein, 0),
          fiber: Math.max(remaining.fiber, 0), netCarbs: Math.max(remaining.netCarbs, 0), fat: Math.max(remaining.fat, 0),
        } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      show(json.recipe, json.warnings ?? []);
      setRecent((p) => [json.recipe as Recipe, ...p.filter((x) => x.title !== json.recipe.title)].slice(0, 5));
    } catch (e: any) { setError(e.message || "Something went wrong. Try again."); }
    finally { setLoading(false); }
  }

  const stats = recipe ? [
    ["kcal", recipe.macros.calories], ["Protein", `${recipe.macros.protein}g`],
    ["Fiber", `${recipe.macros.fiber}g`], ["Net carbs", `${recipe.macros.netCarbs}g`], ["Fat", `${recipe.macros.fat}g`],
  ] : [];

  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
      {/* Left: inputs */}
      <form onSubmit={handleSubmit(generate)} className="glass space-y-4 p-4 sm:p-5 lg:sticky lg:top-24 lg:col-span-2">
        <Controller control={control} name="pantry" render={({ field }) => (
          <TagInput label="What's in your pantry?" value={field.value} onChange={field.onChange}
            placeholder="Type an ingredient, press Enter" suggestions={SUGGESTIONS}
            maxTagLength={30} error={errors.pantry?.message ?? errors.pantry?.root?.message} />
        )} />
        <div>
          <label className="label" htmlFor="slot">Meal</label>
          <select id="slot" className="input" {...register("slot")}>
            <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option><option value="snack">Snack</option>
          </select>
        </div>
        <button className="btn w-full !py-3" disabled={loading}>
          <Sparkles className="size-4" aria-hidden="true" />{loading ? "Cooking up ideas…" : "Generate recipe"}
        </button>
      </form>

      {/* Right: results */}
      <div className="space-y-4 lg:col-span-3">
        {error && <p className="err rounded-xl bg-danger-soft p-3 !text-sm" role="alert">{error}</p>}

        {loading && (
          <div className="glass animate-pulse space-y-3 p-5" aria-busy="true" aria-label="Generating recipe">
            <div className="h-6 w-2/3 rounded bg-track" />
            <div className="flex gap-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 w-16 rounded-xl bg-track" />)}</div>
            <div className="h-4 w-full rounded bg-track" /><div className="h-4 w-5/6 rounded bg-track" />
          </div>
        )}

        {!loading && !recipe && !error && (
          <div className="glass grid place-items-center gap-2 border-dashed p-10 text-center">
            <ChefHat className="size-10 text-fg-subtle" aria-hidden="true" />
            <p className="font-semibold">Your recipe will show up here</p>
            <p className="max-w-xs text-sm text-muted">
              Add what you have on hand and we&apos;ll build one serving that fits what&apos;s left of today&apos;s budget.
            </p>
          </div>
        )}

        {recipe && (
          <motion.article key={recipe.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="glass space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-xl font-bold">{recipe.title}</h2>
              <span className="flex items-center gap-1 text-sm text-muted">
                <Clock className="size-4" aria-hidden="true" />{recipe.prepTimeMinutes} min · {Math.round(recipe.ingredientMatchPct)}% pantry match
              </span>
            </div>
            <dl className="grid grid-cols-5 gap-2">
              {stats.map(([l, v]) => (
                <div key={l} className="rounded-xl bg-inset p-2 text-center">
                  <dd className="font-bold">{v}</dd>
                  <dt className="text-[11px] text-muted">{l}</dt>
                </div>
              ))}
            </dl>
            <div className="grid gap-4 md:grid-cols-2">
              <div><h3 className="mb-1 font-semibold">Ingredients</h3><ul className="list-disc space-y-1 pl-5 text-sm">{recipe.ingredients.map((i, k) => <li key={k}>{i}</li>)}</ul></div>
              <div><h3 className="mb-1 font-semibold">Steps</h3><ol className="list-decimal space-y-1 pl-5 text-sm">{recipe.steps.map((s, k) => <li key={k}>{s}</li>)}</ol></div>
            </div>
            {warnings.length > 0 && (
              <ul role="alert" className="list-disc space-y-1 rounded-xl bg-amber-500/15 p-3 pl-7 text-sm">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              <span><b>AI-generated.</b> Nutrition values are estimates and can be inaccurate. Check ingredients against your allergies and restrictions. I&apos;ve reviewed this recipe.</span>
            </label>
            <button className="btn" disabled={pending || logged || !reviewed} onClick={() => start(async () => {
              await logMeal({ slot, title: recipe.title, calories: recipe.macros.calories,
                protein: recipe.macros.protein, fiber: recipe.macros.fiber, netCarbs: recipe.macros.netCarbs, fat: recipe.macros.fat });
              setLogged(true);
            })}>
              {logged ? <><Check className="size-4" />Logged to {slot}</> : pending ? "Logging…" : `Log to ${slot}`}
            </button>
            <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
              <div><label className="label" htmlFor="planDate">Or plan it for</label>
                <input id="planDate" type="date" className="input" value={planDate} onChange={(e) => setPlanDate(e.target.value)} /></div>
              <button className="btn btn-ghost" disabled={pending || !planDate || !reviewed} onClick={() => start(async () => {
                try {
                  await addPlanEntry({ date: planDate, slot, title: recipe.title, calories: recipe.macros.calories,
                    protein: recipe.macros.protein, fiber: recipe.macros.fiber, netCarbs: recipe.macros.netCarbs, fat: recipe.macros.fat,
                    ingredients: recipe.ingredients, source: "ai_recipe" });
                  setPlanned(`Added to your ${slot} plan for ${planDate}.`);
                } catch (e: any) { setPlanned(e.message || "Could not add to plan."); }
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
                  <button type="button" onClick={() => show(r)} aria-current={r.title === recipe?.title}
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
