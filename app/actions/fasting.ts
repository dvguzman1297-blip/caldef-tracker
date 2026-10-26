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
  const { data: last } = await supabase.from("fasts").select("ended_at").eq("user_id", u.id)
    .not("ended_at", "is", null).order("ended_at", { ascending: false }).limit(1).maybeSingle();
  if (last?.ended_at && startMs < Date.parse(last.ended_at)) throw new Error("That start overlaps your previous fast.");

  const { error } = await supabase.from("fasts").insert({
    user_id: u.id, started_at: new Date(Math.min(startMs, now)).toISOString(), target_hours: f.targetHours,
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

/** Deletes a fast, running or finished (e.g. a mistaken start). */
export async function deleteFast(id: string) { return safe(() => deleteFastImpl(id)); }
async function deleteFastImpl(id: string) {
  const { supabase, user: u } = await user();
  const { error } = await supabase.from("fasts").delete().eq("id", id).eq("user_id", u.id);
  if (error) throw new Error(`Could not delete the fast: ${error.message}`);
  refresh();
}
