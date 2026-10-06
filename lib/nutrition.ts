import { z } from "zod";

/** Per-meal plausibility bounds for any AI-produced nutrition numbers. */
const n = (max: number) => z.number().finite().min(0).max(max);
export const MacrosSchema = z.object({
  calories: n(2500), protein: n(200), fiber: n(80), netCarbs: n(300), fat: n(200),
});
export type Macros = z.infer<typeof MacrosSchema>;

const atwater = (m: Macros) => m.protein * 4 + (m.netCarbs + m.fiber * 0.5) * 4 + m.fat * 9;

/**
 * Validates AI macros (throws if out of bounds or incoherent) and reconciles calories with
 * the macros. `adjusted` is true when the model's calories were replaced.
 */
export function checkMacros(raw: unknown) {
  const m = { ...MacrosSchema.parse(raw) };
  const est = atwater(m);
  if (m.calories === 0 && est < 20) return { macros: m, adjusted: false }; // e.g. black coffee
  let adjusted = false;
  if (m.calories <= 0 || Math.abs(est - m.calories) / m.calories > 0.25) {
    m.calories = Math.round(est); adjusted = true;
  }
  if (m.calories > 2500) throw new Error("Implausible calories for one meal");
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    macros: { calories: Math.round(m.calories), protein: r1(m.protein), fiber: r1(m.fiber),
      netCarbs: r1(m.netCarbs), fat: r1(m.fat) },
    adjusted,
  };
}

/** Human-readable notes when a recipe doesn't fit what's left of today's targets. */
export function budgetWarnings(m: Macros, remaining: Macros) {
  const w: string[] = [];
  const over = (v: number, left: number, label: string, unit: string) => {
    const cap = Math.max(left, 0);
    if (v > cap * 1.1 + 1) w.push(`${label} is ${Math.round(v - cap)}${unit} over what you have left today.`);
  };
  over(m.calories, remaining.calories, "Calories", " kcal");
  over(m.netCarbs, remaining.netCarbs, "Net carbs", "g");
  over(m.fat, remaining.fat, "Fat", "g");
  return w;
}
