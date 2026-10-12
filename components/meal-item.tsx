"use client";
import { useState, useTransition } from "react";
import { Copy, Pencil, Sparkles, Trash2 } from "lucide-react";
import { duplicateMeal, updateMeal } from "@/app/actions/meals";
import { isPending as isTemp, useDay } from "@/components/day-context";
import { useToast } from "@/components/toast";
import { MacroLine } from "@/components/macro-line";
import { RowMenu, rowMenuItem } from "@/components/ui/row-menu";
import type { Meal } from "@/lib/day";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
const FIELDS = [
  ["calories", "calories", "kcal"], ["protein", "protein_g", "Protein g"], ["fiber", "fiber_g", "Fiber g"],
  ["netCarbs", "net_carbs_g", "Net carbs g"], ["fat", "fat_g", "Fat g"],
] as const;

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
            <Sparkles role="img" aria-label="AI estimate" className="ml-1.5 inline size-3.5 align-[-2px] text-warn" />
          )}
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
            {x.consumed_time && <><span className="tabular-nums">{x.consumed_time.slice(0, 5)}</span><span aria-hidden="true">·</span></>}
            <b className="whitespace-nowrap font-semibold tabular-nums text-fg">{Number(x.calories).toLocaleString("en-US")} kcal</b>
            <span aria-hidden="true">·</span>
            <MacroLine protein={Number(x.protein_g)} netCarbs={Number(x.net_carbs_g)} fat={Number(x.fat_g)} fiber={Number(x.fiber_g)} />
          </span>
        </span>
        <RowMenu label={`Actions for ${x.title}`}>
          <button className={rowMenuItem} disabled={temp} onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden="true" />Edit
          </button>
          <button className={rowMenuItem} disabled={pending || temp}
            onClick={() => run(() => duplicateMeal(x.id), () => toast({ message: "Copied to today." }))}>
            <Copy className="size-4" aria-hidden="true" />Copy to today
          </button>
          <button className={`${rowMenuItem} text-danger hover:bg-danger-soft`} disabled={pending || temp} onClick={() => day?.remove(x)}>
            <Trash2 className="size-4" aria-hidden="true" />Delete
          </button>
        </RowMenu>
      </div>
      {msg && <p className={msg.ok ? "text-xs text-emerald-600" : "err"} role="status">{msg.text}</p>}
    </li>
  );
}
