import { describe, expect, it } from "vitest";
import { ALL_DAYS, dueWindow, nextWindow, weekdayOf, zonedToUtc, type Schedule } from "./fasting-schedule";

const H = 3_600_000;
const sched = (over: Partial<Schedule> = {}): Schedule => ({ enabled: true, start_time: "20:00", hours: 16, days: ALL_DAYS, ...over });

describe("zonedToUtc", () => {
  it("converts a fixed-offset zone (Manila is UTC+8)", () => {
    expect(zonedToUtc("2026-10-26", "20:00", "Asia/Manila")).toBe(Date.UTC(2026, 9, 26, 12, 0));
  });
  it("is the identity in UTC", () => {
    expect(zonedToUtc("2026-10-26", "08:30", "UTC")).toBe(Date.UTC(2026, 9, 26, 8, 30));
  });
  it("respects daylight saving on either side of the change (New York)", () => {
    expect(zonedToUtc("2026-07-01", "20:00", "America/New_York")).toBe(Date.UTC(2026, 6, 2, 0, 0)); // EDT, UTC-4
    expect(zonedToUtc("2026-12-01", "20:00", "America/New_York")).toBe(Date.UTC(2026, 11, 2, 1, 0)); // EST, UTC-5
  });
});

describe("weekdayOf", () => {
  it("returns 0 for Sunday", () => {
    expect(weekdayOf("2026-10-25")).toBe(0);
    expect(weekdayOf("2026-10-26")).toBe(1);
  });
});

describe("dueWindow (Manila, 20:00 start, 16h)", () => {
  const tz = "Asia/Manila";
  // Mon 2026-10-26 20:00 Manila = 12:00 UTC
  const startMon = Date.UTC(2026, 9, 26, 12, 0);

  it("is the running fast shortly after the start time", () => {
    const w = dueWindow(sched(), startMon + 90 * 60_000, tz)!;
    expect(w.date).toBe("2026-10-26");
    expect(w.startMs).toBe(startMon);
    expect(w.endMs).toBe(startMon + 16 * H);
  });
  it("still returns last night's fast the next morning, before it ends", () => {
    const w = dueWindow(sched(), startMon + 10 * H, tz)!;
    expect(w.date).toBe("2026-10-26");
  });
  it("returns the finished fast once it is over (until tonight's starts)", () => {
    const w = dueWindow(sched(), startMon + 20 * H, tz)!; // Tue 16:00 Manila
    expect(w.date).toBe("2026-10-26");
    expect(w.endMs).toBeLessThan(startMon + 20 * H);
  });
  it("switches to the new day's fast at its start time", () => {
    expect(dueWindow(sched(), startMon + 24 * H + 60_000, tz)!.date).toBe("2026-10-27");
  });
  it("is null before the first start of the day when yesterday is not scheduled and is too old", () => {
    expect(dueWindow(sched({ days: [1] }), startMon + 100 * H, tz)).toBeNull(); // 4+ days after the only Monday
  });
  it("only uses selected weekdays", () => {
    const w = dueWindow(sched({ days: [1] }), startMon + 30 * H, tz)!; // Tue night: Monday's fast, not Tuesday's
    expect(w.date).toBe("2026-10-26");
  });
  it("is null when disabled or no days are chosen", () => {
    expect(dueWindow(sched({ enabled: false }), startMon + H, tz)).toBeNull();
    expect(dueWindow(sched({ days: [] }), startMon + H, tz)).toBeNull();
  });
});

describe("nextWindow", () => {
  const tz = "Asia/Manila";
  const startMon = Date.UTC(2026, 9, 26, 12, 0);
  it("is tonight's start when it hasn't happened yet", () => {
    expect(nextWindow(sched(), startMon - H, tz)!.startMs).toBe(startMon);
  });
  it("skips to the next selected day", () => {
    const w = nextWindow(sched({ days: [3] }), startMon + H, tz)!; // next Wednesday
    expect(w.date).toBe("2026-10-28");
  });
  it("is null when disabled", () => {
    expect(nextWindow(sched({ enabled: false }), startMon, tz)).toBeNull();
  });
});
