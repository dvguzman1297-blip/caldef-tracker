import { describe, expect, it } from "vitest";
import { checkStart, fastProgress, formatClock, formatDuration, metGoal, summarize, type FastRow } from "./fasting";

const H = 3_600_000;
const t0 = Date.UTC(2026, 9, 26, 20, 0);
const fast = (hours: number, target = 16): FastRow => ({
  id: String(hours), started_at: new Date(t0).toISOString(),
  ended_at: new Date(t0 + hours * H).toISOString(), target_hours: target,
});

describe("formatting", () => {
  it("formats durations", () => {
    expect(formatDuration(16 * H + 5 * 60_000)).toBe("16h 05m");
    expect(formatDuration(42 * 60_000)).toBe("42m");
    expect(formatDuration(-5)).toBe("0m");
  });
  it("formats the live clock", () => {
    expect(formatClock(15 * H + 42 * 60_000 + 7_000)).toBe("15:42:07");
    expect(formatClock(0)).toBe("0:00:00");
  });
});

describe("fastProgress", () => {
  it("tracks progress toward the goal", () => {
    const p = fastProgress(t0, t0 + 8 * H, 16);
    expect(p.pct).toBe(0.5);
    expect(p.reached).toBe(false);
    expect(p.remainingMs).toBe(8 * H);
  });
  it("reports time over once the goal is reached, and caps the ring at 100%", () => {
    const p = fastProgress(t0, t0 + 17 * H, 16);
    expect(p.reached).toBe(true);
    expect(p.pct).toBe(1);
    expect(p.overMs).toBe(H);
    expect(p.remainingMs).toBe(0);
  });
  it("never goes negative if the clock is behind the start", () => {
    expect(fastProgress(t0, t0 - 1000, 16).elapsedMs).toBe(0);
  });
});

describe("summarize", () => {
  it("counts goals met and averages completed fasts only", () => {
    const running: FastRow = { id: "r", started_at: new Date(t0).toISOString(), ended_at: null, target_hours: 16 };
    const s = summarize([fast(16), fast(12), fast(20), running]);
    expect(s.count).toBe(3);
    expect(s.met).toBe(2);
    expect(s.avgMs).toBe(16 * H);
  });
  it("handles no fasts", () => {
    expect(summarize([])).toEqual({ count: 0, met: 0, avgMs: 0 });
  });
  it("metGoal accepts numeric strings (Postgres numeric)", () => {
    expect(metGoal(fast(16, 16))).toBe(true);
    expect(metGoal({ ...fast(16), target_hours: "18.0" })).toBe(false);
  });
});

describe("checkStart", () => {
  const now = t0 + 100 * H;
  it("accepts a recent start", () => expect(checkStart(now - 3 * H, now)).toBeNull());
  it("rejects the future", () => expect(checkStart(now + 10 * 60_000, now)).toMatch(/future/));
  it("rejects starts more than 48h ago", () => expect(checkStart(now - 49 * H, now)).toMatch(/48/));
  it("rejects NaN", () => expect(checkStart(NaN, now)).toMatch(/valid/));
});
