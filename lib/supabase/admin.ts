import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client. Server-only; bypasses RLS, so use it only for account deletion. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Account deletion isn't configured on this server (SUPABASE_SERVICE_ROLE_KEY).");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}
