"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayStr, isValidDate } from "@/lib/date";

const Weight = z.object({
  date: z.string().refine(isValidDate, "Invalid date"),
  kg: z.number().finite().min(20).max(500),
});

async function user() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function logWeight(raw: z.input<typeof Weight>) {
  const w = Weight.parse(raw);
  if (w.date > todayStr()) throw new Error("Can't log a weight in the future");
  const { supabase, user: u } = await user();
  const { error } = await supabase.from("weight_logs").upsert(
    { user_id: u.id, log_date: w.date, weight_kg: Math.round(w.kg * 10) / 10 },
    { onConflict: "user_id,log_date" });
  if (error) throw new Error(`Could not save weight: ${error.message}`);
  revalidatePath("/"); revalidatePath("/history");
}

export async function deleteWeight(id: string) {
  const { supabase, user: u } = await user();
  const { error } = await supabase.from("weight_logs").delete().eq("id", id).eq("user_id", u.id);
  if (error) throw new Error(`Could not delete weight: ${error.message}`);
  revalidatePath("/"); revalidatePath("/history");
}
