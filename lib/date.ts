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