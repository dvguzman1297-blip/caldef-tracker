import { describe, expect, it } from "vitest";
import { MEAL_SHARE, defaultSlot, mealTarget } from "./budget";

describe("mealTarget", () => {
  it("splits the day's remaining budget by slot (the 2517 kcal / 213 g case)", () => {
    const r = { calories: 2517, protein: 213 };
    expect(mealTarget(r, "lunch")).toEqual({ calories: 760, protein: 64, overBudget: false });
    expect(mealTarget(r, "breakfast")).toEqual({ calories: 630, protein: 53, overBudget: false });
    expect(mealTarget(r, "snack")).toEqual({ calories: 380, protein: 32, overBudget: false });
  });
  it("shares add up to 100%", () => {
    expect(Object.values(MEAL_SHARE).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("applies the floor when the share would be tiny", () => {
    expect(mealTarget({ calories: 500, protein: 20 }, "snack")).toMatchObject({ calories: 100, protein: 5 });
  });
  it("never targets more than what is left", () => {
    expect(mealTarget({ calories: 150, protein: 8 }, "lunch")).toMatchObject({ calories: 150, protein: 8, overBudget: false });
  });
  it("flags an overspent day and uses the floor", () => {
    expect(mealTarget({ calories: -200, protein: -10 }, "dinner")).toEqual({ calories: 300, protein: 20, overBudget: true });
  });
});

describe("defaultSlot", () => {
  it.each([[7, "breakfast"], [12, "lunch"], [16, "snack"], [19, "dinner"], [23, "snack"], [2, "snack"]])(
    "hour %i -> %s", (h, slot) => expect(defaultSlot(h)).toBe(slot));
});

import { targetFit } from "./budget";
describe("targetFit", () => {
  it("is on target within 10%", () => {
    expect(targetFit(700, 760)).toEqual({ delta: -60, state: "on" });
    expect(targetFit(830, 760).state).toBe("on");
  });
  it("flags under and over", () => {
    expect(targetFit(500, 760).state).toBe("under");
    expect(targetFit(900, 760)).toEqual({ delta: 140, state: "over" });
  });
});
