import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { targetsOf } from "@/lib/day";
import { todayStr, addDays, dateLabel, isValidDate } from "@/lib/date";
import { PlanDay, type PlanEntry, type SavedFood } from "@/components/plan-day";

const chevron = "btn btn-ghost !h-11 !w-11 !p-0";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const today = todayStr();
  const date = isValidDate(q) ? q : today; // planning may look ahead, so future dates are fine
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();

  const [metricsRes, weekRes, foodsRes] = await Promise.all([
    s.from("health_metrics").select("*").eq("user_id", user!.id).maybeSingle(),
    s.from("meal_plan_entries").select("*").eq("user_id", user!.id)
      .gte("plan_date", date).lte("plan_date", addDays(date, 6)).order("position"),
    s.from("saved_foods").select("id,name,serving,calories,protein_g,fiber_g,net_carbs_g,fat_g").eq("user_id", user!.id).order("name"),
  ]);
  for (const r of [metricsRes, weekRes, foodsRes]) if (r.error) throw new Error(`Could not load your plan: ${r.error.message}`);
  if (!metricsRes.data) redirect("/profile");
  const t = targetsOf(metricsRes.data);

  const week = (weekRes.data ?? []) as any[];
  const entries: PlanEntry[] = week.filter((e) => e.plan_date === date).map((e) => ({
    id: e.id, slot: e.slot, title: e.title, servings: Number(e.servings), calories: e.calories,
    protein: Number(e.protein_g), fiber: Number(e.fiber_g), netCarbs: Number(e.net_carbs_g), fat: Number(e.fat_g),
    logged: !!e.logged_meal_id, source: e.source,
  }));

  // Shopping list: ingredients of every not-yet-logged planned meal in the next 7 days (deduplicated)
  const shopping = new Map<string, string>();
  for (const e of week) if (!e.logged_meal_id) for (const i of e.ingredients as string[]) shopping.set(i.trim().toLowerCase(), i.trim());

  return (
    <>
      <h1 className="text-2xl font-bold">Meal Planning</h1>
      <div className="flex items-center gap-1">
        <Link href={`/lanes?date=${addDays(date, -1)}`} className={chevron} aria-label="Previous day"><ChevronLeft className="size-5" aria-hidden="true" /></Link>
        <h2 className="min-w-44 text-center text-lg font-bold" aria-live="polite">{dateLabel(date, today)}</h2>
        <Link href={`/lanes?date=${addDays(date, 1)}`} className={chevron} aria-label="Next day"><ChevronRight className="size-5" aria-hidden="true" /></Link>
        {date !== today && <Link href="/lanes" className="ml-1 text-sm underline opacity-80">Today</Link>}
      </div>
      <PlanDay date={date} canLog={date <= today} entries={entries} foods={(foodsRes.data ?? []) as SavedFood[]} targets={t} />

      <section className="glass p-4">
        <h2 className="mb-2 font-semibold">Shopping list ({dateLabel(date, today)} + 6 days)</h2>
        {shopping.size === 0 ? (
          <p className="text-sm opacity-60">Ingredients from planned recipes appear here. Add recipes from the <Link href="/recipes" className="underline">Recipes</Link> page.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">{[...shopping.values()].map((i) => <li key={i}>{i}</li>)}</ul>
        )}
      </section>
    </>
  );
}
