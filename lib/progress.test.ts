import { describe, expect, it } from "vitest";
import { averages, dayStatus, movingAverage, persistentLowIntake, weightTrend, type DayStatus } from "./progress";

describe("dayStatus", () => {
  const T = 2000;
  it("never treats missing logs as zero intake", () => expect(dayStatus(false, 0, T)).toBe("no_data"));
  it("flags under 60% as very_low (not a success)", () => {
    expect(dayStatus(true, 1199, T)).toBe("very_low");
    expect(dayStatus(true, 400, T)).toBe("very_low");
  });
  it("uses the 60/80/105% boundaries", () => {
    expect(dayStatus(true, 1200, T)).toBe("under");
    expect(dayStatus(true, 1599, T)).toBe("under");
    expect(dayStatus(true, 1600, T)).toBe("on_target");
    expect(dayStatus(true, 2100, T)).toBe("on_target");
    expect(dayStatus(true, 2101, T)).toBe("over");
  });
});

describe("persistentLowIntake", () => {
  const s = (...x: DayStatus[]) => x;
  it("triggers on 3+ very low logged days", () => {
    expect(persistentLowIntake(s("very_low", "very_low", "no_data", "very_low", "on_target"))).toBe(true);
  });
  it("does not trigger on one or two low days", () => {
    expect(persistentLowIntake(s("very_low", "very_low", "on_target", "on_target"))).toBe(false);
  });
  it("ignores unlogged days", () => {
    expect(persistentLowIntake(s("no_data", "no_data", "no_data", "very_low"))).toBe(false);
  });
});

describe("averages", () => {
  const byDay = new Map([
    ["2026-10-05", { cal: 2000, p: 100, f: 20, nc: 100, fat: 60 }],
    ["2026-10-07", { cal: 1000, p: 50, f: 10, nc: 50, fat: 30 }],
  ]);
  it("averages logged days only", () => {
    const a = averages(byDay, ["2026-10-05", "2026-10-06", "2026-10-07"]);
    expect(a).toMatchObject({ loggedDays: 2, cal: 1500, p: 75 });
  });
  it("returns nulls when nothing is logged", () => {
    expect(averages(byDay, ["2026-10-01"])).toMatchObject({ loggedDays: 0, cal: null });
  });
});

describe("movingAverage", () => {
  it("averages the points within the trailing 7 days", () => {
    const pts = [
      { date: "2026-10-01", kg: 100 }, { date: "2026-10-03", kg: 99 }, { date: "2026-10-09", kg: 98 },
    ];
    const ma = movingAverage(pts);
    expect(ma[0].kg).toBe(100);
    expect(ma[1].kg).toBe(99.5);
    expect(ma[2].kg).toBe(98.5); // Oct 3 and Oct 9 are inside (Oct 2, Oct 9]; Oct 1 is not
  });
});

describe("weightTrend", () => {
  it("compares the last 7 days to the 7 before", () => {
    const pts = [{ date: "2026-09-28", kg: 80 }, { date: "2026-10-06", kg: 79 }];
    expect(weightTrend(pts, "2026-10-07")?.change).toBe(-1);
  });
  it("is null without two weeks of data", () => {
    expect(weightTrend([{ date: "2026-10-06", kg: 79 }], "2026-10-07")).toBeNull();
  });
});
