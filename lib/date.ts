export const todayStr = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE || "UTC" }).format(d);

export const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// "Today, Sep 30" / "Yesterday, Sep 29" / "Mon, Sep 28"
export const dateLabel = (s: string, today: string) => {
  const d = new Date(`${s}T12:00:00Z`);
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const prefix =
    s === today ? "Today"
    : s === addDays(today, -1) ? "Yesterday"
    : d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  return `${prefix}, ${md}`;
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
