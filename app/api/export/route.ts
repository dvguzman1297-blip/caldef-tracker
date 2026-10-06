import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLES = [
  ["profile", "profiles", "id"], ["health_metrics", "health_metrics", "user_id"],
  ["daily_logs", "daily_logs", "user_id"], ["logged_meals", "logged_meals", "user_id"],
  ["weight_logs", "weight_logs", "user_id"], ["saved_foods", "saved_foods", "user_id"],
  ["meal_plan_entries", "meal_plan_entries", "user_id"], ["lane_builder_configs", "lane_builder_configs", "user_id"],
] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), email: user.email };
  for (const [key, table, col] of TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq(col, user.id);
    if (error) return NextResponse.json({ error: `Export failed on ${table}: ${error.message}` }, { status: 500 });
    out[key] = data;
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="caldef-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
