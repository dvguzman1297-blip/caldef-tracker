import { getToday } from "@/lib/today";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDay, targetsOf } from "@/lib/day";
import { dateLabel, parseDateParam } from "@/lib/date";
import { PageShell } from "@/components/page-shell";
import { MacroSummary } from "@/components/macro-summary";
import { DayHeader } from "@/components/day-header";
import { AddItemButton } from "@/components/add-item-button";
import { QuickFab } from "@/components/quick-fab";
import { MealItem } from "@/components/meal-item";
import { WeightForm } from "@/components/weight-form";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const today = await getToday();
  const date = parseDateParam(q, today);

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
    <PageShell title="Dashboard" subtitle="Track today's calories and macros against your targets.">
      <DayHeader date={date} today={today} deficitPct={m.deficit_pct} />

      <MacroSummary isEmpty={meals.length === 0} calories={{ value: totals.calories, target: t.calories }}
        macros={[
          { id: "protein", label: "Protein", value: totals.protein, target: t.protein },
          { id: "carbs", label: "Net carbs", value: totals.netCarbs, target: t.netCarbs, overIsBad: true },
          { id: "fat", label: "Fat", value: totals.fat, target: t.fat, overIsBad: true },
          { id: "fiber", label: "Fiber", value: totals.fiber, target: t.fiber },
        ]} />

      {/* Meals by slot */}
      <section className="grid gap-3 md:grid-cols-2">
        {SLOTS.map((slot) => {
          const items = meals.filter((x) => x.slot === slot);
          return (
            <div key={slot} className="glass p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-semibold capitalize">{slot}</h2>
                <AddItemButton slot={slot} date={date} />
              </div>
              {items.length === 0 && <p className="text-sm text-muted">Nothing logged yet.</p>}
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
        <p className="mt-2 text-xs text-muted">Optional. Your trend is on the <Link href="/history" className="font-medium text-accent-fg underline">History</Link> page.</p>
      </section>

      <QuickFab date={date} />
    </PageShell>
  );
}
