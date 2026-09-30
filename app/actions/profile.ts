"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeTargets } from "@/lib/health";

const ProfileSchema = z.object({
    heightCm: z.number().min(100).max(250),
  currentWeightKg: z.number().min(30).max(300),
  targetWeightKg: z.number().min(30).max(300),
  age: z.number().int().min(14).max(100),
  sex: z.enum(["male", "female"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  deficitPct: z.number().min(0.1).max(0.25),
  dietaryPreferences: z.string().max(300),
});

export async function saveProfile(raw: z.input<typeof ProfileSchema>) {
  const p = ProfileSchema.parse(raw);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const prefs = p.dietaryPreferences.split(",").map((x) => x.trim()).filter(Boolean);
  const { error: e1 } = await supabase.from("profiles").update({
    height_cm: p.heightCm, current_weight_kg: p.currentWeightKg, target_weight_kg: p.targetWeightKg,
    age: p.age, sex: p.sex, activity_level: p.activity, dietary_preferences: prefs,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  if (e1) throw e1;

  // Targets are always recomputed server-side, never trusted from the client
  const t = computeTargets({
    weightKg: p.currentWeightKg, targetWeightKg: p.targetWeightKg, heightCm: p.heightCm,
    age: p.age, sex: p.sex, activity: p.activity, deficitPct: p.deficitPct,
  });
  const { error: e2 } = await supabase.from("health_metrics").upsert({
    user_id: user.id, bmr: t.bmr, tdee: t.tdee, target_calories: t.targetCalories,
    target_protein_g: t.targetProteinG, target_fiber_g: t.targetFiberG,
    target_carbs_g: t.targetCarbsG, target_fat_g: t.targetFatG,
    deficit_pct: t.deficitPct, computed_at: new Date().toISOString(),
  });
  if (e2) throw e2;
  revalidatePath("/", "layout");
}
