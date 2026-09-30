import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data } = await s.from("user_roles").select("role")
    .eq("user_id", user?.id ?? "").eq("role", "admin").maybeSingle();
  return (
    <>
      <Nav isAdmin={!!data} />
<main className="mx-auto max-w-5xl space-y-6 p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-16">{children}</main>
    </>
  );
}
