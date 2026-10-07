import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setAdmin } from "@/app/actions/admin";

export default async function Admin() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: me } = await s.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
  if (!me) redirect("/");

  // eslint-disable-next-line react-hooks/purity -- async server component, runs once per request
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ count: users }, { count: meals7 }, { data: profiles }, { data: roles }, { data: recent }] = await Promise.all([
    s.from("profiles").select("*", { count: "exact", head: true }),
    s.from("logged_meals").select("*", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", since),
    s.from("profiles").select("id,full_name,created_at").order("created_at", { ascending: false }).limit(25),
    s.from("user_roles").select("user_id").eq("role", "admin"),
    s.from("logged_meals").select("id,user_id,slot,source,created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(15),
  ]);
  const admins = new Set((roles ?? []).map((r) => r.user_id));
  const name = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? p.id.slice(0, 8)]));

  return (
    <>
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="glass p-4"><div className="text-3xl font-bold">{users}</div><div className="text-sm text-muted">Users</div></div>
        <div className="glass p-4"><div className="text-3xl font-bold">{meals7}</div><div className="text-sm text-muted">Meals logged, last 7 days</div></div>
      </div>

      <section className="glass p-4">
        <h2 className="mb-2 font-semibold">Users</h2>
        <ul className="divide-y divide-black/10 text-sm dark:divide-white/10">
          {(profiles ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{p.full_name ?? p.id.slice(0, 8)} {admins.has(p.id) && <b className="text-accent-fg">(admin)</b>}</span>
              <form action={setAdmin.bind(null, p.id, !admins.has(p.id))}>
                <button className="btn btn-ghost !py-1">{admins.has(p.id) ? "Remove admin" : "Make admin"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass p-4">
        <h2 className="mb-2 font-semibold">Recent activity</h2>
        <p className="mb-2 text-xs text-muted">Meal contents are intentionally not shown here. Admin access to user data is disclosed on each user&apos;s profile page.</p>
        <ul className="space-y-1 text-sm">
          {(recent ?? []).map((r) => (
            <li key={r.id}>{new Date(r.created_at).toLocaleString()}: {name.get(r.user_id) ?? r.user_id.slice(0, 8)} logged a {r.slot} meal ({r.source})</li>
          ))}
        </ul>
      </section>
    </>
  );
}
