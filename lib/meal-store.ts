import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayStr, isValidDate } from "@/lib/date";

export const Meal = z.object({
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  title: z.string().min(1).max(120),
  calories: z.number().min(0).max(3000), protein: z.number().min(0).max(300),
  fiber: z.number().min(0).max(150), netCarbs: z.number().min(0).max(500),
  fat: z.number().min(0).max(300), date: z.string().refine(isValidDate, "Invalid date").optional(),
  source: z.enum(["manual", "ai_estimate", "ai_recipe"]).optional(),
  consumedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
});

/** Inserts one logged meal (creating the day's log if needed) and returns its id. */
export async function insertMealRow(supabase: SupabaseClient, userId: string, raw: unknown) {
  const m = Meal.parse(raw);
  if (m.date && m.date > todayStr()) throw new Error("Can't log meals in the future");
  const user = { id: userId };
  const { data: log, error: e1 } = await supabase.from("daily_logs")
    .upsert({ user_id: user.id, log_date: m.date ?? todayStr() }, { onConflict: "user_id,log_date" })
    .select("id").single();
  if (e1) throw e1;
  const { data: row, error } = await supabase.from("logged_meals").insert({
    daily_log_id: log.id, user_id: user.id, slot: m.slot, title: m.title,
    calories: Math.round(m.calories), protein_g: m.protein, fiber_g: m.fiber,
    net_carbs_g: m.netCarbs, fat_g: m.fat, source: m.source ?? "manual",
    consumed_time: m.consumedTime || null,
  }).select("id").single();
  if (error) throw error;
  return row.id as string;
}
