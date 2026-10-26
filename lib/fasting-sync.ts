import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SCHEDULE, dueWindow, nextWindow, type Schedule } from "@/lib/fasting-schedule";

type Db = SupabaseClient<any, "caldef", "caldef">;

/** The user's saved schedule, or null if they've never set one (or the table isn't there yet). */
export async function loadSchedule(supabase: Db, uid: string): Promise<Schedule | null> {
  const { data, error } = await supabase.from("fasting_schedule").select("enabled,start_time,hours,days")
    .eq("user_id", uid).maybeSingle();
  if (error) { console.error("could not load fasting schedule", error); return null; }
  if (!data) return null;
  return {
    enabled: data.enabled, start_time: String(data.start_time).slice(0, 5),
    hours: Number(data.hours), days: (data.days as number[] | null) ?? DEFAULT_SCHEDULE.days,
  };
}

/**
 * Makes the stored fasts match the schedule: if a scheduled fast should have started (and doesn't exist yet,
 * and doesn't clash with a fast the user made themselves), creates it with its real start time, already ended
 * if its window is over. Runs on dashboard load; it never throws, since a schedule hiccup mustn't break the page.
 * Returns when the next scheduled fast starts (ms), or null, for display.
 * Anything the user did by hand wins: a deleted scheduled fast stays skipped, and a manual fast blocks the window.
 */
export async function syncScheduledFast(supabase: Db, uid: string, schedule: Schedule | null, tz: string, nowMs = Date.now()): Promise<number | null> {
  if (!schedule) return null;
  const next = nextWindow(schedule, nowMs, tz)?.startMs ?? null;
  try {
    const w = dueWindow(schedule, nowMs, tz);
    if (!w) return next;

    const { data: existing, error: e1 } = await supabase.from("fasts").select("id")
      .eq("user_id", uid).eq("scheduled_for", w.date).limit(1);
    if (e1) throw e1;
    if (existing?.length) return next;

    const startIso = new Date(w.startMs).toISOString(), endIso = new Date(w.endMs).toISOString();
    const { data: clash, error: e2 } = await supabase.from("fasts").select("id")
      .eq("user_id", uid).eq("skipped", false).lt("started_at", endIso)
      .or(`ended_at.is.null,ended_at.gt.${startIso}`).limit(1);
    if (e2) throw e2;
    if (clash?.length) return next;

    const over = nowMs >= w.endMs;
    const { error } = await supabase.from("fasts").insert({
      user_id: uid, started_at: startIso, ended_at: over ? endIso : null, target_hours: schedule.hours,
      source: "schedule", scheduled_for: w.date,
    });
    // 23505: another request created it first
    if (error && error.code !== "23505") throw error;
  } catch (e) {
    console.error("fasting schedule sync failed", e);
  }
  return next;
}
