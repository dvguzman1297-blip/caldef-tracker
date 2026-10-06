"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Food = z.object({
  name: z.string().trim().min(1).max(120),
  serving: z.string().trim().min(1).max(80).default("1 serving"),
  calories: z.number().finite().min(0).max(3000), protein: z.number().finite().min(0).max(300),
  fiber: z.number().finite().min(0).max(150), netCarbs: z.number().finite().min(0).max(500),
  fat: z.number().finite().min(0).max(300),
});

async function user() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

/** Saves a reusable food/meal. Numbers are the user's own (provenance: user_entered). */
export async function saveFood(raw: z.input<typeof Food>) {
  const f = Food.parse(raw);
  const { supabase, user: u } = await user();
  const { error } = await supabase.from("saved_foods").insert({
    user_id: u.id, name: f.name, serving: f.serving, calories: Math.round(f.calories),
    protein_g: f.protein, fiber_g: f.fiber, net_carbs_g: f.netCarbs, fat_g: f.fat,
    provenance: "user_entered",
  });
  if (error) throw new Error(`Could not save food: ${error.message}`);
}

export async function deleteFood(id: string) {
  const { supabase, user: u } = await user();
  const { error } = await supabase.from("saved_foods").delete().eq("id", id).eq("user_id", u.id);
  if (error) throw new Error(`Could not delete food: ${error.message}`);
}
