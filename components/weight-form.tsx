"use client";
import { useState, useTransition } from "react";
import { deleteWeight, logWeight } from "@/app/actions/weight";
import { formatDay } from "@/lib/date";
import { formatChange, parseWeight, weightChange } from "@/lib/weight";
import { useToast } from "@/components/toast";

type Props = {
  date: string; today: string; label: string;
  current?: { id: string; kg: number };
  /** Most recent weigh-in before `date` (or the current day's, when there is none earlier). */
  previous?: { kg: number; date: string };
};

/** Compact weight card: last weigh-in, change, and an inline input with the unit inside the field. */
export function WeightForm({ date, today, label, current, previous }: Props) {
  const toast = useToast();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const ref = current ?? previous;
  const delta = current && previous ? weightChange(previous.kg, current.kg) : null;

  function submit(fd: FormData) {
    const parsed = parseWeight(String(fd.get("kg") ?? ""));
    if (!parsed.ok) { setError(parsed.error); return; }
    setError("");
    start(async () => {
      try { await logWeight({ date, kg: parsed.kg }); toast({ message: `Saved ${parsed.kg} kg for ${label}.` }); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 className="font-semibold">Weight</h2>
        {ref ? (
          <p className="text-sm text-muted">
            {current ? "Logged" : "Last weigh-in"}: <b className="text-fg">{(current?.kg ?? previous!.kg).toFixed(1)} kg</b>
            {!current && previous && <> · {formatDay(previous.date, today)}</>}
            {delta !== null && <> · {formatChange(delta)} since {formatDay(previous!.date, today)}</>}
          </p>
        ) : (
          <p className="text-sm text-muted">No weigh-ins yet. Optional, but it powers your trend.</p>
        )}
      </div>

      <form action={submit} className="flex flex-wrap items-start gap-2" noValidate>
        <div>
          <label className="sr-only" htmlFor="wkg">Weight on {label} in kilograms</label>
          <div className="relative">
            <input id="wkg" name="kg" inputMode="decimal" autoComplete="off" placeholder="124.5"
              defaultValue={current?.kg} key={`${date}-${current?.kg ?? ""}`}
              aria-invalid={!!error} aria-describedby={error ? "wkg-err" : undefined}
              className="input !w-36 !pr-10" />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted" aria-hidden="true">kg</span>
          </div>
          {error && <p id="wkg-err" className="err" role="alert">{error}</p>}
        </div>
        <button className="btn" disabled={pending}>{pending ? "Saving…" : current ? "Update" : "Log weight"}</button>
        {current && (
          <button type="button" className="btn btn-ghost" disabled={pending}
            onClick={() => start(async () => {
              try { await deleteWeight(current.id); toast({ message: "Weight removed." }); }
              catch (e) { setError(e instanceof Error ? e.message : "Could not remove."); }
            })}>Remove</button>
        )}
      </form>
    </div>
  );
}
