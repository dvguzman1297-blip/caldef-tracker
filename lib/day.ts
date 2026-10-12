import type { SupabaseClient } from "@supabase/supabase-js";
import { sumMeals } from "@/lib/totals";

export type Meal = {
  id: string; slot: "breakfast" | "lunch" | "dinner" | "snack"; title: string;
  calories: number; protein_g: number; fiber_g: number; net_carbs_g: number; fat_g: number;
  consumed_time: string | null; source: string | null;
};

export async function getDay(supabase: SupabaseClient, userId: string, date: string) {
  // One round trip: filter meals by the date of their parent log via an inner join
  const { data, error } = await supabase.from("logged_meals").select("*, daily_logs!inner(log_date)")
    .eq("user_id", userId).eq("daily_logs.log_date", date).is("deleted_at", null)
    .order("consumed_time", { nullsFirst: false }).order("created_at");
  if (error) throw new Error(`Could not load your meals: ${error.message}`);
  const meals = ((data ?? []) as (Meal & { daily_logs?: unknown })[]).map((row) => {
    const meal = { ...row };
    delete meal.daily_logs;
    return meal as Meal;
  });
  return { meals, totals: sumMeals(meals) };
}

// Carbs are tracked as NET carbs, so the net-carb target is carbs minus fiber.
export const targetsOf = (m: any) => ({
  calories: m.target_calories as number, protein: m.target_protein_g as number,
  fiber: m.target_fiber_g as number,
  netCarbs: Math.max(m.target_carbs_g - m.target_fiber_g, 0) as number,
  fat: m.target_fat_g as number,
});
