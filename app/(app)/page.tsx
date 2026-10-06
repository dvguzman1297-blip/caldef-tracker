import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDay, targetsOf } from "@/lib/day";
import { todayStr, addDays, dateLabel, parseDateParam } from "@/lib/date";
import { MacroRing } from "@/components/macro-ring";
import { QuickActions } from "@/components/quick-actions";
import { MealItem } from "@/components/meal-item";
import { WeightForm } from "@/components/weight-form";
import { AddMealForm } from "@/components/add-meal-form";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
const chevron = "btn btn-ghost !h-11 !w-11 !p-0";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const today = todayStr();
  const date = parseDateParam(q, today);
  const isToday = date === today;

  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: m, error: mErr } = await s.from("health_metrics").select("*").eq("user_id", user!.id).maybeSingle();
  if (mErr) throw new Error(`Could not load your targets: ${mErr.message}`);
  if (!m) redirect("/profile");
  const t = targetsOf(m);
  const { meals, totals } = await getDay(s, user!.id, date);
  const { data: w, error: wErr } = await s.from("weight_logs").select("id,weight_kg")
    .eq("user_id", user!.id).eq("log_date", date).maybeSingle();
  if (wErr) throw new Error(`Could not load your weight: ${wErr.message}`);

  return (
    <>
      {/* Date bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={`/?date=${addDays(date, -1)}`} className={chevron} aria-label="Previous day">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1 className="min-w-44 text-center text-xl font-bold" aria-live="polite">{dateLabel(date, today)}</h1>
          {isToday ? (
            <span className={`${chevron} pointer-events-none opacity-30`} aria-hidden="true">
              <ChevronRight className="size-5" />
            </span>
          ) : (
            <Link href={`/?date=${addDays(date, 1)}`} className={chevron} aria-label="Next day">
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          )}
          {!isToday && <Link href="/" className="ml-1 text-sm underline opacity-80">Back to today</Link>}
        </div>
        <span className="rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {m.deficit_pct > 0 ? `${Math.round(m.deficit_pct * 100)}% deficit plan` : "Maintenance plan"}
        </span>
      </div>

      {/* Hero: calories */}
      <MacroRing hero label="Calories" unit="kcal" color="#f97316" overIsBad
        value={totals.calories} target={t.calories} />

      {/* Macros, 2x2 */}
      <section className="grid grid-cols-2 gap-3">
        <MacroRing label="Protein" unit="g" color="#8b5cf6" value={totals.protein} target={t.protein} />
        <MacroRing label="Fiber" unit="g" color="#10b981" value={totals.fiber} target={t.fiber} />
        <MacroRing label="Net carbs" unit="g" color="#0ea5e9" overIsBad value={totals.netCarbs} target={t.netCarbs} />
        <MacroRing label="Fat" unit="g" color="#f59e0b" overIsBad value={totals.fat} target={t.fat} />
      </section>

      {/* Meals by slot */}
      <section className="grid gap-3 md:grid-cols-2">
        {SLOTS.map((slot) => {
          const items = meals.filter((x) => x.slot === slot);
          return (
            <div key={slot} className="glass p-4">
              <h2 className="mb-2 font-semibold capitalize">{slot}</h2>
              {items.length === 0 && <p className="text-sm opacity-60">Nothing logged yet.</p>}
              <ul className="space-y-2">
                {items.map((x) => <MealItem key={x.id} meal={x} />)}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="glass p-4" aria-label="Weight">
        <WeightForm date={date} label={dateLabel(date, today)}
          current={w ? { id: w.id, kg: Number(w.weight_kg) } : undefined} />
        <p className="mt-2 text-xs opacity-70">Optional. Your trend is on the <Link href="/history" className="underline">History</Link> page.</p>
      </section>

      <QuickActions />
      <AddMealForm date={date} />
    </>
  );
}