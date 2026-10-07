"use server";
import { getToday } from "@/lib/today";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidDate } from "@/lib/date";
import { insertMealRow } from "@/lib/meal-store";

const Entry = z.object({
  date: z.string().refine(isValidDate, "Invalid date"),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  title: z.string().trim().min(1).max(120),
  servings: z.number().finite().min(0.25).max(20).default(1),
  calories: z.number().finite().min(0).max(3000), protein: z.number().finite().min(0).max(300),
  fiber: z.number().finite().min(0).max(150), netCarbs: z.number().finite().min(0).max(500),
  fat: z.number().finite().min(0).max(300),
  ingredients: z.array(z.string().trim().min(1).max(200)).max(40).default([]),
  source: z.enum(["manual", "saved_food", "ai_recipe"]).default("manual"),
});

async function user() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}
const refresh = () => revalidatePath("/lanes");

export async function addPlanEntry(raw: z.input<typeof Entry>) {
  const e = Entry.parse(raw);
  const { supabase, user: u } = await user();
  const { data: last } = await supabase.from("meal_plan_entries").select("position")
    .eq("user_id", u.id).eq("plan_date", e.date).eq("slot", e.slot)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("meal_plan_entries").insert({
    user_id: u.id, plan_date: e.date, slot: e.slot, position: (last?.position ?? -1) + 1,
    title: e.title, servings: e.servings, calories: Math.round(e.calories), protein_g: e.protein,
    fiber_g: e.fiber, net_carbs_g: e.netCarbs, fat_g: e.fat, ingredients: e.ingredients, source: e.source,
  });
  if (error) throw new Error(`Could not add to plan: ${error.message}`);
  refresh();
}

export async function setPlanServings(id: string, servings: number) {
  const s = z.number().finite().min(0.25).max(20).parse(servings);
  const { supabase, user: u } = await user();
  const { error } = await supabase.from("meal_plan_entries").update({ servings: s })
    .eq("id", id).eq("user_id", u.id).is("logged_meal_id", null);
  if (error) throw new Error(`Could not update servings: ${error.message}`);
  refresh();
}

/** Swaps an entry with its neighbour in the same day and slot. */
export async function movePlanEntry(id: string, dir: "up" | "down") {
  const { supabase, user: u } = await user();
  const { data: me, error } = await supabase.from("meal_plan_entries").select("id,plan_date,slot,position")
    .eq("id", id).eq("user_id", u.id).single();
  if (error) throw new Error(`Could not find entry: ${error.message}`);
  const q = supabase.from("meal_plan_entries").select("id,position").eq("user_id", u.id)
    .eq("plan_date", me.plan_date).eq("slot", me.slot);
  const { data: other } = await (dir === "up"
    ? q.lt("position", me.position).order("position", { ascending: false })
    : q.gt("position", me.position).order("position", { ascending: true })).limit(1).maybeSingle();
  if (!other) return;
  const [a, b] = await Promise.all([
    supabase.from("meal_plan_entries").update({ position: other.position }).eq("id", me.id).eq("user_id", u.id),
    supabase.from("meal_plan_entries").update({ position: me.position }).eq("id", other.id).eq("user_id", u.id),
  ]);
  if (a.error || b.error) throw new Error("Could not reorder");
  refresh();
}

export async function deletePlanEntry(id: string) {
  const { supabase, user: u } = await user();
  const { error } = await supabase.from("meal_plan_entries").delete().eq("id", id).eq("user_id", u.id);
  if (error) throw new Error(`Could not remove entry: ${error.message}`);
  refresh();
}

/** Logs a planned meal (macros × servings) to its plan date and links the two. */
export async function logPlanEntry(id: string) {
  const { supabase, user: u } = await user();
  const { data: e, error } = await supabase.from("meal_plan_entries").select("*")
    .eq("id", id).eq("user_id", u.id).single();
  if (error) throw new Error(`Could not find entry: ${error.message}`);
  if (e.logged_meal_id) throw new Error("Already logged");
  if (e.plan_date > await getToday()) throw new Error("You can only log meals planned for today or earlier.");
  const k = Number(e.servings);
  const r1 = (x: number) => Math.round(x * k * 10) / 10;
  const mealId = await insertMealRow(supabase, u.id, {
    slot: e.slot, title: e.title, calories: Math.round(e.calories * k), protein: r1(Number(e.protein_g)),
    fiber: r1(Number(e.fiber_g)), netCarbs: r1(Number(e.net_carbs_g)), fat: r1(Number(e.fat_g)),
    date: e.plan_date, source: e.source === "ai_recipe" ? "ai_recipe" : "manual",
  });
  const { error: linkErr } = await supabase.from("meal_plan_entries").update({ logged_meal_id: mealId })
    .eq("id", id).eq("user_id", u.id);
  if (linkErr) throw new Error(`Logged, but couldn't link the plan entry: ${linkErr.message}`);
  refresh(); revalidatePath("/"); revalidatePath("/history");
}
