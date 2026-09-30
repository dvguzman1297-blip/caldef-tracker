import { createClient } from "@/lib/supabase/server";
import { getDay } from "@/lib/day";
import { todayStr } from "@/lib/date";

export default async function History({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : todayStr();
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { meals, totals } = await getDay(s, user!.id, date);

  const from = todayStr(new Date(Date.now() - 6 * 864e5));
  const { data: week } = await s.from("logged_meals")
    .select("calories,protein_g,fiber_g,net_carbs_g,fat_g,daily_logs!inner(log_date)")
    .eq("user_id", user!.id).gte("daily_logs.log_date", from);
  const days = new Set((week ?? []).map((r: any) => r.daily_logs.log_date)).size || 1;
  const sum = (k: string) => Math.round((week ?? []).reduce((a: number, r: any) => a + Number(r[k]), 0) / days);

  return (
    <>
      <h1 className="text-2xl font-bold">History</h1>
      <form className="flex items-end gap-2">
        <div><label className="label" htmlFor="date">Date</label><input id="date" name="date" type="date" defaultValue={date} className="input" /></div>
        <button className="btn">View day</button>
      </form>

      <section className="glass p-4">
        <h2 className="mb-2 font-semibold">Last 7 days, daily average ({(week ?? []).length ? days : 0} days logged)</h2>
        <p className="text-sm">{sum("calories")} kcal · {sum("protein_g")}g protein · {sum("fiber_g")}g fiber · {sum("net_carbs_g")}g net carbs · {sum("fat_g")}g fat</p>
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
