"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data } = await s.from("user_roles").select("role").eq("user_id", user?.id ?? "").eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
  return { s, me: user!.id };
}

export async function setAdmin(userId: string, makeAdmin: boolean) {
  const { s, me } = await assertAdmin();
  if (userId === me && !makeAdmin) return; // don't lock yourself out
  if (makeAdmin) await s.from("user_roles").upsert({ user_id: userId, role: "admin" });
  else await s.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
  revalidatePath("/admin");
}
