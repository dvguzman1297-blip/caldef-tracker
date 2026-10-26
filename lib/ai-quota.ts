import type { SupabaseClient } from "@supabase/supabase-js";

/** Max AI calls (meal estimates + recipes combined) per user per UTC day. */
export const AI_DAILY_LIMIT = 40;

/**
 * Counts one AI call against the user's daily quota; false means they're over it.
 * If the quota check itself fails (e.g. migration 0007 not applied) it logs and lets the call through
 * rather than taking the feature down.
 */
export async function consumeAiQuota(supabase: SupabaseClient<any, "caldef", "caldef">): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_ai_quota", { p_limit: AI_DAILY_LIMIT });
  if (error) {
    console.error("ai quota check failed", error);
    return true;
  }
  return data === true;
}

export const QUOTA_MESSAGE = "You've reached today's AI limit. Try again tomorrow, or log the meal manually.";
