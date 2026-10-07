import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDay, targetsOf } from "@/lib/day";
import { todayStr } from "@/lib/date";
import { PantryClient } from "@/components/pantry-client";

export default async function RecipesPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: m } = await s.from("health_metrics").select("*").eq("user_id", user!.id).maybeSingle();
  if (!m) redirect("/profile");
  const t = targetsOf(m);
  const { totals } = await getDay(s, user!.id, todayStr());
  const remaining = {
    calories: t.calories - totals.calories, protein: t.protein - totals.protein,
    fiber: t.fiber - totals.fiber, netCarbs: t.netCarbs - totals.netCarbs, fat: t.fat - totals.fat,
  };
  return (
    <>
      <h1 className="text-2xl font-bold">Pantry to plate</h1>
      <p className="text-sm text-muted">
        Recipes are tuned to what you have left today: {Math.max(Math.round(remaining.calories), 0)} kcal and {Math.max(Math.round(remaining.protein), 0)}g protein.
      </p>
      <PantryClient remaining={remaining} />
    </>
  );
}
