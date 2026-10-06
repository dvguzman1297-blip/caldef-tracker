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

export type Screening = {
  pregnantOrNursing: boolean; eatingDisorderRisk: boolean; medicalCondition: boolean;
};

export const bmi = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2;

/** Reason a calorie deficit must not be prescribed, or null if one is acceptable. */
export function deficitRestriction(p: {
  weightKg: number; targetWeightKg?: number; heightCm: number; age: number; screening: Screening;
}): string | null {
  if (p.age < 18)
    return "Calorie-deficit plans aren't offered under 18. Growing bodies need full energy, so this is a maintenance estimate.";
  if (p.screening.pregnantOrNursing)
    return "Weight-loss targets aren't appropriate during pregnancy or breastfeeding. This is a maintenance estimate; ask your midwife or doctor about nutrition.";
  if (p.screening.eatingDisorderRisk)
    return "Because of your eating-disorder history or risk, we don't set calorie-restriction targets. Please talk to a doctor or eating-disorder service before tracking intake.";
  if (p.screening.medicalCondition)
    return "With a medical condition or medication that affects diet or weight, a doctor or dietitian should set your targets. This is a maintenance estimate only.";
  if (bmi(p.weightKg, p.heightCm) < 18.5)
    return "Your current BMI is in the underweight range, so no deficit is applied. Consider speaking with a doctor.";
  if (p.targetWeightKg && bmi(p.targetWeightKg, p.heightCm) < 18.5)
    return "Your target weight would be underweight (BMI < 18.5), so no deficit is applied. Pick a higher goal or consult a doctor.";
  return null;
}

export function computeTargets(p: {
  weightKg: number; targetWeightKg?: number; heightCm: number;
  age: number; sex: Sex; activity: Activity; deficitPct?: number; screening: Screening;
}) {
  const restrictedReason = deficitRestriction(p);
  const deficitPct = restrictedReason ? 0 : Math.min(p.deficitPct ?? 0.2, 0.25);
  const b = bmr(p.weightKg, p.heightCm, p.age, p.sex);
  const tdee = b * ACTIVITY[p.activity];
  const floor = p.sex === "male" ? 1500 : 1200; // safety floor
  // Never below the floor, but the floor itself never exceeds maintenance (that would be a surplus)
  const calories = Math.round(Math.max(tdee * (1 - deficitPct), Math.min(floor, tdee)));

  // 2.0 g/kg (inside the 1.6-2.2 range); for large deficits use a blend toward goal weight
  const refKg = !restrictedReason && p.targetWeightKg && p.targetWeightKg < p.weightKg
    ? Math.max(p.targetWeightKg, p.weightKg * 0.85) : p.weightKg;
  const protein = Math.round(refKg * 2.0);

  const fiber = Math.round(Math.min(38, Math.max(25, (calories / 1000) * 14)));
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 50);

  return {
    bmr: Math.round(b), tdee: Math.round(tdee), deficitPct, restrictedReason,
    targetCalories: calories, targetProteinG: protein,
    targetFiberG: fiber, targetCarbsG: carbs, targetFatG: fat,
  };
}
