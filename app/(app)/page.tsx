import { redirect } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDay, targetsOf } from "@/lib/day";
import { todayStr } from "@/lib/date";
import { addManualMeal, deleteMeal } from "@/app/actions/meals";
import { MacroRing } from "@/components/macro-ring";
import { AddMealForm } from "@/components/add-meal-form";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

export default async function Dashboard() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: m } = await s.from("health_metrics").select("*").eq("user_id", user!.id).maybeSingle();
  if (!m) redirect("/profile");
  const t = targetsOf(m);
  const { meals, totals } = await getDay(s, user!.id, todayStr());

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm opacity-70">
          {Math.max(t.calories - Math.round(totals.calories), 0)} kcal left in your {Math.round(m.deficit_pct * 100)}% deficit plan
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MacroRing label="Calories" unit=" kcal" color="#f97316" value={totals.calories} target={t.calories} />
        <MacroRing label="Protein" unit="g" color="#8b5cf6" value={totals.protein} target={t.protein} />
        <MacroRing label="Fiber" unit="g" color="#10b981" value={totals.fiber} target={t.fiber} />
        <MacroRing label="Net carbs" unit="g" color="#0ea5e9" value={totals.netCarbs} target={t.netCarbs} />
        <MacroRing label="Fat" unit="g" color="#f59e0b" value={totals.fat} target={t.fat} />
      </section>

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
                        {x.calories} kcal · {x.protein_g}g P · {x.fiber_g}g F · {x.net_carbs_g}g NC · {x.fat_g}g fat
                      </span>
                    </span>
                    <form action={deleteMeal.bind(null, x.id)}>
                      <button className="btn btn-ghost !p-1.5" aria-label={`Delete ${x.title}`}><Trash2 className="size-4" /></button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <AddMealForm />
    </>
  );
}
