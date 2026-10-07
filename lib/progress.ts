export type DayStatus = "no_data" | "very_low" | "under" | "on_target" | "over";

/** Below this fraction of the goal, a logged day more likely means missed logging than a good day. */
export const VERY_LOW_FRACTION = 0.6;
export const ON_TARGET_RANGE = [0.8, 1.05] as const;

/**
 * No logged meals is "no_data" (never zero intake). Under 60% of target is "very_low" (probably an
 * incomplete log, never a success), 60-80% is "under", 80-105% is "on_target", above that "over".
 */
export function dayStatus(logged: boolean, calories: number, target: number): DayStatus {
  if (!logged) return "no_data";
  if (calories < target * VERY_LOW_FRACTION) return "very_low";
  if (calories < target * ON_TARGET_RANGE[0]) return "under";
  if (calories > target * ON_TARGET_RANGE[1]) return "over";
  return "on_target";
}

/**
 * True when several recent logged days sit far below the goal: at least 3 very-low days among
 * the logged days passed in (callers pass the most recent 7 days).
 */
export function persistentLowIntake(statuses: DayStatus[]): boolean {
  const logged = statuses.filter((s) => s !== "no_data");
  return logged.filter((s) => s === "very_low").length >= 3;
}

type DayTotals = { cal: number; p: number; f: number; nc: number; fat: number };

/** Average per logged day over `days`. Days with no meals are excluded, never counted as zero. */
export function averages(byDay: Map<string, DayTotals>, days: string[]) {
  const logged = days.filter((d) => byDay.has(d));
  if (!logged.length) return { loggedDays: 0, cal: null, p: null, f: null, nc: null, fat: null };
  const avg = (k: keyof DayTotals) => Math.round(logged.reduce((a, d) => a + byDay.get(d)![k], 0) / logged.length);
  return { loggedDays: logged.length, cal: avg("cal"), p: avg("p"), f: avg("f"), nc: avg("nc"), fat: avg("fat") };
}

/** Trailing moving average: each point is the mean of the points within the last `windowDays` days (inclusive). */
export function movingAverage(points: { date: string; kg: number }[], windowDays = 7) {
  const day = (s: string) => Math.floor(new Date(`${s}T12:00:00Z`).getTime() / 864e5);
  return points.map((p) => {
    const inWindow = points.filter((q) => day(q.date) <= day(p.date) && day(q.date) > day(p.date) - windowDays);
    return { date: p.date, kg: inWindow.reduce((a, q) => a + q.kg, 0) / inWindow.length };
  });
}

/** Average of the last 7 days of weights minus the average of the 7 before, or null if either is empty. */
export function weightTrend(points: { date: string; kg: number }[], today: string) {
  const cutoff = (n: number) => {
    const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const recent = avg(points.filter((p) => p.date > cutoff(7)).map((p) => p.kg));
  const prior = avg(points.filter((p) => p.date > cutoff(14) && p.date <= cutoff(7)).map((p) => p.kg));
  return recent !== null && prior !== null ? { recent, prior, change: recent - prior } : null;
}
