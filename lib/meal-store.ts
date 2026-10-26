import { getToday } from "@/lib/today";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidDate } from "@/lib/date";

export const Meal = z.object({
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  title: z.string().min(1).max(120),
  calories: z.number().min(0).max(3000), protein: z.number().min(0).max(300),
  fiber: z.number().min(0).max(150), netCarbs: z.number().min(0).max(500),
  fat: z.number().min(0).max(300), date: z.string().refine(isValidDate, "Invalid date").optional(),
  source: z.enum(["manual", "ai_estimate", "ai_recipe"]).optional(),
  consumedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
});

type Db = SupabaseClient<any, "caldef", "caldef">;

/** Returns the id of the user's log for `date`, creating it if needed. */
export async function ensureDailyLog(supabase: Db, userId: string, date: string) {
  if (date > await getToday()) throw new Error("Can't log meals in the future");
  const { data: log, error } = await supabase.from("daily_logs")
    .upsert({ user_id: userId, log_date: date }, { onConflict: "user_id,log_date" })
    .select("id").single();
  if (error) throw error;
  return log.id as string;
}

const mealRow = (m: z.infer<typeof Meal>, userId: string, dailyLogId: string) => ({
  daily_log_id: dailyLogId, user_id: userId, slot: m.slot, title: m.title,
  calories: Math.round(m.calories), protein_g: m.protein, fiber_g: m.fiber,
  net_carbs_g: m.netCarbs, fat_g: m.fat, source: m.source ?? "manual",
  consumed_time: m.consumedTime || null,
});

/** Inserts one logged meal (creating the day's log if needed) and returns its id. */
export async function insertMealRow(supabase: Db, userId: string, raw: unknown) {
  const m = Meal.parse(raw);
  const logId = await ensureDailyLog(supabase, userId, m.date ?? await getToday());
  const { data: row, error } = await supabase.from("logged_meals").insert(mealRow(m, userId, logId)).select("id").single();
  if (error) throw error;
  return row.id as string;
}

/** Inserts several meals for one day in a single statement, so they all land or none do. */
export async function insertMealRows(supabase: Db, userId: string, date: string, raws: unknown[]) {
  if (!raws.length) return;
  const meals = raws.map((r) => Meal.parse(r));
  const logId = await ensureDailyLog(supabase, userId, date);
  const { error } = await supabase.from("logged_meals").insert(meals.map((m) => mealRow(m, userId, logId)));
  if (error) throw error;
}
