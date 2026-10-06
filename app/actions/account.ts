"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Permanently deletes the signed-in user. All their rows cascade from auth.users. */
export async function deleteAccount(confirmation: string) {
  if (confirmation !== "DELETE") throw new Error('Type DELETE to confirm.');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) throw new Error(`Could not delete account: ${error.message}`);
  await supabase.auth.signOut();
  redirect("/login");
}
