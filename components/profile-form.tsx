"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { computeTargets } from "@/lib/health";
import { saveProfile } from "@/app/actions/profile";

const Schema = z.object({
  heightCm: z.number({ error: "Required" }).min(100).max(250),
  currentWeightKg: z.number({ error: "Required" }).min(30).max(300),
  targetWeightKg: z.number({ error: "Required" }).min(30).max(300),
  age: z.number({ error: "Required" }).int().min(14).max(100),
  sex: z.enum(["male", "female"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  deficitPct: z.number().min(0.1).max(0.25),
  dietaryPreferences: z.string().max(300),
});
type V = z.infer<typeof Schema>;

export function ProfileForm({ defaults }: { defaults: Partial<V> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<V>({
    resolver: zodResolver(Schema),
    defaultValues: { sex: "female", activity: "moderate", deficitPct: 0.2, dietaryPreferences: "", ...defaults },
  });
  const v = watch();
  const ready = [v.heightCm, v.currentWeightKg, v.age].every((x) => Number(x) > 0);
  const preview = ready ? computeTargets({
    weightKg: v.currentWeightKg, targetWeightKg: v.targetWeightKg, heightCm: v.heightCm,
    age: v.age, sex: v.sex, activity: v.activity, deficitPct: Number(v.deficitPct),
  }) : null;

  const num = (name: keyof V, label: string, step = "1") => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} type="number" step={step} className="input" {...register(name, { valueAsNumber: true })} />
      {errors[name] && <p className="err">{String(errors[name]?.message)}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(async (d) => {
      try { await saveProfile(d); router.push("/"); router.refresh(); }
      catch { setError("Could not save your profile. Check the values and try again."); }
    })} className="glass grid gap-4 p-5 md:grid-cols-2">
      {num("heightCm", "Height (cm)", "0.1")}
      {num("currentWeightKg", "Current weight (kg)", "0.1")}
      {num("targetWeightKg", "Target weight (kg)", "0.1")}
      {num("age", "Age")}
      <div><label className="label" htmlFor="sex">Biological sex</label>
        <select id="sex" className="input" {...register("sex")}><option value="female">Female</option><option value="male">Male</option></select></div>
      <div><label className="label" htmlFor="activity">Activity level</label>
        <select id="activity" className="input" {...register("activity")}>
          <option value="sedentary">Sedentary (desk job, little exercise)</option>
          <option value="light">Light (1–3 workouts/week)</option>
          <option value="moderate">Moderate (3–5 workouts/week)</option>
          <option value="active">Active (6–7 workouts/week)</option>
          <option value="very_active">Very active (physical job + training)</option>
        </select></div>
      <div><label className="label" htmlFor="deficitPct">Calorie deficit</label>
        <select id="deficitPct" className="input" {...register("deficitPct", { valueAsNumber: true })}>
          <option value={0.1}>10% (gentle)</option><option value={0.15}>15%</option>
          <option value={0.2}>20% (standard)</option><option value={0.25}>25% (aggressive)</option>
        </select></div>
      <div><label className="label" htmlFor="dietaryPreferences">Dietary preferences or restrictions</label>
        <input id="dietaryPreferences" className="input" placeholder="e.g. vegetarian, no peanuts" {...register("dietaryPreferences")} /></div>

      {preview && (
        <div className="md:col-span-2 rounded-xl bg-emerald-600/10 p-3 text-sm">
          BMR {preview.bmr} · TDEE {preview.tdee} kcal → target <b>{preview.targetCalories} kcal</b>,{" "}
          <b>{preview.targetProteinG}g</b> protein, <b>{preview.targetFiberG}g</b> fiber,{" "}
          {preview.targetCarbsG}g carbs, {preview.targetFatG}g fat
        </div>
      )}
      {error && <p className="err md:col-span-2">{error}</p>}
      <button className="btn md:col-span-2" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
