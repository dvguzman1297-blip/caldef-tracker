export type DayStatus = "no_data" | "under" | "on_target" | "over";

/**
 * No logged meals is "no_data" (never zero intake). Under 80% of target is flagged as "under"
 * rather than praised, since persistent very low intake isn't a goal. Over 105% is "over".
 */
export function dayStatus(logged: boolean, calories: number, target: number): DayStatus {
  if (!logged) return "no_data";
  if (calories < target * 0.8) return "under";
  if (calories > target * 1.05) return "over";
  return "on_target";
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
