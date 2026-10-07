// Pure date helpers. A "date" is always a YYYY-MM-DD string in the user's local calendar.
// Server code gets "today" from lib/today.ts (which knows the user's timezone); these never read a clock themselves.

export const DEFAULT_TZ = process.env.APP_TIMEZONE || "UTC";

export const isValidTimeZone = (tz: unknown): tz is string => {
  if (typeof tz !== "string" || !tz) return false;
  try { new Intl.DateTimeFormat("en-CA", { timeZone: tz }); return true; } catch { return false; }
};

/** The calendar day at instant `now` in IANA timezone `tz` (falls back to UTC for an invalid tz). */
export const todayIn = (tz: string, now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: isValidTimeZone(tz) ? tz : "UTC" }).format(now);

/** @deprecated Uses the server default timezone. Prefer getToday() from lib/today.ts in server code. */
export const todayStr = (d = new Date()) => todayIn(DEFAULT_TZ, d);

export const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const at = (s: string) => new Date(`${s}T12:00:00Z`);
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => at(s).toLocaleDateString("en-US", { ...o, timeZone: "UTC" });

/** "Wed, Oct 7"; the year is added when it isn't the current year: "Wed, Oct 7, 2025". */
export const formatDate = (s: string, today: string) =>
  fmt(s, { weekday: "short", month: "short", day: "numeric", ...(s.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }) });

/** "Oct 7" / "Oct 7, 2025", for ranges where the weekday is noise. */
export const formatDay = (s: string, today: string) =>
  fmt(s, { month: "short", day: "numeric", ...(s.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }) });

export const weekdayShort = (s: string) => fmt(s, { weekday: "short" });
export const dayOfMonth = (s: string) => Number(s.slice(8, 10));

/** "Today, Oct 7" / "Yesterday, Oct 6" / "Mon, Oct 5" (year added when not the current year). */
export const dateLabel = (s: string, today: string) => {
  if (s === today) return `Today, ${formatDay(s, today)}`;
  if (s === addDays(today, -1)) return `Yesterday, ${formatDay(s, today)}`;
  return formatDate(s, today);
};

/** True only for real calendar dates in YYYY-MM-DD form (rejects 2026-02-31, 2026-13-01). */
export const isValidDate = (s: unknown): s is string => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** A user-supplied ?date= param: a real date that isn't in the future, otherwise today. */
export const parseDateParam = (q: unknown, today: string) =>
  isValidDate(q) && q <= today ? q : today;
