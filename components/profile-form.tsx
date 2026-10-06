"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { computeTargets } from "@/lib/health";
import { saveProfile } from "@/app/actions/profile";
import { ALLERGENS, ALLERGEN_KEYS } from "@/lib/allergens";

const Schema = z.object({
  heightCm: z.number({ error: "Required" }).min(100).max(250),
  currentWeightKg: z.number({ error: "Required" }).min(30).max(300),
  targetWeightKg: z.number({ error: "Required" }).min(30).max(300),
  age: z.number({ error: "Required" }).int().min(14).max(100),
  sex: z.enum(["male", "female"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  deficitPct: z.number().min(0.1).max(0.25),
  dietaryPreferences: z.string().max(300),
  allergens: z.array(z.string()),
  pregnantOrNursing: z.boolean(),
  eatingDisorderRisk: z.boolean(),
  medicalCondition: z.boolean(),
});
type V = z.infer<typeof Schema>;

export function ProfileForm({ defaults }: { defaults: Partial<V> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<V>({
    resolver: zodResolver(Schema),
    defaultValues: { sex: "female", activity: "moderate", deficitPct: 0.2, dietaryPreferences: "", allergens: [],
      pregnantOrNursing: false, eatingDisorderRisk: false, medicalCondition: false, ...defaults },
  });
  const v = watch();
  const ready = [v.heightCm, v.currentWeightKg, v.age].every((x) => Number(x) > 0);
  const preview = ready ? computeTargets({
    weightKg: v.currentWeightKg, targetWeightKg: v.targetWeightKg, heightCm: v.heightCm,
    age: v.age, sex: v.sex, activity: v.activity, deficitPct: Number(v.deficitPct),
    screening: {
      pregnantOrNursing: !!v.pregnantOrNursing, eatingDisorderRisk: !!v.eatingDisorderRisk,
      medicalCondition: !!v.medicalCondition,
    },
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
          <option value={0.2}>20% (standard)</option><option value={0.25}>25% (maximum)</option>
        </select></div>
      <div><label className="label" htmlFor="dietaryPreferences">Dietary preferences or restrictions</label>
        <input id="dietaryPreferences" className="input" placeholder="e.g. vegetarian, no peanuts" {...register("dietaryPreferences")} /></div>

      <fieldset className="md:col-span-2 rounded-xl border border-current/10 p-3 text-sm">
        <legend className="px-1 font-medium">Allergens to avoid</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALLERGEN_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" value={k} {...register("allergens")} />{ALLERGENS[k].label}
            </label>
          ))}
        </div>
        <p className="mt-2 opacity-70">AI recipes are screened against these, but the screen is keyword-based and not a guarantee. Always read ingredient labels yourself.</p>
      </fieldset>

      <fieldset className="md:col-span-2 grid gap-2 rounded-xl border border-current/10 p-3 text-sm">
        <legend className="px-1 font-medium">Health check (not stored, asked on every save)</legend>
        <label className="flex items-start gap-2"><input type="checkbox" {...register("pregnantOrNursing")} />
          I am pregnant or breastfeeding</label>
        <label className="flex items-start gap-2"><input type="checkbox" {...register("eatingDisorderRisk")} />
          I have a history of, or concern about, disordered eating</label>
        <label className="flex items-start gap-2"><input type="checkbox" {...register("medicalCondition")} />
          I have a medical condition or take medication that affects diet or weight (e.g. diabetes, kidney disease)</label>
        <p className="opacity-70">If any apply, we won&apos;t set a weight-loss deficit. Your doctor or a registered dietitian is the right person to set targets.</p>
      </fieldset>

      {preview?.restrictedReason && (
        <div role="alert" className="md:col-span-2 rounded-xl bg-amber-500/15 p-3 text-sm">{preview.restrictedReason}</div>
      )}
      {preview && (
        <div className="md:col-span-2 rounded-xl bg-emerald-600/10 p-3 text-sm">
          BMR {preview.bmr} · TDEE {preview.tdee} kcal → target <b>{preview.targetCalories} kcal</b>,{" "}
          <b>{preview.targetProteinG}g</b> protein, <b>{preview.targetFiberG}g</b> fiber,{" "}
          {preview.targetCarbsG}g carbs, {preview.targetFatG}g fat
          <p className="mt-2 opacity-70">
            This is a general estimate (Mifflin–St Jeor), not medical advice. It can be off by several hundred calories
            for individuals; adjust with your doctor or dietitian, and stop and seek care if you feel unwell.
          </p>
        </div>
      )}
      {error && <p className="err md:col-span-2">{error}</p>}
      <button className="btn md:col-span-2" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
