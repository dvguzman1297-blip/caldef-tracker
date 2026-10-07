import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDay, targetsOf } from "@/lib/day";
import { getToday } from "@/lib/today";
import { PageShell } from "@/components/page-shell";
import { PantryClient } from "@/components/pantry-client";

export default async function RecipesPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: m } = await s.from("health_metrics").select("*").eq("user_id", user!.id).maybeSingle();
  if (!m) redirect("/profile");
  const t = targetsOf(m);
  const today = await getToday();
  const { totals } = await getDay(s, user!.id, today);
  const remaining = {
    calories: t.calories - totals.calories, protein: t.protein - totals.protein,
    fiber: t.fiber - totals.fiber, netCarbs: t.netCarbs - totals.netCarbs, fat: t.fat - totals.fat,
  };
  return (
    <PageShell title="Pantry to plate"
      subtitle={`One-serving recipes sized for a single meal. Left today: ${Math.max(Math.round(remaining.calories), 0).toLocaleString("en-US")} kcal, ${Math.max(Math.round(remaining.protein), 0)}g protein.`}>
      <PantryClient remaining={remaining} today={today} />
    </PageShell>
  );
}
