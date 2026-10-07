"use client";
import { createContext, startTransition, useCallback, useContext, useMemo, useOptimistic, type ReactNode } from "react";
import { deleteMeal, restoreMeal } from "@/app/actions/meals";
import type { Meal } from "@/lib/day";
import { useToast } from "@/components/toast";

export type NewMeal = {
  slot: Meal["slot"]; title: string; calories: number; protein: number; fiber: number; netCarbs: number; fat: number;
  source?: string;
};

type Op = { type: "add"; meal: Meal } | { type: "remove"; id: string };

type DayCtx = {
  date: string;
  meals: Meal[];
  /** Shows the meal immediately, then runs the server write. A failure rolls the row back and toasts. */
  log: (m: NewMeal[] | NewMeal, run: () => Promise<unknown>, successMessage?: string) => void;
  /** Optimistic soft delete with an Undo toast. */
  remove: (m: Meal) => void;
};

const Ctx = createContext<DayCtx | null>(null);
export const useDay = () => useContext(Ctx);

let tmp = 0;
const toMeal = (m: NewMeal): Meal => ({
  id: `tmp-${++tmp}`, slot: m.slot, title: m.title, calories: m.calories, protein_g: m.protein,
  fiber_g: m.fiber, net_carbs_g: m.netCarbs, fat_g: m.fat, consumed_time: null, source: m.source ?? "manual",
});
export const isPending = (m: Meal) => m.id.startsWith("tmp-");

export function DayProvider({ date, meals: server, children }: { date: string; meals: Meal[]; children: ReactNode }) {
  const toast = useToast();
  const [meals, apply] = useOptimistic(server, (state, op: Op) =>
    op.type === "add" ? [...state, op.meal] : state.filter((x) => x.id !== op.id));

  const fail = useCallback((e: unknown, fallback: string) =>
    toast({ tone: "error", message: e instanceof Error && e.message ? e.message : fallback }), [toast]);

  const log = useCallback<DayCtx["log"]>((m, run, successMessage) => {
    startTransition(async () => {
      for (const x of Array.isArray(m) ? m : [m]) apply({ type: "add", meal: toMeal(x) });
      try { await run(); if (successMessage) toast({ message: successMessage }); }
      catch (e) { fail(e, "Could not save that meal. It was not added."); }
    });
  }, [apply, toast, fail]);

  const remove = useCallback<DayCtx["remove"]>((m) => {
    startTransition(async () => {
      apply({ type: "remove", id: m.id });
      try {
        await deleteMeal(m.id);
        toast({
          message: `Deleted “${m.title}”.`,
          action: {
            label: "Undo",
            onClick: () => startTransition(async () => {
              try { await restoreMeal(m.id); } catch (e) { fail(e, "Could not restore the meal."); }
            }),
          },
        });
      } catch (e) { fail(e, "Could not delete that meal. It was restored."); }
    });
  }, [apply, toast, fail]);

  const value = useMemo(() => ({ date, meals, log, remove }), [date, meals, log, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
