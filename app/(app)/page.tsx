import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDay, targetsOf } from "@/lib/day";
import { addDays, dateLabel, parseDateParam } from "@/lib/date";
import { buildPicks, type PickRow, type QuickPick } from "@/lib/quick-picks";
import { getToday } from "@/lib/today";
import { DayHeader } from "@/components/day-header";
import { DayView } from "@/components/day-view";
import { PageShell } from "@/components/page-shell";
import { WeightForm } from "@/components/weight-form";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const today = await getToday();
  const date = parseDateParam(q, today);
  const previousDate = addDays(date, -1);

  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const uid = user!.id;
  const [metricsRes, day, previous, weightsRes, historyRes, foodsRes] = await Promise.all([
    s.from("health_metrics").select("*").eq("user_id", uid).maybeSingle(),
    getDay(s, uid, date),
    getDay(s, uid, previousDate),
    s.from("weight_logs").select("id,log_date,weight_kg").eq("user_id", uid)
      .lte("log_date", date).order("log_date", { ascending: false }).limit(2),
    s.from("logged_meals").select("title,calories,protein_g,fiber_g,net_carbs_g,fat_g,daily_logs!inner(log_date)")
      .eq("user_id", uid).is("deleted_at", null)
      .gte("daily_logs.log_date", addDays(date, -60)).lte("daily_logs.log_date", date).limit(500),
    s.from("saved_foods").select("name,calories,protein_g,fiber_g,net_carbs_g,fat_g").eq("user_id", uid).order("name").limit(12),
  ]);
  if (metricsRes.error) throw new Error(`Could not load your targets: ${metricsRes.error.message}`);
  if (!metricsRes.data) redirect("/profile");
  if (weightsRes.error) throw new Error(`Could not load your weight: ${weightsRes.error.message}`);
  const m = metricsRes.data;

  // Quick picks are a convenience: if the history query fails the rest of the page still works
  const rows: PickRow[] = ((historyRes.data ?? []) as unknown as (Omit<PickRow, "date"> & { daily_logs: { log_date: string } })[])
    .map(({ daily_logs, ...r }) => ({ ...r, date: daily_logs.log_date }));
  const { recent, frequent } = buildPicks(rows);
  const favorites: QuickPick[] = (foodsRes.data ?? []).map((f) => ({
    title: f.name, calories: f.calories, protein: Number(f.protein_g), fiber: Number(f.fiber_g),
    netCarbs: Number(f.net_carbs_g), fat: Number(f.fat_g), count: 0, lastDate: "",
  }));

  const [first, second] = weightsRes.data ?? [];
  const w = first?.log_date === date ? first : undefined;
  const prev = w ? second : first;

  return (
    <PageShell title="Dashboard" subtitle="Track today's calories and macros against your targets.">
      <DayHeader date={date} today={today} deficitPct={m.deficit_pct} />

      <DayView date={date} meals={day.meals} targets={targetsOf(m)} recent={recent} frequent={frequent} favorites={favorites}
        previousDate={previousDate} previousMeals={previous.meals} />

      <section className="glass p-4" aria-label="Weight">
        <WeightForm date={date} today={today} label={dateLabel(date, today)}
          current={w ? { id: w.id, kg: Number(w.weight_kg) } : undefined}
          previous={prev ? { kg: Number(prev.weight_kg), date: prev.log_date } : undefined} />
        <p className="mt-3 text-xs text-muted">Your trend is on the <Link href="/history" className="font-medium text-accent-fg underline">History</Link> page.</p>
      </section>
    </PageShell>
  );
}
