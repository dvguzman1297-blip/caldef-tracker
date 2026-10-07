"use client";
import { Copy } from "lucide-react";
import { copyMeals } from "@/app/actions/meals";
import type { Slot } from "@/lib/budget";
import { SLOTS } from "@/lib/budget";
import type { Meal } from "@/lib/day";
import type { QuickPick } from "@/lib/quick-picks";
import { sumMeals } from "@/lib/totals";
import { AddItemButton } from "@/components/add-item-button";
import { DayProvider, useDay } from "@/components/day-context";
import { LogCard } from "@/components/log-card";
import { MacroSummary } from "@/components/macro-summary";
import { MealItem } from "@/components/meal-item";
import { QuickFab } from "@/components/quick-fab";

type Targets = { calories: number; protein: number; fiber: number; netCarbs: number; fat: number };
type Props = {
  date: string; meals: Meal[]; targets: Targets;
  recent: QuickPick[]; frequent: QuickPick[]; favorites: QuickPick[];
  /** The previous day's meals, for "Copy yesterday's lunch". */
  previousDate: string; previousMeals: Meal[];
};

/** Everything on the dashboard that reacts to logging: hero, log card, meal cards. */
export function DayView(props: Props) {
  return (
    <DayProvider date={props.date} meals={props.meals}>
      <Inner {...props} />
    </DayProvider>
  );
}

function Inner({ targets: t, recent, frequent, favorites, previousDate, previousMeals }: Props) {
  const { meals, date } = useDay()!;
  const totals = sumMeals(meals);
  return (
    <>
      <MacroSummary isEmpty={meals.length === 0} calories={{ value: totals.calories, target: t.calories }}
        macros={[
          { id: "protein", label: "Protein", value: totals.protein, target: t.protein },
          { id: "carbs", label: "Net carbs", value: totals.netCarbs, target: t.netCarbs, overIsBad: true },
          { id: "fat", label: "Fat", value: totals.fat, target: t.fat, overIsBad: true },
          { id: "fiber", label: "Fiber", value: totals.fiber, target: t.fiber },
        ]} />

      <LogCard recent={recent} frequent={frequent} favorites={favorites} />

      <section className="grid items-start gap-3 md:grid-cols-2" aria-label="Meals">
        {SLOTS.map((slot) => (
          <MealCard key={slot} slot={slot} items={meals.filter((x) => x.slot === slot)}
            date={date} previousDate={previousDate} previous={previousMeals.filter((x) => x.slot === slot)} />
        ))}
      </section>
      <QuickFab date={date} />
    </>
  );
}

function MealCard({ slot, items, date, previousDate, previous }: {
  slot: Slot; items: Meal[]; date: string; previousDate: string; previous: Meal[];
}) {
  const day = useDay()!;
  const kcal = Math.round(items.reduce((a, m) => a + Number(m.calories), 0));
  const empty = items.length === 0;

  const copy = previous.length > 0 && empty && (
    <button className="btn btn-ghost !px-3 !py-1.5 !text-xs" aria-label={`Copy yesterday's ${slot}`}
      onClick={() => day.log(
        previous.map((m) => ({ slot, title: m.title, calories: m.calories, protein: Number(m.protein_g),
          fiber: Number(m.fiber_g), netCarbs: Number(m.net_carbs_g), fat: Number(m.fat_g), source: m.source ?? "manual" })),
        () => copyMeals(previousDate, slot, date),
        `Copied ${previous.length} ${previous.length === 1 ? "item" : "items"} from yesterday's ${slot}.`)}>
      <Copy className="size-3.5" aria-hidden="true" />Copy yesterday&apos;s
    </button>
  );

  // Empty meals collapse to one slim row
  if (empty) {
    return (
      <div className="glass flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <h3 className="font-semibold capitalize">{slot} <span className="ml-1 text-sm font-normal text-muted">Nothing logged</span></h3>
        <div className="flex items-center gap-2">{copy}<AddItemButton slot={slot} date={date} /></div>
      </div>
    );
  }
  return (
    <div className="glass p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-semibold capitalize">
          {slot} <span className="ml-1 text-sm font-normal text-muted tabular-nums">{kcal.toLocaleString("en-US")} kcal</span>
        </h3>
        <AddItemButton slot={slot} date={date} />
      </div>
      <ul className="space-y-2">{items.map((x) => <MealItem key={x.id} meal={x} />)}</ul>
    </div>
  );
}
