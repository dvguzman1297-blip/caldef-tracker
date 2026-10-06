"use client";
import { useState, useTransition } from "react";
import { deleteWeight, logWeight } from "@/app/actions/weight";

export function WeightForm({ date, label, current }: {
  date: string; label: string; current?: { id: string; kg: number };
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>, ok: string) => start(async () => {
    setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); }
    catch (e: any) { setMsg({ ok: false, text: e.message || "Could not save." }); }
  });
  return (
    <form className="flex flex-wrap items-end gap-2"
      action={(fd) => run(() => logWeight({ date, kg: Number(fd.get("kg")) }), "Saved.")}>
      <div>
        <label className="label" htmlFor="wkg">Weight on {label} (kg)</label>
        <input id="wkg" name="kg" type="number" step="0.1" min="20" max="500" required
          defaultValue={current?.kg} key={`${date}-${current?.kg ?? ""}`} className="input" />
      </div>
      <button className="btn" disabled={pending}>{pending ? "Saving…" : current ? "Update" : "Log weight"}</button>
      {current && (
        <button type="button" className="btn btn-ghost" disabled={pending}
          onClick={() => run(() => deleteWeight(current.id), "Removed.")}>Remove</button>
      )}
      {msg && <p className={msg.ok ? "text-sm text-emerald-600" : "err"} role="status">{msg.text}</p>}
    </form>
  );
}
