import { addDays, todayIn } from "@/lib/date";
import { MAX_BACKDATE_HOURS } from "@/lib/fasting";

/**
 * A recurring fast: starts at `start_time` (local) on each day in `days` and lasts `hours`.
 * `days` are the weekdays the fast STARTS on (0 = Sunday ... 6 = Saturday).
 */
export type Schedule = { enabled: boolean; start_time: string; hours: number; days: number[] };
export type Window = { date: string; startMs: number; endMs: number };

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DEFAULT_SCHEDULE: Schedule = { enabled: false, start_time: "20:00", hours: 16, days: ALL_DAYS };

const HOUR = 3_600_000;

/** Offset (ms) of `tz` from UTC at instant `ms`: local wall-clock read as UTC, minus the real instant. */
function offsetAt(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(ms / 1000) * 1000;
}

/** The UTC instant at which the wall clock in `tz` reads `date` (YYYY-MM-DD) `time` (HH:MM). Handles DST. */
export function zonedToUtc(date: string, time: string, tz: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let utc = guess;
  for (let i = 0; i < 2; i++) utc = guess - offsetAt(utc, tz);
  return utc;
}

export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

const windowFor = (s: Schedule, date: string, tz: string): Window => {
  const startMs = zonedToUtc(date, s.start_time.slice(0, 5), tz);
  return { date, startMs, endMs: startMs + s.hours * HOUR };
};

/**
 * The scheduled fast that should exist right now: the most recent one that has already started
 * (within the backdate limit), whether it's still running or already over. Null if none.
 */
export function dueWindow(s: Schedule, nowMs: number, tz: string): Window | null {
  if (!s.enabled || s.days.length === 0) return null;
  const today = todayIn(tz, new Date(nowMs));
  let best: Window | null = null;
  for (const date of [addDays(today, -2), addDays(today, -1), today]) {
    if (!s.days.includes(weekdayOf(date))) continue;
    const w = windowFor(s, date, tz);
    if (w.startMs <= nowMs && nowMs - w.startMs <= MAX_BACKDATE_HOURS * HOUR && (!best || w.startMs > best.startMs)) best = w;
  }
  return best;
}

/** The next scheduled fast that hasn't started yet, for display ("Next: Mon 8:00 PM"). */
export function nextWindow(s: Schedule, nowMs: number, tz: string): Window | null {
  if (!s.enabled || s.days.length === 0) return null;
  const today = todayIn(tz, new Date(nowMs));
  for (let i = 0; i <= 8; i++) {
    const date = addDays(today, i);
    if (!s.days.includes(weekdayOf(date))) continue;
    const w = windowFor(s, date, tz);
    if (w.startMs > nowMs) return w;
  }
  return null;
}
