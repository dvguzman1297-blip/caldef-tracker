"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FAT_PCT, PROTEIN_PER_KG, computeTargets } from "@/lib/health";
import { ALLERGEN_KEYS } from "@/lib/allergens";

const ProfileSchema = z.object({
  heightCm: z.number().min(100).max(250),
  currentWeightKg: z.number().min(30).max(300),
  targetWeightKg: z.number().min(30).max(300),
  age: z.number().int().min(14).max(100),
  sex: z.enum(["male", "female"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  deficitPct: z.number().min(0.1).max(0.25),
  // Macro split (optional; defaults apply when omitted)
  proteinPerKg: z.number().min(PROTEIN_PER_KG.min).max(PROTEIN_PER_KG.max).optional(),
  fatPct: z.number().min(FAT_PCT.min).max(FAT_PCT.max).optional(),
  dietaryPreferences: z.string().max(300),
  allergens: z.array(z.enum(ALLERGEN_KEYS as [string, ...string[]])).max(ALLERGEN_KEYS.length),
  // Answered on every save and deliberately not stored; only the resulting targets are.
  pregnantOrNursing: z.boolean(),
  eatingDisorderRisk: z.boolean(),
  medicalCondition: z.boolean(),
});

export async function saveProfile(raw: z.input<typeof ProfileSchema>) {
  const p = ProfileSchema.parse(raw);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const prefs = p.dietaryPreferences.split(",").map((x) => x.trim()).filter(Boolean);

  // Targets are always recomputed server-side, never trusted from the client
  const t = computeTargets({
    weightKg: p.currentWeightKg, targetWeightKg: p.targetWeightKg, heightCm: p.heightCm,
    age: p.age, sex: p.sex, activity: p.activity, deficitPct: p.deficitPct,
    proteinPerKg: p.proteinPerKg, fatPct: p.fatPct,
    screening: {
      pregnantOrNursing: p.pregnantOrNursing, eatingDisorderRisk: p.eatingDisorderRisk,
      medicalCondition: p.medicalCondition,
    },
  });
  // One transactional RPC (supabase/migrations/0002_atomic_profile.sql): profile and targets
  // commit together or not at all.
  const { error } = await supabase.rpc("save_profile_and_targets", {
    p_height_cm: p.heightCm, p_current_weight_kg: p.currentWeightKg, p_target_weight_kg: p.targetWeightKg,
    p_age: p.age, p_sex: p.sex, p_activity_level: p.activity, p_dietary_preferences: prefs, p_allergens: p.allergens,
    p_bmr: t.bmr, p_tdee: t.tdee, p_target_calories: t.targetCalories,
    p_target_protein_g: t.targetProteinG, p_target_fiber_g: t.targetFiberG,
    p_target_carbs_g: t.targetCarbsG, p_target_fat_g: t.targetFatG, p_deficit_pct: t.deficitPct,
  });
  if (error) throw new Error(`Could not save profile: ${error.message}`);
  revalidatePath("/", "layout");
}

const DietarySchema = z.object({
  dietaryPreferences: z.string().max(300),
  allergens: z.array(z.enum(ALLERGEN_KEYS as [string, ...string[]])).max(ALLERGEN_KEYS.length),
});

/**
 * Updates only dietary text and allergens. Targets are NOT recomputed, so the health check (which is
 * never stored) isn't needed and an existing no-deficit result can't be silently overwritten.
 */
export async function saveDietary(raw: z.input<typeof DietarySchema>) {
  const d = DietarySchema.parse(raw);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const prefs = d.dietaryPreferences.split(",").map((x) => x.trim()).filter(Boolean);
  const { error } = await supabase.from("profiles")
    .update({ dietary_preferences: prefs, allergens: d.allergens, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) throw new Error(`Could not save preferences: ${error.message}`);
  revalidatePath("/", "layout");
}
