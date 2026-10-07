"use client";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { addPlanEntry, deletePlanEntry, logPlanEntry, movePlanEntry, setPlanServings } from "@/app/actions/plan";

export type PlanEntry = {
  id: string; slot: string; title: string; servings: number; calories: number;
  protein: number; fiber: number; netCarbs: number; fat: number; logged: boolean; source: string;
};
export type SavedFood = { id: string; name: string; serving: string; calories: number; protein_g: number; fiber_g: number; net_carbs_g: number; fat_g: number };
type Targets = { calories: number; protein: number; fiber: number; netCarbs: number; fat: number };

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
const icon = "btn btn-ghost !h-11 !w-11 !p-0";

export function PlanDay({ date, canLog, entries, foods, targets }: {
  date: string; canLog: boolean; entries: PlanEntry[]; foods: SavedFood[]; targets: Targets;
}) {
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => {
    setErr("");
    try { await fn(); } catch (e: any) { setErr(e.message || "Something went wrong."); }
  });

  const tot = entries.reduce((a, e) => ({
    calories: a.calories + e.calories * e.servings, protein: a.protein + e.protein * e.servings,
    fiber: a.fiber + e.fiber * e.servings, netCarbs: a.netCarbs + e.netCarbs * e.servings, fat: a.fat + e.fat * e.servings,
  }), { calories: 0, protein: 0, fiber: 0, netCarbs: 0, fat: 0 });

  return (
    <div className="space-y-3">
      <div className="glass p-4 text-sm" role="status">
        <b>Planned: {Math.round(tot.calories)} of {targets.calories} kcal</b> · {Math.round(tot.protein)}/{targets.protein}g protein ·{" "}
        {Math.round(tot.fiber)}/{targets.fiber}g fiber · {Math.round(tot.netCarbs)}/{targets.netCarbs}g net carbs ·{" "}
        {Math.round(tot.fat)}/{targets.fat}g fat
        {tot.calories > targets.calories * 1.05 && <span className="block text-warn">This plan is over your calorie target.</span>}
      </div>
      {err && <p className="err" role="alert">{err}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {SLOTS.map((slot) => {
          const items = entries.filter((e) => e.slot === slot);
          return (
            <section key={slot} className="glass p-4" aria-label={`${slot} plan`}>
              <h3 className="mb-2 font-semibold capitalize">{slot}</h3>
              {items.length === 0 && <p className="text-sm text-muted">Nothing planned.</p>}
              <ul className="space-y-2">
                {items.map((e, i) => (
                  <li key={e.id} className="text-sm">
                    <div className="flex items-start justify-between gap-1">
                      <span className="min-w-0">
                        <span className="font-medium">{e.title}</span>
                        {e.logged && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold uppercase">Logged</span>}
                        <span className="block text-xs text-muted">
                          {Math.round(e.calories * e.servings)} kcal · {Math.round(e.protein * e.servings)}g P · {Math.round(e.fiber * e.servings)}g F
                        </span>
                      </span>
                      <span className="flex shrink-0">
                        <button className={icon} aria-label={`Move ${e.title} up`} disabled={pending || i === 0}
                          onClick={() => run(() => movePlanEntry(e.id, "up"))}><ArrowUp className="size-4" /></button>
                        <button className={icon} aria-label={`Move ${e.title} down`} disabled={pending || i === items.length - 1}
                          onClick={() => run(() => movePlanEntry(e.id, "down"))}><ArrowDown className="size-4" /></button>
                        <button className={icon} aria-label={`Remove ${e.title} from plan`} disabled={pending}
                          onClick={() => run(() => deletePlanEntry(e.id))}><Trash2 className="size-4" /></button>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <label className="text-xs">Servings{" "}
                        <input type="number" min="0.25" max="20" step="0.25" defaultValue={e.servings} aria-label={`Servings of ${e.title}`} disabled={e.logged || pending}
                          className="input !h-9 !w-20" onBlur={(ev) => {
                            const v = Number(ev.target.value);
                            if (v > 0 && v !== e.servings) run(() => setPlanServings(e.id, v));
                          }} />
                      </label>
                      {!e.logged && (
                        <button className="btn btn-ghost !h-9" disabled={pending || !canLog}
                          title={canLog ? undefined : "Future meals can be logged on their day"}
                          onClick={() => run(() => logPlanEntry(e.id))}><Check className="size-4" />Log this meal</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <AddEntry date={date} foods={foods} run={run} pending={pending} />
    </div>
  );
}

function AddEntry({ date, foods, run, pending }: {
  date: string; foods: SavedFood[]; run: (fn: () => Promise<unknown>) => void; pending: boolean;
}) {
  const [foodId, setFoodId] = useState("");
  return (
    <details className="glass p-4" open>
      <summary className="cursor-pointer font-semibold">Add to this day</summary>
      <form className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4" onSubmit={(ev) => {
        ev.preventDefault();
        const form = ev.currentTarget, fd = new FormData(form);
        const f = foods.find((x) => x.id === foodId);
        const n = (k: string) => Number(fd.get(k) || 0);
        run(async () => {
          await addPlanEntry({
            date, slot: fd.get("slot") as any, title: String(fd.get("title") ?? ""),
            servings: n("servings") || 1, calories: n("calories"), protein: n("protein"),
            fiber: n("fiber"), netCarbs: n("netCarbs"), fat: n("fat"),
            source: f ? "saved_food" : "manual",
          });
          form.reset(); setFoodId("");
        });
      }}>
        <div>
          <label className="label" htmlFor="plan-slot">Meal</label>
          <select id="plan-slot" name="slot" className="input !min-h-11">
            {SLOTS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {foods.length > 0 && (
          <div className="md:col-span-3">
          <label className="label" htmlFor="plan-saved">Fill from a saved food</label>
          <select id="plan-saved" className="input !min-h-11" value={foodId} onChange={(e) => {
            setFoodId(e.target.value);
            const f = foods.find((x) => x.id === e.target.value); if (!f) return;
            const set = (n: string, v: string | number) => {
              (document.getElementById(`plan-${n}`) as HTMLInputElement).value = String(v);
            };
            set("title", f.name); set("calories", f.calories); set("protein", f.protein_g);
            set("fiber", f.fiber_g); set("netCarbs", f.net_carbs_g); set("fat", f.fat_g);
          }}>
            <option value="">Choose…</option>
            {foods.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.serving}, {f.calories} kcal)</option>)}
          </select>
          </div>
        )}
        <div className="col-span-2 md:col-span-3">
          <label className="label" htmlFor="plan-title">Meal name</label>
          <input id="plan-title" name="title" required className="input !min-h-11" />
        </div>
        <div>
          <label className="label" htmlFor="plan-servings">Servings</label>
          <input id="plan-servings" name="servings" type="number" inputMode="decimal" min="0.25" max="20" step="0.25" defaultValue="1" className="input !min-h-11" />
        </div>
        {([["calories", "Calories (per serving)"], ["protein", "Protein g"], ["fiber", "Fiber g"], ["netCarbs", "Net carbs g"], ["fat", "Fat g"]] as const).map(([n, l]) => (
          <div key={n}>
            <label className="label" htmlFor={`plan-${n}`}>{l}</label>
            <input id={`plan-${n}`} name={n} type="number" inputMode="decimal" step="0.1" min="0" required className="input !min-h-11" />
          </div>
        ))}
        <button className="btn" disabled={pending}><Plus className="size-4" />Add</button>
      </form>
    </details>
  );
}
