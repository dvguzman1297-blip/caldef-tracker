export const todayStr = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE || "UTC" }).format(d);
