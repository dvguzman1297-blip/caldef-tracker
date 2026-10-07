"use client";
import { useState, useTransition } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { duplicateMeal, updateMeal } from "@/app/actions/meals";
import { isPending as isTemp, useDay } from "@/components/day-context";
import { useToast } from "@/components/toast";
import type { Meal } from "@/lib/day";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
const FIELDS = [
  ["calories", "calories", "kcal"], ["protein", "protein_g", "Protein g"], ["fiber", "fiber_g", "Fiber g"],
  ["netCarbs", "net_carbs_g", "Net carbs g"], ["fat", "fat_g", "Fat g"],
] as const;
const icon = "btn btn-ghost !h-11 !w-11 !p-0";

export function MealItem({ meal: x }: { meal: Meal }) {
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const day = useDay();
  const toast = useToast();
  const temp = isTemp(x); // still being saved: no actions yet

  const run = (fn: () => Promise<unknown>, done?: () => void) =>
    start(async () => {
      setMsg(null);
      try { await fn(); done?.(); } catch (e: any) { setMsg({ ok: false, text: e.message || "Something went wrong." }); }
    });

  if (editing) {
    return (
      <li>
        <form className="grid grid-cols-2 gap-2" action={(fd) => run(() => updateMeal(x.id, {
          slot: fd.get("slot"), title: String(fd.get("title") ?? ""),
          calories: Number(fd.get("calories")), protein: Number(fd.get("protein")),
          fiber: Number(fd.get("fiber")), netCarbs: Number(fd.get("netCarbs")), fat: Number(fd.get("fat")),
          consumedTime: (fd.get("consumedTime") as string) || null,
        }), () => setEditing(false))}>
          <select name="slot" defaultValue={x.slot} className="input" aria-label="Meal slot">
            {SLOTS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <input name="consumedTime" type="time" defaultValue={x.consumed_time?.slice(0, 5) ?? ""}
            className="input" aria-label="Time eaten (optional)" />
          <input name="title" required defaultValue={x.title} className="input col-span-2" aria-label="Meal name" />
          {FIELDS.map(([n, col, l]) => (
            <input key={n} name={n} type="number" step="0.1" min="0" required aria-label={l} placeholder={l}
              defaultValue={Number((x as any)[col])} className="input" />
          ))}
          <div className="col-span-2 flex gap-2">
            <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          {msg && <p className="err col-span-2" role="alert">{msg.text}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="text-sm">
      <div className="flex items-center justify-between gap-1">
        <span className="min-w-0">
          <span className="font-medium">{x.title}</span>
          {x.source?.startsWith("ai") && (
            <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase">AI estimate</span>
          )}
          <span className="block text-xs text-muted">
            {x.consumed_time && `${x.consumed_time.slice(0, 5)} · `}
            {x.calories.toLocaleString("en-US")} kcal · {x.protein_g}g P · {x.fiber_g}g F · {x.net_carbs_g}g NC · {x.fat_g}g fat
          </span>
        </span>
        <span className="flex shrink-0">
          <button className={icon} aria-label={`Edit ${x.title}`} disabled={temp} onClick={() => setEditing(true)}><Pencil className="size-4" /></button>
          <button className={icon} aria-label={`Duplicate ${x.title} to today`} disabled={pending || temp}
            onClick={() => run(() => duplicateMeal(x.id), () => toast({ message: "Copied to today." }))}>
            <Copy className="size-4" />
          </button>
          <button className={icon} aria-label={`Delete ${x.title}`} disabled={pending || temp}
            onClick={() => day?.remove(x)}><Trash2 className="size-4" /></button>
        </span>
      </div>
      {msg && <p className={msg.ok ? "text-xs text-emerald-600" : "err"} role="status">{msg.text}</p>}
    </li>
  );
}
