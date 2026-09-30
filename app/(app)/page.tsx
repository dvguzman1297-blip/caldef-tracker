import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDay, targetsOf } from "@/lib/day";
import { todayStr, addDays, dateLabel } from "@/lib/date";
import { deleteMeal } from "@/app/actions/meals";
import { MacroRing } from "@/components/macro-ring";
import { QuickActions } from "@/components/quick-actions";
import { AddMealForm } from "@/components/add-meal-form";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
const chevron = "btn btn-ghost !h-11 !w-11 !p-0";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const today = todayStr();
  const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) && q <= today ? q : today;
  const isToday = date === today;

  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: m } = await s.from("health_metrics").select("*").eq("user_id", user!.id).maybeSingle();
  if (!m) redirect("/profile");
  const t = targetsOf(m);
  const { meals, totals } = await getDay(s, user!.id, date);

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
          {Math.round(m.deficit_pct * 100)}% deficit plan
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
                {items.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="font-medium">{x.title}</span>
                      <span className="block text-xs opacity-70">
                        {x.calories.toLocaleString("en-US")} kcal · {x.protein_g}g P · {x.fiber_g}g F · {x.net_carbs_g}g NC · {x.fat_g}g fat
                      </span>
                    </span>
                    <form action={deleteMeal.bind(null, x.id)}>
                      <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label={`Delete ${x.title}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <QuickActions />
      <AddMealForm date={date} />
    </>
  );
}