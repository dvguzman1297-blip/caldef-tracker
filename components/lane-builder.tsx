"use client";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; text: string };
type Lane = { id: string; title: string; items: Item[] };
type Config = { id?: string; name: string; lanes: Lane[] };
const uid = () => Math.random().toString(36).slice(2, 9);
const starter = (): Config => ({
  name: "My meal plan",
  lanes: ["Breakfast", "Lunch", "Dinner", "Snacks"].map((t) => ({ id: uid(), title: t, items: [] })),
});

export function LaneBuilder() {
  const supabase = createClient();
  const [cfg, setCfg] = useState<Config>(starter);
  const [saved, setSaved] = useState<Config[]>([]);
  const [status, setStatus] = useState("");
  const [drag, setDrag] = useState<{ from: string; item: Item } | null>(null);

  const refresh = async () => {
    const { data } = await supabase.from("lane_builder_configs").select("id,name,lanes").order("updated_at", { ascending: false });
    setSaved((data as Config[]) ?? []);
  };
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const patchLane = (id: string, fn: (l: Lane) => Lane) =>
    setCfg((c) => ({ ...c, lanes: c.lanes.map((l) => (l.id === id ? fn(l) : l)) }));

  async function save() {
    setStatus("Saving…");
    const { data: { user } } = await supabase.auth.getUser();
    const row = { user_id: user!.id, name: cfg.name || "Untitled plan", lanes: cfg.lanes, updated_at: new Date().toISOString() };
    const res = cfg.id
      ? await supabase.from("lane_builder_configs").update(row).eq("id", cfg.id).select("id").single()
      : await supabase.from("lane_builder_configs").insert(row).select("id").single();
    if (res.error) return setStatus("Could not save. Try again.");
    setCfg((c) => ({ ...c, id: res.data.id })); setStatus("Saved"); refresh();
  }

  async function remove(id: string) {
    await supabase.from("lane_builder_configs").delete().eq("id", id);
    if (cfg.id === id) setCfg(starter());
    refresh();
  }

  function drop(to: string) {
    if (!drag || drag.from === to) return setDrag(null);
    setCfg((c) => ({ ...c, lanes: c.lanes.map((l) =>
      l.id === drag.from ? { ...l, items: l.items.filter((i) => i.id !== drag.item.id) }
      : l.id === to ? { ...l, items: [...l.items, drag.item] } : l) }));
    setDrag(null);
  }

  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1"><label className="label" htmlFor="planName">Plan name</label>
          <input id="planName" className="input" value={cfg.name} onChange={(e) => setCfg({ ...cfg, name: e.target.value })} /></div>
        <button className="btn" onClick={save}><Save className="size-4" />Save plan</button>
        <button className="btn btn-ghost" onClick={() => setCfg(starter())}>New plan</button>
        <span className="text-sm opacity-70" role="status">{status}</span>
      </div>

      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {saved.map((s) => (
            <span key={s.id} className={`glass flex items-center gap-1 px-3 py-1 text-sm ${cfg.id === s.id ? "ring-2 ring-emerald-500" : ""}`}>
              <button onClick={() => { setCfg(s); setStatus(""); }}>{s.name}</button>
              <button aria-label={`Delete ${s.name}`} onClick={() => remove(s.id!)}><Trash2 className="size-3.5" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {cfg.lanes.map((lane) => (
          <div key={lane.id} className="glass min-w-60 flex-1 p-3" onDragOver={(e) => e.preventDefault()} onDrop={() => drop(lane.id)}>
            <div className="mb-2 flex items-center gap-1">
              <input aria-label="Lane title" className="w-full bg-transparent font-semibold outline-none" value={lane.title}
                onChange={(e) => patchLane(lane.id, (l) => ({ ...l, title: e.target.value }))} />
              <button aria-label="Remove lane" onClick={() => setCfg((c) => ({ ...c, lanes: c.lanes.filter((l) => l.id !== lane.id) }))}><X className="size-4" /></button>
            </div>
            <ul className="min-h-12 space-y-2">
              {lane.items.map((it) => (
                <li key={it.id} draggable onDragStart={() => setDrag({ from: lane.id, item: it })}
                  className="flex cursor-grab items-center justify-between rounded-lg bg-white/60 px-2 py-1.5 text-sm dark:bg-white/10">
                  {it.text}
                  <button aria-label={`Remove ${it.text}`} onClick={() => patchLane(lane.id, (l) => ({ ...l, items: l.items.filter((i) => i.id !== it.id) }))}><X className="size-3.5" /></button>
                </li>
              ))}
            </ul>
            <form className="mt-2 flex gap-1" onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget, t = (new FormData(f).get("t") as string).trim();
              if (t) patchLane(lane.id, (l) => ({ ...l, items: [...l.items, { id: uid(), text: t }] }));
              f.reset();
            }}>
              <input name="t" className="input" placeholder="Add food or meal" aria-label={`Add item to ${lane.title}`} />
              <button className="btn !px-2" aria-label="Add item"><Plus className="size-4" /></button>
            </form>
          </div>
        ))}
        <button className="glass min-w-40 self-start p-3 text-sm" onClick={() => setCfg((c) => ({ ...c, lanes: [...c.lanes, { id: uid(), title: "New lane", items: [] }] }))}>
          <Plus className="mr-1 inline size-4" />Add lane
        </button>
      </div>
    </div>
  );
}
