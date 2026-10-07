import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_TZ, isValidTimeZone, todayIn } from "@/lib/date";

export const TZ_COOKIE = "tz";

/** The user's IANA timezone: the `tz` cookie set by <TimezoneSync />, else APP_TIMEZONE, else UTC. */
export async function getTimeZone() {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return isValidTimeZone(tz) ? tz : DEFAULT_TZ;
}

/** Today's date (YYYY-MM-DD) in the user's timezone. Use this, not todayStr(), in server code. */
export async function getToday() {
  return todayIn(await getTimeZone());
}
