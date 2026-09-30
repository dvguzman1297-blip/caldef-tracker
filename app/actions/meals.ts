"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/date";

const Meal = z.object({
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  title: z.string().min(1).max(120),
  calories: z.number().min(0).max(3000), protein: z.number().min(0).max(300),
  fiber: z.number().min(0).max(150), netCarbs: z.number().min(0).max(500),
  fat: z.number().min(0).max(300), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  source: z.string().optional(),
});

async function insertMeal(raw: unknown) {
  const m = Meal.parse(raw);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: log, error: e1 } = await supabase.from("daily_logs")
    .upsert({ user_id: user.id, log_date: m.date ?? todayStr() }, { onConflict: "user_id,log_date" })
    .select("id").single();
  if (e1) throw e1;
  const { error } = await supabase.from("logged_meals").insert({
    daily_log_id: log.id, user_id: user.id, slot: m.slot, title: m.title,
    calories: Math.round(m.calories), protein_g: m.protein, fiber_g: m.fiber,
    net_carbs_g: m.netCarbs, fat_g: m.fat, source: m.source ?? "manual",
  });
  if (error) throw error;
  revalidatePath("/"); revalidatePath("/history");
}

export async function logMeal(input: z.input<typeof Meal>) {
  await insertMeal({ ...input, source: "ai_recipe" });
}

export async function addManualMeal(fd: FormData) {
  const n = (k: string) => Number(fd.get(k) || 0);
  await insertMeal({
    slot: fd.get("slot"), title: String(fd.get("title") ?? ""),
    calories: n("calories"), protein: n("protein"), fiber: n("fiber"),
    netCarbs: n("netCarbs"), fat: n("fat"),
  });
}

export async function deleteMeal(id: string) {
  const supabase = await createClient();
  await supabase.from("logged_meals").delete().eq("id", id);
  revalidatePath("/"); revalidatePath("/history");
}
