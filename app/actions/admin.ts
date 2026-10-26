"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Forbidden");
  const { data } = await s.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
  return { s, me: user.id };
}

export async function setAdmin(userId: string, makeAdmin: boolean) {
  const { s, me } = await assertAdmin();
  if (userId === me && !makeAdmin) return; // don't lock yourself out
  const { error } = makeAdmin
    ? await s.from("user_roles").upsert({ user_id: userId, role: "admin" })
    : await s.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
  if (error) throw new Error(`Could not update admin role: ${error.message}`);
  revalidatePath("/admin");
}
