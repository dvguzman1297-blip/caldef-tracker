"use client";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { AlertTriangle, Info } from "lucide-react";
import {
  DEFAULT_DEFICIT, FAT_PCT, PROTEIN_PER_KG, computeTargets, projectLoss,
} from "@/lib/health";
import { formatDate } from "@/lib/date";
import { saveDietary, saveProfile } from "@/app/actions/profile";
import { ALLERGENS, ALLERGEN_KEYS } from "@/lib/allergens";
import { useToast } from "@/components/toast";
import { CheckField } from "@/components/ui/check-field";
import { SelectField } from "@/components/ui/select-field";
import { Segmented } from "@/components/ui/segmented";

const num = (label: string, min: number, max: number, unit: string) =>
  z.number({ error: `${label} is required` }).min(min, `${label} must be ${min}–${max} ${unit}`.trim()).max(max, `${label} must be ${min}–${max} ${unit}`.trim());

const Schema = z.object({
  heightCm: num("Height", 100, 250, "cm"),
  currentWeightKg: num("Current weight", 30, 300, "kg"),
  targetWeightKg: num("Target weight", 30, 300, "kg"),
  age: num("Age", 14, 100, "years").int("Age must be a whole number"),
  sex: z.enum(["male", "female"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  deficitPct: z.number().min(0.1).max(0.25),
  proteinPerKg: z.number().min(PROTEIN_PER_KG.min).max(PROTEIN_PER_KG.max),
  fatPct: z.number().min(FAT_PCT.min).max(FAT_PCT.max),
  dietaryPreferences: z.string().max(300),
  allergens: z.array(z.string()),
  pregnantOrNursing: z.boolean(),
  eatingDisorderRisk: z.boolean(),
  medicalCondition: z.boolean(),
});
type V = z.infer<typeof Schema>;

/** Inputs that change the calculated targets. Editing any of these brings in the health check. */
const TARGET_KEYS = ["heightCm", "currentWeightKg", "targetWeightKg", "age", "sex", "activity", "deficitPct", "proteinPerKg", "fatPct"] as const;

export type SavedTargets = { calories: number; protein: number; fiber: number; carbs: number; fat: number; bmr: number; tdee: number };

const DEFICITS = [0.1, 0.15, 0.2, 0.25] as const;
const DEFICIT_NOTE: Record<(typeof DEFICITS)[number], string> = {
  0.1: "Gentle: slowest, easiest to stick to.",
  0.15: "Moderate.",
  0.2: "Standard: a sustainable pace for most people.",
  0.25: "Aggressive: the fastest we offer. Harder to sustain and more likely to cost muscle.",
};
const pct = (d: number) => `${Math.round(d * 100)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString("en-US");

export function ProfileForm({ defaults, saved, isNew, today }: {
  defaults: Partial<V>; saved: SavedTargets | null; isNew: boolean; today: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const initialValues: V = {
    sex: "female", activity: "moderate", deficitPct: DEFAULT_DEFICIT, proteinPerKg: PROTEIN_PER_KG.default, fatPct: FAT_PCT.default,
    dietaryPreferences: "", allergens: [], pregnantOrNursing: false, eatingDisorderRisk: false, medicalCondition: false,
    ...defaults,
  } as V;
  const [baseline, setBaseline] = useState(initialValues);
  const [savedTargets, setSavedTargets] = useState(saved);
  const [justSaved, setJustSaved] = useState(false);

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting, isValid } } = useForm<V>({
    resolver: zodResolver(Schema), defaultValues: initialValues, mode: "onTouched",
  });
  const v = useWatch({ control }) as V;

  const sameNum = (a: unknown, b: unknown) => Number(a) === Number(b) || (Number.isNaN(Number(a)) && Number.isNaN(Number(b)));
  const targetDirty = isNew || TARGET_KEYS.some((k) =>
    typeof baseline[k] === "string" ? v[k] !== baseline[k] : !sameNum(v[k], baseline[k]));
  const dietDirty = v.dietaryPreferences !== baseline.dietaryPreferences
    || [...(v.allergens ?? [])].sort().join() !== [...baseline.allergens].sort().join();
  const dirty = targetDirty || dietDirty;

  const ready = [v.heightCm, v.currentWeightKg, v.targetWeightKg, v.age].every((x) => Number(x) > 0);
  const preview = ready ? computeTargets({
    weightKg: v.currentWeightKg, targetWeightKg: v.targetWeightKg, heightCm: v.heightCm,
    age: v.age, sex: v.sex, activity: v.activity, deficitPct: Number(v.deficitPct),
    proteinPerKg: Number(v.proteinPerKg), fatPct: Number(v.fatPct),
    screening: { pregnantOrNursing: !!v.pregnantOrNursing, eatingDisorderRisk: !!v.eatingDisorderRisk, medicalCondition: !!v.medicalCondition },
  }) : null;
  const projection = preview && !preview.restrictedReason ? projectLoss({
    weightKg: v.currentWeightKg, targetWeightKg: v.targetWeightKg, tdee: preview.tdee, targetCalories: preview.targetCalories, today,
  }) : null;
  const screeningTicked = !!(v.pregnantOrNursing || v.eatingDisorderRisk || v.medicalCondition);

  // Show what is saved until the user changes something that moves the targets
  const shown = targetDirty && preview
    ? { calories: preview.targetCalories, protein: preview.targetProteinG, fiber: preview.targetFiberG, carbs: preview.targetCarbsG, fat: preview.targetFatG, bmr: preview.bmr, tdee: preview.tdee }
    : savedTargets ?? (preview && { calories: preview.targetCalories, protein: preview.targetProteinG, fiber: preview.targetFiberG, carbs: preview.targetCarbsG, fat: preview.targetFatG, bmr: preview.bmr, tdee: preview.tdee });

  const canSave = dirty && !isSubmitting && (!targetDirty || isValid);

  const onSubmit = handleSubmit(async (d) => {
    setError(""); setJustSaved(false);
    try {
      if (targetDirty) {
        await saveProfile(d);
        if (preview) setSavedTargets({ calories: preview.targetCalories, protein: preview.targetProteinG, fiber: preview.targetFiberG, carbs: preview.targetCarbsG, fat: preview.targetFatG, bmr: preview.bmr, tdee: preview.tdee });
        toast({ message: preview?.restrictedReason ? "Profile saved. No calorie deficit was applied." : `Profile saved. Your target is ${n0(preview?.targetCalories ?? 0)} kcal a day.` });
      } else {
        await saveDietary({ dietaryPreferences: d.dietaryPreferences, allergens: d.allergens });
        toast({ message: "Food preferences saved. Your targets are unchanged." });
      }
      // Health-check answers are never stored: clear them after every save
      const next = { ...d, pregnantOrNursing: false, eatingDisorderRisk: false, medicalCondition: false };
      setBaseline(next); reset(next); setJustSaved(true);
      if (isNew) router.push("/"); else router.refresh();
    } catch {
      setError("Could not save your profile. Check the values and try again.");
    }
  });

  const field = (name: "heightCm" | "currentWeightKg" | "targetWeightKg" | "age", label: string, unit: string, step = "0.1") => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <div className="relative">
        <input id={name} type="number" inputMode="decimal" step={step} aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `${name}-err` : undefined} className="input !min-h-11 !pr-14"
          {...register(name, { valueAsNumber: true })} />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted" aria-hidden="true">{unit}</span>}
      </div>
      {errors[name] && <p id={`${name}-err`} className="err" role="alert">{String(errors[name]?.message)}</p>}
    </div>
  );

  const status = isSubmitting ? "Saving…" : dirty ? "Changes not saved" : justSaved ? "Saved" : "All changes saved";
  const saveBtn = (className = "") => (
    <button form="profile-form" className={`btn ${className}`} disabled={!canSave}>{isSubmitting ? "Saving…" : "Save changes"}</button>
  );

  const summary = (
    <div className="glass space-y-3 p-4" aria-label="Your daily targets">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Your daily targets</h2>
        <span className={`pill ${dirty ? "!border-warn !text-warn" : ""}`} role="status">{status}</span>
      </div>
      {shown ? (
        <>
          <p className="text-4xl font-bold tabular-nums">{n0(shown.calories)}<span className="ml-1 text-base font-medium text-muted">kcal</span></p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Row label="Protein" value={`${shown.protein} g`} />
            <Row label="Net carbs" value={`${Math.max(shown.carbs - shown.fiber, 0)} g`} />
            <Row label="Fat" value={`${shown.fat} g`} />
            <Row label="Fiber" value={`${shown.fiber} g`} />
            <Row label="BMR" value={`${n0(shown.bmr)} kcal`} />
            <Row label="TDEE" value={`${n0(shown.tdee)} kcal`} />
          </dl>
          {targetDirty && preview && (
            <p className="text-sm text-muted">
              <Info className="mr-1 inline size-4 align-text-bottom" aria-hidden="true" />
              Protein is based on <b className="text-fg">{preview.proteinBasisKg} kg</b>
              {preview.proteinBasisKind === "adjusted" ? " (an adjusted weight, since protein needs follow lean mass)" : " (your current weight)"}.
            </p>
          )}
        </>
      ) : <p className="text-sm text-muted">Fill in your details to see your targets.</p>}
      <p className="text-xs text-muted">
        A general estimate (Mifflin–St Jeor), not medical advice. It can be off by several hundred calories for individuals;
        adjust with your doctor or dietitian, and stop and seek care if you feel unwell.
      </p>
      <div className="hidden lg:block">{saveBtn("w-full")}</div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <form id="profile-form" onSubmit={onSubmit} className="space-y-6" noValidate>
        <section className="glass grid gap-4 p-4 sm:p-5 md:grid-cols-2" aria-labelledby="about-h">
          <h2 id="about-h" className="font-semibold md:col-span-2">About you</h2>
          {field("age", "Age", "years", "1")}
          <Controller control={control} name="sex" render={({ field: f }) => (
            <Segmented label="Biological sex" value={f.value} onChange={f.onChange}
              options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} />
          )} />
          {field("heightCm", "Height", "cm")}
          {field("currentWeightKg", "Current weight", "kg")}
          <div className="md:col-span-2">
            <label className="label" htmlFor="activity">Activity level</label>
            <SelectField id="activity" {...register("activity")}>
              <option value="sedentary">Sedentary (desk job, little exercise)</option>
              <option value="light">Light (1–3 workouts/week)</option>
              <option value="moderate">Moderate (3–5 workouts/week)</option>
              <option value="active">Active (6–7 workouts/week)</option>
              <option value="very_active">Very active (physical job + training)</option>
            </SelectField>
          </div>
        </section>

        <section className="glass grid gap-4 p-4 sm:p-5 md:grid-cols-2" aria-labelledby="goal-h">
          <h2 id="goal-h" className="font-semibold md:col-span-2">Your goal</h2>
          {field("targetWeightKg", "Target weight", "kg")}
          <div className="md:col-span-2">
            <Controller control={control} name="deficitPct" render={({ field: f }) => (
              <Segmented label="Calorie deficit" value={String(f.value)} onChange={(s) => f.onChange(Number(s))}
                options={DEFICITS.map((d) => ({ value: String(d), label: pct(d) }))} />
            )} />
            <p className={`mt-2 text-sm ${Number(v.deficitPct) >= 0.25 ? "font-medium text-warn" : "text-muted"}`}>
              {DEFICIT_NOTE[(DEFICITS.find((d) => d === Number(v.deficitPct)) ?? DEFAULT_DEFICIT)]}
            </p>
            {projection && (
              <p className={`mt-2 rounded-xl p-3 text-sm ${projection.aggressive ? "bg-warn/15" : "bg-inset"}`}>
                {projection.aggressive && <AlertTriangle className="mr-1 inline size-4 align-text-bottom text-warn" aria-hidden="true" />}
                About <b>{projection.weeklyKg.toFixed(2)} kg per week</b>
                {projection.weeks <= 104
                  ? <>, reaching {v.targetWeightKg} kg around <b>{formatDate(projection.etaDate, today)}</b>.</>
                  : <>; that&apos;s more than two years to reach {v.targetWeightKg} kg.</>}
                {projection.aggressive && " That is faster than the ~1% of body weight per week usually considered sustainable."}
                <span className="block text-xs text-muted">An estimate: real progress slows as you lose weight.</span>
              </p>
            )}
          </div>

          <fieldset className="grid gap-3 sm:grid-cols-2 md:col-span-2">
            <legend className="label">Macro split (optional)</legend>
            <div>
              <label className="label" htmlFor="proteinPerKg">Protein: {Number(v.proteinPerKg).toFixed(1)} g per kg</label>
              <input id="proteinPerKg" type="range" step="0.1" min={PROTEIN_PER_KG.min} max={PROTEIN_PER_KG.max}
                className="h-11 w-full accent-[var(--accent)]" {...register("proteinPerKg", { valueAsNumber: true })} />
              <p className="text-xs text-muted">{preview ? `Based on ${preview.proteinBasisKg} kg → ${preview.targetProteinG} g a day.` : "Based on your body weight."}</p>
            </div>
            <div>
              <label className="label" htmlFor="fatPct">Fat: {Math.round(Number(v.fatPct) * 100)}% of calories</label>
              <input id="fatPct" type="range" step="0.01" min={FAT_PCT.min} max={FAT_PCT.max}
                className="h-11 w-full accent-[var(--accent)]" {...register("fatPct", { valueAsNumber: true })} />
              <p className="text-xs text-muted">{preview ? `${preview.targetFatG} g a day. Carbs fill the rest.` : "Carbs fill the rest."}</p>
            </div>
          </fieldset>
        </section>

        <section className="glass grid gap-4 p-4 sm:p-5" aria-labelledby="food-h">
          <h2 id="food-h" className="font-semibold">Food preferences</h2>
          <div>
            <label className="label" htmlFor="dietaryPreferences">Dietary preferences or restrictions</label>
            <input id="dietaryPreferences" className="input !min-h-11" placeholder="e.g. vegetarian, no peanuts" {...register("dietaryPreferences")} />
          </div>
          <fieldset>
            <legend className="label">Allergens to avoid</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ALLERGEN_KEYS.map((k) => (
                <CheckField key={k} value={k} {...register("allergens")}>{ALLERGENS[k].label}</CheckField>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted">AI recipes are screened against these, but the screen is keyword-based and not a guarantee. Always read ingredient labels yourself.</p>
          </fieldset>
        </section>

        {targetDirty && (
          <fieldset className="glass grid gap-2 p-4 text-sm sm:p-5" aria-labelledby="health-h">
            <legend id="health-h" className="px-1 font-semibold">Health check (not stored; asked when your body details or plan change)</legend>
            <p className="text-muted">Tick anything that applies. If nothing does, leave these empty.</p>
            <CheckField {...register("pregnantOrNursing")}>I am pregnant or breastfeeding</CheckField>
            <CheckField {...register("eatingDisorderRisk")}>I have a history of, or concern about, disordered eating</CheckField>
            <CheckField {...register("medicalCondition")}>I have a medical condition or take medication that affects diet or weight (e.g. diabetes, kidney disease)</CheckField>
            <p className="text-muted">If any apply, we won&apos;t set a weight-loss deficit. Your doctor or a registered dietitian is the right person to set targets. Your answers are never stored.</p>
          </fieldset>
        )}

        {(screeningTicked || preview?.restrictedReason) && (
          <div role="alert" className="rounded-2xl border border-warn bg-warn/10 p-4 text-sm">
            <p className="font-semibold">What happens with your plan</p>
            <p className="mt-1">{preview?.restrictedReason ?? "No weight-loss deficit will be set."}</p>
            <p className="mt-2 text-muted">
              Instead you&apos;ll get a maintenance estimate, which is the calories to stay at your current weight. This isn&apos;t a
              judgement: it&apos;s there to keep you safe. A doctor or registered dietitian can set targets that fit you.
            </p>
          </div>
        )}

        {error && <p className="err !text-sm" role="alert">{error}</p>}
        <div className="lg:hidden">{summary}</div>
      </form>

      <aside className="hidden lg:sticky lg:top-24 lg:block" aria-label="Targets summary">{summary}</aside>

      {/* Mobile: sticky save bar above the bottom nav */}
      <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-3 rounded-2xl border border-line-strong bg-surface-2 px-4 py-2 shadow-xl lg:hidden">
        <div className="min-w-0 text-sm">
          <p className={`font-semibold ${dirty ? "text-warn" : ""}`}>{status}</p>
          {shown && <p className="truncate text-muted tabular-nums">{n0(shown.calories)} kcal · {shown.protein} g protein</p>}
        </div>
        {saveBtn()}
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-inset px-3 py-2">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="font-semibold tabular-nums">{value}</dd>
  </div>
);
