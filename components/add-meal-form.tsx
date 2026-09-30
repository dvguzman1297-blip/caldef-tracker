"use client";
import { useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { addManualMeal } from "@/app/actions/meals";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
const FIELDS = [
  ["calories", "kcal"], ["protein", "Protein g"], ["fiber", "Fiber g"],
  ["netCarbs", "Net carbs g"], ["fat", "Fat g"],
] as const;

export function AddMealForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function estimate() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/estimate-meal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const f = formRef.current!, m = json.meal;
      const set = (name: string, v: string | number) =>
        ((f.elements.namedItem(name) as HTMLInputElement).value = String(v));
      set("title", m.title); set("calories", m.calories); set("protein", m.protein);
      set("fiber", m.fiber); set("netCarbs", m.netCarbs); set("fat", m.fat);
      setMsg({ ok: true, text: "AI estimate filled in. Review the numbers, then add the meal." });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || "Something went wrong. Try again." });
    } finally { setBusy(false); }
  }

  return (
    <details className="glass p-4">
      <summary className="cursor-pointer font-semibold">Add a meal manually</summary>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input"
          aria-label="Describe your meal"
          placeholder="Describe it, e.g. 2 scrambled eggs, 2 slices whole wheat toast, half an avocado" />
        <button type="button" className="btn shrink-0" disabled={busy || desc.trim().length < 3} onClick={estimate}>
          <Sparkles className="size-4" />{busy ? "Estimating…" : "Estimate with AI"}
        </button>
      </div>
      {msg && <p className={msg.ok ? "mt-2 text-sm text-emerald-600" : "err"} role="status">{msg.text}</p>}

      <form ref={formRef} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4"
        action={async (fd) => { await addManualMeal(fd); formRef.current?.reset(); setDesc(""); setMsg(null); }}>
        <select name="slot" className="input" aria-label="Meal slot">
          {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input name="title" required placeholder="Meal name" className="input md:col-span-3" />
        {FIELDS.map(([n, l]) => (
          <input key={n} name={n} type="number" step="0.1" min="0" required placeholder={l} aria-label={l} className="input" />
        ))}
        <button className="btn"><Plus className="size-4" />Add meal</button>
      </form>
    </details>
  );
}