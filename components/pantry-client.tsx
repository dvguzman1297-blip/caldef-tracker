"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Clock, Sparkles, Check } from "lucide-react";
import { logMeal } from "@/app/actions/meals";

type Remaining = { calories: number; protein: number; fiber: number; netCarbs: number; fat: number };
type Recipe = {
  title: string; prepTimeMinutes: number; ingredients: string[]; steps: string[];
  ingredientMatchPct: number; macros: Remaining;
};
const Schema = z.object({
  pantry: z.string().min(3, "List at least one ingredient").max(500),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
});

export function PantryClient({ remaining }: { remaining: Remaining }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logged, setLogged] = useState(false);
  const [pending, start] = useTransition();
  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<z.infer<typeof Schema>>({ resolver: zodResolver(Schema), defaultValues: { slot: "lunch" } });

  async function generate(v: z.infer<typeof Schema>) {
    setLoading(true); setError(""); setRecipe(null); setLogged(false);
    try {
      const res = await fetch("/api/recipe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantry: v.pantry, remaining: {
          calories: Math.max(remaining.calories, 0), protein: Math.max(remaining.protein, 0),
          fiber: Math.max(remaining.fiber, 0), netCarbs: Math.max(remaining.netCarbs, 0), fat: Math.max(remaining.fat, 0),
        } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRecipe(json.recipe);
    } catch (e: any) { setError(e.message || "Something went wrong. Try again."); }
    finally { setLoading(false); }
  }

  const chips = recipe ? [
    ["kcal", recipe.macros.calories, "#f97316"], ["Protein", recipe.macros.protein + "g", "#8b5cf6"],
    ["Fiber", recipe.macros.fiber + "g", "#10b981"], ["Net carbs", recipe.macros.netCarbs + "g", "#0ea5e9"],
    ["Fat", recipe.macros.fat + "g", "#f59e0b"],
  ] : [];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(generate)} className="glass space-y-3 p-4">
        <label className="label" htmlFor="pantry">What's in your pantry?</label>
        <textarea id="pantry" rows={3} className="input" placeholder="chicken breast, black beans, spinach, Greek yogurt" {...register("pantry")} />
        {errors.pantry && <p className="err">{errors.pantry.message}</p>}
        <div className="flex items-center gap-3">
          <select className="input !w-auto" aria-label="Meal slot" {...register("slot")}>
            <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option><option value="snack">Snack</option>
          </select>
          <button className="btn" disabled={loading}><Sparkles className="size-4" />{loading ? "Cooking up ideas…" : "Generate recipe"}</button>
        </div>
      </form>

      {error && <p className="err" role="alert">{error}</p>}

      {loading && (
        <div className="glass animate-pulse space-y-3 p-5" aria-busy="true">
          <div className="h-6 w-2/3 rounded bg-black/10 dark:bg-white/10" />
          <div className="flex gap-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 w-16 rounded-xl bg-black/10 dark:bg-white/10" />)}</div>
          <div className="h-4 w-full rounded bg-black/10 dark:bg-white/10" /><div className="h-4 w-5/6 rounded bg-black/10 dark:bg-white/10" />
        </div>
      )}

      {recipe && (
        <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-xl font-bold">{recipe.title}</h2>
            <span className="flex items-center gap-1 text-sm opacity-70"><Clock className="size-4" />{recipe.prepTimeMinutes} min · {Math.round(recipe.ingredientMatchPct)}% pantry match</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map(([l, val, c]) => (
              <div key={String(l)} className="rounded-xl px-3 py-1.5 text-center text-sm" style={{ background: `${c}22`, color: String(c) }}>
                <b>{val}</b><div className="text-[11px] opacity-80">{l}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><h3 className="mb-1 font-semibold">Ingredients</h3><ul className="list-disc space-y-1 pl-5 text-sm">{recipe.ingredients.map((i, k) => <li key={k}>{i}</li>)}</ul></div>
            <div><h3 className="mb-1 font-semibold">Steps</h3><ol className="list-decimal space-y-1 pl-5 text-sm">{recipe.steps.map((s, k) => <li key={k}>{s}</li>)}</ol></div>
          </div>
          <button className="btn" disabled={pending || logged} onClick={() => start(async () => {
            await logMeal({ slot: watch("slot"), title: recipe.title, calories: recipe.macros.calories,
              protein: recipe.macros.protein, fiber: recipe.macros.fiber, netCarbs: recipe.macros.netCarbs, fat: recipe.macros.fat });
            setLogged(true);
          })}>
            {logged ? <><Check className="size-4" />Logged to {watch("slot")}</> : pending ? "Logging…" : `Log to ${watch("slot")}`}
          </button>
        </motion.article>
      )}
    </div>
  );
}
