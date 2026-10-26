import { requireAuth } from "@/lib/auth";
import { inferSplit } from "@/lib/health";
import { getToday } from "@/lib/today";
import { OnboardingSteps } from "@/components/onboarding";
import { PageShell } from "@/components/page-shell";
import { PrivacyPanel } from "@/components/privacy-panel";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const { supabase: s, uid } = await requireAuth();
  const { data: p } = await s.from("profiles").select("*").eq("id", uid).single();
  const { data: m } = await s.from("health_metrics").select("*").eq("user_id", uid).maybeSingle();
  const today = await getToday();

  const weight = p?.current_weight_kg ? Number(p.current_weight_kg) : undefined;
  const height = p?.height_cm ? Number(p.height_cm) : undefined;
  // The macro split isn't stored, so recover it from the saved targets
  const split = m && weight && height
    ? inferSplit({ proteinG: m.target_protein_g, fatG: m.target_fat_g, calories: m.target_calories, weightKg: weight, heightCm: height })
    : undefined;

  return (
    <PageShell wide title={m ? "Your profile" : "Welcome to CalDef"}
      subtitle={m ? "Your daily targets are calculated from these details." : "Step 1 of 3: tell us about you and we'll calculate your daily targets."}>
      {!m && <OnboardingSteps current={1} />}
      <ProfileForm today={today} isNew={!m}
        saved={m ? {
          calories: m.target_calories, protein: m.target_protein_g, fiber: m.target_fiber_g,
          carbs: m.target_carbs_g, fat: m.target_fat_g, bmr: Number(m.bmr), tdee: Number(m.tdee),
        } : null}
        defaults={{
          heightCm: height, currentWeightKg: weight,
          targetWeightKg: p?.target_weight_kg ? Number(p.target_weight_kg) : undefined,
          age: p?.age ?? undefined, sex: p?.sex ?? undefined, activity: p?.activity_level ?? undefined,
          deficitPct: m ? Number(m.deficit_pct) : undefined, ...split,
          calorieMode: m?.is_custom_target ? "custom" : "recommended",
          customKcal: m?.is_custom_target ? String(m.target_calories) : "",
          dietaryPreferences: (p?.dietary_preferences ?? []).join(", "),
          allergens: p?.allergens ?? [],
        }} />
      <PrivacyPanel />
    </PageShell>
  );
}
