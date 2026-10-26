"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safe } from "@/lib/safe-action";
import { MAX_TARGET_HOURS, checkStart } from "@/lib/fasting";

const Start = z.object({
  targetHours: z.number().finite().min(1).max(MAX_TARGET_HOURS),
  /** ISO time the fast began; omitted means now. */
  startedAt: z.string().datetime().optional(),
});

async function user() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}
const refresh = () => { revalidatePath("/"); revalidatePath("/history"); };

export async function startFast(raw: z.input<typeof Start>) { return safe(() => startFastImpl(raw)); }
async function startFastImpl(raw: z.input<typeof Start>) {
  const f = Start.parse(raw);
  const now = Date.now();
  const startMs = f.startedAt ? Date.parse(f.startedAt) : now;
  const bad = checkStart(startMs, now);
  if (bad) throw new Error(bad);
  const { supabase, user: u } = await user();

  // A backdated start mustn't overlap the previous fast
  const { data: last } = await supabase.from("fasts").select("ended_at").eq("user_id", u.id).eq("skipped", false)
    .not("ended_at", "is", null).order("ended_at", { ascending: false }).limit(1).maybeSingle();
  if (last?.ended_at && startMs < Date.parse(last.ended_at)) throw new Error("That start overlaps your previous fast.");

  // Set to begin earlier and its goal time has already passed: you're past the fast, so save it as finished
  const goalMs = startMs + f.targetHours * 3_600_000;
  const { error } = await supabase.from("fasts").insert({
    user_id: u.id, started_at: new Date(Math.min(startMs, now)).toISOString(), target_hours: f.targetHours,
    ended_at: goalMs <= now ? new Date(goalMs).toISOString() : null,
  });
  // 23505 = the one-running-fast-per-user index
  if (error?.code === "23505") throw new Error("You already have a fast running.");
  if (error) throw new Error(`Could not start the fast: ${error.message}`);
  refresh();
}

export async function endFast(id: string) { return safe(() => endFastImpl(id)); }
async function endFastImpl(id: string) {
  const { supabase, user: u } = await user();
  const { data, error } = await supabase.from("fasts").update({ ended_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", u.id).is("ended_at", null).select("id");
  if (error) throw new Error(`Could not end the fast: ${error.message}`);
  if (!data?.length) throw new Error("That fast has already ended.");
  refresh();
}

/**
 * Deletes a fast, running or finished (e.g. a mistaken start). One the schedule created is kept but marked skipped
 * (and ended, so it can't block a new fast), otherwise the schedule would just recreate it next time the app opens.
 */
export async function deleteFast(id: string) { return safe(() => deleteFastImpl(id)); }
async function deleteFastImpl(id: string) {
  const { supabase, user: u } = await user();
  const { data: f, error: e1 } = await supabase.from("fasts").select("source,ended_at").eq("id", id).eq("user_id", u.id).maybeSingle();
  if (e1) throw new Error(`Could not delete the fast: ${e1.message}`);
  if (!f) return;
  const { error } = f.source === "schedule"
    ? await supabase.from("fasts").update({ skipped: true, ended_at: f.ended_at ?? new Date().toISOString() }).eq("id", id).eq("user_id", u.id)
    : await supabase.from("fasts").delete().eq("id", id).eq("user_id", u.id);
  if (error) throw new Error(`Could not delete the fast: ${error.message}`);
  refresh();
}

const ScheduleInput = z.object({
  enabled: z.boolean(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a start time like 20:00"),
  hours: z.number().finite().min(1).max(MAX_TARGET_HOURS),
  days: z.array(z.number().int().min(0).max(6)).max(7),
}).refine((s) => !s.enabled || s.days.length > 0, { message: "Pick at least one day." });

/** Saves the recurring schedule. The dashboard starts and ends scheduled fasts from it when it loads. */
export async function saveFastingSchedule(raw: z.input<typeof ScheduleInput>) { return safe(() => saveFastingScheduleImpl(raw)); }
async function saveFastingScheduleImpl(raw: z.input<typeof ScheduleInput>) {
  const s = ScheduleInput.parse(raw);
  const { supabase, user: u } = await user();
  const { error } = await supabase.from("fasting_schedule").upsert({
    user_id: u.id, enabled: s.enabled, start_time: s.startTime, hours: s.hours,
    days: [...new Set(s.days)].sort(), updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw new Error(`Could not save your schedule: ${error.message}`);
  refresh();
}
