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
import { MacroSummary, type WeightSummary } from "@/components/macro-summary";
import { MealItem } from "@/components/meal-item";
import { QuickFab } from "@/components/quick-fab";

type Targets = { calories: number; protein: number; fiber: number; netCarbs: number; fat: number };
type Props = {
  date: string; meals: Meal[]; targets: Targets;
  recent: QuickPick[]; frequent: QuickPick[]; favorites: QuickPick[];
  /** The previous day's meals, for "Copy yesterday's lunch". */
  previousDate: string; previousMeals: Meal[];
  /** Card beside the meals on desktop (after them on phones), e.g. fasting. */
  rail?: ReactNode;
  /** Extra card after everything else (it should hide itself on desktop, or it adds an empty row), e.g. weight on phones. */
  belowMeals?: ReactNode;
  /** Weight form for the quick-action menu's "Log weight" dialog (desktop). */
  weightDialog?: ReactNode;
  /** Latest weigh-in, shown as a line in the hero. */
  weightSummary?: WeightSummary;
};

/** Everything on the dashboard that reacts to logging: hero, log card, meal cards. */
export function DayView(props: Props) {
  return (
    <DayProvider date={props.date} meals={props.meals}>
      <Inner {...props} />
    </DayProvider>
  );
}

function Inner({ targets: t, recent, frequent, favorites, previousDate, previousMeals, rail, belowMeals, weightDialog, weightSummary }: Props) {
  const { meals, date } = useDay()!;
  const totals = sumMeals(meals);
  // One shared grid so cards in the same row stretch to equal heights (no ragged columns when meals grow or the
  // fasting card changes size). Source order is the phone order: hero, log, meals, fasting, weight.
  // lg+: row 1 = hero | log, row 2 = meals | fasting. `cell` makes a card fill its grid cell.
  const cell = "flex flex-col [&>*]:flex-1";
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className={`${cell} lg:col-span-7 xl:col-span-8`}>
          <MacroSummary isEmpty={meals.length === 0} weight={weightSummary} calories={{ value: totals.calories, target: t.calories }}
            macros={[
              { id: "protein", label: "Protein", value: totals.protein, target: t.protein },
              { id: "carbs", label: "Net carbs", value: totals.netCarbs, target: t.netCarbs, overIsBad: true },
              { id: "fat", label: "Fat", value: totals.fat, target: t.fat, overIsBad: true },
              { id: "fiber", label: "Fiber", value: totals.fiber, target: t.fiber },
            ]} />
        </div>
        <div className={`${cell} lg:col-span-5 xl:col-span-4`}>
          <LogCard recent={recent} frequent={frequent} favorites={favorites} />
        </div>
        <section className="grid gap-4 md:grid-cols-2 lg:col-span-7 xl:col-span-8" aria-label="Meals">
          {SLOTS.map((slot) => (
            <MealCard key={slot} slot={slot} items={meals.filter((x) => x.slot === slot)}
              date={date} previousDate={previousDate} previous={previousMeals.filter((x) => x.slot === slot)} />
          ))}
        </section>
        {rail && <div className={`${cell} lg:col-span-5 xl:col-span-4`}>{rail}</div>}
        {belowMeals}
      </div>
      <QuickFab date={date} weight={weightDialog} />
    </>
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
            {/* A single item already shows its own macros below; the slot total is only new information with 2+ */}
            {items.length > 1 && (
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                <MacroLine short protein={sum.protein} netCarbs={sum.netCarbs} fat={sum.fat} />
              </p>
            )}
          </div>
        </div>
        <AddItemButton slot={slot} date={date} />
      </div>
      <ul className="space-y-2">{items.map((x) => <MealItem key={x.id} meal={x} />)}</ul>
    </div>
  );
}
