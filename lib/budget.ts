export type Slot = "breakfast" | "lunch" | "dinner" | "snack";
export const SLOTS: readonly Slot[] = ["breakfast", "lunch", "dinner", "snack"];

/** Share of the day's remaining kcal and protein that one meal in each slot aims for. */
export const MEAL_SHARE: Record<Slot, number> = { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.15 };

/** Smallest sensible meal, so a nearly spent day still produces a usable recipe target. */
export const MEAL_FLOOR: Record<Slot, { calories: number; protein: number }> = {
  breakfast: { calories: 250, protein: 15 },
  lunch: { calories: 300, protein: 20 },
  dinner: { calories: 300, protein: 20 },
  snack: { calories: 100, protein: 5 },
};

export type MealTarget = { calories: number; protein: number; overBudget: boolean };

/**
 * Target for one meal: its share of what's left today, floored at a sensible minimum.
 * The floor never exceeds what's actually left; when nothing is left the floor is used and
 * `overBudget` is set so the UI can say so.
 */
export function mealTarget(remaining: { calories: number; protein: number }, slot: Slot): MealTarget {
  const floor = MEAL_FLOOR[slot];
  const share = MEAL_SHARE[slot];
  if (remaining.calories <= 0) return { ...floor, overBudget: true };
  const cap = (floorV: number, left: number) => Math.min(floorV, Math.max(left, 0));
  const calories = Math.max(Math.round((remaining.calories * share) / 10) * 10, cap(floor.calories, remaining.calories));
  const protein = Math.max(Math.round(Math.max(remaining.protein, 0) * share), cap(floor.protein, remaining.protein));
  return { calories, protein, overBudget: false };
}

/** Meal slot suggested for a local hour (0-23): breakfast to 10:59, lunch to 14:59, snack to 16:59, dinner to 21:59. */
export function defaultSlot(hour: number): Slot {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 17) return "snack";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}
