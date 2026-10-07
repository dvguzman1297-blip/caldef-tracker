import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDay } from "@/lib/day";
import { addDays, dayOfMonth, formatDate, formatDay, parseDateParam, weekdayShort } from "@/lib/date";
import {
  ON_TARGET_RANGE, averages, dayStatus, persistentLowIntake, weightTrend, type DayStatus,
} from "@/lib/progress";
import { getToday } from "@/lib/today";
import { SLOTS } from "@/lib/budget";
import { KcalBarChart, WeightChartSkeleton, WeightLineChart } from "@/components/charts";
import { DateField } from "@/components/date-field";
import { PageShell } from "@/components/page-shell";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const STATUS: Record<DayStatus, { label: string; cls: string }> = {
  no_data: { label: "No data", cls: "bg-surface-2" },
  very_low: { label: "Incomplete log?", cls: "bg-warn/15" },
  under: { label: "Below target", cls: "bg-surface-2" },
  on_target: { label: "On target", cls: "bg-accent-soft" },
  over: { label: "Over", cls: "bg-warn/15" },
};

type SP = { date?: string; range?: string };

export default async function History({ searchParams }: { searchParams: Promise<SP> }) {
  const { date: q, range: rq } = await searchParams;
  const today = await getToday();
  const date = parseDateParam(q, today);
  const range = (RANGES.find((r) => String(r) === rq) ?? 30) as Range;
  const href = (p: { date?: string; range?: Range }) => {
    const sp = new URLSearchParams();
    if (p.date && p.date !== today) sp.set("date", p.date);
    if ((p.range ?? range) !== 30) sp.set("range", String(p.range ?? range));
    const s = sp.toString();
    return `/history${s ? `?${s}` : ""}`;
  };

  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { meals, totals } = await getDay(s, user!.id, date);

  const mealFrom = addDays(today, -(Math.max(range, 28) - 1));
  const [mealsRes, weightsRes, metricsRes] = await Promise.all([
    s.from("logged_meals").select("calories,protein_g,fiber_g,net_carbs_g,fat_g,daily_logs!inner(log_date)")
      .eq("user_id", user!.id).is("deleted_at", null)
      .gte("daily_logs.log_date", mealFrom).lte("daily_logs.log_date", today),
    s.from("weight_logs").select("id,log_date,weight_kg").eq("user_id", user!.id)
      .gte("log_date", addDays(today, -89)).lte("log_date", today).order("log_date"),
    s.from("health_metrics").select("target_calories").eq("user_id", user!.id).maybeSingle(),
  ]);
  for (const r of [mealsRes, weightsRes, metricsRes]) if (r.error) throw new Error(`Could not load progress: ${r.error.message}`);
  const target = metricsRes.data?.target_calories as number | undefined;

  // Per-day totals. A day exists in the map only if meals were logged, so absence means "no data", never zero.
  const byDay = new Map<string, { cal: number; p: number; f: number; nc: number; fat: number }>();
  for (const r of (mealsRes.data ?? []) as unknown as { calories: number; protein_g: number; fiber_g: number; net_carbs_g: number; fat_g: number; daily_logs: { log_date: string } }[]) {
    const d = r.daily_logs.log_date;
    const t = byDay.get(d) ?? { cal: 0, p: 0, f: 0, nc: 0, fat: 0 };
    t.cal += r.calories; t.p += Number(r.protein_g); t.f += Number(r.fiber_g);
    t.nc += Number(r.net_carbs_g); t.fat += Number(r.fat_g);
    byDay.set(d, t);
  }
  const statusOf = (d: string): DayStatus => {
    const t = byDay.get(d);
    return target ? dayStatus(!!t, t?.cal ?? 0, target) : t ? "on_target" : "no_data";
  };

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)); // 7 days ending today, oldest first
  const rangeDays = Array.from({ length: range }, (_, i) => addDays(today, i - (range - 1)));
  const loggedWeek = week.filter((d) => byDay.has(d));
  const incompleteDays = week.filter((d) => statusOf(d) === "very_low");
  const lowIntake = !!target && persistentLowIntake(week.map(statusOf));
  const avg = averages(byDay, rangeDays);

  const weeks = [0, 1, 2, 3].map((w) => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, -(w * 7 + i)));
    const logged = days.filter((d) => byDay.has(d));
    const onTarget = target ? logged.filter((d) => statusOf(d) === "on_target").length : 0;
    const avgCal = logged.length ? Math.round(logged.reduce((a, d) => a + byDay.get(d)!.cal, 0) / logged.length) : null;
    return { label: w === 0 ? "Last 7 days" : `${formatDay(days[6], today)} – ${formatDay(days[0], today)}`, logged: logged.length, onTarget, avgCal };
  });

  const allWeights = (weightsRes.data ?? []).map((w) => ({ date: w.log_date as string, kg: Number(w.weight_kg) }));
  const weights = allWeights.filter((w) => w.date >= rangeDays[0]);
  const trend = weightTrend(allWeights, today);
  const dayStatusNow = statusOf(date);

  const tiles: [string, string][] = [
    ["Days logged", `${avg.loggedDays} of ${range}`],
    ["Avg calories", avg.cal === null ? "–" : `${avg.cal.toLocaleString("en-US")} kcal`],
    ["Avg protein", avg.p === null ? "–" : `${avg.p} g`],
    ["Avg fiber", avg.f === null ? "–" : `${avg.f} g`],
    ["Avg net carbs", avg.nc === null ? "–" : `${avg.nc} g`],
    ["Avg fat", avg.fat === null ? "–" : `${avg.fat} g`],
  ];

  return (
    <PageShell title="History & progress" subtitle="How your logging, calories and weight have been trending."
      actions={<DateField value={date} today={today} basePath="/history" />}>

      {/* Week strip */}
      <section className="glass p-4">
        <h2 className="font-semibold">Last 7 days <span className="font-normal text-muted">({formatDay(week[0], today)} – {formatDay(week[6], today)})</span></h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          {loggedWeek.length} of 7 days logged. Days without meals show as &ldquo;No data&rdquo;, not zero intake.
          {target ? ` On target = ${Math.round(ON_TARGET_RANGE[0] * 100)}–${Math.round(ON_TARGET_RANGE[1] * 100)}% of your ${target.toLocaleString("en-US")} kcal goal.` : ""}
        </p>
        <ul className="grid grid-cols-7 gap-1 text-center text-xs">
          {week.map((d) => {
            const t = byDay.get(d);
            const st = STATUS[statusOf(d)];
            return (
              <li key={d}>
                <Link href={href({ date: d })} aria-current={d === date ? "date" : undefined}
                  aria-label={`${formatDate(d, today)}${d === today ? " (today)" : ""}: ${t ? `${Math.round(t.cal)} kcal, ` : ""}${st.label}`}
                  className={`flex min-h-24 flex-col justify-between rounded-lg p-1.5 ${st.cls} ${d === today ? "ring-2 ring-accent" : ""} ${d === date ? "outline outline-2 outline-offset-1 outline-current" : ""}`}>
                  <span className="text-muted">{weekdayShort(d)} {dayOfMonth(d)}</span>
                  <span className="text-sm font-semibold tabular-nums">{t ? Math.round(t.cal).toLocaleString("en-US") : "–"}</span>
                  <span className="leading-tight">{st.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {incompleteDays.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            {incompleteDays.map((d) => (
              <li key={d} className="flex flex-wrap items-center justify-between gap-2">
                <span><b>{formatDate(d, today)}</b> looks incomplete: only {Math.round(byDay.get(d)!.cal).toLocaleString("en-US")} kcal logged.</span>
                <Link href={`/?date=${d}`} className="btn btn-ghost !py-1.5">Finish logging</Link>
              </li>
            ))}
          </ul>
        )}
        {lowIntake && (
          <p role="note" className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
            Several recent days are well below your calorie goal. If meals simply went unlogged, you can add them above.
            If you are eating this little on purpose, it&apos;s worth talking with a doctor or registered dietitian, since
            eating far below your needs for long can affect your health.
          </p>
        )}
      </section>

      {/* Selected day (hidden when there's nothing to show) */}
      {meals.length > 0 && (
        <section className="glass p-4" aria-label={`Meals on ${formatDate(date, today)}`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              {formatDate(date, today)}: <span className="tabular-nums">{Math.round(totals.calories).toLocaleString("en-US")} kcal</span>
              <span className="font-normal text-muted"> · {Math.round(totals.protein)}g protein · {Math.round(totals.fiber)}g fiber</span>
            </h2>
            <Link href={`/?date=${date}`} className="btn btn-ghost !py-1.5">{dayStatusNow === "very_low" ? "Finish logging" : "Open day"}</Link>
          </div>
          <ul className="divide-y divide-line text-sm">
            {SLOTS.flatMap((slot) => meals.filter((m) => m.slot === slot)).map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-x-4 py-2">
                <span><span className="font-medium capitalize">{m.slot}</span> · {m.title}</span>
                <span className="text-muted tabular-nums">{m.calories} kcal · {m.protein_g}g protein · {m.fiber_g}g fiber</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Range + stats + calorie chart */}
      <section className="glass p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Calories and macros</h2>
          <nav aria-label="Date range" className="flex gap-1 rounded-xl border border-line-strong bg-inset p-1">
            {RANGES.map((r) => (
              <Link key={r} href={href({ range: r })} aria-current={r === range ? "true" : undefined}
                className={`flex min-h-9 min-w-16 items-center justify-center rounded-lg px-3 text-sm font-medium ${r === range ? "bg-accent font-semibold text-on-accent" : "text-fg-muted hover:bg-surface-2"}`}>
                {r} days
              </Link>
            ))}
          </nav>
        </div>
        <dl className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map(([l, v]) => (
            <div key={l} className="rounded-xl bg-inset p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{l}</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mb-2 text-xs text-muted">Averages use logged days only.</p>
        {target
          ? <KcalBarChart days={rangeDays.map((d) => ({ date: d, cal: byDay.get(d)?.cal ?? null }))} target={target} today={today} />
          : <p className="text-sm text-muted">Set up your <Link href="/profile" className="font-medium text-accent-fg underline">profile</Link> to compare days with a calorie goal.</p>}
      </section>

      {/* Weight */}
      <section className="glass p-4">
        <h2 className="mb-1 font-semibold">Weight</h2>
        {weights.length === 0 ? (
          <div className="mt-2">
            <WeightChartSkeleton />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">No weigh-ins in this range yet. Log one to start your trend.</p>
              <Link href="/#wkg" className="btn">Log weight</Link>
            </div>
          </div>
        ) : (
          <>
            {trend ? (
              <p className="mb-3 text-sm">
                7-day average {trend.recent.toFixed(1)} kg, {trend.change > 0 ? "up" : trend.change < 0 ? "down" : "unchanged"}
                {trend.change !== 0 && <> {Math.abs(trend.change).toFixed(1)} kg</>} from the week before.
                <span className="block text-xs text-muted">Day-to-day weight swings of 1–2 kg are normal; look at the trend, not single days.</span>
              </p>
            ) : <p className="mb-3 text-sm text-muted">Log weights across two weeks to see a trend. <Link href="/#wkg" className="font-medium text-accent-fg underline">Log weight</Link></p>}
            <WeightLineChart points={weights} today={today} />
          </>
        )}
      </section>

      {/* Weekly adherence */}
      <section className="glass p-4">
        <h2 className="font-semibold">Weekly summary</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          For each of the last four weeks: how many days you logged, and how many of those landed within
          {" "}{Math.round(ON_TARGET_RANGE[0] * 100)}–{Math.round(ON_TARGET_RANGE[1] * 100)}% of your calorie goal.
        </p>
        <table className="hidden w-full text-left text-sm md:table">
          <thead className="text-xs text-muted">
            <tr><th className="py-1.5 font-semibold">Week</th><th className="font-semibold">Days logged</th><th className="font-semibold">Days on target</th><th className="font-semibold">Avg kcal (logged days)</th></tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => (
              <tr key={w.label} className={i % 2 ? "" : "bg-inset"}>
                <td className="rounded-l-lg px-2 py-2">{w.label}</td><td>{w.logged} / 7</td>
                <td>{w.logged && target ? `${w.onTarget} of ${w.logged}` : "n/a"}</td>
                <td className="rounded-r-lg">{w.avgCal?.toLocaleString("en-US") ?? "No data"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="space-y-2 md:hidden">
          {weeks.map((w) => (
            <li key={w.label} className="rounded-xl bg-inset p-3 text-sm">
              <p className="mb-1 font-semibold">{w.label}</p>
              <dl className="grid grid-cols-3 gap-2">
                <div><dt className="text-xs text-muted">Days logged</dt><dd>{w.logged} / 7</dd></div>
                <div><dt className="text-xs text-muted">On target</dt><dd>{w.logged && target ? `${w.onTarget} of ${w.logged}` : "n/a"}</dd></div>
                <div><dt className="text-xs text-muted">Avg kcal</dt><dd>{w.avgCal?.toLocaleString("en-US") ?? "No data"}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
