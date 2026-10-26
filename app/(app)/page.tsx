import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getDay, targetsOf } from "@/lib/day";
import { addDays, dateLabel, formatDay, parseDateParam } from "@/lib/date";
import { formatChange, weightChange } from "@/lib/weight";
import { buildPicks, type PickRow, type QuickPick } from "@/lib/quick-picks";
import { getToday } from "@/lib/today";
import { DayHeader } from "@/components/day-header";
import { DayView } from "@/components/day-view";
import { FastingCard } from "@/components/fasting-card";
import { OnboardingCard } from "@/components/onboarding";
import { PageShell } from "@/components/page-shell";
import { WeightForm } from "@/components/weight-form";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const today = await getToday();
  const date = parseDateParam(q, today);
  const previousDate = addDays(date, -1);

  const { supabase: s, uid } = await requireAuth();
  const [metricsRes, day, previous, weightsRes, historyRes, foodsRes, fastsRes] = await Promise.all([
    s.from("health_metrics").select("*").eq("user_id", uid).maybeSingle(),
    getDay(s, uid, date),
    getDay(s, uid, previousDate),
    s.from("weight_logs").select("id,log_date,weight_kg").eq("user_id", uid)
      .lte("log_date", date).order("log_date", { ascending: false }).limit(2),
    s.from("logged_meals").select("title,calories,protein_g,fiber_g,net_carbs_g,fat_g,daily_logs!inner(log_date)")
      .eq("user_id", uid).is("deleted_at", null)
      .gte("daily_logs.log_date", addDays(date, -60)).lte("daily_logs.log_date", date).limit(500),
    s.from("saved_foods").select("name,calories,protein_g,fiber_g,net_carbs_g,fat_g").eq("user_id", uid).order("name").limit(12),
    s.from("fasts").select("id,started_at,ended_at,target_hours").eq("user_id", uid)
      .order("started_at", { ascending: false }).limit(8),
  ]);
  if (metricsRes.error) throw new Error(`Could not load your targets: ${metricsRes.error.message}`);
  if (!metricsRes.data) redirect("/profile");
  if (weightsRes.error) throw new Error(`Could not load your weight: ${weightsRes.error.message}`);
  const m = metricsRes.data;

  // Quick picks are a convenience: if the history query fails the rest of the page still works
  const rows: PickRow[] = ((historyRes.data ?? []) as unknown as (Omit<PickRow, "date"> & { daily_logs: { log_date: string } })[])
    .map(({ daily_logs, ...r }) => ({ ...r, date: daily_logs.log_date }));
  const { recent, frequent } = buildPicks(rows);
  // Brand-new user: a profile but no meal logged anywhere in the window, viewing today
  const firstRun = date === today && !historyRes.error && rows.length === 0 && day.meals.length === 0;
  const favorites: QuickPick[] = (foodsRes.data ?? []).map((f) => ({
    title: f.name, calories: f.calories, protein: Number(f.protein_g), fiber: Number(f.fiber_g),
    netCarbs: Number(f.net_carbs_g), fat: Number(f.fat_g), count: 0, lastDate: "",
  }));

  // Fasting is optional: if its table is missing (migration 0008 not applied) the dashboard still works without the card
  if (fastsRes.error) console.error("could not load fasts", fastsRes.error);
  const fasts = fastsRes.error ? null : fastsRes.data ?? [];

  const [first, second] = weightsRes.data ?? [];
  const w = first?.log_date === date ? first : undefined;
  const prev = w ? second : first;

  // Hero line: the day's weight (or the last one before it) and how it moved since the weigh-in before that
  const shown = w ?? prev;
  const weightSummary = {
    kg: shown ? Number(shown.weight_kg) : null,
    detail: !shown ? null
      : w && prev ? `${formatChange(weightChange(Number(prev.weight_kg), Number(w.weight_kg)))} since ${formatDay(prev.log_date, today)}`
      : `weighed ${formatDay(shown.log_date, today)}`,
  };

  const weightBody = (
    <>
      <WeightForm date={date} today={today} label={dateLabel(date, today)}
        current={w ? { id: w.id, kg: Number(w.weight_kg) } : undefined}
        previous={prev ? { kg: Number(prev.weight_kg), date: prev.log_date } : undefined} />
      <p className="mt-3 text-xs text-muted">Your trend is on the <Link href="/history" className="font-medium text-accent-fg underline">History</Link> page.</p>
    </>
  );

  return (
    <PageShell wide title="Dashboard" compactOnMobile actions={<DayHeader date={date} today={today} />} subtitle="Track today's calories and macros against your targets.">
      {firstRun && <OnboardingCard targetKcal={m.target_calories} />}

      <DayView date={date} meals={day.meals} targets={targetsOf(m)} recent={recent} frequent={frequent} favorites={favorites}
        previousDate={previousDate} previousMeals={previous.meals}
        rail={fasts && <FastingCard fasts={fasts} />}
        // The weight card is for phones (no floating menu there); on desktop the menu's "Log weight" opens it in a dialog
        belowMeals={<section className="glass p-4 md:hidden" aria-label="Weight">{weightBody}</section>}
        weightDialog={weightBody} weightSummary={weightSummary} />
    </PageShell>
  );
}
