import type { Meal } from "@/lib/day";

export type MacroTotals = { calories: number; protein: number; fiber: number; netCarbs: number; fat: number };

type Row = Pick<Meal, "calories" | "protein_g" | "fiber_g" | "net_carbs_g" | "fat_g">;

/** Sums a day's meals. DB numerics can arrive as strings, hence Number(). */
export const sumMeals = (meals: Row[]): MacroTotals =>
  meals.reduce(
    (t, m) => ({
      calories: t.calories + Number(m.calories), protein: t.protein + Number(m.protein_g),
      fiber: t.fiber + Number(m.fiber_g), netCarbs: t.netCarbs + Number(m.net_carbs_g), fat: t.fat + Number(m.fat_g),
    }),
    { calories: 0, protein: 0, fiber: 0, netCarbs: 0, fat: 0 },
  );

/** Whole kcal left for the day (negative once over). */
export const caloriesLeft = (target: number, eaten: number) => Math.round(target - eaten);

/** Progress as a 0..n fraction; 0 when the target is missing. */
export const fraction = (value: number, target: number) => (target > 0 ? value / target : 0);
