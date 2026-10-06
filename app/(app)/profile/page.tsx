import { createClient } from "@/lib/supabase/server";
import { PrivacyPanel } from "@/components/privacy-panel";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: p } = await s.from("profiles").select("*").eq("id", user!.id).single();
  const { data: m } = await s.from("health_metrics").select("deficit_pct").eq("user_id", user!.id).maybeSingle();
  return (
    <>
      <h1 className="text-2xl font-bold">Your profile</h1>
      <p className="text-sm opacity-70">Your daily targets are calculated from these details.</p>
      <ProfileForm defaults={{
        heightCm: p?.height_cm ? Number(p.height_cm) : undefined,
        currentWeightKg: p?.current_weight_kg ? Number(p.current_weight_kg) : undefined,
        targetWeightKg: p?.target_weight_kg ? Number(p.target_weight_kg) : undefined,
        age: p?.age ?? undefined, sex: p?.sex ?? undefined, activity: p?.activity_level ?? undefined,
        deficitPct: m ? Number(m.deficit_pct) : undefined,
        dietaryPreferences: (p?.dietary_preferences ?? []).join(", "),
        allergens: p?.allergens ?? [],
      }} />
      <PrivacyPanel />
    </>
  );
}
