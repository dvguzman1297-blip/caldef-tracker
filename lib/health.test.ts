import { describe, expect, it } from "vitest";
import { computeTargets, healthyMaxKg, projectLoss, proteinBasis, type Screening } from "./health";

const none: Screening = { pregnantOrNursing: false, eatingDisorderRisk: false, medicalCondition: false };
const base = { weightKg: 70, targetWeightKg: 62, heightCm: 165, age: 30, sex: "female" as const, activity: "moderate" as const, screening: none };

describe("computeTargets", () => {
  it("defaults to a 20% deficit", () => {
    const t = computeTargets(base);
    expect(t.deficitPct).toBe(0.2);
    expect(t.targetCalories).toBe(Math.round(t.tdee * 0.8));
  });
  it("caps the deficit at 25%", () => expect(computeTargets({ ...base, deficitPct: 0.4 }).deficitPct).toBe(0.25));
  it("withholds the deficit when any health-check box is ticked", () => {
    for (const k of Object.keys(none) as (keyof Screening)[]) {
      const t = computeTargets({ ...base, screening: { ...none, [k]: true } });
      expect(t.deficitPct).toBe(0);
      expect(t.restrictedReason).toBeTruthy();
      expect(t.targetCalories).toBe(t.tdee);
    }
  });
  it("withholds the deficit under 18 and when underweight", () => {
    expect(computeTargets({ ...base, age: 17 }).deficitPct).toBe(0);
    expect(computeTargets({ ...base, weightKg: 45, targetWeightKg: 44 }).deficitPct).toBe(0);
  });
  it("never goes under the calorie floor", () => {
    const t = computeTargets({ ...base, weightKg: 55, targetWeightKg: 52, activity: "sedentary", deficitPct: 0.25 });
    expect(t.targetCalories).toBeGreaterThanOrEqual(1200);
  });
  it("lets the user adjust the macro split within safe bounds", () => {
    const lo = computeTargets({ ...base, proteinPerKg: 1.6 });
    const hi = computeTargets({ ...base, proteinPerKg: 2.2 });
    expect(hi.targetProteinG).toBeGreaterThan(lo.targetProteinG);
    expect(computeTargets({ ...base, proteinPerKg: 9 }).proteinPerKg).toBe(2.2);
    expect(computeTargets({ ...base, fatPct: 0.1 }).fatPct).toBe(0.2);
    expect(computeTargets({ ...base, fatPct: 0.3 }).targetFatG).toBeGreaterThan(computeTargets(base).targetFatG);
  });
});

describe("proteinBasis", () => {
  it("uses current weight at or below BMI 25", () => {
    expect(proteinBasis(70, 175)).toEqual({ kg: 70, kind: "current" });
  });
  it("uses adjusted weight above BMI 25 and is continuous at the boundary", () => {
    const edge = healthyMaxKg(175);
    expect(proteinBasis(edge + 0.01, 175).kg).toBeCloseTo(edge, 1);
    const b = proteinBasis(107, 175);
    expect(b.kind).toBe("adjusted");
    expect(b.kg).toBeCloseTo(edge + 0.25 * (107 - edge), 1);
    expect(b.kg).toBeLessThan(107);
  });
  it("lowers protein for a high BMI versus total body weight", () => {
    const t = computeTargets({ ...base, weightKg: 107, targetWeightKg: 85, heightCm: 175, sex: "male" });
    expect(t.targetProteinG).toBeLessThan(Math.round(107 * 2));
    expect(t.proteinBasisKind).toBe("adjusted");
  });
});

describe("projectLoss", () => {
  it("projects weekly loss and an ETA from the actual deficit", () => {
    const p = projectLoss({ weightKg: 80, targetWeightKg: 70, tdee: 2500, targetCalories: 2000, today: "2026-10-07" })!;
    expect(p.dailyDeficit).toBe(500);
    expect(p.weeklyKg).toBeCloseTo(0.4545, 3);
    expect(p.weeks).toBeCloseTo(22, 0);
    expect(p.etaDate).toBe("2027-03-10");
    expect(p.aggressive).toBe(false);
  });
  it("flags more than ~1% of body weight per week as aggressive", () => {
    expect(projectLoss({ weightKg: 70, targetWeightKg: 60, tdee: 3200, targetCalories: 2400, today: "2026-10-07" })!.aggressive).toBe(true);
  });
  it("returns null with no deficit or nothing to lose", () => {
    expect(projectLoss({ weightKg: 80, targetWeightKg: 70, tdee: 2000, targetCalories: 2000, today: "2026-10-07" })).toBeNull();
    expect(projectLoss({ weightKg: 70, targetWeightKg: 75, tdee: 2500, targetCalories: 2000, today: "2026-10-07" })).toBeNull();
  });
});

import { inferSplit } from "./health";
describe("inferSplit", () => {
  it("round-trips a custom split", () => {
    const t = computeTargets({ ...base, proteinPerKg: 1.8, fatPct: 0.3 });
    const s = inferSplit({ proteinG: t.targetProteinG, fatG: t.targetFatG, calories: t.targetCalories, weightKg: base.weightKg, heightCm: base.heightCm });
    expect(s).toEqual({ proteinPerKg: 1.8, fatPct: 0.3 });
  });
  it("clamps legacy values that fall outside the allowed range", () => {
    expect(inferSplit({ proteinG: 213, fatG: 60, calories: 2000, weightKg: 107, heightCm: 175 }).proteinPerKg).toBe(2.2);
  });
});
