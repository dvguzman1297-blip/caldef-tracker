import { createClient } from "@/lib/supabase/server";
import { getDay } from "@/lib/day";
import { todayStr, addDays, parseDateParam, dateLabel } from "@/lib/date";
import { dayStatus, weightTrend, type DayStatus } from "@/lib/progress";
import Link from "next/link";

const STATUS: Record<DayStatus, { label: string; cls: string }> = {
  no_data: { label: "No data", cls: "bg-slate-500/15" },
  under: { label: "Well under", cls: "bg-amber-500/20" },
  on_target: { label: "On target", cls: "bg-emerald-600/20" },
  over: { label: "Over", cls: "bg-rose-500/20" },
};

function WeightChart({ points }: { points: { date: string; kg: number }[] }) {
  if (points.length < 2) return null;
  const W = 600, H = 140, P = 24;
  const lo = Math.min(...points.map((p) => p.kg)) - 0.5, hi = Math.max(...points.map((p) => p.kg)) + 0.5;
  const t0 = new Date(points[0].date).getTime(), t1 = new Date(points[points.length - 1].date).getTime() || 1;
  const x = (d: string) => P + ((new Date(d).getTime() - t0) / (t1 - t0 || 1)) * (W - 2 * P);
  const y = (kg: number) => H - P - ((kg - lo) / (hi - lo)) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="mt-3 w-full"
      aria-label={`Weight from ${points[0].kg} kg to ${points[points.length - 1].kg} kg`}>
      <polyline fill="none" stroke="#059669" strokeWidth="2" points={points.map((p) => `${x(p.date)},${y(p.kg)}`).join(" ")} />
      {points.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r="3" fill="#059669" />)}
      <text x={P} y={12} fontSize="11" fill="currentColor" opacity=".7">{hi.toFixed(1)} kg</text>
      <text x={P} y={H - 6} fontSize="11" fill="currentColor" opacity=".7">{lo.toFixed(1)} kg · {points[0].date} to {points[points.length - 1].date}</text>
    </svg>
  );
}

export default async function History({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const today = todayStr();
  const date = parseDateParam(q, today);
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { meals, totals } = await getDay(s, user!.id, date);

  const from = addDays(today, -27);
  const [mealsRes, weightsRes, metricsRes] = await Promise.all([
    s.from("logged_meals").select("calories,protein_g,fiber_g,net_carbs_g,fat_g,daily_logs!inner(log_date)")
      .eq("user_id", user!.id).is("deleted_at", null)
      .gte("daily_logs.log_date", from).lte("daily_logs.log_date", today),
    s.from("weight_logs").select("id,log_date,weight_kg").eq("user_id", user!.id)
      .gte("log_date", addDays(today, -89)).lte("log_date", today).order("log_date"),
    s.from("health_metrics").select("target_calories").eq("user_id", user!.id).maybeSingle(),
  ]);
  for (const r of [mealsRes, weightsRes, metricsRes]) if (r.error) throw new Error(`Could not load progress: ${r.error.message}`);
  const target = metricsRes.data?.target_calories as number | undefined;

  // Per-day totals. A day exists in the map only if meals were logged, so absence means "no data", never zero.
  const byDay = new Map<string, { cal: number; p: number; f: number; nc: number; fat: number }>();
  for (const r of (mealsRes.data ?? []) as any[]) {
    const d = r.daily_logs.log_date as string;
    const t = byDay.get(d) ?? { cal: 0, p: 0, f: 0, nc: 0, fat: 0 };
    t.cal += r.calories; t.p += Number(r.protein_g); t.f += Number(r.fiber_g);
    t.nc += Number(r.net_carbs_g); t.fat += Number(r.fat_g);
    byDay.set(d, t);
  }
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const logged7 = week.filter((d) => byDay.has(d));
  const avg = (k: "cal" | "p" | "f" | "nc" | "fat") =>
    logged7.length ? Math.round(logged7.reduce((a, d) => a + byDay.get(d)![k], 0) / logged7.length) : null;

  const weeks = [0, 1, 2, 3].map((w) => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, -(w * 7 + i)));
    const logged = days.filter((d) => byDay.has(d));
    const onTarget = target ? logged.filter((d) => dayStatus(true, byDay.get(d)!.cal, target) === "on_target").length : 0;
    const avgCal = logged.length ? Math.round(logged.reduce((a, d) => a + byDay.get(d)!.cal, 0) / logged.length) : null;
    return { label: w === 0 ? "Last 7 days" : `${w * 7 + 6} to ${w * 7} days ago`, logged: logged.length, onTarget, avgCal };
  });

  const weights = (weightsRes.data ?? []).map((w) => ({ id: w.id as string, date: w.log_date as string, kg: Number(w.weight_kg) }));
  const trend = weightTrend(weights, today);

  return (
    <>
      <h1 className="text-2xl font-bold">History &amp; progress</h1>
      <form className="flex items-end gap-2">
        <div><label className="label" htmlFor="date">Date</label><input id="date" name="date" type="date" defaultValue={date} max={today} className="input" /></div>
        <button className="btn">View day</button>
      </form>

      <section className="glass p-4">
        <h2 className="mb-1 font-semibold">This week at a glance</h2>
        <p className="mb-3 text-xs opacity-70">
          {logged7.length} of 7 days logged. Days without meals show as &ldquo;No data&rdquo;, not zero intake.
          {target ? ` On target = 80–105% of your ${target} kcal goal.` : ""}
        </p>
        <ul className="grid grid-cols-7 gap-1 text-center text-xs">
          {week.slice().reverse().map((d) => {
            const t = byDay.get(d);
            const st = STATUS[target ? dayStatus(!!t, t?.cal ?? 0, target) : t ? "on_target" : "no_data"];
            return (
              <li key={d} className={`rounded-lg p-1.5 ${st.cls}`}>
                <div className="opacity-70">{dateLabel(d, today).split(",")[0].slice(0, 3)}</div>
                <div className="font-semibold">{t ? Math.round(t.cal) : "–"}</div>
                <div className="text-[10px]">{target ? st.label : t ? "Logged" : "No data"}</div>
              </li>
            );
          })}
        </ul>
        {logged7.length > 0 && (
          <p className="mt-3 text-sm">
            Average per logged day: {avg("cal")} kcal · {avg("p")}g protein · {avg("f")}g fiber · {avg("nc")}g net carbs · {avg("fat")}g fat
          </p>
        )}
      </section>

      <section className="glass p-4">
        <h2 className="mb-2 font-semibold">Weekly adherence (last 4 weeks)</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs opacity-70"><tr><th className="py-1">Week</th><th>Days logged</th><th>On target</th><th>Avg kcal (logged days)</th></tr></thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.label} className="border-t border-black/10 dark:border-white/10">
                <td className="py-1.5">{w.label}</td><td>{w.logged} / 7</td>
                <td>{w.logged && target ? `${w.onTarget} of ${w.logged}` : "n/a"}</td>
                <td>{w.avgCal ?? "No data"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="glass p-4">
        <h2 className="mb-1 font-semibold">Weight</h2>
        <p className="text-xs opacity-70">Log your weight from the <Link href="/" className="underline">Dashboard</Link>.</p>
        {weights.length === 0 ? <p className="mt-3 text-sm opacity-60">No weigh-ins yet.</p> : (
          <>
            {trend ? (
              <p className="mt-3 text-sm">
                7-day average {trend.recent.toFixed(1)} kg, {trend.change > 0 ? "up" : "down"} {Math.abs(trend.change).toFixed(1)} kg from the week before.
                <span className="block text-xs opacity-70">Day-to-day weight swings of 1–2 kg are normal; look at the trend, not single days.</span>
              </p>
            ) : <p className="mt-3 text-sm opacity-70">Log weights across two weeks to see a trend.</p>}
            <WeightChart points={weights} />
          </>
        )}
      </section>

      <section className="glass p-4">
        <h2 className="mb-2 font-semibold">{date}: {Math.round(totals.calories)} kcal · {Math.round(totals.protein)}g P · {Math.round(totals.fiber)}g F</h2>
        {meals.length === 0 && <p className="text-sm opacity-60">No meals logged on this day.</p>}
        <ul className="space-y-1 text-sm">
          {meals.map((m) => (
            <li key={m.id}><span className="capitalize font-medium">{m.slot}</span>: {m.title}, {m.calories} kcal, {m.protein_g}g protein, {m.fiber_g}g fiber</li>
          ))}
        </ul>
      </section>
    </>
  );
}
