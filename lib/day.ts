import type { SupabaseClient } from "@supabase/supabase-js";

export type Meal = {
  id: string; slot: "breakfast" | "lunch" | "dinner" | "snack"; title: string;
  calories: number; protein_g: number; fiber_g: number; net_carbs_g: number; fat_g: number;
};

export async function getDay(supabase: SupabaseClient, userId: string, date: string) {
  const { data: log } = await supabase.from("daily_logs").select("id")
    .eq("user_id", userId).eq("log_date", date).maybeSingle();
  const meals: Meal[] = log
    ? ((await supabase.from("logged_meals").select("*").eq("daily_log_id", log.id)
        .order("created_at")).data as Meal[]) ?? []
    : [];
  const totals = meals.reduce(
    (t, m) => ({
      calories: t.calories + m.calories, protein: t.protein + Number(m.protein_g),
      fiber: t.fiber + Number(m.fiber_g), netCarbs: t.netCarbs + Number(m.net_carbs_g),
      fat: t.fat + Number(m.fat_g),
    }),
    { calories: 0, protein: 0, fiber: 0, netCarbs: 0, fat: 0 }
  );
  return { meals, totals };
}

// Carbs are tracked as NET carbs, so the net-carb target is carbs minus fiber.
export const targetsOf = (m: any) => ({
  calories: m.target_calories as number, protein: m.target_protein_g as number,
  fiber: m.target_fiber_g as number,
  netCarbs: Math.max(m.target_carbs_g - m.target_fiber_g, 0) as number,
  fat: m.target_fat_g as number,
});
