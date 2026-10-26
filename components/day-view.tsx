"use client";
import type { ReactNode } from "react";
import { Cookie, Copy, Moon, Sun, Sunrise, type LucideIcon } from "lucide-react";
import { copyMeals } from "@/app/actions/meals";
import { unwrap } from "@/lib/action-result";
import type { Slot } from "@/lib/budget";
import { SLOTS } from "@/lib/budget";
import type { Meal } from "@/lib/day";
import type { QuickPick } from "@/lib/quick-picks";
import { sumMeals } from "@/lib/totals";
import { AddItemButton } from "@/components/add-item-button";
import { DayProvider, useDay } from "@/components/day-context";
import { LogCard } from "@/components/log-card";
import { MacroLine } from "@/components/macro-line";
import { MacroSummary } from "@/components/macro-summary";
import { MealItem } from "@/components/meal-item";
import { QuickFab } from "@/components/quick-fab";

type Targets = { calories: number; protein: number; fiber: number; netCarbs: number; fat: number };
type Props = {
  date: string; meals: Meal[]; targets: Targets;
  recent: QuickPick[]; frequent: QuickPick[]; favorites: QuickPick[];
  /** The previous day's meals, for "Copy yesterday's lunch". */
  previousDate: string; previousMeals: Meal[];
  /** Extra cards for the right-hand column on desktop (shown last on mobile), e.g. weight. */
  rail?: ReactNode;
};

/** Everything on the dashboard that reacts to logging: hero, log card, meal cards. */
export function DayView(props: Props) {
  return (
    <DayProvider date={props.date} meals={props.meals}>
      <Inner {...props} />
    </DayProvider>
  );
}

function Inner({ targets: t, recent, frequent, favorites, previousDate, previousMeals, rail }: Props) {
  const { meals, date } = useDay()!;
  const totals = sumMeals(meals);
  // Mobile: one stack in the order hero, log, meals, rail. lg+: a main column (hero, meals) beside a rail (log, rail).
  // The two column wrappers use `contents` below lg so their children join the outer stack and `order` sets the sequence.
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start">
      <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6 xl:col-span-8">
        <div className="order-1">
          <MacroSummary isEmpty={meals.length === 0} calories={{ value: totals.calories, target: t.calories }}
            macros={[
              { id: "protein", label: "Protein", value: totals.protein, target: t.protein },
              { id: "carbs", label: "Net carbs", value: totals.netCarbs, target: t.netCarbs, overIsBad: true },
              { id: "fat", label: "Fat", value: totals.fat, target: t.fat, overIsBad: true },
              { id: "fiber", label: "Fiber", value: totals.fiber, target: t.fiber },
            ]} />
        </div>
        <section className="order-3 grid items-start gap-3 md:grid-cols-2" aria-label="Meals">
          {SLOTS.map((slot) => (
            <MealCard key={slot} slot={slot} items={meals.filter((x) => x.slot === slot)}
              date={date} previousDate={previousDate} previous={previousMeals.filter((x) => x.slot === slot)} />
          ))}
        </section>
      </div>
      <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-6 xl:col-span-4">
        <div className="order-2"><LogCard recent={recent} frequent={frequent} favorites={favorites} /></div>
        {rail && <div className="order-4">{rail}</div>}
      </div>
      <QuickFab date={date} />
    </div>
  );
}

const SLOT_ICON: Record<Slot, LucideIcon> = { breakfast: Sunrise, lunch: Sun, dinner: Moon, snack: Cookie };

function SlotIcon({ slot }: { slot: Slot }) {
  const Icon = SLOT_ICON[slot];
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-fg" aria-hidden="true">
      <Icon className="size-[1.1rem]" strokeWidth={1.75} />
    </span>
  );
}

function MealCard({ slot, items, date, previousDate, previous }: {
  slot: Slot; items: Meal[]; date: string; previousDate: string; previous: Meal[];
}) {
  const day = useDay()!;
  const sum = sumMeals(items);
  const kcal = Math.round(sum.calories);
  const empty = items.length === 0;

  const copy = previous.length > 0 && empty && (
    <button className="btn btn-ghost !min-h-11 !px-3.5" aria-label={`Copy yesterday's ${slot}`}
      onClick={() => day.log(
        previous.map((m) => ({ slot, title: m.title, calories: m.calories, protein: Number(m.protein_g),
          fiber: Number(m.fiber_g), netCarbs: Number(m.net_carbs_g), fat: Number(m.fat_g), source: m.source ?? "manual" })),
        () => unwrap(copyMeals(previousDate, slot, date)),
        `Copied ${previous.length} ${previous.length === 1 ? "item" : "items"} from yesterday's ${slot}.`)}>
      <Copy className="size-4" aria-hidden="true" />Copy yesterday&apos;s
    </button>
  );

  // Empty meals collapse to one slim row
  if (empty) {
    return (
      <div className="glass flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <SlotIcon slot={slot} />
          <div className="min-w-0">
            <h3 className="font-semibold capitalize leading-tight">{slot}</h3>
            <p className="text-sm text-muted">Nothing logged yet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">{copy}<AddItemButton slot={slot} date={date} /></div>
      </div>
    );
  }
  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <SlotIcon slot={slot} />
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight">
              <span className="capitalize">{slot}</span> <span className="ml-1 text-sm font-normal text-muted tabular-nums">{kcal.toLocaleString("en-US")} kcal</span>
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
              <MacroLine short protein={sum.protein} netCarbs={sum.netCarbs} fat={sum.fat} />
            </p>
          </div>
        </div>
        <AddItemButton slot={slot} date={date} />
      </div>
      <ul className="space-y-2">{items.map((x) => <MealItem key={x.id} meal={x} />)}</ul>
    </div>
  );
}
