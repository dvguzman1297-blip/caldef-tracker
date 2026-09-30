export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

// Mifflin-St Jeor
export function bmr(weightKg: number, heightCm: number, age: number, sex: Sex) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function computeTargets(p: {
  weightKg: number; targetWeightKg?: number; heightCm: number;
  age: number; sex: Sex; activity: Activity; deficitPct?: number;
}) {
  const deficitPct = p.deficitPct ?? 0.2;
  const b = bmr(p.weightKg, p.heightCm, p.age, p.sex);
  const tdee = b * ACTIVITY[p.activity];
  const floor = p.sex === "male" ? 1500 : 1200; // safety floor
  const calories = Math.round(Math.max(tdee * (1 - deficitPct), floor));

  // 2.0 g/kg (inside the 1.6-2.2 range); for large deficits use a blend toward goal weight
  const refKg = p.targetWeightKg && p.targetWeightKg < p.weightKg
    ? Math.max(p.targetWeightKg, p.weightKg * 0.85) : p.weightKg;
  const protein = Math.round(refKg * 2.0);

  const fiber = Math.round(Math.min(38, Math.max(25, (calories / 1000) * 14)));
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 50);

  return {
    bmr: Math.round(b), tdee: Math.round(tdee), deficitPct,
    targetCalories: calories, targetProteinG: protein,
    targetFiberG: fiber, targetCarbsG: carbs, targetFatG: fat,
  };
}
