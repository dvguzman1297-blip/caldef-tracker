"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Records the browser's IANA timezone in a cookie so the server computes "today" for the user's
 * local day (Vercel runs in UTC). Refreshes once when the cookie changes so the page re-renders.
 */
export function TimezoneSync() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const current = document.cookie.split("; ").find((c) => c.startsWith("tz="))?.slice(3);
    if (current === encodeURIComponent(tz)) return;
    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
