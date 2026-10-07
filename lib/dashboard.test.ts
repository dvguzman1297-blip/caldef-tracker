import { describe, expect, it } from "vitest";
import { buildPicks } from "./quick-picks";
import { caloriesLeft, fraction, sumMeals } from "./totals";
import { formatChange, parseWeight, weightChange } from "./weight";

describe("totals", () => {
  it("sums meals, coercing DB numeric strings", () => {
    const t = sumMeals([
      { calories: 300, protein_g: 20, fiber_g: 5, net_carbs_g: 30, fat_g: 10 },
      { calories: 450, protein_g: "35.5" as unknown as number, fiber_g: 2, net_carbs_g: 10, fat_g: 20 },
    ]);
    expect(t).toEqual({ calories: 750, protein: 55.5, fiber: 7, netCarbs: 40, fat: 30 });
  });
  it("is zero for an empty day", () => expect(sumMeals([]).calories).toBe(0));
  it("computes calories left, negative when over", () => {
    expect(caloriesLeft(2000, 1250.4)).toBe(750);
    expect(caloriesLeft(2000, 2100)).toBe(-100);
  });
  it("guards a zero target", () => expect(fraction(5, 0)).toBe(0));
});

describe("buildPicks", () => {
  const row = (title: string, date: string, calories = 300) =>
    ({ title, date, calories, protein_g: 20, fiber_g: 2, net_carbs_g: 10, fat_g: 5 });
  it("dedupes by title and uses the latest numbers", () => {
    const { recent } = buildPicks([row("Oatmeal", "2026-10-01", 300), row("oatmeal ", "2026-10-05", 350)]);
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ calories: 350, count: 2, lastDate: "2026-10-05" });
  });
  it("orders recent by date and frequent by count (needs 2+ logs)", () => {
    const rows = [row("A", "2026-10-01"), row("A", "2026-10-02"), row("A", "2026-10-03"), row("B", "2026-10-06"), row("C", "2026-10-04"), row("C", "2026-10-05")];
    const { recent, frequent } = buildPicks(rows);
    expect(recent.map((p) => p.title)).toEqual(["B", "C", "A"]);
    expect(frequent.map((p) => p.title)).toEqual(["A", "C"]);
  });
  it("respects the limit", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(`Food ${i}`, `2026-10-${String(i + 1).padStart(2, "0")}`));
    expect(buildPicks(rows, 5).recent).toHaveLength(5);
  });
});

describe("weight", () => {
  it("parses decimals and commas", () => {
    expect(parseWeight("124.5")).toEqual({ ok: true, kg: 124.5 });
    expect(parseWeight(" 124,56 ")).toEqual({ ok: true, kg: 124.6 });
  });
  it("rejects empty, non-numeric and out-of-range values", () => {
    expect(parseWeight("").ok).toBe(false);
    expect(parseWeight("abc").ok).toBe(false);
    expect(parseWeight("19.9").ok).toBe(false);
    expect(parseWeight("501").ok).toBe(false);
    expect(parseWeight("-5").ok).toBe(false);
  });
  it("formats change with a real minus sign", () => {
    expect(weightChange(124.5, 124.2)).toBe(-0.3);
    expect(formatChange(-0.3)).toBe("−0.3 kg");
    expect(formatChange(0.4)).toBe("+0.4 kg");
    expect(formatChange(0)).toBe("no change");
  });
});
