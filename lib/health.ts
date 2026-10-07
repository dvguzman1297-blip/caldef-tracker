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

export const DEFAULT_DEFICIT = 0.2; // standard; new profiles start here
export const MAX_DEFICIT = 0.25; // offered, but labelled aggressive
export const PROTEIN_PER_KG = { min: 1.6, max: 2.2, default: 2.0 } as const;
export const FAT_PCT = { min: 0.2, max: 0.35, default: 0.25 } as const; // share of calories
export const KCAL_PER_KG = 7700; // rule-of-thumb energy in 1 kg of body weight

export type Screening = {
  pregnantOrNursing: boolean; eatingDisorderRisk: boolean; medicalCondition: boolean;
};

export const bmi = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2;

/** Heaviest weight still at BMI 25 for this height. */
export const healthyMaxKg = (heightCm: number) => 25 * (heightCm / 100) ** 2;

/**
 * Body weight that protein is calculated from. Protein needs track lean mass, not fat mass, so for
 * a BMI above 25 using total weight overshoots. Above that line we use an "adjusted" weight: the
 * BMI-25 weight plus 25% of the excess. At or below BMI 25 it is simply current weight, and the
 * function is continuous at the boundary (no cliff).
 */
export function proteinBasis(weightKg: number, heightCm: number): { kg: number; kind: "current" | "adjusted" } {
  const ceiling = healthyMaxKg(heightCm);
  if (weightKg <= ceiling) return { kg: weightKg, kind: "current" };
  return { kg: Math.round((ceiling + 0.25 * (weightKg - ceiling)) * 10) / 10, kind: "adjusted" };
}

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
  /** Protein grams per kg of the protein basis weight (default 2.0, allowed 1.6-2.2). */
  proteinPerKg?: number;
  /** Fat as a share of calories (default 25%, allowed 20-35%). */
  fatPct?: number;
}) {
  const restrictedReason = deficitRestriction(p);
  const deficitPct = restrictedReason ? 0 : Math.min(p.deficitPct ?? DEFAULT_DEFICIT, MAX_DEFICIT);
  const b = bmr(p.weightKg, p.heightCm, p.age, p.sex);
  const tdee = b * ACTIVITY[p.activity];
  const floor = p.sex === "male" ? 1500 : 1200; // safety floor
  // Never below the floor, but the floor itself never exceeds maintenance (that would be a surplus)
  const calories = Math.round(Math.max(tdee * (1 - deficitPct), Math.min(floor, tdee)));

  const basis = proteinBasis(p.weightKg, p.heightCm);
  const perKg = Math.min(Math.max(p.proteinPerKg ?? PROTEIN_PER_KG.default, PROTEIN_PER_KG.min), PROTEIN_PER_KG.max);
  const protein = Math.round(basis.kg * perKg);

  const fiber = Math.round(Math.min(38, Math.max(25, (calories / 1000) * 14)));
  const fatShare = Math.min(Math.max(p.fatPct ?? FAT_PCT.default, FAT_PCT.min), FAT_PCT.max);
  const fat = Math.round((calories * fatShare) / 9);
  const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 50);

  return {
    bmr: Math.round(b), tdee: Math.round(tdee), deficitPct, restrictedReason,
    proteinBasisKg: basis.kg, proteinBasisKind: basis.kind, proteinPerKg: perKg, fatPct: fatShare,
    targetCalories: calories, targetProteinG: protein,
    targetFiberG: fiber, targetCarbsG: carbs, targetFatG: fat,
  };
}

/**
 * Rough weight-loss projection from the actual daily deficit (TDEE minus target calories, which already
 * reflects the calorie floor). Returns null when there is no deficit or no weight to lose.
 * Real loss slows as weight drops; treat the date as an optimistic estimate.
 */
export function projectLoss(p: {
  weightKg: number; targetWeightKg: number; tdee: number; targetCalories: number; today: string;
}) {
  const dailyDeficit = p.tdee - p.targetCalories;
  const toLose = p.weightKg - p.targetWeightKg;
  if (dailyDeficit <= 0 || toLose <= 0) return null;
  const weeklyKg = (dailyDeficit * 7) / KCAL_PER_KG;
  const weeks = toLose / weeklyKg;
  const d = new Date(`${p.today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(weeks * 7));
  return {
    dailyDeficit: Math.round(dailyDeficit), weeklyKg, weeks, etaDate: d.toISOString().slice(0, 10),
    // Faster than ~1% of body weight per week is flagged as aggressive
    aggressive: weeklyKg > p.weightKg * 0.01,
  };
}

/**
 * Recovers the macro split from stored targets, so a custom split survives a reload without a schema
 * change. Values are snapped to the UI steps and clamped to the allowed ranges.
 */
export function inferSplit(s: { proteinG: number; fatG: number; calories: number; weightKg: number; heightCm: number }) {
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const basis = proteinBasis(s.weightKg, s.heightCm).kg;
  return {
    proteinPerKg: basis > 0 ? clamp(Math.round((s.proteinG / basis) * 10) / 10, PROTEIN_PER_KG.min, PROTEIN_PER_KG.max) : PROTEIN_PER_KG.default,
    fatPct: s.calories > 0 ? clamp(Math.round(((s.fatG * 9) / s.calories) * 100) / 100, FAT_PCT.min, FAT_PCT.max) : FAT_PCT.default,
  };
}
