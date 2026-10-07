import type { SupabaseClient } from "@supabase/supabase-js";
import { sumMeals } from "@/lib/totals";

export type Meal = {
  id: string; slot: "breakfast" | "lunch" | "dinner" | "snack"; title: string;
  calories: number; protein_g: number; fiber_g: number; net_carbs_g: number; fat_g: number;
  consumed_time: string | null; source: string | null;
};

export async function getDay(supabase: SupabaseClient, userId: string, date: string) {
  const { data: log, error: logErr } = await supabase.from("daily_logs").select("id")
    .eq("user_id", userId).eq("log_date", date).maybeSingle();
  if (logErr) throw new Error(`Could not load your log: ${logErr.message}`);
  let meals: Meal[] = [];
  if (log) {
    const { data, error } = await supabase.from("logged_meals").select("*")
      .eq("daily_log_id", log.id).is("deleted_at", null)
      .order("consumed_time", { nullsFirst: false }).order("created_at");
    if (error) throw new Error(`Could not load your meals: ${error.message}`);
    meals = (data as Meal[]) ?? [];
  }
  const totals = sumMeals(meals);
  return { meals, totals };
}

// Carbs are tracked as NET carbs, so the net-carb target is carbs minus fiber.
export const targetsOf = (m: any) => ({
  calories: m.target_calories as number, protein: m.target_protein_g as number,
  fiber: m.target_fiber_g as number,
  netCarbs: Math.max(m.target_carbs_g - m.target_fiber_g, 0) as number,
  fat: m.target_fat_g as number,
});
