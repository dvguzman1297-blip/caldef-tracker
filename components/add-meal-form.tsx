"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { addManualMeal } from "@/app/actions/meals";
import { saveFood } from "@/app/actions/foods";
import { createClient } from "@/lib/supabase/client";
import { useDay } from "@/components/day-context";

type Food = { id: string; name: string; serving: string; calories: number; protein_g: number; fiber_g: number; net_carbs_g: number; fat_g: number };

const SLOTS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

const FIELDS = [
  ["calories", "kcal"], ["protein", "Protein g"], ["fiber", "Fiber g"],
  ["netCarbs", "Net carbs g"], ["fat", "Fat g"],
] as const;

export function AddMealForm({ onDone, date, slot }: {
  onDone?: () => void; date?: string; slot?: (typeof SLOTS)[number]["value"];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const day = useDay();
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodId, setFoodId] = useState("");
  const [servings, setServings] = useState(1);

  const loadFoods = async () => {
    const { data } = await createClient().from("saved_foods")
      .select("id,name,serving,calories,protein_g,fiber_g,net_carbs_g,fat_g").order("name");
    setFoods((data as Food[]) ?? []);
  };
  useEffect(() => { loadFoods(); }, []); // eslint-disable-line

  const setField = (name: string, v: string | number) => {
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
    if (el) el.value = String(v);
  };
  function applyFood(id: string, k: number) {
    const f = foods.find((x) => x.id === id);
    if (!f || !(k > 0)) return;
    const r = (n: number) => Math.round(Number(n) * k * 10) / 10;
    setField("title", k === 1 ? f.name : `${f.name} ×${k}`);
    setField("calories", Math.round(f.calories * k)); setField("protein", r(f.protein_g));
    setField("fiber", r(f.fiber_g)); setField("netCarbs", r(f.net_carbs_g)); setField("fat", r(f.fat_g));
    setAiFilled(false); setReviewed(false);
  }
  async function saveCurrent() {
    const fd = new FormData(formRef.current!);
    const n = (k: string) => Number(fd.get(k) || 0);
    try {
      await saveFood({ name: String(fd.get("title") ?? ""), serving: "1 serving", calories: n("calories"),
        protein: n("protein"), fiber: n("fiber"), netCarbs: n("netCarbs"), fat: n("fat") });
      await loadFoods(); setMsg({ ok: true, text: "Saved to your foods." });
    } catch (e: any) { setMsg({ ok: false, text: e.message || "Could not save food." }); }
  }
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function estimate() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/estimate-meal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        throw new Error(json?.error || `Estimate failed (status ${res.status}). Check the server terminal.`);
      }
      const f = formRef.current!, m = json.meal;
      const set = (name: string, v: string | number) =>
        ((f.elements.namedItem(name) as HTMLInputElement).value = String(v));
      set("title", m.title); set("calories", m.calories); set("protein", m.protein);
      set("fiber", m.fiber); set("netCarbs", m.netCarbs); set("fat", m.fat);
      setAiFilled(true); setReviewed(false);
      setMsg({ ok: true, text: json.adjusted
        ? "AI estimate filled in (calories were recalculated from its macros). Check the numbers before adding."
        : "AI estimate filled in. Check the numbers before adding." });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || "Something went wrong. Try again." });
    } finally { setBusy(false); }
  }

  async function submit(fd: FormData) {
    // On the dashboard's day, show the meal immediately and let the day context handle failure
    if (day && (!date || date === day.date)) {
      const n = (k: string) => Number(fd.get(k) || 0);
      day.log({
        slot: String(fd.get("slot")) as (typeof SLOTS)[number]["value"], title: String(fd.get("title") ?? ""),
        calories: n("calories"), protein: n("protein"), fiber: n("fiber"), netCarbs: n("netCarbs"), fat: n("fat"),
        source: String(fd.get("source")),
      }, () => addManualMeal(fd), "Meal added.");
      formRef.current?.reset(); setDesc(""); setAiFilled(false); setReviewed(false); setMsg(null);
      onDone?.();
      return;
    }
    setAdding(true); setMsg(null);
    try {
      await addManualMeal(fd);
      formRef.current?.reset(); setDesc(""); setAiFilled(false); setReviewed(false);
      onDone?.();
    } catch {
      setMsg({ ok: false, text: "Could not add the meal. Check the values and try again." });
    } finally { setAdding(false); }
  }

  const body = (
    <>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input"
          aria-label="Describe your meal"
          placeholder="Describe it, e.g. 2 scrambled eggs, 2 slices whole wheat toast, half an avocado" />
        <button type="button" className="btn shrink-0" disabled={busy || desc.trim().length < 3} onClick={estimate}>
          <Sparkles className="size-4" />{busy ? "Estimating…" : "Estimate with AI"}
        </button>
      </div>
      {msg && <p className={msg.ok ? "mt-2 text-sm text-emerald-600" : "err"} role="status">{msg.text}</p>}

      {foods.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select className="input !w-auto min-w-48" aria-label="Saved foods" value={foodId}
            onChange={(e) => { setFoodId(e.target.value); applyFood(e.target.value, servings); }}>
            <option value="">Use a saved food…</option>
            {foods.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.serving}, {f.calories} kcal)</option>)}
          </select>
          <label className="text-sm">Servings{" "}
            <input type="number" min="0.25" max="20" step="0.25" value={servings} className="input !w-20"
              onChange={(e) => { const k = Number(e.target.value); setServings(k); if (foodId) applyFood(foodId, k); }} />
          </label>
        </div>
      )}

      <form ref={formRef} action={submit} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {date && <input type="hidden" name="date" value={date} />}
        <input type="hidden" name="source" value={aiFilled ? "ai_estimate" : "manual"} />
        <select name="slot" className="input" aria-label="Meal slot" defaultValue={slot}>
          {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input name="title" required placeholder="Meal name" className="input md:col-span-3" />
        {FIELDS.map(([n, l]) => (
          <input key={n} name={n} type="number" step="0.1" min="0" required
            placeholder={l} aria-label={l} className="input" />
        ))}
        <input name="consumedTime" type="time" aria-label="Time eaten (optional)" className="input" />
        {aiFilled && (
          <label className="col-span-2 flex items-start gap-2 text-sm md:col-span-4">
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-1" />
            <span>
              <b>AI estimate.</b> It can be off by 20–30% or more, especially for portions. I checked the numbers
              and edited anything that looks wrong.
            </span>
          </label>
        )}
        <button className="btn" disabled={adding || (aiFilled && !reviewed)}>
          <Plus className="size-4" />{adding ? "Adding…" : "Add meal"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={saveCurrent}>Save as food</button>
      </form>
    </>
  );

  return <div>{body}</div>;
}