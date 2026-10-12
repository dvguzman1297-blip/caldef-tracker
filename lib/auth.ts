import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The Supabase client and signed-in user id, memoized for the duration of one request so the
 * layout and page share a single client and a single check.
 *
 * Uses getClaims(), which verifies the JWT locally against the project's cached signing keys,
 * instead of getUser(), which is a network round trip to Supabase on every call. proxy.ts has
 * already refreshed the session and redirected anonymous users before this runs.
 */
export const getAuth = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, uid: data?.claims.sub ?? null };
});

/** Like getAuth, but for routes behind the proxy where an anonymous user cannot get through. */
export async function requireAuth() {
  const { supabase, uid } = await getAuth();
  if (!uid) throw new Error("Not signed in");
  return { supabase, uid };
}

/** Whether the current user is an admin; memoized per request (the layout and /admin both ask). */
export const getIsAdmin = cache(async () => {
  const { supabase, uid } = await getAuth();
  if (!uid) return false;
  const { data } = await supabase.from("user_roles").select("role")
    .eq("user_id", uid).eq("role", "admin").maybeSingle();
  return !!data;
});
