"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/date";
import { Meal, insertMealRow } from "@/lib/meal-store";

async function insertMeal(raw: unknown) {
  const { supabase, user } = await requireUser();
  await insertMealRow(supabase, user.id, raw);
  refresh();
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
    date: (fd.get("date") as string) || undefined,
    source: fd.get("source") === "ai_estimate" ? "ai_estimate" : "manual",
    consumedTime: (fd.get("consumedTime") as string) || null,
  });
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

const refresh = () => { revalidatePath("/"); revalidatePath("/history"); };

export async function updateMeal(id: string, raw: unknown) {
  const m = Meal.omit({ date: true, source: true }).parse(raw);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("logged_meals").update({
    slot: m.slot, title: m.title, calories: Math.round(m.calories), protein_g: m.protein,
    fiber_g: m.fiber, net_carbs_g: m.netCarbs, fat_g: m.fat, consumed_time: m.consumedTime || null,
  }).eq("id", id).eq("user_id", user.id).is("deleted_at", null);
  if (error) throw new Error(`Could not update meal: ${error.message}`);
  refresh();
}

/** Copies a meal into the given day (default today), e.g. to repeat yesterday's breakfast. */
export async function duplicateMeal(id: string, date?: string) {
  const { supabase, user } = await requireUser();
  const { data: src, error } = await supabase.from("logged_meals").select("*")
    .eq("id", id).eq("user_id", user.id).is("deleted_at", null).single();
  if (error) throw new Error(`Could not find meal: ${error.message}`);
  await insertMeal({
    slot: src.slot, title: src.title, calories: src.calories, protein: Number(src.protein_g),
    fiber: Number(src.fiber_g), netCarbs: Number(src.net_carbs_g), fat: Number(src.fat_g),
    source: src.source ?? "manual", date: date ?? todayStr(), consumedTime: null,
  });
}

/** Soft delete so the UI can offer undo. */
export async function deleteMeal(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("logged_meals")
    .update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(`Could not delete meal: ${error.message}`);
  refresh();
}

export async function restoreMeal(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("logged_meals")
    .update({ deleted_at: null }).eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(`Could not restore meal: ${error.message}`);
  refresh();
}
